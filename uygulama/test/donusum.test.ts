import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { yeniKod } from '../src/alan/kod';
import type { DonusumGirdisi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  return new Hizmet((d) => { let db = dosyalar.get(d); if (!db) { db = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, db); } return db; }, 'Deneme', 'x');
}
function kur() {
  const h = cihaz(), { kod: evren } = h.evrenOlustur({ ad: 'Dönüşüm denemesi' });
  const ekle = (ad: string, tur = 'topluluk') => h.kayitOlustur({ evren, ad, tur }).kod;
  const a = ekle('Çakılcılar'), b = ekle('Yelciler'), c = ekle('Akçay Birliği'), kisi = ekle('Neru', 'karakter'), olay = ekle('Üç Çan Günü', 'olay');
  const { kod: iliski } = h.iliskiEkle({ evren, a: kisi, b: a, tur: 'uye' });
  const t = (x: Partial<DonusumGirdisi> = {}): DonusumGirdisi => ({ bicim: 'birlesme', kaynaklar: [a, b], hedefler: [c], tarih: '450', olay, devirler: [], not: '', ...x });
  const yaz = (x: Partial<DonusumGirdisi> = {}, kod?: string) => h.donusumYaz({ evren, kod, tanim: t(x) }).kod;
  const liste = (k = a) => h.donusumListesi({ evren, kayit: k });
  const kopya = () => { const diger = cihaz(); diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) }); return diger; };
  const al = (diger: Hizmet) => h.islemleriAl({ evren, islemler: diger.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
  return { h, evren, a, b, c, kisi, olay, iliski, t, yaz, liste, kopya, al };
}

describe('evren içi dönüşüm (F25)', () => {
  it('birleşme iki tarafta ve olayda görünür; kayıtların kimliği, geçmişi ve ilişkileri korunur', () => {
    const { h, evren, a, b, c, kisi, iliski, olay, yaz, liste } = kur();
    const once = [a, b, c].map((kod) => h.kayit({ evren, kod }));
    const iliskiler = h.iliskiler({ evren, kod: kisi });
    const kod = yaz({ devirler: [{ kaynak: a, hedef: c, tur: 'uyeler', aciklama: '', iliski: null }, { kaynak: b, hedef: c, tur: 'adlandirilan', aciklama: 'Salon', iliski: null }, { kaynak: a, hedef: c, tur: 'iliski', aciklama: '', iliski }] });
    expect(liste()[0]).toMatchObject({ kod, geriAlindi: false, tanim: { tarih: { ifade: '450' }, devirler: [{ tur: 'uyeler' }, { aciklama: 'Salon' }, { iliski, aciklama: expect.stringContaining('Neru') }] } });
    for (const k of [a, b, c, olay]) expect(liste(k).map((d) => d.kod)).toEqual([kod]);
    expect([a, b, c].map((kod) => h.kayit({ evren, kod }))).toEqual(once);
    expect(h.iliskiler({ evren, kod: kisi })).toEqual(iliskiler);
    expect(h.iliskiler({ evren, kod: c })).toEqual([]);
    expect(liste()[0].tanim.devirler).toHaveLength(3);
  });
  it('bölünmede seçilen devirler hedeflerine ayrı ayrı yazılır; dönüşüm bir devam kaydı gösterir', () => {
    const { a, b, c, yaz, liste } = kur();
    const kod = yaz({ bicim: 'bolunme', kaynaklar: [a], hedefler: [b, c], devirler: [{ kaynak: a, hedef: b, tur: 'haklar', aciklama: '', iliski: null }, { kaynak: a, hedef: c, tur: 'esya', aciklama: '', iliski: null }] });
    expect(liste(b)[0].tanim.devirler.map((d) => d.hedef)).toEqual([b, c]);
    yaz({ bicim: 'donusum', kaynaklar: [a], hedefler: [c], tarih: 'yaklaşık 470', olay: null }, kod);
    expect(liste()[0]).toMatchObject({ tanim: { bicim: 'donusum', kaynaklar: [a], hedefler: [c], tarih: { bicim: 'yaklasik' }, devirler: [] } });
    expect(liste(b)).toEqual([]);
  });
  it('yeni devam kayıtları ve dönüşüm tek işlem grubudur; geri alma tek adımdır ve bağımsız kayıtları korur', () => {
    const { h, evren, a, b, t, liste } = kur();
    const yeni = yeniKod(), gordu = h.gorulenler({ evren });
    const { kod } = h.donusumYaz({ evren, tanim: t({ hedefler: [yeni] }), yeniKayitlar: [{ kod: yeni, ad: 'Çiy Birliği', tur: 'topluluk' }] });
    const islemler = h.islemleriVer({ evren, gorulen: gordu });
    expect(islemler.map((i) => i.tur)).toEqual(['kayit_olustur', 'metin', 'donusum_yaz']);
    expect(new Set(islemler.map((i) => i.grup)).size).toBe(1);
    expect(islemler[0].grup).not.toBeNull();
    const once = h.gorulenler({ evren });
    h.donusumGeriAl({ evren, kod });
    expect(h.islemleriVer({ evren, gorulen: once }).map((i) => i.tur)).toEqual(['donusum_geri_al']);
    expect(liste()[0].geriAlindi).toBe(true);
    for (const k of [a, b, yeni]) expect(h.kayit({ evren, kod: k })).toMatchObject({ silindi: null, birlesti: null });
    h.donusumYaz({ evren, kod, tanim: t({ hedefler: [yeni] }) });
    expect(liste(yeni)[0].geriAlindi).toBe(false);
  });
  it('hatalı yeni kayıtla kısmi dönüşüm ya da kayıt yazılmaz', () => {
    const { h, evren, t, liste } = kur();
    const yeni = yeniKod(), once = h.gorulenler({ evren });
    expect(() => h.donusumYaz({ evren, tanim: t({ hedefler: [yeni], tarih: '' }), yeniKayitlar: [{ kod: yeni, ad: 'Kırağı', tur: 'topluluk' }] })).toThrow();
    expect(h.islemleriVer({ evren, gorulen: once })).toEqual([]);
    expect(h.kayitlar({ evren }).some((k) => k.kod === yeni)).toBe(false);
    expect(liste()).toEqual([]);
  });
  it('silinmiş önceki, devam ve olay kayıtları reddedilir', () => {
    for (const alan of ['a', 'c', 'olay'] as const) {
      const f = kur(); f.h.kayitSil({ evren: f.evren, kod: f[alan] });
      expect(() => f.yaz()).toThrow(/silinmiş/);
      expect(f.liste()).toEqual([]);
    }
  });
  it('kendine dönüşüm, tekrarlı seçim ve biçime uymayan kayıt sayıları reddedilir', () => {
    const { a, b, c, yaz } = kur();
    for (const x of [
      { bicim: 'donusum' as const, kaynaklar: [a], hedefler: [a] },
      { kaynaklar: [a, a] }, { kaynaklar: [a] }, { hedefler: [b, c] },
      { bicim: 'bolunme' as const, kaynaklar: [a], hedefler: [c] },
      { bicim: 'donusum' as const, kaynaklar: [a, b] },
    ]) expect(() => yaz(x)).toThrow();
  });
  it('devir yalnız seçili taraflar ve önceki kaydın mevcut ilişkileri için yazılır', () => {
    const { a, b, c, kisi, iliski, yaz, liste } = kur();
    for (const x of [
      { kaynak: kisi, hedef: c, tur: 'uyeler' as const, aciklama: '', iliski: null },
      { kaynak: a, hedef: b, tur: 'esya' as const, aciklama: '', iliski: null },
      { kaynak: b, hedef: c, tur: 'iliski' as const, aciklama: '', iliski },
      { kaynak: a, hedef: c, tur: 'adlandirilan' as const, aciklama: '', iliski: null },
    ]) expect(() => yaz({ devirler: [x] })).toThrow();
    yaz({ olay: null });
    expect(liste()[0].tanim.devirler).toEqual([]);
  });
  it('olay bağlantısı tarihi kendiliğinden değiştirmez; ilişki açıklaması seçildiği hâliyle kalır', () => {
    const { h, evren, a, c, kisi, olay, iliski, yaz, liste } = kur();
    yaz({ devirler: [{ kaynak: a, hedef: c, tur: 'iliski', aciklama: '', iliski }] });
    h.kayitTarih({ evren, kod: olay, ifade: '900' });
    h.kayitDegistir({ evren, kod: kisi, alan: 'ad', deger: 'Neruva' });
    expect(liste()[0].tanim.tarih.ifade).toBe('450');
    expect(liste()[0].tanim.devirler[0].aciklama).toContain('Neru');
    expect(liste()[0].tanim.devirler[0].aciklama).not.toContain('Neruva');
    expect(() => yaz({ olay: c })).toThrow(/olay seçin/);
  });
  it('aynı dönüşümün iki cihazdaki bütün yazımları görünür ve seçilen yazım tüm cihazlarda kalır', () => {
    const { h, evren, a, c, t, yaz, liste, kopya, al } = kur();
    const kod = yaz(), diger = kopya();
    yaz({ tarih: '460', not: 'Birinci yazım' }, kod);
    diger.donusumYaz({ evren, kod, tanim: t({ tarih: '470', not: 'İkinci yazım', devirler: [{ kaynak: a, hedef: c, tur: 'ad', aciklama: '', iliski: null }] }) });
    al(diger);
    const catisma = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.nesne === kod);
    expect(catisma?.tur).toBe('alan');
    if (!catisma || catisma.tur !== 'alan') throw new Error('Çatışma bulunamadı');
    expect(catisma.degerler).toHaveLength(2);
    expect(liste()[0].catismali).toBe(true);
    const secilen = catisma.degerler.find((d) => d.yazi?.includes('İkinci yazım'))!;
    h.alanCatismasiCoz({ evren, nesne: kod, alan: 'donusum_degeri', islem: secilen.islem });
    expect(liste()[0]).toMatchObject({ catismali: false, tanim: { tarih: { ifade: '470' }, not: 'İkinci yazım', devirler: [{ tur: 'ad' }] } });
    diger.islemleriAl({ evren, islemler: h.islemleriVer({ evren, gorulen: diger.gorulenler({ evren }) }) });
    expect(diger.donusumListesi({ evren, kayit: a })).toEqual(liste());
  });
  it('geri alma ile eşzamanlı düzenleme de çatışır; geri alınan yazım seçilebilir', () => {
    const { h, evren, t, yaz, liste, kopya, al } = kur();
    const kod = yaz(), diger = kopya();
    h.donusumGeriAl({ evren, kod });
    diger.donusumYaz({ evren, kod, tanim: t({ tarih: '480' }) }); al(diger);
    const c = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.nesne === kod);
    if (!c || c.tur !== 'alan') throw new Error('Çatışma bulunamadı');
    h.alanCatismasiCoz({ evren, nesne: kod, alan: 'donusum_degeri', islem: c.degerler.find((d) => d.yazi?.includes('Geri alındı'))!.islem });
    expect(liste()[0]).toMatchObject({ geriAlindi: true, catismali: false });
  });
  it('kaybeden yazımda yer alan devam kaydı çatışmanın çözümüne erişebilir', () => {
    const { h, evren, a, b, c, t, yaz, liste, kopya, al } = kur();
    const kod = yaz({ bicim: 'donusum', kaynaklar: [a], hedefler: [b] }), diger = kopya();
    yaz({ bicim: 'donusum', kaynaklar: [a], hedefler: [b], tarih: '460' }, kod);
    diger.donusumYaz({ evren, kod, tanim: t({ bicim: 'donusum', kaynaklar: [a], hedefler: [c], tarih: '470' }) }); al(diger);
    for (const k of [b, c]) expect(liste(k)[0]).toMatchObject({ kod, catismali: true });
    expect(h.catismalar({ evren }).some((c) => c.tur === 'alan' && c.nesne === kod)).toBe(true);
  });
  it('işlem günlüğünden yeniden kurulur; silinen katılımcının tarihli bildirimi korunur', () => {
    const { h, evren, a, c, yaz, liste, kopya } = kur();
    yaz(); h.kayitSil({ evren, kod: c });
    expect(liste()[0].hedefler[0].ad).toContain('silinmiş');
    expect(kopya().donusumListesi({ evren, kayit: a })).toEqual(liste());
  });
  it('birleşmiş kayıt kodları okurken ve yazarken birleştiği kayda çevrilir', () => {
    const { h, evren, a, b, c, yaz, liste } = kur();
    const kod = yaz({ devirler: [{ kaynak: a, hedef: c, tur: 'uyeler', aciklama: '', iliski: null }] });
    const yeni = h.kayitOlustur({ evren, ad: 'Uydurma Çakıl Birliği', tur: 'topluluk' }).kod;
    h.birlestir({ evren, kaynak: a, hedef: yeni });
    const l = liste(yeni);
    expect(l.map((d) => d.kod)).toEqual([kod]);
    expect(l[0].kaynaklar[0]).toMatchObject({ kod: yeni, ad: 'Uydurma Çakıl Birliği' });
    const d = l[0];
    h.donusumYaz({ evren, kod, tanim: { ...d.tanim, tarih: d.tanim.tarih.ifade, not: 'Düzenlendi' } });
    expect(liste(yeni)[0].tanim).toMatchObject({ kaynaklar: [yeni, b], not: 'Düzenlendi', devirler: [{ kaynak: yeni }] });
  });
});
