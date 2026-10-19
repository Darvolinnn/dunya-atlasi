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

describe('adlandırılmış evren sürümleri (§9.7)', () => {
  it('sürüm sonraki değişikliklerden etkilenmez, salt okunurdur ve farkı gösterir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kral = h.kayitOlustur({ evren, ad: 'Kral Aldren', tur: 'karakter' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    h.iliskiEkle({ evren, tur: 'parca', a: kale, b: kral });
    const { kod: surum } = h.surumOlustur({ evren, ad: 'Birinci kitabın yayımlanan hâli' });
    h.kayitDegistir({ evren, kod: kral, alan: 'ad', deger: 'Kral Aldren II' });
    h.kayitOlustur({ evren, ad: 'Varis', tur: 'karakter' });
    h.kayitSil({ evren, kod: kale });
    expect(h.surumler({ evren })).toMatchObject([{ ad: 'Birinci kitabın yayımlanan hâli' }]);
    // Sabit sürüm kendi koduyla açılır.
    const b = h.evrenBilgisi({ evren: surum });
    expect(b.bag).toMatchObject({ tur: 'surum', evren, ad: 'Birinci kitabın yayımlanan hâli' });
    expect(b.kayitSayisi).toBe(2);
    expect(h.kayit({ evren: surum, kod: kral }).ad).toBe('Kral Aldren');
    expect(() => h.kayitDegistir({ evren: surum, kod: kral, alan: 'ad', deger: 'x' })).toThrow(/sabit/);
    const f = h.surumFarki({ evren, surum });
    expect(f.kayitlar.map((k) => [k.ad, k.durum])).toEqual([['Varis', 'yeni'], ['Kuzey Kalesi', 'silindi'], ['Kral Aldren II', 'degisti']]);
    expect(f.kayitlar[2].alanlar[0]).toMatchObject({ etiket: 'Adı', once: 'Kral Aldren', sonra: 'Kral Aldren II' });
    expect(() => h.surumOlustur({ evren: surum, ad: 'x' })).toThrow(/ana evrende/);
    h.surumYaz({ evren, kod: surum, alan: 'aciklama', deger: 'Matbaaya giden' });
    h.surumSil({ evren, kod: surum });
    expect(h.surumler({ evren })).toEqual([]);
  });
});
