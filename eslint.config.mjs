import path from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);
const flatCompat = new FlatCompat({
  baseDirectory: currentDirectoryPath,
});

const eslintConfig = [
  ...flatCompat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Parâmetro que existe só para satisfazer uma assinatura (ícones que
      // recebem IconProps e não repassam) fica com `_` na frente, em vez de
      // sumir e quebrar quem tipa o componente.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Script de build em CommonJS: `require` ali é o certo, não um deslize.
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // Artefato de build commitado, não código nosso: sozinho respondia por
      // 666 dos 698 erros e afogava os problemas reais.
      'DOCS/**',
      '.design-sync/**',
    ],
  },
];

export default eslintConfig;
