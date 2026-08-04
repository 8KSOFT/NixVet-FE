# Relatório: unificação do fluxo "Iniciar Atendimento" (agendado + encaixe/emergência)

## Contexto

Depois de corrigir o botão quebrado em `/patients?intent=start-atendimento` (ver
commit desta sessão em `src/app/(app)/patients/page.tsx`), surgiu a pergunta:
**"a única forma de criar uma consulta é pela Agenda?"** — não é. Investigando o
código, hoje existem **3 pontos diferentes** que criam uma ficha de atendimento
(`MedicalRecord`), cada um com sua própria lógica, e nenhum deles se conecta a
um agendamento da Agenda mesmo quando um já existe.

O usuário levantou duas preocupações de negócio antes de decidir unificar:

1. **Dados obrigatórios variam por caso**: emergência/abandono não podem exigir
   dados completos do responsável (às vezes não existe responsável).
2. **Vincular ao agendamento pode colidir com a lógica de conflito de horário/
   recursos** — especialmente em clínicas maiores com vários veterinários e
   salas/blocos controlados por recurso.

Este relatório mapeia o que existe hoje (com arquivo + linha), analisa os dois
riscos acima com base no código real (não suposição), e propõe um desenho que
unifica a experiência sem tocar na lógica de conflito existente.

---

## ⚠️ Correção (revisão do time de backend, 2026-07-27)

A primeira versão deste relatório tinha **2 erros factuais**, confirmados
depois de reler o código com mais cuidado (o backend apontou; eu conferi de
novo no repo antes de aceitar ou refutar). Motivo raiz dos dois: eu só tinha
pesquisado a pasta `migrations/` — existe uma **segunda pasta**,
`database/migrations/`, que não entrou na minha busca original.

1. **`consultation_id` já é aceito e persistido** — não é "próximo passo".
   `medical-records.controller.ts:123` (tipo do body) e `:149`
   (`consultation_id: body.consultation_id ?? null` no `.create()`). Veio do
   commit `44620b0` ("feat(v2)..."), bem anterior a este relatório. Eu simplesmente
   não cheguei a essas linhas na leitura original.
2. **Os constraints `EXCLUDE` temporais existem e estão ativos** —
   `database/migrations/20260319000001-temporal-consultations-and-resources.js:44-48`:
   ```sql
   ALTER TABLE consultations
   ADD CONSTRAINT consultations_vet_temporal_excl
   EXCLUDE USING gist (veterinarian_id WITH =, tstzrange(start_time, end_time) WITH &&)
   WHERE (start_time IS NOT NULL AND end_time IS NOT NULL);
   ```
   Mesmo veterinário não pode ter duas consultas com intervalo de horário
   sobreposto — **imposto pelo Postgres**, não só por código de aplicação. Tem
   um gêmeo pra recursos: `resource_reservations_temporal_excl` (mesma
   migration, linhas 82-86). O catch de `23P01` em `consultations.service.ts`
   que eu descrevi como "código defensivo pra um constraint que não existe" —
   **está tratando algo real**.

Isso invalida a Seção 5 original (a ideia de "pular as checagens" criando a
consulta direto): não dá pra pular, porque quem garante o conflito não é a
função `isSlotAvailable`, é o próprio banco. As seções 3, 4, 5 e 6 abaixo já
estão corrigidas para refletir isso — o que ficou riscado é só pra mostrar
onde eu errei, não pra esconder.

---

## 1. O que existe hoje

### 1.1 Três pontos que criam `MedicalRecord`

| Onde | Arquivo | O que pede | Para onde vai |
|---|---|---|---|
| Lista de prontuários, botão "Novo" | `src/app/(app)/medical-records/page.tsx:89-101` | Formulário completo: paciente (ou cria tutor+paciente na hora), veterinário, tipo, data, queixa | `/medical-records/prontuario/{patient_id}` |
| Prontuário do paciente, botão "Nova ficha" | `src/app/(app)/medical-records/prontuario/[patientId]/page.tsx:135-145` | Só `patient_id` (paciente já está aberto na tela) | `/medical-records/{record.id}` |
| Lista de pacientes, quando vem de "+ Novo → Nova Consulta/Atendimento" | `src/app/(app)/patients/page.tsx` (corrigido nesta sessão) | Só `patient_id` (escolhido na lista) | `/medical-records/{record.id}` |

