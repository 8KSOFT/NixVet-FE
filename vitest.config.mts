import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `fileURLToPath`, não `new URL().pathname`: no Windows o pathname vira `/D:/...` e o alias quebra.
const src = fileURLToPath(new URL('./src', import.meta.url));

const config = defineConfig({
  resolve: { alias: { '@': src } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // userEvent digita tecla a tecla; em máquina carregada (CI compartilhado) 5 s é pouco.
    testTimeout: 15_000,
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/components/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/components/ui/**', 'src/locales/**'],
      // Piso que só sobe (mesmo padrão do teto de lint): ao cobrir mais, aumente o número no mesmo PR.
      // Hoje: total 12,8% (components/ e hooks/ quase sem teste), lib/ 96%.
      thresholds: {
        statements: 12,
        lines: 12,
        functions: 85,
        branches: 85,
        'src/lib/**': { statements: 94, lines: 94 },
      },
    },
  },
});

export default config;
