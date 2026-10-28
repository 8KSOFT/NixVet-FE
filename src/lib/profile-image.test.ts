import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROFILE_PHOTO_MAX_BYTES, PROFILE_PHOTO_OUTPUT_SIZE, ProfileImageError, prepareProfileImage } from './profile-image';

const arquivo = (tipo: string, tamanho = 10) => {
  const f = new File(['x'], 'foto', { type: tipo });
  Object.defineProperty(f, 'size', { value: tamanho });
  return f;
};

afterEach(() => vi.unstubAllGlobals());

describe('prepareProfileImage', () => {
  it('recusa formato que o backend não aceita', async () => {
    await expect(prepareProfileImage(arquivo('image/gif'))).rejects.toBeInstanceOf(ProfileImageError);
    await expect(prepareProfileImage(arquivo('application/pdf'))).rejects.toThrow(/Formato não suportado/);
  });

  it('aceita HEIC e ignora a caixa do tipo', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('sem decodificador')));
    const original = arquivo('image/HEIC');
    const r = await prepareProfileImage(original);
    expect(r.blob).toBe(original);
    expect(r.mimeType).toBe('image/heic');
  });

  it('se o navegador não decodifica, manda o original (o backend aceita HEIC)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('sem decodificador')));
    const original = arquivo('image/heic', 2 * 1024 * 1024);
    const r = await prepareProfileImage(original);
    expect(r.blob).toBe(original);
  });

  it('se não decodifica e ainda passa de 5 MB, recusa com instrução', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('sem decodificador')));
    await expect(prepareProfileImage(arquivo('image/heic', PROFILE_PHOTO_MAX_BYTES + 1))).rejects.toThrow(/5 MB/);
  });

  it('reduz para no máximo 512px no lado maior, preservando a proporção, e recomprime em JPEG', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 2048, height: 1024, close }));
    const desenhar = vi.fn();
    const blobSaida = new Blob(['jpeg'], { type: 'image/jpeg' });
    const toBlob = vi.fn((cb: BlobCallback) => cb(blobSaida));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: desenhar } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never);

    const r = await prepareProfileImage(arquivo('image/png', 3 * 1024 * 1024));
    expect(r).toEqual({ blob: blobSaida, mimeType: 'image/jpeg' });
    expect(desenhar).toHaveBeenCalledWith(expect.anything(), 0, 0, PROFILE_PHOTO_OUTPUT_SIZE, PROFILE_PHOTO_OUTPUT_SIZE / 2);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
    expect(close).toHaveBeenCalled();
  });

  it('imagem pequena não é ampliada', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 80, close: vi.fn() }));
    const desenhar = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: desenhar } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(((cb: BlobCallback) => cb(new Blob(['x']))) as never);
    await prepareProfileImage(arquivo('image/jpeg'));
    expect(desenhar).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 80);
  });

  it('pede ao navegador para aplicar a orientação EXIF (foto de celular em retrato)', async () => {
    const criar = vi.fn().mockRejectedValue(new Error('x'));
    vi.stubGlobal('createImageBitmap', criar);
    await prepareProfileImage(arquivo('image/jpeg'));
    expect(criar).toHaveBeenCalledWith(expect.anything(), { imageOrientation: 'from-image' });
  });
});
