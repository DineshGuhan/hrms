import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      coverage: {
        provider: 'v8',
        include: ['src/components/ui/**', 'src/components/layout/**', 'src/components/ErrorBoundary.tsx', 'src/routes/**', 'src/services/**'],
        thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  }),
);
