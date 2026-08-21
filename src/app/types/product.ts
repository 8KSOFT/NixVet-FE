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

export type ProductItemType = 'product' | 'consumable';

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
  item_type: ProductItemType;
  category_id?: string | null;
  supplier_id?: string | null;
  minimum_stock: number;
  internal_code?: string | null;
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
  item_type?: ProductItemType;
  category_id?: string | null;
  supplier_id?: string | null;
  minimum_stock?: number;
  internal_code?: string | null;
}

export interface ProductCategory {
  id: string;
  parent_id?: string | null;
  name: string;
  sort_order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategoryPayload {
  name: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierPayload {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type StockMovementReason =
  | 'inventory_adjustment'
  | 'breakage'
  | 'expired'
  | 'internal_use'
  | 'loss'
  | 'invoice_entry'
  | 'invoice_entry_reversal'
  | 'sale'
  | 'sale_reversal'
  | 'budget_approval'
  | 'hospitalization_consumption'
  | 'hospitalization_consumption_adjustment'
  | 'hospitalization_consumption_reversal';

export interface StockMovement {
  id: string;
  product_id: string;
  delta: number;
  previous_stock: number;
  new_stock: number;
  reason: StockMovementReason;
  reference_id?: string | null;
  reference_type?: string | null;
  actor_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface AdjustStockPayload {
  new_stock: number;
  reason: 'inventory_adjustment' | 'breakage';
}

export interface WriteOffStockPayload {
  quantity: number;
  reason: 'breakage' | 'expired' | 'internal_use' | 'loss';
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
  payment_method?: string;
  items: { product_id: string; quantity: number }[];
}

export type StockEntryPaymentStatus = 'paid' | 'pending';
export type StockEntryStatus = 'confirmed' | 'canceled';
export type StockEntryExpenseCategory = 'medication_purchase' | 'material_purchase';

export interface StockEntryItem {
  id: string;
  entry_id: string;
  product_id: string | null;
  product_name: string;
  supplier_id?: string | null;
  entry_date: string;
  line_number: number;
  quantity: number;
  unit_cost: number;
  line_total: number;
  previous_stock: number;
  previous_cost_price: number;
  new_stock: number;
  new_cost_price: number;
  update_sale_price: boolean;
  new_sale_price?: number | null;
}

export interface StockEntry {
  id: string;
  supplier_id?: string | null;
  invoice_number?: string | null;
  entry_date: string;
  notes?: string | null;
  total_amount: number;
  payment_status: StockEntryPaymentStatus;
  status: StockEntryStatus;
  payable_id?: string | null;
  created_by?: string | null;
  canceled_at?: string | null;
  canceled_by?: string | null;
  cancel_reason?: string | null;
  items?: StockEntryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockEntryItemPayload {
  product_id: string;
  quantity: number;
  unit_cost: number;
  update_sale_price?: boolean;
  new_sale_price?: number;
}

export interface StockEntryPayload {
  supplier_id?: string | null;
  invoice_number?: string;
  entry_date: string;
  notes?: string;
  payment_status: StockEntryPaymentStatus;
  expense_category: StockEntryExpenseCategory;
  items: StockEntryItemPayload[];
}

export interface CostHistoryPoint {
  entry_id: string;
  entry_date: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  quantity: number;
  unit_cost: number;
  new_cost_price: number;
}

export interface CostVariation {
  product_id: string;
  product_name: string;
  first_cost: number;
  last_cost: number;
  variation_percentage: number;
}
