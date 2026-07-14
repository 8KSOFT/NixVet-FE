export type FinancialEntryStatus = 'suggested' | 'confirmed' | 'cancelled';

export interface FinancialEntry {
  id: string;
  entry_date: string;
  type: string;
  category: string;
  payment_source: string;
  payment_method: string;
  status: FinancialEntryStatus;
  base_amount: number | null;
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  discount_amount: number;
  reference_type: string | null;
  description: string | null;
}

export interface PaymentOption {
  method: string;
  fee_percentage: number;
  settlement_days: number;
  modality: 'a_vista' | 'a_prazo';
  client_pays: number;
  fee_amount: number;
  clinic_receives: number;
}

export interface DRE {
  gross_revenue: number;
  deductions: number;
  net_revenue: number;
  operational_costs: number;
  gross_profit: number;
  breakdown: {
    by_category: Record<string, number>;
    by_payment_source: { particular: number; health_plan: number };
    by_payment_method: Record<string, number>;
  };
}

export interface MonthlyDRE extends DRE {
  period: string;
}

export interface PaymentMethodCostData {
  volume: number;
  fee_total: number;
}

export interface RevenueSummary {
  gross_revenue: number;
  total_cost: number;
  net_revenue: number;
  margin_pct: number;
}

export interface RevenuePeriodItem {
  date: string;
  gross: number;
  net: number;
}

export interface RevenueLineItem {
  description: string | null;
  item_type: string;
  quantity: number;
  charged_amount: number;
  cost_amount: number;
  net_amount: number;
  payment_source: 'particular' | 'health_plan';
  health_plan_name: string | null;
}

export interface RevenueAnalysis {
  summary: RevenueSummary;
  by_period: RevenuePeriodItem[];
  items: RevenueLineItem[];
}

export interface PaymentSetting {
  id: string;
  method: string;
  fee_percentage: number;
  settlement_days: number;
  active: boolean;
}

export interface PaymentSettingPayload {
  fee_percentage: number;
  settlement_days: number;
}
