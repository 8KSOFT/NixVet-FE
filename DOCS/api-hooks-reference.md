# Referência de apiHooks — mapa completo

Mapa de todos os hooks em `src/hooks/apiHooks/` (42 arquivos): o que cada função faz, qual endpoint chama, qual tipo usa e em quais páginas já é consumido. Serve para localizar rapidamente onde mexer quando for pedido um CRUD ou ajuste numa página, sem precisar reabrir todos os arquivos.

Para as **convenções** de como esses hooks são escritos (query keys, invalidação, listas flat vs paginadas, etc.), ver `DOCS/api-hooks-migration.md`. Este arquivo é só o mapa "o que existe e onde".

> Mantenha este arquivo atualizado: ao criar um hook novo ou função nova num hook existente, adicione a linha correspondente aqui.

## Índice rápido por página

Rota → arquivos de hook que ela importa (ordem = aproximadamente a ordem de aparição na página).

| Rota | Hooks usados |
|---|---|
| `patients`, `patients/[id]` | `usePatients.ts`, `useTutors.ts` (select), `useCatalogSupport.ts` (espécie/sexo/raça) |
| `owners` | `useTutors.ts` |
| `calendar` | `useConsultations.ts`, `useAppointmentTypes.ts`, `useResources.ts`, `useGoogleIntegration.ts`, `useAi.ts`, `usePatients.ts`, `useTutors.ts`, `useUsers.ts` (veterinários) |
| `prescriptions` | `usePrescriptions.ts`, `useBulario.ts`, `useSurgicalProcedures.ts` (select), `usePatients.ts`, `useConsultations.ts` |
| `exams` | `useExamRequests.ts`, `useExamCatalog.ts`, `usePatients.ts`, `useConsultations.ts` |
| `followups` | `useExamFollowups.ts`, `useExamRequests.ts`, `usePatients.ts` |
| `vaccines` | `useVaccineReminders.ts`, `usePatients.ts` |
| `tasks` | `useClinicalTasks.ts`, `usePatients.ts` |
| `medical-records`, `medical-records/[id]`, `medical-records/prontuario/[patientId]` | `useMedicalRecords.ts`, `usePatientFiles.ts`, `usePrescriptions.ts` (resumo), `useHospitalizations.ts` (banner ativo), `useAi.ts`, `usePatients.ts`, `useTutors.ts`, `useUsers.ts` |
| `internacoes`, `internacoes/[id]` | `useHospitalizations.ts`, `useMedicalRecords.ts`, `usePatients.ts`, `useHealthPlans.ts`, `useUsers.ts` |
| `bulario` | `useBulario.ts` |
| `financeiro`, `financeiro/lancamentos`, `financeiro/custos-pagamento` | `useFinancialReports.ts` |
| `financeiro/receita` | `useFinancialReports.ts`, `useHealthPlans.ts` (select) |
| `financeiro/produtos` | `useProducts.ts` |
| `financeiro/orcamentos` | `useBudgets.ts`, `usePatients.ts`, `useUsers.ts` (veterinários), `useProducts.ts` (select) |
| `team` | `useUsers.ts` |
| `profile` | `useUsers.ts` (`useProfileQuery`/`useUpdateProfileMutation`) |
| `dashboard` | `useDashboardMetrics.ts`, `useConsultations.ts`, `usePatients.ts` |
| `termos` | `useClinicalTerms.ts`, `usePatients.ts` (select) |
| `whatsapp` | `useWhatsappConversations.ts` |
| `chatbot-workflows`, `chatbot-workflows/[id]` | `useChatbotWorkflows.ts`, `useTenantSettings.ts` (toggle do bot) |
| `billing/upgrade` | `useBilling.ts` |
| `superadmin/clinics`, `superadmin/clinics/[id]` | `useSuperadminTenants.ts` |
| `superadmin/finance` | `useSuperadminFinance.ts` |
| `settings` (raiz) | `useTenantSettings.ts`, `useGoogleIntegration.ts` |
| `settings/appointment-types` | `useAppointmentTypes.ts` |
| `settings/resources` | `useResources.ts` |
| `settings/planos-saude` | `useHealthPlans.ts` |
| `settings/exams` | `useExamCatalog.ts`, `useHealthPlans.ts` (plan-prices) |
| `settings/surgical-procedures` | `useSurgicalProcedures.ts`, `useHealthPlans.ts` (plan-prices) |
| `settings/diseases` | `useDiseases.ts` |
| `settings/materials` | `useMaterials.ts` |
| `settings/reminders` | `useReminderSettings.ts` |
| `settings/chatbot` | `useChatbotSettings.ts` |
| `settings/ai-costs` | `useAi.ts` |
| `settings/hours` | `useAvailabilityConfig.ts`, `useUsers.ts` (veterinários) |
| `settings/holidays` | `useHolidays.ts` |
| `settings/whatsapp-numbers` | `useWhatsappNumbers.ts`, `useTenantSettings.ts` (toggle do bot) |
| `settings/pagamentos` | `useFinancialReports.ts` |
| `settings/billing` | `useBilling.ts` |
| `settings/automations` | `useWorkflowConfigs.ts` |
| `settings/clinic-terms` | `useClinicTermTemplates.ts` |
| `layout.tsx` (sino) | `useNotifications.ts` |

---

## Referência por hook

Cada bloco: **arquivo** · **tipos** · **usado em** · tabela de funções (nome, tipo query/mutation, endpoint, o que faz).

### Pacientes & Tutores

#### `usePatients.ts`
Tipos: `patient.ts` (`PatientRow`, `PatientDetail`, `PatientTimelineEvent`) + `PatientPayload` (definido no próprio hook).
Usado em: `patients`, `patients/[id]` (CRUD completo) — `usePatientsListQuery` reaproveitado em `calendar`, `dashboard`, `exams`, `financeiro/orcamentos`, `followups`, `internacoes`, `medical-records`, `medical-records/prontuario/[patientId]`, `prescriptions`, `tasks`, `termos`, `vaccines`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `usePatientsQuery(page, tutorId?)` | query | `GET /patients` | Lista paginada, filtro opcional por tutor |
| `usePatientsListQuery(tutorId?)` | query | `GET /patients` (todas as páginas) | Lista flat p/ selects — a mais reaproveitada do projeto |
| `usePatientQuery(id)` | query | `GET /patients/:id` | Detalhe |
| `usePatientTimelineQuery(id)` | query | `GET /patients/:id/timeline` | Linha do tempo do paciente |
| `useCreatePatientMutation()` | mutation | `POST /patients` | Cria |
| `useUpdatePatientMutation()` | mutation | `PUT /patients/:id` | Atualiza |
| `useDeletePatientMutation()` | mutation | `DELETE /patients/:id` | Remove |

