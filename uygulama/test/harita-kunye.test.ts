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
  en: 800,
  boy: 500,
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
  return new Hizmet(ac, ad, 'x', () => {}, new BellekDeposu(), sahteIsleyici);
}

const gorsel = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]);

describe('F17 haritalar da iddia taşır (harita künyesi, §8.3)', () => {
  it('künye yazılır, okunur, değiştirilir; boş künye hiçbir şey eklemez; tarih okunamazsa hata verir', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Atlas' });
    const haritaci = h.kayitOlustur({ evren, ad: 'Kuzeyli Haritacı', tur: 'kisi' }).kod;
    const lonca = h.kayitOlustur({ evren, ad: 'Tüccarlar Loncası', tur: 'kurum' }).kod;
    const { kod: harita } = await h.haritaYukle({
      evren,
      ad: 'Tüccar Kervan Haritası',
      yer: null,
      dosyaAdi: 'kervan.png',
      tur: 'image/png',
      veri: gorsel(1),
    });

    // Başlangıçta künye boş: null döner ve listede yer almaz.
    expect(h.haritaKunyesi({ evren, harita })).toBeNull();
    expect(h.haritaKunyeleri({ evren })).toEqual([]);

    // Okunamayan tarih hata verir.
    expect(() =>
      h.haritaKunyeYaz({
        evren,
        harita,
        tanim: {
          tarih: 'böyle bir tarih yok xyz',
          yapan: haritaci,
          amac: 'Kervan yolu kılavuzu',
          bilinenHatalar: [],
        },
      }),
    ).toThrow(/Tarih okunamadı/);

    // Künye yazılır ve okunur.
    h.haritaKunyeYaz({
      evren,
      harita,
      tanim: {
        tarih: '~312',
        yapan: haritaci,
        amac: 'Doğu kervanlarının konak yerlerini göstermek',
        bilinenHatalar: ['Kuzey dağ geçidi olduğundan kısa çizilmiş', 'Tuz Gölü kıyısı eksik'],
      },
    });

    const okunan = h.haritaKunyesi({ evren, harita });
    expect(okunan).toEqual({
      harita,
      haritaAd: 'Tüccar Kervan Haritası',
      tanim: {
        tarih: '~312',
        yapan: haritaci,
        amac: 'Doğu kervanlarının konak yerlerini göstermek',
        bilinenHatalar: ['Kuzey dağ geçidi olduğundan kısa çizilmiş', 'Tuz Gölü kıyısı eksik'],
      },
      yapanAd: 'Kuzeyli Haritacı',
      catismali: false,
    });
    expect(h.haritaKunyeleri({ evren })).toHaveLength(1);

    // Künye değiştirilir (yapan güncellenir, hatalar düzenlenir).
    h.haritaKunyeYaz({
      evren,
      harita,
      tanim: {
        tarih: '315',
        yapan: lonca,
        amac: 'Vergi sınırlarını göstermek',
        bilinenHatalar: ['Batı sınırı propaganda amacıyla genişletilmiş'],
      },
    });
    expect(h.haritaKunyesi({ evren, harita })).toMatchObject({
      tanim: {
        tarih: '315',
        yapan: lonca,
        amac: 'Vergi sınırlarını göstermek',
        bilinenHatalar: ['Batı sınırı propaganda amacıyla genişletilmiş'],
      },
      yapanAd: 'Tüccarlar Loncası',
    });

    // Boş künye yazılınca kaldırılır, hiçbir şey eklemez.
    h.haritaKunyeYaz({
      evren,
      harita,
      tanim: { tarih: '  ', yapan: null, amac: '', bilinenHatalar: ['   '] },
    });
    expect(h.haritaKunyesi({ evren, harita })).toBeNull();
    expect(h.haritaKunyeleri({ evren })).toEqual([]);
  });

  it('silinen harita için künye listelenmez; geri getirildiğinde künyesi korunur', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Atlas' });
    const { kod: h1 } = await h.haritaYukle({
      evren,
      ad: 'İmparatorluk Haritası',
      yer: null,
      dosyaAdi: 'imp.png',
      tur: 'image/png',
      veri: gorsel(1),
    });
    const { kod: h2 } = await h.haritaYukle({
      evren,
      ad: 'Denizci Haritası',
      yer: null,
      dosyaAdi: 'deniz.png',
      tur: 'image/png',
      veri: gorsel(2),
    });

    h.haritaKunyeYaz({
      evren,
      harita: h1,
      tanim: { tarih: '400', yapan: null, amac: 'Fetih propagandası', bilinenHatalar: ['İsyancı vilayetler gösterilmemiş'] },
    });
    h.haritaKunyeYaz({
      evren,
      harita: h2,
      tanim: { tarih: '410', yapan: null, amac: 'Kıyı seyir rehberi', bilinenHatalar: [] },
    });

    expect(h.haritaKunyeleri({ evren }).map((x) => x.harita).sort()).toEqual([h1, h2].sort());

    // h1 silindiğinde ne tekil sorguda ne listede görünür.
    h.haritaSil({ evren, kod: h1 });
    expect(h.haritaKunyesi({ evren, harita: h1 })).toBeNull();
    expect(h.haritaKunyeleri({ evren }).map((x) => x.harita)).toEqual([h2]);

    // Geri getirildiğinde künye tekrar görünür.
    h.haritaSil({ evren, kod: h1, geriYukle: true });
    expect(h.haritaKunyesi({ evren, harita: h1 })?.tanim.amac).toBe('Fetih propagandası');
    expect(h.haritaKunyeleri({ evren }).map((x) => x.harita).sort()).toEqual([h1, h2].sort());
  });

  it('iki cihazda farklı yazım çatışma olarak görünür ve çözülür', async () => {
    const a = cihaz('Masaüstü');
    const b = cihaz('Dizüstü');
    const { kod: evren } = a.evrenOlustur({ ad: 'Atlas' });
    const saray = a.kayitOlustur({ evren, ad: 'Saray Arşivi', tur: 'kurum' }).kod;
    const gezgin = a.kayitOlustur({ evren, ad: 'Yaşlı Gezgin', tur: 'kisi' }).kod;
    const { kod: harita } = await a.haritaYukle({
      evren,
      ad: 'Eski Sınır Haritası',
      yer: null,
      dosyaAdi: 'sinir.png',
      tur: 'image/png',
      veri: gorsel(1),
    });

    b.evreniDisaridanKur({ kod: evren, islemler: a.islemleriVer({ evren, gorulen: {} }) });

    a.haritaKunyeYaz({
      evren,
      harita,
      tanim: {
        tarih: '210',
        yapan: saray,
        amac: 'Resmî sınır tutanağı',
        bilinenHatalar: ['Doğu bataklığı kuru ova gibi çizilmiş'],
      },
    });
    b.haritaKunyeYaz({
      evren,
      harita,
      tanim: {
        tarih: '~195',
        yapan: gezgin,
        amac: 'Gezi defteri eki',
        bilinenHatalar: ['Mesafeler adım hesabıyla yaklaşık'],
      },
    });

    a.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: {} }) });
    b.islemleriAl({ evren, islemler: a.islemleriVer({ evren, gorulen: {} }) });

    expect(a.haritaKunyesi({ evren, harita })?.catismali).toBe(true);
    const catisma = a.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === 'harita_kunye');
    expect(catisma).toBeDefined();
    if (!catisma || catisma.tur !== 'alan') throw new Error('Çatışma bulunamadı');
    expect(catisma.degerler).toHaveLength(2);

    const secilen = catisma.degerler.find((d) => (d.deger as { yapan?: string })?.yapan === saray)!;
    a.alanCatismasiCoz({ evren, nesne: catisma.nesne, alan: catisma.alan, islem: secilen.islem });

    expect(a.catismalar({ evren }).filter((c) => c.tur === 'alan' && c.alan === 'harita_kunye')).toHaveLength(0);
    const cozulmus = a.haritaKunyesi({ evren, harita });
    expect(cozulmus?.catismali).toBe(false);
    expect(cozulmus?.tanim.yapan).toBe(saray);
    expect(cozulmus?.tanim.tarih).toBe('210');
  });
});
