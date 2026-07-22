export interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  is_system: boolean;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionPayload {
  key: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  is_active?: boolean;
}
