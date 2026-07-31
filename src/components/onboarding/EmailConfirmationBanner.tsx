'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useConfirmEmailMutation,
  useRequestEmailConfirmationMutation,
} from '@/hooks/apiHooks/useOnboarding';

interface StoredUser {
  email?: string;
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
  const [user, setUser] = useState<StoredUser | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const requestMutation = useRequestEmailConfirmationMutation();
  const confirmMutation = useConfirmEmailMutation();

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  if (!user || user.email_confirmed_at) return null;

  const handleResend = () => {
    requestMutation.mutate(undefined, {
      onSuccess: () => {
        setShowCodeInput(true);
        toast.success(`Enviamos um código para ${user.email}.`);
      },
      onError: () => toast.error('Não foi possível enviar o código. Tente novamente.'),
    });
  };

  const handleConfirm = () => {
    if (code.trim().length !== 6) {
      toast.error('Digite os 6 dígitos do código.');
      return;
    }
    confirmMutation.mutate(code.trim(), {
      onSuccess: () => {
        const updated = { ...user, email_confirmed_at: new Date().toISOString() };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        toast.success('E-mail confirmado com sucesso.');
      },
      onError: () => toast.error('Código inválido ou expirado.'),
    });
  };

  return (
    <div className="flex flex-col gap-2 border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:gap-3">
      <Mail className="size-4 shrink-0 text-blue-600" />
      <span className="flex-1">
        Confirme seu e-mail (<strong>{user.email}</strong>) para liberar convites de equipe e ativação de plano pago.
      </span>
      {!showCodeInput ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
          onClick={handleResend}
          disabled={requestMutation.isPending}
        >
          {requestMutation.isPending ? 'Enviando...' : 'Enviar código'}
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
            {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar'}
          </Button>
          <button
            type="button"
            className="text-xs text-blue-700 underline underline-offset-2"
            onClick={handleResend}
            disabled={requestMutation.isPending}
          >
            Reenviar
          </button>
        </div>
      )}
    </div>
  );
}
