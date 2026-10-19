import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

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
  const k = (ad: string, tur = 'olay') => h.kayitOlustur({ evren, ad, tur }).kod;
  const olum = k('Kralın ölümü'), tac = k('Taç giyme'), mira = k('Mira', 'karakter'), isyan = k('Liman isyanı'), kale = k('Kara Kale', 'mekan');
  h.kayitTarih({ evren, kod: olum, ifade: '430' });
  h.kayitTarih({ evren, kod: tac, kisitlar: [{ olay: olum, fark: '1 yıl sonra' }] });
  h.kayitAlanYaz({ evren, kod: mira, alan: 'dogum', deger: '412' });
  h.iliskiEkle({ evren, tur: 'olayda', a: mira, b: tac });
  h.kayitTarih({ evren, kod: isyan, ifade: '433' });
  h.iliskiEkle({ evren, tur: 'neden', a: olum, b: isyan });
  h.durumEkle({ evren, kod: kale, durum: { ozellik: 'Yas bayrağı', deger: 'Asılı', kip: 'sonraki', baslangic: { olay: olum } } });
  return { h, evren, olum, tac, mira, isyan, kale };
}

describe('değişiklik masası (F04)', () => {
  it('önizleme yazmaz; hesapla değişenleri, çelişenleri ve yaşları ayırır', () => {
    const { h, evren, olum } = kur();
    const oncekiIslem = h.islemGunlugu({ evren, sinir: 1 })[0].kod;
    const m = h.degisiklikMasasi({ evren, kod: olum, ifade: '434', koru: [] });
    expect(h.islemGunlugu({ evren, sinir: 1 })[0].kod).toBe(oncekiIslem);
    expect(m.once).toBe('Yıl 430');
    expect(m.sonra).toBe('Yıl 434');
    const satir = (ad: string) => m.hesap.filter((x) => x.ad === ad).map((x) => [x.once, x.sonra, x.korunabilir]);
    expect(satir('Taç giyme')).toEqual([['Yıl 431', 'Yıl 435', true]]);
    expect(satir('Kara Kale')).toEqual([['Yıl 430', 'Yıl 434', true]]);
    expect(m.hesap.find((x) => x.ad === 'Mira')!.anahtar).toBeNull();
    expect(m.celisen.map((x) => [x.ad, x.aciklama])).toEqual([['Liman isyanı', '“Kralın ölümü”, “Liman isyanı” kaydının nedeni olarak bağlı ama artık ondan sonraya düşüyor.']]);
    expect(m.incelenecek.map((x) => x.ad)).toEqual(['Liman isyanı']);
  });

  it('kızının taç giyme yaşı değişmesin: taç giyme korunur, yaş satırı düşer, kuralın bozulduğu söylenir', () => {
    const { h, evren, olum, tac, kale } = kur();
    const m = h.degisiklikMasasi({ evren, kod: olum, ifade: '428', koru: [`tarih:${tac}`] });
    expect(m.hesap.find((x) => x.ad === 'Taç giyme')!.sonra).toBe('Yıl 431 (korunuyor)');
    expect(m.hesap.some((x) => x.ad === 'Mira')).toBe(false);
    expect(m.celisen.find((x) => x.ad === 'Taç giyme')!.aciklama).toContain('kuralı artık tutmaz');
    h.degisiklikUygula({ evren, kod: olum, ifade: '428', koru: [`tarih:${tac}`] });
    expect(h.kayit({ evren, kod: olum }).tarih!.ifade).toBe('428');
    const t = h.kayit({ evren, kod: tac }).tarih!;
    expect([t.bicim, t.ifade]).toEqual(['kesin', 'Yıl 431']);
    // Korunmayan durum sınırı olayla birlikte kaydı; hepsi tek işlem grubu.
    expect(h.durumlar({ evren, kod: kale }).durumlar[0].baslangic!.tarih!.ifade).toBe('428');
    const son = h.islemGunlugu({ evren, sinir: 2 });
    expect(son[0].grup).not.toBeNull();
    expect(son[0].grup).toBe(son[1].grup);
  });

  it('durum sınırı korunabilir; yazıyla ifade edilemeyen yer korunamaz', () => {
    const { h, evren, olum, kale } = kur();
    const d = h.durumlar({ evren, kod: kale }).durumlar[0];
    h.degisiklikUygula({ evren, kod: olum, ifade: '440', koru: [`durum:${d.kod}:baslangic`] });
    const s = h.durumlar({ evren, kod: kale }).durumlar[0].baslangic!;
    expect([s.olay, s.tarih!.ifade]).toEqual([null, 'Yıl 430']);
    expect(() => h.degisiklikMasasi({ evren, kod: olum, ifade: 'bir gün', koru: [] })).toThrow('eksene yerleşmiyor');
    expect(() => h.degisiklikMasasi({ evren, kod: olum, ifade: '', koru: [] })).toThrow('Yeni tarihi');
  });

  it('doğumdan önceye düşen olay çelişen olarak gösterilir', () => {
    const { h, evren, olum } = kur();
    const m = h.degisiklikMasasi({ evren, kod: olum, ifade: '405', koru: [] });
    expect(m.celisen.map((x) => x.aciklama)).toContain('“Taç giyme” bu kişinin doğumundan önceye düşüyor.');
  });
});
