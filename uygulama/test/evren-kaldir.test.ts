// Evreni bu cihazdan kaldırma (§10.1): dosya silinir, liste ve ayarlar temizlenir; başka evrenlere ve öbür cihaza
// dokunulmaz; evren günlükten yeniden kurulabilir. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const silinen: string[] = [];
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x', () => {}, null, null, undefined, undefined, (ad) => { silinen.push(ad); dosyalar.delete(ad); });
  return { h, silinen };
}

describe('evreni bu cihazdan kaldırma (§10.1)', () => {
  it('liste, dosya ve ayarlar temizlenir; öbür evren kalır; günlükten yeniden kurulur', () => {
    const { h, silinen } = cihaz();
    const { kod: kuzey } = h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: guney } = h.evrenOlustur({ ad: 'Güney' });
    h.kayitOlustur({ evren: kuzey, ad: 'Elin', tur: 'karakter' });
    h.kayitOlustur({ evren: guney, ad: 'Daran', tur: 'karakter' });
    const { kod: dal } = h.dalOlustur({ evren: kuzey, ad: 'Deneme kopyası' });
    h.kayitlar({ evren: dal }); // deneme kopyası açılır
    h.evrenEsitlemeAyari({ evren: kuzey, esitlenir: false });
    const gunluk = h.islemleriVer({ evren: kuzey, gorulen: {} }); // başka bir cihazda ya da Drive'da duran kopya

    h.evrenKaldir({ evren: kuzey });
    expect(h.evrenler().map((e) => e.ad)).toEqual(['Güney']);
    expect(silinen).toEqual(expect.arrayContaining([`/evren-${kuzey}.db`, `/evren-${dal}.db`]));
    expect(() => h.kayitlar({ evren: kuzey })).toThrow();
    expect(h.kayitlar({ evren: guney }).map((k) => k.ad)).toEqual(['Daran']);
    expect(() => h.evrenKaldir({ evren: kuzey })).toThrow(/bulunamadı/);

    // Drive'dan yeniden indirme gibi: evren sıfırdan kurulur, ayarı (eşitlenmez) eski hâliyle kalmaz.
    h.evreniDisaridanKur({ kod: kuzey, islemler: gunluk });
    expect(h.kayitlar({ evren: kuzey }).map((k) => k.ad)).toEqual(['Elin']);
    expect(h.donemselYedekDurumu({ evren: kuzey }).esitlenir).toBe(true);
  });
});
