export interface Material {
  id: number;
  name: string;
  private_price?: number | null;
  cost_price?: number | null;
  tax_percentage?: number | null;
}

export interface MaterialPayload {
  name: string;
  private_price?: number;
  cost_price?: number;
  tax_percentage?: number;
}
