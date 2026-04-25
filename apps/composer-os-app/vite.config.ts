import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { composerOsUiStampPlugin } from './vite/composerOsUiStampPlugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const composerOsEngineRoot = path.resolve(__dirname, '../../engines/composer-os-v2');

const apiPort = process.env.VITE_API_PORT ?? process.env.PORT ?? '3001';

export default defineConfig({
  base: './',
  plugins: [react(), composerOsUiStampPlugin()],
  resolve: {
    alias: {
      '@composer-os': composerOsEngineRoot,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true },
    },
  },
});
