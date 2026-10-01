#!/usr/bin/env node
/**
 * Toda pasta de `src/app/(app)` precisa estar em `ROTAS_PROTEGIDAS`
 * (src/lib/portao-sessao.ts), e vice-versa.
 *
 * O portão de sessão do `proxy.ts` usa uma lista positiva — arquivo de
 * `public/` ou rota pública nunca cai nele por engano. O preço é que rota
 * nova na área logada, esquecida na lista, fica fora do portão em silêncio.
 * Este script transforma o esquecimento em falha de build. Roda no `prebuild`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const APP = join(RAIZ, 'src/app/(app)');

const pastas = readdirSync(APP)
  .filter((n) => statSync(join(APP, n)).isDirectory() && !n.startsWith('(') && !n.startsWith('_'))
  .sort();

const fonte = readFileSync(join(RAIZ, 'src/lib/portao-sessao.ts'), 'utf8');
const bloco = fonte.match(/ROTAS_PROTEGIDAS = \[([\s\S]*?)\] as const/);
if (!bloco) {
  console.error('✖ rotas-protegidas: não achei ROTAS_PROTEGIDAS em src/lib/portao-sessao.ts');
  process.exit(1);
}
const lista = [...bloco[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

const faltando = pastas.filter((p) => !lista.includes(p));
const sobrando = lista.filter((p) => !pastas.includes(p));

if (faltando.length || sobrando.length) {
  if (faltando.length) console.error(`✖ rotas de (app) fora de ROTAS_PROTEGIDAS: ${faltando.join(', ')}`);
  if (sobrando.length) console.error(`✖ ROTAS_PROTEGIDAS sem pasta em (app): ${sobrando.join(', ')}`);
  process.exit(1);
}
console.log(`· rotas-protegidas: ${pastas.length} rotas de (app) no portão de sessão`);
