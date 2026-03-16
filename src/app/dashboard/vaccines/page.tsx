'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tabs, message } from 'antd';
import { PlusOutlined, ExperimentOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface VaccineReminder {
  id: string;
  patient_id: string;
  vaccine_name: string;
  next_due_date: string;
  reminder_status: string;
  patient?: { name: string };
}

export default function VaccinesPage() {
  const [allReminders, setAllReminders] = useState<VaccineReminder[]>([]);
  const [dueSoon, setDueSoon] = useState<VaccineReminder[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allRes, dueRes, patientsRes] = await Promise.all([
        api.get<VaccineReminder[]>('/vaccine/reminders'),
        api.get<VaccineReminder[]>('/vaccine/reminders/due', { params: { days: 30 } }),
        api.get<{ id: string; name: string }[]>('/patients'),
      ]);
      setAllReminders(Array.isArray(allRes.data) ? allRes.data : []);
      setDueSoon(Array.isArray(dueRes.data) ? dueRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch {
      message.error('Erro ao carregar lembretes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onFinish = async (values: { patient_id: string; vaccine_name: string; next_due_date: string }) => {
    try {
      await api.post('/vaccine/reminders', values);
      message.success('Lembrete criado');
      setModalOpen(false);
      form.resetFields();
      fetchAll();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao criar');
    }
  };

  const columns = [
    { title: 'Paciente', dataIndex: ['patient', 'name'], key: 'patient' },
    { title: 'Vacina', dataIndex: 'vaccine_name', key: 'vaccine_name' },
    { title: 'Próxima dose', dataIndex: 'next_due_date', key: 'next_due_date' },
    { title: 'Status', dataIndex: 'reminder_status', key: 'reminder_status' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
        <ExperimentOutlined /> Vacinas
      </h1>
      <Card>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} className="mb-4 bg-blue-600">
          Novo lembrete
        </Button>
        <Tabs
          items={[
            {
              key: 'due',
              label: 'Próximos 30 dias',
              children: (
                <Table
                  loading={loading}
                  dataSource={dueSoon}
                  rowKey="id"
                  columns={columns}
                  pagination={false}
                />
              ),
            },
            {
              key: 'all',
              label: 'Todos os lembretes',
              children: (
                <Table
                  loading={loading}
                  dataSource={allReminders}
                  rowKey="id"
                  columns={columns}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal title="Novo lembrete de vacina" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="patient_id" label="Paciente" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione"
              showSearch
              optionFilterProp="label"
              options={patients.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item name="vaccine_name" label="Vacina" rules={[{ required: true }]}>
            <Input placeholder="Ex.: Antirrábica" />
          </Form.Item>
          <Form.Item name="next_due_date" label="Próxima dose" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Criar</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
