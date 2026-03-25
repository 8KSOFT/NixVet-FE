'use client';

import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n/resources';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation('common');
  const currentLang = ((i18n.language || 'pt').split('-')[0]) as AppLanguage;

  return (
    <Select
      value={currentLang}
      onValueChange={(v) => void i18n.changeLanguage(v)}
    >
      <SelectTrigger className={`h-8 w-[130px] text-xs ${className ?? ''}`} aria-label={t('language.label')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((code) => (
          <SelectItem key={code} value={code} className="text-xs">
            {t(`language.${code}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
