import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { KullanimAlani } from '../src/veri/api';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dbler = new Map<string, Database>();
  return new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
}
const alan = (k: Partial<KullanimAlani>): KullanimAlani => ({ kod: '', ad: '', kayit: null, maliyet: '', erisim: '', karsiOnlem: '', yasak: '', ...k });

describe('neden her yerde kullanılmıyor masası (F12)', () => {
  it('alanları ve hücreleri işlemden okur; yazılmamış hücreler eksik değil "yazılmamış" listesindedir', () => {
    const h = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
    const buyu = h.kayitOlustur({ evren, ad: 'Uydurma doğruluk büyüsü', tur: 'buyu_uygulamasi' }).kod;
    const mahkeme = h.kayitOlustur({ evren, ad: 'Uydurma mahkeme', tur: 'topluluk' }).kod;
    const lonca = h.kayitOlustur({ evren, ad: 'Uydurma lonca', tur: 'topluluk' }).kod;
    h.iliskiEkle({ evren, tur: 'parca', a: lonca, b: buyu });
    h.iliskiEkle({ evren, tur: 'parca', a: mahkeme, b: buyu });
    expect(h.kullanimMasasi({ evren, kod: buyu }).adaylar.map((a) => a.ad)).toEqual(['Uydurma lonca', 'Uydurma mahkeme']);
    h.kullanimMasasiYaz({ evren, kod: buyu, tanim: { alanlar: [alan({ kayit: mahkeme, maliyet: '  bir gün  oruç ', yasak: 'Soylulara uygulanamaz' }), alan({ ad: 'Diplomasi', erisim: 'Yalnızca elçiler' })] } });
    const m = h.kullanimMasasi({ evren, kod: buyu });
    expect(m.alanlar.map((a) => [a.ad || a.kayitKaydi?.ad, a.maliyet, a.yazilmamis])).toEqual([
      ['Uydurma mahkeme', 'bir gün oruç', ['erisim', 'karsiOnlem']], ['Diplomasi', '', ['maliyet', 'karsiOnlem', 'yasak']]]);
    expect(m.adaylar.map((a) => a.ad)).toEqual(['Uydurma lonca']);
    expect(m.not).toContain('hüküm vermez');
    const son = h.islemGunlugu({ evren, sinir: 1 })[0];
    expect(islemAciklamasi(son.tur, son.veri, () => 'Uydurma doğruluk büyüsü')).toBe('Uydurma doğruluk büyüsü: kullanım masası değişti');
    // Aynı tanım yeniden yazılınca yeni işlem olmaz.
    const n = h.islemGunlugu({ evren, sinir: 100 }).length;
    h.kullanimMasasiYaz({ evren, kod: buyu, tanim: { alanlar: m.alanlar } });
    expect(h.islemGunlugu({ evren, sinir: 100 }).length).toBe(n);
  });

  it('geçersiz girdileri reddeder ve iki cihazdaki farklı yazımı çatışma olarak gösterir', () => {
    const h = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
    const tek = h.kayitOlustur({ evren, ad: 'Uydurma ışık taşı', tur: 'teknoloji' }).kod;
    const kisi = h.kayitOlustur({ evren, ad: 'Uydurma kişi', tur: 'karakter' }).kod;
    expect(() => h.kullanimMasasiYaz({ evren, kod: kisi, tanim: { alanlar: [] } })).toThrow('büyü, teknoloji');
    expect(() => h.kullanimMasasiYaz({ evren, kod: tek, tanim: { alanlar: [alan({})] } })).toThrow('adını yazın');
    expect(() => h.kullanimMasasiYaz({ evren, kod: tek, tanim: { alanlar: [alan({ kayit: kisi }), alan({ kayit: kisi })] } })).toThrow('iki kez');
    expect(() => h.kullanimMasasiYaz({ evren, kod: tek, tanim: { alanlar: [alan({ ad: 'Ticaret', yasak: 'x'.repeat(301) })] } })).toThrow('300 harf');

    h.kullanimMasasiYaz({ evren, kod: tek, tanim: { alanlar: [alan({ ad: 'Ticaret' })] } });
    const b = cihaz(); b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    const a0 = h.kullanimMasasi({ evren, kod: tek }).alanlar[0];
    h.kullanimMasasiYaz({ evren, kod: tek, tanim: { alanlar: [{ ...a0, maliyet: 'Birinci' }] } });
    b.kullanimMasasiYaz({ evren, kod: tek, tanim: { alanlar: [{ ...a0, maliyet: 'İkinci' }] } });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    const c = h.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === 'kullanim_masasi');
    if (c?.tur !== 'alan') throw new Error('Çatışma bekleniyordu.');
    h.alanCatismasiCoz({ evren, nesne: tek, alan: 'kullanim_masasi', islem: c.degerler[0].islem });
    expect(h.catismalar({ evren })).toHaveLength(0);
  });
});
