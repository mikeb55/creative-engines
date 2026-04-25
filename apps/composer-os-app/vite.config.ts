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
    // Listen on all interfaces (IPv4 + ::1) so both http://127.0.0.1:5173/ and http://localhost:5173/ work
    // without half the app loading while /api requests fail in the Vite proxy.
    host: true,
    // Rely on scripts/openViteWhenReady.mjs (npm "ui" process) to open the browser. Vite's built-in
    // `server.open` is unreliable from IDE-integrated shells on Windows (e.g. Cursor/VS Code tasks).
    // Set VITE_OPEN_BROWSER=0 to skip the explicit opener; open http://127.0.0.1:5173/ yourself.
    open: false,
    // Target API by IPv4 literal: `localhost` can map to ::1 on Windows; Express dev may listen on 127.0.0.1.
    proxy: {
      '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true, secure: false },
    },
  },
});
