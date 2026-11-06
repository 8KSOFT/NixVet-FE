'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useConfirmEmailMutation,
  useRequestEmailConfirmationMutation,
} from '@/hooks/apiHooks/useOnboarding';
import { useProfileQuery } from '@/hooks/apiHooks/useUsers';

interface StoredUser {
  email_confirmed_at?: string | null;
  [key: string]: unknown;
}

function readStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/**
 * Banner discreto (não bloqueia o uso do sistema) pra quem ainda não
 * confirmou o e-mail depois do onboarding. Dispensa sozinho ao confirmar —
 * não precisa de um novo login pra "sumir".
 */
export function EmailConfirmationBanner() {
  const { t } = useTranslation();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const requestMutation = useRequestEmailConfirmationMutation();
  const confirmMutation = useConfirmEmailMutation();
  // O e-mail não mora mais no localStorage (lib/session.ts); o perfil já é
  // buscado pelo layout, então isto sai do cache do React Query.
  const { data: profile } = useProfileQuery();
  const email = profile?.email ?? '';

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  if (!user || user.email_confirmed_at) return null;

  const handleResend = () => {
    requestMutation.mutate(undefined, {
      onSuccess: () => {
        setShowCodeInput(true);
        toast.success(email ? t('emailConfirmation.sentTo', { email }) : t('emailConfirmation.sentGeneric'));
      },
      onError: () => toast.error(t('emailConfirmation.sendError')),
    });
  };

  const handleConfirm = () => {
    if (code.trim().length !== 6) {
      toast.error(t('emailConfirmation.digits'));
      return;
    }
    confirmMutation.mutate(code.trim(), {
      onSuccess: () => {
        const updated = { ...user, email_confirmed_at: new Date().toISOString() };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        toast.success(t('emailConfirmation.confirmed'));
      },
      onError: () => toast.error(t('emailConfirmation.invalid')),
    });
  };

  return (
    <div className="flex flex-col gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:gap-3">
      <Mail className="size-4 shrink-0 text-emerald-600" />
      <span className="flex-1">
        {email ? (
          <Trans i18nKey="emailConfirmation.promptWithEmail" values={{ email }} components={{ b: <strong /> }} />
        ) : (
          t('emailConfirmation.prompt')
        )}
      </span>
      {!showCodeInput ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100"
          onClick={handleResend}
          disabled={requestMutation.isPending}
        >
          {requestMutation.isPending ? t('emailConfirmation.sending') : t('emailConfirmation.send')}
        </Button>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Input
            className="h-8 w-24 text-center font-mono text-sm"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <Button size="sm" onClick={handleConfirm} disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? t('emailConfirmation.confirming') : t('emailConfirmation.confirm')}
          </Button>
          <button
            type="button"
            className="text-xs text-emerald-700 underline underline-offset-2"
            onClick={handleResend}
            disabled={requestMutation.isPending}
          >
            {t('emailConfirmation.resend')}
          </button>
        </div>
      )}
    </div>
  );
}
