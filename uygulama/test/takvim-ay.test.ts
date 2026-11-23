// Takvimin ay görünümü ve karakter şeritleri (K37): gün düzeyinde aralık, güne olay ekleme, olay kartındaki yaşlar,
// yaşam çizgileri. Adlar uydurmadır.
import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { ayAraligi, gunIfadesi, tarihAciklamasi, tarihCoz, type Takvim } from '../src/alan/tarih';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }, { ad: 'Sis', gun: 28 }],
  caglar: [{ ad: 'Kuruluş öncesi', baslangic: 0, ters: true }, { ad: 'Yeni Çağ', baslangic: 1 }] };
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  h.takvimYaz({ evren, takvim: ANA });
  const kayit = (ad: string, tur = 'karakter') => h.kayitOlustur({ evren, ad, tur }).kod;
  return { h, evren, kayit };
}

describe('takvim günleri (K37)', () => {
  it('bir günün ifadesi aynı güne çözülür; çağlı ve çağ öncesi yıllarda da', () => {
    for (const [yil, ay, gun] of [[412, 1, 9], [1, 0, 1], [-5, 2, 28], [0, 1, 30]]) {
      const ifade = gunIfadesi(ANA, yil, ay, gun)!;
      const t = tarihCoz(ifade, ANA)!;
      const [bas] = ayAraligi(ANA, yil, ay);
      expect([t.bicim, t.hassasiyet, t.eksen!.enErken]).toEqual(['kesin', 'gun', bas + (gun - 1) * 1440]);
    }
    expect(gunIfadesi(ANA, 412, 1, 9)).toBe('9 Hasat Yeni Çağ 412');
    expect(gunIfadesi({ ...ANA, aylar: [] }, 1, 0, 1)).toBeNull();
  });

  it('iki takvimli tarihin arası gün düzeyinde aralıktır; yalnız yıllar eski kuraldadır', () => {
    const t = tarihCoz('9 Hasat 412 ile 11 Hasat 412 arası', ANA)!;
    expect([t.bicim, t.hassasiyet]).toEqual(['aralik', 'gun']);
    expect(Math.round((t.eksen!.enGec! - t.eksen!.enErken! + 1) / 1440)).toBe(3);
    expect(tarihAciklamasi(t, ANA)).toBe('Yeni Çağ 412, Hasat ayının 9. günü ile Yeni Çağ 412, Hasat ayının 11. günü arası');
    expect(tarihCoz('11 Hasat 412 – 9 Hasat 412', ANA)!.eksen).toEqual(t.eksen);
    expect(tarihCoz('Hasat 412 ile Sis 412 arası', ANA)!.hassasiyet).toBe('ay');
    expect(tarihCoz('390 ile 395 arası', ANA)!.hassasiyet).toBe('yil');
    expect(tarihCoz('Hasat 10-15', ANA)!.bicim).toBe('sembolik');
  });

  it('güne olay ekleme tek işlem grubudur; kartta katılanlar o günkü yaşlarıyla görünür', () => {
    const { h, evren, kayit } = kur();
    const ada = kayit('Uydurma Ada'), bora = kayit('Uydurma Bora'), kule = kayit('Uydurma kule', 'mekan');
    h.kayitAlanYaz({ evren, kod: ada, alan: 'dogum', deger: '3 Tohum 390' });
    const once = h.islemGunlugu({ evren, sinir: 1000 }).length;
    const { kod } = h.takvimOlayiEkle({ evren, olay: { ad: 'Uydurma kuşatma', tarih: '9 Hasat 412', bitis: '11 Hasat 412', katilanlar: [ada, bora], mekan: kule, ozet: 'Kısa not' } });
    const yeni = h.islemGunlugu({ evren, sinir: 1000 }).slice(0, -once || undefined);
    expect(new Set(yeni.map((i) => i.grup)).size).toBe(1);
    expect(yeni[0].grup).not.toBeNull();
    const k = h.olayKarti({ evren, kod });
    expect([k.ad, k.tur, k.ozet, k.mekan?.ad, k.tarih?.bicim]).toEqual(['Uydurma kuşatma', 'olay', 'Kısa not', 'Uydurma kule', 'aralik']);
    expect(k.katilanlar.map((x) => [x.ad, x.rol, x.yas])).toEqual([['Uydurma Ada', 'Katılan', '22 yaşında'], ['Uydurma Bora', 'Katılan', null]]);
    expect(() => h.takvimOlayiEkle({ evren, olay: { ad: 'X', tarih: '9 Hasat 412', bitis: 'bir gün' } })).toThrow('Bitiş tarihi okunamadı');
    expect(() => h.takvimOlayiEkle({ evren, olay: { ad: '', tarih: '9 Hasat 412' } })).toThrow();
  });

  it('karakter şeritleri: doğum ve ölüm, katıldığı tarihli olaylar ve o andaki yaş', () => {
    const { h, evren, kayit } = kur();
    const ada = kayit('Uydurma Ada'), bora = kayit('Uydurma Bora'); kayit('Uydurma Cem');
    h.kayitAlanYaz({ evren, kod: ada, alan: 'dogum', deger: '390' });
    h.kayitAlanYaz({ evren, kod: ada, alan: 'olum', deger: '420' });
    h.takvimOlayiEkle({ evren, olay: { ad: 'Uydurma yangın', tarih: '1 Sis 410', katilanlar: [ada, bora] } });
    const tarihsiz = h.kayitOlustur({ evren, ad: 'Tarihsiz olay', tur: 'olay' }).kod;
    h.iliskiEkle({ evren, tur: 'olayda', a: ada, b: tarihsiz, rol: 'katilan' });
    const s = h.yasamSeritleri({ evren });
    expect(s.map((x) => x.ad)).toEqual(['Uydurma Ada', 'Uydurma Bora']);
    const a = s[0];
    expect([a.dogum?.ifade, a.olum?.ifade, a.olaylar.map((o) => [o.ad, o.yas])]).toEqual(['390', '420', [['Uydurma yangın', '19–20 yaşında']]]);
    expect(s[1].dogum).toBeNull();
  });
});
