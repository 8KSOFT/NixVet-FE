export interface BillingStatus {
  status: string;
  trialEndsAt: string | null;
  billingPlan: string | null;
  cancelAt?: string | null;
}

export interface Invoice {
  date: string;
  value: number;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  status: string;
}

export interface CancelBillingResponse {
  message?: string;
  cancelAt?: string | null;
}

export interface ActivateBillingPayload {
  plan: string;
  billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX';
  cpfCnpj: string;
}

export interface ActivateBillingResponse {
  paymentUrl?: string | null;
}
