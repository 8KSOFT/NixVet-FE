'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoCompactoDynamic } from '@/components/shared/componentizedImages/LogoCompactoDynamic';
import { getApiBaseUrl } from '@/lib/api-base';
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

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; data: ApiEnvelope }> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data: ApiEnvelope = {};
  try {
    data = raw ? (JSON.parse(raw) as ApiEnvelope) : {};
  } catch {
    data = { message: raw || 'Resposta inválida do servidor.' };
  }
  return { ok: res.ok, data };
}

/**
 * Redefinição de senha da equipe em dois passos: pede o código por e-mail e
 * troca a senha com ele. O backend responde igual para e-mail cadastrado e não
 * cadastrado, então a tela também não pode dar pistas — por isso o passo 2
 * aparece de qualquer jeito depois do envio.
 */
export default function EsqueciSenhaPage() {
  const router = useRouter();

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
    if (!email.trim()) return toast.error('Informe o seu e-mail.');
    if (!resolvedCode) return toast.error('Informe o código da clínica.');

    setLoading(true);
    try {
      const { ok, data } = await postJson('/auth/password-reset/request', {
        email: email.trim().toLowerCase(),
        tenantCode: resolvedCode,
      });
      if (!ok) {
        toast.error(apiMessage(data, 'Não foi possível enviar o código.'));
        return;
      }
      toast.success('Se o e-mail estiver cadastrado, você receberá um código.');
      setStep('confirm');
    } catch {
      toast.error('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) return toast.error('O código tem 6 dígitos.');
    if (password.length < 8) return toast.error('A nova senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirmPassword) return toast.error('As senhas não conferem.');

    setLoading(true);
    try {
      const { ok, data } = await postJson('/auth/password-reset/confirm', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
        tenantCode: resolvedCode,
      });
      if (!ok) {
        toast.error(apiMessage(data, 'Não foi possível redefinir a senha.'));
        return;
      }
      toast.success('Senha redefinida. Entre com a nova senha.');
      router.push('/login');
    } catch {
      toast.error('Não foi possível conectar ao servidor.');
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
          {step === 'request' ? 'Esqueci minha senha' : 'Criar nova senha'}
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          {step === 'request'
            ? 'Informe o e-mail da sua conta e enviaremos um código de 6 dígitos.'
            : `Enviamos um código para ${email}. Ele vale por 15 minutos.`}
        </p>

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            {!tenantLocked && (
              <div className="space-y-2">
                <Label htmlFor="tenantCode">Código da clínica</Label>
                <Input
                  id="tenantCode"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="ex.: vixen"
                  autoComplete="organization"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                autoComplete="email"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
              Enviar código
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de 6 dígitos</Label>
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
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
              Redefinir senha
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => setStep('request')}
            >
              Não recebi o código
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar para o login
        </Link>
      </div>
    </div>
  );
}
