// Bağlantı görünümü (K37): seçim evrene yazılır, geçersiz seçim reddedilir, varsayılan saklanmaz. Adlar uydurmadır.
import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { VARSAYILAN_BAG } from '../src/alan/bag-gorunumu';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  return { h, evren: h.evrenOlustur({ ad: 'Uydurma evren' }).kod };
}

describe('bağlantı görünümü (K37)', () => {
  it('seçim evrene yazılır ve geri okunur; varsayılana dönünce kalkar', () => {
    const { h, evren } = kur();
    expect(h.evrenBilgisi({ evren }).bagGorunumu).toBeNull();
    const g = { renk: 'mavi', zemin: true, kalin: true, alti: false };
    h.bagGorunumuYaz({ evren, gorunum: g });
    expect(h.evrenBilgisi({ evren }).bagGorunumu).toEqual(g);
    h.bagGorunumuYaz({ evren, gorunum: { ...VARSAYILAN_BAG } });
    expect(h.evrenBilgisi({ evren }).bagGorunumu).toBeNull();
    h.bagGorunumuYaz({ evren, gorunum: { ...g, renk: 'tur' } });
    h.bagGorunumuYaz({ evren, gorunum: null });
    expect(h.evrenBilgisi({ evren }).bagGorunumu).toBeNull();
  });

  it('geçersiz seçim reddedilir; günlükte okunur bir açıklaması vardır', () => {
    const { h, evren } = kur();
    expect(() => h.bagGorunumuYaz({ evren, gorunum: { renk: 'turuncu', zemin: false, kalin: false, alti: true } })).toThrow('Geçersiz');
    expect(() => h.bagGorunumuYaz({ evren, gorunum: { renk: 'mor', zemin: 1 } as never })).toThrow('Geçersiz');
    h.bagGorunumuYaz({ evren, gorunum: { renk: 'mor', zemin: false, kalin: true, alti: true } });
    const i = h.islemGunlugu({ evren, sinir: 5 }).find((x) => x.tur === 'bag_gorunumu')!;
    expect(islemAciklamasi(i.tur, i.veri as Record<string, unknown>)).toBe('Bağlantı görünümü değişti');
  });
});
