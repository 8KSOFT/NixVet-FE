'use client';

import React, { useEffect, useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, Switch, message, Popconfirm, Space, Tag, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
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

const SCHEDULE_TYPES = [
  { value: 'regular', label: 'Atendimento regular' },
  { value: 'on_call', label: 'Plantão / Emergência' },
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
  schedule_type: 'regular' | 'on_call';
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
      businessForm.resetFields();
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
      emergencyForm.resetFields();
      fetchEmergency();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const onVetFinish = async (values: any) => {
    const days: number[] = Array.isArray(values.days_of_week) ? values.days_of_week : [values.days_of_week];
    const errors: string[] = [];
    for (const day of days) {
      try {
        await api.post('/availability/config/veterinarian-schedules', {
          user_id: values.user_id,
          day_of_week: day,
          start_time: values.start_time,
          end_time: values.end_time,
          slot_duration_minutes: values.slot_duration_minutes ?? 30,
          schedule_type: values.schedule_type ?? 'regular',
        });
      } catch (e: any) {
        errors.push(`${DAYS.find(d => d.value === day)?.label}: ${e.response?.data?.message ?? 'Erro'}`);
      }
    }
    if (errors.length) {
      message.error(errors.join('\n'));
    } else {
      message.success(days.length > 1 ? `${days.length} horários adicionados` : 'Adicionado');
    }
    setVetModalOpen(false);
    vetForm.resetFields();
    fetchVetSchedules();
  };

  const handleDeleteVetSchedule = async (id: string) => {
    try {
      await api.delete(`/availability/config/veterinarian-schedules/${id}`);
      message.success('Removido');
      fetchVetSchedules();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const openBusinessModal = (row?: BusinessHour) => {
    if (row) {
      businessForm.setFieldsValue({
        day_of_week: row.day_of_week,
        open_time: row.open_time ?? '08:00',
        close_time: row.close_time ?? '18:00',
        is_closed: row.is_closed,
      });
    } else {
      businessForm.resetFields();
    }
    setBusinessModalOpen(true);
  };

  const openEmergencyModal = (row?: EmergencyHour) => {
    if (row) {
      emergencyForm.setFieldsValue({
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        is_active: row.is_active,
      });
    } else {
      emergencyForm.resetFields();
    }
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
                  <p className="text-slate-600 mb-4">Define o horário de abertura/fechamento da clínica por dia da semana.</p>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openBusinessModal()}
                    className="mb-4 bg-blue-600"
                  >
                    Adicionar dia
                  </Button>
                  <Table
                    dataSource={businessHours}
                    rowKey={(r) => r.id ?? r.day_of_week.toString()}
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
                        title: 'Status',
                        dataIndex: 'is_closed',
                        render: (v: boolean) => v ? <Tag color="red">Fechado</Tag> : <Tag color="green">Aberto</Tag>,
                      },
                      {
                        title: 'Ações',
                        render: (_: any, r: BusinessHour) => (
                          <Button type="link" size="small" onClick={() => openBusinessModal(r)}>
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
              label: 'Plantão / Emergência',
              children: (
                <>
                  <p className="text-slate-600 mb-4">
                    Janelas de plantão ou emergência por dia da semana. Ative/desative por dia conforme necessário.
                  </p>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openEmergencyModal()}
                    className="mb-4 bg-blue-600"
                  >
                    Adicionar plantão
                  </Button>
                  <Table
                    dataSource={emergencyHours}
                    rowKey={(r) => r.id ?? r.day_of_week.toString()}
                    pagination={false}
                    columns={[
                      { title: 'Dia', dataIndex: 'day_of_week', render: (d: number) => DAYS.find((x) => x.value === d)?.label ?? d },
                      { title: 'Início', dataIndex: 'start_time' },
                      { title: 'Fim', dataIndex: 'end_time' },
                      {
                        title: 'Status',
                        dataIndex: 'is_active',
                        render: (v: boolean) => v ? <Tag color="green">Ativo</Tag> : <Tag>Inativo</Tag>,
                      },
                      {
                        title: 'Ações',
                        render: (_: any, r: EmergencyHour) => (
                          <Button type="link" size="small" onClick={() => openEmergencyModal(r)}>
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
                  <p className="text-slate-600 mb-4">
                    Dias e horários de cada veterinário. Defina se é atendimento regular ou plantão.
                  </p>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      vetForm.resetFields();
                      setVetModalOpen(true);
                    }}
                    className="mb-4 bg-blue-600"
                  >
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
                      {
                        title: 'Tipo',
                        dataIndex: 'schedule_type',
                        render: (t: string) =>
                          t === 'on_call' ? (
                            <Tag color="orange">Plantão</Tag>
                          ) : (
                            <Tag color="blue">Regular</Tag>
                          ),
                      },
                      {
                        title: 'Ações',
                        key: 'actions',
                        render: (_: any, r: VetSchedule) => (
                          <Space>
                            <Popconfirm
                              title="Remover este horário?"
                              onConfirm={() => handleDeleteVetSchedule(r.id)}
                              okText="Remover"
                              cancelText="Cancelar"
                            >
                              <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal horário de funcionamento */}
      <Modal
        title="Horário de funcionamento"
        open={businessModalOpen}
        onCancel={() => setBusinessModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={businessForm} layout="vertical" onFinish={onBusinessFinish}>
          <Form.Item name="day_of_week" label="Dia da semana" rules={[{ required: true }]}>
            <Select options={DAYS} placeholder="Selecione o dia" />
          </Form.Item>
          <Form.Item name="is_closed" label="Fechado neste dia" valuePropName="checked">
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

      {/* Modal plantão / emergência */}
      <Modal
        title="Plantão / Emergência"
        open={emergencyModalOpen}
        onCancel={() => setEmergencyModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={emergencyForm} layout="vertical" onFinish={onEmergencyFinish}>
          <Form.Item name="day_of_week" label="Dia da semana" rules={[{ required: true }]}>
            <Select options={DAYS} placeholder="Selecione o dia" />
          </Form.Item>
          <Form.Item name="start_time" label="Início" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="end_time" label="Fim" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="is_active" label="Ativo" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Salvar</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal agenda veterinário */}
      <Modal
        title="Adicionar horário do veterinário"
        open={vetModalOpen}
        onCancel={() => setVetModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={vetForm} layout="vertical" onFinish={onVetFinish}>
          <Form.Item name="user_id" label="Veterinário" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione"
              options={veterinarians.map((v) => ({ value: v.id, label: v.name }))}
            />
          </Form.Item>
          <Form.Item name="days_of_week" label="Dias da semana" rules={[{ required: true, message: 'Selecione ao menos um dia' }]}>
            <Checkbox.Group>
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 mt-1">
                {DAYS.map((d) => (
                  <Checkbox key={d.value} value={d.value}>{d.label}</Checkbox>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="start_time" label="Início" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="end_time" label="Fim" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="slot_duration_minutes" label="Duração padrão do slot (min)" initialValue={30}>
            <Input type="number" min={10} max={120} />
          </Form.Item>
          <Form.Item name="schedule_type" label="Tipo de agenda" initialValue="regular">
            <Select options={SCHEDULE_TYPES} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Adicionar</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
