'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Send, Bot, Loader2, MessageSquare, Lightbulb, Clock, AlertTriangle, User, Archive, ArchiveRestore, CheckCheck, Tag, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/axios';
import { CLASSIFICATIONS, classificationInfo } from '@/lib/conversation-classifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

/** Polling enquanto a aba está visível (evita WebSocket no backend). */
const WHATSAPP_REFRESH_MS = 5000;

interface ConversationMetrics {
  unanswered_conversations: number;
  average_response_time: number;
  conversations_waiting_clinic: number;
  conversations_waiting_tutor: number;
}

interface AlertConversation {
  id: string;
  tutor_phone: string;
  status: string;
  waiting_since: string | null;
}

type ThreadStatus = 'waiting_clinic' | 'waiting_tutor' | 'resolved' | null;

interface Conversation {
  id: string;
  wa_id: string;
  contact_name: string | null;
  status: string;
  ai_paused: boolean;
  last_message_at: string | null;
  archived_at?: string | null;
  archived_reason?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  classification?: string | null;
  classification_note?: string | null;
  thread_status?: ThreadStatus;
  thread_waiting_since?: string | null;
  whatsapp_number?: { display_phone: string };
}

function ClassificationBadge({ classification }: { classification: string | null | undefined }) {
  const info = classificationInfo(classification);
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${info.badgeClass}`}>
      <Tag className="w-2.5 h-2.5" /> {info.label}
    </span>
  );
}

function CloseConversationDialog({
  open,
  onOpenChange,
  conversationId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  onSuccess: () => void;
}) {
  const [classification, setClassification] = React.useState('');
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleClose = async () => {
    if (!classification) { toast.error('Selecione uma classificação'); return; }
    setLoading(true);
    try {
      await api.post(`/whatsapp/conversations/${conversationId}/close`, { classification, note });
      toast.success('Conversa encerrada');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao encerrar conversa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar conversa</DialogTitle>
          <DialogDescription>Como esse atendimento foi concluído?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            {CLASSIFICATIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setClassification(c.value)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium text-left transition-all',
                  classification === c.value
                    ? `${c.badgeClass} ring-2 ring-offset-1 ring-current`
                    : 'border-border hover:bg-muted',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Tutor agendou por telefone..."
              maxLength={500}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancelar</button>
          <Button onClick={handleClose} disabled={!classification || loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-1" />}
            Encerrar conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AiPausedTag({ paused }: { paused: boolean | undefined }) {
  if (!paused) return null;
  return (
    <Badge variant="outline" className="border-orange-400 text-orange-600 gap-1 m-0">
      <User className="w-3 h-3" /> Atendimento humano
    </Badge>
  );
}

function ThreadStatusTag({ status }: { status: ThreadStatus | undefined }) {
  if (!status || status === 'resolved') return null;
  if (status === 'waiting_clinic') {
    return (
      <Badge variant="destructive" className="m-0">
        Não respondido
      </Badge>
    );
  }
  if (status === 'waiting_tutor') {
    return (
      <Badge className="bg-blue-100 text-primary hover:bg-blue-100 m-0">
        Aguardando resposta do tutor
      </Badge>
    );
  }
  return null;
}

interface WhatsappMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body_text: string | null;
  created_at?: string;
  createdAt?: string;
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertConversation[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [archivedFilter, setArchivedFilter] = useState<'false' | 'true'>('false');
  const [classificationFilter, setClassificationFilter] = useState<string>('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [classifyPopover, setClassifyPopover] = useState(false);
  const [stats, setStats] = useState<{ closed_today: number } | null>(null);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const archivedFilterRef = useRef<'false' | 'true'>('false');
  archivedFilterRef.current = archivedFilter;
  const classificationFilterRef = useRef<string>('');
  classificationFilterRef.current = classificationFilter;

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const params: Record<string, string | number> = { limit: 50, order: 'desc', archived: archivedFilterRef.current };
      if (classificationFilterRef.current) params.classification = classificationFilterRef.current;
      const res = await api.get<{ data: Conversation[]; total: number }>('/whatsapp/conversations', { params });
      setConversations(res.data?.data ?? []);
    } catch {
      if (!silent) toast.error('Erro ao carregar conversas');
    } finally {
      if (!silent) setLoadingConv(false);
    }
  }, []);

  const fetchMetricsAndAlerts = useCallback(async (silent = false) => {
    try {
      const [metricsRes, alertsRes, statsRes] = await Promise.all([
        api.get<ConversationMetrics>('/conversations/metrics'),
        api.get<{ conversations: AlertConversation[] }>('/conversations/alerts', { params: { minutes: 20 } }),
        api.get<{ open_count: number; closed_today: number; classified_today: number }>('/whatsapp/conversations/stats'),
      ]);
      setMetrics(metricsRes.data ?? null);
      setAlerts(alertsRes.data?.conversations ?? []);
      setStats(statsRes.data ?? null);
    } catch {
      if (!silent) {
        setMetrics(null);
        setAlerts([]);
      }
    }
  }, []);

  const handleSuggestReply = async () => {
    if (!messages.length) {
      toast.info('Não há mensagens para sugerir resposta');
      return;
    }
    const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
    const context = messages.slice(-8).map((m) => `${m.direction}: ${m.body_text || ''}`).join('\n');
    const lastMessage = lastInbound?.body_text ?? '';
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const res = await api.post<{ suggested_replies?: string[] }>('/ai/suggest-replies', {
        context,
        lastMessage,
      });
      const list = res.data?.suggested_replies ?? [];
      setSuggestions(Array.isArray(list) ? list : []);
      if (list.length === 0) toast.info('Nenhuma sugestão retornada');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao obter sugestões');
    } finally {
      setSuggestLoading(false);
    }
  };

  const loadMessages = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) setLoadingMsg(true);
    try {
      const res = await api.get<{ data: WhatsappMessage[]; total: number }>(
        `/whatsapp/conversations/${conversationId}/messages`,
        { params: { limit: 100 } },
      );
      const list = res.data?.data ?? [];
      setMessages(list.reverse());
    } catch {
      if (!silent) {
        toast.error('Erro ao carregar mensagens');
        setMessages([]);
      }
    } finally {
      if (!silent) setLoadingMsg(false);
    }
  }, []);

  const handleSend = async () => {
    if (!selectedId || !sendText.trim()) return;
    setSending(true);
    try {
      await api.post('/whatsapp/send', {
        conversation_id: selectedId,
        text: sendText.trim(),
      });
      setSendText('');
      await Promise.all([loadMessages(selectedId, false), fetchConversations(true)]);
      toast.success('Mensagem enviada');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  const [aiActionLoading, setAiActionLoading] = useState(false);

  const handleResumeAi = async () => {
    if (!selectedId) return;
    setAiActionLoading(true);
    try {
      await api.post(`/whatsapp/conversations/${selectedId}/resume-ai`);
      await fetchConversations(true);
      toast.success('Bot retomado — IA voltará a responder automaticamente.');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao retomar bot');
    } finally {
      setAiActionLoading(false);
    }
  };

  const handlePauseAi = async () => {
    if (!selectedId) return;
    setAiActionLoading(true);
    try {
      await api.post(`/whatsapp/conversations/${selectedId}/pause-ai`);
      await fetchConversations(true);
      toast.success('Bot pausado — você pode responder manualmente.');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao pausar bot');
    } finally {
      setAiActionLoading(false);
    }
  };

  const [archiveLoading, setArchiveLoading] = useState(false);
  const handleArchive = async () => {
    if (!selectedId) return;
    setArchiveLoading(true);
    try {
      await api.post(`/whatsapp/conversations/${selectedId}/archive`);
      toast.success('Conversa arquivada — pode acessá-la em "Arquivadas".');
      setSelectedId(null);
      setMessages([]);
      await fetchConversations(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao arquivar conversa');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleUnarchive = async () => {
    if (!selectedId) return;
    setArchiveLoading(true);
    try {
      await api.post(`/whatsapp/conversations/${selectedId}/unarchive`);
      toast.success('Conversa desarquivada.');
      setSelectedId(null);
      setMessages([]);
      await fetchConversations(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao desarquivar conversa');
    } finally {
      setArchiveLoading(false);
    }
  };

  const [alertActionPhone, setAlertActionPhone] = useState<string | null>(null);
  const [alertActionLoading, setAlertActionLoading] = useState(false);

  const handleCloseByPhone = async (phone: string, classification: string) => {
    setAlertActionLoading(true);
    try {
      await api.post('/whatsapp/conversations/close-by-phone', { phone, classification });
      toast.success('Conversa encerrada');
      setAlertActionPhone(null);
      await Promise.all([fetchConversations(false), fetchMetricsAndAlerts(true)]);
    } catch {
      toast.error('Erro ao encerrar conversa');
    } finally {
      setAlertActionLoading(false);
    }
  };

  const [classifyLoading, setClassifyLoading] = useState(false);
  const handleQuickClassify = async (classification: string) => {
    if (!selectedId) return;
    setClassifyLoading(true);
    setClassifyPopover(false);
    try {
      await api.post(`/whatsapp/conversations/${selectedId}/classify`, { classification });
      toast.success('Classificação salva');
      await fetchConversations(true);
    } catch {
      toast.error('Erro ao classificar');
    } finally {
      setClassifyLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(false);
    fetchMetricsAndAlerts(false);
  }, [fetchConversations, fetchMetricsAndAlerts, archivedFilter, classificationFilter]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId, false);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchConversations(true);
      void fetchMetricsAndAlerts(true);
      const sid = selectedIdRef.current;
      if (sid) void loadMessages(sid, true);
    };

    const id = window.setInterval(refresh, WHATSAPP_REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchConversations, fetchMetricsAndAlerts, loadMessages]);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  return (
    <>
    {selectedId && (
      <CloseConversationDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        conversationId={selectedId}
        onSuccess={async () => {
          setSelectedId(null);
          setMessages([]);
          await fetchConversations(false);
          await fetchMetricsAndAlerts(true);
        }}
      />
    )}
    {/* main content */}
    <div className="flex flex-col gap-4 min-h-0 h-[calc(100dvh-var(--app-header-h)-6.5rem)] min-h-[420px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 shrink-0">
        <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2 m-0">
          <MessageSquare className="w-6 h-6" /> WhatsApp
        </h1>
        <span className="text-xs text-muted-foreground">
          Lista e mensagens atualizam automaticamente a cada {WHATSAPP_REFRESH_MS / 1000}s (aba visível)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Aguardando resposta
          </div>
          <div className="text-2xl font-heading font-bold">{metrics?.conversations_waiting_clinic ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground mb-1">Aguardando tutor</div>
          <div className="text-2xl font-heading font-bold">{metrics?.conversations_waiting_tutor ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <CheckCheck className="w-3 h-3 text-green-600" /> Encerradas hoje
          </div>
          <div className="text-2xl font-heading font-bold text-green-600">{stats?.closed_today ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          {alerts.length > 0 ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm">{alerts.length} conversa(s) há +20 min sem resposta</span>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-1">Tempo médio resposta</div>
              <div className="text-2xl font-heading font-bold">{metrics?.average_response_time ?? 0}<span className="text-sm font-normal ml-1">s</span></div>
            </>
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 shadow-sm shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-800">{alerts.length} conversa(s) aguardando há mais de 20 min</span>
            <span className="text-xs text-amber-600 ml-auto">Clique em uma linha para ações rápidas</span>
          </div>
          <div className="space-y-1.5">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-amber-200 bg-white">
                <div
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-amber-50/80 transition-colors"
                  onClick={() => setAlertActionPhone(alertActionPhone === a.tutor_phone ? null : a.tutor_phone)}
                >
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{a.tutor_phone}</Badge>
                  {a.waiting_since && (
                    <span className="text-muted-foreground text-xs flex-1">
                      aguardando desde {dayjs(a.waiting_since).format('DD/MM HH:mm')} ({dayjs(a.waiting_since).fromNow()})
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-primary text-xs hover:underline shrink-0"
                    onClick={(e) => { e.stopPropagation(); setSelectedId(null); fetchConversations(false); }}
                  >
                    Ver na lista
                  </button>
                </div>

                {/* Ações rápidas inline */}
                {alertActionPhone === a.tutor_phone && (
                  <div className="border-t border-amber-100 px-3 py-2.5 bg-amber-50/40 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Encerrar com classificação:</p>
                    <div className="flex flex-wrap gap-2">
                      {CLASSIFICATIONS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          disabled={alertActionLoading}
                          onClick={() => handleCloseByPhone(a.tutor_phone, c.value)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 hover:ring-current disabled:opacity-50',
                            c.badgeClass,
                          )}
                        >
                          {alertActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground mt-1"
                      onClick={() => setAlertActionPhone(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row">
        {/* Lista de conversas */}
        <div className="rounded-lg border bg-card shadow-sm flex flex-col min-h-0 shrink-0 max-h-[min(40vh,320px)] lg:max-h-none lg:w-80 lg:self-stretch">
          <div className="px-4 py-3 border-b shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Conversas</span>
              <div className="ml-auto inline-flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setArchivedFilter('false')}
                  className={cn(
                    'px-2 py-1 text-xs',
                    archivedFilter === 'false' ? 'bg-primary text-white' : 'bg-card hover:bg-muted/50',
                  )}
                >
                  Ativas
                </button>
                <button
                  type="button"
                  onClick={() => setArchivedFilter('true')}
                  className={cn(
                    'px-2 py-1 text-xs border-l',
                    archivedFilter === 'true' ? 'bg-primary text-white' : 'bg-card hover:bg-muted/50',
                  )}
                >
                  Arquivadas
                </button>
              </div>
            </div>
            <Select value={classificationFilter || 'all'} onValueChange={(v) => setClassificationFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Classificação: Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as classificações</SelectItem>
                {CLASSIFICATIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              {loadingConv ? (
                <div className="space-y-3 p-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground/60 text-sm">Nenhuma conversa</div>
              ) : (
                <div>
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'cursor-pointer rounded px-2 py-2',
                        selectedId === c.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50',
                      )}
                      onClick={() => setSelectedId(c.id)}
                    >
                        <div className="w-full min-h-[52px] flex flex-col justify-center">
                          <div className="font-medium flex items-center gap-2 flex-wrap text-sm">
                            <span>{c.contact_name || c.wa_id || 'Sem nome'}</span>
                            <AiPausedTag paused={c.ai_paused} />
                            {!c.ai_paused && <ThreadStatusTag status={c.thread_status ?? null} />}
                            {c.archived_at && (
                              <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground gap-1 m-0">
                                <Archive className="w-3 h-3" />
                                {c.archived_reason?.startsWith('inactive_') ? 'Arquivada (inativa 7d)' : 'Arquivada'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.wa_id}
                            {c.last_message_at && ` · ${dayjs(c.last_message_at).fromNow()}`}
                          </div>
                          {c.classification && (
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <ClassificationBadge classification={c.classification} />
                              {c.closed_by && (
                                <span className="text-[10px] text-muted-foreground">por {c.closed_by}</span>
                              )}
                            </div>
                          )}
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Painel de mensagens */}
        <div className="rounded-lg border bg-card shadow-sm flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {selectedConv ? (
                <>
                  <span className="font-medium text-sm truncate">
                    {selectedConv.contact_name || selectedConv.wa_id}
                  </span>
                  <AiPausedTag paused={selectedConv.ai_paused} />
                  {!selectedConv.ai_paused && <ThreadStatusTag status={selectedConv.thread_status ?? null} />}
                  {selectedConv.classification && (
                    <ClassificationBadge classification={selectedConv.classification} />
                  )}
                  {selectedConv.status === 'closed' && selectedConv.closed_by && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCheck className="w-3 h-3 text-green-600" />
                      Encerrado por <strong>{selectedConv.closed_by}</strong>
                      {selectedConv.closed_at && ` em ${dayjs(selectedConv.closed_at).format('DD/MM HH:mm')}`}
                    </span>
                  )}
                </>
              ) : (
                <span className="font-medium text-sm">Selecione uma conversa</span>
              )}
            </div>
            {selectedConv && (
              <div className="flex gap-2 flex-wrap">
                {/* Assumir / Retomar Bot */}
                {selectedConv.ai_paused ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={handleResumeAi} disabled={aiActionLoading}>
                        {aiActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bot className="w-4 h-4 mr-1" />}
                        Retomar Bot
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retomar atendimento automático pelo bot</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={handlePauseAi} disabled={aiActionLoading}>
                        {aiActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <User className="w-4 h-4 mr-1" />}
                        Assumir
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pausar bot e assumir atendimento manualmente</TooltipContent>
                  </Tooltip>
                )}

                {/* Classificar (popover rápido) */}
                {!selectedConv.archived_at && (
                  <div className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setClassifyPopover((v) => !v)} disabled={classifyLoading}>
                          {classifyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Tag className="w-4 h-4 mr-1" />}
                          Classificar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Classificar sem encerrar</TooltipContent>
                    </Tooltip>
                    {classifyPopover && (
                      <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border bg-popover shadow-md p-2 space-y-1">
                        <div className="flex items-center justify-between px-1 pb-1 border-b mb-1">
                          <span className="text-xs font-medium text-muted-foreground">Classificar conversa</span>
                          <button type="button" onClick={() => setClassifyPopover(false)}><X className="w-3 h-3" /></button>
                        </div>
                        {CLASSIFICATIONS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => handleQuickClassify(c.value)}
                            className={cn(
                              'w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors',
                              selectedConv.classification === c.value ? `${c.badgeClass} font-medium` : 'hover:bg-muted',
                            )}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Encerrar (com dialog) */}
                {!selectedConv.archived_at && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => setCloseDialogOpen(true)}>
                        <CheckCheck className="w-4 h-4 mr-1" /> Encerrar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Encerrar conversa com classificação</TooltipContent>
                  </Tooltip>
                )}

                {/* Arquivar / Desarquivar */}
                {selectedConv.archived_at ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={handleUnarchive} disabled={archiveLoading}>
                        {archiveLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArchiveRestore className="w-4 h-4 mr-1" />}
                        Desarquivar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Trazer conversa de volta para a lista de ativas</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={handleArchive} disabled={archiveLoading}>
                        {archiveLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                        Arquivar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Arquivar temporariamente (reabre em nova mensagem)</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-h-0 p-0">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/60 p-4">
                Clique em uma conversa para ver as mensagens
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0 px-4 pt-4">
                  <div className="space-y-2 pb-2">
                    {loadingMsg ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground/60 text-sm">Nenhuma mensagem</div>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] rounded-lg px-3 py-2',
                              m.direction === 'outbound'
                                ? 'bg-primary text-white'
                                : 'bg-muted text-foreground',
                            )}
                          >
                            <div className="text-sm whitespace-pre-wrap">{m.body_text || '—'}</div>
                            <div
                              className={cn(
                                'text-xs mt-1',
                                m.direction === 'outbound' ? 'text-blue-100' : 'text-muted-foreground/60',
                              )}
                            >
                              {dayjs(m.created_at ?? m.createdAt).format('DD/MM HH:mm')}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {suggestions.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2 shrink-0 px-4">
                    <span className="text-muted-foreground text-sm self-center">Sugestões:</span>
                    {suggestions.map((s, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSendText(s);
                          setSuggestions([]);
                        }}
                      >
                        {s.length > 50 ? s.slice(0, 50) + '…' : s}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 shrink-0 px-4 pb-4 pt-2 border-t border-border/60 bg-card">
                  <Textarea
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    placeholder="Digite a mensagem..."
                    className="min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSuggestReply}
                        disabled={suggestLoading}
                        className="shrink-0"
                      >
                        {suggestLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Lightbulb className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sugerir resposta (IA)</TooltipContent>
                  </Tooltip>
                  <Button
                    onClick={handleSend}
                    disabled={sending || !sendText.trim()}
                    size="icon"
                    className="bg-primary hover:bg-blue-700 shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
