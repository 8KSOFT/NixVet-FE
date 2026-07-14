export interface WhatsappNumberRow {
  id: string;
  phone_number_id: string;
  display_phone: string | null;
  is_active: boolean;
}

export interface WhatsappNumberStatus {
  connected: boolean;
  smartphoneConnected: boolean;
  error?: string;
}

export interface RegisterWhatsappNumberPayload {
  phone_number_id: string;
  access_token: string;
  display_phone?: string;
}

export interface ProvisionWhatsappPayload {
  tenantId?: string;
  instanceName?: string;
}
