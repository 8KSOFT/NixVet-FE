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
    mutationFn: async (image: PreparedImage): Promise<ProfilePhotoResult> => {
      const { data: presigned } = await api.post<UploadUrlResponse>(`${target}/photo/upload-url`, {
        mime_type: image.mimeType,
        size_bytes: image.blob.size,
      });

      // `fetch` cru de propósito, não o `api`: a URL já carrega a assinatura e
      // mandar o nosso header Authorization junto faz o storage recusar o PUT.
      //
      // Uma tentativa extra porque a falha observada é `TypeError: Failed to
      // fetch` — erro de transporte, sem status, que uma segunda tentativa
      // costuma vencer. Erro com status (403, 413) não é retentado: repetir
      // não muda o resultado.
      let put: Response | undefined;
      for (let tentativa = 1; tentativa <= 2; tentativa++) {
        try {
          put = await fetch(presigned.upload_url, {
            method: 'PUT',
            body: image.blob,
            headers: { 'Content-Type': image.mimeType },
          });
          break;
        } catch (err) {
          if (tentativa === 2) {
            throw new Error(
              'Não foi possível enviar a imagem: a conexão com o servidor de arquivos falhou. Tente de novo.',
            );
          }
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      if (!put || !put.ok) {
        throw new Error(`Falha ao enviar a imagem (HTTP ${put?.status ?? 'sem resposta'}).`);
      }

      const { data } = await api.put<ProfilePhotoResult>(`${target}/photo`, {
        storage_path: presigned.storage_path,
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
