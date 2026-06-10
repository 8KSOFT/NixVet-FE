# Design System — Page & Table Template

## Purpose

This document is a reusable prompt/template describing the visual and structural rules for list/detail pages (tables, actions, dialogs, pagination, forms) used across the dashboard. Use it as the source-of-truth when creating new pages (patients, owners, team, etc.).

## General rules

- Use `useTranslation('common')` and put all visible strings in `src/locales/*/common.json` under a page-specific namespace (e.g. `patients`, `owners`, `team`).
- Page header: `h1` with classes `text-2xl font-heading font-bold text-primary flex items-center gap-2` and an icon sized `w-6 h-6`.
- Page actions (top-right): use primary button `className="bg-primary hover:bg-blue-700"` (or `hover:bg-brand-deep/80` depending on design token) with icon `w-4 h-4 mr-2`.

## Container & table

- Table wrapper: `<div className="rounded-md border border-gray-300 overflow-hidden">` (important: include `border-gray-300`).
- TableHeader: add `className="h-15"`.
- Header row: `<TableRow className="border-b border-gray-300">`.
- Body row: each `<TableRow>` should include `className="border-b border-gray-300"` to keep consistent separators.
- Empty state row: use `<TableCell colSpan={N} className="text-center text-muted-foreground py-8">`.

## Columns

- Action column width: use `className="w-40"` on the action `TableCell` so it remains compact. Other columns can use `w-60` for long values when necessary.

## Buttons & icons

- Action buttons (row-level):
  - Use `variant="ghost" size="icon" className="p-0"` for compact icon-only buttons.
  - Edit button: ghost + pencil icon (`<Pencil className="w-4 h-4" />`).
  - View/Details link: use `asChild` on `Button` when wrapping a `Link` (keep `title` for accessibility).
  - Delete button: ghost + icon with destructive color: add `className="p-0 text-destructive hover:text-destructive"` to the trigger button (keeps only the icon colored red, no border).

## Dialogs & confirmation

- Use `AlertDialog` for destructive confirmations with `AlertDialogTrigger asChild` wrapping the action button.
- Dialog content uses `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`.
- Use translated titles and description placeholders (e.g. `t('owners.confirmDeleteTitle')` and `t('owners.confirmDeleteDescription', { name })`).

## Pagination

- Use the shared `ListPagination` component below the table container (outside the `rounded-md` wrapper). Example:

  <div className="rounded-md border border-gray-300 overflow-hidden"> 
    <Table>...</Table>
  </div>
  <ListPagination page={page} totalPages={totalPages} total={total} pageSize={API_PAGE_SIZE} onPageChange={setPage} disabled={loading} />

## Forms & Modals

- Use `Dialog` for create/edit forms. Wrap form inside `DialogContent` and `DialogHeader` / `DialogTitle` and `DialogFooter`.
- For inputs use `Controller` (`react-hook-form`) or `useForm` with `Input`, `Select`, `Label` components.
- Validation messages should use `text-sm text-destructive` styling.

## Selects / Combobox

- For basic selects use `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`.
- For combobox-like breed selection use `Popover` + `Command` components (see patients page implementation). Keep `CommandInput` for search and `CommandItem` for items. Offer an item to add new breed when not found.

## Data fetching patterns

- Use `api` wrapper from `src/lib/axios` and helpers from `src/lib/pagination`:
  - `listQueryParams(page, pageSize, extraParams?)`
  - `parseListResponse<T>(response.data, page)` returns `{ items, total, totalPages }`
  - For endpoints returning multiple pages, there's `fetchAllListPages<T>(path)`.
- Defensive parsing: when calling endpoints that may return arrays or envelopes (`data`, `items`, `content`), normalize the response before using `.map()` to avoid runtime `map is not a function` errors.

## i18n keys (recommended structure)

- `patients`, `owners`, `team` objects in `src/locales/*/common.json` with keys like:
  - `title`, `createButton`, `empty`
  - `table`: `{ name, email, phone, cpf, actions, ... }`
  - `confirmDeleteTitle`, `confirmDeleteDescription`, `remove`, `cancel`

## Accessibility

- Add `title` attributes to icon-only buttons and `aria-label` where appropriate.
- Use `role="combobox"` for the breed selection trigger button.

## Example snippet (row actions)

<TableCell className="w-40">
  <div className="flex items-center gap-1">
    <Button asChild variant="ghost" size="icon" className="p-0" title="View details">
      <Link href={`/dashboard/resource/${id}`}><History className="w-4 h-4"/></Link>
    </Button>
    <Button variant="ghost" size="icon" className="p-0" onClick={onEdit}><Pencil className="w-4 h-4"/></Button>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="p-0 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button>
      </AlertDialogTrigger>
      ...
    </AlertDialog>
  </div>
</TableCell>

## Tips for authors

- Mirror spacing classes (`gap-1`, `gap-2`, `py-8`) between pages for consistent density.
- Prefer `text-muted-foreground` for empty / subtle text.
- Keep all data-related strings in locales; use placeholders for runtime values in translations (`{{name}}`).

## Usage

Copy the patterns above when scaffolding new list pages. Use `owners/page.tsx` and `patients/page.tsx` as canonical examples.
