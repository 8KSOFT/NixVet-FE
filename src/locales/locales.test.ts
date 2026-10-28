import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import en from './en/common.json';
import es from './es/common.json';
import pt from './pt/common.json';

type Arvore = { [k: string]: string | Arvore };

function achatar(o: Arvore, prefixo = '', saida: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(o)) {
    const chave = prefixo ? `${prefixo}.${k}` : k;
    if (v && typeof v === 'object') achatar(v, chave, saida);
    else saida[chave] = String(v);
  }
  return saida;
}

const idiomas = { pt: achatar(pt as Arvore), en: achatar(en as Arvore), es: achatar(es as Arvore) };
const placeholders = (s: string) =>
  [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

describe('paridade dos idiomas', () => {
  it.each(['en', 'es'] as const)('%s tem exatamente as mesmas chaves do pt', (lng) => {
    const doPt = Object.keys(idiomas.pt);
    const doOutro = new Set(Object.keys(idiomas[lng]));
    expect(doPt.filter((k) => !doOutro.has(k))).toEqual([]);
    const doPtSet = new Set(doPt);
    expect([...doOutro].filter((k) => !doPtSet.has(k))).toEqual([]);
  });

  it.each(['en', 'es'] as const)('%s usa as mesmas variáveis {{x}} do pt em cada texto', (lng) => {
    const divergentes = Object.keys(idiomas.pt).filter((k) => placeholders(idiomas.pt[k]) !== placeholders(idiomas[lng][k] ?? ''));
    expect(divergentes).toEqual([]);
  });

  it.each(['pt', 'en', 'es'] as const)('%s não tem texto vazio', (lng) => {
    expect(Object.entries(idiomas[lng]).filter(([, v]) => v.trim() === '')).toEqual([]);
  });

});

describe('chaves usadas no código existem no pt', () => {
  const raiz = path.resolve(__dirname, '..');
  const usadas = new Map<string, string>();

  (function varrer(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'locales' && e.name !== 'node_modules') varrer(p);
      } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
        const texto = fs.readFileSync(p, 'utf8');
        for (const m of texto.matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'/g)) usadas.set(m[1], path.relative(raiz, p));
      }
    }
  })(raiz);

  const ausentes = [...usadas.keys()].filter((k) => !(k in idiomas.pt) && !(`${k}_one` in idiomas.pt) && !(`${k}_other` in idiomas.pt));

  // Teto que só pode cair (mesmo padrão do lint): são as telas do editor de fluxo do chatbot e das
  // permissões do superadmin, cuja tradução nunca foi concluída. Texto novo sem chave falha aqui.
  it('o número de chaves sem texto não sobe', () => {
    expect(ausentes.length, `chaves ausentes:\n${ausentes.slice(0, 20).join('\n')}`).toBeLessThanOrEqual(80);
  });
});
