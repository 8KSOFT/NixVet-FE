# Assinatura digital + Receituário de 3 modelos (SIPEAGRO) — Relatório de implementação

## Objetivo

Registro do que foi implementado no frontend a partir do alinhamento em `DOCS/sipeagro-controlled-prescription-frontend-alignment.md` (gaps identificados) e `DOCS/receituario-e-financeiro-front.md` (confirmação do backend de que os bloqueios foram resolvidos). Cobre apenas a parte de **receituário/assinatura digital** — a parte de Financeiro v2 do segundo documento já estava implementada e não foi tocada aqui.

## O que foi implementado

### Tipos
- `src/app/types/prescription.ts`: novos tipos `PrescriptionLegalModel` (`SIMPLE`/`SPECIAL_CONTROL`/`VET_NOTIFICATION`), `SignatureStatus`, `PrescriptionSignature`, `SignPrescriptionPayload`.
- `src/app/types/team-user.ts`: `sipeagro_number?: string` adicionado em `TeamUserRow`, `TeamUserFormValues` e `ProfilePayload`.

### Hooks
- `src/hooks/apiHooks/usePrescriptions.ts`: `useSignPrescriptionMutation`, `useSignatureStatusQuery`, `useRevokeSignatureMutation`, `useDownloadSignedPrescriptionPdfMutation` (endpoint autenticado novo `GET /prescriptions/:id/signature/pdf`).
- `src/hooks/apiHooks/useUsers.ts`: `sipeagro_number?: string` adicionado em `UserPayload`.

### Perfil e Equipe
- `src/app/(app)/profile/page.tsx`: campo "Nº SIPEAGRO" (máx. 20 caracteres) ao lado de CRMV, com dica explicando a obrigatoriedade para o modelo `VET_NOTIFICATION`.
- `src/app/(app)/team/page.tsx`: mesmo campo no formulário de criar/editar membro, nova coluna na tabela desktop e linha no card mobile.
- Chaves de i18n novas em `src/locales/{pt,en,es}/common.json`: `profile.sipeagro`, `profile.sipeagroHint`, `team.colSipeagro`, `team.formSipeagro`, `team.formSipeagroHint`.

### Criação de prescrição
- `src/app/(app)/prescriptions/page.tsx`: checkbox "Uso contínuo" por medicamento (tipo `receita`). Quando marcado, desabilita os campos de duração (o PDF assinado imprime "USO CONTÍNUO" no lugar da duração) e `continuous_use: true` é enviado no payload de criação em vez de `duration_value`/`duration_unit`.

### Assinatura digital (novo fluxo completo)
Nova ação "Assinatura digital" (ícone de escudo) na listagem de prescrições — tabela desktop e cards mobile —, visível para prescrições do tipo `receita`. Abre um modal (`SignatureDialog`, inline em `prescriptions/page.tsx`) que busca o status sob demanda (`GET /prescriptions/:id/signature`) só quando aberto, e se comporta assim:

- **Sem assinatura**: seletor de 3 modelos (rádio, com base legal e nº de vias de cada um), checkbox "Antibacteriano de uso humano" quando `SIMPLE` está selecionado, aviso bloqueante com link para `/profile` quando `VET_NOTIFICATION` é escolhido e o veterinário logado não tem `sipeagro_number` cadastrado (busca via `useProfileQuery`, já existente). Assinar chama `POST /:id/sign` só com `prescription_type` (+ `is_human_antibacterial` quando aplicável) — não envia mais o campo legado `is_controlled`.
- **Assinada**: modelo inferido (ver limitação abaixo), nº de série quando houver, QR code do `verification_url` (`react-qr-code`, já usado em `settings/whatsapp-numbers/page.tsx`), `public_token`/`private_code` com botão de copiar, botão "Baixar PDF assinado" (novo endpoint autenticado) e botão "Revogar assinatura" com sub-formulário de motivo obrigatório.
- **Revogada**: estado somente leitura com data e motivo.

## Decisões tomadas (itens marcados como "fora de escopo" no plano)

- **Formulário duplicado de criação em `medical-records/[id]/page.tsx`**: não recebeu "uso contínuo" nem ação de assinatura — continua como estava. A assinatura só existe a partir de `/prescriptions`.
- **Sem badge de status na listagem principal**: `GET /prescriptions` não devolve dados de assinatura; a ação abre o modal e busca sob demanda em vez de pré-carregar tudo (evita N+1 requisições).
- **Sem sugestão automática de substância controlada via Bulário**: continua manual, o veterinário escolhe o modelo na hora de assinar.
- **Sem opção de certificado em nuvem/ICP-Brasil na UI**: o backend ainda rejeita `QUALIFIED_ICP` com 400.
- **Sem validação de CPF do tutor no front**: o backend não bloqueia a assinatura por isso (`requiresResponsibleCpf` é só informativo, usado no PDF).

## Limitação conhecida (reportar ao backend)

A resposta de `POST /:id/sign` e `GET /:id/signature` **não devolve `prescription_type`**, só `is_controlled` + `serial_number`. O front infere o modelo assim: `!is_controlled → SIMPLE`; `is_controlled && serial_number → VET_NOTIFICATION`; `is_controlled && !serial_number → SPECIAL_CONTROL`. Funciona hoje porque só `VET_NOTIFICATION` gera numeração, mas é frágil — se essa regra mudar no futuro, a inferência quebra silenciosamente. Sugestão: pedir ao backend para devolver `prescription_type` diretamente nas duas respostas.

## O que ainda falta / próximos passos possíveis

- Adicionar "uso contínuo" e assinatura também no formulário inline de `medical-records/[id]/page.tsx`, se o time quiser unificar os dois pontos de criação.
- Badge de status de assinatura na listagem principal (exigiria mudança no backend para incluir isso em `GET /prescriptions`).
- Pedir ao backend para devolver `prescription_type` na resposta de sign/status (ver limitação acima).
- Sugestão automática de classificação de substância controlada a partir do Bulário (gap de backend, não implementado).
- UI para certificado em nuvem/ICP-Brasil quando a Fase 3 for lançada no backend.

## Verificação realizada

- `npx tsc --noEmit` — sem erros.
- `npm run lint` (ESLint) — sem erros.
- Servidor de dev (`npm run dev`) iniciado e as rotas `/prescriptions`, `/profile` e `/team` responderam HTTP 200 sem erro de compilação/runtime.
- Não há testes automatizados para esta área; QA manual completo (criar receita com uso contínuo, assinar nos 3 modelos, bloqueio por SIPEAGRO ausente, baixar PDF assinado, revogar) ainda precisa ser feito por quem tiver acesso a um usuário/tenant de teste logado.
