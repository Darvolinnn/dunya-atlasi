// K29: bağlantısız geçen adlar. Örnek adlar uydurmadır.
import { describe, expect, it } from 'vitest';
import { bagsizAdlar, yerAnahtari, type MetinBlogu } from '../src/alan/bagsiz-ad';

const blok = (metin: string, bagliAraliklar: [number, number][] = []): MetinBlogu => {
  const bagli = Array.from({ length: metin.length }, (_, i) => bagliAraliklar.some(([a, z]) => i >= a && i < z));
  return { metin, bagli };
};
const ADLAR = [
  { kod: 'lale', ifade: 'Lale' }, { kod: 'deniz', ifade: 'Deniz' }, { kod: 'arsiv', ifade: 'Başkent Arşivi' },
  { kod: 'baskent', ifade: 'Başkent' }, { kod: 'lale2', ifade: 'Lale' }, { kod: 'al', ifade: 'Al' },
];

describe('bağlantısız adlar', () => {
  it('ekli biçimleri bulur, büyük harfle yazılan adda küçük harfli sıradan kelimeyi önermez', () => {
    const r = bagsizAdlar([blok("Lale'nin kardeşi Deniz'in dosyası. Mavi deniz uzaktı. DENİZ yine yoktu.")], ADLAR);
    expect(r.map((x) => [x.ifade, x.kodlar])).toEqual([["Lale'nin", ['lale', 'lale2']], ["Deniz'in", ['deniz']], ['DENİZ', ['deniz']]]);
    expect(r[1].cumle).toBe("Lale'nin kardeşi Deniz'in dosyası.");
  });

  it('çok kelimeli adı önce dener; bağlantı içindekini ve hariç tutulanı göstermez; kelime ortasında eşleşmez', () => {
    const m = "Başkent Arşivi'nde Lale bekledi. Lalezar sokağı.";
    const r = bagsizAdlar([blok(m, [[19, 23]])], ADLAR);
    expect(r.map((x) => [x.ifade, x.kodlar])).toEqual([["Başkent Arşivi'nde", ['arsiv']]]);
    expect(bagsizAdlar([blok(m)], ADLAR, new Set(['lale', 'lale2', 'arsiv'])).map((x) => x.ifade)).toEqual(['Başkent']);
    // İki harfli adlar aranmaz.
    expect(bagsizAdlar([blok('Al geldi.')], ADLAR)).toEqual([]);
  });

  it('yer anahtarı cümle değişince değişir', () => {
    expect(yerAnahtari('s', 'lale', 'Lale geldi.')).toBe(yerAnahtari('s', 'lale', 'LALE GELDİ.'));
    expect(yerAnahtari('s', 'lale', 'Lale geldi.')).not.toBe(yerAnahtari('s', 'lale', 'Lale gitti.'));
  });
});
