export type ClinicalTermType = 'no_medical_discharge' | 'hospitalization_refusal';

export interface ClinicalTerm {
  id: string;
  type: ClinicalTermType;
  patient_id: string | null;
  /** Incluído pela listagem desde 01/10/2026 (só id e nome). */
  patient?: { id: string; name: string } | null;
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
