import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { HukukTanimi, KuralOrnegiTanimi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}
type Girdi = Omit<HukukTanimi, 'baslangic' | 'bitis'> & { baslangic: string; bitis: string };
const tanim = (x: Partial<Girdi>): Girdi => ({ ad: 'Kural', tur: 'yasak', konu: '', kimlere: [], yer: null, yaptirim: '', fiili: null, fiiliNot: '', baslangic: '', bitis: '', ...x });

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const sehir = kayit('Taşliman', 'sehir'), lonca = kayit('Kılıççılar loncası', 'topluluk'), koy = kayit('Dere köyü', 'mekan');
  const elin = kayit('Elin', 'karakter'), daran = kayit('Daran', 'karakter');
  h.iliskiEkle({ evren, tur: 'uye', a: elin, b: lonca });
  const { kod: kural } = h.hukukKuraliOlustur({ evren, sahip: sehir, ad: 'Silah yasağı' });
  const yaz = (x: Partial<Girdi>) => h.hukukKuraliYaz({ evren, kod: kural, tanim: tanim({ ad: 'Silah yasağı', konu: 'kılıç taşımak', ...x }) });
  yaz({ kimlere: [{ iliski: 'uye', hedef: lonca, degil: true }] }); // lonca üyesi olmayanlara
  const ornek = (x: Partial<KuralOrnegiTanimi>, kod: string | null = null) =>
    h.kuralOrnegiYaz({ evren, kural, kod, tanim: { kisi: daran, yer: sehir, tarih: '', beklenen: 'uygulanir', not: '', ...x } }).kod;
  const liste = () => h.kuralOrnekleri({ evren, kural });
  return { h, evren, sehir, lonca, koy, elin, daran, kural, yaz, ornek, liste };
}

describe('kural atölyesi (F16, formülsüz)', () => {
  it('örnek durumlar beklentiyle karşılaştırılır; kayıtlı olmayan "değil" belirsiz kalır', () => {
    const { elin, daran, koy, ornek, liste } = kur();
    ornek({ kisi: elin, beklenen: 'uygulanmaz', not: 'Lonca üyesi muaf' });
    ornek({ kisi: daran, beklenen: 'uygulanir' }); // üyeliği kayıtlı değil
    ornek({ kisi: daran, yer: koy, beklenen: 'uygulanmaz' });
    ornek({ kisi: daran, beklenen: 'sinir' });
    const o = liste().ornekler;
    expect(o.map((x) => [x.sonuc, x.hukum])).toEqual([
      ['uygulanmaz', 'geciyor'], ['belirsiz', 'belirsiz'], ['uygulanmaz', 'geciyor'], ['belirsiz', 'geciyor'],
    ]);
    expect(o[0].neden).toMatch(/Koşul tutmuyor/);
    expect(o[1].neden).toMatch(/kayıtlı değil/);
    expect(o[2].neden).toMatch(/yalnızca “Taşliman” içinde/);
    expect(liste().oncekiTanimVar).toBe(true); // oluşturma ile ilk yazım farklı
  });

  it('kural değişince önceki ve şimdiki sonuç yan yana; örnek kendiliğinden değişmez', () => {
    const { elin, ornek, liste, yaz } = kur();
    ornek({ kisi: elin, beklenen: 'uygulanmaz' });
    yaz({ kimlere: [] }); // istisna kaldırıldı: herkese
    const o = liste().ornekler[0];
    expect(o).toMatchObject({ sonuc: 'uygulanir', onceki: 'uygulanmaz', hukum: 'uyariyor' });
    expect(o.tanim.beklenen).toBe('uygulanmaz');
  });

  it('tarih ve geçerlilik aralığı; silinen kişi hesaplanamaz; doğrulama', () => {
    const { h, evren, daran, ornek, liste, yaz, kural } = kur();
    yaz({ baslangic: '400' });
    ornek({ kisi: daran, beklenen: 'uygulanmaz', tarih: '350' });
    ornek({ kisi: daran, beklenen: 'sinir' });
    const o = liste().ornekler;
    expect(o[0]).toMatchObject({ sonuc: 'uygulanmaz', hukum: 'geciyor' });
    expect(o[0].neden).toMatch(/geçerlilik aralığının dışında/);
    expect(o[1].neden).toMatch(/örnekte tarih yok/);
    expect(() => ornek({ tarih: 'saçma tarih' })).toThrow(/Tarih okunamadı/);
    expect(() => h.kuralOrnegiYaz({ evren, kural, tanim: { kisi: daran, yer: daran, tarih: '', beklenen: 'uygulanir', not: '' } })).toThrow(/mekân ya da şehir/);
    h.kayitSil({ evren, kod: daran });
    expect(liste().ornekler.map((x) => x.sonuc)).toEqual(['hesaplanamadi', 'hesaplanamadi']);
  });

  it('düzenleme, silme, kopyalama örneklerle birlikte; kopya kaynağa bağlı kalmaz', () => {
    const { h, evren, elin, sehir, lonca, ornek, liste, kural } = kur();
    const a = ornek({ kisi: elin, beklenen: 'uygulanir' });
    ornek({ beklenen: 'sinir' }, a);
    expect(liste().ornekler).toHaveLength(1);
    expect(liste().ornekler[0].tanim.kisi).not.toBe(elin);
    const b = ornek({ kisi: elin, beklenen: 'uygulanmaz' });
    h.kuralOrnegiSil({ evren, kod: a });
    expect(liste().ornekler.map((x) => x.kod)).toEqual([b]);

    const { kod: kopya } = h.hukukKuraliKopyala({ evren, kod: kural, sahip: lonca });
    const k = h.hukukKurallari({ evren }).find((x) => x.kod === kopya)!;
    expect(k).toMatchObject({ sahip: { kod: lonca }, tanim: { ad: 'Silah yasağı (kopya)' } });
    expect(h.kuralOrnekleri({ evren, kural: kopya }).ornekler).toHaveLength(1);
    h.kuralOrnegiSil({ evren, kod: h.kuralOrnekleri({ evren, kural: kopya }).ornekler[0].kod });
    expect(liste().ornekler).toHaveLength(1);
    expect(() => h.hukukKuraliKopyala({ evren, kod: kural, sahip: elin })).toThrow(/eklenmez/);
    expect(h.islemGunlugu({ evren, sinir: 5 }).some((i) => i.tur === 'kural_ornegi_sil')).toBe(true);
    void sehir;
  });

  it('iki cihazda aynı örneğin farklı yazımı çatışma olarak görünür ve çözülür', () => {
    const { h, evren, elin, ornek, liste } = kur();
    const a = ornek({ kisi: elin, beklenen: 'uygulanmaz' });
    const b = cihaz(); b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    ornek({ kisi: elin, beklenen: 'sinir' }, a);
    const t = liste().ornekler[0].tanim;
    b.kuralOrnegiYaz({ evren, kural: liste().kural, kod: a, tanim: { ...t, beklenen: 'uygulanir', not: 'Tabletten' } });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    const c = h.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === 'kural_ornegi');
    if (c?.tur !== 'alan') throw new Error('Örnek çatışması bekleniyordu.');
    expect(c.alanEtiketi).toBe('Kuralın örnek durumu');
    const ikinci = c.degerler.find((d) => d.yazi?.includes('Uygulanmalı'))!;
    h.alanCatismasiCoz({ evren, nesne: a, alan: 'kural_ornegi', islem: ikinci.islem });
    expect(h.catismalar({ evren })).toHaveLength(0);
    expect(liste().ornekler[0].tanim).toMatchObject({ beklenen: 'uygulanir', not: 'Tabletten' });
  });
});
