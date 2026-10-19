import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { duzMetindenSpans } from '../src/alan/metin-sema';
import { sozlukEslesir } from '../src/calisan/sozluk';
import type { SozlukTanimi, Spans } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dbler = new Map<string, Database>();
  return new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
}
const tanim = (k: Partial<SozlukTanimi> = {}): SozlukTanimi => ({ ad: 'Uydurma sözler', tur: 'yasak', kapsam: { tur: 'evren' }, girdiler: [{ ifade: 'ışın taşı', aciklama: 'Uydurma açıklama', teknoloji: null }], ...k });
function kur() {
  const h = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const kayit = (ad: string, tur = 'sahne') => h.kayitOlustur({ evren, ad, tur }).kod;
  const yaz = (kod: string, metin: string) => h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: duzMetindenSpans(metin) as Spans, temel: h.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar });
  const sozluk = (t = tanim()) => h.sozlukYaz({ evren, tanim: t }).kod;
  const denetle = () => h.sozlukDenetle({ evren });
  return { h, evren, kayit, yaz, sozluk, denetle };
}

describe('sözlük denetimi (F20)', () => {
  it('sözcük ve öbek sınırlarını korur; yalnızca mevcut Türkçe kuralları kullanır', () => {
    expect(sozlukEslesir('taşlık', 'taş')).toBe(false);
    expect(sozlukEslesir('önışın taşıson', 'ışın taşı')).toBe(false);
    expect(sozlukEslesir('IŞIN TAŞI!', 'ışın taşı')).toBe(true);
    expect(sozlukEslesir('İNCİ, inci.', 'inci')).toBe(true);
    expect(sozlukEslesir('Ilık', 'ılık')).toBe(true);
    expect(sozlukEslesir('taşları', 'taş')).toBe(false);
    expect(sozlukEslesir("Taş'ın", 'taş')).toBe(true);
    expect(sozlukEslesir('ışın\n\ntaşı', 'ışın taşı')).toBe(true);
    expect(sozlukEslesir('ışın mavi taşı', 'ışın taşı')).toBe(false);
  });

  it('işlemden geri okunur, başka cihazda yeniden kurulur, silinir ve geri getirilir', () => {
    const { h, evren, sozluk } = kur(), kod = sozluk();
    expect(h.sozlukler({ evren })[0]).toMatchObject({ kod, ...tanim(), silindi: false, catismali: false });
    const diger = cihaz();
    diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(diger.sozlukler({ evren })).toEqual(h.sozlukler({ evren }));
    h.sozlukSil({ evren, kod });
    expect(h.sozlukler({ evren })).toEqual([]);
    h.sozlukYaz({ evren, kod, tanim: tanim({ ad: 'Değişen sözlük' }) });
    expect(h.sozlukler({ evren })).toEqual([]);
    expect(h.sozlukler({ evren, cop: true })[0].ad).toBe('Değişen sözlük');
    h.sozlukGeriYukle({ evren, kod });
    expect(h.sozlukler({ evren })[0].ad).toBe('Değişen sözlük');
    expect(h.islemGunlugu({ evren, sinir: 100 }).filter((i) => i.tur.startsWith('sozluk_')).map((i) => i.tur)).toContain('sozluk_geri_yukle');
  });

  it('seçilen türler ve eser dışındaki metinleri taramaz; paragraflar birleştirilmez', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur();
    const eser = kayit('Uydurma kitap', 'eser'), baska = kayit('Öteki kitap', 'eser');
    const sahne = h.anlatiOlustur({ evren, ust: eser, ad: 'Kıyı', tur: 'sahne' }).kod;
    const dis = h.anlatiOlustur({ evren, ust: baska, ad: 'Uzak kıyı', tur: 'sahne' }).kod;
    const kisi = kayit('Lurin', 'karakter');
    [sahne, dis, kisi].forEach((k) => yaz(k, 'IŞIN TAŞI')); sozluk(tanim({ kapsam: { tur: 'eser', kayit: eser } }));
    expect(denetle().sonuclar.map((s) => s.kayit.kod)).toEqual([sahne]);
    expect(denetle().denetlenen).toBe(2); // Eser ve ona yerleştirilmiş sahne.
    const kod = h.sozlukler({ evren })[0].kod;
    h.sozlukYaz({ evren, kod, tanim: tanim({ kapsam: { tur: 'turler', turler: ['karakter'] } }) });
    expect(denetle().sonuclar.map((s) => s.kayit.kod)).toEqual([kisi]);
    yaz(kisi, 'ışın\ntaşı');
    expect(denetle().sonuclar).toEqual([]);
  });

  it('dönem aralığı dışındaki ve tarihi bilinmeyen kayıtlar taranmaz', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur();
    const donem = kayit('Uydurma çağ', 'donem'), ic = kayit('İç sahne'), dis = kayit('Dış sahne'), bos = kayit('Tarihsiz sahne');
    h.kayitTarih({ evren, kod: donem, ifade: '1200–1250' });
    h.kayitTarih({ evren, kod: ic, ifade: '1220' }); h.kayitTarih({ evren, kod: dis, ifade: '1300' });
    [ic, dis, bos].forEach((k) => yaz(k, 'ışın taşı')); sozluk(tanim({ kapsam: { tur: 'donem', kayit: donem } }));
    expect(denetle().sonuclar.map((s) => s.kayit.kod)).toEqual([ic]);
    expect(denetle().eksikler.join(' ')).toMatch(/tarihi/);
  });

  it('bölgesel yayılmadan önce eşleşir; icat, gündelik kullanım ve başka bölgeyi karıştırmaz', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur();
    const ulke = kayit('Uydurma bölge', 'siyasi'), yer = kayit('Uydurma liman', 'sehir'), uzak = kayit('Uydurma ada', 'mekan');
    h.iliskiEkle({ evren, tur: 'parca', a: yer, b: ulke });
    const teknoloji = kayit('Işın taşı', 'teknoloji');
    h.teknolojiYaz({ evren, kod: teknoloji, tanim: { duzeyler: [], asamalar: [
      { asama: 'kesif', yer: null, tarih: '1000', not: '' },
      { asama: 'yayilma', yer: uzak, tarih: '1100', not: '' },
      { asama: 'yayilma', yer: ulke, tarih: '1200', not: '' },
      { asama: 'gundelik', yer, tarih: '1300', not: '' },
    ] } });
    const once = kayit('Önceki sahne'), sonra = kayit('Sonraki sahne'), belirsiz = kayit('Tarihsiz sahne');
    for (const kod of [once, sonra, belirsiz]) { yaz(kod, 'ışın taşı'); h.sahneAlaniAyarla({ evren, sahne: kod, alan: 'sahne_yeri', kayit: yer }); }
    h.kayitTarih({ evren, kod: once, ifade: '1150' }); h.kayitTarih({ evren, kod: sonra, ifade: '1250' });
    sozluk(tanim({ tur: 'teknoloji', girdiler: [{ ifade: 'ışın taşı', aciklama: '', teknoloji }] }));
    expect(denetle().sonuclar.map((s) => s.kayit.kod)).toEqual([once]);
    expect(denetle().sonuclar[0].dayanak).toMatch(/1200/);
    expect(denetle().eksikler.join(' ')).toMatch(/Tarihsiz sahne/);
  });

  it('yalnızca kabul edilen kullanımı gizler, değişen paragrafı yeniden gösterir', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur(); const k = kayit('Uydurma sahne');
    yaz(k, 'ışın taşı\nışın taşı'); const kod = sozluk();
    const s = denetle().sonuclar[0];
    h.sozlukIsareti({ evren, sozluk: kod, anahtar: s.anahtar, bilerek: true });
    expect(denetle().sonuclar).toHaveLength(1);
    const diger = cihaz(); diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(diger.sozlukDenetle({ evren }).sonuclar).toHaveLength(1);
    yaz(k, 'ışın taşı parladı\nışın taşı'); expect(denetle().sonuclar).toHaveLength(2);
    h.sozlukIsareti({ evren, sozluk: kod, anahtar: s.anahtar, bilerek: false });
  });

  it('500 sonuçla sınırlar; tam 500 sonuç için daha fazlası var demez', () => {
    const { kayit, yaz, sozluk, denetle } = kur(); const k = kayit('Uydurma uzun sahne'); sozluk();
    yaz(k, Array(500).fill('ışın taşı').join('\n')); expect(denetle()).toMatchObject({ dahaFazlasi: false }); expect(denetle().sonuclar).toHaveLength(500);
    yaz(k, Array(501).fill('ışın taşı').join('\n')); expect(denetle()).toMatchObject({ dahaFazlasi: true }); expect(denetle().sonuclar).toHaveLength(500);
  });

  it('silinmiş ve vazgeçilmiş kayıtlara hüküm üretmez; izinli hitapların yalnızca yazılmış biçimleri aranır', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur(); const k = kayit('Uydurma kişi', 'karakter');
    yaz(k, 'ışın taşı ve başka bir hitap'); sozluk(tanim({ tur: 'hitap' }));
    expect(denetle().sonuclar[0].ileti).toBe('‘ışın taşı’ sözcüğü ‘Uydurma sözler’ sözlüğündeki kuralla eşleşti');
    h.kayitDegistir({ evren, kod: k, alan: 'karar', deger: 'vazgecildi' }); expect(denetle().sonuclar).toEqual([]);
    h.kayitDegistir({ evren, kod: k, alan: 'karar', deger: 'fikir' }); h.kayitSil({ evren, kod: k }); expect(denetle().sonuclar).toEqual([]);
  });

  it('iki cihazdaki sözlük çatışması seçilmeden denetlenmez; seçim işlemle eşitlenir', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur(); const k = kayit('Uydurma sahne'); yaz(k, 'ışın taşı'); const kod = sozluk();
    const b = cihaz(); b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.sozlukYaz({ evren, kod, tanim: tanim({ ad: 'Birinci sözlük' }) }); b.sozlukYaz({ evren, kod, tanim: tanim({ ad: 'İkinci sözlük' }) });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(denetle().sonuclar).toHaveLength(0);
    const c = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === 'sozluk_tanim');
    expect(c?.tur).toBe('alan');
    if (c?.tur !== 'alan') throw new Error('Sözlük çatışması bekleniyordu.');
    h.alanCatismasiCoz({ evren, nesne: kod, alan: 'sozluk_tanim', islem: c.degerler[0].islem });
    expect(h.catismalar({ evren })).toHaveLength(0); expect(denetle().sonuclar).toHaveLength(1);
  });

  it('yayılma tarihi yokken icat ve gündelik kullanım tarihinden ulaşma tarihi üretmez', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur(); const s = kayit('Uydurma sahne'), yer = kayit('Uydurma köy', 'mekan'), tek = kayit('Işın taşı', 'teknoloji');
    yaz(s, 'ışın taşı'); h.kayitTarih({ evren, kod: s, ifade: '1100' });
    h.sahneAlaniAyarla({ evren, sahne: s, alan: 'sahne_yeri', kayit: yer });
    h.teknolojiYaz({ evren, kod: tek, tanim: { duzeyler: [], asamalar: [
      { asama: 'kesif', yer: null, tarih: '1200', not: '' }, { asama: 'gundelik', yer, tarih: '1300', not: '' },
    ] } });
    sozluk(tanim({ tur: 'teknoloji', girdiler: [{ ifade: 'ışın taşı', aciklama: '', teknoloji: tek }] }));
    expect(denetle().sonuclar).toEqual([]); expect(denetle().eksikler.join(' ')).toMatch(/yayılma tarihi gerekli/);
  });

  it('sözlük tanımı değişince kabul yeniden değerlendirilir; boş ve yinelenen girdiler reddedilir', () => {
    const { h, evren, kayit, yaz, sozluk, denetle } = kur(); const s = kayit('Uydurma sahne'); yaz(s, 'ışın taşı'); const kod = sozluk();
    const r = denetle().sonuclar[0]; h.sozlukIsareti({ evren, sozluk: kod, anahtar: r.anahtar, bilerek: true });
    expect(denetle().sonuclar).toEqual([]); h.sozlukYaz({ evren, kod, tanim: tanim({ tur: 'hitap' }) }); expect(denetle().sonuclar).toHaveLength(1);
    expect(() => sozluk(tanim({ girdiler: [] }))).toThrow(/girdi/);
    expect(() => sozluk(tanim({ girdiler: [tanim().girdiler[0], tanim().girdiler[0]] }))).toThrow(/bir kez/);
  });
});
