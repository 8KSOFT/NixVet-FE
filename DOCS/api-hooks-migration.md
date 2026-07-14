# Migração para apiHooks (react-query) — status e guia de continuação

> Migração 100% concluída. Para saber **qual hook mexer** ao pedir um CRUD numa página específica, use `DOCS/api-hooks-reference.md` (mapa por página e por hook, com endpoints). Este arquivo aqui documenta o processo/convenções/histórico da migração.

## Objetivo

Centralizar todas as chamadas `api.get/post/put/patch/delete` (hoje soltas em `page.tsx` por toda a aplicação) em hooks de requisição organizados por contexto/recurso, usando `@tanstack/react-query`, dentro de `src/hooks/apiHooks/`.

Motivação do usuário: parar de duplicar lógica de fetch/loading/error em cada página, ganhar cache/invalidação automática, e ter um único lugar por recurso para consultar/alterar os endpoints.

## Convenções estabelecidas (seguir nas próximas rotas)

- **Um arquivo de hook por recurso/contexto** em `src/hooks/apiHooks/useX.ts`, não por página. Ex.: `useProducts.ts` cobre catálogo *e* vendas de produtos porque são o mesmo recurso de backend.
- **Um arquivo de tipos por domínio** em `src/app/types/x.ts` (`Product`, `Tutor`, `Budget`, `MedicalRecord`, etc.), substituindo interfaces locais duplicadas nas páginas.
- **Query keys em objeto `xKeys`** no topo do hook (`all`, `lists()`, `list(params)`, `detail(id)`, etc.), padrão hierárquico do react-query.
- **Mutations sempre invalidam `xKeys.all`** (ou a chave mais específica quando fizer sentido) em `onSuccess`.
- **Listas "flat" vs "paginadas"**: quando a página pagina de verdade (tabela com `ListPagination`), o hook usa `parseListResponse` e devolve `{items,total,page,totalPages}`. Quando é só para popular um `<Select>`, existe uma variante `useXListQuery()` que usa `fetchAllListPages` (todas as páginas, sem paginação visível).
- **Downloads de PDF/blob**: mutation que retorna o `Blob` puro; o componente decide como salvar/abrir (não fazer o download dentro do hook).
- **Buscas "on demand" (typeahead)**: usar `useMutation` (ex.: `useBularioSearchMutation`, `usePaymentOptionsMutation`) em vez de `useQuery`, porque são disparadas imperativamente, não são "dado de tela" persistente.
- **Buscas com paginação reativa** (ex.: página de busca do Bulário): usar `useQuery` com `enabled` condicional, e deblocalizar o debounce no componente via `useEffect`+`setTimeout` alimentando um estado `activeQuery`.
- **Reuso entre páginas**: sempre que uma página precisa de dados de outro domínio (ex.: `orcamentos` precisa de pacientes/veterinários/produtos), importar o hook já existente daquele domínio em vez de duplicar o fetch. Já aconteceu várias vezes (patients, tutors, veterinarians, products reaproveitados em calendar, exams, prescriptions, medical-records, followups, internações, etc.).
- **Hooks "mínimos" propositalmente incompletos**: quando uma página só precisa de *leitura* de um recurso que será migrado por completo depois (ex.: `useHealthPlansListQuery`, `useTutorsListQuery` antes do CRUD completo de Tutores), criar só a query de leitura com um comentário indicando que o CRUD completo entra quando aquele contexto for migrado. Depois, ao migrar o contexto "dono", estender o mesmo arquivo (não criar um segundo).
- **Payloads com pequenas divergências entre páginas** (ex.: `TutorPayload.address` vs formulário rápido que manda `street`/`number` soltos): preferir afrouxar o tipo (campos opcionais) a criar dois hooks separados para o mesmo endpoint.
- **Sincronizar formulário local a partir de dado do react-query**: quando a página tem um form editável (ex.: ficha médica, internação), buscar via `useXQuery(id)` e usar um `useEffect([data])` para popular o `useState` do formulário — não tentar usar o objeto do cache diretamente como estado do form.

## Validação obrigatória por contexto

Para cada contexto migrado, sempre rodar (nesta ordem):
1. `npx tsc --noEmit`
2. `yarn lint`
3. Subir `yarn dev` em background, `curl` nas rotas afetadas (esperar 200 e checar o log por erros de compilação), depois **matar o processo**.

### Gotcha do Windows: `TaskStop` não mata o `next-server` filho

Neste ambiente (Windows), `TaskStop` no processo do `yarn dev` **não mata** o processo `node.exe` do `next-server` que ele gerou — ele fica órfão ocupando a porta. Isso acumulou vários processos zumbis ao longo da sessão (detectados via `Get-NetTCPConnection -LocalPort 3000 -State Listen` e mortos com `Stop-Process -Force`). **Sempre**, depois de `TaskStop`, rodar:

```powershell
Start-Sleep -Seconds 1
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }
```

