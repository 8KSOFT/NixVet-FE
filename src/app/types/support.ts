export const SUPPORT_MODULES = [
  'geral',
  'agenda',
  'pacientes',
  'tutores',
  'prontuario',
  'atendimento',
  'internacao',
  'exames',
  'prescricoes',
  'orcamentos',
  'financeiro',
  'estoque',
  'whatsapp',
  'relatorios',
  'configuracoes',
  'conta',
  'mobile',
] as const;

export type SupportModule = (typeof SUPPORT_MODULES)[number];

export const SUPPORT_MODULE_LABELS: Record<string, string> = {
  geral: 'Geral',
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  tutores: 'Tutores',
  prontuario: 'Prontuário',
  atendimento: 'Atendimento',
  internacao: 'Internação',
  exames: 'Exames',
  prescricoes: 'Prescrições',
  orcamentos: 'Orçamentos',
  financeiro: 'Financeiro',
  estoque: 'Estoque',
  whatsapp: 'WhatsApp',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
  conta: 'Conta',
  mobile: 'App mobile',
};

export interface SupportArticleSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  module: string;
}

export interface SupportArticle extends SupportArticleSummary {
  content: string;
  keywords: string | null;
  status: 'draft' | 'published';
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface SupportChatResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  /** false = a base não cobria a pergunta; o usuário deve escalar. */
  answered: boolean;
  suggest_escalation: boolean;
  articles: Array<{ id: string; slug: string; title: string; module: string }>;
}

export interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  article_ids: string[] | null;
  answered: boolean;
  feedback: 'helpful' | 'not_helpful' | null;
  createdAt?: string;
}

export interface SupportConversation {
  id: string;
  title: string | null;
  status: 'open' | 'resolved' | 'escalated';
  last_message_at: string | null;
  createdAt?: string;
}

export interface SupportConversationDetail extends SupportConversation {
  messages: SupportMessage[];
  articles: Array<{ id: string; slug: string; title: string; module: string }>;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  number: number;
  subject: string;
  description: string;
  module: string;
  status: SupportTicketStatus;
  priority: 'low' | 'normal' | 'high';
  resolution: string | null;
  resolved_at: string | null;
  user_name: string | null;
  user_email: string | null;
  clinic_name?: string | null;
  createdAt?: string;
}

export interface SupportGap {
  id: string;
  question: string;
  occurrences: number;
  status: 'pending' | 'answered' | 'dismissed';
  article_id: string | null;
  last_seen_at: string | null;
}

export interface SupportStats {
  open_tickets: number;
  pending_gaps: number;
  published_articles: number;
  draft_articles: number;
}

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
};