#### `useTutors.ts`
Tipos: `tutor.ts` (`Tutor`, `TutorPayload`).
Usado em: `owners` (CRUD completo) — `useTutorsListQuery` reaproveitado em `calendar`, `medical-records`, `patients`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useTutorsQuery(page)` | query | `GET /tutors` | Lista paginada |
| `useTutorsListQuery()` | query | `GET /tutors` (todas as páginas) | Lista flat p/ selects |
| `useCreateTutorMutation()` | mutation | `POST /tutors` | Cria |
| `useUpdateTutorMutation()` | mutation | `PUT /tutors/:id` | Atualiza |
| `useDeleteTutorMutation()` | mutation | `DELETE /tutors/:id` | Remove |

#### `useCatalogSupport.ts`
Tipos: `patient.ts` (`SupportOption`, `SupportOptionsEnvelope`, `SupportOptionsListEnvelope`).
Usado em: `patients` (dropdowns dinâmicos: espécie, sexo, raça).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useSupportOptionsQuery(discriminator)` | query | `GET /catalog/support?discriminator=` | Opções de página única (ex: sexo) |
| `usePagedSupportOptionsQuery(discriminator)` | query | `GET /catalog/support` (todas as páginas) | Opções grandes (ex: ~500 raças) |
| `useCreateSupportOptionMutation()` | mutation | `POST /catalog/support` | Cria opção nova (ex: nova raça digitada pelo usuário) |

---

### Agenda / Consultas / Recursos

#### `useConsultations.ts`
Tipos: `consultation.ts` (`Consultation`, `ConsultationPayload`, `AvailabilitySlot`).
Usado em: `calendar` (CRUD completo), `dashboard`, `exams`, `prescriptions` (reaproveitam `useConsultationsQuery`/`useConsultationQuery`).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useConsultationsQuery()` | query | `GET /consultations` (todas as páginas) | Lista flat — alimenta o calendário |
| `useConsultationQuery(id)` | query | `GET /consultations/:id` | Detalhe |
| `useAvailableSlotsQuery(date, vetId, typeId, enabled)` | query | `GET /consultations/available-slots` | Horários livres (modal de agendamento) |
| `useCreateConsultationMutation()` | mutation | `POST /consultations` | Cria |
| `useUpdateConsultationMutation()` | mutation | `PUT /consultations/:id` | Atualiza |
| `useRescheduleConsultationMutation()` | mutation | `PUT /consultations/:id/reschedule` | Reagenda (drag-and-drop no calendário) |

#### `useAppointmentTypes.ts`
Tipos: `appointment-type.ts` (`AppointmentType`, `AppointmentTypePayload`).
Usado em: `settings/appointment-types` (CRUD completo), `calendar` (select via `useAppointmentTypesQuery`).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useAppointmentTypesPagedQuery(page)` | query | `GET /appointment-types` | Lista paginada — Settings |
| `useCreateAppointmentTypeMutation()` | mutation | `POST /appointment-types` | Cria |
| `useUpdateAppointmentTypeMutation()` | mutation | `PUT /appointment-types/:id` | Atualiza |
| `useDeleteAppointmentTypeMutation()` | mutation | `DELETE /appointment-types/:id` | Remove |
| `useAppointmentTypesQuery()` | query | `GET /tenants/me/schedule-config` → fallback `GET /appointment-types` | Select do calendário; tenta config do tenant primeiro |

#### `useResources.ts`
Tipos: `resource.ts` (`Resource`, `ResourcePayload`).
Usado em: `calendar` (select), `settings/resources` (lista + criação — **sem update/delete implementados**).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useResourcesListQuery()` | query | `GET /resources` (todas as páginas) | Select no agendamento |
| `useResourcesPagedQuery(page)` | query | `GET /resources` | Lista paginada — Settings |
| `useCreateResourceMutation()` | mutation | `POST /resources` | Cria (não há update/delete de recursos na API ainda) |

#### `useGoogleIntegration.ts`
Tipos: `google-integration.ts` (`GoogleIntegrationStatus`, `GoogleCalendarOption`, `GoogleCalendarSettingsPayload`, `GoogleEvent`).
Usado em: `settings` (raiz), `calendar`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useGoogleStatusQuery()` | query | `GET /integrations/google/status` | Status da conexão |
| `useGoogleCalendarsQuery(enabled)` | query | `GET /integrations/google/calendars` | Lista de calendários da conta conectada |
| `useGoogleConnectMutation()` | mutation | `GET /integrations/google/connect` | Retorna URL do OAuth |
| `useGoogleDisconnectMutation()` | mutation | `POST /integrations/google/disconnect` | Desconecta |
| `useSaveGoogleCalendarSettingsMutation()` | mutation | `PUT /integrations/google/settings` | Salva calendarId/syncDirection |
| `useGoogleForceSyncMutation()` | mutation | `POST /integrations/google/force-sync` | Força sincronização manual |
| `useGoogleEventsQuery(from, to, enabled)` | query | `GET /integrations/google/events` | Eventos do Google no calendário |

---

### Prontuário / Prescrições / Exames / Vacinas / Bulário

