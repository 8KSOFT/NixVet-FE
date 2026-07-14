'use client';

import React, { useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import type { AlertConversation, Conversation, ThreadStatus, WhatsappMessage } from '@/app/types/whatsapp-conversation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Send, Bot, Loader2, MessageSquare, Lightbulb, Clock, AlertTriangle, User, Archive, ArchiveRestore, CheckCheck, Tag, X, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  WHATSAPP_REFRESH_MS,
  useWhatsappConversationsQuery,
  useConversationMetricsQuery,
  useConversationAlertsQuery,
  useWhatsappConversationStatsQuery,
  useWhatsappMessagesQuery,
  useSuggestRepliesMutation,
  useSendWhatsappMessageMutation,
  useResumeAiMutation,
  usePauseAiMutation,
  useArchiveConversationMutation,
  useUnarchiveConversationMutation,
  useCloseByPhoneMutation,
  useClassifyConversationMutation,
  useCloseConversationMutation,
} from '@/hooks/apiHooks/useWhatsappConversations';
import { CLASSIFICATIONS, classificationInfo } from '@/lib/conversation-classifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

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
  const closeMutation = useCloseConversationMutation();
  const loading = closeMutation.isPending;

  const handleClose = async () => {
    if (!classification) { toast.error('Selecione uma classificação'); return; }
    try {
      await closeMutation.mutateAsync({ conversationId, classification, note });
      toast.success('Conversa encerrada');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao encerrar conversa');
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
              placeholder="Ex: Responsável agendou por telefone..."
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
        Aguardando resposta do responsável
      </Badge>
    );
  }
  return null;
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

