# RBAC: Access Control e Users

## Resumo

Esta documentacao cobre somente o que esta ativo hoje em:

- `access-control`
- `users`

Foi adicionada a infraestrutura de RBAC com:

- catalogo de permissoes
- perfis de acesso
- vinculo de perfis por usuario
- guard de permissoes baseado em `@Permissions(...)`
- inicio da adocao no modulo de `users`

Compatibilidade mantida:

- `users.role` continua existindo e continua sendo usado
- `RolesGuard` continua ativo
- `superadmin` continua com bypass automatico
- o sistema ainda aceita o fallback legado baseado em `role`

## Headers obrigatorios

Todas as requisicoes autenticadas devem enviar:

```http
Authorization: Bearer {{accessToken}}
x-tenant-id: {{tenantId}}
Content-Type: application/json
```

Base local:

```text
http://localhost:8537/api
```

## Fluxo de teste no Bruno

### 1. Login

`POST /auth/login`

```json
{
  "email": "suporte@8ksoft.com",
  "password": "{8Ksoft}",
  "tenantCode": "NIXVET"
}
```

Salvar:

- `access_token` -> `{{accessToken}}`
- `user.tenant_id` -> `{{tenantId}}`

### 2. Listar permissoes

`GET /access-control/permissions?page=1&limit=50`

Sem body.

Observacoes:

- este endpoint esta restrito a `superadmin`
- use esse retorno para localizar os IDs das permissoes que vao entrar no perfil

Exemplo de permissoes que fazem sentido para o fluxo de `users`:

- `users.read`
- `users.create`
- `users.update`
- `users.delete`

### 3. Criar permissao customizada

`POST /access-control/permissions`

```json
{
  "key": "users.export",
  "name": "Exportar usuarios",
  "description": "Permite exportar usuarios do tenant.",
  "resource": "users",
  "action": "export",
  "is_active": true
}
```

Salvar `id` como `{{permissionId}}`.

Observacao:

- este endpoint tambem esta restrito a `superadmin`

### 4. Buscar permissao por ID

`GET /access-control/permissions/{{permissionId}}`

Sem body.

### 5. Atualizar permissao

`PATCH /access-control/permissions/{{permissionId}}`

```json
{
  "name": "Exportar usuarios atualizado",
  "description": "Permite exportar usuarios do tenant com filtro."
}
```

### 6. Criar perfil de acesso customizado

`POST /access-control/profiles`

```json
{
  "name": "Gestao de Usuarios",
  "slug": "gestao-de-usuarios",
  "description": "Perfil para operacoes de usuarios no tenant",
  "permission_ids": [
    "{{usersReadPermissionId}}",
    "{{usersCreatePermissionId}}",
    "{{usersUpdatePermissionId}}",
    "{{usersDeletePermissionId}}"
  ],
  "is_active": true
}
```

Salvar `id` como `{{profileId}}`.

Observacoes:

- este endpoint aceita apenas perfis customizados do tenant
- perfis de sistema sao visiveis, mas nao podem ser alterados nem removidos por aqui

### 7. Listar perfis visiveis para o tenant

`GET /access-control/profiles?page=1&limit=20`

Sem body.

### 8. Buscar perfil por ID

`GET /access-control/profiles/{{profileId}}`

Sem body.

### 9. Atualizar perfil

`PATCH /access-control/profiles/{{profileId}}`

```json
{
  "description": "Perfil atualizado no teste Bruno",
  "is_active": true
}
```

### 10. Criar usuario temporario

`POST /users`

```json
{
  "name": "RBAC Bruno User",
  "email": "rbac.bruno.teste+001@nixvet.test",
  "password": "Teste@1234",
  "role": "manager"
}
```

Salvar:

- `id` -> `{{userId}}`
- `email`

Observacoes:

- se `role` nao for enviado, o backend usa `veterinarian`
- a atribuicao de `admin` continua restrita a `admin` e `superadmin`

### 11. Listar equipe do tenant

`GET /users/staff?page=1&limit=10`

Sem body.

### 12. Buscar perfis do usuario

`GET /users/{{userId}}/access-profiles`

Sem body.

### 13. Substituir completamente os perfis do usuario

`PUT /users/{{userId}}/access-profiles`

```json
{
  "profileIds": [
    "{{profileId}}"
  ]
}
```

Observacoes:

