export interface WorkflowConfig {
  id: string;
  event_name: string;
  action_type: string;
  delay_minutes: number;
  channel: string | null;
  template_message: string | null;
  description: string | null;
  is_active: boolean;
}

export interface WorkflowConfigPayload {
  event_name: string;
  action_type: string;
  delay_minutes: number;
  channel?: string;
  template_message?: string;
  description?: string;
  is_active: boolean;
}
