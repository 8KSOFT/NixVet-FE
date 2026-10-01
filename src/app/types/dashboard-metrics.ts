export interface DashboardMetrics {
  consultations_today: number;
  vaccines_due: number;
  exams_awaiting_followup: number;
  unanswered_conversations: number;
  awaiting_tutor_conversations: number;
  monthly_revenue: number;
  /** Agregados que o front calculava baixando a base inteira (01/10/2026). */
  new_patients_month?: number;
  cancelled_month?: number;
  /** Consultas por dia, últimos 7 dias; índice 6 = hoje. */
  consultations_last7?: number[];
  /** Mês corrente em 5 fatias do dia 1 até agora. */
  month_buckets?: { new_patients: number[]; revenue: number[] };
}
