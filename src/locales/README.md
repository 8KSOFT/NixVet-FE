# Traduções (i18n)

- **Bibliotecas:** `i18next` + `react-i18next`
- **Idiomas:** `pt` (padrão), `en`, `es`
- **Arquivos:** `src/locales/<idioma>/common.json`
- **Persistência:** `localStorage` chave `nixvet-lang`

## Adicionar chaves

1. Edite **os três** JSON (`pt`, `en`, `es`) com a mesma estrutura de chaves.
2. No componente cliente (`'use client'`):

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('common');
return <span>{t('nav.patients')}</span>;
```

3. Interpolação: `t('auth.welcome', { name: user.name })`

## Novo namespace (opcional)

1. Crie `pt/relatorio.json`, etc.
2. Em `src/lib/i18n/resources.ts`, importe e adicione em `resources`.
3. Em `instance.ts`, inclua o namespace em `ns: ['common', 'relatorio']`.
4. Use `useTranslation('relatorio')`.

## Novo idioma

1. Pasta `src/locales/<codigo>/common.json` (copie de `pt`).
2. Em `resources.ts`: import + entrada em `resources`.
3. Em `SUPPORTED_LANGUAGES` e em `LanguageSwitcher` labels em todos os `common.json` (`language.xx`).

## Ant Design + datas

`AppProviders` sincroniza `ConfigProvider` (`pt_BR` / `en_US` / `es_ES`) e `dayjs.locale` ao mudar o idioma.