#### `useMedicalRecords.ts`
Tipos: `medical-record.ts` (`MedicalRecord`, `MedicalRecordCreatePayload`, `MedicalRecordUpdatePayload`, `AddVaccinePayload`, resumos relacionados).
Usado em: `medical-records`, `medical-records/[id]`, `medical-records/prontuario/[patientId]`, `internacoes/[id]`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useMedicalRecordsQuery(page, patientId?)` | query | `GET /medical-records` | Lista paginada |
| `useMedicalRecordsByPatientQuery(patientId)` | query | `GET /medical-records?patient_id=` (flat) | Prontuário do animal |
| `useMedicalRecordQuery(id)` | query | `GET /medical-records/:id` | Detalhe |
| `useCreateMedicalRecordMutation()` | mutation | `POST /medical-records` | Cria |
| `useUpdateMedicalRecordMutation()` | mutation | `PUT /medical-records/:id` | Atualiza |
| `useAddVaccineToRecordMutation()` | mutation | `POST /medical-records/:id/vaccines` | Adiciona vacina aplicada na ficha |
| `useRecordPrescriptionsQuery(patientId)` | query | `GET /prescriptions?patient_id=` (flat) | Aba "Prescrições" da ficha |
| `useRecordExamRequestsQuery(patientId)` | query | `GET /exam-requests?patient_id=` (flat) | Aba "Exames" da ficha |
| `useRecordVaccineHistoryQuery(patientId)` | query | `GET /vaccines?patient_id=` (flat) | Aba "Vacinas" da ficha |

#### `usePatientFiles.ts`
Tipos: `patient-file.ts` (`PatientFile`, `CreatePatientFilePayload`, `PatientFileUploadUrlResponse`).
Usado em: `medical-records/[id]` (anexos).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `usePatientFilesQuery(patientId)` | query | `GET /patient-files?patient_id=` | Lista de anexos |
| `useRequestPatientFileUploadUrlMutation()` | mutation | `POST /patient-files/upload-url` | 1º passo do upload (URL assinada) |
| `useCreatePatientFileMutation()` | mutation | `POST /patient-files` | 2º passo: persiste metadados após o upload |
| `useDownloadPatientFileUrlMutation()` | mutation | `GET /patient-files/:id/download-url` | URL assinada para download |

Padrão de upload (igual em `useClinicTermTemplates.ts`): pedir URL assinada → `fetch` PUT direto no storage (fica no componente, não no hook) → persistir metadados.

#### `usePrescriptions.ts`
Tipos: `prescription.ts` (`Prescription`, `CreatePrescriptionPayload`).
Usado em: `prescriptions` (CRUD + PDF), `medical-records/[id]` (resumo via `useMedicalRecords.ts`).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `usePrescriptionsQuery(page)` | query | `GET /prescriptions` | Lista paginada |
| `useCreatePrescriptionMutation()` | mutation | `POST /prescriptions` | Cria |
| `useDownloadPrescriptionPdfMutation()` | mutation | `GET /prescriptions/:id/pdf` (blob) | Baixa/visualiza PDF |
| `useSendPrescriptionEmailMutation()` | mutation | `POST /prescriptions/:id/email` | Envia por e-mail |

#### `useBulario.ts`
Tipos: `bulario.ts` (`BularioItem`).
Usado em: `bulario` (consulta com paginação reativa), `prescriptions` (autocomplete).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useBularioSearchMutation()` | mutation | `GET /bulario?q=` | Busca on-demand (autocomplete ao digitar) |
| `useBularioSearchQuery(query, page)` | query | `GET /bulario?q=` | Busca paginada reativa, `enabled` só com 2+ chars |
| `useBularioItemQuery(id)` | query | `GET /bulario/:id` | Detalhe de um item |

#### `useSurgicalProcedures.ts`
Tipos: `surgical-procedure.ts` (`SurgicalProcedure`, `SurgicalProcedureCategory`, `SurgicalProcedurePayload`) + `health-plan.ts` (`CatalogPlanPrice`, `CatalogPlanPricePayload`).
Usado em: `prescriptions` (select), `settings/surgical-procedures` (CRUD completo + preços por convênio).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useSurgicalProceduresListQuery()` | query | `GET /catalog/surgical-procedures` (flat) | Select |
| `useSurgicalProceduresPagedQuery(page)` | query | `GET /catalog/surgical-procedures` | Lista paginada — Settings |
| `useSurgicalProcedureCategoriesQuery()` | query | `GET /catalog/surgical-procedure-categories` (flat) | Categorias p/ select do form |
| `useCreateSurgicalProcedureMutation()` | mutation | `POST /catalog/surgical-procedures` | Cria |
| `useUpdateSurgicalProcedureMutation()` | mutation | `PUT /catalog/surgical-procedures/:id` | Atualiza |
| `useDeleteSurgicalProcedureMutation()` | mutation | `DELETE /catalog/surgical-procedures/:id` | Remove |
| `useSurgicalProcedurePlanPricesQuery(id, enabled)` | query | `GET /catalog/surgical-procedures/:id/plan-prices` | Preços por convênio |
| `useSaveSurgicalProcedurePlanPriceMutation(id)` | mutation | `PUT /catalog/surgical-procedures/:id/plan-prices` | Salva/edita preço de um convênio |
| `useDeleteSurgicalProcedurePlanPriceMutation(id)` | mutation | `DELETE /catalog/surgical-procedures/:id/plan-prices/:healthPlanId` | Remove preço |

#### `useExamCatalog.ts`
Tipos: `exam-request.ts` (`Exam`, `ExamPayload`, `ExamOption`, `ExamAreaOption`) + `health-plan.ts` (`CatalogPlanPrice`, `CatalogPlanPricePayload`).
Usado em: `exams` (select rápido), `settings/exams` (CRUD completo + preços por convênio).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useExamCatalogQuery()` | query | `GET /catalog/exams` (flat) | Select |
| `useExamAreasQuery()` | query | `GET /catalog/exam-areas` (flat) | Áreas p/ select do form |
| `useCreateExamCatalogItemMutation()` | mutation | `POST /catalog/exams` | Criação rápida (nome + área), usada em `exams` |
| `useExamsPagedQuery(page)` | query | `GET /catalog/exams` | Lista paginada — Settings |
| `useCreateExamMutation()` | mutation | `POST /catalog/exams` | Cria (form completo) |
| `useUpdateExamMutation()` | mutation | `PUT /catalog/exams/:id` | Atualiza |
| `useDeleteExamMutation()` | mutation | `DELETE /catalog/exams/:id` | Remove |
| `useExamPlanPricesQuery(examId, enabled)` | query | `GET /catalog/exams/:id/plan-prices` | Preços por convênio |
| `useSaveExamPlanPriceMutation(examId)` | mutation | `PUT /catalog/exams/:id/plan-prices` | Salva/edita preço |
| `useDeleteExamPlanPriceMutation(examId)` | mutation | `DELETE /catalog/exams/:id/plan-prices/:healthPlanId` | Remove preço |

