import { NextRequest, NextResponse } from 'next/server';
import { detectSubdomainFromHost } from '@/lib/subdomain';
import { cspHeaders, cspMode } from '@/lib/csp';
import {
  SESSION_HINT_COOKIE,
  authGateMode,
  destinoLogin,
  isRotaProtegida,
} from '@/lib/portao-sessao';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'nixvetapp.com.br';

/**
 * Roda em toda requisição de página (ver `matcher`). Três responsabilidades,
 * nenhuma com chamada ao backend:
 *
 * 1. Portão de sessão da área logada (`AUTH_GATE`, ver lib/portao-sessao.ts).
 * 2. CSP do documento (`CSP_MODE`, ver lib/csp.ts). Mora aqui, e não no
 *    `headers()` do next.config, para o modo ser lido em tempo de execução.
 * 3. Cookie `nixvet_subdomain`, que a página de login lê para pré-preencher
 *    o código da clínica.
 *
 * Era `src/middleware.ts` até a migração para o Next 16 (E14): a convenção
 * `middleware` foi depreciada em favor de `proxy`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const gate = authGateMode(process.env.AUTH_GATE);

  if (gate !== 'off' && isRotaProtegida(pathname) && !request.cookies.has(SESSION_HINT_COOKIE)) {
    if (gate === 'on') {
      return NextResponse.redirect(new URL(destinoLogin(), request.url));
    }
    // `observe`: uma linha JSON por quem seria redirecionado, para medir o
    // efeito antes de ligar. Sem IP nem cookie — só o caminho.
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        logger: 'proxy.auth-gate',
        message: 'AUTH_GATE=observe: redirecionaria para /login',
        path: pathname,
      }),
    );
  }

  const response = NextResponse.next();

  const headers = cspHeaders(cspMode(process.env.CSP_MODE), {
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    dev: process.env.NODE_ENV !== 'production',
  });
  for (const [chave, valor] of Object.entries(headers)) {
    response.headers.set(chave, valor);
  }

  const subdomain = detectSubdomainFromHost(request.headers.get('host') || '', ROOT_DOMAIN);
  if (subdomain) {
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
