'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { prepareProfileImage } from '@/lib/profile-image';

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
    mutationFn: async (file: File): Promise<ProfilePhotoResult> => {
      const image = await prepareProfileImage(file);

      const { data: presigned } = await api.post<UploadUrlResponse>(`${target}/photo/upload-url`, {
        mime_type: image.mimeType,
        size_bytes: image.blob.size,
      });

      // `fetch` cru de propósito, não o `api`: a URL já carrega a assinatura e
      // mandar o nosso header Authorization junto faz o OCI recusar o PUT.
      const put = await fetch(presigned.upload_url, {
        method: 'PUT',
        body: image.blob,
        headers: { 'Content-Type': image.mimeType },
      });
      if (!put.ok) throw new Error(`Falha ao enviar a imagem (${put.status}).`);

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
