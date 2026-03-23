/**
 * Node 23+ rejeita alguns package.json mínimos do Next (sem "version"),
 * gerando ERR_INVALID_PACKAGE_CONFIG. Este script é idempotente e só altera
 * arquivos que precisam. Roda no postinstall após yarn/npm ci.
 *
 * Em Node < 23 não faz nada (Docker/CI com Node 22 fica rápido).
 */
const fs = require('fs');
const path = require('path');

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 23) process.exit(0);

const compiledRoot = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'compiled',
);

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full);
    else if (name.name === 'package.json') patchIfNeeded(full);
  }
}

function patchIfNeeded(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  if (typeof data.version === 'string' && data.version.trim() !== '') return;
  data.version = '0.0.0';
  fs.writeFileSync(file, `${JSON.stringify(data)}\n`, 'utf8');
}

walk(compiledRoot);
