import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9172,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:31357',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:31357',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
