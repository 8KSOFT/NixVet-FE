# Rollback: compressão/redução do menu lateral (Sidebar)

## Contexto

Nesta sessão o menu lateral foi comprimido em duas frentes:

1. **Fase 2 da reestruturação de navegação** — reduziu o menu fixo de ~17 para ~11 itens, movendo Bulário, Vacinas, Acompanhamento e Tarefas para "contextuais" (buscáveis via `Ctrl/Cmd+K`, sem item fixo na sidebar), e movendo Produtos/Equipe fisicamente para dentro de `/settings/produtos` e `/settings/team`.
2. **Redesign visual da sidebar** (mesma sessão, depois) — botão de recolher, espaçamento vertical, estilo do "+ Novo", estilo do seletor de idioma no rodapé do drawer mobile.

Este documento existe para permitir desfazer qualquer parte disso (ou tudo) numa sessão futura, sem precisar caçar nos diffs.

**Importante sobre o estado do git**: nada disso foi commitado ainda (está tudo em working tree, no mesmo commit `41cd72e` de antes da sessão). Só que os arquivos principais (`src/app/(app)/layout.tsx`, `src/app/(app)/settings/layout.tsx`) também têm OUTRAS correções desta mesma sessão misturadas (notificações, posição do banner de trial, etc.) que **não têm nada a ver com o menu lateral**. Por isso **não use `git checkout -- <arquivo>`** para reverter — isso desfaria essas outras correções também. Siga os passos abaixo item por item.

---

## A. Trazer os itens de volta pro menu fixo (desfazer a Fase 2)

Arquivo novo: `src/config/navigation.ts` (antes da Fase 2, esse arquivo não existia — `NAV_SECTIONS` vivia direto dentro de `src/app/(app)/layout.tsx`).

Hoje `NAV_SECTIONS` tem só: `main` (Dashboard, Agenda, Pacientes, Responsáveis), `clinical` (Prontuário, Prescrição, Exames, Internações, Termos), `finance`, `comms`, `superadmin`, `admin`. Os 6 itens removidos foram para `CONTEXTUAL_NAV_ITEMS` (mesmo arquivo).

**Para trazer um item de volta ao menu fixo**: mover a entrada correspondente de `CONTEXTUAL_NAV_ITEMS` para dentro do array `NAV_SECTIONS`, na seção que fizer sentido (ex.: `vaccines` e `followups` podem voltar para dentro da seção `main` ou `clinical`; `tasks` idem; `bulario` para `clinical`).

**Para reverter 100% ao layout original de 17 itens**, o `NAV_SECTIONS` era assim (seções `general`/`clinic`/`schedule`/`clinical`/`finance`/`comms`/`superadmin`/`admin`):

```ts
const NAV_SECTIONS: NavSection[] = [
  {
    sectionKey: "general",
    items: [
      { key: "dashboard", icon: MenuIconsWhite.dashboard, href: "/dashboard", labelKey: "nav.dashboard" },
      { key: "products", icon: Package, href: "/produtos", labelKey: "nav.financeiroProdutos" },
    ],
  },
  {
    sectionKey: "clinic",
    labelKey: "nav.sectionClinic",
    items: [
      { key: "patients", icon: MenuIconsWhite.pacientes, href: "/patients", labelKey: "nav.patients" },
      { key: "owners", icon: MenuIconsWhite.tutores, href: "/owners", labelKey: "nav.owners" },
      { key: "team", icon: MenuIconsWhite.equipe, href: "/team", labelKey: "nav.team" },
    ],
  },
  {
    sectionKey: "schedule",
    labelKey: "nav.sectionSchedule",
    items: [
      { key: "calendar", icon: MenuIconsWhite.agenda, href: "/calendar", labelKey: "nav.calendar" },
      { key: "vaccines", icon: Syringe, href: "/vaccines", labelKey: "nav.vaccines" },
      { key: "tasks", icon: MenuIconsWhite.tarefas, href: "/tasks", labelKey: "nav.tasks" },
    ],
  },
  {
    sectionKey: "clinical",
    labelKey: "nav.sectionClinical",
    items: [
      { key: "medical-records", icon: MenuIconsWhite.prontuarios, href: "/medical-records", labelKey: "nav.medicalRecords" },
      { key: "prescriptions", icon: MenuIconsWhite.prescricao, href: "/prescriptions", labelKey: "nav.prescriptions" },
      { key: "bulario", icon: MenuIconsWhite.bulario, href: "/bulario", labelKey: "nav.bulario" },
      { key: "exams", icon: MenuIconsWhite.exames, href: "/exams", labelKey: "nav.exams" },
      { key: "followups", icon: MenuIconsWhite.acompanhamento, href: "/followups", labelKey: "nav.followups" },
      { key: "hospitalizations", icon: BedDouble, href: "/internacoes", labelKey: "nav.hospitalizations" },
      { key: "clinical-terms", icon: FileCheck, href: "/termos", labelKey: "nav.clinicalTerms" },
    ],
  },
  // finance, comms, superadmin, admin — iguais até hoje, sem mudança
];
```

Isso dava 17 itens visíveis (contando os filhos do grupo "financeiro" à parte). Ao colar isso de volta, também é preciso: apagar `CONTEXTUAL_NAV_ITEMS` e `getSearchableNavItems` (ou só simplificar `getSearchableNavItems` para retornar `flattenNavItems(getVisibleNavSections(NAV_SECTIONS, menuAllow))` sem concatenar mais nada), e trocar `src/components/command-palette.tsx` de volta para usar `flattenNavItems(getVisibleNavSections(...))` direto (sem `getSearchableNavItems`).

