"use client";

import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useTranslation } from "react-i18next";
import { CURRENCY_BY_LANGUAGE, resolveAppLanguage } from "@/lib/i18n/currency";
import { cn } from "@/lib/utils";
import { MenuIconsColored } from "@/components/MenuIconsColored";
import { useDashboardMetricsQuery } from "@/hooks/apiHooks/useDashboardMetrics";
import { useConsultationsQuery } from "@/hooks/apiHooks/useConsultations";
import { usePatientsListQuery } from "@/hooks/apiHooks/usePatients";
import { useClinicalTasksQuery } from "@/hooks/apiHooks/useClinicalTasks";
import { getStoredUserRole } from "@/lib/role-permissions";
import { Badge } from "@/components/ui/badge";
import { ListChecks, PawPrint, DollarSign, XCircle, MessageCircle, ArrowUp } from "lucide-react";

/** Sparkline fina (linha, sem eixo/label) — usada no card de destaque e nos mini-gráficos do grid. */
function Sparkline({
  data,
  color,
  width = 90,
  height = 40,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const safeData = data.map((v) => (Number.isFinite(v) ? v : 0));
  if (safeData.length < 2) return null;
  const max = Math.max(...safeData, 1);
  const min = Math.min(...safeData, 0);
  const range = max - min || 1;
  const stepX = width / (safeData.length - 1);
  const points = safeData
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <polyline points={points} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
    </svg>
  );
}

/** Mini barras (magnitude por período) — o(s) pico(s) real(is) ganham a cor forte, o resto a cor clara. */
function MiniBars({
  data,
  colorLight,
  colorDark,
  width = 46,
  height = 24,
}: {
  data: number[];
  colorLight: string;
  colorDark: string;
  width?: number;
  height?: number;
}) {
  const safeData = data.map((v) => (Number.isFinite(v) ? v : 0));
  if (safeData.length === 0) return null;
  const max = Math.max(...safeData, 1);
  const barW = 6;
  const gap = safeData.length > 1 ? (width - safeData.length * barW) / (safeData.length - 1) : 0;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      {safeData.map((v, i) => {
        const h = Math.max((v / max) * height, 3);
        const x = i * (barW + gap);
        const y = height - h;
        const isPeak = v === max && v > 0;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx={1.5} fill={isPeak ? colorDark : colorLight} />;
      })}
    </svg>
  );
}

/** Cargos com visão gerencial — os únicos que veem receita no dashboard. */
const MANAGEMENT_ROLES = new Set(["superadmin", "admin", "manager"]);

/** Abrevia valores grandes (ex.: "R$50 mil") — o card do grid mobile tem
 * largura fixa e "R$50000.00" por extenso não cabe em 22px. */