Todos os três, no fim, chamam o mesmo endpoint: `POST /medical-records`
(`medical-records.controller.ts:99-138`). No backend, **só `patient_id` é
obrigatório** — os outros campos têm default:

```ts
// medical-records.controller.ts:126-133
const data = await this.model.create({
  tenant_id: req.tenant!.id,
  patient_id: body.patient_id,
  veterinarian_id: body.veterinarian_id ?? (req as any).user?.userId ?? null, // default: quem está logado
  record_type: body.record_type ?? 'atendimento',
  record_date: body.record_date ?? new Date().toISOString().split('T')[0],   // default: hoje
  ...
});
```

O modelo (`medical-record.model.ts:78-79`) já tem um campo pronto pra isso:

```ts
@Column({ type: DataType.UUID, allowNull: true })
declare consultation_id: string | null;
```

~~**Mas nenhum dos 3 fluxos acima envia `consultation_id`** — e o controller
sequer aceita esse campo no corpo da requisição hoje.~~ **Correção**: o
controller **já aceita e persiste** `consultation_id`
(`medical-records.controller.ts:123` e `:149`, desde o commit `44620b0`) — o
único motivo de nenhum dos 3 fluxos usar isso é que nenhum deles **passa** o
valor no payload, não que o backend precise de mudança. É um ajuste só de
frontend: mandar `consultation_id` quando ele existir.

### 1.2 O botão da Agenda que quase faz a ponte, mas não faz

No detalhe de uma consulta agendada (Agenda), existe um botão "Prontuário"
(`calendar/page.tsx:1593-1603`):

```tsx
onClick={() => router.push(`/medical-records?patient_id=${selectedConsultation!.patient!.id}`)}
```

Ele leva pra **lista filtrada** de prontuários daquele paciente — não cria
nada, não linka nada. O veterinário ainda precisaria clicar em "Novo" de novo
e preencher tudo manualmente, sem qualquer referência ao agendamento que
acabou de abrir.

---

## 2. Risco de negócio #1 — dados obrigatórios (responsável) vs emergência/abandono

**Boa notícia: isso já está resolvido no cadastro de paciente, só não é
reaproveitado nos 3 fluxos acima de forma consistente.**

`create-patient.dto.ts:17-18` já define exatamente essa regra:

```ts
@IsIn(['EMERGENCIA', 'ABANDONO'])
no_tutor_reason?: string | null;
```

E o formulário principal de paciente (`src/app/(app)/patients/page.tsx:447-498`)
já implementa a escolha certa: um rádio "Informar responsável" (pede CPF,
telefone, email, CEP — dados que a clínica precisa por obrigação legal/
financeira, NFS-e etc.) vs "Não informar" (pede só o motivo: Emergência ou
Abandono — sem exigir nenhum dado do responsável).

**O bug que encontrei**: o formulário de paciente **embutido dentro da tela de
prontuários** (`medical-records/page.tsx:119-142`, usado quando você clica
"Novo" ali e o paciente ainda não existe) reimplementa essa lógica de um jeito
mais simples e **erra**:

```ts
// medical-records/page.tsx:133-134
tutor_id: hasTutor ? patientForm.tutor_id : null,
no_tutor_reason: hasTutor ? null : 'EMERGENCIA', // sempre EMERGENCIA — não oferece ABANDONO
```

Ou seja: hoje, se você cria um paciente sem responsável a partir da tela de
prontuários, o sistema **força "Emergência"** mesmo que seja um caso de
abandono. É uma inconsistência real entre as duas telas, não uma limitação de
arquitetura — a regra de negócio certa já existe em um lugar, só não foi
reaproveitada no outro.

**Conclusão do risco #1**: não é um obstáculo pra unificação — é, na
verdade, um argumento A FAVOR dela. Unificar os pontos de criação de ficha
usando o MESMO componente/lógica de "criar paciente" (o que já existe em
`/patients`, com o rádio e as duas razões) resolve esse bug de quebra, em vez
de manter 2 implementações divergentes da mesma regra.

---

