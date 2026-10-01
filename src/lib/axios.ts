import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { codigoDoProblema, problemaDe } from '@/lib/problem';
import { getApiBaseUrl } from './api-base';
import { API_MESSAGE, isApiEnvelope } from '@/app/types/api-response';
import { isBillingBlockCode, publishBillingBlock } from './billing-block';

/**
 * A sessão vive em cookie HttpOnly emitido pelo backend (`nixvet_access` /
 * `nixvet_refresh`) — o token não passa mais por `localStorage`, então nenhum
 * script da página consegue lê-lo. Aqui só sobram três responsabilidades:
 *
 * 1. `withCredentials`: sem isso o browser não manda cookie para a API, que
 *    mora em outro subdomínio (app.* → api.*).
 * 2. `x-csrf-token`: cookie vai sozinho em request disparada de outro site;
 *    o header repetindo o valor do cookie `nixvet_csrf` é o que prova que
 *    quem chamou é a nossa página (ver CsrfGuard no backend).
 * 3. 401 → tenta renovar a sessão uma vez antes de mandar para o /login.
 */
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

/**
 * Teto de espera por requisição (01/10/2026). Antes não havia nenhum: uma
 * requisição pendurada deixava o spinner girando para sempre, e o retry do
 * React Query nunca disparava — ele só repete depois de uma rejeição que não
 * vinha. Quem já passa `timeout` na chamada manda.
 *
 * Os tetos maiores cobrem o que é lento por natureza: PDF gerado no backend
 * (blob), IA (espera o provedor) e upload (rede do cliente).
 */
export const TIMEOUT_PADRAO_MS = 20_000;
const TIMEOUT_LONGO_MS = 60_000;
const TIMEOUT_UPLOAD_MS = 120_000;

function timeoutPara(config: { responseType?: string; url?: string; data?: unknown }): number {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) return TIMEOUT_UPLOAD_MS;
  if (config.responseType === 'blob' || config.responseType === 'arraybuffer') return TIMEOUT_LONGO_MS;
  if ((config.url || '').replace(/^\/+/, '').startsWith('ai/')) return TIMEOUT_LONGO_MS;
  return TIMEOUT_PADRAO_MS;
}

const CSRF_COOKIE = 'nixvet_csrf';
const TENANT_COOKIE = 'nixvet_tenant_id';
const SAFE_METHODS = new Set(['get', 'head', 'options']);

function isPublicAuthRequest(config: { url?: string }) {
  const path = config.url || '';
  return (
    path.includes('auth/login') ||
    path.includes('auth/register') ||
    path.includes('auth/password-reset') ||
    path.includes('billing/register') ||
    path.includes('users/invite/accept')
  );
}

/** Lê um cookie pelo nome. Retorna null se não existir ou se não estiver no browser. */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Remove a cópia host-only do cookie de tenant (logout).
 *
 * Quem grava `nixvet_tenant_id` é o backend, com o domínio pai, no login, no
 * aceite de convite e no cadastro. Até 01/10/2026 o front gravava uma segunda
 * cópia host-only — e no logout o backend apagava a dele e esta sobrava. Esta
 * função segue existindo para limpar as cópias que ficaram nos navegadores.
 */
export function clearTenantCookie() {
  document.cookie = `${TENANT_COOKIE}=; max-age=0; path=/`;
}

