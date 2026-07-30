'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PROFILE_PHOTO_OUTPUT_SIZE, type PreparedImage } from '@/lib/profile-image';

/** Lado do quadrado de recorte na tela (px lógicos). */
const VIEWPORT = 288;

const MAX_ZOOM = 4;

export interface ImageCropDialogProps {
  /** Arquivo escolhido; `null` mantém o diálogo fechado. */
  file: File | null;
  onCancel: () => void;
  onConfirm: (image: PreparedImage) => void;
}

/**
 * Recorte quadrado com arraste e zoom.
 *
 * Sem isto o enquadramento era decidido pelo centro geométrico da foto (o
 * `object-cover` do avatar), o que corta errado sempre que o animal não está
 * no meio do quadro.
 *
 * O que sai daqui já é o quadrado final em 512×512 — sobe menos bytes do que
 * mandar a foto inteira e cortar só na exibição.
 */
export function ImageCropDialog({ file, onCancel, onConfirm }: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [salvando, setSalvando] = useState(false);

  // Arraste: guardamos o ponto inicial e o offset de partida.
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // `baseScale` = escala em que a imagem cobre exatamente o quadrado.
  const baseScale = bitmap ? VIEWPORT / Math.min(bitmap.width, bitmap.height) : 1;
  const scale = baseScale * zoom;

  useEffect(() => {
    if (!file) {
      setBitmap(null);
      return;
    }
    let cancelado = false;
    setErro(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    // `imageOrientation: 'from-image'` aplica o EXIF — sem isso, foto de
    // celular em retrato entra deitada no recorte.
    createImageBitmap(file, { imageOrientation: 'from-image' })
      .then((bmp) => {
        if (cancelado) { bmp.close(); return; }
        setBitmap(bmp);
        // Começa centralizado.
        const s = VIEWPORT / Math.min(bmp.width, bmp.height);
        setOffset({
          x: (VIEWPORT - bmp.width * s) / 2,
          y: (VIEWPORT - bmp.height * s) / 2,
        });
      })
      .catch(() => {
        if (!cancelado) setErro('Este formato não pode ser recortado no navegador.');
      });

    return () => { cancelado = true; };
  }, [file]);

  /** Impede que sobre borda vazia dentro do quadrado. */
  const clamp = useCallback(
    (next: { x: number; y: number }, s: number) => {
      if (!bitmap) return next;
      const dw = bitmap.width * s;
      const dh = bitmap.height * s;
      return {
        x: Math.min(0, Math.max(VIEWPORT - dw, next.x)),
        y: Math.min(0, Math.max(VIEWPORT - dh, next.y)),
      };
    },
    [bitmap],
  );

  // Redesenha a prévia a cada mudança de zoom/posição.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = VIEWPORT * dpr;
    canvas.height = VIEWPORT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);
    ctx.drawImage(bitmap, offset.x, offset.y, bitmap.width * scale, bitmap.height * scale);
  }, [bitmap, offset, scale]);

  // Reposiciona ao mudar o zoom, mantendo o centro do recorte.
  const aplicarZoom = (novo: number) => {
    if (!bitmap) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, novo));
    const antes = baseScale * zoom;
    const depois = baseScale * z;
    const cx = VIEWPORT / 2;
    const cy = VIEWPORT / 2;
    const next = {
      x: cx - ((cx - offset.x) / antes) * depois,
      y: cy - ((cy - offset.y) / antes) * depois,
    };
    setZoom(z);
    setOffset(clamp(next, depois));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }, scale));
  };
  const onPointerUp = () => { drag.current = null; };

  const confirmar = async () => {
    if (!bitmap) return;
    setSalvando(true);
    try {
      const out = document.createElement('canvas');
      out.width = PROFILE_PHOTO_OUTPUT_SIZE;
      out.height = PROFILE_PHOTO_OUTPUT_SIZE;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('canvas indisponível');

      // Região visível do quadrado, convertida para coordenadas da imagem.
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const side = VIEWPORT / scale;
      ctx.drawImage(
        bitmap, sx, sy, side, side,
        0, 0, PROFILE_PHOTO_OUTPUT_SIZE, PROFILE_PHOTO_OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/jpeg', 0.85));
      if (!blob) throw new Error('toBlob falhou');
      onConfirm({ blob, mimeType: 'image/jpeg' });
    } catch {
      setErro('Não foi possível gerar o recorte.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
          <DialogDescription>
            Arraste para posicionar e use o zoom. O que estiver dentro do círculo será salvo.
          </DialogDescription>
        </DialogHeader>

        {erro ? (
          <p className="py-6 text-center text-sm text-destructive">{erro}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative overflow-hidden rounded-lg bg-muted"
              style={{ width: VIEWPORT, height: VIEWPORT }}
            >
              <canvas
                ref={canvasRef}
                style={{ width: VIEWPORT, height: VIEWPORT }}
                className="cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={(e) => aplicarZoom(zoom - e.deltaY * 0.002)}
              />
              {/* Máscara circular: mostra exatamente o que vira o avatar. */}
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)_inset] [clip-path:circle(50%_at_50%_50%)]" />
              <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" />
              {!bitmap && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex w-full items-center gap-3 px-2">
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0"
                onClick={() => aplicarZoom(zoom - 0.25)} disabled={!bitmap || zoom <= 1}>
                <Minus className="size-4" />
              </Button>
              <input
                type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom}
                onChange={(e) => aplicarZoom(Number(e.target.value))}
                disabled={!bitmap}
                aria-label="Zoom"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0"
                onClick={() => aplicarZoom(zoom + 0.25)} disabled={!bitmap || zoom >= MAX_ZOOM}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!bitmap || salvando || !!erro}>
            {salvando && <Loader2 className="mr-1 size-4 animate-spin" />}
            Salvar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
