export interface TeamUserRow {
  id: string;
  name: string;
  email: string;
  crmv?: string;
  specialty?: string;
  role: string;
}

export interface TeamUserFormValues {
  name: string;
  email: string;
  role: string;
  password: string;
  crmv?: string;
  specialty?: string;
}

export interface TeamAssignableRole {
  value: string;
  labelKey: string;
}
