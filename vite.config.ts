import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  const outDir = isFirefox ? 'dist-firefox' : 'dist-chrome';

  return {
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@features': resolve(__dirname, 'src/features'),
        '@entries': resolve(__dirname, 'src/entries'),
        '@test': resolve(__dirname, 'src/test'),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/entries/background/index.ts'),
          content: resolve(__dirname, 'src/entries/content/index.ts'),
          popup: resolve(__dirname, 'src/entries/popup/popup.html'),
          'interceptors/chatgpt': resolve(__dirname, 'src/features/capture/infrastructure/interceptors/chatgpt.interceptor.ts'),
          'interceptors/claude': resolve(__dirname, 'src/features/capture/infrastructure/interceptors/claude.interceptor.ts'),
          'interceptors/gemini': resolve(__dirname, 'src/features/capture/infrastructure/interceptors/gemini.interceptor.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name.startsWith('interceptors/')) {
              return `${chunkInfo.name}.js`;
            }
            return '[name].js';
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    plugins: [
      {
        name: 'liya-manifest-plugin',
        closeBundle() {
          const manifestSource = isFirefox
            ? resolve(__dirname, 'manifest.firefox.json')
            : resolve(__dirname, 'manifest.chrome.json');
          const manifestDest = resolve(__dirname, outDir, 'manifest.json');

          if (existsSync(manifestSource)) {
            const content = readFileSync(manifestSource, 'utf-8');
            writeFileSync(manifestDest, content);
          }

          // Copy icons to output directory
          const iconsSrc = resolve(__dirname, 'public/icons');
          const iconsDest = resolve(__dirname, outDir, 'icons');
          if (existsSync(iconsSrc)) {
            if (!existsSync(iconsDest)) {
              mkdirSync(iconsDest, { recursive: true });
            }
            const files = readdirSync(iconsSrc);
            for (const file of files) {
              copyFileSync(resolve(iconsSrc, file), resolve(iconsDest, file));
            }
          }
        },
      },
    ],
  };
});
