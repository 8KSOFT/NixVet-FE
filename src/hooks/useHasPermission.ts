'use client';

import { useEffect, useState } from 'react';
import { getStoredUserRole } from '@/lib/role-permissions';
import { roleHasPermission } from '@/lib/permission-matrix';

/**
 * O papel da sessão tem as chaves informadas? Existe para alimentar o
 * `enabled` de queries cuja rota ganhou `@Permissions` no backend — ver
 * `src/lib/permission-matrix.ts` para o que este gate é e o que ele não é.
 *
 * O papel mora no localStorage, que não existe no servidor: a leitura acontece
 * depois do mount (mesmo padrão do layout e do dashboard). Enquanto o papel
 * não foi lido a resposta é `false` — a requisição só sai no render seguinte,
 * e sair um render depois é melhor que sair para quem vai levar 403.
 */
export function useHasPermission(...keys: string[]): boolean {
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRole(getStoredUserRole());
    setReady(true);
  }, []);

  if (!ready) return false;
  return roleHasPermission(role, ...keys);
}
