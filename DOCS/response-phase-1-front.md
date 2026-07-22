# Fase 1 - Padronizacao de responses para o Front

> Data: 2026-07-20
> Backend: NixVet API
> Escopo: padronizacao inicial do envelope de sucesso nas respostas JSON.

---

## TL;DR

Os modulos da Fase 1 passaram a responder no formato:

```json
{
  "success": true,
  "message": "Operacao realizada com sucesso.",
  "data": {}
}
```

Modulos incluidos nesta fase:

1. `auth`
2. `patients`
3. `tutors`

Impacto principal no front:

- parar de consumir o objeto retornado na raiz quando a rota foi migrada
- passar a ler `response.data.data` como payload real da API
- usar `response.data.message` para toast, alertas e feedback visual
- usar `response.data.success` como flag padrao de sucesso

---

## Regra geral do front

### Antes

Algumas rotas retornavam o objeto diretamente:

```json
{
  "id": "uuid",
  "name": "Maria"
}
```

Ou listagens nesse formato:

```json
{
  "data": [],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

### Agora

Todas as rotas desta fase retornam:

```json
{
  "success": true,
  "message": "Texto padronizado da operacao.",
  "data": {}
}
```

### Adaptacao recomendada no front

```ts
const response = await api.get('/patients');

const ok = response.data.success;
const message = response.data.message;
const payload = response.data.data;
```

---

## Modulos e endpoints alterados

| Modulo | Endpoint | Mudanca |
|---|---|---|
| `auth` | `POST /api/auth/login` | retorno agora vem envelopado com `success`, `message` e `data` |
| `patients` | `POST /api/patients` | retorno de criacao agora vem envelopado |
| `patients` | `GET /api/patients` | retorno paginado agora fica dentro de `data` |
| `patients` | `GET /api/patients/:id/timeline` | timeline agora vem dentro de `data` |
| `patients` | `GET /api/patients/:id` | payload agora vem dentro de `data` |
| `patients` | `PUT /api/patients/:id` | update agora vem envelopado |
| `patients` | `DELETE /api/patients/:id` | delete agora retorna `{ id }` em `data` |
| `tutors` | `POST /api/tutors` | retorno de criacao agora vem envelopado |
| `tutors` | `GET /api/tutors` | retorno paginado agora fica dentro de `data` |
| `tutors` | `GET /api/tutors/:id` | payload agora vem dentro de `data` |
| `tutors` | `PUT /api/tutors/:id` | update agora vem envelopado |
| `tutors` | `DELETE /api/tutors/:id` | delete agora retorna `{ id }` em `data` |
| `tutors` | `POST /api/tutors/:id/request-erasure` | anonimiza e retorna `message` padrao |
| `tutors` | `GET /api/tutors/:id/data-export` | exportacao agora vem envelopada |

---

## Exemplos por modulo

## 1. Login

```json
{
  "success": true,
  "message": "Login realizado com sucesso.",
  "data": {
    "access_token": "jwt-token",
    "user": {
      "id": "uuid",
      "name": "Administrador",
      "email": "admin@nixvet.com"
    }
  }
}
```

No front:

- token em `response.data.data.access_token`
- usuario em `response.data.data.user`
- mensagem para toast em `response.data.message`

## 2. Listagem de pacientes

```json
{
  "success": true,
  "message": "Pacientes listados com sucesso.",
  "data": {
    "data": [],
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

No front:

- lista em `response.data.data.data`
- total em `response.data.data.total`
- pagina atual em `response.data.data.page`

## 3. Delete de paciente ou tutor

```json
{
  "success": true,
  "message": "Registro removido com sucesso.",
  "data": {
    "id": "uuid"
  }
}
```

No front:

- usar `message` para confirmacao visual
- remover da lista local pelo `id` retornado, se quiser validacao extra

---

## Impacto pratico no Front

- interceptors e hooks que antes retornavam `response.data` cru agora precisam expor `response.data.data`
- toasts de sucesso podem ser centralizados com `response.data.message`
- telas de listagem precisam observar que a paginacao continua igual, mas encapsulada em `data`
- telas de delete nao devem mais esperar `ok: true`

---

## Checklist rapido

- ajustar chamadas de `login`
- ajustar stores e hooks de pacientes
- ajustar stores e hooks de tutores
- revisar componentes de tabela que leem listagens paginadas
- revisar toasts para aproveitar `message`

---

## Observacao

Esta fase cobre apenas responses de sucesso. Responses de erro continuam seguindo o fluxo padrao do Nest e do filtro global da API.
