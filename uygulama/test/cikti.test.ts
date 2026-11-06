import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { zipOku } from '../src/alan/zip';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const sm = metinSemasi.schema;
const yaz = (h: Hizmet, evren: string, kayit: string, ...paragraflar: (string | [string, string])[][]) => {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  const doc = sm.node('doc', null, paragraflar.map((p) => sm.node('paragraph', null, p.map((x) => typeof x === 'string' ? sm.text(x) : sm.text(x[0], [sm.mark('bag', { hedef: x[1] })])))));
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, doc) as never, temel });
};
const metin = (m: Map<string, Uint8Array>, ad: string) => new TextDecoder().decode(m.get(ad)!);

describe('okunabilir dışa aktarma (§10.11)', () => {
  it('Markdown: her kayıt bir dosya, bağlantılar [[Ad]], ilişkiler ve kayıplar yazılır', async () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kral = h.kayitOlustur({ evren, ad: 'Kral Aldren', tur: 'karakter', ozet: 'Yaşlı kral' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' });
    yaz(h, evren, kral, ['Kral ', ['kalesinde', kale], ' yaşar & *bekler*.']);
    h.iliskiEkle({ evren, tur: 'parca', a: kale, b: kral });
    const r = await h.markdownDisaAktar({ evren });
    expect(r.kayitSayisi).toBe(3);
    const m = await zipOku(r.veri);
    expect([...m.keys()].sort()).toEqual(['Karakter/Kral Aldren.md', 'Mekân/Kuzey Kalesi (2).md', 'Mekân/Kuzey Kalesi.md', 'OKUBENI.md']);
    const k = metin(m, 'Karakter/Kral Aldren.md');
    expect(k).toContain('tur: Karakter');
    expect(k).toContain('ozet: Yaşlı kral');
    expect(k).toContain('Kral [[Kuzey Kalesi|kalesinde]] yaşar & \\*bekler\\*.');
    expect(k).toContain('## İlişkiler');
    expect(metin(m, 'OKUBENI.md')).toContain('Tarihli inançlar');
  });

  it('EPUB: bölümler ve sahneler sırayla; vazgeçilmiş sahne girmez; metin kaçışlı', async () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const eser = h.kayitOlustur({ evren, ad: 'Kuzeyin <Kitabı>', tur: 'eser' }).kod;
    const { kod: b1 } = h.anlatiOlustur({ evren, ust: eser, ad: 'Birinci bölüm', tur: 'bolum' });
    const { kod: s1 } = h.anlatiOlustur({ evren, ust: b1, ad: 'Sahne bir', tur: 'sahne' });
    const { kod: s2 } = h.anlatiOlustur({ evren, ust: b1, ad: 'Sahne iki', tur: 'sahne' });
    const { kod: s3 } = h.anlatiOlustur({ evren, ust: b1, ad: 'Atılan', tur: 'sahne' });
    yaz(h, evren, s1, ['Kar yağıyordu & rüzgâr <esiyordu>.']);
    yaz(h, evren, s2, ['Sabah oldu.']);
    yaz(h, evren, s3, ['Bu girmemeli.']);
    h.kayitDegistir({ evren, kod: s3, alan: 'karar', deger: 'vazgecildi' });
    const { dosyaAdi, veri } = await h.epubYaz({ evren, eser });
    expect(dosyaAdi).toBe('kuzeyin-kitabi.epub');
    // mimetype ilk dosya ve sıkıştırılmamış olmalı.
    expect(new TextDecoder().decode(veri.slice(30, 38))).toBe('mimetype');
    expect(new DataView(veri.buffer, veri.byteOffset).getUint16(8, true)).toBe(0);
    const m = await zipOku(veri);
    expect(metin(m, 'mimetype')).toBe('application/epub+zip');
    expect(metin(m, 'OEBPS/icerik.opf')).toContain('<dc:title>Kuzeyin &lt;Kitabı&gt;</dc:title>');
    const b = metin(m, 'OEBPS/bolum-001.xhtml');
    expect(b).toContain('<h2>Birinci bölüm</h2>');
    expect(b).toContain('<p>Kar yağıyordu &amp; rüzgâr &lt;esiyordu&gt;.</p>\n<hr class="ara"/>\n<p>Sabah oldu.</p>');
    expect(b).not.toContain('girmemeli');
    expect(h.eserBaskiSayfasi({ evren, eser, sahneBasliklari: true }).html).toContain('<h3>Sahne bir</h3>');
  });

  it('seçimli çıktı: yalnız seçilen sahneler; seçili sahnesi olmayan bölüm yazılmaz; ağaçta çalışma durumu', async () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const eser = h.kayitOlustur({ evren, ad: 'Fener', tur: 'eser' }).kod;
    const { kod: b1 } = h.anlatiOlustur({ evren, ust: eser, ad: 'Birinci', tur: 'bolum' });
    const { kod: b2 } = h.anlatiOlustur({ evren, ust: eser, ad: 'İkinci', tur: 'bolum' });
    const { kod: s1 } = h.anlatiOlustur({ evren, ust: b1, ad: 'Bir', tur: 'sahne' });
    const { kod: s2 } = h.anlatiOlustur({ evren, ust: b1, ad: 'İki', tur: 'sahne' });
    const { kod: s3 } = h.anlatiOlustur({ evren, ust: b2, ad: 'Üç', tur: 'sahne' });
    const { kod: s4 } = h.anlatiOlustur({ evren, ust: b2, ad: 'Boş', tur: 'sahne' });
    yaz(h, evren, s1, ['Birinci metin.']); yaz(h, evren, s2, ['İkinci metin.']); yaz(h, evren, s3, ['Üçüncü metin.']);
    h.kayitAlanYaz({ evren, kod: s1, alan: 'calisma', deger: 'gozden_gecirildi' });
    const agac = h.ciktiAgaci({ evren, eser });
    expect(agac.bolumler.map((b) => b.ad)).toEqual(['Birinci', 'İkinci']);
    expect(agac.bolumler[0].sahneler.map((x) => [x.ad, x.calisma, x.metinli])).toEqual([['Bir', 'gozden_gecirildi', true], ['İki', null, true]]);
    expect(agac.bolumler[1].sahneler.find((x) => x.kod === s4)!.metinli).toBe(false);

    const html = h.eserBaskiSayfasi({ evren, eser, sahneler: [s1, s4] }).html;
    expect(html).toContain('Birinci metin.');
    expect(html).not.toContain('İkinci metin.');
    expect(html).not.toContain('<h2>İkinci</h2>');
    const m = await zipOku((await h.epubYaz({ evren, eser, sahneler: [s3] })).veri);
    expect(metin(m, 'OEBPS/bolum-001.xhtml')).toContain('<h2>İkinci</h2>');
    expect(m.has('OEBPS/bolum-002.xhtml')).toBe(false);
    expect(() => h.eserBaskiSayfasi({ evren, eser, sahneler: [] })).toThrow('Çıktıya girecek sahne seçilmedi.');
    expect(() => h.eserBaskiSayfasi({ evren, eser, sahneler: [s4] })).toThrow('Seçtiğiniz sahnelerde metin yok.');
    // PDF ve Word aynı okuma düzenini kullanır: seçim onlara da uygulanır.
    const k = h.eserKitabi({ evren, eser, sahneler: [s2, s3] }).kitap;
    expect(k.bolumler.map((b) => [b.baslik, b.sahneler.length])).toEqual([['Birinci', 1], ['İkinci', 1]]);
    expect(JSON.stringify(k)).not.toContain('Birinci metin.');
    expect(h.eserKitabi({ evren, eser, sahneler: [s1] }).kitap.bolumler.map((b) => b.baslik)).toEqual(['Birinci']);
    expect(() => h.eserKitabi({ evren, eser, sahneler: [s4] })).toThrow('Seçtiğiniz sahnelerde metin yok.');
    const w = await zipOku((await h.docxYaz({ evren, eser, sahneler: [s3] })).veri);
    const belge = new TextDecoder().decode(w.get('word/document.xml'));
    expect(belge).toContain('Üçüncü metin.');
    expect(belge).not.toContain('Birinci metin.');
    // Süzgeçsiz çıktı değişmedi: iki bölüm de yazılır.
    expect(h.eserBaskiSayfasi({ evren, eser }).html).toContain('<h2>İkinci</h2>');
  });
});
