/**
 * URL da API. Em build de produção é OBRIGATÓRIA: até 01/10/2026 havia um
 * `|| 'https://api.nixvetapp.com.br'` aqui, e um build de homologação ou um
 * `next dev` sem a variável falava com a API de PRODUÇÃO sem aviso nenhum.
 * O vault da plataforma entrega o valor ao build (ARG no Dockerfile — o log
 * do `prebuild` lista o que faltar). Em dev, sem a variável, vai para a API
 * local.
 */
const API_URL = (() => {
  const v = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (v) return v;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_API_URL ausente no build de produção. Defina no vault (8khost) ou em .env.production — não há mais fallback para a API de produção.',
    );
  }
  return 'http://localhost:8537';
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Otimizador de imagem desligado de propósito (E01 do plano de prontidão,
  // docs/prontidao-enterprise no backend). O next@14.2.x tem RCE não
  // autenticado na API de otimização (`/_next/image`) com arquivos AVIF,
  // corrigido só em 15.5.24 — a linha 14 não recebe o patch. Enquanto a
  // migração de major (E14) não sai, o endpoint fica fora do ar e as quatro
  // páginas com `next/image` servem o arquivo original. Reavaliar em E14.
  images: { unoptimized: true },
  async redirects() {
    // Produtos e Equipe passaram a morar dentro de Configurações (Fase 2 da
    // reestruturação de navegação) — mantém links/bookmarks antigos vivos.
    return [
      { source: '/produtos', destination: '/settings/produtos', permanent: false },
      { source: '/produtos/:path*', destination: '/settings/produtos/:path*', permanent: false },
      { source: '/team', destination: '/settings/team', permanent: false },
      { source: '/team/:path*', destination: '/settings/team/:path*', permanent: false },
    ];
  },
  // `x-powered-by: Next.js` diz a versão do framework para quem procura alvo
  // conhecido, e não serve a ninguém (E15 / FE-05).
  poweredByHeader: false,

  async headers() {
    // O `helmet` do backend cobre as respostas da API. O documento HTML — que é
    // onde script injetado executaria — saía sem defesa nenhuma.
    //
    // Os cinco primeiros são seguros de ligar direto: não dependem de conhecer
    // toda a origem de conteúdo da página.
    const base = [
      {
        // 2 anos, subdomínios inclusos. Cada clínica atende num subdomínio, e é
        // deles que o cookie de sessão precisa que ninguém chegue por http.
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains',
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        // A aplicação não usa nenhum destes. Negar explicitamente evita que um
        // script de terceiro peça permissão em nome da página.
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      },
    ];

    // A CSP saiu daqui para `src/proxy.ts` (lib/csp.ts) em 01/10/2026: o
    // `headers()` é avaliado no build, e o modo (relatório ou bloqueio) precisa
    // ser trocável por variável de ambiente em tempo de execução (`CSP_MODE`).
    return [{ source: '/:path*', headers: base }];
  },
  async rewrites() {
    // Proxy same-origin para a API. O upload de imagem usa o caminho relativo
    // `/api/...` em vez do host da API: assim o navegador fala só com a origem
    // da página, sem cross-origin e sem preflight.
    //
    // Existe porque o POST multipart cross-origin para api.nixvetapp.com.br
    // morria sem chegar ao servidor no Chrome do usuário (ERR_TIMED_OUT, sem
    // registro no nginx nem no backend), enquanto o mesmo upload same-origin
    // funciona em produção em outro produto sobre a mesma infra.
    //
    // O resto do app segue chamando a API pelo host absoluto — este rewrite só
    // atende quem pedir caminho relativo.
    const apiUrl = API_URL.replace(/\/+$/, '');
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL || 'https://app.nixvetapp.com.br',
    NEXT_PUBLIC_ROOT_DOMAIN:
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'nixvetapp.com.br',
    NEXT_PUBLIC_APP_HOSTS:
      process.env.NEXT_PUBLIC_APP_HOSTS || 'app.nixvetapp.com.br',
    // Identificadores PÚBLICOS, não segredos: o measurement ID aparece na URL
    // do gtag e a site key do Turnstile vai no HTML do widget — qualquer
    // visitante lê as duas no fonte da página.
    //
    // O fallback versionado nasceu em 28/08/2026, quando a plataforma ainda
    // não repassava secret como build-arg e o GA e o captcha subiram como
    // `undefined` (o login parou). Desde 14/09/2026 ela repassa toda
    // `NEXT_PUBLIC_*` do vault ao `docker build` (8khost-api,
    // `buildArgsPublicos`), e as duas estão no vault — o fallback ficou só
    // como rede, inofensiva por serem valores públicos.
    //
    // A TURNSTILE_SECRET_KEY, segredo de verdade, mora no vault do backend e é
    // lida em runtime.
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID || 'G-J7HXFRDB6S',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAEf66kfKURDt1Dit',
  },
};

export default nextConfig;
