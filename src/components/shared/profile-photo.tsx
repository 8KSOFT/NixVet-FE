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
import type { PreparedImage } from '@/lib/profile-image';
import { ImageCropDialog } from './image-crop-dialog';
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
  const [cropFile, setCropFile] = useState<File | null>(null);

  const upload = useUploadProfilePhotoMutation(target, invalidate);
  const remove = useRemoveProfilePhotoMutation(target, invalidate);
  const busy = uploading || remove.isPending;

  const enviar = async (image: PreparedImage) => {
    setUploading(true);
    try {
      await upload.mutateAsync(image);
      toast.success('Foto atualizada.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erro ao enviar a foto.'));
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Zera o input já: sem isso, reescolher o mesmo arquivo não dispara change.
    event.target.value = '';
    if (!file) return;

    // Antes de tudo: o arquivo é legível? Um File pode existir e apontar para
    // conteúdo que não está no disco — Google Drive/iCloud/OneDrive mapeados,
    // pasta de rede, ou arquivo movido após a seleção. Foi exatamente o caso
    // que gerou este código: um arquivo no Google Drive mapeado.
    //
    // Sem esta checagem o upload falha parecendo problema de rede: o corpo
    // nunca é montado, a requisição morre sem chegar ao servidor, e o
    // navegador reporta "Failed to fetch" ou ERR_TIMED_OUT.
    try {
      await file.slice(0, 1024).arrayBuffer();
    } catch {
      toast.error(
        'Não foi possível ler este arquivo. Se ele estiver no Google Drive, iCloud, OneDrive ou numa ' +
          'pasta de rede, baixe-o para o computador antes de enviar.',
      );
      return;
    }

    // O navegador consegue decodificar? Se não, não dá para recortar NEM
    // exibir depois — o Chrome não lê HEIC, formato padrão das fotos de
    // iPhone. Antes o código subia assim mesmo e gravava uma imagem que nunca
    // aparecia na tela; recusar na hora é melhor do que a foto sumir em
    // silêncio.
    try {
      const bmp = await createImageBitmap(file);
      bmp.close();
    } catch {
      const heic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
      toast.error(
        heic
          ? 'Fotos em HEIC (padrão do iPhone) não são exibidas neste navegador. Converta para JPEG ou, no iPhone, ' +
            'ajuste Câmera → Formatos → Mais Compatível.'
          : 'Não foi possível abrir esta imagem. Tente enviar em JPEG ou PNG.',
      );
      return;
    }

    setCropFile(file);
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
    <div className="flex flex-col items-center gap-1.5">
      <ImageCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onConfirm={(image) => {
          setCropFile(null);
          void enviar(image);
        }}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFile}
      />

      {/* A própria imagem é o botão: é onde a pessoa procura primeiro.
          O badge de câmera fica sempre visível, e não só no hover, senão
          em touch não haveria nenhuma pista de que dá para trocar. */}
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={url ? `Trocar ${label}` : `Adicionar ${label}`}
        aria-label={url ? `Trocar ${label}` : `Adicionar ${label}`}
        className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
      >
        <ProfilePhoto url={url} name={name} className={cn('size-20', className)} />

        {/* Escurece no hover para deixar claro que a imagem é clicável. */}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 transition-colors group-hover:bg-foreground/35">
          <Camera className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </span>

        <span className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm">
          <Camera className="size-3.5" />
        </span>

        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/45">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        ) : null}
      </button>

      {url && canRemove ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-auto py-1 text-xs text-muted-foreground hover:text-destructive"
          disabled={busy}
          onClick={handleRemove}
        >
          <Trash2 className="mr-1 size-3.5" /> Remover
        </Button>
      ) : null}
    </div>
  );
}
