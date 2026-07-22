export interface Consultation {
  id: string;
  consultation_date: string;
  start_time?: string | null;
  end_time?: string | null;
  patient?: { id?: string; name: string; species?: string; breed?: string };
  veterinarian?: { id?: string; name: string };
  observations?: string | null;
  status?: string;
  paid?: boolean;
  price?: number | null;
  required_resources?: string[] | null;
  appointment_type?: {
    name: string;
    duration_minutes: number;
    color?: string | null;
  } | null;
}

export interface AvailabilitySlot {
  vetId: string;
  vetName: string;
  slots: string[];
}

export interface ConsultationPayload {
  patient_id: string;
  veterinarian_id: string;
  consultation_date: string;
  start_time: string;
  end_time: string;
  price: number;
  observations?: string;
  required_resources?: string[];
  appointment_type_id?: string;
  duration_minutes?: number;
  channel_origin?: string;
}
