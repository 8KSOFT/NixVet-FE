'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface Resource {
  id: string;
  name: string;
  type: string;
}

const TYPES = [
  { value: 'room', label: 'Sala' },
  { value: 'surgery_room', label: 'Sala cirúrgica' },
  { value: 'equipment', label: 'Equipamento' },
];

export default function SettingsResourcesPage() {
  const [list, setList] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get<Resource[]>('/resources');
      setList(res.data ?? []);
    } catch {
      message.error('Erro ao carregar recursos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const onFinish = async (values: { name: string; type: string }) => {
    try {
      await api.post('/resources', values);
      message.success('Recurso cadastrado');
      setModalOpen(false);
      form.resetFields();
      fetchList();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Recursos</h1>
      <Card>
        <p className="text-slate-600 mb-4">Salas e equipamentos para agendamento (opcional na agenda).</p>
        <Space className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} className="bg-blue-600">
            Novo recurso
          </Button>
        </Space>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            { title: 'Nome', dataIndex: 'name', key: 'name' },
            {
              title: 'Tipo',
              dataIndex: 'type',
              key: 'type',
              render: (t: string) => TYPES.find((x) => x.value === t)?.label ?? t,
            },
          ]}
        />
      </Card>

      <Modal title="Novo recurso" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Ex.: Sala 1, Raio-X" />
          </Form.Item>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select options={TYPES} placeholder="Selecione" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Salvar</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
