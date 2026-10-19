import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { HakGirdisi } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dbler = new Map<string, Database>(), bildirimler: string[][] = [];
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x', (_e, _t, k) => bildirimler.push(k));
  return { h, bildirimler };
}
function kur() {
  const { h, bildirimler } = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma haklar evreni' }).kod;
  const kayit = (ad: string, tur = 'topluluk') => h.kayitOlustur({ evren, ad, tur }).kod;
  const konu = kayit('Uydurma kuzey ormanı', 'mekan'), sahip = kayit('Uydurma Aren hanedanı'), otorite = kayit('Uydurma taç', 'siyasi');
  const girdi = (g: Partial<HakGirdisi> = {}): HakGirdisi => ({ tur: 'kullanim', sahipler: [sahip], konu, kapsam: 'av', kosul: '', karar: 'kesin', otorite, baslangic: null, bitis: null, ...g });
  const ekle = (g: Partial<HakGirdisi> = {}) => h.hakEkle({ evren, hak: girdi(g) }).kod;
  const liste = (tarih?: string) => h.haklar({ evren, kayit: konu, tarih });
  return { h, evren, kayit, konu, sahip, otorite, girdi, ekle, liste, bildirimler };
}
const aktar = (a: Hizmet, b: Hizmet, evren: string) => b.islemleriAl({ evren, islemler: a.islemleriVer({ evren, gorulen: b.gorulenler({ evren }) }) });

