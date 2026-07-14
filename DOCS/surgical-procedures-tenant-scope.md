# Settings / Surgical Procedures

## Objetivo

Documentar as alterações feitas no backend da rota de `settings/surgical-procedures`, com foco no comportamento por tenant e no impacto para o frontend.

Base path:

```text
/api/catalog
```

Headers obrigatórios:

```text
Authorization: Bearer {{accessToken}}
x-tenant-id: {{tenantId}}
```

## Regra de negócio implementada

O catálogo de procedimentos cirúrgicos agora respeita escopo por tenant.

### Itens base

- são globais
- continuam com `tenant_id = null`
- não podem ser editados nem removidos pela clínica
- podem ser ocultados individualmente por tenant

### Itens personalizados

- pertencem à clínica autenticada
- sempre são criados com o `tenantId` da clínica
- podem ser editados apenas pela própria clínica
- quando excluídos, usam soft delete

### Regra da listagem

A listagem retornada para a clínica é:

```text
base + personalizados do tenant - itens base ocultados pelo tenant
```

Além disso, itens personalizados com soft delete deixam de aparecer porque ficam com:

```text
active = false
visible = false
deleted_at preenchido
```

## Mudanças técnicas aplicadas

### 1. CRUD de procedimentos com escopo por tenant

No serviço de catálogo:

- criação de procedimento grava sempre com `tenant_id` da clínica atual
- edição só funciona para item personalizado da própria clínica
- leitura/listagem filtram itens ocultados do tenant
- deleção tem comportamento diferente para base e personalizado

Arquivos principais:

- `src/modules/catalog/catalog.service.ts`
- `src/modules/catalog/catalog.controller.ts`

### 2. Tabela de override por tenant

Foi criada uma tabela para registrar ocultação de item base por clínica:

```text
surgical_procedure_tenant_overrides
```

Arquivos:

- `database/migrations/20260713170000-create-surgical-procedure-tenant-overrides.js`
- `src/modules/catalog/models/surgical-procedure-tenant-override.model.ts`

Campos relevantes:

- `tenant_id`
- `surgical_procedure_id`
- `hidden`

## Endpoints principais

### 1. Listar procedimentos cirúrgicos

```text
GET /api/catalog/surgical-procedures?page=1&limit=100&categoryId=1
```

Resposta:

```json
{
  "data": [
    {
      "id": 10,
      "uuid": "c9d1e817-8f9a-46e3-bbb0-c1f2d5a11111",
      "tenant_id": null,
      "category_id": 1,
      "name": "Ovariossalpingo-histerectomia",
      "description": "Procedimento base global",
      "active": true,
      "visible": true,
      "private_price": 280,
      "cost_price": 90,
      "tax_percentage": 0,
      "category": {
        "id": 1,
        "uuid": "5ec7a815-8a7c-42ef-a3b8-7d9e6b111111",
        "tenant_id": null,
        "name": "Cirurgia Geral",
        "description": "Categoria base",
        "active": true,
        "visible": true,
        "createdAt": "2026-07-14T10:00:00.000Z",
        "updatedAt": "2026-07-14T10:00:00.000Z"
      },
      "createdAt": "2026-07-14T10:00:00.000Z",
      "updatedAt": "2026-07-14T10:00:00.000Z",
      "deletedAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### 2. Criar procedimento personalizado

```text
POST /api/catalog/surgical-procedures
```

Body:

```json
{
  "category_id": 1,
  "name": "Mastectomia clínica X",
  "description": "Procedimento personalizado da clínica",
  "active": true,
  "visible": true,
  "private_price": 320,
  "cost_price": 120,
  "tax_percentage": 3
}
```

Resposta:

```json
{
  "message": "Procedimento criado com sucesso.",
  "data": {
    "id": 25,
    "tenant_id": "0c3f6ac9-9a95-4b3a-8c5d-e19a0e0a1111",
    "category_id": 1,
    "name": "Mastectomia clínica X"
  }
}
```

### 3. Atualizar procedimento personalizado

```text
PUT /api/catalog/surgical-procedures/:id
```

Resposta:

```json
{
  "message": "Procedimento atualizado com sucesso.",
  "data": {
    "id": 25,
    "tenant_id": "0c3f6ac9-9a95-4b3a-8c5d-e19a0e0a1111",
    "name": "Mastectomia clínica X - Atualizado"
  }
}
```

### 4. Excluir procedimento

```text
DELETE /api/catalog/surgical-procedures/:id
```

#### Quando o item é personalizado da clínica

Resposta:

```json
{
  "ok": true,
  "action": "soft_deleted",
  "message": "Procedimento personalizado removido da listagem com sucesso.",
  "id": 25
}
```

#### Quando o item é base/global

Resposta:

```json
{
  "ok": true,
  "action": "hidden_base",
  "message": "Procedimento base ocultado com sucesso para a clínica atual.",
  "id": 10
}
```

## O que o frontend precisa considerar

### Create / Update

O frontend deve ler o item retornado em:

```text
response.data.data
```

### Delete

O frontend deve verificar:

- `response.data.ok`
- `response.data.action`
- `response.data.message`
- `response.data.id`

Campo importante:

- `action = soft_deleted`: item personalizado foi removido da listagem
- `action = hidden_base`: item base foi apenas ocultado para o tenant atual

## Swagger

Essas alterações agora estão documentadas no Swagger.

### Tag para procurar

```text
catalog
```

### Tópicos para procurar no `/api/docs`

- `Listar categorias de procedimentos cirúrgicos`
- `Criar categoria de procedimento cirúrgico`
- `Buscar categoria de procedimento cirúrgico por ID`
- `Atualizar categoria de procedimento cirúrgico`
- `Excluir categoria de procedimento cirúrgico`
- `Listar procedimentos cirúrgicos`
- `Criar procedimento cirúrgico`
- `Buscar procedimento cirúrgico por ID`
- `Atualizar procedimento cirúrgico`
- `Excluir ou ocultar procedimento cirúrgico`

### Schemas mais importantes

- `CreateSurgicalProcedureDto`
- `UpdateSurgicalProcedureDto`
- `SurgicalProcedureResponseDto`
- `SurgicalProcedureListResponseDto`
- `SurgicalProcedureMutationResponseDto`
- `SurgicalProcedureDeleteResponseDto`
- `CreateSurgicalProcedureCategoryDto`
- `UpdateSurgicalProcedureCategoryDto`
- `SurgicalProcedureCategoryResponseDto`

## Checklist de validação manual

Depois de rodar a migration, validar com dois tenants:

1. um procedimento criado na clínica A não aparece na clínica B
2. um item base ocultado na clínica A continua visível na clínica B
3. um item personalizado deletado não aparece mais na listagem
4. item base não pode ser editado pela clínica
5. item base não é apagado fisicamente, apenas ocultado por tenant
