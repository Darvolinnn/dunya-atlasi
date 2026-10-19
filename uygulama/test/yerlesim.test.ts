import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { yeniKod } from '../src/alan/kod';
import { aciIcinde, dogrularKesisir, gorusHatti, sesUlasir } from '../src/alan/gorus';
import type { SahneYerlesimi, YerlesimOgesi } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
const isleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 800, boy: 400, onizleme: new Uint8Array([7]) });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { if (!dosyalar.has(ad)) dosyalar.set(ad, new sqlite.oo1.DB(':memory:')); return dosyalar.get(ad)!; };
  return { h: new Hizmet(ac, 'Uydurma deneme', 'x', () => {}, new BellekDeposu(), isleyici), ac };
}
const karakter = (): Extract<YerlesimOgesi, { tur: 'karakter' }> => ({ kod: yeniKod(), ad: 'Uydurma gözlemci', tur: 'karakter', kisi: yeniKod(), konum: { x: 0.1, y: 0.5 }, yon: 0, aci: 90, uzaklik: 1, adimlar: [] });
const duvar = (tur: 'duvar' | 'kapi' | 'pencere' | 'siper' = 'duvar', acik = false): YerlesimOgesi => ({ kod: yeniKod(), ad: 'Uydurma çizgi', tur, a: { x: 0.5, y: 0 }, b: { x: 0.5, y: 1 }, acik });
const yerlesim = (ogeler: YerlesimOgesi[] = []): SahneYerlesimi => ({ plan: { mekan: yeniKod(), gorsel: 'uydurma', en: 800, boy: 400 }, ogeler });

