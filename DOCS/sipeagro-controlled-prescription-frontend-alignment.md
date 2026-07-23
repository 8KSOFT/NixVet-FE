# SIPEAGRO / Receituário de Controle Especial (3 vias) — Alinhamento para o Frontend

## Objetivo

Levantamento do que já existe no backend (`NixVet-BE`) para prescrição de medicamentos controlados (Portaria 837/25 — MAPA/SIPEAGRO) e do que precisa ser alinhado/desbloqueado antes (ou durante) o desenvolvimento da tela no frontend. Este documento é só de pesquisa — nenhum código foi alterado.

Repos analisados:
- `D:\Jobs\8KSOFT\Nixvet\NixVet-BE`
- `D:\Jobs\8KSOFT\Nixvet\NixVet-FE`

## Resumo executivo

O backend já tem um módulo de assinatura digital (`src/modules/signature`) funcional em nível de contrato HTTP: assinar uma prescrição, marcar como "controlada", gerar numeração sequencial, gerar o PDF de "3 vias" e uma página pública de verificação. **O frontend hoje não consome nada disso** — só existe a página de verificação pública (`/verificar/[signatureId]`), que foi construída de forma isolada e já modela boa parte dos dados que faltam no resto do app.

Só que **3 pontos no backend bloqueiam qualquer avanço real no front**, independente de quanto tempo se gaste na tela:

