// Anlık görüntü (§10.1): daha önceye düşen işlem gelince tablolar görüntüden kurulur. Sonuç, bütün günlüğü baştan
// uygulamakla bütün tablolarda ve satır sırasında aynı olmalı. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { IZDUSUM_TABLOLARI } from '../src/calisan/izdusum';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
const varsayilan = EvrenVt.goruntuAraligi;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); EvrenVt.goruntuAraligi = 40; });
afterAll(() => { EvrenVt.goruntuAraligi = varsayilan; });

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  return new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, ad, 'x');
}
const vt = (h: Hizmet, evren: string) => (h as unknown as { evren(k: string): EvrenVt }).evren(evren);
const esitle = (a: Hizmet, b: Hizmet, evren: string) => {
  const ab = a.islemleriVer({ evren, gorulen: b.gorulenler({ evren }) });
  const ba = b.islemleriVer({ evren, gorulen: a.gorulenler({ evren }) });
  b.islemleriAl({ evren, islemler: ab });
  a.islemleriAl({ evren, islemler: ba });
};
/** Metin çatışma kayıtları sahne sahne işlendiğinden sahneler arası eklenme sırası yola göre değişebilir; yalnızca
 *  sahne içinde okunur (çatışma listesi kendi sütunlarına göre sıralanır). Bu ikisi içeriğe göre karşılaştırılır. */
const SIRASIZ = new Set(['metin_yazanlari', 'metin_catismalari']);
/** Bütün sonuç tabloları, satır sırasıyla; ikili sütunlar (paketlenmiş belge) yok sayılır. */
const goruntu = (h: Hizmet, evren: string) => {
  const db = vt(h, evren).db;
  return Object.fromEntries(IZDUSUM_TABLOLARI.map((t) => {
    const satirlar = db.selectObjects(`SELECT * FROM ${t} ORDER BY rowid`)
      .map((r) => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([, v]) => !(v instanceof Uint8Array)))));
    return [t, SIRASIZ.has(t) ? satirlar.sort() : satirlar];
  }));
};
const s = metinSemasi.schema;
const metin = (h: Hizmet, evren: string, kayit: string, yazi: string) => h.metinKaydet({ evren, kayit, alan: 'govde',
  spans: pmNodeToSpans(metinSemasi, s.node('doc', null, [s.node('paragraph', null, [s.text(yazi)])])) as never, temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });

describe('anlık görüntü (§10.1)', () => {
  it('daha önceye düşen işlem görüntüden kurulur; sonuç baştan kurmayla aynı', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    const ortak: string[] = [];
    const yaz = (h: Hizmet, i: number, ek: string, kayitlar = ortak) => {
      if (i % 9 === 0 || !kayitlar.length) kayitlar.push(h.kayitOlustur({ evren, ad: `Kayıt ${ek}${i}`, tur: i % 2 ? 'karakter' : 'sahne' }).kod);
      const k = kayitlar[i % kayitlar.length];
      if (i % 3 === 0) metin(h, evren, k, `${ek} cihazında ${i}. yazı.`);
      else if (i % 7 === 0 && k !== kayitlar[0]) h.iliskiEkle({ evren, a: kayitlar[0], b: k, tur: 'dusman' });
      else h.kayitDegistir({ evren, kod: k, alan: 'ozet', deger: `${ek} özet ${i}` });
    };
    // Birlikte çalışma: görüntüler alınır.
    for (let i = 0; i < 120; i++) { yaz(m, i, 'm'); if (i % 30 === 29) esitle(m, t, evren); }
    esitle(m, t, evren);
    expect(Number(vt(m, evren).db.selectValue('SELECT count(*) FROM goruntuler'))).toBe(2);

    // İkisi ayrı ayrı yazar (çevrimdışı), sonra eşitlenir: tabletin işlemleri masaüstününkilerin arasına düşer.
    const tListesi = [...ortak], mListesi = [...ortak]; // her cihaz yalnızca kendi bildiği kayıtlara yazar
    for (let i = 0; i < 25; i++) { yaz(t, 200 + i, 't', tListesi); yaz(m, 300 + i, 'm', mListesi); }
    esitle(m, t, evren);
    expect(vt(m, evren).sonKurma).toMatchObject({ goruntudenMi: true });
    expect(vt(m, evren).sonKurma!.uygulanan).toBeLessThan(vt(m, evren).islemSayisi());
    const asil = goruntu(m, evren);
    expect(goruntu(t, evren)).toEqual(asil);
    // Bütün günlükten baştan kurulan yeni bir cihaz ve elle baştan kurma aynı sonucu verir.
    const y = cihaz('Yeni');
    y.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    expect(goruntu(y, evren)).toEqual(asil);
    vt(m, evren).yenidenKur();
    expect(goruntu(m, evren)).toEqual(asil);
  });

  it('ayrılık bütün görüntülerden önceyse baştan kurulur; geçersiz görüntüler silinir', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Güney' });
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    const k = m.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    esitle(m, t, evren);
    // Tablet erkenden ayrılır; masaüstü bu arada iki görüntü alacak kadar yazar.
    for (let i = 0; i < 5; i++) t.kayitDegistir({ evren, kod: k, alan: 'ozet', deger: `Tablet ${i}` });
    for (let i = 0; i < 100; i++) m.kayitDegistir({ evren, kod: k, alan: 'ozet', deger: `Masaüstü ${i}` });
    expect(Number(vt(m, evren).db.selectValue('SELECT count(*) FROM goruntuler'))).toBe(2);
    esitle(m, t, evren);
    expect(vt(m, evren).sonKurma).toMatchObject({ goruntudenMi: false });
    // Tabletin işlemlerinden sonra alınmış görüntüler artık doğru değil: silindi; yerine şimdiki hâlin görüntüsü alındı.
    const kalan = vt(m, evren).db.selectObjects('SELECT islem FROM goruntuler').map((x) => Number(x.islem));
    expect(kalan).toEqual([vt(m, evren).islemSayisi()]);
    expect(goruntu(t, evren)).toEqual(goruntu(m, evren));
    expect(m.catismalar({ evren }).some((c) => c.tur === 'alan' && c.alan === 'ozet')).toBe(true);
  });

  it('tablo yapısı değişince (program güncellemesi) görüntüler silinir', () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.evrenOlustur({ ad: 'Batı' });
    const k = m.kayitOlustur({ evren, ad: 'Daran', tur: 'karakter' }).kod;
    for (let i = 0; i < 50; i++) m.kayitDegistir({ evren, kod: k, alan: 'ozet', deger: `Özet ${i}` });
    const db = vt(m, evren).db;
    expect(Number(db.selectValue('SELECT count(*) FROM goruntuler'))).toBe(1);
    db.exec("UPDATE meta SET v='1' WHERE k='izdusum_surumu'");
    const yeni = new EvrenVt(db, 'kurulum');
    expect(Number(yeni.db.selectValue('SELECT count(*) FROM goruntuler'))).toBe(0);
    expect(Number(yeni.db.selectValue("SELECT count(*) FROM sqlite_master WHERE name LIKE 'goruntu1\\_%' ESCAPE '\\'"))).toBe(0);
  });
});
