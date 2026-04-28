import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Standalone Vite config for the embedded web client (the page served at
 * `/s/<token>` by the main-process remote server). Builds to
 * `out/web-client/` parallel to `out/renderer/`.
 *
 * Asset URLs are absolute (`/assets/...`) so they work from any URL prefix
 * the server routes through the SPA shell.
 */
export default defineConfig({
  root: 'src/web-client',
  base: '/',
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@web-client': resolve('src/web-client'),
    },
  },
  plugins: [react()],
  server: {
    port: 7799,
    strictPort: true,
  },
  build: {
    outDir: resolve('out/web-client'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2020',
  },
});
