export interface Holiday {
  id: string;
  date: string;
  name: string;
  is_recurring: boolean;
  is_regional: boolean;
  city: string | null;
  state: string | null;
}

export interface HolidayPayload {
  date: string;
  name: string;
  is_recurring: boolean;
  is_regional: boolean;
  city: string | null;
  state: string | null;
}

export interface AiHolidaySuggestion {
  date: string;
  name: string;
  is_recurring?: boolean;
  is_regional?: boolean;
}

export interface AiHolidaySuggestPayload {
  city: string;
  state: string;
  year: number;
}

export interface SaveHolidaySuggestionsPayload {
  holidays: Array<{
    date: string;
    name: string;
    is_recurring: boolean;
    is_regional: boolean;
  }>;
  city: string;
  state: string;
}
