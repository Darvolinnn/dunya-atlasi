// Hesapların sınır durumları (22 Ekim 2026 hesap denetimi): gün düzeyindeki tarihlerde yaş, yolculuk süresi,
// iyileşme süresi ve formüldeki tarih karşılaştırması. Eksende bir aralığın en geç ucu son parçasıdır; süre o parçanın
// sonuna kadar sayılır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { tarihCoz, type Takvim } from '../src/alan/tarih';
import { yasHesapla } from '../src/alan/yas';
import { asamaSuresi } from '../src/calisan/yol';
import { formulDegerlendir, formulOku, type FormulCozucu, type FormulOrtami } from '../src/alan/formul';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }, { ad: 'Sis', gun: 30 }], gunBolumleri: ['sabah', 'öğle', 'akşam'] };
const t = (s: string) => tarihCoz(s, ANA);

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  h.takvimYaz({ evren, takvim: ANA });
  const kayit = (ad: string, tur: string, tarih?: string) => {
    const kod = h.kayitOlustur({ evren, ad, tur }).kod;
    if (tarih) h.kayitTarih({ evren, kod, ifade: tarih });
    return kod;
  };
  return { h, evren, kayit };
}

describe('yaş takvim günleriyle sayılır', () => {
  it('doğum gününde yeni yaşına girer; doğduğu gün 0 yaşındadır', () => {
    const y = (d: string, a: string) => yasHesapla(t(d), t(a), null, ANA)?.metin;
    expect(y('12 Hasat 400', '12 Hasat 412')).toBe('12 yaşında');
    expect(y('12 Hasat 400', '11 Hasat 412')).toBe('11 yaşında');
    expect(y('12 Hasat 400', '13 Hasat 412')).toBe('12 yaşında');
    expect(y('12 Hasat 400', '12 Hasat 400')).toBe('0 yaşında');
    expect(y('12 Hasat 400 akşam', '12 Hasat 412 sabah')).toBe('12 yaşında');
    expect(y('12 Hasat 400', '11 Hasat 400')).toBe('Bu tarihte henüz doğmamış');
    // Kaba tarihlerde hassasiyet korunur: aralık çıkar.
    expect(y('400', '412')).toBe('11–12 yaşında');
    expect(y('Hasat 400', 'Hasat 412')).toBe('11–12 yaşında');
    expect(y('12 Hasat 400', '412')).toBe('11–12 yaşında');
    expect(y('400', '400')).toBe('Doğmuş olabilir; en çok 0 yaşında');
  });
});

describe('iki tarih arasındaki süre', () => {
  it('1. günden 3. güne yolculuk en az 1, en çok 3 gün sürer; aynı gün en çok 1 gün', () => {
    expect(asamaSuresi({ cikis: t('1 Tohum 500'), varis: t('3 Tohum 500') })).toEqual({ enAz: 1, enCok: 3 });
    expect(asamaSuresi({ cikis: t('1 Tohum 500'), varis: t('1 Tohum 500') })).toEqual({ enAz: 0, enCok: 1 });
    expect(asamaSuresi({ cikis: t('1 Tohum 500 sabah'), varis: t('1 Tohum 500 akşam') })).toEqual({ enAz: 1 / 3, enCok: 1 });
    expect(asamaSuresi({ cikis: t('Tohum 500'), varis: t('Hasat 500') })).toEqual({ enAz: 0, enCok: 60 });
    expect(asamaSuresi({ cikis: t('3 Tohum 500'), varis: t('1 Tohum 500') })!.enCok).toBeLessThan(0);
  });

  it('tam rota süresine eşit yolculuk uyarı vermez; bir gün kısası verir', () => {
    const { h, evren, kayit } = kur();
    const a = kayit('Liman', 'sehir'), b = kayit('Dağ Kalesi', 'mekan');
    const r = kayit('Dağ Yolu', 'rota'), y = kayit('Kuzeye sefer', 'yolculuk');
    h.iliskiEkle({ evren, tur: 'yolculukta', a: kayit('Haberci', 'karakter'), b: y, rol: 'yolcu' });
    h.rotaYaz({ evren, kod: r, rota: { a, b, mesafe: null, sureler: [{ kosul: 'yaya', gun: 3 }], duraklar: [] } });
    const asama = (cikis: string, varis: string) => h.yolculukYaz({ evren, kod: y, asamalar: [{ nereden: a, nereye: b, rota: r, cikis, varis, durum: 'gerceklesti' }] });
    asama('1 Tohum 500', '3 Tohum 500');
    expect(h.yolculuk({ evren, kod: y }).asamalar[0].uyari).toBeNull();
    expect(h.denetimler({ evren }).acik.some((x) => x.anahtar.startsWith('denetim:rota-asama:'))).toBe(false);
    asama('1 Tohum 500', '2 Tohum 500');
    expect(h.yolculuk({ evren, kod: y }).asamalar[0].uyari).toContain('en çok 2 gün');
    expect(h.denetimler({ evren }).acik.some((x) => x.anahtar.startsWith('denetim:rota-asama:'))).toBe(true);
    asama('3 Tohum 500', '1 Tohum 500');
    expect(h.yolculuk({ evren, kod: y }).asamalar[0].uyari).toBe('Varış, çıkıştan önce görünüyor.');
  });

  it('iki olay arasında tam rota süresi kadar zaman varsa yer değiştirme uyarısı çıkmaz', () => {
    const { h, evren, kayit } = kur();
    const a = kayit('Liman', 'sehir'), b = kayit('Dağ Kalesi', 'mekan'), r = kayit('Dağ Yolu', 'rota'), k = kayit('Haberci', 'karakter');
    h.rotaYaz({ evren, kod: r, rota: { a, b, mesafe: null, sureler: [{ kosul: 'yaya', gun: 3 }], duraklar: [] } });
    const olay = (ad: string, tarih: string, yer: string) => {
      const o = kayit(ad, 'olay', tarih);
      h.iliskiEkle({ evren, tur: 'sahne_yeri', a: o, b: yer });
      h.iliskiEkle({ evren, tur: 'olayda', a: k, b: o, rol: 'katilan' });
      return o;
    };
    olay('Limandan ayrılış', '1 Tohum 500', a);
    const varis = olay('Kalede nöbet', '3 Tohum 500', b);
    expect(h.denetimler({ evren }).acik.some((x) => x.anahtar.startsWith('denetim:rota:'))).toBe(false);
    h.kayitTarih({ evren, kod: varis, ifade: '2 Tohum 500' });
    const u = h.denetimler({ evren }).acik.filter((x) => x.anahtar.startsWith('denetim:rota:'));
    expect(u).toHaveLength(1);
    expect(u[0].dayanak).toContain('en çok 2 gün');
  });

  it('iyileşme: kalan gün yaralandığı günün başından sayılır', () => {
    const { h, evren, kayit } = kur();
    const elin = kayit('Elin', 'karakter');
    const pusu = kayit('Pusu', 'sahne', '1 Tohum 412');
    const { kod } = h.izOlustur({ evren, konu: elin, ad: 'Sağ el', model: 'iyilesme', sure: 10 });
    h.degisimEkle({ evren, sahne: pusu, metin: 'Eli yaralandı', iz: kod });
    const durum = (tarih: string) => {
      const s = kayit(`Sahne ${tarih}`, 'sahne', tarih);
      h.izGozlem({ evren, iz: kod, sahne: s, an: 'bas', deger: 'sargılı' });
      return h.sahneSurekliligi({ evren, sahne: s }).izler[0].bas.beklenen;
    };
    // 5. günün sonunda en çok 5 gün geçmiştir: en az 5 gün daha.
    expect(durum('5 Tohum 412')).toBe('İyileşme süresi dolmadı (en az 5 gün daha)');
    expect(durum('11 Tohum 412')).toContain('belli değil');
    expect(durum('12 Tohum 412')).toBe('İyileşme süresi doldu');
  });
});

