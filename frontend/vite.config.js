import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/notifications-api': {
        target: 'http://localhost:4005',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/notifications-api/, ''),
      },
    },
  },
});
