'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Row, Col, Card, Statistic, Table, Tag, Typography } from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  MessageOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

const { Title } = Typography;

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

      const cancelledThisMonth = consultations.filter((c: { consultation_date?: string; status?: string }) => {
        if (!c.consultation_date) return false;
        const d = new Date(c.consultation_date);
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d <= now &&
          c.status === 'cancelled'
        );
      }).length;

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
  }, [locale, t]);

  const columns = useMemo(
    () => [
      { title: t('dashboardHome.colDate'), dataIndex: 'date', key: 'date' },
      { title: t('dashboardHome.colTime'), dataIndex: 'time', key: 'time' },
      { title: t('dashboardHome.colPatient'), dataIndex: 'patient', key: 'patient' },
      { title: t('dashboardHome.colVet'), dataIndex: 'veterinarian', key: 'veterinarian' },
      {
        title: t('dashboardHome.colStatus'),
        key: 'status',
        dataIndex: 'status',
        render: (status: string, row: { statusKey: string }) => {
          const color =
            row.statusKey === 'completed' ? 'green' : row.statusKey === 'cancelled' ? 'red' : 'blue';
          return <Tag color={color}>{status}</Tag>;
        },
      },
    ],
    [t],
  );

  return (
    <div>
      <Title level={2} className="!mb-6 !text-slate-800 !font-semibold">
        {t('dashboardHome.title')}
      </Title>

      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">{t('dashboardHome.statsToday')}</span>}
              value={stats.appointmentsToday}
              prefix={<MedicineBoxOutlined className="!text-blue-600" />}
              valueStyle={{ color: '#2563eb', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">{t('dashboardHome.statsNewPatients')}</span>}
              value={stats.newPatientsMonth}
              prefix={<UserOutlined className="!text-blue-500" />}
              valueStyle={{ color: '#2563eb', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">{t('dashboardHome.statsRevenue')}</span>}
              value={stats.revenueMonth}
              precision={2}
              prefix={t('dashboardHome.currencyPrefix')}
              valueStyle={{ color: '#059669', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">{t('dashboardHome.statsCancelled')}</span>}
              value={stats.cancelledThisMonth}
              prefix={<CalendarOutlined className="!text-slate-500" />}
              valueStyle={{ color: '#64748b', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link href="/dashboard/vaccines">
            <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow cursor-pointer" loading={loading}>
              <Statistic
                title={<span className="text-slate-600">{t('dashboardHome.statsVaccines')}</span>}
                value={stats.vaccinesDue}
                prefix={<ExperimentOutlined className="!text-amber-600" />}
                valueStyle={{ color: '#d97706', fontWeight: 600 }}
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link href="/dashboard/followups">
            <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow cursor-pointer" loading={loading}>
              <Statistic
                title={<span className="text-slate-600">{t('dashboardHome.statsExams')}</span>}
                value={stats.examsAwaitingFollowup}
                prefix={<FileSearchOutlined className="!text-purple-600" />}
                valueStyle={{ color: '#7c3aed', fontWeight: 600 }}
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link href="/dashboard/whatsapp">
            <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow cursor-pointer" loading={loading}>
              <Statistic
                title={<span className="text-slate-600">{t('dashboardHome.statsWhatsApp')}</span>}
                value={stats.unansweredConversations}
                prefix={<MessageOutlined className="!text-green-600" />}
                valueStyle={{ color: '#16a34a', fontWeight: 600 }}
              />
            </Card>
          </Link>
        </Col>
      </Row>

      <Card
        title={<span className="font-semibold text-slate-800">{t('dashboardHome.tableTitle')}</span>}
        bordered={false}
        className="rounded-xl shadow-sm border border-slate-200/80"
        loading={loading}
      >
        <Table columns={columns} dataSource={recentAppointments} pagination={false} size="middle" />
      </Card>
    </div>
  );
}
