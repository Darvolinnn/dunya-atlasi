// Windows uygulamasında Google izni kabuktan (bilgisayarın tarayıcısı) istenir; kabuk istemcisizse eski yol.
import { describe, it, expect, afterEach } from 'vitest';
import { izinAl, izniGeriAl } from '../src/arayuz/google';

const g = globalThis as unknown as { window?: unknown };
afterEach(() => { delete g.window; });
const kabukla = (yanit: (komut: string, arg?: Record<string, unknown>) => unknown) => {
  const cagrilar: [string, Record<string, unknown> | undefined][] = [];
  g.window = { __TAURI_INTERNALS__: { invoke: async (k: string, a?: Record<string, unknown>) => { cagrilar.push([k, a]); return yanit(k, a); } } };
  return cagrilar;
};

describe('Windows uygulamasında Google izni', () => {
  it('kabuğun verdiği izni kullanır', async () => {
    const c = kabukla(() => ({ jeton: 'j1', sureSn: 3600, kapsam: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file' }));
    const i = await izinAl();
    expect(i.jeton).toBe('j1');
    expect(i.bitis).toBeGreaterThan(Date.now() + 3500_000);
    expect(c[0][0]).toBe('google_izin');
  });
  it('programın Drive klasörü izni verilmediyse anlaşılır hata', async () => {
    kabukla(() => ({ jeton: 'j1', sureSn: 3600, kapsam: 'https://www.googleapis.com/auth/drive.file' }));
    await expect(izinAl()).rejects.toThrow(/Drive izni verilmedi/);
  });
  it('kabuğun Türkçe hatası olduğu gibi gösterilir', async () => {
    kabukla(() => { throw 'Google izni verilmedi.'; });
    await expect(izinAl()).rejects.toThrow('Google izni verilmedi.');
  });
  it('kabuk isteğe izin vermiyorsa eski pencereye düşer, ham hata gösterilmez', async () => {
    kabukla(() => { throw 'Command google_izin not allowed by ACL'; });
    // Eski yol Google kütüphanesini yüklemeye çalışır; sınamada belge yok, bu yüzden başka bir hata gelir.
    await expect(izinAl()).rejects.not.toThrow(/ACL/);
  });
  it('bağlantı kesilince kabuktaki yenileme anahtarı da geri alınır', async () => {
    const c = kabukla(() => null);
    await izniGeriAl(null);
    expect(c.map((x) => x[0])).toEqual(['google_cikis']);
  });
});
