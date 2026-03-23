import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  src?: string | null;
  alt?: string;
}

export default function Logo({
  width = 52,
  height = 52,
  src = null,
  alt = 'Logo',
}: LogoProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="rounded-xl object-cover"
      />
    );
  }

  return (
    <img
      src="/logo.svg"
      alt={alt}
      width={width}
      height={height}
      className="rounded-xl object-cover"
    />
  );
}
