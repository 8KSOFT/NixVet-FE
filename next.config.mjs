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
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'https://api.nixvetapp.com.br',
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL || 'https://app.nixvetapp.com.br',
    NEXT_PUBLIC_ROOT_DOMAIN:
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'nixvetapp.com.br',
    NEXT_PUBLIC_APP_HOSTS:
      process.env.NEXT_PUBLIC_APP_HOSTS || 'app.nixvetapp.com.br',
  },
};

export default nextConfig;
