# Onboarding "Instalador" — Análise para fase de execução

Data: 2026-07-30
Escopo: `NixVet-FE` (este repo) + `NixVet-BE` (`d:/Jobs/8KSOFT/Nixvet/NixVet-BE`, pasta vizinha).
Status: **só análise, nenhum código foi alterado.** Este documento é a base para planejar a implementação.

## Objetivo do onboarding

Trocar os CTAs "Começar Agora" da landing page (`src/app/page.tsx`) por algo como **"Começar agora grátis"**, abrindo um fluxo multi-etapas ("instalador", nos moldes de setup wizard de app desktop) que:
1. cria o tenant (clínica) + usuário admin;
2. loga o admin automaticamente;
3. coleta a configuração operacional mínima (horários, tipos de atendimento, equipe) para a clínica **já sair usável** ao final, sem depender de o admin descobrir sozinho a área de Settings depois.

---

## Resumo executivo

- **Já existe um endpoint de self-signup público e funcional**: `POST /billing/register` (`NixVet-BE`), que cria tenant + admin + trial de 14 dias sem exigir plano/pagamento. O `/register` atual do FE (`src/app/register/page.tsx`) já é uma UI de 3 passos que usa exatamente esse endpoint — é o ponto de partida natural do instalador, não algo a construir do zero.
- **O maior buraco não é "criar o tenant", é "o que sobra vazio depois"**: catálogo clínico, bulário e permissões (RBAC) já vêm prontos globalmente para qualquer tenant novo — mas **tipos de atendimento, horário de funcionamento/agenda de veterinários e recursos físicos ficam com zero registros** e não têm nenhum seed automático em runtime. Sem isso, a tela de agendamento fica vazia no primeiro login. Isso é o que o instalador precisa resolver que o `/register` atual não resolve.
- **Duas lacunas técnicas bloqueiam o "sair usando" direto**: (1) `/billing/register` não loga automaticamente — hoje o usuário é redirecionado pro `/login` e precisa digitar tudo de novo; (2) não existe nenhum componente de wizard/stepper reutilizável no design system — o `/register` atual implementa steps com `useState` local, não extraído.
- **Não existe conceito de "tenant incompleto" hoje** — nenhuma coluna `onboarded`/`setup_complete`, nenhum guard que force configuração. Isso é uma decisão de produto em aberto (seção 10) e provavelmente vale introduzir uma flag para poder retomar o instalador se o usuário fechar o modal no meio.
- **Existem hoje 3 formas diferentes de criar tenant** (público `/billing/register`, `POST /tenants` restrito a superadmin/dev, `POST /superadmin/tenants` do painel de plataforma), com 3 payloads diferentes. O instalador deve reusar o fluxo de `/billing/register` — os outros dois são ferramentas internas/administrativas e não devem ser tocados.

---

## 1. Landing page — estado atual dos CTAs

`src/app/page.tsx` tem 3 botões:
- Linha 90-97 (hero): **"Começar Agora"** → `/login`
- Linha 253-262 (cards de planos): **"Começar grátis"** → `/register`
- Linha 308-320 (CTA final): **"Começar agora"** → `/login`

Inconsistência a corrigir: dois desses CTAs hoje mandam para `/login` (não para `/register`), o que já é um bug de UX independente do onboarding — alguém clicando em "Começar Agora" no hero cai numa tela de login, não de cadastro. Os 3 devem convergir para o novo fluxo de onboarding.

`src/lib/plans.ts` já define os 3 planos pagos (`essencial` R$179, `clinica` R$299 — destaque, `hospital` R$499) espelhados no backend (`PLAN_VALUES` em `billing.service.ts`). O instalador **não precisa** coletar forma de pagamento — o modelo atual é trial de 14 dias sem cartão, plano escolhido/pago depois via `/billing/activate` (tela `/billing` já existente, fora do escopo do instalador).

---

## 2. Como um tenant é criado hoje (backend)

Três caminhos, todos passando pelo mesmo `TenantsService.create(name, code)`:

