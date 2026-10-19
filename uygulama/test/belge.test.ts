import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const sm = metinSemasi.schema;

describe('evren içi belge çıktısı (§11.5)', () => {
  it('biçim, mühür, yer, tarih ve imzalarla sunar; sunum işlemden türetilir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const belge = k('Barış <antlaşması>', 'belge'), kral = k('Kral Aldren', 'karakter'), kralice = k('Kraliçe Mera', 'karakter'), sehir = k('Ardıç', 'sehir');
    h.kayitTarih({ evren, kod: belge, ifade: '1200' });
    const temel = h.metinAc({ evren, kayit: belge, alan: 'govde' }).basliklar;
    h.metinKaydet({ evren, kayit: belge, alan: 'govde', spans: pmNodeToSpans(metinSemasi, sm.node('doc', null, [sm.node('paragraph', null, [sm.text('İki taraf da silahlarını bırakır.')])])) as never, temel });
    expect(h.belgeSunumu({ evren, kod: belge }).sunum.bicim).toBe('mektup');
    h.belgeSunumuYaz({ evren, kod: belge, sunum: { bicim: 'antlasma', yazan: null, alici: null, yer: sehir, muhur: kral, muhurYazisi: '  ', imzalayanlar: [kral, kralice, kral] } });
    const s = h.belgeSunumu({ evren, kod: belge });
    expect(s.sunum.imzalayanlar).toEqual([kral, kralice]);
    expect(s.adlar[sehir]).toBe('Ardıç');
    const { html } = h.belgeCiktisi({ evren, kod: belge });
    expect(html).toContain('<h1>Barış &lt;antlaşması&gt;</h1>');
    expect(html).toContain('Ardıç, 1200');
    expect(html).toContain('<div>Kral Aldren</div><div>Kraliçe Mera</div>');
    expect(html).toContain('class="muhur" aria-label="Mühür">Kral Aldren');
    expect(html).toContain('<p>İki taraf da silahlarını bırakır.</p>');
    expect(() => h.belgeSunumuYaz({ evren, kod: kral, sunum: s.sunum })).toThrow(/belge/);
    expect(() => h.belgeSunumuYaz({ evren, kod: belge, sunum: { ...s.sunum, bicim: 'kitap' as never } })).toThrow(/biçim/);
    expect(() => h.belgeSunumuYaz({ evren, kod: belge, sunum: { ...s.sunum, yazan: 'yok' } })).toThrow(/kayıt/);
    h.belgeSunumuYaz({ evren, kod: belge, sunum: { ...s.sunum, bicim: 'mektup', yazan: kral, alici: kralice, muhurYazisi: 'Aldren' } });
    const m = h.belgeCiktisi({ evren, kod: belge }).html;
    expect(m).toContain('<p>Kraliçe Mera,</p>');
    expect(m).toContain('<div class="imza">Kral Aldren</div>');
    expect(m).toContain('>Aldren</div>');
  });
});
