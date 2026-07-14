export type FinanceFilter =
  | 'all'
  | 'active'
  | 'overdue'
  | 'trial'
  | 'trial_expiring'
  | 'trial_expired'
  | 'suspended';

export interface FinanceDashboardData {
  period: { from: string; to: string };
  kpis: {
    mrr_brl: number;
    revenue_period_brl: number;
    ai_cost_usd: number;
    ai_tokens: number;
    ai_calls: number;
    ai_cost_usd_period?: number;
    ai_calls_period?: number;
    ai_cost_usd_all_time?: number;
    ai_calls_all_time?: number;
    tenants_total: number;
    active: number;
    overdue: number;
    trial: number;
    trial_expiring: number;
    trial_expired: number;
    suspended: number;
  };
  monthly_revenue: Array<{ month: string; value_brl: number; payments: number }>;
  monthly_ai_cost: Array<{ month: string; cost_usd: number; tokens: number; calls: number }>;
  ai_by_operation: Array<{ operation: string; tokens: number; cost_usd: number; calls: number }>;
  top_ai_tenants: Array<{
    tenant_id: string;
    tenant_name: string;
    tenant_code: string;
    cost_usd: number;
    tokens: number;
    calls: number;
  }>;
}

export interface FinanceTenantRow {
  id: string;
  name: string;
  code: string;
  admin_email: string | null;
  subscription_status: string | null;
  billing_plan: string | null;
  plan_value_brl: number;
  trial_ends_at: string | null;
  ai_cost_usd: number;
  ai_tokens: number;
  ai_calls: number;
  access_status: string;
}
