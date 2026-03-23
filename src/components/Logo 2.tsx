import React from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
  color?: string;
  accent?: string;
}

export default function Logo({
  className = '',
  width = 50,
  height = 50,
  alt = 'NixVet',
  color: _color,
  accent: _accent,
}: LogoProps) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
