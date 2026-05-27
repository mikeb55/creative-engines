import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@composer-os': path.resolve(__dirname, '../../engines/composer-os-v2'),
      '@engine': path.resolve(__dirname, '../../src/engine'),
      '@renderer': path.resolve(__dirname, '../../src/renderer'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
