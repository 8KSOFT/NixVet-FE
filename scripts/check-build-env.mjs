#!/usr/bin/env node
/**
 * Garante que toda `NEXT_PUBLIC_*` usada no código chegue ao build.
 *
 * O Next inlina essas variáveis em tempo de build. No deploy elas vêm do vault
 * da plataforma, mas só se o Dockerfile as declarar como `ARG` — sem isso o
 * valor fica no ambiente do container, o build nunca o vê, e a variável
 * compila como `undefined`. O recurso simplesmente não funciona, sem erro
 * nenhum: foi o que aconteceu com o `NEXT_PUBLIC_GA_ID`, que passou pelo
 * vault e pelo deploy inteiro sem nunca chegar ao bundle.
 *
 * Este script transforma esse esquecimento silencioso em falha de build.
 *
 * Roda como `prebuild`, então vale para `npm run build` local e para o build
 * do Docker igualmente.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const EXTENSOES = new Set(['.ts', '.tsx', '.js', '.mjs']);
const PADRAO = /process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g;

function varrer(dir, achados = new Set()) {
  for (const item of readdirSync(dir)) {
    if (item === 'node_modules' || item === '.next' || item.startsWith('.')) continue;
    const caminho = join(dir, item);
    if (statSync(caminho).isDirectory()) {
      varrer(caminho, achados);
      continue;
    }
    if (!EXTENSOES.has(extname(item))) continue;
    const conteudo = readFileSync(caminho, 'utf8');
    for (const m of conteudo.matchAll(PADRAO)) achados.add(m[1]);
  }
  return achados;
}

const usadas = varrer(join(RAIZ, 'src'));
for (const m of readFileSync(join(RAIZ, 'next.config.mjs'), 'utf8').matchAll(PADRAO)) {
  usadas.add(m[1]);
}

const dockerfile = readFileSync(join(RAIZ, 'Dockerfile'), 'utf8');
const declaradas = new Set(
  [...dockerfile.matchAll(/^ARG\s+(NEXT_PUBLIC_[A-Z0-9_]+)/gm)].map((m) => m[1]),
);

const faltando = [...usadas].filter((v) => !declaradas.has(v)).sort();

if (faltando.length) {
  console.error('\n✖ Variáveis NEXT_PUBLIC_* usadas no código e ausentes do Dockerfile:\n');
  for (const v of faltando) console.error(`    ${v}`);
  console.error(
    '\n  Sem `ARG`/`ENV` no Dockerfile o valor do vault não chega ao `next build`,\n' +
      '  e a variável compila como undefined — o recurso morre em silêncio.\n\n' +
      '  Adicione, antes do `RUN npm run build`:\n',
  );
  for (const v of faltando) console.error(`    ARG ${v}\n    ENV ${v}=$${v}`);
  console.error('');
  process.exit(1);
}

// Este script roda ANTES do `next build`, e quem lê os arquivos `.env.*` é o
// Next, já dentro do build. Então aqui só enxergamos o que veio do ambiente
// do processo — build arg do Docker, export no shell. Ausente aqui NÃO
// significa ausente no build; dizer "desligado" seria mandar alguém caçar um
// problema que não existe.
const foraDoAmbiente = [...usadas].filter((v) => !process.env[v]).sort();
if (foraDoAmbiente.length) {
  console.log(
    `· build-env: fora do ambiente do processo (podem vir de .env.*): ${foraDoAmbiente.join(', ')}`,
  );
}
console.log(`· build-env: ${usadas.size} variáveis NEXT_PUBLIC_* conferidas contra o Dockerfile`);
