export interface Hospitalization {
  id: string;
  reason: string;
  diagnosis?: string | null;
  admission_date: string;
  actual_discharge_date?: string | null;
  status: string;
  box_number: string | null;
  payment_source: string;
  daily_rate: number;
  notes?: string | null;
  belongings?: string | null;
  medical_record_id?: string | null;
  patient: { id: string; name: string; species: string; breed?: string | null; tutor?: { name: string } };
  veterinarian: { id: string; name: string };
}

export interface HospitalizationCreatePayload {
  patient_id: string;
  veterinarian_id?: string;
  reason: string;
  diagnosis?: string;
  admission_date: string;
  box_number?: string;
  payment_source: string;
  health_plan_id?: string;
  daily_rate: number;
  notes?: string;
  belongings?: string;
}

export interface DischargePayload {
  actual_discharge_date: string;
  discharge_condition: string;
  discharge_instructions: string;
}

export interface HospitalizationCost {
  id: string;
  type: string;
  date: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  covered_by_plan: boolean;
  plan_coverage_amount: number;
  patient_responsibility_amount: number;
}

export interface HospitalizationCostSummary {
  total_gross: number;
  plan_coverage: number;
  patient_responsibility: number;
  breakdown: Record<string, number>;
}

export interface HospitalizationCostPayload {
  type: string;
  date: string;
  description: string;
  quantity: number;
  unit_price: number;
  covered_by_plan: boolean;
  plan_coverage_amount: number;
}

export interface HospitalizationEvolution {
  id: string;
  recorded_at: string;
  evolution_type: string;
  heart_rate: number | null;
  temperature_c: number | null;
  spo2_percent: number | null;
  respiratory_rate: number | null;
  subjective: string | null;
  assessment: string | null;
  plan: string | null;
  veterinarian: { name: string };
}

export interface HospitalizationEvolutionPayload {
  evolution_type: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  heart_rate?: number;
  temperature_c?: number;
  spo2_percent?: number;
}

export interface HospitalizationMedAdmin {
  id: string;
  scheduled_datetime: string;
  administered_datetime: string | null;
  status: string;
}

export interface HospitalizationMedSchedule {
  id: string;
  medication_name: string;
  dose: string;
  route: string;
  frequency_hours: number;
  active: boolean;
  administrations: HospitalizationMedAdmin[];
}

export interface HospitalizationMedicationPayload {
  medication_name: string;
  route: string;
  dose: string;
  frequency_hours: number;
  start_datetime: string;
  instructions: string;
}

export interface HospitalizationSbarReport {
  id: string;
  report_date: string;
  suspicion: string | null;
  brief_history: string | null;
  assessment: string | null;
  recommendations: string | null;
  ai_reviewed: boolean;
  ai_reviewed_at: string | null;
  author?: { id: string; name: string };
}

export interface HospitalizationSbarPayload {
  report_date: string;
  suspicion: string;
  brief_history: string;
  assessment: string;
  recommendations: string;
}

export interface HospitalizationVisit {
  id: string;
  visited_at: string;
  visitor_name: string | null;
  notes: string | null;
  registrar?: { id: string; name: string };
}

export interface HospitalizationVisitPayload {
  visited_at: string;
  visitor_name: string;
  notes: string;
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
