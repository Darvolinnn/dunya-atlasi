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

describe('kurgu montajı (§15-9, F13)', () => {
  it('ipucu, yanıltmaca, açıklama; hedefe göre uyarı; taşıyınca yeniden hesaplanır', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const eser = kayit('Birinci kitap', 'eser');
    const kral = kayit('Kral', 'karakter'), vezir = kayit('Vezir', 'karakter');
    const b1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Birinci bölüm', tur: 'bolum' }).kod;
    const b2 = h.anlatiOlustur({ evren, ust: eser, ad: 'İkinci bölüm', tur: 'bolum' }).kod;
    const s = (ad: string, ust: string) => h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
    const s1 = s('Ziyafet', b1), s2 = s('Zehir şişesi', b1), s3 = s('Sorgu', b2), s4 = s('İtiraf', b2);
    const { kod: soru } = h.iddiaEkle({ evren, konu: kral, soru: 'Kralı kim öldürdü?', secenekler: ['Vezir', 'Aşçı'], gercek: 0 });
    const sec = h.iddialar({ evren }).find((x) => x.kod === soru)!.secenekler;
    h.sahneNiyetleriYaz({ evren, sahne: s1, niyetler: [{ iddia: soru, secenek: sec[1].kod, tur: 'destekler' }] });
    h.sahneNiyetleriYaz({ evren, sahne: s4, niyetler: [{ iddia: soru, secenek: sec[0].kod, tur: 'aciklar' }] });
    expect(() => h.sahneNiyetleriYaz({ evren, sahne: s2, niyetler: [{ iddia: soru, secenek: null, tur: 'destekler' }] })).toThrow(/seçin/);
    h.bilgiEkle({ evren, bilgi: { iddia: soru, bilen: eser, inanc: 'inaniyor', secenek: sec[0].kod, sahne: s3 } });
    h.montajHedefiYaz({ evren, eser, iddia: soru, hedef: 'surpriz' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: kral, b: s1, rol: 'bulunuyor' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: vezir, b: s1, rol: 'bulunuyor' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: vezir, b: s4, rol: 'bulunuyor' });
    const motif = kayit('Kırık ay', 'motif');
    h.iliskiEkle({ evren, tur: 'motif_gecer', a: s1, b: motif });

    let m = h.kurguMontaji({ evren, eser });
    expect(m.sahneler.map((x) => x.ad)).toEqual(['Ziyafet', 'Zehir şişesi', 'Sorgu', 'İtiraf']);
    const q = m.sorular[0];
    expect(q.olaylar.map((o) => [o.sira, o.tur])).toEqual([[1, 'yaniltmaca'], [3, 'okur'], [4, 'aciklama']]);
    expect(q.okurOgrenir).toBe(3);
    expect(q.uyarilar.join(' ')).toMatch(/ipucu yok/);
    expect(q.uyarilar.join(' ')).toMatch(/3\. sahnede öğreniyor/);
    expect(m.izler).toMatchObject([{ kayit: { ad: 'Kırık ay' }, siralar: [1], sondan: 3 }]);
    expect(m.yokluk.find((y) => y.kisi.ad === 'Vezir')!.hucreler).toEqual([0, 1, 2, 0]);
    expect(m.yokluk.find((y) => y.kisi.ad === 'Kral')!.hucreler).toEqual([0, 1, 2, 3]);

    // Sahne taşınınca okurun öğrendiği sahne de değişir.
    h.montajTasi({ evren, sahne: s3, yon: 1 });
    m = h.kurguMontaji({ evren, eser });
    expect(m.sahneler.map((x) => x.ad)).toEqual(['Ziyafet', 'Zehir şişesi', 'İtiraf', 'Sorgu']);
    expect(m.sorular[0].okurOgrenir).toBe(4);
    expect(m.sorular[0].uyarilar.join(' ')).not.toMatch(/öğreniyor/);
    h.montajTasi({ evren, sahne: s4, yon: -1 });
    expect(h.kurguMontaji({ evren, eser }).sahneler.map((x) => x.bolum)).toEqual(['Birinci bölüm', 'Birinci bölüm', 'Birinci bölüm', 'İkinci bölüm']);
    h.montajTasi({ evren, sahne: s4, yon: -1 });
    expect(h.kurguMontaji({ evren, eser }).sahneler.map((x) => x.ad)).toEqual(['Ziyafet', 'İtiraf', 'Zehir şişesi', 'Sorgu']);
    expect(() => h.montajTasi({ evren, sahne: s3, yon: 1 })).toThrow(/son/);
    // Hedef gerilim: okur açıklamadan önce öğrenmiyorsa uyarı.
    h.montajHedefiYaz({ evren, eser, iddia: soru, hedef: 'gerilim' });
    expect(h.kurguMontaji({ evren, eser }).sorular[0].uyarilar.join(' ')).toMatch(/Hedef gerilim/);
    h.montajHedefiYaz({ evren, eser, iddia: soru, hedef: null });
    expect(h.kurguMontaji({ evren, eser }).sorular[0].uyarilar).toEqual([]);
  });
});
