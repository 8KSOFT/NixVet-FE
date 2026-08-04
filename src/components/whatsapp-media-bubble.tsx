'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, FileText, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import type { WhatsappMessage } from '@/app/types/whatsapp-conversation';

const MEDIA_KINDS = new Set(['image', 'audio', 'video', 'document', 'sticker']);

export function isMediaMessage(message: WhatsappMessage): boolean {
  return !!message.type && MEDIA_KINDS.has(message.type);
}

function formatBytes(bytes?: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds?: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Dias inteiros restantes até a mídia sair do servidor. */
function daysLeft(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/**
 * Mídia recebida no WhatsApp.
 *
 * O arquivo é buscado via axios (e não direto no `src`) porque o endpoint exige
 * o Bearer token, que um `<img src>` não enviaria. O blob vira object URL e é
 * revogado ao desmontar, para não vazar memória ao percorrer conversas.
 */
export function WhatsappMediaBubble({ message }: { message: WhatsappMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const status = message.media_status ?? 'pending';
  const kind = message.type;
  const remaining = daysLeft(message.media_expires_at);
  const inlineKind = kind === 'image' || kind === 'sticker' || kind === 'audio' || kind === 'video';

  useEffect(() => {
    if (status !== 'stored' || !inlineKind) return;

    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);

    api
      .get(`/whatsapp/messages/${message.id}/media`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message.id, status, inlineKind]);

  const handleDownload = async () => {
    try {
      const { data } = await api.get(`/whatsapp/messages/${message.id}/media`, {
        responseType: 'blob',
      });
      const href = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = message.media_filename ?? `${kind}-${message.id.slice(0, 8)}`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setFailed(true);
    }
  };

  if (status === 'expired' || status === 'unavailable') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-dashed px-2 py-2 text-xs opacity-90">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {status === 'expired'
            ? `${labelFor(kind)} removido do servidor após 7 dias. Peça ao tutor para reenviar, se necessário.`
            : `${labelFor(kind)} não pôde ser recuperado — o WhatsApp mantém o arquivo por tempo limitado.`}
        </span>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 text-xs opacity-80">
        <Loader2 className="size-3.5 animate-spin" />
        Recebendo {labelFor(kind).toLowerCase()}…
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {loading && (
        <div className="flex items-center gap-2 text-xs opacity-80">
          <Loader2 className="size-3.5 animate-spin" />
          Carregando…
        </div>
      )}

      {failed && (
        <div className="flex items-center gap-2 text-xs">
          <AlertCircle className="size-3.5" />
          Não foi possível abrir o arquivo.
        </div>
      )}

      {url && (kind === 'image' || kind === 'sticker') && (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL local, sem otimização possível
        <img
          src={url}
          alt={message.body_text ?? 'Imagem recebida'}
          className="max-h-72 w-auto max-w-full rounded-md"
        />
      )}

      {url && kind === 'audio' && <audio src={url} controls className="w-56 max-w-full" />}

      {url && kind === 'video' && (
        <video src={url} controls className="max-h-72 w-auto max-w-full rounded-md" />
      )}

      {kind === 'document' && (
        <div className="flex items-center gap-2 rounded-md border px-2 py-2">
          <FileText className="size-4 shrink-0" />
          <span className="truncate text-xs">{message.media_filename ?? 'Documento'}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] opacity-80">
        {formatDuration(message.media_duration_seconds) && (
          <span>{formatDuration(message.media_duration_seconds)}</span>
        )}
        {formatBytes(message.media_size_bytes) && <span>{formatBytes(message.media_size_bytes)}</span>}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[11px]"
          onClick={() => void handleDownload()}
        >
          <Download className="size-3" />
          Baixar
        </Button>
      </div>

      {/* O prazo precisa estar visível: é a diferença entre a equipe baixar o
          áudio a tempo e descobrir que sumiu quando for procurar. */}
      {remaining !== null && (
        <p className="text-[11px] opacity-70">
          {remaining <= 1
            ? 'Sai do servidor hoje — baixe se precisar guardar.'
            : `Disponível por mais ${remaining} dias no NixVet. Baixe se precisar guardar.`}
        </p>
      )}
    </div>
  );
}

function labelFor(kind?: string): string {
  switch (kind) {
    case 'image':
      return 'Imagem';
    case 'audio':
      return 'Áudio';
    case 'video':
      return 'Vídeo';
    case 'sticker':
      return 'Figurinha';
    default:
      return 'Documento';
  }
}
