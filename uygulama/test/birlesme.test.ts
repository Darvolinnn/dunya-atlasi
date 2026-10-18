import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { Node as PmNode } from 'prosemirror-model';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 800, boy: 500, onizleme: null });
function cihaz(ad = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x', () => {}, new BellekDeposu(), sahteIsleyici);
}
const s = metinSemasi.schema;
const p = (...ogeler: (string | [string, string])[]) => s.node('paragraph', null, ogeler.map((o) =>
  typeof o === 'string' ? s.text(o) : s.text(o[0], [s.marks.bag.create({ hedef: o[1] })])));
function yaz(h: Hizmet, evren: string, kayit: string, ...paragraflar: PmNode[]) {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  return h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, s.node('doc', null, paragraflar)), temel });
}

describe('editoryal birleştirme', () => {
  it('önizleme taşınacakları ve çelişen alanları gösterir; birleştirme yönlendirir ve bir bütün olarak geri alınır', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter', ozet: 'Kuzeyli bir okçu' }).kod;
    const kopya = h.kayitOlustur({ evren, ad: 'Elin Varn', tur: 'karakter', ozet: 'Okçu' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    const sahne = h.kayitOlustur({ evren, ad: 'Kuşatma gecesi', tur: 'sahne' }).kod;
    h.kayitListe({ evren, kod: kopya, liste: 'lakap', ekle: 'Gölge' });
    h.kayitTarih({ evren, kod: kopya, ifade: '395' });
    h.kayitAlanYaz({ evren, kod: kopya, alan: 'dogum', deger: '395' });
    h.iliskiEkle({ evren, tur: 'yasar', a: kopya, b: kale, baslangic: '410' });
    h.iliskiEkle({ evren, tur: 'kardes', a: elin, b: kopya });
    h.durumEkle({ evren, kod: kopya, durum: { ozellik: 'Rütbe', deger: 'Er', kip: 'aralik', baslangic: { ifade: '410' }, bitis: null } });
    await h.haritaYukle({ evren, ad: 'Kıta', dosyaAdi: 'k.png', tur: 'image/png', veri: new Uint8Array([1, 2, 3]) });
    const harita = h.haritalar({ evren })[0].kod;
    h.isaretKoy({ evren, harita, kayit: kopya, konum: { kesinlik: 'kesin', x: 10, y: 10, yaricap: null } });
    await yaz(h, evren, sahne, p(['Elin Varn', kopya], ' surları gözledi.'));
    await yaz(h, evren, kopya, p('Kopya kaydın kendi metni.'));

    const o = h.birlesmeOnizle({ evren, kaynak: kopya, hedef: elin });
    expect(o).toMatchObject({ adlar: ['Elin Varn', 'Gölge'], iliskiler: 1, aradakiIliskiler: 1, durumlar: 1, isaretler: 1, baglantilar: 1, metinVar: true });
    expect(o.alanlar.map((a) => [a.alan, a.celiski])).toEqual([['ad', true], ['ozet', true], ['tarih', false], ['f:dogum', false]]);

    h.birlestir({ evren, kaynak: kopya, hedef: elin, secimler: { ozet: 'kaynak' } });
    const k = h.kayit({ evren, kod: elin });
    expect(k).toMatchObject({ ad: 'Elin', ozet: 'Okçu', lakaplar: ['Elin Varn', 'Gölge'], tarih: { ifade: '395' }, birlesenler: [{ kod: kopya, ad: 'Elin Varn' }] });
    expect(h.kayitSablonu({ evren, kod: elin }).degerler.dogum).toMatchObject({ ifade: '395' });
    expect(h.kayit({ evren, kod: kopya }).birlesti).toEqual({ kod: elin, ad: 'Elin' });
    expect(h.iliskiler({ evren, kod: elin }).map((i) => i.karsi.ad)).toEqual(['Kuzey Kalesi']); // aradaki kardeşlik kalktı
    expect(h.durumlar({ evren, kod: elin }).durumlar).toHaveLength(1);
    expect(h.harita({ evren, kod: harita }).isaretler[0].kayit.kod).toBe(elin);
    expect(h.baglananlar({ evren, kod: elin }).map((b) => b.kod)).toEqual([sahne]);
    expect(h.ara({ evren, metin: 'gölge' })[0].kod).toBe(elin);
    expect(h.kayitlar({ evren, cop: true })).toEqual([]);
    expect(() => h.kayitGeriYukle({ evren, kod: kopya })).toThrow();
    // Eski kodla sonradan eklenen ilişki doğru kayda varır.
    h.iliskiEkle({ evren, tur: 'yasar', a: kopya, b: kale, baslangic: '420' });
    expect(h.iliskiler({ evren, kod: elin }).map((i) => i.karsi.ad).sort()).toEqual(['Kuzey Kalesi', 'Kuzey Kalesi']);

    h.birlesmeyiGeriAl({ evren, kod: kopya });
    expect(h.kayit({ evren, kod: elin })).toMatchObject({ ozet: 'Kuzeyli bir okçu', lakaplar: [], tarih: null, birlesenler: [] });
    expect(h.kayitSablonu({ evren, kod: elin }).degerler.dogum ?? null).toBeNull();
    const geri = h.kayit({ evren, kod: kopya });
    expect(geri).toMatchObject({ silindi: null, birlesti: null });
    // Birleştirmeden sonra eski kodla eklenen ilişki de eski kayda döner.
    expect(h.iliskiler({ evren, kod: kopya }).map((i) => i.karsi.ad).sort()).toEqual(['Elin', 'Kuzey Kalesi', 'Kuzey Kalesi']);
    expect(h.iliskiler({ evren, kod: elin }).map((i) => i.karsi.ad)).toEqual(['Elin Varn']);
    expect(h.harita({ evren, kod: harita }).isaretler[0].kayit.kod).toBe(kopya);
    expect(h.durumlar({ evren, kod: kopya }).durumlar).toHaveLength(1);
    expect(h.islemGunlugu({ evren, sinir: 80 }).map((i) => i.tur)).toContain('birlesme_geri_al');
  });

  it('başka cihaz birleştirmeyi görmeden eski kayda yazarsa incelemeye düşer; ters birleştirme tek kayıtta kalır', () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const a = m.kayitOlustur({ evren, ad: 'Liman', tur: 'sehir' }).kod;
    const b = m.kayitOlustur({ evren, ad: 'Tuzlu Liman', tur: 'sehir' }).kod;
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.birlestir({ evren, kaynak: b, hedef: a, secimler: {} });
    tb.kayitDegistir({ evren, kod: b, alan: 'ozet', deger: 'Tuz tüccarlarının limanı' });
    tb.birlestir({ evren, kaynak: a, hedef: b, secimler: {} });
    m.islemleriAl({ evren, islemler: tb.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) }) });
    tb.islemleriAl({ evren, islemler: m.islemleriVer({ evren, gorulen: tb.gorulenler({ evren }) }) });
    // İki cihaz aynı sonuca varır: tek görünen kayıt.
    const gorunen = (h: Hizmet) => h.kayitlar({ evren }).map((k) => k.kod);
    expect(gorunen(m)).toHaveLength(1);
    expect(gorunen(m)).toEqual(gorunen(tb));
    const c = m.catismalar({ evren });
    expect(c.map((x) => x.tur).sort()).toEqual(['silme', 'ters_birlesme']);
    const ters = c.find((x) => x.tur === 'ters_birlesme')!;
    if (ters.tur === 'ters_birlesme') m.tersBirlesmeCoz({ evren, islem: ters.islem });
    const silme = m.catismalar({ evren }).find((x) => x.tur === 'silme')!;
    expect(silme).toMatchObject({ birlesti: { kod: gorunen(m)[0] } });
  });

  it('bölme: metin parçası yeni kayda dönüşür; bağlantısı ve biçimi korunur', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    const parca = pmNodeToSpans(metinSemasi, s.node('doc', null, [p('Sürgün yılları ', ['kalede', kale], ' geçti.')]));
    const { kod } = h.parcadanKayit({ evren, kaynak: elin, ad: 'Sürgün yılları', tur: 'olay', spans: parca });
    expect(h.kayit({ evren, kod })).toMatchObject({ ad: 'Sürgün yılları', tur: 'olay', karar: 'fikir' });
    expect(h.baglananlar({ evren, kod: kale }).map((b) => b.kod)).toEqual([kod]);
    expect(() => h.parcadanKayit({ evren, kaynak: elin, ad: 'Boş', tur: 'olay', spans: [] })).toThrow();
  });
});
