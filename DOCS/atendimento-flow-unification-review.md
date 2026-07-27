# Revisão do relatório "Unificação do fluxo Iniciar Atendimento"

**Objetivo:** validar as afirmações técnicas do relatório
`atendimento-flow-unification-analysis.md` contra o código real (backend +
frontend) e o banco de **produção**, antes de implementar. Cada ponto abaixo foi
verificado — não é opinião.

---

## TL;DR

A **direção proposta (unificar "Iniciar atendimento", com Caminho A linkando
`consultation_id` e Caminho B só `patient_id`) faz sentido e é aproveitável.**
A leitura do desacoplamento `MedicalRecord` × `Consultation` está correta.

Porém o relatório contém **3 afirmações factualmente erradas** sobre o backend.
Uma delas (a inexistência de constraint no banco) **muda a análise de risco da
Seção 5** e precisa ser corrigida antes de implementar encaixe-na-Agenda.

---

## 1. O que o relatório acertou

- Os 3 pontos que criam `MedicalRecord` caem todos em `POST /medical-records`,
  onde só `patient_id` é obrigatório (o resto tem default). ✔
- O botão "Prontuário" no detalhe da consulta (Agenda) leva a uma **lista
  filtrada**, não cria nem linka nada. ✔
- **Bug real confirmado:** o form de paciente embutido em
  `medical-records/page.tsx:134` faz `no_tutor_reason: hasTutor ? null :
  'EMERGENCIA'` — **força Emergência**, não oferece Abandono. Já em
  `patients/page.tsx:553-554` as duas razões existem. É uma divergência real
  entre as telas. ✔
- Risco #1 (dados obrigatórios do responsável) já resolvido em
  `create-patient.dto` (`no_tutor_reason` ∈ `EMERGENCIA|ABANDONO`). ✔
- Conclusão de que **unificar é seguro** porque a ficha não passa por
  `ConsultationsService.create()`. ✔

---

## 2. O que o relatório errou (verificado no código e no banco)

### 2.1 "Precisa mudar o backend para aceitar/persistir `consultation_id`" → **já está feito**

O relatório afirma (Seção 1.1 e "próximo passo #2") que o controller "sequer
aceita esse campo no corpo" e que "pra linkar, precisa de uma pequena mudança no
backend".

**Realidade** (`medical-records.controller.ts`, método `create`):
- O `body` **lista `consultation_id?: string;`**.
- O `create()` **persiste**: `consultation_id: body.consultation_id ?? null`.

➡️ **O Caminho A já é suportado pelo backend hoje.** Não há mudança de backend a
fazer — é só o frontend passar `consultation_id` no POST. O "passo 2" da lista de
próximos passos pode ser removido.

### 2.2 "Não existe constraint de intervalo (tstzrange/btree_gist)" → **existe, e está ativo em produção**

O relatório afirma (Seção 3.1) que as checagens de conflito são "100% em nível de
aplicação, nenhuma é constraint de banco" e que o catch de `23P01`/`23505` é
"defensivo, preparado pra um constraint que… não está de fato criado no banco".

**Realidade** — migration `20260319000001-temporal-consultations-and-resources.js`:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE consultations
  ADD CONSTRAINT consultations_vet_temporal_excl
  EXCLUDE USING gist (veterinarian_id WITH =, tstzrange(start_time, end_time) WITH &&);

ALTER TABLE resource_reservations
  ADD CONSTRAINT resource_reservations_temporal_excl
  EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time) WITH &&);
```

Confirmado no banco de **produção** (`pg_constraint`):
```
consultations_vet_temporal_excl
resource_reservations_temporal_excl
```

➡️ **Há proteção contra sobreposição no nível do banco.** O catch de `23P01`
trata um constraint **real**, não hipotético.

### 2.3 Consequência: a Seção 5 (encaixe na Agenda) está furada

Isso **não invalida a unificação** — os Caminhos A e B **não criam** uma
`Consultation`, então não tocam o constraint. Mas invalida a proposta da Seção 5
de que um encaixe possa virar uma `Consultation` via um
`logWalkInConsultation()` que **"pula as duas checagens de propósito, são só
chamadas de função dentro do método"**.

`isSlotAvailable`/`canAllocateResources` até são funções puláveis, **mas o
`EXCLUDE` é enforced no Postgres — código de aplicação não bypassa constraint de
banco.** Um encaixe com `start_time = agora` para um veterinário que já tem
consulta sobreposta seria **rejeitado com `23P01`** — e "agora" costuma cair
dentro de algum horário agendado. Ou seja: registrar o encaixe como
`Consultation` **não é trivial** e exige decidir o que fazer no conflito real.

---

## 3. Próximos passos corrigidos

1. **Unificar "Iniciar atendimento"** (Caminhos A e B) — mantido.
2. ~~Backend: aceitar e persistir `consultation_id`~~ → **já existe**, remover da
   lista. Frontend só precisa enviar `consultation_id` no `POST /medical-records`
   quando vier da Agenda.
3. **Frontend:** botão "Iniciar atendimento" no detalhe da consulta agendada,
   mandando `consultation_id` (Caminho A). ✔ viável hoje.
4. **Frontend:** unificar o cadastro de paciente embutido de
   `medical-records/page.tsx` reusando o componente/lógica de `/patients`
   (corrige o "sempre Emergência"). ✔
5. **Seção 5 (encaixe na Agenda) — decisão de produto, com a correção técnica:**
   - **Opção simples e segura (recomendada p/ agora):** encaixe = **só ficha**
     (`consultation_id` null), **sem criar `Consultation`**. Zero risco de
     constraint.
   - **Opção "encaixe aparece na Agenda":** aí **precisa** criar `Consultation` e
     **tratar o `23P01`** (o encaixe pode legitimamente conflitar com um
     agendamento do mesmo vet). Não é "pular as checagens" — é lidar com a
     rejeição do banco (avisar o operador, ajustar horário, ou permitir
     explicitamente sobreposição só nesse caso via mecanismo próprio).

---

## 4. Recado ao dev

Boa análise de arquitetura — o desacoplamento e a proposta de UI estão certos.
Só **confirme os fatos no código/banco antes de listar "mudanças de backend" que
já existem** (o `consultation_id` já é aceito e persistido) **e antes de assumir
que dá pra driblar por código um constraint que está ativo em produção** (o
`EXCLUDE` temporal). Ferramentas usadas na verificação: leitura de
`medical-records.controller.ts`, `create-patient.dto.ts`,
`consultations.service.ts`, a migration `20260319000001`, e `psql` no
`nixvetapp_db` de produção (`pg_constraint`).
