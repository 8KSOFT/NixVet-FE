products


POST
/api/products/sales
Registrar venda de produtos


Parameters
Cancel
No parameters

Request body

application/json
Dados da venda de produtos.

Examples: 
Exemplo de venda
Edit Value
Schema
{
  "patient_id": "11111111-1111-1111-1111-111111111111",
  "tutor_id": "22222222-2222-2222-2222-222222222222",
  "notes": "Venda realizada no balcão.",
  "items": [
    {
      "product_id": "33333333-3333-3333-3333-333333333333",
      "quantity": 2
    }
  ]
}
Execute
Responses
Code	Description	Links
201	
Venda registrada com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "patient_id": {},
  "tutor_id": {},
  "sold_by": {},
  "total_gross": 79.8,
  "total_tax": 2.39,
  "total_amount": 82.19,
  "notes": "Venda realizada no balcão.",
  "sold_at": "2026-07-13T14:30:00.000Z",
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "sale_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "product_id": {},
      "product_name": "Produto teste orcamento Bruno",
      "quantity": 2,
      "unit_price": 39.9,
      "tax_percentage": 3,
      "line_gross": 79.8,
      "line_tax": 2.39,
      "line_total": 82.19
    }
  ],
  "createdAt": "2026-07-13T14:30:00.000Z",
  "updatedAt": "2026-07-13T14:30:00.000Z"
}
No links
401	
Não autenticado.

No links

GET
/api/products/sales
Listar vendas de produtos


Parameters
Cancel
No parameters

Execute
Responses
Code	Description	Links
200	
Lista de vendas encontradas.

Media type

application/json
Controls Accept header.
Example Value
Schema
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "patient_id": {},
    "tutor_id": {},
    "sold_by": {},
    "total_gross": 79.8,
    "total_tax": 2.39,
    "total_amount": 82.19,
    "notes": "Venda realizada no balcão.",
    "sold_at": "2026-07-13T14:30:00.000Z",
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "sale_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "product_id": {},
        "product_name": "Produto teste orcamento Bruno",
        "quantity": 2,
        "unit_price": 39.9,
        "tax_percentage": 3,
        "line_gross": 79.8,
        "line_tax": 2.39,
        "line_total": 82.19
      }
    ],
    "createdAt": "2026-07-13T14:30:00.000Z",
    "updatedAt": "2026-07-13T14:30:00.000Z"
  }
]
No links
401	
Não autenticado.

No links

GET
/api/products/sales/{id}
Buscar venda de produto por ID


Parameters
Cancel
Name	Description
id *
string($uuid)
(path)
ID da venda.

id
Execute
Responses
Code	Description	Links
200	
Venda encontrada.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "patient_id": {},
  "tutor_id": {},
  "sold_by": {},
  "total_gross": 79.8,
  "total_tax": 2.39,
  "total_amount": 82.19,
  "notes": "Venda realizada no balcão.",
  "sold_at": "2026-07-13T14:30:00.000Z",
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "sale_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "product_id": {},
      "product_name": "Produto teste orcamento Bruno",
      "quantity": 2,
      "unit_price": 39.9,
      "tax_percentage": 3,
      "line_gross": 79.8,
      "line_tax": 2.39,
      "line_total": 82.19
    }
  ],
  "createdAt": "2026-07-13T14:30:00.000Z",
  "updatedAt": "2026-07-13T14:30:00.000Z"
}
No links
401	
Não autenticado.

No links
404	
Venda não encontrada.

No links

GET
/api/products
Listar produtos


Parameters
Cancel
Name	Description
include_inactive
boolean
(query)
Se true, inclui produtos inativos.


false
Execute
Responses
Code	Description	Links
200	
Lista de produtos encontrada.

Media type

