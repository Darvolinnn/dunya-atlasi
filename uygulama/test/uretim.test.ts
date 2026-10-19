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

describe('üretim ve kesinti (§15-5, F10)', () => {
  it('kesinti zinciri neyin etkilenebileceğini gösterir; dayanma süresi yoksa ne zaman denmez', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const kemer = kayit('Su kemeri', 'mekan');
    const su = kayit('Su', 'urun');
    const ekmek = kayit('Ekmek', 'urun');
    const firin = kayit('Fırıncılar', 'topluluk');
    const m1 = kayit('Değirmen mahallesi', 'mekan');
    const m2 = kayit('Liman mahallesi', 'mekan');
    const kuyu = kayit('Eski kuyu', 'mekan');
    const tuz = kayit('Tuz', 'urun');
    const yol = kayit('Tuz yolu', 'rota');
    const geyik = kayit('Kızıl geyik', 'canli');
    const kurt = kayit('Boz kurt', 'canli');
    const tavsan = kayit('Tavşan', 'canli');
    h.iliskiEkle({ evren, tur: 'uretir', a: kemer, b: su });
    h.iliskiEkle({ evren, tur: 'girdi', a: ekmek, b: su });
    h.iliskiEkle({ evren, tur: 'uretir', a: firin, b: ekmek });
    const { kod: b1 } = h.iliskiEkle({ evren, tur: 'bagimli', a: m1, b: su });
    h.iliskiEkle({ evren, tur: 'bagimli', a: m2, b: su });
    h.iliskiEkle({ evren, tur: 'acigi', a: m2, b: ekmek });
    h.iliskiEkle({ evren, tur: 'tasir', a: yol, b: tuz });
    h.iliskiEkle({ evren, tur: 'acigi', a: m1, b: tuz });
    h.iliskiEkle({ evren, tur: 'besin', a: kurt, b: geyik });
    h.iliskiEkle({ evren, tur: 'besin', a: kurt, b: tavsan });

    h.dayaniklilikYaz({ evren, iliski: b1, deger: { enAz: 3, enCok: 5, birim: 'gun', ikame: kuyu, not: 'Sarnıçlar' } });
    expect(() => h.dayaniklilikYaz({ evren, iliski: b1, deger: { enAz: 5, enCok: 3, birim: 'gun', ikame: null, not: '' } })).toThrow(/büyük/);

    const z = h.kesintiZinciri({ evren, kaynak: kemer });
    const ad = (k: string) => z.adimlar.find((x) => x.kayit.kod === k)!;
    expect(ad(su)).toMatchObject({ derinlik: 1, neden: 'üreticilerinden biri “Su kemeri”', digerKaynaklar: [] });
    expect(ad(ekmek)).toMatchObject({ derinlik: 2, neden: 'girdisi “Su”' });
    expect(ad(m1).dayaniklilik).toMatchObject({ enAz: 3, enCok: 5, ikameKayit: { ad: 'Eski kuyu' } });
    expect(ad(m2).dayaniklilik).toBeNull();
    // Liman mahallesi bir kez görünür (önce suya bağımlılıktan).
    expect(z.adimlar.filter((x) => x.kayit.kod === m2)).toHaveLength(1);
    expect(z.adimlar.some((x) => x.kayit.kod === firin)).toBe(false);

    // Yol kesilince ürün değil, açığı olan yer etkilenebilir.
    const y = h.kesintiZinciri({ evren, kaynak: yol });
    expect(y.adimlar.map((x) => x.kayit.ad)).toEqual(['Değirmen mahallesi']);
    expect(y.adimlar[0].neden).toContain('onu taşıyan yollardan biri');

    // Besin ağı: başka besini olan tür "başka kaynakları" ile gösterilir.
    const g = h.kesintiZinciri({ evren, kaynak: geyik });
    expect(g.adimlar[0]).toMatchObject({ kayit: { ad: 'Boz kurt' }, digerKaynaklar: [{ ad: 'Tavşan' }] });

    expect(h.uretimOzeti({ evren, urun: ekmek })).toMatchObject({ ureten: [{ ad: 'Fırıncılar' }], girdiler: [{ ad: 'Su' }], acigiOlan: [{ ad: 'Liman mahallesi' }] });
  });
});
