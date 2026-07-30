'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { PreparedImage } from '@/lib/profile-image';

interface UploadUrlResponse {
  upload_url: string;
  storage_path: string;
  expires_at: string;
  max_bytes: number;
}

export interface ProfilePhotoResult {
  photo_path: string | null;
  photo_url: string | null;
  photo_updated_at?: string;
}

/**
 * Prefixo do recurso dono da foto, sem `/photo`:
 * `/patients/<id>` · `/users/<id>` (ou `/users/me`) · `/tutors/<id>`.
 */
export type ProfilePhotoTarget = string;

/** Resultado de uma tentativa de PUT, com o que saiu de fato pela rede. */
interface ResultadoPut {
  status: number;
  enviados: number;
  total: number;
  ms: number;
}

/**
 * PUT via XMLHttpRequest, e não `fetch`, de propósito.
 *
 * O `fetch` só devolve "TypeError: Failed to fetch" quando a conexão morre —
 * sem status, sem quanto do corpo chegou a sair. O nginx, por sua vez, só
 * registra requisição completa, então um upload abortado no meio não aparece
 * em lugar nenhum dos dois lados.
 *
 * O XHR expõe `upload.onprogress`, que dá o equivalente cliente do
 * `$request_length`: com ele dá para dizer se a conexão caiu no primeiro byte
 * ou no meio do corpo, e separar `error` de `timeout` de `abort`.
 */
function putComProgresso(
  url: string,
  blob: Blob,
  mime: string,
  timeoutMs = 60_000,
): Promise<ResultadoPut> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const t0 = performance.now();
    let enviados = 0;

    const ms = () => Math.round(performance.now() - t0);
    const falhar = (tipo: string) =>
      reject(new Error(`${tipo} apos ${enviados}/${blob.size} bytes em ${ms()}ms`));

    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', mime);
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (e) => { enviados = e.loaded; };
    xhr.onload = () => resolve({ status: xhr.status, enviados, total: blob.size, ms: ms() });
    xhr.onerror = () => falhar('conexao caiu');
    xhr.ontimeout = () => falhar('timeout');
    xhr.onabort = () => falhar('abortado');

    xhr.send(blob);
  });
}


type InvalidateKeys = readonly (readonly unknown[])[];

/**
 * Envia a foto de perfil em três passos: pede a URL pré-assinada, faz o PUT
 * direto no bucket e confirma para o backend. O binário nunca passa pela API.
 */
export function useUploadProfilePhotoMutation(
  target: ProfilePhotoTarget,
  invalidate: InvalidateKeys = [],
) {
  const queryClient = useQueryClient();

  return useMutation({
    // Recebe a imagem já pronta (recortada no diálogo, ou redimensionada no
    // fallback quando o navegador não consegue decodificar para recortar).
    // Recebe a imagem já pronta (recortada no diálogo, ou redimensionada no
    // fallback quando o navegador não consegue decodificar para recortar).
    mutationFn: async (image: PreparedImage): Promise<ProfilePhotoResult> => {
      // Os logs do nginx mostram o padrão real: o PUT é abortado no meio, não
      // recusado — a mesma máquina falha uma vez e passa na seguinte. Por isso
      // a estratégia é repetir, e não "consertar" a requisição.
      //
      // Cada tentativa pede uma URL nova: a assinatura vale 5 min e uma
      // tentativa que morreu no meio pode ter deixado o objeto num estado que
      // não convém reaproveitar.
      const MAX = 3;
      const espera = [700, 1800];
      let ultimoErro: unknown;
      let storagePath = '';

      for (let n = 1; n <= MAX; n++) {
        const { data: presigned } = await api.post<UploadUrlResponse>(`${target}/photo/upload-url`, {
          mime_type: image.mimeType,
          size_bytes: image.blob.size,
        });
        storagePath = presigned.storage_path;

        try {
          // Sem Authorization: a URL já carrega a assinatura, e mandar o nosso
          // header junto faz o storage recusar o PUT.
          const r = await putComProgresso(presigned.upload_url, image.blob, image.mimeType);
          if (r.status < 200 || r.status >= 300) {
            throw new Error(`HTTP ${r.status} apos ${r.enviados}/${r.total} bytes`);
          }
          break;
        } catch (err) {
          ultimoErro = err;
          console.warn(
            `[foto] tentativa ${n}/${MAX}: ${(err as Error).message}`,
            { url: presigned.upload_url, mime: image.mimeType },
          );
          if (n === MAX) {
            throw new Error(
              'Não foi possível enviar a imagem depois de 3 tentativas. Verifique a conexão e tente de novo.',
            );
          }
          await new Promise((r) => setTimeout(r, espera[n - 1]));
        }
      }

      const { data } = await api.put<ProfilePhotoResult>(`${target}/photo`, {
        storage_path: storagePath,
      });
      return data;
    },
    onSuccess: () => {
      for (const key of invalidate) {
        queryClient.invalidateQueries({ queryKey: key as unknown[] });
      }
    },
  });
}

/** Remove a foto de perfil. */
export function useRemoveProfilePhotoMutation(
  target: ProfilePhotoTarget,
  invalidate: InvalidateKeys = [],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ProfilePhotoResult> => {
      const { data } = await api.delete<ProfilePhotoResult>(`${target}/photo`);
      return data;
    },
    onSuccess: () => {
      for (const key of invalidate) {
        queryClient.invalidateQueries({ queryKey: key as unknown[] });
      }
    },
  });
}
