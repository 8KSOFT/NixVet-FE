'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RevealOnScrollProps } from '@/app/types/RevealOnScrollProps';

export function RevealOnScroll({
  children,
  className,
  delayClassName,
  once = true,
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.15,
}: RevealOnScrollProps) {
  const containerElementRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const containerElement = containerElementRef.current;
    if (!containerElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
          return;
        }

        if (!once) setIsVisible(false);
      },
      { root: null, rootMargin, threshold },
    );

    observer.observe(containerElement);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  const baseClassName = useMemo(() => {
    const visibilityClassName = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';
    return [
      'transform-gpu',
      'transition-all',
      'duration-700',
      'ease-out',
      'motion-reduce:transition-none',
      'motion-reduce:opacity-100',
      'motion-reduce:translate-y-0',
      delayClassName,
      visibilityClassName,
      className,
    ]
      .filter(Boolean)
      .join(' ');
  }, [className, delayClassName, isVisible]);

  return (
    <div ref={containerElementRef} className={baseClassName}>
      {children}
    </div>
  );
}
