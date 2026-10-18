import { defineConfig } from 'vite';

// Yerel veritabanı (SQLite WASM, SAH havuzu) özel başlık gerektirmez (TK1).
// 5173 deney sayfasında kullanıldığı için uygulama 5180'de çalışır.
export default defineConfig({
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  build: { target: 'es2022' },
  test: { environment: 'node', setupFiles: ['test/hazirlik.ts'] },
} as never);
