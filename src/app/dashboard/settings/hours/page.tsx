'use client';

import React, { useEffect, useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, Switch, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

interface BusinessHour {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface EmergencyHour {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface VetSchedule {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  user?: { name: string };
}

export default function SettingsHoursPage() {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [emergencyHours, setEmergencyHours] = useState<EmergencyHour[]>([]);
  const [vetSchedules, setVetSchedules] = useState<VetSchedule[]>([]);
  const [veterinarians, setVeterinarians] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [vetModalOpen, setVetModalOpen] = useState(false);
  const [businessForm] = Form.useForm();
  const [emergencyForm] = Form.useForm();
  const [vetForm] = Form.useForm();

  const fetchBusiness = async () => {
    try {
      const res = await api.get('/availability/config/business-hours');
      setBusinessHours(res.data ?? []);
    } catch {
      message.error('Erro ao carregar horário de funcionamento');
    }
  };

  const fetchEmergency = async () => {
    try {
      const res = await api.get('/availability/config/emergency-hours');
      setEmergencyHours(res.data ?? []);
    } catch {
      message.error('Erro ao carregar horário de emergência');
    }
  };

  const fetchVetSchedules = async () => {
    try {
      const res = await api.get('/availability/config/veterinarian-schedules');
      setVetSchedules(res.data ?? []);
    } catch {
      message.error('Erro ao carregar agendas');
    }
  };

  const fetchVets = async () => {
    try {
      const res = await api.get('/users/veterinarians');
      setVeterinarians(res.data ?? []);
    } catch {
      message.error('Erro ao carregar veterinários');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBusiness(), fetchEmergency(), fetchVetSchedules(), fetchVets()]).finally(() =>
      setLoading(false),
    );
  }, []);

  const onBusinessFinish = async (values: any) => {
    try {
      await api.post('/availability/config/business-hours', {
        day_of_week: values.day_of_week,
        open_time: values.is_closed ? undefined : values.open_time,
        close_time: values.is_closed ? undefined : values.close_time,
        is_closed: !!values.is_closed,
      });
      message.success('Salvo');
      setBusinessModalOpen(false);
      fetchBusiness();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const onEmergencyFinish = async (values: any) => {
    try {
      await api.post('/availability/config/emergency-hours', {
        day_of_week: values.day_of_week,
        start_time: values.start_time,
        end_time: values.end_time,
        is_active: values.is_active !== false,
      });
      message.success('Salvo');
      setEmergencyModalOpen(false);
      fetchEmergency();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const onVetFinish = async (values: any) => {
    try {
      await api.post('/availability/config/veterinarian-schedules', {
        user_id: values.user_id,
        day_of_week: values.day_of_week,
        start_time: values.start_time,
        end_time: values.end_time,
        slot_duration_minutes: values.slot_duration_minutes ?? 30,
      });
      message.success('Adicionado');
      setVetModalOpen(false);
      vetForm.resetFields();
      fetchVetSchedules();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const openBusinessEdit = (row: BusinessHour) => {
    businessForm.setFieldsValue({
      day_of_week: row.day_of_week,
      open_time: row.open_time ?? '08:00',
      close_time: row.close_time ?? '18:00',
      is_closed: row.is_closed,
    });
    setBusinessModalOpen(true);
  };

  const openEmergencyEdit = (row: EmergencyHour) => {
    emergencyForm.setFieldsValue({
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      is_active: row.is_active,
    });
    setEmergencyModalOpen(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Horários</h1>
      <Card loading={loading}>
        <Tabs
          items={[
            {
              key: 'business',
              label: 'Horário de funcionamento',
              children: (
                <>
                  <p className="text-slate-600 mb-4">Define o horário de abertura/fechamento da clínica por dia.</p>
                  <Table
                    dataSource={businessHours}
                    rowKey={(r) => r.day_of_week.toString()}
                    pagination={false}
                    columns={[
                      {
                        title: 'Dia',
                        dataIndex: 'day_of_week',
                        render: (d: number) => DAYS.find((x) => x.value === d)?.label ?? d,
                      },
                      {
                        title: 'Abre',
                        dataIndex: 'open_time',
                        render: (t: string | null, r: BusinessHour) => (r.is_closed ? '—' : t ?? '—'),
                      },
                      {
                        title: 'Fecha',
                        dataIndex: 'close_time',
                        render: (t: string | null, r: BusinessHour) => (r.is_closed ? '—' : t ?? '—'),
                      },
                      {
                        title: 'Fechado',
                        dataIndex: 'is_closed',
                        render: (v: boolean) => (v ? 'Sim' : 'Não'),
                      },
                      {
                        title: 'Ações',
                        render: (_: any, r: BusinessHour) => (
                          <Button type="link" size="small" onClick={() => openBusinessEdit(r)}>
                            Editar
                          </Button>
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'emergency',
              label: 'Horário de emergência',
              children: (
                <>
                  <p className="text-slate-600 mb-4">Horários de plantão/emergência por dia.</p>
                  <Table
                    dataSource={emergencyHours}
                    rowKey={(r) => r.day_of_week.toString()}
                    pagination={false}
                    columns={[
                      { title: 'Dia', dataIndex: 'day_of_week', render: (d: number) => DAYS.find((x) => x.value === d)?.label ?? d },
                      { title: 'Início', dataIndex: 'start_time' },
                      { title: 'Fim', dataIndex: 'end_time' },
                      { title: 'Ativo', dataIndex: 'is_active', render: (v: boolean) => (v ? 'Sim' : 'Não') },
                      {
                        title: 'Ações',
                        render: (_: any, r: EmergencyHour) => (
                          <Button type="link" size="small" onClick={() => openEmergencyEdit(r)}>
                            Editar
                          </Button>
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'vet',
              label: 'Agenda por veterinário',
              children: (
                <>
                  <p className="text-slate-600 mb-4">Cadastre os dias e horários de atendimento de cada veterinário.</p>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setVetModalOpen(true)} className="mb-4 bg-blue-600">
                    Adicionar horário
                  </Button>
                  <Table
                    dataSource={vetSchedules}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: 'Veterinário',
                        key: 'vet',
                        render: (_: any, r: VetSchedule) =>
                          r.user?.name ?? veterinarians.find((v) => v.id === r.user_id)?.name ?? r.user_id,
                      },
                      { title: 'Dia', dataIndex: 'day_of_week', render: (d: number) => DAYS.find((x) => x.value === d)?.label ?? d },
                      { title: 'Início', dataIndex: 'start_time' },
                      { title: 'Fim', dataIndex: 'end_time' },
                      { title: 'Slot (min)', dataIndex: 'slot_duration_minutes' },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal title="Editar horário de funcionamento" open={businessModalOpen} onCancel={() => setBusinessModalOpen(false)} footer={null}>
        <Form form={businessForm} layout="vertical" onFinish={onBusinessFinish}>
          <Form.Item name="day_of_week" label="Dia" rules={[{ required: true }]}>
            <Select options={DAYS} placeholder="Dia" />
          </Form.Item>
          <Form.Item name="is_closed" label="Fechado" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.is_closed !== curr.is_closed}>
            {({ getFieldValue }) =>
              !getFieldValue('is_closed') && (
                <>
                  <Form.Item name="open_time" label="Abertura" rules={[{ required: true }]}>
                    <Input type="time" />
                  </Form.Item>
                  <Form.Item name="close_time" label="Fechamento" rules={[{ required: true }]}>
                    <Input type="time" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Salvar</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Editar horário de emergência" open={emergencyModalOpen} onCancel={() => setEmergencyModalOpen(false)} footer={null}>
        <Form form={emergencyForm} layout="vertical" onFinish={onEmergencyFinish}>
          <Form.Item name="day_of_week" label="Dia" rules={[{ required: true }]}>
            <Select options={DAYS} placeholder="Dia" />
          </Form.Item>
          <Form.Item name="start_time" label="Início" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="end_time" label="Fim" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="is_active" label="Ativo" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Salvar</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Adicionar horário do veterinário" open={vetModalOpen} onCancel={() => setVetModalOpen(false)} footer={null}>
        <Form form={vetForm} layout="vertical" onFinish={onVetFinish}>
          <Form.Item name="user_id" label="Veterinário" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione"
              options={veterinarians.map((v) => ({ value: v.id, label: v.name }))}
            />
          </Form.Item>
          <Form.Item name="day_of_week" label="Dia" rules={[{ required: true }]}>
            <Select options={DAYS} placeholder="Dia" />
          </Form.Item>
          <Form.Item name="start_time" label="Início" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="end_time" label="Fim" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="slot_duration_minutes" label="Duração do slot (min)" initialValue={30}>
            <Input type="number" min={10} max={120} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Adicionar</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