function formatCompactCurrency(value: number, prefix: string, locale: string): string {
  if (value >= 10000) {
    return `${prefix}${new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
  }
  return `${prefix}${value.toFixed(2)}`;
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation("common");
  // Lê depois do mount (localStorage não existe no server) — mesmo padrão
  // usado no layout pra headerRole/menuAllow.
  const [userRole, setUserRole] = useState<string | null>(null);
  useEffect(() => {
    setUserRole(getStoredUserRole());
  }, []);

  // Quem acabou de sair do wizard de onboarding ganha uma entrada suave
  // (fade + leve subida + halo que se dissolve) em vez de o dashboard só
  // "aparecer" depois do corte seco da navegação. useLayoutEffect (não
  // useEffect) pra decidir antes do primeiro paint e não piscar o conteúdo
  // sem animação por um frame.
  const [justOnboarded, setJustOnboarded] = useState(false);
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem("nixvet:just-onboarded") === "1") {
        sessionStorage.removeItem("nixvet:just-onboarded");
        setJustOnboarded(true);
      }
    } catch {
      // sessionStorage indisponível (modo privado etc.) — só não tem a
      // entrada especial, o dashboard renderiza normalmente.
    }
  }, []);
  const isManager = !!userRole && MANAGEMENT_ROLES.has(userRole.toLowerCase());
  const locale = useMemo(() => {
    const l = i18n.language?.split("-")[0];
    if (l === "en") return "en-US";
    if (l === "es") return "es-ES";
    return "pt-BR";
  }, [i18n.language]);

  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetricsQuery();
  const { data: consultations = [], isLoading: loadingConsultations } = useConsultationsQuery();
  const { data: patients = [], isLoading: loadingPatients } = usePatientsListQuery();
  const { data: tasksPage } = useClinicalTasksQuery(1);
  const loading = loadingMetrics || loadingConsultations || loadingPatients;

  const pendingTasks = useMemo(() => {
    const items = tasksPage?.items ?? [];
    return [...items]
      .filter((task) => task.status !== "completed")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }, [tasksPage]);

  // Compara em data LOCAL (BRT), não UTC: toISOString() desloca o dia
  // perto da virada e fazia a tabela "Atendimentos de hoje" ficar vazia.
  const localYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = localYMD(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const newPatientsMonth = patients.filter((p) => {
      if (!p.createdAt) return false;
      const d = new Date(p.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;

    const cancelledThisMonth = consultations.filter((c) => {
      if (!c.consultation_date) return false;
      const d = new Date(c.consultation_date);
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth &&
        d <= now &&
        c.status === "cancelled"
      );
    }).length;

    return {
      appointmentsToday: metrics?.consultations_today ?? 0,
      newPatientsMonth,
      revenueMonth: metrics?.monthly_revenue ?? 0,
      cancelledThisMonth,
      vaccinesDue: metrics?.vaccines_due ?? 0,
      examsAwaitingFollowup: metrics?.exams_awaiting_followup ?? 0,
      unansweredConversations: metrics?.unanswered_conversations ?? 0,
      awaitingTutorConversations: metrics?.awaiting_tutor_conversations ?? 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, consultations, patients]);

  // Série real (não ilustrativa) dos últimos 7 dias de consultas — alimenta a
  // sparkline do card de destaque e o texto "vs. ontem" do dashboard mobile.
  const last7DaysConsultationCounts = useMemo(() => {
    const days: { ymd: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ ymd: localYMD(d), count: 0 });
    }
    const byDay = new Map(days.map((d) => [d.ymd, d]));
    consultations.forEach((c) => {
      if (!c.consultation_date) return;
      const bucket = byDay.get(localYMD(new Date(c.consultation_date)));
      if (bucket) bucket.count += 1;
    });
    return days.map((d) => d.count);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultations]);

  const heroDelta =
    last7DaysConsultationCounts[6] - last7DaysConsultationCounts[5];

  // Novos pacientes e receita do mês, quebrados em 5 períodos reais (do dia 1
  // até hoje) — alimenta as mini barras/linha dos cards do grid mobile.
  const monthBuckets = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const bucketCount = 5;
    const totalMs = Math.max(now.getTime() - monthStart.getTime(), 1);
    const bucketMs = totalMs / bucketCount;
    const bucketIndex = (d: Date) =>
      Math.min(bucketCount - 1, Math.max(0, Math.floor((d.getTime() - monthStart.getTime()) / bucketMs)));

    const patientBuckets = new Array(bucketCount).fill(0);
    patients.forEach((p) => {
      if (!p.createdAt) return;
      const d = new Date(p.createdAt);
      if (d < monthStart || d > now) return;
      patientBuckets[bucketIndex(d)] += 1;
    });

    const revenueBuckets = new Array(bucketCount).fill(0);
    consultations.forEach((c) => {
      if (!c.consultation_date) return;
      // price vem como string em algumas respostas (coluna DECIMAL do Postgres
      // sem cast) — somar sem converter virava concatenação de string e, depois
      // de acumulado, um NaN silencioso na sparkline.
      const price = Number(c.price);
      if (!Number.isFinite(price) || price <= 0) return;
      const d = new Date(c.consultation_date);
      if (d < monthStart || d > now) return;
      revenueBuckets[bucketIndex(d)] += price;
    });

    return { patientBuckets, revenueBuckets };
  }, [patients, consultations]);

  const recentAppointments = useMemo(() => {
    const todayStr = localYMD(new Date());

    const todayConsultations = consultations.filter((c) => {
      const raw = c.consultation_date;
      if (!raw) return false;
      return localYMD(new Date(raw)) === todayStr;
    });

    const statusLabel = (status: string) => {
      if (status === "cancelled") return t("consultation.status.cancelled");
      if (status === "completed") return t("consultation.status.completed");
      return t("consultation.status.scheduled");
    };

    return todayConsultations
      .sort(
        (a, b) =>
          new Date(b.consultation_date).getTime() -
          new Date(a.consultation_date).getTime(),
      )
      .map((c) => ({
        key: c.id,
        time: new Date(c.consultation_date).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        date: new Date(c.consultation_date).toLocaleDateString(locale),
        patient: c.patient?.name || t("dashboardHome.na"),
        veterinarian: c.veterinarian?.name || t("dashboardHome.na"),
        status: statusLabel(c.status || "scheduled"),
        statusKey: c.status || "scheduled",
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultations, locale, t]);

  const statCards = useMemo(
    () => [
      // "revenue" é filtrado logo abaixo pra quem não tem cargo de gestão.
      {
        key: "today",
        label: t("dashboardHome.statsToday"),
        value: stats.appointmentsToday,
        icon: MenuIconsColored.atendimentos,
        color: "text-blue-600",
        bg: "bg-blue-50",
        valueColor: "text-blue-700",
        href: undefined,
      },
      {
        key: "newPatients",
        label: t("dashboardHome.statsNewPatients"),
        value: stats.newPatientsMonth,
        icon: MenuIconsColored.pacientes,
        color: "text-sky-600",
        bg: "bg-sky-50",
        valueColor: "text-sky-700",
        href: undefined,
      },
      {
        key: "revenue",
        label: t("dashboardHome.statsRevenue"),
        value: `${t("dashboardHome.currencyPrefix")}${stats.revenueMonth.toFixed(2)}`,
        icon: MenuIconsColored.receitaMes,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        valueColor: "text-emerald-700",
        href: undefined,
      },
      {
        key: "cancelled",
        label: t("dashboardHome.statsCancelled"),
        value: stats.cancelledThisMonth,
        icon: MenuIconsColored.canceladas,
        color: "text-slate-500",
        bg: "bg-slate-100",
        valueColor: "text-slate-600",
        href: undefined,
      },
      {
        key: "vaccines",
        label: t("dashboardHome.statsVaccines"),
        value: stats.vaccinesDue,
        icon: MenuIconsColored.vacinas,
        color: "text-amber-600",
        bg: "bg-amber-50",
        valueColor: "text-amber-700",
        href: "/vaccines",
      },
      {
        key: "exams",
        label: t("dashboardHome.statsExams"),
        value: stats.examsAwaitingFollowup,
        icon: MenuIconsColored.exames,
        color: "text-violet-600",
        bg: "bg-violet-50",
        valueColor: "text-violet-700",
        href: "/followups",
      },
      {
        key: "whatsapp",
        label: t("dashboardHome.statsWhatsApp"),
        value: stats.unansweredConversations,
        icon: MenuIconsColored.naoRespondidas,
        color: "text-green-600",
        bg: "bg-green-50",
        valueColor: "text-green-700",
        href: "/whatsapp",
      },
      {
        key: "awaitingTutor",
        label: t("dashboardHome.statsAwaitingTutor"),
        value: stats.awaitingTutorConversations,
        icon: MenuIconsColored.aguardandoTutor,
        color: "text-sky-600",
        bg: "bg-sky-50",
        valueColor: "text-sky-700",
        href: "/whatsapp",
      },
    ].filter((card) => card.key !== "revenue" || isManager),
    [t, stats, isManager],
  );

  const statusTextClass = (statusKey: string) => {
    if (statusKey === "completed") return "text-emerald-700";
    if (statusKey === "cancelled") return "text-red-700";
    return "text-slate-700";
  };

  return (
    <div
      className="relative mx-auto space-y-10 px-4 sm:px-6 lg:px-8"
      style={justOnboarded ? { animation: "nix-fade-up 700ms cubic-bezier(0.16,1,0.3,1) both" } : undefined}
    >
      {justOnboarded && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-90 w-90 -translate-x-1/2 rounded-full bg-wa-brand-500/25 blur-3xl"
          style={{ animation: "nix-onboard-glow 1.6s ease-out forwards" }}
        />
      )}

      <h2 className="text-[26px] sm:text-[30px] font-['InterDoFigma'] font-extrabold text-foreground mb-6">
        {t("dashboardHome.title")}
      </h2>

      {/* Mobile: card de destaque (hero, com sparkline real dos últimos 7 dias)
          + grid 2 colunas com mini-gráficos reais (barras/linha) */}
      <div className="flex flex-col gap-3 sm:hidden">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full rounded-wa-lg" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-wa-lg" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="relative flex flex-col gap-1 overflow-hidden rounded-wa-lg bg-wa-brand-600 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-white/80">{t("dashboardHome.statsToday")}</div>
                  <div className="text-[38px] leading-none font-extrabold tracking-tight text-white">
                    {stats.appointmentsToday}
                  </div>
                </div>
                <Sparkline data={last7DaysConsultationCounts} color="#ffffff" />
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-wa-brand-100">
                <ArrowUp className={cn("size-3", heroDelta < 0 && "rotate-180")} />
                {heroDelta > 0 ? "+" : ""}
                {heroDelta} {t("dashboardHome.vsYesterday")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2 rounded-wa-lg border border-wa-line bg-card p-3.75">
                <div className="flex items-center justify-between">
                  <div className="flex size-8 items-center justify-center rounded-[9px] bg-wa-pink-bg text-wa-pink">
                    <PawPrint className="size-4" />
                  </div>
                  <MiniBars data={monthBuckets.patientBuckets} colorLight="var(--wa-pink-soft)" colorDark="var(--wa-pink)" />
                </div>
                <div>
                  <div className="text-[22px] leading-none font-extrabold tracking-tight text-wa-ink">
                    {stats.newPatientsMonth}
                  </div>
                  <div className="mt-1 text-xs leading-snug text-wa-ink-2">{t("dashboardHome.statsNewPatients")}</div>
                </div>
              </div>

              {isManager && (
                <div className="flex flex-col gap-2 rounded-wa-lg border border-wa-line bg-card p-3.75">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-[9px] bg-wa-blue-bg text-wa-blue">
                      <DollarSign className="size-4" />
                    </div>
                    <Sparkline data={monthBuckets.revenueBuckets} color="var(--wa-blue)" width={46} height={24} />
                  </div>
                  <div>
                    <div className="text-[22px] leading-none font-extrabold tracking-tight text-wa-ink">
                      {formatCompactCurrency(
                        stats.revenueMonth,
                        t("dashboardHome.currencyPrefix"),
                        CURRENCY_BY_LANGUAGE[resolveAppLanguage(i18n.language)].locale,
                      )}
                    </div>
                    <div className="mt-1 text-xs leading-snug text-wa-ink-2">{t("dashboardHome.statsRevenue")}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 rounded-wa-lg border border-wa-line bg-card p-3.75">
                <div className="flex size-8 items-center justify-center rounded-[9px] bg-wa-line-2 text-wa-ink-2">
                  <XCircle className="size-4" />
                </div>
                <div>
                  <div className="text-[22px] leading-none font-extrabold tracking-tight text-wa-ink">
                    {stats.cancelledThisMonth}
                  </div>
                  <div className="mt-1 text-xs leading-snug text-wa-ink-2">{t("dashboardHome.statsCancelled")}</div>
                </div>
              </div>

              <Link
                href="/whatsapp"
                className="flex flex-col gap-2 rounded-wa-lg border border-wa-line bg-card p-3.75"
              >
                <div className="flex size-8 items-center justify-center rounded-[9px] bg-wa-warn-bg text-wa-warn">
                  <MessageCircle className="size-4" />
                </div>
                <div>
                  <div className="text-[22px] leading-none font-extrabold tracking-tight text-wa-ink">
                    {stats.unansweredConversations}
                  </div>
                  <div className="mt-1 text-xs leading-snug text-wa-ink-2">{t("dashboardHome.statsWhatsApp")}</div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Tablet / desktop: todas as métricas, cartão completo */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const cardContent = (
            <Card
              className={cn(
                "m-0 p-0 w-full h-33.75 rounded-xl border border-gray-300",
                card.href && "cursor-pointer hover:shadow-md",
              )}
            >
              <CardContent className="relative flex items-center m-0 p-4 justify-between h-full rounded-xl">
                <div className="absolute top-2 right-2 flex items-center justify-center w-11 h-11 rounded-[9px]">
                  <Icon className="h-11 w-11" />
                </div>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ) : (
                  <div className="flex w-full h-full items-start justify-between rounded-xl">
                    <div className="space-y-1 w-full h-full flex flex-col items-start justify-between">
                      <p className="text-[18px] text-black font-medium">
                        {card.label}
                      </p>
                      <p className="font-extrabold font-['InterDoFigma'] text-[40px] leading-none">
                        {card.value}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );

          return card.href ? (
            <Link key={card.key} href={card.href} className="w-full">
              {cardContent}
            </Link>
          ) : (
            <div key={card.key} className="w-full">
              {cardContent}
            </div>
          );
        })}
      </div>

      <div>
        <div className="px-2 mb-8 mt-4 flex items-center justify-between">
          <h3 className="text-base sm:text-[20px] font-bold text-slate-900">
            {t("dashboardHome.tableTitle")}
          </h3>
          <Link href="/calendar" className="text-sm font-medium text-primary hover:underline">
            {t("dashboardHome.viewSchedule")}
          </Link>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentAppointments.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              {t("dashboardHome.noAppointments")}
            </div>
          ) : (
            <>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t("dashboardHome.colDate")}</TableHead>
                      <TableHead>{t("dashboardHome.colTime")}</TableHead>
                      <TableHead>{t("dashboardHome.colPatient")}</TableHead>
                      <TableHead>{t("dashboardHome.colVet")}</TableHead>
                      <TableHead>{t("dashboardHome.colStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAppointments.map((row) => (
                      <TableRow className="border-b border-gray-300 h-15" key={row.key}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.time}</TableCell>
                        <TableCell className="font-medium">{row.patient}</TableCell>
                        <TableCell>{row.veterinarian}</TableCell>
                        <TableCell>
                          <span className={statusTextClass(row.statusKey)}>{row.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {recentAppointments.map((row) => (
                  <div key={row.key} className="rounded-lg border border-gray-300 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.patient}</p>
                        <p className="text-xs text-muted-foreground">{row.veterinarian}</p>
                      </div>
                      <span className={cn("shrink-0 text-xs font-medium", statusTextClass(row.statusKey))}>
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 border-t border-gray-200 pt-2 text-xs text-muted-foreground">
                      <span>{row.date}</span>
                      <span>{row.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="px-2 mb-4 flex items-center justify-between">
          <h3 className="text-[20px] font-bold text-slate-900">{t("dashboardHome.pendingTasksTitle")}</h3>
          <Link href="/tasks" className="text-sm font-medium text-primary hover:underline">
            {t("dashboardHome.viewAll")}
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
            {t("dashboardHome.noPendingTasks")}
          </div>
        ) : (
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ListChecks className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{task.task_type}</p>
                  <p className="truncate text-xs text-muted-foreground">{task.patient?.name ?? t("dashboardHome.na")}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString(locale) : t("dashboardHome.noDueDate")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
