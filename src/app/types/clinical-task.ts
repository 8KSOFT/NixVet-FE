export interface ClinicalTask {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  task_type: string;
  due_date: string | null;
  status: string;
  patient?: { name: string; photo_url?: string | null };
}

export interface ClinicalTaskPayload {
  patient_id: string;
  task_type: string;
  due_date?: string;
}
