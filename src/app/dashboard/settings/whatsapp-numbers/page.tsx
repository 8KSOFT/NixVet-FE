'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Alert, Select, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface WhatsappNumberRow {
  id: string;
  phone_number_id: string;
  waba_id: string | null;
  display_phone: string | null;
  is_active: boolean;
}

interface IntegrationConfig {
  effectiveProvider: 'meta' | 'twilio';
  envProvider: 'meta' | 'twilio';
  source: 'database' | 'environment';
}

function getCurrentUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return user?.role ?? null;
  } catch {
    return null;
  }
}

export default function SettingsWhatsappNumbersPage() {
  const [list, setList] = useState<WhatsappNumberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [integration, setIntegration] = useState<IntegrationConfig | null>(null);
  const [providerSaving, setProviderSaving] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<'meta' | 'twilio' | 'inherit'>('inherit');

  const currentRole = getCurrentUserRole();
  const isSuperAdmin = currentRole === 'superadmin';
  const provider = integration?.effectiveProvider ?? 'meta';

  const fetchIntegration = async () => {
    try {
      const res = await api.get<IntegrationConfig>('/whatsapp/integration-config');
      setIntegration(res.data);
      setSelectedOverride(
        res.data.source === 'database' ? res.data.effectiveProvider : 'inherit',
      );
    } catch {
      setIntegration(null);
    }
  };

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
    fetchIntegration();
  }, []);

  const saveProviderOverride = async () => {
    setProviderSaving(true);
    try {
      const res = await api.put<IntegrationConfig>('/whatsapp/integration-config', {
        provider: selectedOverride,
      });
      setIntegration(res.data);
      message.success('Provedor WhatsApp atualizado');
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar provedor');
    } finally {
      setProviderSaving(false);
    }
  };

  const onFinish = async (values: {
    phone_number_id: string;
    access_token: string;
    waba_id?: string;
    display_phone?: string;
  }) => {
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

  const twilioHelp = (
    <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
      Com Twilio ativo, o envio usa <strong>TWILIO_ACCOUNT_SID</strong>, <strong>TWILIO_AUTH_TOKEN</strong> e{' '}
      <strong>TWILIO_WHATSAPP_FROM</strong> no servidor. No cadastro abaixo, use um ID interno único (ex.{' '}
      <code>twilio-vixenvet</code>) e em <strong>Número para exibição</strong> o mesmo número WhatsApp que o Twilio
      recebe no webhook (campo &quot;To&quot;), só dígitos com DDI. Access token pode ser um placeholder (ex.{' '}
      <code>n/a</code>) — o Twilio não usa o token por clínica neste modo.
    </Typography.Paragraph>
  );

  const metaHelp = (
    <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
      Com Meta ativo, use o <strong>Phone number ID</strong> e o <strong>Access token</strong> reais do app WhatsApp
      Cloud API. O webhook da Meta deve apontar para a URL pública da API; o verify token deve coincidir com{' '}
      <code>WHATSAPP_VERIFY_TOKEN</code> no servidor.
    </Typography.Paragraph>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">WhatsApp — Números</h1>

      {integration && (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message={
            <span>
              Provedor ativo: <strong>{integration.effectiveProvider === 'twilio' ? 'Twilio' : 'Meta'}</strong>
              {integration.source === 'database' ? (
                <span className="text-slate-600"> (definido no painel — superadmin)</span>
              ) : (
                <span className="text-slate-600"> (definido no servidor — WHATSAPP_PROVIDER)</span>
              )}
            </span>
          }
          description={
            <span className="text-sm text-slate-600">
              Valor no .env: <code>{integration.envProvider}</code>
            </span>
          }
        />
      )}

      {isSuperAdmin && (
        <Card title="Provedor WhatsApp (superadmin)" className="mb-4" size="small">
          <Space direction="vertical" className="w-full max-w-md">
            <Typography.Text type="secondary">
              Sobrescreve <code>WHATSAPP_PROVIDER</code> do ambiente para toda a instalação. Use &quot;Herdar do
              servidor&quot; para voltar ao .env.
            </Typography.Text>
            <Select
              className="w-full"
              value={selectedOverride}
              onChange={(v) => setSelectedOverride(v)}
              options={[
                { value: 'inherit', label: 'Herdar do servidor (.env)' },
                { value: 'meta', label: 'Forçar Meta' },
                { value: 'twilio', label: 'Forçar Twilio' },
              ]}
            />
            <Button type="primary" loading={providerSaving} onClick={saveProviderOverride} className="bg-blue-600">
              Salvar provedor
            </Button>
          </Space>
        </Card>
      )}

      <Card>
        <p className="text-slate-600 mb-2">
          Cadastre a linha WhatsApp desta clínica. Os dados ficam no banco, isolados por tenant (cada clínica vê só os
          seus).
        </p>
        {provider === 'twilio' ? twilioHelp : metaHelp}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          className="mb-4 mt-4 bg-blue-600"
        >
          Cadastrar número
        </Button>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            {
              title: provider === 'twilio' ? 'ID interno' : 'Phone number ID',
              dataIndex: 'phone_number_id',
              key: 'phone_number_id',
            },
            { title: 'Exibição / matching Twilio', dataIndex: 'display_phone', key: 'display_phone' },
            { title: 'WABA ID', dataIndex: 'waba_id', key: 'waba_id' },
            { title: 'Ativo', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => (v ? 'Sim' : 'Não') },
          ]}
        />
      </Card>

      <Modal title="Cadastrar número WhatsApp" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="phone_number_id"
            label={provider === 'twilio' ? 'ID interno (único por clínica)' : 'Phone number ID (Meta)'}
            rules={[{ required: true }]}
            extra={
              provider === 'twilio'
                ? 'Ex.: twilio-vixenvet — não é o telefone do tutor.'
                : 'ID do número na API do Meta.'
            }
          >
            <Input placeholder={provider === 'twilio' ? 'twilio-vixenvet' : 'ID do número na API do Meta'} />
          </Form.Item>
          <Form.Item
            name="access_token"
            label="Access token"
            rules={[{ required: true }]}
            extra={provider === 'twilio' ? 'Twilio: pode usar n/a (não usado para envio neste modo).' : undefined}
          >
            <Input.Password placeholder={provider === 'twilio' ? 'n/a' : 'Token de acesso Meta'} />
          </Form.Item>
          <Form.Item name="waba_id" label="WABA ID (opcional)">
            <Input placeholder="WhatsApp Business Account ID" />
          </Form.Item>
          <Form.Item
            name="display_phone"
            label={provider === 'twilio' ? 'Número WhatsApp da clínica (Twilio "To")' : 'Número para exibição (opcional)'}
            extra={
              provider === 'twilio'
                ? 'Mesmo número que o Twilio mostra em To ao receber mensagem (com DDI, pode formatar).'
                : 'Ex.: +55 11 99999-9999'
            }
          >
            <Input placeholder="+55 11 99999-9999" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">
              Cadastrar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
