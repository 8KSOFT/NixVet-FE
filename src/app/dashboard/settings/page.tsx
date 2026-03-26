'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Settings, Save, Search, Plus, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import axios from 'axios';
import { formatCepMask } from '@/lib/format-cep';

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

interface ClinicFormValues {
  clinicName: string;
  email: string;
  phone: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  subdomain: string;
  customDomain: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface TenantFormValues {
  name: string;
  code: string;
  initialUserName?: string;
  initialUserEmail?: string;
  initialUserPassword?: string;
}

export default function SettingsPage() {
  const { register, setValue, getValues, handleSubmit } = useForm<ClinicFormValues>();
  const {
    register: registerTenant,
    handleSubmit: handleSubmitTenant,
    reset: resetTenant,
  } = useForm<TenantFormValues>();

  const [loading, setLoading] = React.useState(false);
  const [loadingCep, setLoadingCep] = React.useState(false);
  const [creatingTenant, setCreatingTenant] = React.useState(false);
  const [googleStatus, setGoogleStatus] = React.useState<{
    connected: boolean;
    accountEmail?: string;
    calendarId?: string;
    syncDirection?: string;
    lastSyncAt?: string | null;
  }>({ connected: false });
  const [googleCalendars, setGoogleCalendars] = React.useState<
    Array<{ id: string; summary: string; primary: boolean }>
  >([]);
  const [selectedCalendarId, setSelectedCalendarId] = React.useState<string>('primary');
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const currentRole = getCurrentUserRole();
  const isSuperAdmin = currentRole === 'superadmin';
  const canManageChatbot = currentRole === 'admin' || currentRole === 'manager' || isSuperAdmin;
  const [chatbotEnabled, setChatbotEnabled] = React.useState(false);
  const [chatbotSaving, setChatbotSaving] = React.useState(false);

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
        const savedId = status.calendarId || 'primary';
        const validIds = calendars.map((c: { id: string }) => c.id);
        const resolvedId = validIds.includes(savedId) ? savedId : (calendars.find((c: { primary?: boolean }) => c.primary)?.id || 'primary');
        setSelectedCalendarId(resolvedId);
        setSyncDirection(status.syncDirection || 'both');
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
        toast.error('Não foi possível iniciar conexão Google');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.info('Após autorizar no Google, clique em "Atualizar Status".');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao conectar Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      setGoogleLoading(true);
      await api.post('/integrations/google/disconnect');
      toast.success('Integração Google desconectada');
      await fetchGoogleStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao desconectar Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const [syncDirection, setSyncDirection] = React.useState('both');
  const [forceSyncing, setForceSyncing] = React.useState(false);

  const handleGoogleSaveCalendar = async () => {
    try {
      setGoogleLoading(true);
      await api.put('/integrations/google/settings', {
        calendarId: selectedCalendarId,
        syncDirection,
      });
      toast.success('Configurações do Google atualizadas');
      await fetchGoogleStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForceSync = async () => {
    setForceSyncing(true);
    try {
      await api.post('/integrations/google/force-sync');
      toast.success('Sincronização executada');
      await fetchGoogleStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao sincronizar');
    } finally {
      setForceSyncing(false);
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

      setValue('clinicName', data.name ?? '');
      setValue('email', data.email ?? '');
      setValue('phone', data.phone ?? '');
      setValue('brandName', data.brand_name ?? '');
      setValue('logoUrl', data.logo_url ?? '');
      setValue('primaryColor', data.primary_color ?? '');
      setValue('subdomain', data.subdomain ?? '');
      setValue('customDomain', data.custom_domain ?? '');
      setValue('cep', formatCepMask(data.cep) ?? '');
      setValue('street', street);
      setValue('number', number);
      setValue('complement', complement);
      setValue('neighborhood', neighborhood);
      setValue('city', city);
      setValue('state', state);
      setChatbotEnabled(Boolean(data.whatsapp_ai_chatbot_enabled));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleCepSearch = async () => {
    const cepValue = getValues('cep');
    if (!cepValue) return;

    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.warning('CEP inválido');
      return;
    }

    setValue('street', '');
    setValue('neighborhood', '');
    setValue('city', '');
    setValue('state', '');

    setLoadingCep(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      if (response.data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      const { logradouro, bairro, localidade, uf } = response.data;
      setValue('street', logradouro);
      setValue('neighborhood', bairro);
      setValue('city', localidade);
      setValue('state', uf);
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const onFinish = async (values: ClinicFormValues) => {
    try {
      toast.loading('Salvando configurações...', { id: 'saving' });
      const fullAddress = values.street
        ? `${values.street}, ${values.number}${values.complement ? ` - ${values.complement}` : ''} - ${values.neighborhood} - ${values.city}/${values.state}`
        : '';
      const payload: Record<string, unknown> = {
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
      };
      await api.put('/tenants/me', payload);
      toast.success('Configurações salvas com sucesso!', { id: 'saving' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações', { id: 'saving' });
    }
  };

  const onCreateTenant = async (values: TenantFormValues) => {
    if (!values.name?.trim() || !values.code?.trim()) {
      toast.warning('Preencha nome e código');
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
      toast.success(
        payload.initialUser
          ? `Clínica "${values.name}" e usuário criados. Código: ${payload.code}`
          : `Clínica "${values.name}" criada. Código para login: ${payload.code}`,
      );
      resetTenant();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao criar clínica');
    } finally {
      setCreatingTenant(false);
    }
  };

  const saveChatbotToggle = async (enabled: boolean) => {
    setChatbotSaving(true);
    try {
      await api.put('/tenants/me', { whatsapp_ai_chatbot_enabled: enabled });
      setChatbotEnabled(enabled);
      toast.success(enabled ? 'Chatbot de IA ativado' : 'Chatbot de IA desativado');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setChatbotSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" /> Configurações
      </h1>

      {canManageChatbot && (
        <Card className="mb-6 shadow-sm border-blue-200 bg-gradient-to-br from-blue-50/80 to-white">
          <CardHeader>
            <CardTitle className="text-blue-800 font-semibold text-base">
              Chatbot WhatsApp — respostas automáticas com IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Switch
                  checked={chatbotEnabled}
                  disabled={chatbotSaving}
                  onCheckedChange={(v) => void saveChatbotToggle(v)}
                />
                {chatbotSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <span className="font-semibold">{chatbotEnabled ? 'Ativo' : 'Desativado'}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-0">
                Quando <strong>ativo</strong>, cada mensagem de texto recebida no WhatsApp pode receber uma resposta
                gerada pela IA (após classificação). Requer <code className="text-xs">OPENAI_API_KEY</code> e worker da
                fila de IA no servidor. Casos de emergência usam texto fixo. Quem não é gestor/admin não vê esta opção.
              </p>
              <a
                href="/dashboard/chatbot-workflows"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
              >
                Configurar Workflow Visual do Chatbot →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Dados da Clínica</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onFinish)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Nome da Clínica</Label>
                <Input {...register('clinicName')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email de Contato</Label>
                <Input {...register('email')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Telefone</Label>
                <Input {...register('phone')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Nome da marca (white-label)</Label>
                <Input {...register('brandName')} placeholder="Ex: Vixen Vet" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>URL do logo</Label>
                <Input {...register('logoUrl')} placeholder="https://cdn.empresa.com/logo.png" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Cor principal</Label>
                  <Input {...register('primaryColor')} placeholder="#2563eb" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Subdomínio</Label>
                  <Input {...register('subdomain')} placeholder="vixen" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Domínio customizado (opcional)</Label>
                <Input {...register('customDomain')} placeholder="app.empresa.com.br" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex flex-col gap-1.5">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input {...register('cep')} disabled={loadingCep} placeholder="00000-000" className="flex-1" />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleCepSearch}
                      disabled={loadingCep}
                      className="bg-blue-600"
                    >
                      {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <Label>Logradouro</Label>
                      <Input {...register('street')} placeholder="Rua, Av, etc" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Número</Label>
                      <Input {...register('number')} placeholder="123" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Complemento</Label>
                  <Input {...register('complement')} placeholder="Apto 101" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Bairro</Label>
                  <Input {...register('neighborhood')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Cidade</Label>
                  <Input {...register('city')} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>UF</Label>
                  <Input {...register('state')} maxLength={2} />
                </div>
              </div>

              <div>
                <Button type="submit" className="bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Integração Google Agenda</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Button onClick={handleGoogleConnect} disabled={googleLoading} className="bg-blue-600">
                  {googleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Conectar Google
                </Button>
                <Button variant="outline" onClick={fetchGoogleStatus} disabled={googleLoading}>
                  {googleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Atualizar Status
                </Button>
                {googleStatus.connected && (
                  <Button variant="destructive" onClick={handleGoogleDisconnect} disabled={googleLoading}>
                    Desconectar
                  </Button>
                )}
              </div>
              {googleStatus.connected && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <div>
                      <Label className="text-sm font-semibold">Calendário</Label>
                      {googleCalendars.length > 0 ? (
                        <select
                          className="w-full border rounded px-3 py-2 text-sm mt-1"
                          value={selectedCalendarId}
                          onChange={(e) => setSelectedCalendarId(e.target.value)}
                        >
                          {googleCalendars.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.summary}{c.primary ? ' (principal)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={selectedCalendarId}
                          onChange={(e) => setSelectedCalendarId(e.target.value)}
                          placeholder="ID do calendário (ex: primary)"
                        />
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Direção de sincronização</Label>
                      <select
                        className="w-full border rounded px-3 py-2 text-sm mt-1"
                        value={syncDirection}
                        onChange={(e) => setSyncDirection(e.target.value)}
                      >
                        <option value="both">Bidirecional (NixVet ↔ Google)</option>
                        <option value="nixvet_to_google">NixVet → Google (somente enviar)</option>
                        <option value="google_to_nixvet">Google → NixVet (somente receber)</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        Com &quot;Bidirecional&quot;, eventos criados no Google Calendar aparecem automaticamente na agenda do NixVet (sync a cada 1 minuto).
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleGoogleSaveCalendar} disabled={googleLoading} className="bg-blue-600">
                        Salvar configurações
                      </Button>
                      <Button onClick={handleForceSync} disabled={forceSyncing} variant="outline">
                        {forceSyncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Sincronizar agora
                      </Button>
                    </div>
                    {googleStatus.lastSyncAt && (
                      <p className="text-xs text-gray-400">
                        Última sincronização: {new Date(googleStatus.lastSyncAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Sistema</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card className="shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle>Nova clínica (para testes)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">
                Crie uma clínica para usuários testarem. Informe o <strong>código</strong> na tela de login. Opcional:
                cadastre o primeiro usuário (admin) da clínica.
              </p>
              <form onSubmit={handleSubmitTenant(onCreateTenant)} className="max-w-md flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Nome da clínica *</Label>
                  <Input {...registerTenant('name', { required: true })} placeholder="Ex: Clínica Teste" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Código (usado no login) *</Label>
                  <Input {...registerTenant('code', { required: true })} placeholder="Ex: TESTE" />
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">Primeiro usuário (opcional)</p>
                <div className="flex flex-col gap-1.5">
                  <Label>Nome do usuário</Label>
                  <Input {...registerTenant('initialUserName')} placeholder="Ex: Admin Teste" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Email</Label>
                  <Input {...registerTenant('initialUserEmail')} type="email" placeholder="Ex: admin@teste.com" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Senha</Label>
                  <Input {...registerTenant('initialUserPassword')} type="password" placeholder="Senha de acesso" />
                </div>
                <div>
                  <Button type="submit" disabled={creatingTenant} className="bg-blue-600">
                    {creatingTenant ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Criar clínica
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
