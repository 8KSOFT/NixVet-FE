export interface SurgicalProcedureCategory {
  id: number;
  tenant_id?: string | null;
  name: string;
}

export interface SurgicalProcedure {
  id: number;
  tenant_id?: string | null;
  category_id?: number;
  category?: SurgicalProcedureCategory;
  name: string;
  description?: string;
  active?: boolean;
  visible?: boolean;
  private_price?: number | null;
  cost_price?: number | null;
  tax_percentage?: number | null;
  deletedAt?: string | null;
}

export interface SurgicalProcedurePayload {
  name: string;
  category_id?: number;
  description?: string;
  private_price?: number;
  cost_price?: number;
  tax_percentage?: number;
}

/** Ação aplicada pelo DELETE: soft delete de item da clínica ou ocultação de item base. */
export interface SurgicalProcedureDeleteResponse {
  ok: boolean;
  action: 'soft_deleted' | 'hidden_base';
  message: string;
  id: number;
}
