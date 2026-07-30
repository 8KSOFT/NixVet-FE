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

        const t0 = performance.now();
        try {
          // `fetch` cru de propósito, não o `api`: a URL já carrega a
          // assinatura e mandar o nosso Authorization junto faz o storage
          // recusar o PUT.
          const put = await fetch(presigned.upload_url, {
            method: 'PUT',
            body: image.blob,
            headers: { 'Content-Type': image.mimeType },
          });
          if (!put.ok) throw new Error(`HTTP ${put.status}`);
          break;
        } catch (err) {
          ultimoErro = err;
          // Duração separa "recusado na hora" de "morreu no meio" — é o que o
          // log do servidor não consegue enxergar hoje.
          console.warn(
            `[foto] tentativa ${n}/${MAX} falhou apos ${Math.round(performance.now() - t0)}ms`,
            { bytes: image.blob.size, mime: image.mimeType, erro: err },
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
