export interface ExamFollowup {
  id: string;
  exam_request_id: string;
  patient_id: string;
  expected_result_date: string | null;
  followup_status: string;
  followup_consultation_id: string | null;
  ExamRequest?: { id: string };
  Patient?: { name: string };
}

export interface FollowupFormValues {
  exam_request_id: string;
  patient_id: string;
  expected_result_date?: string;
}

export interface FollowupExamRequestOption {
  id: string;
}

export interface FollowupPatientOption {
  id: string;
  name: string;
}
