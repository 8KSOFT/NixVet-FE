'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, ExternalLink } from 'lucide-react';
import api from '@/lib/axios';
import { getApiBaseUrl } from '@/lib/api-base';
import { cn } from '@/lib/utils';

interface WhatsappNumberRow {
  id: string;
  phone_number_id: string;
  display_phone: string | null;
  is_active: boolean;
}

interface RegisterFormValues {
  phone_number_id: string;
  access_token: string;
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

function InfoBox({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border p-4 bg-primary/10 border-primary/20 text-primary', className)}>
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

  const currentRole = getCurrentUserRole();
  const canManageChatbot = currentRole === 'admin' || currentRole === 'manager' || currentRole === 'superadmin';
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [chatbotSaving, setChatbotSaving] = useState(false);

  const zapiWebhookUrl = `${getApiBaseUrl()}/whatsapp/webhook/zapi`;

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
  }, []);

  useEffect(() => {
    void fetchTenantChatbot();
  }, [canManageChatbot]);

  const onFinish = async (values: RegisterFormValues) => {
    try {
      await api.post('/whatsapp/numbers', values);
      toast.success('Instância Z-API cadastrada');
      setModalOpen(false);
      form.reset();
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao cadastrar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-2">WhatsApp da clínica</h1>
      <p className="text-muted-foreground mb-6">
        Cada clínica conecta seu próprio número WhatsApp via <strong>Z-API</strong> (QR Code, sem aprovação
        Meta / Facebook Business). Basta criar uma instância em{' '}
        <a
          href="https://z-api.io"
          target="_blank"
          rel="noreferrer"
          className="underline inline-flex items-center gap-1"
        >
          z-api.io <ExternalLink className="w-3 h-3" />
        </a>
        , conectar o número e cadastrar os dados abaixo.
      </p>

      {canManageChatbot && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-blue-50/90 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary font-semibold text-base">
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
              <p className="text-sm text-muted-foreground">
                Exige <code className="text-xs">OPENAI_API_KEY</code> configurado no servidor.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <InfoBox title="Como configurar o webhook na Z-API" className="mb-6">
        <div className="space-y-2">
          <p>
            Na dashboard da Z-API, acesse sua instância → <strong>Webhooks</strong> → campo{' '}
            <strong>&quot;Ao receber&quot;</strong> e configure:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Método:</strong> HTTP POST
            </li>
            <li>
              <strong>URL:</strong>{' '}
              <code className="text-xs break-all bg-primary/10 px-1 py-0.5 rounded">{zapiWebhookUrl}</code>
            </li>
          </ul>
          <p>A URL precisa ser <strong>pública HTTPS</strong>.</p>
        </div>
      </InfoBox>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4 text-sm">
            Cada clínica vê e edita só o próprio cadastro (isolado por tenant). O{' '}
            <strong>Instance Token</strong> é criptografado antes de salvar.
          </p>

          <Button onClick={() => { form.reset(); setModalOpen(true); }} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar instância Z-API
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instance ID (Z-API)</TableHead>
                  <TableHead>Número conectado</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.phone_number_id}</TableCell>
                    <TableCell>{row.display_phone ?? '—'}</TableCell>
                    <TableCell>{row.is_active ? 'Sim' : 'Não'}</TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      Nenhuma instância cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar instância Z-API</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Instance ID</Label>
              <Input
                {...form.register('phone_number_id', { required: true })}
                placeholder="ex.: 3C9B2FA3491..."
              />
              <p className="text-xs text-muted-foreground">
                Instance ID da sua instância na dashboard da Z-API.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Instance Token</Label>
              <Input
                type="password"
                {...form.register('access_token', { required: true })}
                placeholder="ex.: F4B87A2C..."
              />
              <p className="text-xs text-muted-foreground">
                Instance Token da dashboard da Z-API. Será criptografado no banco.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Número conectado (opcional)</Label>
              <Input
                {...form.register('display_phone')}
                placeholder="5511999887766"
              />
              <p className="text-xs text-muted-foreground">
                Número de telefone conectado na instância, somente dígitos (ex.: 5511999887766).
              </p>
            </div>
            <Button type="submit" className="bg-primary">
              Cadastrar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
