export interface Prescription {
  id: string;
  createdAt: string;
  consultation?: {
    patient?: { id: string; name: string; tutor?: { name: string } };
  };
  patient?: { id: string; name: string; tutor?: { name: string } };
  patient_id?: string;
  veterinarian: { name: string };
  prescription_type?: string;
}

export interface CreatePrescriptionPayload {
  veterinarian_id: string;
  prescription_type: string;
  observations?: string;
  consultation_id?: string;
  patient_id?: string;
  prescription_date?: string | null;
  medications?: Array<Record<string, unknown>>;
  surgical_procedure_ids?: number[];
}
