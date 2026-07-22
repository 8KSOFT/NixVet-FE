export interface AiUsageSummary {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_calls: number;
}

export interface AiUsageByOperation {
  operation: string;
  tokens: number;
  cost_usd: number;
  calls: number;
}

export interface AiUsageDaily {
  date: string;
  tokens: number;
  cost_usd: number;
  calls: number;
}

export interface AiUsageRecentLog {
  id: string;
  operation: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  conversation_id: string | null;
  created_at: string;
}

export interface AiUsageResponse {
  summary: AiUsageSummary;
  by_operation: AiUsageByOperation[];
  daily: AiUsageDaily[];
  recent: AiUsageRecentLog[];
}