1. **Não existe forma de gravar o "Nº SIPEAGRO" do veterinário via API.** O campo existe na tabela `users`, mas não está em nenhum DTO de update (`update-profile.dto.ts`, `update-user.dto.ts`, `create-user.dto.ts`). Como o backend usa `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, mandar esse campo hoje derruba a requisição inteira com 400. Sem isso, **nenhum veterinário jamais vai conseguir assinar uma receita controlada**, porque `signature.service.ts:138` exige `vet.sipeagro_number` preenchido.
2. **O campo `continuous_use` (uso contínuo) não existe no DTO de criação de prescrição** (`create-prescription.dto.ts`, classe `MedicationDto`), só é usado dentro do gerador de PDF. Pelo mesmo motivo do item acima (`whitelist + forbidNonWhitelisted`), se o front mandar esse campo por medicamento, a criação da prescrição inteira falha com 400.
3. **Não existe integração real com o SIPEAGRO/MAPA.** Tudo que existe é assinatura digital interna + geração de PDF + um campo booleano manual `is_controlled`. Não há endpoint de "enviar ao SIPEAGRO", nem status de protocolo/aprovação do órgão. Isso precisa ser validado com o time de produto: o escopo atual é "assinar digitalmente e imprimir/entregar as vias", não "submeter ao governo".

Fora esses bloqueios, o resto é trabalho normal de frontend (telas, tipos, hooks) — mapeado nas seções abaixo.

## O que já existe no backend (pronto para o front consumir)

### Endpoints

Todos sob `/api/prescriptions`, autenticados (`JwtAuthGuard`), exceto os de `/verificar` (públicos):

| Método | Rota | Já usado pelo front? | Observação |
|---|---|---|---|
| `POST` | `/prescriptions` | Sim | Criação básica, sem campos de controlado |
| `GET` | `/prescriptions` | Sim | Lista paginada |
| `GET` | `/prescriptions/:id` | Sim (indireto) | Detalhe |
| `GET` | `/prescriptions/:id/pdf` | Sim | PDF simples (não é o de 3 vias assinado) |
| `POST` | `/prescriptions/:id/email` | Sim | Envio por e-mail do PDF simples |
| `POST` | `/prescriptions/:id/sign` | **Não** | Assina digitalmente; `is_controlled` decide se gera 3 vias |
| `GET` | `/prescriptions/:id/signature` | **Não** | Status da assinatura |
| `POST` | `/prescriptions/:id/signature/revoke` | **Não** | Revoga assinatura |
| `GET` | `/verificar/:id` | Sim, mas só na página pública | Verificação pública, tiered (nível 0/1/2) |
| `GET` | `/verificar/:id/pdf` | Sim, mas só na página pública | PDF assinado (3 vias), exige `token` |

### Contrato de `POST /prescriptions/:id/sign`

`src/modules/signature/dto/sign-prescription.dto.ts`:
```ts
export class SignPrescriptionDto {
  is_controlled?: boolean;                          // dispara exigência de Nº SIPEAGRO + numeração sequencial
  signing_method?: 'ADVANCED' | 'QUALIFIED_ICP';     // QUALIFIED_ICP -> 400 "ainda não disponível (Fase 3)"
}
```

Resposta (envelope `{ success, message, data }`, migrado em 2026-07-20 — ver `docs/response-phase-10-front.md` no BE):
```json
{
  "id": "uuid",
  "status": "SIGNING",
  "signing_method": "ADVANCED",
  "verification_url": "https://.../verificar/uuid",
  "serial_number": "2026-000123",
  "is_controlled": true,
  "signed_at": "2026-07-23T...",
  "public_token": "a1b2c3",
  "private_code": "4821"
}
```

`GET /prescriptions/:id/signature` retorna o mesmo shape + `revoked_at` (ou `{ status: 'UNSIGNED' }` se nunca assinada).

`POST /prescriptions/:id/signature/revoke` — body `{ reason: string }` (obrigatório, max 500 chars) — resposta `{ id, status, revoked_at }`.

### Regra de negócio principal (`signature.service.ts:137-142`)

```ts
const isControlled = dto.is_controlled === true;
if (isControlled && !vet.sipeagro_number) {
  throw new BadRequestException(
    'Nº SIPEAGRO obrigatório para assinar receita de controlados (Portaria 837/25).',
  );
}
```

### O que o PDF de 3 vias contém (`prescription-pdf.generator.ts`)

- Página 1: receita comum (sempre).
- Páginas 2 e 3: **só quando `is_controlled === true`** — "1ª via — Farmácia" e "2ª via — Tutor/Responsável". A "3ª via" (veterinário) **não é impressa**; fica só digitalmente (registro de assinatura + log de auditoria + PDF armazenado).
- Bloco do emitente: nome, `CRMV/UF`, Nº SIPEAGRO, endereço, telefone, cidade/UF.
- Bloco "RECEITUÁRIO CONTROLE ESPECIAL": número de série, data, identificação da via, linha de assinatura.
- Bloco do comprador/tutor: nome, CPF, telefone, endereço.
- Lista de medicamentos com selo vermelho **"USO CONTÍNUO"** quando `medication.continuous_use === true`.
- Campos em branco para preenchimento manual na farmácia: "IDENTIFICAÇÃO DO COMPRADOR" e "IDENTIFICAÇÃO DO FORNECEDOR" (assinatura do farmacêutico).
- `CRMV/UF`: o UF é extraído por regex (`/\b([A-Z]{2})\b/`) de dentro da própria string `crmv` — não existe campo separado de UF no cadastro do veterinário.
- **Endereço e telefone do veterinário são sempre `null`** (`signature.service.ts:607-609`) porque o model `User` não tem essas colunas — o PDF cai no endereço/telefone da clínica (`Tenant`) como fallback. Se a regra da categoria/estado exigir o contato do próprio veterinário emitente, isso é um gap de schema no backend, não algo que o front pode resolver sozinho.

### Verificação pública (`/verificar/:id`)

Já usada e modelada em `src/app/verificar/[signatureId]/page.tsx` (única implementação real hoje). Nível de acesso progressivo:
- **Nível 0** (sem token): status, veterinário, clínica, `is_controlled`, `serial_number` — dados não sensíveis.
- **Nível 1** (`?token=`, o "token da farmácia"): + tutor, pet, medicamentos, observações.
- **Nível 2** (`?token=&code=`, código de 4 dígitos do tutor): + CPF, endereço, telefone do tutor.
- Rate limit: 10 req/min e 100 req/hora por IP (Redis, fail-open se Redis cair).
- `GET /verificar/:id/pdf?token=` retorna o PDF assinado binário — **hoje esta é a única forma de baixar o PDF de 3 vias já assinado**, mesmo estando dentro do app autenticado (ver bloqueio nº 8 abaixo).

## O que falta no frontend (a construir)

### Tipos (hoje divergentes/ausentes)

- `src/app/types/prescription.ts` — `Prescription` e `CreatePrescriptionPayload` não têm `is_controlled`, `serial_number`, `signature status`, nem `continuous_use` por medicamento. O único lugar onde esse shape existe é local à página `/verificar` (`VerificationData`, `Medication`), sem ser um tipo compartilhado.
- Precisa: promover algo como `PrescriptionSignature`/`ControlledPrescriptionStatus` para `src/app/types/`, reaproveitando o shape já usado em `verificar/[signatureId]/page.tsx`.
- Adicionar `is_controlled?: boolean` no formulário de criação (por prescrição) e `continuous_use?: boolean` por item do array `medications` — **mas só depois que o backend aceitar esse campo no DTO** (bloqueio nº 2).

### Hooks (não existem ainda)

Faltam em `src/hooks/apiHooks/` (hoje só existe `usePrescriptions.ts` com create/list/pdf/email):
- `useSignPrescriptionMutation()` → `POST /prescriptions/:id/sign`
- `useSignatureStatusQuery(id)` → `GET /prescriptions/:id/signature`
- `useRevokeSignatureMutation()` → `POST /prescriptions/:id/signature/revoke`

### Telas/fluxos

1. **Perfil / equipe** (`src/app/(app)/profile/page.tsx`, `src/app/(app)/team/page.tsx`): adicionar campo "Nº SIPEAGRO" ao lado de CRMV — hoje só existe CRMV/especialidade. **Bloqueado até o backend expor o campo no DTO (bloqueio nº 1).**
2. **Criação de prescrição** (`src/app/(app)/prescriptions/page.tsx` e a versão duplicada em `medical-records/[id]/page.tsx`): adicionar toggle "medicamento controlado" e "uso contínuo" por item. Como não existe nenhuma lista/classificação de substância controlada vinda do Bulário, a marcação será manual — risco de compliance se o vet esquecer de marcar (ver pergunta nº 9).
3. **Lista de prescrições**: badge de status de assinatura (não assinada / pendente / assinada / revogada), ícone de "controlada", número de série.
4. **Ação "Assinar"**: botão + modal na prescrição já criada, chamando `sign` com `signing_method: 'ADVANCED'` (única opção disponível — `QUALIFIED_ICP` deve ficar oculto/desabilitado, ver bloqueio nº 5).
5. **Pós-assinatura**: exibir `verification_url` (com QR code), `public_token` e `private_code` para o veterinário anotar/compartilhar, e o link/botão para baixar o PDF de 3 vias.
6. **Revogação**: modal com campo obrigatório de motivo (`reason`, max 500 chars).
7. **Reconciliar as duas telas de criação de prescrição** (`prescriptions/page.tsx` e o modal dentro de `medical-records/[id]/page.tsx`) para que os novos campos (`is_controlled`, `continuous_use`) não fiquem implementados só em uma delas.

## Bloqueios/pendências reais no backend — alinhar antes de codar

1. **`sipeagro_number` inacessível via API.** Não está em `update-profile.dto.ts`, `update-user.dto.ts` nem `create-user.dto.ts`. Com `whitelist: true, forbidNonWhitelisted: true` (`src/main.ts:107-110`), qualquer tentativa de enviar esse campo hoje retorna 400. **Sem isso, a feature inteira não funciona**, pois é pré-requisito para assinar receita controlada.
2. **`continuous_use` ausente em `MedicationDto`** (`create-prescription.dto.ts`). Mesma trava de `whitelist`/`forbidNonWhitelisted` — o front não pode mandar esse campo até o backend declarar a propriedade no DTO.
3. **Não há integração real com o SIPEAGRO/MAPA.** Confirmar com produto se o escopo desta fase é só "assinar digitalmente + gerar PDF de 3 vias para impressão", sem qualquer envio/protocolo ao governo. Se um dia for necessário enviar ao webservice oficial, não existe hoje nenhum client HTTP, status de protocolo, nem campo de retorno para isso.
4. **Backend de assinatura ainda é stub de desenvolvimento.** `OracleVaultSigner` (produção) lança `ServiceUnavailableException` hardcoded (`oracle-vault.signer.ts:27-40`) — as variáveis `ORACLE_VAULT_KEY_OCID`/`ORACLE_VAULT_ENDPOINT` estão vazias no `.env` atual, então tudo roda hoje em cima de `LocalHmacVaultSigner`, comentado como **"NÃO usar em produção"**. A tela pode ser construída e testada, mas a assinatura gerada hoje não tem validade jurídica real — confirmar com o time se isso bloqueia o lançamento em produção da tela ou só o "modo produção" dela.
5. **`QUALIFIED_ICP` (assinatura ICP-Brasil) explicitamente não implementado** (`signature.service.ts:110-115` lança 400 "ainda não disponível (Fase 3)"). O front deve esconder ou desabilitar essa opção por enquanto — só `ADVANCED` funciona.
6. **Armazenamento do PDF (`OciStorageService`) não configurado** (`PLATFORM_API_URL`/`PLATFORM_API_TOKEN`/`APP_ID` ausentes no `.env`). O PDF é regenerado sob demanda a cada request — não deveria mudar o contrato para o front, mas vale confirmar se isso é aceitável em produção (custo de regenerar sempre, disponibilidade).
7. **Endereço/telefone do veterinário não existem no model `User`.** Hoje aparecem sempre como `null` no PDF, caindo no fallback da clínica. Se a categoria exigir contato do próprio emitente na receita, é preciso adicionar essas colunas + DTO + tela — não é algo que o front resolve sozinho, precisa de schema novo no backend.
8. **Não existe endpoint autenticado para baixar o PDF assinado de dentro do app.** Hoje o único jeito de obter o PDF de 3 vias é `GET /verificar/:id/pdf?token=`, a rota pública, usando o `public_token`. Perguntar ao backend: o veterinário logado deve baixar o PDF assinado por dentro de `/prescriptions` usando um endpoint autenticado próprio, ou o fluxo pretendido é sempre reusar a rota pública (com o token que o próprio backend gerou)? Isso muda a tela de "pós-assinatura".
9. **Nenhuma classificação de substância controlada vem do Bulário** (`bulario_items` não tem campo de lista A1/A2/A3/B1/B2/C1 etc.). O `is_controlled` é 100% manual no momento da assinatura — perguntar se produto quer, no mínimo, uma sugestão automática baseada no medicamento selecionado para reduzir risco de erro humano.
10. **`print_audit` está registrado no `app.module.ts` mas não tem controller/service** — nada grava nele hoje. Se a compliance exigir rastro de "quando a via foi impressa", esse endpoint precisa existir antes do front poder chamá-lo ao clicar em imprimir/baixar.
11. **Swagger sem schemas tipados** (`{ type: 'object', additionalProperties: true }`) e nenhuma coleção Bruno para `prescriptions`/`signature`/`verificar`. Geração automática de tipos no front não é confiável aqui — os tipos precisam ser copiados manualmente do código-fonte do backend (como feito neste documento) e revalidados a cada mudança.

## Checklist sugerido de implementação (frontend)

- [ ] Confirmar com backend a liberação de `sipeagro_number` no DTO de perfil/usuário (bloqueio 1)
- [ ] Confirmar com backend a liberação de `continuous_use` no `MedicationDto` (bloqueio 2)
- [ ] Confirmar com produto o escopo real de "SIPEAGRO" nesta fase (bloqueio 3)
- [ ] Confirmar se o PDF assinado será servido por endpoint autenticado ou só pelo público com token (bloqueio 8)
- [ ] Adicionar campo "Nº SIPEAGRO" em `profile/page.tsx` e `team/page.tsx`
- [ ] Criar tipo compartilhado `PrescriptionSignature` em `src/app/types/`, baseado no que já existe em `verificar/[signatureId]/page.tsx`
- [ ] Criar hooks `useSignPrescriptionMutation`, `useSignatureStatusQuery`, `useRevokeSignatureMutation`
- [ ] Adicionar toggle "controlado" (por prescrição) e "uso contínuo" (por medicamento) no formulário de criação — nas duas telas que criam prescrição
- [ ] Adicionar badge de status de assinatura + número de série na listagem de prescrições
- [ ] Construir modal de assinatura (só `signing_method: 'ADVANCED'` visível) e modal de revogação (`reason` obrigatório)
- [ ] Construir tela pós-assinatura com QR code do `verification_url`, `public_token`, `private_code` e download do PDF de 3 vias
- [ ] Reconciliar a lógica duplicada de criação de prescrição entre `prescriptions/page.tsx` e `medical-records/[id]/page.tsx`

## Perguntas objetivas para levar ao time de backend/produto

1. Quando vocês vão liberar `sipeagro_number` nos DTOs de update de usuário/perfil? Sem isso não dá pra testar nada de ponta a ponta.
2. Podem adicionar `continuous_use: boolean` (opcional) em `MedicationDto` de `create-prescription.dto.ts`?
3. O escopo desta fase é só "assinar digitalmente + gerar as 3 vias em PDF para impressão", sem envio a nenhum webservice do governo? Isso está certo?
4. O PDF assinado (3 vias) deve ser baixado de dentro do app autenticado por um endpoint próprio, ou o fluxo é sempre via link público `/verificar/:id/pdf?token=`?
5. A assinatura gerada hoje (stub HMAC local) é aceitável para ambiente de produção nesta fase, ou isso bloqueia o lançamento até a integração com Oracle Vault estar pronta?
6. Existe previsão para o campo de endereço/telefone do próprio veterinário (hoje inexistente no model `User`), caso a receita precise exibir o contato do emitente e não só da clínica?
7. Precisamos de alguma tela/endpoint para registrar "impressão" da via (compliance), já que `PrintAuditModule` existe mas está sem controller/service?
8. Existe algum plano de curto prazo para classificar medicamentos controlados automaticamente a partir do Bulário, ou o toggle manual por prescrição é aceito como definitivo?
9. Confirma que só `signing_method: 'ADVANCED'` deve aparecer na UI por enquanto (ICP-Brasil/`QUALIFIED_ICP` fica oculto)?
