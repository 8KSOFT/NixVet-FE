'use client';

import React from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Settings, Save, Search, Plus, Loader2, Bell } from 'lucide-react';
import axios from 'axios';
import { formatCepMask } from '@/lib/format-cep';
import Link from 'next/link';
import {
  useTenantMeQuery,
  useUpdateTenantMeMutation,
  useCreateTenantMutation,
} from '@/hooks/apiHooks/useTenantSettings';
import {
  useGoogleStatusQuery,
  useGoogleCalendarsQuery,
  useGoogleConnectMutation,
  useGoogleDisconnectMutation,
  useSaveGoogleCalendarSettingsMutation,
  useGoogleForceSyncMutation,
} from '@/hooks/apiHooks/useGoogleIntegration';

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

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

export default function SettingsPage() {
  const { register, setValue, getValues, handleSubmit } = useForm<ClinicFormValues>();
  const {
    register: registerTenant,
    handleSubmit: handleSubmitTenant,
    reset: resetTenant,
  } = useForm<TenantFormValues>();

  const [loadingCep, setLoadingCep] = React.useState(false);
  const currentRole = getCurrentUserRole();
  const isSuperAdmin = currentRole === 'superadmin';
  const canManageChatbot = currentRole === 'admin' || currentRole === 'manager' || isSuperAdmin;

  const { data: tenantMe, isLoading: loading } = useTenantMeQuery();
  const updateTenantMutation = useUpdateTenantMeMutation();
  const createTenantMutation = useCreateTenantMutation();
  const creatingTenant = createTenantMutation.isPending;
  const chatbotEnabled = Boolean(tenantMe?.whatsapp_ai_chatbot_enabled);
  const chatbotSaving = updateTenantMutation.isPending;

  const { data: googleStatus = { connected: false }, refetch: refetchGoogleStatus } = useGoogleStatusQuery();
  const { data: googleCalendars = [], refetch: refetchGoogleCalendars } = useGoogleCalendarsQuery(googleStatus.connected);
  const googleConnectMutation = useGoogleConnectMutation();
  const googleDisconnectMutation = useGoogleDisconnectMutation();
  const saveGoogleCalendarMutation = useSaveGoogleCalendarSettingsMutation();
  const googleForceSyncMutation = useGoogleForceSyncMutation();
  const googleLoading =
    googleConnectMutation.isPending || googleDisconnectMutation.isPending || saveGoogleCalendarMutation.isPending;
  const forceSyncing = googleForceSyncMutation.isPending;

  const [selectedCalendarId, setSelectedCalendarId] = React.useState<string>('primary');
  const [syncDirection, setSyncDirection] = React.useState('both');

  React.useEffect(() => {
    if (!googleStatus.connected) return;
    const savedId = googleStatus.calendarId || 'primary';
    const validIds = googleCalendars.map((c) => c.id);
    const resolvedId = validIds.includes(savedId) ? savedId : (googleCalendars.find((c) => c.primary)?.id || 'primary');
    setSelectedCalendarId(resolvedId);
    setSyncDirection(googleStatus.syncDirection || 'both');
  }, [googleStatus, googleCalendars]);

  const handleGoogleConnect = async () => {
    try {
      const url = await googleConnectMutation.mutateAsync();
      if (!url) {
        toast.error('Não foi possível iniciar conexão Google');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.info('Após autorizar no Google, clique em "Atualizar Status".');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao conectar Google'));
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await googleDisconnectMutation.mutateAsync();
      toast.success('Integração Google desconectada');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao desconectar Google'));
    }
  };

  const handleGoogleSaveCalendar = async () => {
    try {
      await saveGoogleCalendarMutation.mutateAsync({ calendarId: selectedCalendarId, syncDirection });
      toast.success('Configurações do Google atualizadas');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  const handleForceSync = async () => {
    try {
      await googleForceSyncMutation.mutateAsync();
      toast.success('Sincronização executada');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao sincronizar'));
    }
  };

  React.useEffect(() => {
    if (!tenantMe) return;
    const data = tenantMe;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantMe]);

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
      await updateTenantMutation.mutateAsync({
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
      await createTenantMutation.mutateAsync(payload);
      toast.success(
        payload.initialUser
          ? `Clínica "${values.name}" e usuário criados. Código: ${payload.code}`
          : `Clínica "${values.name}" criada. Código para login: ${payload.code}`,
      );
      resetTenant();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar clínica'));
    }
  };

  const saveChatbotToggle = async (enabled: boolean) => {
    try {
      await updateTenantMutation.mutateAsync({ whatsapp_ai_chatbot_enabled: enabled });
      toast.success(enabled ? 'Chatbot de IA ativado' : 'Chatbot de IA desativado');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold text-foreground flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-primary" /> Configurações
      </h1>

      {canManageChatbot && (
        <Card className="mb-6 shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="text-foreground font-semibold text-base">
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
                href="/chatbot-workflows"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 mt-2"
              >
                Configurar Workflow Visual do Chatbot →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 shadow-sm border-blue-100 bg-blue-50/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground font-semibold">
            <Bell className="size-4 text-blue-600" />
            Lembretes Automáticos de Consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Configure quando o sistema envia confirmações de presença, lembretes e mensagens de acompanhamento pós-consulta via WhatsApp.
          </p>
          <Link href="/settings/reminders">
            <Button variant="outline" size="sm">
              Configurar lembretes →
            </Button>
          </Link>
        </CardContent>
      </Card>

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
                      className="bg-primary"
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
                <Button type="submit" className="bg-primary">
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
                <h4 className="font-bold text-foreground">Status</h4>
                <p className="text-muted-foreground">
                  {googleStatus.connected
                    ? `Conectado${googleStatus.accountEmail ? ` (${googleStatus.accountEmail})` : ''}`
                    : 'Desconectado'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleGoogleConnect} disabled={googleLoading} className="bg-primary">
                  {googleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Conectar Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { void refetchGoogleStatus(); void refetchGoogleCalendars(); }}
                  disabled={googleLoading}
                >
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
                        <p className="text-xs text-muted-foreground/60 mt-1">
                        Com &quot;Bidirecional&quot;, eventos criados no Google Calendar aparecem automaticamente na agenda do NixVet (sync a cada 1 minuto).
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleGoogleSaveCalendar} disabled={googleLoading} className="bg-primary">
                        Salvar configurações
                      </Button>
                      <Button onClick={handleForceSync} disabled={forceSyncing} variant="outline">
                        {forceSyncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Sincronizar agora
                      </Button>
                    </div>
                    {googleStatus.lastSyncAt && (
                      <p className="text-xs text-muted-foreground/60">
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
                <h4 className="font-bold text-foreground">Versão do Sistema</h4>
                <p className="text-muted-foreground">v1.0.0</p>
              </div>
              <div className="sm:border-l sm:border-border sm:pl-10 flex-1 min-w-0">
                <h4 className="font-bold text-foreground">Tenant ID</h4>
                <p className="text-muted-foreground font-mono text-xs bg-muted p-2 rounded break-all mt-1">
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
              <p className="text-muted-foreground mb-4">
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
                  <Button type="submit" disabled={creatingTenant} className="bg-primary">
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
