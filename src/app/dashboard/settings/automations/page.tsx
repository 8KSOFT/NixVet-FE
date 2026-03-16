'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface WorkflowConfig {
  id: string;
  event_name: string;
  action_type: string;
  delay_minutes: number;
  channel: string | null;
  template_message: string | null;
  description: string | null;
  is_active: boolean;
}

const ACTION_TYPES = [
  { value: 'send_whatsapp', label: 'Enviar WhatsApp' },
  { value: 'send_email', label: 'Enviar e-mail' },
  { value: 'create_task', label: 'Criar tarefa' },
  { value: 'create_notification', label: 'Criar notificação' },
];

export default function SettingsAutomationsPage() {
  const [list, setList] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get<WorkflowConfig[]>('/workflow-configs');
      setList(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Erro ao carregar automações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const onFinish = async (values: any) => {
    try {
      await api.post('/workflow-configs', {
        event_name: values.event_name,
        action_type: values.action_type,
        delay_minutes: Number(values.delay_minutes) || 0,
        channel: values.channel || undefined,
        template_message: values.template_message || undefined,
        description: values.description || undefined,
        is_active: values.is_active !== false,
      });
      message.success('Regra salva');
      setModalOpen(false);
      form.resetFields();
      fetchList();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/workflow-configs/${id}`);
      message.success('Removido');
      fetchList();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Automações</h1>
      <Card>
        <p className="text-slate-600 mb-4">Regras por evento (ex.: ao criar consulta → enviar lembrete WhatsApp).</p>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} className="mb-4 bg-blue-600">
          Nova regra
        </Button>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            { title: 'Evento', dataIndex: 'event_name', key: 'event_name' },
            { title: 'Ação', dataIndex: 'action_type', key: 'action_type' },
            { title: 'Atraso (min)', dataIndex: 'delay_minutes', key: 'delay_minutes', width: 100 },
            { title: 'Canal', dataIndex: 'channel', key: 'channel' },
            { title: 'Ativo', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => (v ? 'Sim' : 'Não') },
            {
              title: 'Ações',
              key: 'actions',
              width: 80,
              render: (_: any, r: WorkflowConfig) => (
                <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
              ),
            },
          ]}
        />
      </Card>

      <Modal title="Nova regra de automação" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="event_name" label="Nome do evento" rules={[{ required: true }]}>
            <Input placeholder="Ex.: consultation.created.v1" />
          </Form.Item>
          <Form.Item name="action_type" label="Tipo de ação" rules={[{ required: true }]}>
            <Select options={ACTION_TYPES} placeholder="Selecione" />
          </Form.Item>
          <Form.Item name="delay_minutes" label="Atraso (minutos)" rules={[{ required: true }]} initialValue={0}>
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item name="channel" label="Canal">
            <Input placeholder="Ex.: whatsapp" />
          </Form.Item>
          <Form.Item name="template_message" label="Mensagem modelo">
            <Input.TextArea rows={2} placeholder="Texto da mensagem (placeholders conforme evento)" />
          </Form.Item>
          <Form.Item name="description" label="Descrição">
            <Input placeholder="Descrição da regra" />
          </Form.Item>
          <Form.Item name="is_active" label="Ativo" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Salvar</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
