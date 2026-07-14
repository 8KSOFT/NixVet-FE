export interface BudgetItem {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  covered_by_plan: boolean;
  plan_coverage_amount: number;
  reference_id?: string | null;
  reference_type?: string | null;
  unit_price_formatted?: string;
  total_price_formatted?: string;
  plan_coverage_amount_formatted?: string;
}

export interface BudgetSummary {
  currency: string;
  total: number;
  total_formatted: string;
  plan_coverage: number;
  plan_coverage_formatted: string;
  tutor_responsibility: number;
  tutor_responsibility_formatted: string;
}

export interface Budget {
  id: string;
  type: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  patient: { id: string; name: string };
  veterinarian: { id: string; name: string } | null;
  items: BudgetItem[];
  summary?: BudgetSummary;
  created_at: string;
}

export type BudgetType = 'procedure' | 'hospitalization';
export type BudgetItemType = 'procedure' | 'product';

export interface BudgetPayloadItem {
  item_type: BudgetItemType;
  reference_id?: string;
  description?: string;
  quantity: number;
  unit_price?: number;
  discount_percentage: number;
  covered_by_plan: boolean;
  plan_coverage_amount: number;
}

export interface BudgetPayload {
  patient_id: string;
  veterinarian_id?: string;
  type: BudgetType;
  valid_until: string;
  notes: string;
  items: BudgetPayloadItem[];
}
