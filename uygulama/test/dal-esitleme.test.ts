import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

/** Bir cihaz: dosyaları verilirse aynı dosyalarla yeniden açılır (programın yeniden başlaması). */
function cihaz(ad: string, drive: BellekTasiyici, dosyalar = new Map<string, Database>()) {
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, ad, 'x', () => {}, null, null, undefined, undefined, (d) => { dosyalar.delete(d); });
  h.tasiyiciAyarla(drive);
  return { h, dosyalar };
}

describe('deneme kopyalarının eşitlenmesi (§9.7, §10)', () => {
  it('dalda iki cihazda yapılanlar Drive üzerinden birleşir; ana evren etkilenmez', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive), t = cihaz('Tablet', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const kral = m.h.kayitOlustur({ evren, ad: 'Kral Aldren', tur: 'karakter' }).kod;
    await m.h.esitle();
    await t.h.evreniIndir({ kod: evren });

    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    m.h.kayitDegistir({ evren: dal, kod: kral, alan: 'ozet', deger: 'Yaşlı ama hayatta' });
    await m.h.esitle();
    await t.h.esitle();

    // Deneme kopyası Drive'da ayrı bir evren gibi görünmez.
    expect(await t.h.uzakEvrenler()).toEqual([]);
    expect(t.h.dallar({ evren }).map((d) => d.ad)).toEqual(['Kral yaşasaydı']);
    expect(t.h.kayit({ evren: dal, kod: kral }).ozet).toBe('Yaşlı ama hayatta');
    expect(t.h.kayit({ evren, kod: kral }).ozet).toBe('');

    // Tablette dalda yazılan da masaüstüne gelir; iki cihazın dal işlemleri çakışmaz.
    const varis = t.h.kayitOlustur({ evren: dal, ad: 'Varis Elin', tur: 'karakter' }).kod;
    m.h.kayitOlustur({ evren: dal, ad: 'Danışman Orin', tur: 'karakter' });
    await t.h.esitle();
    await m.h.esitle();
    await t.h.esitle();
    for (const c of [m, t]) {
      const f = c.h.dalFarki({ evren, dal });
      expect(f.dalda.kayitlar.map((k) => k.ad).sort()).toEqual(['Danışman Orin', 'Kral Aldren', 'Varis Elin']);
      expect(c.h.kayitlar({ evren }).map((k) => k.ad)).toEqual(['Kral Aldren']);
    }

    // Tablette dalda yapılan değişiklik masaüstünde ana evrene seçerek aktarılabilir.
    m.h.dalAktar({ evren, dal, birimler: [`kayit:${varis}`], eslemeler: {} });
    expect(m.h.kayitlar({ evren }).map((k) => k.ad).sort()).toEqual(['Kral Aldren', 'Varis Elin']);
  });

  it('eşitleme durumu deneme kopyasında yalnızca bu cihazda olan değişiklikleri sayar', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    await m.h.esitle();
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Deneme' });
    const durum = () => m.h.esitlemeDurumu().evrenler.find((x) => x.kod === evren)!;
    expect(durum().denemeler).toEqual([{ kod: dal, ad: 'Deneme', yalnizBuCihazda: 0, bekleyen: 0 }]);
    const once = durum().yalnizBuCihazda; // kopyanın açılması ana evrende bir değişikliktir
    m.h.kayitOlustur({ evren: dal, ad: 'Varis Elin', tur: 'karakter' });
    expect(durum().yalnizBuCihazda).toBe(once); // ana evren etkilenmez
    m.h.kayitOlustur({ evren, ad: 'Danışman Orin', tur: 'karakter' });
    // Aynı iş, ana evrende ve kopyada aynı sayıda değişiklik olarak görünür.
    expect(durum().denemeler[0].yalnizBuCihazda).toBe(durum().yalnizBuCihazda - once);
    expect(durum().denemeler[0].yalnizBuCihazda).toBeGreaterThan(0);
    await m.h.esitle();
    expect(durum().yalnizBuCihazda).toBe(0);
    expect(durum().denemeler[0].yalnizBuCihazda).toBe(0);
    m.h.dalSil({ evren, kod: dal });
    expect(durum().denemeler).toEqual([]);
  });

  it('hiç açılmamış ve Drive\'da dosyası olmayan dal kurulmaz; silinen dal eşitlenmez', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Deneme' });
    await m.h.esitle();
    const t = cihaz('Tablet', drive);
    await t.h.evreniIndir({ kod: evren });
    expect([...t.dosyalar.keys()].some((d) => d.includes(dal))).toBe(true); // masaüstü dalı açtığı için Drive'da var

    const { kod: dal2 } = t.h.dalOlustur({ evren, ad: 'İkinci' });
    t.h.dalSil({ evren, kod: dal2 });
    await t.h.esitle();
    await m.h.esitle();
    expect([...m.dosyalar.keys()].some((d) => d.includes(dal2))).toBe(false);
    expect([...drive.dosyalar.values()].some((d) => d.ozellikler.evren === dal2)).toBe(false);
  });

  it('eski dallarda (yazarı dalın kendisi olan işlemler) eşitleme görüntü ile tamamlanır', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const kale = m.h.kayitOlustur({ evren, ad: 'Kara Kale', tur: 'mekan' }).kod;
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Eski dal' });
    // Önceki sürümün yazdığı gibi: dal işlemi dalın koduyla.
    new EvrenVt(m.dosyalar.get(`/evren-${dal}.db`)!, dal).islemYap([{ tur: 'kayit_degistir', veri: { kod: kale, alan: 'ozet', deger: 'Yıkılmış', onceki: '' } }]);
    const m2 = cihaz('Masaüstü', drive, m.dosyalar); // program yeniden açıldı
    m2.h.kayitOlustur({ evren: dal, ad: 'Kuşatan Ordu', tur: 'grup' });
    await m2.h.esitle();

    const t = cihaz('Tablet', drive);
    await t.h.evreniIndir({ kod: evren });
    expect(t.h.kayit({ evren: dal, kod: kale }).ozet).toBe('Yıkılmış');
    expect(t.h.dalFarki({ evren, dal }).dalda.kayitlar.map((k) => k.ad).sort()).toEqual(['Kara Kale', 'Kuşatan Ordu']);
  });
  it('evren kaldırılıp yeniden indirilince deneme kopyasında bu cihazın yaptıkları geri gelir; sıra yeniden kullanılmaz', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive), t = cihaz('Tablet', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    m.h.kayitOlustur({ evren, ad: 'Kral Aldren', tur: 'karakter' });
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    m.h.kayitOlustur({ evren: dal, ad: 'Varis Elin', tur: 'karakter' });
    await m.h.esitle(); // ilk eşitlemede kopyanın anlık görüntüsü de gider
    m.h.kayitOlustur({ evren: dal, ad: 'Kâhya Nesa', tur: 'karakter' });
    await m.h.esitle(); // bu yalnızca bir parça olarak gider; görüntüde yok

    m.h.evrenKaldir({ evren });
    await m.h.evreniIndir({ kod: evren });
    expect(m.h.kayitlar({ evren: dal }).map((k) => k.ad).sort()).toEqual(['Kral Aldren', 'Kâhya Nesa', 'Varis Elin']);

    // Kaldırıp indirdikten sonra dalda yazılan da öbür cihaza ulaşır.
    m.h.kayitOlustur({ evren: dal, ad: 'Danışman Orin', tur: 'karakter' });
    await m.h.esitle();
    await t.h.evreniIndir({ kod: evren });
    expect(t.h.kayitlar({ evren: dal }).map((k) => k.ad).sort()).toEqual(['Danışman Orin', 'Kral Aldren', 'Kâhya Nesa', 'Varis Elin']);
  });
});
