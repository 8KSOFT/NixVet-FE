'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Loader2, RefreshCw, Wifi, WifiOff, Trash2, QrCode } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import {
  useWhatsappNumbersQuery,
  useWhatsappNumberStatusMutation,
  useWhatsappQrCodeMutation,
  useRegisterBaileysNumberMutation,
  useDisconnectWhatsappNumberMutation,
} from '@/hooks/apiHooks/useWhatsappNumbers';
import { useTenantMeQuery, useUpdateTenantMeMutation } from '@/hooks/apiHooks/useTenantSettings';
import type { WhatsappNumberRow, WhatsappNumberStatus as NumberStatus } from '@/app/types/whatsapp-number';

/**
 * WhatsApp da clínica — número conectado pelo Baileys (QR Code).
 *
 * Reescrita em 02/10/2026, quando a Z-API saiu do produto: não há mais
 * provisionamento de instância nem cadastro manual de Instance ID/Token.
 * "Conectar número" cria a linha (`POST /whatsapp/numbers/baileys`), o worker
 * abre a sessão e o QR Code aparece aqui; o telefone é preenchido pelo próprio
 * backend quando o pareamento conclui.
 */

/**
 * Intervalo do polling do modal de QR. O primeiro QR depende do worker abrir a
 * sessão (alguns segundos), e o WhatsApp troca o código a cada ~20 s — 5 s
 * mostra o primeiro rápido e nunca deixa um código vencido na tela por muito tempo.
 */
const QR_POLL_MS = 5000;

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

function StatusBadge({ status, loading }: { status: NumberStatus | null; loading: boolean }) {
  const { t } = useTranslation();
  if (loading) return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />{t('settingsWhatsappNumbers.status.checking')}</Badge>;
  if (!status) return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
  if (status.connected) return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1"><Wifi className="w-3 h-3" />{t('settingsWhatsappNumbers.status.connected')}</Badge>;
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="outline" className="text-red-600 border-red-200 gap-1"><WifiOff className="w-3 h-3" />{t('settingsWhatsappNumbers.status.disconnected')}</Badge>
      {status.motivo && (
        <span className="text-xs text-muted-foreground">{t(`settingsWhatsappNumbers.motivo.${status.motivo}`)}</span>
      )}
    </div>
  );
}

