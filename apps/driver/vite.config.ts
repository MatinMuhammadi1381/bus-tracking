import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bus-tracking/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@bus-tracking/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@bus-tracking/api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src'),
      '@bus-tracking/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
