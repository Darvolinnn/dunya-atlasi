// F32 Bakım ve tekrarlar (§16.1) sınamaları.
import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { GUN_PARCA, type Takvim } from '../src/alan/tarih';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;

beforeAll(async () => {
  sqlite = await sqlite3InitModule();
});

function yeniHizmet() {
  const dbler = new Map<string, Database>();
  return new Hizmet((d) => {
    let db = dbler.get(d);
    if (!db) {
      db = new sqlite.oo1.DB(':memory:');
      dbler.set(d, db);
    }
    return db;
  }, 'Uydurma aygıt', 'x');
}

const DORT_YUZ_TAKVIM: Takvim = {
  kod: 'ana',
  surum: 1,
  ad: 'Güneş',
  yilGun: 400,
  aylar: [
    { ad: 'Akay', gun: 100 },
    { ad: 'Kızıl', gun: 100 },
    { ad: 'Boz', gun: 100 },
    { ad: 'Kar', gun: 100 },
  ],
};

describe('F32 bakım ve tekrarlar', () => {
  it('1. tanım doğrulama: boş ad, sıfır/negatif sıklık, geçersiz birim/karar ve uygunsuz kayıt türü reddedilir', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const kapi = h.kayitOlustur({ evren, ad: 'Kuzey Büyü Kapısı', tur: 'mekan' }).kod;
    const kisi = h.kayitOlustur({ evren, ad: 'Mühürcü Orhan', tur: 'karakter' }).kod;
    const olay = h.kayitOlustur({ evren, ad: 'Büyük Kuşatma', tur: 'olay' }).kod;

    // Boş ad reddedilir
    expect(() =>
      h.bakimTanimYaz({ evren, tanim: { kayit: kapi, ad: '   ' } }),
    ).toThrow(/boş olamaz/i);

    // Sıfır ya da negatif sıklık reddedilir
    expect(() =>
      h.bakimTanimYaz({ evren, tanim: { kayit: kapi, ad: 'Mühür tazeleme', siklik: { deger: 0, birim: 'yil' } } }),
    ).toThrow(/sıfırdan büyük/i);
    expect(() =>
      h.bakimTanimYaz({ evren, tanim: { kayit: kapi, ad: 'Mühür tazeleme', siklik: { deger: -3, birim: 'gun' } } }),
    ).toThrow(/sıfırdan büyük/i);

    // Geçersiz birim reddedilir
    expect(() =>
      h.bakimTanimYaz({
        evren,
        tanim: { kayit: kapi, ad: 'Mühür tazeleme', siklik: { deger: 2, birim: 'asir' as never } },
      }),
    ).toThrow(/birim/i);

    // Geçersiz karar reddedilir
    expect(() =>
      h.bakimTanimYaz({
        evren,
        tanim: { kayit: kapi, ad: 'Mühür tazeleme', karar: 'belki' },
      }),
    ).toThrow(/karar/i);

    // BAKIM_SAHIPLERI dışındaki türlere (karakter, olay) bakım tanımı eklenemez
    expect(() =>
      h.bakimTanimYaz({ evren, tanim: { kayit: kisi, ad: 'Nöbet değişimi' } }),
    ).toThrow(/türünde bakım tanımlanamaz/i);
    expect(() =>
      h.bakimTanimYaz({ evren, tanim: { kayit: olay, ad: 'Anma töreni' } }),
    ).toThrow(/türünde bakım tanımlanamaz/i);

    // Hem kaydı hem açıklaması boş malzeme reddedilir
    expect(() =>
      h.bakimTanimYaz({
        evren,
        tanim: { kayit: kapi, ad: 'Mühür tazeleme', malzemeler: [{ kayit: null, metin: '  ' }] },
      }),
    ).toThrow(/malzeme/i);
  });

  it('2. durum hesabı: yapıldı kaydından sonra zamanında → gecikmiş olabilir → gecikmiş → kesinti başlamış olabilir geçişleri; yarıda ve yapılmadı yapıldı sayılmaz', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const kemer = h.kayitOlustur({ evren, ad: 'Aksu Kemeri', tur: 'mekan' }).kod;

    const { kod: tanimKod } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: kemer,
        ad: 'Kireç ve derz temizliği',
        siklik: { deger: 3, birim: 'yil' },
        kesinti: 'Kemer sızdırır, ardından su akışı durur.',
        kesintiSuresi: { deger: 2, birim: 'yil' },
        karar: 'kesin',
      },
    });

    h.bakimKaydiYaz({
      evren,
      kayit: { tanim: tanimKod, tarih: '428', durum: 'yapildi', not: 'Bahar temizliği' },
    });

    // 428 + 3 yıl = 431
    const d430 = h.bakimDurumu({ evren, kayit: kemer, tarih: '430' }).tanimlar[0];
    expect(d430.durum).toBe('zamaninda');
    expect(d430.durumEtiketi).toBe('zamanında');
    expect(d430.kesinti).toBeNull();

    const d431 = h.bakimDurumu({ evren, kayit: kemer, tarih: '431' }).tanimlar[0];
    expect(d431.durum).toBe('gecikmis_olabilir');
    expect(d431.durumEtiketi).toBe('gecikmiş olabilir');

    const d432 = h.bakimDurumu({ evren, kayit: kemer, tarih: '432' }).tanimlar[0];
    expect(d432.durum).toBe('gecikmis');
    expect(d432.durumEtiketi).toBe('gecikmiş');
    expect(d432.kesinti).toBeNull();

    // 431 + 2 yıl kesinti süresi = 433 ve sonrası
    const d434 = h.bakimDurumu({ evren, kayit: kemer, tarih: '434' }).tanimlar[0];
    expect(d434.durum).toBe('kesinti_olabilir');
    expect(d434.durumEtiketi).toBe('kesinti başlamış olabilir');
    expect(d434.kesinti).toBe('Kemer sızdırır, ardından su akışı durur.');

    // 431'de "yarida" ve 432'de "yapilmadi" kayıtları eklenince sonYapildi yine 428 kalır ("yapıldı" sayılmaz)
    h.bakimKaydiYaz({
      evren,
      kayit: { tanim: tanimKod, tarih: '431', durum: 'yarida', not: 'İskele çöktü' },
    });
    h.bakimKaydiYaz({
      evren,
      kayit: { tanim: tanimKod, tarih: '432', durum: 'yapilmadi', not: 'Bütçe ayrılmadı' },
    });

    const d432Sonrasi = h.bakimDurumu({ evren, kayit: kemer, tarih: '432' }).tanimlar[0];
    expect(d432Sonrasi.sonYapildi?.tarih.ifade).toBe('428');
    expect(d432Sonrasi.durum).toBe('gecikmis');
  });

  it('3. belirsiz tarihli bakım kaydı ("yaklaşık 420"): aralık korunur, tek güne yuvarlanmaz', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const fener = h.kayitOlustur({ evren, ad: 'Uçburun Feneri', tur: 'mekan' }).kod;

    const { kod: tanimKod } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: fener,
        ad: 'Ayna cilası',
        siklik: { deger: 5, birim: 'yil' },
      },
    });

    h.bakimKaydiYaz({
      evren,
      kayit: { tanim: tanimKod, tarih: 'yaklaşık 420', durum: 'yapildi' },
    });

    const durum = h.bakimDurumu({ evren, kayit: fener, tarih: '430' }).tanimlar[0];
    expect(durum.sonYapildi).not.toBeNull();
    expect(durum.sonrakiAralik).not.toBeNull();
    // "yaklaşık 420" varsayılan ±10 yıl ile 410..430 aralığıdır; 5 yıl sonrası 415..435 aralığıdır (tek güne yuvarlanmaz).
    const aralikGenisligiGun = (durum.sonrakiAralik!.enGec - durum.sonrakiAralik!.enErken) / GUN_PARCA;
    expect(aralikGenisligiGun).toBeGreaterThan(365 * 10);
    expect(durum.sonrakiAralik!.yazi).toContain('415');
    expect(durum.sonrakiAralik!.yazi).toContain('435');
    expect(durum.durum).toBe('gecikmis_olabilir');
  });

  it('4. ay ve yıl uzunluğu takvimden gelir: 400 günlük özel takvimde hesap değişir', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const kapi = h.kayitOlustur({ evren, ad: 'Güneş Kapısı', tur: 'buyu_uygulamasi' }).kod;

    const { kod: yillikKod } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: kapi,
        ad: 'Yıllık odak ayarı',
        siklik: { deger: 1, birim: 'yil' },
      },
    });
    const { kod: aylikKod } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: kapi,
        ad: 'Aylık kristal temizliği',
        siklik: { deger: 2, birim: 'ay' },
      },
    });

    h.bakimKaydiYaz({ evren, kayit: { tanim: yillikKod, tarih: '10', durum: 'yapildi' } });
    h.bakimKaydiYaz({ evren, kayit: { tanim: aylikKod, tarih: '10', durum: 'yapildi' } });

    // Varsayılan takvimde (365 gün, aylar tanımlı değil):
    const varsayilanDurum = h.bakimDurumu({ evren, kayit: kapi });
    const yillikVarsayilan = varsayilanDurum.tanimlar.find((x) => x.tanim.kod === yillikKod)!;
    const aylikVarsayilan = varsayilanDurum.tanimlar.find((x) => x.tanim.kod === aylikKod)!;

    // 1 yıl = 365 * GUN_PARCA
    expect(yillikVarsayilan.sonrakiAralik!.enErken - yillikVarsayilan.sonYapildi!.tarih.eksen!.enErken!).toBe(
      365 * GUN_PARCA,
    );
    // Varsayılan takvimde ay tanımı olmadığı için 30 gün varsayılmaz; hesaplanamıyor döner
    expect(aylikVarsayilan.sonrakiAralik).toBeNull();
    expect(aylikVarsayilan.durum).toBe('bilinmiyor');

    // Şimdi 400 günlük (4 x 100 gün aylı) takvimi tanımlayalım:
    h.takvimYaz({ evren, takvim: DORT_YUZ_TAKVIM });

    const yeniDurum = h.bakimDurumu({ evren, kayit: kapi });
    const yillikYeni = yeniDurum.tanimlar.find((x) => x.tanim.kod === yillikKod)!;
    const aylikYeni = yeniDurum.tanimlar.find((x) => x.tanim.kod === aylikKod)!;

    // 1 yıl artık 400 * GUN_PARCA
    expect(yillikYeni.sonrakiAralik!.enErken - yillikYeni.sonYapildi!.tarih.eksen!.enErken!).toBe(400 * GUN_PARCA);
    // 2 ay artık 200 * GUN_PARCA (her ay 100 gün)
    expect(aylikYeni.sonrakiAralik).not.toBeNull();
    expect(aylikYeni.sonrakiAralik!.enErken - aylikYeni.sonYapildi!.tarih.eksen!.enErken!).toBe(200 * GUN_PARCA);
  });

  it('5. kayıt yok !== yapılmadı: bakım kaydı girilmemişken açıklama "bakım kaydı yok" der, "yapılmadı" demez', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const arsiv = h.kayitOlustur({ evren, ad: 'Kraliyet Arşivi', tur: 'mekan' }).kod;

    h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: arsiv,
        ad: 'Nem ve güve ilaçlaması',
        siklik: { deger: 1, birim: 'yil' },
      },
    });

    const sonuc = h.bakimDurumu({ evren, kayit: arsiv, tarih: '500' }).tanimlar[0];
    expect(sonuc.durum).toBe('bilinmiyor');
    expect(sonuc.ozet.toLocaleLowerCase('tr-TR')).toContain('bakım kaydı yok');
    expect(sonuc.ozet.toLocaleLowerCase('tr-TR')).not.toContain('yapılmadı');
    expect(sonuc.dayanak.toLocaleLowerCase('tr-TR')).toContain('bakım kaydı yok');
    expect(sonuc.dayanak.toLocaleLowerCase('tr-TR')).not.toContain('yapılmadı');
  });

  it('6. kesinti cümlesi salt okunur: kesinti_olabilir durumunda yazarın cümlesi döner ama kayıt değişmez', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const kapi = h.kayitOlustur({
      evren,
      ad: 'Derin Geçit Kapısı',
      tur: 'mekan',
      ozet: 'Dağ altındaki mühürlü geçit.',
    }).kod;

    const { kod: tanimKod } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: kapi,
        ad: 'Rün taşlarının beslenmesi',
        siklik: { deger: 2, birim: 'yil' },
        kesinti: 'Kapı önce titrer, bir yıl sonra tamamen kapanır.',
        kesintiSuresi: { deger: 1, birim: 'yil' },
      },
    });
    h.bakimKaydiYaz({ evren, kayit: { tanim: tanimKod, tarih: '100', durum: 'yapildi' } });

    const oncekiKayit = h.kayit({ evren, kod: kapi });
    const oncekiSablon = h.kayitSablonu({ evren, kod: kapi });
    const oncekiIliskiler = h.iliskiler({ evren, kod: kapi });

    const hesap = h.bakimDurumu({ evren, kayit: kapi, tarih: '110' }).tanimlar[0];
    expect(hesap.durum).toBe('kesinti_olabilir');
    expect(hesap.kesinti).toBe('Kapı önce titrer, bir yıl sonra tamamen kapanır.');
    expect(hesap.not).toContain('Grev, ihmal ya da sabotaj kendiliğinden eklenmez.');

    const sonrakiKayit = h.kayit({ evren, kod: kapi });
    const sonrakiSablon = h.kayitSablonu({ evren, kod: kapi });
    const sonrakiIliskiler = h.iliskiler({ evren, kod: kapi });

    expect(sonrakiKayit.ozet).toBe(oncekiKayit.ozet);
    expect(sonrakiKayit.karar).toBe(oncekiKayit.karar);
    expect(sonrakiSablon.degerler).toEqual(oncekiSablon.degerler);
    expect(sonrakiIliskiler).toEqual(oncekiIliskiler);
  });

  it('7. uzman olmayan yapan ve uzmanın yaşam durumu: uzman dışındaki yapan kabul edilir ve bilgi notu döner', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const saat = h.kayitOlustur({ evren, ad: 'Su Saati Kulesi', tur: 'teknoloji' }).kod;
    const usta = h.kayitOlustur({ evren, ad: 'Baş Mekanikçi Синан', tur: 'karakter' }).kod;
    const cirak = h.kayitOlustur({ evren, ad: 'Gezgin Demirci', tur: 'karakter' }).kod;

    // Ustaya ölüm tarihi ekleyelim (430)
    h.kayitAlanYaz({ evren, kod: usta, alan: 'olum', deger: '430' });

    const { kod: tanimKod } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: saat,
        ad: 'Çarkların yağlanması',
        siklik: { deger: 1, birim: 'yil' },
        uzmanlar: [usta],
      },
    });

    // Uzman listesinde olmayan çırak bakımı yapar:
    const eklenen = h.bakimKaydiYaz({
      evren,
      kayit: { tanim: tanimKod, tarih: '425', durum: 'yapildi', yapan: cirak },
    });
    expect(eklenen.bilgiNotu).toBe('Bakımı yapan, tanımdaki uzmanlar arasında değil.');

    const okuma = h.bakimOku({ evren, kayit: saat });
    expect(okuma.tanimlar[0].kayitlar[0].uzmanDisi).toBe(true);
    expect(okuma.tanimlar[0].kayitlar[0].bilgiNotu).toBe('Bakımı yapan, tanımdaki uzmanlar arasında değil.');

    // 435 tarihinde usta yaşamıyor olabilir bilgi satırı döner ama durum hükmü değişmez:
    const durum435 = h.bakimDurumu({ evren, kayit: saat, tarih: '435' }).tanimlar[0];
    expect(durum435.uzmanNotlari.some((n) => n.includes('yaşamıyor olabilir'))).toBe(true);
  });

  it('8. ters görünüm: uzman ve malzeme için bakimUzmanligi ilgili tanımı döndürür; vazgeçilmiş/silinmiş dönmez', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const karakol = h.kayitOlustur({ evren, ad: 'Kuzey Sınır Karakolu', tur: 'mekan' }).kod;
    const lonca = h.kayitOlustur({ evren, ad: 'Taşçılar Loncası', tur: 'topluluk' }).kod;
    const recine = h.kayitOlustur({ evren, ad: 'Dağ Çamı Reçinesi', tur: 'urun' }).kod;

    const { kod: t1 } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: karakol,
        ad: 'Sur çatlaklarının kapatılması',
        siklik: { deger: 2, birim: 'yil' },
        uzmanlar: [lonca],
        malzemeler: [{ kayit: recine, metin: 'üç fıçı' }],
        karar: 'kesin',
      },
    });

    const { kod: tVazgecildi } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: karakol,
        ad: 'Eski hendek bakımı',
        uzmanlar: [lonca],
        malzemeler: [{ kayit: recine, metin: 'bir fıçı' }],
        karar: 'vazgecildi',
      },
    });

    const uLonca = h.bakimUzmanligi({ evren, kayit: lonca });
    expect(uLonca.uzmanOldugu.map((x) => x.tanimKod)).toEqual([t1]);
    expect(uLonca.uzmanOldugu.map((x) => x.tanimKod)).not.toContain(tVazgecildi);

    const uRecine = h.bakimUzmanligi({ evren, kayit: recine });
    expect(uRecine.malzemeOldugu.map((x) => x.tanimKod)).toEqual([t1]);
    expect(uRecine.malzemeOldugu[0].metin).toBe('üç fıçı');

    // t1 silinince ters görünümden de düşer:
    h.bakimTanimSil({ evren, kod: t1 });
    expect(h.bakimUzmanligi({ evren, kayit: lonca }).uzmanOldugu).toHaveLength(0);
    expect(h.bakimUzmanligi({ evren, kayit: recine }).malzemeOldugu).toHaveLength(0);
  });

  it('9. silme ve geri getirme: hem tanım hem bakım kaydı silinip geri yüklenebilir', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const fener = h.kayitOlustur({ evren, ad: 'Liman Feneri', tur: 'mekan' }).kod;

    const { kod: tanimKod } = h.bakimTanimYaz({
      evren,
      tanim: { kayit: fener, ad: 'Fitil değişimi', siklik: { deger: 10, birim: 'gun' } },
    });
    const { kod: kayitKod } = h.bakimKaydiYaz({
      evren,
      kayit: { tanim: tanimKod, tarih: '100', durum: 'yapildi' },
    });

    // Bakım kaydını sil
    h.bakimKaydiSil({ evren, kod: kayitKod });
    expect(h.bakimOku({ evren, kayit: fener }).tanimlar[0].kayitlar).toHaveLength(0);
    expect(h.bakimOku({ evren, kayit: fener, cop: true }).tanimlar[0].kayitlar[0].silindi).not.toBeNull();
    expect(h.bakimDurumu({ evren, kayit: fener }).tanimlar[0].sonYapildi).toBeNull();

    // Bakım kaydını geri yükle
    h.bakimKaydiGeriYukle({ evren, kod: kayitKod });
    expect(h.bakimOku({ evren, kayit: fener }).tanimlar[0].kayitlar).toHaveLength(1);
    expect(h.bakimDurumu({ evren, kayit: fener }).tanimlar[0].sonYapildi?.kod).toBe(kayitKod);

    // Bakım tanımını sil
    h.bakimTanimSil({ evren, kod: tanimKod });
    expect(h.bakimOku({ evren, kayit: fener }).tanimlar).toHaveLength(0);
    expect(h.bakimOku({ evren, kayit: fener, cop: true }).tanimlar[0].silindi).not.toBeNull();
    expect(h.bakimDurumu({ evren, kayit: fener }).tanimlar).toHaveLength(0);

    // Bakım tanımını geri yükle
    h.bakimTanimGeriYukle({ evren, kod: tanimKod });
    expect(h.bakimOku({ evren, kayit: fener }).tanimlar).toHaveLength(1);
    expect(h.bakimDurumu({ evren, kayit: fener }).tanimlar).toHaveLength(1);
  });

  it('10. kayıt birleştirme: uzman ya da malzeme kayıtları birleştirildiğinde yonlendir ile yeni kayda çözülür', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const kapi = h.kayitOlustur({ evren, ad: 'Batı Kapısı', tur: 'mekan' }).kod;
    const uzmanEski = h.kayitOlustur({ evren, ad: 'Demirci Kael', tur: 'karakter' }).kod;
    const uzmanHedef = h.kayitOlustur({ evren, ad: 'Usta Kael', tur: 'karakter' }).kod;
    const malzemeEski = h.kayitOlustur({ evren, ad: 'Ak Gümüş', tur: 'urun' }).kod;
    const malzemeHedef = h.kayitOlustur({ evren, ad: 'Saf Gümüş', tur: 'urun' }).kod;

    const { kod: tanimKod } = h.bakimTanimYaz({
      evren,
      tanim: {
        kayit: kapi,
        ad: 'Menteşe dökümü',
        uzmanlar: [uzmanEski],
        malzemeler: [{ kayit: malzemeEski, metin: 'iki külçe' }],
      },
    });
    h.bakimKaydiYaz({
      evren,
      kayit: { tanim: tanimKod, tarih: '300', durum: 'yapildi', yapan: uzmanEski },
    });

    h.birlestir({ evren, kaynak: uzmanEski, hedef: uzmanHedef });
    h.birlestir({ evren, kaynak: malzemeEski, hedef: malzemeHedef });

    const okuma = h.bakimOku({ evren, kayit: kapi });
    expect(okuma.tanimlar[0].uzmanlar.map((u) => u.kod)).toEqual([uzmanHedef]);
    expect(okuma.tanimlar[0].malzemeler[0].kayit?.kod).toBe(malzemeHedef);
    expect(okuma.tanimlar[0].kayitlar[0].yapan?.kod).toBe(uzmanHedef);
    expect(okuma.tanimlar[0].kayitlar[0].uzmanDisi).toBe(false);

    expect(h.bakimUzmanligi({ evren, kayit: uzmanHedef }).uzmanOldugu).toHaveLength(1);
    expect(h.bakimUzmanligi({ evren, kayit: malzemeHedef }).malzemeOldugu).toHaveLength(1);
  });

  it('11. çatışma: iki cihazda aynı bakım tanımı farklı yazılınca çatışma görünür ve çözülür', () => {
    const h = yeniHizmet();
    h.baslat();
    const { kod: evren } = h.evrenOlustur({ ad: 'Test' });
    const kapi = h.kayitOlustur({ evren, ad: 'Doğu Kapısı', tur: 'mekan' }).kod;
    const { kod: tanimKod } = h.bakimTanimYaz({
      evren,
      tanim: { kayit: kapi, ad: 'Kapı yağlaması', siklik: { deger: 1, birim: 'yil' } },
    });

    const b = yeniHizmet();
    b.baslat();
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });

    // Cihaz A günceller:
    h.bakimTanimYaz({
      evren,
      kod: tanimKod,
      tanim: { kayit: kapi, ad: 'Kapı yağlaması', siklik: { deger: 2, birim: 'yil' }, bedel: '10 altın' },
    });

    // Cihaz B aynı önceki işlemden çatallanarak farklı günceller:
    b.bakimTanimYaz({
      evren,
      kod: tanimKod,
      tanim: { kayit: kapi, ad: 'Kapı yağlaması', siklik: { deger: 5, birim: 'yil' }, bedel: '25 gümüş' },
    });

    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });

    expect(h.bakimOku({ evren, kayit: kapi }).tanimlar[0].catismali).toBe(true);
    const cat = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === 'bakim_tanim');
    if (cat?.tur !== 'alan') throw new Error('Bakım tanımı çatışması bekleniyordu.');
    expect(cat.alanEtiketi).toBe('Bakım tanımı');

    const ikinci = cat.degerler.find((d) => d.yazi?.includes('25 gümüş'))!;
    h.alanCatismasiCoz({ evren, nesne: tanimKod, alan: 'bakim_tanim', islem: ikinci.islem });
    expect(h.catismalar({ evren }).some((c) => c.tur === 'alan' && c.alan === 'bakim_tanim')).toBe(false);
    expect(h.bakimOku({ evren, kayit: kapi }).tanimlar[0].bedel).toBe('25 gümüş');
  });
});
