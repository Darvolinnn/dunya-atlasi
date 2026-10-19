import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { HukukTanimGirdisi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
type Girdi = HukukTanimGirdisi;
const tanim = (x: Partial<Girdi>): Girdi => ({ ad: 'Kural', tur: 'yasak', konu: '', kimlere: [], yer: null, yaptirim: '', fiili: null, fiiliNot: '', baslangic: '', bitis: '', ...x });

describe('hukuk ve statü (§15-11)', () => {
  it('bir yere giren kişiye uygulanabilecek kurallar; kayıtlı olmayan üyelik "değil" sayılmaz; çatışan yetkiler yan yana', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const krallik = kayit('Orvan Krallığı', 'siyasi');
    const sehir = kayit('Taşliman', 'sehir');
    const liman = kayit('Rıhtım', 'mekan');
    const tapinak = kayit('Güneş tapınağı', 'inanc');
    const lonca = kayit('Kılıççılar loncası', 'topluluk');
    const elin = kayit('Elin', 'karakter');
    const daran = kayit('Daran', 'karakter');
    h.iliskiEkle({ evren, tur: 'parca', a: liman, b: sehir });
    h.iliskiEkle({ evren, tur: 'bagli', a: sehir, b: krallik });
    h.iliskiEkle({ evren, tur: 'uye', a: elin, b: lonca });

    const kural = (sahip: string, x: Partial<Girdi>) => { const { kod } = h.hukukKuraliOlustur({ evren, sahip, ad: x.ad ?? 'K' }); h.hukukKuraliYaz({ evren, kod, tanim: tanim(x) }); return kod; };
    expect(() => h.hukukKuraliOlustur({ evren, sahip: elin, ad: 'x' })).toThrow(/eklenmez/);
    const silah = kural(krallik, { ad: 'Silah yasağı', tur: 'yasak', konu: 'Kılıç taşımak', yaptirim: 'Silaha el konur', fiili: 'gevsek', fiiliNot: 'Rıhtımda kimse bakmaz' });
    const loncaHakki = kural(lonca, { ad: 'Lonca ayrıcalığı', tur: 'hak', konu: 'kılıç taşımak', kimlere: [{ iliski: 'uye', hedef: lonca, degil: false }] });
    kural(tapinak, { ad: 'Tapınak vergisi', tur: 'yukumluluk', konu: 'Ondalık', kimlere: [{ iliski: 'uye', hedef: tapinak, degil: false }], yer: sehir });
    kural(sehir, { ad: 'Gece kapısı', tur: 'yasak', konu: 'Gece surdan çıkmak', baslangic: '400' });
    expect(() => kural(sehir, { ad: 'x', yer: krallik })).toThrow(/mekân ya da şehir/);

    const u = h.uygulananKurallar({ evren, kisi: elin, yer: liman, tarih: '410' });
    const bul = (ad: string) => u.kurallar.find((x) => x.kural.tanim.ad === ad);
    expect(bul('Silah yasağı')).toMatchObject({ durum: 'uygulanir', nedenYer: 'bu yer “Orvan Krallığı” yönetimine bağlı' });
    expect(bul('Lonca ayrıcalığı')!.durum).toBe('uygulanir');
    // Tapınak üyeliği kayıtlı değil: "uygulanmaz" denmez, koşul kayıtlı değil denir.
    expect(bul('Tapınak vergisi')).toMatchObject({ durum: 'kosul_kayitsiz', kosullar: [{ durum: 'kayitsiz' }] });
    expect(bul('Gece kapısı')!.zaman).toBe('gecerli');
    expect(u.catismalar).toHaveLength(1);
    expect([...u.catismalar[0].kurallar].sort()).toEqual([silah, loncaHakki].sort());
    expect(u.yonetimler.map((x) => x.ad)).toEqual(['Orvan Krallığı']);

    // Tarih öncesi kural düşer; tarih verilmezse "tarihsiz" denir.
    expect(h.uygulananKurallar({ evren, kisi: elin, yer: liman, tarih: '390' }).kurallar.some((x) => x.kural.tanim.ad === 'Gece kapısı')).toBe(false);
    expect(h.uygulananKurallar({ evren, kisi: elin, yer: liman }).kurallar.find((x) => x.kural.tanim.ad === 'Gece kapısı')!.zaman).toBe('tarihsiz');

    // "Değil" koşulu: üyeyse kural düşer.
    kural(lonca, { ad: 'Yabancı harcı', tur: 'yukumluluk', konu: 'Harç', kimlere: [{ iliski: 'uye', hedef: lonca, degil: true }] });
    expect(h.uygulananKurallar({ evren, kisi: elin, yer: liman }).kurallar.some((x) => x.kural.tanim.ad === 'Yabancı harcı')).toBe(false);
    expect(h.uygulananKurallar({ evren, kisi: daran, yer: liman }).kurallar.find((x) => x.kural.tanim.ad === 'Yabancı harcı')!.durum).toBe('kosul_kayitsiz');

    // Başka bir krallığın yerinde krallık kuralı uygulanmaz.
    const dag = kayit('Dağ köyü', 'mekan');
    expect(h.uygulananKurallar({ evren, kisi: elin, yer: dag }).kurallar.map((x) => x.kural.tanim.ad).sort()).toEqual(['Lonca ayrıcalığı', 'Yabancı harcı'].filter((x) => x !== 'Yabancı harcı'));
  });
});
