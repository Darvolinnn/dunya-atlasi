import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { altGrupFarki, miktarDogrula, miktarYaz } from '../src/alan/kalabalik';
import { yeniKod } from '../src/alan/kod';
import type { KalabalikGozlemi, KalabalikMiktari, KalabalikOlayi } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  h.baslat(); return h;
}
const m = (enAz: number, enCok = enAz, yaklasik = false): KalabalikMiktari => ({ enAz, enCok, yaklasik });
function kur(tur = 'topluluk') {
  const h = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma Sayım Evreni' }).kod;
  const kayit = h.kayitOlustur({ evren, ad: 'Gümüşyel Birliği', tur }).kod;
  const g = (ifade: string, miktar = m(100)): KalabalikGozlemi => ({ kayit, tarih: { ifade }, miktar, altGruplar: [], ortusmeler: [], not: '' });
  const gozlem = (ifade: string, miktar = m(100)) => h.kalabalikGozlemYaz({ evren, tanim: g(ifade, miktar) }).kod;
  const olay = (ifade: string, tur: KalabalikOlayi['tur'], miktar = m(5)) => h.kalabalikOlayYaz({ evren, tanim: { kayit, tarih: { ifade }, tur, miktar, not: '' } }).kod;
  const oku = (tarih = '460') => h.kalabalikOku({ evren, kayit, tarih });
  return { h, evren, kayit, g, gozlem, olay, oku };
}
function al(hedef: Hizmet, kaynak: Hizmet, evren: string) {
  hedef.islemleriAl({ evren, islemler: kaynak.islemleriVer({ evren, gorulen: hedef.gorulenler({ evren }) }) });
}

