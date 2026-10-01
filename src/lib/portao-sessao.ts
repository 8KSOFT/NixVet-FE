/**
 * Portão de sessão no servidor para a área autenticada.
 *
 * Até 01/10/2026 nada no servidor olhava a sessão: quem abria `/patients` sem
 * estar logado baixava e renderizava o app inteiro (inclusive o menu de
 * superadmin) e só era mandado ao /login depois do primeiro 401 da API. Os
 * dados nunca vazaram — a API protege —, mas é JS e tela que não deviam sair.
 *
 * O sinal é o cookie `nixvet_csrf`: é o único da sessão que chega a esta
 * origem em qualquer rota (path `/`, não HttpOnly) e vive tanto quanto o
 * refresh (60 dias). `nixvet_access` expira em 60 min e o refresh só viaja em
 * `/api/auth` — usar qualquer um dos dois expulsaria quem ainda tem sessão
 * renovável.
 *
 * Entra com flag (`AUTH_GATE`), como toda mudança de comportamento para a
 * base instalada:
 *   off      (padrão) não faz nada
 *   observe  só registra no log quem SERIA redirecionado
 *   on       redireciona para /login
 */

export type AuthGateMode = 'off' | 'observe' | 'on';

export function authGateMode(valor: string | undefined): AuthGateMode {
  const v = (valor ?? '').trim().toLowerCase();
  if (v === 'observe' || v === 'on') return v;
  return 'off';
}

export const SESSION_HINT_COOKIE = 'nixvet_csrf';

/**
 * Primeiro segmento das rotas do grupo `(app)`. Lista positiva de propósito:
 * arquivo de `public/`, rota legal ou rota nova fora da área logada nunca cai
 * no portão por engano. Rota nova DENTRO de `(app)` precisa entrar aqui — o
 * `prebuild` (scripts/checar-rotas-protegidas.mjs) falha se a lista e as
 * pastas divergirem.
 */
export const ROTAS_PROTEGIDAS = [
  'ajuda',
  'balcao',
  'billing',
  'bulario',
  'calendar',
  'chatbot-workflows',
  'dashboard',
  'exams',
  'financeiro',
  'followups',
  'internacoes',
  'medical-records',
  'owners',
  'patients',
  'prescriptions',
  'profile',
  'settings',
  'superadmin',
  'tasks',
  'termos',
  'vaccines',
  'whatsapp',
] as const;

// Rotas antigas que o next.config redireciona para dentro de /settings.
const REDIRECIONADAS = ['produtos', 'team'];

const PROTEGIDAS = new Set<string>([...ROTAS_PROTEGIDAS, ...REDIRECIONADAS]);

export function isRotaProtegida(pathname: string): boolean {
  const primeiro = pathname.split('/')[1] ?? '';
  return PROTEGIDAS.has(primeiro);
}

/** `/login?next=` não existe no app; o destino é fixo — sem open redirect. */
export function destinoLogin(): string {
  return '/login';
}
