import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt, VeriBicimiHatasi } from '../src/calisan/evren-vt';
import { UYGULAYICILAR } from '../src/calisan/izdusum';
import { yeniKod, kodGecerliMi } from '../src/alan/kod';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

/** Bellekte dosya sistemi: aynı ad aynı veritabanını verir (yeniden açılışı taklit eder). */
function bellek() {
  const dosyalar = new Map<string, Database>();
  return (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
}

describe('kod', () => {
  it('benzersiz, geçerli ve zamana göre sıralı', () => {
    const a = yeniKod(1000), b = yeniKod(2000);
    expect(kodGecerliMi(a)).toBe(true);
    expect(a < b).toBe(true);
    expect(new Set(Array.from({ length: 1000 }, () => yeniKod())).size).toBe(1000);
  });
});

describe('evrenler ve işlem günlüğü', () => {
  it('evren oluşturma ve yeniden adlandırma işlem olarak yazılır', () => {
    const h = new Hizmet(bellek(), 'Deneme', 'x');
    const { kod } = h.evrenOlustur({ ad: '  Kuzey   Seferi ' });
    h.evrenOlustur({ ad: 'İkinci evren' });
    expect(h.evrenler().map((e) => e.ad).sort((a, b) => a.localeCompare(b, 'tr'))).toEqual(['İkinci evren', 'Kuzey Seferi']);
    h.evrenAdlandir({ evren: kod, ad: 'Kuzey Seferi Evreni' });
    expect(h.evrenBilgisi({ evren: kod })).toMatchObject({ ad: 'Kuzey Seferi Evreni', islemSayisi: 2 });
    const g = h.islemGunlugu({ evren: kod, sinir: 10 });
    expect(g.map((i) => [i.tur, i.sira])).toEqual([['evren_adlandir', 2], ['evren_olustur', 1]]);
    const kurulum = h.baslat().kod;
    expect(g[0].gordu).toEqual({ [kurulum]: 1 });
    expect(g[1].gordu).toEqual({});
  });

  it('boş ad reddedilir', () => {
    const h = new Hizmet(bellek(), 'Deneme', 'x');
    expect(() => h.evrenOlustur({ ad: '   ' })).toThrow('Ad boş olamaz');
  });

  it('yeniden açılınca kurulum kodu ve evrenler korunur, sıra kaldığı yerden sürer', () => {
    const ac = bellek();
    const h1 = new Hizmet(ac, 'Deneme', 'x');
    const { kod } = h1.evrenOlustur({ ad: 'A' });
    const h2 = new Hizmet(ac, 'Deneme', 'x');
    expect(h2.baslat().kod).toBe(h1.baslat().kod);
    h2.evrenAdlandir({ evren: kod, ad: 'B' });
    expect(h2.islemGunlugu({ evren: kod, sinir: 1 })[0].sira).toBe(2);
  });

  it('başka cihazda olmayan evren açılmaz', () => {
    const h = new Hizmet(bellek(), 'Deneme', 'x');
    expect(() => h.evrenBilgisi({ evren: yeniKod() })).toThrow('Bu evren bu cihazda yok');
    expect(() => h.evrenBilgisi({ evren: "x'; DROP TABLE evren; --" })).toThrow('Geçersiz evren kodu');
  });
});

describe('günlük ve izdüşüm', () => {
  const yeni = () => new EvrenVt(new sqlite3.oo1.DB(':memory:'), 'kurulumA');
  const tablo = (e: EvrenVt) => JSON.stringify(e.db.selectObjects('SELECT * FROM evren ORDER BY k'));

  it('izdüşüm günlükten baştan kurulunca aynıdır', () => {
    const e = yeni();
    e.islemYap([{ tur: 'evren_olustur', veri: { kod: 'k', ad: 'A' } }]);
    e.islemYap([{ tur: 'evren_adlandir', veri: { ad: 'B' } }, { tur: 'evren_adlandir', veri: { ad: 'C' } }]);
    const once = tablo(e);
    e.yenidenKur();
    expect(tablo(e)).toBe(once);
    expect(once).toContain('"C"');
  });

  it('işlem grubu birlikte yazılır; biri başarısız olursa hiçbiri yazılmaz', () => {
    const e = yeni();
    const grup = e.islemYap([{ tur: 'evren_adlandir', veri: { ad: 'X' } }, { tur: 'evren_adlandir', veri: { ad: 'Y' } }]);
    expect(grup[0].grup).toBeTruthy();
    expect(grup[0].grup).toBe(grup[1].grup);
    UYGULAYICILAR.deneme_hata = () => { throw new Error('bozuk'); };
    try {
      expect(() => e.islemYap([{ tur: 'evren_adlandir', veri: { ad: 'Z' } }, { tur: 'deneme_hata', veri: {} }])).toThrow('bozuk');
    } finally { delete UYGULAYICILAR.deneme_hata; }
    expect(e.islemSayisi()).toBe(2);
    expect(tablo(e)).toContain('"Y"');
    expect(e.islemYap([{ tur: 'evren_adlandir', veri: { ad: 'W' } }])[0].sira).toBe(3);
  });

  it('anlaşılmayan işlem günlükte korunur, uygulanmaz', () => {
    const e = yeni();
    e.islemYap([{ tur: 'gelecekteki_tur', veri: { a: 1 } }]);
    expect(e.islemler()[0].tur).toBe('gelecekteki_tur');
  });

  it('daha yeni veri biçimli evren açılmaz', () => {
    const db = new sqlite3.oo1.DB(':memory:');
    new EvrenVt(db, 'k');
    db.exec("UPDATE meta SET v='99' WHERE k='veri_bicimi'");
    expect(() => new EvrenVt(db, 'k')).toThrow(VeriBicimiHatasi);
  });
});
