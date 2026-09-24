/**
 * Leitura da sessão guardada em `localStorage` — **sem cópia da matriz de RBAC**.
 *
 * ─── O que saiu daqui, e por quê (E20, passo 5) ────────────────────────────
 * Este arquivo carregava uma cópia de ~140 linhas do mapa papel → chaves de menu,
 * espelhando `backend/src/core/rbac/permissions.ts`. Era a segunda de três cópias
 * (a terceira é o app mobile), e cópia de matriz divergindo em silêncio já custou
 * caro: adicionar uma tela ao menu exigia editar dois repositórios, e perfil
 * customizado de clínica não mudava menu nenhum, porque a cópia conhecia
 * **papéis**, não perfis.
 *
 * Desde o E20 quem decide o menu é `GET /access-control/me`, calculado pelo mesmo
 * `PermissionService` que autoriza no servidor. Com isso a cópia deixou de ser
 * fonte de verdade — e o que restava dela era pior que inútil:
 *
 * - **Para superadmin ela vencia o servidor.** `getStoredMenuKeys` devolvia as
 *   chaves da matriz local e **ignorava** `user.permissions`, por causa de um
 *   remendo antigo (sessão velha sem `finance-admin`). Ou seja: exatamente para
 *   o papel mais poderoso, o primeiro paint mostrava o que o front achava, não o
 *   que o servidor sabia.
 * - **Para os demais, era um menu adivinhado** que aparecia por um instante e
 *   podia mudar quando a resposta chegava — o sintoma que o próprio comentário
 *   deste arquivo já classificava como o pior possível.
 *
 * ─── O que ficou ───────────────────────────────────────────────────────────
 * Só a leitura do que o **servidor** gravou no login. Sem sessão guardada, o
 * primeiro paint sai com menu vazio, e isso é deliberado: a resposta de
 * `/access-control/me` chega em ~100 ms, e sidebar vazia por um instante é
 * honesta, enquanto sidebar adivinhada é errada.
 *
 * **Não recrie a matriz aqui.** Chave nova de menu vive no backend
 * (`core/rbac/permissions.ts` + o seeder de access-control).
 */
export function getStoredMenuKeys(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    // `permissions` é escrito pelo backend a cada login e a cada refresh
    // (`SessionService.buildStaffSession`). Se não houver, não se adivinha.
    return Array.isArray(user?.permissions) ? (user.permissions as string[]) : [];
  } catch {
    return [];
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
