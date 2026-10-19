import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string, tarih = '') => {
    const { kod } = h.kayitOlustur({ evren, ad, tur });
    if (tarih) h.kayitTarih({ evren, kod, ifade: tarih });
    return kod;
  };
  return { h, evren, kayit };
}

describe('kişi, kimlik ve beden (F06)', () => {
  it('kimliğe taşınan gizli ilişkinin bilgi katmanı ve bilenleri korunur', () => {
    const { h, evren, kayit } = kur();
    const kisi = kayit('Neru', 'karakter'), bilen = kayit('Çiy Bekçisi', 'karakter'), olay = kayit('Gizli buluşma', 'olay');
    const { kod: iliski } = h.iliskiEkle({ evren, a: kisi, b: olay, tur: 'olayda', rol: 'tanik' });
    h.gorunurlukYaz({ evren, nesne: 'iliski', kod: iliski, deger: { katman: null, gizli: true, bilenler: [bilen] } });
    const onceki = h.iliskiler({ evren, kod: kisi }).find((i) => i.kod === iliski)!.gorunurluk;
    const { kod: kimlik } = h.kimlikAyir({ evren, kisi, ad: 'Çiy Maskesi', iliskiler: [iliski] });
    const tasinan = h.iliskiler({ evren, kod: kimlik }).find((i) => i.tur === 'olayda')!;
    expect(tasinan.gorunurluk).toEqual(onceki);
    expect(tasinan.gorunurluk?.bilenler.map((k) => k.kod)).toEqual([bilen]);
  });
  it('birleştirilmiş eski kişi kodu okuma, ayırma adayları ve kimliğe ayırmada korunan kişiye yönlenir', () => {
    const { h, evren, kayit } = kur();
    const eski = kayit('Neru eski kayıt', 'karakter'), kisi = kayit('Neru', 'karakter');
    const olay = kayit('Çiy buluşması', 'olay');
    const { kod: iliski } = h.iliskiEkle({ evren, a: eski, b: olay, tur: 'olayda', rol: 'tanik' });
    h.birlestir({ evren, kaynak: eski, hedef: kisi, secimler: {} });
    expect(h.kimlikBilgisi({ evren, kod: eski }).kayit.kod).toBe(kisi);
    expect(h.kimlikAyirmaAdaylari({ evren, kisi: eski }).map((x) => x.iliski)).toContain(iliski);
    const { kod: kimlik } = h.kimlikAyir({ evren, kisi: eski, ad: 'Çiy Maskesi', iliskiler: [iliski] });
    expect(h.kimlikBilgisi({ evren, kod: kisi }).kimlikler[0]).toMatchObject({ kimlik: { kod: kimlik }, olaylar: [{ kod: olay }] });
    expect(() => h.kimlikBirlestirOnizle({ evren, kisi: eski, diger: kisi })).toThrow(/Aynı kayıt/);
  });
  it('iki kaydı bir kişinin iki kimliği olarak birleştirmek: önizleme, tek işlem grubu, kimliğin olayları kişide', () => {
    const { h, evren, kayit } = kur();
    const arven = kayit('Arven', 'karakter'), tilki = kayit('Kara Tilki', 'karakter');
    const soygun = kayit('Hazine soygunu', 'olay', '430');
    h.iliskiEkle({ evren, tur: 'olayda', a: tilki, b: soygun, rol: 'baslatan' });
    h.kayitAlanYaz({ evren, kod: tilki, alan: 'dogum', deger: '400' });
    const o = h.kimlikBirlestirOnizle({ evren, kisi: arven, diger: tilki });
    expect(o.join('\n')).toMatch(/Karakter → Kimlik/);
    expect(o.join('\n')).toMatch(/1 olay ve 0 sahne/);
    expect(o.join('\n')).toMatch(/doğum ve ölüm tarihleri silinmez/);
    const once = h.islemGunlugu({ evren, sinir: 100 }).length;
    h.kimlikBirlestir({ evren, kisi: arven, diger: tilki, baslangic: '425' });
    const yeni = h.islemGunlugu({ evren, sinir: 100 }).slice(0, h.islemGunlugu({ evren, sinir: 100 }).length - once);
    expect(yeni).toHaveLength(2);
    expect(yeni[0].grup).not.toBeNull();
    expect(new Set(yeni.map((i) => i.grup)).size).toBe(1);
    expect(h.kayit({ evren, kod: tilki }).tur).toBe('kimlik');
    const b = h.kimlikBilgisi({ evren, kod: arven });
    expect(b.kimlikler).toHaveLength(1);
    expect(b.kimlikler[0]).toMatchObject({ kimlik: { ad: 'Kara Tilki' }, baslangic: '425', olaylar: [{ ad: 'Hazine soygunu' }] });
    expect(h.kimlikBilgisi({ evren, kod: tilki }).kullananlar[0].kisi.ad).toBe('Arven');
    expect(() => h.kimlikBirlestirOnizle({ evren, kisi: arven, diger: tilki })).toThrow(/zaten/);
    expect(() => h.kimlikBirlestirOnizle({ evren, kisi: arven, diger: soygun })).toThrow(/karakter ya da kimlik/);
  });

  it('bir kişiyi sonradan kimliğe ayırmak: seçilen bağlar yeni kimliğe taşınır, öbürleri kişide kalır', () => {
    const { h, evren, kayit } = kur();
    const arven = kayit('Arven', 'karakter'), baba = kayit('Orin', 'karakter');
    const soygun = kayit('Hazine soygunu', 'olay', '430'), sahne = kayit('Çatıdaki kaçış', 'sahne');
    h.iliskiEkle({ evren, tur: 'ebeveyn', a: arven, b: baba });
    const { kod: s1 } = h.iliskiEkle({ evren, tur: 'olayda', a: arven, b: soygun, rol: 'baslatan', baslangic: '430' });
    const { kod: s2 } = h.iliskiEkle({ evren, tur: 'sahnede', a: arven, b: sahne, rol: 'bulunuyor' });
    const adaylar = h.kimlikAyirmaAdaylari({ evren, kisi: arven });
    expect(adaylar.map((a) => a.baslik)).toEqual(expect.arrayContaining(['Yer aldığı olay: Hazine soygunu', 'Çocuğu: Orin']));
    const { kod: tilki } = h.kimlikAyir({ evren, kisi: arven, ad: 'Kara Tilki', iliskiler: [s1, s2] });
    const b = h.kimlikBilgisi({ evren, kod: arven });
    expect(b.kimlikler[0]).toMatchObject({ kimlik: { kod: tilki, tur: 'kimlik' }, olaylar: [{ ad: 'Hazine soygunu' }], sahneler: [{ ad: 'Çatıdaki kaçış' }] });
    const kalan = h.kimlikAyirmaAdaylari({ evren, kisi: arven }).map((a) => a.baslik);
    expect(kalan).toEqual(['Çocuğu: Orin']);
    expect(() => h.kimlikAyir({ evren, kisi: tilki, ad: 'X', iliskiler: [] })).toThrow(/karakter/);
    expect(() => h.kimlikAyir({ evren, kisi: arven, ad: 'Y', iliskiler: [s1] })).toThrow(/bulunamadı/);
  });

  it('beden: ölümden sonra bulunma, öncesinde dirilme olayı varsa çelişki değildir; yoksa uyarı bunu söyler', () => {
    const { h, evren, kayit } = kur();
    const kral = kayit('Kral Orvan', 'karakter');
    h.kayitAlanYaz({ evren, kod: kral, alan: 'olum', deger: '350' });
    const toren = kayit('Taç töreni', 'olay', '370');
    h.iliskiEkle({ evren, tur: 'olayda', a: kral, b: toren, rol: 'katilan' });
    let y = h.denetimler({ evren }).acik.filter((b) => b.kural === 'yasam');
    expect(y).toHaveLength(1);
    expect(y[0].dayanak).toMatch(/dirilme olayı yok/);
    const diril = kayit('Mezardan dönüş', 'olay', '360');
    h.iliskiEkle({ evren, tur: 'olayda', a: kral, b: diril, rol: 'dirilen' });
    y = h.denetimler({ evren }).acik.filter((b) => b.kural === 'yasam');
    expect(y).toHaveLength(0);
    const eski = kayit('Kuşatma', 'olay', '355');
    h.iliskiEkle({ evren, tur: 'olayda', a: kral, b: eski, rol: 'katilan' });
    y = h.denetimler({ evren }).acik.filter((b) => b.kural === 'yasam');
    expect(y.map((x) => x.baslik)).toEqual([expect.stringContaining('Kuşatma')]);
    expect(y[0].dayanak).not.toMatch(/dirilme olayı yok/);
  });

  it('kimliğe dönen kaydın doğum ve ölüm tarihi denetimde kullanılmaz', () => {
    const { h, evren, kayit } = kur();
    const arven = kayit('Arven', 'karakter'), tilki = kayit('Kara Tilki', 'karakter');
    h.kayitAlanYaz({ evren, kod: tilki, alan: 'olum', deger: '350' });
    const o = kayit('Gece baskını', 'olay', '370');
    h.iliskiEkle({ evren, tur: 'olayda', a: tilki, b: o, rol: 'katilan' });
    expect(h.denetimler({ evren }).acik.filter((b) => b.kural === 'yasam')).toHaveLength(1);
    h.kimlikBirlestir({ evren, kisi: arven, diger: tilki });
    expect(h.denetimler({ evren }).acik.filter((b) => b.kural === 'yasam')).toHaveLength(0);
  });
});
