import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { Takvim } from '../src/alan/tarih';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }, { ad: 'Sis', gun: 30 }, { ad: 'Kara Ay', gun: 30 }] };

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
function kur() {
  const h = cihaz('Deneme');
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  h.takvimYaz({ evren, takvim: ANA });
  const kayit = (ad: string, tur: string, tarih?: string) => {
    const kod = h.kayitOlustur({ evren, ad, tur }).kod;
    if (tarih) h.kayitTarih({ evren, kod, ifade: tarih });
    return kod;
  };
  return { h, evren, kayit };
}

describe('çalışma masaları (§5.9)', () => {
  it('kayıtlar kopyalanmaz, bağlanır; aralıktaki olaylar ve sıra korunur', () => {
    const { h, evren, kayit } = kur();
    const sehir = kayit('Velkar', 'sehir');
    const elin = kayit('Elin', 'karakter');
    const isyan = kayit('Velkar isyanı', 'olay', '412');
    const eski = kayit('Eski kuşatma', 'olay', '380');
    const mesele = kayit('İsyanı kim başlattı?', 'acik_mesele');
    h.iliskiEkle({ evren, tur: 'olayda', a: elin, b: isyan, rol: 'katilan' });
    h.iliskiEkle({ evren, tur: 'olayda', a: elin, b: eski, rol: 'katilan' });

    const { kod } = h.masaOlustur({ evren, ad: 'Velkar isyanı' });
    for (const k of [sehir, elin, mesele]) h.masaUyeleri({ evren, kod, ekle: { tur: 'kayit', kod: k } });
    h.masaUyeleri({ evren, kod, ekle: { tur: 'kayit', kod: elin } });
    expect(() => h.masaUyeleri({ evren, kod, ekle: { tur: 'harita', kod: 'yok' } })).toThrow(/Harita/);
    h.masaYaz({ evren, kod, alan: 'amac', deger: 'Kuşatmanın hangi gün kırıldığını çözmek' });
    h.masaYaz({ evren, kod, alan: 'bas', deger: '400' });
    h.masaYaz({ evren, kod, alan: 'bit', deger: '420' });
    expect(() => h.masaYaz({ evren, kod, alan: 'bas', deger: 'dün değil yarın' })).toThrow(/okunamadı/);

    let m = h.masa({ evren, kod });
    expect(m.uyeler.map((u) => u.ad)).toEqual(['Velkar', 'Elin', 'İsyanı kim başlattı?']);
    expect(m.uyeler.find((u) => u.kod === mesele)!.grup).toBe('Açık sorular');
    expect(m.olaylar.map((o) => o.ad)).toEqual(['Velkar isyanı']);
    expect(m.amac).toContain('Kuşatmanın');
    expect(h.kayitMasalari({ evren, kod: elin })).toEqual([{ kod, ad: 'Velkar isyanı' }]);

    h.masaUyeleri({ evren, kod, tasi: { uye: { tur: 'kayit', kod: mesele }, sira: 0 } });
    m = h.masa({ evren, kod });
    expect(m.uyeler.map((u) => u.ad)[0]).toBe('İsyanı kim başlattı?');

    // Kayıt silinse de masa kaydı silmez; masadan çıkarmak kaydı silmez.
    h.masaUyeleri({ evren, kod, cikar: { tur: 'kayit', kod: sehir } });
    expect(h.kayit({ evren, kod: sehir }).silindi).toBeFalsy();
    h.masaSil({ evren, kod });
    expect(h.masalar({ evren })).toHaveLength(0);
    h.masaSil({ evren, kod, geriYukle: true });
    expect(h.masalar({ evren })).toHaveLength(1);
  });

  it('iki cihazda masanın sorusu farklı yazılırsa çatışma olur; tablolar günlükten yeniden kurulur', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const { kod } = m.masaOlustur({ evren, ad: 'Liman' });
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.masaYaz({ evren, kod, alan: 'amac', deger: 'Gemiler ne zaman geldi?' });
    t.masaYaz({ evren, kod, alan: 'amac', deger: 'Liman kimin elinde?' });
    const ab = m.islemleriVer({ evren, gorulen: t.gorulenler({ evren }) });
    const ba = t.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) });
    t.islemleriAl({ evren, islemler: ab }); m.islemleriAl({ evren, islemler: ba });
    const c = m.catismalar({ evren }).filter((x) => x.tur === 'alan');
    expect(c).toHaveLength(1);
    const ca = c[0] as Extract<typeof c[0], { tur: 'alan' }>;
    expect(ca.baslik).toContain('konu dosyası');
    m.alanCatismasiCoz({ evren, nesne: kod, alan: 'amac', islem: ca.degerler.find((d) => d.deger === 'Liman kimin elinde?')!.islem });
    expect(m.catismalar({ evren }).filter((x) => x.tur === 'alan')).toHaveLength(0);
    (m as unknown as { evren(k: string): { yenidenKur(): void } }).evren(evren).yenidenKur();
    expect(m.masa({ evren, kod }).amac).toBe('Liman kimin elinde?');
  });
});

