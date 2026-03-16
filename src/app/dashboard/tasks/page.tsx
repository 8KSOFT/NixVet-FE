'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Tag } from 'antd';
import { CheckOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface ClinicalTask {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  task_type: string;
  due_date: string | null;
  status: string;
  Patient?: { name: string };
}

export default function TasksPage() {
  const [list, setList] = useState<ClinicalTask[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, patientsRes] = await Promise.all([
        api.get<ClinicalTask[]>('/clinical-tasks'),
        api.get<{ id: string; name: string }[]>('/patients'),
      ]);
      setList(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch {
      message.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onFinish = async (values: { patient_id: string; task_type: string; due_date?: string }) => {
    try {
      await api.post('/clinical-tasks', values);
      message.success('Tarefa criada');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao criar');
    }
  };

  const markDone = async (id: string) => {
    try {
      await api.put(`/clinical-tasks/${id}/status`, { status: 'completed' });
      message.success('Tarefa concluída');
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro');
    }
  };

  const pending = list.filter((t) => t.status !== 'completed');
  const completed = list.filter((t) => t.status === 'completed');

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
        <UnorderedListOutlined /> Tarefas clínicas
      </h1>
      <Card>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} className="mb-4 bg-blue-600">
          Nova tarefa
        </Button>
        <Table
          loading={loading}
          dataSource={pending}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Paciente', dataIndex: ['Patient', 'name'], key: 'patient' },
            { title: 'Tipo', dataIndex: 'task_type', key: 'task_type' },
            { title: 'Vencimento', dataIndex: 'due_date', key: 'due_date' },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag>{s}</Tag> },
            {
              title: 'Ações',
              key: 'actions',
              render: (_: any, r: ClinicalTask) => (
                <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => markDone(r.id)}>
                  Concluir
                </Button>
              ),
            },
          ]}
        />
        {completed.length > 0 && (
          <>
            <h3 className="font-medium text-slate-700 mt-6 mb-2">Concluídas</h3>
            <Table
              dataSource={completed}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Paciente', dataIndex: ['Patient', 'name'], key: 'patient' },
                { title: 'Tipo', dataIndex: 'task_type', key: 'task_type' },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="green">{s}</Tag> },
              ]}
            />
          </>
        )}
      </Card>

      <Modal title="Nova tarefa" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="patient_id" label="Paciente" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione"
              options={patients.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item name="task_type" label="Tipo" rules={[{ required: true }]}>
            <Input placeholder="Ex.: Retorno, Ligar para tutor" />
          </Form.Item>
          <Form.Item name="due_date" label="Vencimento">
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
