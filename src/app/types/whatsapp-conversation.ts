export interface ConversationMetrics {
  unanswered_conversations: number;
  average_response_time: number;
  conversations_waiting_clinic: number;
  conversations_waiting_tutor: number;
}

export interface AlertConversation {
  id: string;
  tutor_phone: string;
  status: string;
  waiting_since: string | null;
}

export type ThreadStatus = 'waiting_clinic' | 'waiting_tutor' | 'resolved' | null;

export interface Conversation {
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

export interface WhatsappConversationStats {
  open_count: number;
  closed_today: number;
  classified_today: number;
}

export type WhatsappMediaKind = 'image' | 'audio' | 'video' | 'document' | 'sticker';

/**
 * pending      — mídia identificada, download ainda em andamento
 * stored       — disponível para ver/baixar (janela de 7 dias)
 * expired      — passou dos 7 dias; o arquivo saiu do servidor
 * unavailable  — não foi possível recuperar (a Z-API apaga em 30 dias)
 */
export type WhatsappMediaStatus = 'pending' | 'stored' | 'expired' | 'unavailable';

export interface WhatsappMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body_text: string | null;
  /** 'text' | 'interactive_reply' | um WhatsappMediaKind. */
  type?: string;
  media_status?: WhatsappMediaStatus | null;
  media_mime?: string | null;
  media_filename?: string | null;
  media_size_bytes?: number | null;
  media_duration_seconds?: number | null;
  media_expires_at?: string | null;
  /** Preenchido quando o remetente apaga a mensagem no WhatsApp ("apagar para todos"). */
  revoked_at?: string | null;
  created_at?: string;
  createdAt?: string;
}
