# Receituário (3 modelos) + Financeiro v2 — Guia para o Frontend

> Gerado em 2026-07-23 · Backend `NixVet-BE` main · Todos os endpoints abaixo já estão em produção.
> Todas as respostas de sucesso usam o envelope `{ success, message, data }` — o interceptor do axios
> (`src/lib/axios.ts`) já desembrulha `data` de forma transparente.

=======
## ⚡ Resposta aos 3 bloqueios apontados pelo front (23/07)

| # | Bloqueio apontado | Status |
|---|---|---|
| 1 | `sipeagro_number` fora dos DTOs (whitelist bloqueia) | ✅ **Resolvido e em produção** — aceito em `POST /api/users`, `PATCH /api/users/:id` e `PATCH /api/users/profile` (string, máx. 20) |
| 2 | `continuous_use` fora do DTO de criação de prescrição | ✅ **Resolvido** — `medications[].continuous_use?: boolean` aceito no `POST /api/prescriptions`; o PDF imprime "uso contínuo" no lugar da duração |
| 3 | Sem integração real com SIPEAGRO/MAPA | ✅ **Escopo confirmado**: é assinar + imprimir as vias. Não existe API pública do MAPA para submissão eletrônica da notificação — o fluxo legal da IN 35/2017 é em papel (vias físicas retidas). O nº SIPEAGRO do vet é impresso na 3 vias; nada é transmitido ao governo. |

Outras pendências mapeadas pelo front:

- **Download autenticado do PDF assinado** → ✅ criado: `GET /api/prescriptions/:id/signature/pdf`
  (JWT; retorna `application/pdf` inline; farmácia continua usando `/verificar/:id/pdf` com token).
- **Endereço/telefone do vet inexistente no model** → o PDF já usa fallback: imprime
  endereço/telefone **da clínica** (tenant) no box do emitente quando o vet não tem dado próprio.
  Campo por-veterinário fica como melhoria futura, não bloqueia.
- **ICP-Brasil (`QUALIFIED_ICP`)** → segue Fase 3 (ver §1.5).

---

## PARTE 1 — Receituário: 3 modelos de emissão

A assinatura de prescrição (`POST /api/prescriptions/:id/sign`) agora aceita o campo
`prescription_type`, que define **quantas vias o PDF terá e quais campos regulatórios são exigidos**.
Cada via é uma página do PDF com carimbo próprio (ordinal + destinatário).

### 1.1 Os três modelos

| `prescription_type` | Nome | Base legal | Vias | Validade |
|---|---|---|---|---|
| `SIMPLE` | Receituário simples | Uso veterinário · medicamento sob prescrição | **1 via** → Tutor(a) | 30 dias |
| `SPECIAL_CONTROL` | Receituário de controle especial | Portaria SVS/MS 344/98 (listas C1/C5, fenobarbital) | **2 vias** → 1ª Farmácia (retenção) · 2ª Tutor(a) | 30 dias |
| `VET_NOTIFICATION` | Notificação de receita veterinária | IN MAPA 35/2017 (produto veterinário controlado) | **3 vias** → 1ª Tutor(a) · 2ª Estabelecimento comercial · 3ª Médico-veterinário | Tratamento até 30 dias |

**Gatilho automático no SIMPLE**: se `is_human_antibacterial: true` (antibacteriano de uso
humano — RDC 471/2021), o receituário simples vira **2 vias** (1ª Farmácia retenção · 2ª Tutor)
com **validade de 10 dias**. O FE deve expor esse checkbox no fluxo de emissão do simples.

### 1.2 Contrato de assinatura

```
POST /api/prescriptions/:id/sign
{
  "prescription_type": "SIMPLE" | "SPECIAL_CONTROL" | "VET_NOTIFICATION",  // opcional
  "is_human_antibacterial": boolean,   // opcional — só relevante no SIMPLE
  "is_controlled": boolean,            // LEGADO — sem prescription_type, true → SPECIAL_CONTROL
  "signing_method": "ADVANCED"         // padrão; ver 1.5 sobre QUALIFIED_ICP
}
```

Resposta (`data`):