## Contextos já migrados (concluídos e validados)

| Contexto | Hooks (`src/hooks/apiHooks/`) | Tipos (`src/app/types/`) | Páginas |
|---|---|---|---|
| Produtos | `useProducts.ts` | `product.ts` | `financeiro/produtos`, select em `financeiro/orcamentos` |
| Pacientes | `usePatients.ts` | `patient.ts` (existente) | `patients`, `patients/[id]` |
| Tutores | `useTutors.ts` | `tutor.ts` | `owners` |
| Users/Team | `useUsers.ts` | `team-user.ts` (existente) | `team` |
| Budgets/Orçamentos | `useBudgets.ts` | `budget.ts` | `financeiro/orcamentos` |
| Financeiro (relatórios) | `useFinancialReports.ts`, `useHealthPlans.ts` | `financial-report.ts`, `health-plan.ts` | `financeiro`, `financeiro/lancamentos`, `financeiro/custos-pagamento`, `financeiro/receita` |
| Calendar/Consultas | `useConsultations.ts`, `useResources.ts`, `useAppointmentTypes.ts`, `useGoogleIntegration.ts`, `useAi.ts` | `consultation.ts`, `resource.ts`, `appointment-type.ts`, `google-integration.ts` | `calendar` |
| Tarefas clínicas | `useClinicalTasks.ts` | `clinical-task.ts` | `tasks` |
| Vacinas (lembretes) | `useVaccineReminders.ts` | `vaccine-reminder.ts` | `vaccines` |
| Prescrições | `usePrescriptions.ts`, `useBulario.ts`, `useSurgicalProcedures.ts` | `prescription.ts`, `bulario.ts`, `surgical-procedure.ts` | `prescriptions` |
| Exames | `useExamRequests.ts`, `useExamCatalog.ts` | `exam-request.ts` (existente) | `exams` |
| Prontuário/Fichas médicas | `useMedicalRecords.ts`, `usePatientFiles.ts` | `medical-record.ts`, `patient-file.ts` | `medical-records`, `medical-records/[id]`, `medical-records/prontuario/[patientId]` |
| Internações | `useHospitalizations.ts` (+ reaproveita `useMedicalRecords.ts`) | `hospitalization.ts` (existente, expandido) | `internacoes`, `internacoes/[id]` (7 abas: resumo, ocorrências, relatório médico, SBAR, visitas, medicações, custos) |
| Bulário (consulta) | `useBulario.ts` (expandido com `useBularioSearchQuery`) | `bulario.ts` | `bulario` |
| Acompanhamento de exames | `useExamFollowups.ts` | `exam-followup.ts` (existente) | `followups` |

Também corrigido nessa leva: bug do menu lateral (`financeiro-produtos` faltava em `MENU_BY_ROLE` em `src/lib/role-permissions.ts`).

### Bloco Settings (concluído e validado — tsc + lint + dev server em todas as sub-rotas)

| Sub-rota | Hooks | Tipos | Observação |
|---|---|---|---|
| `appointment-types` | `useAppointmentTypes.ts` (estendido) | `appointment-type.ts` | CRUD completo adicionado ao hook que já existia (leitura usada no calendar) |
| `resources` | `useResources.ts` (estendido) | `resource.ts` | idem — só tinha `useResourcesListQuery` |
| `planos-saude` | `useHealthPlans.ts` (estendido) | `health-plan.ts` | idem — só tinha `useHealthPlansListQuery` |
| `exams` | `useExamCatalog.ts` (estendido) | `exam-request.ts` (`Exam`, `ExamPayload`), `health-plan.ts` (`CatalogPlanPrice`) | inclui sub-CRUD de preços por convênio (`/catalog/exams/:id/plan-prices`) |
| `surgical-procedures` | `useSurgicalProcedures.ts` (estendido) | `surgical-procedure.ts`, `health-plan.ts` (`CatalogPlanPrice`) | mesmo padrão de plan-prices que exams |
| `diseases` | `useDiseases.ts` | `disease.ts` | catálogo simples com categoria |
| `materials` | `useMaterials.ts` | `material.ts` | catálogo simples |
| `reminders` | `useReminderSettings.ts` | `reminder-settings.ts` | recurso singleton (efetivo + defaults do sistema + reset) |
| `chatbot` | `useChatbotSettings.ts` | `chatbot-settings.ts` | recurso singleton (persona/mensagens do bot) |
| `ai-costs` | `useAi.ts` (estendido com `useAiUsageQuery`) | `ai-usage.ts` | |
| `hours` | `useAvailabilityConfig.ts` | `availability.ts` | 3 sub-recursos (business hours, emergency hours, vet schedules) na mesma página/hook; reaproveita `useVeterinariansQuery` de `useUsers.ts` |
| `holidays` | `useHolidays.ts` | `holiday.ts` | inclui fluxo de sugestão por IA (`ai-suggest` + `batch`) |
| `whatsapp-numbers` | `useWhatsappNumbers.ts`, `useTenantSettings.ts` | `whatsapp-number.ts`, `tenant.ts` | status/QR code tratados como mutations sob demanda (chamadas em polling via `setInterval` no componente, não `refetchInterval`) |
| `pagamentos` | `useFinancialReports.ts` (estendido) | `financial-report.ts` (`PaymentSetting`) | |
| `billing` (+ `billing/upgrade`) | `useBilling.ts` | `billing.ts` | hook compartilhado entre as duas páginas |
| `automations` | `useWorkflowConfigs.ts` | `workflow-config.ts` | só create/delete (sem update) |
| `clinic-terms` | `useClinicTermTemplates.ts` | `clinic-term-template.ts` | padrão de upload via PAR/presigned URL (igual ao de `usePatientFiles.ts`): pedir URL → `fetch` PUT direto no OCI (fica no componente) → persistir metadados |
| `page.tsx` (raiz) | `useTenantSettings.ts`, `useGoogleIntegration.ts` (estendido com calendars/connect/disconnect/settings/force-sync) | `tenant.ts`, `google-integration.ts` | reconciliado com o hook que já existia (estava duplicado) |

