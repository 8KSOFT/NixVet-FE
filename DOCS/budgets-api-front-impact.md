# Alteracoes no modulo de Orcamentos e impacto no Front

## Objetivo

Este documento resume as alteracoes feitas nos arquivos abaixo e destaca o que pode impactar o frontend da rota `/financeiro/orcamentos`.

- `src/modules/budgets/budget-item.model.ts`
- `src/modules/budgets/budgets.controller.ts`
- `src/modules/budgets/budgets.module.ts`
- `src/modules/budgets/budgets.service.ts`
- `src/modules/budgets/dto/create-budget.dto.ts`
- `src/modules/products/products.service.ts`

## Resumo executivo

As mudancas principais foram:

1. suporte a item de orcamento do tipo `product`
2. `veterinarian_id` passou a ser opcional no `POST /api/budgets`
3. o backend agora resolve produto por `reference_id` e preenche descricao/preco automaticamente
4. respostas de orcamento agora retornam resumo financeiro e campos formatados em `R$`
5. respostas de produtos tambem passaram a retornar campos formatados de preco

## Arquivo a arquivo

### 1. `create-budget.dto.ts`

Referencia: `src/modules/budgets/dto/create-budget.dto.ts:16-97`

Alteracoes:

- `item_type` agora aceita `product`
- `description` deixou de ser obrigatoria para itens `product`
- `unit_price` deixou de ser obrigatorio para itens `product`
- `veterinarian_id` passou a ser opcional no payload de criacao/edicao
- campos numericos usam transformacao para `Number`

Impacto no front:

- o front pode criar orcamento com item `product`
- ao enviar item `product`, nao precisa obrigatoriamente mandar `description` nem `unit_price`
- o front pode deixar de enviar `veterinarian_id` quando quiser usar o usuario autenticado como responsavel

Payload agora aceito para produto:

```json
{
  "patient_id": "uuid-do-paciente",
  "type": "procedure",
  "items": [
    {
      "item_type": "product",
      "reference_id": "uuid-do-produto",
      "quantity": 2
    }
  ]
}
```

### 2. `budget-item.model.ts`

Referencia: `src/modules/budgets/budget-item.model.ts:20-33`

Alteracao:

- o enum de `item_type` passou a incluir `product`

Impacto no front:

- a UI pode exibir e tratar `product` como um tipo valido de item de orcamento
- filtros, badges, labels e mapeamentos locais do front precisam considerar esse novo tipo

Observacao operacional:

- para o banco aceitar `product`, a migration correspondente precisa estar aplicada

### 3. `budgets.module.ts`

Referencia: `src/modules/budgets/budgets.module.ts:13-18`

Alteracao:

- o modulo de orcamentos passou a injetar `Product` via `SequelizeModule.forFeature`

Impacto no front:

- sem impacto direto de contrato
- esta mudanca existe para permitir que o backend resolva dados do produto na criacao/edicao do orcamento

### 4. `budgets.controller.ts`

Referencia: `src/modules/budgets/budgets.controller.ts:25-33`

Alteracao:

- no `POST /api/budgets`, o controller agora repassa o usuario autenticado para o service

Impacto no front:

- sem impacto visual direto
- impacto funcional indireto: o front nao precisa mais forcar `veterinarian_id` em todos os cenarios

### 5. `budgets.service.ts`

Referencia: `src/modules/budgets/budgets.service.ts:43-319`

Alteracoes relevantes:

- resolve itens `product` buscando o produto por `reference_id`
- se o item for `product`, preenche:
  - `description` com o nome do produto, se nao vier no payload
  - `unit_price` com `product.sale_price`, se nao vier no payload
  - `reference_type` com `product`
- valida itens nao-produto exigindo `description` e `unit_price`
- define `veterinarian_id` com base no usuario autenticado quando o payload nao informar esse campo
- respostas de `findAll`, `findOne`, `create`, `update`, `approve` e `convert` agora retornam um objeto apresentado para o front
- adiciona `summary` no retorno do orcamento
- adiciona campos formatados em `R$` nos itens

Novos campos retornados por item:

