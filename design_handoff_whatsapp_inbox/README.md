# Handoff: WhatsApp Inbox Redesign (NixVetApp)

## Overview
Redesign of the WhatsApp inbox screen (sidebar, top navbar, stats row, conversation list, chat panel) with refined cards and buttons. Same brand green, more "modern SaaS" spacing and hierarchy.

## About the Design Files
`whatsapp-inbox-design.html` is a **design reference** built in HTML/React — it shows the intended look and behavior, not production code to copy verbatim. Recreate this UI inside the existing NixVetApp codebase, using its current framework, component library, routing, and state management. If a pattern here doesn't have an equivalent yet (e.g. a Card or Button primitive), add it following the codebase's existing conventions.

## Fidelity
**High-fidelity.** Colors, spacing, radii, and typography below should be matched closely. Copy (Portuguese strings) and structure should be preserved exactly; icons can use the codebase's existing icon set if it already has fitting stroke-style icons — otherwise use a Lucide/Feather-style icon per name given below.

## Design Tokens
- Colors: brand-50 `#eefaf4`, brand-100 `#d3f0e2`, brand-500 `#0e9e6e`, brand-600 `#0c8a5f` (primary buttons/sidebar), brand-700 `#0a7350`; ink `#1a2420`, ink-2 `#5a6a63`, ink-3 `#8a9791`; line `#e2e8e5`, line-2 `#eef2f0`; bg `#f6f8f7`; warn `#d97706`/`#fef3e2`; blue `#2563eb`/`#eaf1ff`.
- Radius: 10px (buttons, inputs, small cards), 14px (stat cards, main content panel).
- Font: Inter, weights 400/500/600/700.
- Card style: white background, 1px solid `var(--line)` border, NO drop shadow.

## Screens / Views

### 1. Sidebar (248px wide, fixed)
- Background `--brand-600` (solid green), white text.
- Logo row: 4-dot flower mark + "NixVetApp", bold 17px.
- "+ Novo" button: full width, translucent white pill (`rgba(255,255,255,.14)` bg, `rgba(255,255,255,.25)` border), 10px radius.
- Nav list: icon + label, 9px vertical padding, 9px radius, active item = `rgba(255,255,255,.16)` background. Items: Dashboard, Agenda, Pacientes, Responsáveis, Prontuário, Prescrição, Exames, Internações, Financeiro (chevron, expandable), WhatsApp (active), Chatbot / IA.
- Bottom section, above a `rgba(255,255,255,.15)` divider: "ADMIN" label (10.5px, letter-spacing .06em, 55% opacity) then Ajuda, Configurações.

### 2. Top navbar
- Search input (max 340px): light gray pill, search icon + "Buscar" placeholder + "Ctrl+K" kbd chip.
- Round icon buttons (34px): "+" and bell, white bg, 1px border, 9px radius.
- Language segmented control: PT/EN/ES, active tab white with subtle shadow inside a gray track.
- User: "Olá, Administrador" + circular avatar (32px, brand-600 bg, initials "AD").

### 3. Stats row
- 4 equal-width cards, 14px gap, white bg, 1px border, 14px radius, 18/20px padding.
- Each: small icon chip (26px, 8px radius, gray or brand-tinted for the "Encerradas hoje" one) + label (13px, ink-2) on top row; big value (28px bold) below. Values: "Aguardando resposta" 0, "Aguardando responsável" 0, "Encerradas hoje" 1 (brand green value + tinted icon chip), "Tempo médio resposta" 0s.

### 4. Conversation list panel (340px wide, right border)
- Header: "Conversas" + Ativas/Arquivadas segmented toggle (active = brand-600 filled pill).
- Filter row: "Todas as classificações" dropdown-style bar, 1px border, 10px radius.
- List rows: name (14px semibold), phone + relative time (12.5px, ink-3), optional status badge, optional orange "Atendimento humano" flag with user icon.
- Selected row: brand-50 background + 1px brand-500 border, 10px radius (no shadow, no left-bar accent).
- Status badges: pill shape, icon + label, 12px semibold. Variants: scheduled (green `#0a7350`/`#e3f7ee`), closed (blue `#2563eb`/`#eaf1ff`), other (gray `#5a6a63`/`#f0f3f1`), human (orange, no bg — text only with user icon).

### 5. Chat panel
- Header: circular avatar w/ initials (brand-100 bg), name, badges row; right-aligned action buttons: "Retomar Bot", "Classificar", "Encerrar", "Arquivar" — all outline style (white bg, 1px border, 10px radius, icon + label, 13.5px semibold), hover = light gray fill.
- Messages: incoming = light gray bubble left-aligned, rounded 14px with sharp corner near the tail (bottom-left); outgoing = brand-600 filled bubble right-aligned, sharp corner bottom-right. Timestamp below each bubble, 11.5px, ink-3.
- Input bar: pill-shaped text field placeholder "Digite a mensagem...", 1px border; round icon buttons (42px) for lightbulb (outline) and send (filled brand-600, white icon).
- Floating action button, fixed bottom-right: pill shape, brand-600 fill, white bold text + check icon, soft green shadow (`0 6px 18px rgba(14,158,110,.35)`). Example label: "Configuração 25%".

## Interactions & Behavior
- Ativas/Arquivadas toggle switches the conversation list's filter (client-side tab state).
- Clicking a conversation row selects it and loads that thread into the chat panel.
- Action buttons (Retomar Bot / Classificar / Encerrar / Arquivar) trigger their respective backend actions — no design change to their existing logic, just visual restyle.
- No new animations beyond standard hover background transitions (~150ms).

## Assets
No new image assets. Icons are simple stroke-style (Lucide/Feather-equivalent): grid, calendar, users, user, file, prescription, flask, bed, chart, message, bot, search, bell, plus, tag, check, archive, bulb, send, help, settings, clock, chevron-down/left.

## Files
- `whatsapp-inbox-design.html` — full interactive HTML/React reference for this screen.
