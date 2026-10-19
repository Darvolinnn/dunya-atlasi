import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}

describe('sıradan bir gün ve karşılaştırmalı okuma (§7)', () => {
  it('kartlar yer, dönem ve statüye göre toplanır; kapsayan yerler de gelir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const ulke = kayit('Kuzey krallığı', 'siyasi'), sehir = kayit('Ardıç', 'sehir');
    h.iliskiEkle({ evren, tur: 'parca', a: sehir, b: ulke });
    const savas = kayit('Savaş yılları', 'donem'), iscı = kayit('Liman işçileri', 'topluluk'), soylu = kayit('Soylular', 'topluluk');
    h.gundelikYaz({ evren, yer: sehir, kartlar: [
      { konu: 'yemek', donem: null, statu: iscı, metin: 'Arpa çorbası, kuru balık' },
      { konu: 'yemek', donem: null, statu: soylu, metin: 'Baharatlı av eti' },
      { konu: 'barinma', donem: savas, statu: null, metin: 'Kalabalık bodrumlar' },
    ] });
    h.gundelikYaz({ evren, yer: ulke, kartlar: [{ konu: 'ibadet', donem: null, statu: null, metin: 'Ay tapınakları' }] });
    expect(() => h.gundelikYaz({ evren, yer: sehir, kartlar: [{ konu: 'uyku', donem: null, statu: null, metin: 'x' }] })).toThrow(/konu/);
    const g = h.siradanGun({ evren, yer: sehir, statu: iscı });
    const k = (konu: string) => g.konular.find((x) => x.konu === konu)!.kartlar;
    expect(k('yemek').map((x) => x.metin)).toEqual(['Arpa çorbası, kuru balık']);
    expect(k('barinma')).toEqual([]);
    expect(k('ibadet')).toMatchObject([{ metin: 'Ay tapınakları', yer: { ad: 'Kuzey krallığı' }, genel: true }]);
    expect(h.siradanGun({ evren, yer: sehir, donem: savas }).konular.find((x) => x.konu === 'barinma')!.kartlar.length).toBe(1);
    expect(h.gundelikKartlari({ evren, yer: sehir }).length).toBe(3);
  });

  it('kayıtları ve bir kaydın farklı tarihlerini yan yana koyar', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const a = h.kayitOlustur({ evren, ad: 'Ardıç', tur: 'sehir' }).kod;
    const b = h.kayitOlustur({ evren, ad: 'Boran', tur: 'sehir' }).kod;
    h.kayitAlanYaz({ evren, kod: a, alan: 'iklim', deger: 'Ilıman' });
    h.kayitAlanYaz({ evren, kod: b, alan: 'iklim', deger: 'Kurak' });
    h.durumEkle({ evren, kod: a, durum: { ozellik: 'Yönetim', deger: 'Konsey', kip: 'aralik', bitis: { ifade: '1200' } } });
    h.durumEkle({ evren, kod: a, durum: { ozellik: 'Yönetim', deger: 'Vali', baslangic: { ifade: '1201' } } });
    const o = h.karsilastirmaliOkuma({ evren, sutunlar: [{ kayit: a, tarih: null }, { kayit: b, tarih: null }] });
    expect(o.satirlar.find((s) => s.baslik === 'İklim')!.degerler).toEqual(['Ilıman', 'Kurak']);
    expect(o.satirlar.find((s) => s.baslik === 'Yönetim')!.degerler).toEqual(['Vali', null]);
    const t = h.karsilastirmaliOkuma({ evren, sutunlar: [{ kayit: a, tarih: '1150' }, { kayit: a, tarih: '1250' }] });
    expect(t.satirlar.find((s) => s.baslik === 'Yönetim')!.degerler).toEqual(['Konsey', 'Vali']);
    expect(() => h.karsilastirmaliOkuma({ evren, sutunlar: [] })).toThrow(/sütun/);
  });
});
