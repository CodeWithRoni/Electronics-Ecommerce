import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works at codewithroni.github.io/karvio-shop/ (or any other folder / domain)
export default defineConfig({ plugins: [react()], base: './' });
