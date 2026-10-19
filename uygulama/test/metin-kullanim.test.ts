import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Slice } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { Hizmet } from '../src/calisan/hizmet';
import { duzMetin, isaretKodu, metinSemasi } from '../src/alan/metin-sema';
import type { Spans } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}
const sm = metinSemasi.schema;
const paragraf = (...l: string[]) => pmNodeToSpans(metinSemasi, sm.node('doc', null, l.map((p) => sm.node('paragraph', null, p ? [sm.text(p)] : [])))) as Spans;

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const yaz = (k: string, spans: Spans) => h.metinKaydet({ evren, kayit: k, alan: 'govde', spans, temel: h.metinAc({ evren, kayit: k, alan: 'govde' }).basliklar });
  const oku = (k: string) => duzMetin(h.metinAc({ evren, kayit: k, alan: 'govde' }).spans as never);
  const efsane = kayit('Ay kızının efsanesi', 'belge'), sahne = kayit('Ocak başında', 'sahne'), oteki = kayit('Yan kitap: masallar', 'not');
  yaz(efsane, paragraf('Ay kızı göle indi.', 'Göl dondu.'));
  yaz(sahne, paragraf('Ninem anlattı:'));
  /** Editörün yaptığı gibi: parçaları metnin sonuna ekler ve kullanımın koduyla işaretler. */
  const ekle = (k: string, kod: string, spans: Spans) => {
    const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit: k, alan: 'govde' }).spans as never);
    const son = d.content.size - 1;
    let tr = EditorState.create({ doc: d }).tr.replace(son, son, new Slice(pmDocFromSpans(metinSemasi, spans as never).content, 1, 1));
    tr = isaretKodu(tr, son, tr.mapping.map(son, 1), kod, true);
    yaz(k, pmNodeToSpans(metinSemasi, tr.doc) as Spans);
  };
  return { h, evren, kayit, yaz, oku, ekle, efsane, sahne, oteki };
}

describe('metin ile kullanım yeri (F30)', () => {
  it('kaynak editoryal birleşmeyle yönlenince güncelleme korunan kaynağın metnini alır', () => {
    const { h, evren, kayit, yaz, oku, ekle, efsane, sahne } = kur();
    const korunan = kayit('Efsanenin aslı', 'belge');
    yaz(korunan, paragraf('Çiy perisi vadiye indi.'));
    const k = h.metinKullanimOlustur({ evren, kaynak: efsane, hedef: sahne, alan: 'govde', bicim: 'bagli' });
    ekle(sahne, k.kod, k.spans);
    h.birlestir({ evren, kaynak: efsane, hedef: korunan, secimler: {} });
    expect(h.metinKullanimlari({ evren, hedef: sahne })[0].kaynakDegisti).toBe(true);
    h.metinKullanimGuncelle({ evren, kod: k.kod });
    expect(oku(sahne)).toContain('Çiy perisi vadiye indi.');
    expect(oku(sahne)).not.toContain('Ay kızı');
    expect(h.metinKullanimlari({ evren, hedef: sahne })[0].kaynakDegisti).toBe(false);
  });
  it('ortak kaynağa bağlı kullanım kaynağın değiştiğini bildirir ve kaynaktan güncellenir', () => {
    const { h, evren, yaz, oku, ekle, efsane, sahne } = kur();
    const { kod, spans } = h.metinKullanimOlustur({ evren, kaynak: efsane, hedef: sahne, alan: 'govde', bicim: 'bagli' });
    ekle(sahne, kod, spans);
    let [k] = h.metinKullanimlari({ evren, hedef: sahne });
    expect(k).toMatchObject({ kod, bicim: 'bagli', kaynakDegisti: false, ayrildi: false, metinde: true });
    expect(k.kaynak?.kod).toBe(efsane);
    yaz(efsane, paragraf('Ay kızı göle indi.', 'Göl bin yıl dondu.'));
    [k] = h.metinKullanimlari({ evren, hedef: sahne });
    expect(k.kaynakDegisti).toBe(true);
    h.metinKullanimGuncelle({ evren, kod });
    expect(oku(sahne)).toContain('Göl bin yıl dondu.');
    expect(oku(sahne)).toContain('Ninem anlattı:');
    [k] = h.metinKullanimlari({ evren, hedef: sahne });
    expect(k).toMatchObject({ kaynakDegisti: false, ayrildi: false, metinde: true });
    expect(h.metinKullanildigiYerler({ evren, kaynak: efsane }).map((x) => x.hedef.kod)).toEqual([sahne]);
  });

  it('kopya ve türev kaynağı izlemez; bağlı kullanım türeve çevrilebilir', () => {
    const { h, evren, yaz, ekle, efsane, sahne } = kur();
    const a = h.metinKullanimOlustur({ evren, kaynak: efsane, hedef: sahne, alan: 'govde', bicim: 'kopya' });
    ekle(sahne, a.kod, a.spans);
    yaz(efsane, paragraf('Başka bir efsane.'));
    const [k] = h.metinKullanimlari({ evren, hedef: sahne });
    expect(k).toMatchObject({ bicim: 'kopya', kaynakDegisti: false, ayrildi: false, metinde: true });
    expect(() => h.metinKullanimGuncelle({ evren, kod: a.kod })).toThrow('ortak kaynağa bağlı');
    const b = h.metinKullanimOlustur({ evren, kaynak: efsane, hedef: sahne, alan: 'govde', bicim: 'bagli' });
    h.metinKullanimTurev({ evren, kod: b.kod });
    expect(h.metinKullanimlari({ evren, hedef: sahne }).find((x) => x.kod === b.kod)?.bicim).toBe('turev');
    expect(() => h.metinKullanimOlustur({ evren, kaynak: sahne, hedef: sahne, alan: 'govde', bicim: 'kopya' })).toThrow('kendi içine');
  });

  it('taşıma kullanımı kodu ve biçimiyle öbür metne götürür, metin buradan çıkar', () => {
    const { h, evren, oku, ekle, efsane, sahne, oteki } = kur();
    const { kod, spans } = h.metinKullanimOlustur({ evren, kaynak: efsane, hedef: sahne, alan: 'govde', bicim: 'bagli' });
    ekle(sahne, kod, spans);
    h.metinKullanimTasi({ evren, kod, hedef: oteki });
    expect(oku(sahne)).not.toContain('Ay kızı');
    expect(oku(sahne)).toContain('Ninem anlattı:');
    expect(oku(oteki)).toContain('Göl dondu.');
    expect(h.metinKullanimlari({ evren, hedef: sahne })).toEqual([]);
    const [k] = h.metinKullanimlari({ evren, hedef: oteki });
    expect(k).toMatchObject({ kod, bicim: 'bagli', metinde: true, ayrildi: false });
    h.metinKullanimSil({ evren, kod });
    expect(h.metinKullanildigiYerler({ evren, kaynak: efsane })).toEqual([]);
    expect(oku(oteki)).toContain('Göl dondu.');
  });
});
