# NixVet-FE — notas para o agente

Documentação de contexto de desenvolvimento para o Claude Code neste repositório. Complementa (não substitui) o que já está documentado em `DOCS/`. Atualize este arquivo quando fechar ou retomar uma iniciativa de várias sessões.

## Iniciativa: tradução i18n da plataforma (pt/en/es)

Objetivo: tirar todo texto fixo em português das páginas autenticadas (`src/app/(app)/**`) e passar por `react-i18next`, com R$/U$/Peso dinâmico conforme idioma.

### Padrão estabelecido (siga isso em qualquer trabalho novo de i18n)

- Um único namespace `common`. Chaves em `src/locales/{pt,en,es}/common.json`.
- Uma seção de topo por página (ex.: `financeiroReceitas`, `patients`, `calendar`). Página de referência 100% traduzida e didática: [`src/app/(app)/financeiro/receitas/page.tsx`](src/app/(app)/financeiro/receitas/page.tsx).
- `import { useTranslation } from 'react-i18next'; const { t } = useTranslation();` (ou `useTranslation('common')` — equivalente, `common` é o namespace default). Strings viram `t('secao.chave')`; interpolação com `t('...', { var })`.
- Dinheiro: `useCurrencyFormatter()` de [`src/lib/i18n/currency.ts`](src/lib/i18n/currency.ts) — troca símbolo/separador conforme idioma (R$/pt-BR, U$/en-US, Peso/es-AR). Substitui qualquer `fmt`/`fmtBRL` local hardcoded em `'pt-BR'`/`'BRL'`.
- Componentes com valor monetário: [`CurrencyInput`](src/components/ui/currency-input.tsx) (já locale-aware).
- Datas (`toLocaleDateString('pt-BR')` etc.) foram deliberadamente **deixadas de fora** do escopo em todas as páginas já feitas — é formatação, não string de UI; não existe ainda um `useDateFormatter` equivalente ao de moeda.
- Módulo-level consts que viram labels traduzidas (ex.: `STATUS_LABELS`) precisam ser convertidas em função `getX(t: TFunction)` chamada dentro do componente — const de módulo não tem acesso ao hook.
- **Merge de JSON com trabalho paralelo**: nunca deixe dois processos editando o mesmo arquivo de locale ao mesmo tempo — condição de corrida. Faça o merge sequencialmente. Depois de cada merge, valide com `node -e "JSON.parse(require('fs').readFileSync('src/locales/pt/common.json','utf8'))"` (repita para en/es) e rode `npx tsc --noEmit -p tsconfig.json`. Cuidado: texto que vier com `&amp;` deve virar `&` literal (não é HTML).

### Módulos 100% traduzidos (pt/en/es), commitados

- **Financeiro** (9 páginas: DRE, lançamentos, contas a pagar, planos de saúde, fluxo de caixa, análise de receita, receitas por origem, custos de pagamento, orçamentos) — commit `b4a3bfe`
- **Settings** (21 páginas) — commit `b4a3bfe`
- **Pacientes / Proprietários / Agenda** (patients, patients/[id], owners, calendar) — commit `d79d624`
- **Clínico** (medical-records, medical-records/[id], medical-records/prontuario/[patientId], prescriptions, exams, internacoes, internacoes/[id], vaccines, bulario, followups) — commit `e1d264e`

### Parcialmente traduzidos — RETOMAR AQUI (commit `f23cc12`)

Uma rodada de 11 agentes paralelos foi cortada pelo limite de sessão da API. 7 arquivos ficaram com progresso parcial (mistura de `t()` e texto fixo). Todos compilam (tsc limpo) — os erros de referência quebrada já foram corrigidos manualmente. Status real (linhas totais vs. chamadas `t(` encontradas, como proxy grosseiro de cobertura):

| Arquivo | Linhas | `t()` encontrados | Situação |
|---|---|---|---|
| `chatbot-workflows/[id]/page.tsx` | 695 | 18 | Quase não iniciado — só scaffolding (`getActionTypes`, `getNodeTypeLabel` criados, mas JSX do editor visual ainda majoritariamente em português) |
| `chatbot-workflows/page.tsx` | 463 | 36 | Parcial |
| `dashboard/page.tsx` | 663 | 35 | Parcial — já tinha base (`dashboardHome`) de antes desta iniciativa |
| `superadmin/access-control/permissions/page.tsx` | 381 | 52 | Parcial, provavelmente avançado |
| `superadmin/finance/page.tsx` | 541 | 63 | Parcial, provavelmente avançado |
| `superadmin/suporte/page.tsx` | 591 | 6 | Quase não iniciado |
| `termos/page.tsx` | 249 | 28 | Parcial |

Para retomar: pedir para auditar cada arquivo (comparar contra o texto fixo restante) e completar — mesmo padrão dos módulos já prontos acima.

### Ainda 100% em português (nunca chegou a ser tocado)

`whatsapp/page.tsx`, `tasks/page.tsx`, `ajuda/page.tsx`, `superadmin/clinics/page.tsx`, `superadmin/clinics/[id]/page.tsx`, `billing/upgrade/page.tsx`.

`profile/page.tsx` é exceção: já estava ~completo antes desta iniciativa (seção `profile` já existia).

### Fora de escopo / decisão pendente

Nunca discutido com o usuário se entram no mesmo esforço: páginas públicas (`src/app/page.tsx` landing, `login`, `register`, `esqueci-senha`, `convite/[token]`, `verificar/[signatureId]`, `termos-servicos-aplicativo`, `politicas-uso`, `privacidade`). São uma categoria diferente (marketing/legal/auth) — perguntar antes de incluir.

### Nota lateral (não é i18n, mas foi corrigido na mesma sessão)

`color-scheme: only light` (não só `light`) em `globals.css` e no `viewport` do `layout.tsx` — resolve o Chrome Android "force-dark" reescrevendo as cores do site em alguns aparelhos mesmo sem nenhuma regra `prefers-color-scheme` no nosso CSS.
