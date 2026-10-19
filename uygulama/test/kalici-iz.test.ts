import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => {
    let x = dosyalar.get(d);
    if (!x) {
      x = new sqlite3.oo1.DB(':memory:');
      dosyalar.set(d, x);
    }
    return x;
  };
  return new Hizmet(ac, 'Deneme', 'x');
}

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string, tarih = '') => {
    const { kod } = h.kayitOlustur({ evren, ad, tur });
    if (tarih) h.kayitTarih({ evren, kod, ifade: tarih });
    return kod;
  };
  const sehir = kayit('Kuzeyhisar', 'sehir');
  const meydan = kayit('Bakır Meydanı', 'mekan');
  const kisi = kayit('Alaz', 'karakter');
  const kusatma = kayit('Güz Kuşatması', 'olay', '320');
  const yangin = kayit('Tersane Yangını', 'olay', '180');
  const antlasma = kayit('Tuz Antlaşması', 'olay', '180');
  const soylenti = kayit('Kayıp Kervan Vakası', 'olay');
  return { h, evren, sehir, meydan, kisi, kusatma, yangin, antlasma, soylenti };
}

describe('geçmişin bugünkü izleri (F11)', () => {
  it('olaya iz eklenir, değiştirilir, kaldırılır ve geri getirilir; kısa vadeli ve kalıcı ayrı listelenir', () => {
    const { h, evren, sehir, meydan, kisi, kusatma } = kur();

    const { kod: kisaKod } = h.izKaydiYaz({
      evren,
      olay: kusatma,
      tur: 'kisa_vadeli',
      ad: 'Tahıl karnesi uygulaması',
      yer: sehir,
      bitis: '322',
      gercekKoken: 'Ambarların yarısı kuşatmada yandığı için kondu.',
      anlatilanHikaye: 'Valinin halka eşit pay dağıtmak istediği söylenir.',
    });

    const { kod: kaliciKod } = h.izKaydiYaz({
      evren,
      olay: kusatma,
      tur: 'kalici',
      ad: 'Küllü Burç Mezarlığı',
      yer: meydan,
      gercekKoken: 'Kuzey kapısında düşen savunmacılar buraya gömüldü.',
      anlatilanHikaye: 'Eski kralların efsanevi mezarlığı sanılır.',
    });

    let izler = h.olayIzleri({ evren, olay: kusatma });
    expect(izler.kisaVadeli).toHaveLength(1);
    expect(izler.kalici).toHaveLength(1);
    expect(izler.kisaVadeli[0]).toMatchObject({
      kod: kisaKod,
      tur: 'kisa_vadeli',
      ad: 'Tahıl karnesi uygulaması',
      yer: { kod: sehir, ad: 'Kuzeyhisar' },
      bitis: { ifade: '322' },
      gercekKoken: 'Ambarların yarısı kuşatmada yandığı için kondu.',
      anlatilanHikaye: 'Valinin halka eşit pay dağıtmak istediği söylenir.',
    });
    expect(izler.kalici[0]).toMatchObject({
      kod: kaliciKod,
      tur: 'kalici',
      ad: 'Küllü Burç Mezarlığı',
      yer: { kod: meydan, ad: 'Bakır Meydanı' },
      bitis: null,
    });

    // Güncelleme: kısa vadeli sonuç kalıcı ize çevrilir ve metinleri güncellenir
    h.izKaydiYaz({
      evren,
      kod: kisaKod,
      olay: kusatma,
      tur: 'kalici',
      ad: 'Güz Vergisi Muafiyeti',
      yer: sehir,
      bitis: null,
      gercekKoken: 'Loncaların borcuna karşılık verildi.',
      anlatilanHikaye: 'Kuşatma kahramanlarına ödül olarak anlatılır.',
    });

    izler = h.olayIzleri({ evren, olay: kusatma });
    expect(izler.kisaVadeli).toHaveLength(0);
    expect(izler.kalici.map((x) => x.ad)).toEqual(['Güz Vergisi Muafiyeti', 'Küllü Burç Mezarlığı']);

    // Kaldırma ve geri getirme
    h.izKaydiSil({ evren, kod: kisaKod });
    izler = h.olayIzleri({ evren, olay: kusatma });
    expect(izler.kalici.map((x) => x.kod)).toEqual([kaliciKod]);
    expect(izler.silinenler.map((x) => x.kod)).toEqual([kisaKod]);

    h.izKaydiGeriYukle({ evren, kod: kisaKod });
    izler = h.olayIzleri({ evren, olay: kusatma });
    expect(izler.kalici).toHaveLength(2);
    expect(izler.silinenler).toHaveLength(0);

    // Doğrulamalar ve işlem günlüğü
    expect(() => h.izKaydiYaz({ evren, olay: kusatma, tur: 'kalici', ad: '   ' })).toThrow(/boş olamaz/);
    expect(() => h.izKaydiYaz({ evren, olay: sehir, tur: 'kalici', ad: 'Yanlış sahip' })).toThrow(/olay/);
    expect(() => h.izKaydiYaz({ evren, olay: kusatma, tur: 'kalici', ad: 'Yanlış yer', yer: kisi })).toThrow(/mekân veya şehir/);

    const gunluk = h.islemGunlugu({ evren, sinir: 10 });
    expect(gunluk.some((i) => i.tur === 'iz_kaydi_yaz' && i.veri.ad === 'Güz Vergisi Muafiyeti')).toBe(true);
    expect(gunluk.some((i) => i.tur === 'iz_kaydi_geri_yukle')).toBe(true);
  });

  it('mekân sayfasında izler olay tarihine göre sıralı dönem katmanları olarak gruplanır; tarihsiz olay ayrı gruptadır', () => {
    const { h, evren, sehir, kusatma, yangin, antlasma, soylenti } = kur();

    // Tarih 320
    h.izKaydiYaz({
      evren,
      olay: kusatma,
      tur: 'kalici',
      ad: 'Güz Ağıdı Şarkısı',
      yer: sehir,
      gercekKoken: 'Nöbetçilerin yaktığı türkü.',
      anlatilanHikaye: 'Eski bir düğün havası sanılır.',
    });
    // Tarihsiz olay
    h.izKaydiYaz({
      evren,
      olay: soylenti,
      tur: 'kalici',
      ad: 'Kervankıran Geçidi adı',
      yer: sehir,
    });
    // Tarih 180 (iki farklı olay aynı tarihte)
    h.izKaydiYaz({
      evren,
      olay: yangin,
      tur: 'kalici',
      ad: 'Yanık İskele semt adı',
      yer: sehir,
    });
    h.izKaydiYaz({
      evren,
      olay: antlasma,
      tur: 'kisa_vadeli',
      ad: 'Tuz Gümrüğü İndirimi',
      yer: sehir,
      bitis: '210',
    });

    const katmanlar = h.mekanIzKatmanlari({ evren, yer: sehir });
    expect(katmanlar.map((k) => ({ baslik: k.baslik, tarihsiz: k.tarihsiz, adlar: k.izler.map((i) => i.ad) }))).toEqual([
      {
        baslik: '180',
        tarihsiz: false,
        adlar: ['Yanık İskele semt adı', 'Tuz Gümrüğü İndirimi'],
      },
      {
        baslik: '320',
        tarihsiz: false,
        adlar: ['Güz Ağıdı Şarkısı'],
      },
      {
        baslik: 'Tarihsiz',
        tarihsiz: true,
        adlar: ['Kervankıran Geçidi adı'],
      },
    ]);
  });

  it('silinen olayın izleri listelenmez, olay geri yüklenince döner', () => {
    const { h, evren, sehir, kusatma, yangin } = kur();

    h.izKaydiYaz({ evren, olay: yangin, tur: 'kalici', ad: 'Kömürlü Çeşme', yer: sehir });
    h.izKaydiYaz({ evren, olay: kusatma, tur: 'kalici', ad: 'Gedik Sokağı adı', yer: sehir });

    expect(h.mekanIzKatmanlari({ evren, yer: sehir }).flatMap((k) => k.izler.map((i) => i.ad))).toEqual([
      'Kömürlü Çeşme',
      'Gedik Sokağı adı',
    ]);

    // Olay silinince hem olay sayfasında hem mekân katmanlarında görünmez
    h.kayitSil({ evren, kod: yangin });
    expect(h.olayIzleri({ evren, olay: yangin }).kalici).toHaveLength(0);
    expect(h.mekanIzKatmanlari({ evren, yer: sehir }).flatMap((k) => k.izler.map((i) => i.ad))).toEqual([
      'Gedik Sokağı adı',
    ]);

    // Olay geri yüklenince izleri geri döner
    h.kayitGeriYukle({ evren, kod: yangin });
    expect(h.olayIzleri({ evren, olay: yangin }).kalici.map((i) => i.ad)).toEqual(['Kömürlü Çeşme']);
    expect(h.mekanIzKatmanlari({ evren, yer: sehir }).flatMap((k) => k.izler.map((i) => i.ad))).toEqual([
      'Kömürlü Çeşme',
      'Gedik Sokağı adı',
    ]);
  });

  it('iki cihazda aynı iz kaydının farklı yazımı çatışma olarak görünür ve çözülür', () => {
    const { h, evren, sehir, kusatma } = kur();
    const { kod: izKod } = h.izKaydiYaz({
      evren,
      olay: kusatma,
      tur: 'kalici',
      ad: 'Demir Kapı Türküsü',
      yer: sehir,
      gercekKoken: 'İlk köken notu.',
      anlatilanHikaye: 'İlk hikâye notu.',
    });

    const b = cihaz();
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });

    h.izKaydiYaz({
      evren,
      kod: izKod,
      olay: kusatma,
      tur: 'kalici',
      ad: 'Demir Kapı Türküsü',
      yer: sehir,
      gercekKoken: 'Masaüstünde yazılan gerçek köken.',
      anlatilanHikaye: 'İlk hikâye notu.',
    });

    b.izKaydiYaz({
      evren,
      kod: izKod,
      olay: kusatma,
      tur: 'kalici',
      ad: 'Demir Kapı Ağıdı',
      yer: sehir,
      gercekKoken: 'İlk köken notu.',
      anlatilanHikaye: 'Tablette yazılan anlatılan hikâye.',
    });

    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });

    const c = h.catismalar({ evren }).find((x) => x.tur === 'alan' && x.nesne === izKod && x.alan === 'iz_kaydi');
    if (c?.tur !== 'alan') throw new Error('İz kaydı çatışması bekleniyordu.');
    expect(c.alanEtiketi).toBe('Geçmişin izi');
    expect(c.degerler).toHaveLength(2);

    const secilen = c.degerler.find((d) => d.yazi?.includes('Demir Kapı Ağıdı'))!;
    h.alanCatismasiCoz({ evren, nesne: izKod, alan: 'iz_kaydi', islem: secilen.islem });

    expect(h.catismalar({ evren }).filter((x) => x.tur === 'alan' && x.nesne === izKod)).toHaveLength(0);
    const guncel = h.olayIzleri({ evren, olay: kusatma }).kalici[0];
    expect(guncel).toMatchObject({
      kod: izKod,
      ad: 'Demir Kapı Ağıdı',
      anlatilanHikaye: 'Tablette yazılan anlatılan hikâye.',
    });
  });
});
