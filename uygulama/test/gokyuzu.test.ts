import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { evreHesapla, hesapla, cakismaAra, tanimDogrula } from '../src/calisan/gokyuzu';
import { yeniKod } from '../src/alan/kod';
import { GUN_PARCA, type ZamanSeti } from '../src/alan/tarih';
import type { GokyuzuTanimi } from '../src/veri/api';

const z: ZamanSeti = { ana: { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 120, aylar: [{ ad: 'Hasat', gun: 120 }] }, diger: [], akislar: [] };
const a = yeniKod(), b = yeniKod();
const tanim = (): GokyuzuTanimi => ({ aylar: [
  { kod: a, ad: 'Gümüş Ay', donem: 8, baslangic: '1 Hasat 0', evre: 'yeni' },
  { kod: b, ad: 'Kızıl Ay', donem: 16, baslangic: '1 Hasat 0', evre: 'yeni' },
], mevsimler: [{ ad: 'Ilık', baslangicGunu: 1 }, { ad: 'Serin', baslangicGunu: 61 }], gelgitler: [] });
let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dosyalar.get(d); if (!db) { db = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, db); } return db; }, ad, 'x');
  return h;
}
function hazirla() {
  const h = cihaz(), { kod: evren } = h.evrenOlustur({ ad: 'Uydurma gökyüzü' });
  h.takvimYaz({ evren, takvim: z.ana });
  return { h, evren };
}

