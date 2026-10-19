// Metin kaydı ile kurtarma taslağının silinmesi aynı istekte (§10.7, inceleme 9): sayfa kayıttan hemen sonra
// kapanırsa kayıtlı yazının eski taslağı kalıp "Kurtar" ile ikinci kez eklenmesin.
import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { Spans } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const kayit = h.kayitOlustur({ evren, ad: 'Uydurma sahne', tur: 'sahne' }).kod;
  return { h, evren, kayit };
}
const metin = (s: string) => [{ type: 'block', value: { type: 'paragraph', parents: [], attrs: {} } }, { type: 'text', value: s }] as unknown as Spans;

describe('metin kaydı ve kurtarma taslağı', () => {
  it('kayıt isteğinden önce yazılmış taslak kayıtla birlikte silinir, sonra yazılan kalır', () => {
    const { h, evren, kayit } = kur();
    const anahtar = `${evren}:${kayit}:govde`;
    h.taslakYaz({ anahtar, deger: JSON.stringify({ spans: metin('Sur kapı'), temel: [], zaman: 1000 }) });
    const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
    const r = h.metinKaydet({ evren, kayit, alan: 'govde', spans: metin('Sur kapısı açıldı.'), temel, taslak: { anahtar, zaman: 2000 } });
    expect(h.taslakOku({ anahtar })).toBeNull();
    h.taslakYaz({ anahtar, deger: JSON.stringify({ spans: metin('Sur kapısı açıldı. Sonra'), temel: r.basliklar, zaman: 3000 }) });
    h.metinKaydet({ evren, kayit, alan: 'govde', spans: metin('Sur kapısı açıldı.'), temel: r.basliklar, taslak: { anahtar, zaman: 2500 } });
    expect(h.taslakOku({ anahtar })).not.toBeNull();
  });
});
