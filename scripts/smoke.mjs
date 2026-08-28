#!/usr/bin/env node
/**
 * Smoke test do frontend — sem dependência nova.
 *
 * O projeto não tinha teste nenhum, e as regressões que apareceram aqui não
 * eram de lógica: eram coisas que só se veem servindo a página (h1 duplicado,
 * og:image apontando para o lugar errado, imagem gorda voltando por descuido,
 * troca de idioma parando de carregar o pacote sob demanda). É isso que este
 * arquivo cobre.
 *
 * Duas camadas:
 *   1. HTTP — roda em qualquer lugar, só precisa de Node.
 *   2. Navegador — só se houver Chrome na máquina; sem ele, pula com aviso em
 *      vez de falhar, para não quebrar CI onde não há navegador.
 *
 * Uso:
 *   npm run build && npm run smoke          # sobe o próprio servidor
 *   BASE_URL=https://nixvetapp.com.br npm run smoke   # aponta para um já no ar
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as esperar } from 'node:timers/promises';

const PORTA = Number(process.env.SMOKE_PORT || 3399);
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORTA}`;
const SUBIR = !process.env.BASE_URL;

const resultados = [];
let servidor = null;

function checar(nome, condicao, detalhe = '') {
  resultados.push({ nome, ok: Boolean(condicao), detalhe });
}

async function pegar(caminho) {
  const res = await fetch(BASE + caminho, { redirect: 'manual' });
  // xml e json também são texto — o sitemap vem como application/xml e sem
  // isto o corpo chegava vazio, fazendo a checagem passar por engano.
  const tipoResp = res.headers.get('content-type') || '';
  const ehTexto = /text|xml|json|javascript/.test(tipoResp);
  const corpo = ehTexto ? await res.text() : '';
  const bytes = corpo
    ? Buffer.byteLength(corpo)
    : Number(res.headers.get('content-length') || 0) ||
      (await res.arrayBuffer().then((b) => b.byteLength).catch(() => 0));
  return { status: res.status, tipo: tipoResp, corpo, bytes };
}

// ── camada 1: HTTP ────────────────────────────────────────────────────────
async function camadaHttp() {
  // Páginas públicas: existem e cada uma tem o próprio título. Título repetido
  // entre páginas é o sintoma de metadata que voltou a ser herdada do layout.
  const paginas = {
    '/': 'NixVet — Sistema para Clínica Veterinária com IA no WhatsApp',
    '/login': 'Entrar — NixVet',
    '/register': 'Crie sua conta grátis — NixVet',
    '/esqueci-senha': 'Recuperar senha — NixVet',
  };
  const titulos = new Set();
  for (const [rota, titulo] of Object.entries(paginas)) {
    const r = await pegar(rota);
    checar(`${rota} responde 200`, r.status === 200, `status ${r.status}`);
    const achado = r.corpo.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    titulos.add(achado);
    checar(`${rota} tem o título próprio`, achado === titulo, `veio "${achado}"`);
  }
  checar('as 4 públicas têm títulos distintos', titulos.size === 4, `${titulos.size} distintos`);

  const home = await pegar('/');

  // Um h1 por página. Já teve dois: o do herói e o "Por que escolher".
  const h1s = (home.corpo.match(/<h1[\s>]/g) || []).length;
  checar('home tem exatamente um <h1>', h1s === 1, `encontrados ${h1s}`);

  // Dado estruturado da home.
  checar('home traz JSON-LD de FAQPage', home.corpo.includes('"@type":"FAQPage"'));
  checar('home traz JSON-LD de SoftwareApplication', home.corpo.includes('"@type":"SoftwareApplication"'));

  // Card de compartilhamento: a arte dedicada, não o logo quadrado.
  checar('og:image aponta para a arte 1200x630', /og:image" content="[^"]*og-nixvet\.png/.test(home.corpo));
  checar('og:image declara 1200 de largura', /og:image:width" content="1200"/.test(home.corpo));
  checar('twitter:card é summary_large_image', /twitter:card" content="summary_large_image"/.test(home.corpo));

  // robots e sitemap.
  const robots = await pegar('/robots.txt');
  checar('/robots.txt responde 200', robots.status === 200);
  checar('robots bloqueia a área logada', robots.corpo.includes('Disallow: /dashboard/'));
  checar('robots aponta o sitemap', robots.corpo.includes('Sitemap:'));
  const sitemap = await pegar('/sitemap.xml');
  checar('/sitemap.xml responde 200', sitemap.status === 200);
  const urls = (sitemap.corpo.match(/<loc>/g) || []).length;
  checar('sitemap lista as 6 públicas', urls === 6, `${urls} URLs`);

  // Peso dos assets. O herói já viajou 4 MB no bundle; este teto é o que
  // impede alguém repor um PNG gigante sem ninguém perceber.
  const tetos = [
    ['/images/dog.webp', 150],
    ['/images/dogback.webp', 90],
    ['/landing/screenshot-financeiro.webp', 70],
    ['/landing/screenshot-prontuario-detalhe.webp', 70],
  ];
  for (const [caminho, tetoKb] of tetos) {
    const a = await pegar(caminho);
    const kb = Math.round(a.bytes / 1024);
    checar(`${caminho} existe`, a.status === 200, `status ${a.status}`);
    checar(`${caminho} abaixo de ${tetoKb} KB`, kb > 0 && kb <= tetoKb, `${kb} KB`);
  }
}

// ── camada 2: navegador ───────────────────────────────────────────────────
function acharChrome() {
  const candidatos = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    process.env.CHROME_PATH,
  ].filter(Boolean);
  return candidatos.find((c) => existsSync(c)) ?? null;
}

async function cdp(ws, metodo, params) {
  return new Promise((resolve) => {
    const id = cdp.seq = (cdp.seq || 0) + 1;
    const ouvir = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === id) { ws.removeEventListener('message', ouvir); resolve(m.result); }
    };
    ws.addEventListener('message', ouvir);
    ws.send(JSON.stringify({ id, method: metodo, params }));
  });
}

async function camadaNavegador(chrome) {
  const porta = 9333;
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    `--remote-debugging-port=${porta}`, '--user-data-dir=/tmp/nixvet-smoke', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    let alvo = null;
    for (let i = 0; i < 20 && !alvo; i++) {
      await esperar(500);
      alvo = await fetch(`http://127.0.0.1:${porta}/json/list`)
        .then((r) => r.json()).then((l) => l.find((x) => x.type === 'page')).catch(() => null);
    }
    if (!alvo) { checar('navegador sobe', false, 'CDP não respondeu'); return; }

    const ws = new WebSocket(alvo.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    const erros = [];
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.text || 'exceção');
    });
    await cdp(ws, 'Page.enable'); await cdp(ws, 'Runtime.enable');
    const ir = async (rota) => { await cdp(ws, 'Page.navigate', { url: BASE + rota }); await esperar(5000); };
    const ev = async (expr) =>
      (await cdp(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true }))?.result?.value;

    await ir('/');
    checar('home renderiza sem exceção', erros.length === 0, erros[0] || '');
    const h1dom = await ev(`document.querySelectorAll('h1').length`);
    checar('home tem um <h1> no DOM montado', h1dom === 1, `${h1dom} no DOM`);

    // Guarda o i18n sob demanda: se voltarem a empacotar en/es, isto continua
    // passando — mas se a troca parar de carregar o pacote, quebra aqui.
    erros.length = 0;
    await ir('/login');
    // A preferência de idioma fica em localStorage e o perfil do Chrome é
    // reaproveitado entre execuções: sem limpar, a segunda rodada abre no
    // idioma que a primeira deixou e o teste falha sozinho.
    await ev(`localStorage.removeItem('nixvet-lang')`);
    await cdp(ws, 'Page.reload');
    await esperar(5000);
    const antes = await ev(`(document.body.innerText.match(/Acesse sua conta/)||[''])[0]`);
    checar('login abre em português', antes === 'Acesse sua conta', `veio "${antes}"`);
    await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='EN')?.click()`);
    await esperar(3000);
    const depois = await ev(`(document.body.innerText.match(/Sign in to your account/)||[''])[0]`);
    checar('trocar para EN carrega o pacote e traduz', depois === 'Sign in to your account', `veio "${depois}"`);
    checar('login renderiza sem exceção', erros.length === 0, erros[0] || '');
    await ev(`localStorage.removeItem('nixvet-lang')`);
    ws.close();
  } finally {
    proc.kill();
  }
}

// ── execução ──────────────────────────────────────────────────────────────
async function subirServidor() {
  servidor = spawn('npx', ['next', 'start', '-p', String(PORTA)], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await esperar(500);
    const ok = await fetch(BASE + '/').then((r) => r.ok).catch(() => false);
    if (ok) return true;
  }
  return false;
}

try {
  if (SUBIR) {
    console.log(`subindo servidor em ${BASE} ...`);
    if (!(await subirServidor())) {
      console.error('servidor não respondeu — rode `npm run build` antes.');
      process.exit(1);
    }
  }
  console.log(`smoke contra ${BASE}\n`);

  await camadaHttp();

  const chrome = acharChrome();
  if (chrome) await camadaNavegador(chrome);
  else console.log('· Chrome não encontrado — camada de navegador pulada\n');

  const falhas = resultados.filter((r) => !r.ok);
  for (const r of resultados) {
    console.log(`${r.ok ? '  ok  ' : '  FALHOU  '}${r.nome}${r.detalhe && !r.ok ? `  — ${r.detalhe}` : ''}`);
  }
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} verificações passaram`);
  if (!chrome) console.log('(camada de navegador não rodou)');
  process.exit(falhas.length ? 1 : 0);
} finally {
  servidor?.kill();
}
