import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({
  veri,
  tur,
  en: 1000,
  boy: 1000,
  onizleme: new Uint8Array([7]),
});

function cihaz(ad = 'Cihaz A') {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => {
    let x = dosyalar.get(d);
    if (!x) {
      x = new sqlite3.oo1.DB(':memory:');
      dosyalar.set(d, x);
    }
    return x;
  };
  return new Hizmet(ac, ad, ad, () => {}, new BellekDeposu(), sahteIsleyici);
}

const gorsel = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]);

describe('Ölçekli geometri kipi ve erişim konturları (§8.4, §15-2)', () => {
  it('ölçek iki noktayla ve mesafeyle tanımlanır; ölçeksiz haritada hesap "harita ölçeksiz" der ve sayı üretmez', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Atlas' });
    const { kod: harita } = await h.haritaYukle({
      evren,
      ad: 'Orta Vadi Haritası',
      yer: null,
      dosyaAdi: 'vadi.png',
      tur: 'image/png',
      veri: gorsel(1),
    });

    // Ölçek henüz tanımlanmadı: ölçüm ve kontur "harita ölçeksiz" der ve sayı üretmez (D16).
    const olceksizOlcum = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [100, 100],
      bitis: [500, 100],
      ulasim: 'yaya',
    });
    expect(olceksizOlcum.durum).toBe('olceksiz');
    expect(olceksizOlcum.duzMesafe).toBeNull();
    expect(olceksizOlcum.enKisaGun).toBeNull();
    expect(olceksizOlcum.uyari).toMatch(/harita ölçeksiz/i);
    expect(olceksizOlcum.zarf.hukum).toBe('denetlenemiyor');

    const olceksizKontur = h.olcekliKonturlar({
      evren,
      harita,
      baslangic: [100, 100],
      ulasim: 'yaya',
    });
    expect(olceksizKontur.durum).toBe('olceksiz');
    expect(olceksizKontur.konturlar).toEqual([]);
    expect(olceksizKontur.uyari).toMatch(/harita ölçeksiz/i);
    expect(olceksizKontur.zarf.hukum).toBe('denetlenemiyor');

    // İki nokta ve gerçek mesafe ile ölçek tanımlanır (100 piksel = 10 fersah -> 1 piksel = 0.1 fersah).
    h.olcekliOlcekYaz({
      evren,
      harita,
      olcek: {
        p1: [0, 0],
        p2: [100, 0],
        mesafe: 10,
        birim: 'fersah',
        molaVarsayimi: 'Gece konaklamaları dahil günlük ilerleme',
      },
    });

    const durum = h.olcekliHaritaDurumu({ evren, harita });
    expect(durum.olcek).toEqual({
      p1: [0, 0],
      p2: [100, 0],
      mesafe: 10,
      birim: 'fersah',
      molaVarsayimi: 'Gece konaklamaları dahil günlük ilerleme',
    });
  });

  it('düz mesafe ölçekten doğru hesaplanır (döndürülmüş ve ölçeklenmiş katmanda da)', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Atlas' });
    const { kod: harita } = await h.haritaYukle({
      evren,
      ad: 'Bölge Haritası',
      yer: null,
      dosyaAdi: 'bolge.png',
      tur: 'image/png',
      veri: gorsel(2),
    });

    // 200 uzay birimi = 40 fersah (1 uzay birimi = 0.2 fersah)
    h.olcekliOlcekYaz({
      evren,
      harita,
      olcek: { p1: [0, 0], p2: [200, 0], mesafe: 40, birim: 'fersah' },
    });
    h.olcekliVarsayilanHizYaz({
      evren,
      harita,
      varsayilanHizlar: [{ ulasim: 'yaya', mevsim: null, gunlukHiz: 10, gecilmez: false }],
    });

    // Doğrudan harita uzayında [100, 100] -> [400, 500]: uzaklık = sqrt(300^2 + 400^2) = 500 uzay birimi = 100 fersah
    const dogrudan = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [100, 100],
      bitis: [400, 500],
      ulasim: 'yaya',
    });
    expect(dogrudan.durum).toBe('tamam');
    expect(dogrudan.duzMesafe).toBeCloseTo(100, 2);
    expect(dogrudan.zarf.birim).toBe('fersah');

    // İkinci bir katman ekle ve 2 kat büyütüp 90 derece döndürerek hizala (§8.5)
    const { kod: katman } = await h.katmanEkle({
      evren,
      harita,
      ad: 'Detay Paftası',
      dosyaAdi: 'detay.png',
      tur: 'image/png',
      veri: gorsel(3),
    });
    // Katmanda (0,0)->(100,100) ve (50,0)->(100,200): ölçek=2, döndürme=90 derece
    h.katmanHizala({
      evren,
      harita,
      katman,
      noktalar: [
        { gorsel: [0, 0], uzay: [100, 100] },
        { gorsel: [50, 0], uzay: [100, 200] },
      ],
    });

    // Katman koordinatlarında [0, 0] ile [0, 150] arası katmanda 150 birim,
    // harita uzayında 150 * 2 = 300 uzay birimi -> 300 * 0.2 = 60 fersah olmalıdır.
    const katmandan = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [0, 0],
      bitis: [0, 150],
      ulasim: 'yaya',
      katman,
    });
    expect(katmandan.durum).toBe('tamam');
    expect(katmandan.duzMesafe).toBeCloseTo(60, 2);
  });

  it('arazi hızı ve "geçilmez" en kısa süreyi değiştirir; farklı ulaşım biçimi ve mevsim farklı sonuç verir', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Atlas' });
    const { kod: harita } = await h.haritaYukle({
      evren,
      ad: 'Sefer Haritası',
      yer: null,
      dosyaAdi: 'sefer.png',
      tur: 'image/png',
      veri: gorsel(4),
    });

    // 100 piksel = 10 fersah (1000x1000 harita = 100x100 fersah)
    h.olcekliOlcekYaz({
      evren,
      harita,
      olcek: {
        p1: [0, 0],
        p2: [100, 0],
        mesafe: 10,
        birim: 'fersah',
        molaVarsayimi: 'Molalar dahil',
      },
    });

    // Varsayılan açık ova hızı: yaya 10 fersah/gün, atlı 20 fersah/gün
    h.olcekliVarsayilanHizYaz({
      evren,
      harita,
      varsayilanHizlar: [
        { ulasim: 'yaya', mevsim: null, gunlukHiz: 10, gecilmez: false },
        { ulasim: 'atlı', mevsim: null, gunlukHiz: 20, gecilmez: false },
      ],
    });

    // A: [100, 500], B: [500, 500] -> düz mesafe 40 fersah.
    // Henüz arazi yokken yaya ~4 gün, atlı ~2 gün sürer.
    const engelsizYaya = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [100, 500],
      bitis: [500, 500],
      ulasim: 'yaya',
      izgaraBolumu: 25,
    });
    expect(engelsizYaya.durum).toBe('tamam');
    expect(engelsizYaya.duzMesafe).toBeCloseTo(40, 1);
    expect(engelsizYaya.enKisaGun).toBeCloseTo(4, 0);

    const engelsizAtli = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [100, 500],
      bitis: [500, 500],
      ulasim: 'atlı',
      izgaraBolumu: 25,
    });
    expect(engelsizAtli.durum).toBe('tamam');
    expect(engelsizAtli.enKisaGun!).toBeLessThan(engelsizYaya.enKisaGun!);
    expect(engelsizAtli.enKisaGun).toBeCloseTo(2, 0);

    // Şimdi haritanın ortasına [240..360, 0..1000] boyunca uzanan bir "Bataklık / Geçit" arazisi ekleyelim:
    // Yazın yaya 2 fersah/gün (çok yavaş), kışın ise tamamen "geçilmez".
    const { kod: araziKodu } = h.olcekliAraziYaz({
      evren,
      harita,
      tanim: {
        ad: 'Orta Bataklık',
        cizim: null,
        noktalar: [
          [240, 0],
          [360, 0],
          [360, 1000],
          [240, 1000],
        ],
        kurallar: [
          { ulasim: 'yaya', mevsim: 'yaz', gunlukHiz: 2, gecilmez: false },
          { ulasim: 'yaya', mevsim: 'kış', gunlukHiz: null, gecilmez: true },
        ],
      },
    });
    expect(araziKodu).toBeTruthy();

    // Yazın bataklık yavaşlatır: süre engelsiz 4 günden belirgin biçimde uzun çıkar
    const yazOlcum = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [100, 500],
      bitis: [500, 500],
      ulasim: 'yaya',
      mevsim: 'yaz',
      izgaraBolumu: 25,
    });
    expect(yazOlcum.durum).toBe('tamam');
    expect(yazOlcum.enKisaGun!).toBeGreaterThan(engelsizYaya.enKisaGun! + 2);
    expect(yazOlcum.zarf.mevsim).toBe('yaz');
    expect(yazOlcum.zarf.molaVarsayimi).toBe('Molalar dahil');

    // Kışın bataklık boydan boya geçilmez olduğu için hedefe yol bulunamaz
    const kisOlcum = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [100, 500],
      bitis: [500, 500],
      ulasim: 'yaya',
      mevsim: 'kış',
      izgaraBolumu: 25,
    });
    expect(kisOlcum.durum).toBe('bulunamadi');
    expect(kisOlcum.duzMesafe).toBeCloseTo(40, 1);
    expect(kisOlcum.enKisaGun).toBeNull();
    expect(kisOlcum.zarf.hukum).toBe('kayitli_seceneklerde_bulunamadi');
    expect(kisOlcum.zarf.kapsamNotu).toMatch(/evrende imkânsız/i);
  });

  it('hızı bilinmeyen (varsayılanı girilmemiş) alan uydurulmaz, hesap bunu bildirir', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Atlas' });
    const { kod: harita } = await h.haritaYukle({
      evren,
      ad: 'Kuzey Sınırı',
      yer: null,
      dosyaAdi: 'kuzey.png',
      tur: 'image/png',
      veri: gorsel(5),
    });

    h.olcekliOlcekYaz({
      evren,
      harita,
      olcek: { p1: [0, 0], p2: [100, 0], mesafe: 10, birim: 'menzil' },
    });

    // Varsayılan hız girilmedi ve yalnızca küçük bir alanda orman tanımlı.
    h.olcekliAraziYaz({
      evren,
      harita,
      tanim: {
        ad: 'Küçük Koruluk',
        cizim: null,
        noktalar: [
          [0, 0],
          [200, 0],
          [200, 200],
          [0, 200],
        ],
        kurallar: [{ ulasim: 'yaya', mevsim: null, gunlukHiz: 5, gecilmez: false }],
      },
    });

    // Koruluk dışındaki [600, 600] noktasına gitmek istediğimizde arazisi çizilmemiş yerler "bilinmiyor" sayılır, uydurulmaz.
    const sonuc = h.olcekliOlcum({
      evren,
      harita,
      baslangic: [100, 100],
      bitis: [600, 600],
      ulasim: 'yaya',
      izgaraBolumu: 20,
    });
    expect(sonuc.durum).toBe('bilinmiyor');
    expect(sonuc.duzMesafe).toBeGreaterThan(0);
    expect(sonuc.enKisaGun).toBeNull();
    expect(sonuc.bilinmeyenAlanVar).toBe(true);
    expect(sonuc.uyari).toMatch(/bilinmiyor/i);
    expect(sonuc.zarf.hukum).toBe('denetlenemiyor');
  });

  it('1., 2. ve 3. gün erişim konturları iç içe (1. gün ⊂ 2. gün ⊂ 3. gün) çıkar ve sonuç zarfını taşır', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Atlas' });
    const bolge = h.kayitOlustur({ evren, ad: 'Karaorman', tur: 'yer' }).kod;
    const { kod: harita } = await h.haritaYukle({
      evren,
      ad: 'Kontur Haritası',
      yer: null,
      dosyaAdi: 'kontur.png',
      tur: 'image/png',
      veri: gorsel(6),
    });

    // Haritada var olan bir bölge çizimi (cizimler) üzerinden de arazi bağlanabildiğini doğrula
    const { kod: cizimKodu } = h.cizimEkle({
      evren,
      harita,
      kayit: bolge,
      bicim: 'bolge',
      noktalar: [
        [500, 0],
        [1000, 0],
        [1000, 1000],
        [500, 1000],
      ],
    });

    // 1000x1000 harita = 50x50 fersah (100 piksel = 5 fersah)
    h.olcekliOlcekYaz({
      evren,
      harita,
      olcek: {
        p1: [0, 0],
        p2: [100, 0],
        mesafe: 5,
        birim: 'fersah',
        molaVarsayimi: 'Günde 8 saat yürüyüş, molalar dahil',
      },
    });
    h.olcekliVarsayilanHizYaz({
      evren,
      harita,
      varsayilanHizlar: [{ ulasim: 'yaya', mevsim: 'ilkbahar', gunlukHiz: 8, gecilmez: false }],
    });
    h.olcekliAraziYaz({
      evren,
      harita,
      tanim: {
        ad: 'Karaorman',
        cizim: cizimKodu,
        noktalar: [],
        kurallar: [{ ulasim: 'yaya', mevsim: 'ilkbahar', gunlukHiz: 4, gecilmez: false }],
      },
    });

    const konturSonucu = h.olcekliKonturlar({
      evren,
      harita,
      baslangic: [400, 500],
      ulasim: 'yaya',
      mevsim: 'ilkbahar',
      izgaraBolumu: 25,
    });

    expect(konturSonucu.durum).toBe('tamam');
    expect(konturSonucu.konturlar).toHaveLength(3);
    const [gun1, gun2, gun3] = konturSonucu.konturlar;
    expect(gun1.gun).toBe(1);
    expect(gun2.gun).toBe(2);
    expect(gun3.gun).toBe(3);

    // 1. gün ⊂ 2. gün ⊂ 3. gün
    const anahtar = ([x, y]: [number, number]) => `${x.toFixed(2)},${y.toFixed(2)}`;
    const kume1 = new Set(gun1.hucreler.map(anahtar));
    const kume2 = new Set(gun2.hucreler.map(anahtar));
    const kume3 = new Set(gun3.hucreler.map(anahtar));

    expect(kume1.size).toBeGreaterThan(0);
    expect(kume2.size).toBeGreaterThan(kume1.size);
    expect(kume3.size).toBeGreaterThan(kume2.size);

    for (const h1 of kume1) expect(kume2.has(h1)).toBe(true);
    for (const h2 of kume2) expect(kume3.has(h2)).toBe(true);

    // Izgara aralığı ve sonuç zarfı (§2.3)
    expect(konturSonucu.izgaraAraligiBirim).toBeGreaterThan(0);
    expect(konturSonucu.zarf).toMatchObject({
      kip: 'olcekli_geometri',
      sonucTuru: 'bu_varsayimlarla_tahmin',
      hukum: 'cozum_bulundu',
      guncellik: 'guncel',
      birim: 'fersah',
      ulasim: 'yaya',
      mevsim: 'ilkbahar',
      molaVarsayimi: 'Günde 8 saat yürüyüş, molalar dahil',
    });
    expect(konturSonucu.zarf.olcekOzeti).toContain('fersah');
    expect(konturSonucu.zarf.izgaraAraligiBirim).toBeGreaterThan(0);
  });

  it('iki cihazda ölçek ya da arazi hızı çatışması görünür ve çözülür', async () => {
    const a = cihaz('Cihaz A');
    const b = cihaz('Cihaz B');
    const { kod: evren } = a.evrenOlustur({ ad: 'Atlas' });
    const { kod: harita } = await a.haritaYukle({
      evren,
      ad: 'Sınır Haritası',
      yer: null,
      dosyaAdi: 'sinir.png',
      tur: 'image/png',
      veri: gorsel(7),
    });
    const { kod: arazi } = a.olcekliAraziYaz({
      evren,
      harita,
      tanim: {
        ad: 'Bozkır',
        cizim: null,
        noktalar: [
          [0, 0],
          [500, 0],
          [500, 500],
          [0, 500],
        ],
        kurallar: [{ ulasim: 'atlı', mevsim: null, gunlukHiz: 15, gecilmez: false }],
      },
    });

    // Başlangıç durumunu B cihazına aktar
    b.evreniDisaridanKur({ kod: evren, islemler: a.islemleriVer({ evren, gorulen: {} }) });

    // İki cihaz eşzamanlı olarak hem ölçeği hem arazi hızını farklı yazar
    a.olcekliOlcekYaz({
      evren,
      harita,
      olcek: { p1: [0, 0], p2: [100, 0], mesafe: 10, birim: 'fersah' },
    });
    b.olcekliOlcekYaz({
      evren,
      harita,
      olcek: { p1: [0, 0], p2: [100, 0], mesafe: 12, birim: 'fersah' },
    });

    a.olcekliAraziYaz({
      evren,
      harita,
      kod: arazi,
      tanim: {
        ad: 'Bozkır',
        cizim: null,
        noktalar: [
          [0, 0],
          [500, 0],
          [500, 500],
          [0, 500],
        ],
        kurallar: [{ ulasim: 'atlı', mevsim: null, gunlukHiz: 18, gecilmez: false }],
      },
    });
    b.olcekliAraziYaz({
      evren,
      harita,
      kod: arazi,
      tanim: {
        ad: 'Bozkır',
        cizim: null,
        noktalar: [
          [0, 0],
          [500, 0],
          [500, 500],
          [0, 500],
        ],
        kurallar: [{ ulasim: 'atlı', mevsim: null, gunlukHiz: 22, gecilmez: false }],
      },
    });

    // A cihazı B'nin işlemlerini alır
    a.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: {} }) });

    const durum = a.olcekliHaritaDurumu({ evren, harita });
    expect(durum.catismali).toBe(true);
    expect(durum.araziler[0].catismali).toBe(true);

    const catismalar = a.catismalar({ evren });
    const olcekCatisma = catismalar.find((c) => c.tur === 'alan' && c.alan === 'olcekli_olcek');
    const araziCatisma = catismalar.find((c) => c.tur === 'alan' && c.alan === 'olcekli_arazi');
    expect(olcekCatisma).toBeDefined();
    expect(araziCatisma).toBeDefined();
    if (!olcekCatisma || olcekCatisma.tur !== 'alan') throw new Error('Ölçek çatışması bulunamadı');
    if (!araziCatisma || araziCatisma.tur !== 'alan') throw new Error('Arazi çatışması bulunamadı');

    // Ölçek çatışmasını A'nın değeriyle (10 fersah), arazi çatışmasını B'nin değeriyle (22) çöz
    const secilenOlcek = olcekCatisma.degerler.find(
      (s) => (s.deger as { mesafe?: number })?.mesafe === 10,
    )!;
    a.alanCatismasiCoz({
      evren,
      nesne: olcekCatisma.nesne,
      alan: 'olcekli_olcek',
      islem: secilenOlcek.islem,
    });

    const secilenArazi = araziCatisma.degerler.find((s) => s.yazi?.includes('22'))!;
    a.alanCatismasiCoz({
      evren,
      nesne: araziCatisma.nesne,
      alan: 'olcekli_arazi',
      islem: secilenArazi.islem,
    });

    const cozulmus = a.olcekliHaritaDurumu({ evren, harita });
    expect(cozulmus.catismali).toBe(false);
    expect(cozulmus.olcek?.mesafe).toBe(10);
    expect(cozulmus.araziler[0].catismali).toBe(false);
    expect(cozulmus.araziler[0].kurallar[0].gunlukHiz).toBe(22);
    expect(
      a.catismalar({ evren }).filter((c) => c.tur === 'alan' && c.alan.startsWith('olcekli_')),
    ).toHaveLength(0);
  });
});