#### `useExamRequests.ts`
Tipos: `exam-request.ts` (`ExamRequest`, `CreateExamRequestPayload`).
Usado em: `exams` (CRUD + PDF/e-mail), `followups` (select).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useExamRequestsListQuery()` | query | `GET /exam-requests` (flat) | Select |
| `useExamRequestsQuery(page)` | query | `GET /exam-requests` | Lista paginada |
| `useCreateExamRequestMutation()` | mutation | `POST /exam-requests` | Cria |
| `useDownloadExamRequestPdfMutation()` | mutation | `GET /exam-requests/:id/pdf` (blob) | Baixa PDF |
| `useSendExamRequestEmailMutation()` | mutation | `POST /exam-requests/:id/email` | Envia por e-mail |

#### `useExamFollowups.ts`
Tipos: `exam-followup.ts` (`ExamFollowup`, `FollowupFormValues`).
Usado em: `followups`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useAwaitingFollowupsQuery(page)` | query | `GET /exam-followups/awaiting-followup` | Fila de acompanhamento pendente |
| `useFollowupsQuery(page)` | query | `GET /exam-followups` | Lista geral paginada |
| `useCreateFollowupMutation()` | mutation | `POST /exam-followups` | Cria |
| `useUpdateFollowupStatusMutation()` | mutation | `PUT /exam-followups/:id` | Atualiza status |
| `useMarkFollowupResultAvailableMutation()` | mutation | `PUT /exam-followups/:id/result-available` | Marca resultado disponível |

#### `useVaccineReminders.ts`
Tipos: `vaccine-reminder.ts` (`VaccineReminder`, `VaccineReminderPayload`).
Usado em: `vaccines`. **Sem update/delete implementados ainda.**

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useVaccineRemindersQuery(page)` | query | `GET /vaccine/reminders` | Lista paginada |
| `useDueVaccineRemindersQuery(page, days=30)` | query | `GET /vaccine/reminders/due` | Vencendo nos próximos N dias |
| `useCreateVaccineReminderMutation()` | mutation | `POST /vaccine/reminders` | Cria |

#### `useClinicalTasks.ts`
Tipos: `clinical-task.ts` (`ClinicalTask`, `ClinicalTaskPayload`).
Usado em: `tasks`. **Sem update genérico/delete — só criar e marcar concluída.**

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useClinicalTasksQuery(page)` | query | `GET /clinical-tasks` | Lista paginada |
| `useCreateClinicalTaskMutation()` | mutation | `POST /clinical-tasks` | Cria |
| `useMarkClinicalTaskDoneMutation()` | mutation | `PUT /clinical-tasks/:id/status` | Marca como concluída |

---

### Internações