describe('formülde tarih alanı, yazılan tarihin bütününe göre karşılaştırılır', () => {
  const alan = { kod: 'dogum', ad: 'Doğum tarihi', tur: 'tarih' as const, turAdi: 'Karakter' };
  const c: FormulCozucu = { kayitlar: () => [], alanlar: (ad) => (ad.toLocaleLowerCase('tr-TR') === 'doğum tarihi' ? [alan] : []), tarih: (s) => t(s) };
  const sonuc = (formul: string, dogum: string) => {
    const o: FormulOrtami = { iliski: () => false, kayitAdi: () => null, alanTanimi: () => alan, alan: () => ({ durum: 'var', deger: t(dogum) }), yas: () => ({ neden: 'yok' }) };
    return formulDegerlendir(formulOku(formul, c), o).sonuc;
  };
  it('= "400": 400 yılı içindeyse evet', () => {
    expect(sonuc('{Doğum tarihi} = "400"', '400')).toBe('evet');
    expect(sonuc('{Doğum tarihi} = "400"', '12 Hasat 400')).toBe('evet');
    expect(sonuc('{Doğum tarihi} = "400"', '401')).toBe('hayir');
    expect(sonuc('{Doğum tarihi} != "400"', '400')).toBe('hayir');
    expect(sonuc('{Doğum tarihi} = "12 Hasat 400"', '400')).toBe('belirsiz');
  });
  it('<, <=, >, >=', () => {
    expect(sonuc('{Doğum tarihi} <= "400"', '400')).toBe('evet');
    expect(sonuc('{Doğum tarihi} <= "400"', '399')).toBe('evet');
    expect(sonuc('{Doğum tarihi} <= "400"', '401')).toBe('hayir');
    expect(sonuc('{Doğum tarihi} < "400"', '400')).toBe('hayir');
    expect(sonuc('{Doğum tarihi} < "400"', '399')).toBe('evet');
    expect(sonuc('{Doğum tarihi} >= "400"', '400')).toBe('evet');
    expect(sonuc('{Doğum tarihi} >= "400"', '399')).toBe('hayir');
    expect(sonuc('{Doğum tarihi} > "400"', '400')).toBe('hayir');
    expect(sonuc('{Doğum tarihi} > "400"', '401')).toBe('evet');
    // Alanın tarihi sınırın iki yanına düşüyorsa belirsiz.
    expect(sonuc('{Doğum tarihi} < "400"', '399–400')).toBe('belirsiz');
    expect(sonuc('{Doğum tarihi} >= "400"', '399–400')).toBe('belirsiz');
  });
});
