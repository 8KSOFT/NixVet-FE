'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import {
  useRemoveProfilePhotoMutation,
  useUploadProfilePhotoMutation,
  type ProfilePhotoTarget,
} from '@/hooks/apiHooks/useProfilePhoto';
import { ProfileImageError } from '@/lib/profile-image';
import { cn } from '@/lib/utils';

/** Iniciais do nome — no máximo duas. */
function initialsOf(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface ProfilePhotoProps {
  /** URL pré-assinada vinda do backend (`photo_url`). Expira — não persistir. */
  url?: string | null;
  name?: string | null;
  className?: string;
}

/** Avatar somente leitura: foto quando existe, iniciais quando não. */
export function ProfilePhoto({ url, name, className }: ProfilePhotoProps) {
  return (
    <Avatar className={cn('size-9 border border-border', className)}>
      {url ? <AvatarImage src={url} alt={name ?? ''} className="object-cover" /> : null}
      <AvatarFallback className="bg-brand-deep text-xs font-semibold text-white">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export interface ProfilePhotoUploaderProps extends ProfilePhotoProps {
  /** Recurso dono da foto: `/patients/<id>`, `/users/me`, `/tutors/<id>`. */
  target: ProfilePhotoTarget;
  /** Queries que precisam ser refeitas depois da troca. */
  invalidate?: readonly (readonly unknown[])[];
  /** Rótulo usado nas mensagens ("foto do pet", "sua foto"...). */
  label?: string;
  /** Esconde o botão de remover (ex.: quem não pode editar aquele cadastro). */
  canRemove?: boolean;
}

/**
 * Avatar com troca e remoção de foto. O arquivo é redimensionado no navegador
 * e vai direto para o bucket por URL pré-assinada — a API só assina e confirma.
 */
export function ProfilePhotoUploader({
  target,
  invalidate = [],
  label = 'foto',
  canRemove = true,
  url,
  name,
  className,
}: ProfilePhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = useUploadProfilePhotoMutation(target, invalidate);
  const remove = useRemoveProfilePhotoMutation(target, invalidate);
  const busy = uploading || remove.isPending;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Zera o input já: sem isso, reescolher o mesmo arquivo não dispara change.
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      await upload.mutateAsync(file);
      toast.success('Foto atualizada.');
    } catch (err) {
      toast.error(
        err instanceof ProfileImageError ? err.message : getApiErrorMessage(err, 'Erro ao enviar a foto.'),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await remove.mutateAsync();
      toast.success('Foto removida.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erro ao remover a foto.'));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <ProfilePhoto url={url} name={name} className={cn('size-16', className)} />
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/45">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="mr-1 size-4" />
          {url ? `Trocar ${label}` : `Adicionar ${label}`}
        </Button>
        {url && canRemove ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={handleRemove}
          >
            <Trash2 className="mr-1 size-4" /> Remover
          </Button>
        ) : null}
      </div>
    </div>
  );
}