| Endpoint | Quem chama hoje | Público? | Payload |
|---|---|---|---|
| `POST /billing/register` | `src/app/register/page.tsx` | **Sim** (`@Public()`) | `RegisterClinicDto`: `clinicName`, `clinicCode`, `adminName`, `adminEmail`, `adminPassword`, `cpfCnpj?`, `phone?` |
| `POST /tenants` | `settings/page.tsx` (bloco "Nova clínica de teste", só superadmin) | Não (role `superadmin`, ou `admin` fora de produção — brecha de dev) | `{ name, code, initialUser? }` |
| `POST /superadmin/tenants` | `/superadmin/clinics` (dialog "Nova clínica") | Não (role `superadmin`) | `SuperadminCreateTenantDto`: inclui `billing_plan`, feature flags |

**`POST /billing/register` é o único candidato correto para o instalador.** Fluxo interno (`BillingService.registerClinic`, `billing.service.ts:39`):
1. valida `clinicCode` único;
2. se `cpfCnpj` informado, bloqueia reuso em outro tenant (1 trial por CPF/CNPJ);
3. `tenantsService.create()` — cria a linha `tenants`; **se storage OCI estiver configurado, provisiona bucket de forma síncrona e desfaz o tenant se falhar** (ponto de atenção: uma falha de infra externa pode derrubar a criação do tenant no meio do wizard);
4. cria o usuário `admin` (`usersService.create(..., callerRole='superadmin')`, bypassa a checagem normal de permissão);
5. cria cliente Asaas (não bloqueia se falhar);
6. grava `trial_ends_at = +14 dias`, `subscription_status='trial'`, `billing_plan=null`.
7. **Não cria nada mais** — sem tipos de atendimento, sem horários, sem recursos.

Retorno hoje: `{ tenantId, tenantCode, adminEmail }` — **sem token de acesso**. Isso precisa mudar para viabilizar login automático (seção 8).

Endpoint já protegido por `ThrottlerGuard` global (`app.module.ts`), então abuso de signup em massa já tem alguma mitigação de rate-limit — não é um gap novo a resolver.

---

## 3. O que o tenant novo já ganha "de graça"

Graças a dados globais (`tenant_id = NULL`) ou fallback em código, **nenhuma ação extra é necessária** para:

- **Catálogo clínico** (doenças, procedimentos cirúrgicos, exames, materiais) — seed global, tenant pode sobrepor depois se quiser.
- **Bulário de medicamentos** — seed global, sem `tenant_id` no model.
- **RBAC** (permissions + 6 access_profiles: `superadmin`, `admin`, `veterinarian`, `reception`, `intern`, `manager`) — perfis globais (`tenant_id NULL`); qualquer usuário criado com um desses `role` herda as permissões automaticamente por fallback (`PermissionService.loadLegacyRoleProfile`), sem precisar provisionar nada por tenant.
- **Chatbot** — se não houver registro em `chatbot-settings`, cai num prompt padrão ("Nina") gerado em código usando nome/telefone/endereço do próprio tenant.

## 4. O que fica vazio e bloqueia o primeiro uso real

| Dado | Por que fica vazio | Impacto se não configurado |
|---|---|---|
| **Tipos de atendimento** (`appointment_types`) | Existe um seed (`20260326112000-seed-default-appointment-types.js`) mas ele só rodou **uma vez**, iterando os tenants que existiam *naquele deploy*. Tenants criados depois via API não recebem nada. | Tela de agendamento não tem o que selecionar como tipo de consulta. |
| **Horário de funcionamento** (`clinic_business_hours`, 1 linha por dia da semana) | Nenhum default. | Motor de disponibilidade não gera slots — agenda aparece vazia mesmo com veterinários cadastrados. |
| **Agenda por veterinário** (`veterinarian_schedules`) | Nenhum default. | Mesmo com horário da clínica configurado, um veterinário sem agenda própria não aparece como disponível para agendamento. |
| **Recursos físicos** (`resources` — salas etc.) | Opcional; `tenant_scheduling_config` tem defaults sensatos (buffer 0min, slot 30min) mesmo sem linha explícita. | Só é bloqueante se a clínica usar agendamento por sala/equipamento. |
| **Segundo veterinário / equipe** | Só o admin existe após o registro. | Não bloqueia uso (o próprio admin pode ter `role=admin` e atender), mas praticamente toda clínica real vai precisar cadastrar pelo menos 1 veterinário com CRMV. |