```
{
  id, status, signing_method,
  verification_url,        // página pública /verificar/:id (QR no PDF)
  serial_number,           // numeração sequencial — SÓ na VET_NOTIFICATION (senão null)
  is_controlled,
  signed_at,
  public_token, private_code
}
```

Demais endpoints (inalterados): `GET /api/prescriptions/:id/signature` (status),
`POST /api/prescriptions/:id/signature/revoke { reason }` (revogação CFMV 1.653/2025),
verificação pública `GET /verificar/:id` e `GET /verificar/:id/pdf`.

### 1.3 SIPEAGRO — obrigatório na 3 vias ⚠️ **AÇÃO DO FRONT**

A `VET_NOTIFICATION` **exige o nº SIPEAGRO do veterinário emissor**. Sem ele, o backend responde:

```
400 — "Nº SIPEAGRO obrigatório para a Notificação de Receita Veterinária (IN MAPA 35/2017)."
```

O campo agora é editável pela API (novidade — antes só existia no banco):

- `POST /api/users` e `PATCH /api/users/:id` → aceitam `sipeagro_number` (string, máx. 20)
- `PATCH /api/users/profile` (perfil próprio) → aceita `sipeagro_number`

**Tarefas do FE:**
1. Adicionar o campo **"Nº SIPEAGRO"** no formulário de perfil do veterinário e no cadastro/edição
   de equipe (junto de CRMV/especialidade).
2. No fluxo de emissão, ao selecionar "Notificação de receita (3 vias)": se o vet logado não tem
   SIPEAGRO cadastrado, mostrar aviso com link para o perfil **antes** de tentar assinar.
3. Exibir o `serial_number` retornado na confirmação de assinatura (numeração oficial da notificação).

### 1.4 Seletor de modelo no FE

No lugar do checkbox "controlado", usar um seletor de 3 opções (o backend mantém compatibilidade
com `is_controlled` para telas antigas):

- Receituário simples — 1 via *(+ checkbox "antibacteriano de uso humano" → 2 vias/10 dias)*
- Controle especial — 2 vias *(Portaria 344/98)*
- Notificação veterinária — 3 vias numerada *(IN MAPA 35/2017 · exige SIPEAGRO)*

### 1.5 Certificado em nuvem (ICP-Brasil) — ❌ AINDA NÃO DISPONÍVEL

`signing_method: "QUALIFIED_ICP"` (assinatura qualificada via PSC ICP-Brasil / certificado em
nuvem) **não está implementado** — é a Fase 3. Hoje o backend responde:

```
400 — "Assinatura qualificada (ICP-Brasil) ainda não disponível (Fase 3)."
```

**FE:** não enviar `signing_method` (o padrão `ADVANCED` — assinatura avançada com chave da
plataforma — é o único ativo). Se a UI mostrar a opção de certificado em nuvem, marcar como
"em breve" e desabilitar.

---

## PARTE 2 — Financeiro v2: contratos novos

O FE já implementou as telas (rotas `(app)/financeiro/*`); esta seção consolida os contratos
para referência e QA. Permissões de menu novas: `financeiro-lancamentos`, `financeiro-contas-pagar`,
`financeiro-planos-saude`, `financeiro-fluxo`, `financeiro-produtos` (roles superadmin/admin/manager —
exige **re-login** para sessões antigas).

### 2.1 Lançamentos — filtros, paginação, criação manual, export

```
GET /api/financial-reports/entries
  ?status=suggested|confirmed|cancelled
  &from=YYYY-MM-DD&to=YYYY-MM-DD          // alternativa a period=YYYY-MM
  &type=revenue|cost|expense
  &category=<slug>&search=<texto>          // search = iLike na descrição
  &limit=50&offset=0
→ data: { rows: FinancialEntry[], count, limit, offset }
```

- `POST /api/financial-reports/entries` — lançamento manual (nasce `confirmed`). Tipos:
  `revenue` (categorias consultation/hospitalization/exam/procedure/product/medication/other),
  `cost` = CMV (medication_purchase/lab_cost/material/other),
  `expense` = OPEX (rent/personnel/utilities/marketing/equipment/tax/other).
- `GET /api/financial-reports/entries/export?<mesmos filtros>` → arquivo `.xlsx` (blob).

