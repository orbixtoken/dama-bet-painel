// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Backend no Render
        target: 'https://dama-bet-backend.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
