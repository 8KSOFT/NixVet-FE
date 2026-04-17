'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2, Mail, Lock, Loader2, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getApiBaseUrl } from '@/lib/api-base';
import { fetchPublicBranding } from '@/lib/branding';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState('NixVetApp');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [defaultTenantCode, setDefaultTenantCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicBranding().then((branding) => {
      setBrandName(branding.appName || 'NixVetApp');
      setBrandLogo(branding.logoUrl);
      setDefaultTenantCode(branding.tenantCode);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      toast.error('Preencha email e senha.');
      return;
    }

    setLoading(true);

    const code = (
      tenantCode.trim() ||
      defaultTenantCode?.trim() ||
      'nixvet'
    ).toLowerCase();
    const apiBase = getApiBaseUrl();
    const url = `${apiBase}/auth/login`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
          tenantCode: code,
        }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw || 'Resposta inválida do servidor.' };
      }

      if (!res.ok) {
        const apiMessage = Array.isArray(data?.message)
          ? data.message.join(' | ')
          : (data?.message || '');
        toast.error(apiMessage || `Falha no login (${res.status})`);
        console.error('[LOGIN] HTTP error', {
          status: res.status,
          statusText: res.statusText,
          body: data,
          apiBase,
        });
        return;
      }

      const { access_token, user } = data;
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('tenantId', user.tenant_id);
      localStorage.setItem('tenantCode', code);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(t('auth.welcome', { name: user.name }));
      router.push('/dashboard');
    } catch (err: any) {
      console.error('[LOGIN] fetch error:', err);
      toast.error('Não foi possível conectar ao servidor. Verifique CORS/domínio da API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell relative min-h-screen">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Largura total: barra teal encosta à esquerda da viewport (sem max-w + mx-auto) */}
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <section
          className="relative flex w-full shrink-0 flex-col justify-center px-8 py-14 text-primary-foreground lg:min-h-screen lg:w-[min(100%,26rem)] lg:px-10 xl:w-[min(100%,30rem)]"
          style={{
            background: 'linear-gradient(165deg, #0a6578 0%, var(--primary) 42%, #0b5c6e 100%)',
          }}
        >
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" aria-hidden />
          <div className="relative z-[1]">
            <div className="mb-8 flex items-center gap-3">
              <Logo width={56} height={56} src={brandLogo} alt={brandName} className="bg-white/10 p-1 ring-1 ring-white/20" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Acesso</p>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{brandName}</h1>
              </div>
            </div>
            <p className="text-lg leading-relaxed text-white/90">{t('auth.subtitle')}</p>
            <ul className="mt-10 space-y-4 text-sm text-white/85">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-200" aria-hidden />
                <span>Multi-clínica com código da unidade e dados isolados por tenant.</span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-emerald-200" aria-hidden />
                <span>Interface pensada para fluxo rápido no consultório.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Formulário */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-14">
          <div className="w-full max-w-md">
            <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
                  {t('auth.cardTitle')}
                </h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tenantCode" className="text-muted-foreground font-medium">
                      {t('auth.tenantCodeLabel')}
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        id="tenantCode"
                        name="tenantCode"
                        className="pl-9"
                        placeholder={t('auth.tenantCodePlaceholder')}
                        value={tenantCode}
                        onChange={(e) => setTenantCode(e.target.value.toLowerCase())}
                        autoComplete="organization"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-muted-foreground font-medium">
                      {t('auth.emailLabel')}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        className="pl-9"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-muted-foreground font-medium">
                      {t('auth.passwordLabel')}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        className="pl-9"
                        placeholder={t('auth.passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="mt-2 h-11 w-full text-base font-medium" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {t('auth.submit')}
                  </Button>

                  <div className="text-center">
                    <a
                      href="#"
                      className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      onClick={(e) => e.preventDefault()}
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                </form>
              </CardContent>
            </Card>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} {brandName}. {t('auth.footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
