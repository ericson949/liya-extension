import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist*/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@features': resolve(__dirname, 'src/features'),
      '@entries': resolve(__dirname, 'src/entries'),
      '@test': resolve(__dirname, 'src/test'),
    },
  },
});
