// İşlemlerin görünen tablolara uygulanması. Her işlem türünün tek uygulayıcısı buradadır.
// Uygulayıcılar belirlenimcidir: aynı günlük her cihazda aynı tabloları üretir.
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { Islem } from '../alan/islem';

export const IZDUSUM_SEMA = `
CREATE TABLE IF NOT EXISTS evren(k TEXT PRIMARY KEY, v TEXT);
`;
export const IZDUSUM_TABLOLARI = ['evren'];

type Uygulayici = (db: Database, i: Islem) => void;

const evrenAlani = (db: Database, k: string, v: unknown) =>
  db.exec({ sql: 'INSERT INTO evren(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', bind: [k, String(v)] });

export const UYGULAYICILAR: Record<string, Uygulayici> = {
  evren_olustur(db, i) {
    evrenAlani(db, 'kod', i.veri.kod);
    evrenAlani(db, 'ad', i.veri.ad);
    evrenAlani(db, 'olusturma', i.zaman);
  },
  evren_adlandir(db, i) {
    evrenAlani(db, 'ad', i.veri.ad);
  },
};
