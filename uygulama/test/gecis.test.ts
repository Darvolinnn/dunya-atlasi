import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { Takvim } from '../src/alan/tarih';

const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }] };

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  h.takvimYaz({ evren, takvim: ANA });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const liman = kayit('Tuz Limanı', 'sehir'), gecit = kayit('Kartal Geçidi', 'mekan'), kale = kayit('Kuzey Kalesi', 'sehir');
  const r1 = kayit('Sahil yolu', 'rota'), r2 = kayit('Geçit yolu', 'rota');
  h.rotaYaz({ evren, kod: r1, rota: { a: liman, b: gecit, mesafe: null, sureler: [{ kosul: '', gun: 4 }], duraklar: [] } });
  h.rotaYaz({ evren, kod: r2, rota: { a: gecit, b: kale, mesafe: null, sureler: [{ kosul: '', gun: 2 }], duraklar: [] } });
  const muhur = kayit('Valinin mührü', 'belge'), elci = kayit('Elçi Teren', 'karakter');
  h.rotaSartlariYaz({ evren, rota: r2, sartlar: [{ tur: 'izin', kayit: muhur, aciklama: '' }, { tur: 'ucret', kayit: null, aciklama: '3 gümüş' }] });
  return { h, evren, kayit, liman, gecit, kale, r1, r2, muhur, elci };
}

describe('mümkün ile erişilebilir (F09)', () => {
  it('yolda izin ve ücret ayrı katman olarak görünür; izni olmayan kişi için "yok" der', () => {
    const { h, evren, liman, kale, elci, muhur } = kur();
    const r = h.enKisaRota({ evren, nereden: liman, nereye: kale, kisi: elci });
    expect(r.toplam).toBe(6);
    const s = r.adimlar[1].sartlar!;
    expect(s.map((x) => [x.tur, x.durum])).toEqual([['izin', 'yok'], ['ucret', 'ucret']]);
    expect(s[0].kayit?.kod).toBe(muhur);
    expect(r.adimlar[0].sartlar).toBeUndefined();
    const kimsiz = h.enKisaRota({ evren, nereden: liman, nereye: kale });
    expect(kimsiz.adimlar[1].sartlar![0].durum).toBe('kisi_yok');
  });

  it('izin varış anında değerlendirilir: yola çıkışta geçerli izin geçide varınca bitmiş olabilir (D17)', () => {
    const { h, evren, liman, kale, elci, muhur } = kur();
    h.iliskiEkle({ evren, tur: 'izinli', a: elci, b: muhur, baslangic: '1 Tohum 500', bitis: '3 Tohum 500' });
    const erken = h.enKisaRota({ evren, nereden: liman, nereye: kale, kisi: elci, cikis: '1 Tohum 500' });
    expect(erken.adimlar[1].sartlar![0].durum).toBe('bitmis');
    const tarihsiz = h.enKisaRota({ evren, nereden: liman, nereye: kale, kisi: elci });
    expect(tarihsiz.adimlar[1].sartlar![0].durum).toBe('tarih_yok');
    h.iliskiEkle({ evren, tur: 'izinli', a: elci, b: muhur, baslangic: '1 Tohum 500', bitis: '20 Tohum 500' });
    const uygun = h.enKisaRota({ evren, nereden: liman, nereye: kale, kisi: elci, cikis: '1 Tohum 500' });
    expect(uygun.adimlar[1].sartlar![0].durum).toBe('gecerli');
    expect(() => h.enKisaRota({ evren, nereden: liman, nereye: kale, cikis: 'bir gün' })).toThrow('okunamadı');
  });

  it('yolculuk aşaması yolcunun geçide varıştaki iznini denetler; şartlar doğrulanır ve kaldırılabilir', () => {
    const { h, evren, kayit, gecit, kale, r2, elci, muhur } = kur();
    const y = kayit('Elçilik yolculuğu', 'yolculuk');
    h.iliskiEkle({ evren, tur: 'yolculukta', a: elci, b: y });
    h.iliskiEkle({ evren, tur: 'izinli', a: elci, b: muhur, baslangic: '1 Tohum 500', bitis: '3 Tohum 500' });
    h.yolculukYaz({ evren, kod: y, asamalar: [{ nereden: gecit, nereye: kale, rota: r2, cikis: '5 Tohum 500', varis: '7 Tohum 500', durum: 'gerceklesti' }] });
    expect(h.yolculuk({ evren, kod: y }).asamalar[0].uyari).toContain('bitmiş');
    expect(() => h.rotaSartlariYaz({ evren, rota: r2, sartlar: [{ tur: 'izin', kayit: null, aciklama: '' }] })).toThrow('seçin');
    expect(() => h.rotaSartlariYaz({ evren, rota: muhur, sartlar: [] })).toThrow('rota');
    h.rotaSartlariYaz({ evren, rota: r2, sartlar: [] });
    expect(h.rotaSartlari({ evren, rota: r2 })).toEqual([]);
    expect(h.yolculuk({ evren, kod: y }).asamalar[0].uyari).toBeNull();
  });
});