---

## B. Trazer Produtos e Equipe de volta para `/produtos` e `/team`

1. Mover os arquivos:
   - `src/app/(app)/settings/produtos/page.tsx` → `src/app/(app)/produtos/page.tsx`
   - `src/app/(app)/settings/team/page.tsx` → `src/app/(app)/team/page.tsx`
2. Em cada um, reverter o fallback do redirect de `?create=1`: `pathname ?? '/settings/produtos'` → `pathname ?? '/produtos'` (e o equivalente em `team`).
3. Em `src/app/(app)/settings/layout.tsx`: remover as seções `Estoque` e `Equipe` (e a leitura de `menuAllow`/`useEffect` de guarda de RBAC que foi adicionada só por causa delas — ver seção "Fase 2" no histórico do chat, ou simplesmente remover tudo que menciona `products`/`team`/`Package`/`Users` nesse arquivo).
4. Em `next.config.mjs`: remover o bloco `redirects()` inteiro (era só pra isso).
5. Em `src/config/quick-create.ts`: reverter os `href` de `team-member` e `product` de volta para `/team?create=1` e `/produtos?create=1`.

---

## C. Botão de recolher a sidebar (redesign visual)

Arquivo: `src/app/(app)/layout.tsx`, dentro de `SidebarNav`.

**Antes** (botão pequeno, círculo com borda, ícones `PanelLeftClose`/`PanelLeftOpen`, só aparecia a partir de 1724px de largura — breakpoint `lg` customizado deste projeto):

```tsx
<Button
  variant="ghost"
  size="icon"
  className={`w-6 h-6 rounded-full border border-white items-center justify-center hidden text-white transition-colors duration-200 lg:inline-flex ${collapsed ? 'ml-2.5': ''}`}
  onClick={() => setCollapsed(!collapsed)}
  aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
>
  {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
</Button>
```

(imports: `PanelLeftClose, PanelLeftOpen` de `lucide-react`; e o cabeçalho da sidebar usava uma estrutura de divs aninhada com `items-end` em vez de `items-center`.)

**Depois** (atual): botão maior (`h-10 w-10`), sem borda/círculo, ícones `ChevronsLeft`/`ChevronsRight`, aparece a partir de 1200px (breakpoint `md`), alinhado verticalmente com a logo via `items-center` na linha toda.

Para reverter: trocar de volta os ícones importados e o JSX do botão, e trocar `items-center`/`justify-center|justify-between` do cabeçalho de volta pela estrutura antiga com `items-end`.

---

## D. Espaçamento vertical dos itens do menu

Arquivo: `src/app/(app)/layout.tsx`, dentro de `SidebarNav`.

- **Antes**: `<nav className="flex flex-col gap-2 px-4 pt-10 pb-10 [padding-bottom:...]">`
- **Depois**: `pt-2` no lugar de `pt-10`.

Reverter: trocar `pt-2` de volta para `pt-10`.

---

## E. Botão "+ Novo" (destaque visual)

Arquivo: `src/components/quick-create-menu.tsx` — **esse componente inteiro é novo** (antes da Fase 1 da reestruturação de navegação, esse botão não existia — cada tela tinha só o próprio botão de criar isolado).

- Estilo inicial (mais chamativo): `variant="secondary"` + `border border-white/15 bg-white/10 text-white hover:bg-white/20`.
- Estilo atual (mais discreto, depois do feedback): `variant="ghost"` + `text-white/70 hover:bg-white/10 hover:text-white` (sem borda, sem fundo fixo).

Se quiser remover o botão inteiro (voltar para cada tela ter só o próprio "Novo X" isolado, sem menu central): remover `<QuickCreateMenu .../>` de `src/app/(app)/layout.tsx` (aparece 2x: sidebar e header mobile) e desfazer os `useEffect` de `?create=1` adicionados nas páginas (`patients`, `calendar`, `team`/`settings/team`, `produtos`/`settings/produtos`, `prescriptions`, `vaccines`, `followups`, `tasks`).

---

## F. Seletor de idioma no rodapé do drawer mobile

Arquivo: `src/components/LanguageSwitcher.tsx` + `src/app/(app)/layout.tsx`.

- **Antes da Fase 1**: o seletor de idioma só existia no header desktop — não aparecia em lugar nenhum do menu mobile.
- **Hoje**: aparece no rodapé do drawer mobile (`{isMobile && (...)}` no fim de `SidebarNav`), com uma prop nova `variant="subtle"` (fundo/borda translúcidos, pensados pra não "brilhar" demais sobre o verde).

Para reverter só a aparência (manter o rodapé, mas com o visual branco padrão): trocar `<LanguageSwitcher variant={medical ? "subtle" : "default"} />` por `<LanguageSwitcher />`.

Para reverter 100% ao original (sem seletor de idioma nenhum no mobile): remover o bloco `{isMobile && (...)}` inteiro no fim de `SidebarNav`, remover a prop `isMobile` de `SidebarNavProps`, e remover a prop `variant` de `LanguageSwitcher.tsx` (voltando ao componente só com `className`).

---

## Se quiser reverter tudo de uma vez

Pedir pro Claude Code ler este arquivo inteiro e desfazer os itens A→F nessa ordem, rodando `yarn lint && yarn build` depois de cada bloco. Não usar `git checkout` nos arquivos principais — eles têm outras correções desta sessão (notificações, posição do banner de trial, cards do dashboard) que não são parte da compressão do menu e não devem ser perdidas.