api.interceptors.request.use((config) => {
  if (!config.timeout) config.timeout = timeoutPara(config);
  if (typeof window !== 'undefined') {
    // Um id por chamada (E11). O backend aceita este valor como `request_id`
    // de toda linha de log da requisição e o devolve no header e no corpo do
    // erro — é o "Código" que o usuário lê na tela e que acha a linha no log.
    if (!config.headers['x-request-id'] && typeof crypto?.randomUUID === 'function') {
      config.headers['x-request-id'] = crypto.randomUUID();
    }
    // Pede o formato novo de erro (E12, ADR-003); a API responde o envelope
    // antigo para quem não manda este header, que é o app já publicado.
    if (!config.headers['Accept']) {
      config.headers['Accept'] = 'application/problem+json, application/json';
    }
    // Login não deve enviar tenant antigo: o middleware usaria outro tenant e o login falha.
    if (!isPublicAuthRequest(config)) {
      const tenantId = getCookie(TENANT_COOKIE) ?? localStorage.getItem('tenantId');
      if (tenantId) {
        config.headers['x-tenant-id'] = tenantId;
      }

      // Só mutação precisa de CSRF; GET não altera nada e o header a mais
      // custaria um preflight extra.
      const method = (config.method || 'get').toLowerCase();
      if (!SAFE_METHODS.has(method)) {
        const csrf = getCookie(CSRF_COOKIE);
        if (csrf) config.headers['x-csrf-token'] = csrf;
      }
    } else {
      delete config.headers['x-tenant-id'];
    }

    // Recalcula no cliente para aplicar o auto-upgrade http→https. Só quando a
    // chamada usa a base padrão: quem passa `baseURL: '/api'` de propósito (o
    // upload same-origin pelo rewrite do Next) mantém a sua.
    if (!config.baseURL || config.baseURL === api.defaults.baseURL) {
      config.baseURL = getApiBaseUrl();
    }
  }

  return config;
});

/** Limpa o que sobrou da sessão no cliente (o cookie quem apaga é o backend). */
export function clearClientSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken'); // resquício das sessões antigas
  localStorage.removeItem('tenantId');
  localStorage.removeItem('tenantCode');
  localStorage.removeItem('user');
  clearTenantCookie();
}

/**
 * Uma renovação por vez: sem isso, um dashboard que dispara seis requests em
 * paralelo abriria seis refresh simultâneos — e a rotação de token do backend
 * trataria os cinco atrasados como reuso, revogando a família inteira e
 * derrubando a sessão justamente ao tentar salvá-la.
 */
let refreshInFlight: Promise<void> | null = null;

