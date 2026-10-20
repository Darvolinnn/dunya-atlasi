// Karakterin kitaplardaki yolu (K27, Model §8): karakter × eser; her hücre bir ilişkinin sorularıdır. Hücreler
// birbirini değiştirmez, karakterin evren kaydı tektir. Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad = 'Masaüstü') {
  const dosyalar = new Map<string, Database>();
  return new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, ad, 'x');
}

describe('karakterin kitaplardaki yolu (K27)', () => {
  it('her kitap ayrı hücre; cevaplar birbirini değiştirmez; çok odaklı eser', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const seri = k('Hatıra İmparatorluğu', 'seri');
    const i = k('Unutulanlar', 'eser'), ii = k('Hatırlayanlar', 'eser');
    for (const x of [i, ii]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
    const lale = k('Lale', 'karakter'), deniz = k('Deniz', 'karakter');
    expect(() => h.iliskiEkle({ evren, a: i, b: lale, tur: 'eser_odagi' })).toThrow('karakterden bir esere');
    h.iliskiEkle({ evren, a: lale, b: i, tur: 'eser_odagi' });
    h.iliskiEkle({ evren, a: lale, b: ii, tur: 'eser_odagi' });
    h.iliskiEkle({ evren, a: deniz, b: ii, tur: 'eser_odagi' });
    let y = h.karakterYollari({ evren, kapsam: seri });
    expect(y.eserler.map((x) => x.ad)).toEqual(['Unutulanlar', 'Hatırlayanlar']);
    expect(y.karakterler.map((x) => [x.ad, Object.keys(x.hucreler).length])).toEqual([['Lale', 2], ['Deniz', 1]]);
    const hucre = (eser: string) => h.karakterYollari({ evren, kapsam: seri }).karakterler[0].hucreler[eser];
    h.soruCevapla({ evren, kod: hucre(i).iliski, soru: 'karakter_kitapta.1', durum: 'cevaplandi', cevap: 'Deniz’i bulmak.' });
    h.soruCevapla({ evren, kod: hucre(ii).iliski, soru: 'karakter_kitapta.1', durum: 'cevaplandi', cevap: 'İsyanı korumak.' });
    expect(hucre(i).sorular[0].cevap).toMatchObject({ cevap: 'Deniz’i bulmak.' });
    expect(hucre(ii).sorular[0].cevap).toMatchObject({ cevap: 'İsyanı korumak.' });
    // Evren kaydı tek; bu sorular karakterin kendi sorularına karışmaz.
    expect(h.kayitSablonu({ evren, kod: lale }).sorular.some((q) => q.kod.startsWith('karakter_kitapta.'))).toBe(false);
    expect(() => h.soruKayitla({ evren, kod: hucre(i).iliski, soru: 'karakter_kitapta.5', ad: 'Şişeyi çalmak', tur: 'sahne' })).toThrow();
    y = h.karakterYollari({ evren, kapsam: i });
    expect(y.karakterler.map((x) => x.ad)).toEqual(['Lale']);
  });

  it('karar ve bedel sorularına sahne ya da olay bağlanır; yazılı cevap ile bağ birbirini silmez', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const eser = k('Unutulanlar', 'eser'), lale = k('Lale', 'karakter');
    const sahne = h.anlatiOlustur({ evren, ust: eser, ad: 'Şişeyi çalar', tur: 'sahne' }).kod;
    h.iliskiEkle({ evren, a: lale, b: eser, tur: 'eser_odagi' });
    const kod = h.karakterYollari({ evren, kapsam: eser }).karakterler[0].hucreler[eser].iliski;
    const q = (n: number) => h.karakterYollari({ evren, kapsam: eser }).karakterler[0].hucreler[eser].sorular[n - 1];
    expect(q(5).bagla).toEqual(['sahne', 'olay']);
    h.soruBagla({ evren, kod, soru: 'karakter_kitapta.5', hedef: sahne });
    expect(q(5).cevap).toMatchObject({ durum: 'cevaplandi', cevap: '', kayitla: { kod: sahne, ad: 'Şişeyi çalar' } });
    h.soruCevapla({ evren, kod, soru: 'karakter_kitapta.5', durum: 'cevaplandi', cevap: 'Annesinin şişesini çalmak; Orhun’a güvenmekten vazgeçer.' });
    expect(q(5).cevap).toMatchObject({ cevap: 'Annesinin şişesini çalmak; Orhun’a güvenmekten vazgeçer.', kayitla: { kod: sahne } });
    h.soruBagla({ evren, kod, soru: 'karakter_kitapta.5', hedef: null });
    expect(q(5).cevap).toMatchObject({ cevap: 'Annesinin şişesini çalmak; Orhun’a güvenmekten vazgeçer.', kayitla: null });
    expect(() => h.soruBagla({ evren, kod, soru: 'karakter_kitapta.5', hedef: lale })).toThrow(/sahne ya da olay/);
    expect(() => h.soruBagla({ evren, kod, soru: 'karakter_kitapta.1', hedef: sahne })).toThrow(/bağlanmaz/);
    // Yalnız bağ varken bağ kaldırılınca cevap boşalır.
    h.soruBagla({ evren, kod, soru: 'karakter_kitapta.6', hedef: sahne });
    h.soruBagla({ evren, kod, soru: 'karakter_kitapta.6', hedef: null });
    expect(q(6).cevap).toBeNull();
  });
});
