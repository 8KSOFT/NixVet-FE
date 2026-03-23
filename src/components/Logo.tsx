import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  src?: string | null;
  alt?: string;
  className?: string;
}

function mergeImgClass(className?: string) {
  return ['rounded-xl object-cover', className].filter(Boolean).join(' ');
}

export default function Logo({
  width = 52,
  height = 52,
  src = null,
  alt = 'Logo',
  className,
}: LogoProps) {
  const imgClass = mergeImgClass(className);
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={imgClass}
      />
    );
  }

  return (
    <img
      src="/logo.svg"
      alt={alt}
      width={width}
      height={height}
      className={imgClass}
    />
  );
}
