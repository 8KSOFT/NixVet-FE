'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getStoredMenuKeys, getStoredUserRole } from '@/lib/role-permissions';

export interface MinhasPermissoes {
  role: string | null;
  /** Chaves `recurso.acao` efetivas — decidem botão e ação. */
  permissions: string[];
  /** Chaves de menu do RBAC legado — é o que a Sidebar lê. */
  menu: string[];
}

/**
 * Placeholder do primeiro paint — **identidade estável**, definida no módulo.
 *
 * ─── Por que não pode ser inline ───────────────────────────────────────────
 * O React Query só reaproveita o placeholder anterior quando a **referência da
 * função** é a mesma entre renders (`queryObserver.js`: `options.placeholderData
 * === prevResultOptions?.placeholderData`). Declarada inline nas opções do
 * `useQuery`, ela é uma função nova a cada render, o reuso nunca acontece, e cada
 * render produz um objeto novo com arrays novos.
 *
 * Isso ligava um laço de render enquanto a chamada estava em voo: objeto novo →
 * o `useEffect([minhasPermissoes])` do layout dispara → `setMenuAllow(new Set(…))`
 * → `Set` com identidade nova → re-render → objeto novo → … É a mesma família do
 * bug de 25/08/2026 (`NaN` escapando de um `useQuery`, ~280 commits/s), e a
 * lição de lá vale aqui: **valor instável escapando de um `useQuery` é a causa
 * mais provável de lentidão geral inexplicada** neste projeto.
 *
 * Com a referência estável, o objeto é criado uma vez por janela de carregamento
 * e reusado nos renders seguintes.
 */
const placeholderDoLocalStorage = (): MinhasPermissoes => ({
  role: getStoredUserRole(),
  permissions: [],
  menu: getStoredMenuKeys(),
});

/**
 * O que **esta** sessão pode, perguntado ao servidor (E20 / IAM-03).
 *
 * ─── O que isto substitui ───────────────────────────────────────────────────
 * O menu vinha de `localStorage`, escrito no login. Dois defeitos conhecidos:
 *
 * 1. **Só atualiza ao relogar.** `renewSession()` chama `POST /auth/refresh` e
 *    descarta o corpo, então quem já estava com sessão aberta não via item de
 *    menu novo até deslogar — foi o que aconteceu com o Balcão, e a primeira
 *    pergunta do suporte passou a ser "já deslogou e logou de novo?".
 * 2. **Perfil customizado de clínica não mudava nada**, porque a cópia do
 *    front conhece *papéis*, não perfis — e a matriz vive em três arquivos que
 *    divergem entre si (memória "Três cópias do RBAC").
 *
 * A resposta vem do mesmo `PermissionService` que autoriza no servidor: se o
 * botão aparece, a rota atrás dele responde.
 *
 * ─── Por que ainda há fallback ao localStorage ──────────────────────────────
 * `placeholderData` mantém o menu do último login enquanto a chamada está em
 * voo. Sem isso, toda navegação piscaria uma sidebar vazia — e um erro de rede
 * esconderia o menu inteiro de quem está trabalhando. O fallback é só para o
 * primeiro paint; o valor do servidor manda assim que chega.
 */
export function useMinhasPermissoesQuery() {
  return useQuery<MinhasPermissoes>({
    queryKey: ['minhas-permissoes'],
    queryFn: async () => {
      const { data } = await api.get<MinhasPermissoes>('/access-control/me');
      return data;
    },
    // 5 min: permissão muda quando alguém edita um perfil, o que é raro e não
    // precisa ser instantâneo. Mais curto que isto vira uma chamada por
    // navegação sem ganho nenhum.
    staleTime: 5 * 60_000,
    // Referência do módulo, não função inline — ver o bloco acima.
    placeholderData: placeholderDoLocalStorage,
  });
}
