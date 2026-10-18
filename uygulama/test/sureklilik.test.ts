import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { islemAciklamasi } from '../src/alan/islem-metni';
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

describe('süreklilik defteri (§5.6)', () => {
  it('sayılabilir kaynak: gözlem, değişim, hesap ve net fark ayrı; uyuşmazlıkta ikisi de görünür', () => {
    const { h, evren, kayit } = kur();
    const elin = kayit('Elin', 'karakter');
    const s1 = kayit('Geçitteki pusu', 'sahne', '3 Tohum 412');
    const s2 = kayit('Kuleye tırmanış', 'sahne', '5 Tohum 412');
    h.iliskiEkle({ evren, tur: 'sahnede', a: elin, b: s1, rol: 'bulunuyor' });
    const { kod: ok } = h.izOlustur({ evren, konu: elin, ad: 'Ok sayısı', model: 'sayi', birim: 'ok' });

    // İlk sahnede ayrıntı görünür (Elin sahnede); henüz gözlem yok.
    let s = h.sahneSurekliligi({ evren, sahne: s1 });
    expect(s.izler.map((x) => x.iz.ad)).toEqual(['Ok sayısı']);
    expect(s.izler[0].bas.beklenen).toBeNull();

    h.izGozlem({ evren, iz: ok, sahne: s1, an: 'bas', deger: '5' });
    expect(() => h.izGozlem({ evren, iz: ok, sahne: s1, an: 'son', deger: 'üç' })).toThrow(/sayı/);
    // Değişim sahnenin kendi olayına bağlanır; konusu ayrıntının konusudur.
    const { olay } = h.degisimEkle({ evren, sahne: s1, metin: 'İki ok attı', iz: ok, miktar: -2 });
    expect(h.kayitDegisimleri({ evren, kod: elin }).map((d) => d.metin)).toEqual(['İki ok attı']);
    s = h.sahneSurekliligi({ evren, sahne: s1 });
    expect(s.izler[0].son.hesaplanan).toBe('3 ok');
    expect(s.izler[0].degisimler.map((d) => d.miktar)).toEqual([-2]);

    // Sonda 2 gözlenir: hesap (3) ve gözlem (2) ikisi de korunur, net fark eylemi söylemez.
    h.izGozlem({ evren, iz: ok, sahne: s1, an: 'son', deger: '2' });
    s = h.sahneSurekliligi({ evren, sahne: s1 });
    const x = s.izler[0];
    expect(x.son).toEqual({ gozlenen: '2', hesaplanan: '3 ok' });
    expect(x.netFark).toBe(-3);
    expect(x.notlar.join(' ')).toContain('İkisi de korunuyor');
    expect(x.notlar.join(' ')).toContain('söylemez');

    // Sonraki sahne: başta beklenen, son gözlemden hesaplanır (gözlem esas alınır, hesap üzerine yazmaz).
    s = h.sahneSurekliligi({ evren, sahne: s2 });
    expect(s.izler).toHaveLength(0);
    expect(s.eklenebilir.map((i) => i.kod)).toEqual([ok]);
    h.izGozlem({ evren, iz: ok, sahne: s2, an: 'bas', deger: '2' });
    s = h.sahneSurekliligi({ evren, sahne: s2 });
    expect(s.izler[0].bas.beklenen).toBe('2 ok');
    expect(s.izler[0].notlar).toEqual([]);

    // Geçmiş: evren zamanına göre adımlar.
    const g = h.kayitIzleri({ evren, kod: elin })[0];
    expect(g.adimlar.map((a) => `${a.tur}:${a.an ?? ''}:${a.deger}`)).toEqual(['gozlem:bas:5', 'degisim::İki ok attı', 'gozlem:son:2', 'gozlem:bas:2']);
    expect(g.adimlar[2].uyusmaz).toBe(true);
    expect(g.adimlar[2].hesap).toBe(3);

    // Sahne silinince olaydaki değişim (harcama) geri gelmez; olay evrende kalır.
    h.kayitSil({ evren, kod: s1 });
    const g2 = h.kayitIzleri({ evren, kod: elin })[0];
    expect(g2.adimlar.filter((a) => a.tur === 'degisim').length + g2.tarihsiz.filter((a) => a.tur === 'degisim').length).toBe(1);
    expect(h.kayit({ evren, kod: olay }).silindi).toBeFalsy();
  });

  it('aynı olay iki sahnede anlatılsa da değişim bir kez uygulanır; miktarsız değişim hesabı durdurur', () => {
    const { h, evren, kayit } = kur();
    const kese = kayit('Mira\'nın kesesi', 'esya');
    const s1 = kayit('Pazar', 'sahne', '1 Hasat 412');
    const s2 = kayit('Pazar, Mira\'nın gözünden', 'sahne', '1 Hasat 412');
    const s3 = kayit('Han', 'sahne', '4 Hasat 412');
    const { kod: para } = h.izOlustur({ evren, konu: kese, ad: 'Gümüş', model: 'sayi', birim: 'gümüş' });
    h.izGozlem({ evren, iz: para, sahne: s1, an: 'bas', deger: '40' });
    const { olay } = h.degisimEkle({ evren, sahne: s1, metin: 'Kılıç aldı', iz: para, miktar: -25 });
    h.iliskiEkle({ evren, tur: 'anlatir', a: s2, b: olay });
    h.izGozlem({ evren, iz: para, sahne: s3, an: 'bas', deger: '15' });
    const s = h.sahneSurekliligi({ evren, sahne: s3 });
    expect(s.izler[0].bas.beklenen).toBe('15 gümüş');
    expect(s.izler[0].notlar).toEqual([]);
    expect(h.sahneSurekliligi({ evren, sahne: s2 }).izler[0].degisimler).toHaveLength(1);

    h.degisimEkle({ evren, sahne: s3, metin: 'Biraz harcadı', iz: para });
    const z = h.sahneSurekliligi({ evren, sahne: s3 }).izler[0];
    expect(z.son.hesaplanan).toBeNull();
    expect(z.notlar.join(' ')).toContain('miktarı yazılmamış');
  });

  it('serbest durum hesaplanmaz; iki gözlem arasındaki eylem tahmin edilmez', () => {
    const { h, evren, kayit } = kur();
    const kapi = kayit('Sarnıç kapısı', 'yer');
    const s1 = kayit('Gece', 'sahne', '2 Sis 412');
    const s2 = kayit('Sabah', 'sahne', '3 Sis 412');
    const { kod } = h.izOlustur({ evren, konu: kapi, ad: 'Kilit', model: 'durum' });
    h.izGozlem({ evren, iz: kod, sahne: s1, an: 'son', deger: 'kilitli' });
    h.izGozlem({ evren, iz: kod, sahne: s2, an: 'bas', deger: 'açık' });
    const z = h.sahneSurekliligi({ evren, sahne: s2 }).izler[0];
    expect(z.bas.beklenen).toBe('kilitli');
    expect(z.bas.dayanak).toContain('“Gece”');
    expect(z.son.hesaplanan).toBeNull();
    expect(z.notlar.join(' ')).toContain('arada kayıtlı bir değişim yok');
  });

  it('iyileşme süresi: başlangıçtan sonra geçen güne göre; kaba tarihte belli değil der', () => {
    const { h, evren, kayit } = kur();
    const elin = kayit('Elin', 'karakter');
    const s1 = kayit('Pusu', 'sahne', '1 Tohum 412');
    const s2 = kayit('Kaçış', 'sahne', '5 Tohum 412');
    const s3 = kayit('Dönüş', 'sahne', '20 Tohum 412');
    const s4 = kayit('Yıllar sonra', 'sahne', '412');
    expect(() => h.izOlustur({ evren, konu: elin, ad: 'Sağ el', model: 'iyilesme' })).toThrow(/gün/);
    const { kod } = h.izOlustur({ evren, konu: elin, ad: 'Sağ el', model: 'iyilesme', sure: 10 });
    h.degisimEkle({ evren, sahne: s1, metin: 'Eli yaralandı', iz: kod });
    for (const s of [s2, s3, s4]) h.izGozlem({ evren, iz: kod, sahne: s, an: 'bas', deger: 'sargılı' });
    expect(h.sahneSurekliligi({ evren, sahne: s2 }).izler[0].bas.beklenen).toContain('dolmadı');
    expect(h.sahneSurekliligi({ evren, sahne: s3 }).izler[0].bas.beklenen).toBe('İyileşme süresi doldu');
    expect(h.sahneSurekliligi({ evren, sahne: s4 }).izler[0].bas.beklenen).toContain('belli değil');
  });

  it('iki cihazda aynı gözleme farklı değer çatışma olur; seçim ikisini de görür; tablolar günlükten yeniden kurulur', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const elin = m.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const sahne = m.kayitOlustur({ evren, ad: 'Pusu', tur: 'sahne' }).kod;
    const { kod: iz } = m.izOlustur({ evren, konu: elin, ad: 'Ok sayısı', model: 'sayi' });
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.izGozlem({ evren, iz, sahne, an: 'bas', deger: '5' });
    t.izGozlem({ evren, iz, sahne, an: 'bas', deger: '6' });
    const ab = m.islemleriVer({ evren, gorulen: t.gorulenler({ evren }) });
    const ba = t.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) });
    t.islemleriAl({ evren, islemler: ab }); m.islemleriAl({ evren, islemler: ba });
    const c = m.catismalar({ evren }).filter((x) => x.tur === 'alan');
    expect(c).toHaveLength(1);
    expect(c[0].tur === 'alan' && c[0].alanEtiketi).toContain('başındaki durum');
    const sec = c[0].tur === 'alan' ? c[0].degerler.find((d) => d.deger === '6')! : null;
    m.alanCatismasiCoz({ evren, nesne: iz, alan: (c[0] as { alan: string }).alan, islem: sec!.islem });
    expect(m.catismalar({ evren }).filter((x) => x.tur === 'alan')).toHaveLength(0);
    expect(m.sahneSurekliligi({ evren, sahne }).izler[0].bas.gozlenen).toBe('6');
    (m as unknown as { evren(k: string): { yenidenKur(): void } }).evren(evren).yenidenKur();
    expect(m.sahneSurekliligi({ evren, sahne }).izler[0].bas.gozlenen).toBe('6');
    expect(m.islemGunlugu({ evren, sinir: 50 }).some((i) => islemAciklamasi(i.tur, i.veri, (k) => (k === sahne ? 'Pusu' : '?')).includes('“Ok sayısı” başta “6” olarak gözlendi'))).toBe(true);
  });
});
