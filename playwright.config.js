import { defineConfig } from '@playwright/test';

// End-to-end tests run the shop against Karvio's in-memory test backend (from the Karvio repo).
// KARVIO_REPO points at a checkout of CodeWithRoni/karvio (default: ../karvio).
const karvio = process.env.KARVIO_REPO || '../karvio';
export default defineConfig({
  testDir: './test', timeout: 45000, workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5188',
    trace: 'retain-on-failure',
    ...(process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {})
  },
  webServer: [
    { command: `node ${karvio}/backend/test/server.js`, url: 'http://localhost:8787', reuseExistingServer: false },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5188 --strictPort', url: 'http://127.0.0.1:5188', reuseExistingServer: false,
      env: { VITE_API_URL: 'http://localhost:8787', VITE_IMAGE_BASE: 'http://localhost:8787/__img/' } }
  ]
});