## 3. Risco de negócio #2 — conflito de horário/recursos ao linkar com agendamento

Esse era o risco mais sério em teoria, então fui direto no código de criação
de consulta (`consultations.service.ts:54-199`) pra entender exatamente onde
e como o sistema impede conflito hoje.

### 3.1 Onde o conflito é checado hoje

Duas checagens em nível de aplicação, **mais um constraint real no banco**:

1. **Conflito de veterinário (app-level, pré-checagem)** — só roda se
   `veterinarian_id` foi passado explicitamente na criação
   (`consultations.service.ts:96-106`):
   ```ts
   const slotOk = await this.availabilityService.isSlotAvailable(tenantId, veterinarianId, startTime);
   if (!slotOk) throw new BadRequestException('O horário selecionado não está mais disponível...');
   ```
   Se `veterinarian_id` não é passado, quem escolhe o vet é o
   `vetAssignmentService.assignVet(...)` (linha 89).

2. **Conflito de recurso (sala/equipamento, app-level, pré-checagem)** — só
   roda se `required_resources` **não estiver vazia**
   (`consultations.service.ts:108-122`), via `resourceSchedulingService.canAllocateResources(...)`.

3. **Constraint de banco (real, incondicional) — ⚠️ isto eu tinha errado.**
   `database/migrations/20260319000001-temporal-consultations-and-resources.js:44-48`
   cria, via SQL puro:
   ```sql
   ALTER TABLE consultations
   ADD CONSTRAINT consultations_vet_temporal_excl
   EXCLUDE USING gist (veterinarian_id WITH =, tstzrange(start_time, end_time) WITH &&)
   WHERE (start_time IS NOT NULL AND end_time IS NOT NULL);
   ```
   Isso **impede, no Postgres**, que o mesmo veterinário tenha duas linhas em
   `consultations` com intervalo de tempo sobreposto — não importa se as
   checagens de (1)/(2) rodaram ou não antes do insert. A mesma migration cria
   `resource_reservations_temporal_excl` (linhas 82-86), equivalente pra
   recursos. O catch de `23P01`/`23505` em `consultations.service.ts:186-196`
   — que eu descrevi antes como "código defensivo pra algo que não existe" —
   está, na verdade, traduzindo essa violação real de constraint pra um
   `ConflictException` amigável.

   **Eu tinha procurado isso na hora errada** — só olhei a pasta `migrations/`
   e não `database/migrations/`, onde essa migration realmente está.

### 3.2 Por que isso importa pro nosso caso

`MedicalRecord.create()` (o que de fato roda quando alguém clica "Nova ficha"
ou "Iniciar atendimento" hoje) **nunca passa pelo `Consultation.create()`**.
São tabelas e serviços desacoplados — criar uma ficha não aciona nenhuma das
três checagens acima, em nenhum dos 3 fluxos atuais.

**Isso continua significando que unificar o "Iniciar atendimento" não obriga
a mexer em nada da lógica de conflito existente** — pelo motivo certo,
diferente do que eu disse antes: não é porque a checagem é "opt-in e pulável",
é porque `MedicalRecord` e `Consultation` são tabelas diferentes e criar uma
ficha sozinha nunca insere uma linha em `consultations`. Onde eu errei foi em
propor, na Seção 5, que dava pra criar uma `Consultation` pulando as
checagens de propósito — isso **não é possível**: o constraint do banco roda
sempre, veja a correção na Seção 5.

---

## 4. Proposta: um conceito de UI, dois caminhos de dados

**Um único botão/ação "Iniciar atendimento"**, alcançável de mais de um lugar
(Agenda, lista de pacientes, prontuário), mas com dois caminhos internos —
sem nenhum deles tocar a lógica de conflito de agendamento:

### Caminho A — paciente com agendamento (veio pela Agenda)
Ao abrir uma consulta agendada e clicar "Iniciar atendimento":
- Cria o `MedicalRecord` com `patient_id` **e `consultation_id` = id da
  consulta já existente**.
- **Nenhuma checagem nova de conflito roda** — a consulta já foi validada
  quando foi agendada (isso já aconteceu no passado, em `ConsultationsService.create()`).
