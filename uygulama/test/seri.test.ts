// Seri (K27, Model §3): eser bir serinin altına yerleşir; sıra önerilen okuma sırasıdır. Seriyi silmek eserlerin
// yerine dokunmaz; geri getirince eserler altına döner, arada başka yere taşınan eser yerinde kalır. Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad = 'Masaüstü') {
  const dosyalar = new Map<string, Database>();
  return new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, ad, 'x');
}
const adlar = (h: Hizmet, evren: string) => {
  const r = h.seriler({ evren });
  return { seriler: r.seriler.map((s) => [s.ad, s.eserler.map((x) => x.ad)]), serisiz: r.serisiz.map((x) => x.ad) };
};

describe('seri (K27)', () => {
  it('eser seriye yerleşir, sıralanır, çıkarılır; eserin içi değişmez', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const seri = h.kayitOlustur({ evren, ad: 'Hatıra İmparatorluğu', tur: 'seri' }).kod;
    const [i, ii, iii] = ['Unutulanlar', 'Hatırlayanlar', 'Son Hatıra'].map((ad) => h.kayitOlustur({ evren, ad, tur: 'eser' }).kod);
    const sahne = h.anlatiOlustur({ evren, ust: i, ad: 'Arşivde', tur: 'sahne' }).kod;
    expect(adlar(h, evren)).toEqual({ seriler: [['Hatıra İmparatorluğu', []]], serisiz: ['Unutulanlar', 'Hatırlayanlar', 'Son Hatıra'] });
    for (const x of [i, ii, iii]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
    h.anlatiYerlestir({ evren, kod: iii, ust: seri, sira: 0 }); // öncül gibi başa
    expect(adlar(h, evren).seriler[0][1]).toEqual(['Son Hatıra', 'Unutulanlar', 'Hatırlayanlar']);
    expect(h.eserYapisi({ evren, eser: i }).dogrudan.map((s) => s.kod)).toEqual([sahne]);
    // Eser başka bir eserin ya da bölümün içine giremez; seri bir yere yerleşmez.
    expect(() => h.anlatiYerlestir({ evren, kod: ii, ust: i })).toThrow('serinin');
    expect(() => h.anlatiYerlestir({ evren, kod: seri, ust: null })).toThrow();
    h.anlatiYerlestir({ evren, kod: ii, ust: null });
    expect(adlar(h, evren)).toEqual({ seriler: [['Hatıra İmparatorluğu', ['Son Hatıra', 'Unutulanlar']]], serisiz: ['Hatırlayanlar'] });
    expect(h.kayitSablonu({ evren, kod: seri }).sorular[0]).toMatchObject({ kod: 'seri.1', metin: 'Serinin büyük sorusu ne?' });
  });

  it('seri silinince eserler serisiz görünür; geri gelince döner, arada taşınan eser yerinde kalır', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const seri = h.kayitOlustur({ evren, ad: 'Hatıra İmparatorluğu', tur: 'seri' }).kod;
    const kiyi = h.kayitOlustur({ evren, ad: 'Kıyı Hikâyeleri', tur: 'seri' }).kod;
    const [i, ii, iii] = ['Unutulanlar', 'Hatırlayanlar', 'Son Hatıra'].map((ad) => h.kayitOlustur({ evren, ad, tur: 'eser' }).kod);
    for (const x of [i, ii, iii]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
    h.kayitSil({ evren, kod: seri });
    expect(adlar(h, evren)).toEqual({ seriler: [['Kıyı Hikâyeleri', []]], serisiz: ['Unutulanlar', 'Hatırlayanlar', 'Son Hatıra'] });
    h.anlatiYerlestir({ evren, kod: ii, ust: kiyi });
    h.kayitGeriYukle({ evren, kod: seri });
    expect(adlar(h, evren)).toEqual({ seriler: [['Hatıra İmparatorluğu', ['Unutulanlar', 'Son Hatıra']], ['Kıyı Hikâyeleri', ['Hatırlayanlar']]], serisiz: [] });
  });

  it('iki cihazda yerleşme eşitlenir; tablolar günlükten aynı kurulur', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Hatıra' });
    const seri = m.kayitOlustur({ evren, ad: 'Hatıra İmparatorluğu', tur: 'seri' }).kod;
    const i = m.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    t.anlatiYerlestir({ evren, kod: i, ust: seri });
    m.islemleriAl({ evren, islemler: t.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) }) });
    expect(adlar(m, evren)).toEqual(adlar(t, evren));
    expect(adlar(m, evren).seriler[0][1]).toEqual(['Unutulanlar']);
    (m as unknown as { evren(k: string): { yenidenKur(): void } }).evren(evren).yenidenKur();
    expect(adlar(m, evren).seriler[0][1]).toEqual(['Unutulanlar']);
  });
});
