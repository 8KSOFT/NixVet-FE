export interface PatientFile {
  id: string;
  original_filename: string;
  category: string;
  mime_type: string | null;
  created_at: string;
}

export interface PatientFileUploadUrlResponse {
  upload_url: string;
  storage_path: string;
}

export interface CreatePatientFilePayload {
  patient_id: string;
  category: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
}