application/json
Controls Accept header.
Example Value
Schema
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Produto teste orcamento Bruno",
    "description": "Produto criado para validar fluxo de orçamento.",
    "sku": "BRUNO-ORCAMENTO",
    "cost_price": 25.5,
    "sale_price": 39.9,
    "tax_percentage": 0,
    "stock_quantity": 10,
    "active": true,
    "sale_price_formatted": "R$ 39,90",
    "cost_price_formatted": "R$ 25,50",
    "pricing": {
      "sale_price": 55.5,
      "cost": 30.5,
      "tax_percentage": 3,
      "tax_amount": 1.67,
      "client_total": 57.17,
      "margin_value": 24.99,
      "margin_percentage": 45.03,
      "sale_price_formatted": "R$ 55,50",
      "cost_formatted": "R$ 30,50",
      "tax_amount_formatted": "R$ 1,67",
      "client_total_formatted": "R$ 57,17",
      "margin_value_formatted": "R$ 24,99"
    },
    "createdAt": "2026-07-13T14:20:00.000Z",
    "updatedAt": "2026-07-13T14:25:00.000Z"
  }
]
No links
401	
Não autenticado.

No links

POST
/api/products
Criar produto


Parameters
Cancel
No parameters

Request body

application/json
Dados para criação de produto.

Examples: 
Exemplo de criação
Edit Value
Schema
{
  "name": "Produto teste orcamento Bruno",
  "description": "Produto criado para validar fluxo de orcamento",
  "sku": "BRUNO-ORCAMENTO",
  "cost_price": 25.5,
  "sale_price": 39.9,
  "tax_percentage": 3,
  "stock_quantity": 10,
  "active": true
}
Execute
Responses
Code	Description	Links
201	
Produto criado com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Produto teste orcamento Bruno",
  "description": "Produto criado para validar fluxo de orçamento.",
  "sku": "BRUNO-ORCAMENTO",
  "cost_price": 25.5,
  "sale_price": 39.9,
  "tax_percentage": 0,
  "stock_quantity": 10,
  "active": true,
  "sale_price_formatted": "R$ 39,90",
  "cost_price_formatted": "R$ 25,50",
  "pricing": {
    "sale_price": 55.5,
    "cost": 30.5,
    "tax_percentage": 3,
    "tax_amount": 1.67,
    "client_total": 57.17,
    "margin_value": 24.99,
    "margin_percentage": 45.03,
    "sale_price_formatted": "R$ 55,50",
    "cost_formatted": "R$ 30,50",
    "tax_amount_formatted": "R$ 1,67",
    "client_total_formatted": "R$ 57,17",
    "margin_value_formatted": "R$ 24,99"
  },
  "createdAt": "2026-07-13T14:20:00.000Z",
  "updatedAt": "2026-07-13T14:25:00.000Z"
}
No links
401	
Não autenticado.

No links

GET
/api/products/{id}
Buscar produto por ID


Parameters
Cancel
Name	Description
id *
string($uuid)
(path)
ID do produto.

id
Execute
Responses
Code	Description	Links
200	
Produto encontrado.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Produto teste orcamento Bruno",
  "description": "Produto criado para validar fluxo de orçamento.",
  "sku": "BRUNO-ORCAMENTO",
  "cost_price": 25.5,
  "sale_price": 39.9,
  "tax_percentage": 0,
  "stock_quantity": 10,
  "active": true,
  "sale_price_formatted": "R$ 39,90",
  "cost_price_formatted": "R$ 25,50",
  "pricing": {
    "sale_price": 55.5,
    "cost": 30.5,
    "tax_percentage": 3,
    "tax_amount": 1.67,
    "client_total": 57.17,
    "margin_value": 24.99,
    "margin_percentage": 45.03,
    "sale_price_formatted": "R$ 55,50",
    "cost_formatted": "R$ 30,50",
    "tax_amount_formatted": "R$ 1,67",
    "client_total_formatted": "R$ 57,17",
    "margin_value_formatted": "R$ 24,99"
  },
  "createdAt": "2026-07-13T14:20:00.000Z",
  "updatedAt": "2026-07-13T14:25:00.000Z"
}
No links
401	
Não autenticado.

No links
404	
Produto não encontrado.

No links

