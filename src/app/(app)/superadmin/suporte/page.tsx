'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileWarning, Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import {
  useAdminArticlesQuery,
  useAdminTicketsQuery,
  useDeleteArticleMutation,
  useSaveArticleMutation,
  useSupportGapsQuery,
  useSupportStatsQuery,
  useUpdateGapMutation,
  useUpdateTicketMutation,
  type ArticlePayload,
} from '@/hooks/apiHooks/useSupportAdmin';
import { SUPPORT_MODULES, type SupportArticle, type SupportTicket } from '@/app/types/support';

const EMPTY_ARTICLE: ArticlePayload = {
  title: '',
  summary: '',
  content: '',
  module: 'geral',
  keywords: '',
  status: 'draft',
};

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperadminSuportePage() {
  const { t } = useTranslation();
  const moduleLabel = (m: string) => t(`help.modules.${m}`, { defaultValue: m });
  const [tab, setTab] = useState('chamados');

  const { data: stats } = useSupportStatsQuery();

  // ── Artigos ──────────────────────────────────────────────────────────
  const [articleFilters, setArticleFilters] = useState<{ q?: string; status?: string; module?: string }>({});
  const { data: articles = [], isLoading: loadingArticles } = useAdminArticlesQuery(articleFilters);
  const saveArticle = useSaveArticleMutation();
  const deleteArticle = useDeleteArticleMutation();
  const [editing, setEditing] = useState<{ id?: string; payload: ArticlePayload } | null>(null);
  const [toDelete, setToDelete] = useState<SupportArticle | null>(null);

  // ── Lacunas ──────────────────────────────────────────────────────────
  const [gapStatus, setGapStatus] = useState('pending');
  const { data: gaps = [], isLoading: loadingGaps } = useSupportGapsQuery(gapStatus);
  const updateGap = useUpdateGapMutation();

  // ── Chamados ─────────────────────────────────────────────────────────
  const [ticketStatus, setTicketStatus] = useState('');
  const { data: tickets = [], isLoading: loadingTickets } = useAdminTicketsQuery(ticketStatus);
  const updateTicket = useUpdateTicketMutation();
  const [replyTo, setReplyTo] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState({ status: 'resolved', resolution: '' });

  const handleSaveArticle = async () => {
    if (!editing) return;
    if (!editing.payload.title.trim() || !editing.payload.content.trim()) {
      toast.error(t('superadminSuporte.toasts.articleRequiredFields'));
      return;
    }
    try {
      await saveArticle.mutateAsync({ id: editing.id, payload: editing.payload });
      toast.success(
        editing.id
          ? t('superadminSuporte.toasts.articleUpdated')
          : t('superadminSuporte.toasts.articleCreated'),
      );
      setEditing(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superadminSuporte.toasts.articleSaveError')));
    }
  };

  const handleDeleteArticle = async () => {
    if (!toDelete) return;
    try {
      await deleteArticle.mutateAsync(toDelete.id);
      toast.success(t('superadminSuporte.toasts.articleRemoved'));
      setToDelete(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superadminSuporte.toasts.articleRemoveError')));
    }
  };

  /** Da lacuna direto para o rascunho do artigo que a resolve. */
  const writeArticleForGap = (question: string) => {
    setEditing({
      payload: {
        ...EMPTY_ARTICLE,
        title: question.slice(0, 120),
        keywords: question,
      },
    });
    setTab('artigos');
  };

  const handleReply = async () => {
    if (!replyTo) return;
    try {
      await updateTicket.mutateAsync({
        id: replyTo.id,
        status: reply.status,
        resolution: reply.resolution,
      });
      toast.success(t('superadminSuporte.toasts.ticketUpdated'));
      setReplyTo(null);
      setReply({ status: 'resolved', resolution: '' });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superadminSuporte.toasts.ticketError')));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('superadminSuporte.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('superadminSuporte.subtitle')}
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t('superadminSuporte.stats.openTickets')} value={stats.open_tickets} icon={Ticket} />
          <StatCard label={t('superadminSuporte.stats.pendingGaps')} value={stats.pending_gaps} icon={FileWarning} />
          <StatCard label={t('superadminSuporte.stats.publishedArticles')} value={stats.published_articles} icon={BookOpen} />
          <StatCard label={t('superadminSuporte.stats.drafts')} value={stats.draft_articles} icon={Pencil} />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        {/* Mobile: dropdown — 3 abas ("Base de conhecimento" é a mais longa)
            não cabem lado a lado num viewport de telefone sem quebrar ou
            estourar a largura. Desktop mantém as abas normais. */}
        <div className="sm:hidden">
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chamados">
                <Ticket className="mr-2 size-4" />
                {t('superadminSuporte.tabs.tickets')}
              </SelectItem>
              <SelectItem value="lacunas">
                <FileWarning className="mr-2 size-4" />
                {t('superadminSuporte.tabs.gaps')}
              </SelectItem>
              <SelectItem value="artigos">
                <BookOpen className="mr-2 size-4" />
                {t('superadminSuporte.tabs.knowledge')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TabsList className="hidden sm:inline-flex">
          <TabsTrigger value="chamados">{t('superadminSuporte.tabs.tickets')}</TabsTrigger>
          <TabsTrigger value="lacunas">{t('superadminSuporte.tabs.gaps')}</TabsTrigger>
          <TabsTrigger value="artigos">{t('superadminSuporte.tabs.knowledge')}</TabsTrigger>
        </TabsList>

        {/* ── Chamados ──────────────────────────────────────────────── */}
        <TabsContent value="chamados" className="mt-4 space-y-3">
          <Select
            value={ticketStatus || '_all'}
            onValueChange={(v) => setTicketStatus(v === '_all' ? '' : v)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder={t('superadminSuporte.filters.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('superadminSuporte.filters.allStatuses')}</SelectItem>
              <SelectItem value="open">{t('superadminSuporte.filters.open')}</SelectItem>
              <SelectItem value="in_progress">{t('superadminSuporte.filters.in_progress')}</SelectItem>
              <SelectItem value="resolved">{t('superadminSuporte.filters.resolved')}</SelectItem>
              <SelectItem value="closed">{t('superadminSuporte.filters.closed')}</SelectItem>
            </SelectContent>
          </Select>

          {loadingTickets ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('superadminSuporte.noTickets')}
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        #{ticket.number} · {ticket.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.clinic_name ?? '—'} · {ticket.user_name ?? '—'} (
                        {ticket.user_email ?? '—'}) ·{' '}
                        {moduleLabel(ticket.module)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.priority === 'high' && <Badge variant="destructive">{t('superadminSuporte.priorityHigh')}</Badge>}
                      <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                        {t(`help.ticketStatus.${ticket.status}`, { defaultValue: ticket.status })}
                      </Badge>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {ticket.description}
                  </p>
                  {ticket.resolution && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="mb-1 font-medium">{t('superadminSuporte.recordedReply')}</p>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {ticket.resolution}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyTo(ticket);
                        setReply({
                          status: ticket.status === 'open' ? 'in_progress' : ticket.status,
                          resolution: ticket.resolution ?? '',
                        });
                      }}
                    >
                      {t('superadminSuporte.replyAction')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Lacunas ───────────────────────────────────────────────── */}
        <TabsContent value="lacunas" className="mt-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={gapStatus} onValueChange={setGapStatus}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('superadminSuporte.filters.pending')}</SelectItem>
                <SelectItem value="answered">{t('superadminSuporte.filters.answered')}</SelectItem>
                <SelectItem value="dismissed">{t('superadminSuporte.filters.dismissed')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('superadminSuporte.gapsHint')}
            </p>
          </div>

          {loadingGaps ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : gaps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('superadminSuporte.noGaps')}
              </CardContent>
            </Card>
          ) : (
            gaps.map((gap) => (
              <Card key={gap.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{gap.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('superadminSuporte.asked', { count: gap.occurrences })}
                      {gap.last_seen_at
                        ? ` · ${t('superadminSuporte.lastSeen', { date: new Date(gap.last_seen_at).toLocaleDateString('pt-BR') })}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => writeArticleForGap(gap.question)}>
                      {t('superadminSuporte.writeArticle')}
                    </Button>
                    {gap.status !== 'dismissed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateGap.mutate({ id: gap.id, status: 'dismissed' })
                        }
                      >
                        {t('superadminSuporte.dismiss')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Artigos ───────────────────────────────────────────────── */}
        <TabsContent value="artigos" className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder={t('superadminSuporte.searchPlaceholder')}
              value={articleFilters.q ?? ''}
              onChange={(e) => setArticleFilters((f) => ({ ...f, q: e.target.value }))}
              className="flex-1"
            />
            <Select
              value={articleFilters.status || '_all'}
              onValueChange={(v) =>
                setArticleFilters((f) => ({ ...f, status: v === '_all' ? undefined : v }))
              }
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder={t('superadminSuporte.filters.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">{t('superadminSuporte.filters.all')}</SelectItem>
                <SelectItem value="published">{t('superadminSuporte.filters.published')}</SelectItem>
                <SelectItem value="draft">{t('superadminSuporte.filters.draft')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setEditing({ payload: { ...EMPTY_ARTICLE } })}>
              <Plus className="mr-2 size-4" />
              {t('superadminSuporte.newArticle')}
            </Button>
          </div>

          {loadingArticles ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('superadminSuporte.noArticles')}
              </CardContent>
            </Card>
          ) : (
            articles.map((article) => (
              <Card key={article.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{article.title}</p>
                      <Badge variant="secondary">
                        {moduleLabel(article.module)}
                      </Badge>
                      {article.status === 'draft' && <Badge variant="outline">{t('superadminSuporte.draftBadge')}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      /{article.slug} · {t('superadminSuporte.reads', { count: article.view_count })} · 👍 {article.helpful_count} · 👎{' '}
                      {article.not_helpful_count}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('superadminSuporte.edit')}
                      onClick={() =>
                        setEditing({
                          id: article.id,
                          payload: {
                            slug: article.slug,
                            title: article.title,
                            summary: article.summary ?? '',
                            content: article.content,
                            module: article.module,
                            keywords: article.keywords ?? '',
                            status: article.status,
                          },
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('superadminSuporte.remove')}
                      onClick={() => setToDelete(article)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Editor de artigo */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t('superadminSuporte.editor.editTitle') : t('superadminSuporte.editor.newTitle')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>{t('superadminSuporte.editor.title')}</Label>
                <Input
                  value={editing.payload.title}
                  maxLength={255}
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, title: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('superadminSuporte.editor.summary')}</Label>
                <Input
                  value={editing.payload.summary ?? ''}
                  maxLength={500}
                  placeholder={t('superadminSuporte.editor.summaryPlaceholder')}
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, summary: e.target.value } })
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t('superadminSuporte.editor.module')}</Label>
                  <Select
                    value={editing.payload.module}
                    onValueChange={(v) =>
                      setEditing((s) => s && { ...s, payload: { ...s.payload, module: v } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_MODULES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {moduleLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t('superadminSuporte.editor.status')}</Label>
                  <Select
                    value={editing.payload.status ?? 'draft'}
                    onValueChange={(v: 'draft' | 'published') =>
                      setEditing((s) => s && { ...s, payload: { ...s.payload, status: v } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('superadminSuporte.editor.statusDraft')}</SelectItem>
                      <SelectItem value="published">{t('superadminSuporte.editor.statusPublished')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t('superadminSuporte.editor.keywords')}</Label>
                <Input
                  value={editing.payload.keywords ?? ''}
                  placeholder={t('superadminSuporte.editor.keywordsPlaceholder')}
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, keywords: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('superadminSuporte.editor.content')}</Label>
                <Textarea
                  value={editing.payload.content}
                  rows={14}
                  className="font-mono text-sm"
                  placeholder={t('superadminSuporte.editor.contentPlaceholder')}
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, content: e.target.value } })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('superadminSuporte.editor.contentHint')}
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t('superadminSuporte.cancel')}
            </Button>
            <Button onClick={() => void handleSaveArticle()} disabled={saveArticle.isPending}>
              {saveArticle.isPending ? t('superadminSuporte.saving') : t('superadminSuporte.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Responder chamado */}
      <Dialog open={!!replyTo} onOpenChange={(open) => !open && setReplyTo(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('superadminSuporte.ticketTitle', { number: replyTo?.number })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('superadminSuporte.editor.status')}</Label>
              <Select value={reply.status} onValueChange={(v) => setReply((r) => ({ ...r, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t('help.ticketStatus.open')}</SelectItem>
                  <SelectItem value="in_progress">{t('help.ticketStatus.in_progress')}</SelectItem>
                  <SelectItem value="resolved">{t('help.ticketStatus.resolved')}</SelectItem>
                  <SelectItem value="closed">{t('help.ticketStatus.closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('superadminSuporte.replyLabel')}</Label>
              <Textarea
                rows={6}
                value={reply.resolution}
                maxLength={5000}
                placeholder={t('superadminSuporte.replyPlaceholder')}
                onChange={(e) => setReply((r) => ({ ...r, resolution: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setReplyTo(null)}>
              {t('superadminSuporte.cancel')}
            </Button>
            <Button onClick={() => void handleReply()} disabled={updateTicket.isPending}>
              {updateTicket.isPending ? t('superadminSuporte.saving') : t('superadminSuporte.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remover artigo */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('superadminSuporte.deleteTitle', { title: toDelete?.title })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('superadminSuporte.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('superadminSuporte.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteArticle();
              }}
            >
              {t('superadminSuporte.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
