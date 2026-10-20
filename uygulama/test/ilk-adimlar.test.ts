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
    expect(adim()).toMatchObject({ eser: false, sahne: false, baglanti: false, baglam: false });
    h.kayitOlustur({ evren, ad: 'Kuzey Yolu', tur: 'eser' });
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    expect(adim()).toMatchObject({ eser: true, sahne: false });
    const sahne = h.kayitOlustur({ evren, ad: 'Kuşatma', tur: 'sahne' }).kod;
    expect(adim()).toMatchObject({ sahne: true, baglanti: false });
    h.metinKaydet({ evren, kayit: sahne, alan: 'govde', temel: h.metinAc({ evren, kayit: sahne, alan: 'govde' }).basliklar,
      spans: pmNodeToSpans(metinSemasi, s.node('doc', null, [s.node('paragraph', null, [s.text('Elin', [s.mark('bag', { hedef: elin })]), s.text(' kapıda bekledi.')])])) as never });
    expect(adim()).toMatchObject({ baglanti: true, baglam: false });
    h.kayitTarih({ evren, kod: sahne, ifade: '412' });
    expect(adim()).toMatchObject({ eser: true, sahne: true, baglanti: true, baglam: true });
  });

  it('başlangıç yollarının dayanakları (K27): boş set ya da "sonra" yapılmış sayılmaz', () => {
    const d = new Map<string, Database>();
    const h = new Hizmet((x) => { let db = d.get(x); if (!db) { db = new sqlite3.oo1.DB(':memory:'); d.set(x, db); } return db; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const adim = () => h.ilkAdimlar({ evren });
    expect(adim()).toMatchObject({ not: false, karakter: false, kural: false, yer: false, sorular: {} });
    // Fikir yolu: not → nottan eser → çekirdek.
    const not = h.hizliNot({ evren, metin: 'Anıların vergi olarak alındığı bir imparatorluk.' }).kod;
    expect(adim()).toMatchObject({ not: true, nottanEser: false });
    const { kod: eser } = h.nottanKayit({ evren, not, ad: 'Unutulanlar', tur: 'eser' });
    expect(adim()).toMatchObject({ nottanEser: true, cekirdek: false });
    h.soruCevapla({ evren, kod: eser, soru: 'cekirdek.1', durum: 'sonra' });
    expect(adim().cekirdek).toBe(false);
    h.soruCevapla({ evren, kod: eser, soru: 'cekirdek.1', durum: 'cevaplandi', cevap: 'Lale kardeşini bulmak istiyor.' });
    expect(adim().cekirdek).toBe(true);
    // Karakter yolu: boş "Karşıt karakter" seti karşıt gücü tamamlamaz; ilişki tamamlar.
    const lale = h.kayitOlustur({ evren, ad: 'Lale', tur: 'karakter' }).kod;
    h.kayitSoruSeti({ evren, kod: lale, set: 'karsit', ekle: true });
    expect(adim()).toMatchObject({ karakter: true, istek: false, karsit: false });
    const orhun = h.kayitOlustur({ evren, ad: 'Orhun', tur: 'karakter' }).kod;
    h.iliskiEkle({ evren, a: lale, b: orhun, tur: 'dusman' });
    expect(adim().karsit).toBe(true);
    // Dünya yolu: rota yer sayılmaz; şehir sayılır. Evren soruları durumlarıyla gelir.
    h.kayitOlustur({ evren, ad: 'Kıyı yolu', tur: 'rota' });
    expect(adim().yer).toBe(false);
    h.kayitOlustur({ evren, ad: 'Başkent', tur: 'sehir' });
    expect(adim().yer).toBe(true);
    h.soruCevapla({ evren, kod: 'evren', soru: 'pusula.3', durum: 'sonra' });
    h.soruCevapla({ evren, kod: 'evren', soru: 'pusula.4', durum: 'cevaplandi', cevap: 'Anılar vergi olarak alınır.' });
    expect(adim()).toMatchObject({ guc: false, kural: true, sorular: { 'pusula.3': 'sonra', 'pusula.4': 'cevaplandi' } });
  });
});