- ~~Precisa de uma mudança pequena e pontual no backend: aceitar
  `consultation_id`...~~ **Correção: não precisa.** O backend já aceita e
  persiste (`medical-records.controller.ts:123,149`) — é só o frontend passar
  o valor. Zero mudança de backend pra esse caminho.
- Opcional: ao concluir a ficha, chamar o `markComplete` que já existe em
  `consultations.service.ts:387-431` (já muda status pra `completed` e já
  sugere lançamento financeiro) — hoje isso só é acionado de algum outro lugar
  que não os 3 fluxos de ficha; vale conferir se já é chamado em algum ponto
  do fechamento de ficha, ou se precisa ser acionado also daqui.

### Caminho B — encaixe/emergência (sem agendamento prévio)
Ao clicar "Iniciar atendimento" a partir da lista de pacientes (ou de um
paciente novo cadastrado na hora):
- Cria o `MedicalRecord` com **só `patient_id`** — `consultation_id` fica
  `null`, exatamente como os 3 fluxos fazem hoje.
- **Nenhuma `Consultation` é criada.** Como o `Consultation.create()` nunca é
  chamado, `isSlotAvailable`/`canAllocateResources` simplesmente não entram em
  jogo — não há risco de um encaixe "brigar" com um horário já agendado pro
  mesmo veterinário, porque o encaixe nunca reserva um slot formalmente.
- Se o paciente ainda não existe: reaproveitar o **mesmo** componente de
  cadastro de paciente do `/patients` (rádio Informar/Não informar + motivo
  Emergência/Abandono) em vez da versão simplificada e com bug de
  `medical-records/page.tsx`.

Os dois caminhos convergem pro mesmo lugar: `/medical-records/{record.id}`
(o editor de ficha), então pra quem está atendendo o paciente a experiência
final é idêntica — só a origem/payload da criação muda.

---

## 5. Trade-off em aberto (decisão de produto, não técnica)

Uma pergunta que o código não responde sozinho: **um encaixe/emergência
deveria aparecer na Agenda depois, como um registro do que aconteceu?**

- **Se não** (mais simples, é o que já acontece hoje implicitamente): a Agenda
  continua mostrando só o que foi agendado; encaixes só existem como fichas em
  `/medical-records`. Zero risco, zero mudança na Agenda.
- **Se sim**: o encaixe também criaria uma `Consultation` (com `start_time =
  agora`, veterinário = quem está atendendo).
  ~~só que chamando o `create()` **sem** passar por
  `isSlotAvailable`/`canAllocateResources`... dá pra ter um caminho
  alternativo tipo `logWalkInConsultation()` que pula essas checagens de
  propósito~~
  **Correção: isso não funciona.** As checagens de `isSlotAvailable`/
  `canAllocateResources` são só um *pré-check* que dá um erro mais bonito
  *antes* de tentar o insert — mas quem realmente impede a sobreposição é o
  constraint `consultations_vet_temporal_excl` no Postgres (Seção 3.1), que
  roda **sempre**, em qualquer insert na tabela `consultations`, não importa
  se você chamou alguma função de checagem antes ou não. "Pular a checagem"
  só significa perder o erro bonito e antecipado — o insert vai falhar do
  mesmo jeito lá na hora H se o veterinário já estiver em outra consulta
  naquele intervalo exato.

  O caminho certo, se decidido que sim: criar a `Consultation` do encaixe
  **passando pelo `ConsultationsService.create()` normal** (que já faz o
  pré-check E já traduz a violação do constraint em `ConflictException` —
  `consultations.service.ts:183-198`), não por um atalho que ignora os dois.
  Se dois eventos genuinamente se sobrepõem pro mesmo veterinário (ex.: um
  encaixe às 14h45 enquanto ele já tem uma consulta agendada 14h30-15h), o
  sistema **vai** rejeitar — e isso é o comportamento correto (o veterinário
  não pode estar em dois atendimentos ao mesmo tempo), não um bug a evitar.
  Na prática, isso significa: se o produto quiser permitir encaixe mesmo
  "por cima" de um horário já ocupado do mesmo vet, o app precisa tratar esse
  erro na UI (e decidir o que fazer: negar, pedir outro vet, etc.) — não dá
  pra simplesmente contornar no código.