Não existe nenhum guard que **impeça** o uso do sistema nesse estado — o admin loga e navega livremente com tudo vazio. A única trava de acesso existente é de billing (`BillingActiveGuard`/`PlanGuard`, bloqueiam só se trial expirar ou assinatura for suspensa), não de completude de configuração.

Campos exatos dos modelos relevantes (para dimensionar os steps do wizard):
- `AppointmentType`: `name`, `duration_minutes` (default 30), `color` (hex, opcional), `is_active`.
- `ClinicBusinessHours` (1 linha por `day_of_week` 0-6): `open_time`, `close_time`, `is_closed`, `is_24h`. Já existe `POST availability/config/business-hours/batch` para gravar a semana inteira numa chamada só.
- `VeterinarianSchedule` (por `user_id` + `day_of_week`): `start_time`, `end_time`, `slot_duration_minutes`, `schedule_type` (`regular`|`on_call`).

---

## 5. Frontend — o que reaproveitar e o que falta

**Reaproveitável:**
- `src/app/register/page.tsx` — steps 1 e 2 (dados da clínica + admin) já são exatamente os campos de `RegisterClinicDto`. É a base de conteúdo do início do wizard.
- `src/components/dashboard-create-form-dialog.tsx` (`DashboardCreateFormDialog`) — padrão de modal grande já usado em toda a app (header fixo, body com scroll, footer fixo com ações). Boa base visual para o modal do instalador.
- `src/components/ui/progress.tsx` (Radix Progress) — existe mas não é usado em lugar nenhum ainda; candidato natural pra barra de progresso das etapas.
- `src/lib/axios.ts` + padrão de `login/page.tsx:140-147` — como estabelecer contexto de sessão (`localStorage.accessToken/tenantId/tenantCode/user` + `setTenantCookie()`) depois de logar. O wizard precisa replicar exatamente esse padrão assim que tiver um token, para poder chamar os endpoints autenticados dos steps seguintes (horários, equipe etc.) sem pedir login de novo.
- Componentes de CRUD já existentes em `settings/hours`, `settings/appointment-types`, `settings/team` — a lógica de formulário de cada um pode ser extraída/reaproveitada como o conteúdo de cada step, em vez de reescrever do zero.

**Não existe e precisa ser construído:**
- Componente de **stepper/wizard genérico** — hoje não há nenhum no design system; o único "multi-step" é o `useState` local do `/register`.
- Fluxo de **login automático pós-criação de tenant** — hoje `/register` só mostra toast e redireciona pro `/login` manual.
- Um **modal acionável a partir da landing page** (rota pública, sem sidebar/layout autenticado) — a landing hoje não tem nenhum estado de modal; view a decidir (seção 10).

`src/middleware.ts` só cuida de detectar subdomínio (grava cookie `nixvet_subdomain`) e não faz nenhuma checagem de auth — não há risco de colisão ao introduzir uma rota/estado novo para o onboarding.

---

## 6. Inconsistências e riscos encontrados (vale corrigir na mesma frente)

1. **2 dos 3 CTAs da landing apontam para `/login`, não `/register`** (seção 1) — bug de UX preexistente.
2. **`path.includes('/auth/register')` em `tenant.middleware.ts:37`** isenta um endpoint `/auth/register` que **não existe** no `AuthController` — código morto/rota planejada e nunca implementada. Não afeta o instalador (que vai usar `/billing/register`), mas vale um comentário/limpeza se alguém for mexer nessa área.
3. **Criação de tenant pode falhar por infraestrutura externa (OCI)**: `TenantsService.create()` desfaz o tenant se o provisionamento do bucket falhar. Um erro transitório de storage durante o instalador derruba o cadastro inteiro no primeiro step — o wizard precisa tratar esse erro com uma mensagem clara e permitir retry, não só um toast genérico.
4. **3 payloads diferentes para criar tenant** (seção 2) — não é bloqueante para o instalador (que usa só `/billing/register`), mas é uma dívida técnica a registrar; não escopo desta análise.
5. **Nenhuma flag de "onboarding completo"** — se o usuário fechar o modal na metade, o tenant e o admin já existem no banco (criados no primeiro step), mas a config operacional fica pela metade. Hoje não há como o sistema saber disso e oferecer "continuar de onde parou" no próximo login.

