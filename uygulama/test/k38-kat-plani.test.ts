import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { yeniKod } from '../src/alan/kod';
import { andaGorur, karakterAni, katYerlesimi, sesKatlarArasi } from '../src/alan/gorus';
import type { SahneYerlesimi, YerlesimOgesi } from '../src/veri/api';

type Karakter = Extract<YerlesimOgesi, { tur: 'karakter' }>;
type Ses = Extract<YerlesimOgesi, { tur: 'ses' }>;
const plan = { mekan: 'm', gorsel: 'g', en: 800, boy: 800 };
const kisi = (x: number, y: number): Karakter => ({ kod: yeniKod(), ad: 'Uydurma kişi', tur: 'karakter', kisi: yeniKod(), konum: { x, y }, yon: 0, aci: 360, uzaklik: 2, adimlar: [] });
const ses = (x: number): Ses => ({ kod: yeniKod(), ad: 'Uydurma çan', tur: 'ses', konum: { x, y: 0.5 }, duzey: 'Yüksek', uzaklik: 1, azaltma: 0.1, gurultu: 'Sessiz gece', katAzaltma: 0.3 });

describe('katlar ve sahne içi anlar', () => {
  it('karakter yazılmamış anlarda önceki andaki yerinde kalır', () => {
    const k = kisi(0.1, 0.1);
    const y: SahneYerlesimi = { plan, ogeler: [k], anlar: [
      { kod: 'a', ad: 'Başlangıç', konumlar: { [k.kod]: { kat: null, konum: { x: 0.2, y: 0.2 }, yon: 90 } } },
      { kod: 'b', ad: 'Ara', konumlar: {} },
      { kod: 'c', ad: 'Son', konumlar: { [k.kod]: { kat: 'ust', konum: { x: 0.8, y: 0.8 }, yon: 180 } } },
    ] };
    expect(karakterAni(y, k, -1)).toEqual({ kat: null, konum: k.konum, yon: 0 });
    expect(karakterAni(y, k, 1)).toEqual({ kat: null, konum: { x: 0.2, y: 0.2 }, yon: 90 });
    expect(karakterAni(y, k, 2).kat).toBe('ust');
  });
  it('başka kattaki karakter görülmez; aynı kattaki görülür', () => {
    const a = kisi(0.1, 0.5), b = kisi(0.9, 0.5);
    const y: SahneYerlesimi = { plan, ogeler: [a, b], ekKatlar: [{ kod: 'ust', ad: 'Üst kat', plan, ogeler: [] }] };
    expect(andaGorur(y, a, -1, { kat: null, konum: b.konum, yon: 0 })).toBe(true);
    expect(andaGorur(y, a, -1, { kat: 'ust', konum: b.konum, yon: 0 })).toBe(false);
    expect(katYerlesimi(y, null).ogeler.some((o) => o.tur === 'karakter')).toBe(false);
  });
  it('ses merdivenden öbür kata geçer, kat değişiminde azalır; geçit yoksa ulaşmaz', () => {
    const s = ses(0.1);
    const gecit: YerlesimOgesi = { kod: yeniKod(), ad: 'Merdiven', tur: 'gecit', konum: { x: 0.3, y: 0.5 }, kat: 'ust' };
    const y: SahneYerlesimi = { plan, ogeler: [s, gecit], ekKatlar: [{ kod: 'ust', ad: 'Üst kat', plan, ogeler: [] }] };
    const r = sesKatlarArasi(y, s, null, { kat: 'ust', konum: { x: 0.5, y: 0.5 } });
    expect(r.ulasir).toBe(true);
    expect(r.katDegisimi).toBe(1);
    expect(r.kalan).toBeCloseTo(1 - 0.2 - 0.3 - 0.2);
    expect(sesKatlarArasi(y, { ...s, katAzaltma: 0.7 }, null, { kat: 'ust', konum: { x: 0.5, y: 0.5 } }).ulasir).toBe(false);
    expect(sesKatlarArasi({ ...y, ogeler: [s] }, s, null, { kat: 'ust', konum: { x: 0.5, y: 0.5 } }).ulasir).toBe(false);
    expect(sesKatlarArasi(y, { ...s, uzaklik: null }, null, { kat: 'ust', konum: { x: 0.5, y: 0.5 } }).ulasir).toBeNull();
    // Aynı katta doğrudan yol, merdivene uğramaktan kısa.
    expect(sesKatlarArasi(y, s, null, { kat: null, konum: { x: 0.5, y: 0.5 } })).toMatchObject({ ulasir: true, katDegisimi: 0 });
  });
});

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
const isleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 800, boy: 400, onizleme: new Uint8Array([7]) });

