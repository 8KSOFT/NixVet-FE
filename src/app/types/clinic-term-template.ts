export interface ClinicTermTemplate {
  id: string;
  name: string;
  term_type: string;
  mime_type: string | null;
  is_active: boolean;
  display_order: number;
}

export interface ClinicTermTemplateUploadUrlResponse {
  upload_url: string;
  storage_path: string;
}

export interface CreateClinicTermTemplatePayload {
  name: string;
  term_type: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  display_order: number;
}
