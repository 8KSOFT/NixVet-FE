'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { ApiRequestError } from '@/app/types/api-error';
import type { ThreadStatus } from '@/app/types/whatsapp-conversation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WhatsappMediaBubble, isMediaMessage } from '@/components/whatsapp-media-bubble';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBillingStatusQuery } from '@/hooks/apiHooks/useBilling';
import { getStoredUserRole } from '@/lib/role-permissions';
import { planMeetsRequirement } from '@/lib/plans';
import {
  Send,
  Bot,
  Loader2,
  MessageSquare,
  Lightbulb,
  Clock,
  AlertTriangle,
  User,
  Archive,
  ArchiveRestore,
  Check,
  Tag,
  X,
  ChevronDown,
  ChevronLeft,
  Lock,
  Ban,
} from 'lucide-react';
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
  useClassifyConversationMutation,
  useCloseConversationMutation,
} from '@/hooks/apiHooks/useWhatsappConversations';
import { CLASSIFICATIONS, classificationInfo } from '@/lib/conversation-classifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

/** Badge pílula (ícone + rótulo, 12px semibold) — usada nos cabeçalhos e na lista. */
function Pill({ icon: Icon, label, fg, bg }: { icon: React.ElementType; label: string; fg: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.25 rounded-full px-2.25 py-0.75 text-xs font-semibold"
      style={{ color: fg, background: bg }}
    >
      <Icon className="size-2.75" style={{ color: fg }} />
      {label}
    </span>
  );
}

function ClassificationBadge({ classification }: { classification: string | null | undefined }) {
  const info = classificationInfo(classification);
  if (!info) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.25 rounded-full px-2.25 py-0.75 text-xs font-semibold', info.badgeClass)}>
      <Tag className="size-2.75" />
      {info.label}
    </span>
  );
}

/** Pílula "Atendimento humano" — para cabeçalhos (mesmo tratamento das demais badges). */
function HumanBadge({ paused }: { paused: boolean | undefined }) {
  if (!paused) return null;
  return <Pill icon={User} label="Atendimento humano" fg="var(--wa-warn)" bg="var(--wa-warn-bg)" />;
}

/** Indicador "Atendimento humano" só-texto — usado na linha da lista de conversas. */
function HumanFlag({ paused }: { paused: boolean | undefined }) {
  if (!paused) return null;
  return (
    <span className="inline-flex items-center gap-1.25 text-xs font-semibold text-wa-warn">
      <User className="size-3" />
      Atendimento humano
    </span>
  );
}

function ThreadStatusBadge({ status }: { status: ThreadStatus | undefined }) {
  if (!status || status === 'resolved') return null;
  if (status === 'waiting_clinic') {
    return <Pill icon={AlertTriangle} label="Não respondido" fg="#c0522f" bg="#fdece5" />;
  }
  if (status === 'waiting_tutor') {
    return <Pill icon={Clock} label="Aguardando resposta do responsável" fg="var(--wa-warn)" bg="var(--wa-warn-bg)" />;
  }
  return null;
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
                  'rounded-wa border px-3 py-2 text-sm font-medium text-left transition-all',
                  classification === c.value
                    ? `${c.badgeClass} ring-2 ring-offset-1 ring-current`
                    : 'border-wa-line hover:bg-wa-line-2',
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
          <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm rounded-wa border hover:bg-wa-line-2">Cancelar</button>
          <Button onClick={handleClose} disabled={!classification || loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-1" />}
            Encerrar conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone = 'ink',
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  suffix?: string;
  tone?: 'ink' | 'brand';
}) {
  return (
    <div className="flex flex-1 flex-col gap-2.5 rounded-wa-lg border border-wa-line bg-card p-4.5 sm:px-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-wa-ink-2">
        <span
          className={cn(
            'flex size-6.5 items-center justify-center rounded-lg',
            tone === 'brand' ? 'bg-wa-brand-100 text-wa-brand-700' : 'bg-wa-line-2 text-wa-ink-2',
          )}
        >
          <Icon className="size-3.5" />
        </span>
        {label}
      </div>
      <div className={cn('text-[28px] leading-none font-bold tracking-tight', tone === 'brand' ? 'text-wa-brand-600' : 'text-wa-ink')}>
        {value}
        {suffix && <span className="ml-1 text-sm font-normal">{suffix}</span>}
      </div>
    </div>
  );
}

const ActionButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ icon: Icon, label, onClick, disabled, loading, ...rest }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col items-center justify-center gap-0.5 rounded-wa border border-wa-line bg-white px-1 py-1.5 text-center text-[10px] leading-none font-semibold text-wa-ink transition-colors duration-150 hover:bg-wa-line-2 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:flex-row sm:gap-1.75 sm:whitespace-nowrap sm:px-3.5 sm:py-2.25 sm:text-[13.5px]"
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin sm:size-3.75" /> : <Icon className="size-3.5 sm:size-3.75" />}
      <span className="truncate">{label}</span>
    </button>
  );
});
ActionButton.displayName = 'ActionButton';

export default function WhatsAppPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // No mobile (abaixo de lg) as colunas viram duas "telas": lista OU
  // conversa, nunca as duas espremidas — igual ao WhatsApp de verdade.
  // Em telas lg+ essa flag é ignorada (ambas ficam sempre visíveis lado a lado).
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [sendText, setSendText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [archivedFilter, setArchivedFilter] = useState<'false' | 'true'>('false');
  const [classificationFilter, setClassificationFilter] = useState<string>('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [classifyPopover, setClassifyPopover] = useState(false);

  // Trial sem plano Clínica: a tela fica visível como "vitrine" (dá o gostinho
  // do chatbot/WhatsApp completo), mas travada — nada de esconder tudo atrás
  // de um bloqueio duro como o PlanUpgradeGate faz nas outras telas clínica.
  const { data: billing, isLoading: billingLoading } = useBillingStatusQuery();
  const isSuperadmin = getStoredUserRole() === 'superadmin';
  const showTrialTeaser =
    !isSuperadmin &&
    !billingLoading &&
    billing?.status === 'trial' &&
    !planMeetsRequirement(billing?.billingPlan, 'clinica');

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
  const classifyMutation = useClassifyConversationMutation();
  const classifyLoading = classifyMutation.isPending;

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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao enviar'));
    }
  };

  const handleResumeAi = async () => {
    if (!selectedId) return;
    try {
      await resumeAiMutation.mutateAsync(selectedId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao retomar bot'));
    }
  };

  const handlePauseAi = async () => {
    if (!selectedId) return;
    try {
      await pauseAiMutation.mutateAsync(selectedId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao pausar bot'));
    }
  };

  // Volta pra tela de lista no mobile sempre que a conversa selecionada deixa
  // de existir (senão o usuário fica preso numa tela de chat vazia).
  const deselectConversation = () => {
    setSelectedId(null);
    setMobileView('list');
  };

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobileView('chat');
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    try {
      await archiveMutation.mutateAsync(selectedId);
      deselectConversation();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao arquivar conversa'));
    }
  };

  const handleUnarchive = async () => {
    if (!selectedId) return;
    try {
      await unarchiveMutation.mutateAsync(selectedId);
      deselectConversation();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao desarquivar conversa'));
    }
  };

  const handleQuickClassify = async (classification: string) => {
    if (!selectedId) return;
    setClassifyPopover(false);
    try {
      await classifyMutation.mutateAsync({ conversationId: selectedId, classification });
    } catch {
      toast.error('Erro ao classificar');
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId);

  // Não respondidos (aguardando a clínica) sobem para o topo da lista.
  const sortedConversations = [...conversations].sort((a, b) => {
    const pa = a.thread_status === 'waiting_clinic' ? 0 : 1;
    const pb = b.thread_status === 'waiting_clinic' ? 0 : 1;
    return pa - pb;
  });

  const initials = (name: string | null | undefined, fallback: string) =>
    (name || fallback || '?').trim().slice(0, 2).toUpperCase();

  return (
    <>
    {selectedId && (
      <CloseConversationDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        conversationId={selectedId}
        onSuccess={deselectConversation}
      />
    )}
    {/* main content */}
    <div className="relative flex flex-col gap-5 min-h-0 h-[calc(100dvh-var(--app-header-h)-2*var(--app-main-py))] min-h-[420px]">
    <div
      className={cn(
        'flex flex-1 flex-col gap-5 min-h-0',
        showTrialTeaser && 'pointer-events-none select-none blur-[2px]',
      )}
      aria-hidden={showTrialTeaser}
    >
      {/* Stats e título só fazem sentido com espaço de sobra (desktop). No
          mobile eles empurravam a lista/chat pra baixo do scroll — a tela
          vira só lista OU só chat, como no WhatsApp de verdade. */}
      <div className="hidden lg:grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <StatCard icon={Clock} label="Aguardando resposta" value={metrics?.conversations_waiting_clinic ?? 0} />
        <StatCard icon={User} label="Aguardando responsável" value={metrics?.conversations_waiting_tutor ?? 0} />
        <StatCard icon={Check} label="Encerradas hoje" value={stats?.closed_today ?? 0} tone="brand" />
        {alerts.length > 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-1 rounded-wa-lg border border-wa-line bg-card p-4.5 sm:px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-wa-warn" />
              <span className="text-[13.5px] font-medium text-wa-ink">{alerts.length} conversa(s) há +20 min sem resposta</span>
            </div>
          </div>
        ) : (
          <StatCard icon={Clock} label="Tempo médio resposta" value={metrics?.average_response_time ?? 0} suffix="s" />
        )}
      </div>

      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <h1 className="m-0 flex items-center gap-2 text-[22px] font-bold text-wa-ink">
          <MessageSquare className="size-5.5 text-wa-brand-600" /> WhatsApp
        </h1>
        <span className="ml-auto text-[11px] text-wa-ink-3">
          Atualiza a cada {WHATSAPP_REFRESH_MS / 1000}s
        </span>
      </div>

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-wa-lg border border-wa-line bg-card lg:flex-row">
        {/* Coluna esquerda: lista de conversas (não respondidas aparecem primeiro).
            No mobile isso é uma "tela" inteira — só aparece quando mobileView==='list'
            (equivalente ao lg:flex forçar visível sempre em telas grandes). */}
        <div
          className={cn(
            'min-h-0 w-full flex-1 flex-col border-wa-line lg:flex lg:w-85 lg:flex-none lg:border-r lg:border-b-0',
            mobileView === 'list' ? 'flex' : 'hidden',
          )}
        >
          <div className="flex shrink-0 flex-col gap-3 px-4.5 pt-4.5 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-wa-ink">Conversas</span>
              <div className="inline-flex rounded-wa bg-wa-line-2 p-0.75 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setArchivedFilter('false')}
                  className={cn(
                    'rounded-[7px] px-3 py-1.5 transition-colors',
                    archivedFilter === 'false' ? 'bg-wa-brand-600 text-white' : 'text-wa-ink-2 hover:text-wa-ink',
                  )}
                >
                  Ativas
                </button>
                <button
                  type="button"
                  onClick={() => setArchivedFilter('true')}
                  className={cn(
                    'rounded-[7px] px-3 py-1.5 transition-colors',
                    archivedFilter === 'true' ? 'bg-wa-brand-600 text-white' : 'text-wa-ink-2 hover:text-wa-ink',
                  )}
                >
                  Arquivadas
                </button>
              </div>
            </div>
            <Select value={classificationFilter || 'all'} onValueChange={(v) => setClassificationFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-auto w-full justify-between rounded-wa border-wa-line bg-transparent px-3 py-2.25 text-[13.5px] font-normal text-wa-ink-2 shadow-none [&_svg]:hidden hover:bg-wa-line-2/60">
                <SelectValue placeholder="Todas as classificações" />
                <ChevronDown className="size-3.5 shrink-0 text-wa-ink-2" />
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
          <div className="flex flex-col gap-0.75 px-2.5 pb-3.5">
            {loadingConv ? (
              <div className="space-y-3 p-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-wa" />
                ))}
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="py-8 text-center text-wa-ink-3 text-sm">Nenhuma conversa</div>
            ) : (
              sortedConversations.map((c) => {
                const selected = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'flex cursor-pointer flex-col gap-1.25 rounded-wa border px-3.5 py-3 transition-colors duration-150',
                      selected ? 'border-wa-brand-500 bg-wa-brand-50' : 'border-transparent hover:bg-wa-line-2',
                    )}
                    onClick={() => selectConversation(c.id)}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-wa-ink">{c.contact_name || c.wa_id || 'Sem nome'}</span>
                    </div>
                    <span className="text-[12.5px] text-wa-ink-3">
                      {c.wa_id}
                      {c.last_message_at && ` · ${dayjs(c.last_message_at).fromNow()}`}
                    </span>
                    {c.archived_at && (
                      <Pill icon={Archive} label={c.archived_reason?.startsWith('inactive_') ? 'Arquivada (inativa 7d)' : 'Arquivada'} fg="var(--wa-ink-2)" bg="var(--wa-line-2)" />
                    )}
                    <HumanFlag paused={c.ai_paused} />
                    {!c.ai_paused && <ThreadStatusBadge status={c.thread_status ?? undefined} />}
                    {c.classification && (
                      <div className="flex flex-wrap items-center gap-2">
                        <ClassificationBadge classification={c.classification} />
                        {c.closed_by && <span className="text-[11px] text-wa-ink-3">por {c.closed_by}</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        </div>

        {/* Painel de mensagens — no mobile é a "tela" que aparece só quando
            mobileView==='chat'; em lg+ fica sempre visível ao lado da lista. */}
        <div
          className={cn(
            'min-h-0 min-w-0 flex-1 flex-col bg-[#fbfcfb] lg:flex',
            mobileView === 'chat' ? 'flex' : 'hidden',
          )}
        >
          <div className="flex shrink-0 flex-col gap-2 border-b border-wa-line bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:px-6 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                aria-label="Voltar para a lista de conversas"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-wa-ink-2 hover:bg-wa-line-2 lg:hidden"
              >
                <ChevronLeft className="size-4" />
              </button>
              {selectedConv ? (
                <>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wa-brand-100 text-xs font-bold text-wa-brand-700 sm:size-9.5 sm:text-[13.5px]">
                    {initials(selectedConv.contact_name, selectedConv.wa_id)}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
                    <span className="truncate text-[13.5px] font-bold text-wa-ink sm:text-[14.5px]">
                      {selectedConv.contact_name || selectedConv.wa_id}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <HumanBadge paused={selectedConv.ai_paused} />
                      {!selectedConv.ai_paused && <ThreadStatusBadge status={selectedConv.thread_status ?? undefined} />}
                      {selectedConv.classification && <ClassificationBadge classification={selectedConv.classification} />}
                      {selectedConv.status === 'closed' && selectedConv.closed_by && (
                        <span className="inline-flex items-center gap-1 text-xs text-wa-ink-3">
                          <Check className="size-3 text-wa-brand-600" />
                          Encerrado por <strong className="font-semibold text-wa-ink-2">{selectedConv.closed_by}</strong>
                          {selectedConv.closed_at && ` em ${dayjs(selectedConv.closed_at).format('DD/MM HH:mm')}`}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-sm font-medium text-wa-ink-2">Selecione uma conversa</span>
              )}
            </div>
            {selectedConv && (
              <div className="grid grid-cols-4 gap-1 sm:flex sm:w-auto sm:flex-wrap sm:justify-start sm:gap-2">
                {selectedConv.ai_paused ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ActionButton icon={Bot} label="Retomar Bot" onClick={handleResumeAi} disabled={aiActionLoading} loading={aiActionLoading} />
                    </TooltipTrigger>
                    <TooltipContent>Retomar atendimento automático pelo bot</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ActionButton icon={User} label="Assumir" onClick={handlePauseAi} disabled={aiActionLoading} loading={aiActionLoading} />
                    </TooltipTrigger>
                    <TooltipContent>Pausar bot e assumir atendimento manualmente</TooltipContent>
                  </Tooltip>
                )}

                {!selectedConv.archived_at && (
                  <div className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ActionButton icon={Tag} label="Classificar" onClick={() => setClassifyPopover((v) => !v)} disabled={classifyLoading} loading={classifyLoading} />
                      </TooltipTrigger>
                      <TooltipContent>Classificar sem encerrar</TooltipContent>
                    </Tooltip>
                    {classifyPopover && (
                      <div className="absolute left-1/2 top-full z-50 mt-1.5 w-52 -translate-x-1/2 rounded-wa border border-wa-line bg-popover p-2 shadow-md space-y-1 sm:left-auto sm:right-0 sm:translate-x-0">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-wa-line mb-1">
                          <span className="text-xs font-medium text-wa-ink-2">Classificar conversa</span>
                          <button type="button" onClick={() => setClassifyPopover(false)}><X className="size-3" /></button>
                        </div>
                        {CLASSIFICATIONS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => handleQuickClassify(c.value)}
                            className={cn(
                              'w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors',
                              selectedConv.classification === c.value ? `${c.badgeClass} font-medium` : 'hover:bg-wa-line-2',
                            )}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Encerrar: só abre o modal de confirmação — nada executa direto no clique,
                    já teve dropdown de execução imediata aqui e era fácil encerrar sem querer. */}
                {!selectedConv.archived_at && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ActionButton icon={Check} label="Encerrar" onClick={() => setCloseDialogOpen(true)} />
                    </TooltipTrigger>
                    <TooltipContent>Encerrar conversa (escolher classificação e observação)</TooltipContent>
                  </Tooltip>
                )}

                {selectedConv.archived_at ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ActionButton icon={ArchiveRestore} label="Desarquivar" onClick={handleUnarchive} disabled={archiveLoading} loading={archiveLoading} />
                    </TooltipTrigger>
                    <TooltipContent>Trazer conversa de volta para a lista de ativas</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ActionButton icon={Archive} label="Arquivar" onClick={handleArchive} disabled={archiveLoading} loading={archiveLoading} />
                    </TooltipTrigger>
                    <TooltipContent>Arquivar temporariamente (reabre em nova mensagem)</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-h-0 p-0">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-wa-ink-3 p-4">
                Clique em uma conversa para ver as mensagens
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0 px-6 pt-6">
                  <div className="flex flex-col gap-4 pb-2">
                    {loadingMsg ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="size-6 animate-spin text-wa-ink-3" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="py-8 text-center text-wa-ink-3 text-sm">Nenhuma mensagem</div>
                    ) : (
                      messages.map((m) => {
                        const mine = m.direction === 'outbound';
                        return (
                          <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                            <div className={cn('flex max-w-120 flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                              <div
                                className={cn(
                                  'px-3.75 py-3 text-sm leading-snug',
                                  mine
                                    ? 'rounded-[14px_14px_3px_14px] bg-wa-brand-600 text-white'
                                    : 'rounded-[14px_14px_14px_3px] bg-wa-line-2 text-wa-ink',
                                )}
                              >
                                {m.revoked_at ? (
                                  <div
                                    className={cn(
                                      'flex items-center gap-1.5 italic',
                                      mine ? 'text-white/70' : 'text-wa-ink-3',
                                    )}
                                  >
                                    <Ban className="size-3.5 shrink-0" />
                                    Mensagem apagada
                                  </div>
                                ) : isMediaMessage(m) ? (
                                  <div className="space-y-1.5">
                                    <WhatsappMediaBubble message={m} />
                                    {m.body_text && !m.body_text.startsWith('[') && (
                                      <div className="whitespace-pre-wrap">{m.body_text}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="whitespace-pre-wrap">{m.body_text || '—'}</div>
                                )}
                              </div>
                              <span className="px-1 text-[11.5px] text-wa-ink-3">
                                {dayjs(m.created_at ?? m.createdAt).format('DD/MM HH:mm')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {suggestions.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2 shrink-0 px-6">
                    <span className="text-wa-ink-3 text-sm self-center">Sugestões:</span>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSendText(s);
                          setSuggestions([]);
                        }}
                        className="rounded-wa border border-wa-line bg-white px-3 py-1.5 text-xs font-medium text-wa-ink transition-colors hover:bg-wa-line-2"
                      >
                        {s.length > 50 ? s.slice(0, 50) + '…' : s}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0 px-2.5 pt-2 pb-[calc(4.25rem+env(safe-area-inset-bottom))] border-t border-wa-line bg-card lg:gap-2.5 lg:px-6 lg:pt-3 lg:pb-6">
                  <Textarea
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    placeholder="Digite a mensagem..."
                    className="min-h-9 max-h-30 flex-1 resize-none rounded-xl border-wa-line px-3 py-2 text-sm shadow-none placeholder:text-wa-ink-3 focus-visible:ring-wa-brand-500/25 lg:min-h-10.5 lg:rounded-full lg:px-4.5 lg:py-2.75"
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
                      <button
                        type="button"
                        onClick={handleSuggestReply}
                        disabled={suggestLoading}
                        className="flex size-8.5 shrink-0 items-center justify-center rounded-full border border-wa-line bg-white text-wa-ink-2 transition-colors hover:bg-wa-line-2 disabled:opacity-50 lg:size-10.5"
                      >
                        {suggestLoading ? (
                          <Loader2 className="size-3.5 animate-spin lg:size-4" />
                        ) : (
                          <Lightbulb className="size-3.5 lg:size-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Sugerir resposta (IA)</TooltipContent>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !sendText.trim()}
                    className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-wa-brand-600 text-white transition-colors hover:bg-wa-brand-700 disabled:opacity-50 lg:size-10.5"
                  >
                    {sending ? (
                      <Loader2 className="size-3.5 animate-spin lg:size-4" />
                    ) : (
                      <Send className="size-3.5 lg:size-4" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {showTrialTeaser && (
      // O backdrop cobre a caixa toda (que pode ficar mais alta que a viewport
      // quando há banners acima, tipo o de trial/confirmação de e-mail — daí o
      // "flex items-center" sozinho centralizava no conteúdo, não na tela).
      // O card usa "sticky" pra ficar preso ao centro do que está visível de
      // fato, acompanhando o scroll em vez de ficar fora de lugar.
      <div className="absolute inset-0 z-20 rounded-wa-lg bg-white/40 backdrop-blur-[1px]">
        <div className="sticky top-1/2 flex -translate-y-1/2 justify-center p-6">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-wa-lg border border-wa-line bg-card p-6 text-center shadow-lg">
            <div className="flex size-12 items-center justify-center rounded-full bg-wa-brand-100 text-wa-brand-700">
              <Lock className="size-5" />
            </div>
            <p className="text-[15px] font-bold text-wa-ink">
              Essa é a visão do WhatsApp para quem tem o plano Clínica
            </p>
            <p className="text-sm text-wa-ink-3">
              Assine o plano Clínica para liberar o atendimento e todas as funções desta tela.
            </p>
            <Link href="/billing/upgrade">
              <Button className="mt-1">Ver planos</Button>
            </Link>
          </div>
        </div>
      </div>
    )}
    </div>
    </>
  );
}
