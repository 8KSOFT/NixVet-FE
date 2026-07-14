export type ClinicalTermType = 'no_medical_discharge' | 'hospitalization_refusal';

export interface ClinicalTerm {
  id: string;
  type: ClinicalTermType;
  patient_id: string | null;
  responsible_name: string;
  responsible_document: string | null;
  reason: string | null;
  created_at: string;
}

export interface ClinicalTermPayload {
  type: ClinicalTermType;
  patient_id?: string;
  responsible_name: string;
  responsible_document?: string;
  reason?: string;
}
