'use client';

import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n/resources';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation('common');

  return (
    <Select
      className={className}
      size="small"
      value={(i18n.language || 'pt').split('-')[0] as AppLanguage}
      onChange={(v) => void i18n.changeLanguage(v)}
      options={SUPPORTED_LANGUAGES.map((code) => ({
        value: code,
        label: t(`language.${code}`),
      }))}
      aria-label={t('language.label')}
      style={{ minWidth: 130 }}
    />
  );
}
