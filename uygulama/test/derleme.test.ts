import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const G1 = 'a'.repeat(64), G2 = 'b'.repeat(64), G3 = 'c'.repeat(64);

describe('gezinti ve görsel pano (§7)', () => {
  it('gezinti sıralı kayıtları ve notlarını tutar; silinip geri gelir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const a = h.kayitOlustur({ evren, ad: 'Ardıç', tur: 'sehir' }).kod;
    const b = h.kayitOlustur({ evren, ad: 'Liman çarşısı', tur: 'mekan' }).kod;
    const { kod } = h.derlemeOlustur({ evren, tur: 'gezinti', ad: 'Başkentte bir gün' });
    h.gezintiYaz({ evren, kod, adimlar: [{ kayit: a, not: 'Sabah' }, { kayit: b, not: 'Öğle' }] });
    const g = h.derleme({ evren, kod });
    expect(g.adimlar.map((x) => [x.kayit.ad, x.not])).toEqual([['Ardıç', 'Sabah'], ['Liman çarşısı', 'Öğle']]);
    expect(h.derlemeler({ evren, tur: 'gezinti' })).toMatchObject([{ ad: 'Başkentte bir gün', ogeSayisi: 2 }]);
    expect(h.kayitDerlemeleri({ evren, kod: b }).map((x) => x.ad)).toEqual(['Başkentte bir gün']);
    expect(() => h.gezintiYaz({ evren, kod, adimlar: [{ kayit: 'yok', not: '' }] })).toThrow();
    h.derlemeAdYaz({ evren, kod, ad: 'Ardıç turu' });
    h.derlemeSil({ evren, kod });
    expect(h.derlemeler({ evren, tur: 'gezinti' })).toEqual([]);
    h.derlemeSil({ evren, kod, geriYukle: true });
    expect(h.derleme({ evren, kod }).ad).toBe('Ardıç turu');
    expect(h.islemGunlugu({ evren, sinir: 10 }).length).toBeGreaterThan(0);
  });

  it('panoda bir kaydın tek güncel görseli olur; notlar görselin içinde kalır', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const k = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const { kod } = h.derlemeOlustur({ evren, tur: 'pano', ad: 'Kıyafetler' });
    h.panoYaz({ evren, kod, ogeler: [
      { kod: '', gorsel: G1, kayit: k, baslik: 'İlk eskiz', durum: 'guncel', notlar: [] },
      { kod: '', gorsel: G2, kayit: k, baslik: 'Yeni pelerin', durum: 'guncel', notlar: [{ x: 0.5, y: 0.25, metin: 'Yaka kürklü' }] },
      { kod: '', gorsel: G3, kayit: null, baslik: 'Kumaş', durum: null, notlar: [] },
    ] });
    const p = h.derleme({ evren, kod });
    expect(p.ogeler.map((o) => o.durum)).toEqual(['eski', 'guncel', null]);
    expect(p.ogeler[1].notlar).toEqual([{ x: 0.5, y: 0.25, metin: 'Yaka kürklü' }]);
    expect(p.ogeler[0].eksik).toBe(true);
    expect(() => h.panoYaz({ evren, kod, ogeler: [{ kod: '', gorsel: G1, kayit: null, baslik: '', durum: null, notlar: [{ x: 2, y: 0, metin: 'x' }] }] })).toThrow(/dışında/);
    expect(() => h.gezintiYaz({ evren, kod, adimlar: [] })).toThrow(/gezinti değil/);
  });

  it('iki cihazda farklı adlar okunur başlıkla sorulur', () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const { kod } = m.derlemeOlustur({ evren, tur: 'pano', ad: 'Armalar' });
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.derlemeAdYaz({ evren, kod, ad: 'Hanedan armaları' });
    tb.derlemeAdYaz({ evren, kod, ad: 'Sancaklar' });
    tb.islemleriAl({ evren, islemler: m.islemleriVer({ evren, gorulen: tb.gorulenler({ evren }) }) });
    const c = tb.catismalar({ evren });
    expect(c[0]).toMatchObject({ tur: 'alan', alan: 'ad', alanEtiketi: 'Adı' });
    const sec = c[0].tur === 'alan' ? c[0].degerler.find((x) => x.deger === 'Sancaklar')! : null;
    tb.alanCatismasiCoz({ evren, nesne: kod, alan: 'ad', islem: sec!.islem });
    expect(tb.catismalar({ evren })).toEqual([]);
    expect(tb.derleme({ evren, kod }).ad).toBe('Sancaklar');
  });
});
