// K38: bütün yedekleri doğrulama. Bellekte sahte yedek klasörü; adlar uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekKlasor } from '../src/calisan/klasor-tasiyici';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: new Uint8Array([7]) });

describe('K38: bütün yedekleri doğrula', () => {
  it('sağlam yedek ve görsel sağlam; bozulan yedek ve görsel bildirilir; hiçbir şey değişmez', async () => {
    const klasor = new BellekKlasor();
    const dosyalar = new Map<string, Database>();
    const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
    const h = new Hizmet(ac, 'Masaüstü', 'x', () => {}, new BellekDeposu(), sahteIsleyici);
    h.yerelKlasorAyarla(klasor, 'C:\\Yedekler');
    const { kod: evren } = h.evrenOlustur({ ad: 'Sisli Kıyı' });
    const v = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    await h.gorselEkle({ evren, kod: v, dosyaAdi: 'v.png', tur: 'image/png', veri: new Uint8Array([1, 2, 3]) });
    await h.yerelYedekAl({ evren });

    let d = await h.yedekleriDogrula({ evren, yer: 'yerel' });
    expect(d.yedekler).toHaveLength(1);
    expect(d.yedekler[0].saglam).toBe(true);
    expect(d.gorseller).toEqual({ denetlenen: 1, bozuk: [] });

    const zip = [...klasor.dosyalar.keys()].find((a) => a.endsWith('.zip'))!;
    const gorsel = [...klasor.dosyalar.keys()].find((a) => /^medya\/[0-9a-f]{64}$/.test(a))!;
    klasor.dosyalar.set(zip, klasor.dosyalar.get(zip)!.slice(0, 40));
    klasor.dosyalar.set(gorsel, new Uint8Array([9]));
    const once = new Map(klasor.dosyalar);
    once.delete('yedek-listesi.json'); // liste yalnız hız içindir; bozulan dosya orada işaretlenir
    d = await h.yedekleriDogrula({ evren, yer: 'yerel' });
    expect(d.yedekler[0].saglam).toBe(false);
    expect(d.yedekler[0].ileti).toBeTruthy();
    expect(d.gorseller.bozuk).toEqual([gorsel.slice('medya/'.length)]);
    const sonra = new Map(klasor.dosyalar);
    sonra.delete('yedek-listesi.json');
    expect(sonra).toEqual(once);
    // Bozulan yedek sonraki doğrulamada da bildirilir.
    expect((await h.yedekleriDogrula({ evren, yer: 'yerel' })).yedekler[0].saglam).toBe(false);
    await expect(h.yedekleriDogrula({ evren, yer: 'drive' })).rejects.toThrow(/Drive/);
  });
});
