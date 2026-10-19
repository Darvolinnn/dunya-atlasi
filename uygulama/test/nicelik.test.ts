import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { birimCevir, sayiCoz, sayiMetni } from '../src/alan/nicelik';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  return { h, evren };
}

describe('birimli sayı alanı (§18.1)', () => {
  it('birimleri çevirir; takvime bağlı ve serbest birimleri çevirmez', () => {
    expect(birimCevir(1.8, 'm', 'cm')).toBeCloseTo(180);
    expect(birimCevir(2, 'hafta', 'gün')).toBe(14);
    expect(birimCevir(1, 'yıl', 'gün')).toBeNull();
    expect(birimCevir(1, 'kg', 'm')).toBeNull();
    expect(birimCevir(3, 'altın', 'altın')).toBe(3);
    expect(birimCevir(3, 'altın', 'gümüş')).toBeNull();
  });
  it('sayı ve aralık okur, hassasiyeti ve birimi denetler', () => {
    expect(sayiCoz('180', 'cm')).toEqual({ enAz: 180, enCok: 180, birim: 'cm' });
    expect(sayiCoz('1,75 metre', 'cm')).toEqual({ enAz: 175, enCok: 175, birim: 'cm' });
    expect(() => sayiCoz('1,755 m', 'cm')).toThrow('tam sayı');
    expect(sayiMetni(sayiCoz('170–180', 'cm')!)).toBe('170–180 cm');
    expect(() => sayiCoz('1,75', 'm', 1)).toThrow('ondalık');
    expect(() => sayiCoz('180', 'cm', 0)).not.toThrow();
    expect(() => sayiCoz('5 kg', 'cm')).toThrow('çevrilemez');
    expect(() => sayiCoz('180-170', 'cm')).toThrow('küçük');
    expect(() => sayiCoz('uzun', 'cm')).toThrow('okunamadı');
  });
  it('şablona birimli sayı alanı eklenir, değer kayda yazılır; boşken varsayılan ayarı korunur', () => {
    const { h, evren } = kur();
    const s = h.sablon({ evren, tur: 'karakter' }).sablon;
    h.sablonYaz({ evren, tur: 'karakter', sablon: { ...s, alanlar: [...s.alanlar,
      { kod: 'boy', ad: 'Boy', tur: 'sayi', nicelik: 'uzunluk', birim: 'cm', hassasiyet: 0 },
      { kod: 'dil2', ad: 'Konuştuğu dil', tur: 'metin', varsayilan: 'kultur' }] } });
    const yeni = h.sablon({ evren, tur: 'karakter' }).sablon.alanlar;
    expect(yeni.find((a) => a.kod === 'boy')).toMatchObject({ tur: 'sayi', nicelik: 'uzunluk', birim: 'cm', hassasiyet: 0 });
    expect(yeni.find((a) => a.kod === 'dil2')?.varsayilan).toBe('kultur');
    const kod = h.kayitOlustur({ evren, ad: 'Uydurma kişi', tur: 'karakter' }).kod;
    h.kayitAlanYaz({ evren, kod, alan: 'boy', deger: '170-175' });
    expect(h.kayitSablonu({ evren, kod }).degerler.boy).toEqual({ enAz: 170, enCok: 175, birim: 'cm' });
    expect(() => h.kayitAlanYaz({ evren, kod, alan: 'boy', deger: '12 gün' })).toThrow('çevrilemez');
    expect(() => h.sablonYaz({ evren, tur: 'karakter', sablon: { ...s, alanlar: [...s.alanlar, { kod: 'k', ad: 'Kütle', tur: 'sayi', nicelik: 'kutle', birim: 'cm', hassasiyet: 0 }] } })).toThrow();
  });
});
