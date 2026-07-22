export interface ProductPricing {
  sale_price: number;
  cost: number;
  tax_percentage: number;
  tax_amount: number;
  client_total: number;
  margin_value: number;
  margin_percentage: number;
  sale_price_formatted?: string;
  cost_formatted?: string;
  tax_amount_formatted?: string;
  client_total_formatted?: string;
  margin_value_formatted?: string;
}

export interface Product {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  cost_price: number | null;
  sale_price: number;
  tax_percentage: number;
  stock_quantity: number;
  active: boolean;
  sale_price_formatted?: string;
  cost_price_formatted?: string;
  pricing?: ProductPricing;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  sku?: string;
  cost_price?: number;
  sale_price: number;
  tax_percentage?: number;
  stock_quantity?: number;
  active?: boolean;
}

export interface ProductSaleItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_percentage?: number;
  line_gross?: number;
  line_tax?: number;
  line_total: number;
}

export interface ProductSale {
  id: string;
  patient_id?: string | null;
  tutor_id?: string | null;
  sold_by?: string | null;
  total_gross: number;
  total_tax: number;
  total_amount: number;
  notes?: string | null;
  sold_at: string;
  items: ProductSaleItem[];
}

export interface ProductSalePayload {
  patient_id?: string;
  tutor_id?: string;
  notes?: string;
  items: { product_id: string; quantity: number }[];
}
