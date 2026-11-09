import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { rollupOptions: { input: { shop: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html') } } }
});
