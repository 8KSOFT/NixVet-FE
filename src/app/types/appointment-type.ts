export interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  color: string | null;
  is_active?: boolean;
}

export interface AppointmentTypePayload {
  name: string;
  duration_minutes: number;
  color?: string;
}
