import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { boslukCumlesi, bolgede, kelimeSay, say, type SayimKaydi } from '../src/calisan/yogunluk';
import { tarihCoz, VARSAYILAN_TAKVIM, type ZamanSeti } from '../src/alan/tarih';
import { duzMetindenSpans } from '../src/alan/metin-sema';
import type { HaritaAyrintisi, Spans, YogunlukIstegi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const isleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 800, boy: 500, onizleme: new Uint8Array([7]) });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  return new Hizmet((d) => { let db = dosyalar.get(d); if (!db) { db = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, db); } return db; }, 'Deneme', 'x', () => {}, new BellekDeposu(), isleyici);
}
const z: ZamanSeti = { ana: VARSAYILAN_TAKVIM, diger: [], akislar: [] };
const istek: YogunlukIstegi = { baslangic: '0', bitis: '19', adim: 10 };
const k = (kod: string, tarih: string | null, tur = 'olay', kelime = 0): SayimKaydi => ({ kod, ad: `Uydurma ${kod}`, tur, kelime, tarih: tarih ? tarihCoz(tarih)! : null, yerler: [] });
const kare: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
const hBos = (): HaritaAyrintisi => ({ kod: 'deneme', ad: 'Uydurma harita', en: 800, boy: 500, silindi: false, yer: null, katmanlar: [], isaretler: [], ustHaritalar: [], bakis: null, cizimler: [{ kod: 'bolge', kayit: { kod: 'yer', ad: 'Uydurma Güney', tur: 'mekan' }, karar: 'kesin', bicim: 'bolge', kip: null, noktalar: kare, baslangic: null, bitis: null, gecerli: null }], an: null, zamanAraligi: null, buTarihte: [] });
function hazirla() { const h = cihaz(); const { kod: evren } = h.evrenOlustur({ ad: 'Yoğunluk denemesi' }); return { h, evren }; }
const metin = (h: Hizmet, evren: string, kayit: string, yazi: string) => h.metinKaydet({ evren, kayit, alan: 'govde', temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar, spans: duzMetindenSpans(yazi) as Spans });