---

## 7. Proposta de escopo das etapas do wizard

Ordem sugerida — passos 1-2 são obrigatórios (equivalem ao `/billing/register` atual); os demais viram um **checklist configurável dentro do próprio modal**, com opção de "pular e configurar depois" por etapa, exceto onde marcado como fortemente recomendado:

1. **Sua clínica** *(obrigatório)* — `clinicName`, `clinicCode` (slug autogerado, editável).
2. **Responsável (admin)** *(obrigatório)* — `adminName`, `adminEmail`, `adminPassword`.
   → Ao final do passo 2, chamar `POST /billing/register`, receber os dados, **logar automaticamente** e já entrar em contexto de tenant (ver seção 8) antes de prosseguir — assim, se o usuário fechar o modal aqui, ele já consegue voltar via login normal.
3. **Dados fiscais** *(opcional)* — `cpfCnpj`, `phone` (igual ao step 3 atual do `/register`; usado depois em `/billing/activate`).
4. **Horário de funcionamento** *(fortemente recomendado)* — grade dos 7 dias (`open_time`/`close_time`/`is_closed`/`is_24h`) via `POST availability/config/business-hours/batch`. Sugerir um padrão (seg-sex 8h-18h) pré-preenchido para reduzir fricção.
5. **Tipos de atendimento** *(fortemente recomendado)* — oferecer os 5 tipos padrão do seed antigo (Consulta Clínica, Retorno, Vacinação, Curativo, Avaliação Pré-cirúrgica) pré-marcados, com opção de editar nome/duração/cor ou desmarcar, gravando via `POST /appointment-types` (loop) ao confirmar.
6. **Equipe / veterinários** *(opcional)* — adicionar mais usuários (`POST /users`) além do admin, com `role`, `crmv`, `specialty`, `sipeagro_number`. Pode incluir a agenda semanal de cada um (`veterinarian_schedules`) neste mesmo passo, ou empurrar isso pro pós-onboarding.
7. **Resumo / conclusão** — mostra o que foi configurado, o que ficou pendente (com link direto pra seção de Settings correspondente), e botão "Entrar no sistema" → `/dashboard`.

Itens deliberadamente **fora** do escopo do instalador (ficam para Settings, como já é hoje): planos de saúde/convênios, branding/subdomínio custom, WhatsApp, Google Calendar, templates de termo, automações — são configurações de "segunda onda", não bloqueiam o primeiro uso.

---

## 8. Mudanças necessárias no backend

- **`POST /billing/register` precisa devolver credenciais de sessão** (ex: reaproveitar `AuthService.buildStaffSession()` internamente e retornar `access_token` + `user` no mesmo shape de `POST /auth/login`), para o FE logar automaticamente sem uma segunda chamada. Ou, alternativamente, o FE chama `/auth/login` logo em seguida com a senha que acabou de definir — mais simples de implementar, mas expõe a senha em memória por mais tempo e faz uma chamada a mais. Recomendo a primeira opção.
- **Seed automático de tipos de atendimento padrão para tenants novos**: hoje só existe como migration pontual. Se o step 5 do wizard for "pré-marcado com sugestões", isso já resolve via chamadas normais do FE — **não precisa** de mudança de backend nesse ponto, só reaproveitar `POST /appointment-types` existente. (Alternativa mais robusta, mas fora do escopo mínimo: mover esse seed para dentro de `TenantsService.create()`/`BillingService.registerClinic()`, garantindo defaults mesmo se o usuário abandonar o wizard cedo — vale decidir com o time, ver seção 10.)
- Nenhuma rota nova é estritamente necessária para os steps 4-6 — `availability/config/business-hours/batch`, `POST /appointment-types`, `POST /users` e `POST availability/config/veterinarian-schedules` já existem e cobrem tudo.
- **Decisão de produto → implementação**: se optarem por permitir "retomar o wizard depois", adicionar campo `onboarding_completed_at` (ou similar) em `tenants`, setado ao final do step 7. Sem isso, não dá pra distinguir no backend um tenant "recém-criado, configuração pendente" de um tenant maduro.