export default function SettingsWhatsappNumbersPage() {
  const { t } = useTranslation();
  const [listPage, setListPage] = useState(1);

  const currentRole = getCurrentUserRole();
  // Mesmo conjunto para as duas coisas: chatbot.* (toggle, QR, cadastro e remoção)
  // é de admin e gestor no backend.
  const canManage = currentRole === 'admin' || currentRole === 'manager' || currentRole === 'superadmin';

  const { data: listData, isLoading: loading } = useWhatsappNumbersQuery(listPage);
  const list = listData?.items ?? [];
  const listTotal = listData?.total ?? 0;
  const listTotalPages = listData?.totalPages ?? 1;
  const registerMutation = useRegisterBaileysNumberMutation();
  const disconnectMutation = useDisconnectWhatsappNumberMutation();
  const statusMutation = useWhatsappNumberStatusMutation();
  const qrCodeMutation = useWhatsappQrCodeMutation();
  const registering = registerMutation.isPending;

  const { data: tenantMe } = useTenantMeQuery(canManage);
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

  const stopQrPoll = useCallback(() => {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
  }, []);

  // O intervalo não pode sobreviver à tela.
  useEffect(() => stopQrPoll, [stopQrPoll]);

  const saveChatbotToggle = async (enabled: boolean) => {
    try {
      await updateTenantMutation.mutateAsync({ whatsapp_ai_chatbot_enabled: enabled });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsWhatsappNumbers.errors.save')));
    }
  };

  // --- QR Code ---
  const openQrModal = async (numberId: string) => {
    stopQrPoll();
    setQrNumberId(numberId);
    setQrCode(null);
    setQrLoading(true);
    try {
      const qr = await qrCodeMutation.mutateAsync(numberId);
      setQrCode(qr);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsWhatsappNumbers.errors.qrCode')));
    } finally {
      setQrLoading(false);
    }

    qrPollRef.current = setInterval(async () => {
      try {
        const status = await fetchStatus(numberId);
        if (status?.connected) {
          stopQrPoll();
          setQrNumberId(null);
          setQrCode(null);
          toast.success(t('settingsWhatsappNumbers.toasts.connected'));
          return;
        }
        const qr = await qrCodeMutation.mutateAsync(numberId);
        setQrCode(qr);
      } catch { /* silencioso: o próximo tick tenta de novo */ }
    }, QR_POLL_MS);
  };

  const closeQrModal = () => {
    stopQrPoll();
    setQrNumberId(null);
    setQrCode(null);
  };

  // --- Conectar número (Baileys) ---
  const handleConnect = async () => {
    try {
      const created = await registerMutation.mutateAsync({});
      if (created?.id) void openQrModal(created.id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsWhatsappNumbers.errors.register')));
    }
  };

  // --- Remover ---
  const handleDisconnect = async (numberId: string) => {
    if (!confirm(t('settingsWhatsappNumbers.confirmDisconnect'))) return;
    try {
      await disconnectMutation.mutateAsync(numberId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsWhatsappNumbers.errors.disconnect')));
    }
  };

  const phoneLabel = (row: WhatsappNumberRow) =>
    row.display_phone || t('settingsWhatsappNumbers.table.awaitingPairing');

  const rowActions = (row: WhatsappNumberRow) => (
    <>
      <Button
        size="sm"
        variant="outline"
        title={t('settingsWhatsappNumbers.actions.checkStatus')}
        aria-label={t('settingsWhatsappNumbers.actions.checkStatus')}
        onClick={() => void fetchStatus(row.id)}
      >
        <RefreshCw className="w-3 h-3" />
      </Button>
      {canManage && !statuses[row.id]?.connected && (
        <Button
          size="sm"
          variant="outline"
          title={t('settingsWhatsappNumbers.actions.scanQrCode')}
          aria-label={t('settingsWhatsappNumbers.actions.scanQrCode')}
          onClick={() => void openQrModal(row.id)}
        >
          <QrCode className="w-3 h-3" />
        </Button>
      )}
      {canManage && (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          title={t('settingsWhatsappNumbers.actions.disconnect')}
          aria-label={t('settingsWhatsappNumbers.actions.disconnect')}
          onClick={() => void handleDisconnect(row.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </>
  );

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-2">{t('settingsWhatsappNumbers.title')}</h1>
      <p className="text-muted-foreground mb-6">{t('settingsWhatsappNumbers.subtitle')}</p>

      {canManage && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-blue-50/90 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary font-semibold text-base">
              {t('settingsWhatsappNumbers.chatbot.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Switch checked={chatbotEnabled} disabled={chatbotSaving} onCheckedChange={(v) => void saveChatbotToggle(v)} />
              {chatbotSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <span className="font-semibold">{chatbotEnabled ? t('settingsWhatsappNumbers.chatbot.active') : t('settingsWhatsappNumbers.chatbot.inactive')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
        <CardContent className="px-0 pt-0 sm:px-6 sm:pt-6">
          {canManage && (
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:flex-wrap">
              <Button onClick={() => void handleConnect()} disabled={registering} className="w-full bg-primary sm:w-auto">
                {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t('settingsWhatsappNumbers.actions.connect')}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              {canManage
                ? t('settingsWhatsappNumbers.empty.withAction', { action: t('settingsWhatsappNumbers.actions.connect') })
                : t('settingsWhatsappNumbers.empty.none')}
            </div>
          ) : (
            <div>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('settingsWhatsappNumbers.table.number')}</TableHead>
                      <TableHead>{t('settingsWhatsappNumbers.table.status')}</TableHead>
                      <TableHead>{t('settingsWhatsappNumbers.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((row) => (
                      <TableRow className="border-b border-gray-300 h-15" key={row.id}>
                        <TableCell className={row.display_phone ? '' : 'text-muted-foreground'}>{phoneLabel(row)}</TableCell>
                        <TableCell>
                          <StatusBadge status={statuses[row.id] ?? null} loading={statusLoading[row.id] ?? false} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">{rowActions(row)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-2 md:hidden">
                {list.map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-300 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`min-w-0 truncate text-sm ${row.display_phone ? '' : 'text-muted-foreground'}`}>
                        {phoneLabel(row)}
                      </p>
                      <div className="shrink-0">
                        <StatusBadge status={statuses[row.id] ?? null} loading={statusLoading[row.id] ?? false} />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1 border-t border-gray-200 pt-2">{rowActions(row)}</div>
                  </div>
                ))}
              </div>

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
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('settingsWhatsappNumbers.qrModal.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              {t('settingsWhatsappNumbers.qrModal.instructionsPre')} <strong>{t('settingsWhatsappNumbers.qrModal.connectedDevices')}</strong> → <strong>{t('settingsWhatsappNumbers.qrModal.connectDevice')}</strong> {t('settingsWhatsappNumbers.qrModal.instructionsPost')}
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
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('settingsWhatsappNumbers.qrModal.waiting')}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">{t('settingsWhatsappNumbers.qrModal.autoRefresh')}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
