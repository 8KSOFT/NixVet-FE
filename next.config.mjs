/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
