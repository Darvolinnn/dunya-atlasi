// Tarayıcıda kullanıcı akışı sınamaları (inceleme 9): `npm run sina:tarayici`.
// Her sınama boş bir tarayıcı profiliyle başlar (veriler yalnız o sınamada yaşar).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // Hazır kurulu bir Chromium kullanılacaksa yolu buraya verilir.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