Também corrigido: `settings/whatsapp-numbers`, `settings/page.tsx` (raiz) e `chatbot-workflows` duplicavam a leitura/escrita de `/tenants/me` (toggle de chatbot) — os três agora usam `useTenantSettings.ts`.

### Superadmin (concluído e validado)

| Contexto | Hooks | Tipos | Observação |
|---|---|---|---|
| Clínicas (superadmin) | `useSuperadminTenants.ts` | `tenant.ts` (`SuperadminTenantRow`, `SuperadminTenantDetail`, payloads) | um hook só para list + detail + patch genérico + reset-senha + provisionar WhatsApp, usado por `superadmin/clinics` e `superadmin/clinics/[id]` |
| Financeiro da plataforma | `useSuperadminFinance.ts` | `superadmin-finance.ts` | dashboard (KPIs) + lista de tenants filtrada, duas queries independentes |

### Chatbot Workflows + WhatsApp (concluído e validado)

| Contexto | Hooks | Tipos | Observação |
|---|---|---|---|
| Chatbot Workflows (lista + editor) | `useChatbotWorkflows.ts` | `chatbot-workflow.ts` (existente) | reaproveita `useTenantSettings.ts` para o toggle do bot em vez de duplicar `/tenants/me` |
| WhatsApp (inbox de conversas) | `useWhatsappConversations.ts` | `whatsapp-conversation.ts` | contexto mais complexo da migração: 5 queries com `refetchInterval: 5000` + `refetchIntervalInBackground: false` (substituiu o `setInterval`+`visibilitychange` manual — react-query já pausa o polling com a aba oculta) e ~9 mutations |

### Dashboard / Profile / Termos / Notificações (concluído e validado)

| Contexto | Hooks | Tipos | Observação |
|---|---|---|---|
| Dashboard | `useDashboardMetrics.ts` (novo) + reaproveita `useConsultationsQuery` (`useConsultations.ts`) e `usePatientsListQuery` (`usePatients.ts`) | `dashboard-metrics.ts` | antes fazia fetch ad-hoc de `/consultations` e `/patients` com `fetchAllListPages`; agora reusa os hooks já existentes (precisou adicionar `createdAt?` em `PatientRow`) |
| Profile | `useUsers.ts` (estendido com `useProfileQuery`/`useUpdateProfileMutation`) | `team-user.ts` (`ProfilePayload`, reaproveitando `TeamUserRow`) | reconciliado com o hook de Team em vez de criar `useProfile.ts` separado |
| Termos (termos clínicos assinados por paciente) | `useClinicalTerms.ts` | `clinical-term.ts` | nome do tipo (`ClinicalTerm`) deliberadamente diferente de `ClinicTermTemplate` (settings/clinic-terms) para não colidir — são recursos distintos |
| Notificações (sino no layout) | `useNotifications.ts` | `notification.ts` | contador com `refetchInterval: 60000` + `refetchIntervalInBackground: true` (mantém o polling mesmo com a aba em segundo plano, igual ao comportamento original); lista só busca com o sheet aberto (`enabled`) |

## Migração concluída

Todos os contextos foram migrados. Confirmado via:

```
grep -rlE "api\.(get|post|put|patch|delete)\(" src/app --include="*.tsx" --include="*.ts" | grep -v "/apiHooks/"
```

— retorna vazio (nenhum `api.*` solto fora de `src/hooks/apiHooks/`).

**Validação final completa executada:** `npx tsc --noEmit` (limpo), `yarn lint` (limpo), e `yarn dev` com `curl` em todas as ~52 rotas da aplicação (não só as do último lote) — todas compilaram e responderam 200, sem erros no log do dev server.
