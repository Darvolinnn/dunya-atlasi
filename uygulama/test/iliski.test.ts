import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, jpegBilgiSil, pngBilgiSil, type GorselIsleyici } from '../src/calisan/medya';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
  const depo = new BellekDeposu();
  const h = new Hizmet(ac, 'Deneme', 'x', () => {}, depo, sahteIsleyici);
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  return { h, evren, ac, depo };
}
const metni = (h: Hizmet, evren: string, kayit: string) => {
  const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
  return d.textBetween(0, d.content.size, '\n');
};

describe('evren tarihi ve alan kararı', () => {
  it('tarih ifadesiyle saklanır; alan fikre çevrilir', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'Kuşatma', tur: 'olay' });
    h.kayitTarih({ evren, kod, ifade: 'yaklaşık 412' });
    expect(h.kayit({ evren, kod }).tarih).toMatchObject({ ifade: 'yaklaşık 412', bicim: 'yaklasik' });
    h.alanKarari({ evren, kod, alan: 'tarih', karar: 'fikir' });
    expect(h.kayit({ evren, kod }).alanKararlari).toEqual({ tarih: 'fikir' });
    h.alanKarari({ evren, kod, alan: 'tarih', karar: 'kesin' });
    expect(h.kayit({ evren, kod }).alanKararlari).toEqual({});
    h.kayitTarih({ evren, kod, ifade: '' });
    expect(h.kayit({ evren, kod }).tarih).toBeNull();
  });
});

describe('ilişkiler', () => {
  it('iki yönden okunur; karşı kayıt çöpteyken gizlenir; tarih uyarısı', () => {
    const { h, evren } = kur();
    const aldren = h.kayitOlustur({ evren, ad: 'Aldren', tur: 'karakter' }).kod;
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const { kod } = h.iliskiEkle({ evren, tur: 'ebeveyn', a: aldren, b: elin, baslangic: '430', bitis: '420' });
    expect(h.iliskiler({ evren, kod: aldren })[0]).toMatchObject({ etiket: 'Çocuğu', karsi: { ad: 'Elin' }, uyari: 'Bitiş, başlangıçtan önce görünüyor.' });
    expect(h.iliskiler({ evren, kod: elin })[0]).toMatchObject({ etiket: 'Ebeveyni', karsi: { ad: 'Aldren' } });
    h.iliskiDegistir({ evren, kod, alan: 'bitis', deger: '' });
    expect(h.iliskiler({ evren, kod: elin })[0].uyari).toBeNull();
    h.kayitSil({ evren, kod: elin });
    expect(h.iliskiler({ evren, kod: aldren })).toEqual([]);
    h.kayitGeriYukle({ evren, kod: elin });
    expect(h.iliskiler({ evren, kod: aldren })).toHaveLength(1);
    h.iliskiSil({ evren, kod });
    expect(h.iliskiler({ evren, kod: aldren })).toEqual([]);
    expect(() => h.iliskiEkle({ evren, tur: 'es', a: elin, b: elin })).toThrow('kendisiyle');
    expect(() => h.iliskiEkle({ evren, tur: 'sahnede', a: elin, b: aldren, rol: 'yok' })).toThrow('rol');
  });
});

describe('sahne olayı', () => {
  it('ilk değişimle oluşur, sahneyle bağlıdır, tarihi sahneden gelir; ikinci değişim aynı olaya gider', () => {
    const { h, evren } = kur();
    const sahne = h.kayitOlustur({ evren, ad: 'Kuşatmanın ilk gecesi', tur: 'sahne' }).kod;
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    expect(h.sahneOlaylari({ evren, sahne })).toEqual([]);
    h.kayitTarih({ evren, kod: sahne, ifade: '412' });
    const r1 = h.degisimEkle({ evren, sahne, konu: elin, metin: 'Eli yaralandı' });
    const r2 = h.degisimEkle({ evren, sahne, metin: 'Kapı kilitlendi' });
    expect(r2.olay).toBe(r1.olay);
    const olaylar = h.sahneOlaylari({ evren, sahne });
    expect(olaylar).toHaveLength(1);
    expect(olaylar[0]).toMatchObject({ ad: 'Sahne: Kuşatmanın ilk gecesi', sahneOlayi: true, tarih: { ifade: '412' } });
    expect(olaylar[0].degisimler.map((d) => d.metin)).toEqual(['Eli yaralandı', 'Kapı kilitlendi']);
    expect(h.kayit({ evren, kod: r1.olay }).sahneOlayi).toBe(sahne);
    expect(h.kayitDegisimleri({ evren, kod: elin })).toMatchObject([{ metin: 'Eli yaralandı', sahne: { ad: 'Kuşatmanın ilk gecesi' }, tarih: { ifade: '412' } }]);
    // İkinci sahne aynı olayı anlatır; değişim bir kez kaydedilir.
    const sahne2 = h.kayitOlustur({ evren, ad: 'Ertesi sabah', tur: 'sahne' }).kod;
    h.iliskiEkle({ evren, tur: 'anlatir', a: sahne2, b: r1.olay });
    expect(h.sahneOlaylari({ evren, sahne: sahne2 })[0]).toMatchObject({ sahneOlayi: false, degisimler: [{}, {}] });
    h.degisimSil({ evren, kod: h.kayitDegisimleri({ evren, kod: elin })[0].kod });
    expect(h.kayitDegisimleri({ evren, kod: elin })).toEqual([]);
  });
});

