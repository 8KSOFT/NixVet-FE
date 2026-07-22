export interface ChatbotSettings {
  persona_name?: string;
  greeting_message?: string | null;
  farewell_message?: string | null;
  fallback_message?: string | null;
  emergency_message?: string | null;
  human_handoff_message?: string | null;
  system_prompt_extra?: string | null;
}
