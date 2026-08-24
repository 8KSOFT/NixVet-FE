'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  ChevronRight,
  LifeBuoy,
  Loader2,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  Ticket,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import {
  useCreateSupportTicketMutation,
  useSupportArticleQuery,
  useSupportArticlesQuery,
  useSupportChatMutation,
  useSupportFeedbackMutation,
  useSupportTicketsQuery,
} from '@/hooks/apiHooks/useSupport';
import {
  SUPPORT_MODULE_LABELS,
  SUPPORT_MODULES,
  SUPPORT_TICKET_STATUS_LABELS,
  type SupportTicketStatus,
} from '@/app/types/support';

interface ChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answered?: boolean;
  suggestEscalation?: boolean;
  articles?: Array<{ id: string; slug: string; title: string; module: string }>;
  feedback?: 'helpful' | 'not_helpful' | null;
}

const TICKET_STATUS_VARIANT: Record<SupportTicketStatus, 'default' | 'secondary' | 'destructive'> = {
  open: 'destructive',
  in_progress: 'default',
  resolved: 'secondary',
  closed: 'secondary',
};

const SUGGESTIONS = [
  'Como cancelo um orçamento?',
  'Como conecto o WhatsApp da clínica?',
  'Como confirmo um lançamento sugerido?',
  'A clínica consegue emitir nota fiscal pelo sistema?',
];

