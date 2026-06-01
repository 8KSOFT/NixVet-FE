import { NextRequest, NextResponse } from 'next/server';
import { detectSubdomainFromHost } from '@/lib/subdomain';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'nixvetapp.com.br';

/**
 * Detecta subdomínio na request e persiste em cookie `nixvet_subdomain`.
 * O cookie é lido pela login page para pré-preencher o tenant code.
 * Não faz chamada ao backend — zero latência adicionada.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = detectSubdomainFromHost(host, ROOT_DOMAIN);
  const isValidSubdomain = subdomain !== null;

  const response = NextResponse.next();

  if (isValidSubdomain && subdomain) {
    response.cookies.set('nixvet_subdomain', subdomain, {
      maxAge: 3600,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  } else {
    response.cookies.delete('nixvet_subdomain');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
