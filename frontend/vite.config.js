import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['dis-compute-jeremy-ceremony.trycloudflare.com'],
    proxy: {
      // Proxy para GeoServer
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // Proxy para la API del backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});