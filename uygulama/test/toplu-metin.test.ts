// Metnin toplu uygulanması (§10.1): baştan kurmada ve dışarıdan almada bir metin alanının değişiklikleri birlikte
// uygulanır. Sonuç, değişiklikleri tek tek uygulamakla aynı olmalı. Örnek adlar uydurmadır.
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
  return new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, ad, 'x');
}
const sm = metinSemasi.schema;
/** Parça: düz metin, [metin, bağlı kayıt] ya da [metin, null, işaret]. */
type Parca = string | [string, string | null, string?];
const spans = (...paragraflar: Parca[][]) => pmNodeToSpans(metinSemasi, sm.node('doc', null, paragraflar.map((p) => sm.node('paragraph', null,
  p.map((x) => typeof x === 'string' ? sm.text(x)
    : sm.text(x[0], [...(x[1] ? [sm.mark('bag', { hedef: x[1] })] : []), ...(x[2] ? [sm.mark('isaret', { kodlar: x[2] })] : [])])))))) as never;
const yaz = (h: Hizmet, evren: string, kayit: string, ...p: Parca[][]) =>
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: spans(...p), temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
const esitle = (a: Hizmet, b: Hizmet, evren: string) => {
  const ab = a.islemleriVer({ evren, gorulen: b.gorulenler({ evren }) });
  const ba = b.islemleriVer({ evren, gorulen: a.gorulenler({ evren }) });
  b.islemleriAl({ evren, islemler: ab });
  a.islemleriAl({ evren, islemler: ba });
};
const vt = (h: Hizmet, evren: string) => (h as unknown as { evren(k: string): { db: Database; yenidenKur(): void } }).evren(evren);
/** Metinden türeyen bütün tablolar ve kayıtların düzenleme zamanı. */
const goruntu = (h: Hizmet, evren: string) => {
  const db = vt(h, evren).db;
  const q = (sql: string) => db.selectObjects(sql);
  return {
    metinler: q('SELECT kayit, alan, duz, katli, duzenleme FROM metinler ORDER BY kayit, alan'),
    baglantilar: q('SELECT kaynak, alan, sira, hedef, metin FROM baglantilar ORDER BY kaynak, alan, sira'),
    isaretYerleri: q('SELECT kayit, alan, sira, isaret, metin FROM metin_isaret_yerleri ORDER BY kayit, alan, sira'),
    isaretler: q('SELECT kod, metin FROM metin_isaretleri ORDER BY kod'),
    yazanlar: q('SELECT kayit, alan, islem FROM metin_yazanlari ORDER BY kayit, alan, islem'),
    catismalar: q('SELECT kayit, alan, a, b FROM metin_catismalari ORDER BY kayit, alan, a, b'),
    kayitlar: q('SELECT kod, duzenleme FROM kayitlar ORDER BY kod'),
  };
};

describe('metnin toplu uygulanması (§10.1)', () => {
  it('baştan kurma ve yeni cihaz, değişiklikleri tek tek uygulamakla aynı sonucu verir', () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const t = cihaz('Tablet');
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    const elin = m.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const kale = m.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    // Bellekte tutulan metin sayısından fazla sahne: eski belgeler diskten yeniden okunur.
    const sahneler = Array.from({ length: 40 }, (_, i) => m.kayitOlustur({ evren, ad: `Sahne ${i}`, tur: 'sahne' }).kod);
    for (let tur = 0; tur < 3; tur++) {
      sahneler.forEach((s, i) => {
        yaz(m, evren, s, [`Tur ${tur}, sahne ${i}. `, ['Elin', elin], ' kapıda bekledi.'], [['Kuzey Kalesi', kale], ' sisler içindeydi.']);
        if (i % 7 === 0) m.kayitDegistir({ evren, kod: s, alan: 'ozet', deger: `Özet ${tur}` }); // düzenleme sırası
      });
    }
    // İşaretli cümle: işaret metinde görünmeden önce oluşturulur; ilk görülen hâli korunur.
    const s0 = sahneler[0];
    yaz(m, evren, s0, ['Önce düz bir cümle.']);
    const { kod: isaret } = m.metinIsaretiOlustur({ evren, kayit: s0, alan: 'govde', hedef: elin, iddia: 'Elin kapıda' });
    yaz(m, evren, s0, ['Önce düz bir cümle.']);
    yaz(m, evren, s0, [['Elin kapıda bekliyordu', null, isaret], '.']);
    yaz(m, evren, s0, [['Elin kapıda uyuyakaldı', null, isaret], '.']);
    // İki cihazda aynı paragraf: biri çözülen, biri açık kalan metin çatışması.
    const s1 = sahneler[1], s2 = sahneler[2];
    esitle(m, t, evren);
    yaz(m, evren, s1, ['Masaüstü sürümü.'], ['Ortak paragraf.']);
    yaz(t, evren, s1, ['Tablet sürümü.'], ['Ortak paragraf.']);
    yaz(m, evren, s2, ['Masaüstünde ikinci.']);
    yaz(t, evren, s2, ['Tablette ikinci.']);
    esitle(m, t, evren);
    expect(m.catismalar({ evren }).filter((c) => c.tur === 'metin')).toHaveLength(2);
    m.metinCatismasiCoz({ evren, kayit: s1, alan: 'govde' });
    for (let i = 0; i < 5; i++) yaz(m, evren, s1, [`Çözümden sonra ${i}.`], ['Ortak paragraf.']);
    esitle(m, t, evren);

    const asil = goruntu(m, evren);
    expect(asil.isaretler).toEqual([{ kod: isaret, metin: 'Elin kapıda bekliyordu' }]);
    expect(asil.catismalar).toHaveLength(1);
    expect(asil.baglantilar.length).toBeGreaterThan(40);
    // Tabletin kopyası (işlemler farklı sırayla gelmişti) aynı.
    expect(goruntu(t, evren)).toEqual(asil);
    // Baştan kurma.
    vt(m, evren).yenidenKur();
    expect(goruntu(m, evren)).toEqual(asil);
    // Yeni bir cihaz bütün günlüğü dışarıdan alır.
    const y = cihaz('Yeni');
    y.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    expect(goruntu(y, evren)).toEqual(asil);
    // Kurulan kopyada yazmak sürer; bellekten çıkmış sahne de diskten okunup devam eder.
    yaz(y, evren, sahneler[39], ['Yeni cihazda yazıldı.']);
    yaz(y, evren, sahneler[3], ['Eski sahneye dönüldü.']);
    const duz = (k: string) => vt(y, evren).db.selectValue('SELECT duz FROM metinler WHERE kayit=?', [k]);
    expect([duz(sahneler[39]), duz(sahneler[3])]).toEqual(['Yeni cihazda yazıldı.', 'Eski sahneye dönüldü.']);
  });
});
