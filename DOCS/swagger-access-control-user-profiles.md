access-control-user-profiles


GET
/api/users/{id}/access-profiles
Listar perfis de acesso vinculados a um usuário


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
Perfis do usuário listados com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "profiles": [
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
  ]
}
No links
401	
Não autenticado.

No links

PUT
/api/users/{id}/access-profiles
Substituir completamente os perfis de acesso de um usuário


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
  "profileIds": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
Execute
Responses
Code	Description	Links
200	
Perfis do usuário sincronizados com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "profiles": [
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
  ]
}
No links
401	
Não autenticado.

No links

Schemas