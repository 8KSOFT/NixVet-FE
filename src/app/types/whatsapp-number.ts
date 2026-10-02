/**
 * Número de WhatsApp da clínica. Desde 02/10/2026 (saída da Z-API) todo número
 * de clínica é Baileys: nasce sem credencial e pareia lendo o QR Code.
 */
export interface WhatsappNumberRow {
  id: string;
  /** Identificador interno (`baileys-<uuid>`) — não é o telefone. */
  phone_number_id: string;
  display_phone: string | null;
  is_active: boolean;
  /** `baileys` (QR Code) ou `cloud` (oficial). */
  provider?: string;
  /** `pending` até o primeiro pareamento, `live` conectado, `failed` caiu. */
  onboarding_status?: 'pending' | 'embed_sent' | 'live' | 'failed';
}

/** Por que a sessão parou, quando a parada foi decisão do worker. */
export type WhatsappNumberStatusMotivo =
  | 'sessao_encerrada'
  | 'sessao_assumida_por_outro_dispositivo'
  | 'numero_bloqueado';

export interface WhatsappNumberStatus {
  connected: boolean;
  smartphoneConnected: boolean;
  motivo?: WhatsappNumberStatusMotivo;
}

export interface RegisterBaileysNumberPayload {
  /** Só dígitos; opcional — serve para a equipe reconhecer o número na lista. */
  display_phone?: string;
}
