import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const BOS = { heceler: [], siniflar: [], kurallar: [], ornekler: [], sozluk: [] };

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const kadim = kayit('Uydurma Kadim Dil', 'dil'), eski = kayit('Uydurma Eski Kuzeyce', 'dil');
  const liman = kayit('Uydurma Liman Lehçesi', 'dil'), guncel = kayit('Uydurma Güncel Kuzeyce', 'dil');
  h.iliskiEkle({ evren, tur: 'dil_kaynagi', a: eski, b: kadim });
  h.iliskiEkle({ evren, tur: 'dil_kaynagi', a: liman, b: eski });
  h.iliskiEkle({ evren, tur: 'dil_kaynagi', a: guncel, b: eski });
  h.dilYaz({ evren, kod: kadim, tanim: { ...BOS, sozluk: [{ bicim: 'velka', anlam: 'sisli', tur: 'kok' }, { bicim: 'ari', anlam: 'kıyı', tur: 'kok' }, { bicim: '-sa', anlam: 'yer', tur: 'sonek' }] } });
  h.dilYaz({ evren, kod: eski, tanim: { ...BOS, kurallar: [{ kural: 'aa → a', not: 'Ünlü düşmesi' }, { kural: 'a → ∅ / _#', not: '' }, { kural: 's → ∅ / _#', not: '' }] } });
  h.dilYaz({ evren, kod: liman, tanim: { ...BOS, kurallar: [{ kural: 'v → b / #_', not: '' }] } });
  h.dilYaz({ evren, kod: guncel, tanim: { ...BOS, kurallar: [{ kural: 'ar → er', not: '' }] } });
  return { h, evren, kayit, kadim, eski, liman, guncel };
}

describe('köken ağacı (K38, C5)', () => {
  it('sözlükteki sözcükten bütün türev dillere ağaç iner; kökün anlamı sözlükten gelir', () => {
    const { h, evren, kadim, eski, liman, guncel } = kur();
    const a = h.kokenAgaci({ evren, dil: kadim, bicim: 'velka' });
    expect(a.kok).toMatchObject({ bicim: 'velka', anlam: 'sisli' });
    expect(a.kok.dil.kod).toBe(kadim);
    const yol = Object.fromEntries(a.dallar.map((d) => [d.dil.kod, d.yol.map((y) => y.kod)]));
    expect(yol[eski]).toEqual([kadim, eski]);
    expect(yol[liman]).toEqual([kadim, eski, liman]);
    expect(yol[guncel]).toEqual([kadim, eski, guncel]);
  });
  it('bir adın kayıtlı türetme bağları yukarı izlenip en eski biçimden ağaç kurulur', () => {
    const { h, evren, kayit, kadim, eski, liman } = kur();
    const sehir = kayit('Uydurma Velkaris', 'sehir');
    const ust = h.adTuret({ evren, dil: kadim, bicim: 'Velkaarisa' });
    const eskiBicim = ust.find((x) => x.dil.kod === eski)!.bicim;
    h.adBicimiYaz({ evren, kod: sehir, dil: kadim, bicim: 'Velkaarisa' });
    h.adBicimiYaz({ evren, kod: sehir, dil: eski, bicim: eskiBicim, kaynakDil: kadim, kaynakBicim: 'Velkaarisa' });
    expect(h.dilAdlari({ evren, dil: eski })).toEqual([{ kayit: { kod: sehir, ad: 'Uydurma Velkaris', tur: 'sehir' }, bicim: eskiBicim }]);
    const a = h.kokenAgaci({ evren, dil: eski, kayit: sehir });
    expect(a.kok.dil.kod).toBe(kadim);
    expect(a.kok.bicim).toBe('Velkaarisa');
    expect(a.dallar.find((d) => d.dil.kod === eski)!.kayitli).toBe(eskiBicim);
    expect(a.dallar.find((d) => d.dil.kod === liman)!.bicim.startsWith('B')).toBe(true);
    // Türetme bağı olmayan biçimde kök o dildeki biçimdir.
    h.adBicimiYaz({ evren, kod: sehir, dil: liman, bicim: 'Elle yazılmış' });
    expect(h.kokenAgaci({ evren, dil: liman, kayit: sehir }).kok.bicim).toBe('Elle yazılmış');
    expect(() => h.kokenAgaci({ evren, dil: kadim, kayit: kayit('Biçimsiz', 'sehir') })).toThrow(/kayıtlı biçimi yok/);
  });
});
