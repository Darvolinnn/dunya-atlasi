import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  return { h, evren, kayit };
}
const ad = (g: { ad: string; durum: string }[], durum: string) => g.filter((x) => x.durum === durum).map((x) => x.ad);

describe('bir sonraki yararlı soru (F33)', () => {
  it('sahnenin yolculuğu: eksik rota süresini ve kullanıldığı hesapları gösterir; yazınca hazır olur', () => {
    const { h, evren, kayit } = kur();
    const koy = kayit('Uydurma köy', 'mekan'), liman = kayit('Uydurma liman', 'sehir'), yol = kayit('Uydurma yol', 'rota');
    const sahne = kayit('Uydurma sahne', 'sahne'), yolculuk = kayit('Uydurma sefer', 'yolculuk');
    expect(h.sorulabilirHesaplar({ evren, kod: sahne }).map((x) => x.hesap)).toEqual(['yol', 'yaslar', 'gokyuzu']);

    let s = h.sonrakiSoru({ evren, kod: sahne, hesap: 'yol', nereden: koy });
    expect(s.hazir).toBe(false);
    expect(ad(s.girdiler, 'eksik')).toEqual(['Nereye', 'Başlangıç ya da varış tarihi']);

    h.sahneAlaniAyarla({ evren, sahne, alan: 'sahne_yeri', kayit: liman });
    h.kayitTarih({ evren, kod: sahne, ifade: '430' });
    h.rotaYaz({ evren, kod: yol, rota: { a: koy, b: liman, mesafe: null, sureler: [], duraklar: [] } });
    h.yolculukYaz({ evren, kod: yolculuk, asamalar: [{ nereden: koy, nereye: liman, rota: yol, cikis: '429', varis: '', durum: 'gerceklesti' }] });
    s = h.sonrakiSoru({ evren, kod: sahne, hesap: 'yol', nereden: koy });
    expect(s.siradaki?.ad).toBe('Rota süresi');
    expect(s.siradaki?.kayit?.kod).toBe(yol);
    expect(s.siradaki?.kullanim).toEqual(['“Uydurma sefer” yolculuğu', 'yerler arası en kısa yol', 'sonuçtan koşullara masası']);

    h.rotaYaz({ evren, kod: yol, rota: { a: koy, b: liman, mesafe: null, sureler: [{ kosul: 'yaya', gun: 4 }, { kosul: 'atlı', gun: 2 }], duraklar: [] } });
    s = h.sonrakiSoru({ evren, kod: sahne, hesap: 'yol', nereden: koy });
    expect(s.hazir).toBe(true);
    expect(ad(s.girdiler, 'kısmen')).toEqual(['Ulaşım biçimi']);
    expect(s.not).toContain('önem puanı değildir');
  });

  it('bağlantısı olmayan iki yer için süre ağı eksiktir; uçları yazılmamış rotalar gösterilir', () => {
    const { h, evren, kayit } = kur();
    const a = kayit('Uydurma A', 'mekan'), b = kayit('Uydurma B', 'mekan');
    kayit('Uydurma uçsuz yol', 'rota');
    const s = h.sonrakiSoru({ evren, kod: b, hesap: 'yol', nereden: a, tarih: '430' });
    expect(ad(s.girdiler, 'eksik')).toEqual(['Süre ağı']);
    expect(s.girdiler.find((g) => g.ad === 'Rota uçları')?.aciklama).toContain('Uydurma uçsuz yol');
  });

  it('yolculuk, haber, yaş, katılımcıların yaşı ve gökyüzü için eksikleri sayar', () => {
    const { h, evren, kayit } = kur();
    const yolculuk = kayit('Uydurma sefer', 'yolculuk');
    expect(ad(h.sonrakiSoru({ evren, kod: yolculuk, hesap: 'yolculuk' }).girdiler, 'eksik')).toEqual(['Aşamalar', 'Yolcular']);

    const haber = kayit('Uydurma söylenti', 'haber');
    expect(ad(h.sonrakiSoru({ evren, kod: haber, hesap: 'haber' }).girdiler, 'eksik')).toEqual(['Çıkış yeri', 'Çıkış tarihi', 'Haberleşme yöntemi']);

    const kisi = kayit('Uydurma kişi', 'karakter');
    let y = h.sonrakiSoru({ evren, kod: kisi, hesap: 'yas' });
    expect(y.siradaki?.ad).toBe('Doğum');
    expect(y.siradaki?.kullanim).toHaveLength(3);
    h.kayitAlanYaz({ evren, kod: kisi, alan: 'dogum', deger: '400' });
    y = h.sonrakiSoru({ evren, kod: kisi, hesap: 'yas', tarih: '430' });
    expect(y.hazir).toBe(true);

    const sahne = kayit('Uydurma sahne', 'sahne'), diger = kayit('Uydurma diğer', 'karakter');
    h.iliskiEkle({ evren, tur: 'sahnede', a: kisi, b: sahne });
    h.iliskiEkle({ evren, tur: 'sahnede', a: diger, b: sahne });
    expect(ad(h.sonrakiSoru({ evren, kod: sahne, hesap: 'yaslar' }).girdiler, 'eksik')).toEqual(['Sahnenin tarihi', 'Uydurma diğer: doğum']);
    expect(ad(h.sonrakiSoru({ evren, kod: sahne, hesap: 'gokyuzu' }).girdiler, 'eksik')).toEqual(['Gökyüzü tanımı', 'Tarih']);

    expect(() => h.sonrakiSoru({ evren, kod: kisi, hesap: 'haber' })).toThrow('sorulamaz');
    expect(h.sorulabilirHesaplar({ evren, kod: kayit('Uydurma not', 'not') })).toEqual([]);
  });
});
