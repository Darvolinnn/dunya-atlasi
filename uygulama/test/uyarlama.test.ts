import { beforeAll, describe, expect, it, vi } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { UyarlamaTanimi } from '../src/veri/api';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dbler = new Map<string, Database>();
  return new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
}
function kur() {
  const h = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma uyarlama evreni' }).kod;
  const kayit = (ad: string, tur = 'karakter', yer = evren) => h.kayitOlustur({ evren: yer, ad, tur }).kod;
  const eserA = kayit('Uydurma Roman', 'eser'), eserB = kayit('Uydurma Uyarlama', 'eser');
  const a = kayit('Uydurma Ardıç'), aa = kayit('Uydurma Çınar'), b = kayit('Uydurma Selvi');
  const t = (ek: Partial<UyarlamaTanimi> = {}): UyarlamaTanimi => ({ a: { eser: eserA, dal: null, kayitlar: [a] }, b: { eser: eserB, dal: null, kayitlar: [b] }, tur: 'karsilik', not: '', ...ek });
  const yaz = (tanim = t()) => h.uyarlamaYaz({ evren, tanim }).kod;
  const liste = () => h.uyarlamaListesi({ evren, eser: eserA });
  return { h, evren, kayit, eserA, eserB, a, aa, b, t, yaz, liste };
}
function esitle(a: Hizmet, b: Hizmet, evren: string) {
  const ab = a.islemleriVer({ evren, gorulen: b.gorulenler({ evren }) }), ba = b.islemleriVer({ evren, gorulen: a.gorulenler({ evren }) });
  b.islemleriAl({ evren, islemler: ab }); a.islemleriAl({ evren, islemler: ba });
}

