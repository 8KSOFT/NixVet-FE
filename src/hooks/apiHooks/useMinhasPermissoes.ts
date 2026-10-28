'use client';

import { useSyncExternalStore } from 'react';
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
 * Menu do último login, lido do `localStorage` para o primeiro paint.
 *
 * ─── Por que `useSyncExternalStore` e não `placeholderData` ─────────────────
 * Até 28/10/2026 isto era o `placeholderData` da query, lido de `localStorage` no
 * primeiro render. O servidor não tem `localStorage`, então renderizava a sidebar
 * vazia e o cliente, já na hidratação, renderizava com menu: **erro de hidratação
 * (React #418) em toda tela logada**, com o React descartando o HTML do servidor e
 * refazendo a árvore no cliente. Foi achado pelo teste de navegador (e2e).
 *
 * Com `useSyncExternalStore` o servidor e a hidratação usam `getServerSnapshot`
 * (vazio), e logo depois da hidratação o React troca para o valor do cliente em
 * render síncrono, antes da pintura: o menu aparece do mesmo jeito, sem piscar e
 * sem divergência.
 *
 * ─── Identidade estável ─────────────────────────────────────────────────────
 * O snapshot precisa devolver **a mesma referência** enquanto o `localStorage` não
 * mudar, senão o React vê valor novo a cada render e entra em laço (a família do
 * bug do `NaN` de 25/08/2026: valor instável escapando de um hook de dados). Por
 * isso o objeto é guardado e só recriado quando o texto bruto de `user` muda.
 */
export const SEM_PERMISSOES: MinhasPermissoes = { role: null, permissions: [], menu: [] };

let ultimoBruto: string | null = null;
let ultimoValor: MinhasPermissoes = SEM_PERMISSOES;

export function permissoesDoLocalStorage(): MinhasPermissoes {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem('user');
  } catch {
    /* armazenamento indisponível: sem menu guardado */
  }
  if (bruto === ultimoBruto) return ultimoValor;
  ultimoBruto = bruto;
  ultimoValor = bruto
    ? { role: getStoredUserRole(), permissions: [], menu: getStoredMenuKeys() }
    : SEM_PERMISSOES;
  return ultimoValor;
}

function assinarStorage(aoMudar: () => void): () => void {
  window.addEventListener('storage', aoMudar);
  return () => window.removeEventListener('storage', aoMudar);
}

const permissoesNoServidor = (): MinhasPermissoes => SEM_PERMISSOES;

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
 * O menu do último login segura o primeiro paint enquanto a chamada está em
 * voo. Sem isso, toda navegação piscaria uma sidebar vazia — e um erro de rede
 * esconderia o menu inteiro de quem está trabalhando. O fallback é só para o
 * primeiro paint; o valor do servidor manda assim que chega.
 */
export function useMinhasPermissoesQuery() {
  const doStorage = useSyncExternalStore(assinarStorage, permissoesDoLocalStorage, permissoesNoServidor);
  const consulta = useQuery<MinhasPermissoes>({
    queryKey: ['minhas-permissoes'],
    queryFn: async () => {
      const { data } = await api.get<MinhasPermissoes>('/access-control/me');
      return data;
    },
    // 5 min: permissão muda quando alguém edita um perfil, o que é raro e não
    // precisa ser instantâneo. Mais curto que isto vira uma chamada por
    // navegação sem ganho nenhum.
    staleTime: 5 * 60_000,
  });
  // O valor do servidor manda assim que chega; antes disso (e se a rede falhar), o menu do último login.
  return { ...consulta, data: consulta.data ?? doStorage };
}
