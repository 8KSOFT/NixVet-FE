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

      // `fetch` cru em vez do `api` (axios) por evidência, não por preferência:
      // na máquina onde o upload falha, o mesmo POST feito com `fetch` pelo
      // console completou com 201, e pelo axios morre em ERR_TIMED_OUT sem
      // chegar ao servidor. Não achamos a causa dessa diferença; o que se sabe
      // é qual dos dois funciona ali.
      //
      // Como não passa pelo axios, os headers que o interceptor injeta são
      // montados aqui — inclusive o Content-Type, que fica a cargo do browser
      // para carregar o boundary do multipart.
      const token = localStorage.getItem('accessToken');
      const tenantId =
        localStorage.getItem('tenantId') ??
        document.cookie.match(/(?:^|; )nixvet_tenant_id=([^;]*)/)?.[1];

      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (tenantId) headers['x-tenant-id'] = decodeURIComponent(tenantId);

      // Caminho RELATIVO de propósito: o rewrite do next.config repassa para a
      // API. Mantém a requisição same-origin, sem preflight — o padrão que
      // funciona em produção na plataforma Omni sobre a mesma infra.
      const res = await fetch(`/api${target}/photo/upload`, {
        method: 'POST',
        headers,
        body: form,
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = Array.isArray(body?.message) ? body.message.join(' | ') : body?.message;
        throw new Error(msg || `Falha ao enviar a imagem (HTTP ${res.status}).`);
      }
      // Mesmo envelope { success, message, data } que o interceptor desembrulha.
      return (body?.data ?? body) as ProfilePhotoResult;
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
