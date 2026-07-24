# TODO: Corrigir erro de hidratação em `src/app/(app)/settings/layout.tsx`

## Contexto

Durante a Fase 2 da reestruturação de navegação (mover Produtos/Equipe para dentro
de Configurações — ver `settings-produtos`/`settings-team`), a verificação em
navegador (Playwright, `yarn dev`) encontrou um erro de hidratação do React
disparado em **toda** página de Configurações — não só nas novas
(`/settings/produtos`, `/settings/team`), mas também em páginas que já existiam
antes e não foram tocadas (`/settings/materials`, `/settings`,
`/settings/holidays` — testado e confirmado). Ou seja: **é um bug pré-existente**,
não introduzido pela Fase 2, só ficou mais visível porque a investigação passou
por várias páginas de Configurações de uma vez.

Erro exato (console do navegador, modo dev):

```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
...
Error: There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.
```

## Causa raiz

`src/app/(app)/settings/layout.tsx` lê o papel do usuário **direto no corpo da
função**, de forma síncrona, sem passar por um `useEffect`:

```tsx
const role = (getStoredUserRole() || '').toLowerCase();
const isSuperAdmin = role === 'superadmin';
const canManageTerms = ['admin', 'manager', 'superadmin'].includes(role);
const menuAllow = new Set(isSuperAdmin ? menuKeysForRole('superadmin') : getStoredMenuKeys());
```

`getStoredUserRole()`/`getStoredMenuKeys()` (`src/lib/role-permissions.ts`) checam
`typeof window === 'undefined'` e retornam um fallback quando não há `window`
(ex.: renderização no servidor). Isso significa:

- **No servidor** (SSR / primeiro render): `role = ''`, `isSuperAdmin = false`,
  `canManageTerms = false`, `menuAllow` = chaves default de veterinário — então
  seções condicionais como "Termos da Clínica", "Acesso", "Plataforma"
  (superadmin), e agora também "Estoque"/"Equipe" (Fase 2), **não aparecem**.
- **No cliente**, no primeiro paint pós-hidratação, essas mesmas funções já
  leem o `localStorage` de verdade e retornam o papel real do usuário — que
  quase sempre é diferente do fallback do servidor para qualquer usuário
  logado como admin/manager/superadmin/veterinário com permissões extras.

Resultado: o HTML que o servidor mandou não bate com o que o React tenta
renderizar no cliente na hidratação → React descarta a árvore inteira e
renderiza tudo de novo só no cliente (mensagem "the entire root will switch to
client rendering"). Funciona (o app não quebra), mas gera o erro no console em
dev, um possível "flash" de conteúdo, e é desperdício de trabalho do SSR.

## Como já resolvemos o mesmo problema em outro lugar

`src/app/(app)/layout.tsx` (o layout principal do app) já tem o padrão correto
para isso — ler dados de permissão só depois do mount, num `useEffect`,
iniciando com um estado vazio/neutro que bate com o server:

```tsx
// inicia vazio (igual no server e no primeiro paint do client) e só lê
// localStorage no useEffect abaixo — ler localStorage no initializer do
// useState quebra a hidratação, pois o server nunca tem acesso a ele.
const [menuAllow, setMenuAllow] = useState<Set<string>>(() => new Set());
const [headerRole, setHeaderRole] = useState<string>("");
...
useEffect(() => {
  const role = getStoredUserRole() || "";
  const keys = role === "superadmin" ? menuKeysForRole("superadmin") : getStoredMenuKeys();
  setMenuAllow(new Set(keys));
  setHeaderRole(role);
}, [pathname]);
```

## O que fazer

Aplicar o mesmo padrão em `src/app/(app)/settings/layout.tsx`:

1. Trocar as leituras síncronas de `getStoredUserRole()`/`getStoredMenuKeys()` por
   estado (`useState`) inicializado vazio/neutro (mesmo valor client e server),
   populado num `useEffect` (roda só no client, depois do mount).
2. Isso afeta todas as seções condicionais do arquivo: `canManageTerms`
   (Termos da Clínica, Acesso), `isSuperAdmin` (Plataforma), e as novas
   `menuAllow.has('products')` / `menuAllow.has('team')` (Estoque/Equipe).
3. Cuidado com o "flash": como isso é sobre *quais seções de navegação
   aparecem* (não é cosmético como o estado de colapso da sidebar, que já usa
   `useLayoutEffect` de propósito) — aceitar um pequeno atraso de um frame é
   razoável aqui, igual o layout principal já faz. Não precisa de
   `useLayoutEffect`.
4. Reaproveitar a guarda de RBAC que já foi adicionada na Fase 2 (redireciona
   pra `/dashboard` se o usuário não tiver `products`/`team` e cair em
   `/settings/produtos` ou `/settings/team`) — ela já está num `useEffect`
   separado; só garantir que ela rode depois que `menuAllow` já foi
   populado (ou aceitar que ela também rode com um frame de atraso, sem problema
   prático já que é um redirect, não uma leitura de conteúdo).

## Onde verificar depois de corrigir

- `yarn dev`, abrir o DevTools do navegador, navegar para `/settings`,
  `/settings/materials`, `/settings/produtos`, `/settings/team` — não deve
  aparecer nenhum "Hydration failed" no console.
- Confirmar que as seções condicionais (Termos da Clínica, Acesso, Plataforma,
  Estoque, Equipe) continuam aparecendo corretamente para cada papel/permissão
  depois da correção (o comportamento final deve ser idêntico ao de hoje, só
  sem o erro de hidratação).
