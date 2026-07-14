export interface ClinicalTask {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  task_type: string;
  due_date: string | null;
  status: string;
  Patient?: { name: string };
}

export interface ClinicalTaskPayload {
  patient_id: string;
  task_type: string;
  due_date?: string;
}
