// İlk Kıvılcım (§5.11, K43): yeni evrenin ilk eseri, bölümü, sahnesi ve isteğe bağlı karakter ile mekânı tek
// değişiklik grubunda oluşur. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const kur = () => {
  const d = new Map<string, Database>();
  const h = new Hizmet((x) => { let db = d.get(x); if (!db) { db = new sqlite3.oo1.DB(':memory:'); d.set(x, db); } return db; }, 'Deneme', 'x');
  return { h, evren: h.evrenOlustur({ ad: 'Kuzey Fenerleri' }).kod };
};

describe('İlk Kıvılcım (K43)', () => {
  it('eser, bölüm, sahne, karakter ve mekân tek grupta oluşur ve sahneye bağlanır', () => {
    const { h, evren } = kur();
    const { sahne } = h.ilkKivilcim({ evren, eser: 'Fener', fikir: 'Sürgün bir yüzbaşı geri döner.', karakter: { ad: 'Kaelen', not: 'sürgün yüzbaşı' }, mekan: { ad: 'Kuzey Limanı', not: '' }, sahne: '1. Sahne', bolumlu: true });
    const eser = h.eserler({ evren })[0];
    expect(eser.ad).toBe('Fener');
    expect(h.kayit({ evren, kod: eser.kod }).ozet).toBe('Sürgün bir yüzbaşı geri döner.');
    const y = h.eserYapisi({ evren, eser: eser.kod });
    expect(JSON.stringify(y)).toContain('Başlangıç');
    expect(JSON.stringify(y)).toContain(sahne);
    const b = h.sahneBaglami({ evren, sahne });
    expect(b.yer?.ad).toBe('Kuzey Limanı');
    expect(b.katilimcilar.map((k) => k.ad)).toContain('Kaelen');
    const gunluk = h.islemGunlugu({ evren, sinir: 100 }).filter((i) => i.tur !== 'evren_ad' && i.tur !== 'kurgu_turu');
    const gruplar = new Set(gunluk.slice(0, 13).map((i) => i.grup));
    expect(gruplar.size).toBe(1);
  });
  it('boş kutular kayıt oluşturmaz; bölümsüz sahne esere doğrudan yerleşir', () => {
    const { h, evren } = kur();
    const { sahne } = h.ilkKivilcim({ evren, eser: '', karakter: { ad: ' ', not: 'x' }, mekan: null, sahne: '', bolumlu: false });
    expect(h.kayitlar({ evren }).map((k) => k.tur).sort()).toEqual(['eser', 'sahne']);
    expect(h.kayit({ evren, kod: sahne }).ad).toBe('1. Sahne');
    expect(h.eserler({ evren })[0].ad).toBe('Adsız roman');
  });
});
