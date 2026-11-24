import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { Takvim } from '../src/alan/tarih';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }, { ad: 'Sis', gun: 30 }, { ad: 'Kara Ay', gun: 30 }] };

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  h.takvimYaz({ evren, takvim: ANA });
  const kayit = (ad: string, tur: string, tarih?: string) => {
    const kod = h.kayitOlustur({ evren, ad, tur }).kod;
    if (tarih) h.kayitTarih({ evren, kod, ifade: tarih });
    return kod;
  };
  const lale = kayit('Uydurma Lale', 'karakter');
  const kayitSilinmesi = kayit('Kayıt kazınması', 'olay');
  const { kod: iddia } = h.iddiaEkle({ evren, konu: kayitSilinmesi, soru: 'Kaydı kim kazıdı?', secenekler: ['Kâtip', 'Bilinmiyor'], gercek: 0 });
  const sec = h.kayitIddialari({ evren, kod: kayitSilinmesi })[0].secenekler[0].kod;
  return { h, evren, kayit, lale, iddia, sec };
}
const bilgiKurali = (h: Hizmet, evren: string) => h.denetimler({ evren }).kurallar.find((k) => k.kural === 'bilgi')!;

describe('bilgi dayanağı (K38, C3)', () => {
  it('kişinin bilgi kayıtları işaretin bağlanabileceği bilgiler arasında; okunur yazısı inancı ve zamanı söyler', () => {
    const { h, evren, lale, iddia, sec } = kur();
    const ogrenme = h.kayitOlustur({ evren, ad: 'Başkâtip', tur: 'sahne' }).kod;
    const { kod } = h.bilgiEkle({ evren, bilgi: { iddia, bilen: lale, inanc: 'inaniyor', secenek: sec, sahne: ogrenme, baslangic: { ifade: '1 Sis 412' } } });
    const a = h.isaretAlanlari({ evren, hedef: lale }).find((x) => x.kod === `bilgi:${kod}`)!;
    expect(a.grup).toBe('Bildikleri');
    expect(a.ad).toContain('inanıyor');
    expect(a.ad).toContain('1 Sis 412');
    expect(a.ad).toContain('“Başkâtip” sahnesinde');
  });
  it('öğrenmeden önceki sahnede bilgiye göre davranmak açık çelişki; sonraki sahnede sorun yok; aynı sahnede öğrenmek sorun değil', () => {
    const { h, evren, kayit, lale, iddia, sec } = kur();
    expect(bilgiKurali(h, evren).sonuc).toBe('konu_degil');
    const ogrenme = kayit('Başkâtip', 'sahne', '1 Sis 412');
    const { kod: bilgi } = h.bilgiEkle({ evren, bilgi: { iddia, bilen: lale, inanc: 'inaniyor', secenek: sec, sahne: ogrenme } });
    const once = kayit('Arşiv', 'sahne', '5 Hasat 412');
    const sonra = kayit('Dönüş', 'sahne', '5 Kara Ay 412');
    const isaret = (sahne: string) => h.metinIsaretiOlustur({ evren, kayit: sahne, alan: 'govde', hedef: lale, hedefAlan: `bilgi:${bilgi}` }).kod;
    const i1 = isaret(once);
    let d = h.denetimler({ evren });
    const b = d.acik.filter((x) => x.kural === 'bilgi');
    expect(b).toHaveLength(1);
    expect(b[0].hukum).toBe('celiski');
    expect(b[0].baslik).toContain('Kaydı kim kazıdı? → Kâtip');
    expect(b[0].kayitlar.map((k) => k.kod)).toEqual([lale, once, ogrenme]);
    expect(h.bilgiIsaretKodlari({ evren, kayit: once })).toEqual([i1]);
    h.metinIsaretiSil({ evren, kod: i1 });
    isaret(sonra); isaret(ogrenme);
    d = h.denetimler({ evren });
    expect(d.acik.filter((x) => x.kural === 'bilgi')).toHaveLength(0);
    expect(bilgiKurali(h, evren)).toMatchObject({ sonuc: 'sorun_yok', denetlenen: 2 });
  });
  it('bilginin başlangıç tarihi öğrenme sahnesinden önce gelir; tarih ve okuma sırası yoksa denetlenemiyor', () => {
    const { h, evren, kayit, lale, iddia, sec } = kur();
    const { kod: bilgi } = h.bilgiEkle({ evren, bilgi: { iddia, bilen: lale, inanc: 'supheleniyor', secenek: sec, baslangic: { ifade: '410' } } });
    const s = kayit('Arşiv', 'sahne', '5 Hasat 412');
    h.metinIsaretiOlustur({ evren, kayit: s, alan: 'govde', hedef: lale, hedefAlan: `bilgi:${bilgi}` });
    expect(bilgiKurali(h, evren).sonuc).toBe('sorun_yok');
    const tarihsiz = kayit('Tarihsiz sahne', 'sahne');
    h.metinIsaretiOlustur({ evren, kayit: tarihsiz, alan: 'govde', hedef: lale, hedefAlan: `bilgi:${bilgi}` });
    expect(bilgiKurali(h, evren).not).toContain('1 işaretin');
    // Yalnız tarihsiz işaret kalınca kural denetlenemiyor.
    h.metinIsaretiSil({ evren, kod: h.kayitIsaretleri({ evren, kod: s }).metindekiler[0].kod });
    expect(bilgiKurali(h, evren).sonuc).toBe('denetlenemiyor');
  });
  it('başka kişinin bilgi kaydı o kişiye bağlanmadan seçilemez', () => {
    const { h, evren, kayit, lale, iddia, sec } = kur();
    const orhun = kayit('Uydurma Orhun', 'karakter');
    const { kod } = h.bilgiEkle({ evren, bilgi: { iddia, bilen: orhun, inanc: 'inaniyor', secenek: sec } });
    const s = kayit('Arşiv', 'sahne');
    expect(() => h.metinIsaretiOlustur({ evren, kayit: s, alan: 'govde', hedef: lale, hedefAlan: `bilgi:${kod}` })).toThrow(/bu kayıtta yok/);
  });
});
