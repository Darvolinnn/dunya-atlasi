import { defineConfig } from 'vite';

// Yerel veritabanı (SQLite WASM, SAH havuzu) özel başlık gerektirmez (TK1).
// Google projesinde izin verilen adres http://localhost:5173 olduğu için uygulama 5173'te çalışır (TK3).
export default defineConfig({
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  build: { target: 'es2022' },
  test: { environment: 'node', setupFiles: ['test/hazirlik.ts'] },
} as never);
