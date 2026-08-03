'use client';

import React, { useState } from 'react';
import { BookOpen, FileWarning, Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  SUPPORT_MODULE_LABELS,
  SUPPORT_MODULES,
  SUPPORT_TICKET_STATUS_LABELS,
  type SupportArticle,
  type SupportTicket,
} from '@/app/types/support';

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
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }
    try {
      await saveArticle.mutateAsync({ id: editing.id, payload: editing.payload });
      toast.success(editing.id ? 'Artigo atualizado.' : 'Artigo criado.');
      setEditing(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar artigo'));
    }
  };

  const handleDeleteArticle = async () => {
    if (!toDelete) return;
    try {
      await deleteArticle.mutateAsync(toDelete.id);
      toast.success('Artigo removido.');
      setToDelete(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover artigo'));
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
      toast.success('Chamado atualizado.');
      setReplyTo(null);
      setReply({ status: 'resolved', resolution: '' });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar chamado'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suporte</h1>
        <p className="text-sm text-muted-foreground">
          Chamados das clínicas, base de conhecimento da assistente e perguntas que ela ainda não
          sabe responder.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Chamados abertos" value={stats.open_tickets} icon={Ticket} />
          <StatCard label="Lacunas pendentes" value={stats.pending_gaps} icon={FileWarning} />
          <StatCard label="Artigos publicados" value={stats.published_articles} icon={BookOpen} />
          <StatCard label="Rascunhos" value={stats.draft_articles} icon={Pencil} />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="chamados">Chamados</TabsTrigger>
          <TabsTrigger value="lacunas">Lacunas</TabsTrigger>
          <TabsTrigger value="artigos">Base de conhecimento</TabsTrigger>
        </TabsList>

        {/* ── Chamados ──────────────────────────────────────────────── */}
        <TabsContent value="chamados" className="mt-4 space-y-3">
          <Select
            value={ticketStatus || '_all'}
            onValueChange={(v) => setTicketStatus(v === '_all' ? '' : v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos os status</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="closed">Fechados</SelectItem>
            </SelectContent>
          </Select>

          {loadingTickets ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum chamado neste filtro.
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
                        {SUPPORT_MODULE_LABELS[ticket.module] ?? ticket.module}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.priority === 'high' && <Badge variant="destructive">Alta</Badge>}
                      <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                        {SUPPORT_TICKET_STATUS_LABELS[ticket.status]}
                      </Badge>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {ticket.description}
                  </p>
                  {ticket.resolution && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="mb-1 font-medium">Resposta registrada</p>
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
                      Responder / mudar status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Lacunas ───────────────────────────────────────────────── */}
        <TabsContent value="lacunas" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Select value={gapStatus} onValueChange={setGapStatus}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="answered">Respondidas</SelectItem>
                <SelectItem value="dismissed">Descartadas</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Perguntas que a base não cobriu, das mais repetidas para as menos.
            </p>
          </div>

          {loadingGaps ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : gaps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma lacuna neste filtro — a base está cobrindo o que perguntam.
              </CardContent>
            </Card>
          ) : (
            gaps.map((gap) => (
              <Card key={gap.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{gap.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {gap.occurrences}× perguntada
                      {gap.last_seen_at
                        ? ` · última em ${new Date(gap.last_seen_at).toLocaleDateString('pt-BR')}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => writeArticleForGap(gap.question)}>
                      Escrever artigo
                    </Button>
                    {gap.status !== 'dismissed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateGap.mutate({ id: gap.id, status: 'dismissed' })
                        }
                      >
                        Descartar
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
              placeholder="Buscar por título, palavra-chave ou conteúdo…"
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
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setEditing({ payload: { ...EMPTY_ARTICLE } })}>
              <Plus className="mr-2 size-4" />
              Novo artigo
            </Button>
          </div>

          {loadingArticles ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum artigo encontrado.
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
                        {SUPPORT_MODULE_LABELS[article.module] ?? article.module}
                      </Badge>
                      {article.status === 'draft' && <Badge variant="outline">Rascunho</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      /{article.slug} · {article.view_count} leituras · 👍 {article.helpful_count} · 👎{' '}
                      {article.not_helpful_count}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
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
                      title="Remover"
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
            <DialogTitle>{editing?.id ? 'Editar artigo' : 'Novo artigo'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Título</Label>
                <Input
                  value={editing.payload.title}
                  maxLength={255}
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, title: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Resumo</Label>
                <Input
                  value={editing.payload.summary ?? ''}
                  maxLength={500}
                  placeholder="Uma linha — aparece na lista da central de ajuda"
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, summary: e.target.value } })
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Módulo</Label>
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
                          {SUPPORT_MODULE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
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
                      <SelectItem value="draft">Rascunho (a IA não usa)</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Palavras-chave</Label>
                <Input
                  value={editing.payload.keywords ?? ''}
                  placeholder="Termos alternativos que o usuário usaria, separados por vírgula"
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, keywords: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Conteúdo</Label>
                <Textarea
                  value={editing.payload.content}
                  rows={14}
                  className="font-mono text-sm"
                  placeholder="Passo a passo. Use **negrito** para nomes de menu e botões."
                  onChange={(e) =>
                    setEditing((s) => s && { ...s, payload: { ...s.payload, content: e.target.value } })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  A assistente responde apenas com o que estiver aqui. Cite os nomes de menu e botões
                  exatamente como aparecem na tela.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveArticle()} disabled={saveArticle.isPending}>
              {saveArticle.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Responder chamado */}
      <Dialog open={!!replyTo} onOpenChange={(open) => !open && setReplyTo(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chamado #{replyTo?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={reply.status} onValueChange={(v) => setReply((r) => ({ ...r, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Resposta</Label>
              <Textarea
                rows={6}
                value={reply.resolution}
                maxLength={5000}
                placeholder="Fica visível para a clínica na aba Meus chamados"
                onChange={(e) => setReply((r) => ({ ...r, resolution: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setReplyTo(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleReply()} disabled={updateTicket.isPending}>
              {updateTicket.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remover artigo */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A assistente deixa de usar este artigo imediatamente. Se a ideia é só tirar do ar,
              prefira mudar o status para Rascunho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteArticle();
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
