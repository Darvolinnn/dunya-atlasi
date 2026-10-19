// Çok büyük günlükte (bir seri: yüz binlerce işlem) günlüğü dışarı verme yığını taşırmamalı.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { EvrenVt } from '../src/calisan/evren-vt';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

describe('büyük günlük', () => {
  it('150.000 işlem tek seferde dışarı verilir', () => {
    const db = new sqlite3.oo1.DB(':memory:');
    new EvrenVt(db, 'k1'); // tabloları kurar
    const N = 150_000;
    db.exec('BEGIN');
    // Bilinmeyen türde işlem: uygulanmaz ama günlükte durur; kurulum hızlı kalsın.
    for (let i = 1; i <= N; i++) {
      db.exec({ sql: 'INSERT INTO islemler(kod,kurulum,sira,zaman,grup,tur,veri,ikili,gordu,saat) VALUES(?,?,?,?,?,?,?,?,?,?)',
        bind: [`k${i}`, 'k1', i, i, null, 'deneme_yok', '{}', null, JSON.stringify({ k1: i - 1 }), i] });
    }
    db.exec('COMMIT');
    const e = new EvrenVt(db, 'k1');
    const l = e.gorulmeyenler({});
    expect(l).toHaveLength(N);
    expect(l[N - 1].sira).toBe(N);
  }, 120_000);
});
