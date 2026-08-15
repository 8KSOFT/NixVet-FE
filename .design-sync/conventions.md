## NixVet UI — conventions

NixVet is a clinical/veterinary SaaS. Copy in the shipped components is
Brazilian Portuguese (PT-BR) — keep new compositions in PT-BR to match.

### Wrap every screen in `AppProviders`

Every composition **must** be wrapped in `<AppProviders>` (exported from this
bundle). It supplies React Query, i18next, and the tooltip context —
without it, any component using data fetching, translations, or `Tooltip`
throws or renders blank.

```jsx
import { AppProviders, Button, Card } from "nixvet-ui";

<AppProviders>
  <Card className="w-80">…</Card>
</AppProviders>
```

### Styling idiom: Tailwind v4 utility classes + CSS custom properties

There are no separate style props or a CSS-in-JS layer — every component is
styled with Tailwind utility classes (`className`), reading brand colors
through CSS custom properties defined in `:root`. Use the token names below,
never raw hex or Tailwind's default palette (`bg-green-500`, etc.) — the
brand is NOT Tailwind green.

| Token (CSS var) | Tailwind utility | Use |
|---|---|---|
| `--primary` (#12b37f, brand green) | `bg-primary` / `text-primary` | primary actions, brand accents |
| `--primary-foreground` | `text-primary-foreground` | text/icons on primary fill |
| `--destructive` (#dc2626) | `bg-destructive` / `text-destructive` | delete/cancel/error |
| `--secondary`, `--muted`, `--accent` | `bg-secondary`, `bg-muted`, `bg-accent` | secondary surfaces, subtle fills |
| `--foreground` / `--muted-foreground` | `text-foreground` / `text-muted-foreground` | body text / de-emphasized text |
| `--card`, `--border`, `--input` | `bg-card`, `border-border`, `border-input` | card surfaces, default borders |
| `--sidebar`, `--sidebar-foreground` | `bg-sidebar`, `text-sidebar-foreground` | the app's dark navy sidebar shell only |
| `--brand-deep` (#12b37f), `--brand-deep-dark` (#09452d) | `bg-brand-deep`, `text-brand-deep-dark` | same green family as `--primary`, for emphasis outside the primary/action semantics |
| `--radius` (0.625rem) | `rounded-lg` (mapped via `--radius-lg`) | default corner radius for cards/inputs/buttons |

Standard Tailwind utilities (spacing, flex/grid, typography sizing) are used
normally — only *color* and *radius* need the token names above.

### Where the real styles live

The bound `styles.css` (imports `_ds_bundle.css`) is the actual compiled
Tailwind output — read it for the full utility class list and exact token
values rather than guessing. Per-component `.d.ts` files list real props;
composed subcomponents (e.g. `CardHeader`, `CardContent`, `CardFooter`,
`DialogContent`, `SelectItem`) are separate exports meant to be composed
inside their parent, matching shadcn/ui conventions.

### Example: a realistic composition

```jsx
<AppProviders>
  <Card className="w-80">
    <CardHeader>
      <CardTitle>Rex</CardTitle>
      <CardDescription>Labrador · 4 anos · Tutor: Ana Souza</CardDescription>
      <CardAction>
        <Badge variant="veterinarian">Em atendimento</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Última consulta em 12/03/2026 — vacinação antirrábica em dia.
      </p>
    </CardContent>
    <CardFooter className="gap-2">
      <Button variant="outline">Ver prontuário</Button>
      <Button>Agendar retorno</Button>
    </CardFooter>
  </Card>
</AppProviders>
```
