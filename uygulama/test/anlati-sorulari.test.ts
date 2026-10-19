// Anlatı soruları (K27): eser, sahne ve kurgu hattının varsayılan soruları. Evrenin kuralı (`baslangic.1`) ayrı
// kalır; şablonunu değiştirmiş evrende yeni sorular kendiliğinden eklenmez, eski cevaplar korunur. Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { soruSetiBul, varsayilanSablon } from '../src/alan/sablon';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function kur() {
  const dosyalar = new Map<string, Database>();
  const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
  return { h, evren };
}
const kodlar = (h: Hizmet, evren: string, kod: string) => h.kayitSablonu({ evren, kod }).sorular.map((q) => q.kod);

describe('anlatı soruları (K27)', () => {
  it('yeni eser, sahne ve kurgu hattı kendi sorularıyla gelir; evren kuralı sorusu ayrı kalır', () => {
    const { h, evren } = kur();
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const sahne = h.kayitOlustur({ evren, ad: 'Arşivde', tur: 'sahne' }).kod;
    const hat = h.kayitOlustur({ evren, ad: 'Deniz’in izi', tur: 'kurgu_hatti' }).kod;
    expect(kodlar(h, evren, eser)).toEqual([...soruSetiBul('cekirdek')!.sorular, ...soruSetiBul('eser')!.sorular].map((q) => q.kod));
    expect(kodlar(h, evren, sahne)).toEqual(soruSetiBul('sahne_plani')!.sorular.map((q) => q.kod));
    expect(kodlar(h, evren, hat)).toEqual(soruSetiBul('hat')!.sorular.map((q) => q.kod));
    expect(soruSetiBul('baslangic')!.sorular[0]).toMatchObject({ kod: 'baslangic.1', metin: 'Temel fikir', ipucu: 'Evreni farklı kılan tek kural' });

    h.soruCevapla({ evren, kod: sahne, soru: 'sahne_plani.1', durum: 'cevaplandi', cevap: 'Lale dosyayı arıyor.' });
    h.soruCevapla({ evren, kod: sahne, soru: 'sahne_plani.3', durum: 'ilgisiz' });
    const q = h.kayitSablonu({ evren, kod: sahne }).sorular;
    expect(q.find((x) => x.kod === 'sahne_plani.1')!.cevap).toMatchObject({ durum: 'cevaplandi', cevap: 'Lale dosyayı arıyor.' });
    expect(q.find((x) => x.kod === 'sahne_plani.3')!.cevap).toMatchObject({ durum: 'ilgisiz' });
  });

  it('şablonu değiştirilmiş türde yeni sorular kendiliğinden eklenmez; cevaplar kaybolmaz', () => {
    const { h, evren } = kur();
    // Yazar sahne şablonunu kendi sorusuyla değiştirmiş (yeni soruların gelmesinden önceki bir evren gibi).
    h.sablonYaz({ evren, tur: 'sahne', sablon: { alanlar: [], sorular: [{ kod: 'kendi.1', metin: 'Hava nasıl?' }] } });
    const sahne = h.kayitOlustur({ evren, ad: 'Liman', tur: 'sahne' }).kod;
    h.soruCevapla({ evren, kod: sahne, soru: 'kendi.1', durum: 'cevaplandi', cevap: 'Sisli.' });
    expect(kodlar(h, evren, sahne)).toEqual(['kendi.1']);
    // Set isteyerek eklenebilir; eski cevap yerinde.
    h.kayitSoruSeti({ evren, kod: sahne, set: 'sahne_plani', ekle: true });
    const k = h.kayitSablonu({ evren, kod: sahne });
    expect(k.sorular.map((x) => x.kod)).toEqual(['kendi.1', ...soruSetiBul('sahne_plani')!.sorular.map((x) => x.kod)]);
    expect(k.sorular[0].cevap).toMatchObject({ cevap: 'Sisli.' });
    expect(varsayilanSablon('sahne').sorular).toHaveLength(4);
  });
});
