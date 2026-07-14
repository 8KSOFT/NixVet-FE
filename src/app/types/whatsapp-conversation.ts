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

export interface WhatsappMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body_text: string | null;
  created_at?: string;
  createdAt?: string;
}