Não decidi isso por vocês — é uma escolha de produto. Mas agora, ao contrário
do que eu disse antes, **as duas opções não são igualmente simples**: "não
criar Consultation pro encaixe" (Caminho B, sem nenhuma linha nova em
`consultations`) continua zero-risco; "criar Consultation pro encaixe" precisa
lidar de verdade com a possibilidade de rejeição pelo constraint.

---

## 6. Resumo — por que a unificação continua fazendo sentido

1. **`MedicalRecord` e `Consultation` são tabelas desacopladas hoje** — criar
   uma ficha nunca insere linha em `consultations`, então nunca toca o
   constraint de banco. Linkar (Caminho A) é só o frontend passar
   `consultation_id`, que o backend já aceita; não linkar (Caminho B) é o que
   já acontece hoje.
2. **O conflito de horário É garantido pelo banco** (constraint `EXCLUDE`,
   não só função de aplicação) — isso é uma proteção real que continua
   intacta com ou sem a unificação, porque o fluxo de ficha nunca cria
   `Consultation`.
3. **O risco de dados obrigatórios já está resolvido** em `/patients` — falta
   só parar de reimplementar essa regra (com bug) em `medical-records/page.tsx`.
4. **O ganho real**: hoje a Agenda e o Atendimento são dois mundos sem ponte
   nenhuma, mesmo o banco já estando pronto pra conectar os dois
   (`consultation_id`, que já existe de ponta a ponta no backend). Isso é a
   lacuna que realmente vale fechar — e fechar ela é *só* trabalho de
   frontend no Caminho A.

## Status (2026-07-28): Caminho A implementado

Decisão final: **segurar a unificação mais ampla** (time de produto ainda
processando a ideia) e implementar só o essencial — Caminho A (linkar ficha
↔ agendamento) e duas ações que faltavam na Agenda. Encaixe continua exatamente
como já era: ficha solta, sem criar `Consultation` nenhuma (Caminho B, sem
mudança).

**O que foi implementado:**

- **Backend** (`consultations.service.ts`/`.controller.ts`/`.module.ts`):
  novo `PATCH /consultations/:id/no-show` → `ConsultationsService.markNoShow()`:
  libera recursos reservados, **cria uma `MedicalRecord` de não comparecimento**
  (`record_type: 'no_show'`, `consultation_id` preenchido, `status: 'closed'`)
  no prontuário do paciente — histórico legal, conforme pedido — e dispara o
  evento `CONSULTATION_NO_SHOW` (o handler de WhatsApp já existia, só nunca
  era emitido por ninguém). Idempotente. 4 testes unitários cobrindo o caso
  normal, idempotência, paciente sem tutor e paciente não encontrado.
- **Backend**: `PATCH /consultations/:id/cancel` já existia (não sabíamos),
  só nunca tinha hook/botão no frontend — resolvido no front, zero mudança
  de backend.
- **Frontend** (`calendar/page.tsx`, painel lateral da consulta): três botões
  novos — **"Iniciar atendimento"** (Caminho A: cria a ficha com
  `consultation_id` e `patient_id`, navega pro editor da ficha),
  **"Não compareceu"** (confirmação via `AlertDialog`, explica o que
  acontece antes de confirmar) e **"Cancelar"** (idem). Status `no_show`
  agora tem label/cor próprios (`Não Compareceu`, cinza) — antes só existia
  como valor de filtro no backend, sem representação na UI.
- **Frontend**: `MedicalRecordCreatePayload` ganhou `consultation_id?: string`;
  hooks novos `useCancelConsultationMutation`/`useMarkNoShowConsultationMutation`.
- Verificado ponta a ponta com Playwright (dev server + rotas mockadas): os
  três botões disparam a chamada certa com o payload certo; suíte completa do
  backend (131 testes) sem regressão.

**Deixado de fora por decisão explícita** (não é esquecimento):

- Trade-off da Seção 5 (encaixe aparecer na Agenda) — não decidido, não
  implementado. Encaixe continua sem criar `Consultation`.
- Unificar o cadastro de paciente embutido em `medical-records/page.tsx`
  (bug do "sempre Emergência") — não mexido nesta rodada.
