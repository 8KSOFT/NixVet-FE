# Busca no backend + página de detalhe do Responsável — resolvido

## Decisões tomadas (2026-07-27)

- **Página `/owners/[id]`: descartada.** O usuário observou que o histórico clínico
  de cada pet já aparece no prontuário do próprio pet — uma página de detalhe do
  tutor com essa mesma informação seria redundante. Ao clicar num "Responsável"
  no Command Palette, o comportamento continua o mesmo de hoje: vai para `/owners`.
  Nenhuma mudança necessária nesse ponto.
- **Busca no backend: implementada**, escopo igual ao original (patients por
  nome/chip_number, tutors por nome/CPF).

## O que foi feito

### Backend (`NixVet-BE`)
- `src/common/dto/pagination-query.dto.ts`: `search?: string` em
  `TutorsListQueryDto` e `PatientsListQueryDto`.
- `patients.service.ts` / `patients.controller.ts`: `findAllPaged` filtra por
  `name`/`chip_number` via `ILIKE` direto no banco (ambos são colunas planas).
- `tutors.service.ts` / `tutors.controller.ts`: `findAllPaged` filtra por `name`
  via `ILIKE` no banco. **CPF é criptografado em repouso** (`cpf_encrypted`, sem
  hash de busca parcial como `phone_hash`/`email_hash`), então busca por CPF não
  dá pra empurrar pro SQL — o fallback só decripta e filtra em memória quando (a)
  a busca por nome não encontrou nada e (b) o termo tem 3+ dígitos (parece CPF).
  Mesmo padrão de fallback que `findByPhone` já usa nesse arquivo.
- Testes: `tutors.service.search.spec.ts` e `patients.service.search.spec.ts`
  (mock direto do model, sem precisar de banco — mesmo padrão de
  `refresh-token.service.spec.ts`). 9 testes cobrindo: sem termo, busca por
  nome, fallback de CPF disparando, fallback CPF NÃO disparando quando o nome já
  bateu (evita scan desnecessário), termo alfabético sem match e sem dígitos.

### Frontend (`NixVet-FE`)
- `useSearchPatientsQuery(term, limit)` (`usePatients.ts`) e
  `useSearchTutorsQuery(term, limit)` (`useTutors.ts`) — chamam o `search` novo
  do backend, `enabled` só quando há termo.
- `command-palette.tsx`: trocou `usePatientsListQuery()`/`useTutorsListQuery()`
  + `.filter()` client-side pelas queries novas. Debounce de 250ms mantido.

## Verificação

- Backend: `tsc --noEmit` limpo nos arquivos alterados; suíte de testes unitários
  nova passando (9/9); suíte completa do projeto sem regressão (as 3 suítes que
  falham hoje — `financial-reports`, `products`, `hospitalizations` — falham por
  um problema de instalação do pacote `exceljs` no ambiente local, pré-existente,
  não relacionado a esta mudança).
- Frontend: `tsc --noEmit` e `eslint` limpos.
- Ponta a ponta: `yarn dev` + Playwright, interceptando `/patients` e `/tutors`
  (sem precisar de backend local rodando) — Ctrl+K, digitar "rex" dispara 1
  request com `search=rex` (debounce ok), mostra só o paciente certo; digitar
  "joao" dispara 1 request pra `/tutors` com `search=joao`, mostra o tutor certo.
  Zero erros de hidratação. (Não foi possível testar contra um Postgres local
  real — Docker Desktop não estava rodando neste ambiente — então o
  comportamento do `ILIKE`/fallback de CPF foi validado só nos testes unitários
  do backend, não numa chamada HTTP real de ponta a ponta.)
