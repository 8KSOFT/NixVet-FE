import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Flat config nativo, sem `FlatCompat` (E14 — migração para Next 16).
 *
 * O adaptador `@eslint/eslintrc` era necessário quando `eslint-config-next`
 * só existia no formato antigo (`extends: 'next/core-web-vitals'`). No 16 ele
 * exporta flat config de verdade, e passar por `FlatCompat` quebra com
 * "Converting circular structure to JSON": o adaptador tenta serializar um
 * objeto que já é flat e contém referência a si mesmo.
 *
 * Sintoma útil de reconhecer: o erro não fala de config nenhuma, fala de JSON
 * circular no `config-validator`.
 */
/**
 * No flat config, regra e plugin precisam viver no **mesmo objeto** — declarar
 * `'react-hooks/x': 'warn'` num objeto que não traz `plugins` dá
 * "The react-hooks plugin is not defined within the same configuration object".
 * Então pegamos a instância que o próprio `eslint-config-next` já carregou, em
 * vez de instalar e importar o plugin de novo (duas instâncias do mesmo plugin
 * brigam pelo namespace).
 */
const pluginReactHooks = nextCoreWebVitals.find((bloco) => bloco.plugins?.['react-hooks'])
  ?.plugins['react-hooks'];

if (!pluginReactHooks) {
  throw new Error(
    'eslint-config-next deixou de expor o plugin react-hooks: reveja os overrides abaixo.',
  );
}

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { 'react-hooks': pluginReactHooks },
    rules: {
      /**
       * Regras do React Compiler, que chegaram com o ESLint 9 +
       * eslint-config-next 16 (E14). São **avisos, não erros — por ora**.
       *
       * Não são quebra de migração: o projeto compila, tipa e builda. São
       * regras novas apontando padrão preexistente, e a contagem no dia da
       * migração (23/09/2026) era de 73 avisos no total, sendo:
       *
       *   44  react-hooks/set-state-in-effect
       *    6  react-hooks/refs
       *    4  react-hooks/purity
       *    4  react-hooks/preserve-manual-memoization
       *    4  react-hooks/incompatible-library
       *    3  react-hooks/static-components
       *
       * Por que aviso e não `off`: `set-state-in-effect` é exatamente a
       * família do bug que custou uma sessão inteira de investigação em
       * 25/08/2026 — um `NaN` escapando de um `useQuery` fazia o React Query
       * notificar a cada render, em laço de ~280 commits/s. Silenciar a regra
       * seria apagar o alarme que teria pegado aquilo em minutos.
       *
       * Por que não erro: 65 ocorrências param o CI hoje, e corrigi-las é
       * reestruturar fluxo de dado em dezenas de componentes — trabalho
       * próprio, não item de migração. Portão que nasce vermelho é ignorado
       * no primeiro dia.
       *
       * **A contagem só pode diminuir.** Ao mexer num componente da lista,
       * corrija o que ele acusa.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/incompatible-library': 'warn',

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
