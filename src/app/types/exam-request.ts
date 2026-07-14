export interface ExamRequest {
  id: string;
  createdAt: string;
  consultation?: {
    patient?: {
      id: string;
      name: string;
      tutor?: { name: string };
    };
  };
  patient?: {
    id: string;
    name: string;
    tutor?: { name: string };
  };
  veterinarian: { name: string };
  requested_exams: string[];
}

export interface ExamOption {
  id: number;
  name: string;
  area?: { name: string };
}

export interface ExamAreaOption {
  id: number;
  name: string;
}

export interface Exam {
  id: number;
  name: string;
  exam_area_id?: number;
  exam_area?: ExamAreaOption;
  private_price?: number | null;
  lab_cost?: number | null;
  tax_percentage?: number | null;
  is_third_party?: boolean;
}

export interface ExamPayload {
  name: string;
  area_id?: number;
  private_price?: number;
  lab_cost?: number;
  tax_percentage?: number;
  is_third_party?: boolean;
}

export interface ExamPatientOption {
  id: string;
  name: string;
  species?: string;
  tutor?: { name: string };
}

export interface ConsultationOption {
  id: string;
  patient_id?: string;
  patient?: { id: string };
  consultation_date: string;
  veterinarian?: { name: string };
}

export interface ExamRequestFormValues {
  patient_id: string;
  consultation_id?: string;
  request_date?: string;
  clinical_notes?: string;
}

export interface StoredUser {
  id: string;
}

export interface CreateExamRequestPayload {
  veterinarian_id: string;
  requested_exams: string[];
  clinical_notes?: string;
  consultation_id?: string;
  patient_id?: string;
  request_date?: string | null;
}
