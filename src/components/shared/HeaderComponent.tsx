'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import type { HeaderComponentProps } from '@/app/interfaces/HeaderComponentProps';
import { LogoColored } from './componentizedImages/LogoColored';

export const HeaderComponent = ({ width, height }: HeaderComponentProps) => {
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);

  const isPercentageSizing = useMemo(() => {
    const isWidthPercentage = width.trim().endsWith('%');
    const isHeightPercentage = height.trim().endsWith('%');
    return isWidthPercentage || isHeightPercentage;
  }, [height, width]);

  useEffect(() => {
    const minimumScrollYOffsetToCondenseHeader = 200;
    let animationFrameId: number | null = null;

    const updateHeaderStateFromScroll = () => {
      const shouldCondenseHeader = window.scrollY > minimumScrollYOffsetToCondenseHeader;

      setIsHeaderCondensed((previousIsHeaderCondensed) => {
        if (previousIsHeaderCondensed === shouldCondenseHeader) {
          return previousIsHeaderCondensed;
        }
        return shouldCondenseHeader;
      });
    };

    const onScroll = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        updateHeaderStateFromScroll();
      });
    };

    updateHeaderStateFromScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const headerClassName = useMemo(() => {
    const baseClassName =
      'fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-between rounded-full shadow-xl backdrop-blur-sm transition-[width,height,top,padding,box-shadow,transform,background-color] duration-300 ease-out';

    if (isHeaderCondensed) {
      return `${baseClassName} top-0 h-10 w-[100%] pl-2.5 pr-2 shadow-lg bg-white/70 rounded-none supports-backdrop-filter:bg-white/55`;
    }

    return `${baseClassName} top-10 h-16 w-[90%] pl-4 pr-2.5 bg-white/95 supports-backdrop-filter:bg-white/90 lg:h-20 lg:top-17 lg:w-[90%] md:w-[90%] sm:w-[90%]`;
  }, [isHeaderCondensed]);

  const logoSize = useMemo(() => {
    if (isHeaderCondensed) {
      return { width: '110px', height: '38px' };
    }
    if (isPercentageSizing) {
      return { width: '260px', height: '56px' };
    }
    return { width, height };
  }, [height, isHeaderCondensed, isPercentageSizing, width]);

  const logoWrapperClassName = useMemo(() => {
    const baseClassName =
      'flex shrink-0 ml-2 items-center origin-left transition-transform duration-300 ease-out w-[170px] lg:w-[300px] md:w-[240px] sm:w-[240px]';
    return isHeaderCondensed ? `${baseClassName} scale-130 pl-0 sm:pl-4` : `${baseClassName} scale-100`;
  }, [isHeaderCondensed]);

  const buttonClassName = useMemo(() => {
    const baseClassName =
      'rounded-full shadow-none bg-brand-deep/20 active:bg-brand-deep/20 hover:bg-brand-deep/25 border-none transition-[height,padding] duration-300 ease-out w-[100px] lg:w-[240px] md:w-[240px] sm:w-[240px]';
    return isHeaderCondensed
      ? `${baseClassName} min-h-0 h-8 px-4 bg-white/80 hover:bg-white active:bg-white/80 hover:text-brand-deep-dark`
      : `${baseClassName} h-13 lg:h-17`;
  }, [isHeaderCondensed]);

  const buttonTextClassName = useMemo(() => {
    const baseClassName = 'text-brand-deep font-bold text-[16px] lg:text-[18px] md:text-[18px] sm:text-[18px]';
    return isHeaderCondensed ? `${baseClassName} text-[12px]` : `${baseClassName} text-xl`;
  }, [isHeaderCondensed]);

  return (
    <header className={headerClassName}>
      <div className={`${logoWrapperClassName}`}>
        <LogoColored width={logoSize.width} height={logoSize.height} />
      </div>
      <div className="">
        <Button asChild size="lg" className={buttonClassName}>
          <Link href="/login">
            <span className={buttonTextClassName}>
              Acessar <span className="hidden lg:inline-block md:inline-block sm:inline-block">Sistema</span>
            </span>
          </Link>
        </Button>
      </div>
    </header>
  );
};
