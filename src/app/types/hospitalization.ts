export interface Hospitalization {
  id: string;
  reason: string;
  admission_date: string;
  status: string;
  box_number: string | null;
  payment_source: string;
  daily_rate: number;
  patient: { id: string; name: string; species: string };
  veterinarian: { id: string; name: string };
}

export interface HospitalizationPatientOption {
  id: string;
  name: string;
}

export interface HospitalizationUserOption {
  id: string;
  name: string;
}

export interface HealthPlanOption {
  id: string;
  name: string;
}

export interface HospitalizationFormValues {
  patient_id: string;
  veterinarian_id: string;
  reason: string;
  diagnosis: string;
  admission_date: string;
  box_number: string;
  payment_source: string;
  health_plan_id: string;
  daily_rate: number;
  notes: string;
  belongings: string;
}

export interface PaginatedListEnvelope<TItem> {
  data?: TItem[];
  items?: TItem[];
  total?: number;
}
