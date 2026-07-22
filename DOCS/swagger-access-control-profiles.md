access-control-profiles


GET
/api/access-control/profiles
Listar perfis de acesso visíveis para o tenant


Parameters
Cancel
Name	Description
page
number
(query)
1
limit
number
(query)
50
Execute
Responses
Code	Description	Links
200	
Perfis listados com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "tenant_id": {},
      "name": "Recepção Avançada",
      "slug": "reception-advanced",
      "description": "Perfil operacional para recepção com mais acessos.",
      "is_system": false,
      "is_active": true,
      "permissions": [
        {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "key": "products.read",
          "name": "Listar produtos",
          "description": "Permite visualizar produtos do tenant.",
          "resource": "products",
          "action": "read",
          "is_system": true,
          "is_active": true,
          "createdAt": "2026-07-15T10:00:00.000Z",
          "updatedAt": "2026-07-15T10:00:00.000Z"
        }
      ],
      "createdAt": "2026-07-15T10:00:00.000Z",
      "updatedAt": "2026-07-15T10:00:00.000Z"
    }
  ],
  "total": 8,
  "page": 1,
  "totalPages": 1
}
No links
401	
Não autenticado.

No links

POST
/api/access-control/profiles
Criar perfil de acesso customizado para o tenant


Parameters
Cancel
No parameters

Request body

application/json
Edit Value
Schema
{
  "name": "Recepção Avançada",
  "slug": "reception-advanced",
  "description": "Perfil operacional para recepção com mais acessos.",
  "permission_ids": [
    "string"
  ],
  "is_active": true
}
Execute
Responses
Code	Description	Links
201	
Perfil criado com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": {},
  "name": "Recepção Avançada",
  "slug": "reception-advanced",
  "description": "Perfil operacional para recepção com mais acessos.",
  "is_system": false,
  "is_active": true,
  "permissions": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "key": "products.read",
      "name": "Listar produtos",
      "description": "Permite visualizar produtos do tenant.",
      "resource": "products",
      "action": "read",
      "is_system": true,
      "is_active": true,
      "createdAt": "2026-07-15T10:00:00.000Z",
      "updatedAt": "2026-07-15T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
No links
401	
Não autenticado.

No links

GET
/api/access-control/profiles/{id}
Buscar perfil de acesso por ID


Parameters
Cancel
Name	Description
id *
string
(path)
id
Execute
Responses
Code	Description	Links
200	
Perfil encontrado.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": {},
  "name": "Recepção Avançada",
  "slug": "reception-advanced",
  "description": "Perfil operacional para recepção com mais acessos.",
  "is_system": false,
  "is_active": true,
  "permissions": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "key": "products.read",
      "name": "Listar produtos",
      "description": "Permite visualizar produtos do tenant.",
      "resource": "products",
      "action": "read",
      "is_system": true,
      "is_active": true,
      "createdAt": "2026-07-15T10:00:00.000Z",
      "updatedAt": "2026-07-15T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
No links
401	
Não autenticado.

No links

PATCH
/api/access-control/profiles/{id}
Atualizar perfil de acesso customizado do tenant


Parameters
Cancel
Name	Description
id *
string
(path)
id
Request body

application/json
Edit Value
Schema
{
  "name": "Recepção Avançada",
  "slug": "reception-advanced",
  "description": "Perfil operacional para recepção com mais acessos.",
  "permission_ids": [
    "string"
  ],
  "is_active": true
}
Execute
Responses
Code	Description	Links
200	
Perfil atualizado com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tenant_id": {},
  "name": "Recepção Avançada",
  "slug": "reception-advanced",
  "description": "Perfil operacional para recepção com mais acessos.",
  "is_system": false,
  "is_active": true,
  "permissions": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "key": "products.read",
      "name": "Listar produtos",
      "description": "Permite visualizar produtos do tenant.",
      "resource": "products",
      "action": "read",
      "is_system": true,
      "is_active": true,
      "createdAt": "2026-07-15T10:00:00.000Z",
      "updatedAt": "2026-07-15T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
No links
401	
Não autenticado.

No links

DELETE
/api/access-control/profiles/{id}
Remover perfil de acesso customizado do tenant


Parameters
Cancel
Name	Description
id *
string
(path)
id
Execute
Responses
Code	Description	Links
200	
Perfil removido com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "ok": true,
  "id": "11111111-1111-1111-1111-111111111111"
}
No links
401	
Não autenticado.

No links
access-control-user-profiles