#### `useHospitalizations.ts`
Tipos: `hospitalization.ts` (muitos: `Hospitalization`, `HospitalizationCreatePayload`, `DischargePayload`, custos/evoluções/medicações/SBAR/visitas).
Usado em: `internacoes` (lista), `internacoes/[id]` (7 abas), `medical-records/[id]` (banner de internação ativa).
Maior hook do projeto — organizado em sub-blocos por aba.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useActiveHospitalizationQuery(patientId)` | query | `GET /hospitalizations?patient_id=&status=active` | Internação ativa do paciente (banner) |
| `useActiveHospitalizationsListQuery()` | query | `GET /hospitalizations/active` | Lista de internações ativas |
| `useHospitalizationsQuery()` | query | `GET /hospitalizations` | Lista geral |
| `useHospitalizationQuery(id)` | query | `GET /hospitalizations/:id` | Detalhe (resumo) |
| `useCreateHospitalizationMutation()` | mutation | `POST /hospitalizations` | Internar paciente |
| `useDischargeHospitalizationMutation()` | mutation | `PATCH /hospitalizations/:id/discharge` | Dar alta |
| `useLinkMedicalRecordMutation()` | mutation | `PATCH /hospitalizations/:id` | Vincula ficha médica |
| **Custos** | | | |
| `useHospitalizationCostsQuery(id)` | query | `GET /hospitalizations/:id/costs` | Lista de custos |
| `useHospitalizationCostSummaryQuery(id)` | query | `GET /hospitalizations/:id/costs/summary` | Resumo/total |
| `useAddHospitalizationCostMutation()` | mutation | `POST /hospitalizations/:id/costs` | Adiciona custo |
| `useDeleteHospitalizationCostMutation()` | mutation | `DELETE /hospitalizations/:id/costs/:costId` | Remove custo |
| `useGenerateHospitalizationInvoiceMutation()` | mutation | `POST /hospitalizations/:id/costs/invoice` (blob) | Gera fatura em PDF |
| **Ocorrências (evoluções)** | | | |
| `useHospitalizationEvolutionsQuery(id)` | query | `GET /hospitalizations/:id/evolutions` | Lista de evoluções |
| `useCreateHospitalizationEvolutionMutation()` | mutation | `POST /hospitalizations/:id/evolutions` | Registra evolução |
| `useDownloadHospitalizationProntuarioPdfMutation()` | mutation | `GET /hospitalizations/:id/evolutions/prontuario/pdf` (blob) | PDF do prontuário |
| **Medicações** | | | |
| `useHospitalizationMedicationsQuery(id)` | query | `GET /hospitalizations/:id/medications` | Grade de medicações (Kardex) |
| `usePrescribeHospitalizationMedicationMutation()` | mutation | `POST /hospitalizations/:id/medications` | Prescreve medicação |
| `useConfirmMedicationAdministrationMutation()` | mutation | `PATCH /hospitalizations/:id/medications/administrations/:adminId/confirm` | Confirma administração de dose |
| `useDownloadHospitalizationKardexPdfMutation()` | mutation | `GET /hospitalizations/:id/medications/kardex/pdf` (blob) | PDF do Kardex |
| **Relatório SBAR** | | | |
| `useHospitalizationSbarReportsQuery(id)` | query | `GET /hospitalizations/:id/reports` | Lista de relatórios SBAR |
| `useCreateHospitalizationSbarReportMutation()` | mutation | `POST /hospitalizations/:id/reports` | Cria relatório |
| `useAiReviewSbarReportMutation()` | mutation | `POST /hospitalizations/:id/reports/:reportId/ai-review` | Revisão do relatório via IA |
| **Visitas** | | | |
| `useHospitalizationVisitsQuery(id)` | query | `GET /hospitalizations/:id/visits` | Lista de visitas registradas |
| `useCreateHospitalizationVisitMutation()` | mutation | `POST /hospitalizations/:id/visits` | Registra visita |

---

### Financeiro / Produtos / Orçamentos

#### `useFinancialReports.ts`
Tipos: `financial-report.ts` (`FinancialEntry`, `DRE`, `MonthlyDRE`, `RevenueAnalysis`, `PaymentSetting`, etc.).
Usado em: `financeiro`, `financeiro/lancamentos`, `financeiro/custos-pagamento`, `financeiro/receita`, `settings/pagamentos`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `usePaymentSettingsQuery()` | query | `GET /financial-reports/payment-settings` | Taxas/prazos por forma de pagamento — Settings |
| `useUpdatePaymentSettingMutation()` | mutation | `PATCH /financial-reports/payment-settings/:method` | Atualiza taxa/prazo |
| `useFinancialEntriesQuery(status)` | query | `GET /financial-reports/entries?status=` | Lançamentos (sugerido/confirmado/cancelado) |
| `usePaymentOptionsMutation()` | mutation | `GET /financial-reports/entries/payment-options?amount=` | Simula formas de pagamento p/ um valor |
| `useConfirmEntryMutation()` | mutation | `PATCH /financial-reports/entries/:id/confirm` | Confirma lançamento |
| `useCancelEntryMutation()` | mutation | `PATCH /financial-reports/entries/:id/cancel` | Cancela lançamento |
| `useDREQuery(period)` | query | `GET /financial-reports/dre?period=` | DRE de um mês (YYYY-MM) |
| `useMonthlyDREQuery()` | query | `GET /financial-reports/dre/monthly` | DRE dos últimos meses (gráfico) |
| `useExportDREMutation()` | mutation | `GET /financial-reports/dre/export` (blob) | Exporta DRE em PDF/Excel |
| `useCustosPagamentoQuery(period)` | query | `GET /financial-reports/custos-pagamento?period=` | Custos por forma de pagamento |
| `useRevenueAnalysisQuery(from, to, healthPlanId)` | query | `GET /financial-reports/revenue-analysis` | Receita líquida por período/convênio |

#### `useProducts.ts`
Tipos: `product.ts` (`Product`, `ProductPayload`, `ProductSale`, `ProductSalePayload`).
Usado em: `financeiro/produtos` (CRUD + vendas), `financeiro/orcamentos` (select).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useProductsQuery(includeInactive?)` | query | `GET /products` | Lista |
| `useProductQuery(id)` | query | `GET /products/:id` | Detalhe |
| `useCreateProductMutation()` | mutation | `POST /products` | Cria |
| `useUpdateProductMutation()` | mutation | `PATCH /products/:id` | Atualiza |
| `useDeleteProductMutation()` | mutation | `DELETE /products/:id` | Remove |
| `useProductSalesQuery()` | query | `GET /products/sales` | Lista de vendas |
| `useCreateProductSaleMutation()` | mutation | `POST /products/sales` | Registra venda |

#### `useBudgets.ts`
Tipos: `budget.ts` (`Budget`, `BudgetPayload`).
Usado em: `financeiro/orcamentos`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useBudgetsQuery()` | query | `GET /budgets` | Lista |
| `useCreateBudgetMutation()` | mutation | `POST /budgets` | Cria |
| `useApproveBudgetMutation()` | mutation | `PATCH /budgets/:id/approve` | Aprova orçamento |
| `useDownloadBudgetPdfMutation()` | mutation | `GET /budgets/:id/pdf` (blob) | Baixa PDF |

#### `useHealthPlans.ts`
Tipos: `health-plan.ts` (`HealthPlan`, `HealthPlanPayload`, `CatalogPlanPrice`, `CatalogPlanPricePayload`).
Usado em: `settings/planos-saude` (CRUD completo) — `useHealthPlansListQuery` reaproveitado em `financeiro/receita`, `internacoes`, `settings/exams` e `settings/surgical-procedures` (dropdown de preços por convênio).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useHealthPlansListQuery()` | query | `GET /health-plans?limit=200` (flat) | Select — a mais reaproveitada |
| `useHealthPlansQuery(includeInactive)` | query | `GET /health-plans?includeInactive=` | Lista com toggle de inativos — Settings |
| `useCreateHealthPlanMutation()` | mutation | `POST /health-plans` | Cria |
| `useUpdateHealthPlanMutation()` | mutation | `PATCH /health-plans/:id` | Atualiza |
| `useDeactivateHealthPlanMutation()` | mutation | `DELETE /health-plans/:id` | Desativa (soft-delete) |

---

### Configurações (Settings) — específicos

#### `useDiseases.ts`
Tipos: `disease.ts` (`Disease`, `DiseaseCategory`, `DiseasePayload`). Usado em: `settings/diseases`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useDiseaseCategoriesQuery()` | query | `GET /catalog/disease-categories` (flat) | Categorias p/ select |
| `useDiseasesPagedQuery(page)` | query | `GET /catalog/diseases` | Lista paginada |
| `useCreateDiseaseMutation()` | mutation | `POST /catalog/diseases` | Cria |
| `useUpdateDiseaseMutation()` | mutation | `PUT /catalog/diseases/:id` | Atualiza |
| `useDeleteDiseaseMutation()` | mutation | `DELETE /catalog/diseases/:id` | Remove |

#### `useMaterials.ts`
Tipos: `material.ts` (`Material`, `MaterialPayload`). Usado em: `settings/materials`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useMaterialsPagedQuery(page)` | query | `GET /catalog/materials` | Lista paginada |
| `useCreateMaterialMutation()` | mutation | `POST /catalog/materials` | Cria |
| `useUpdateMaterialMutation()` | mutation | `PUT /catalog/materials/:id` | Atualiza |
| `useDeleteMaterialMutation()` | mutation | `DELETE /catalog/materials/:id` | Remove |