PATCH
/api/products/{id}
Atualizar parcialmente um produto


Parameters
Cancel
Name	Description
id *
string($uuid)
(path)
ID do produto.

id
Request body

application/json
Campos para atualização parcial do produto.

Examples: 
Exemplo de atualização
Edit Value
Schema
{
  "name": "Produto teste orcamento Bruno att",
  "description": "Produto criado para validar fluxo de orcamento att",
  "sku": "BRUNO-ORCAMENTO att",
  "cost_price": 30.5,
  "sale_price": 55.5,
  "tax_percentage": 3,
  "stock_quantity": 20,
  "active": true
}
Execute
Responses
Code	Description	Links
200	
Produto atualizado com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Produto teste orcamento Bruno",
  "description": "Produto criado para validar fluxo de orçamento.",
  "sku": "BRUNO-ORCAMENTO",
  "cost_price": 25.5,
  "sale_price": 39.9,
  "tax_percentage": 0,
  "stock_quantity": 10,
  "active": true,
  "sale_price_formatted": "R$ 39,90",
  "cost_price_formatted": "R$ 25,50",
  "pricing": {
    "sale_price": 55.5,
    "cost": 30.5,
    "tax_percentage": 3,
    "tax_amount": 1.67,
    "client_total": 57.17,
    "margin_value": 24.99,
    "margin_percentage": 45.03,
    "sale_price_formatted": "R$ 55,50",
    "cost_formatted": "R$ 30,50",
    "tax_amount_formatted": "R$ 1,67",
    "client_total_formatted": "R$ 57,17",
    "margin_value_formatted": "R$ 24,99"
  },
  "createdAt": "2026-07-13T14:20:00.000Z",
  "updatedAt": "2026-07-13T14:25:00.000Z"
}
No links
401	
Não autenticado.

No links
404	
Produto não encontrado.

No links

PUT
/api/products/{id}
Atualizar produto por completo


Parameters
Cancel
Name	Description
id *
string($uuid)
(path)
ID do produto.

id
Request body

application/json
Dados para atualização do produto.

Examples: 
Exemplo de substituição
Edit Value
Schema
{
  "name": "Produto teste orcamento Bruno att",
  "description": "Produto criado para validar fluxo de orcamento att",
  "sku": "BRUNO-ORCAMENTO att",
  "cost_price": 30.5,
  "sale_price": 55.5,
  "tax_percentage": 3,
  "stock_quantity": 20,
  "active": true
}
Execute
Responses
Code	Description	Links
200	
Produto atualizado com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Produto teste orcamento Bruno",
  "description": "Produto criado para validar fluxo de orçamento.",
  "sku": "BRUNO-ORCAMENTO",
  "cost_price": 25.5,
  "sale_price": 39.9,
  "tax_percentage": 0,
  "stock_quantity": 10,
  "active": true,
  "sale_price_formatted": "R$ 39,90",
  "cost_price_formatted": "R$ 25,50",
  "pricing": {
    "sale_price": 55.5,
    "cost": 30.5,
    "tax_percentage": 3,
    "tax_amount": 1.67,
    "client_total": 57.17,
    "margin_value": 24.99,
    "margin_percentage": 45.03,
    "sale_price_formatted": "R$ 55,50",
    "cost_formatted": "R$ 30,50",
    "tax_amount_formatted": "R$ 1,67",
    "client_total_formatted": "R$ 57,17",
    "margin_value_formatted": "R$ 24,99"
  },
  "createdAt": "2026-07-13T14:20:00.000Z",
  "updatedAt": "2026-07-13T14:25:00.000Z"
}
No links
401	
Não autenticado.

No links
404	
Produto não encontrado.

No links

DELETE
/api/products/{id}
Excluir produto


Parameters
Cancel
Name	Description
id *
string($uuid)
(path)
ID do produto.

id
Execute
Responses
Code	Description	Links
200	
Produto removido com sucesso. A implementação atual responde sem corpo JSON.

No links
401	
Não autenticado.

No links
404	
Produto não encontrado.