"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import api from "@/lib/axios";
import { fetchAllListPages } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { MenuIconsColored } from "@/components/MenuIconsColored";

export default function DashboardPage() {
  const { t, i18n } = useTranslation("common");
  const locale = useMemo(() => {
    const l = i18n.language?.split("-")[0];
    if (l === "en") return "en-US";
    if (l === "es") return "es-ES";
    return "pt-BR";
  }, [i18n.language]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    newPatientsMonth: 0,
    revenueMonth: 0,
    cancelledThisMonth: 0,
    vaccinesDue: 0,
    examsAwaitingFollowup: 0,
    unansweredConversations: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<
    Array<{
      key: string;
      time: string;
      date: string;
      patient: string;
      veterinarian: string;
      status: string;
      statusKey: string;
    }>
  >([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, consultations, patients] = await Promise.all([
        api.get("/metrics/dashboard"),
        fetchAllListPages<{
          consultation_date?: string;
          status?: string;
        }>("/consultations"),
        fetchAllListPages<{ createdAt?: string }>("/patients"),
      ]);

      const metrics = metricsRes.data as {
        consultations_today: number;
        vaccines_due: number;
        exams_awaiting_followup: number;
        unanswered_conversations: number;
        monthly_revenue: number;
      };

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const newPatientsMonth = patients.filter((p: { createdAt?: string }) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }).length;

      const cancelledThisMonth = consultations.filter(
        (c: { consultation_date?: string; status?: string }) => {
          if (!c.consultation_date) return false;
          const d = new Date(c.consultation_date);
          return (
            d.getFullYear() === currentYear &&
            d.getMonth() === currentMonth &&
            d <= now &&
            c.status === "cancelled"
          );
        },
      ).length;

      setStats({
        appointmentsToday: metrics.consultations_today,
        newPatientsMonth,
        revenueMonth: metrics.monthly_revenue,
        cancelledThisMonth,
        vaccinesDue: metrics.vaccines_due,
        examsAwaitingFollowup: metrics.exams_awaiting_followup,
        unansweredConversations: metrics.unanswered_conversations,
      });

      type ConsultTodayRow = {
        id: string;
        consultation_date: string;
        patient?: { name?: string };
        veterinarian?: { name?: string };
        status?: string;
      };

      const todayConsultations = consultations.filter(
        (c: { consultation_date?: string }) => {
          const raw = c.consultation_date;
          if (!raw) return false;
          const dateStr = new Date(raw).toISOString().split("T")[0];
          return dateStr === todayStr;
        },
      ) as ConsultTodayRow[];

      const statusLabel = (status: string) => {
        if (status === "cancelled") return t("consultation.status.cancelled");
        if (status === "completed") return t("consultation.status.completed");
        return t("consultation.status.scheduled");
      };

      const recent = todayConsultations
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

      setRecentAppointments(recent);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [locale, t]);

  const statCards = useMemo(
    () => [
      {
        label: t("dashboardHome.statsToday"),
        value: stats.appointmentsToday,
        icon: MenuIconsColored.atendimentos,
        color: "text-blue-600",
        bg: "bg-blue-50",
        valueColor: "text-blue-700",
        href: undefined,
      },
      {
        label: t("dashboardHome.statsNewPatients"),
        value: stats.newPatientsMonth,
        icon: MenuIconsColored.pacientes,
        color: "text-sky-600",
        bg: "bg-sky-50",
        valueColor: "text-sky-700",
        href: undefined,
      },
      {
        label: t("dashboardHome.statsRevenue"),
        value: `${t("dashboardHome.currencyPrefix")}${stats.revenueMonth.toFixed(2)}`,
        icon: MenuIconsColored.receitaMes,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        valueColor: "text-emerald-700",
        href: undefined,
      },
      {
        label: t("dashboardHome.statsCancelled"),
        value: stats.cancelledThisMonth,
        icon: MenuIconsColored.canceladas,
        color: "text-slate-500",
        bg: "bg-slate-100",
        valueColor: "text-slate-600",
        href: undefined,
      },
      {
        label: t("dashboardHome.statsVaccines"),
        value: stats.vaccinesDue,
        icon: MenuIconsColored.vacinas,
        color: "text-amber-600",
        bg: "bg-amber-50",
        valueColor: "text-amber-700",
        href: "/dashboard/vaccines",
      },
      {
        label: t("dashboardHome.statsExams"),
        value: stats.examsAwaitingFollowup,
        icon: MenuIconsColored.exames,
        color: "text-violet-600",
        bg: "bg-violet-50",
        valueColor: "text-violet-700",
        href: "/dashboard/followups",
      },
      {
        label: t("dashboardHome.statsWhatsApp"),
        value: stats.unansweredConversations,
        icon: MenuIconsColored.naoRespondidas,
        color: "text-green-600",
        bg: "bg-green-50",
        valueColor: "text-green-700",
        href: "/dashboard/whatsapp",
      },
      {
        label: t("dashboardHome.statsWhatsApp"),
        value: stats.unansweredConversations,
        icon: MenuIconsColored.naoRespondidas,
        color: "text-green-600",
        bg: "bg-green-50",
        valueColor: "text-green-700",
        href: "/dashboard/whatsapp",
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const cardContent = (
            <Card
              className={cn(
                "m-0 p-0 w-full h-33.75 rounded-xl border border-black/20",
                card.href && "cursor-pointer hover:shadow-md",
              )}
            >
              <CardContent className="relative flex items-center m-0 p-4 justify-between h-full rounded-xl">
                <div className="absolute top-2 right-2 flex items-center justify-center w-11 h-11 rounded-[9px]">
                  <Icon className={cn("h-11 w-11", card.color)} />
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
            <Link key={card.label} href={card.href} className="w-full">
              {cardContent}
            </Link>
          ) : (
            <div key={card.label} className="w-full">
              {cardContent}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="px-2 mb-8 mt-4">
          <h3 className="text-[20px] font-bold text-slate-900">
            {t("dashboardHome.tableTitle")}
          </h3>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                      {t("dashboardHome.colDate")}
                    </TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                      {t("dashboardHome.colTime")}
                    </TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                      {t("dashboardHome.colPatient")}
                    </TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                      {t("dashboardHome.colVet")}
                    </TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                      {t("dashboardHome.colStatus")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="border-t border-slate-200 py-8 text-center text-sm text-slate-500"
                      >
                        {t(
                          "dashboardHome.noAppointments",
                          "Nenhuma consulta hoje",
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentAppointments.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                          {row.date}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                          {row.time}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 font-medium text-slate-900">
                          {row.patient}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                          {row.veterinarian}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3">
                          <span className={statusTextClass(row.statusKey)}>
                            {row.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
