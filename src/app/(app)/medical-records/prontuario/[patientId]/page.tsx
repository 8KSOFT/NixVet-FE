"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";
import type { PatientTimelineEvent } from "@/app/types/patient";
import dayjs from "dayjs";
import { usePatientQuery, usePatientTimelineQuery } from "@/hooks/apiHooks/usePatients";
import { useCreateMedicalRecordMutation, useMedicalRecordsByPatientQuery } from "@/hooks/apiHooks/useMedicalRecords";

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

export default function ProntuarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = typeof params?.patientId === "string" ? params.patientId : "";

  const { data: patient, isLoading: loadingPatient } = usePatientQuery(patientId);
  const { data: records = [], isLoading: loadingRecords } = useMedicalRecordsByPatientQuery(patientId);
  const { data: events = [] } = usePatientTimelineQuery(patientId);
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

  const handleNovaFicha = async () => {
    if (!patientId) return;
    setCreating(true);
    try {
      const record = await createRecord.mutateAsync({ patient_id: patientId });
      toast.success("Ficha criada");
      router.push(`/medical-records/${record.id}`);
    } catch {
      toast.error("Erro ao criar ficha");
      setCreating(false);
    }
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Button asChild variant="ghost" className="pl-0">
          <Link href="/medical-records">
            <ChevronLeft className="w-4 h-4 mr-1" /> Prontuários
          </Link>
        </Button>
        <Button
          onClick={handleNovaFicha}
          disabled={creating}
          className="bg-primary hover:bg-primary/70"
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
      <div className="mb-6 flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PawPrint className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold font-['InterDoFigma'] text-slate-900">
            {patient.name}
          </h1>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {info.map((f) => (
              <div key={f.label} className="text-sm">
                <span className="text-muted-foreground">{f.label}: </span>
                <span className="text-slate-900">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                  className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-primary/50 hover:shadow-sm"
                >
                  <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                    {dayjs(r.record_date).format("DD/MM/YYYY")}
                  </span>
                  <Badge variant="outline">{recordTypeLabel(r.record_type)}</Badge>
                  <span className="truncate text-sm text-muted-foreground">
                    {r.chief_complaint || r.veterinarian?.name || "Sem queixa registrada"}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2">
                    {r.status === "closed" ? (
                      <Badge className="bg-green-500 text-white">Fechado</Badge>
                    ) : (
                      <Badge className="bg-primary text-white">Aberto</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
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
    </div>
  );
}
