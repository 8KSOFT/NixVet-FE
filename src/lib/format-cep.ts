/** Formato esperado pelo MaskedInput mask="00000-000". */
export function formatCepMask(cep: string | null | undefined): string {
  if (cep == null || cep === '') return '';
  const d = String(cep).replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
