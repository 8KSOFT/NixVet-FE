import ptCommon from '@/locales/pt/common.json';

/**
 * Só o português entra no bundle.
 *
 * Os três idiomas somam ~350 KB de JSON, e o chunk resultante era baixado em
 * TODA rota — inclusive na home, que não traduz nada. Eram 85 KB comprimidos
 * por página, ~21% de todo o JS, sendo que dois terços é idioma que aquele
 * usuário não está usando.
 *
 * `en` e `es` passam a ser buscados no momento da troca, por `carregarIdioma`.
 * O custo aparece uma vez, para quem realmente troca de idioma, em vez de sair
 * do orçamento de todo mundo.
 */
export const resources = {
  pt: { common: ptCommon },
};

// Union explícita, não derivada de `resources`: agora que só `pt` está lá
// dentro, derivar o tipo faria `AppLanguage` virar `'pt'` e quebrar todo
// consumidor que fala de `en`/`es`.
export type AppLanguage = 'pt' | 'en' | 'es';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['pt', 'en', 'es'];

export const STORAGE_KEY = 'nixvet-lang';

/**
 * Busca o pacote de um idioma sob demanda.
 *
 * `pt` devolve null porque já está no bundle — pedir de novo só geraria uma
 * requisição inútil.
 */
export async function carregarIdioma(
  lng: AppLanguage,
): Promise<Record<string, unknown> | null> {
  if (lng === 'en') return (await import('@/locales/en/common.json')).default;
  if (lng === 'es') return (await import('@/locales/es/common.json')).default;
  return null;
}
