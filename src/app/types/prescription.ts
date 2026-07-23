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

/** Modelo legal do receituário na assinatura digital (Portaria 837/25, Portaria SVS/MS 344/98, IN MAPA 35/2017). */
export type PrescriptionLegalModel = 'SIMPLE' | 'SPECIAL_CONTROL' | 'VET_NOTIFICATION';

export type SignatureStatus = 'UNSIGNED' | 'PENDING' | 'SIGNING' | 'SIGNED' | 'REVOKED' | 'EXPIRED';

export interface PrescriptionSignature {
  id?: string;
  status: SignatureStatus;
  signing_method?: 'ADVANCED' | 'QUALIFIED_ICP';
  verification_url?: string;
  serial_number?: string | null;
  is_controlled?: boolean;
  signed_at?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  public_token?: string;
  private_code?: string;
}

export interface SignPrescriptionPayload {
  prescription_type: PrescriptionLegalModel;
  is_human_antibacterial?: boolean;
}
