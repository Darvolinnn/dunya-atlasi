import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}
function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
  const kale = h.kayitOlustur({ evren, ad: 'Kara Kale', tur: 'mekan' }).kod;
  const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
  const { kod } = h.durumEkle({ evren, kod: kale, durum: { ozellik: 'Sahibi', deger: 'Aren hanedanı', kip: 'sonraki', baslangic: { ifade: '400' } } });
  return { h, evren, kale, elin, kod };
}

describe('değişiklik niyeti (F24)', () => {
  it('eski kaydı düzelt: aynı kayıt değişir', () => {
    const { h, evren, kale, kod } = kur();
    h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'eski_duzelt' });
    const l = h.durumlar({ evren, kod: kale }).durumlar;
    expect(l.map((d) => d.deger)).toEqual(['Doran hanedanı']);
  });

  it('bu tarihten itibaren: eski değer kalır, yeni değer o tarihte başlar; tek işlem grubu', () => {
    const { h, evren, kale, kod } = kur();
    expect(() => h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'bu_tarihten', tarih: { ifade: '390' } })).toThrow('başlangıcından');
    expect(() => h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'bu_tarihten' })).toThrow('hangi tarihten');
    h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'bu_tarihten', tarih: { ifade: '430' } });
    const l = h.durumlar({ evren, kod: kale }).durumlar;
    expect(l.map((d) => [d.deger, d.baslangic?.tarih?.ifade, d.sonraki?.tarih?.ifade ?? null])).toEqual([['Aren hanedanı', '400', '430'], ['Doran hanedanı', '430', null]]);
    const son = h.islemGunlugu({ evren, sinir: 1 })[0];
    expect(son.tur).toBe('durum_ekle');
    expect(islemAciklamasi(son.tur, son.veri, () => 'Kara Kale')).toBe('Kara Kale: “Sahibi” yeni tarihten itibaren “Doran hanedanı” oldu');
  });

  it('aralıklı değerde eski kaydın bitişi yeni tarihe çekilir', () => {
    const { h, evren, kale } = kur();
    const { kod } = h.durumEkle({ evren, kod: kale, durum: { ozellik: 'Komutan', deger: 'Talo', kip: 'aralik', baslangic: { ifade: '400' }, bitis: { ifade: '450' } } });
    expect(() => h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Mera', niyet: 'bu_tarihten', tarih: { ifade: '460' } })).toThrow('bitişinden');
    h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Mera', niyet: 'bu_tarihten', tarih: { ifade: '420' } });
    const l = h.durumlar({ evren, kod: kale }).durumlar.filter((d) => d.ozellik === 'Komutan');
    expect(l.map((d) => [d.deger, d.baslangic?.tarih?.ifade, d.bitis?.tarih?.ifade])).toEqual([['Talo', '400', '420'], ['Mera', '420', '450']]);
  });

  it('yalnızca bir kişinin inancı: gerçek değişmez, kişi yeni değere inanır; soru yeniden kullanılır', () => {
    const { h, evren, kale, elin, kod } = kur();
    const darel = h.kayitOlustur({ evren, ad: 'Darel', tur: 'karakter' }).kod;
    expect(() => h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'inanc' })).toThrow('kişiyi');
    h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'inanc', bilen: elin });
    h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'inanc', bilen: darel, tarih: { ifade: '410' } });
    expect(h.durumlar({ evren, kod: kale }).durumlar.map((d) => d.deger)).toEqual(['Aren hanedanı']);
    const [s] = h.kayitIddialari({ evren, kod: kale });
    expect(s.soru).toBe('Sahibi · 400 tarihinden itibaren');
    expect(s.secenekler.map((x) => x.metin)).toEqual(['Aren hanedanı', 'Doran hanedanı']);
    expect(s.gercek).toBe(s.secenekler[0].kod);
    expect(s.bilgiler.map((b) => [b.bilen.ad, b.etiket.kod])).toEqual([['Darel', 'yanlis'], ['Elin', 'yanlis']]);
    expect(h.kayitIddialari({ evren, kod: kale })).toHaveLength(1);
  });

  it('taslakta dene: ana evren değişmez, değişiklik yeni taslakta yapılır', () => {
    const { h, evren, kale, kod } = kur();
    const { evren: dal } = h.durumNiyeti({ evren, kod, alan: 'deger', deger: 'Doran hanedanı', niyet: 'taslakta' });
    expect(dal).not.toBe(evren);
    expect(h.durumlar({ evren, kod: kale }).durumlar.map((d) => d.deger)).toEqual(['Aren hanedanı']);
    expect(h.durumlar({ evren: dal, kod: kale }).durumlar.map((d) => d.deger)).toEqual(['Doran hanedanı']);
    expect(h.dallar({ evren }).map((d) => d.ad)).toEqual(['Deneme: Kara Kale · Sahibi']);
    expect(() => h.durumNiyeti({ evren: dal, kod, alan: 'deger', deger: 'X', niyet: 'taslakta' })).toThrow('Zaten bir deneme kopyasında');
  });
});