describe('katlı ve anlı yerleşimin saklanması', () => {
  it('ek katlar ve anlar geri okunur, günlükten yeniden kurulur; bozuk değerler reddedilir', async () => {
    const dosyalar = new Map<string, Database>();
    const ac = (ad: string) => { if (!dosyalar.has(ad)) dosyalar.set(ad, new sqlite.oo1.DB(':memory:')); return dosyalar.get(ad)!; };
    const h = new Hizmet(ac, 'Uydurma deneme', 'x', () => {}, new BellekDeposu(), isleyici);
    const evren = h.evrenOlustur({ ad: 'Uydurma deneme evreni' }).kod;
    const sahne = h.kayitOlustur({ evren, ad: 'Uydurma kule sahnesi', tur: 'sahne' }).kod;
    const mekan = h.kayitOlustur({ evren, ad: 'Uydurma kule', tur: 'mekan' }).kod;
    const kisiKod = h.kayitOlustur({ evren, ad: 'Uydurma bekçi', tur: 'karakter' }).kod;
    h.iliskiEkle({ evren, tur: 'sahnede', a: kisiKod, b: sahne, rol: 'bulunuyor' });
    const { ad: gorsel } = await h.gorselEkle({ evren, kod: mekan, dosyaAdi: 'uydurma.png', tur: 'image/png', veri: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]) });
    const p = { mekan, gorsel, en: 800, boy: 400 }, ust = yeniKod();
    const k = { ...kisi(0.2, 0.2), kisi: kisiKod };
    const v: SahneYerlesimi = {
      plan: p, katAdi: 'Zemin kat', ogeler: [k, { kod: yeniKod(), ad: 'Merdiven', tur: 'gecit', konum: { x: 0.5, y: 0.5 }, kat: ust }],
      ekKatlar: [{ kod: ust, ad: 'Çatı katı', plan: p, ogeler: [ses(0.7)] }],
      anlar: [{ kod: yeniKod(), ad: 'Başlangıç', konumlar: { [k.kod]: { kat: null, konum: { x: 0.2, y: 0.2 }, yon: 0 } } }, { kod: yeniKod(), ad: 'Çıkış', konumlar: { [k.kod]: { kat: ust, konum: { x: 0.6, y: 0.4 }, yon: 270 } } }],
    };
    h.yerlesimYaz({ evren, sahne, ...v });
    expect(h.yerlesim({ evren, sahne }).yerlesim).toEqual(v);
    new EvrenVt(ac(`/evren-${evren}.db`), yeniKod()).yenidenKur();
    expect(h.yerlesim({ evren, sahne }).yerlesim).toEqual(v);
    // Katsız ve ansız eski biçim de aynen döner.
    h.yerlesimYaz({ evren, sahne, plan: p, ogeler: [k] });
    expect(h.yerlesim({ evren, sahne }).yerlesim).toEqual({ plan: p, ogeler: [k] });
    const yaz = (d: Partial<SahneYerlesimi>) => () => h.yerlesimYaz({ evren, sahne, ...v, ...d });
    expect(yaz({ ogeler: [k, { kod: yeniKod(), ad: 'Merdiven', tur: 'gecit', konum: { x: 0.5, y: 0.5 }, kat: 'yok' }] })).toThrow();
    expect(yaz({ ogeler: [k, { kod: yeniKod(), ad: 'Merdiven', tur: 'gecit', konum: { x: 0.5, y: 0.5 }, kat: null }] })).toThrow();
    expect(yaz({ ekKatlar: [{ ...v.ekKatlar![0], ogeler: [k] }] })).toThrow();
    expect(yaz({ anlar: [{ kod: yeniKod(), ad: 'x', konumlar: { [k.kod]: { kat: 'yok', konum: { x: 0, y: 0 }, yon: 0 } } }] })).toThrow();
    // Yerleşimde olmayan karakterin an kaydı saklanmaz.
    const bos = yeniKod();
    h.yerlesimYaz({ evren, sahne, ...v, anlar: [{ kod: bos, ad: 'x', konumlar: { [yeniKod()]: { kat: null, konum: { x: 0, y: 0 }, yon: 0 } } }] });
    expect(h.yerlesim({ evren, sahne }).yerlesim?.anlar).toEqual([{ kod: bos, ad: 'x', konumlar: {} }]);
    expect(yaz({ anlar: Array.from({ length: 61 }, () => ({ kod: yeniKod(), ad: 'x', konumlar: {} })) })).toThrow();
  });
});
