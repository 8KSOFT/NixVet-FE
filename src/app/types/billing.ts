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
  /**
   * `client_id` do GA4 (cookie `_ga`). Vai junto para cobrir a clínica que se
   * cadastrou antes desta captura existir: o backend só grava se ainda não
   * houver nada, e é o `purchase` do webhook — o evento que carrega dinheiro
   * — que depende dele para ter origem.
   */
  gaClientId?: string;
}

export interface ActivateBillingResponse {
  paymentUrl?: string | null;
}
