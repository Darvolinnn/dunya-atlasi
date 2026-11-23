import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { metinFarki, sozcukFarki } from '../src/alan/metin-farki';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const sm = metinSemasi.schema;
const belge = (...l: string[]) => sm.node('doc', null, l.map((t) => sm.node('paragraph', null, t ? [sm.text(t)] : [])));

describe('K38: sürüm farkı', () => {
  it('sözcük farkı silineni ve ekleneni ayırır', () => {
    expect(sozcukFarki('merdivenler buz gibiydi.', 'merdivenler her zamankinden soğuktu.')).toEqual([
      { tur: 'ayni', metin: 'merdivenler ' }, { tur: 'sil', metin: 'buz gibiydi.' }, { tur: 'ekle', metin: 'her zamankinden soğuktu.' },
    ]);
  });

  it('paragraflar çapayla eşlenir; değişen, eklenen ve silinen ayrı çıkar', () => {
    const f = metinFarki(['A bir.', 'B iki.', 'C üç.', 'D dört.'], ['A bir.', 'B iki değişti.', 'D dört.', 'E beş.']);
    expect(f.map((x) => x.tur)).toEqual(['ayni', 'degisti', 'silindi', 'ayni', 'eklendi']);
    expect(f[2]).toMatchObject({ tur: 'silindi', eski: 2, yer: 2 });
    expect(f[4]).toMatchObject({ tur: 'eklendi', yeni: 3 });
  });

  it('tek paragraf eski hâline döner, gerisine dokunulmaz; eklenen kaldırılır, silinen geri konur', () => {
    const dosyalar = new Map<string, Database>();
    const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
    const h = new Hizmet(ac, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
    const kayit = h.kayitOlustur({ evren, ad: 'Arşiv', tur: 'sahne' }).kod;
    const yaz = (d: ReturnType<typeof belge>) => h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, d) as never, temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
    const oku = () => { const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never); const l: string[] = []; d.forEach((c) => l.push(c.textContent)); return l; };
    const eski = yaz(belge('Merdivenler buz gibiydi.', 'Lale girdi.', 'Şişe masadaydı.')).basliklar;
    yaz(belge('Merdivenler soğuktu.', 'Lale girdi.', '"Kim?" dedi.'));
    const temel = () => h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
    h.metinParagrafGeriAl({ evren, kayit, alan: 'govde', basliklar: eski, temel: temel(), eski: 0, yeni: 0 });
    expect(oku()).toEqual(['Merdivenler buz gibiydi.', 'Lale girdi.', '"Kim?" dedi.']);
    h.metinParagrafGeriAl({ evren, kayit, alan: 'govde', basliklar: eski, temel: temel(), yeni: 2 });
    expect(oku()).toEqual(['Merdivenler buz gibiydi.', 'Lale girdi.']);
    h.metinParagrafGeriAl({ evren, kayit, alan: 'govde', basliklar: eski, temel: temel(), eski: 2, yer: 2 });
    expect(oku()).toEqual(['Merdivenler buz gibiydi.', 'Lale girdi.', 'Şişe masadaydı.']);
    expect(() => h.metinParagrafGeriAl({ evren, kayit, alan: 'govde', basliklar: eski, temel: eski, eski: 0, yeni: 0 })).toThrow(/değişti/);
  });
});
