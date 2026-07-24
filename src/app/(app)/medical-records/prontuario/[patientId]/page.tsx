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
import type { PatientTimelineEvent } from "@/app/types/patient";
import dayjs from "dayjs";
import { usePatientQuery, usePatientTimelineQuery } from "@/hooks/apiHooks/usePatients";
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
  consultation: {
    label: "Consulta",
    dotClass: "bg-blue-100 text-primary",
    icon: <Clock className="w-3.5 h-3.5" />,
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

  const info = [
    { label: "Espécie", value: patient.species },
    { label: "Raça", value: patient.breed },
    { label: "Idade", value: `${patient.age} ano(s)` },
    { label: "Peso", value: `${patient.weight} kg` },
    { label: "Sexo", value: patient.sex },
    { label: "Tutor", value: patient.tutor?.name ?? "—" },
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

      {/* Cabeçalho do animal */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3 sm:items-start sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-14 sm:w-14">
            <PawPrint className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <h1 className="min-w-0 truncate text-lg font-extrabold font-['InterDoFigma'] text-slate-900 sm:text-xl">
            {patient.name}
          </h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {info.map((f) => (
            <Badge key={f.label} variant="secondary" className="font-normal text-muted-foreground">
              {f.label}: <span className="ml-1 text-slate-900">{f.value}</span>
            </Badge>
          ))}
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
                          <div className="flex-1 pb-4 pt-0.5">
                            <div className="text-sm font-medium text-slate-900">
                              {meta.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {dayjs(ev.date).format("DD/MM/YYYY HH:mm")}
                            </div>
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
