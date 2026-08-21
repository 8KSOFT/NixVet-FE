# Módulo de Estoque — Documentação Técnica

> Documento de referência para reimplementar/portar o módulo de Estoque (produtos, categorias, fornecedores, movimentações, entradas de nota fiscal e histórico de custo) em outro projeto. Cobre schema, regras de negócio, RPCs, Server Actions, componentes de UI e pontos de integração, exatamente como implementado no L2 Connect (Next.js 14 App Router + Supabase/Postgres, multi-tenant via RLS).

## Índice

1. [Visão geral e escopo](#1-visão-geral-e-escopo)
2. [Modelo de dados](#2-modelo-de-dados)
3. [Regras de negócio centrais](#3-regras-de-negócio-centrais)
4. [RPCs (funções SQL)](#4-rpcs-funções-sql)
5. [Server Actions (TypeScript)](#5-server-actions-typescript)
6. [Route Handlers (leituras em background)](#6-route-handlers-leituras-em-background)
7. [Camada de UI](#7-camada-de-ui)
8. [Permissões e controle de acesso](#8-permissões-e-controle-de-acesso)
9. [Integrações com outros módulos](#9-integrações-com-outros-módulos)
10. [Auditoria e notificações](#10-auditoria-e-notificações)
11. [Catálogo de códigos de erro](#11-catálogo-de-códigos-de-erro)
12. [Limitações conhecidas e roadmap](#12-limitações-conhecidas-e-roadmap)
13. [Guia de portabilidade para outro projeto](#13-guia-de-portabilidade-para-outro-projeto)

---

## 1. Visão geral e escopo

O módulo de Estoque cobre o ciclo completo de itens físicos de um tenant (salão/barbearia, mas genérico o bastante para qualquer negócio com produtos/insumos):

- **Cadastro de itens** (`products`) — tanto produtos vendáveis (Balcão) quanto insumos internos (consumidos automaticamente ao prestar um serviço).
- **Organização** por categorias hierárquicas (2 níveis) e fornecedores.
- **Movimentação de estoque**: ajuste manual, baixa (quebra/perda/uso interno/vencido), débito automático por venda/atendimento, e entrada por nota fiscal de fornecedor.
- **Custo**: preço de custo por unidade, recalculado automaticamente via **Custo Médio Ponderado (CMP)** a cada entrada de nota; histórico de custo por produto/fornecedor.
- **Financeiro**: toda movimentação de estoque com impacto em dinheiro (compra de nota, custo de insumo consumido) gera lançamentos em `financial_transactions`.
- **Alertas**: notificação automática quando um item cruza o estoque mínimo.
- **Auditoria**: toda mutação relevante grava uma linha em `system_activity_logs` (log genérico da plataforma) e/ou `product_stock_movements` (ledger append-only específico de estoque).

Não faz parte deste módulo (mas se conecta a ele): o motor de vendas do Balcão/PDV, a "comanda" de agendamento, o motor de comissão, o financeiro/dashboard e o leitor de código de barras — todos documentados na seção [9](#9-integrações-com-outros-módulos) como pontos de integração, não como parte do módulo em si.

### Stack de referência

- **Next.js 14 App Router**, Server Components + Server Actions (`"use server"`), Route Handlers só para leituras que rodam em `useEffect` (ver seção 6).
- **Supabase/Postgres** com **Row Level Security** — cada tabela tem uma policy `company_id = get_current_company_id()` (isolamento multi-tenant). Toda regra de negócio "pesada" (que precisa ser atômica) é uma função `SECURITY DEFINER` em PL/pgSQL, chamada via `supabase.rpc(...)`.
- **TanStack Table** (tabela desktop), **@dnd-kit** (arrastar produto para categoria), **Recharts** (gráfico de evolução de custo).

---

## 2. Modelo de dados

### 2.1 `products` — catálogo de itens (produtos vendáveis e insumos)

```sql
create table public.products (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  name                     text not null,
  current_stock            integer not null default 0 check (current_stock >= 0),
  minimum_stock            integer not null default 0 check (minimum_stock >= 0),
  item_type                text not null default 'consumable' check (item_type in ('product', 'consumable')),
  category_id              uuid references public.product_categories(id) on delete set null,
  supplier_id              uuid references public.suppliers(id) on delete set null,
  price                    numeric(10,2) not null default 0 check (price >= 0),
  cost_price               numeric(10,2) not null default 0 check (cost_price >= 0),
  is_active                boolean not null default true,
  internal_code            text,                       -- código de barras/QR, nullable
  commission_percentage    numeric(5,2) not null default 0 check (commission_percentage between 0 and 100),
  has_commission_override  boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (company_id, internal_code)                    -- NULL nunca colide com NULL
);

create index idx_products_company_id on public.products (company_id);
create index products_internal_code_idx on public.products using btree (internal_code);
```

Campos-chave e sua razão de existir:

| Coluna | Papel |
|---|---|
| `item_type` | `'product'` = vendável no Balcão/comanda; `'consumable'` = insumo interno, nunca vendido, debitado automaticamente ao concluir um serviço. **Mesma tabela para os dois** — não existe uma tabela `consumables` separada. |
| `current_stock` / `minimum_stock` | Estoque atual e limiar que dispara alerta. Sempre inteiros ≥ 0 (nunca fica negativo — todo débito é clampado em `greatest(x, 0)`). |
| `price` / `cost_price` | Preço de venda e preço de custo unitário. Margem = `price - cost_price`. `cost_price` é recalculado automaticamente (CMP) a cada entrada de nota — não é editável livremente fora desse fluxo (o formulário permite editar, mas o valor "correto" vem da nota). |
| `is_active` | Soft-toggle (não é soft-delete): item inativo some do catálogo do Balcão, do seletor de consumíveis em Serviços e do picker de itens da comanda, mas continua visível (com badge) na própria tela de Estoque. |
| `internal_code` | Código de barras/QR físico do item. Anulável, único por empresa (`UNIQUE(company_id, internal_code)`). Alimenta a leitura por câmera/pistola USB/pistola remota. |
| `commission_percentage` / `has_commission_override` | Override de comissão **por produto** (opt-in via toggle, nunca implícito por `> 0`) — ver seção 3.4. |
| `category_id` / `supplier_id` | `ON DELETE SET NULL` — apagar a categoria/fornecedor nunca apaga o produto, só desvincula. |

### 2.2 `product_categories` — hierarquia de 2 níveis

```sql
create table public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  parent_id   uuid references public.product_categories(id) on delete set null,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

- Profundidade **travada em 2 níveis** por um trigger (`enforce_product_category_depth`), não só pela UI: `BEFORE INSERT OR UPDATE OF parent_id`, rejeita `parent_id` que aponte para uma categoria que já é, ela mesma, uma subcategoria (`v_grandparent_id IS NOT NULL → raise exception`). Também rejeita auto-referência (`parent_id = id`).
- `ON DELETE SET NULL` na FK do pai: apagar a categoria-mãe nunca apaga a subcategoria, só promove ela para nível 1 (`parent_id` vira `null`).
- `products.category_id` também é `ON DELETE SET NULL`.

### 2.3 `suppliers` — fornecedores (tabela plana, sem hierarquia)

```sql
create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  contact_name  text,
  phone         text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

### 2.4 `product_stock_movements` — ledger append-only de ajustes manuais

```sql
create table public.product_stock_movements (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  delta           integer not null,               -- pode ser negativo (baixa) ou positivo (ajuste/entrada)
  previous_stock  integer not null,
  new_stock       integer not null,
  reason          text not null check (reason in (
                    'inventory_adjustment', 'breakage', 'invoice_entry',
                    'expired', 'internal_use', 'loss', 'invoice_entry_reversal'
                  )),
  actor_id        uuid references public.users(id),
  actor_type      text check (actor_type in ('superadmin', 'owner', 'staff')),
  created_at      timestamptz not null default now()
);
```

**Ledger append-only por design**: RLS concede apenas `SELECT`/`INSERT` — nunca `UPDATE`/`DELETE`. É a trilha de auditoria de "quem mexeu no estoque e por quê" para qualquer ajuste manual.

Os 7 valores de `reason` cobrem dois fluxos distintos:
- **Ajuste absoluto** (define um novo valor de `current_stock`): `inventory_adjustment` (contagem de inventário), `breakage` (quebra/avaria), `invoice_entry` (entrada de nota — grafado aqui pela própria RPC `apply_stock_entry`).
- **Baixa relativa** (subtrai uma quantidade específica): `breakage`, `expired`, `internal_use`, `loss` (mesmo `breakage` reaproveitado entre os dois fluxos).
- **Estorno**: `invoice_entry_reversal`, gravado só por `cancel_stock_entry()`.

> ⚠️ Nem toda baixa de estoque grava aqui — vendas de Balcão e débito automático de `complete_appointment()` **não** escrevem neste ledger (ver seção 9). É estritamente o histórico de ajustes/entradas manuais.

### 2.5 `stock_entries` + `stock_entry_items` — entrada de nota de fornecedor

```sql
create table public.stock_entries (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  supplier_id     uuid references public.suppliers(id) on delete set null,
  invoice_number  text,
  entry_date      date not null default current_date,
  notes           text,
  total_amount    numeric(10,2) not null default 0 check (total_amount >= 0),   -- sempre computado no servidor
  payment_status  text not null default 'pending' check (payment_status in ('paid', 'pending')),
  status          text not null default 'confirmed' check (status in ('confirmed', 'canceled')),
  created_by      uuid references public.users(id) on delete set null,
  canceled_at     timestamptz,
  canceled_by     uuid references public.users(id) on delete set null,
  cancel_reason   text,
  created_at      timestamptz not null default now()
);

create table public.stock_entry_items (
  id                   uuid primary key default gen_random_uuid(),
  entry_id             uuid not null references public.stock_entries(id) on delete cascade,
  company_id           uuid not null references public.companies(id) on delete cascade,  -- denormalizado
  supplier_id          uuid references public.suppliers(id) on delete set null,           -- denormalizado
  entry_date           date not null,                                                     -- denormalizado
  product_id           uuid references public.products(id) on delete set null,
  product_name         text not null,          -- snapshot do nome no momento da entrada
  line_number          integer not null,        -- posição original no array enviado (ordinality)
  quantity             integer not null check (quantity > 0),
  unit_cost            numeric(10,2) not null check (unit_cost >= 0),
  line_total           numeric(10,2) not null check (line_total >= 0),
  previous_stock       integer not null,        -- snapshot antes desta linha
  previous_cost_price  numeric(10,2) not null,
  new_stock            integer not null,        -- snapshot depois desta linha
  new_cost_price       numeric(10,2) not null,
  created_at           timestamptz not null default now()
);

create index idx_stock_entry_items_entry_id on public.stock_entry_items (entry_id);
create index idx_stock_entry_items_product_id on public.stock_entry_items (product_id, entry_date);
```

Notas de design:
- `company_id`/`supplier_id`/`entry_date` são **denormalizados** do cabeçalho para os itens — permite consultar histórico de custo por produto sem `JOIN`, mesmo padrão usado em outras tabelas "filha" deste projeto quando a policy de RLS precisa do `company_id` direto na linha.
- `line_number` é a posição original do item no array `jsonb` enviado (via `jsonb_array_elements(...) WITH ORDINALITY`), **não** confundir com `entry_date`: `line_number` é usado para o replay determinístico do cancelamento (ver seção 3.3); `entry_date` é só exibição (editável e pode ser retroativa).
- `previous_stock`/`previous_cost_price`/`new_stock`/`new_cost_price` são um **snapshot por linha** — cada item guarda o antes/depois exato, permitindo reconstruir o histórico sem depender de outra tabela.
- `total_amount` do cabeçalho **nunca é aceito do client** — é sempre a soma dos `line_total` computada dentro da RPC.
- `status = 'canceled'` nunca apaga a nota: fica como registro histórico com `canceled_at`/`canceled_by`/`cancel_reason`.

### 2.6 Colunas relacionadas em outras tabelas (integração)

| Tabela | Coluna | Uso |
|---|---|---|
| `financial_transactions` | `stock_entry_id` (nullable, FK `on delete set null`) | Liga a despesa/estorno gerado por uma entrada de nota à nota que a originou. |
| `financial_transactions` | `source` (`CHECK IN ('manual','appointment','pos','stock_entry')`) | `'stock_entry'` identifica lançamentos originados deste módulo. |
| `financial_transactions` | `category` (texto livre, sem `CHECK`) | `'compra_estoque'` (entrada de nota) e `'custo_insumo'` (custo de consumível debitado num atendimento) são as duas categorias geradas por este módulo. |
| `financial_transactions` | `commission_type` (`CHECK IN ('service','product')`) | Marca se uma linha de comissão veio de venda de produto. |
| `service_consumables` | — | Tabela pivô N:N `service_id ↔ product_id` (`quantity_consumed`), a "receita" de insumos de um serviço. Ver seção 9.1. |
| `appointment_items` | `item_type IN ('product','consumable')`, `product_id` | Item avulso adicionado à comanda de um agendamento (venda extra ou insumo usado). Ver seção 9.2. |
| `staff` | `product_commission_percentage`, `individual_commission_enabled` | Comissão padrão de produto por profissional (camada 3 do modelo de comissão). |
| `companies` | `default_product_commission_percentage` | Comissão padrão de produto da empresa (camada 4/piso). |

### 2.7 RLS e GRANTs — padrão aplicado em toda tabela deste módulo

Todas as tabelas seguem o mesmo padrão de duas camadas de defesa (GRANT a nível de tabela/schema **e** RLS por linha):

```sql
alter table public.<tabela> enable row level security;

-- Tabelas de CRUD livre (products, product_categories, suppliers):
create policy "tenant_isolation_<tabela>" on public.<tabela>
  for all to authenticated
  using (company_id = public.get_current_company_id())
  with check (company_id = public.get_current_company_id());

grant select, insert, update, delete on public.<tabela> to authenticated;
grant select, insert, update, delete on public.<tabela> to service_role;
```

Já `product_stock_movements`, `stock_entries` e `stock_entry_items` são **append-only do ponto de vista do client**: só existem policies de `SELECT`/`INSERT` para `authenticated` — toda mutação de `status`/`total_amount`/reversão acontece dentro das RPCs `SECURITY DEFINER`, que rodam como dono da tabela e ignoram GRANT/RLS da role chamadora.

> **Gotcha a não esquecer ao portar**: o Postgres concede `EXECUTE` a `PUBLIC` (e portanto a `anon`) automaticamente na criação de qualquer função. Toda RPC deste módulo tem, logo depois de criada:
> ```sql
> revoke execute on function public.<fn>(...) from anon, public;
> grant execute on function public.<fn>(...) to authenticated, service_role;
> ```
> Esquecer isso deixa a função chamável por um visitante anônimo via `/rest/v1/rpc/<fn>` — mesmo que a lógica interna acabe rejeitando por outro motivo, é uma superfície de ataque desnecessária.

---

## 3. Regras de negócio centrais

### 3.1 `item_type`: produto vendável vs. insumo interno

Uma única tabela (`products`) serve dois papéis, distinguidos por `item_type`:

- **`'product'`** — aparece no catálogo do Balcão/PDV, pode ser adicionado como item avulso numa comanda de agendamento, tem `price` relevante para venda.
- **`'consumable'`** — nunca aparece no Balcão. É debitado **automaticamente** do estoque quando um serviço que o usa (via `service_consumables`) é concluído. Pode ser adicionado à comanda como item de custo interno (nunca cobrado — `unit_price` forçado a `0`).

Todo lugar que lista produtos "para vender" filtra `item_type = 'product'` explicitamente (Balcão, seletor de item de comanda tipo produto); todo lugar que debita estoque automaticamente ao prestar um serviço filtra `item_type = 'consumable'` (mesmo que, por engano, um produto `'product'` esteja cadastrado em `service_consumables`, ele nunca é debitado por esse caminho).

### 3.2 Estoque nunca fica negativo

Toda operação que reduz `current_stock` usa `greatest(current_stock - delta, 0)` (SQL) ou `Math.max(0, ...)` (TS) — nunca deixa o valor abaixo de zero, mesmo que a quantidade a debitar seja maior que o disponível (ex.: dois atendimentos concorrentes consumindo o último insumo). A exceção é a validação **pré-baixa** no Balcão (`recordPosSale`), que bloqueia a venda inteira (`STOCK_INSUFFICIENT`) se qualquer item do carrinho excede o estoque disponível — nesse fluxo específico o "clamp em 0" nunca chega a ser exercitado porque a operação inteira é recusada antes.

### 3.3 Custo Médio Ponderado (CMP) — recalculado a cada entrada de nota

Decisão de produto: usar **CMP** (padrão contábil brasileiro), não "último custo". Fórmula aplicada a cada item de uma nota, dentro de `apply_stock_entry()`:

```
novo_estoque = estoque_atual + quantidade_recebida

novo_custo = round(
  (estoque_atual * custo_atual + quantidade_recebida * custo_unitário_da_nota)
  / novo_estoque,
  2
)
```

- O **mesmo produto pode aparecer mais de uma vez na mesma nota** (lotes/preços diferentes do mesmo fornecedor na mesma entrega) — cada iteração relê `current_stock`/`cost_price` já atualizados pela iteração anterior dentro da mesma transação, então duas linhas do mesmo produto encadeiam o CMP corretamente em sequência.
- Produtos são processados em ordem determinística (`ORDER BY product_id`) para evitar deadlock em chamadas concorrentes que travam (`FOR UPDATE`) as mesmas linhas.
- Opcionalmente, cada item pode marcar `update_sale_price: true` + `new_sale_price` para também atualizar `products.price` (preço de venda) na mesma operação — útil quando o custo sobe e o dono já quer reajustar o preço junto.

**Cancelamento/estorno de uma nota confirmada** (`cancel_stock_entry`) reverte o `cost_price` por dois caminhos, dependendo se existe compra confirmada mais nova para o mesmo produto:

- **Caminho exato** (a nota cancelada é a mais recente compra confirmada daquele produto): reverte `cost_price` direto para o `previous_cost_price` gravado na primeira linha desta entrada para aquele produto — matematicamente correto independente de quantas vendas aconteceram depois (vendas nunca alteram `cost_price`, só `current_stock`).
- **Caminho aproximado** (existe uma entrada confirmada mais nova para o mesmo produto): faz um *replay* do CMP a partir do item confirmado mais antigo sobrevivente, ignorando o efeito de vendas intermediárias sobre o peso do CMP. Documentado como aproximação deliberada (ver seção 12).

O estoque físico é sempre revertido com exatidão (`current_stock -= quantidade_da_nota`); se isso deixaria o estoque negativo (parte já foi vendida), a transação inteira é **abortada** (`INSUFFICIENT_STOCK_TO_REVERSE`) — nunca reverte parcialmente.

### 3.4 Comissão por item — override opt-in, nunca implícito

`products.commission_percentage`/`has_commission_override` seguem o mesmo padrão de `services`: **não** é "0 = sem override, >0 = com override" — é um toggle booleano explícito. Quando `has_commission_override = false` (padrão), o percentual configurado é ignorado por completo e a comissão cai na cadeia de fallback (comissão individual do profissional para produto → comissão geral da empresa para produto). Quando `true`, o percentual vale mesmo que seja explicitamente `0%` — permite distinguir "0% de propósito" de "nunca configurado". A precedência completa está descrita na seção 9.4.

### 3.5 Alertas de estoque — orientado a evento, não a cron

Ao contrário de outras notificações do sistema (que rodam num digest diário), o alerta de estoque baixo é **event-driven**: um trigger `AFTER UPDATE OF current_stock ON products` (a cláusula `OF current_stock` restringe o disparo só a mudanças reais de estoque — renomear produto, mudar preço/categoria nunca aciona a função) chama uma função que:

1. Só considera **baixa** de estoque cruzando o mínimo (`new.current_stock < old.current_stock AND new.current_stock <= new.minimum_stock`) — reposição nunca dispara.
2. Deduplica dinamicamente: só insere uma notificação nova se **não existir** já um alerta não lido para o mesmo produto (`NOT EXISTS (... WHERE type='stock_alert' AND read_at IS NULL AND metadata->>'productId' = ...)`). Isso deixa o alerta "reabrir" naturalmente depois que o admin marca o anterior como lido (repôs o estoque) e ele cai de novo no futuro, sem nunca duplicar enquanto o alerta anterior segue pendente.
3. Grava `metadata` estruturado (`productId`, `productName`, `currentStock`, `minStock`) para a UI renderizar sem round-trip extra.

Ver seção 10 para o restante do fluxo (tabela `notifications`, componente de detalhe).

### 3.6 Baixa de estoque tem 3 origens independentes — nem todas gravam no ledger

| Origem | Onde | Grava em `product_stock_movements`? | Atômico? |
|---|---|---|---|
| Ajuste manual (`adjustProductStock`, define valor absoluto) | Tela de Estoque, duplo-clique/stepper | ✅ Sim (`reason` = motivo escolhido) | Sim (update + insert sequenciais na mesma Server Action, sem RPC) |
| Baixa manual (`writeOffProductStock`, subtrai quantidade) | Botão "Dar Baixa" | ✅ Sim | Sim |
| Entrada de nota (`apply_stock_entry`) | Aba "Entradas de Estoque" | ✅ Sim (`reason='invoice_entry'`) | Sim — RPC única, uma transação |
| Débito automático por serviço (`complete_appointment`, via `service_consumables`) | Checkout de agendamento | ❌ Não | Sim (dentro da mesma RPC que finaliza o atendimento) |
| Débito por item avulso da comanda (`appointment_items`) | Checkout de agendamento | ❌ Não | Sim (mesma RPC) |
| Venda de Balcão (`recordPosSale`) | PDV | ❌ Não | **Não** — updates em paralelo (`Promise.all`), sem RPC transacional; trade-off aceito para o volume de um PDV |

Isso significa que `product_stock_movements` **não é o histórico completo** de tudo que mexeu no estoque — é só o ledger de ajustes/baixas manuais e entradas de nota. Débito por venda/atendimento é rastreável indiretamente via `financial_transactions`/`appointment_items`/vendas de Balcão, não por essa tabela.

---

## 4. RPCs (funções SQL)

### 4.1 `apply_stock_entry(...)` — aplica uma nota inteira atomicamente

```sql
apply_stock_entry(
  p_company_id      uuid,
  p_entry_date      date,
  p_payment_status  text,             -- 'paid' | 'pending'
  p_items           jsonb,            -- array de {product_id, quantity, unit_cost, update_sale_price?, new_sale_price?}
  p_actor_id        uuid,
  p_actor_type      text,             -- 'superadmin' | 'owner' | 'staff'
  p_supplier_id     uuid default null,
  p_invoice_number  text default null,
  p_notes           text default null
) returns stock_entries
security definer
```

Passo a passo (dentro de uma única transação):

1. Valida `company_id` do caller contra `p_company_id` quando existe sessão real (impersonation-safe — ver "padrão de segurança" abaixo).
2. Rejeita `p_items` vazio (`EMPTY_ITEMS`) e `p_payment_status` fora de `{'paid','pending'}`.
3. Valida `p_supplier_id` (se informado) pertence à mesma empresa.
4. **Insere o cabeçalho primeiro** (`stock_entries`, com `total_amount = 0` provisório) — nunca os itens antes do cabeçalho, por causa da FK `stock_entry_items.entry_id → stock_entries.id`.
5. Itera `p_items` via `jsonb_array_elements(...) WITH ORDINALITY` (dá um `line_number` estável), ordenado por `product_id` (evita deadlock em chamadas concorrentes).
6. Para cada item: valida `product_id`/`quantity > 0`/`unit_cost >= 0`; trava a linha do produto (`FOR UPDATE`); calcula CMP (seção 3.3); atualiza `products` (`current_stock`, `cost_price`, opcionalmente `price`); insere o snapshot em `stock_entry_items`; insere o movimento em `product_stock_movements` (`reason='invoice_entry'`).
7. Atualiza `total_amount` do cabeçalho com a soma real dos `line_total`.
8. Se `total_amount > 0`, insere uma despesa em `financial_transactions` (`type='expense'`, `category='compra_estoque'`, `source='stock_entry'`, `status` = `p_payment_status`, `stock_entry_id` preenchido).

Sem checagem de *role* interna (qualquer usuário autenticado com acesso ao módulo "produtos" pode lançar uma entrada) — o gate de permissão fica só na camada TypeScript (ver seção 8).

### 4.2 `cancel_stock_entry(...)` — estorna uma entrada confirmada, admin-only

```sql
cancel_stock_entry(
  p_entry_id   uuid,
  p_company_id uuid,
  p_reason     text,
  p_actor_id   uuid,
  p_actor_type text
) returns stock_entries
security definer
```

Passo a passo:

1. **Admin-only**: `v_caller_role <> 'admin' OR company_id não bate → NOT_AUTHORIZED` (só quando existe sessão real).
2. Exige `p_reason` não-vazio (`REASON_REQUIRED`).
3. Trava a nota (`FOR UPDATE`); rejeita se já `status='canceled'` (`ALREADY_CANCELED`).
4. **Passo 1 — reverte estoque físico**, item a item, em ordem determinística por `product_id`: `new_stock = current_stock - item.quantity`. Se isso resultaria em estoque negativo (parte já vendida), **aborta a transação inteira** (`INSUFFICIENT_STOCK_TO_REVERSE`) — nunca reverte parcialmente. Grava `product_stock_movements` com `reason='invoice_entry_reversal'` (delta negativo).
5. **Passo 2 — marca `status='canceled'`** (com `canceled_at`/`canceled_by`/`cancel_reason`) *antes* dos passos seguintes, porque eles filtram `status='confirmed'` e precisam excluir corretamente esta própria entrada.
6. **Passo 3 — recalcula `cost_price`** por produto distinto tocado (caminho exato vs. aproximado, ver seção 3.3).
7. **Passo 4 — trata a despesa financeira vinculada, lendo o status ao vivo** (nunca herdado do `payment_status` gravado na criação):
   - Se `pending` → **`DELETE`** (nunca entrou em nenhum relatório fechado, já que regime de caixa só soma `status='paid'`).
   - Se já `paid` → **insere um estorno** (`type='income'`, mesmo valor, `created_at = now()`, nunca a `entry_date` original) em vez de apagar — cancelar algo de um período já fechado não pode mudar retroativamente o resultado daquele mês.

### 4.3 Padrão de segurança "impersonation-safe" (aplicado nas duas RPCs)

```sql
v_caller_company_id := get_current_company_id();  -- resolve via auth.uid(); NULL se não há sessão de usuário
v_caller_role := get_current_user_role();

if v_caller_company_id is not null and (<condição de autorização falhou>) then
  raise exception 'NOT_AUTHORIZED';
end if;
```

Isso permite que a mesma RPC seja chamada tanto por uma sessão real de usuário (`authenticated`, `auth.uid()` resolve) quanto por um client `service_role` sob impersonação de superadmin (`auth.uid()` é `NULL`, então a checagem é pulada — a autorização já foi feita em TypeScript antes de chamar a RPC). **Nunca comparar com `<>`/`!=` contra um valor que pode ser `NULL`** — usar sempre `IS DISTINCT FROM`, que é NULL-safe (uma comparação `<>` contra `NULL` avalia para `NULL`, que um `IF` do plpgsql trata como `false`, silenciosamente pulando a checagem em vez de rejeitar).

---

## 5. Server Actions (TypeScript)

Todas em `"use server"`, seguindo o padrão `ActionResult<T> = { ok: true; data: T } | { ok: false; errorCode: string }` — nunca lançam para o client, sempre retornam um código de erro estável (ver seção 11). Todas resolvem contexto via um helper `requireCompanyContext()` que devolve `{ supabase, companyId, profile, isImpersonating }` (client RLS-scoped por sessão, trocado por service-role transparente sob impersonação de suporte).

### 5.1 `src/app/app/products/actions.ts` — CRUD de produtos e movimentação

| Função | Assinatura | O que faz |
|---|---|---|
| `createProduct` | `(input: ProductInput) → ActionResult<Product>` | Valida (nome, estoque ≥ 0, preço ≥ 0, comissão 0–100), checa `requirePackageFeature(..., "produtos")`, insere, grava `logActivity`, `revalidatePath`. |
| `updateProduct` | `(id, input) → ActionResult<Product>` | Mesma validação, `UPDATE ... WHERE id AND company_id`. |
| `deleteProduct` | `(id) → ActionResult<null>` | `DELETE` direto (hard delete — não há soft-delete de produto neste módulo). |
| `adjustProductStock` | `(productId, newStock, reason) → ActionResult<Product>` | Define um valor **absoluto**. Calcula `delta = newStock - current`, atualiza `products`, insere em `product_stock_movements` (best-effort — falha aqui não desfaz o update de estoque, só loga). `reason ∈ {inventory_adjustment, breakage, invoice_entry}`. |
| `writeOffProductStock` | `(productId, quantity, reason) → ActionResult<Product>` | Subtrai uma quantidade **relativa**, clampada em 0. `reason ∈ {breakage, expired, internal_use, loss}`. |
| `bulkUpdateProductCategory` | `(ids[], categoryId \| null) → ActionResult<null>` | Move N produtos para uma categoria (ou "sem categoria") de uma vez — usada tanto pela barra de ações em massa quanto por arrastar-e-soltar. |
| `bulkAdjustPrice` | `(ids[], mode, direction, value) → ActionResult<null>` | `mode: 'percentage' \| 'fixed'`, `direction: 'increase' \| 'decrease'`. Calcula `newPrice` por produto (busca preços atuais primeiro, nunca confia num delta cru do client), aplica em paralelo. |
| `bulkUpdateProductStatus` | `(ids[], isActive) → ActionResult<null>` | Ativa/inativa em massa (ou individual, reaproveitado pelo toggle de linha da tabela). |
| `bulkDeleteProducts` | `(ids[]) → ActionResult<null>` | Hard delete em massa. |

Toda mutação chama `requirePackageFeature(supabase, companyId, "produtos")` **na própria Server Action** — não confia que a página já checou isso, porque a action é chamável diretamente (ex.: via devtools) sem passar pela renderização da página.

`ProductInput`:
```ts
type ProductInput = {
  name: string;
  currentStock: number;
  minimumStock: number;
  itemType: "product" | "consumable";
  categoryId: string | null;
  price: number;
  costPrice: number;
  supplierId: string | null;
  isActive: boolean;
  internalCode: string | null;
  commissionPercentage: number;
  hasCommissionOverride: boolean;
};
```

### 5.2 `src/app/app/products/categoryActions.ts` — CRUD de categorias

`createProductCategory(name, parentId?)`, `updateProductCategory(id, name, parentId?)`, `deleteProductCategory(id)`. Duas validações client-side de defesa em profundidade (o trigger SQL já garante, mas dar um erro de código mais amigável antes de bater no banco):

- `assertValidParentCategory`: o `parentId` informado precisa existir, ser da mesma empresa, e **não ter, ele mesmo, um `parent_id`** (não dá para aninhar em uma subcategoria).
- `hasChildCategories`: uma categoria que já tem filhos não pode ser rebaixada a subcategoria de outra (`CATEGORY_HAS_CHILDREN`).

### 5.3 `src/app/app/products/supplierActions.ts` — CRUD de fornecedores

`createSupplier`/`updateSupplier`/`deleteSupplier` — CRUD simples, sem regra de negócio além de nome obrigatório.

### 5.4 `src/app/app/products/stockEntryActions.ts` — entrada/cancelamento de nota

Só duas mutações (as leituras viraram Route Handler, ver seção 6):

```ts
async function createStockEntry(input: CreateStockEntryInput): Promise<ActionResult<StockEntry>>
async function cancelStockEntry(entryId: string, reason: string): Promise<ActionResult<StockEntry>>
```

- `createStockEntry`: valida `items.length > 0`, resolve `actorType`, chama `supabase.rpc("apply_stock_entry", {...})` passando os campos em snake_case, grava `logActivity`.
- `cancelStockEntry`: **checa `profile.role === "admin"` na própria Server Action** (pré-checagem por resposta mais rápida — a RPC também valida e é quem de fato garante).

```ts
type CreateStockEntryInput = {
  supplierId: string | null;
  invoiceNumber: string | null;
  entryDate: string;              // 'YYYY-MM-DD'
  notes: string | null;
  paymentStatus: "paid" | "pending";
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
    updateSalePrice: boolean;
    newSalePrice: number | null;
  }[];
};
```

---

## 6. Route Handlers (leituras em background)

**Decisão de arquitetura importante, motivada por um bug real**: as 4 leituras deste módulo que são disparadas em background por um `useEffect` (não ligadas a um submit explícito do usuário) são **Route Handlers** (`GET`, `export const dynamic = "force-dynamic"`, chamados via `fetch()`), **nunca Server Actions**.

**Por quê**: uma Server Action de leitura pura chamada dentro de um `useEffect`, sem `revalidatePath` e sem relação com uma mutação do usuário, pode **travar indefinidamente** (a Promise nem resolve nem rejeita) quando concorre na mesma fila sequencial de Server Actions do Next.js com outras chamadas simultâneas. Isso foi reproduzido ao vivo: as 3 abas de `ProductsHub` (Radix Tabs nunca desmonta painéis inativos, só esconde via CSS `[hidden]`) montam simultaneamente, e se cada uma dispara uma Server Action de leitura no mount, elas competem pela mesma fila e algumas nunca resolvem. Um `fetch()` para um Route Handler nunca entra nessa fila.

| Endpoint | Método | Lê | Usado por |
|---|---|---|---|
| `GET /api/stock-entries?supplierId=&startDate=&endDate=&page=&pageSize=` | `GET` | `stock_entries` paginado, filtrável por fornecedor/período | `StockEntriesManager` (lista) |
| `GET /api/stock-entries/[id]` | `GET` | Uma nota + seus itens (`stock_entry_items`) | `StockEntryDetailDialog` |
| `GET /api/products/cost-history?productId=&startDate=&endDate=` | `GET` | Pontos de custo histórico de um produto (uma linha por item de nota, com nome do fornecedor resolvido) | `CostHistoryPanel` → gráfico |
| `GET /api/products/cost-variations?startDate=&endDate=` | `GET` | Top-5 produtos com maior variação percentual de custo no período (comparando primeiro vs. último `unit_cost` do intervalo) | `CostHistoryPanel` → card de variações |

Todos resolvem `requireCompanyContext()` internamente (mesmo isolamento por tenant que qualquer Server Action), devolvem o mesmo formato `ActionResult<T>` serializado em JSON, e nunca cacheiam (`cache: "no-store"` no fetch do client, `dynamic = "force-dynamic"` no handler).

As mutações do mesmo domínio (`createStockEntry`/`cancelStockEntry`) **continuam Server Actions normais** — só leituras em background sofrem esse problema.

---

## 7. Camada de UI

### 7.1 `ProductsHub` — orquestrador com 3 abas

Componente raiz (`src/components/panel/products/ProductsHub.tsx`), montado em `/app/products`. Usa `Tabs` (Radix) **controlado** (`value`/`onValueChange`, não `defaultValue`) para que um `Select` mobile (`HubTabSelect`, abaixo de `sm:`) e a `TabsList` desktop compartilhem o mesmo estado.

1. **Catálogo** (`StockManager`) — tela principal de gestão do estoque.
2. **Entradas de Estoque** (`StockEntriesManager`) — lançar/consultar notas de fornecedor.
3. **Histórico de Custos** (`CostHistoryPanel`) — evolução de custo por produto/fornecedor.

Cada uma das duas abas novas recebe uma prop `isActive` e só dispara sua primeira busca de dado **na primeira vez que é de fato aberta** (nunca no mount incondicional) — mesma razão da seção 6: todas as 3 abas montam ao mesmo tempo.

### 7.2 `StockManager` — tela de Catálogo (núcleo do módulo)

Estado local (`useState`, produtos/categorias/fornecedores partem do que o Server Component já buscou via `initialProducts`/etc.):

- **Busca** por nome/categoria/código interno (client-side, sobre o array já carregado).
- **Filtro por tipo** (`all` / `product` / `consumable`) e **por fornecedor**.
- **Sidebar de categorias** (`CategorySidebar`) — árvore de 2 níveis, clicável para filtrar; colapsável (estado colapsado mostra só o cabeçalho, sem a lista).
- **Paginação** client-side (20 itens/página) sobre o resultado já filtrado.
- **Seleção múltipla** (`Set<string>`) → habilita a `StockBulkActionsBar` flutuante (mudar categoria, ajustar preço em massa, ativar/desativar, excluir).
- **Zona de alerta** (`StockAlertZone`) — agrupa "Sem estoque" e "Estoque baixo" (`current_stock <= minimum_stock`, só itens `is_active`), com preview inline (4 primeiros de cada grupo + "+N") e um modal "ver todos"; clicar num item abre o ajuste de estoque direto nele.
- **Drag-and-drop**: arrastar uma linha da tabela desktop (ou uma seleção múltipla) e soltar sobre uma categoria na sidebar chama `bulkUpdateProductCategory`. Implementado com `@dnd-kit` (`PointerSensor`, `activationConstraint: { distance: 8 }` para não conflitar com clique simples).
- **Duas visualizações responsivas**: `StockTable` (desktop, TanStack Table) vs. `StockCardList` (mobile, cards empilhados) — trocadas via `useIsMobile()`, com uma trava de `mounted` (`useEffect` no primeiro render) para nunca montar a tabela desktop-com-drag primeiro num dispositivo móvel real (evita um desmonte/remonte pesado logo no load, gatilho conhecido de corrupção de composição em GPUs fracas de Android).

**Ajuste inline de estoque** — dois pontos de entrada convergindo no mesmo diálogo (`StockAdjustDialog`, define um **valor absoluto**, sempre pede um motivo entre `inventory_adjustment`/`breakage`/`invoice_entry`):
- **Desktop**: duplo-clique no número de estoque da linha da tabela.
- **Mobile**: botões `−1`/`+1` ao lado do número no card (ajuste rápido de 1 unidade sem abrir diálogo) + toque no número abre o diálogo completo.

**Toggle de status por linha** (desktop): `Switch` inline na coluna Status, chama `bulkUpdateProductStatus([id], !current)`.

### 7.3 `ProductFormDialog` — criar/editar produto

Dois modos completamente diferentes de UI no mesmo componente:

- **Edição** (produto único já existente): formulário completo — nome, tipo (produto/consumível, com hint explicando a diferença), categoria, fornecedor, estoque atual/mínimo, custo/preço, código de barras (`BarcodeScannerInput`), toggle de override de comissão (+ campo de percentual só quando ligado), toggle ativo/inativo.
- **Criação**: formulário **em lote** — categoria/fornecedor compartilhados por todas as linhas + N linhas dinâmicas ("adicionar outra"), cada uma com seus próprios nome/tipo/estoque/preços/código. Todas as linhas são submetidas em paralelo (`Promise.all` de `createProduct`); linhas que falharem permanecem no formulário com erro, linhas bem-sucedidas são removidas e já refletidas na lista via callback `onSaved`.

### 7.4 `StockWriteOffDialog` — "Dar Baixa"

Fluxo de 2 passos dentro do mesmo modal: (1) escolher tipo (produto/consumível) + buscar e selecionar o item; (2) informar quantidade + motivo (`breakage`/`expired`/`internal_use`/`loss`) → `writeOffProductStock`.

### 7.5 `StockMetricsHeader` — 3 cards de resumo

Calculados client-side sobre o array de produtos já carregado (nenhuma query dedicada):

1. **Valor em estoque** (CMV) — soma `current_stock × cost_price` de **todo** item (produto e insumo, já que ambos representam dinheiro parado), com sublabel mostrando valor de venda potencial e lucro potencial (só sobre `item_type='product'`, já que insumo nunca é vendido).
2. **Margem média** — média de `(price - cost_price) / price` sobre produtos vendáveis com preço e custo `> 0`.
3. **SKUs ativos** — contagem de produtos/consumíveis `is_active`, separados.

### 7.6 `StockEntryDialog` — lançar uma nota

Cabeçalho (fornecedor opcional, número da nota, data, status de pagamento `paid`/`pending`, observações) + lista dinâmica de linhas. Cada linha:

- Escolhe um produto já existente via `ProductSearchSelect` (busca com modal, sobre o array já carregado) **ou** cria um produto novo inline (chama `createProduct` diretamente, sem duplicar a lógica de criação — insere localmente no array do diálogo já montado, já que `revalidatePath` do server não re-renderiza um diálogo já aberto).
- Quantidade, custo unitário → total da linha calculado ao vivo.
- Toggle opcional "Atualizar preço de venda" + campo de novo preço.

Total geral somado ao vivo no rodapé. Submissão só habilitada quando pelo menos um item válido existe.

### 7.7 `StockEntriesManager` + `StockEntryDetailDialog` — listar/consultar/cancelar notas

Lista simples (nome do fornecedor, data, número da nota, badges de status de pagamento e confirmação, total) que abre um diálogo de detalhe ao clicar. O detalhe mostra cada item (nome, quantidade × custo, custo anterior → novo custo, total da linha) e, se `isAdmin && status === 'confirmed'`, um botão "Cancelar Entrada" que exige motivo em texto antes de chamar `cancelStockEntry` — **sem `ConfirmDialog` aninhado**, o próprio campo de motivo obrigatório já serve de confirmação.

### 7.8 `CostHistoryPanel` + `ProductCostHistoryChart` — evolução de custo

- Seletor de produto (`ProductSearchSelect`) + seletor de período (30/90/180/365 dias).
- Gráfico de linha (Recharts) com **uma série por fornecedor** — paleta categórica fixa de 8 cores (ordem por primeira aparição), 9º+ fornecedor cai em "Outros". `connectNulls` nas linhas (compras são eventos esparsos; sem isso o Recharts quebraria a linha a cada gap sem compra).
- Tabela abaixo com o detalhamento ponto a ponto (data, fornecedor, quantidade, custo unitário, nota).
- Card separado "maiores variações de custo" (top-5 produtos com maior `|Δ%|` entre o primeiro e o último custo do período selecionado, calculado no Route Handler, não no client).

### 7.9 `ProductCategoriesDialog` / `SupplierManagerDialog`

Dois diálogos de CRUD simples (criar/editar inline/excluir com `ConfirmDialog`), mesmo padrão visual. O de categorias renderiza a árvore de 2 níveis (categoria-mãe + subcategorias indentadas) e, ao editar, só oferece o seletor de "categoria-mãe" quando a categoria em edição **não tem filhos** (senão rebaixá-la quebraria a regra de 2 níveis).

---

## 8. Permissões e controle de acesso

Este módulo usa o mesmo modelo de **3 camadas empilhadas** de qualquer módulo opcional deste projeto (não é específico de Estoque, mas é assim que ele se encaixa):

1. **Camada 1 — Teto do pacote contratado**: `isFeatureInPackage(package, "produtos")`. Nunca bypassado, nem por admin.
2. **Camada 2 — Toggle do admin** (`companies.features_enabled.produtos`, jsonb): admin sempre bypassa esta camada (só molda o que o staff vê).
3. **Camada 3 — Permissão individual por staff**: **este módulo não tem uma flag dedicada** (ao contrário de, por exemplo, "ver clientes"). Todo staff com acesso ao módulo (camadas 1+2 liberadas) enxerga o Estoque inteiro igual — não há um nível "só leitura" ou "só uma categoria" por staff.

`isModuleVisibleForRole(featuresEnabled, package, "produtos", role)` é a função única que resolve as 3 camadas — usada em 3 lugares que precisam concordar entre si:

- **`middleware.ts`** — bloqueia acesso direto por URL a `/app/products` (guard: `{ prefix: "/app/products", key: "produtos" }`).
- **`nav-items.ts`** — decide se o item de menu aparece na Sidebar/BottomNav (admin sempre vê quando o pacote inclui; staff só quando `isModuleVisibleForRole(..., "staff")` resolve `true`).
- **Cada Server Action** — `requirePackageFeature(supabase, companyId, "produtos")` chamado no início de toda mutação, porque a Server Action é invocável diretamente, sem depender de ter passado pela página/middleware.

Toda ação **admin-only** dentro do módulo (hoje só `cancelStockEntry`) checa `profile.role === "admin"` explicitamente na Server Action, **e** a RPC correspondente também valida — nunca confia só na checagem do lado TypeScript.

---

## 9. Integrações com outros módulos

O módulo de Estoque em si é "burro" no sentido de que não sabe nada sobre agendamento/comissão/financeiro — são os **outros** módulos que leem/escrevem em `products` para se integrar. Mapa completo:

### 9.1 Receita de consumíveis por serviço (`service_consumables`)

Tabela pivô N:N (`service_id`, `product_id`, `quantity_consumed`) — a "receita" de insumos que um serviço consome ao ser executado. Gerenciada por `setServiceConsumables(serviceId, rows[])` (módulo de Serviços, não deste módulo): sempre `DELETE` todas as linhas do serviço + `INSERT` do zero (nunca `UPDATE` incremental), admin-only, rejeita produto duplicado na mesma lista.

### 9.2 Comanda de agendamento (`appointment_items`)

Um agendamento pendente/confirmado pode ter itens avulsos adicionados (`addAppointmentItem`, `src/app/app/actions/appointmentItems.ts`), incluindo `item_type IN ('product', 'consumable')` — o preço é **sempre resolvido no servidor** a partir de `products.price` no momento da adição (nunca aceito do client), e um consumível é forçado a `unit_price = 0` (nunca cobrado — só rastreia baixa de estoque). Um produto inativo (`is_active = false`) não pode ser adicionado (`PRODUCT_INACTIVE`).

### 9.3 Débito de estoque no checkout do agendamento (`complete_appointment` RPC)

Dentro da mesma transação que marca o agendamento como `completed`:

1. Debita `service_consumables` do serviço/combo original (`item_type='consumable'` apenas).
2. Debita `appointment_items` com `item_type IN ('product','consumable')` adicionados manualmente à comanda.
3. Calcula o **custo (CMV)** dos consumíveis debitados (`quantity × cost_price`, somando os dois pontos acima) e lança uma despesa separada em `financial_transactions` (`category='custo_insumo'`) — **não** afeta o valor cobrado do cliente, só o lucro líquido (`grossRevenue - totalExpenses`).
4. Opcionalmente (configuração `companies.commission_basis`/`commission_deduct_consumable_cost`), esse custo pode **reduzir a base de cálculo da comissão de serviço** do profissional (ver seção 9.4).

### 9.4 Comissão sobre venda de produto — cadeia de precedência

Ao vender um produto (Balcão ou item de comanda), a comissão é resolvida em ordem, primeira que se aplica vence:

1. Override manual do admin no checkout (campo explícito, só admin).
2. Override do produto (`products.commission_percentage`, só se `has_commission_override = true`).
3. Comissão individual do profissional para produto (`staff.product_commission_percentage`, só se `staff.individual_commission_enabled = true`).
4. Comissão geral da empresa para produto (`companies.default_product_commission_percentage` — sempre existe, é o piso).

Exceção: se o `staff_id` da venda é a linha do próprio admin (admin também atua como profissional), os passos 3–4 são pulados por completo (ele fica com 100% do lucro) — só o override manual (passo 1) ainda é honrado.

### 9.5 Balcão / PDV (`recordPosSale`)

- Filtra o catálogo a `item_type = 'product'` (nunca vende consumível).
- Valida estoque suficiente **antes** de qualquer mutação — se qualquer item do carrinho excede `current_stock`, a venda inteira é recusada (`STOCK_INSUFFICIENT`).
- Decrementa estoque via `Promise.all` de updates independentes — **não é atômico** (trade-off aceito para o volume/latência de um terminal físico), e **não** grava em `product_stock_movements`.
- Gera receita (`financial_transactions`, `type='income'`, `category='atendimento'` ou similar, `source='pos'`) e, se aplicável, despesa de comissão (mesma cadeia da seção 9.4) e despesa de taxa de cartão.
- Leitura de código de barras: campo de busca do catálogo aceita leitura por câmera (`BarcodeScannerInput`), pistola USB (keyboard-wedge, buffer detectando digitação anormalmente rápida) e um "scanner remoto" via WebRTC/Realtime Broadcast (celular do funcionário como leitor sem fio) — todos resolvendo contra `products.internal_code`.

### 9.6 Leitor de código de barras/QR (`internal_code`)

`products.internal_code` (nullable, único por empresa) é a chave usada por 3 superfícies de leitura independentes e propositalmente não-unificadas (cada uma serve um contexto físico diferente):

1. **Local** (`BarcodeScannerInput.tsx`) — input de texto + botão de câmera, usado em qualquer formulário que aceite o código digitado ou lido (cadastro de produto, busca do catálogo).
2. **USB keyboard-wedge** — dentro do terminal do Balcão, um listener de teclado que diferencia digitação humana de leitura de pistola pela velocidade entre teclas.
3. **Remoto** (`/app/scanner`) — celular do funcionário vira leitor contínuo, transmitindo via canal privado de Realtime para o terminal físico.

### 9.7 Financeiro / Dashboard

- `getFinanceAnalytics()`/`get_dashboard_financial_summary()` somam `financial_transactions` por `category` — `'compra_estoque'` e `'custo_insumo'` entram como despesa no cálculo de lucro líquido igual a qualquer outra categoria (comissão, taxa de cartão), sem código dedicado a estoque nesses agregados.
- Regime de caixa: só `status = 'paid'` entra nos agregados de faturamento/lucro — uma nota `pending` (a pagar) aparece no extrato mas não afeta o "Lucro Líquido" até ser marcada como paga.

### 9.8 Comissões (`/app/comissoes`)

`get_staff_performance_metrics()` quebra a comissão de cada profissional por `commission_type` (`'service'`/`'product'`) — permite mostrar separadamente quanto cada um ganhou vendendo produtos vs. prestando serviços.

---

## 10. Auditoria e notificações

### 10.1 `system_activity_logs` — trilha de auditoria genérica da plataforma

Toda mutação relevante (criar/editar/excluir produto, categoria, fornecedor, ajustar/dar baixa em estoque, ações em massa, criar/cancelar entrada de nota) chama `logActivity({ companyId, actorId, actorType, actionCategory: "products", action, targetTable, targetId, metadata })`. `actorType` é resolvido por `resolveActorType(role, isImpersonating)` → `'superadmin'` (sob impersonação) / `'owner'` (admin) / `'staff'`.

`logActivity` é **best-effort quanto ao resultado da ação de negócio** (uma falha de log nunca desfaz a mutação já concluída), mas **nunca silenciosa**: o client do Supabase não lança exceção para erro de RLS/constraint num `.insert()` — só popula `{ error }` no retorno — então o código checa esse campo explicitamente e faz `console.error`, em vez de confiar só num `try/catch`.

### 10.2 `notifications` — alerta de estoque crítico

Ver regra completa na seção 3.5. O componente de UI (`StockAlertNotificationBody`, dentro do modal genérico de detalhe de notificação) mostra estoque atual vs. mínimo em dois cards de destaque, um botão "Copiar texto de pedido" (monta uma mensagem pronta para mandar ao fornecedor, usando o template `metadata.productName`/`currentStock`/`minStock`) e um link "Ir para o Estoque".

---

## 11. Catálogo de códigos de erro

Todo erro de RPC/Postgres é traduzido para um `errorCode` estável por `mapSupabaseError()` — SQLSTATEs genéricos (`42501`→`DB_PERMISSION_DENIED`, `23503`→`INVALID_REFERENCE`, `23505`→`DUPLICATE_ENTRY`, `23514`→`INVALID_VALUE`, `PGRST116`→`NOT_FOUND_OR_FORBIDDEN`) mais uma lista de substrings conhecidas extraídas de `raise exception 'CODE'` dentro das RPCs. Nunca colapsa silenciosamente em `"GENERIC"` sem logar o erro cru no servidor primeiro.

| Código | Origem | Significado |
|---|---|---|
| `REQUIRED_NAME` | Server Action (produto/categoria/fornecedor) | Nome vazio. |
| `INVALID_STOCK` | Server Action | Estoque atual/mínimo não numérico ou negativo. |
| `INVALID_PRICE` / `INVALID_COST_PRICE` | Server Action | Preço/custo negativo ou não numérico. |
| `INVALID_COMMISSION` | Server Action | Percentual de comissão fora de 0–100. |
| `INVALID_QUANTITY` | Server Action (baixa) | Quantidade da baixa ≤ 0. |
| `INVALID_PARENT_CATEGORY` | Server Action (categoria) | Categoria-mãe inválida (não existe, é de outra empresa, ou já é subcategoria). |
| `CATEGORY_HAS_CHILDREN` | Server Action (categoria) | Tentou rebaixar uma categoria que já tem subcategorias. |
| `DUPLICATE_PRODUCT` | Server Action (receita de consumível) | Mesmo produto listado duas vezes na receita de um serviço. |
| `PRODUCT_INACTIVE` | Server Action (comanda) | Tentou adicionar um produto `is_active=false` a uma comanda. |
| `PRODUCT_NOT_FOUND` / `SUPPLIER_NOT_FOUND` | RPC `apply_stock_entry` | Produto/fornecedor não existe ou não pertence à empresa. |
| `EMPTY_ITEMS` | Server Action / RPC | Nota sem nenhum item. |
| `INVALID_ITEM_QUANTITY` / `INVALID_ITEM_COST` / `INVALID_ITEM_SALE_PRICE` | RPC `apply_stock_entry` | Item da nota com quantidade/custo/preço de venda inválido. |
| `INVALID_PAYMENT_STATUS` | RPC `apply_stock_entry` | `payment_status` fora de `{paid, pending}`. |
| `ENTRY_NOT_FOUND` | RPC `cancel_stock_entry` | Nota não existe ou não pertence à empresa. |
| `ALREADY_CANCELED` | RPC `cancel_stock_entry` | Nota já estava cancelada. |
| `REASON_REQUIRED` | RPC `cancel_stock_entry` | Motivo do cancelamento vazio. |
| `INSUFFICIENT_STOCK_TO_REVERSE` | RPC `cancel_stock_entry` | Parte do estoque recebido já foi vendida/consumida — cancelamento abortado. |
| `NOT_AUTHORIZED` | RPC `cancel_stock_entry` | Caller não é admin da empresa dona da nota. |
| `FORBIDDEN` | Server Action | Pacote não inclui "produtos" (Camada 1) ou role insuficiente. |
| `STOCK_INSUFFICIENT` | Server Action (Balcão) | Item do carrinho excede o estoque disponível. |
| `CARD_BRAND_REQUIRED` / `INVALID_CARD_BRAND` | Server Action (checkout) | Pagamento em cartão sem bandeira selecionada/válida (integração, não é deste módulo). |

---

## 12. Limitações conhecidas e roadmap

Documentadas explicitamente (sem "meias palavras") como parte do design da v1 — não são bugs a corrigir silenciosamente, são trade-offs conscientes de escopo:

1. **Replay aproximado de custo no cancelamento** — quando a nota cancelada não é a compra confirmada mais recente daquele produto, o recálculo de `cost_price` faz um replay do CMP que ignora o efeito de vendas intermediárias sobre o peso do cálculo, e não recupera com perfeição uma edição manual de `cost_price` feita entre duas entradas. Raro na prática (exige cancelar algo que não é a última compra), mas é uma aproximação documentada, não um ledger perfeito.
2. **`entry_date` retroativa não recalcula CMV histórico** — lançar hoje uma nota com data de emissão passada muda o histórico *visual* do gráfico de custo para aquela data, mas não recalcula o custo de vendas/consumos que já aconteceram entre a data retroativa e hoje (essas já foram contabilizadas com o `cost_price` em vigor no momento real de cada uma). Limitação conceitual de qualquer sistema sem recálculo retroativo de CMV.
3. **Gate de pacote só em TypeScript, nunca nas RPCs** — `apply_stock_entry`/`cancel_stock_entry` não validam o pacote contratado internamente; só a Server Action faz essa checagem antes de chamar a RPC. Mesmo modelo de todo o resto do módulo (nenhuma ação de produtos valida pacote a nível de banco) — não é uma lacuna nova, é um trade-off arquitetural da base inteira.
4. **Sem rateio de frete/impostos/seguro** — `unit_cost` informado na nota é tratado como custo final do item. Nenhum frete, seguro, IPI, ST, DIFAL ou crédito tributário é somado/subtraído automaticamente.
5. **Venda de Balcão não é atômica** — `recordPosSale` decrementa estoque via updates em paralelo, não uma transação única. Aceito para o volume de um PDV; não recomendado copiar esse padrão para um fluxo de maior criticidade sem revisitar.
6. **Sem histórico unificado de toda movimentação** — `product_stock_movements` só cobre ajustes/baixas manuais e entradas de nota; débito por atendimento/venda de Balcão não aparece ali (rastreável só indiretamente via `financial_transactions`).
7. **Sem tela dedicada de Ficha Kardex** — a informação (data, tipo de movimento, quantidade, custo, saldo) existe espalhada em `stock_entry_items`/`product_stock_movements`, mas não há um relatório único nesse formato clássico.

### Fases futuras cogitadas (não implementadas)

- Importação de XML de NF-e / consulta por chave de acesso na SEFAZ (elimina digitação manual).
- Mapeamento De-Para de SKU do fornecedor + conversão de unidade (caixa → unidade avulsa).
- Rateio de frete/seguro/despesas acessórias proporcionalmente entre itens da nota.
- Impostos não recuperáveis somando ao custo; créditos tributários abatendo.
- FIFO/PEPS como alternativa ao CMP.
- Ficha Kardex dedicada.
- Bloco K / SPED Fiscal (registrado como pesquisado, mas fora do público-alvo típico — pequenos negócios em MEI/Simples Nacional).
- Sugestão automática de reajuste de preço de venda quando o custo sobe (manter markup configurado).

---

## 13. Guia de portabilidade para outro projeto

### 13.1 Dependências reais (precisam existir ou ser adaptadas)

| Dependência | Para quê | Como adaptar se não existir |
|---|---|---|
| Multi-tenancy via `company_id` + RLS (`get_current_company_id()`) | Isolamento de dados entre tenants em toda tabela | Se o novo projeto for single-tenant, remova a coluna `company_id`/policies — o resto da lógica (CMP, ledger, etc.) é independente disso. |
| Tabela `users`/`staff` com `role` (`admin`/`staff`) | Admin-only em `cancel_stock_entry`; `actor_id`/`actor_type` no ledger | Substituir por qualquer sistema de roles equivalente; o campo `actor_type` pode virar um enum mais simples se não houver conceito de "impersonação de suporte". |
| `financial_transactions` (tabela de lançamentos financeiros genérica, `type`/`category`/`status`/`source`) | Despesa de compra de estoque, custo de insumo, comissão de produto | Se o projeto não tiver módulo financeiro, essas duas inserções (dentro de `apply_stock_entry`/`cancel_stock_entry`) podem ser removidas sem afetar a lógica de estoque em si — é puramente aditivo. |
| `notifications` (tabela genérica + trigger) | Alerta de estoque baixo | Opcional — pode virar um e-mail, um webhook, ou ser removido; a lógica de dedupe (seção 3.5) é reaproveitável independente do canal de entrega. |
| `system_activity_logs` | Auditoria | Opcional — `logActivity()` é um helper isolado, fácil de trocar por qualquer sistema de audit log (ou remover). |
| `services`/`service_consumables`/`appointment_items` | Débito automático de insumo ao concluir um serviço | Só necessário se o novo projeto tiver o conceito de "serviço que consome insumo". Sem isso, o módulo de Estoque funciona sozinho (cadastro + ajuste manual + entrada de nota), só sem o débito automático da seção 9.3. |
| Modelo de comissão em camadas (`staff.*_commission_percentage`, `companies.default_*_commission_percentage`) | Override de comissão por produto | Totalmente opcional — `products.commission_percentage`/`has_commission_override` podem ser removidos sem quebrar nada mais do módulo. |
| `@dnd-kit/core` | Arrastar produto para categoria | Puramente cosmético — a mesma ação (`bulkUpdateProductCategory`) já é acionável pela barra de ações em massa sem drag-and-drop. |
| `@tanstack/react-table` | Tabela desktop | Pode ser substituído por qualquer tabela — a lógica de negócio não depende dela. |
| `recharts` | Gráfico de evolução de custo | Cosmético — os dados (`ProductCostHistoryPoint[]`) são agnósticos de biblioteca de gráfico. |

### 13.2 O que é o "núcleo" mínimo portável (funciona isolado)

Se o objetivo for só o controle de estoque em si (sem agendamento, sem comissão, sem financeiro), o núcleo mínimo é:

1. Tabela `products` (sem as colunas de comissão) + `product_categories` + `suppliers`.
2. Tabela `product_stock_movements` (ledger).
3. Server Actions de CRUD + `adjustProductStock`/`writeOffProductStock`.
4. Opcionalmente, `stock_entries`/`stock_entry_items` + as duas RPCs (`apply_stock_entry`/`cancel_stock_entry`) se quiser o fluxo de "nota de fornecedor com CMP" — essa é a parte mais valiosa e mais isolada do módulo, e funciona sem nenhuma das integrações da seção 9 (a única dependência real dela é `financial_transactions`, e mesmo essa é opcional — basta remover os dois `INSERT INTO financial_transactions` de dentro das RPCs).

### 13.3 Passo a passo sugerido para portar

1. Recriar as 6 tabelas da seção 2 (ajustando FKs para o schema do novo projeto — trocar `companies(id)` pelo equivalente de tenant, ou remover `company_id` se single-tenant).
2. Recriar as 2 RPCs da seção 4 tal como estão (a lógica de CMP/cancelamento é autocontida) — só ajustar `get_current_company_id()`/`get_current_user_role()` para os helpers equivalentes do novo projeto (ou remover as checagens de autorização se o modelo de permissão for diferente).
3. Portar as Server Actions da seção 5 — a única dependência externa forte é `requireCompanyContext()` (troque pelo helper de sessão do novo projeto) e `requirePackageFeature` (opcional — remova se não houver conceito de pacotes/planos).
4. Portar os componentes de UI da seção 7 na ordem: `ProductFormDialog` + `StockManager` (núcleo) primeiro, depois `StockEntryDialog`/`StockEntriesManager`/`StockEntryDetailDialog` (entrada de nota), por último `CostHistoryPanel` (o mais opcional/cosmético).
5. Decidir conscientemente sobre cada integração da seção 9 — nenhuma delas é obrigatória para o módulo funcionar, mas cada uma que for pulada deve ser removida do código copiado (não deixada "morta", para não confundir o próximo dev).
6. Reimplementar os 2 Route Handlers da seção 6 exatamente como estão se qualquer tela nova também buscar dado em background por `useEffect` — é uma lição de arquitetura genérica do Next.js App Router, não específica deste domínio.
