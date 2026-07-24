'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n/resources';

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
};

interface LanguageSwitcherProps {
  className?: string;
  /** "subtle": translúcido, para usar sobre fundos escuros/coloridos (ex.: rodapé do drawer da sidebar). */
  variant?: 'default' | 'subtle';
}

export default function LanguageSwitcher({ className, variant = 'default' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common');
  const currentLang = ((i18n.language || 'pt').split('-')[0]) as AppLanguage;
  const subtle = variant === 'subtle';

  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full p-0.5',
        subtle ? 'bg-white/5' : 'border border-border bg-muted',
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((code) => {
        const active = code === currentLang;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(`language.${code}`)}
            onClick={() => void i18n.changeLanguage(code)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150',
              subtle
                ? active
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80'
                : active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
