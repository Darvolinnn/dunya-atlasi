// Automerge belleği çöp toplayıcıya görünmez; geçici kopyalar elle bırakılmazsa her kayıtta belge kadar bellek birikir
// (3.000 kayıtta 1,2 GB, 70.000'de çökme). Bu sınama, sızıntı geri gelirse kırılır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const s = metinSemasi.schema;

describe('Automerge bellek sızıntısı', () => {
  it('2.000 metin kaydı belleği belirgin büyütmez', () => {
    const d = new Map<string, Database>();
    const h = new Hizmet((x) => { let db = d.get(x); if (!db) { db = new sqlite3.oo1.DB(':memory:'); d.set(x, db); } return db; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kayit = h.kayitOlustur({ evren, ad: 'Gece nöbeti', tur: 'sahne' }).kod;
    let temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
    const par = Array.from({ length: 40 }, (_, i) => `Paragraf ${i}: kapının ardında bekleyen muhafız mızrağını indirdi.`);
    const yaz = (i: number) => {
      par[i % par.length] = `Değişti ${i}: rüzgâr sert esiyordu.`;
      temel = h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, s.node('doc', null, par.map((p) => s.node('paragraph', null, [s.text(p)])))) as never, temel }).basliklar;
    };
    for (let i = 0; i < 50; i++) yaz(i); // ısınma
    const once = process.memoryUsage().rss;
    for (let i = 50; i < 2050; i++) yaz(i);
    const artis = (process.memoryUsage().rss - once) / 1e6;
    // Sızıntı varken bu kayıtlar ~500 MB biriktiriyordu; şimdi ~10 MB.
    expect(artis).toBeLessThan(80);
  }, 120_000);
});
