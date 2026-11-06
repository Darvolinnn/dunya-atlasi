import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { zipOku } from '../src/alan/zip';
import { pdfYaz, type YaziTipleri } from '../src/alan/pdf';
import type { Kitap } from '../src/alan/kitap';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}
const sm = metinSemasi.schema;
type P = string | { m: string; k?: boolean; e?: boolean };
const yaz = (h: Hizmet, evren: string, kayit: string, bloklar: { tur?: 'h' | 'q'; p: P[] }[]) => {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  const ic = (p: P[]) => p.map((x) => typeof x === 'string' ? sm.text(x) : sm.text(x.m, [...(x.k ? [sm.mark('strong')] : []), ...(x.e ? [sm.mark('em')] : [])]));
  const doc = sm.node('doc', null, bloklar.map((b) => b.tur === 'h' ? sm.node('heading', { level: 2 }, ic(b.p))
    : b.tur === 'q' ? sm.node('blockquote', null, [sm.node('paragraph', null, ic(b.p))]) : sm.node('paragraph', null, ic(b.p))));
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, doc) as never, temel });
};
const kok = createRequire(import.meta.url).resolve('@expo-google-fonts/literata/package.json').replace(/package\.json$/, '');
const yt: YaziTipleri = {
  duz: readFileSync(kok + '400Regular/Literata_400Regular.ttf'), egik: readFileSync(kok + '400Regular_Italic/Literata_400Regular_Italic.ttf'),
  kalin: readFileSync(kok + '700Bold/Literata_700Bold.ttf'), kalinEgik: readFileSync(kok + '700Bold_Italic/Literata_700Bold_Italic.ttf'),
};

function eser() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
  const eser = h.kayitOlustur({ evren, ad: 'Şeyh Ağa & <Kızı>', tur: 'eser' }).kod;
  h.kayitOlustur({ evren, ad: 'Dünya kaydı', tur: 'karakter' });
  const { kod: b1 } = h.anlatiOlustur({ evren, ust: eser, ad: 'Birinci bölüm', tur: 'bolum' });
  const { kod: s1 } = h.anlatiOlustur({ evren, ust: b1, ad: 'Sahne bir', tur: 'sahne' });
  const { kod: s2 } = h.anlatiOlustur({ evren, ust: b1, ad: 'Sahne iki', tur: 'sahne' });
  const { kod: s3 } = h.anlatiOlustur({ evren, ust: b1, ad: 'Atılan', tur: 'sahne' });
  yaz(h, evren, s1, [{ p: ['Çığ düştü; ılık İstanbul öğleni şöyle ', { m: 'kalın', k: true }, ' ve ', { m: 'eğik', e: true }, '.'] }, { p: ['Ikinci paragraf.'] }, { tur: 'q', p: ['Alıntı.'] }]);
  yaz(h, evren, s2, [{ tur: 'h', p: ['Ara başlık'] }, { p: ['Sabah oldu. '.repeat(400)] }]);
  yaz(h, evren, s3, [{ p: ['Bu girmemeli.'] }]);
  h.kayitDegistir({ evren, kod: s3, alan: 'karar', deger: 'vazgecildi' });
  return { h, evren, eser };
}

describe('eserin PDF ve Word çıktısı (§10.11)', () => {
  it('okuma düzeni: yalnız eserin metni; vazgeçilen girmez; biçim korunur', () => {
    const { h, evren, eser: e } = eser();
    const { kitap, dosyaKoku } = h.eserKitabi({ evren, eser: e, sahneBasliklari: true });
    expect(dosyaKoku).toBe('seyh-aga-kizi');
    expect(kitap.bolumler.map((b) => b.baslik)).toEqual(['Birinci bölüm']);
    expect(kitap.bolumler[0].sahneler.map((s) => s.baslik)).toEqual(['Sahne bir', 'Sahne iki']);
    const [p1, , q] = kitap.bolumler[0].sahneler[0].bloklar;
    expect(p1.parcalar).toEqual([{ metin: 'Çığ düştü; ılık İstanbul öğleni şöyle ' }, { metin: 'kalın', kalin: true }, { metin: ' ve ' }, { metin: 'eğik', egik: true }, { metin: '.' }]);
    expect(q.tur).toBe('alinti');
    expect(kitap.bolumler[0].sahneler[1].bloklar[0].tur).toBe('baslik');
    expect(JSON.stringify(kitap)).not.toContain('girmemeli');
  });

  it('Word: geçerli paket, Türkçe metin, bölüm başlığı, ayraç, kaçış', async () => {
    const { h, evren, eser: e } = eser();
    const { dosyaAdi, veri } = await h.docxYaz({ evren, eser: e });
    expect(dosyaAdi).toBe('seyh-aga-kizi.docx');
    const m = await zipOku(veri);
    for (const d of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels', 'word/footer1.xml']) expect(m.has(d)).toBe(true);
    const d = new TextDecoder().decode(m.get('word/document.xml'));
    expect(d).toContain('Şeyh Ağa &amp; &lt;Kızı&gt;');
    expect(d).toContain('<w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">Birinci bölüm</w:t>');
    expect(d).toContain('<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">kalın</w:t></w:r>');
    expect(d).toContain('* * *');
    expect(d).toContain('<w:pStyle w:val="Alinti"/>');
    expect(d).not.toContain('girmemeli');
    expect(d).not.toContain('Dünya kaydı');
    expect(new TextDecoder().decode(m.get('word/styles.xml'))).toContain('tr-TR');
  });

  it('PDF: yazı tipi gömülü, sayfalara bölünür, Türkçe harfler metin olarak çıkar', async () => {
    const { h, evren, eser: e } = eser();
    const { kitap } = h.eserKitabi({ evren, eser: e, sahneBasliklari: true });
    const veri = await pdfYaz(kitap, yt, new Date(0));
    expect(new TextDecoder().decode(veri.slice(0, 5))).toBe('%PDF-');
    const d = await PDFDocument.load(veri);
    expect(d.getTitle()).toBe('Şeyh Ağa & <Kızı>');
    expect(d.getPageCount()).toBeGreaterThan(4); // kapak + uzun bölüm
    const sozluk = d.context.enumerateIndirectObjects().map(([, o]) => o).filter((o): o is PDFDict => o instanceof PDFDict);
    expect(sozluk.filter((o) => o.has(PDFName.of('FontFile2'))).length).toBe(4);
    expect(sozluk.filter((o) => o.has(PDFName.of('ToUnicode'))).length).toBe(4);
  });

  it('PDF: çok uzun kelime, satır sonu ve boş olmayan tek bölüm', async () => {
    const k: Kitap = { ad: 'A'.repeat(300), bolumler: [{ baslik: 'B', sahneler: [{ baslik: null, bloklar: [{ tur: 'paragraf', parcalar: [{ metin: 'x'.repeat(2000) + '\nyeni satır\tsekme' }] }] }] }] };
    const veri = await pdfYaz(k, yt);
    expect((await PDFDocument.load(veri)).getPageCount()).toBeGreaterThan(1);
    if (process.env.PDF_ORNEK) {
      const { h, evren, eser: e } = eser();
      const { writeFileSync } = await import('node:fs');
      writeFileSync(process.env.PDF_ORNEK, await pdfYaz(h.eserKitabi({ evren, eser: e, sahneBasliklari: true }).kitap, yt));
      writeFileSync(process.env.PDF_ORNEK.replace(/\.pdf$/, '.docx'), (await h.docxYaz({ evren, eser: e, sahneBasliklari: true })).veri);
    }
  });
});
