// K38: haritada zaman — kaydın kuruluş ve yıkılış tarihine göre işaret, süren yolculukta kafilenin yeri (adlar uydurmadır).
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { cizgiParcasi, cizgiUstunde, varlikDurumu, yolOrani } from '../src/alan/harita-zaman';
import { GUN_PARCA, type EvrenTarihi } from '../src/alan/tarih';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 800, boy: 500, onizleme: new Uint8Array([7]) });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x', () => {}, new BellekDeposu(), sahteIsleyici);
}
const gun = (a: number, b = a): EvrenTarihi => ({ ifade: `${a}`, bicim: 'tam', hassasiyet: 'gun', takvim: 'x', takvimSurumu: 1, eksen: { enErken: a * GUN_PARCA, enGec: (b + 1) * GUN_PARCA - 1 } } as unknown as EvrenTarihi);

describe('haritada zaman: saf hesaplar', () => {
  it('varlık durumu kuruluş ve yıkılışa göre', () => {
    expect(varlikDurumu(gun(10), null, gun(5))).toBe('henuz-yok');
    expect(varlikDurumu(gun(10), gun(20), gun(15))).toBe('var');
    expect(varlikDurumu(null, gun(20), gun(25))).toBe('yikilmis');
    expect(varlikDurumu(gun(10, 20), null, gun(15))).toBe('belirsiz');
    expect(varlikDurumu(gun(10), null, null)).toBe('var');
  });
  it('yolun alınan kısmı ve çizgi üstündeki yer', () => {
    // 0. gün çıkış, 9. gün varış: 4. gün içinde en geride (geç çıkmış, geç varacak) 3/9, en ileride 5/9.
    const o = yolOrani(gun(0), gun(9), gun(4))!;
    expect(o[0]).toBeCloseTo(3 / 9, 3); expect(o[1]).toBeCloseTo(5 / 9, 3);
    expect(yolOrani(gun(0), gun(9), gun(30))).toBeNull();
    expect(yolOrani(gun(0), null, gun(3))).toBeNull();
    const l: [number, number][] = [[0, 0], [100, 0], [100, 100]];
    expect(cizgiUstunde(l, 0.5)).toEqual([100, 0]);
    expect(cizgiUstunde(l, 0.75)).toEqual([100, 50]);
    expect(cizgiParcasi(l, 0.25, 0.75)).toEqual([[50, 0], [100, 0], [100, 50]]);
  });
});

describe('haritada zaman: harita ayrıntısı', () => {
  it('işaretler kuruluş ve yıkılışa göre işaretlenir; rotası çizili yolculukta kafile yol üstünde görünür', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const arsiv = h.kayitOlustur({ evren, ad: 'Taş Arşiv', tur: 'mekan' }).kod;
    const saray = h.kayitOlustur({ evren, ad: 'Mavi Saray', tur: 'mekan' }).kod;
    const carsi = h.kayitOlustur({ evren, ad: 'Kuzey Çarşısı', tur: 'sehir' }).kod;
    const kule = h.kayitOlustur({ evren, ad: 'Eski Kule', tur: 'mekan' }).kod;
    const rota = h.kayitOlustur({ evren, ad: 'Arşiv yolu', tur: 'rota' }).kod;
    const yol = h.kayitOlustur({ evren, ad: 'Lale\'nin kafilesi', tur: 'yolculuk' }).kod;
    const lale = h.kayitOlustur({ evren, ad: 'Lale', tur: 'karakter' }).kod;
    // Değiştirilmiş eski şablonda da kuruluş alanı bulunur.
    expect(h.kayitSablonu({ evren, kod: carsi }).sablon.alanlar.map((a) => a.kod)).toEqual(expect.arrayContaining(['kurulus', 'yikilis']));
    h.kayitAlanYaz({ evren, kod: carsi, alan: 'kurulus', deger: '411' });
    h.kayitAlanYaz({ evren, kod: kule, alan: 'yikilis', deger: '405' });
    const { kod: harita } = await h.haritaYukle({ evren, ad: 'Başkent', dosyaAdi: 'b.png', tur: 'image/png', veri: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]) });
    h.isaretKoy({ evren, harita, kayit: arsiv, konum: { kesinlik: 'kesin', x: 100, y: 100, yaricap: null } });
    h.isaretKoy({ evren, harita, kayit: saray, konum: { kesinlik: 'kesin', x: 100, y: 400, yaricap: null } });
    h.isaretKoy({ evren, harita, kayit: carsi, konum: { kesinlik: 'kesin', x: 300, y: 50, yaricap: null } });
    h.isaretKoy({ evren, harita, kayit: kule, konum: { kesinlik: 'kesin', x: 600, y: 50, yaricap: null } });
    // Yol arşivden saraya çizildi; yolculuk saraydan arşive (ters yön).
    h.cizimEkle({ evren, harita, kayit: rota, bicim: 'yol', noktalar: [[100, 100], [100, 400]] });
    h.rotaYaz({ evren, kod: rota, rota: { a: arsiv, b: saray, mesafe: null, sureler: [], duraklar: [] } });
    h.yolculukYaz({ evren, kod: yol, asamalar: [{ nereden: saray, nereye: arsiv, rota, cikis: '408', varis: '412', durum: 'gerceklesti' }] });
    h.iliskiEkle({ evren, tur: 'yolculukta', a: lale, b: yol });

    const d = h.harita({ evren, kod: harita, an: '410' });
    const durum = (k: string) => d.isaretler.find((i) => i.kayit.kod === k)!.varlik?.durum;
    expect(durum(carsi)).toBe('henuz-yok');
    expect(durum(kule)).toBe('yikilmis');
    expect(durum(arsiv)).toBeUndefined();
    expect(d.isaretler.find((i) => i.kayit.kod === carsi)!.varlik!.kurulus).toBe('411');
    expect(d.kafileler).toHaveLength(1);
    const k = d.kafileler[0];
    expect(k).toMatchObject({ yolculuk: { ad: 'Lale\'nin kafilesi' }, yolcular: ['Lale'], nereden: 'Mavi Saray', nereye: 'Taş Arşiv', rota: 'Arşiv yolu' });
    // Yıl hassasiyetinde: yolun ortası civarında geniş bir aralık; saraydan (y=400) arşive doğru.
    expect(k.nokta).toBeNull();
    expect(k.aralik!.length).toBeGreaterThanOrEqual(2);
    expect(k.aralik![0][1]).toBeGreaterThan(k.aralik![k.aralik!.length - 1][1]);
    expect(k.aralik![0][1]).toBeLessThan(400);
    // Tarih seçilmemişse durum hesaplanmaz, kafile yoktur.
    const t = h.harita({ evren, kod: harita });
    expect(t.kafileler).toEqual([]);
    expect(t.isaretler.find((i) => i.kayit.kod === carsi)!.varlik!.durum).toBe('var');
    expect(t.zamanAraligi).toMatchObject({ enKucuk: 405, enBuyuk: 411 });
    expect(h.harita({ evren, kod: harita, an: '415' }).isaretler.find((i) => i.kayit.kod === carsi)!.varlik!.durum).toBe('var');
  });
});
