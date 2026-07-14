export interface MedicalRecordVaccine {
  name: string;
  date: string;
  batch?: string;
  next_dose?: string;
}

export interface MedicalRecordAttachment {
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
}

export interface MedicalRecordPatientRef {
  id: string;
  name: string;
  species?: string;
  breed?: string;
}

export interface MedicalRecordVetRef {
  id: string;
  name: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  veterinarian_id: string | null;
  record_type: string;
  record_date: string;
  chief_complaint: string | null;
  anamnesis?: string | null;
  physical_exam?: string | null;
  diagnosis: string | null;
  observations?: string | null;
  weight_kg?: number | null;
  temperature_c?: number | null;
  lymph_nodes?: string | null;
  hydration?: string | null;
  mucous_membranes?: string | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  capillary_refill_time?: number | null;
  team_notes?: string | null;
  status: string;
  vaccines?: MedicalRecordVaccine[] | null;
  attachments?: MedicalRecordAttachment[] | null;
  consultation_id?: string | null;
  patient?: MedicalRecordPatientRef;
  veterinarian?: MedicalRecordVetRef | null;
  createdAt?: string;
}

export interface MedicalRecordCreatePayload {
  patient_id: string;
  veterinarian_id?: string;
  record_type?: string;
  record_date?: string;
  chief_complaint?: string;
}

export interface MedicalRecordUpdatePayload {
  chief_complaint?: string;
  anamnesis?: string;
  diagnosis?: string;
  observations?: string;
  weight_kg?: number | null;
  temperature_c?: number | null;
  lymph_nodes?: string;
  hydration?: string;
  mucous_membranes?: string;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  capillary_refill_time?: number | null;
  team_notes?: string;
  status?: string;
}

export interface AddVaccinePayload {
  name: string;
  date: string;
  batch?: string;
  next_dose?: string;
}

/** Visões resumidas usadas na tela de detalhe da ficha (abas de prescrições/exames/vacinas do paciente). */
export interface RecordPrescriptionSummary {
  id: string;
  prescription_date: string;
  medications: string;
  prescription_type: string;
}

export interface RecordExamRequestSummary {
  id: string;
  request_date: string;
  exam_type: string;
  status: string;
}

export interface RecordVaccineHistoryItem {
  id: string;
  vaccine_name: string;
  application_date: string;
  next_due_date: string;
  batch_number: string;
}
