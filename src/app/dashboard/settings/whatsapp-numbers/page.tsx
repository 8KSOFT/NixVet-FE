'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface WhatsappNumberRow {
  id: string;
  phone_number_id: string;
  waba_id: string | null;
  display_phone: string | null;
  is_active: boolean;
}

export default function SettingsWhatsappNumbersPage() {
  const [list, setList] = useState<WhatsappNumberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get<WhatsappNumberRow[]>('/whatsapp/numbers');
      setList(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Erro ao carregar números');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const onFinish = async (values: { phone_number_id: string; access_token: string; waba_id?: string; display_phone?: string }) => {
    try {
      await api.post('/whatsapp/numbers', values);
      message.success('Número cadastrado');
      setModalOpen(false);
      form.resetFields();
      fetchList();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao cadastrar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">WhatsApp — Números</h1>
      <Card>
        <p className="text-slate-600 mb-4">Cadastre os números/conta WhatsApp Business da clínica para receber e enviar mensagens.</p>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} className="mb-4 bg-blue-600">
          Cadastrar número
        </Button>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            { title: 'Phone number ID', dataIndex: 'phone_number_id', key: 'phone_number_id' },
            { title: 'Exibição', dataIndex: 'display_phone', key: 'display_phone' },
            { title: 'WABA ID', dataIndex: 'waba_id', key: 'waba_id' },
            { title: 'Ativo', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => (v ? 'Sim' : 'Não') },
          ]}
        />
      </Card>

      <Modal title="Cadastrar número WhatsApp" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="phone_number_id" label="Phone number ID (Meta)" rules={[{ required: true }]}>
            <Input placeholder="ID do número na API do Meta" />
          </Form.Item>
          <Form.Item name="access_token" label="Access token" rules={[{ required: true }]}>
            <Input.Password placeholder="Token de acesso" />
          </Form.Item>
          <Form.Item name="waba_id" label="WABA ID (opcional)">
            <Input placeholder="WhatsApp Business Account ID" />
          </Form.Item>
          <Form.Item name="display_phone" label="Número para exibição (opcional)">
            <Input placeholder="Ex.: +55 11 99999-9999" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Cadastrar</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
