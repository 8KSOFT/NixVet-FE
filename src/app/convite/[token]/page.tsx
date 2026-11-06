'use client';

import { useState } from 'react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const router = useRouter();

  const { data: preview, isLoading, isError } = usePreviewInviteQuery(token);
  const acceptInvite = useAcceptInviteMutation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t('acceptInvite.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('acceptInvite.mismatch'));
      return;
    }
    try {
      const res = await acceptInvite.mutateAsync({ token, password });
      // A sessão vem em cookie HttpOnly na própria resposta do aceite.
      if (!res?.user) {
        toast.success(t('acceptInvite.created'));
        router.push(`/login?code=${res?.tenantCode ?? ''}`);
        return;
      }
      establishSession(res.user, res.tenantCode);
      toast.success(t('acceptInvite.welcomeToast', { name: res.user.name }));
      router.push('/dashboard');
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, t('acceptInvite.acceptError')),
      );
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
            <p className="text-sm">{t('acceptInvite.loading')}</p>
          </div>
        ) : isError || !preview ? (
          <div className="py-8 text-center">
            <h1 className="text-lg font-bold text-slate-900">{t('acceptInvite.invalidTitle')}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t('acceptInvite.invalidHint')}
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary underline">
              {t('acceptInvite.goLogin')}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-lg font-bold text-slate-900">{t('acceptInvite.welcome', { name: preview.name })}</h1>
              <p className="mt-1 text-sm text-slate-500">
                <Trans i18nKey="acceptInvite.invited" values={{ clinic: preview.clinicName }} components={{ b: <strong /> }} />
              </p>
              <p className="mt-1 text-xs text-slate-400">{preview.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('acceptInvite.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    placeholder={t('acceptInvite.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t('acceptInvite.confirm')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="pl-9"
                    placeholder={t('acceptInvite.confirmPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={acceptInvite.isPending}>
                {acceptInvite.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> {t('acceptInvite.creating')}</>
                ) : (
                  t('acceptInvite.create')
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
