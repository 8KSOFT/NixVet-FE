# design-sync notes — NixVet-FE

## Repo shape

NixVet-FE is a Next.js **app**, not a standalone design-system package —
`package.json` is `private: true` with no `main`/`module`/`exports`. There is
no Storybook. The synced "design system" is `src/components/**` (shadcn/Radix
primitives in `ui/`, plus composed app components in `shared/`, `dialogs/`,
`onboarding/`, `billing/`, and a handful of top-level files). This is a
judgment call, not a real published component library — expect friction that
a genuine DS package wouldn't have (see the three overrides below).

## Config mechanics specific to this repo

- **`cfg.entry` is a deliberately non-existent placeholder**
  (`src/components/.nixvet-ui-entry-placeholder.js`). This repo has no dist
  build, so we need the synth-entry fallback — but that fallback only
  triggers when `PKG_DIR` resolves to the real repo root (via the
  `--entry`-triggers-a-walk-up-to-package.json code path in
  `package-build.mjs`), which in turn only happens when `ENTRY_OVERRIDE` is
  set. Pointing it at a path that doesn't exist gets both: PKG_DIR walks up
  to the repo root package.json, and `resolveDistEntry`'s soft-fail returns
  null so `resolvePackage` still synthesizes the entry from `src/`. **Do not
  "fix" this by removing `cfg.entry` or pointing it at a real file** — either
  breaks PKG_DIR resolution or disables synth-entry.
