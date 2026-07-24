"use client";

import React, { useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { MenuIconsColored } from "@/components/MenuIconsColored";
import { useDashboardMetricsQuery } from "@/hooks/apiHooks/useDashboardMetrics";
import { useConsultationsQuery } from "@/hooks/apiHooks/useConsultations";
import { usePatientsListQuery } from "@/hooks/apiHooks/usePatients";
import { useClinicalTasksQuery } from "@/hooks/apiHooks/useClinicalTasks";
import { Badge } from "@/components/ui/badge";
import { ListChecks } from "lucide-react";

export default function DashboardPage() {
  const { t, i18n } = useTranslation("common");
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
    ],
    [t, stats],
  );

  const statusTextClass = (statusKey: string) => {
    if (statusKey === "completed") return "text-emerald-700";
    if (statusKey === "cancelled") return "text-red-700";
    return "text-slate-700";
  };

  return (
    <div className="mx-auto space-y-10 px-4 sm:px-6 lg:px-8">
      <h2 className="text-[30px] font-['InterDoFigma'] font-extrabold text-foreground mb-18">
        {t("dashboardHome.title")}
      </h2>

      {/* Mobile: todas as métricas, cartão compacto (ícone/número/label empilhado), altura padrão */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {statCards.map((card) => {
          const Icon = card.icon;
          const cardContent = (
            <Card
              className={cn(
                "m-0 h-full w-full p-0 rounded-xl border border-gray-300",
                card.href && "cursor-pointer hover:shadow-md",
              )}
            >
              <CardContent className="flex h-full flex-col gap-2 p-3">
                <div className="h-8 w-8 shrink-0">
                  <Icon />
                </div>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ) : (
                  <div>
                    <p className="font-extrabold font-['InterDoFigma'] text-2xl leading-none">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );

          return card.href ? (
            <Link key={card.key} href={card.href} className="block h-full">
              {cardContent}
            </Link>
          ) : (
            <div key={card.key} className="h-full">
              {cardContent}
            </div>
          );
        })}
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
          <h3 className="text-[20px] font-bold text-slate-900">
            {t("dashboardHome.tableTitle")}
          </h3>
          <Link href="/calendar" className="text-sm font-medium text-primary hover:underline">
            Ver agenda
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
              {t("dashboardHome.noAppointments", "Nenhuma consulta hoje")}
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
          <h3 className="text-[20px] font-bold text-slate-900">Tarefas pendentes</h3>
          <Link href="/tasks" className="text-sm font-medium text-primary hover:underline">
            Ver todas
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
            Nenhuma tarefa pendente.
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
                  <p className="truncate text-xs text-muted-foreground">{task.Patient?.name ?? t("dashboardHome.na")}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString(locale) : "Sem prazo"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