function renewSession(): Promise<void> {
  if (!refreshInFlight) {
    const csrf = getCookie(CSRF_COOKIE);
    refreshInFlight = axios
      .post(
        `${getApiBaseUrl()}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: csrf ? { 'x-csrf-token': csrf } : undefined,
        },
      )
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

type RetriableConfig = AxiosRequestConfig & { _retriedAfterRefresh?: boolean };

/**
 * Um toast por código a cada 8s. Uma tela de atendimento salva vários recursos
 * de uma vez (paciente, consulta, prescrição): sem a trava, um único clique em
 * "salvar" empilharia meia dúzia de avisos idênticos.
 */
const ULTIMO_AVISO = new Map<string, number>();
const AVISO_INTERVALO_MS = 8_000;

function avisarUmaVez(codigo: string, mensagem: string): void {
  const agora = Date.now();
  if (agora - (ULTIMO_AVISO.get(codigo) ?? 0) < AVISO_INTERVALO_MS) return;
  ULTIMO_AVISO.set(codigo, agora);
  toast.error(mensagem);
}

/**
 * Em erro do servidor (5xx), a mensagem que as telas mostram passa a
 * terminar com o código da requisição — os 8 primeiros caracteres do
 * `request_id`, que bastam para achar a linha no log (E11).
 *
 * Escreve no campo que a tela lê em cada formato: `detail` no
 * `problem+json`, `message` no envelope antigo. Feito aqui, uma vez, e não
 * tela a tela.
 */
function anexarCodigoDoErro(error: AxiosError): void {
  const problema = problemaDe(error);
  if (!problema || problema.status < 500) return;
  const codigo = codigoDoProblema(problema);
  const corpo = error.response?.data as Record<string, unknown> | undefined;
  if (!codigo || !corpo) return;
  const campo = typeof corpo.detail === 'string' ? 'detail' : 'message';
  const base =
    typeof corpo[campo] === 'string' && corpo[campo] ? (corpo[campo] as string) : 'Erro no servidor.';
  if (!base.includes(codigo)) corpo[campo] = `${base} Código: ${codigo}`;
}

/**
 * 402 é o bloqueio por cobrança (`BillingActiveGuard`).
 *
 * Sem este tratamento o usuário via só o erro genérico da tela — "não foi
 * possível salvar" — sem em momento algum ficar sabendo que o motivo é a
 * assinatura. `SUBSCRIPTION_READ_ONLY` é o caso que mais confundia: a página
 * carrega, os dados aparecem, e só o salvar falha.
 */
function tratarBloqueioDeCobranca(error: AxiosError): void {
  // Pelo helper: em `problem+json` a mensagem vem em `detail` e o código de
  // domínio em `code`; no envelope antigo, em `message`/`code`. Ler o corpo
  // cru aqui deixaria o bloqueio de cobrança mudo no formato novo.
  const problema = problemaDe(error);
  const codigo = problema?.code;
  if (!isBillingBlockCode(codigo)) return;

  const mensagem = problema?.detail || 'Assinatura irregular. Regularize para continuar.';
  publishBillingBlock({ code: codigo, message: mensagem });
  avisarUmaVez(codigo, mensagem);

  // Em somente leitura a pessoa continua trabalhando (consultando, imprimindo),
  // então tirá-la da tela seria pior que o bloqueio. Nos outros códigos nem a
  // leitura passa: a tela fica inútil, e o lugar onde há o que fazer é o
  // checkout — que o backend deixa acessível de propósito (`@BillingExempt`).
  if (codigo === 'SUBSCRIPTION_READ_ONLY') return;
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/billing')) return;
  window.location.href = '/billing/upgrade';
}

/**
 * O backend esta migrando gradualmente as respostas de sucesso para o envelope
 * { success, message, data } (ver DOCS/response-phase-1-front.md e response-phase-4-front.md).
 * Aqui detectamos o envelope por formato (nao por rota) e desembrulhamos `data` de forma
 * transparente, para que os hooks continuem lendo `response.data` como antes da migracao.
 * A mensagem do backend fica "grudada" (nao-enumeravel) no payload desembrulhado, para ser
 * usada pelo toast global de sucesso das mutations (ver AppProviders.tsx).
 */
api.interceptors.response.use(
  (response) => {
    if (isApiEnvelope(response.data)) {
      const { message, data: payload } = response.data;
      if (payload && (typeof payload === 'object' || typeof payload === 'function')) {
        Object.defineProperty(payload, API_MESSAGE, {
          value: message,
          enumerable: false,
          configurable: true,
        });
      }
      response.data = payload;
    }
    return response;
  },
  async (error: AxiosError) => {
    anexarCodigoDoErro(error);

    if (typeof window !== 'undefined' && error.response?.status === 402) {
      tratarBloqueioDeCobranca(error);
      return Promise.reject(error);
    }

    if (typeof window === 'undefined' || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const config = error.config as RetriableConfig | undefined;
    const url = config?.url || '';
    // Fluxos sem sessão (login, cadastro, redefinição de senha): um 401 aqui
    // é resposta do próprio fluxo, não sessão expirada — nem refresh, nem
    // redirect para o /login.
    const isAuthCall =
      isPublicAuthRequest({ url }) ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    // Access token expira em 60 min. Antes, isso jogava quem estava no meio de
    // um atendimento direto para o /login; agora troca-se o token pelo refresh
    // (cookie) e repete-se a request original — o usuário não percebe.
    if (!isAuthCall && config && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true;
      try {
        await renewSession();
        return api.request(config);
      } catch {
        // Refresh recusado: sessão realmente acabou, segue para o logout abaixo.
      }
    }

    if (!isPublicAuthRequest({ url })) {
      clearClientSession();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
