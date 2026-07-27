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

**Mas nenhum dos 3 fluxos acima envia `consultation_id`** — e o controller
sequer aceita esse campo no corpo da requisição hoje (`body` do `@Post()` não
lista `consultation_id` em `medical-records.controller.ts:99-125`). Ou seja,
pra linkar, precisa de uma pequena mudança no backend também, não só no front.

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

### 3.1 Onde o conflito é checado hoje (e só hoje, na criação de `Consultation`)

Duas checagens, **as duas em nível de aplicação (código), nenhuma é constraint
de banco**:

1. **Conflito de veterinário** — só roda se `veterinarian_id` foi passado
   explicitamente na criação (`consultations.service.ts:96-106`):
   ```ts
   const slotOk = await this.availabilityService.isSlotAvailable(tenantId, veterinarianId, startTime);
   if (!slotOk) throw new BadRequestException('O horário selecionado não está mais disponível...');
   ```
   Se `veterinarian_id` não é passado, quem escolhe o vet é o
   `vetAssignmentService.assignVet(...)` (linha 89), que presumivelmente já
   escolhe alguém livre.

2. **Conflito de recurso (sala/equipamento)** — só roda se
   `required_resources` (lista de tipos, ex. `["sala-1", "ultrassom"]`) **não
   estiver vazia** (`consultations.service.ts:108-122`):
   ```ts
   const requiredResources = createConsultationDto.required_resources ?? [];
   if (requiredResources.length > 0) {
     const canAlloc = await this.resourceSchedulingService.canAllocateResources(...);
     if (!canAlloc) throw new BadRequestException('Recursos solicitados não estão disponíveis...');
   }
   ```

Fui conferir `resource-scheduling.service.ts` inteiro (`findAvailableResources`,
`canAllocateResources`) — é uma checagem por `SELECT ... WHERE` (linhas 56-79),
não uma constraint de banco. Também procurei nas migrations por qualquer
`EXCLUDE`/constraint de intervalo (`tstzrange`, `btree_gist`) — **não existe
nenhuma**. O tratamento de erro `23P01`/`23505` no catch de
`consultations.service.ts:186-196` é defensivo (preparado pra um constraint
que, pelo que encontrei, não está de fato criado no banco hoje).

### 3.2 Por que isso importa pro nosso caso

`MedicalRecord.create()` (o que de fato roda quando alguém clica "Nova ficha"
ou "Iniciar atendimento" hoje) **nunca passa pelo `Consultation.create()`**.
São tabelas e serviços totalmente desacoplados — criar uma ficha não aciona
`isSlotAvailable` nem `canAllocateResources`, em nenhum dos 3 fluxos atuais.

**Isso significa que unificar o "Iniciar atendimento" não obriga a mexer em
nada da lógica de conflito existente**, porque essa lógica só existe dentro de
`ConsultationsService.create()`, e a ficha de atendimento não precisa passar
por ali pra ser criada — só precisa, opcionalmente, apontar pra uma consulta
que já existe (e que já foi validada no momento em que foi agendada).

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
- Precisa de uma mudança pequena e pontual no backend: aceitar `consultation_id`
  no `POST /medical-records` e persistir (hoje o `body` do controller nem
  lista esse campo — `medical-records.controller.ts:99-125`).
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
  agora`, veterinário = quem está atendendo), só que chamando o `create()`
  **sem** passar por `isSlotAvailable`/`canAllocateResources` (são só chamadas
  de função dentro do método — dá pra ter um caminho alternativo, tipo
  `logWalkInConsultation()`, que pula essas duas checagens de propósito,
  já que um encaixe descreve o que **já aconteceu**, não uma reserva de
  horário futuro). Isso deixaria o calendário do veterinário mostrar
  "ocupado" durante o encaixe — útil pra clínicas maiores não tentarem marcar
  outro paciente pro mesmo vet no mesmo horário sem saber que ele estava
  atendendo um encaixe.

Não decidi isso por vocês — é uma escolha de produto. Mas tecnicamente, **ambas
as opções são seguras** frente à lógica de conflito existente, porque essa
lógica só protege reservas *futuras*, e um encaixe logado é sempre relativo ao
passado/presente.

---

## 6. Resumo — por que a unificação continua fazendo sentido

1. **Não existe conflito técnico real**: `MedicalRecord` e `Consultation` já
   são desacoplados hoje. Linkar um ao outro (Caminho A) é só preencher um
   campo que já existe no modelo; não linkar (Caminho B) é o que já acontece.
2. **A checagem de conflito de horário/recursos é 100% opt-in e por função**,
   não por constraint de banco — ela só roda dentro de `ConsultationsService.create()`,
   que o fluxo de ficha nunca precisa chamar.
3. **O risco de dados obrigatórios já está resolvido** em `/patients` — falta
   só parar de reimplementar essa regra (com bug) em `medical-records/page.tsx`.
4. **O ganho real**: hoje a Agenda e o Atendimento são dois mundos sem ponte
   nenhuma, mesmo o banco já estando pronto pra conectar os dois
   (`consultation_id`). Isso é a lacuna que realmente vale fechar.

## Próximos passos sugeridos (não implementado ainda — só o relatório foi pedido)

1. Decidir o trade-off da seção 5 (encaixe aparece na Agenda ou não).
2. Backend: aceitar e persistir `consultation_id` em `POST /medical-records`.
3. Frontend: botão "Iniciar atendimento" no detalhe da consulta agendada
   (Agenda), Caminho A.
4. Frontend: unificar o cadastro de paciente embutido em
   `medical-records/page.tsx` pra reaproveitar o componente/lógica de
   `/patients` (corrige o bug do "sempre Emergência").
5. Se decidido na seção 5: implementar `logWalkInConsultation()` no backend
   para o registro retroativo de encaixes na Agenda.
