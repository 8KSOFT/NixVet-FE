'use client';

import React from 'react';
import { Form, Input, Button, Card, message, Divider } from 'antd';
import { SettingOutlined, SaveOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/axios';
import axios from 'axios';
import { MaskedInput } from 'antd-mask-input';

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

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [formNewTenant] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [loadingCep, setLoadingCep] = React.useState(false);
  const [creatingTenant, setCreatingTenant] = React.useState(false);
  const [googleStatus, setGoogleStatus] = React.useState<{
    connected: boolean;
    accountEmail?: string;
    calendarId?: string;
  }>({ connected: false });
  const [googleCalendars, setGoogleCalendars] = React.useState<
    Array<{ id: string; summary: string; primary: boolean }>
  >([]);
  const [selectedCalendarId, setSelectedCalendarId] = React.useState<string>('primary');
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const currentRole = getCurrentUserRole();
  const isSuperAdmin = currentRole === 'superadmin';

  React.useEffect(() => {
    fetchSettings();
    fetchGoogleStatus();
  }, []);

  const fetchGoogleStatus = async () => {
    try {
      const statusRes = await api.get('/integrations/google/status');
      const status = statusRes.data || { connected: false };
      setGoogleStatus(status);
      if (status.connected) {
        const calendarsRes = await api.get('/integrations/google/calendars');
        const calendars = Array.isArray(calendarsRes.data) ? calendarsRes.data : [];
        setGoogleCalendars(calendars);
        setSelectedCalendarId(status.calendarId || 'primary');
      } else {
        setGoogleCalendars([]);
      }
    } catch {
      setGoogleStatus({ connected: false });
      setGoogleCalendars([]);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      setGoogleLoading(true);
      const response = await api.get('/integrations/google/connect');
      const url = response.data?.url;
      if (!url) {
        message.error('Não foi possível iniciar conexão Google');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      message.info('Após autorizar no Google, clique em "Atualizar Status".');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Erro ao conectar Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      setGoogleLoading(true);
      await api.post('/integrations/google/disconnect');
      message.success('Integração Google desconectada');
      await fetchGoogleStatus();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Erro ao desconectar Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSaveCalendar = async () => {
    try {
      setGoogleLoading(true);
      await api.put('/integrations/google/settings', {
        calendarId: selectedCalendarId,
        syncDirection: 'nixvet_to_google',
      });
      message.success('Calendário Google atualizado');
      await fetchGoogleStatus();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Erro ao salvar calendário');
    } finally {
      setGoogleLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenants/me');
      const data = response.data;

      let street = '';
      let number = '';
      let complement = '';
      let neighborhood = '';
      let city = '';
      let state = '';

      if (data.address) {
        const parts = data.address.split(' - ');

        if (parts.length >= 3) {
          const firstPart = parts[0].split(',');
          street = firstPart[0];
          number = firstPart[1] ? firstPart[1].trim() : '';

          if (parts.length >= 4) {
            complement = parts[1];
            neighborhood = parts[2];
            const cityState = parts[3].split('/');
            city = cityState[0];
            state = cityState[1] || '';
          } else {
            neighborhood = parts[1];
            const cityState = parts[2].split('/');
            city = cityState[0];
            state = cityState[1] || '';
          }
        }
      }

      form.setFieldsValue({
        clinicName: data.name,
        email: data.email,
        phone: data.phone,
        brandName: data.brand_name,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
        subdomain: data.subdomain,
        customDomain: data.custom_domain,
        cep: data.cep || '',
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleCepSearch = async () => {
    const cepValue = form.getFieldValue('cep');
    if (!cepValue) return;

    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) {
      message.warning('CEP inválido');
      return;
    }

    form.setFieldsValue({
      street: '',
      neighborhood: '',
      city: '',
      state: '',
    });

    setLoadingCep(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      if (response.data.erro) {
        message.error('CEP não encontrado');
        return;
      }

      const { logradouro, bairro, localidade, uf } = response.data;

      form.setFieldsValue({
        street: logradouro,
        neighborhood: bairro,
        city: localidade,
        state: uf,
      });
    } catch (error) {
      console.error('Error fetching CEP:', error);
      message.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const onFinish = async (values: any) => {
    try {
      message.loading({ content: 'Salvando configurações...', key: 'saving' });

      const fullAddress = values.street
        ? `${values.street}, ${values.number}${values.complement ? ` - ${values.complement}` : ''} - ${values.neighborhood} - ${values.city}/${values.state}`
        : values.address || '';

      await api.put('/tenants/me', {
        name: values.clinicName,
        email: values.email,
        phone: values.phone,
        brand_name: values.brandName,
        logo_url: values.logoUrl,
        primary_color: values.primaryColor,
        subdomain: values.subdomain,
        custom_domain: values.customDomain,
        address: fullAddress,
        cep: values.cep,
      });

      message.success({ content: 'Configurações salvas com sucesso!', key: 'saving' });
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error({ content: 'Erro ao salvar configurações', key: 'saving' });
    }
  };

  const onCreateTenant = async (values: {
    name: string;
    code: string;
    initialUserName?: string;
    initialUserEmail?: string;
    initialUserPassword?: string;
  }) => {
    if (!values.name?.trim() || !values.code?.trim()) {
      message.warning('Preencha nome e código');
      return;
    }
    setCreatingTenant(true);
    try {
      const payload: { name: string; code: string; initialUser?: { name: string; email: string; password: string } } = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
      };
      if (values.initialUserEmail?.trim() && values.initialUserPassword && values.initialUserName?.trim()) {
        payload.initialUser = {
          name: values.initialUserName.trim(),
          email: values.initialUserEmail.trim(),
          password: values.initialUserPassword,
        };
      }
      await api.post('/tenants', payload);
      message.success(
        payload.initialUser
          ? `Clínica "${values.name}" e usuário criados. Código: ${payload.code}`
          : `Clínica "${values.name}" criada. Código para login: ${payload.code}`,
      );
      formNewTenant.resetFields();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Erro ao criar clínica';
      message.error(msg);
    } finally {
      setCreatingTenant(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2 mb-6">
        <SettingOutlined /> Configurações
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Dados da Clínica" className="shadow-sm">
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item name="clinicName" label="Nome da Clínica">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email de Contato">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Telefone">
              <Input />
            </Form.Item>
            <Form.Item name="brandName" label="Nome da marca (white-label)">
              <Input placeholder="Ex: Vixen Vet" />
            </Form.Item>
            <Form.Item name="logoUrl" label="URL do logo">
              <Input placeholder="https://cdn.empresa.com/logo.png" />
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="primaryColor" label="Cor principal">
                <Input placeholder="#2563eb" />
              </Form.Item>
              <Form.Item name="subdomain" label="Subdomínio">
                <Input placeholder="vixen" />
              </Form.Item>
            </div>
            <Form.Item name="customDomain" label="Domínio customizado (opcional)">
              <Input placeholder="app.empresa.com.br" />
            </Form.Item>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <Form.Item label="CEP">
                  <div className="flex gap-2">
                    <Form.Item name="cep" noStyle>
                      <MaskedInput mask="00000-000" disabled={loadingCep} className="w-full" />
                    </Form.Item>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleCepSearch}
                      disabled={loadingCep}
                      className="bg-blue-600"
                    />
                  </div>
                </Form.Item>
              </div>
              <div className="col-span-2">
                <div className="grid grid-cols-3 gap-2">
                  <Form.Item name="street" label="Logradouro" className="col-span-2">
                    <Input placeholder="Rua, Av, etc" />
                  </Form.Item>
                  <Form.Item name="number" label="Número">
                    <Input placeholder="123" />
                  </Form.Item>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Form.Item name="complement" label="Complemento">
                <Input placeholder="Apto 101" />
              </Form.Item>
              <Form.Item name="neighborhood" label="Bairro">
                <Input />
              </Form.Item>
              <Form.Item name="city" label="Cidade">
                <Input />
              </Form.Item>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Form.Item name="state" label="UF">
                <Input maxLength={2} />
              </Form.Item>
            </div>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} className="bg-blue-600">
                Salvar Alterações
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Integração Google Agenda" className="shadow-sm">
          <div className="flex flex-col gap-3">
            <div>
              <h4 className="font-bold text-gray-700">Status</h4>
              <p className="text-gray-500">
                {googleStatus.connected
                  ? `Conectado${googleStatus.accountEmail ? ` (${googleStatus.accountEmail})` : ''}`
                  : 'Desconectado'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="primary" onClick={handleGoogleConnect} loading={googleLoading} className="bg-blue-600">
                Conectar Google
              </Button>
              <Button onClick={fetchGoogleStatus} loading={googleLoading}>
                Atualizar Status
              </Button>
              {googleStatus.connected && (
                <Button danger onClick={handleGoogleDisconnect} loading={googleLoading}>
                  Desconectar
                </Button>
              )}
            </div>
            {googleStatus.connected && (
              <>
                <Divider />
                <div className="flex gap-2">
                  <Input
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    placeholder="ID do calendário (ex: primary)"
                  />
                  <Button onClick={handleGoogleSaveCalendar} loading={googleLoading} type="primary" className="bg-blue-600">
                    Salvar calendário
                  </Button>
                </div>
                {googleCalendars.length > 0 && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Disponíveis: {googleCalendars.map((c) => c.summary).join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <Card title="Sistema" className="shadow-sm md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-10 gap-4">
            <div>
              <h4 className="font-bold text-gray-700">Versão do Sistema</h4>
              <p className="text-gray-500">v1.0.0</p>
            </div>
            <div className="sm:border-l sm:border-gray-200 sm:pl-10 flex-1 min-w-0">
              <h4 className="font-bold text-gray-700">Tenant ID</h4>
              <p className="text-gray-500 font-mono text-xs bg-gray-100 p-2 rounded break-all mt-1">
                {typeof window !== 'undefined' ? localStorage.getItem('tenantId') : 'Loading...'}
              </p>
            </div>
          </div>
        </Card>

        {isSuperAdmin && (
          <Card title="Nova clínica (para testes)" className="shadow-sm md:col-span-2">
            <p className="text-gray-500 mb-4">
              Crie uma clínica para usuários testarem. Informe o <strong>código</strong> na tela de login. Opcional: cadastre o primeiro usuário (admin) da clínica.
            </p>
            <Form form={formNewTenant} layout="vertical" onFinish={onCreateTenant} className="max-w-md">
              <Form.Item name="name" label="Nome da clínica" rules={[{ required: true, message: 'Obrigatório' }]}>
                <Input placeholder="Ex: Clínica Teste" />
              </Form.Item>
              <Form.Item name="code" label="Código (usado no login)" rules={[{ required: true, message: 'Obrigatório' }]}>
                <Input placeholder="Ex: TESTE" />
              </Form.Item>
              <Divider plain>Primeiro usuário (opcional)</Divider>
              <Form.Item name="initialUserName" label="Nome do usuário">
                <Input placeholder="Ex: Admin Teste" />
              </Form.Item>
              <Form.Item name="initialUserEmail" label="Email">
                <Input type="email" placeholder="Ex: admin@teste.com" />
              </Form.Item>
              <Form.Item name="initialUserPassword" label="Senha">
                <Input.Password placeholder="Senha de acesso" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={creatingTenant} className="bg-blue-600">
                  Criar clínica
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
