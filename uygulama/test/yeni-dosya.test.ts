// Yeni evren dosyası bütün tablolarıyla tek veritabanı işleminde kurulur (tarayıcıda saniyeler süren tablo tablo
// kaydetme yerine). Kurulan yapı, sürüm değişince baştan kurulan yapıyla aynı olmalı.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { EvrenVt } from '../src/calisan/evren-vt';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const yapi = (db: InstanceType<typeof sqlite3.oo1.DB>) => db.selectObjects("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name");

describe('yeni evren dosyası', () => {
  it('tek işlemde kurulan yapı, yeniden kurulan yapıyla aynı; sürüm bilgisi yazılı', () => {
    const db = new sqlite3.oo1.DB(':memory:');
    const e = new EvrenVt(db, 'k1');
    e.islemYap([{ tur: 'evren_olustur', veri: { kod: 'x', ad: 'Hatıra' } }]);
    const once = yapi(db);
    expect(db.selectValue("SELECT v FROM meta WHERE k='izdusum_surumu'")).toBeTruthy();
    expect(db.selectValue("SELECT v FROM meta WHERE k='veri_bicimi'")).toBeTruthy();
    // Sürüm eskiymiş gibi yapılır: eski yol tabloları silip yeniden kurar.
    db.exec("UPDATE meta SET v='0' WHERE k='izdusum_surumu'");
    const yeniden = new EvrenVt(db, 'k1');
    expect(yapi(db)).toEqual(once);
    expect(yeniden.db.selectValue("SELECT v FROM evren WHERE k='ad'")).toBe('Hatıra');
  });
});
