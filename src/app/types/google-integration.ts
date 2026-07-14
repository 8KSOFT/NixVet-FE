export interface GoogleEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string | null;
  isFromNixVet: boolean;
}

export interface GoogleIntegrationStatus {
  connected: boolean;
  tokenStatus?: string;
  calendarId?: string;
  accountEmail?: string;
  syncDirection?: string;
  lastSyncAt?: string | null;
  [key: string]: unknown;
}

export interface GoogleCalendarOption {
  id: string;
  summary: string;
  primary?: boolean;
}

export interface GoogleCalendarSettingsPayload {
  calendarId: string;
  syncDirection: string;
}
