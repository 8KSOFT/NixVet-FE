'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { establishSession } from '@/lib/session';
import {
  usePreviewInviteQuery,
  useAcceptInviteMutation,
} from '@/hooks/apiHooks/useTeamInvites';

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const router = useRouter();

  const { data: preview, isLoading, isError } = usePreviewInviteQuery(token);
  const acceptInvite = useAcceptInviteMutation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Senhas não conferem.');
      return;
    }
    try {
      const res = await acceptInvite.mutateAsync({ token, password });
      if (!res?.access_token || !res?.user) {
        toast.success('Conta criada! Faça login para entrar.');
        router.push(`/login?code=${res?.tenantCode ?? ''}`);
        return;
      }
      establishSession(res.access_token, res.user, res.tenantCode);
      toast.success(`Bem-vindo(a) à equipe, ${res.user.name}!`);
      router.push('/dashboard');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Não foi possível aceitar o convite. Tente novamente.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mb-2 text-2xl font-extrabold tracking-tight text-primary">NixVet</div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Carregando convite...</p>
          </div>
        ) : isError || !preview ? (
          <div className="py-8 text-center">
            <h1 className="text-lg font-bold text-slate-900">Convite inválido ou expirado</h1>
            <p className="mt-2 text-sm text-slate-500">
              Peça para quem te convidou enviar um novo convite.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary underline">
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-lg font-bold text-slate-900">Bem-vindo(a), {preview.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Você foi convidado(a) para a equipe de <strong>{preview.clinicName}</strong>. Crie sua senha para entrar.
              </p>
              <p className="mt-1 text-xs text-slate-400">{preview.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="pl-9"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={acceptInvite.isPending}>
                {acceptInvite.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Criando conta...</>
                ) : (
                  'Criar minha conta'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