#### `useReminderSettings.ts`
Tipos: `reminder-settings.ts` (`ReminderSettings`). Usado em: `settings/reminders`. Recurso singleton (não é lista).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useReminderSettingsQuery()` | query | `GET /settings/reminders` | Config efetiva da clínica |
| `useSystemReminderDefaultsQuery()` | query | `GET /settings/reminders/system` | Defaults do sistema (referência) |
| `useSaveReminderSettingsMutation()` | mutation | `PUT /settings/reminders` | Salva |
| `useResetReminderSettingsMutation()` | mutation | `DELETE` + `GET /settings/reminders` | Reseta para o padrão e recarrega |

#### `useChatbotSettings.ts`
Tipos: `chatbot-settings.ts` (`ChatbotSettings`). Usado em: `settings/chatbot`. Recurso singleton.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useChatbotSettingsQuery()` | query | `GET /chatbot-settings` | Persona/mensagens do bot |
| `useSaveChatbotSettingsMutation()` | mutation | `PUT /chatbot-settings` | Salva |

#### `useAvailabilityConfig.ts`
Tipos: `availability.ts` (`BusinessHour`, `EmergencyHour`, `VetSchedule` + payloads). Usado em: `settings/hours` (3 sub-recursos na mesma página).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useBusinessHoursQuery()` | query | `GET /availability/config/business-hours` | Horário de funcionamento |
| `useSaveBusinessHoursBatchMutation()` | mutation | `POST /availability/config/business-hours/batch` | Salva vários dias de uma vez |
| `useEmergencyHoursQuery()` | query | `GET /availability/config/emergency-hours` | Horário de plantão/emergência |
| `useCreateEmergencyHourMutation()` | mutation | `POST /availability/config/emergency-hours` | Cria (chamado em loop por dia selecionado) |
| `useVetSchedulesQuery()` | query | `GET /availability/config/veterinarian-schedules` | Agenda por veterinário |
| `useCreateVetScheduleMutation()` | mutation | `POST /availability/config/veterinarian-schedules` | Cria (idem, loop por dia) |
| `useDeleteVetScheduleMutation()` | mutation | `DELETE /availability/config/veterinarian-schedules/:id` | Remove |

#### `useHolidays.ts`
Tipos: `holiday.ts` (`Holiday`, `HolidayPayload`, `AiHolidaySuggestion` etc.). Usado em: `settings/holidays`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useHolidaysQuery(year)` | query | `GET /availability/config/holidays?year=` | Feriados do ano |
| `useCreateHolidayMutation(year)` | mutation | `POST /availability/config/holidays` | Cria manualmente |
| `useDeleteHolidayMutation(year)` | mutation | `DELETE /availability/config/holidays/:id` | Remove |
| `useAiSuggestHolidaysMutation()` | mutation | `POST /availability/config/holidays/ai-suggest` | IA sugere feriados por cidade/UF |
| `useSaveHolidaySuggestionsMutation(year)` | mutation | `POST /availability/config/holidays/batch` | Salva sugestões selecionadas em lote |

#### `useAi.ts`
Tipos: `ai-usage.ts` (`AiUsageResponse`). Usado em: `settings/ai-costs`, `calendar` e `medical-records/[id]` (mutations de IA para resumo/estruturação de texto).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useAiUsageQuery(from, to)` | query | `GET /ai/usage` | Consumo de tokens/custo no período |
| `useSummarizeMutation()` | mutation | `POST /ai/summarize` | Resume texto (ex: observações de consulta) |
| `useStructureObservationsMutation()` | mutation | `POST /ai/structure-observations` | Extrai sintomas/diagnóstico de texto livre |
| `useFormatTextMutation()` | mutation | `POST /ai/format-text` | Reformata texto conforme contexto |

#### `useWhatsappNumbers.ts`
Tipos: `whatsapp-number.ts` (`WhatsappNumberRow`, `WhatsappNumberStatus`, payloads). Usado em: `settings/whatsapp-numbers`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useWhatsappNumbersQuery(page)` | query | `GET /whatsapp/numbers` | Lista de instâncias Z-API |
| `useWhatsappProvisionAvailableQuery()` | query | `GET /whatsapp/provision/available` | Se provisionamento automático está disponível |
| `useWhatsappNumberStatusMutation()` | mutation | `GET /whatsapp/numbers/:id/status` | Status sob demanda (conectado/desconectado) |
| `useWhatsappQrCodeMutation()` | mutation | `GET /whatsapp/numbers/:id/qr-code` | QR Code sob demanda (polling manual a cada 20s no componente) |
| `useProvisionWhatsappMutation()` | mutation | `POST /whatsapp/provision` | Provisiona nova instância |
| `useRegisterWhatsappNumberMutation()` | mutation | `POST /whatsapp/numbers` | Cadastro manual de instância |
| `useDisconnectWhatsappNumberMutation()` | mutation | `DELETE /whatsapp/numbers/:id` | Desconecta/remove |

#### `useClinicTermTemplates.ts`
Tipos: `clinic-term-template.ts` (`ClinicTermTemplate`, payloads). Usado em: `settings/clinic-terms`.
⚠ Não confundir com `useClinicalTerms.ts` — este é o **template/modelo** do documento; o outro é o **termo assinado** por paciente.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useClinicTermTemplatesQuery()` | query | `GET /clinic-term-templates` | Lista de modelos cadastrados |
| `useRequestClinicTermUploadUrlMutation()` | mutation | `POST /clinic-term-templates/upload-url` | 1º passo do upload (URL assinada OCI) |
| `useCreateClinicTermTemplateMutation()` | mutation | `POST /clinic-term-templates` | 2º passo: persiste metadados |
| `useToggleClinicTermTemplateActiveMutation()` | mutation | `PUT /clinic-term-templates/:id` | Ativa/inativa modelo |
| `useClinicTermDownloadUrlMutation()` | mutation | `GET /clinic-term-templates/:id/download-url` | URL assinada p/ preview |
| `useDeleteClinicTermTemplateMutation()` | mutation | `DELETE /clinic-term-templates/:id` | Remove |

#### `useWorkflowConfigs.ts`
Tipos: `workflow-config.ts` (`WorkflowConfig`, `WorkflowConfigPayload`). Usado em: `settings/automations`. **Sem update (só create/delete).**

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useWorkflowConfigsPagedQuery(page)` | query | `GET /workflow-configs` | Regras de automação por evento |
| `useCreateWorkflowConfigMutation()` | mutation | `POST /workflow-configs` | Cria regra |
| `useDeleteWorkflowConfigMutation()` | mutation | `DELETE /workflow-configs/:id` | Remove regra |

