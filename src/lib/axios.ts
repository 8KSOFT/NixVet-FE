import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from './api-base';
import { API_MESSAGE, isApiEnvelope } from '@/app/types/api-response';

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

const CSRF_COOKIE = 'nixvet_csrf';
const TENANT_COOKIE = 'nixvet_tenant_id';
const SAFE_METHODS = new Set(['get', 'head', 'options']);

function isPublicAuthRequest(config: { url?: string }) {
  const path = config.url || '';
  return (
    path.includes('auth/login') ||
    path.includes('auth/register') ||
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
 * Persiste tenantId em cookie para que novas abas no mesmo subdomínio
 * herdem o contexto sem depender exclusivamente do localStorage.
 * O backend também grava este cookie no login; esta função cobre o caso de
 * quem troca de tenant sem passar por um novo login.
 */
export function setTenantCookie(tenantId: string) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TENANT_COOKIE}=${encodeURIComponent(tenantId)}; max-age=86400; path=/${secure}; SameSite=Lax`;
}

/** Remove o cookie de tenant (logout). */
export function clearTenantCookie() {
  document.cookie = `${TENANT_COOKIE}=; max-age=0; path=/`;
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
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

    // Recalculate baseURL on client side to apply protocol auto-upgrade
    if (!config.baseURL || config.baseURL !== getApiBaseUrl()) {
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
    if (typeof window === 'undefined' || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const config = error.config as RetriableConfig | undefined;
    const url = config?.url || '';
    const isAuthCall =
      url.includes('/auth/login') ||
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

    if (!url.includes('/auth/login')) {
      clearClientSession();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