- A stub `node_modules/nixvet-ui/package.json` (`{"name":"nixvet-ui","version":"0.0.0"}`)
  exists so early calls to `exportedNames(PKG_DIR, pkgJson)` (before
  `cfg.entry`'s walk-up path is known) don't crash on a missing file. It's
  gitignored (node_modules) — **recreate it after a fresh `npm/yarn install`
  if it's ever wiped**: `mkdir -p node_modules/nixvet-ui && echo
  '{"name":"nixvet-ui","version":"0.0.0","private":true}' >
  node_modules/nixvet-ui/package.json`. (In practice this hasn't been an
  issue since `cfg.entry`'s walk-up finds the real repo root package.json
  first, but keep the stub in case a future design-sync version changes the
  resolution order.)
- `cfg.buildCmd` (`node .design-sync/scripts/build-css.mjs`) compiles
  `src/app/globals.css` (Tailwind v4, `@import "tailwindcss"`) through
  `postcss` + `@tailwindcss/postcss` directly — esbuild alone can't expand
  Tailwind's JIT-scanned utilities. The script also patches two known-broken
  bits of the compiled output (see below). **Always re-run this before
  `package-build.mjs`** — `cfg.cssEntry` points at its output
  (`.design-sync/build/tailwind.css`), which is gitignored/regenerated, not
  committed.

## Known-broken bits in the compiled CSS (fixed by build-css.mjs)

1. **`--font-sans`/`--font-heading` are self-referential** in
   `src/app/globals.css` (`--font-sans: var(--font-sans), "Inter", …`).
   This is intentional in the real app: `next/font`'s inline style on
   `<html>` overrides `--font-sans` before this `:root` rule is ever read,
   breaking the cycle. Outside that runtime (any static export, including
   this sync), the self-reference makes the property guaranteed-invalid per
   the CSS spec, so `font-family` silently falls back to the browser
   default — not even the literal `"Inter"` fallback text is reached.
   `build-css.mjs` rewrites both declarations to real fallback stacks.
2. **The `InterDoFigma` `@font-face` uses a root-relative URL**
   (`url("/fonts/inter-black/...")`), which resolves fine when served from
   the app's origin but not when design-sync's font scraper resolves it
   relative to the CSS file's own directory. Rewritten to a real relative
   path (`../../public/fonts/...`) so `extractFonts` can find and copy it.
3. **Inter/Poppins (Google Fonts) are loaded via `next/font/google`** in
   `src/app/layout.tsx`, not via any `@font-face` in `globals.css` — Next
   self-hosts them with hashed family names (`__Inter_xxxxx`) injected at
   runtime, invisible to a static CSS scrape. `.design-sync/build/brand-fonts.css`
   (wired via `cfg.extraFonts`) ships real `@font-face` rules for both,
   using the actual latin-subset `.woff2` files extracted from a local
   `next build`'s `.next/static/media/` (copied once into
   `.design-sync/build/fonts-src/` — **not** referenced live from `.next/`,
   which is ephemeral and gitignored). **Re-sync risk**: if the app's
   `next/font` config changes (different weights/subsets), or a Next/font
   version bump changes which files get generated, these copied `.woff2`
   files go stale — re-extract from a fresh `next build`'s
   `.next/static/css/app/layout.css` (look for the `@font-face` blocks and
   their `unicode-range: U+0000-00FF, …` latin block) and re-copy into
   `.design-sync/build/fonts-src/`.

## Overrides (`.design-sync/overrides/`, declared in `cfg.libOverrides`)

Three forks were needed — none change the app's self-check output contract
(IIFE shape, header stamp, footer), see each file's header comment for the
full reasoning:

- **`bundle.mjs`** — adds `inject: [process-shim.mjs]` to the esbuild config.
  The synthesized entry transitively pulls in Next.js client internals
  (`next/link`, `next/image`, `next/navigation`) and app modules
  (`src/lib/axios.ts`) that reference a bare `process` global
  (`process.env.NEXT_PUBLIC_*`, `process.env.__NEXT_*`, `process.platform`,
  `process.nextTick`). Next's webpack provides these at build time; esbuild's
  browser-platform bundle does not, and the bare `process` reference crashed
  **every single preview** at bundle-init (masked as `[RENDER_ERRORS]
  ReferenceError: process is not defined` — always check whether a render
  failure is universal across all components, which points at bundle-init,
  vs isolated to one, which points at that component).
- **`process-shim.mjs`** — the injected shim itself (`process.env = {}`,
  `platform: 'browser'`, `nextTick`, …). Sibling file to `bundle.mjs`, not a
  fork of anything upstream.
- **`source-kit.mjs`** — the synth-entry writer generated `export * from
  <file>;` for every component file. `export *` does **not** re-export a
  file's `default` export (ES module semantics) — so `AppProviders.tsx`,
  `Logo.tsx`, `LanguageSwitcher.tsx`, `LegalDocumentShell.tsx` (all
  `export default function X()`) were silently absent from
  `window.NixVetUI` even though they were correctly discovered as
  components. This specifically broke `cfg.provider` (`AppProviders`
  resolved to `undefined`, so **every** preview's provider wrapper crashed)
  — masked in aggregate by the floor card's empty-root fallback, surfaced as
  one outright `[RENDER_ERRORS] Element type is invalid ... got: undefined`
  on `PlanUpgradeGate` (the one component whose floor card doesn't render
  blank-but-harmless). Fork additionally emits `export { default as Name }
  from <file>;` for files with a recoverable default-export name.
  **Re-sync risk**: if a NEW top-level component is added as a bare
  `export default function X()` (matching the existing four), it needs this
  fork to be exported correctly — the fork is general (not a per-name list),
  so this should just work, but double-check any newly-added
  `[BUNDLE_EXPORT] not a component` warning against this.

## Known/triaged render warns

- `[TOKENS_MISSING] --radix-navigation-menu-viewport-height,
  --radix-navigation-menu-viewport-width, --radix-accordion-content-height`
  — set at runtime by Radix's own JS (animation sizing), never present in a
  static stylesheet scrape. Expected, non-blocking.
- `[TOKENS_MISSING] --tw` — a truncated/partial Tailwind v4 internal
  variable reference picked up by the scraper's regex; not chased further
  (non-blocking, cosmetic).

## Known limitation: `aria-invalid:` variant doesn't visually apply (Input, possibly others)

`Input`'s `Invalid` story sets `aria-invalid` (renders as `aria-invalid="true"`
in the DOM — confirmed) and the component's own class list includes
`aria-invalid:border-destructive` (confirmed present in the compiled CSS,
confirmed the element `.matches()` the compiled selector). By CSS
specificity rules this should override `.border-input`'s plain-class rule,
and an isolated repro with byte-identical rule shapes (`@layer` structure,
nesting, everything) renders correctly in the same Playwright/Chromium.
Yet in the real bundle the input's computed `border-color` stays the
`--input` gray, never switching to `--destructive` red. Root cause not
found within the time spent (ruled out: missing attribute, missing/wrong
CSS rule, wrong layer, wrong specificity, duplicate conflicting rule,
native-CSS-nesting support). **Only the `Input` `Invalid` cell is graded
`needs-work`** for this reason — every other `aria-invalid:` consumer in
the scoped set (e.g. `Form`'s error state, which styles the label/message
via a different mechanism) looked correct. If this resurfaces on a re-sync,
worth checking: whether it's specific to `file://`-protocol page loads
(Playwright's render check always uses `file://`, so this may be invisible
in a real browser hitting the DS pane over `https://`), or a Tailwind
v4/`@tailwindcss/postcss` version-specific nesting-serialization quirk.

## Preview authoring status

**Done** (this run). All 32 core `ui/` components scoped in by the user
(Accordion, Alert, AlertDialog, Avatar, Badge, Breadcrumb, Button, Calendar,
Card, Checkbox, Command, CurrencyInput, Dialog, DropdownMenu, Form, Input,
Label, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select,
Separator, Sheet, Sidebar, Skeleton, Switch, Table, Tabs, Textarea, Tooltip)
have authored previews in `.design-sync/previews/`, all graded `good` except
one cell (`Input`'s `Invalid` — see above). Content is realistic PT-BR
veterinary-clinic domain data (pet names, tutor names, appointment times),
matching the app's actual locale and use cases.

The remaining ~166 discovered components/subcomponents (out of 198 total)
ship on the floor card by design — this was an explicit user scope decision
("core ~30-40 only"), not a gap. Most are Radix subcomponents
(`AccordionItem`, `DialogContent`, `TableCell`, etc.) that only make sense
composed inside their authored parent, which they already are, or one-off
app screens (`PlanUpgradeGate`, `WhatsappMediaBubble`,
`EmailConfirmationBanner`, `SetupChecklistWidget`, dashboard/billing
widgets) that weren't in scope. All are still fully functional/importable
from `window.NixVetUI` — authoring their previews is a standing offer on
any future re-sync (previews and grades carry forward; nothing here needs
to be redone).
