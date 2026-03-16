'use client';

import React, { useEffect, useState } from 'react';
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
import api from '@/lib/axios';

const { Title } = Typography;

export default function DashboardPage() {
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
  const [recentAppointments, setRecentAppointments] = useState([]);

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

      const newPatientsMonth = patients.filter((p: any) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }).length;

      const cancelledThisMonth = consultations.filter((c: any) => {
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

      const todayConsultations = consultations.filter((c: any) => {
        const dateStr = new Date(c.consultation_date).toISOString().split('T')[0];
        return dateStr === todayStr;
      });

      const recent = todayConsultations
        .sort(
          (a: any, b: any) =>
            new Date(b.consultation_date).getTime() -
            new Date(a.consultation_date).getTime()
        )
        .map((c: any) => ({
          key: c.id,
          time: new Date(c.consultation_date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          date: new Date(c.consultation_date).toLocaleDateString('pt-BR'),
          patient: c.patient?.name || 'N/A',
          veterinarian: c.veterinarian?.name || 'N/A',
          status:
            c.status === 'cancelled'
              ? 'Cancelado'
              : c.status === 'completed'
                ? 'Realizado'
                : 'Agendado',
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
  }, []);

  const columns = [
    { title: 'Data', dataIndex: 'date', key: 'date' },
    { title: 'Horário', dataIndex: 'time', key: 'time' },
    { title: 'Paciente', dataIndex: 'patient', key: 'patient' },
    { title: 'Veterinário', dataIndex: 'veterinarian', key: 'veterinarian' },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => {
        const color = status === 'Realizado' ? 'green' : status === 'Cancelado' ? 'red' : 'blue';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Title level={2} className="!mb-6 !text-slate-800 !font-semibold">
        Visão geral
      </Title>

      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">Atendimentos hoje</span>}
              value={stats.appointmentsToday}
              prefix={<MedicineBoxOutlined className="!text-blue-600" />}
              valueStyle={{ color: '#2563eb', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">Novos pacientes (mês)</span>}
              value={stats.newPatientsMonth}
              prefix={<UserOutlined className="!text-blue-500" />}
              valueStyle={{ color: '#2563eb', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">Receita do mês</span>}
              value={stats.revenueMonth}
              precision={2}
              prefix="R$"
              valueStyle={{ color: '#059669', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="rounded-xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow" loading={loading}>
            <Statistic
              title={<span className="text-slate-600">Canceladas (mês)</span>}
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
                title={<span className="text-slate-600">Vacinas (próx. 30 dias)</span>}
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
                title={<span className="text-slate-600">Exames aguard. retorno</span>}
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
                title={<span className="text-slate-600">Conversas não respondidas</span>}
                value={stats.unansweredConversations}
                prefix={<MessageOutlined className="!text-green-600" />}
                valueStyle={{ color: '#16a34a', fontWeight: 600 }}
              />
            </Card>
          </Link>
        </Col>
      </Row>

      <Card
        title={<span className="font-semibold text-slate-800">Atendimentos de hoje</span>}
        bordered={false}
        className="rounded-xl shadow-sm border border-slate-200/80"
        loading={loading}
      >
        <Table
          columns={columns}
          dataSource={recentAppointments}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