describe('sahne yerleşimi geometrisi', () => {
  it('duvar ve siper görüşü keser; açık kapı ve pencere kesmez, kapalı kapı keser', () => {
    const k = karakter(), hedef = { x: 0.9, y: 0.5 };
    for (const [o, sonuc] of [[duvar(), false], [duvar('siper'), false], [duvar('kapi'), false], [duvar('kapi', true), true], [duvar('pencere'), true]] as const) {
      expect(gorusHatti(yerlesim([o]), k, hedef)).toBe(sonuc);
    }
  });
  it('açı ve uzaklık dışını eler; yönün çevrimini ve açı sınırını korur', () => {
    const k = karakter();
    expect(gorusHatti(yerlesim(), k, { x: 0, y: 0.5 })).toBe(false);
    expect(gorusHatti(yerlesim(), { ...k, uzaklik: 0.1 }, { x: 0.9, y: 0.5 })).toBe(false);
    expect(aciIcinde({ x: 0, y: 0 }, { x: 1, y: 0 }, 359, 2)).toBe(true);
    expect(aciIcinde({ x: 0, y: 0 }, { x: 1, y: 1 }, 0, 90)).toBe(true);
    expect(aciIcinde({ x: 0, y: 0 }, { x: -1, y: 0 }, 0, 360)).toBe(true);
  });
  it('dikdörtgen planın en-boy oranını mesafede ve açıda korur', () => {
    const k = { ...karakter(), konum: { x: 0, y: 0 }, yon: 45, aci: 1, uzaklik: 0.72 };
    expect(gorusHatti(yerlesim(), k, { x: 0.5, y: 1 })).toBe(true);
    expect(gorusHatti({ ...yerlesim(), plan: { ...yerlesim().plan, boy: 800 } }, k, { x: 0.5, y: 1 })).toBe(false);
  });
  it('uç dokunmasını, paralel çizgileri, örtüşmeyi ve nokta kesişimini ayırır', () => {
    const a = { x: 0, y: 0 }, b = { x: 1, y: 0 };
    expect(dogrularKesisir(a, b, b, { x: 1, y: 1 })).toBe(true);
    expect(dogrularKesisir(a, b, { x: 0.2, y: 0 }, { x: 0.3, y: 0 })).toBe(true);
    expect(dogrularKesisir(a, b, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(false);
    expect(dogrularKesisir(a, a, b, { x: 2, y: 0 })).toBe(false);
  });
  it('ses uzaklığını ve kesilen her engelin azaltmasını uygular; eksik varsayımda durur', () => {
    const s: Extract<YerlesimOgesi, { tur: 'ses' }> = { kod: yeniKod(), ad: 'Uydurma kaynak', tur: 'ses', konum: { x: 0.1, y: 0.5 }, duzey: 'Alçak', uzaklik: 0.9, azaltma: 0.2, gurultu: 'Sessiz oda' };
    const hedef = { x: 0.9, y: 0.5 };
    expect(sesUlasir(yerlesim(), s, hedef)).toBe(true);
    expect(sesUlasir(yerlesim([duvar()]), s, hedef)).toBe(false);
    expect(sesUlasir(yerlesim([duvar('kapi', true)]), s, hedef)).toBe(true);
    const ikinci = duvar();
    if ('a' in ikinci) { ikinci.a.x = 0.6; ikinci.b.x = 0.6; }
    expect(sesUlasir(yerlesim([duvar(), ikinci]), { ...s, uzaklik: 1.1 }, hedef)).toBe(false);
    expect(sesUlasir(yerlesim(), { ...s, uzaklik: 0.7 }, hedef)).toBe(false);
    expect(sesUlasir(yerlesim(), { ...s, uzaklik: null }, hedef)).toBeNull();
    expect(sesUlasir(yerlesim(), { ...s, gurultu: '' }, hedef)).toBeNull();
    expect(sesUlasir(yerlesim([duvar()]), { ...s, uzaklik: 0.2 }, s.konum)).toBe(true);
  });
});

async function hazirla() {
  const { h, ac } = cihaz();
  const evren = h.evrenOlustur({ ad: 'Uydurma deneme evreni' }).kod;
  const sahne = h.kayitOlustur({ evren, ad: 'Uydurma oda sahnesi', tur: 'sahne' }).kod;
  const mekan = h.kayitOlustur({ evren, ad: 'Uydurma oda', tur: 'mekan' }).kod;
  const kisi = h.kayitOlustur({ evren, ad: 'Uydurma kişi', tur: 'karakter' }).kod;
  h.iliskiEkle({ evren, tur: 'sahnede', a: kisi, b: sahne, rol: 'bulunuyor' });
  const { ad: gorsel } = await h.gorselEkle({ evren, kod: mekan, dosyaAdi: 'uydurma.png', tur: 'image/png', veri: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]) });
  const plan = { mekan, gorsel, en: 800, boy: 400 };
  const ogeler: YerlesimOgesi[] = [duvar(), { ...karakter(), kisi, adimlar: [{ x: 0.2, y: 0.3 }] }];
  return { h, ac, evren, sahne, mekan, kisi, plan, ogeler };
}
describe('işlemden türetilen sahne yerleşimi', () => {
  it('geri okunur ve yeniden kurulur; kalıcı plan değişmez, eski görsel sürümü korunur', async () => {
    const { h, ac, evren, sahne, mekan, plan, ogeler } = await hazirla();
    const harita = h.gorseldenHarita({ evren, kayit: mekan, gorsel: plan.gorsel }).kod;
    const once = h.harita({ evren, kod: harita });
    h.yerlesimYaz({ evren, sahne, plan, ogeler });
    expect(h.yerlesim({ evren, sahne }).yerlesim).toEqual({ plan, ogeler });
    expect(h.islemGunlugu({ evren, sinir: 50 }).some((i) => i.tur === 'yerlesim_yaz')).toBe(true);
    const db = ac(`/evren-${evren}.db`);
    const e = new EvrenVt(db, yeniKod()); e.yenidenKur();
    expect(h.yerlesim({ evren, sahne }).yerlesim).toEqual({ plan, ogeler });
    expect(h.harita({ evren, kod: harita })).toEqual(once);
    h.kayitGorselCikar({ evren, kod: mekan, ad: plan.gorsel });
    await h.gorselEkle({ evren, kod: mekan, dosyaAdi: 'yeni.png', tur: 'image/png', veri: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 2]) });
    expect(h.yerlesim({ evren, sahne }).yerlesim?.plan).toEqual(plan);
    expect(() => h.yerlesimYaz({ evren, sahne, plan, ogeler })).not.toThrow();
  });
  it('olmayan, sahneye katılmayan ve tekrarlı kişileri; bozuk ölçü ve konumları reddeder', async () => {
    const { h, evren, sahne, plan, ogeler } = await hazirla();
    const yaz = (o: YerlesimOgesi[]) => h.yerlesimYaz({ evren, sahne, plan, ogeler: o });
    expect(() => yaz([karakter()])).toThrow(/Kayıt/);
    const disarida = h.kayitOlustur({ evren, ad: 'Uydurma başka kişi', tur: 'karakter' }).kod;
    expect(() => yaz([{ ...karakter(), kisi: disarida }])).toThrow(/katılımcı/);
    expect(() => yaz([...ogeler, { ...ogeler[1], kod: yeniKod() }])).toThrow(/hareket/);
    expect(() => yaz([{ ...karakter(), konum: { x: NaN, y: 0 } }])).toThrow(/Konum/);
    expect(() => h.yerlesimYaz({ evren, sahne, plan: { ...plan, en: 400 }, ogeler })).toThrow(/kat planı/);
  });
  it('iki cihazın çatışmasını görünür tutar ve yazarın seçimi işlemle çözülür', async () => {
    const { h, evren, sahne, plan, ogeler } = await hazirla();
    const b = cihaz().h;
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.yerlesimYaz({ evren, sahne, plan, ogeler });
    b.yerlesimYaz({ evren, sahne, plan, ogeler: [] });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(h.yerlesim({ evren, sahne }).catismali).toBe(true);
    const c = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === 'yerlesim');
    expect(c?.tur === 'alan' && c.alanEtiketi).toBe('Sahne yerleşimi');
    if (c?.tur !== 'alan') throw new Error('Çatışma bekleniyordu.');
    h.alanCatismasiCoz({ evren, nesne: sahne, alan: 'yerlesim', islem: c.degerler[0].islem });
    expect(h.yerlesim({ evren, sahne }).catismali).toBe(false);
  });
  it('kişinin birleştirilmesini okuma ve sonradan gelen işlemlerde yönlendirir', async () => {
    const { h, evren, sahne, kisi, plan, ogeler } = await hazirla();
    h.yerlesimYaz({ evren, sahne, plan, ogeler });
    const b = cihaz().h;
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    const hedef = h.kayitOlustur({ evren, ad: 'Uydurma birleşen kişi', tur: 'karakter' }).kod;
    h.birlestir({ evren, kaynak: kisi, hedef });
    expect(h.yerlesim({ evren, sahne }).yerlesim?.ogeler[1]).toMatchObject({ kisi: hedef });
    b.yerlesimYaz({ evren, sahne, plan, ogeler: [ogeler[1]] });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(h.yerlesim({ evren, sahne }).yerlesim?.ogeler.filter((o) => o.tur === 'karakter')).toMatchObject([{ kisi: hedef }]);
    expect(() => h.yerlesimYaz({ evren, sahne, plan, ogeler: [ogeler[1]] })).not.toThrow();
  });
  it('aynı mekândaki iki sahneyi ayrı tutar; eski şema sürümünü artırmadan tabloyu açar', async () => {
    const { h, ac, evren, sahne, plan, ogeler } = await hazirla();
    const diger = h.kayitOlustur({ evren, ad: 'Uydurma ikinci sahne', tur: 'sahne' }).kod;
    h.yerlesimYaz({ evren, sahne, plan, ogeler });
    h.yerlesimYaz({ evren, sahne: diger, plan, ogeler: [] });
    expect(h.yerlesim({ evren, sahne }).yerlesim?.ogeler).toHaveLength(2);
    expect(h.yerlesim({ evren, sahne: diger }).yerlesim?.ogeler).toHaveLength(0);
    const db = ac(`/evren-${evren}.db`), surum = db.selectValue("SELECT v FROM meta WHERE k='izdusum_surumu'");
    db.exec('DROP TABLE sahne_yerlesimleri');
    const e = new EvrenVt(db, yeniKod());
    expect(db.selectValue("SELECT v FROM meta WHERE k='izdusum_surumu'")).toBe(surum);
    e.yenidenKur();
    expect(h.yerlesim({ evren, sahne }).yerlesim?.ogeler).toHaveLength(2);
  });
});
