// Toplu yazma (§10.1): çok sayıda yazı tek veritabanı işleminde diske gider; günlükteki işlemler ve sıraları aynıdır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function hizmet() {
  const dosyalar = new Map<string, Database>();
  const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
  return { h, islemSayisi: (evren: string) => h.evrenBilgisi({ evren }).islemSayisi };
}

describe('toplu yazma', () => {
  it('içindeki yazıların hepsi kaydedilir; her biri ayrı işlemdir ve sırası korunur', async () => {
    const { h } = hizmet();
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma Kıyı' });
    await h.topluYaz(evren, () => {
      for (const ad of ['Fener', 'Liman', 'Kayalık']) h.kayitOlustur({ evren, ad, tur: 'mekan' });
    });
    h.kayitOlustur({ evren, ad: 'Sonradan', tur: 'mekan' });
    expect(h.kayitlar({ evren }).map((k) => k.ad).sort()).toEqual(['Fener', 'Kayalık', 'Liman', 'Sonradan']);

  });

  it('içindeki iş hata verirse hepsi geri alınır; sonraki yazılar olağan sürer', async () => {
    const { h, islemSayisi } = hizmet();
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma Kıyı' });
    const once = islemSayisi(evren);
    await expect(h.topluYaz(evren, () => {
      h.kayitOlustur({ evren, ad: 'Fener', tur: 'mekan' });
      h.kayitOlustur({ evren, ad: 'Liman', tur: 'mekan' });
      throw new Error('uydurma hata');
    })).rejects.toThrow('uydurma hata');
    expect(h.kayitlar({ evren })).toEqual([]);
    expect(islemSayisi(evren)).toBe(once);
    h.kayitOlustur({ evren, ad: 'Kayalık', tur: 'mekan' });
    expect(h.kayitlar({ evren }).map((k) => k.ad)).toEqual(['Kayalık']);
    expect(islemSayisi(evren)).toBeGreaterThan(once);
  });

  it('içte tek bir yazı hata verirse yalnız o geri alınır', async () => {
    const { h } = hizmet();
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma Kıyı' });
    await h.topluYaz(evren, () => {
      h.kayitOlustur({ evren, ad: 'Fener', tur: 'mekan' });
      expect(() => h.kayitOlustur({ evren, ad: '', tur: 'mekan' })).toThrow();
      h.kayitOlustur({ evren, ad: 'Liman', tur: 'mekan' });
    });
    expect(h.kayitlar({ evren }).map((k) => k.ad).sort()).toEqual(['Fener', 'Liman']);
  });
});