### 2.2 DRE — CMV vs OPEX + comparativo

```
GET /api/financial-reports/dre?period=YYYY-MM
→ data: { gross_revenue, deductions, net_revenue,
          cmv, gross_profit, gross_margin_pct,
          opex, ebitda, ebitda_margin_pct,
          operational_costs,                        // legado = cmv + opex
          breakdown: { by_category, by_payment_source, by_payment_method,
                       cmv_by_category, opex_by_category } }

GET /api/financial-reports/dre?period=YYYY-MM&compare=prev_month|prev_year
→ data: { period, prev_period, <linha>: { current, previous, diff_amount, diff_pct }, ... }
```

- Export: `GET /api/financial-reports/dre/export?period=&format=xlsx` → XLSX real (3 abas:
  DRE formatado, breakdown por categoria, lançamentos do período).

### 2.3 KPIs gerenciais

```
GET /api/financial-reports/kpis?period=YYYY-MM
→ data: { ticket_medio, total_atendimentos, margem_bruta_pct, ebitda_margin_pct,
          crescimento_mom_pct,            // null quando não há mês anterior
          receita_particular, receita_plano, pct_particular, pct_plano,
          mix_pagamento: { pix: 43.2, ... },   // % por método
          metodo_principal }
```

### 2.4 Contas a Pagar

```
GET    /api/payables?month=YYYY-MM&status=pending|overdue|paid|cancelled&category=
GET    /api/payables/summary?month=YYYY-MM
       → { total_month, paid, pending, overdue, overdue_amount, due_7_days, by_category }
POST   /api/payables            { description*, supplier, category*, due_date*, amount*, recurrence, notes, document_url }
PATCH  /api/payables/:id
PATCH  /api/payables/:id/pay    { payment_method*, paid_at? }
PATCH  /api/payables/:id/cancel · DELETE /api/payables/:id (soft = cancel)
```

- `overdue` é **calculado** (pending com vencimento passado), não persistido.
- **Pagar cria automaticamente o lançamento financeiro confirmado** (CMV para
  medication_purchase/material_purchase/lab_cost; OPEX para o resto) e vincula via
  `financial_entry_id`.

### 2.5 Contas a Receber de Planos

```
GET   /api/health-plans/receivables?health_plan_id=&status=&month=&overdue_only=true
GET   /api/health-plans/receivables/aging
      → { on_time, late_1_30, late_31_60, late_61_90, late_over_90,   // { count, amount }
          total_pending, total_glossed,
          by_plan: { [planId]: { plan_name, <faixas>, total } } }
PATCH /api/health-plans/receivables/:id/received  { received_amount*, received_at? }   // < esperado → partial + glosa automática
PATCH /api/health-plans/receivables/:id/glosa     { glosa_amount*, glosa_reason? }
PATCH /api/health-plans/receivables/:id/contest   // só status glossed
```

- Recebível é **criado automaticamente** quando um lançamento de receita nasce com
  `payment_source: 'health_plan'` (data esperada = data do atendimento + `reimbursement_days` do plano).

### 2.6 Fluxo de Caixa Projetado

```
GET /api/financial-reports/fluxo-caixa?days=30|60|90
→ data: { days: [{ date, inflow, outflow, net, cumulative_balance }],
          summary: { total_inflows, total_outflows, final_balance,
                     negative_days, first_negative_day } }
```

- Entradas = receitas confirmadas por **data de liquidação esperada** (`entry_date` +
  `settlement_days` do método de pagamento). Saídas = contas a pagar pendentes por vencimento.

---

## Pendências conhecidas

| Item | Status |
|---|---|
| Certificado em nuvem / ICP-Brasil (`QUALIFIED_ICP`) | ❌ Fase 3 — backend responde 400; UI deve marcar "em breve" |
| Campo SIPEAGRO nas telas de perfil/equipe | ⚠️ Backend pronto — **falta a UI no front** |
| Seletor de 3 modelos no fluxo de emissão | ⚠️ Conferir se o FE já envia `prescription_type` em todas as telas de emissão |
| Anexo de documento em Contas a Pagar | Por ora `document_url` é texto; upload real fica para a integração com storage da plataforma |
