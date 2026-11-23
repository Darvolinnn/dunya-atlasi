import { describe, it, expect } from 'vitest';
import { siraSayisi, gorunumDuzelt, VARSAYILAN_GORUNUM } from '../src/alan/kitap';

describe('K38: kitap görünümü', () => {
  it('sıra sayısı yazıyla', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21, 30, 40, 50, 60, 70, 80, 90, 100, 112].map(siraSayisi)).toEqual([
      'Birinci', 'İkinci', 'Üçüncü', 'Dördüncü', 'Beşinci', 'Altıncı', 'Yedinci', 'Sekizinci', 'Dokuzuncu', 'Onuncu', 'Yirminci', 'Yirmi birinci',
      'Otuzuncu', 'Kırkıncı', 'Ellinci', 'Altmışıncı', 'Yetmişinci', 'Sekseninci', 'Doksanıncı', 'Yüzüncü', 'Yüz on ikinci',
    ]);
  });
  it('bozuk ayar varsayılana döner', () => {
    expect(gorunumDuzelt(null)).toEqual(VARSAYILAN_GORUNUM);
    expect(gorunumDuzelt({ ayrac: 'x', basHarf: 'evet', kapak: '../a', icindekiler: 'sahneler' })).toEqual({ ...VARSAYILAN_GORUNUM, icindekiler: 'sahneler' });
  });
});

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { PDFDocument } from 'pdf-lib';
import { beforeAll } from 'vitest';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { metinSemasi } from '../src/alan/metin-sema';
import { zipOku } from '../src/alan/zip';
import { pdfYaz, type YaziTipleri } from '../src/alan/pdf';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const kok = createRequire(import.meta.url).resolve('@expo-google-fonts/literata/package.json').replace(/package\.json$/, '');
const yt: YaziTipleri = {
  duz: readFileSync(kok + '400Regular/Literata_400Regular.ttf'), egik: readFileSync(kok + '400Regular_Italic/Literata_400Regular_Italic.ttf'),
  kalin: readFileSync(kok + '700Bold/Literata_700Bold.ttf'), kalinEgik: readFileSync(kok + '700Bold_Italic/Literata_700Bold_Italic.ttf'),
};
/** Tek renkli küçük PNG. */
function png(en: number, boy: number, [r, g, b]: number[]) {
  const crc = (v: Uint8Array) => { let c = ~0; for (const x of v) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const parca = (tur: string, veri: Uint8Array) => {
    const t = new Uint8Array([...tur].map((c) => c.charCodeAt(0)));
    const v = new Uint8Array(12 + veri.length); const d = new DataView(v.buffer);
    d.setUint32(0, veri.length); v.set(t, 4); v.set(veri, 8); d.setUint32(8 + veri.length, crc(v.subarray(4, 8 + veri.length)));
    return v;
  };
  const ihdr = new Uint8Array(13); const d = new DataView(ihdr.buffer); d.setUint32(0, en); d.setUint32(4, boy); ihdr.set([8, 2, 0, 0, 0], 8);
  const satir = new Uint8Array(1 + en * 3); for (let i = 0; i < en; i++) satir.set([r, g, b], 1 + i * 3);
  const ham = new Uint8Array(satir.length * boy); for (let j = 0; j < boy; j++) ham.set(satir, j * satir.length);
  return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...parca('IHDR', ihdr), ...parca('IDAT', deflateSync(ham)), ...parca('IEND', new Uint8Array())]);
}
const isleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 40, boy: 60, onizleme: null });

