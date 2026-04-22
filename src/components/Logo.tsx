'use client';

import React, { useState } from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  src?: string | null;
  alt?: string;
  className?: string;
}

const DEFAULT_LOGO = '/logo.svg';

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
