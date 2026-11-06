'use client';

import React, { useEffect, useState } from 'react';
import TurnstileWidget from '@/components/security/TurnstileWidget';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoCompactoDynamic } from '@/components/shared/componentizedImages/LogoCompactoDynamic';
import api from '@/lib/axios';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { detectSubdomainClient } from '@/lib/subdomain';

type Step = 'request' | 'confirm';

interface ApiEnvelope {
  message?: string | string[];
}

/** Mensagem de erro da API, que pode vir como string ou array do class-validator. */
function apiMessage(data: ApiEnvelope, fallback: string): string {
  if (Array.isArray(data?.message)) return data.message.join(' | ');
  return data?.message || fallback;
}

/**
 * POST pelo client único (lib/axios): pede `problem+json`, manda
 * `x-request-id` e tem timeout. A mensagem de erro sai de
 * `getApiErrorMessage`, que entende os dois formatos de erro da API.
 */
async function postJson(path: string, body: unknown): Promise<{ ok: boolean; data: ApiEnvelope }> {
  try {
    const { data } = await api.post<ApiEnvelope>(path, body);
    return { ok: true, data: data ?? {} };
  } catch (error: unknown) {
    return { ok: false, data: { message: getApiErrorMessage(error, '') } };
  }
}

/**
 * Redefinição de senha da equipe em dois passos: pede o código por e-mail e
 * troca a senha com ele. O backend responde igual para e-mail cadastrado e não
 * cadastrado, então a tela também não pode dar pistas — por isso o passo 2
 * aparece de qualquer jeito depois do envio.
 */
export default function EsqueciSenhaClient() {
  const { t } = useTranslation();
  const router = useRouter();

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [tenantLocked, setTenantLocked] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const subdomain = detectSubdomainClient();
    if (subdomain) {
      setTenantCode(subdomain);
      setTenantLocked(true);
    }
  }, []);

  const resolvedCode = tenantCode.trim().toLowerCase();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error(t('resetPassword.emailRequired'));
    if (!resolvedCode) return toast.error(t('resetPassword.tenantRequired'));

    setLoading(true);
    try {
      const { ok, data } = await postJson('/auth/password-reset/request', {
        email: email.trim().toLowerCase(),
        tenantCode: resolvedCode,
        turnstileToken,
      });
      if (!ok) {
        toast.error(apiMessage(data, t('resetPassword.sendFailed')));
        return;
      }
      toast.success(t('resetPassword.sentNeutral'));
      // Token de Turnstile é de uso único: o que validou o pedido já foi
      // gasto. Zerar aqui evita mandar um token queimado na confirmação e
      // levar "não foi possível confirmar que você não é um robô" sem motivo
      // aparente — o widget do passo 2 monta e entrega um novo.
      setTurnstileToken(null);
      setStep('confirm');
    } catch {
      toast.error(t('resetPassword.connectFail'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) return toast.error(t('resetPassword.codeDigits'));
    if (password.length < 8) return toast.error(t('resetPassword.passwordMin'));
    if (password !== confirmPassword) return toast.error(t('resetPassword.mismatch'));

    setLoading(true);
    try {
      const { ok, data } = await postJson('/auth/password-reset/confirm', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
        tenantCode: resolvedCode,
        turnstileToken,
      });
      if (!ok) {
        toast.error(apiMessage(data, t('resetPassword.confirmFailed')));
        return;
      }
      toast.success(t('resetPassword.done'));
      router.push('/login');
    } catch {
      toast.error(t('resetPassword.connectFail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-end gap-2">
          <LogoCompactoDynamic width="36" height="36" />
          <h1 className="font-heading text-[26px] leading-6 tracking-tight scale-y-85">
            <span className="text-foreground">NixVet</span>
          </h1>
        </div>

        <h2 className="text-xl font-semibold text-foreground">
          {step === 'request' ? t('resetPassword.titleRequest') : t('resetPassword.titleConfirm')}
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          {step === 'request'
            ? t('resetPassword.introRequest')
            : t('resetPassword.introConfirm', { email })}
        </p>

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            {!tenantLocked && (
              <div className="space-y-2">
                <Label htmlFor="tenantCode">{t('resetPassword.tenantLabel')}</Label>
                <Input
                  id="tenantCode"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder={t('resetPassword.tenantPlaceholder')}
                  autoComplete="organization"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('resetPassword.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                autoComplete="email"
                required
              />
            </div>
            <TurnstileWidget onToken={setTurnstileToken} className="mb-3 flex justify-center" />
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
              {t('resetPassword.sendCode')}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t('resetPassword.codeLabel')}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="tracking-[0.4em]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={t('resetPassword.passwordPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <TurnstileWidget onToken={setTurnstileToken} className="mb-3 flex justify-center" />
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
              {t('resetPassword.submit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => setStep('request')}
            >
              {t('resetPassword.didNotReceive')}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t('resetPassword.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