describe('F40 kalabalık sayımı', () => {
  it('son gözlemden sonraki katılma, ayrılma ve ölüm aralıkları toplanır; gelecek olay eklenmez', () => {
    const x = kur(); x.gozlem('450', m(300, 350, true));
    x.olay('451', 'katilma', m(20, 25)); x.olay('452', 'ayrilma', m(10)); x.olay('453', 'olum', m(2, 4)); x.olay('470', 'katilma', m(1000));
    expect(x.oku().tahminler[0].miktar).toEqual(m(306, 363, true));
    expect(x.oku('451').tahminler[0].miktar).toEqual(m(300, 375, true)); // Aynı yıl içinde olayın zamanı belirsiz.
    expect(x.oku('449').tahminler).toEqual([]);
  });
  it('önceki olaylar yeniden eklenmez ve uyumlu son gözlem dayanak olur', () => {
    const x = kur(); x.gozlem('440'); x.olay('441', 'katilma', m(10)); const son = x.gozlem('450', m(110)); x.olay('451', 'olum', m(3));
    expect(x.oku().tahminler).toMatchObject([{ gozlem: son, miktar: m(107), sonGozlem: true }]);
  });
  it('örtüşme bilinmiyorsa 20–30, açık örtüşme 4 ise 26, sıfırsa 30', () => {
    expect(altGrupFarki(m(30), m(10), m(100), null)).toEqual(m(20, 30));
    expect(altGrupFarki(m(30), m(10), m(100), m(4))).toEqual(m(26));
    expect(altGrupFarki(m(30), m(10), m(100), m(0))).toEqual(m(30));
    expect(altGrupFarki(m(30), m(10), m(100), m(2, 6, true))).toEqual(m(24, 28, true));
    expect(altGrupFarki(m(30), m(10), m(35), null)).toEqual(m(20, 25));
  });
  it('alt gruplar ve açık örtüşmeler tarihli gözlem içinde saklanır; adlar hesap kuralı seçmez', () => {
    const x = kur(); const a = yeniKod(), b = yeniKod();
    const tanim = { ...x.g('450'), altGruplar: [{ kod: a, ad: 'Uydurma Mavi', miktar: m(30) }, { kod: b, ad: 'Uydurma Sarı', miktar: m(10) }], ortusmeler: [{ a, b, miktar: m(4) }] };
    x.h.kalabalikGozlemYaz({ evren: x.evren, tanim });
    expect(x.oku().gozlemler[0].tanim).toEqual(tanim);
    expect(x.oku().tahminler[0].miktar).toEqual(m(100));
    expect(() => x.h.kalabalikGozlemYaz({ evren: x.evren, tanim: { ...tanim, ortusmeler: [{ a, b, miktar: m(11) }] } })).toThrow(/örtüşme/i);
  });
  it('adı bilinen üyelik ve kafileye kalabalık üyeliği toplamı artırmaz', () => {
    const x = kur('kafile'); x.gozlem('450');
    const kisi = x.h.kayitOlustur({ evren: x.evren, ad: 'Uydurma Yelren', tur: 'karakter' }).kod;
    const grup = x.h.kayitOlustur({ evren: x.evren, ad: 'Uydurma Kıyı Ekibi', tur: 'topluluk' }).kod;
    x.h.iliskiEkle({ evren: x.evren, tur: 'uye', a: kisi, b: x.kayit });
    x.h.iliskiEkle({ evren: x.evren, tur: 'uye', a: grup, b: x.kayit });
    expect(x.oku().uyeler.map((k) => k.kod)).toEqual([kisi]);
    expect(x.oku().tahminler[0].miktar).toEqual(m(100));
  });
  it('uyuşmayan yeni gözlem ve önceki gözlem + olaylar yan yana kalır', () => {
    const x = kur(); x.gozlem('440'); x.olay('441', 'katilma', m(10)); x.gozlem('450', m(130));
    const s = x.oku();
    expect(s.tahminler.map((t) => t.miktar.enAz).sort((a, b) => a - b)).toEqual([110, 130]);
    expect(s.tahminler.every((t) => t.uyusmaz)).toBe(true);
    expect(s.uyarilar.join(' ')).toMatch(/öncelik verilmedi/);
  });
  it('iki cihaz aynı gözlemi farklı yazarsa çatışma görünür, çözülünce her iki cihaz aynı hesaba döner', () => {
    const x = kur(); const kod = x.gozlem('450'), diger = cihaz();
    diger.evreniDisaridanKur({ kod: x.evren, islemler: x.h.islemleriVer({ evren: x.evren, gorulen: {} }) });
    x.h.kalabalikGozlemYaz({ evren: x.evren, kod, tanim: x.g('450', m(120)) });
    diger.kalabalikGozlemYaz({ evren: x.evren, kod, tanim: x.g('450', m(140)) });
    al(x.h, diger, x.evren);
    const c = x.h.catismalar({ evren: x.evren, kod }).find((s) => s.tur === 'alan' && s.alan === 'kalabalik_gozlem');
    expect(c?.tur).toBe('alan');
    if (!c || c.tur !== 'alan') throw new Error('Çatışma bekleniyordu.');
    expect(c.degerler).toHaveLength(2); expect(c.kayit).toBe(x.kayit);
    expect(x.oku().gozlemler[0].catismali).toBe(true); expect(x.oku().tahminler).toEqual([]);
    const secim = c.degerler.find((d) => (d.deger as KalabalikGozlemi).miktar.enAz === 120)!;
    x.h.alanCatismasiCoz({ evren: x.evren, nesne: kod, alan: c.alan, islem: secim.islem });
    al(diger, x.h, x.evren); al(x.h, diger, x.evren);
    expect(x.h.catismalar({ evren: x.evren, kod })).toEqual([]);
    expect(x.oku().tahminler[0].miktar).toEqual(m(120));
    expect(diger.kalabalikOku({ evren: x.evren, kayit: x.kayit, tarih: '460' }).tahminler).toEqual(x.oku().tahminler);
  });
  it('olay dayanağı tarihi değişince sayım olayı da kayar', () => {
    const x = kur(); x.gozlem('440');
    const olay = x.h.kayitOlustur({ evren: x.evren, ad: 'Uydurma Kavuşma', tur: 'olay' }).kod;
    x.h.kayitTarih({ evren: x.evren, kod: olay, ifade: '450' });
    x.h.kalabalikOlayYaz({ evren: x.evren, tanim: { kayit: x.kayit, tarih: { olay }, tur: 'katilma', miktar: m(10), not: '' } });
    expect(x.oku().tahminler[0].miktar).toEqual(m(110));
    x.h.kayitTarih({ evren: x.evren, kod: olay, ifade: '470' });
    expect(x.oku().tahminler[0].miktar).toEqual(m(100));
  });
  it('kaldırma ve geri getirme hesapları değiştirir; gözlem düzenlemek kaldırılmış kaydı diriltmez', () => {
    const x = kur(); const g = x.gozlem('450'), o = x.olay('451', 'olum', m(5));
    x.h.kalabalikKaldir({ evren: x.evren, kod: o, bicim: 'olay' }); expect(x.oku().tahminler[0].miktar).toEqual(m(100));
    x.h.kalabalikKaldir({ evren: x.evren, kod: o, bicim: 'olay', geriYukle: true }); expect(x.oku().tahminler[0].miktar).toEqual(m(95));
    x.h.kalabalikKaldir({ evren: x.evren, kod: g, bicim: 'gozlem' });
    expect(() => x.h.kalabalikGozlemYaz({ evren: x.evren, kod: g, tanim: x.g('450') })).toThrow(/kaldırılmış/);
    expect(x.oku().tahminler).toEqual([]);
    x.h.kalabalikKaldir({ evren: x.evren, kod: g, bicim: 'gozlem', geriYukle: true }); expect(x.oku().tahminler[0].miktar).toEqual(m(95));
  });
  it('yaklaşık tek sayıya kendiliğinden hata payı eklemez; geçersiz kişi miktarları reddedilir', () => {
    expect(miktarYaz(m(100, 100, true))).toBe('yaklaşık 100 kişi');
    for (const n of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => miktarDogrula(m(n))).toThrow();
    expect(() => miktarDogrula(m(5, 3))).toThrow();
    const x = kur('karakter'); expect(() => x.gozlem('450')).toThrow(/yalnızca/);
  });
  it('sembolik tarihte sayı uydurmaz; tarihi bilinmeyen olay koşullu aralık verir', () => {
    const x = kur(); x.gozlem('450'); x.olay('Uydurma sis günü', 'ayrilma', m(10));
    expect(x.oku().tahminler[0]).toMatchObject({ miktar: m(90, 100), belirsiz: true });
    expect(x.oku('Uydurma sis günü').tahminler).toEqual([]);
  });
  it('negatif toplamı sıfıra kırpıp çelişkiyi gizlemez', () => {
    const x = kur(); x.gozlem('450', m(3)); x.olay('451', 'olum', m(5));
    expect(x.oku().tahminler[0].miktar).toEqual(m(-2)); expect(x.oku().uyarilar.join(' ')).toMatch(/sıfırın altına/);
  });
});
