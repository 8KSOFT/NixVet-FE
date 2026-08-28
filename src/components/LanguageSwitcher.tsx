'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n/resources';
import { trocarIdioma } from '@/lib/i18n/instance';

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
};

interface LanguageSwitcherProps {
  className?: string;
  /**
   * "subtle": translúcido, para usar sobre fundos escuros/coloridos (ex.: rodapé do drawer da sidebar).
   * "wa": trilho cinza claro com aba ativa branca + sombra sutil (navbar do redesign do WhatsApp).
   */
  variant?: 'default' | 'subtle' | 'wa';
}

export default function LanguageSwitcher({ className, variant = 'default' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common');
  const currentLang = ((i18n.language || 'pt').split('-')[0]) as AppLanguage;
  const subtle = variant === 'subtle';
  const wa = variant === 'wa';

  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full p-0.5',
        subtle ? 'bg-white/5' : wa ? 'rounded-wa bg-wa-line-2 p-[3px]' : 'border border-border bg-muted',
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
            onClick={() => void trocarIdioma(code)}
            className={cn(
              'text-xs font-medium transition-colors duration-150',
              wa ? 'rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-semibold' : 'rounded-full px-2.5 py-1',
              subtle
                ? active
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80'
                : wa
                  ? active
                    ? 'bg-white text-wa-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]'
                    : 'text-wa-ink-3 hover:text-wa-ink-2'
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
