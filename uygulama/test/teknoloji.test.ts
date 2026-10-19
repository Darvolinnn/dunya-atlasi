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

describe('teknoloji (§4.4)', () => {
  it('keşif, yayılma ve gündelik hayat ayrı tarihlerdir; kayıt yoksa yok denmez', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const ulke = kayit('Kuzey krallığı', 'siyasi');
    const sehir = kayit('Ardıç', 'sehir');
    const uzak = kayit('Güney adaları', 'mekan');
    h.iliskiEkle({ evren, tur: 'parca', a: sehir, b: ulke });
    const barut = kayit('Barut', 'teknoloji');
    const pusula = kayit('Pusula', 'teknoloji');
    kayit('Matbaa', 'teknoloji');
    h.teknolojiYaz({ evren, kod: barut, tanim: { duzeyler: [{ alan: 'savaş', duzey: 'top' }, { alan: 'madencilik', duzey: 'yok' }], asamalar: [
      { asama: 'kesif', yer: uzak, tarih: '1100', not: '' },
      { asama: 'yayilma', yer: ulke, tarih: '1200', not: 'Tüccarlarla' },
      { asama: 'gundelik', yer: sehir, tarih: '1250', not: '' },
    ] } });
    h.teknolojiYaz({ evren, kod: pusula, tanim: { duzeyler: [], asamalar: [{ asama: 'kesif', yer: null, tarih: '', not: '' }] } });
    expect(() => h.teknolojiYaz({ evren, kod: barut, tanim: { duzeyler: [], asamalar: [{ asama: 'kesif', yer: null, tarih: 'dün değil', not: '' }] } })).toThrow(/okunamadı/);
    expect(h.teknoloji({ evren, kod: barut }).asamalar[1]).toMatchObject({ asama: 'yayilma', yer: { ad: 'Kuzey krallığı' }, not: 'Tüccarlarla' });

    const d = h.teknolojiDurumu({ evren, yer: sehir, tarih: '1220' });
    const s = (k: string) => d.satirlar.find((x) => x.teknoloji.kod === k)!;
    expect(s(barut)).toMatchObject({ kesin: 'yayilma', belki: null, baskaYerde: [{ ad: 'Güney adaları' }] });
    expect(s(pusula)).toMatchObject({ kesin: null, belki: 'kesif' });
    expect(d.satirlar.some((x) => x.teknoloji.ad === 'Matbaa')).toBe(false);
    expect(d.yerler.map((x) => x.ad)).toEqual(['Ardıç', 'Kuzey krallığı']);
    expect(d.not).toMatch(/“yok” denmez/);
    expect(h.teknolojiDurumu({ evren, yer: sehir, tarih: '1300' }).satirlar.find((x) => x.teknoloji.kod === barut)!.kesin).toBe('gundelik');
    expect(h.teknolojiDurumu({ evren, yer: sehir, tarih: '1150' }).satirlar.find((x) => x.teknoloji.kod === barut)).toMatchObject({ kesin: null, baskaYerde: [{ ad: 'Güney adaları' }] });
  });
});

describe('motif (§4.6)', () => {
  it('yorumlar yorumlayana göre, sahneler okuma sırasıyla', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const motif = kayit('Kırık ay', 'motif');
    const kultur = kayit('Kıyı halkı', 'kultur');
    const eser = kayit('Birinci kitap', 'eser');
    const s1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Açılış', tur: 'sahne' }).kod;
    const s2 = h.anlatiOlustur({ evren, ust: eser, ad: 'Kuşatma', tur: 'sahne' }).kod;
    h.iliskiEkle({ evren, tur: 'motif_gecer', a: s2, b: motif });
    h.iliskiEkle({ evren, tur: 'motif_gecer', a: s1, b: motif });
    h.motifYorumlariYaz({ evren, kod: motif, yorumlar: [{ yorumlayan: kultur, donem: null, anlam: 'Uğursuzluk' }, { yorumlayan: null, donem: null, anlam: 'Yeniden doğuş' }] });
    expect(() => h.motifYorumlariYaz({ evren, kod: motif, yorumlar: [{ yorumlayan: null, donem: null, anlam: ' ' }] })).toThrow(/anlamını/);
    const m = h.motif({ evren, kod: motif });
    expect(m.yorumlar).toMatchObject([{ yorumlayan: { ad: 'Kıyı halkı' }, anlam: 'Uğursuzluk' }, { yorumlayan: null, anlam: 'Yeniden doğuş' }]);
    expect(m.sahneler.map((x) => [x.sahne.ad, x.sira])).toEqual([['Açılış', 1], ['Kuşatma', 2]]);
    expect(h.sablon({ evren, tur: 'esya' }).sablon.alanlar.map((a) => a.ad)).toEqual(['Gerçek geçmişi', 'Anlatılan efsanesi']);
  });
});
