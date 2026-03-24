'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Alert, Select, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/axios';
import { getApiBaseUrl } from '@/lib/api-base';

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
  const twilioWebhookUrl = `${getApiBaseUrl()}/whatsapp/webhook`;

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

  const twilioWebhookSetup = (
    <Alert
      type="warning"
      showIcon
      className="mb-4"
      message="Se o WhatsApp respondeu com “Configure your Sandbox Inbound URL”"
      description={
        <div className="text-sm space-y-2">
          <p className="mb-0">
            O Twilio <strong>não está chamando a API do NixVet</strong>. No console Twilio → <strong>Messaging</strong> →{' '}
            <strong>Try it out / Sandbox</strong> (ou seu número WhatsApp) → <strong>“When a message comes in”</strong>,{' '}
            configure:
          </p>
          <ul className="list-disc pl-5 m-0 space-y-1">
            <li>
              <strong>Método:</strong> HTTP POST
            </li>
            <li>
              <strong>URL:</strong>{' '}
              <code className="text-xs break-all bg-amber-50 px-1 py-0.5 rounded">{twilioWebhookUrl}</code>
            </li>
          </ul>
          <p className="text-slate-700 mb-0">
            A URL precisa ser <strong>pública HTTPS</strong> (Twilio não alcança <code>localhost</code>). Em desenvolvimento use
            túnel (ngrok, Cloudflare Tunnel, etc.) apontando para a API. Depois de salvar no Twilio, envie outra mensagem de
            teste.
          </p>
        </div>
      }
    />
  );

  const twilioClinicGuide = (
    <Alert
      type="info"
      showIcon
      className="mb-4"
      message="Cadastro para a clínica (sem Meta / Facebook Business)"
      description={
        <div className="text-sm space-y-2">
          <p>
            Você <strong>não precisa</strong> de conta no Meta Business. A integração técnica (Twilio + servidor) fica a
            cargo da <strong>equipe que opera o NixVet</strong>.
          </p>
          <ol className="list-decimal pl-4 space-y-1 m-0">
            <li>
              <strong>Código da clínica</strong> — identificador único no sistema (ex.: <code>clinica-centro</code>). Não é
              telefone.
            </li>
            <li>
              <strong>Número no cadastro (campo “Número do WhatsApp”) — deve bater com o que o Twilio envia no campo To</strong>
              : no <strong>Sandbox</strong>, o destino (To) é <em>sempre</em> o número do sandbox da Twilio, em geral{' '}
              <code>14155238886</code> (só dígitos, com DDI 1). Não use aqui o celular da sua clínica enquanto estiver no
              sandbox. Em <strong>produção</strong>, com número WhatsApp Business aprovado na Twilio, use os dígitos do
              número que aparece como <strong>To</strong> nas mensagens recebidas no Twilio.
            </li>
            <li>
              <strong>Access token</strong> — pode ficar <code>n/a</code>.
            </li>
          </ol>
          <p className="text-slate-600 mb-0">
            Envio pelo sistema usa <code>TWILIO_WHATSAPP_FROM</code> no servidor. O cadastro aqui roteia{' '}
            <strong>mensagens de entrada</strong> para o tenant certo.
          </p>
        </div>
      }
    />
  );

  const twilioHelp = (
    <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
      Credenciais Twilio (<code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>,{' '}
      <code>TWILIO_WHATSAPP_FROM</code>) ficam no servidor. O webhook de entrada deve ser a URL acima (POST).
    </Typography.Paragraph>
  );

  const metaHelp = (
    <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
      Modo Meta: é necessário <strong>WhatsApp Cloud API</strong> (Meta Business): <strong>Phone number ID</strong> e{' '}
      <strong>token de acesso</strong> reais. Webhook da Meta na URL pública da API; verify token ={' '}
      <code>WHATSAPP_VERIFY_TOKEN</code> no servidor.
    </Typography.Paragraph>
  );

  const openRegisterModal = () => {
    form.resetFields();
    if (provider === 'twilio') {
      form.setFieldsValue({ access_token: 'n/a' });
    }
    setModalOpen(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-2">WhatsApp da clínica</h1>
      <p className="text-slate-600 mb-6">
        Cadastro do número desta clínica para <strong>receber</strong> conversas no NixVet e o sistema saber qual
        clínica é cada linha. Quem não usa Meta vai pelo modo <strong>Twilio</strong> (definido no servidor).
      </p>

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
          Cada clínica vê e edita só o próprio cadastro (isolado por tenant).
        </p>
        {provider === 'twilio' ? twilioWebhookSetup : null}
        {provider === 'twilio' ? twilioClinicGuide : null}
        {provider === 'twilio' ? twilioHelp : metaHelp}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openRegisterModal}
          className="mb-4 mt-4 bg-blue-600"
        >
          {provider === 'twilio' ? 'Cadastrar número da clínica' : 'Cadastrar número (Meta)'}
        </Button>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            {
              title: provider === 'twilio' ? 'Código interno' : 'Phone number ID (Meta)',
              dataIndex: 'phone_number_id',
              key: 'phone_number_id',
            },
            {
              title: provider === 'twilio' ? 'To (Twilio) / matching' : 'Número / exibição',
              dataIndex: 'display_phone',
              key: 'display_phone',
            },
            ...(provider === 'meta'
              ? [{ title: 'WABA ID', dataIndex: 'waba_id', key: 'waba_id' as const }]
              : []),
            { title: 'Ativo', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => (v ? 'Sim' : 'Não') },
          ]}
        />
      </Card>

      <Modal
        title={provider === 'twilio' ? 'Cadastrar WhatsApp da clínica' : 'Cadastrar número (Meta / Cloud API)'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="phone_number_id"
            label={provider === 'twilio' ? 'Código interno da clínica' : 'Phone number ID (Meta)'}
            rules={[{ required: true, message: 'Obrigatório' }]}
            extra={
              provider === 'twilio'
                ? 'Texto único para o sistema, ex.: clinica-jardins (não é o telefone).'
                : 'ID do número na API do Meta.'
            }
          >
            <Input placeholder={provider === 'twilio' ? 'ex.: clinica-jardins' : 'ID do número na API do Meta'} />
          </Form.Item>
          <Form.Item
            name="access_token"
            label={provider === 'twilio' ? 'Token (pode ignorar neste modo)' : 'Access token (Meta)'}
            rules={[{ required: true, message: 'Obrigatório' }]}
            extra={
              provider === 'twilio'
                ? 'Deixe n/a — a clínica não usa token Meta; o servidor usa Twilio.'
                : 'Token de acesso permanente ou de curta duração da Cloud API.'
            }
          >
            <Input.Password placeholder={provider === 'twilio' ? 'n/a' : 'Token de acesso Meta'} />
          </Form.Item>
          {provider === 'meta' ? (
            <Form.Item name="waba_id" label="WABA ID (opcional)">
              <Input placeholder="WhatsApp Business Account ID" />
            </Form.Item>
          ) : null}
          <Form.Item
            name="display_phone"
            label={
              provider === 'twilio'
                ? 'Número destino (To) — Twilio'
                : 'Número para exibição (opcional)'
            }
            rules={provider === 'twilio' ? [{ required: true, message: 'Obrigatório' }] : undefined}
            extra={
              provider === 'twilio'
                ? 'Sandbox: use 14155238886 (número do sandbox Twilio). Produção: dígitos do To nas mensagens no painel Twilio.'
                : 'Ex.: +55 11 99999-9999'
            }
          >
            <Input placeholder={provider === 'twilio' ? '14155238886' : '+55 11 99999-9999'} />
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
