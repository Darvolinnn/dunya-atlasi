// Serinin planı (K27): olası finaller ayrı olaylardır ve birbirinin alternatifidir; ek üyelik ana seriyi
// değiştirmez; okuma yolu kitap sonunda açık kalanların "sonra" bilgisini o yola göre verir. Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function kur() {
  const dosyalar = new Map<string, Database>();
  const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
  return { h, evren, k: (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod };
}

describe('serinin planı (K27)', () => {
  it('olası finaller fikir durumunda olaylardır, birbirine alternatif bağlanır; var olan olay da final olabilir', () => {
    const { h, evren, k } = kur();
    const seri = k('Hatıra İmparatorluğu', 'seri');
    const a = h.olasiFinalEkle({ evren, seri, ad: 'Anı vergisi kaldırılır' }).kod;
    const b = h.olasiFinalEkle({ evren, seri, ad: 'Vergi halka devredilir' }).kod;
    expect(h.kayit({ evren, kod: a })).toMatchObject({ tur: 'olay', karar: 'fikir' });
    expect(h.alternatifler({ evren, kod: a }).map((x) => x.kod)).toEqual([b]);
    // Vazgeçilmiş final yeni finalin alternatifi yapılmaz.
    h.kayitDegistir({ evren, kod: a, alan: 'karar', deger: 'vazgecildi' });
    const c = k('Divan yıkılır', 'olay');
    h.olasiFinalBagla({ evren, seri, olay: c });
    expect(h.alternatifler({ evren, kod: c }).map((x) => x.kod)).toEqual([b]);
    expect(() => h.olasiFinalBagla({ evren, seri, olay: c })).toThrow(/zaten/);
    const p = h.seriPlani({ evren, seri });
    expect(p.finaller.map((x) => [x.ad, x.karar])).toEqual([['Anı vergisi kaldırılır', 'vazgecildi'], ['Vergi halka devredilir', 'fikir'], ['Divan yıkılır', 'kesin']]);
    h.iliskiSil({ evren, kod: p.finaller[2].bag });
    expect(h.seriPlani({ evren, seri }).finaller).toHaveLength(2);
    expect(() => h.olasiFinalBagla({ evren, seri, olay: k('Lale', 'karakter') })).toThrow(/olay/);
  });

  it('ek üyelik ana seriyi değiştirmez; okuma yolu yalnız serinin kitaplarını alır', () => {
    const { h, evren, k } = kur();
    const ana = k('Hatıra İmparatorluğu', 'seri'), yan = k('Hatıra Öyküleri', 'seri');
    const i = k('Unutulanlar', 'eser'), ii = k('Hatırlayanlar', 'eser'), oyku = k('Arşivcinin gecesi', 'eser'), dis = k('Başka kitap', 'eser');
    for (const x of [i, ii, oyku]) h.anlatiYerlestir({ evren, kod: x, ust: ana });
    h.iliskiEkle({ evren, tur: 'seri_eseri', a: yan, b: oyku });
    expect(() => h.iliskiEkle({ evren, tur: 'seri_eseri', a: ana, b: i })).toThrow(/zaten/);
    const py = h.seriPlani({ evren, seri: yan });
    expect(py.kitaplar).toEqual([]);
    expect(py.ekUyeler).toEqual([expect.objectContaining({ ad: 'Arşivcinin gecesi', anaSeri: expect.objectContaining({ ad: 'Hatıra İmparatorluğu' }) })]);
    expect(h.seriler({ evren }).seriler.find((s) => s.kod === ana)!.eserler.map((x) => x.ad)).toEqual(['Unutulanlar', 'Hatırlayanlar', 'Arşivcinin gecesi']);

    h.okumaYollariYaz({ evren, seri: ana, yollar: [{ ad: 'Yayın sırası', eserler: [ii, oyku, i] }] });
    expect(h.seriPlani({ evren, seri: ana }).okumaYollari.map((y) => [y.ad, y.eserler.map((x) => x.ad)])).toEqual([['Yayın sırası', ['Hatırlayanlar', 'Arşivcinin gecesi', 'Unutulanlar']]]);
    expect(() => h.okumaYollariYaz({ evren, seri: ana, yollar: [{ ad: 'X', eserler: [dis] }] })).toThrow(/yalnız/);
    expect(() => h.okumaYollariYaz({ evren, seri: ana, yollar: [{ ad: 'X', eserler: [i, i] }] })).toThrow(/iki kez/);
    expect(() => h.okumaYollariYaz({ evren, seri: ana, yollar: [{ ad: ' ', eserler: [] }] })).toThrow(/adı/);
    // Silinen kitap yoldan düşer, yol kalır.
    h.kayitSil({ evren, kod: oyku });
    expect(h.seriPlani({ evren, seri: ana }).okumaYollari[0].eserler.map((x) => x.ad)).toEqual(['Hatırlayanlar', 'Unutulanlar']);
  });

  it('kitap sonunda açık kalanlar seçilen okuma yoluna göre "sonra" verir', () => {
    const { h, evren, k } = kur();
    const seri = k('Hatıra İmparatorluğu', 'seri');
    const i = k('Unutulanlar', 'eser'), ii = k('Hatırlayanlar', 'eser'), iii = k('Son Hatıra', 'eser');
    for (const x of [i, ii, iii]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
    const deniz = k('Deniz', 'karakter');
    const s = (ad: string, ust: string) => h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
    const { kod: q } = h.iddiaEkle({ evren, konu: deniz, soru: 'Deniz’e ne oldu?', secenekler: ['İsyancılarla', 'Öldü'], gercek: 0 });
    const sec = h.iddialar({ evren }).find((x) => x.kod === q)!.secenekler;
    h.sahneNiyetleriYaz({ evren, sahne: s('Arşivde', i), niyetler: [{ iddia: q, secenek: sec[1].kod, tur: 'destekler' }] });
    h.sahneNiyetleriYaz({ evren, sahne: s('Liman', ii), niyetler: [{ iddia: q, secenek: sec[0].kod, tur: 'aciklar' }] });
    h.sahneNiyetleriYaz({ evren, sahne: s('Saray', iii), niyetler: [{ iddia: q, secenek: sec[0].kod, tur: 'aciklar' }] });
    h.okumaYollariYaz({ evren, seri, yollar: [{ ad: 'Önce son kitap', eserler: [i, iii, ii] }] });
    const varsayilan = h.kitapSonuAciklar({ evren, eser: i });
    expect(varsayilan.sorular[0].sonra!.eser.ad).toBe('Hatırlayanlar');
    expect(varsayilan.yollar.map((y) => y.ad)).toEqual(['Önce son kitap']);
    const yol = h.kitapSonuAciklar({ evren, eser: i, yol: varsayilan.yollar[0].kod });
    expect(yol.yol).toBe(varsayilan.yollar[0].kod);
    expect(yol.sorular[0].sonra!.eser.ad).toBe('Son Hatıra');
  });
});
