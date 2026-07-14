export interface TenantMe {
  id?: string;
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  cep?: string;
  cpf_cnpj?: string;
  brand_name?: string;
  logo_url?: string;
  primary_color?: string;
  subdomain?: string;
  custom_domain?: string;
  whatsapp_ai_chatbot_enabled?: boolean;
  ai_platform_enabled?: boolean;
}

export type TenantMePayload = Partial<TenantMe>;

export interface CreateTenantPayload {
  name: string;
  code: string;
  initialUser?: {
    name: string;
    email: string;
    password: string;
  };
}

/** Linha da listagem de clínicas (superadmin) — mesmo recurso de `SuperadminTenantDetail`, shape reduzido. */
export interface SuperadminTenantRow {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  whatsapp_ai_chatbot_enabled: boolean;
  ai_platform_enabled: boolean;
  billing_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  cancel_at?: string | null;
  admin_email: string | null;
  admin_name: string | null;
}

export interface SuperadminTenantDetail extends SuperadminTenantRow {
  address: string | null;
  cpf_cnpj: string | null;
  createdAt?: string;
}

export interface CreateSuperadminTenantPayload {
  name: string;
  code: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
  whatsapp_ai_chatbot_enabled: boolean;
  ai_platform_enabled: boolean;
  billing_plan: string;
}

export type PatchSuperadminTenantPayload = Partial<
  Pick<
    SuperadminTenantDetail,
    | 'name'
    | 'email'
    | 'phone'
    | 'whatsapp_ai_chatbot_enabled'
    | 'ai_platform_enabled'
    | 'billing_plan'
    | 'subscription_status'
    | 'trial_ends_at'
  >
>;

export interface ResetAdminPasswordPayload {
  newPassword: string;
}

export interface ProvisionSuperadminWhatsappPayload {
  tenantId: string;
  instanceName: string;
}
