'use client';

import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/es';
import i18n, { persistLanguage } from '@/lib/i18n/instance';
import { STORAGE_KEY, SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n/resources';

function dayjsLocaleFor(code: string) {
  const base = (code || 'pt').split('-')[0];
  if (base === 'en') return 'en';
  if (base === 'es') return 'es';
  return 'pt-br';
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && SUPPORTED_LANGUAGES.includes(raw as AppLanguage)) {
        void i18n.changeLanguage(raw as AppLanguage);
      }
    } catch {
      /* ignore */
    }

    const onLang = (lng: string) => {
      if (SUPPORTED_LANGUAGES.includes(lng as AppLanguage)) {
        persistLanguage(lng as AppLanguage);
        dayjs.locale(dayjsLocaleFor(lng));
      }
    };
    i18n.on('languageChanged', onLang);
    return () => {
      i18n.off('languageChanged', onLang);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </I18nextProvider>
  );
}
