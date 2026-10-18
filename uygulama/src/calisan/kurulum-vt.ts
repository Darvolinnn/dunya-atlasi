// Kurulumun kendi veritabanı (§10.5): kurulum kodu ve adı, bu kurulumun taşıdığı evrenlerin dizini.
// Evrenin kendisi kendi dosyasındadır; buradaki ad yalnızca liste için tutulan bir kopyadır.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { yeniKod } from '../alan/kod';
import type { EvrenOzeti } from '../veri/api';

const SEMA = `
CREATE TABLE IF NOT EXISTS ayar(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS evrenler(kod TEXT PRIMARY KEY, ad TEXT NOT NULL, olusturma INTEGER NOT NULL, son_acilis INTEGER);
`;

export class KurulumVt {
  readonly kod: string;
  readonly ad: string;

  constructor(readonly db: Database, varsayilanAd: string) {
    db.exec(SEMA);
    let kod = db.selectValue("SELECT v FROM ayar WHERE k='kurulum_kodu'") as string | undefined;
    if (!kod) {
      kod = yeniKod();
      db.exec({ sql: "INSERT INTO ayar VALUES('kurulum_kodu', ?), ('kurulum_adi', ?), ('olusturma', ?)", bind: [kod, varsayilanAd, String(Date.now())] });
    }
    this.kod = kod;
    this.ad = db.selectValue("SELECT v FROM ayar WHERE k='kurulum_adi'") as string;
  }

  evrenler(): EvrenOzeti[] {
    return this.db.selectObjects('SELECT kod, ad, olusturma, son_acilis FROM evrenler ORDER BY coalesce(son_acilis, olusturma) DESC')
      .map((r) => ({ kod: r.kod as string, ad: r.ad as string, olusturma: Number(r.olusturma), sonAcilis: r.son_acilis == null ? null : Number(r.son_acilis) }));
  }

  evrenEkle(kod: string, ad: string, olusturma: number) {
    this.db.exec({ sql: 'INSERT INTO evrenler(kod, ad, olusturma) VALUES(?,?,?)', bind: [kod, ad, olusturma] });
  }

  evrenAdi(kod: string, ad: string) {
    this.db.exec({ sql: 'UPDATE evrenler SET ad=? WHERE kod=?', bind: [ad, kod] });
  }

  acildi(kod: string) {
    this.db.exec({ sql: 'UPDATE evrenler SET son_acilis=? WHERE kod=?', bind: [Date.now(), kod] });
  }
}
