export interface TeamUserRow {
  id: string;
  name: string;
  email: string;
  crmv?: string;
  specialty?: string;
  sipeagro_number?: string;
  role: string;
  /** URL pré-assinada da foto de perfil — expira, não guardar. */
  photo_url?: string | null;
}

export interface TeamUserFormValues {
  name: string;
  email: string;
  role: string;
  password: string;
  crmv?: string;
  specialty?: string;
  sipeagro_number?: string;
  accessProfileIds: string[];
}

export interface TeamAssignableRole {
  value: string;
  labelKey: string;
}

export interface ProfilePayload {
  name: string;
  email: string;
  crmv: string;
  specialty: string;
  sipeagro_number?: string;
  password?: string;
}
