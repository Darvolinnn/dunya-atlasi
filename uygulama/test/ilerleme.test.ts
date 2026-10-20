// Uzun süren baştan kurmanın ilerlemesi (§10.7): yalnızca çok işlemli evrende bildirilir, %100 ile biter.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { IlerlemeBildirimi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(bildirimler: IlerlemeBildirimi[] = []) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x', () => {}, null, null, undefined, (d) => bildirimler.push(d));
}

describe('baştan kurmanın ilerlemesi (§10.7)', () => {
  it('çok işlemli evrende yüzde bildirilir ve tamamlanır; az işlemlide bildirilmez', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kod = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const kucuk: IlerlemeBildirimi[] = [];
    cihaz(kucuk).evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(kucuk).toEqual([]);
    for (let i = 0; i < 5200; i++) h.kayitDegistir({ evren, kod, alan: 'ozet', deger: `Özet ${i}` });
    const yeni: IlerlemeBildirimi[] = [];
    cihaz(yeni).evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(yeni[0]).toMatchObject({ evren, neden: 'kurulum', yapilan: 0 });
    expect(yeni.at(-1)).toMatchObject({ yapilan: yeni[0].toplam, toplam: yeni[0].toplam });
    expect(yeni.length).toBeGreaterThan(2);
    expect(yeni.slice(0, -1).every((d) => d.yapilan < d.toplam)).toBe(true);
  }, 60_000); // 5.200 gerçek işlem yazılır; yük altındaki makinede 5 sn'yi aşıyor

  it('kurma hatayla yarıda kalırsa şerit kapanır', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kod = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    for (let i = 0; i < 5200; i++) h.kayitDegistir({ evren, kod, alan: 'ozet', deger: `Özet ${i}` });
    const islemler = h.islemleriVer({ evren, gorulen: {} });
    // Sondaki bir işlemin sıra bilgisi bozuk: alma yarıda hatayla biter.
    const son = islemler.at(-1)!;
    islemler[islemler.length - 1] = { ...son, saat: (son.saat ?? 0) + 99 };
    const b: IlerlemeBildirimi[] = [];
    expect(() => cihaz(b).evreniDisaridanKur({ kod: evren, islemler })).toThrow();
    expect(b[0]).toMatchObject({ yapilan: 0 });
    expect(b.at(-1)).toMatchObject({ yapilan: b[0].toplam, toplam: b[0].toplam });
  }, 60_000);
});
