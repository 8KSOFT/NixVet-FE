'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, ExternalLink, RefreshCw, Wifi, WifiOff, Trash2, QrCode } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import { getApiBaseUrl } from '@/lib/api-base';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import {
  useWhatsappNumbersQuery,
  useWhatsappProvisionAvailableQuery,
  useWhatsappNumberStatusMutation,
  useWhatsappQrCodeMutation,
  useProvisionWhatsappMutation,
  useRegisterWhatsappNumberMutation,
  useDisconnectWhatsappNumberMutation,
} from '@/hooks/apiHooks/useWhatsappNumbers';
import { useTenantMeQuery, useUpdateTenantMeMutation } from '@/hooks/apiHooks/useTenantSettings';
import type { WhatsappNumberRow, WhatsappNumberStatus as NumberStatus } from '@/app/types/whatsapp-number';

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

function InfoBox({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4 bg-primary/10 border-primary/20 text-primary', className)}>
      <p className="font-semibold mb-1">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function StatusBadge({ status, loading }: { status: NumberStatus | null; loading: boolean }) {
  if (loading) return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Verificando</Badge>;
  if (!status) return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
  if (status.connected) return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1"><Wifi className="w-3 h-3" />Conectado</Badge>;
  return <Badge variant="outline" className="text-red-600 border-red-200 gap-1"><WifiOff className="w-3 h-3" />Desconectado</Badge>;
}

export default function SettingsWhatsappNumbersPage() {
  const [listPage, setListPage] = useState(1);
  const [registerOpen, setRegisterOpen] = useState(false);
  const form = useForm<RegisterFormValues>();

  const currentRole = getCurrentUserRole();
  const canManageChatbot = currentRole === 'admin' || currentRole === 'manager' || currentRole === 'superadmin';
  const canManageNumbers = currentRole === 'admin' || currentRole === 'superadmin' || currentRole === 'manager';

  const { data: listData, isLoading: loading } = useWhatsappNumbersQuery(listPage);
  const list = listData?.items ?? [];
  const listTotal = listData?.total ?? 0;
  const listTotalPages = listData?.totalPages ?? 1;
  const { data: provisionAvailable = false } = useWhatsappProvisionAvailableQuery();
  const provisionMutation = useProvisionWhatsappMutation();
  const registerMutation = useRegisterWhatsappNumberMutation();
  const disconnectMutation = useDisconnectWhatsappNumberMutation();
  const statusMutation = useWhatsappNumberStatusMutation();
  const qrCodeMutation = useWhatsappQrCodeMutation();
  const provisioning = provisionMutation.isPending;

  const { data: tenantMe } = useTenantMeQuery(canManageChatbot);
  const chatbotEnabled = Boolean(tenantMe?.whatsapp_ai_chatbot_enabled);
  const updateTenantMutation = useUpdateTenantMeMutation();
  const chatbotSaving = updateTenantMutation.isPending;

  // Status por número
  const [statuses, setStatuses] = useState<Record<string, NumberStatus>>({});
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});

  // QR Code modal
  const [qrNumberId, setQrNumberId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const zapiWebhookUrl = `${getApiBaseUrl()}/whatsapp/webhook/zapi`;

  const fetchStatus = useCallback(async (numberId: string) => {
    setStatusLoading((s) => ({ ...s, [numberId]: true }));
    try {
      const data = await statusMutation.mutateAsync(numberId);
      setStatuses((s) => ({ ...s, [numberId]: data }));
      return data;
    } catch {
      return null;
    } finally {
      setStatusLoading((s) => ({ ...s, [numberId]: false }));
    }
  }, [statusMutation]);

  const fetchAllStatuses = useCallback(async (numbers: WhatsappNumberRow[]) => {
    await Promise.all(numbers.filter((n) => n.is_active).map((n) => fetchStatus(n.id)));
  }, [fetchStatus]);

  useEffect(() => {
    if (list.length > 0) void fetchAllStatuses(list);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const saveChatbotToggle = async (enabled: boolean) => {
    try {
      await updateTenantMutation.mutateAsync({ whatsapp_ai_chatbot_enabled: enabled });
      toast.success(enabled ? 'Chatbot de IA ativado' : 'Chatbot de IA desativado');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  // --- QR Code ---
  const stopQrPoll = () => {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
  };

  const openQrModal = async (numberId: string) => {
    setQrNumberId(numberId);
    setQrCode(null);
    setQrLoading(true);
    try {
      const qr = await qrCodeMutation.mutateAsync(numberId);
      setQrCode(qr);
    } catch {
      toast.error('Erro ao obter QR Code');
    } finally {
      setQrLoading(false);
    }

    // Recarrega QR a cada 20s (WhatsApp invalida o QR após ~20s)
    qrPollRef.current = setInterval(async () => {
      try {
        const status = await fetchStatus(numberId);
        if (status?.connected) {
          stopQrPoll();
          setQrNumberId(null);
          toast.success('WhatsApp conectado com sucesso!');
          return;
        }
        const qr = await qrCodeMutation.mutateAsync(numberId);
        setQrCode(qr);
      } catch { /* silencioso */ }
    }, 20000);
  };

  const closeQrModal = () => {
    stopQrPoll();
    setQrNumberId(null);
    setQrCode(null);
  };

  // --- Provision ---
  const handleProvision = async () => {
    try {
      await provisionMutation.mutateAsync(undefined);
      toast.success('Instância Z-API provisionada! Escaneie o QR Code para conectar.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao provisionar instância'));
    }
  };

  // --- Register manual ---
  const onRegister = async (values: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync(values);
      toast.success('Instância cadastrada');
      setRegisterOpen(false);
      form.reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao cadastrar'));
    }
  };

  // --- Disconnect ---
  const handleDisconnect = async (numberId: string) => {
    if (!confirm('Desconectar este número? O WhatsApp será desvinculado da instância.')) return;
    try {
      await disconnectMutation.mutateAsync(numberId);
      toast.success('Número desconectado');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao desconectar'));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-2">WhatsApp da clínica</h1>
      <p className="text-muted-foreground mb-6">
        Conecte o WhatsApp da clínica via <strong>Z-API</strong> (QR Code, sem aprovação Meta).
        Cada clínica tem sua própria instância isolada.
      </p>

      {canManageChatbot && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-blue-50/90 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary font-semibold text-base">
              Chatbot — respostas automáticas (IA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Switch checked={chatbotEnabled} disabled={chatbotSaving} onCheckedChange={(v) => void saveChatbotToggle(v)} />
              {chatbotSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <span className="font-semibold">{chatbotEnabled ? 'Ativo' : 'Desativado'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <InfoBox title="URL do Webhook (cadastro manual)" className="mb-6">
        <div className="space-y-1">
          <p>Se você criou a instância manualmente na Z-API, configure o campo <strong>&quot;Ao receber&quot;</strong> com:</p>
          <code className="text-xs break-all bg-primary/10 px-1 py-0.5 rounded block mt-1">{zapiWebhookUrl}</code>
          <p className="mt-1">
            Conta Z-API:{' '}
            <a href="https://z-api.io" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
              z-api.io <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </InfoBox>

      <Card>
        <CardContent className="pt-6">
          {canManageNumbers && (
            <div className="flex flex-wrap gap-2 mb-4">
              {provisionAvailable && (
                <Button onClick={handleProvision} disabled={provisioning} className="bg-primary">
                  {provisioning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Provisionar nova instância
                </Button>
              )}
              <Button variant="outline" onClick={() => { form.reset(); setRegisterOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar manualmente
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Instance ID</TableHead>
                  <TableHead>Número conectado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow className="border-b border-gray-300 h-15" key={row.id}>
                    <TableCell className="font-mono text-xs truncate" title={row.phone_number_id}>
                      {row.phone_number_id}
                    </TableCell>
                    <TableCell>{row.display_phone ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={statuses[row.id] ?? null} loading={statusLoading[row.id] ?? false} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Verificar status"
                          onClick={() => void fetchStatus(row.id)}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        {!statuses[row.id]?.connected && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Escanear QR Code"
                            onClick={() => void openQrModal(row.id)}
                          >
                            <QrCode className="w-3 h-3" />
                          </Button>
                        )}
                        {canManageNumbers && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            title="Desconectar"
                            onClick={() => void handleDisconnect(row.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                      {provisionAvailable
                        ? 'Clique em "Provisionar nova instância" para conectar o WhatsApp da clínica.'
                        : 'Nenhuma instância cadastrada.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ListPagination
              page={listPage}
              totalPages={listTotalPages}
              total={listTotal}
              pageSize={API_PAGE_SIZE}
              onPageChange={setListPage}
              disabled={loading}
            />
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={!!qrNumberId} onOpenChange={(open) => { if (!open) closeQrModal(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              Abra o WhatsApp no celular → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → escaneie o código abaixo.
            </p>
            {qrLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : qrCode ? (
              <div className="border rounded-lg p-3 bg-white">
                {qrCode.startsWith('data:') ? (
                  <Image src={qrCode} alt="QR Code WhatsApp" width={240} height={240} unoptimized />
                ) : (
                  <QRCode value={qrCode} size={240} />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">QR Code indisponível — a instância pode já estar conectada.</p>
            )}
            <p className="text-xs text-muted-foreground text-center">O código é atualizado automaticamente a cada 20 segundos.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cadastro manual */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar instância manualmente</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onRegister)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Instance ID</Label>
              <Input {...form.register('phone_number_id', { required: true })} placeholder="ex.: 3C9B2FA3491..." />
              <p className="text-xs text-muted-foreground">Instance ID da dashboard Z-API.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Instance Token</Label>
              <Input type="password" {...form.register('access_token', { required: true })} placeholder="ex.: F4B87A2C..." />
              <p className="text-xs text-muted-foreground">Será criptografado no banco.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Número conectado (opcional)</Label>
              <Input {...form.register('display_phone')} placeholder="5511999887766" />
              <p className="text-xs text-muted-foreground">Somente dígitos.</p>
            </div>
            <Button type="submit" className="bg-primary">Cadastrar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