describe('haklar ve yükümlülükler (F26)', () => {
  it('işlemden okunur, birden çok sahibi ve türü korunur; başka cihazda yeniden kurulur', () => {
    const { h, evren, kayit, ekle, liste, sahip, konu } = kur(), ortak = kayit('Uydurma ortaklar');
    const kod = ekle({ tur: 'yukumluluk', sahipler: [sahip, ortak], kapsam: 'koruma', kosul: 'Kayıtlı kısa koşul' });
    expect(liste().konu[0]).toMatchObject({ kod, konu: { kod: konu }, sahipler: [{ kod: sahip }, { kod: ortak }], tanim: { tur: 'yukumluluk', kosul: 'Kayıtlı kısa koşul' }, zaman: 'Zamanı belirsiz' });
    expect(h.haklar({ evren, kayit: ortak }).sahibi[0].kod).toBe(kod);
    const b = cihaz().h; b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(b.haklar({ evren, kayit: konu })).toEqual(liste());
    expect(h.islemGunlugu({ evren, sinir: 100 }).some((i) => i.tur === 'hak_ekle')).toBe(true);
  });

  it('tarihe göre süzer; tarihsiz hakkı belirsiz olarak tutar, aynı sınırda sahte kesinlik üretmez', () => {
    const { ekle, liste } = kur();
    const ic = ekle({ baslangic: { ifade: '1200' }, bitis: { ifade: '1250' } });
    const dis = ekle({ baslangic: { ifade: '1300' }, bitis: { ifade: '1350' } });
    const bos = ekle();
    const l = liste('1220').konu;
    expect(l.map((s) => s.kod).sort()).toEqual([ic, bos].sort());
    expect(l.find((s) => s.kod === ic)?.gecerli).toBe('evet');
    expect(l.find((s) => s.kod === bos)).toMatchObject({ gecerli: 'belirsiz', zaman: 'Zamanı belirsiz' });
    expect(l.some((s) => s.kod === dis)).toBe(false);
    expect(liste('1200').konu.find((s) => s.kod === ic)?.gecerli).toBe('belirsiz');
    expect(liste().konu.every((s) => s.zaman === 'Zamanı belirsiz')).toBe(true);
  });

  it('olaya bağlı süre olayın tarihiyle değişir; tarihsiz olay yok sayılmaz', () => {
    const { h, evren, kayit, ekle, liste } = kur(), olay = kayit('Uydurma antlaşma', 'olay');
    const kod = ekle({ baslangic: { olay, fark: '1 yıl sonra' }, bitis: { ifade: '1300' } });
    expect(liste('1220').konu[0]).toMatchObject({ kod, gecerli: 'belirsiz', baslangic: { olay: { kod: olay }, tarih: null } });
    h.kayitTarih({ evren, kod: olay, ifade: '1200' });
    expect(liste('1220').konu[0].gecerli).toBe('evet');
    h.kayitTarih({ evren, kod: olay, ifade: '1250' }); expect(liste('1220').konu).toHaveLength(0);
  });

  it('tanıyan otorite ve fiilî tanımalar ayrı tutulur; farklı otoriteler yan yana kalır', () => {
    const { h, evren, kayit, ekle, liste, otorite } = kur(), muhafiz = kayit('Uydurma muhafızlar'), tapinak = kayit('Uydurma tapınak');
    const hak = ekle();
    h.hakTanimaYaz({ evren, hak, otorite: muhafiz, durum: 'tanimiyor' });
    const { kod } = h.hakTanimaYaz({ evren, hak, otorite: tapinak, durum: 'taniyor' });
    expect(liste().konu[0].otorite?.kod).toBe(otorite);
    // Aynı anda oluşturulan kodların sırası belirsizdir; otoriteye göre karşılaştırılır.
    const tanimalar = () => Object.fromEntries(liste().konu[0].tanimalar.map((t) => [t.otorite.kod, t.durum]));
    expect(tanimalar()).toEqual({ [muhafiz]: 'tanimiyor', [tapinak]: 'taniyor' });
    h.hakTanimaYaz({ evren, hak, kod, otorite: tapinak, durum: 'bilinmiyor' });
    expect(tanimalar()[tapinak]).toBe('bilinmiyor');
  });

  it('aynı kapsamda örtüşen iki mülkiyeti yalnızca bilgi olarak gösterir; koşulu yorumlamaz', () => {
    const { ekle, liste } = kur();
    ekle({ tur: 'mulkiyet', baslangic: { ifade: '1200' }, bitis: { ifade: '1250' }, kosul: 'Yalnız mavi ayda' });
    ekle({ tur: 'mulkiyet', baslangic: { ifade: '1220' }, bitis: { ifade: '1300' }, kosul: 'Mavi ay dışında' });
    expect(liste().bilgiler).toHaveLength(1);
    expect(liste().bilgiler[0].ileti).toBe('Aynı konuda iki mülkiyet kaydı aynı dönemde geçerli.');
    expect(liste('1230').bilgiler[0].ileti).toBe('Aynı konuda iki mülkiyet kaydı aynı dönemde geçerli.');
  });

  it('farklı kapsam, ayrık dönem ve vazgeçilmiş mülkiyet için birlikte geçerlilik çıkarmaz', () => {
    const { ekle, liste } = kur();
    ekle({ tur: 'mulkiyet', baslangic: { ifade: '1200' }, bitis: { ifade: '1250' } });
    ekle({ tur: 'mulkiyet', baslangic: { ifade: '1300' }, bitis: { ifade: '1350' } });
    ekle({ tur: 'mulkiyet', kapsam: 'AV', baslangic: { ifade: '1200' }, bitis: { ifade: '1250' } });
    ekle({ tur: 'mulkiyet', karar: 'vazgecildi', baslangic: { ifade: '1200' }, bitis: { ifade: '1250' } });
    expect(liste().bilgiler).toEqual([]);
    expect(liste().konu.some((s) => s.tanim.karar === 'vazgecildi')).toBe(true);
  });

  it('tarihsiz iki mülkiyette geçerlilik ilan etmez', () => {
    const { ekle, liste } = kur(); ekle({ tur: 'mulkiyet' }); ekle({ tur: 'mulkiyet' });
    expect(liste().bilgiler[0].ileti).toMatch(/örtüşebilir; zamanı belirsiz/);
  });

  it('kaldırma ve geri getirme işlemle yapılır; silinmiş kaydı düzenlemek kendiliğinden geri getirmez', () => {
    const { h, evren, ekle, liste, konu, girdi } = kur(), kod = ekle();
    h.hakSil({ evren, kod }); expect(liste().konu).toHaveLength(0);
    h.hakDegistir({ evren, kod, hak: girdi({ kapsam: 'odun' }) });
    expect(liste().konu).toHaveLength(0); expect(h.haklar({ evren, kayit: konu, cop: true }).konu[0].tanim.kapsam).toBe('odun');
    h.hakGeriYukle({ evren, kod }); expect(liste().konu[0].tanim.kapsam).toBe('odun');
  });

  it('birleştirilmiş konu, sahip ve otorite eski kodla yazılmış işlemlerde yönlendirilir', () => {
    const { h, evren, konu, sahip, otorite, ekle } = kur();
    const yeniKonu = h.kayitOlustur({ evren, ad: 'Uydurma yeni orman', tur: 'mekan' }).kod;
    const yeniSahip = h.kayitOlustur({ evren, ad: 'Uydurma yeni hanedan', tur: 'topluluk' }).kod;
    const yeniOtorite = h.kayitOlustur({ evren, ad: 'Uydurma yeni taç', tur: 'siyasi' }).kod;
    const once = ekle();
    const b = cihaz().h; b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    const sonra = b.hakEkle({ evren, hak: { tur: 'izin', sahipler: [sahip], konu, kapsam: 'av', kosul: '', karar: 'kesin', otorite } }).kod;
    b.hakTanimaYaz({ evren, hak: sonra, otorite, durum: 'taniyor' });
    for (const [kaynak, hedef] of [[konu, yeniKonu], [sahip, yeniSahip], [otorite, yeniOtorite]]) h.birlestir({ evren, kaynak, hedef, secimler: {} });
    aktar(b, h, evren);
    const l = h.haklar({ evren, kayit: yeniKonu }).konu;
    expect(l.map((s) => s.kod).sort()).toEqual([once, sonra].sort());
    expect(l.every((s) => s.konu.kod === yeniKonu && s.sahipler[0].kod === yeniSahip && s.otorite?.kod === yeniOtorite)).toBe(true);
    expect(l.find((s) => s.kod === sonra)?.tanimalar[0].otorite.kod).toBe(yeniOtorite);
  });

  it('geçersiz girdileri Türkçe açıklamayla reddeder', () => {
    const { h, evren, girdi, ekle, otorite } = kur();
    expect(() => ekle({ konu: '' })).toThrow('Hakkın konusu olan kaydı seçin.');
    expect(() => ekle({ sahipler: [] })).toThrow(/hak sahibi/);
    expect(() => ekle({ tur: 'baska' as never })).toThrow(/türünü/);
    expect(() => ekle({ karar: 'baska' })).toThrow(/Karar/);
    expect(() => ekle({ baslangic: { ifade: 'uydurma tarih' } })).toThrow(/okunamadı/);
    expect(() => ekle({ baslangic: { ifade: '1300' }, bitis: { ifade: '1200' } })).toThrow(/önce olamaz/);
    expect(() => ekle({ baslangic: { olay: otorite } })).toThrow(/olay ya da sahne/);
    expect(() => ekle({ baslangic: { fark: '3 gün sonra' } })).toThrow(/olayı seçin/);
    expect(() => h.hakEkle({ evren, hak: { ...girdi(), kapsam: 'x'.repeat(301) } })).toThrow(/kısa/);
    const hak = ekle(); expect(() => h.hakTanimaYaz({ evren, hak, otorite, durum: 'baska' as never })).toThrow(/Tanıma/);
  });

  it('iki cihazdaki hak ve tanıma çatışması gösterilir, seçilen değer işlemle çözülür', () => {
    const { h, evren, ekle, liste, girdi, otorite } = kur(), hak = ekle();
    const { kod } = h.hakTanimaYaz({ evren, hak, otorite, durum: 'bilinmiyor' });
    const b = cihaz().h; b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.hakDegistir({ evren, kod: hak, hak: girdi({ kapsam: 'av bir' }) }); b.hakDegistir({ evren, kod: hak, hak: girdi({ kapsam: 'av iki' }) });
    h.hakTanimaYaz({ evren, hak, kod, otorite, durum: 'taniyor' }); b.hakTanimaYaz({ evren, hak, kod, otorite, durum: 'tanimiyor' });
    aktar(b, h, evren);
    expect(liste().konu[0].secenekler).toHaveLength(2);
    expect(liste().konu[0].tanimalar[0].secenekler).toHaveLength(2);
    for (const c of h.catismalar({ evren })) if (c.tur === 'alan' && c.nesne === hak) h.alanCatismasiCoz({ evren, nesne: hak, alan: c.alan, islem: c.degerler[0].islem });
    expect(h.catismalar({ evren })).toHaveLength(0); expect(liste().konu[0].secenekler).toEqual([]);
    expect(liste().konu[0].tanimalar[0].secenekler).toEqual([]);
  });

  it('düzenleme eski ve yeni sahiplerin sayfalarına bildirilir', () => {
    const { h, evren, ekle, girdi, kayit, sahip, konu, bildirimler } = kur(), kod = ekle(), yeni = kayit('Uydurma yeni sahip');
    h.hakDegistir({ evren, kod, hak: girdi({ sahipler: [yeni] }) });
    expect(bildirimler.at(-1)).toEqual(expect.arrayContaining([sahip, yeni, konu]));
    expect(h.haklar({ evren, kayit: sahip }).sahibi).toHaveLength(0);
    expect(h.haklar({ evren, kayit: yeni }).sahibi[0].kod).toBe(kod);
  });
});