#### `useTenantSettings.ts`
Tipos: `tenant.ts` (`TenantMe`, `TenantMePayload`, `CreateTenantPayload`).
Usado em: `settings` (raiz — perfil da clínica), `settings/whatsapp-numbers` e `chatbot-workflows` (toggle do chatbot). **Hook compartilhado** — sempre reaproveitar em vez de duplicar `/tenants/me`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useTenantMeQuery(enabled=true)` | query | `GET /tenants/me` | Perfil do tenant/clínica logada |
| `useUpdateTenantMeMutation()` | mutation | `PUT /tenants/me` | Atualiza (perfil completo OU só um campo, ex: toggle do bot) |
| `useCreateTenantMutation()` | mutation | `POST /tenants` | Cria clínica de teste (fluxo superadmin na tela de Settings) |

---

### Superadmin

#### `useSuperadminTenants.ts`
Tipos: `tenant.ts` (`SuperadminTenantRow`, `SuperadminTenantDetail`, `CreateSuperadminTenantPayload`, `PatchSuperadminTenantPayload`, `ResetAdminPasswordPayload`, `ProvisionSuperadminWhatsappPayload`).
Usado em: `superadmin/clinics` (lista), `superadmin/clinics/[id]` (detalhe).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useSuperadminTenantsQuery(page)` | query | `GET /superadmin/tenants` | Lista paginada de clínicas |
| `useSuperadminTenantQuery(id)` | query | `GET /superadmin/tenants/:id` | Detalhe |
| `useCreateSuperadminTenantMutation()` | mutation | `POST /superadmin/tenants` | Cria clínica (com admin inicial opcional) |
| `usePatchSuperadminTenantMutation()` | mutation | `PATCH /superadmin/tenants/:id` | **Genérico** — usado p/ status, plano, toggles de recursos, trial/isenção |
| `useResetSuperadminTenantAdminPasswordMutation()` | mutation | `POST /superadmin/tenants/:id/reset-admin-password` | Reset de senha do admin da clínica |
| `useProvisionSuperadminWhatsappMutation()` | mutation | `POST /whatsapp/provision` (com `tenantId`+`instanceName`) | Provisiona WhatsApp para uma clínica específica |

#### `useSuperadminFinance.ts`
Tipos: `superadmin-finance.ts` (`FinanceDashboardData`, `FinanceFilter`, `FinanceTenantRow`). Usado em: `superadmin/finance`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useSuperadminFinanceDashboardQuery(from, to)` | query | `GET /superadmin/finance/dashboard` | KPIs globais (MRR, custo IA, etc.) |
| `useSuperadminFinanceTenantsQuery(filter, from, to, page)` | query | `GET /superadmin/finance/tenants` | Lista de clínicas com filtro por status |

---

### WhatsApp / Chatbot

#### `useWhatsappConversations.ts`
Tipos: `whatsapp-conversation.ts` (`Conversation`, `ConversationMetrics`, `AlertConversation`, `WhatsappMessage`, `WhatsappConversationStats`).
Usado em: `whatsapp` (inbox). Contexto mais complexo do projeto: 5 queries com `refetchInterval: 5000` + `refetchIntervalInBackground: false` (polling pausa com aba oculta) e 9 mutations.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useWhatsappConversationsQuery(archived, classification)` | query (poll 5s) | `GET /whatsapp/conversations` | Lista de conversas (filtro arquivadas/classificação) |
| `useConversationMetricsQuery()` | query (poll 5s) | `GET /conversations/metrics` | Métricas (aguardando resposta, tempo médio) |
| `useConversationAlertsQuery(minutes)` | query (poll 5s) | `GET /conversations/alerts` | Conversas há +N min sem resposta |
| `useWhatsappConversationStatsQuery()` | query (poll 5s) | `GET /whatsapp/conversations/stats` | Estatísticas (encerradas hoje etc.) |
| `useWhatsappMessagesQuery(conversationId)` | query (poll 5s) | `GET /whatsapp/conversations/:id/messages` | Mensagens da conversa selecionada |
| `useSuggestRepliesMutation()` | mutation | `POST /ai/suggest-replies` | IA sugere respostas |
| `useSendWhatsappMessageMutation()` | mutation | `POST /whatsapp/send` | Envia mensagem |
| `useResumeAiMutation()` | mutation | `POST /whatsapp/conversations/:id/resume-ai` | Retoma bot |
| `usePauseAiMutation()` | mutation | `POST /whatsapp/conversations/:id/pause-ai` | Pausa bot (atendimento manual) |
| `useArchiveConversationMutation()` | mutation | `POST /whatsapp/conversations/:id/archive` | Arquiva |
| `useUnarchiveConversationMutation()` | mutation | `POST /whatsapp/conversations/:id/unarchive` | Desarquiva |
| `useCloseByPhoneMutation()` | mutation | `POST /whatsapp/conversations/close-by-phone` | Encerra pelo telefone (ação rápida dos alertas) |
| `useClassifyConversationMutation()` | mutation | `POST /whatsapp/conversations/:id/classify` | Classifica sem encerrar |
| `useCloseConversationMutation()` | mutation | `POST /whatsapp/conversations/:id/close` | Encerra com classificação + observação |

