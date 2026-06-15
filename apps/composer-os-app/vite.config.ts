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
      '@renderer': path.resolve(__dirname, '../../src/renderer'),
      '@engine': path.resolve(__dirname, '../../src/engine'),
      '@engine/': path.resolve(__dirname, '../../src/engine/'),
    },
    // Prefer TypeScript sources over stray compiled .js siblings under engines/composer-os-v2.
    extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true },
    },
  },
});
