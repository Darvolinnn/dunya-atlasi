import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { AnlatimTanimi, DelilTanimi } from '../src/veri/api';

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
  const anlat = (k: Partial<AnlatimTanimi>) => h.anlatimYaz({ evren, tanim: { iddia, kaynak: null, tur: 'belge', destek: null, itiraz: [], dayanak: null, dayanakTuru: null, ozet: '', karar: 'kesin', ...k } }).kod;
  const delil = (kod: string, t: Partial<DelilTanimi>) => h.delilYaz({ evren, kod, tanim: { gercekYazar: null, aile: null, elde: [], ...t } });
  return { h, evren, kayit, iddia, deprem, kusatma, anlat, delil };
}

describe('delil geçmişi (F08)', () => {
  it('görünen ve gerçek yazarı ayırır; elden ele geçişi tarihe göre sıralar', () => {
    const { h, evren, kayit, delil } = kur();
    const mektup = kayit('Uydurma mektup', 'belge'), lord = kayit('Uydurma lord'), katip = kayit('Uydurma kâtip'), hirsiz = kayit('Uydurma hırsız');
    h.belgeSunumuYaz({ evren, kod: mektup, sunum: { bicim: 'mektup', yazan: lord, alici: null, yer: null, muhur: null, muhurYazisi: '', imzalayanlar: [] } });
    expect(h.delilGecmisi({ evren, kod: mektup }).yazarDurumu).toBe('gerçek yazılmamış');
    delil(mektup, { gercekYazar: katip, elde: [{ kisi: hirsiz, tarih: '432', nasil: 'çalındı' }, { kisi: lord, tarih: '430', nasil: '' }, { kisi: katip, tarih: '', nasil: 'yazıldı' }] });
    const d = h.delilGecmisi({ evren, kod: mektup });
    expect([d.yazarDurumu, d.gorunenYazar?.ad, d.gercekYazar?.ad]).toEqual(['farklı', 'Uydurma lord', 'Uydurma kâtip']);
    expect(d.elde.map((x) => x.kisi.ad)).toEqual(['Uydurma lord', 'Uydurma hırsız', 'Uydurma kâtip']);
    expect(() => delil(mektup, { elde: [{ kisi: lord, tarih: 'dün değil', nasil: '' }] })).toThrow('Tarih okunamadı');
    expect(() => delil(lord, {})).toThrow('belge bulunamadı');
  });

  it('kopya, tercüme ve sansürlü sürüm aynı ailededir; döngü kurulamaz', () => {
    const { h, evren, kayit, delil } = kur();
    const asil = kayit('Uydurma asıl', 'belge'), kopya = kayit('Uydurma kopya', 'belge'), tercume = kayit('Uydurma tercüme', 'belge');
    delil(kopya, { aile: { ana: asil, tur: 'kopya' } });
    delil(tercume, { aile: { ana: kopya, tur: 'tercume' } });
    const d = h.delilGecmisi({ evren, kod: tercume });
    expect(d.aile.kok.kod).toBe(asil);
    expect(d.aile.uyeler.map((u) => [u.kayit.ad, u.tur, u.bu])).toEqual([['Uydurma asıl', null, false], ['Uydurma kopya', 'kopya', false], ['Uydurma tercüme', 'tercume', true]]);
    expect(() => delil(asil, { aile: { ana: tercume, tur: 'sansurlu' } })).toThrow('döngü');
  });

  it('aynı belgeden ya da ailesinden gelen anlatımlar iddia dosyasında tek kaynak sayılır (D13)', () => {
    const { h, evren, kayit, iddia, kusatma, deprem, anlat, delil } = kur();
    const ilan = kayit('Uydurma ilan', 'belge'), suret = kayit('Uydurma suret', 'belge');
    delil(suret, { aile: { ana: ilan, tur: 'kopya' } });
    for (let i = 0; i < 4; i++) anlat({ kaynak: ilan, destek: kusatma });
    anlat({ kaynak: suret, destek: kusatma });
    anlat({ kaynak: kayit('Uydurma tanık'), tur: 'tanik', destek: deprem });
    const c = h.iddiaDosyasi({ evren, iddia }).cevaplar;
    expect([c[1].destek.length, c[1].bagimsizDestek]).toEqual([5, 1]);
    expect(c[0].bagimsizDestek).toBe(1);
    const d = h.delilGecmisi({ evren, kod: ilan });
    expect(d.deliller).toHaveLength(5);
    expect(d.deliller.filter((x) => x.belge.kod === suret)).toHaveLength(1);
    expect(d.notlar.join(' ')).toContain('tek bağımsız kaynak');
  });

  it('belgeyi okuyanlar bilgi kaynağından gelir', () => {
    const { h, evren, kayit, iddia, kusatma, delil } = kur();
    const ilan = kayit('Uydurma ilan', 'belge'), okur = kayit('Uydurma okur');
    delil(ilan, {});
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: okur, inanc: 'inaniyor', secenek: kusatma, kaynak: 'belge', kaynakKayit: ilan } });
    expect(h.delilGecmisi({ evren, kod: ilan }).okuyanlar.map((o) => o.kisi.ad)).toEqual(['Uydurma okur']);
  });
});
