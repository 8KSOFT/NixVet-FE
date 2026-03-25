'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Send, Bot, Loader2, MessageSquare, Lightbulb, Clock, AlertTriangle, User } from 'lucide-react';
import api from '@/lib/axios';
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
  thread_status?: ThreadStatus;
  thread_waiting_since?: string | null;
  whatsapp_number?: { display_phone: string };
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
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 m-0">
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
  const [whatsappConfigured, setWhatsappConfigured] = useState<boolean | null>(null);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const res = await api.get<{ data: Conversation[]; total: number }>('/whatsapp/conversations', {
        params: { limit: 50, order: 'desc' },
      });
      setConversations(res.data?.data ?? []);
    } catch {
      if (!silent) toast.error('Erro ao carregar conversas');
    } finally {
      if (!silent) setLoadingConv(false);
    }
  }, []);

  const fetchMetricsAndAlerts = useCallback(async (silent = false) => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        api.get<ConversationMetrics>('/conversations/metrics'),
        api.get<{ conversations: AlertConversation[] }>('/conversations/alerts', { params: { minutes: 20 } }),
      ]);
      setMetrics(metricsRes.data ?? null);
      setAlerts(alertsRes.data?.conversations ?? []);
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

  useEffect(() => {
    fetchConversations(false);
    fetchMetricsAndAlerts(false);
    api
      .get<unknown[]>('/whatsapp/numbers')
      .then((r) => setWhatsappConfigured(Array.isArray(r.data) && r.data.length > 0))
      .catch(() => setWhatsappConfigured(false));
  }, [fetchConversations, fetchMetricsAndAlerts]);

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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2 m-0">
          <MessageSquare className="w-6 h-6" /> WhatsApp
        </h1>
        <span className="text-xs text-slate-500">
          Lista e mensagens atualizam automaticamente a cada {WHATSAPP_REFRESH_MS / 1000}s (aba visível)
        </span>
      </div>

      {whatsappConfigured === false && (
        <Alert className="mb-6">
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            <strong className="block mb-1">Configure o WhatsApp da clínica</strong>
            <span className="text-sm">
              Cadastre o número em{' '}
              <Link href="/dashboard/settings/whatsapp-numbers" className="text-blue-600 font-medium">
                Configurações → WhatsApp da clínica
              </Link>{' '}
              (código interno + número que o Twilio envia no campo To). Sem isso, as mensagens não entram aqui.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Aguardando resposta
          </div>
          <div className="text-2xl font-bold">{metrics?.conversations_waiting_clinic ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground mb-1">Aguardando tutor</div>
          <div className="text-2xl font-bold">{metrics?.conversations_waiting_tutor ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground mb-1">Tempo médio resposta</div>
          <div className="text-2xl font-bold">
            {metrics?.average_response_time ?? 0}
            <span className="text-sm font-normal ml-1">s</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          {alerts.length > 0 ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm">{alerts.length} conversa(s) há +20 min sem resposta</span>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-1">Alertas</div>
              <div className="text-2xl font-bold">0</div>
            </>
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border bg-card p-4 shadow-sm mb-4">
          <div className="text-sm font-medium mb-3">Conversas aguardando há mais de 20 min</div>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <Badge variant="outline">{a.tutor_phone}</Badge>
                {a.waiting_since && (
                  <span className="text-slate-500 text-sm">
                    desde {dayjs(a.waiting_since).format('DD/MM HH:mm')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Lista de conversas */}
        <div className="rounded-lg border bg-card shadow-sm lg:w-80 shrink-0">
          <div className="px-4 py-3 border-b">
            <span className="font-medium text-sm">Conversas</span>
          </div>
          <div className="p-2">
            {loadingConv ? (
              <div className="space-y-3 p-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">Nenhuma conversa</div>
            ) : (
              <div>
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'cursor-pointer rounded px-2 py-2',
                      selectedId === c.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50',
                    )}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="w-full min-h-[52px] flex flex-col justify-center">
                      <div className="font-medium flex items-center gap-2 flex-wrap text-sm">
                        <span>{c.contact_name || c.wa_id || 'Sem nome'}</span>
                        <AiPausedTag paused={c.ai_paused} />
                        {!c.ai_paused && <ThreadStatusTag status={c.thread_status ?? null} />}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {c.wa_id}
                        {c.last_message_at && ` · ${dayjs(c.last_message_at).fromNow()}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Painel de mensagens */}
        <div className="rounded-lg border bg-card shadow-sm flex-1 min-w-0 flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedConv ? (
                <>
                  <span className="font-medium text-sm">
                    {selectedConv.contact_name || selectedConv.wa_id}
                  </span>
                  <AiPausedTag paused={selectedConv.ai_paused} />
                  {!selectedConv.ai_paused && <ThreadStatusTag status={selectedConv.thread_status ?? null} />}
                </>
              ) : (
                <span className="font-medium text-sm">Selecione uma conversa</span>
              )}
            </div>
            {selectedConv && (
              <div className="flex gap-2">
                {selectedConv.ai_paused ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResumeAi}
                        disabled={aiActionLoading}
                      >
                        {aiActionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Bot className="w-4 h-4 mr-1" />
                        )}
                        Retomar Bot
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retomar atendimento automático pelo bot</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePauseAi}
                        disabled={aiActionLoading}
                      >
                        {aiActionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <User className="w-4 h-4 mr-1" />
                        )}
                        Assumir
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pausar bot e assumir atendimento manualmente</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 p-4 min-h-[400px]">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Clique em uma conversa para ver as mensagens
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto mb-4 space-y-2 min-h-[280px]">
                  {loadingMsg ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">Nenhuma mensagem</div>
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
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800',
                          )}
                        >
                          <div className="text-sm whitespace-pre-wrap">{m.body_text || '—'}</div>
                          <div
                            className={cn(
                              'text-xs mt-1',
                              m.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400',
                            )}
                          >
                            {dayjs(m.created_at ?? m.createdAt).format('DD/MM HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {suggestions.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="text-slate-600 text-sm self-center">Sugestões:</span>
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

                <div className="flex gap-2">
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
                    className="bg-blue-600 hover:bg-blue-700 shrink-0"
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
  );
}
