"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  PawPrint,
  Clock,
  FlaskConical,
  ClipboardList,
  BookOpen,
  FileText,
  Syringe,
  CalendarClock,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import type { PatientTimelineEvent, TimelineMedicalRecordData } from "@/app/types/patient";
import dayjs from "dayjs";
import { usePatientQuery, usePatientTimelineQuery } from "@/hooks/apiHooks/usePatients";
import { ProfilePhoto } from "@/components/shared/profile-photo";
import {
  useCreateMedicalRecordMutation,
  useMedicalRecordsByPatientQuery,
  useRecordVaccineHistoryQuery,
} from "@/hooks/apiHooks/useMedicalRecords";
import { useFollowupsListQuery } from "@/hooks/apiHooks/useExamFollowups";

const typeConfig: Record<
  string,
  { label: string; dotClass: string; icon: React.ReactNode }
> = {
  medical_record: {
    label: "Ficha",
    dotClass: "bg-blue-100 text-primary",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  vaccine: {
    label: "Vacina",
    dotClass: "bg-green-100 text-green-600",
    icon: <FlaskConical className="w-3.5 h-3.5" />,
  },
  exam_request: {
    label: "Exame",
    dotClass: "bg-purple-100 text-purple-600",
    icon: <ClipboardList className="w-3.5 h-3.5" />,
  },
  prescription: {
    label: "Prescrição",
    dotClass: "bg-orange-100 text-orange-600",
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
};

const recordTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    atendimento: "Atendimento",
    retorno: "Retorno",
    emergencia: "Emergência",
    cirurgia: "Cirurgia",
    internacao: "Internação",
    no_show: "Não Compareceu",
  };
  return map[t] || t;
};

const FOLLOWUP_STATUS_LABELS: Record<string, string> = {
  pending_result: "Aguardando resultado",
  awaiting_followup: "Aguardando retorno",
  result_available: "Resultado disponível",
  closed: "Concluído",
};

const VALID_TABS = ["overview", "vaccines", "followups"] as const;
type ProntuarioTab = (typeof VALID_TABS)[number];

function ProntuarioDetailContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const patientId = typeof params?.patientId === "string" ? params.patientId : "";

  const requestedTab = searchParams?.get("tab") ?? "";
  const activeTab: ProntuarioTab = (VALID_TABS as readonly string[]).includes(requestedTab)
    ? (requestedTab as ProntuarioTab)
    : "overview";

  const { data: patient, isLoading: loadingPatient } = usePatientQuery(patientId);
  const { data: records = [], isLoading: loadingRecords } = useMedicalRecordsByPatientQuery(patientId);
  const { data: events = [] } = usePatientTimelineQuery(patientId);
  const { data: vaccineHistory = [] } = useRecordVaccineHistoryQuery(patientId);
  const { data: allFollowups = [] } = useFollowupsListQuery();
  const loading = loadingPatient || loadingRecords;
  const [creating, setCreating] = useState(false);
  const createRecord = useCreateMedicalRecordMutation();

  // Fichas mais recentes primeiro
  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) =>
        a.record_date < b.record_date ? 1 : a.record_date > b.record_date ? -1 : 0,
      ),
    [records],
  );

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [events],
  );

  // Sem filtro por paciente no backend hoje — filtra no cliente (mesmo padrão
  // já usado no Command Palette para pacientes/tutores).
  const patientFollowups = useMemo(
    () => allFollowups.filter((f) => f.patient_id === patientId),
    [allFollowups, patientId],
  );

  const sortedVaccineHistory = useMemo(
    () =>
      [...vaccineHistory].sort(
        (a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime(),
      ),
    [vaccineHistory],
  );

  const handleNovaFicha = async () => {
    if (!patientId) return;
    setCreating(true);
    try {
      const record = await createRecord.mutateAsync({ patient_id: patientId });
      router.push(`/medical-records/${record.id}`);
    } catch {
      toast.error("Erro ao criar ficha");
      setCreating(false);
    }
  };

  const handleTabChange = (value: string) => {
    const search = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "overview") {
      search.delete("tab");
    } else {
      search.set("tab", value);
    }
    const qs = search.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground/60" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.push("/medical-records")}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <p className="text-muted-foreground mt-4">Prontuário não encontrado.</p>
      </div>
    );
  }

  // Tutor vira a etiqueta adesiva do cabeçalho — o resto continua em badges.
  const info = [
    { label: "Espécie", value: patient.species },
    { label: "Raça", value: patient.breed },
    { label: "Idade", value: `${patient.age} ano(s)` },
    { label: "Peso", value: `${patient.weight} kg` },
    { label: "Sexo", value: patient.sex },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" className="self-start pl-0">
          <Link href="/medical-records">
            <ChevronLeft className="w-4 h-4 mr-1" /> Prontuários
          </Link>
        </Button>
        <Button
          onClick={handleNovaFicha}
          disabled={creating}
          className="w-full bg-primary hover:bg-primary/70 sm:w-auto"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Nova ficha
        </Button>
      </div>

      {/* Cabeçalho do animal — mesmo visual de dossiê da listagem de
          prontuários e de internações: nome na aba da pasta, foto em
          polaroide presa por um clipe, tutor em etiqueta adesiva. */}
      <div className="relative mb-6">
        {/* Aba da pasta */}
        <div className="absolute -top-3.5 left-2 flex h-4 w-fit max-w-[70%] items-center rounded-t-2xl border border-b-0 border-gray-400 bg-linear-to-b from-gray-100 from-45% to-gray-300 px-3">
          <h1 className="min-w-0 truncate text-xs font-bold text-foreground">{patient.name}</h1>
        </div>

        <div className="rounded-xl rounded-tl-none border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            {/* Tutor — etiqueta adesiva, largura fixa; nomes grandes truncam. */}
            <div className="w-40 min-w-0 rounded-[3px] border border-gray-200 bg-white px-2 pt-1.5 pb-1 shadow-sm">
              <p
                className="truncate border-b border-dashed border-gray-300 pb-0.5 text-[10px] font-medium text-muted-foreground"
                title={patient.tutor?.name ?? undefined}
              >
                {patient.tutor?.name ?? "Sem tutor"}
              </p>
            </div>

            {/* Foto do pet em polaroide, presa por um clipe (espiral atrás e
                na frente da foto) que agarra também a borda de cima da pasta. */}
            <div className="relative -mt-6 mb-1 inline-block shrink-0">
              <svg
                viewBox="0 0 24 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="absolute -top-3 -right-2 h-7 w-5 rotate-3 text-gray-400"
              >
                <rect x="7" y="7" width="8" height="16" rx="4" />
              </svg>

              <div className="-rotate-4 rounded-sm bg-white p-1.5 pb-3 shadow-lg ring-1 ring-black/20">
                {patient.photo_url ? (
                  <ProfilePhoto
                    url={patient.photo_url}
                    name={patient.name}
                    className="size-16 shrink-0 rounded-xs shadow-none ring-0 saturate-[.85] contrast-105 sepia-[0.08]"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary">
                    <PawPrint className="h-7 w-7" />
                  </div>
                )}
              </div>

              <svg
                viewBox="0 0 24 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="absolute -top-3 -right-2 h-7 w-5 rotate-3 text-gray-400 drop-shadow"
              >
                <rect x="3" y="3" width="14" height="27" rx="7" />
              </svg>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {info.map((f) => (
              <Badge key={f.label} variant="secondary" className="font-normal text-muted-foreground">
                {f.label}: <span className="ml-1 text-slate-900">{f.value}</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4 grid h-auto! w-full grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger
            value="overview"
            className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center"
          >
            <LayoutGrid className="w-4 h-4 mr-2 shrink-0 sm:mr-1" /> Visão geral
          </TabsTrigger>
          <TabsTrigger
            value="vaccines"
            className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center"
          >
            <Syringe className="w-4 h-4 mr-2 shrink-0 sm:mr-1" /> Vacinas
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center"
          >
            <CalendarClock className="w-4 h-4 mr-2 shrink-0 sm:mr-1" /> Acompanhamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Fichas (atendimentos) */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-slate-900">Fichas de atendimento</h2>
                <span className="text-xs text-muted-foreground">
                  {sortedRecords.length} no total
                </span>
              </div>

              {sortedRecords.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-muted-foreground">
                  Nenhuma ficha registrada. Clique em <strong>Nova ficha</strong> para começar.
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedRecords.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => router.push(`/medical-records/${r.id}`)}
                      className="group flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-primary/50 hover:shadow-sm sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                          {dayjs(r.record_date).format("DD/MM/YYYY")}
                        </span>
                        <Badge variant="outline">{recordTypeLabel(r.record_type)}</Badge>
                      </div>
                      <span className="truncate text-sm text-muted-foreground sm:flex-1">
                        {r.chief_complaint || r.veterinarian?.name || "Sem queixa registrada"}
                      </span>
                      <div className="flex shrink-0 items-center justify-between gap-2 sm:ml-auto sm:justify-end">
                        {r.status === "closed" ? (
                          <Badge className="bg-green-500 text-white">Fechado</Badge>
                        ) : (
                          <Badge className="bg-primary text-white">Aberto</Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Linha do tempo */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-slate-900">Linha do tempo</h2>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                {sortedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                ) : (
                  <div className="space-y-0">
                    {sortedEvents.map((ev, idx) => {
                      const meta = typeConfig[ev.type] ?? {
                        label: ev.type,
                        dotClass: "bg-muted text-muted-foreground",
                        icon: null,
                      };
                      // Ficha usa o rótulo do tipo de atendimento (Atendimento,
                      // Retorno...) em vez do rótulo genérico "Ficha", e não
                      // tem hora (record_date é só data) — mostrar "00:00"
                      // seria ruído.
                      const isRecordEvent = ev.type === "medical_record";
                      const label = isRecordEvent
                        ? recordTypeLabel((ev.data as TimelineMedicalRecordData).record_type ?? "")
                        : meta.label;
                      const dateFormat = isRecordEvent ? "DD/MM/YYYY" : "DD/MM/YYYY HH:mm";
                      const isFirst = idx === 0;
                      const isLast = idx === sortedEvents.length - 1;
                      return (
                        <div key={ev.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.dotClass}`}
                            >
                              {meta.icon}
                            </div>
                            {idx < sortedEvents.length - 1 && (
                              <div className="my-1 w-px flex-1 bg-slate-200" />
                            )}
                          </div>
                          <div className="flex flex-1 items-start justify-between gap-2 pb-4 pt-0.5">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dayjs(ev.date).format(dateFormat)}
                              </div>
                            </div>
                            {/* Marca o topo (mais recente) e o fim (início do
                                histórico) — a lista lê de cima pra baixo, do
                                mais novo pro mais antigo, e sem essas âncoras
                                isso não fica óbvio à primeira vista. */}
                            {isFirst && (
                              <span
                                className="mt-0.5 shrink-0 bg-primary py-1 pl-2.5 pr-4 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap text-primary-foreground"
                                style={{
                                  clipPath:
                                    "polygon(0% 50%, 10px 0%, 100% 0%, calc(100% - 10px) 50%, 100% 100%, 10px 100%)",
                                }}
                              >
                                Mais recente
                              </span>
                            )}
                            {isLast && !isFirst && (
                              <Badge variant="outline" className="mt-0.5 shrink-0 whitespace-nowrap text-muted-foreground">
                                Início
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vaccines">
          <div className="mb-3 flex items-center gap-2">
            <Syringe className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-900">Vacinas</h2>
            <span className="text-xs text-muted-foreground">
              {sortedVaccineHistory.length} no total
            </span>
          </div>
          {sortedVaccineHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-muted-foreground">
              Nenhuma vacina registrada para este paciente.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedVaccineHistory.map((v) => {
                const isUpcoming = v.next_due_date && dayjs(v.next_due_date).isAfter(dayjs());
                return (
                  <div
                    key={v.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="text-sm font-medium text-slate-900 sm:flex-1">{v.vaccine_name}</span>
                    <span className="text-xs text-muted-foreground">
                      Aplicada em {dayjs(v.application_date).format("DD/MM/YYYY")}
                    </span>
                    {v.next_due_date && (
                      <Badge variant={isUpcoming ? "default" : "secondary"} className={isUpcoming ? "bg-primary text-white" : undefined}>
                        Próxima dose: {dayjs(v.next_due_date).format("DD/MM/YYYY")}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followups">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-900">Acompanhamento</h2>
            <span className="text-xs text-muted-foreground">
              {patientFollowups.length} no total
            </span>
          </div>
          {patientFollowups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-muted-foreground">
              Nenhum acompanhamento registrado para este paciente.
            </div>
          ) : (
            <div className="space-y-2">
              {patientFollowups.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
                >
                  <span className="text-sm text-slate-900 sm:flex-1">
                    Retorno esperado:{" "}
                    {f.expected_result_date ? dayjs(f.expected_result_date).format("DD/MM/YYYY") : "—"}
                  </span>
                  <Badge variant="outline">
                    {FOLLOWUP_STATUS_LABELS[f.followup_status] ?? f.followup_status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/followups">Ver todos os acompanhamentos</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProntuarioDetailPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <ProntuarioDetailContent />
    </Suspense>
  );
}
