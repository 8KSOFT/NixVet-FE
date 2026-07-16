access-control-permissions


GET
/api/access-control/permissions
Listar permissões cadastradas


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
Permissões listadas com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "data": [
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
  "total": 42,
  "page": 1,
  "totalPages": 3
}
No links
401	
Não autenticado.

No links

POST
/api/access-control/permissions
Criar permissão


Parameters
Cancel
No parameters

Request body

application/json
Edit Value
Schema
{
  "key": "products.read",
  "name": "Listar produtos",
  "description": "Permite visualizar produtos do tenant.",
  "resource": "products",
  "action": "read",
  "is_active": true
}
Execute
Responses
Code	Description	Links
201	
Permissão criada com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
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
No links
401	
Não autenticado.

No links

GET
/api/access-control/permissions/{id}
Buscar permissão por ID


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
Permissão encontrada.

Media type

application/json
Controls Accept header.
Example Value
Schema
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
No links
401	
Não autenticado.

No links

PATCH
/api/access-control/permissions/{id}
Atualizar permissão


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
  "key": "products.read",
  "name": "Listar produtos",
  "description": "Permite visualizar produtos do tenant.",
  "resource": "products",
  "action": "read",
  "is_active": true
}
Execute
Responses
Code	Description	Links
200	
Permissão atualizada com sucesso.

Media type

application/json
Controls Accept header.
Example Value
Schema
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
No links
401	
Não autenticado.

No links

DELETE
/api/access-control/permissions/{id}
Remover permissão


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
Permissão removida com sucesso.

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
access-control-profiles


