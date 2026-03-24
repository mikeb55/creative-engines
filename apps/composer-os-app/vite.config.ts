import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { composerOsUiStampPlugin } from './vite/composerOsUiStampPlugin';

const apiPort = process.env.VITE_API_PORT ?? process.env.PORT ?? '3001';

export default defineConfig({
  plugins: [react(), composerOsUiStampPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true },
    },
  },
});
