'use client';

import React, { useEffect, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import enUS from 'antd/locale/en_US';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/es';
import theme from '@/theme/themeConfig';
import i18n, { persistLanguage } from '@/lib/i18n/instance';
import { STORAGE_KEY, SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n/resources';

function antdLocaleFor(code: string) {
  const base = (code || 'pt').split('-')[0];
  if (base === 'en') return enUS;
  if (base === 'es') return esES;
  return ptBR;
}

function dayjsLocaleFor(code: string) {
  const base = (code || 'pt').split('-')[0];
  if (base === 'en') return 'en';
  if (base === 'es') return 'es';
  return 'pt-br';
}

function AntdLocaleBridge({ children }: { children: React.ReactNode }) {
  const { i18n: i18nApi } = useTranslation();

  const antdLocale = useMemo(
    () => antdLocaleFor(i18nApi.language),
    [i18nApi.language],
  );

  useEffect(() => {
    dayjs.locale(dayjsLocaleFor(i18nApi.language));
  }, [i18nApi.language]);

  return (
    <ConfigProvider theme={theme} locale={antdLocale}>
      {children}
    </ConfigProvider>
  );
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
      }
    };
    i18n.on('languageChanged', onLang);
    return () => {
      i18n.off('languageChanged', onLang);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <AntdLocaleBridge>{children}</AntdLocaleBridge>
    </I18nextProvider>
  );
}
