/**
 * Espelho da matriz padrão de permissões do backend
 * (`database/seeders/20260715090000-seed-access-control-defaults.js`).
 *
 * Responde a uma pergunta só: **vale a pena disparar esta requisição?**
 * Com `RBAC_ENFORCE=on` o backend passa a devolver 403 para quem não tem a
 * chave exigida pelo `@Permissions` da rota — e uma query que roda em toda
 * página autenticada vira um 403 por carregamento nos perfis que nunca
 * poderiam vê-la. O lugar de resolver isso é o `enabled` do useQuery.
 *
 * Isto **não é autorização**: quem autoriza é o backend, que revalida sempre.
 *
 * Dois limites conhecidos, de propósito:
 *
 * 1. O cliente só conhece o papel (`user.role` no localStorage). Perfis de
 *    acesso customizados do tenant podem conceder chaves fora desta matriz e
 *    não aparecem aqui — por isso o gate só deve cobrir tela/widget que o
 *    papel também não alcança pelo menu, nunca esconder função de quem talvez
 *    tenha a chave. O fim da duplicação é o backend expor as permissões
 *    efetivas da sessão; hoje não existe rota para isso.
 * 2. Papel desconhecido cai aberto (dispara a requisição, como antes). Este
 *    arquivo reduz ruído; travar tela por causa de um papel novo seria pior
 *    que o 403 que ele evita.
 */

/** `X.write` concede `X.create` e `X.update` (PermissionService.expandPermissionAliases). */
function expandir(keys: readonly string[]): Set<string> {
  const set = new Set<string>();
  for (const key of keys) {
    set.add(key);
    if (key.endsWith('.write')) {
      const recurso = key.slice(0, -'.write'.length);
      set.add(`${recurso}.create`);
      set.add(`${recurso}.update`);
    }
  }
  return set;
}

const VETERINARIAN_PERMISSION_KEYS = [
  'patients.read',
  'patients.write',
  'tutors.read',
  'tutors.write',
  'consultations.read',
  'consultations.write',
  'prescriptions.read',
  'prescriptions.write',
  'exam_requests.read',
  'exam_requests.write',
  'catalog.read',
  'products.read',
  'stock.read',
  'medical_records.read',
  'medical_records.write',
  'hospitalizations.read',
  'hospitalizations.write',
  'clinical_tasks.read',
  'clinical_tasks.write',
  'appointment_types.read',
  'availability.read',
  'ai.use',
] as const;

const RECEPTION_PERMISSION_KEYS = [
  'patients.read',
  'patients.write',
  'tutors.read',
  'tutors.write',
  'consultations.read',
  'consultations.write',
  'budgets.read',
  'budgets.write',
  'products.read',
  'stock.read',
  'stock.write',
  'appointment_types.read',
  'availability.read',
  'availability.write',
  'financial_reports.confirm',
  'ai.use',
] as const;

const INTERN_PERMISSION_KEYS = [
  'patients.read',
  'tutors.read',
  'consultations.read',
  'prescriptions.read',
  'exam_requests.read',
  'catalog.read',
  'products.read',
  'stock.read',
  'medical_records.read',
  'hospitalizations.read',
  'clinical_tasks.read',
  'appointment_types.read',
  'availability.read',
  'ai.use',
] as const;

const VETERINARIAN = expandir(VETERINARIAN_PERMISSION_KEYS);
const RECEPTION = expandir(RECEPTION_PERMISSION_KEYS);
const INTERN = expandir(INTERN_PERMISSION_KEYS);

/**
 * Admin recebe todo o catálogo menos `permissions.*` (global da plataforma), e
 * o alias legado `manager` herda a matriz do admin menos `tutors.export` — a
 * exportação LGPD completa de um tutor.
 */
const CONCESSAO_POR_PAPEL: Record<string, (key: string) => boolean> = {
  superadmin: () => true,
  admin: (key) => !key.startsWith('permissions.'),
  manager: (key) => !key.startsWith('permissions.') && key !== 'tutors.export',
  veterinarian: (key) => VETERINARIAN.has(key),
  reception: (key) => RECEPTION.has(key),
  intern: (key) => INTERN.has(key),
};

/**
 * O papel tem **todas** as chaves informadas? A checagem do backend é AND, e
 * aqui é igual.
 */
export function roleHasPermission(
  role: string | null | undefined,
  ...keys: string[]
): boolean {
  const concessao = CONCESSAO_POR_PAPEL[(role || '').toLowerCase().trim()];
  if (!concessao) return true; // papel desconhecido: cai aberto (ver nota 2)
  return keys.every((key) => concessao(key));
}
