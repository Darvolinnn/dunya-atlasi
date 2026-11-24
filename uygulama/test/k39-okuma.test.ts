// Kesintisiz okuma (K39, öneri 1). Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { duzMetindenSpans } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

describe('kesintisiz okuma (K39)', () => {
  it('eserde bütün sahneler okuma sırasıyla, bölümde yalnız o bölüm', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const b1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Vergi Günü', tur: 'bolum' }).kod;
    const b2 = h.anlatiOlustur({ evren, ust: eser, ad: 'Şişe', tur: 'bolum' }).kod;
    const s = (ad: string, ust: string, metin: string) => {
      const k = h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
      if (metin) { const m = h.metinAc({ evren, kayit: k, alan: 'govde' }); h.metinKaydet({ evren, kayit: k, alan: 'govde', spans: duzMetindenSpans(metin), temel: m.basliklar }); }
      return k;
    };
    s('Arşiv', b1, 'Merdivenler soğuktu.'); s('Kaçakçılar', b2, ''); s('Mühür', b2, 'Mühür kırıktı.');
    const l = h.okumaMetni({ evren, kapsam: eser });
    expect(l.map((x) => [x.bolum?.ad, x.sahne.ad])).toEqual([['Vergi Günü', 'Arşiv'], ['Şişe', 'Kaçakçılar'], ['Şişe', 'Mühür']]);
    expect(JSON.stringify(l[0].spans)).toContain('Merdivenler soğuktu.');
    expect(h.okumaMetni({ evren, kapsam: b2 }).map((x) => x.sahne.ad)).toEqual(['Kaçakçılar', 'Mühür']);
  });
});
