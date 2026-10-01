'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
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

function lerCookie(nome: string): string | undefined {
  return document.cookie
    .match(new RegExp(`(?:^|; )${nome}=([^;]*)`))?.[1];
}

/**
 * Headers de sessão para o `fetch` com `keepalive` do diagnóstico, que não
 * passa pelo axios (o relatório precisa sobreviver à página indo embora).
 */
function sessionHeaders(): Record<string, string> {
  const tenantId = lerCookie('nixvet_tenant_id') ?? localStorage.getItem('tenantId');
  const csrf = lerCookie('nixvet_csrf');
  const h: Record<string, string> = {};
  if (tenantId) h['x-tenant-id'] = decodeURIComponent(tenantId);
  if (csrf) h['x-csrf-token'] = decodeURIComponent(csrf);
  return h;
}

/**
 * Upload pelo client único, mas same-origin: `baseURL: '/api'` passa pelo
 * rewrite do Next em vez de ir direto ao host da API (ver o comentário do
 * `rewrites` no next.config — o multipart cross-origin morria no Chrome de um
 * cliente). Pelo interceptor vêm o tenant, o CSRF, o `x-request-id`, o
 * timeout e, principalmente, a renovação de sessão num 401: até 01/10/2026
 * este caminho era `fetch` cru e falhava com "HTTP 401" depois de 60 min
 * logado, em vez de renovar o token.
 */
async function enviar(path: string, body: FormData | object): Promise<ProfilePhotoResult> {
  try {
    const { data } = await api.post<ProfilePhotoResult>(path, body, {
      baseURL: '/api',
      timeout: 120_000,
    });
    return data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, 'falha no envio'));
  }
}

function lerComoBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('falha ao ler a imagem'));
    fr.onload = () => {
      const r = String(fr.result);
      resolve(r.slice(r.indexOf(',') + 1));
    };
    fr.readAsDataURL(blob);
  });
}

/**
 * Manda o diagnóstico para o backend. Sem isso, uma falha que morre no cliente
 * não deixa rastro em lugar nenhum — foi o que travou este bug por horas.
 */
function reportar(dados: Record<string, unknown>) {
  const payload = JSON.stringify({
    origem: 'upload-foto',
    ...dados,
    erroMultipart: (dados.erroMultipart as Error)?.message ?? String(dados.erroMultipart ?? ''),
    erroBase64: (dados.erroBase64 as Error)?.message ?? String(dados.erroBase64 ?? ''),
    ua: navigator.userAgent,
    quando: new Date().toISOString(),
  });
  // `keepalive` para o relatório sobreviver se a página for embora em seguida.
  void fetch('/api/diagnostics/client', {
    method: 'POST',
    headers: { ...sessionHeaders(), 'Content-Type': 'application/json' },
    credentials: 'include',
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

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
      // Estratégia 1: multipart. É o formato natural para arquivo.
      const t0 = performance.now();
      try {
        const form = new FormData();
        form.append('file', image.blob, `foto.${image.mimeType.split('/')[1] ?? 'jpg'}`);
        return await enviar(`${target}/photo/upload`, form);
      } catch (erroMultipart) {
        const msMultipart = Math.round(performance.now() - t0);

        // Estratégia 2: base64 num JSON comum — mesma forma das requisições que
        // nunca falharam neste navegador. Vale a inflação de ~33% no corpo:
        // em pelo menos um cliente o multipart não chega ao servidor (não
        // aparece nem no log do nginx) e o JSON chega.
        const t1 = performance.now();
        try {
          const data = await lerComoBase64(image.blob);
          const r = await enviar(`${target}/photo/upload-base64`, {
            mime_type: image.mimeType,
            data,
          });
          reportar({
            target, bytes: image.blob.size, mime: image.mimeType,
            msMultipart, erroMultipart, base64: 'ok',
          });
          return r;
        } catch (erroBase64) {
          reportar({
            target, bytes: image.blob.size, mime: image.mimeType,
            msMultipart, erroMultipart,
            base64: 'falhou', msBase64: Math.round(performance.now() - t1), erroBase64,
          });
          throw new Error(
            `Não foi possível enviar a imagem. multipart: ${(erroMultipart as Error).message}; ` +
            `base64: ${(erroBase64 as Error).message}`,
          );
        }
      }
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
