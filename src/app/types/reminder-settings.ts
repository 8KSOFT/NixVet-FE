export interface ReminderSettings {
  confirmation_enabled: boolean;
  confirmation_hours_before: number;
  reminder_enabled: boolean;
  reminder_hours_before: number;
  follow_up_enabled: boolean;
  follow_up_hours_after: number;
  follow_up_only_when_completed: boolean;
}