describe('hızlı not', () => {
  it('ilk satır ad olur, metin korunur; not kayda dönüşür ve bağlı kalır', () => {
    const { h, evren } = kur();
    const { kod, ad } = h.hizliNot({ evren, metin: 'Kuzeyli bir demirci kız\nBabası lonca ustası' });
    expect(ad).toBe('Kuzeyli bir demirci kız');
    expect(h.kayit({ evren, kod })).toMatchObject({ tur: 'not', karar: 'fikir' });
    expect(metni(h, evren, kod)).toBe('Kuzeyli bir demirci kız\nBabası lonca ustası');
    const yeni = h.nottanKayit({ evren, not: kod, ad: 'Mira', tur: 'karakter' }).kod;
    expect(metni(h, evren, yeni)).toBe('Kuzeyli bir demirci kız\nBabası lonca ustası');
    expect(h.iliskiler({ evren, kod: yeni })[0]).toMatchObject({ etiket: 'Doğduğu not', karsi: { kod } });
    expect(h.kayit({ evren, kod }).tur).toBe('not');
    expect(() => h.hizliNot({ evren, metin: '   ' })).toThrow('boş');
  });
});

describe('görseller', () => {
  it('içerikle adlandırılır, bir kez saklanır, kayda eklenir ve çıkarılır', async () => {
    const { h, evren, depo } = kur();
    const a = h.kayitOlustur({ evren, ad: 'A', tur: 'mekan' }).kod;
    const b = h.kayitOlustur({ evren, ad: 'B', tur: 'mekan' }).kod;
    const veri = new Uint8Array([1, 2, 3, 4]);
    const r1 = await h.gorselEkle({ evren, kod: a, dosyaAdi: 'harita.png', tur: 'image/png', veri });
    const r2 = await h.gorselEkle({ evren, kod: b, dosyaAdi: 'kopya.png', tur: 'image/png', veri });
    expect(r1.ad).toBe(r2.ad);
    expect(r1.ad).toMatch(/^[0-9a-f]{64}$/);
    expect(depo.dosyalar.size).toBe(1);
    expect((await h.gorselEkle({ evren, kod: a, dosyaAdi: 'x', tur: 'image/png', veri })).yeni).toBe(false);
    expect(h.kayit({ evren, kod: a }).gorseller).toEqual([r1.ad]);
    expect(await h.gorsel({ evren, ad: r1.ad })).toMatchObject({ durum: 'var', tur: 'image/png', en: 10 });
    h.kayitGorselCikar({ evren, kod: a, ad: r1.ad });
    expect(h.kayit({ evren, kod: a }).gorseller).toEqual([]);
    depo.dosyalar.clear();
    expect((await h.gorsel({ evren, ad: r1.ad })).durum).toBe('indirilmemis');
    expect((await h.gorsel({ evren, ad: 'f'.repeat(64) })).durum).toBe('yok');
  });

  it('JPEG konum bilgisi ve PNG metin bölümleri silinir', () => {
    // SOI, APP1 Exif (yön 6, büyük-sonlu), APP0, SOS + veri
    const tiff = [0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0];
    const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    const app1 = [0xff, 0xe1, 0, exif.length + 2, ...exif];
    const app0 = [0xff, 0xe0, 0, 4, 1, 2];
    const jpeg = new Uint8Array([0xff, 0xd8, ...app1, ...app0, 0xff, 0xda, 9, 9, 9, 0xff, 0xd9]);
    const r = jpegBilgiSil(jpeg);
    expect(r.yon).toBe(6);
    expect([...r.veri]).toEqual([0xff, 0xd8, ...app0, 0xff, 0xda, 9, 9, 9, 0xff, 0xd9]);
    const parca = (tur: string, govde: number[]) => [0, 0, 0, govde.length, ...[...tur].map((c) => c.charCodeAt(0)), ...govde, 0, 0, 0, 0];
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...parca('IHDR', [1]), ...parca('eXIf', [7, 7]), ...parca('IEND', [])]);
    expect([...pngBilgiSil(png)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...parca('IHDR', [1]), ...parca('IEND', [])]);
  });
});
