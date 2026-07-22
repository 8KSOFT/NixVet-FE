export interface VaccineReminder {
  id: string;
  patient_id: string;
  vaccine_name: string;
  next_due_date: string;
  reminder_status: string;
  patient?: { name: string };
}

export interface VaccineReminderPayload {
  patient_id: string;
  vaccine_name: string;
  next_due_date: string;
}