describe('salt okunur yoğunluk ve boşluk (F22)', () => {
  it('altı sahnede anlatılan tek olay bir olay, altı sahne ve ayrı kelime/kayıt sayısı verir', () => {
    const { h, evren } = hazirla();
    const olay = h.kayitOlustur({ evren, tur: 'olay', ad: 'Uydurma suikast' }).kod;
    h.kayitTarih({ evren, kod: olay, ifade: '5' });
    for (let i = 0; i < 6; i++) {
      const sahne = h.kayitOlustur({ evren, tur: 'sahne', ad: `Uydurma anlatım ${i}` }).kod;
      h.kayitTarih({ evren, kod: sahne, ifade: '5' });
      h.iliskiEkle({ evren, a: sahne, b: olay, tur: 'anlatir' });
      metin(h, evren, sahne, 'Bir sessiz kapı.');
    }
    const o = h.yogunluk({ evren, ...istek });
    expect(o.dilimler[0].enAz).toEqual({ olay: 1, sahne: 6, kelime: 18, kayit: 7 });
    expect(o.dilimler[0].enCok).toEqual(o.dilimler[0].enAz);
  });
  it('iki dilime yayılan tarihi tek dilime yerleştirmez; alt ve üst sınırlar ayrıdır', () => {
    const o = say([k('a', '9–10')], z, istek, null);
    expect(o.dilimler.map((d) => [d.enAz.olay, d.enCok.olay])).toEqual([[0, 1], [0, 1]]);
    expect(o.kayitlar[0].dilimler).toEqual({ ilk: 0, son: 1, kesin: false });
    const tek = say([k('a', '1–8')], z, istek, null);
    expect(tek.dilimler[0].enAz.olay).toBe(1);
  });
  it('pencere dışında da süren aralığı yalnızca bir görünür dilime düşse bile kesin saymaz', () => {
    const o = say([k('a', '-10–5')], z, istek, null);
    expect(o.dilimler[0].enAz.olay).toBe(0); expect(o.dilimler[0].enCok.olay).toBe(1);
    expect(o.kayitlar[0].tarih!.ifade).toBe('-10–5');
  });
  it('tarihsiz, sembolik ve zaman aralığının dışındaki kayıtları ayrı tutar', () => {
    const o = say([k('a', null), k('b', 'eski krallık'), k('c', '25'), k('d', '10 sonrası')], z, istek, null);
    expect(o.tarihsiz.kayit).toBe(2); expect(o.zamanDisinda.kayit).toBe(1);
    expect(o.dilimler[1].enAz.kayit).toBe(0); expect(o.dilimler[1].enCok.kayit).toBe(1);
  });
  it('takvim yıl uzunluğunu, negatif yılları ve son kısa dilimi kullanır', () => {
    const zz = { ...z, ana: { ...z.ana, yilGun: 120 } };
    const o = say([{ ...k('a', null), tarih: tarihCoz('-1', zz) }], zz, { baslangic: '-2', bitis: '0', adim: 1 }, null);
    expect(o.dilimler.map((d) => d.enAz.olay)).toEqual([0, 1, 0]);
    expect(say([], z, { baslangic: '0', bitis: '10', adim: 10 }, null).dilimler.map((d) => d.ad)).toEqual(['Yıl 0 – Yıl 9', 'Yıl 10']);
  });
  it('aynı kimliği tekrar saymaz; tür süzgeci kelimeyi başka kayıtlardan toplamaz', () => {
    const a = k('a', '0'), b = k('b', '0', 'sahne', 8);
    expect(say([a, a, b], z, istek, null).dilimler[0].enAz).toEqual({ olay: 1, sahne: 1, kelime: 8, kayit: 2 });
    expect(say([a, b], z, { ...istek, tur: 'olay' }, null).dilimler[0].enAz).toEqual({ olay: 1, sahne: 0, kelime: 0, kayit: 1 });
  });
  it('kelimeleri Türkçe harf ve sayı kümeleri olarak sayar; anlam çıkarmaz', () => {
    expect(kelimeSay('Kızıl ay, üç kapı!\n42 taş.')).toBe(6);
    expect(kelimeSay('… --')).toBe(0);
  });
  it('sıfır olay için yalnızca kapsamı belirten kayıtlı olay yok cümlesi kullanır', () => {
    expect(boslukCumlesi('Güney')).toBe('Bu kapsamda Güney için kayıtlı olay yok.');
    expect(say([], z, istek, null).dilimler[0].aciklama).toBe('Bu kapsamda Yıl 0 – Yıl 9 için kayıtlı olay yok.');
  });
  it('nokta, kenar ve yaklaşık daire için bölge kesinliğini korur', () => {
    expect(bolgede([50, 50], kare)).toBe('kesin');
    expect(bolgede([0, 50], kare)).toBe('kesin');
    expect(bolgede([95, 50], kare, 10)).toBe('belirsiz');
    expect(bolgede([105, 50], kare, 10)).toBe('belirsiz');
    expect(bolgede([120, 50], kare, 10)).toBeNull();
  });
  it('yaklaşık konum üst sınıra, bilinmeyen konum ayrı sayıya gider; çok işaret kaydı çoğaltmaz', () => {
    const h = hBos();
    for (const [kod, x, kesinlik] of [['a', 95, 'yaklasik'], ['b', 50, 'kesin'], ['b', 55, 'kesin']] as const) h.isaretler.push({ kod: `${kod}${x}`, kayit: { kod, ad: kod, tur: 'olay' }, karar: 'kesin', altHarita: null, konum: { x, y: 50, yaricap: kesinlik === 'yaklasik' ? 10 : null, kesinlik } });
    const o = say([k('a', '0'), k('b', '0'), k('c', '0')], z, istek, h);
    expect(o.bolgeler[0].enAz.olay).toBe(1); expect(o.bolgeler[0].enCok.olay).toBe(2);
    expect(o.konumsuz.olay).toBe(1);
  });
  it('bölgeyi ve sahne yerini mevcut harita işaretlerinden okur; konumsuzları ayrı gösterir', async () => {
    const { h, evren } = hazirla();
    const yer = h.kayitOlustur({ evren, tur: 'mekan', ad: 'Uydurma Güney' }).kod;
    const liman = h.kayitOlustur({ evren, tur: 'sehir', ad: 'Uydurma Liman' }).kod;
    const sahne = h.kayitOlustur({ evren, tur: 'sahne', ad: 'Uydurma kapı' }).kod;
    const olay = h.kayitOlustur({ evren, tur: 'olay', ad: 'Uydurma geçiş' }).kod;
    h.kayitTarih({ evren, kod: olay, ifade: '0' });
    const { kod: harita } = await h.haritaYukle({ evren, ad: 'Deneme', dosyaAdi: 'deneme.png', tur: 'image/png', veri: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]) });
    h.cizimEkle({ evren, harita, kayit: yer, bicim: 'bolge', noktalar: kare });
    h.cizimEkle({ evren, harita, kayit: yer, bicim: 'yol', noktalar: [[0, 0], [10, 10]] });
    h.isaretKoy({ evren, harita, kayit: liman, konum: { kesinlik: 'kesin', x: 50, y: 50, yaricap: null } });
    h.iliskiEkle({ evren, tur: 'sahne_yeri', a: sahne, b: liman });
    const o = h.yogunluk({ evren, ...istek, harita });
    expect(o.bolgeler).toHaveLength(1);
    expect(o.bolgeler[0].enAz).toEqual({ olay: 0, sahne: 1, kelime: 0, kayit: 3 });
    expect(o.konumsuz.olay).toBe(1);
    expect(o.kayitlar.find((k) => k.kod === sahne)?.konumDurumu).toBe('konumlu');
    const once = h.islemGunlugu({ evren, sinir: 1000 });
    h.yogunluk({ evren, ...istek, harita, tur: 'sahne' });
    h.yogunluk({ evren, ...istek });
    expect(h.islemGunlugu({ evren, sinir: 1000 })).toEqual(once);
  });
  it('eser süzgeci sahneleri, metin bağlantılarını ve anlatılan tekil olayları toplar', () => {
    const { h, evren } = hazirla();
    const eser = h.kayitOlustur({ evren, tur: 'eser', ad: 'Uydurma eser' }).kod;
    const { kod: bolum } = h.anlatiOlustur({ evren, ust: eser, tur: 'bolum', ad: 'Uydurma bölüm' });
    const { kod: s } = h.anlatiOlustur({ evren, ust: bolum, tur: 'sahne', ad: 'Uydurma sahne' });
    const olay = h.kayitOlustur({ evren, tur: 'olay', ad: 'Uydurma olay' }).kod;
    const kisi = h.kayitOlustur({ evren, tur: 'karakter', ad: 'Uydurma kişi' }).kod;
    h.kayitOlustur({ evren, tur: 'sahne', ad: 'Başka sahne' });
    h.iliskiEkle({ evren, tur: 'anlatir', a: s, b: olay });
    const spans = duzMetindenSpans('Uydurma kişi') as { type: string; marks?: Record<string, unknown> }[];
    for (const sp of spans) if (sp.type === 'text') sp.marks = { bag: kisi };
    h.metinKaydet({ evren, kayit: s, alan: 'govde', spans, temel: h.metinAc({ evren, kayit: s, alan: 'govde' }).basliklar });
    const once = h.islemGunlugu({ evren, sinir: 1000 });
    const o = h.yogunluk({ evren, ...istek, eser });
    expect(o.kayitlar.map((k) => k.kod).sort()).toEqual([s, olay, kisi].sort());
    expect(o.tarihsiz).toEqual({ olay: 1, sahne: 1, kelime: 2, kayit: 3 });
    expect(h.islemGunlugu({ evren, sinir: 1000 })).toEqual(once);
  });
  it('kendi sahne olayının tarihi sahneden gelir; başka anlatılan olaya sahne tarihi uydurulmaz', () => {
    const { h, evren } = hazirla();
    const sahne = h.kayitOlustur({ evren, tur: 'sahne', ad: 'Uydurma sahne' }).kod;
    h.kayitTarih({ evren, kod: sahne, ifade: '5' });
    const { olay } = h.degisimEkle({ evren, sahne, metin: 'Uydurma değişim' });
    const baska = h.kayitOlustur({ evren, tur: 'olay', ad: 'Uydurma anı' }).kod;
    h.iliskiEkle({ evren, tur: 'anlatir', a: sahne, b: baska });
    const o = h.yogunluk({ evren, ...istek });
    expect(o.kayitlar.find((k) => k.kod === olay)?.tarih?.ifade).toBe('5');
    expect(o.kayitlar.find((k) => k.kod === baska)?.zamanDurumu).toBe('tarihsiz');
    expect(o.dilimler[0].enAz.olay).toBe(1);
  });
  it('geçersiz aralığı reddeder ve başarısız istek de işlem yazmaz', () => {
    const { h, evren } = hazirla(); const once = h.islemGunlugu({ evren, sinir: 1000 });
    expect(() => h.yogunluk({ evren, ...istek, baslangic: '20' })).toThrow(/bitişten sonra/);
    expect(() => h.yogunluk({ evren, ...istek, bitis: '10001', adim: 1 })).toThrow(/1.000/);
    expect(() => h.yogunluk({ evren, ...istek, baslangic: 'bilinmiyor' })).toThrow(/kesin yıl/);
    expect(() => h.yogunluk({ evren, ...istek, eser: 'bulunmayan' })).toThrow(/eser bulunamadı/);
    expect(h.islemGunlugu({ evren, sinir: 1000 })).toEqual(once);
  });
  it('tarih çatışmasında bir cihazın tarihini gizlice seçmez', () => {
    const { h, evren } = hazirla();
    const kod = h.kayitOlustur({ evren, ad: 'Uydurma olay', tur: 'olay' }).kod;
    const diger = cihaz();
    diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.kayitTarih({ evren, kod, ifade: '1' }); diger.kayitTarih({ evren, kod, ifade: '11' });
    h.islemleriAl({ evren, islemler: diger.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    const once = h.islemGunlugu({ evren, sinir: 1000 });
    expect(() => h.yogunluk({ evren, ...istek })).toThrow(/çelişkileri inceleyin/);
    expect(h.islemGunlugu({ evren, sinir: 1000 })).toEqual(once);
  });
  it('örtüşen bölgeleri birleştirmez; bölge dışındaki konum bilinmeyenden ayrıdır', () => {
    const h = hBos(); h.cizimler.push({ ...h.cizimler[0], kod: 'diger' });
    for (const [kod, x] of [['a', 50], ['b', 200]] as const) h.isaretler.push({ kod, kayit: { kod, ad: kod, tur: 'olay' }, karar: 'kesin', altHarita: null, konum: { x, y: 50, yaricap: null, kesinlik: 'kesin' } });
    const o = say([k('a', null), k('b', null), k('c', null)], z, istek, h);
    expect(o.bolgeler.map((b) => b.enAz.olay)).toEqual([1, 1]);
    expect(o.bolgeDisinda.olay).toBe(1); expect(o.konumsuz.olay).toBe(1);
    expect(o.kayitlar).toHaveLength(3);
  });
});
