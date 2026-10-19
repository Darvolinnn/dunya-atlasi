import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { AnlatimTanimi } from '../src/veri/api';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dbler = new Map<string, Database>();
  return new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
}
function kur() {
  const h = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const kayit = (ad: string, tur = 'karakter') => h.kayitOlustur({ evren, ad, tur }).kod;
  const kule = kayit('Uydurma kule', 'mekan');
  const { kod: iddia } = h.iddiaEkle({ evren, konu: kule, soru: 'Kuleyi kim yıktı?', secenekler: ['Deprem', 'Kuşatma'], gercek: 0 });
  const [deprem, kusatma] = h.kayitIddialari({ evren, kod: kule })[0].secenekler.map((s) => s.kod);
  const t = (k: Partial<AnlatimTanimi> = {}): AnlatimTanimi => ({ iddia, kaynak: null, tur: 'tanik', destek: null, itiraz: [], dayanak: null, dayanakTuru: null, ozet: '', karar: 'kesin', ...k });
  const yaz = (k: Partial<AnlatimTanimi>, kod?: string) => h.anlatimYaz({ evren, kod, tanim: t(k) }).kod;
  const dosya = () => h.iddiaDosyasi({ evren, iddia });
  return { h, evren, kayit, iddia, deprem, kusatma, yaz, dosya };
}

describe('iddia dosyası (F28)', () => {
  it('kopya ve tercüme bağımsız kaynak sayılmaz; destek ve itiraz cevap başına toplanır', () => {
    const { kayit, deprem, kusatma, yaz, dosya } = kur();
    const kronik = yaz({ tur: 'resmi', kaynak: kayit('Uydurma kâtip'), destek: kusatma, ozet: 'Uydurma kronik' });
    const kopya = yaz({ tur: 'belge', destek: kusatma, dayanak: kronik, dayanakTuru: 'kopya' });
    yaz({ tur: 'belge', destek: kusatma, dayanak: kopya, dayanakTuru: 'tercume' });
    yaz({ tur: 'aile', destek: deprem, itiraz: [kusatma] });
    const d = dosya();
    expect(d.anlatimlar).toHaveLength(4);
    expect(d.anlatimlar.filter((a) => a.kok === kronik)).toHaveLength(3);
    const [dep, kus] = d.cevaplar;
    expect([dep.durum, dep.destek.length, dep.bagimsizDestek, dep.gercek]).toEqual(['destek var', 1, 1, true]);
    expect([kus.durum, kus.destek.length, kus.bagimsizDestek, kus.bagimsizItiraz]).toEqual(['ikisi de', 3, 1, 1]);
    expect(d.not).toContain('tek bağımsız kaynak');
  });

  it('vazgeçilmiş anlatımlar sayılmaz; hiçbir anlatım değinmeyen cevap dayanaksızdır', () => {
    const { deprem, yaz, dosya } = kur();
    yaz({ destek: deprem, karar: 'vazgecildi' });
    expect(dosya().cevaplar.map((c) => c.durum)).toEqual(['dayanak yok', 'dayanak yok']);
  });

  it('geçersiz anlatımları reddeder: aynı cevaba hem destek hem itiraz, boş tutum, döngü', () => {
    const { deprem, kusatma, yaz } = kur();
    expect(() => yaz({ destek: deprem, itiraz: [deprem] })).toThrow('hem destekleyip');
    expect(() => yaz({})).toThrow('hangi cevabı');
    expect(() => yaz({ destek: 'yok' })).toThrow('soruda yok');
    const a = yaz({ destek: deprem });
    const b = yaz({ destek: deprem, dayanak: a, dayanakTuru: 'aktarma' });
    expect(() => yaz({ destek: deprem, dayanak: b, dayanakTuru: 'kopya' }, a)).toThrow('döngü');
    expect(() => yaz({ destek: kusatma, dayanak: a, dayanakTuru: null })).toThrow('Kopya, tercüme');
  });

  it('başka anlatımın dayandığı anlatım kaldırılamaz; kaldırılan geri getirilir', () => {
    const { h, evren, deprem, yaz, dosya } = kur();
    const a = yaz({ destek: deprem }), b = yaz({ destek: deprem, dayanak: a, dayanakTuru: 'kopya' });
    expect(() => h.anlatimSil({ evren, kod: a })).toThrow('dayanan başka');
    h.anlatimSil({ evren, kod: b });
    expect(dosya().kaldirilan.map((x) => x.kod)).toEqual([b]);
    h.anlatimSil({ evren, kod: a });
    expect(dosya().anlatimlar).toHaveLength(0);
    h.anlatimGeriYukle({ evren, kod: a });
    expect(dosya().anlatimlar.map((x) => x.kod)).toEqual([a]);
    const son = h.islemGunlugu({ evren, sinir: 1 })[0];
    expect(islemAciklamasi(son.tur, son.veri, () => '')).toBe('“Kuleyi kim yıktı?” sorusunun dosyasına bir anlatım geri getirildi');
  });

  it('iki cihazdaki farklı yazım çatışma olarak görünür ve seçimle çözülür', () => {
    const { h, evren, deprem, kusatma, yaz, dosya } = kur();
    const a = yaz({ destek: deprem });
    const b = cihaz(); b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    yaz({ destek: deprem, ozet: 'Birinci' }, a);
    b.anlatimYaz({ evren, kod: a, tanim: { ...dosya().anlatimlar[0], destek: kusatma, ozet: 'İkinci' } });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(dosya().anlatimlar[0].catismali).toBe(true);
    const c = h.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === 'anlatim');
    if (c?.tur !== 'alan') throw new Error('Anlatım çatışması bekleniyordu.');
    const ikinci = c.degerler.find((d) => d.yazi?.includes('İkinci'))!;
    h.alanCatismasiCoz({ evren, nesne: a, alan: 'anlatim', islem: ikinci.islem });
    expect(h.catismalar({ evren })).toHaveLength(0);
    expect(dosya().anlatimlar[0]).toMatchObject({ ozet: 'İkinci', destek: kusatma, catismali: false });
  });
});
