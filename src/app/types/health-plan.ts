export interface HealthPlan {
  id: string;
  name: string;
  document?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  reimbursement_days?: number;
  active?: boolean;
}

/** Preço de um item de catálogo (exame, procedimento cirúrgico) por convênio. */
export interface CatalogPlanPrice {
  id: string;
  health_plan_id: string;
  health_plan_name: string | null;
  plan_price: number;
  reimbursement: number;
}

export interface CatalogPlanPricePayload {
  health_plan_id: string;
  plan_price: number;
  reimbursement: number;
}

export interface HealthPlanPayload {
  name: string;
  document?: string;
  contact_phone?: string;
  contact_email?: string;
  reimbursement_days?: number;
  active?: boolean;
}
