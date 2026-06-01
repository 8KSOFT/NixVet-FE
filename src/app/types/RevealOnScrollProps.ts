import type { ReactNode } from 'react';

export type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delayClassName?: string;
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
};
