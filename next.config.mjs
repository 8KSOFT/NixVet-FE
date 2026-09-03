/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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

    // A CSP vai em modo relatório, não em modo bloqueio, e de propósito.
    //
    // A página carrega Turnstile e GA4, e exibe foto de paciente por URL
    // pré-assinada do object storage — cujo host varia com o provedor
    // configurado no ambiente. Publicar uma CSP restritiva sem essa lista
    // fechada quebraria imagem de prontuário em produção, e o sintoma seria
    // "a foto sumiu", não um erro de segurança que alguém investigasse.
    //
    // Em Report-Only o navegador reporta o que teria bloqueado sem bloquear.
    // Depois de uma semana de relatório limpo, trocar a chave por
    // `Content-Security-Policy` liga a proteção de verdade.
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' e 'unsafe-eval': o Next injeta script inline de
      // hidratação. Remover exige nonce por request, que é o passo seguinte.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.nixvetapp.com.br https://www.google-analytics.com https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          ...base,
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ];
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
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.nixvetapp.com.br').replace(/\/+$/, '');
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'https://api.nixvetapp.com.br',
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
    // Ficam aqui, versionados, e não no vault, porque o vault NÃO alimenta
    // este build: os `ARG` do Dockerfile são resquício da época do Jenkins, e
    // a plataforma não repassa secret como build-arg. Guardá-las lá fez o GA e
    // o captcha subirem como `undefined` — o captcha exigido pelo backend com
    // o front incapaz de gerar token, e o login parou.
    //
    // O que continua no vault é a TURNSTILE_SECRET_KEY, no backend, que é
    // segredo de verdade e é lida em runtime.
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID || 'G-J7HXFRDB6S',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAEf66kfKURDt1Dit',
  },
};

export default nextConfig;
