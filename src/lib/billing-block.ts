'use client';

/**
 * Bloqueio de cobrança percebido no meio do uso.
 *
 * O banner de assinatura é montado a partir de `GET /billing/status`, que roda
 * uma vez quando a aplicação abre. Quem está com a tela aberta desde antes do
 * bloqueio continuaria vendo o banner antigo e só descobriria o problema pelo
 * "erro ao salvar" — sem nenhuma pista de que a causa é a assinatura.
 *
 * Este canal existe para o 402 que o interceptor do axios recebe alimentar o
 * banner na hora, sem esperar o próximo carregamento da página.
 */

/** Códigos que o `BillingActiveGuard` devolve junto do 402. */
export type BillingBlockCode =
  | 'SUBSCRIPTION_READ_ONLY'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_SUSPENDED'
  | 'TRIAL_EXPIRED'
  | 'ONBOARDING_EXPIRED';

export interface BillingBlock {
  code: BillingBlockCode;
  message: string;
}

const CODIGOS: BillingBlockCode[] = [
  'SUBSCRIPTION_READ_ONLY',
  'SUBSCRIPTION_CANCELLED',
  'SUBSCRIPTION_SUSPENDED',
  'TRIAL_EXPIRED',
  'ONBOARDING_EXPIRED',
];

export function isBillingBlockCode(valor: unknown): valor is BillingBlockCode {
  return typeof valor === 'string' && CODIGOS.includes(valor as BillingBlockCode);
}

let ultimo: BillingBlock | null = null;
const ouvintes = new Set<(bloqueio: BillingBlock) => void>();

export function publishBillingBlock(bloqueio: BillingBlock): void {
  ultimo = bloqueio;
  ouvintes.forEach((cb) => cb(bloqueio));
}

/** Devolve a função de cancelamento — usar no cleanup do efeito. */
export function subscribeBillingBlock(cb: (bloqueio: BillingBlock) => void): () => void {
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}

/** Último bloqueio visto nesta sessão de navegador. */
export function getLastBillingBlock(): BillingBlock | null {
  return ultimo;
}
