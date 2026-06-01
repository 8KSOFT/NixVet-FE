const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'nixvet'];

/** Hosts da aplicação (HML/PRD) — nunca são subdomínio de tenant. */
const DEFAULT_APP_HOSTS = [
  'nixvet.8ksoft.com',
  'nixvet-api.8ksoft.com',
  'localhost',
  '127.0.0.1',
];

function getAppHosts(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_APP_HOSTS
    ?.split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_APP_HOSTS;
}

export function detectSubdomainFromHost(
  host: string,
  rootDomain: string,
): string | null {
  const normalizedHost = host.split(':')[0].toLowerCase();

  if (getAppHosts().includes(normalizedHost)) {
    return null;
  }

  const normalizedRoot = rootDomain.toLowerCase();
  const suffix = `.${normalizedRoot}`;

  if (!normalizedHost.endsWith(suffix)) return null;

  const subdomain = normalizedHost.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes('.') || RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

export function detectSubdomainClient(): string | null {
  if (typeof window === 'undefined') return null;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'nixvetapp.com.br';
  return detectSubdomainFromHost(window.location.hostname, rootDomain);
}
