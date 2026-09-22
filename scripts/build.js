import { build } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'fs';

const __dirname = resolve();
const target = process.argv[2] === 'firefox' ? 'firefox' : 'chrome';
const outDir = resolve(__dirname, target === 'firefox' ? 'dist-firefox' : 'dist-chrome');

console.log(`\n📦 Building Liya AI for [${target.toUpperCase()}] into ${outDir}...\n`);

// Clear outDir
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

const sharedAliases = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@features': resolve(__dirname, 'src/features'),
  '@entries': resolve(__dirname, 'src/entries'),
  '@test': resolve(__dirname, 'src/test'),
};

async function runBuild() {
  // 1. Build Popup (HTML entry)
  console.log('🔹 [1/4] Building Popup...');
  await build({
    configFile: false,
    resolve: { alias: sharedAliases },
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/entries/popup/popup.html'),
        },
        output: {
          entryFileNames: 'popup.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
        },
      },
    },
  });

  // 2. Build Background Service Worker (Single bundle, no code splitting)
  console.log('🔹 [2/4] Building Background Service Worker...');
  await build({
    configFile: false,
    resolve: { alias: sharedAliases },
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(__dirname, 'src/entries/background/index.ts'),
        output: {
          format: 'iife',
          name: 'LiyaBackground',
          entryFileNames: 'background.js',
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 3. Build Content Script (Strict IIFE with ZERO imports)
  console.log('🔹 [3/4] Building Content Script (IIFE - zero external imports)...');
  await build({
    configFile: false,
    resolve: { alias: sharedAliases },
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(__dirname, 'src/entries/content/index.ts'),
        output: {
          format: 'iife',
          name: 'LiyaContentScript',
          entryFileNames: 'content.js',
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 4. Build MAIN-world Interceptors (Strict IIFE with ZERO imports)
  console.log('🔹 [4/4] Building MAIN-world Interceptors (IIFE)...');
  const interceptors = [
    { name: 'chatgpt', file: 'src/features/capture/infrastructure/interceptors/chatgpt.interceptor.ts' },
    { name: 'claude', file: 'src/features/capture/infrastructure/interceptors/claude.interceptor.ts' },
    { name: 'gemini', file: 'src/features/capture/infrastructure/interceptors/gemini.interceptor.ts' },
  ];

  mkdirSync(resolve(outDir, 'interceptors'), { recursive: true });

  for (const inter of interceptors) {
    await build({
      configFile: false,
      resolve: { alias: sharedAliases },
      build: {
        outDir: resolve(outDir, 'interceptors'),
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(__dirname, inter.file),
          output: {
            format: 'iife',
            name: `SynapseInterceptor_${inter.name}`,
            entryFileNames: `${inter.name}.js`,
            inlineDynamicImports: true,
          },
        },
      },
    });
  }

  // 5. Copy Manifest & Icons
  console.log('🔹 Copying manifest and assets...');
  const manifestSrc = target === 'firefox' ? 'manifest.firefox.json' : 'manifest.chrome.json';
  const manifestContent = readFileSync(resolve(__dirname, manifestSrc), 'utf-8');
  writeFileSync(resolve(outDir, 'manifest.json'), manifestContent);

  const iconsSrc = resolve(__dirname, 'public/icons');
  const iconsDest = resolve(outDir, 'icons');
  if (existsSync(iconsSrc)) {
    mkdirSync(iconsDest, { recursive: true });
    for (const f of readdirSync(iconsSrc)) {
      copyFileSync(resolve(iconsSrc, f), resolve(iconsDest, f));
    }
  }

  console.log(`\n✅ Build complete for [${target.toUpperCase()}]. Output directory: ${outDir}\n`);
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
