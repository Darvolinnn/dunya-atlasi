import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

// Uydurma görsel: 800×500 piksel sayılır.
const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 800, boy: 500, onizleme: new Uint8Array([7]) });
function cihaz(ad = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x', () => {}, new BellekDeposu(), sahteIsleyici);
}
const gorsel = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]);

describe('harita: yükle, işaretle, bağla', () => {
  it('harita uzayı ilk görselin boyutudur; işaretler uzayda saklanır ve kayda bağlanır', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kita = h.kayitOlustur({ evren, ad: 'Soğuk Kıta', tur: 'mekan' }).kod;
    const liman = h.kayitOlustur({ evren, ad: 'Tuzlu Liman', tur: 'sehir' }).kod;
    const kule = h.kayitOlustur({ evren, ad: 'Kayıp Kule', tur: 'mekan' }).kod;
    const { kod: harita } = await h.haritaYukle({ evren, ad: 'Kıta haritası', yer: kita, dosyaAdi: 'kita.png', tur: 'image/png', veri: gorsel(1) });
    expect(h.harita({ evren, kod: harita })).toMatchObject({ ad: 'Kıta haritası', en: 800, boy: 500, yer: { kod: kita }, katmanlar: [{ x: 0, y: 0, olcek: 1, en: 800, boy: 500 }] });

    const i1 = h.isaretKoy({ evren, harita, kayit: liman, konum: { kesinlik: 'kesin', x: 120, y: 900, yaricap: null } }).kod;
    h.isaretKoy({ evren, harita, kayit: kule, konum: { kesinlik: 'bilinmiyor', x: 5, y: 5, yaricap: 3 } });
    const a = h.harita({ evren, kod: harita });
    // Uzayın dışına düşen nokta kenara sığdırılır; yeri bilinmeyenin koordinatı yoktur.
    expect(a.isaretler.find((x) => x.kod === i1)!.konum).toEqual({ kesinlik: 'kesin', x: 120, y: 500, yaricap: null });
    expect(a.isaretler.find((x) => x.kayit.kod === kule)!.konum).toEqual({ kesinlik: 'bilinmiyor', x: null, y: null, yaricap: null });

    h.isaretDegistir({ evren, kod: i1, alan: 'konum', deger: { kesinlik: 'yaklasik', x: 200, y: 250, yaricap: null } });
    expect(h.harita({ evren, kod: harita }).isaretler.find((x) => x.kod === i1)!.konum).toMatchObject({ kesinlik: 'yaklasik', x: 200, yaricap: 40 });
    expect(h.kayitHaritalari({ evren, kod: liman }).isaretler).toMatchObject([{ harita, haritaAd: 'Kıta haritası', kesinlik: 'yaklasik' }]);
    expect(h.kayitHaritalari({ evren, kod: kita }).haritalar).toEqual([{ kod: harita, ad: 'Kıta haritası' }]);

    // İç içe gezinti: limanın kendi haritası varsa işaretten açılır; liman haritası üst haritayı bilir.
    const { kod: sehirHaritasi } = await h.haritaYukle({ evren, ad: 'Liman planı', yer: liman, dosyaAdi: 'liman.png', tur: 'image/png', veri: gorsel(2) });
    expect(h.harita({ evren, kod: harita }).isaretler.find((x) => x.kod === i1)!.altHarita).toBe(sehirHaritasi);
    expect(h.harita({ evren, kod: sehirHaritasi }).ustHaritalar).toEqual([{ kod: harita, ad: 'Kıta haritası' }]);

    // Silinen kaydın işareti görünmez; harita kaldırılıp geri getirilir.
    h.kayitSil({ evren, kod: kule });
    expect(h.haritalar({ evren }).find((x) => x.kod === harita)!.isaretSayisi).toBe(1);
    h.haritaSil({ evren, kod: harita });
    expect(h.haritalar({ evren }).map((x) => x.ad)).toEqual(['Liman planı']);
    expect(() => h.isaretKoy({ evren, harita, kayit: liman, konum: { kesinlik: 'kesin', x: 1, y: 1, yaricap: null } })).toThrow();
    h.haritaSil({ evren, kod: harita, geriYukle: true });
    expect(h.haritalar({ evren })).toHaveLength(2);
    const gunluk = h.islemGunlugu({ evren, sinir: 50 }).map((i) => i.tur);
    expect(gunluk).toContain('isaret_koy');
    expect(gunluk).toContain('harita_olustur');
  });

  it('kaydın görseli aynı bileşenle işaretlenir; ikinci açış aynı haritayı verir', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kule = h.kayitOlustur({ evren, ad: 'Kayıp Kule', tur: 'mekan' }).kod;
    const oda = h.kayitOlustur({ evren, ad: 'Mühür odası', tur: 'mekan' }).kod;
    const { ad } = await h.gorselEkle({ evren, kod: kule, dosyaAdi: 'plan.png', tur: 'image/png', veri: gorsel(3) });
    const { kod } = h.gorseldenHarita({ evren, kayit: kule, gorsel: ad });
    expect(h.gorseldenHarita({ evren, kayit: kule, gorsel: ad }).kod).toBe(kod);
    expect(h.harita({ evren, kod })).toMatchObject({ ad: 'Kayıp Kule görseli', yer: { kod: kule } });
    h.isaretKoy({ evren, harita: kod, kayit: oda, konum: { kesinlik: 'kesin', x: 10, y: 10, yaricap: null } });
    expect(h.kayitHaritalari({ evren, kod: oda }).isaretler).toHaveLength(1);
    expect(() => h.gorseldenHarita({ evren, kayit: oda, gorsel: ad })).toThrow();
  });

  it('iki cihazda farklı taşınan işaret inceleme bekleyenlere düşer', async () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const liman = m.kayitOlustur({ evren, ad: 'Tuzlu Liman', tur: 'sehir' }).kod;
    const { kod: harita } = await m.haritaYukle({ evren, ad: 'Kıta', dosyaAdi: 'k.png', tur: 'image/png', veri: gorsel(4) });
    const isaret = m.isaretKoy({ evren, harita, kayit: liman, konum: { kesinlik: 'kesin', x: 100, y: 100, yaricap: null } }).kod;
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.isaretDegistir({ evren, kod: isaret, alan: 'konum', deger: { kesinlik: 'kesin', x: 400, y: 100, yaricap: null } });
    tb.isaretDegistir({ evren, kod: isaret, alan: 'konum', deger: { kesinlik: 'kesin', x: 100, y: 400, yaricap: null } });
    tb.haritaDegistir({ evren, kod: harita, alan: 'ad', deger: 'Eski kıta' });
    m.islemleriAl({ evren, islemler: tb.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) }) });
    expect(m.harita({ evren, kod: harita }).ad).toBe('Eski kıta');
    const c = m.catismalar({ evren }).find((x) => x.tur === 'alan' && x.nesne === isaret);
    expect(c).toMatchObject({ kayit: liman, alanEtiketi: '“Eski kıta” haritasındaki yeri' });
    if (c?.tur !== 'alan') throw new Error();
    expect(c.degerler.map((d) => d.yazi).sort()).toEqual(['Kesin yer, soldan %13, üstten %80', 'Kesin yer, soldan %50, üstten %20']);
    expect(m.catismalar({ evren, kod: liman })).toHaveLength(1);
    m.alanCatismasiCoz({ evren, nesne: c.nesne, alan: c.alan, islem: c.degerler.find((d) => (d.deger as { x: number }).x === 400)!.islem });
    expect(m.harita({ evren, kod: harita }).isaretler[0].konum.x).toBe(400);
    expect(m.catismalar({ evren })).toEqual([]);
  });
});
