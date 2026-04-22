'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Stethoscope,
  Users,
  Calendar,
  FlaskConical,
  MessageSquare,
  FileSearch,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { t, i18n } = useTranslation('common');
  const locale = useMemo(() => {
    const l = i18n.language?.split('-')[0];
    if (l === 'en') return 'en-US';
    if (l === 'es') return 'es-ES';
    return 'pt-BR';
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
      const [metricsRes, consultationsRes, patientsRes] = await Promise.all([
        api.get('/metrics/dashboard'),
        api.get('/consultations'),
        api.get('/patients'),
      ]);

      const metrics = metricsRes.data as {
        consultations_today: number;
        vaccines_due: number;
        exams_awaiting_followup: number;
        unanswered_conversations: number;
        monthly_revenue: number;
      };
      const consultations = consultationsRes.data;
      const patients = patientsRes.data;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
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
            c.status === 'cancelled'
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

      const todayConsultations = consultations.filter((c: { consultation_date?: string }) => {
        const raw = c.consultation_date;
        if (!raw) return false;
        const dateStr = new Date(raw).toISOString().split('T')[0];
        return dateStr === todayStr;
      }) as ConsultTodayRow[];

      const statusLabel = (status: string) => {
        if (status === 'cancelled') return t('consultation.status.cancelled');
        if (status === 'completed') return t('consultation.status.completed');
        return t('consultation.status.scheduled');
      };

      const recent = todayConsultations
        .sort(
          (a, b) =>
            new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime(),
        )
        .map((c) => ({
          key: c.id,
          time: new Date(c.consultation_date).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          }),
          date: new Date(c.consultation_date).toLocaleDateString(locale),
          patient: c.patient?.name || t('dashboardHome.na'),
          veterinarian: c.veterinarian?.name || t('dashboardHome.na'),
          status: statusLabel(c.status || 'scheduled'),
          statusKey: c.status || 'scheduled',
        }));

      setRecentAppointments(recent);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, t]);

  const statCards = useMemo(
    () => [
      {
        label: t('dashboardHome.statsToday'),
        value: stats.appointmentsToday,
        icon: Stethoscope,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        valueColor: 'text-blue-700',
        href: undefined,
      },
      {
        label: t('dashboardHome.statsNewPatients'),
        value: stats.newPatientsMonth,
        icon: Users,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        valueColor: 'text-sky-700',
        href: undefined,
      },
      {
        label: t('dashboardHome.statsRevenue'),
        value: `${t('dashboardHome.currencyPrefix')}${stats.revenueMonth.toFixed(2)}`,
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        valueColor: 'text-emerald-700',
        href: undefined,
      },
      {
        label: t('dashboardHome.statsCancelled'),
        value: stats.cancelledThisMonth,
        icon: XCircle,
        color: 'text-slate-500',
        bg: 'bg-slate-100',
        valueColor: 'text-slate-600',
        href: undefined,
      },
      {
        label: t('dashboardHome.statsVaccines'),
        value: stats.vaccinesDue,
        icon: FlaskConical,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        valueColor: 'text-amber-700',
        href: '/dashboard/vaccines',
      },
      {
        label: t('dashboardHome.statsExams'),
        value: stats.examsAwaitingFollowup,
        icon: FileSearch,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        valueColor: 'text-violet-700',
        href: '/dashboard/followups',
      },
      {
        label: t('dashboardHome.statsWhatsApp'),
        value: stats.unansweredConversations,
        icon: MessageSquare,
        color: 'text-green-600',
        bg: 'bg-green-50',
        valueColor: 'text-green-700',
        href: '/dashboard/whatsapp',
      },
    ],
    [t, stats],
  );

  const statusVariant = (
    statusKey: string,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (statusKey === 'completed') return 'default';
    if (statusKey === 'cancelled') return 'destructive';
    return 'secondary';
  };

  const statusClass = (statusKey: string) => {
    if (statusKey === 'completed') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    if (statusKey === 'cancelled') return 'bg-red-100 text-red-700 hover:bg-red-100';
    return 'bg-primary/10 text-primary hover:bg-primary/10';
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-heading font-semibold text-foreground">{t('dashboardHome.title')}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const cardContent = (
            <Card
              className={cn(
                'rounded-xl border border-border shadow-[var(--shadow-card)] transition-shadow',
                card.href && 'cursor-pointer hover:shadow-md',
              )}
            >
              <CardContent className="p-5">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className={cn('text-3xl font-bold', card.valueColor)}>{card.value}</p>
                    </div>
                    <div className={cn('rounded-lg p-2.5', card.bg)}>
                      <Icon className={cn('h-5 w-5', card.color)} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );

          return card.href ? (
            <Link key={card.label} href={card.href}>
              {cardContent}
            </Link>
          ) : (
            <div key={card.label}>{cardContent}</div>
          );
        })}
      </div>

      <Card className="rounded-xl border border-border shadow-[var(--shadow-card)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            {t('dashboardHome.tableTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboardHome.colDate')}</TableHead>
                  <TableHead>{t('dashboardHome.colTime')}</TableHead>
                  <TableHead>{t('dashboardHome.colPatient')}</TableHead>
                  <TableHead>{t('dashboardHome.colVet')}</TableHead>
                  <TableHead>{t('dashboardHome.colStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground/60"
                    >
                      {t('dashboardHome.noAppointments', 'Nenhuma consulta hoje')}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentAppointments.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="text-muted-foreground">{row.date}</TableCell>
                      <TableCell className="text-muted-foreground">{row.time}</TableCell>
                      <TableCell className="font-medium text-foreground">{row.patient}</TableCell>
                      <TableCell className="text-muted-foreground">{row.veterinarian}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant(row.statusKey)}
                          className={cn('text-xs font-medium', statusClass(row.statusKey))}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
