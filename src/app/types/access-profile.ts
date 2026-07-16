import type { Permission } from '@/app/types/permission';

export interface AccessProfile {
  id: string;
  tenant_id?: string | null;
  name: string;
  slug: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AccessProfilePayload {
  name: string;
  slug: string;
  description?: string;
  permission_ids: string[];
  is_active?: boolean;
}

export interface UserAccessProfiles {
  userId: string;
  profiles: AccessProfile[];
}