describe('uyarlama eşlemeleri (F35)', () => {
  it('iki karakteri tek karaktere eşler, işlemden geri okur ve siler', () => {
    const { h, evren, eserA, a, aa, b, t, yaz, liste } = kur();
    const tanim = t({ tur: 'indirgeme', a: { eser: eserA, dal: null, kayitlar: [a, aa] }, not: 'Uydurma indirgeme' });
    const kod = yaz(tanim);
    expect(liste()[0]).toMatchObject({ kod, tanim, etkilenmis: false, catismali: false });
    expect(liste()[0].a.kayitlar.map((k) => k.kod)).toEqual([a, aa]);
    expect(liste()[0].b.kayitlar.map((k) => k.kod)).toEqual([b]);
    const yeni = cihaz(); yeni.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(yeni.uyarlamaListesi({ evren })[0].tanim).toEqual(tanim);
    h.uyarlamaSil({ evren, kod }); expect(liste()).toEqual([]);
    const i = h.islemGunlugu({ evren, sinir: 1 })[0];
    expect(i.tur).toBe('uyarlama_sil'); expect(islemAciklamasi(i.tur, i.veri, () => '')).toBe('Uyarlama eşlemesi kaldırıldı');
  });
  it('ad ve tarih değişikliği iki tarafta da izlenir; onaydan sonra listeden çıkar', () => {
    const { h, evren, a, b, yaz, liste } = kur(); const kod = yaz();
    h.kayitDegistir({ evren, kod: a, alan: 'ad', deger: 'Uydurma yeni ad' });
    h.kayitTarih({ evren, kod: b, ifade: '412–415' });
    expect(liste()[0].etkilenmis).toBe(true);
    expect(new Set(liste()[0].degisiklikler.map((d) => d.taraf))).toEqual(new Set(['a', 'b']));
    h.uyarlamaGozdenGecir({ evren, kod });
    expect(liste()[0].etkilenmis).toBe(false);
    expect(h.kayit({ evren, kod: b }).tarih?.ifade).toBe('412–415');
  });
  it('bir taraftaki değişiklik diğerinin verisini veya yayın kararını değiştirmez', () => {
    const { h, evren, a, b, yaz, liste } = kur(); const kod = yaz();
    const once = h.kayit({ evren, kod: b });
    h.kayitDegistir({ evren, kod: a, alan: 'ad', deger: 'Uydurma farklı ad' });
    liste(); h.uyarlamaGozdenGecir({ evren, kod });
    expect(h.kayit({ evren, kod: b })).toEqual(once);
    const son = h.islemGunlugu({ evren, sinir: 1 })[0]; expect(son.tur).toBe('uyarlama_gozden_gecir');
  });
  it('sıra karşılaştırmasının iki listesi korunur; eser sırası değişince etki listelenir', () => {
    const { h, evren, eserA, eserB, kayit, yaz, liste, t } = kur();
    const x = h.anlatiOlustur({ evren, ust: eserA, ad: 'Uydurma ilk sahne', tur: 'sahne' }).kod;
    const y = h.anlatiOlustur({ evren, ust: eserA, ad: 'Uydurma son sahne', tur: 'sahne' }).kod;
    const u = kayit('Uydurma olay A', 'olay'), v = kayit('Uydurma olay B', 'olay');
    yaz(t({ tur: 'sira', a: { eser: eserA, dal: null, kayitlar: [x, y] }, b: { eser: eserB, dal: null, kayitlar: [v, u] } }));
    h.anlatiYerlestir({ evren, kod: y, ust: eserA, sira: 0 });
    expect(liste()[0].etkilenmis).toBe(true);
    expect(liste()[0].tanim.b.kayitlar).toEqual([v, u]);
  });
  it('katılımcı ekleme, değiştirme ve kaldırmayı izler', () => {
    const { h, evren, a, kayit, yaz, liste, eserA, t } = kur();
    const olay = kayit('Uydurma buluşma', 'olay');
    const kod = yaz(t({ a: { eser: eserA, dal: null, kayitlar: [olay] } }));
    const iliski = h.iliskiEkle({ evren, a, b: olay, tur: 'olayda', rol: 'tanik' }).kod;
    expect(liste()[0].etkilenmis).toBe(true); h.uyarlamaGozdenGecir({ evren, kod });
    h.iliskiDegistir({ evren, kod: iliski, alan: 'rol', deger: 'katilan' });
    expect(liste()[0].etkilenmis).toBe(true); h.uyarlamaGozdenGecir({ evren, kod });
    h.iliskiSil({ evren, kod: iliski }); expect(liste()[0].etkilenmis).toBe(true);
  });
  it('çıkarılmış sahnenin ikinci listesi boş kalabilir; kayıt silinince etki görünür', () => {
    const { h, evren, a, t, yaz, liste } = kur(); const tanim = t(); tanim.tur = 'cikarildi'; tanim.b.kayitlar = [];
    const kod = yaz(tanim); expect(liste()[0].b.kayitlar).toEqual([]);
    h.kayitSil({ evren, kod: a }); expect(liste()[0]).toMatchObject({ etkilenmis: true, a: { kayitlar: [{ silindi: true }] } });
    h.uyarlamaGozdenGecir({ evren, kod }); expect(liste()[0].etkilenmis).toBe(false); expect(liste()[0].uyarilar.length).toBeGreaterThan(0);
  });
  it('birleştirmeden sonra kaydı yönlendirilmiş adıyla gösterir; saklı kimliği korur', () => {
    const { h, evren, a, aa, yaz, liste } = kur(); yaz();
    h.birlestir({ evren, kaynak: a, hedef: aa, secimler: {} });
    expect(liste()[0].a.kayitlar[0]).toMatchObject({ kod: aa, sakliKod: a });
    expect(liste()[0].etkilenmis).toBe(true);
  });
  it('deneme kopyasındaki yeni kaydı dal kimliğiyle tutar, ana kaydı değiştirmez', () => {
    const { h, evren, eserA, a, kayit, t, yaz, liste } = kur();
    const dal = h.dalOlustur({ evren, ad: 'Uydurma deneme' }).kod;
    const yeni = kayit('Uydurma dal kişisi', 'karakter', dal);
    const kod = yaz(t({ b: { eser: eserA, dal, kayitlar: [yeni] } }));
    expect(liste()[0].b).toMatchObject({ dal: { kod: dal, durum: 'etkin' }, kayitlar: [{ kod: yeni, sakliKod: yeni }] });
    h.kayitDegistir({ evren: dal, kod: yeni, alan: 'ad', deger: 'Uydurma dalda yeni ad' });
    expect(liste()[0].etkilenmis).toBe(true);
    h.uyarlamaGozdenGecir({ evren, kod }); expect(liste()[0].etkilenmis).toBe(false);
    expect(h.kayit({ evren, kod: a }).ad).toBe('Uydurma Ardıç');
    h.dalSil({ evren, kod: dal });
    expect(liste()[0].b.dal?.durum).toBe('silindi'); expect(liste()[0].etkilenmis).toBe(true);
    expect(liste()[0].tanim.b.kayitlar).toEqual([yeni]);
  });
  it('başka cihazda deneme kopyasının onaylanmış değişiklikleri yoksa açıkça söyler', () => {
    const { h, evren, eserA, a, t, yaz } = kur(); const dal = h.dalOlustur({ evren, ad: 'Uydurma deneme' }).kod;
    h.kayitDegistir({ evren: dal, kod: a, alan: 'ad', deger: 'Uydurma dal adı' });
    yaz(t({ b: { eser: eserA, dal, kayitlar: [a] } }));
    const diger = cihaz(); diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(diger.uyarlamaListesi({ evren })[0].uyarilar.join(' ')).toContain('henüz ulaşmamış');
    const kod = diger.uyarlamaListesi({ evren })[0].kod;
    expect(() => diger.uyarlamaGozdenGecir({ evren, kod })).toThrow('ulaşmadan');
  });
  it('geç eşitlenen eski saatli değişikliği gözden geçirme gizlemez', () => {
    const { h, evren, a, yaz, liste } = kur(); const kod = yaz();
    const diger = cihaz(); diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    const saat = vi.spyOn(Date, 'now').mockReturnValue(1000000000000);
    try { diger.kayitTarih({ evren, kod: a, ifade: '430' }); } finally { saat.mockRestore(); }
    h.uyarlamaGozdenGecir({ evren, kod }); expect(liste()[0].etkilenmis).toBe(false);
    esitle(h, diger, evren); expect(liste()[0].etkilenmis).toBe(true);
    h.uyarlamaGozdenGecir({ evren, kod }); expect(liste()[0].etkilenmis).toBe(false);
  });
  it('iki cihazın farklı eşlemesini görünür tutar ve seçimle çözer', () => {
    const { h, evren, t, yaz, liste } = kur(); const kod = yaz();
    const diger = cihaz(); diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.uyarlamaYaz({ evren, kod, tanim: t({ not: 'Uydurma birinci seçim' }) });
    diger.uyarlamaYaz({ evren, kod, tanim: t({ not: 'Uydurma ikinci seçim' }) });
    esitle(h, diger, evren); expect(liste()[0].catismali).toBe(true);
    expect(() => h.uyarlamaGozdenGecir({ evren, kod })).toThrow('çelişen');
    const c = h.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === 'uyarlama_esleme');
    if (c?.tur !== 'alan') throw new Error('Eşleme çatışması bekleniyordu.');
    const ikinci = c.degerler.find((d) => d.yazi?.includes('ikinci'))!;
    h.alanCatismasiCoz({ evren, nesne: kod, alan: 'uyarlama_esleme', islem: ikinci.islem });
    esitle(h, diger, evren);
    expect(liste()[0]).toMatchObject({ catismali: false, tanim: { not: 'Uydurma ikinci seçim' } });
    expect(diger.uyarlamaListesi({ evren })[0].catismali).toBe(false);
  });
  it('eşzamanlı gözden geçirme düzenlemeyi sessizce onaylamaz', () => {
    const { h, evren, t, yaz, liste } = kur(); const kod = yaz(); const diger = cihaz();
    diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.uyarlamaGozdenGecir({ evren, kod }); diger.uyarlamaYaz({ evren, kod, tanim: t({ not: 'Uydurma yeni karşılık' }) });
    esitle(h, diger, evren); expect(liste()[0].catismali).toBe(true);
  });
  it('eşzamanlı silme ve düzenleme çatışır; kaldırma seçimi ayrıca çözülür', () => {
    const { h, evren, t, yaz, liste } = kur(); const kod = yaz(); const diger = cihaz();
    diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.uyarlamaSil({ evren, kod }); diger.uyarlamaYaz({ evren, kod, tanim: t({ not: 'Uydurma değişiklik' }) });
    esitle(h, diger, evren); expect(liste()[0].catismali).toBe(true);
    const c = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === 'uyarlama_silindi');
    if (c?.tur !== 'alan') throw new Error('Kaldırma çatışması bekleniyordu.');
    h.alanCatismasiCoz({ evren, nesne: kod, alan: c.alan, islem: c.degerler.find((d) => d.deger === true)!.islem });
    expect(liste()).toEqual([]);
  });
  it('geçersiz eşlemeleri reddeder ve okumalar işlem yazmaz', () => {
    const { h, evren, a, t, yaz, liste } = kur(); const once = h.islemGunlugu({ evren, sinir: 1000 });
    const t1 = t(); t1.a.kayitlar = [a, a]; expect(() => yaz(t1)).toThrow('birden çok');
    expect(() => yaz(t({ tur: 'indirgeme' }))).toThrow('en az iki');
    const t2 = t({ tur: 'cikarildi' }); expect(() => yaz(t2)).toThrow('boş olmalı');
    liste(); h.uyarlamaAdaylari({ evren });
    expect(h.islemGunlugu({ evren, sinir: 1000 })).toEqual(once);
  });
  it('eşlenen olayın katılımcısı birleştirilince de etkiyi yakalar', () => {
    const { h, evren, a, aa, eserA, kayit, t, yaz, liste } = kur();
    const olay = kayit('Uydurma geçiş', 'olay');
    h.iliskiEkle({ evren, a, b: olay, tur: 'olayda', rol: 'tanik' });
    yaz(t({ a: { eser: eserA, dal: null, kayitlar: [olay] } }));
    h.birlestir({ evren, kaynak: a, hedef: aa, secimler: {} });
    expect(liste()[0].etkilenmis).toBe(true);
  });
});
