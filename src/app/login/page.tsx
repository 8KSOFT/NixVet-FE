'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2, Mail, Lock, Loader2 } from 'lucide-react';
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

    const code = tenantCode.trim() || defaultTenantCode?.trim() || 'NIXVET';
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

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || t('auth.loginFailed'));
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
      toast.error(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo width={80} height={80} src={brandLogo} alt={brandName} />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">{brandName}</h1>
          <p className="text-slate-500 text-lg">{t('auth.subtitle')}</p>
        </div>

        <Card className="shadow-xl rounded-2xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tenantCode" className="text-slate-600 font-medium">
                  {t('auth.tenantCodeLabel')}
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="tenantCode"
                    name="tenantCode"
                    className="pl-9"
                    placeholder={t('auth.tenantCodePlaceholder')}
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-600 font-medium">
                  {t('auth.emailLabel')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    className="pl-9"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-600 font-medium">
                  {t('auth.passwordLabel')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    className="pl-9"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium mt-2"
                disabled={loading}
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {t('auth.submit')}
              </Button>

              <div className="text-center">
                <a href="#" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
                  {t('auth.forgotPassword')}
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-8 text-slate-400 text-sm">
          © {new Date().getFullYear()} {brandName}. {t('auth.footer')}
        </p>
      </div>
    </div>
  );
}