```json
{
  "unit_price_formatted": "R$ 120,00",
  "total_price_formatted": "R$ 240,00",
  "plan_coverage_amount_formatted": "R$ 0,00"
}
```

Novo bloco `summary` retornado no orcamento:

```json
{
  "summary": {
    "currency": "BRL",
    "total": 240,
    "total_formatted": "R$ 240,00",
    "plan_coverage": 0,
    "plan_coverage_formatted": "R$ 0,00",
    "tutor_responsibility": 240,
    "tutor_responsibility_formatted": "R$ 240,00"
  }
}
```

Impacto no front:

- o front pode usar `summary.total_formatted`, `summary.plan_coverage_formatted` e `summary.tutor_responsibility_formatted` sem precisar formatar manualmente
- o front passa a receber `reference_type: "product"` nos itens de produto
- ao editar ou listar orcamentos, a tela deve suportar itens com `item_type: "product"`
- se o front ja fazia formatacao local, precisa decidir se:
  - continua formatando do lado do client, ou
  - passa a usar os campos formatados vindos da API

Recomendacao:

- usar os campos numericos para calculos
- usar os campos `*_formatted` apenas para exibicao

### 6. `products.service.ts`

Referencia: `src/modules/products/products.service.ts:43-98`

Alteracoes:

- respostas de produto agora retornam:
  - `sale_price_formatted`
  - `cost_price_formatted`
- bloco `pricing` agora retorna:
  - `sale_price_formatted`
  - `cost_formatted`
  - `tax_amount_formatted`
  - `client_total_formatted`
  - `margin_value_formatted`

Exemplo:

```json
{
  "sale_price": 120,
  "sale_price_formatted": "R$ 120,00",
  "pricing": {
    "client_total": 126,
    "client_total_formatted": "R$ 126,00"
  }
}
```

Impacto no front:

- a listagem/selecao de produtos pode exibir preco formatado sem formatacao extra
- se o front usa `sale_price` bruto para calculo e `pricing.client_total` para exibicao, isso continua valido
- os novos campos sao aditivos, entao nao devem quebrar consumo existente

## Contrato de API que o front precisa considerar

### Criacao de orcamento com produto

Endpoint: `POST /api/budgets`

Payload minimo:

```json
{
  "patient_id": "uuid-do-paciente",
  "type": "procedure",
  "items": [
    {
      "item_type": "product",
      "reference_id": "uuid-do-produto",
      "quantity": 1
    }
  ]
}
```

Comportamento:

- `veterinarian_id` pode ser omitido
- `description` pode ser omitido para `product`
- `unit_price` pode ser omitido para `product`
- backend busca nome e preco no cadastro do produto

### Criacao de orcamento com item manual

Payload minimo:

```json
{
  "patient_id": "uuid-do-paciente",
  "type": "procedure",
  "items": [
    {
      "item_type": "procedure",
      "description": "Consulta especializada",
      "quantity": 1,
      "unit_price": 180
    }
  ]
}
```

Comportamento:

- para item que nao seja `product`, `description` e `unit_price` continuam obrigatorios

## Checklist para o frontend

- incluir `product` nas opcoes de tipo de item
- permitir selecao de produto com `reference_id`
- nao exigir `description` e `unit_price` quando `item_type === "product"`
- aceitar resposta com `summary`
- aceitar resposta com `unit_price_formatted`, `total_price_formatted` e `plan_coverage_amount_formatted`
- decidir se a tela vai exibir valores usando os campos formatados da API
- validar se a listagem/detalhe de orcamento usa `reference_type` quando precisar diferenciar item manual de produto

## Riscos de integracao

- se o front tiver enum local fechado sem `product`, a tela pode quebrar ou esconder esse item
- se o front assumir que `veterinarian_id` sempre vem do formulario, pode manter uma validacao desnecessaria
- se a migration de banco nao estiver aplicada, o backend pode falhar ao persistir item `product`

## Conclusao

As mudancas acima foram feitas para alinhar o backend ao fluxo esperado da tela de orcamentos, principalmente no uso de produtos e na exibicao de valores em moeda brasileira. O maior impacto no front esta no contrato do `POST /api/budgets` e no consumo dos novos campos retornados pela API.