describe('K38: kitap görünümü çıktılarda', () => {
  it('ayarlar eser başına saklanır; PDF, Word ve EPUB kapak, bölüm başı, ayraç, içindekiler ve ekleri kullanır', async () => {
    const dosyalar = new Map<string, Database>();
    const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
    const h = new Hizmet(ac, 'Deneme', 'x', () => {}, new BellekDeposu(), isleyici);
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const lale = h.kayitOlustur({ evren, ad: 'Lale', tur: 'karakter', ozet: 'Arşivin kâtibi.' }).kod;
    h.kayitOlustur({ evren, ad: 'Deniz', tur: 'karakter', ozet: 'Hiç geçmiyor.' });
    h.kayitOlustur({ evren, ad: 'Velaşin', tur: 'terim', ozet: 'Unutma yemini.' });
    const sm = metinSemasi.schema;
    const yaz = (k: string, l: string[]) => h.metinKaydet({ evren, kayit: k, alan: 'govde', temel: h.metinAc({ evren, kayit: k, alan: 'govde' }).basliklar,
      spans: pmNodeToSpans(metinSemasi, sm.node('doc', null, l.map((t) => sm.node('paragraph', null, [sm.text(t)])))) as never });
    const b1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Vergi Günü', tur: 'bolum' }).kod;
    const b2 = h.anlatiOlustur({ evren, ust: eser, ad: 'Mühür', tur: 'bolum' }).kod;
    const s1 = h.anlatiOlustur({ evren, ust: b1, ad: 'Arşiv', tur: 'sahne' }).kod;
    const s2 = h.anlatiOlustur({ evren, ust: b1, ad: 'Merdiven', tur: 'sahne' }).kod;
    const s3 = h.anlatiOlustur({ evren, ust: b2, ad: 'Divan', tur: 'sahne' }).kod;
    yaz(s1, ['Vergi günü arşivin taş merdivenleri her zamankinden soğuktu. Lale dosyayı üçüncü kez istedi.', 'Kâtip başını kaldırmadı.']);
    yaz(s2, ['Velaşin edenler unutmaz, derlerdi.']);
    yaz(s3, ['Divan toplandı. '.repeat(30)]);
    void lale;
    const { ad: kapak } = await h.gorselEkle({ evren, kod: eser, dosyaAdi: 'kapak.png', tur: 'image/png', veri: png(40, 60, [60, 44, 26]) });
    const harita = (await h.haritaYukle({ evren, ad: 'Başkent planı', dosyaAdi: 'plan.png', tur: 'image/png', veri: png(40, 60, [200, 190, 160]) })).kod;
    const secenek = h.kitapGorunumu({ evren, eser });
    expect(secenek.gorunum.ayrac).toBe('uc-yildiz');
    expect(secenek.gorseller.map((x) => x.gorsel)).toContain(kapak);
    expect(secenek.haritalar.map((x) => x.kod)).toContain(harita);
    expect(secenek.sayilar).toEqual({ kisiler: 1, terimler: 1 });
    h.kitapGorunumuYaz({ evren, eser, gorunum: { kapak, basHarf: true, sus: true, bolumYaziyla: true, ayrac: 'yildizlar', icindekiler: 'sahneler', kisiler: true, terimler: true, takvim: true, harita } });
    expect(h.kitapGorunumu({ evren, eser }).gorunum).toMatchObject({ kapak, ayrac: 'yildizlar', harita });

    const { kitap } = await h.eserKitabi({ evren, eser });
    expect(kitap.bolumler.map((b) => b.numara)).toEqual(['Birinci Bölüm', 'İkinci Bölüm']);
    expect(kitap.kapak?.tur).toBe('image/png');
    expect(kitap.ekler!.map((x) => x.baslik)).toEqual(['Kişiler', 'Terimler', 'Takvim', 'Başkent planı']);
    expect(kitap.ekler![0].girdiler).toEqual([{ ad: 'Lale', aciklama: 'Arşivin kâtibi.' }]);
    const veri = await pdfYaz(kitap, yt, new Date(0));
    const pdf = await PDFDocument.load(veri);
    // görsel kapak + ad sayfası + içindekiler + 2 bölüm + 4 ek
    expect(pdf.getPageCount()).toBe(9);
    if (process.env.PDF_ORNEK) writeFileSync(process.env.PDF_ORNEK, veri);

    const w = await zipOku((await h.docxYaz({ evren, eser })).veri);
    const belge = new TextDecoder().decode(w.get('word/document.xml'));
    expect(belge).toContain('Birinci Bölüm');
    expect(belge).toContain('w:dropCap="drop"');
    expect(belge).toContain('⁂');
    expect(belge).toContain('TOC \\o');
    expect(belge).toContain('Arşivin kâtibi.');
    expect([...w.keys()].some((k) => k.startsWith('word/media/'))).toBe(true);

    const e = await zipOku((await h.epubYaz({ evren, eser })).veri);
    const opf = new TextDecoder().decode(e.get('OEBPS/icerik.opf'));
    expect(opf).toContain('properties="cover-image"');
    expect(opf).toContain('<itemref idref="nav"/>');
    const b = new TextDecoder().decode(e.get('OEBPS/bolum-001.xhtml'));
    expect(b).toContain('<p class="numara">Birinci Bölüm</p>');
    expect(b).toContain('<p class="sus">❦</p>');
    expect(b).toContain('<p class="bas-harf">');
    expect(b).toContain('<p class="ayrac">⁂</p>');
    expect(new TextDecoder().decode(e.get('OEBPS/icindekiler.xhtml'))).toContain('#s2">Merdiven</a>');
    expect(new TextDecoder().decode(e.get('OEBPS/ek-1.xhtml'))).toContain('<dt>Lale</dt>');
  });
});