export default function WhatsAppPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendText, setSendText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [archivedFilter, setArchivedFilter] = useState<'false' | 'true'>('false');
  const [classificationFilter, setClassificationFilter] = useState<string>('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [classifyPopover, setClassifyPopover] = useState(false);

  const { data: conversations = [], isLoading: loadingConv } = useWhatsappConversationsQuery(
    archivedFilter,
    classificationFilter,
  );
  const { data: metrics = null } = useConversationMetricsQuery();
  const { data: alerts = [] } = useConversationAlertsQuery(20);
  const { data: stats = null } = useWhatsappConversationStatsQuery();
  const { data: messages = [], isLoading: loadingMsg } = useWhatsappMessagesQuery(selectedId);

  const suggestRepliesMutation = useSuggestRepliesMutation();
  const suggestLoading = suggestRepliesMutation.isPending;
  const sendMessageMutation = useSendWhatsappMessageMutation();
  const sending = sendMessageMutation.isPending;
  const resumeAiMutation = useResumeAiMutation();
  const pauseAiMutation = usePauseAiMutation();
  const aiActionLoading = resumeAiMutation.isPending || pauseAiMutation.isPending;
  const archiveMutation = useArchiveConversationMutation();
  const unarchiveMutation = useUnarchiveConversationMutation();
  const archiveLoading = archiveMutation.isPending || unarchiveMutation.isPending;
  const closeByPhoneMutation = useCloseByPhoneMutation();
  const alertActionLoading = closeByPhoneMutation.isPending;
  const classifyMutation = useClassifyConversationMutation();
  const classifyLoading = classifyMutation.isPending;

  const [alertActionPhone, setAlertActionPhone] = useState<string | null>(null);

  const handleSuggestReply = async () => {
    if (!messages.length) {
      toast.info('Não há mensagens para sugerir resposta');
      return;
    }
    const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
    const context = messages.slice(-8).map((m) => `${m.direction}: ${m.body_text || ''}`).join('\n');
    const lastMessage = lastInbound?.body_text ?? '';
    setSuggestions([]);
    try {
      const list = await suggestRepliesMutation.mutateAsync({ context, lastMessage });
      setSuggestions(list);
      if (list.length === 0) toast.info('Nenhuma sugestão retornada');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao obter sugestões'));
    }
  };

  const handleSend = async () => {
    if (!selectedId || !sendText.trim()) return;
    try {
      await sendMessageMutation.mutateAsync({ conversationId: selectedId, text: sendText.trim() });
      setSendText('');
      toast.success('Mensagem enviada');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao enviar'));
    }
  };

  const handleResumeAi = async () => {
    if (!selectedId) return;
    try {
      await resumeAiMutation.mutateAsync(selectedId);
      toast.success('Bot retomado — IA voltará a responder automaticamente.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao retomar bot'));
    }
  };

  const handlePauseAi = async () => {
    if (!selectedId) return;
    try {
      await pauseAiMutation.mutateAsync(selectedId);
      toast.success('Bot pausado — você pode responder manualmente.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao pausar bot'));
    }
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    try {
      await archiveMutation.mutateAsync(selectedId);
      toast.success('Conversa arquivada — pode acessá-la em "Arquivadas".');
      setSelectedId(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao arquivar conversa'));
    }
  };

  const handleUnarchive = async () => {
    if (!selectedId) return;
    try {
      await unarchiveMutation.mutateAsync(selectedId);
      toast.success('Conversa desarquivada.');
      setSelectedId(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao desarquivar conversa'));
    }
  };

  const handleCloseByPhone = async (phone: string, classification: string) => {
    try {
      await closeByPhoneMutation.mutateAsync({ phone, classification });
      toast.success('Conversa encerrada');
      setAlertActionPhone(null);
    } catch {
      toast.error('Erro ao encerrar conversa');
    }
  };

  const handleQuickClassify = async (classification: string) => {
    if (!selectedId) return;
    setClassifyPopover(false);
    try {
      await classifyMutation.mutateAsync({ conversationId: selectedId, classification });
      toast.success('Classificação salva');
    } catch {
      toast.error('Erro ao classificar');
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId);

  return (
    <>
    {selectedId && (
      <CloseConversationDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        conversationId={selectedId}
        onSuccess={() => {
          setSelectedId(null);
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
          <div className="text-xs text-muted-foreground mb-1">Aguardando responsável</div>
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

      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row">
        {/* Coluna esquerda: conversas aguardando + lista de conversas */}
        <div className="flex flex-col gap-4 min-h-0 shrink-0 lg:w-80 lg:self-stretch">
          {alerts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 shadow-sm shrink-0 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm font-semibold text-amber-800 truncate">Aguardando +20min</span>
                <Badge className="ml-auto shrink-0 bg-amber-200 text-amber-800 hover:bg-amber-200 m-0 text-[10px]">
                  {alerts.length}
                </Badge>
              </div>
              <div className="grid grid-cols-[1fr_auto_1.25rem] gap-2 px-3 pb-1 text-[10px] font-medium uppercase tracking-wide text-amber-700/70">
                <span>Número</span>
                <span>Aguard.</span>
                <span aria-hidden />
              </div>
              <div className="space-y-1 px-2 pb-2">
                {alerts.map((a) => {
                  const minutesAgo = a.waiting_since ? Math.max(0, dayjs().diff(dayjs(a.waiting_since), 'minute')) : null;
                  const expanded = alertActionPhone === a.tutor_phone;
                  return (
                    <div key={a.id} className="rounded-lg border border-amber-200 bg-white overflow-hidden">
                      <button
                        type="button"
                        className="grid w-full grid-cols-[1fr_auto_1.25rem] items-center gap-2 px-2 py-1.5 text-left hover:bg-amber-50/80 transition-colors"
                        onClick={() => setAlertActionPhone(expanded ? null : a.tutor_phone)}
                      >
                        <span className="font-mono text-xs truncate">{a.tutor_phone}</span>
                        <span className="text-muted-foreground text-[11px] whitespace-nowrap">
                          {minutesAgo != null ? `${minutesAgo}min` : '—'}
                        </span>
                        <ChevronDown
                          className={cn('w-3.5 h-3.5 text-amber-600 transition-transform shrink-0', expanded && 'rotate-180')}
                        />
                      </button>

                      {/* Ações rápidas inline */}
                      {expanded && (
                        <div className="border-t border-amber-100 px-2 py-2 bg-amber-50/40 space-y-1.5">
                          <p className="text-[11px] text-muted-foreground font-medium">Encerrar com classificação:</p>
                          <div className="grid grid-cols-1 gap-1">
                            {CLASSIFICATIONS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                disabled={alertActionLoading}
                                onClick={() => handleCloseByPhone(a.tutor_phone, c.value)}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-all hover:ring-2 hover:ring-offset-1 hover:ring-current disabled:opacity-50',
                                  c.badgeClass,
                                )}
                              >
                                {alertActionLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                ) : (
                                  <CheckCheck className="w-3 h-3 shrink-0" />
                                )}
                                <span className="truncate">{c.label}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => setAlertActionPhone(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de conversas */}
          <div className="rounded-lg border bg-card shadow-sm flex flex-col min-h-0 flex-1 max-h-[min(40vh,320px)] lg:max-h-none">
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
