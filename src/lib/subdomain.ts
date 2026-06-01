const RESERVED_SUBDOMAINS = ['www', 'app', 'api'];

export function detectSubdomainFromHost(
  host: string,
  rootDomain: string,
): string | null {
  const normalizedHost = host.split(':')[0].toLowerCase();
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
