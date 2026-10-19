// "İlk adımlar" (K26): adımlar kaydedilmiş veriden anlaşılır. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const s = metinSemasi.schema;

describe('ilk adımlar (K26)', () => {
  it('eser, sahne, metinde bağlantı ve sahnenin tarihi sırayla işaretlenir', () => {
    const d = new Map<string, Database>();
    const h = new Hizmet((x) => { let db = d.get(x); if (!db) { db = new sqlite3.oo1.DB(':memory:'); d.set(x, db); } return db; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const adim = () => h.ilkAdimlar({ evren });
    expect(adim()).toEqual({ eser: false, sahne: false, baglanti: false, baglam: false });
    h.kayitOlustur({ evren, ad: 'Kuzey Yolu', tur: 'eser' });
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    expect(adim()).toMatchObject({ eser: true, sahne: false });
    const sahne = h.kayitOlustur({ evren, ad: 'Kuşatma', tur: 'sahne' }).kod;
    expect(adim()).toMatchObject({ sahne: true, baglanti: false });
    h.metinKaydet({ evren, kayit: sahne, alan: 'govde', temel: h.metinAc({ evren, kayit: sahne, alan: 'govde' }).basliklar,
      spans: pmNodeToSpans(metinSemasi, s.node('doc', null, [s.node('paragraph', null, [s.text('Elin', [s.mark('bag', { hedef: elin })]), s.text(' kapıda bekledi.')])])) as never });
    expect(adim()).toMatchObject({ baglanti: true, baglam: false });
    h.kayitTarih({ evren, kod: sahne, ifade: '412' });
    expect(adim()).toEqual({ eser: true, sahne: true, baglanti: true, baglam: true });
  });
});
