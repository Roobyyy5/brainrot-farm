import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    // Raise the inline threshold so tiny helpers don't become extra round-trips
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Split vendor libs from app code so repeat visits can reuse the
        // React/react-dom chunk from the browser cache even when app changes.
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
