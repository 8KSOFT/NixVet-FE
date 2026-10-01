/**
 * Destino de pagamento vindo da API, conferido antes de tirar o usuário da
 * página.
 *
 * O checkout redireciona para `paymentUrl` com `window.location.href`. O valor
 * vem do backend, que o recebe do Asaas — mas qualquer falha no meio (resposta
 * adulterada, bug que devolva outro campo) viraria redirect para onde a
 * resposta mandasse, logado e no meio de uma cobrança. Só segue para host do
 * Asaas, por https.
 */
const HOSTS_ASAAS = ['asaas.com'];

export function urlDePagamentoSegura(valor: unknown): string | null {
  if (typeof valor !== 'string' || !valor) return null;
  try {
    const u = new URL(valor);
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    const ok = HOSTS_ASAAS.some((h) => host === h || host.endsWith(`.${h}`));
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}
