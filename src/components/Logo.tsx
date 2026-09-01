'use client';

import React, { useState } from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  src?: string | null;
  alt?: string;
  className?: string;
}

// `/logo.svg` NÃO existe em `public/` — apontar para lá fazia este componente
// renderizar imagem quebrada sempre que o `src` não vinha. O mesmo engano já
// tinha derrubado o favicon (ver comentário em `app/layout.tsx`). Quando o
// logo não depende de arquivo, prefira o SVG inline
// `LogoCompactoDynamic`, que não tem como dar 404.
const DEFAULT_LOGO = '/logo-192.png';

function mergeImgClass(className?: string) {
  // Sem rounded-xl por padrão: o PNG já traz os cantos arredondados
  // desenhados e aplicar border-radius duplica + recorta anti-aliasing.
  return ['object-contain block', className].filter(Boolean).join(' ');
}

export default function Logo({
  width = 52,
  height = 52,
  src = null,
  alt = 'Logo',
  className,
}: LogoProps) {
  const [failed, setFailed] = useState(false);
  const effectiveSrc = failed || !src ? DEFAULT_LOGO : src;

  return (
    <img
      key={effectiveSrc}
      src={effectiveSrc}
      alt={alt}
      width={width}
      height={height}
      className={mergeImgClass(className)}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}