describe('varsayım paketleri (§3.11)', () => {
  it('paketle denetim: varsayım kanona yazılmaz; sonuç hangi paketle hesaplandığını söyler', () => {
    const { h, evren, kayit } = kur();
    const kral = kayit('Kral Orvan', 'karakter');
    h.kayitAlanYaz({ evren, kod: kral, alan: 'olum', deger: '350' });
    const tören = kayit('Taç töreni', 'olay', '360');
    h.iliskiEkle({ evren, tur: 'olayda', a: kral, b: tören, rol: 'katilan' });
    const rota = kayit('Dağ yolu', 'rota');

    const yasam = (paket?: string) => h.denetimler({ evren, paket }).acik.filter((b) => b.kural === 'yasam');
    expect(yasam()).toHaveLength(1);
    expect(h.denetimler({ evren }).paket).toBeNull();

    const { kod: p } = h.paketOlustur({ evren, ad: 'Tören hiç olmadı' });
    h.varsayimEkle({ evren, paket: p, varsayim: { tur: 'olay', olay: tören, deger: false } });
    h.varsayimEkle({ evren, paket: p, varsayim: { tur: 'rota', rota, deger: false } });
    h.varsayimEkle({ evren, paket: p, varsayim: { tur: 'metin', metin: 'Köprü açık' } });
    expect(() => h.varsayimEkle({ evren, paket: p, varsayim: { tur: 'olay', olay: tören, deger: true } })).toThrow(/ayrı paketlerde/);
    expect(() => h.varsayimEkle({ evren, paket: p, varsayim: { tur: 'rota', rota: kral, deger: true } })).toThrow(/Rota/);

    const d = h.denetimler({ evren, paket: p });
    expect(d.acik.filter((b) => b.kural === 'yasam')).toHaveLength(0);
    expect(d.paket).toEqual({ kod: p, ad: 'Tören hiç olmadı', kullanilan: 2, kullanilmayan: 1 });
    // Kanon değişmedi.
    expect(yasam()).toHaveLength(1);
    expect(h.kayit({ evren, kod: tören }).karar).toBe('kesin');

    const pk = h.paket({ evren, kod: p });
    const olayV = pk.varsayimlar.find((v) => v.v.tur === 'olay')!;
    expect(olayV.yazi).toBe('“Taç töreni” gerçekleşmedi');
    expect(olayV.evreneYazilabilir).toBe(true);
    expect(pk.varsayimlar.find((v) => v.v.tur === 'metin')!.kullanan).toContain('Hesaplara girmez');

    // Evrene yazmak ayrı işlem: olay vazgeçilmiş olur, kanonik denetim de artık bulgu vermez.
    h.varsayimiEvreneYaz({ evren, paket: p, kod: olayV.v.kod });
    expect(h.kayit({ evren, kod: tören }).karar).toBe('vazgecildi');
    expect(yasam()).toHaveLength(0);
    expect(h.paket({ evren, kod: p }).varsayimlar.find((v) => v.v.tur === 'olay')!.evreneYazilabilir).toBe(false);

    // Masa bir paket seçer; paket silinince masa bunu söyler.
    const { kod: masa } = h.masaOlustur({ evren, ad: 'Taç' });
    h.masaYaz({ evren, kod: masa, alan: 'paket', deger: p });
    expect(h.masa({ evren, kod: masa }).paket!.ad).toBe('Tören hiç olmadı');
    expect(h.paket({ evren, kod: p }).masalar.map((x) => x.ad)).toEqual(['Taç']);
    h.paketSil({ evren, kod: p });
    expect(h.masa({ evren, kod: masa }).paket).toBeNull();
    expect(h.masa({ evren, kod: masa }).paketSilinmis).toBe(true);
  });

  it('"gerçekleşti" varsayımı fikir olayını kesin sayar', () => {
    const { h, evren, kayit } = kur();
    const kral = kayit('Kral Orvan', 'karakter');
    h.kayitAlanYaz({ evren, kod: kral, alan: 'olum', deger: '350' });
    const av = kayit('Son av', 'olay', '355');
    h.kayitDegistir({ evren, kod: av, alan: 'karar', deger: 'fikir' });
    h.iliskiEkle({ evren, tur: 'olayda', a: kral, b: av, rol: 'katilan' });
    expect(h.denetimler({ evren }).acik.filter((b) => b.kural === 'yasam')).toHaveLength(0);
    expect(h.denetimler({ evren }).fikir.filter((b) => b.kural === 'yasam')).toHaveLength(1);
    const { kod: p } = h.paketOlustur({ evren, ad: 'Av oldu' });
    h.varsayimEkle({ evren, paket: p, varsayim: { tur: 'olay', olay: av, deger: true } });
    expect(h.denetimler({ evren, paket: p }).acik.filter((b) => b.kural === 'yasam')).toHaveLength(1);
  });
});