/**
 * Markdown mínimo: negrito, itálico e quebras de linha. É o que os artigos
 * usam — puxar uma lib inteira para isso não se paga.
 */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function ArticleBody({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {content.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith('#')) {
          return (
            <p key={i} className="pt-2 font-semibold">
              {renderInline(trimmed.replace(/^#+\s*/, ''))}
            </p>
          );
        }
        const isBullet = /^[-*]\s/.test(trimmed);
        const isNumbered = /^\d+\.\s/.test(trimmed);
        if (isBullet || isNumbered) {
          return (
            <p key={i} className="pl-4 text-muted-foreground">
              {renderInline(trimmed)}
            </p>
          );
        }
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

export default function AjudaPage() {
  const [tab, setTab] = useState('assistente');

  // ── Assistente ───────────────────────────────────────────────────────
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const chat = useSupportChatMutation();
  const feedback = useSupportFeedbackMutation();

  // ── Artigos ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const { data: articles = [], isLoading: loadingArticles } = useSupportArticlesQuery(
    debouncedSearch,
    moduleFilter,
  );
  const { data: openArticle, isLoading: loadingArticle } = useSupportArticleQuery(openSlug);

  // ── Chamados ─────────────────────────────────────────────────────────
  const { data: tickets = [], isLoading: loadingTickets } = useSupportTicketsQuery();
  const createTicket = useCreateSupportTicketMutation();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    module: 'geral',
    priority: 'normal' as 'low' | 'normal' | 'high',
    attachConversation: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [bubbles]);

  const articlesByModule = useMemo(() => {
    const groups = new Map<string, typeof articles>();
    for (const article of articles) {
      const list = groups.get(article.module) ?? [];
      list.push(article);
      groups.set(article.module, list);
    }
    return [...groups.entries()];
  }, [articles]);

  const lastAssistant = [...bubbles].reverse().find((b) => b.role === 'assistant');

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || chat.isPending) return;

    setBubbles((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }]);
    setInput('');

    try {
      const result = await chat.mutateAsync({ message: question, conversation_id: conversationId });
      setConversationId(result.conversation_id);
      setBubbles((prev) => [
        ...prev,
        {
          id: result.message_id,
          role: 'assistant',
          content: result.answer,
          answered: result.answered,
          suggestEscalation: result.suggest_escalation,
          articles: result.articles,
          feedback: null,
        },
      ]);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não consegui responder agora.');
      toast.error(message);
      setBubbles((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `${message} Se persistir, abra um chamado com o nosso time.`,
          answered: false,
          suggestEscalation: true,
        },
      ]);
    }
  };

  const handleFeedback = async (messageId: string, helpful: boolean) => {
    setBubbles((prev) =>
      prev.map((b) =>
        b.id === messageId ? { ...b, feedback: helpful ? 'helpful' : 'not_helpful' } : b,
      ),
    );
    try {
      await feedback.mutateAsync({ messageId, helpful });
    } catch {
      // Feedback é acessório — não vale interromper o usuário com erro.
    }
  };

  const openTicketDialog = () => {
    const firstQuestion = bubbles.find((b) => b.role === 'user')?.content ?? '';
    setTicketForm((f) => ({
      ...f,
      subject: f.subject || firstQuestion.slice(0, 120),
      description: f.description || firstQuestion,
      attachConversation: !!conversationId,
    }));
    setTicketOpen(true);
  };

  const submitTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast.error('Preencha o assunto e a descrição');
      return;
    }
    try {
      const ticket = await createTicket.mutateAsync({
        subject: ticketForm.subject,
        description: ticketForm.description,
        module: ticketForm.module,
        priority: ticketForm.priority,
        conversation_id: ticketForm.attachConversation ? conversationId : undefined,
      });
      toast.success(`Chamado #${ticket.number} aberto. O time do NixVet responde por e-mail.`);
      setTicketOpen(false);
      setTicketForm({
        subject: '',
        description: '',
        module: 'geral',
        priority: 'normal',
        attachConversation: true,
      });
      setTab('chamados');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao abrir chamado'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
          <p className="text-sm text-muted-foreground">
            Tire dúvidas sobre o uso do NixVet com a assistente ou fale com o nosso time.
          </p>
        </div>
        <Button variant="outline" onClick={openTicketDialog} className="w-full sm:w-auto">
          <Ticket className="mr-2 size-4" />
          Abrir chamado
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {/* Mobile: dropdown — 3 abas com ícone+texto ("Meus chamados" é o
            mais longo) não cabem lado a lado num viewport de telefone sem
            quebrar ou estourar a largura. Desktop mantém as abas normais. */}
        <div className="sm:hidden">
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assistente">
                <Bot className="mr-2 size-4" />
                Assistente
              </SelectItem>
              <SelectItem value="artigos">
                <BookOpen className="mr-2 size-4" />
                Artigos
              </SelectItem>
              <SelectItem value="chamados">
                <LifeBuoy className="mr-2 size-4" />
                Meus chamados
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TabsList className="hidden sm:inline-flex">
          <TabsTrigger value="assistente">
            <Bot className="mr-2 size-4" />
            Assistente
          </TabsTrigger>
          <TabsTrigger value="artigos">
            <BookOpen className="mr-2 size-4" />
            Artigos
          </TabsTrigger>
          <TabsTrigger value="chamados">
            <LifeBuoy className="mr-2 size-4" />
            Meus chamados
          </TabsTrigger>
        </TabsList>

        {/* ── Assistente ────────────────────────────────────────────── */}
        <TabsContent value="assistente" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[55vh] min-h-[320px] space-y-4 overflow-y-auto p-4">
                {bubbles.length === 0 && (
                  <div className="space-y-4 py-6 text-center">
                    <Bot className="mx-auto size-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Como posso ajudar?</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pergunte sobre como fazer algo no sistema. Eu respondo com base na base de
                        conhecimento do NixVet — não acesso os dados da sua clínica nem dou
                        orientação veterinária.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          className="h-auto max-w-full py-1.5 text-left whitespace-normal"
                          onClick={() => void send(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {bubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className={`flex gap-3 ${bubble.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {bubble.role === 'assistant' && (
                      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="size-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[85%] space-y-2 ${bubble.role === 'user' ? 'order-1' : ''}`}>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          bubble.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {bubble.role === 'assistant' ? (
                          <ArticleBody content={bubble.content} />
                        ) : (
                          bubble.content
                        )}
                      </div>

                      {bubble.articles && bubble.articles.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Artigos relacionados:</p>
                          {bubble.articles.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setOpenSlug(a.slug);
                                setTab('artigos');
                              }}
                              className="flex w-full items-center gap-1 rounded border px-2 py-1 text-left text-xs hover:bg-muted"
                            >
                              <ChevronRight className="size-3 shrink-0" />
                              <span className="truncate">{a.title}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {bubble.role === 'assistant' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Resolveu?</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            title="Ajudou"
                            onClick={() => void handleFeedback(bubble.id, true)}
                          >
                            <ThumbsUp
                              className={`size-3 ${bubble.feedback === 'helpful' ? 'text-green-600' : ''}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            title="Não ajudou"
                            onClick={() => void handleFeedback(bubble.id, false)}
                          >
                            <ThumbsDown
                              className={`size-3 ${bubble.feedback === 'not_helpful' ? 'text-destructive' : ''}`}
                            />
                          </Button>
                        </div>
                      )}
                    </div>
                    {bubble.role === 'user' && (
                      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="size-4" />
                      </div>
                    )}
                  </div>
                ))}

                {chat.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Consultando a base de conhecimento…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {lastAssistant?.suggestEscalation && (
                <div className="flex flex-col gap-2 border-t bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Não resolveu? O time de suporte do NixVet assume daqui.
                  </p>
                  <Button size="sm" onClick={openTicketDialog}>
                    <Ticket className="mr-2 size-4" />
                    Falar com o suporte
                  </Button>
                </div>
              )}

              <form
                className="flex gap-2 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escreva sua dúvida sobre o sistema…"
                  maxLength={2000}
                  disabled={chat.isPending}
                />
                <Button type="submit" disabled={chat.isPending || !input.trim()}>
                  {chat.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Artigos ───────────────────────────────────────────────── */}
        <TabsContent value="artigos" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar na central de ajuda…"
                className="pl-9"
              />
            </div>
            <Select
              value={moduleFilter || '_all'}
              onValueChange={(v) => setModuleFilter(v === '_all' ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Todos os módulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os módulos</SelectItem>
                {SUPPORT_MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {SUPPORT_MODULE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingArticles ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="space-y-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum artigo encontrado para essa busca.
                </p>
                <Button variant="outline" onClick={openTicketDialog}>
                  <Ticket className="mr-2 size-4" />
                  Abrir chamado com o suporte
                </Button>
              </CardContent>
            </Card>
          ) : (
            articlesByModule.map(([module, list]) => (
              <Card key={module}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">
                    {SUPPORT_MODULE_LABELS[module] ?? module}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {list.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => setOpenSlug(article.slug)}
                      className="flex w-full items-start gap-2 rounded-lg border p-3 text-left hover:bg-muted"
                    >
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium">{article.title}</p>
                        {article.summary && (
                          <p className="text-sm text-muted-foreground">{article.summary}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Chamados ──────────────────────────────────────────────── */}
        <TabsContent value="chamados" className="mt-4 space-y-3">
          {loadingTickets ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Você ainda não abriu nenhum chamado.
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        #{ticket.number} · {ticket.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {SUPPORT_MODULE_LABELS[ticket.module] ?? ticket.module}
                        {ticket.createdAt
                          ? ` · ${new Date(ticket.createdAt).toLocaleDateString('pt-BR')}`
                          : ''}
                      </p>
                    </div>
                    <Badge variant={TICKET_STATUS_VARIANT[ticket.status]} className="shrink-0">
                      {SUPPORT_TICKET_STATUS_LABELS[ticket.status]}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {ticket.description}
                  </p>
                  {ticket.resolution && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="mb-1 font-medium">Resposta do suporte</p>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {ticket.resolution}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Artigo aberto */}
      <Dialog open={!!openSlug} onOpenChange={(open) => !open && setOpenSlug(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{openArticle?.title ?? 'Carregando…'}</DialogTitle>
          </DialogHeader>
          {loadingArticle ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : openArticle ? (
            <div className="space-y-4">
              <Badge variant="secondary">
                {SUPPORT_MODULE_LABELS[openArticle.module] ?? openArticle.module}
              </Badge>
              <ArticleBody content={openArticle.content} />
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">Ainda com dúvida?</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpenSlug(null);
                    openTicketDialog();
                  }}
                >
                  <Ticket className="mr-2 size-4" />
                  Abrir chamado
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Abrir chamado */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Abrir chamado com o suporte NixVet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Assunto</Label>
              <Input
                value={ticketForm.subject}
                maxLength={200}
                onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Resuma o problema em uma linha"
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={ticketForm.description}
                maxLength={5000}
                rows={5}
                onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="O que você tentou fazer, o que aconteceu e em qual tela"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Módulo</Label>
                <Select
                  value={ticketForm.module}
                  onValueChange={(v) => setTicketForm((f) => ({ ...f, module: v }))}
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
                <Label>Prioridade</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(v: 'low' | 'normal' | 'high') =>
                    setTicketForm((f) => ({ ...f, priority: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta — está bloqueando o atendimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {conversationId && (
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={ticketForm.attachConversation}
                  onChange={(e) =>
                    setTicketForm((f) => ({ ...f, attachConversation: e.target.checked }))
                  }
                />
                Anexar a conversa com a assistente — ajuda o time a entender o contexto.
              </label>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setTicketOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submitTicket()} disabled={createTicket.isPending}>
              {createTicket.isPending ? 'Enviando…' : 'Abrir chamado'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