## 9. Mudanças necessárias no frontend

- Construir componente de wizard/stepper reutilizável (progresso + navegação entre steps + validação por step via `react-hook-form`), provavelmente sobre `DashboardCreateFormDialog` + `Progress`.
- Trocar texto/destino dos 3 CTAs da landing page para abrir o modal (e corrigir os 2 que hoje vão pro `/login`).
- Implementar a rotina de login automático + gravação de `localStorage`/cookie logo após o step 2, reaproveitando a lógica hoje inline em `login/page.tsx:140-147` (extrair para uma função compartilhada, ex. `lib/session.ts`, usada por login e pelo wizard).
- Steps 4-6 podem reaproveitar componentes/hook de mutation já existentes em `settings/hours`, `settings/appointment-types` e `settings/team`, adaptando para o contexto de modal (sem sidebar).
- Decidir e implementar o comportamento de fechar/abandonar o modal no meio (ver seção 10).

---

## 10. Decisões de produto em aberto (precisam de resposta antes de implementar)

1. **O modal sobrevive a um refresh de página?** Se o usuário fechar a aba no meio do step 4, ele perde o progresso visual mas o tenant/admin já existem no banco (criados no step 2). Ele precisa logar manualmente e vai cair direto no `/dashboard` com tudo pela metade, sem ser levado de volta ao wizard — a menos que se implemente a flag de "onboarding incompleto" (seção 8) e uma lógica de retomada automática no primeiro login.
2. **Quais etapas são realmente obrigatórias?** Proposta na seção 7 marca só clínica+admin como obrigatórios; horários e tipos de atendimento como "fortemente recomendados mas puláveis". Confirmar se faz sentido deixar pular algo que deixa a agenda vazia, ou se deve ser bloqueante.
3. **O `/register` atual (página cheia) deixa de existir, ou continua como fallback** (ex: para quem chega por link direto/compartilhado, sem passar pela landing)? Se mantido, os dois fluxos (`/register` e o modal) vão divergir com o tempo — vale decidir se um redireciona pro outro.
4. **Convite por e-mail para outros veterinários, ou continua sendo o admin que digita a senha de cada um?** Hoje (`team/page.tsx`) é sempre o admin que define a senha na hora de cadastrar — não há fluxo de convite com link de ativação. Se o wizard for adicionar "equipe" como etapa, vale confirmar se mantém esse padrão ou se é a oportunidade de introduzir convite por e-mail (mudança bem maior, tocaria `UsersService`/e-mail transacional).
5. **Falha de provisionamento (OCI bucket) no meio do wizard** — aceitar o comportamento atual (tenant é desfeito, usuário tenta de novo do zero) ou tratar como "continuar sem storage, corrigir depois"? Impacta a etapa 1-2 do wizard diretamente.

---

## 11. Plano de execução sugerido (fases)

1. **Fundação**: função compartilhada de sessão (`lib/session.ts`), endpoint `/billing/register` retornando token, componente de stepper genérico.
2. **Steps obrigatórios**: portar conteúdo do `/register` atual (steps 1-3) para dentro do modal com login automático ao final — já entrega valor sozinho (resolve a UX de "cai no login sem estar logado").
3. **Steps de configuração operacional**: horários (step 4) e tipos de atendimento (step 5), reaproveitando componentes de Settings.
4. **Equipe** (step 6) e tela de resumo/conclusão (step 7).
5. **Landing page**: trocar os 3 CTAs, corrigir os que apontam pro `/login`.
6. **(Opcional, decisão pendente)**: flag `onboarding_completed_at` + lógica de retomada.

Cada fase é entregável e testável isoladamente; sugiro tratar como PRs separados nesta ordem.
