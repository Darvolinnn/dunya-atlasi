// Alternatifler (K27, Model §4.2): aynı türden iki kayıt birbirinin alternatifi diye bağlanır. Biri kesinleşince
// öbürü kendiliğinden değişmez; ikisi de kesinleşirse Uyarılar'da bulgu çıkar. Örnekler uydurmadır.
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
  return { h, evren };
}

describe('alternatifler (K27)', () => {
  it('aynı türden kayıtlar bağlanır; kesinleşme öbürünü değiştirmez; ikisi kesinse bulgu çıkar', () => {
    const { h, evren } = kur();
    const a = h.kayitOlustur({ evren, ad: 'Anı vergisi kaldırılır', tur: 'olay', karar: 'fikir' } as never).kod;
    const b = h.kayitOlustur({ evren, ad: 'Vergi halka devredilir', tur: 'olay', karar: 'fikir' } as never).kod;
    const lale = h.kayitOlustur({ evren, ad: 'Lale', tur: 'karakter' }).kod;
    expect(() => h.iliskiEkle({ evren, a, b: lale, tur: 'alternatif' })).toThrow('aynı türden');
    h.iliskiEkle({ evren, a, b, tur: 'alternatif' });
    expect(h.alternatifler({ evren, kod: a }).map((x) => x.ad)).toEqual(['Vergi halka devredilir']);
    expect(h.alternatifler({ evren, kod: b }).map((x) => x.ad)).toEqual(['Anı vergisi kaldırılır']);
    h.kayitDegistir({ evren, kod: b, alan: 'karar', deger: 'kesin' });
    expect(h.alternatifler({ evren, kod: b })[0].karar).not.toBe('vazgecildi');
    const kural = () => h.denetimler({ evren }).kurallar.find((k) => k.kural === 'alternatif')!;
    expect(kural()).toMatchObject({ sonuc: expect.stringMatching(/sorun_yok/) });
    h.kayitDegistir({ evren, kod: a, alan: 'karar', deger: 'kesin' });
    expect(kural().sonuc).toBe('bulgu_var');
    const bulgu = h.denetimler({ evren }).acik.find((x) => x.kural === 'alternatif')!;
    expect(bulgu.kayitlar.map((k) => k.ad).sort()).toEqual(['Anı vergisi kaldırılır', 'Vergi halka devredilir']);
    h.kayitDegistir({ evren, kod: a, alan: 'karar', deger: 'vazgecildi' });
    expect(kural().sonuc).toBe('sorun_yok');
  });
});