- este endpoint faz sincronizacao completa
- se enviar array vazio, remove todos os perfis vinculados ao usuario
- perfis duplicados no body retornam erro de validacao

### 14. Confirmar os perfis do usuario

`GET /users/{{userId}}/access-profiles`

Sem body.

### 15. Atualizar usuario

`PUT /users/{{userId}}`

```json
{
  "name": "RBAC Bruno User Atualizado",
  "role": "manager"
}
```

### 16. Remover todos os perfis do usuario

`PUT /users/{{userId}}/access-profiles`

```json
{
  "profileIds": []
}
```

### 17. Excluir usuario temporario

`DELETE /users/{{userId}}`

Sem body.

Resposta esperada:

```json
{
  "ok": true,
  "message": "Usuario deletado com sucesso.",
  "id": "uuid"
}
```

Observacao:

- a exclusao do usuario agora limpa os vinculos em `user_access_profiles` antes de remover o registro

### 18. Excluir perfil temporario

`DELETE /access-control/profiles/{{profileId}}`

Sem body.

Resposta esperada:

```json
{
  "ok": true,
  "id": "uuid"
}
```

Observacao:

- se o perfil ainda estiver vinculado a algum usuario, a API retorna:

```json
{
  "statusCode": 400,
  "message": "Nao e possivel remover um perfil vinculado a usuarios."
}
```

### 19. Excluir permissao temporaria

`DELETE /access-control/permissions/{{permissionId}}`

Sem body.

Resposta esperada:

```json
{
  "ok": true,
  "id": "uuid"
}
```

## O que o front precisa saber

### Endpoints novos de access control

- `GET /access-control/permissions`
- `GET /access-control/permissions/:id`
- `POST /access-control/permissions`
- `PATCH /access-control/permissions/:id`
- `DELETE /access-control/permissions/:id`
- `GET /access-control/profiles`
- `GET /access-control/profiles/:id`
- `POST /access-control/profiles`
- `PATCH /access-control/profiles/:id`
- `DELETE /access-control/profiles/:id`
- `GET /users/:id/access-profiles`
- `PUT /users/:id/access-profiles`

### Endpoints de users impactados pelo RBAC

- `GET /users/staff`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

### Regras atuais de autorizacao

No modulo `users`, as rotas abaixo passaram a usar `@Permissions(...)` junto com `RolesGuard`:

- `GET /users/staff` -> `users.read`
- `POST /users` -> `users.create`
- `PUT /users/:id` -> `users.update`
- `DELETE /users/:id` -> `users.delete`

Compatibilidade da transicao:

- `RolesGuard` continua ativo
- `users.role` continua existindo
- `superadmin` continua com acesso automatico
- o backend ainda suporta o fallback por papel legado enquanto a migracao nao termina

## Respostas importantes

### Permissao

`POST` e `PATCH /access-control/permissions` retornam o objeto da permissao:

```json
{
  "id": "uuid",
  "key": "users.export",
  "name": "Exportar usuarios",
  "description": "Permite exportar usuarios do tenant.",
  "resource": "users",
  "action": "export",
  "is_system": false,
  "is_active": true
}
```

### Perfil de acesso

`POST`, `GET` e `PATCH /access-control/profiles/:id` retornam:

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Gestao de Usuarios",
  "slug": "gestao-de-usuarios",
  "description": "Perfil para operacoes de usuarios no tenant",
  "is_system": false,
  "is_active": true,
  "permissions": []
}
```

### Perfis do usuario

`GET` e `PUT /users/:id/access-profiles` retornam:

```json
{
  "userId": "uuid",
  "profiles": [
    {
      "id": "uuid",
      "name": "Gestao de Usuarios",
      "slug": "gestao-de-usuarios",
      "permissions": []
    }
  ]
}
```

### Exclusao de usuario

`DELETE /users/:id` retorna:

```json
{
  "ok": true,
  "message": "Usuario deletado com sucesso.",
  "id": "uuid"
}
```

## Swagger

Status atual da documentacao Swagger para este escopo:

- `access-control-permissions`: documentado
- `access-control-profiles`: documentado
- `access-control-user-profiles`: documentado
- `users`: ainda nao esta documentado com o mesmo nivel de Swagger nesta etapa

Ou seja: para `access-control`, o Swagger esta alinhado. Para `users`, a cobertura ainda esta parcial.
