export interface PatientTutor {
  id: string;
  name: string;
}

export interface PatientRow {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  chip_number?: string;
  tutor_id: string | null;
  no_tutor_reason?: string | null;
  tutor?: PatientTutor | null;
}

export interface SupportOption {
  id: number;
  description: string;
}

export interface PatientFormValues {
  name: string;
  tutor_choice: 'yes' | 'no';
  tutor_id?: string;
  no_tutor_reason?: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  chip_number?: string;
}

export interface SupportOptionsEnvelope {
  data?: SupportOption[] | SupportOptionsListEnvelope;
}

export interface SupportOptionsListEnvelope {
  items?: SupportOption[];
  content?: SupportOption[];
}

export interface TimelineConsultationData {
  status?: string;
  observations?: string;
}

export interface TimelineVaccineData {
  vaccine_name?: string;
  next_due_date?: string;
}

export interface TimelineExamRequestData {
  request_date?: string;
}

export interface TimelinePrescriptionData {
  prescription_type?: string;
  prescription_date?: string;
}

export type TimelineEventData =
  | TimelineConsultationData
  | TimelineVaccineData
  | TimelineExamRequestData
  | TimelinePrescriptionData
  | Record<string, unknown>;

export interface PatientTimelineEvent {
  type: string;
  date: string;
  id: string;
  data: TimelineEventData;
}

export interface PatientDetail {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  tutor?: { name: string } | null;
}
