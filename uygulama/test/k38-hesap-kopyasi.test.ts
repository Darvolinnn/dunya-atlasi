// K38 (D4): ağır hesaplar evrenin kopyasında aynı sonucu verir; kopya asıl evrene dokunmaz.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { AGIR_ISTEKLER, kopyaAl, kopyaDamgasi, kopyadanHizmet } from '../src/calisan/hesap-kopyasi';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

describe('K38: hesap kopyası', () => {
  it('denetim ve sağlık taraması kopyada asıl evrendekiyle aynı; damga yalnız değişince değişir', () => {
    const dosyalar = new Map<string, Database>();
    const ac = (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
    const h = new Hizmet(ac, 'Masaüstü', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Sisli Kıyı' });
    const a = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    const b = h.kayitOlustur({ evren, ad: 'Mira', tur: 'karakter' }).kod;
    h.iliskiEkle({ evren, a, b, tur: 'dusman' });
    const v = h.hesapVeritabanlari(evren)!;
    const damga = kopyaDamgasi(v)!;
    expect(kopyaDamgasi(h.hesapVeritabanlari(evren))).toBe(damga);
    const k = kopyadanHizmet(sqlite3, kopyaAl(sqlite3, evren, v, damga));
    expect(k.hizmet.denetimler({ evren })).toEqual(h.denetimler({ evren }));
    expect(k.hizmet.saglikTaramasi({ evren })).toEqual(h.saglikTaramasi({ evren }));
    k.kapat();
    h.kayitDegistir({ evren, kod: a, alan: 'ozet', deger: 'Liman valisi.' });
    expect(kopyaDamgasi(h.hesapVeritabanlari(evren))).not.toBe(damga);
    expect(h.hesapVeritabanlari('yok00000000000000000000000')).toBeNull();
    for (const ad of AGIR_ISTEKLER) expect(typeof (h as unknown as Record<string, unknown>)[ad]).toBe('function');
  });
});
