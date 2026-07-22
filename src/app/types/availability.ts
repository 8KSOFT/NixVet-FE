export interface BusinessHour {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  is_24h?: boolean;
}

export interface BusinessHourBatchPayload {
  days: number[];
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
  is_24h: boolean;
}

export interface EmergencyHour {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface EmergencyHourPayload {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface VetSchedule {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  schedule_type: 'regular' | 'on_call';
  user?: { name: string };
}

export interface VetSchedulePayload {
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  schedule_type: string;
}
