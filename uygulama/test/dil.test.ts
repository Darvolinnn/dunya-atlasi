import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { adUret } from '../src/calisan/dil';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const BOS = { heceler: [], siniflar: [], kurallar: [], ornekler: [], sozluk: [] };

describe('dil tarihi ve ad türetme (§15-4)', () => {
  it('antik addan dönemlere ve ödünç alan dile biçim türetir; kuralları ve örnekleri gösterir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const eski = kayit('Eski Varn dili', 'dil');
    const orta = kayit('Orta Varn dili', 'dil');
    const lehce = kayit('Kıyı lehçesi', 'dil');
    const yabanci = kayit('Tesk dili', 'dil');
    h.iliskiEkle({ evren, tur: 'dil_kaynagi', a: orta, b: eski });
    h.iliskiEkle({ evren, tur: 'dil_kaynagi', a: lehce, b: orta });
    h.iliskiEkle({ evren, tur: 'dil_kaynagi', a: yabanci, b: eski });
    h.dilYaz({ evren, kod: orta, tanim: { ...BOS, kurallar: [{ kural: 'k → h / #_', not: 'Baştaki k yumuşar' }, { kural: 'u → o', not: '' }],
      ornekler: [{ kaynak: 'kutar', beklenen: 'hotar' }, { kaynak: 'kal', beklenen: 'kel' }] } });
    h.dilYaz({ evren, kod: lehce, tanim: { ...BOS, kurallar: [{ kural: 'V → ∅ / C_#', not: '' }, { kural: 'x → y / _Q', not: '' }] } });
    h.dilYaz({ evren, kod: yabanci, tanim: { ...BOS, siniflar: [{ ad: 'S', harfler: 'tk' }], kurallar: [{ kural: 'S → s / _V', not: '' }] } });
    expect(() => h.dilYaz({ evren, kod: orta, tanim: { ...BOS, siniflar: [{ ad: 'ab', harfler: 'x' }] } })).toThrow(/büyük harf/);

    const b = h.dil({ evren, kod: orta });
    expect(b.kaynaklar.map((x) => x.ad)).toEqual(['Eski Varn dili']);
    expect(b.turevler.map((x) => x.ad)).toEqual(['Kıyı lehçesi']);
    expect(b.ornekler.map((o) => [o.sonuc, o.tutuyor])).toEqual([['hotar', true], ['hal', false]]);
    expect(h.dil({ evren, kod: lehce }).kuralHatalari).toMatchObject([{ sira: 1 }]);

    const kale = kayit('Kutara', 'sehir');
    const t = h.adTuret({ evren, dil: eski, bicim: 'Kutara', kayit: kale });
    const bul = (k: string) => t.find((x) => x.dil.kod === k)!;
    expect(bul(orta)).toMatchObject({ bicim: 'Hotara', kaynakBicim: 'Kutara' });
    expect(bul(orta).iz.map((x) => x.kural)).toEqual(['k → h / #_', 'u → o']);
    expect(bul(lehce)).toMatchObject({ bicim: 'Hotar', kaynakBicim: 'Hotara', hata: expect.stringMatching(/okunamadı/) });
    expect(bul(lehce).yol.map((x) => x.ad)).toEqual(['Eski Varn dili', 'Orta Varn dili', 'Kıyı lehçesi']);
    expect(bul(yabanci).bicim).toBe('Susara');

    // Yazar seçmeden ad değişmez; seçince kaydın o dildeki biçimi olur.
    expect(h.kayit({ evren, kod: kale }).ad).toBe('Kutara');
    h.adBicimiYaz({ evren, kod: kale, dil: orta, bicim: 'Hotara', kaynakDil: eski, kaynakBicim: 'Kutara' });
    expect(h.adBicimleri({ evren, kod: kale })).toMatchObject([{ dil: { ad: 'Orta Varn dili' }, bicim: 'Hotara', turetildi: { kaynakBicim: 'Kutara' } }]);
    expect(h.adTuret({ evren, dil: eski, bicim: 'Kutara', kayit: kale }).find((x) => x.dil.kod === orta)!.kayitli).toBe('Hotara');
    expect(h.kayit({ evren, kod: kale }).ad).toBe('Kutara');
    h.adBicimiYaz({ evren, kod: kale, dil: orta, bicim: null });
    expect(h.adBicimleri({ evren, kod: kale })).toEqual([]);
    expect(h.sesDene({ evren, dil: orta, bicim: 'kum' }).sonuc).toBe('hom');
  });

  it('ad üretici ve dil yeterliliği', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const dil = h.kayitOlustur({ evren, ad: 'Varn dili', tur: 'dil' }).kod;
    expect(() => h.adUret({ evren, dil, kip: 'hece', enAz: 2, enCok: 3, adet: 5 })).toThrow(/hece yok/);
    h.dilYaz({ evren, kod: dil, tanim: { ...BOS, heceler: ['ka', 'ra', 'ven'], sozluk: [{ bicim: 'kar', anlam: 'kara', tur: 'kok' }, { bicim: '-dun', anlam: 'kale', tur: 'sonek' }] } });
    h.kayitOlustur({ evren, ad: 'Kara', tur: 'sehir' });
    const l = h.adUret({ evren, dil, kip: 'hece', enAz: 2, enCok: 2, adet: 9 });
    expect(l.length).toBe(9);
    expect(l.every((x) => x.parcalar.length === 2)).toBe(true);
    expect(l.find((x) => x.ad === 'Kara')?.varOlan).toBe(true);
    const e = (h as unknown as { evren(k: string): Parameters<typeof adUret>[0] }).evren(evren);
    const b = adUret(e, dil, 'bicim', 1, 1, 1, () => 0.1);
    expect(b[0]).toMatchObject({ ad: 'Kardun', parcalar: [{ bicim: 'kar', anlam: 'kara' }, { bicim: 'dun', anlam: 'kale' }] });

    const kisi = h.kayitOlustur({ evren, ad: 'Ulak Sema', tur: 'karakter' }).kod;
    const { kod: il } = h.iliskiEkle({ evren, tur: 'dil_bilir', a: kisi, b: dil });
    h.dilYeterliligiYaz({ evren, iliski: il, deger: { konusma: 'iyi', anlama: 'iyi', okuma: 'yok', yazma: null, not: 'Okuma bilmez' } });
    expect(h.kisiDilleri({ evren, kod: kisi })).toMatchObject([{ dil: { ad: 'Varn dili' }, yeterlilik: { konusma: 'iyi', okuma: 'yok', yazma: null } }]);
    expect(h.dil({ evren, kod: dil }).bilenler).toMatchObject([{ kisi: { ad: 'Ulak Sema' } }]);
    expect(() => h.dilYeterliligiYaz({ evren, iliski: il, deger: { konusma: 'yuzde' as never, anlama: null, okuma: null, yazma: null, not: '' } })).toThrow(/düzey/);
  });
});
