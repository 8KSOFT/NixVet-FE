"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  Check,
  User,
  Tag,
  Scale,
  Venus,
  Mars,
  CircleDot,
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

function sexIcon(sex: string | undefined) {
  const s = (sex ?? "").toLowerCase();
  if (s.includes("fêmea") || s.includes("femea") || s === "f") return Venus;
  if (s.includes("macho") || s === "m") return Mars;
  return CircleDot;
}

/** Pill de dado do banner de identidade — ícone + label pequeno + valor.
 * No mobile vira compacta (sem ícone, empilhada) pra caber no scroll
 * horizontal; no desktop mantém ícone + linha única. */
function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5 rounded-[10px] border border-white/22 bg-white/13 px-3 py-2 sm:flex-row sm:shrink sm:items-center sm:gap-2.25 sm:rounded-xl sm:px-3.5 sm:py-2.25">
      <Icon className="hidden size-4 shrink-0 opacity-90 sm:block" />
      <div className="min-w-0">
        <div className="text-[9.5px] font-semibold tracking-wide whitespace-nowrap text-white/70 uppercase sm:text-[11px]">
          {label}
        </div>
        <div className="truncate text-[12.5px] font-bold whitespace-nowrap sm:text-sm">{value}</div>
      </div>
    </div>
  );
}

/** Ângulo atual de rotação de um elemento, lido da matrix computada — assim
 * o clone ampliado nasce com o mesmo giro da polaroide na hora do clique,
 * sem precisar saber se é a versão mobile (rotate-5) ou desktop
 * (rotate-4) do card. */