#### `useChatbotWorkflows.ts`
Tipos: `chatbot-workflow.ts` (`WorkflowItem`, `WorkflowData`, `BackendNode`, `BackendEdge`). Usado em: `chatbot-workflows` (lista), `chatbot-workflows/[id]` (editor visual React Flow).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useChatbotWorkflowsPagedQuery(page)` | query | `GET /chatbot-workflows` | Lista paginada |
| `useChatbotWorkflowQuery(id)` | query | `GET /chatbot-workflows/:id` | Detalhe (nodes/edges) p/ o editor |
| `useCreateChatbotWorkflowMutation()` | mutation | `POST /chatbot-workflows` | Cria workflow novo |
| `useSeedDefaultChatbotWorkflowMutation()` | mutation | `POST /chatbot-workflows/seed-default` | Cria workflow padrão pré-configurado |
| `useActivateChatbotWorkflowMutation()` | mutation | `PUT /chatbot-workflows/:id/activate` | Ativa (só um pode estar ativo) |
| `useDeleteChatbotWorkflowMutation()` | mutation | `DELETE /chatbot-workflows/:id` | Remove |
| `useSaveChatbotWorkflowMutation(id)` | mutation | `PUT /chatbot-workflows/:id` | Salva grafo completo (nodes/edges) do editor |

---

### Usuários / Perfil / Time

#### `useUsers.ts`
Tipos: `team-user.ts` (`TeamUserRow`, `ProfilePayload`) + `UserPayload` (definido no próprio hook).
Usado em: `team` (CRUD completo), `profile` (perfil próprio) — `useVeterinariansQuery` reaproveitado em `calendar`, `financeiro/orcamentos`, `internacoes`, `settings/hours`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useProfileQuery()` | query | `GET /users/profile` | Perfil do usuário logado |
| `useUpdateProfileMutation()` | mutation | `PUT /users/profile` | Atualiza próprio perfil (nome, e-mail, senha, CRMV) |
| `useStaffUsersQuery(page)` | query | `GET /users/staff` | Lista paginada da equipe — tela Time |
| `useVeterinariansQuery()` | query | `GET /users/veterinarians` (flat) | Select — a mais reaproveitada deste hook |
| `useStaffUsersListQuery()` | query | `GET /users/staff` (flat) | Fallback quando lista de vets vem vazia |
| `useCreateUserMutation()` | mutation | `POST /users` | Cria membro da equipe |
| `useUpdateUserMutation()` | mutation | `PUT /users/:id` | Atualiza |
| `useDeleteUserMutation()` | mutation | `DELETE /users/:id` | Remove |

---

### Billing

#### `useBilling.ts`
Tipos: `billing.ts` (`BillingStatus`, `Invoice`, `ActivateBillingPayload`, `CancelBillingResponse`).
Usado em: `settings/billing` (status/faturas/cancelamento), `billing/upgrade` (ativação de plano). Hook compartilhado entre as duas páginas.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useBillingStatusQuery()` | query | `GET /billing/status` | Status da assinatura |
| `useBillingInvoicesQuery()` | query | `GET /billing/invoices` | Histórico de faturas/NFS-e |
| `usePaymentLinkMutation()` | mutation | `GET /billing/payment-link` | Link de pagamento de cobrança pendente |
| `useCancelBillingMutation()` | mutation | `POST /billing/cancel` | Cancela assinatura |
| `useActivateBillingMutation()` | mutation | `POST /billing/activate` | Ativa plano escolhido (Asaas) |

---

### Termos clínicos

#### `useClinicalTerms.ts`
Tipos: `clinical-term.ts` (`ClinicalTerm`, `ClinicalTermPayload`). Usado em: `termos`.
⚠ Não confundir com `useClinicTermTemplates.ts` (modelo/template do documento).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useClinicalTermsQuery()` | query | `GET /clinical-terms` | Termos emitidos (saída sem alta, recusa de internação) |
| `useCreateClinicalTermMutation()` | mutation | `POST /clinical-terms` | Emite termo |
| `useClinicalTermPdfMutation()` | mutation | `GET /clinical-terms/:id/pdf` (blob) | Baixa PDF assinável |

---

### Dashboard / Notificações

#### `useDashboardMetrics.ts`
Tipos: `dashboard-metrics.ts` (`DashboardMetrics`). Usado em: `dashboard`.

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useDashboardMetricsQuery()` | query | `GET /metrics/dashboard` | KPIs agregados (consultas hoje, receita do mês, vacinas a vencer, etc.) |

Nota: `dashboard` também reaproveita `useConsultationsQuery` (`useConsultations.ts`) e `usePatientsListQuery` (`usePatients.ts`) para calcular "novos pacientes no mês" e "consultas canceladas no mês" no client.

#### `useNotifications.ts`
Tipos: `notification.ts` (`ClinicNotification`, `NotificationsPaged`). Usado em: `layout.tsx` (sino, todas as páginas).

| Função | Tipo | Endpoint | Descrição |
|---|---|---|---|
| `useUnreadNotificationsCountQuery()` | query (poll 60s, inclusive em bg) | `GET /notifications/unread-count` | Contador do sino |
| `useNotificationsListQuery(enabled)` | query | `GET /notifications` | Lista do painel — só busca com o sheet aberto |
| `useMarkNotificationReadMutation()` | mutation | `POST /notifications/:id/read` | Marca uma como lida |
| `useMarkAllNotificationsReadMutation()` | mutation | `POST /notifications/read-all` | Marca todas como lidas |

---

## Padrões a lembrar ao adicionar/estender um hook

Ver `DOCS/api-hooks-migration.md` para a lista completa de convenções. Os mais relevantes para decidir "em qual arquivo mexer":

1. **Um hook por recurso de backend**, não por página — se a página nova precisa de um recurso que já tem hook (patients, tutors, veterinarians, health-plans, products, consultations...), **reaproveite**, não crie um novo arquivo.
2. Se o CRUD pedido é para um recurso que só tem leitura hoje (ex: `useVaccineReminders.ts` sem update/delete, `useResources.ts` sem update/delete, `useWorkflowConfigs.ts` sem update, `useClinicalTasks.ts` sem update genérico), **estenda o arquivo existente** em vez de criar um novo.
3. Antes de criar um tipo novo em `src/app/types/`, verifique se o domínio já tem um arquivo (a tabela acima lista o tipo de cada hook).
