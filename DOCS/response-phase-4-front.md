# Fase 4 - Padronizacao de responses para o Front

> Data: 2026-07-20
> Backend: NixVet API
> Escopo: padronizacao do envelope de sucesso nos modulos financeiros e de produtos.

---

## TL;DR

Os modulos da Fase 4 passaram a responder no formato:

```json
{
  "success": true,
  "message": "Operacao realizada com sucesso.",
  "data": {}
}
```

Modulos incluidos nesta fase:

1. `billing`
2. `budgets`
3. `products`

Importante:

- `GET /api/budgets/:id/pdf` continua binario
- webhook do Asaas continua respondendo `200`, mas o corpo agora tambem fica padronizado

---

## Endpoints alterados

| Modulo | Endpoint | Mudanca |
|---|---|---|
| `billing` | `POST /api/billing/register` | resposta agora vem envelopada |
| `billing` | `POST /api/billing/webhook/asaas` | corpo JSON padronizado com `processed` |
| `billing` | `GET /api/billing/status` | status agora vem dentro de `data` |
| `billing` | `POST /api/billing/activate` | criacao de assinatura agora vem envelopada |
| `billing` | `GET /api/billing/payment-link` | link agora vem dentro de `data` |
| `billing` | `POST /api/billing/cancel` | cancelamento agora vem envelopado |
| `billing` | `GET /api/billing/invoices` | lista agora vem dentro de `data` |
| `budgets` | `POST /api/budgets` | criacao agora vem envelopada |
| `budgets` | `GET /api/budgets` | listagem agora vem dentro de `data` |
| `budgets` | `GET /api/budgets/:id` | payload agora vem dentro de `data` |
| `budgets` | `PATCH /api/budgets/:id` | update agora vem envelopado |
| `budgets` | `PATCH /api/budgets/:id/approve` | aprovacao agora vem envelopada |
| `budgets` | `PATCH /api/budgets/:id/convert` | conversao agora vem envelopada |
| `products` | `POST /api/products/sales` | criacao de venda agora vem envelopada |
| `products` | `GET /api/products/sales` | lista de vendas agora vem dentro de `data` |
| `products` | `GET /api/products/sales/:id` | venda agora vem dentro de `data` |
| `products` | `GET /api/products` | lista agora vem dentro de `data` |
| `products` | `POST /api/products` | criacao agora vem envelopada |
| `products` | `GET /api/products/:id` | produto agora vem dentro de `data` |
| `products` | `PATCH /api/products/:id` | update agora vem envelopado |
| `products` | `PUT /api/products/:id` | update agora vem envelopado |
| `products` | `DELETE /api/products/:id` | delete agora retorna `{ id }` em `data` |

---

## Endpoints que permanecem binarios

| Modulo | Endpoint | Tipo |
|---|---|---|
| `budgets` | `GET /api/budgets/:id/pdf` | PDF |

No front:

- continuar usando download por blob
- nao tentar ler `success/message/data` nessa rota

---

## Exemplos importantes

## 1. Ativacao de plano

```json
{
  "success": true,
  "message": "Assinatura criada no Asaas.",
  "data": {
    "paymentUrl": "https://asaas.com/payment"
  }
}
```

## 2. Status de cobranca

```json
{
  "success": true,
  "message": "Status de cobranca carregado com sucesso.",
  "data": {
    "status": "active",
    "trialEndsAt": null,
    "billingPlan": "clinica"
  }
}
```

## 3. Orcamentos

```json
{
  "success": true,
  "message": "Orcamentos listados com sucesso.",
  "data": [
    {
      "id": "uuid",
      "status": "draft"
    }
  ]
}
```

## 4. Delete de produto

```json
{
  "success": true,
  "message": "Produto removido com sucesso.",
  "data": {
    "id": "uuid"
  }
}
```

## 5. Webhook do Asaas

```json
{
  "success": true,
  "message": "Webhook processado com sucesso.",
  "data": {
    "processed": true
  }
}
```

Observacao:

- este endpoint e de integracao backend-backend
- o front normalmente nao consome essa rota
- a documentacao esta aqui apenas para registrar o novo contrato

---

## Impacto pratico no Front

- telas de assinatura e faturamento devem ler o payload em `response.data.data`
- listagem de faturas agora fica em `response.data.data`
- CRUD de produtos e vendas passa a ter o mesmo contrato visual dos outros modulos
- delete de produto nao deve mais depender de `ok: true`
- acoes de orcamento podem usar `response.data.message` como padrao para toast

---

## Checklist rapido

- ajustar hooks de billing
- ajustar hooks de budgets
- ajustar hooks de products
- revisar fluxo de assinatura e pagamento
- revisar lista de faturas
- manter download PDF de orcamento como blob

---

## Observacao

Esta fase fecha o lote inicial de padronizacao de responses. A partir daqui, o ideal no front e considerar `success/message/data` como contrato base para qualquer endpoint JSON novo que seguir o mesmo padrao.
