import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { IZDUSUM_SURUMU } from '../src/calisan/izdusum';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });


function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Sisli Kıyı' });
  return { h, evren, ac };
}
const s = metinSemasi.schema;
const p = (t: string) => s.node('paragraph', null, [s.text(t)]);
function yaz(h: Hizmet, evren: string, kayit: string, t: string) {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  return h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, s.node('doc', null, [p(t)])), temel });
}

describe('K38: arama dizini ve yerinde geçiş', () => {
  it('çekimli sözcük metindeki başka çekimini kökünden bulur; kısa ortak kök eşleşmez; metin değişince dizin güncellenir', () => {
    const { h, evren } = kur();
    const sahne = h.kayitOlustur({ evren, ad: 'Liman', tur: 'not' }).kod;
    yaz(h, evren, sahne, 'Velkar kılıçtan korkmadı, adada kaldı.');
    const bul = (m: string) => h.ara({ evren, metin: m }).find((x) => x.kod === sahne);
    expect(bul('kılıcıyla')).toMatchObject({ nereden: { tur: 'metin' } });
    expect(bul('kılıcıyla')!.parca).toContain('kılıçtan');
    expect(bul('adam')).toBeUndefined();
    expect(bul('korkmadı')!.parca).toContain('korkmadı'); // düz eşleşme önce
    yaz(h, evren, sahne, 'Velkar kaçtı.');
    expect(bul('kılıcıyla')).toBeUndefined();
  });

  it('yalnız yeni tablo ekleyen sürüm tabloları silmeden geçer ve dizini var olan metinlerden doldurur', () => {
    const { h, evren, ac } = kur();
    const sahne = h.kayitOlustur({ evren, ad: 'Liman', tur: 'not' }).kod;
    yaz(h, evren, sahne, 'Kılıçtan korkmadı.');
    const db = ac(`/evren-${evren}.db`);
    // 59: arama dizininden önceki sürüm; sonraki yerinde geçişler (K39, 61) de sırayla uygulanır.
    db.exec("UPDATE meta SET v='59' WHERE k='izdusum_surumu'");
    db.exec('DROP TABLE arama_dizini');
    // Baştan kurma olsaydı bu iz tablolarla birlikte silinirdi.
    db.exec("INSERT INTO meta VALUES('k38_iz', '1') ON CONFLICT(k) DO NOTHING");
    db.exec("UPDATE kayitlar SET ozet='elle konmuş iz' WHERE kod='" + sahne + "'");
    const ilerleme: string[] = [];
    const h2 = new Hizmet(ac, 'Deneme', 'x', () => {}, null, null, undefined, (d) => ilerleme.push(d.neden));
    expect(h2.ara({ evren, metin: 'kılıcıyla' }).map((x) => x.kod)).toContain(sahne);
    expect(db.selectValue("SELECT v FROM meta WHERE k='izdusum_surumu'")).toBe(String(IZDUSUM_SURUMU));
    expect(db.selectValue('SELECT ozet FROM kayitlar WHERE kod=?', [sahne])).toBe('elle konmuş iz');
    expect(ilerleme).not.toContain('guncelleme');
  });
});
