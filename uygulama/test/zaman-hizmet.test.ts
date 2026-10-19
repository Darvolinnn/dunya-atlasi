import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { eksenYili, tarihAciklamasi, paralelYazilar, type Takvim } from '../src/alan/tarih';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }, { ad: 'Sis', gun: 30 }, { ad: 'Kara Ay', gun: 30 }],
  caglar: [{ ad: 'Kuruluş öncesi', baslangic: 0, ters: true }, { ad: 'Birinci Çağ', baslangic: 1 }, { ad: 'İkinci Çağ', baslangic: 301 }] };

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  h.takvimYaz({ evren, takvim: ANA });
  return { h, evren };
}

describe('zaman tanımları hizmette', () => {
  it('çağlı ana takvim, paralel takvim ve akış; tarihler setle okunur', () => {
    const { h, evren } = kur();
    const k = h.kayitOlustur({ evren, ad: 'Taç giyme', tur: 'olay' }).kod;
    h.kayitTarih({ evren, kod: k, ifade: 'İkinci Çağ 12' });
    expect(eksenYili(h.kayit({ evren, kod: k }).tarih!.eksen!.enErken!, ANA)).toBe(312);

    expect(() => h.paralelTakvimYaz({ evren, takvim: { kod: '', surum: 0, ad: 'Yıl', yilGun: 100, cap: null, bagli: null } })).toThrow(/Yıl/);
    const { kod: dongu } = h.paralelTakvimYaz({ evren, takvim: { kod: '', surum: 0, ad: 'Döngü', yilGun: 100, cap: { yil: 1, ana: '300' }, bagli: null } });
    expect(() => h.paralelTakvimYaz({ evren, takvim: { kod: '', surum: 0, ad: 'döngü', yilGun: 100, cap: null, bagli: null } })).toThrow(/ayırt edilemez/);
    const p = h.kayitOlustur({ evren, ad: 'Tapınak kuruldu', tur: 'olay' }).kod;
    h.kayitTarih({ evren, kod: p, ifade: 'Döngü 5' });
    const z = h.zamanSeti({ evren });
    const t = h.kayit({ evren, kod: p }).tarih!;
    expect(t.takvim).toBe(dongu);
    expect(tarihAciklamasi(t, z)).toBe('Döngü 5');
    expect(paralelYazilar(t, z)[0].yazi).toBe('İkinci Çağ 3 ile İkinci Çağ 5 arası');

    // Eşleme değişince tarihin ifadesi korunur, yeri kayar; etki önizlemesi bunu gösterir.
    const etki = h.takvimEtkisi({ evren, kod: dongu, takvim: { ...z.diger[0], cap: { yil: 1, ana: '310' } } });
    expect(etki.degisenSayisi).toBe(1);
    h.paralelTakvimYaz({ evren, kod: dongu, takvim: { ...z.diger[0], cap: { yil: 1, ana: '310' } } });
    expect(paralelYazilar(h.kayit({ evren, kod: p }).tarih!, h.zamanSeti({ evren }))[0].yazi).toBe('İkinci Çağ 13 ile İkinci Çağ 15 arası');
    expect(h.kayit({ evren, kod: p }).tarih!.ifade).toBe('Döngü 5');

    h.akisYaz({ evren, akis: { kod: '', ad: 'Fey', bagli: null, cap: '1 Tohum 400', oranlar: [{ bas: null, akis: 10, ana: [1, 1] }] } });
    const f = h.kayitOlustur({ evren, ad: 'Fey düğünü', tur: 'olay' }).kod;
    h.kayitTarih({ evren, kod: f, ifade: 'Fey 300. gün' });
    const ft = h.kayit({ evren, kod: f }).tarih!;
    expect(ft.akis).toBeTruthy();
    expect(tarihAciklamasi(ft, h.zamanSeti({ evren }))).toContain('Fey akışının 300. günü; ana akışta');

    // Paralel takvim kaldırılınca onunla yazılmış tarih silinmez; ana takvimle okunur (sembolik kalır).
    h.paralelTakvimYaz({ evren, kod: dongu, takvim: null });
    expect(h.kayit({ evren, kod: p }).tarih!.ifade).toBe('Döngü 5');
  });

  it('göreli tarih: kısıtlardan olası aralık; dayanak kayınca kayar; etki raporunda görünür', () => {
    const { h, evren } = kur();
    const tufan = h.kayitOlustur({ evren, ad: 'Tufan', tur: 'olay' }).kod;
    const olum = h.kayitOlustur({ evren, ad: 'Kralın Ölümü', tur: 'olay' }).kod;
    const x = h.kayitOlustur({ evren, ad: 'Kule yıkıldı', tur: 'olay' }).kod;
    h.kayitTarih({ evren, kod: tufan, ifade: '100' });
    h.kayitTarih({ evren, kod: olum, ifade: '210' });
    expect(() => h.kayitTarih({ evren, kod: x, kisitlar: [{ olay: tufan, fark: 'yüz yıl sonra' }] })).toThrow(/Farkı/);
    h.kayitTarih({ evren, kod: x, kisitlar: [{ olay: tufan, fark: '80–120 yıl sonra' }, { olay: olum, fark: 'önce' }] });
    let t = h.kayit({ evren, kod: x }).tarih!;
    expect(t.bicim).toBe('goreli');
    expect(t.ifade).toBe("Tufan'dan 80–120 yıl sonra; “Kralın Ölümü” olayından önce");
    expect(eksenYili(t.eksen!.enErken!, ANA)).toBe(180);
    expect(eksenYili(t.eksen!.enGec!, ANA)).toBe(210);
    expect(h.etkiRaporu({ evren, kod: tufan }).hesap.map((r) => r.kod)).toContain(x);

    h.kayitTarih({ evren, kod: tufan, ifade: '110' });
    t = h.kayit({ evren, kod: x }).tarih!;
    expect(eksenYili(t.eksen!.enErken!, ANA)).toBe(190);
    expect(h.zamanCizelgesi({ evren }).find((o) => o.kod === x)!.tarih.bicim).toBe('goreli');

    // Çelişki: ölüm tufandan önceye alınır.
    h.kayitTarih({ evren, kod: olum, ifade: '150' });
    t = h.kayit({ evren, kod: x }).tarih!;
    expect(t.celiski).toBeTruthy();
    expect(t.eksen).toBeNull();
    // Ad değişince okunuş da değişir.
    h.kayitDegistir({ evren, kod: tufan, alan: 'ad', deger: 'Büyük Tufan' });
    expect(h.kayit({ evren, kod: x }).tarih!.ifade).toContain("Büyük Tufan'dan");
  });

  it('durum sınırı olay + fark: olay kayınca sınır da kayar', () => {
    const { h, evren } = kur();
    const kusatma = h.kayitOlustur({ evren, ad: 'Kuşatma', tur: 'olay' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    h.kayitTarih({ evren, kod: kusatma, ifade: '400' });
    h.durumEkle({ evren, kod: kale, durum: { ozellik: 'Sahibi', deger: 'Varos', kip: 'sonraki', baslangic: { olay: kusatma, fark: '2 yıl sonra' } } });
    let d = h.durumlar({ evren, kod: kale }).durumlar[0];
    expect(d.baslangic!.fark).toMatchObject({ yon: 'sonra', en: 2 });
    expect(eksenYili(d.baslangic!.tarih!.eksen!.enErken!, ANA)).toBe(402);
    h.kayitTarih({ evren, kod: kusatma, ifade: '405' });
    d = h.durumlar({ evren, kod: kale }).durumlar[0];
    expect(eksenYili(d.baslangic!.tarih!.eksen!.enErken!, ANA)).toBe(407);
    expect(() => h.durumEkle({ evren, kod: kale, durum: { ozellik: 'Sahibi', deger: 'X', baslangic: { olay: kusatma, fark: 'yarın' } } })).toThrow(/Farkı/);
  });

  it('iki cihazda aynı akışa farklı tanım: ikisi de gösterilir, yazar seçer', () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    m.takvimYaz({ evren, takvim: ANA });
    const { kod } = m.akisYaz({ evren, akis: { kod: '', ad: 'Fey', bagli: null, cap: '400', oranlar: [{ bas: null, akis: 10, ana: [1, 1] }] } });
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    const a = m.zamanSeti({ evren }).akislar[0];
    m.akisYaz({ evren, kod, akis: { ...a, oranlar: [{ bas: null, akis: 5, ana: [1, 1] }] } });
    tb.akisYaz({ evren, kod, akis: { ...a, oranlar: [{ bas: null, akis: 20, ana: [1, 1] }] } });
    m.islemleriAl({ evren, islemler: tb.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) }) });
    const c = m.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === `akis:${kod}`);
    expect(c).toBeTruthy();
    if (c?.tur !== 'alan') return;
    expect(c.alanEtiketi).toBe('Zaman akışı');
    expect(c.degerler).toHaveLength(2);
    m.alanCatismasiCoz({ evren, nesne: 'evren', alan: `akis:${kod}`, islem: c.degerler[0].islem });
    expect(m.catismalar({ evren }).some((x) => x.tur === 'alan' && x.alan === `akis:${kod}`)).toBe(false);
  });

  it('göreli tarih ve durum sınırında iyelik belirsizliğinde nötr yazım kullanılır', () => {
    const { h, evren } = kur();
    const tufan = h.kayitOlustur({ evren, ad: 'Tufan', tur: 'olay' }).kod;
    const kapi = h.kayitOlustur({ evren, ad: 'Kuzey Kapısı', tur: 'olay' }).kod;
    const buyukKapi = h.kayitOlustur({ evren, ad: 'Büyük Kapı', tur: 'olay' }).kod;
    const x = h.kayitOlustur({ evren, ad: 'Antlaşma', tur: 'olay' }).kod;
    h.kayitTarih({ evren, kod: tufan, ifade: '100' });
    h.kayitTarih({ evren, kod: kapi, ifade: '150' });
    h.kayitTarih({ evren, kod: buyukKapi, ifade: '160' });
    h.kayitTarih({ evren, kod: x, kisitlar: [{ olay: tufan, fark: '80 yıl sonra' }] });
    expect(h.kayit({ evren, kod: x }).tarih!.ifade).toBe("Tufan'dan 80 yıl sonra");
    h.kayitTarih({ evren, kod: x, kisitlar: [{ olay: kapi, fark: '80 yıl sonra' }] });
    expect(h.kayit({ evren, kod: x }).tarih!.ifade).toBe('“Kuzey Kapısı” olayından 80 yıl sonra');
    h.durumEkle({ evren, kod: x, durum: { ozellik: 'Durum', deger: 'Açık', kip: 'sonraki', baslangic: { olay: buyukKapi, fark: '5 yıl sonra' } } });
    expect(h.durumlar({ evren, kod: x }).durumlar[0].baslangic!.tarih!.ifade).toBe('“Büyük Kapı” olayından 5 yıl sonra');
  });
});

