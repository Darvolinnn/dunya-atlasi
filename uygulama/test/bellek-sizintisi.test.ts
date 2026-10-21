// Automerge belleği çöp toplayıcıya görünmez; geçici kopyalar elle bırakılmazsa her kayıtta belge kadar bellek birikir
// (3.000 kayıtta 1,2 GB, 70.000'de çökme). Bu sınama, sızıntı geri gelirse kırılır.
import { describe, it, expect, beforeAll } from 'vitest';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
// Ölçümden önce çöp toplayıcı çalıştırılır: yoksa sınama sızıntıyı değil, henüz toplanmamış çöpü ölçer.
// Node 24'te çöp toplayıcı daha geç çalıştığı için toplanmamış çöp 80 MB'ı aşıyordu (Node 22 ve 24 sınandı).
setFlagsFromString('--expose-gc');
const copTopla = runInNewContext('gc') as () => void;
// Süreç belleğinden JavaScript yığınının boş ayrılmış kısmı düşülür: Node bunu geri vermeden tutar (Node 24'te
// 2.000 kayıtta ~150 MB) ve sızıntı değildir. Automerge ve SQLite belleği (Wasm) yığının dışında, ölçümün içindedir.
const olc = () => { const m = process.memoryUsage(); return m.rss - m.heapTotal + m.heapUsed; };
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
    copTopla();
    const once = olc();
    for (let i = 50; i < 2050; i++) yaz(i);
    copTopla();
    const artis = (olc() - once) / 1e6;
    // Sızıntı varken bu kayıtlar ~450 MB biriktiriyordu (Automerge belleği çöp toplayıcıya görünmez); şimdi 5–20 MB.
    expect(artis).toBeLessThan(80);
  }, 120_000);
});
