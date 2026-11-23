// Pano (K37): serbest tuval. Öğeler tek tek yazılır ve kimliğe göre birleşir; kaldırılan öğenin okları da gider.
// Adlar uydurmadır.
import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { yeniKod } from '../src/alan/kod';
import { islemAciklamasi } from '../src/alan/islem-metni';
import type { TuvalOgesi } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  return { h, evren: h.evrenOlustur({ ad: 'Uydurma evren' }).kod };
}
const oge = (x: Partial<TuvalOgesi>): Partial<TuvalOgesi> => ({ id: yeniKod(), x: 10, y: 20, g: 160, h: 100, aci: 0, sira: 1, renk: 'sari', metin: '', ...x });

describe('pano (K37)', () => {
  it('pano kurulur; kart, not ve ok yazılır, kart kaydın adını taşır', () => {
    const { h, evren } = kur();
    const kayit = h.kayitOlustur({ evren, ad: 'Uydurma Ada', tur: 'karakter', ozet: 'Kısa' }).kod;
    const { kod } = h.derlemeOlustur({ evren, tur: 'tuval', ad: 'Uydurma pano' });
    expect(h.derlemeler({ evren, tur: 'tuval' }).map((d) => d.ad)).toEqual(['Uydurma pano']);
    expect(h.derlemeler({ evren, tur: 'pano' })).toEqual([]);
    const kart = oge({ tur: 'kart', kayit }), not = oge({ tur: 'not', metin: 'Bir not', sira: 2 });
    h.tuvalOgeYaz({ evren, kod, ogeler: [kart, not] });
    const ok = oge({ tur: 'ok', bas: kart.id, son: not.id, metin: 'kardeşi', sira: 3 });
    h.tuvalOgeYaz({ evren, kod, ogeler: [ok] });
    const t = h.tuval({ evren, kod });
    expect(t.ogeler.map((o) => o.tur)).toEqual(['kart', 'not', 'ok']);
    expect(t.kartlar[kayit]).toMatchObject({ ad: 'Uydurma Ada', tur: 'karakter', ozet: 'Kısa', silindi: false });
    expect(t.ogeler[0].renk).toBe('sari');
    h.tuvalOgeYaz({ evren, kod, ogeler: [{ ...t.ogeler[1], x: 500, aci: 15 }] });
    expect(h.tuval({ evren, kod }).ogeler.find((o) => o.id === not.id)).toMatchObject({ x: 500, aci: 15, metin: 'Bir not' });
    h.tuvalOgeSil({ evren, kod, idler: [kart.id!] });
    expect(h.tuval({ evren, kod }).ogeler.map((o) => o.tur)).toEqual(['not']);
    const g = h.islemGunlugu({ evren, sinir: 3 }).map((i) => islemAciklamasi(i.tur, i.veri as Record<string, unknown>));
    expect(g).toContain('“Uydurma pano” panosu: bir öğe kaldırıldı');
  });

  it('geçersiz öğe reddedilir; kalem çizgisi kutuya sığdırılır', () => {
    const { h, evren } = kur();
    const { kod } = h.derlemeOlustur({ evren, tur: 'tuval', ad: 'P' });
    expect(() => h.tuvalOgeYaz({ evren, kod, ogeler: [oge({ tur: 'kart', kayit: yeniKod() })] })).toThrow('Kartın kaydı');
    expect(() => h.tuvalOgeYaz({ evren, kod, ogeler: [oge({ tur: 'ok', bas: 'a', son: 'b' } as never)] })).toThrow('Ok');
    expect(() => h.tuvalOgeYaz({ evren, kod, ogeler: [oge({ tur: 'uydurma' as never })] })).toThrow('türü');
    const k = oge({ tur: 'kalem', cizgi: [0, 0, 500, 2000, -5, 1000] });
    h.tuvalOgeYaz({ evren, kod, ogeler: [k] });
    expect(h.tuval({ evren, kod }).ogeler[0].cizgi).toEqual([0, 0, 500, 1000, 0, 1000]);
    expect(() => h.derleme({ evren, kod })).toThrow('Pano sayfasından');
  });
});