describe('gökyüzü takvim döngüsü (§15-7)', () => {
  it('bilinen günlerde sekiz evreyi adla verir, başlangıç evresini korur', () => {
    expect(hesapla(tanim(), z, '5 Hasat 0').aylar.map((a) => a.evreler)).toEqual([['dolunay'], ['ilk_dordun']]);
    expect(evreHesapla(0, 0, 8, 'dolunay')).toBe('dolunay');
    expect(new Set(Array.from({ length: 8 }, (_, d) => evreHesapla(d, 0, 8, 'yeni'))).size).toBe(8);
  });
  it('negatif gün ve kesirli dönemde de başlangıç ve döngü aynı kalır', () => {
    expect(evreHesapla(-4, 0, 8, 'yeni')).toBe('dolunay');
    expect(evreHesapla(5, 0, 2.5, 'dolunay')).toBe('dolunay');
  });
  it('iki ayın aynı gün dolunay olduğu günleri bulur', () => {
    const t = tanim(); t.aylar[1].donem = 24;
    const c = cakismaAra(t, z, '1 Hasat 0', '30 Hasat 0', [{ ay: a, evre: 'dolunay' }, { ay: b, evre: 'dolunay' }]);
    expect(c.gunler.map((d) => d.eksen!.enErken! / GUN_PARCA)).toEqual([12]);
    expect(c.dahaFazla).toBe(false);
    expect(c.zarf.hukum).toBe('çözüm bulundu');
  });
  it('yıl çözünürlüğünde günü uydurmaz; bütün olası evreleri döndürür', () => {
    const o = hesapla(tanim(), z, '0');
    expect(o.aralik).toBe(true);
    expect(o.tarih.hassasiyet).toBe('yil');
    expect(o.tarih.eksen).toEqual({ enErken: 0, enGec: 120 * GUN_PARCA - 1 });
    expect(o.aylar[0].evreler.length).toBe(8);
    expect(o.mevsimler).toEqual(['Ilık', 'Serin']);
  });
  it('aralık özetinde yalnızca gerçekten görülen evreler bulunur', () => {
    const z2 = { ...z, ana: { ...z.ana, yilGun: 2, aylar: [{ ad: 'Hasat', gun: 2 }] } };
    const t = tanim(); t.mevsimler = [];
    expect(hesapla(t, z2, '0').aylar[0].evreler).toEqual(['yeni', 'buyuyen_hilal']);
  });
  it('mevsimler yıl sınırında ve negatif yıllarda yinelenir', () => {
    const t = tanim(); t.mevsimler = [{ ad: 'Ilık', baslangicGunu: 30 }, { ad: 'Serin', baslangicGunu: 90 }];
    expect(hesapla(t, z, '1 Hasat -1').mevsimler).toEqual(['Serin']);
    expect(hesapla(t, z, '30 Hasat 0').mevsimler).toEqual(['Ilık']);
    expect(cakismaAra(t, z, '1 Hasat 0', '30 Hasat 0', [], 'Ilık').gunler).toHaveLength(1);
  });
  it('50 sonuçta keser; tam 50 sonuçta daha fazlası var demez', () => {
    const t = tanim(); t.aylar[0].donem = 1;
    const k = [{ ay: a, evre: 'yeni' as const }];
    expect(cakismaAra(t, z, '1 Hasat 0', '50 Hasat 0', k)).toMatchObject({ dahaFazla: false });
    const c = cakismaAra(t, z, '1 Hasat 0', '51 Hasat 0', k);
    expect(c.gunler.length).toBe(50); expect(c.dahaFazla).toBe(true);
    expect(c.gunler[0].ifade).toContain('1. günü');
  });
  it('sonuç bulunamaması evren genelinde imkânsızlık sayılmaz', () => {
    const c = cakismaAra(tanim(), z, '1 Hasat 0', '1 Hasat 0', [{ ay: a, evre: 'dolunay' }]);
    expect(c.gunler).toEqual([]); expect(c.zarf.hukum).toBe('kayıtlı seçeneklerde bulunamadı');
  });
  it('geçersiz tanımları Türkçe açıklamayla reddeder', () => {
    for (const donem of [0, -1, NaN, Infinity]) {
      const t = tanim(); t.aylar[0].donem = donem;
      expect(() => tanimDogrula(t, z)).toThrow('Ay dönemi 1 günden kısa olamaz.');
    }
    const t = tanim(); t.aylar[0].baslangic = '0';
    expect(() => tanimDogrula(t, z)).toThrow(/günü bilinen/);
    t.aylar[0].baslangic = 'bilinmiyor';
    expect(() => tanimDogrula(t, z)).toThrow(/iki sınırı/);
    expect(() => tanimDogrula(null, z)).toThrow(/ay tanımlayın/);
    expect(() => tanimDogrula({ ...tanim(), aylar: [null] }, z)).toThrow(/yeniden/);
    const m = tanim(); m.mevsimler[0].baslangicGunu = 121;
    expect(() => tanimDogrula(m, z)).toThrow(/yılın içinde/);
    m.mevsimler[0].baslangicGunu = 61;
    expect(() => tanimDogrula(m, z)).toThrow(/birbirinden farklı/);
  });
  it('geçersiz arama, ters/açık/uçsuz ve fazla geniş tarihleri reddeder', () => {
    const t = tanim(), k = [{ ay: a, evre: 'yeni' as const }];
    expect(() => cakismaAra(t, z, '30 Hasat 0', '1 Hasat 0', k)).toThrow(/bitişten sonra/);
    expect(() => cakismaAra(t, z, '0', '0', [])).toThrow(/En az/);
    expect(() => cakismaAra(t, z, '0', '0', [...k, ...k])).toThrow(/yalnızca bir/);
    expect(() => cakismaAra(t, z, '0', '0', [{ ay: yeniKod(), evre: 'yeni' }])).toThrow(/tanımdan/);
    expect(() => hesapla(t, z, '0 sonrası')).toThrow(/iki sınırı/);
    expect(() => hesapla(t, z, '0–1000')).toThrow(/100.000/);
  });
  it('paralel takvimde eşlenmiş günleri kullanır; eşlenmeyeni reddeder', () => {
    const diger = { ...z.ana, kod: yeniKod(), ad: 'Döngü', cap: { yil: 0, ana: '5 Hasat 0' }, bagli: null };
    const zz = { ...z, diger: [diger] };
    expect(hesapla(tanim(), zz, 'Döngü 0, Hasat 1. günü').aylar[0].evreler).toEqual(['dolunay']);
    expect(() => hesapla(tanim(), { ...zz, diger: [{ ...diger, cap: null }] }, 'Döngü 0, Hasat 1. günü')).toThrow(/iki sınırı/);
  });
  it('tanımı işlemden okur ve başka cihazda günlükten yeniden kurar', () => {
    const { h, evren } = hazirla();
    const gecersiz = tanim(); gecersiz.aylar[0].donem = 0;
    expect(() => h.gokyuzuYaz({ evren, tanim: gecersiz })).toThrow('Ay dönemi 1 günden kısa olamaz.');
    expect(h.gokyuzuTanimi({ evren })).toBeNull();
    expect(() => h.gokyuzuHesapla({ evren, tarih: '0' })).toThrow(/Önce/);
    h.gokyuzuYaz({ evren, tanim: tanim() });
    expect(h.gokyuzuTanimi({ evren })).toEqual(tanim());
    expect(h.islemGunlugu({ evren, sinir: 100 }).some((i) => i.tur === 'gokyuzu_yaz')).toBe(true);
    const h2 = cihaz('Diğer');
    h2.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(h2.gokyuzuTanimi({ evren })).toEqual(tanim());
    expect(h2.gokyuzuHesapla({ evren, tarih: '5 Hasat 0' }).aylar[0].evreler).toEqual(['dolunay']);
  });
  it('kıyı notunu yalnızca var olan bir yere bağlar; hesap fizik üretmez', () => {
    const { h, evren } = hazirla(); const t = tanim();
    const kiyi = h.kayitOlustur({ evren, ad: 'Uydurma kıyı', tur: 'mekan' }).kod;
    t.gelgitler = [{ kiyi, not: 'Dar koy', saat: 12.5 }];
    h.gokyuzuYaz({ evren, tanim: t });
    expect(h.gokyuzuTanimi({ evren })!.gelgitler).toEqual(t.gelgitler);
    t.gelgitler[0].saat = 0;
    expect(() => h.gokyuzuYaz({ evren, tanim: t })).toThrow(/sıfırdan büyük/);
    t.gelgitler[0].saat = 12;
    t.gelgitler[0].kiyi = h.kayitOlustur({ evren, ad: 'Uydurma kişi', tur: 'karakter' }).kod;
    expect(() => h.gokyuzuYaz({ evren, tanim: t })).toThrow(/kıyı yeri/);
  });
  it('çelişen tanımlar görünür; çözülene kadar gizli seçimle hesaplanmaz', () => {
    const { h, evren } = hazirla(); h.gokyuzuYaz({ evren, tanim: tanim() });
    const diger = cihaz('Diğer'); diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    const t = tanim(); t.aylar[0].donem = 10;
    h.gokyuzuYaz({ evren, tanim: t });
    t.aylar[0].donem = 12; diger.gokyuzuYaz({ evren, tanim: t });
    h.islemleriAl({ evren, islemler: diger.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    const c = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === 'gokyuzu');
    expect(c?.tur).toBe('alan');
    expect(() => h.gokyuzuHesapla({ evren, tarih: '0' })).toThrow(/çelişen seçimleri/);
    if (c?.tur !== 'alan') throw new Error('Çatışma bekleniyordu.');
    h.alanCatismasiCoz({ evren, nesne: 'evren', alan: 'gokyuzu', islem: c.degerler[0].islem });
    expect(h.catismalar({ evren }).filter((c) => c.tur === 'alan' && c.alan === 'gokyuzu')).toEqual([]);
    expect(h.gokyuzuHesapla({ evren, tarih: '0' }).aralik).toBe(true);
  });
  it('takvim değişince başlangıcı yeniden okur; çözülemeyeni gün uydurarak sürdürmez', () => {
    const { h, evren } = hazirla(); const t = tanim();
    t.aylar[0].baslangic = '100 Hasat 0';
    h.gokyuzuYaz({ evren, tanim: t });
    h.takvimYaz({ evren, takvim: { ...z.ana, aylar: [{ ad: 'Hasat', gun: 90 }] } });
    expect(() => h.gokyuzuHesapla({ evren, tarih: '0' })).toThrow(/iki sınırı/);
    expect(h.gokyuzuTanimi({ evren })!.aylar[0].baslangic).toBe('100 Hasat 0');
  });
});
