// Kitap sonunda açık olanlar (K27, Model §7): sahne niyetlerinden, eserin okuma sırasına göre. Sonraki kitap
// yazılınca bu kitabın sütunu değişmez; yalnızca "sonra" bilgisi eklenir. Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

describe('kitap sonunda açık olanlar (K27)', () => {
  it('açıklanmayan sorular listelenir; sonraki kitapta açıklanınca yalnız "sonra" dolar', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const seri = k('Hatıra İmparatorluğu', 'seri');
    const i = k('Unutulanlar', 'eser'), ii = k('Hatırlayanlar', 'eser');
    for (const x of [i, ii]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
    const deniz = k('Deniz', 'karakter'), isyan = k('Silinmiş isyan', 'olay');
    const s = (ad: string, ust: string) => h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
    const [a1, a2, a3] = [s('Arşivde', i), s('Mühür', i), s('Deniz bulunur', i)];
    const { kod: q1 } = h.iddiaEkle({ evren, konu: deniz, soru: 'Deniz’e ne oldu?', secenekler: ['İsyancılarla', 'Öldü'], gercek: 0 });
    const { kod: q2 } = h.iddiaEkle({ evren, konu: isyan, soru: 'İsyanın nedeni ne?', secenekler: ['Vergi', 'Kıtlık'], gercek: 0 });
    const sec = (q: string) => h.iddialar({ evren }).find((x) => x.kod === q)!.secenekler;
    h.sahneNiyetleriYaz({ evren, sahne: a1, niyetler: [{ iddia: q1, secenek: sec(q1)[1].kod, tur: 'destekler' }, { iddia: q2, secenek: sec(q2)[0].kod, tur: 'destekler' }] });
    h.sahneNiyetleriYaz({ evren, sahne: a2, niyetler: [{ iddia: q2, secenek: sec(q2)[1].kod, tur: 'destekler' }] });
    h.sahneNiyetleriYaz({ evren, sahne: a3, niyetler: [{ iddia: q1, secenek: sec(q1)[0].kod, tur: 'aciklar' }] });
    const once = h.kitapSonuAciklar({ evren, eser: i });
    expect(once.seride).toBe(true);
    expect(once.sorular).toEqual([expect.objectContaining({ iddia: expect.objectContaining({ soru: 'İsyanın nedeni ne?' }), ipucu: 1, yaniltmaca: 1, sonra: null })]);
    // II. kitapta açıklanır: I'in listesi aynı kalır, yalnız "sonra" dolar.
    const b1 = s('Anılar geri döner', ii);
    h.sahneNiyetleriYaz({ evren, sahne: b1, niyetler: [{ iddia: q2, secenek: sec(q2)[0].kod, tur: 'aciklar' }] });
    const sonra = h.kitapSonuAciklar({ evren, eser: i });
    expect(sonra.sorular.map((x) => x.iddia.soru)).toEqual(['İsyanın nedeni ne?']);
    expect(sonra.sorular[0].sonra).toMatchObject({ eser: { ad: 'Hatırlayanlar' }, sahne: { ad: 'Anılar geri döner' }, sira: 1 });
    expect(h.kitapSonuAciklar({ evren, eser: ii }).sorular).toEqual([]);
  });
});
