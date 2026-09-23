/**
 * Cópia local da matriz de menu por papel.
 *
 * **Não é mais a fonte de verdade** (E20, 23/09/2026). Quem decide o menu é
 * `GET /access-control/me`, consumido por `hooks/apiHooks/useMinhasPermissoes.ts`
 * — calculado pelo mesmo serviço que autoriza no servidor, e por isso capaz de
 * refletir perfil customizado de clínica, que esta cópia nunca soube ler.
 *
 * O que sobrou daqui é **só o fallback do primeiro paint**, enquanto a chamada
 * está em voo: sem ele, toda navegação piscaria sidebar vazia e um erro de rede
 * esconderia o menu de quem está trabalhando.
 *
 * Portanto: **não adicione chave nova aqui** esperando que apareça na tela. O
 * lugar é o backend (`core/rbac/permissions.ts` + o seeder de access-control).
 * Mexer só aqui produz um menu que aparece por um instante e desaparece — o
 * pior sintoma possível.
 */
/**
 * Espelha backend/src/core/rbac/permissions.ts — usado como fallback se `user.permissions` não existir (sessões antigas).
 */
const MENU_BY_ROLE: Record<string, readonly string[]> = {
  superadmin: [
    'dashboard',
    'clinics-admin',
    'finance-admin',
    'support-admin',
    'patients',
    'owners',
    'team',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'chatbot',
    'medical-records',
    'hospitalizations',
    'financeiro',
    'financeiro-lancamentos',
    'financeiro-contas-pagar',
    'financeiro-receitas',
    'financeiro-custos',
    'financeiro-receita',
    'financeiro-planos-saude',
    'financeiro-fluxo',
    'financeiro-produtos',
    'budgets',
    'products',
    'balcao',
    'help',
    'settings',
  ],
  admin: [
    'dashboard',
    'patients',
    'owners',
    'team',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'chatbot',
    'medical-records',
    'hospitalizations',
    'financeiro',
    'financeiro-lancamentos',
    'financeiro-contas-pagar',
    'financeiro-receitas',
    'financeiro-custos',
    'financeiro-receita',
    'financeiro-planos-saude',
    'financeiro-fluxo',
    'financeiro-produtos',
    'budgets',
    'products',
    'balcao',
    'help',
    'settings',
  ],
  manager: [
    'dashboard',
    'patients',
    'owners',
    'team',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'chatbot',
    'medical-records',
    'hospitalizations',
    'financeiro',
    'financeiro-lancamentos',
    'financeiro-contas-pagar',
    'financeiro-receitas',
    'financeiro-custos',
    'financeiro-receita',
    'financeiro-planos-saude',
    'financeiro-fluxo',
    'financeiro-produtos',
    'budgets',
    'products',
    'balcao',
    'help',
    'settings',
  ],
  reception: [
    'dashboard',
    'patients',
    'owners',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'balcao',
    'help',
  ],
  intern: [
    'dashboard',
    'patients',
    'owners',
    'calendar',
    'vaccines',
    'tasks',
    'hospitalizations',
    'help',
  ],
  veterinarian: [
    'dashboard',
    'patients',
    'owners',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'medical-records',
    'hospitalizations',
    'help',
  ],
};

export function menuKeysForRole(role: string | null | undefined): string[] {
  const r = (role || 'veterinarian').toLowerCase().trim();
  return [...(MENU_BY_ROLE[r] ?? MENU_BY_ROLE.veterinarian)];
}

export function getStoredMenuKeys(): string[] {
  if (typeof window === 'undefined') return [...MENU_BY_ROLE.veterinarian];
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const roleKeys = menuKeysForRole(user?.role);
    if (Array.isArray(user?.permissions) && user.permissions.length > 0) {
      // Superadmin: menu completo do frontend (ignora sessão antiga sem finance-admin)
      if ((user?.role ?? '').toLowerCase() === 'superadmin') {
        return roleKeys;
      }
      return user.permissions as string[];
    }
    return roleKeys;
  } catch {
    return menuKeysForRole('veterinarian');
  }
}

export function getStoredUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return user?.role ?? null;
  } catch {
    return null;
  }
}
