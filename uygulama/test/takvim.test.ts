import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { GUN_PARCA, karsilastir, tarihAciklamasi, tarihCoz, takvimGecerli, type Takvim } from '../src/alan/tarih';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}

/** Uydurma bir takvim: dört ay, üç gün bölümü, iki mevsim (biri yıl sonundan taşar). */
const KUZEY: Takvim = {
  kod: 'ana', surum: 2, ad: 'Yıl', yilGun: 0,
  aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 40 }, { ad: 'Sis', gun: 30 }, { ad: 'Kara Ay', gun: 20 }],
  gunBolumleri: ['sabah', 'öğle', 'akşam'],
  mevsimler: [{ ad: 'Bolluk', ilkAy: 0, sonAy: 1 }, { ad: 'Kıtlık', ilkAy: 2, sonAy: 0 }],
};
const t = (s: string) => tarihCoz(s, KUZEY)!;
const YIL = 120 * GUN_PARCA;

describe('özel takvim', () => {
  it('ay, gün, gün bölümü ve mevsim okunur; hassasiyet korunur', () => {
    expect(takvimGecerli(KUZEY)).toBe(true);
    expect(t('412')).toMatchObject({ hassasiyet: 'yil', eksen: { enErken: 412 * YIL, enGec: 413 * YIL - 1 } });
    expect(t('Hasat 412')).toMatchObject({ hassasiyet: 'ay', eksen: { enErken: 412 * YIL + 30 * GUN_PARCA } });
    expect(t("Hasat'ın 12. günü, 412")).toMatchObject({ hassasiyet: 'gun', eksen: { enErken: 412 * YIL + 41 * GUN_PARCA } });
    expect(t('12 Hasat 412').eksen).toEqual(t("Yıl 412, Hasat'ın 12. günü").eksen);
    expect(t('12 Hasat 412 öğle')).toMatchObject({ hassasiyet: 'bolum', eksen: { enErken: 412 * YIL + 41 * GUN_PARCA + 480, enGec: 412 * YIL + 41 * GUN_PARCA + 959 } });
    expect(t('Kara Ay 412')).toMatchObject({ hassasiyet: 'ay' });
    expect(t('Bolluk 412')).toMatchObject({ hassasiyet: 'mevsim', eksen: { enErken: 412 * YIL, enGec: 412 * YIL + 70 * GUN_PARCA - 1 } });
    // Kıtlık yılın sonundan ertesi yıla taşar.
    expect(t('Kıtlık 412').eksen!.enGec).toBe(413 * YIL + 30 * GUN_PARCA - 1);
    // Ayda olmayan gün, yılı olmayan ay ve günü olmayan gün bölümü yerleştirilemez; ifade korunur.
    expect(t('45 Hasat 412')).toMatchObject({ bicim: 'sembolik', eksen: null });
    expect(t('Hasat')).toMatchObject({ bicim: 'sembolik' });
    expect(t('öğle 412')).toMatchObject({ bicim: 'sembolik' });

    // Gün düzeyindeki tarih "öğlen" sayılmaz: öğle ile karşılaştırması belirsizdir.
    expect(karsilastir(t('12 Hasat 412'), t('12 Hasat 412 öğle'))).toBe('belirsiz');
    expect(karsilastir(t('12 Hasat 412 sabah'), t('12 Hasat 412 akşam'))).toBe('once');
    expect(karsilastir(t('Hasat 412'), t('Sis 412'))).toBe('once');

    expect(tarihAciklamasi(t('12 Hasat 412 öğle'), KUZEY)).toBe('Yıl 412, Hasat ayının 12. günü, öğle');
    expect(tarihAciklamasi(t('Kıtlık 412'), KUZEY)).toBe('Yıl 412, Kıtlık');

    // Adlar karışmamalı; sayı içeremez.
    expect(takvimGecerli({ ...KUZEY, gunBolumleri: ['Hasat'] })).toBe(false);
    expect(takvimGecerli({ ...KUZEY, aylar: [{ ad: '3. ay', gun: 30 }], mevsimler: [] })).toBe(false);
  });

  it('takvim değişince ifadeler korunur, yerler yeniden hesaplanır; önce etkisi gösterilir', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kusatma = h.kayitOlustur({ evren, ad: 'Kuşatma', tur: 'olay' }).kod;
    const isyan = h.kayitOlustur({ evren, ad: 'İsyan', tur: 'olay' }).kod;
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    h.kayitTarih({ evren, kod: kusatma, ifade: '12 Hasat 412' });
    h.kayitTarih({ evren, kod: isyan, ifade: '413' });
    h.kayitAlanYaz({ evren, kod: elin, alan: 'dogum', deger: 'Sis 400' });
    // Varsayılan takvimde ay yok: ikisi de sembolik.
    expect(h.kayit({ evren, kod: kusatma }).tarih?.eksen).toBeNull();

    const etki = h.takvimEtkisi({ evren, takvim: KUZEY });
    expect(etki.toplam).toBe(3);
    // "413" yeni takvimde de "Yıl 413": okunuşu değişmeyen tarih listelenmez.
    expect(etki.degisen.map((x) => x.yer).sort()).toEqual(['Elin · Doğum tarihi', 'Kuşatma · evren tarihi']);
    expect(etki.degisen.find((x) => x.yer.startsWith('Kuşatma'))).toMatchObject({ once: 'Takvime çevrilemedi; sıralamada yeri belirsiz', sonra: 'Yıl 412, Hasat ayının 12. günü' });

    h.takvimYaz({ evren, takvim: KUZEY });
    expect(h.takvim({ evren })).toMatchObject({ surum: 2, yilGun: 120 });
    const k = h.kayit({ evren, kod: kusatma }).tarih!;
    expect(k).toMatchObject({ ifade: '12 Hasat 412', hassasiyet: 'gun' });
    expect(h.kayitSablonu({ evren, kod: elin }).degerler.dogum).toMatchObject({ hassasiyet: 'ay' });
    // Yeni tarihler yeni takvimle okunur.
    h.kayitTarih({ evren, kod: isyan, ifade: 'Kara Ay 412' });
    expect(h.zamanCizelgesi({ evren }).map((x) => x.ad)).toEqual(['Kuşatma', 'İsyan']);

    // Bir ayı kısaltmak: 12 Hasat hâlâ var, 45 olsaydı çözülemezdi.
    const kisa = { ...KUZEY, aylar: KUZEY.aylar!.map((a) => (a.ad === 'Hasat' ? { ...a, gun: 10 } : a)) };
    const e2 = h.takvimEtkisi({ evren, takvim: kisa });
    expect(e2.cozulemezSayisi).toBe(1);
    expect(e2.degisen.find((x) => x.cozulemez)?.ifade).toBe('12 Hasat 412');
    expect(() => h.takvimYaz({ evren, takvim: { ...KUZEY, gunBolumleri: ['Sis'] } })).toThrow();
    h.takvimYaz({ evren, takvim: null });
    expect(h.kayit({ evren, kod: kusatma }).tarih?.eksen).toBeNull();
    expect(h.islemGunlugu({ evren, sinir: 50 }).filter((i) => i.tur === 'takvim_yaz')).toHaveLength(2);
  });

  it('başka cihazdan gelen tarih bu cihazın takvimiyle okunur; takvim çatışması sorulur', () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const olay = m.kayitOlustur({ evren, ad: 'Kuşatma', tur: 'olay' }).kod;
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.takvimYaz({ evren, takvim: KUZEY });
    tb.kayitTarih({ evren, kod: olay, ifade: '12 Hasat 412' }); // tablet henüz takvimi bilmiyor
    tb.takvimYaz({ evren, takvim: { ...KUZEY, ad: 'Döngü' } });
    m.islemleriAl({ evren, islemler: tb.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) }) });
    expect(m.kayit({ evren, kod: olay }).tarih?.hassasiyet).toBe('gun');
    const c = m.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === 'takvim');
    expect(c).toBeTruthy();
    if (c?.tur === 'alan') m.alanCatismasiCoz({ evren, nesne: c.nesne, alan: c.alan, islem: c.degerler.find((d) => (d.deger as Takvim).ad === 'Yıl')!.islem });
    expect(m.takvim({ evren }).ad).toBe('Yıl');
    expect(m.catismalar({ evren })).toEqual([]);
  });
});
