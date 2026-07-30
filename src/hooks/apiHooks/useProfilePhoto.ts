'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { PreparedImage } from '@/lib/profile-image';

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
 * Envia a foto para a NOSSA API, que grava no storage.
 *
 * O desenho anterior era o navegador subir direto para o storage por URL
 * pré-assinada — o padrão para arquivo grande, porque evita o binário
 * atravessar o backend. Na prática esse passo atravessava um host de terceiro
 * e o PUT morria sem chegar ao servidor: o nginx registrava o preflight e
 * nenhum PUT, e o navegador só dizia "Failed to fetch".
 *
 * Para avatar de 512×512 (~40 KB) o custo de passar pelo backend é
 * irrelevante perto de o upload não funcionar. Uploads grandes (anexos da
 * ficha) seguem no fluxo pré-assinado, onde a economia justifica o risco.
 */
export function useUploadProfilePhotoMutation(
  target: ProfilePhotoTarget,
  invalidate: InvalidateKeys = [],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (image: PreparedImage): Promise<ProfilePhotoResult> => {
      const form = new FormData();
      // O nome do arquivo importa: o multer usa `originalname`, e sem extensão
      // alguns clientes mandam Content-Type genérico.
      form.append('file', image.blob, `foto.${image.mimeType.split('/')[1] ?? 'jpg'}`);

      const { data } = await api.post<ProfilePhotoResult>(`${target}/photo/upload`, form);
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
