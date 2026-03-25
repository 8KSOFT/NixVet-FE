'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Plus, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { getApiBaseUrl } from '@/lib/api-base';
import { cn } from '@/lib/utils';

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

interface RegisterFormValues {
  phone_number_id: string;
  access_token: string;
  waba_id?: string;
  display_phone?: string;
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

function AlertBox({
  type,
  title,
  children,
  className,
}: {
  type: 'warning' | 'info';
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        type === 'warning'
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-blue-50 border-blue-200 text-blue-900',
        className,
      )}
    >
      <p className="font-semibold mb-1">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function SettingsWhatsappNumbersPage() {
  const [list, setList] = useState<WhatsappNumberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const form = useForm<RegisterFormValues>();
  const [integration, setIntegration] = useState<IntegrationConfig | null>(null);
  const [providerSaving, setProviderSaving] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<'meta' | 'twilio' | 'inherit'>('inherit');

  const currentRole = getCurrentUserRole();
  const isSuperAdmin = currentRole === 'superadmin';
  const canManageChatbot = currentRole === 'admin' || currentRole === 'manager' || isSuperAdmin;
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [chatbotSaving, setChatbotSaving] = useState(false);
  const provider = integration?.effectiveProvider ?? 'meta';
  const twilioWebhookUrl = `${getApiBaseUrl()}/whatsapp/webhook`;

  const fetchIntegration = async () => {
    try {
      const res = await api.get<IntegrationConfig>('/whatsapp/integration-config');
      setIntegration(res.data);
      setSelectedOverride(res.data.source === 'database' ? res.data.effectiveProvider : 'inherit');
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
      toast.error('Erro ao carregar números');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantChatbot = async () => {
    if (!canManageChatbot) return;
    try {
      const res = await api.get<{ whatsapp_ai_chatbot_enabled?: boolean }>('/tenants/me');
      setChatbotEnabled(Boolean(res.data?.whatsapp_ai_chatbot_enabled));
    } catch {
      setChatbotEnabled(false);
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

  useEffect(() => {
    fetchList();
    fetchIntegration();
  }, []);

  useEffect(() => {
    void fetchTenantChatbot();
  }, [canManageChatbot]);

  const saveProviderOverride = async () => {
    setProviderSaving(true);
    try {
      const res = await api.put<IntegrationConfig>('/whatsapp/integration-config', {
        provider: selectedOverride,
      });
      setIntegration(res.data);
      toast.success('Provedor WhatsApp atualizado');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar provedor');
    } finally {
      setProviderSaving(false);
    }
  };

  const onFinish = async (values: RegisterFormValues) => {
    try {
      await api.post('/whatsapp/numbers', values);
      toast.success('Número cadastrado');
      setModalOpen(false);
      form.reset();
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao cadastrar');
    }
  };

  const openRegisterModal = () => {
    form.reset();
    if (provider === 'twilio') {
      form.setValue('access_token', 'n/a');
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

      {canManageChatbot && (
        <Card className="mb-6 border-blue-200 bg-gradient-to-br from-blue-50/90 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-blue-800 font-semibold text-base">
              Chatbot — respostas automáticas (IA)
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
                O mesmo controle existe em <strong>Configurações</strong> (topo da página). Exige{' '}
                <code className="text-xs">OPENAI_API_KEY</code> e fila de IA no servidor.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {integration && (
        <AlertBox
          type="info"
          className="mb-4"
          title={
            <span>
              Provedor ativo: <strong>{integration.effectiveProvider === 'twilio' ? 'Twilio' : 'Meta'}</strong>
              {integration.source === 'database' ? (
                <span className="text-slate-600 font-normal"> (definido no painel — superadmin)</span>
              ) : (
                <span className="text-slate-600 font-normal"> (definido no servidor — WHATSAPP_PROVIDER)</span>
              )}
            </span>
          }
        >
          <span>
            Valor no .env: <code>{integration.envProvider}</code>
          </span>
        </AlertBox>
      )}

      {isSuperAdmin && (
        <Card title="Provedor WhatsApp (superadmin)" className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Provedor WhatsApp (superadmin)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 w-full max-w-md">
              <p className="text-sm text-muted-foreground">
                Sobrescreve <code>WHATSAPP_PROVIDER</code> do ambiente para toda a instalação. Use &quot;Herdar do
                servidor&quot; para voltar ao .env.
              </p>
              <Select
                value={selectedOverride}
                onValueChange={(v) => setSelectedOverride(v as 'meta' | 'twilio' | 'inherit')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Herdar do servidor (.env)</SelectItem>
                  <SelectItem value="meta">Forçar Meta</SelectItem>
                  <SelectItem value="twilio">Forçar Twilio</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={providerSaving} onClick={saveProviderOverride} className="bg-blue-600 w-fit">
                {providerSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar provedor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <p className="text-slate-600 mb-2">Cada clínica vê e edita só o próprio cadastro (isolado por tenant).</p>

          {provider === 'twilio' && (
            <AlertBox
              type="warning"
              className="mb-4"
              title='Se o WhatsApp respondeu com "Configure your Sandbox Inbound URL"'
            >
              <div className="space-y-2">
                <p>
                  O Twilio <strong>não está chamando a API do NixVet</strong>. No console Twilio →{' '}
                  <strong>Messaging</strong> → <strong>Try it out / Sandbox</strong> (ou seu número WhatsApp) →{' '}
                  <strong>&quot;When a message comes in&quot;</strong>, configure:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Método:</strong> HTTP POST
                  </li>
                  <li>
                    <strong>URL:</strong>{' '}
                    <code className="text-xs break-all bg-amber-100 px-1 py-0.5 rounded">{twilioWebhookUrl}</code>
                  </li>
                </ul>
                <p className="text-slate-700">
                  A URL precisa ser <strong>pública HTTPS</strong> (Twilio não alcança <code>localhost</code>). Em
                  desenvolvimento use túnel (ngrok, Cloudflare Tunnel, etc.) apontando para a API.
                </p>
              </div>
            </AlertBox>
          )}

          {provider === 'twilio' && (
            <AlertBox type="info" className="mb-4" title="Cadastro para a clínica (sem Meta / Facebook Business)">
              <div className="space-y-2">
                <p>
                  Você <strong>não precisa</strong> de conta no Meta Business. A integração técnica (Twilio + servidor)
                  fica a cargo da <strong>equipe que opera o NixVet</strong>.
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    <strong>Código da clínica</strong> — identificador único no sistema (ex.:{' '}
                    <code>clinica-centro</code>). Não é telefone.
                  </li>
                  <li>
                    <strong>Número no cadastro (campo &quot;Número do WhatsApp&quot;)</strong> — no{' '}
                    <strong>Sandbox</strong>, o destino (To) é <em>sempre</em> o número do sandbox da Twilio, em geral{' '}
                    <code>14155238886</code>. Em <strong>produção</strong>, use os dígitos do número que aparece como{' '}
                    <strong>To</strong> nas mensagens recebidas no Twilio.
                  </li>
                  <li>
                    <strong>Access token</strong> — pode ficar <code>n/a</code>.
                  </li>
                </ol>
              </div>
            </AlertBox>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            {provider === 'twilio' ? (
              <>
                Credenciais Twilio (<code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>,{' '}
                <code>TWILIO_WHATSAPP_FROM</code>) ficam no servidor. O webhook de entrada deve ser a URL acima (POST).
              </>
            ) : (
              <>
                Modo Meta: é necessário <strong>WhatsApp Cloud API</strong> (Meta Business):{' '}
                <strong>Phone number ID</strong> e <strong>token de acesso</strong> reais. Webhook da Meta na URL
                pública da API; verify token = <code>WHATSAPP_VERIFY_TOKEN</code> no servidor.
              </>
            )}
          </p>

          <Button onClick={openRegisterModal} className="mb-4 bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            {provider === 'twilio' ? 'Cadastrar número da clínica' : 'Cadastrar número (Meta)'}
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {provider === 'twilio' ? 'Código interno' : 'Phone number ID (Meta)'}
                  </TableHead>
                  <TableHead>
                    {provider === 'twilio' ? 'To (Twilio) / matching' : 'Número / exibição'}
                  </TableHead>
                  {provider === 'meta' && <TableHead>WABA ID</TableHead>}
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.phone_number_id}</TableCell>
                    <TableCell>{row.display_phone}</TableCell>
                    {provider === 'meta' && <TableCell>{row.waba_id}</TableCell>}
                    <TableCell>{row.is_active ? 'Sim' : 'Não'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {provider === 'twilio' ? 'Cadastrar WhatsApp da clínica' : 'Cadastrar número (Meta / Cloud API)'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>{provider === 'twilio' ? 'Código interno da clínica' : 'Phone number ID (Meta)'}</Label>
              <Input
                {...form.register('phone_number_id', { required: true })}
                placeholder={provider === 'twilio' ? 'ex.: clinica-jardins' : 'ID do número na API do Meta'}
              />
              <p className="text-xs text-muted-foreground">
                {provider === 'twilio'
                  ? 'Texto único para o sistema, ex.: clinica-jardins (não é o telefone).'
                  : 'ID do número na API do Meta.'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{provider === 'twilio' ? 'Token (pode ignorar neste modo)' : 'Access token (Meta)'}</Label>
              <Input
                type="password"
                {...form.register('access_token', { required: true })}
                placeholder={provider === 'twilio' ? 'n/a' : 'Token de acesso Meta'}
              />
              <p className="text-xs text-muted-foreground">
                {provider === 'twilio'
                  ? 'Deixe n/a — a clínica não usa token Meta; o servidor usa Twilio.'
                  : 'Token de acesso permanente ou de curta duração da Cloud API.'}
              </p>
            </div>
            {provider === 'meta' && (
              <div className="flex flex-col gap-1.5">
                <Label>WABA ID (opcional)</Label>
                <Input {...form.register('waba_id')} placeholder="WhatsApp Business Account ID" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>
                {provider === 'twilio' ? 'Número destino (To) — Twilio' : 'Número para exibição (opcional)'}
              </Label>
              <Input
                {...form.register('display_phone', provider === 'twilio' ? { required: true } : {})}
                placeholder={provider === 'twilio' ? '14155238886' : '+55 11 99999-9999'}
              />
              <p className="text-xs text-muted-foreground">
                {provider === 'twilio'
                  ? 'Sandbox: use 14155238886 (número do sandbox Twilio). Produção: dígitos do To nas mensagens no painel Twilio.'
                  : 'Ex.: +55 11 99999-9999'}
              </p>
            </div>
            <Button type="submit" className="bg-blue-600">
              Cadastrar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
