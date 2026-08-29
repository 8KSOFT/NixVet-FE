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