function currentRotationDeg(el: HTMLElement): number {
  const transform = window.getComputedStyle(el).transform;
  if (!transform || transform === "none") return 0;
  const match = /^matrix\(([^,]+),\s*([^,]+),/.exec(transform);
  if (!match) return 0;
  return Math.atan2(Number(match[2]), Number(match[1])) * (180 / Math.PI);
}

function PetPolaroidPhoto({
  url,
  name,
  className,
}: {
  url?: string | null;
  name: string;
  className?: string;
}) {
  return url ? (
    <ProfilePhoto url={url} name={name} className={cn("shrink-0 rounded-xs object-cover shadow-none ring-0", className)} />
  ) : (
    <div
      className={cn("flex items-center justify-center rounded-xs", className)}
      style={{
        backgroundImage: "repeating-linear-gradient(45deg,#eef2f0,#eef2f0 6px,#e2e8e5 6px,#e2e8e5 12px)",
      }}
    >
      <PawPrint className="size-1/3 text-wa-ink-3" />
    </div>
  );
}

/** Foto do pet em Polaroide presa por um clipe de metal — mesma linguagem
 * visual que o dossiê da listagem/internações já usava, agora sobre o
 * banner. Menor no mobile, mesmo tratamento "clipada no topo" nos dois.
 * Clicável: a foto "sai" do clipe e cresce por cima da tela num clone
 * (portal), enquanto o clipe e o card original ficam parados no lugar. */
const JUICY_EASE = "ease-[cubic-bezier(0.34,1.56,0.64,1)]";

/** Quanto a foto cresce ao clicar. */
const ZOOM_SCALE = 2.75;

function PetPolaroid({ url, name }: { url?: string | null; name: string }) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number; w: number; h: number; deg: number; shiftX: number } | null>(
    null,
  );
  const [zoomedIn, setZoomedIn] = useState(false);

  const openZoom = () => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const deg = currentRotationDeg(el);
    const centerX = rect.left + rect.width / 2;

    // Sempre puxa um pouco pra esquerda (lado do menu lateral) e, se o
    // tamanho ampliado for estourar a borda direita da viewport, puxa mais
    // ainda — nunca centraliza na tela, só desgruda da borda.
    const scaledHalfWidth = (el.offsetWidth * ZOOM_SCALE) / 2;
    const viewportMargin = 24;
    const overflowRight = centerX + scaledHalfWidth - (window.innerWidth - viewportMargin);
    const shiftX = -(28 + Math.max(0, overflowRight));

    setOrigin({ x: centerX, y: rect.top + rect.height / 2, w: el.offsetWidth, h: el.offsetHeight, deg, shiftX });
  };

  // Duplo rAF: garante que o navegador "comita" o estado inicial (mesma
  // posição/ângulo de origem) antes de trocar pro estado ampliado — só um
  // rAF às vezes engana o browser e o zoom nasce instantâneo, sem transição.
  useEffect(() => {
    if (!origin) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setZoomedIn(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [origin]);

  const closeZoom = () => {
    setZoomedIn(false);
    window.setTimeout(() => setOrigin(null), 280);
  };

  useEffect(() => {
    if (!origin) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [origin]);

  return (
    <div className="group relative w-26 sm:w-44">
      <button
        type="button"
        ref={cardRef}
        onClick={openZoom}
        aria-label={`Ampliar foto de ${name}`}
        className={cn(
          "relative block w-full rotate-5 cursor-zoom-in rounded-[6px] bg-white p-1.5 pb-2.5 shadow-[0_12px_24px_-6px_rgba(0,0,0,0.35)] transition-transform duration-300 sm:rotate-4 sm:p-2.25 sm:pb-3.5 sm:shadow-[0_16px_34px_-8px_rgba(0,0,0,0.35)]",
          JUICY_EASE,
          "group-hover:-translate-y-1 group-hover:rotate-2 sm:group-hover:rotate-1",
          origin && "invisible",
        )}
      >
        <PetPolaroidPhoto url={url} name={name} className="h-21 w-full sm:h-35" />
      </button>

      {/* Clipe — depois do card no DOM de propósito, pra pintar por cima e
          realmente "prender" a foto (senão a ponta que devia ficar na
          frente some atrás do papel). Mexe um pouquinho no hover, como se
          estivesse prestes a soltar a foto. */}
      <svg
        viewBox="0 0 24 40"
        fill="none"
        stroke="#c7cdc9"
        strokeWidth="2.4"
        strokeLinecap="round"
        className={cn(
          "pointer-events-none absolute -top-3 left-[58%] h-9 w-5.5 -translate-x-1/2 -rotate-8 drop-shadow-[0_3px_4px_rgba(0,0,0,.35)] transition-transform duration-300 sm:-top-5 sm:h-14 sm:w-8.5",
          JUICY_EASE,
          "group-hover:-rotate-13",
        )}
      >
        <path d="M6 10a6 6 0 0 1 12 0v24a3 3 0 0 1-6 0V16" />
      </svg>

      {origin
        ? createPortal(
            <div
              className={cn(
                "fixed inset-0 z-100 cursor-zoom-out transition-colors duration-300",
                zoomedIn ? "bg-black/55" : "bg-black/0",
              )}
              onClick={closeZoom}
            >
              <div
                className="fixed rounded-[6px] bg-white p-1.5 pb-2.5 shadow-2xl transition-transform duration-300 ease-out sm:p-2.25 sm:pb-3.5"
                style={{
                  top: origin.y,
                  left: origin.x,
                  width: origin.w,
                  height: origin.h,
                  // translateX aplica depois do scale (fica à esquerda do
                  // scale na composição), então desloca em pixels "reais" da
                  // tela — não é ampliado junto com a foto.
                  transform: zoomedIn
                    ? `translate(-50%, -50%) translateX(${origin.shiftX}px) scale(${ZOOM_SCALE}) rotate(0deg)`
                    : `translate(-50%, -50%) scale(1) rotate(${origin.deg}deg)`,
                }}
              >
                <PetPolaroidPhoto url={url} name={name} className="h-21 w-full sm:h-35" />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

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

  const SexIcon = sexIcon(patient.sex);
  const statPills = [
    { label: "Espécie", value: patient.species, icon: PawPrint },
    { label: "Raça", value: patient.breed, icon: Tag },
    { label: "Idade", value: `${patient.age} ano(s)`, icon: Clock },
    { label: "Peso", value: `${patient.weight} kg`, icon: Scale },
    { label: "Sexo", value: patient.sex, icon: SexIcon },
  ];

  return (
    <div>
      <div className="mb-9 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="self-start pl-0">
          <Link href="/medical-records">
            <ChevronLeft className="w-4 h-4 mr-1" /> Prontuários
          </Link>
        </Button>
        {/* No mobile o botão vira FAB fixo (ver final do JSX) — aqui só
            aparece a partir do breakpoint desktop. */}
        <Button
          onClick={handleNovaFicha}
          disabled={creating}
          className="hidden bg-primary hover:bg-primary/70 sm:inline-flex"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Nova ficha
        </Button>
      </div>

      {/* Banner de identidade do paciente — verde da marca (mesmo tom usado
          no resto do app), avatar do pet, tag "Paciente ativo", dados em
          pills, e a foto Polaroide (elemento que já existia no dossiê
          antigo) presa por um clipe que agora fica no TOPO do banner, como
          se estivesse pendurada na borda superior do card. O wrapper externo
          não corta overflow de propósito, só o banner interno corta (pro
          clipe poder "vazar" pra cima sem cortar a textura/círculo decorativo). */}
      <div className="relative mb-6">
        <div className="relative overflow-hidden rounded-[20px] bg-linear-to-br from-wa-brand-700 via-wa-brand-600 to-[#0d9d68] px-4.5 pt-5 pb-5.5 text-white sm:rounded-[22px] sm:px-8 sm:py-5.5">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,.08) 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="pointer-events-none absolute -top-45 -right-30 size-95 rounded-full bg-white/6" />

          <div className="relative z-10 flex items-center gap-3.5 sm:items-start sm:gap-6">
            <div className="flex size-14.5 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/16 sm:size-19 sm:rounded-[20px]">
              <PawPrint className="size-7 sm:size-9.5" />
            </div>
            <div className="min-w-0 flex-1 pr-19 sm:pr-37">
              <div className="mb-1.5 inline-flex items-center gap-1.25 rounded-full border border-white/28 bg-white/16 px-2.5 py-0.75 text-[10.5px] font-bold tracking-wide sm:mb-2 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs">
                <Check className="size-2.75 sm:size-3" strokeWidth={3} />
                Paciente ativo
              </div>
              <h1 className="truncate text-[26px] leading-none font-extrabold tracking-[-0.02em] sm:text-4xl">
                {patient.name}
              </h1>
              <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-white/85 sm:mt-2 sm:gap-1.75 sm:text-[14.5px]">
                <User className="size-3.25 shrink-0 opacity-85 sm:size-3.75" />
                <span className="truncate">
                  <span className="hidden sm:inline">Responsável: </span>
                  <b className="font-bold text-white">{patient.tutor?.name ?? "Sem tutor"}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:mt-5 sm:flex-wrap sm:gap-2.5 sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            {statPills.map((p) => (
              <StatPill key={p.label} icon={p.icon} label={p.label} value={p.value} />
            ))}
          </div>
        </div>

        {/* Fora do banner (que corta overflow) — assim a polaroide pode ficar
            metade fora, metade dentro, "cortando" a borda de cima do verde,
            presa pelo clipe que nasce ainda mais acima dela. Mesmo
            tratamento no mobile, só que menor. */}
        <div className="absolute top-0.5 right-4.5 z-20 sm:top-0.5 sm:right-8">
          <PetPolaroid url={patient.photo_url} name={patient.name} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4 grid h-auto! w-full grid-cols-3 gap-1">
          <TabsTrigger
            value="overview"
            className="h-auto! w-full justify-center px-2 py-2.25 text-center leading-snug whitespace-normal sm:px-3"
          >
            <LayoutGrid className="mr-1 size-3.75 shrink-0 sm:size-4" />
            <span className="sm:hidden">Geral</span>
            <span className="hidden sm:inline">Visão geral</span>
          </TabsTrigger>
          <TabsTrigger
            value="vaccines"
            className="h-auto! w-full justify-center px-2 py-2.25 text-center leading-snug whitespace-normal sm:px-3"
          >
            <Syringe className="mr-1 size-3.75 shrink-0 sm:size-4" /> Vacinas
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            className="h-auto! w-full justify-center px-2 py-2.25 text-center leading-snug whitespace-normal sm:px-3"
          >
            <CalendarClock className="mr-1 size-3.75 shrink-0 sm:size-4" />
            <span className="sm:hidden">Acomp.</span>
            <span className="hidden sm:inline">Acompanhamento</span>
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
                      className="group flex w-full flex-col gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-primary/50 hover:shadow-sm sm:flex-row sm:items-center sm:gap-3"
                    >
                      {/* Mobile: data + status no topo do card (ficha empilhada). */}
                      <div className="flex items-center justify-between gap-2 sm:hidden">
                        <span className="text-xs text-slate-500">
                          {dayjs(r.record_date).format("DD/MM/YYYY")}
                        </span>
                        {r.status === "closed" ? (
                          <Badge className="bg-green-500 text-white">Fechado</Badge>
                        ) : (
                          <Badge className="bg-primary text-white">Aberto</Badge>
                        )}
                      </div>

                      {/* Desktop: data + tipo, linha única. */}
                      <div className="hidden items-center gap-2 sm:flex">
                        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                          {dayjs(r.record_date).format("DD/MM/YYYY")}
                        </span>
                        <Badge variant="outline">{recordTypeLabel(r.record_type)}</Badge>
                      </div>

                      <span className="text-sm font-medium text-slate-900 sm:flex-1 sm:truncate sm:font-normal sm:text-muted-foreground">
                        {r.chief_complaint || r.veterinarian?.name || "Sem queixa registrada"}
                      </span>

                      {/* Desktop: status + seta, alinhados à direita. */}
                      <div className="hidden shrink-0 items-center gap-2 sm:ml-auto sm:flex sm:justify-end">
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

      {/* FAB mobile — no desktop o botão do topo já cobre isso. */}
      <button
        type="button"
        onClick={handleNovaFicha}
        disabled={creating}
        className="fixed right-5 bottom-20 z-30 flex items-center gap-1.75 rounded-full bg-wa-brand-600 px-5 py-3.25 text-[13.5px] font-bold text-white shadow-[0_8px_20px_rgba(18,179,127,0.35)] transition-colors hover:bg-wa-brand-700 disabled:opacity-60 sm:hidden"
      >
        {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Nova ficha
      </button>
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
