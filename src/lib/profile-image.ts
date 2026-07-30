/** Teto aceito pelo backend (ProfilePhotoService.MAX_BYTES). */
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Lado do avatar salvo. Acima disso é banda desperdiçada — a tela exibe ~100px. */
export const PROFILE_PHOTO_OUTPUT_SIZE = 512;
const MAX_SIDE = PROFILE_PHOTO_OUTPUT_SIZE;

/** Formatos que o backend aceita. */
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export interface PreparedImage {
  blob: Blob;
  mimeType: string;
}

export class ProfileImageError extends Error {}

/**
 * Reduz para o lado máximo e recomprime em JPEG.
 *
 * `createImageBitmap` com `imageOrientation: 'from-image'` aplica o EXIF — sem
 * isso, foto de celular em retrato sobe deitada.
 *
 * Se o navegador não souber decodificar (HEIC fora do Safari, por exemplo),
 * cai para o arquivo original: o backend aceita HEIC, então só recusamos se
 * também estourar o tamanho.
 */
export async function prepareProfileImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED.includes(file.type.toLowerCase())) {
    throw new ProfileImageError('Formato não suportado. Envie JPEG, PNG, WebP ou HEIC.');
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas indisponível');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.8),
    );
    if (!blob) throw new Error('toBlob falhou');
    return { blob, mimeType: 'image/jpeg' };
  } catch {
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      throw new ProfileImageError(
        'Não foi possível processar esta imagem e ela passa de 5 MB. Converta para JPEG e tente de novo.',
      );
    }
    return { blob: file, mimeType: file.type };
  }
}
