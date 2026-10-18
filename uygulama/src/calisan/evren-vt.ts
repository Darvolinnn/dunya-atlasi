// Bir evrenin yerel veritabanı. Her evren ayrı dosyadır (ayrı eşitlenir ve yedeklenir, §10.1).
// Yazma tek yoldan yapılır: islemYap(). İşlem günlüğe yazılır ve aynı veritabanı işleminde uygulanır;
// görünen tablolar (izdüşüm) yalnızca işlemlerden türetilir ve yenidenKur() ile baştan üretilebilir.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { VERI_BICIMI, type Islem, type IslemGirdisi } from '../alan/islem';
import { yeniKod } from '../alan/kod';
import { UYGULAYICILAR, IZDUSUM_SEMA, IZDUSUM_TABLOLARI, metinBelleginiTemizle } from './izdusum';

const GUNLUK_SEMA = `
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS islemler(
  no INTEGER PRIMARY KEY,
  kod TEXT NOT NULL UNIQUE,
  kurulum TEXT NOT NULL,
  sira INTEGER NOT NULL,
  zaman INTEGER NOT NULL,
  grup TEXT,
  tur TEXT NOT NULL,
  veri TEXT NOT NULL,
  ikili BLOB,
  gordu TEXT NOT NULL,
  UNIQUE(kurulum, sira)
);
CREATE INDEX IF NOT EXISTS islemler_grup ON islemler(grup);
`;

export class VeriBicimiHatasi extends Error {}

export class EvrenVt {
  /** Bu kurulumun son sıra numarası ve bilinen her kurulumun son sırası (görülenler). */
  private gorulen: Record<string, number> = {};

  constructor(readonly db: Database, readonly kurulum: string) {
    db.exec('PRAGMA foreign_keys=ON;');
    db.exec(GUNLUK_SEMA);
    const bicim = db.selectValue("SELECT v FROM meta WHERE k='veri_bicimi'") as string | undefined;
    if (bicim === undefined) db.exec({ sql: "INSERT INTO meta VALUES('veri_bicimi', ?)", bind: [String(VERI_BICIMI)] });
    else if (Number(bicim) > VERI_BICIMI) throw new VeriBicimiHatasi(`Bu evren daha yeni bir sürümle kaydedilmiş (biçim ${bicim}). Güncelleme gerekli.`);
    db.exec(IZDUSUM_SEMA);
    for (const r of db.selectObjects('SELECT kurulum, max(sira) s FROM islemler GROUP BY kurulum')) {
      this.gorulen[r.kurulum as string] = Number(r.s);
    }
  }

  meta(k: string): string | undefined {
    return this.db.selectValue('SELECT v FROM meta WHERE k=?', [k]) as string | undefined;
  }

  /**
   * Bir ya da birden çok değişikliği tek işlem grubu olarak yazar ve uygular (§10.4).
   * Hepsi ya birlikte yazılır ya hiçbiri.
   */
  islemYap(girdiler: IslemGirdisi[], zaman = Date.now()): Islem[] {
    if (!girdiler.length) return [];
    const grup = girdiler.length > 1 ? yeniKod(zaman) : null;
    const yazilan: Islem[] = [];
    const onceki = { ...this.gorulen };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const g of girdiler) {
        const sira = (this.gorulen[this.kurulum] ?? 0) + 1;
        const islem: Islem = {
          kod: yeniKod(zaman), kurulum: this.kurulum, sira, zaman, grup,
          tur: g.tur, veri: g.veri, ikili: g.ikili ?? null,
          gordu: { ...this.gorulen },
        };
        this.kaydet(islem);
        this.uygula(islem);
        this.gorulen[this.kurulum] = sira;
        yazilan.push(islem);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      this.gorulen = onceki;
      metinBelleginiTemizle(this.db); // bellekteki belgeler geri alınan işlemi içermesin
      throw e;
    }
    return yazilan;
  }

  private kaydet(i: Islem) {
    this.db.exec({
      sql: 'INSERT INTO islemler(kod,kurulum,sira,zaman,grup,tur,veri,ikili,gordu) VALUES(?,?,?,?,?,?,?,?,?)',
      bind: [i.kod, i.kurulum, i.sira, i.zaman, i.grup, i.tur, JSON.stringify(i.veri), i.ikili ?? null, JSON.stringify(i.gordu)],
    });
  }

  private uygula(i: Islem) {
    const u = UYGULAYICILAR[i.tur];
    // Anlaşılmayan işlem atılmaz: günlükte kalır, yalnızca uygulanmaz (§10.7).
    if (u) u(this.db, i);
  }

  /** İzdüşüm tablolarını silip bütün günlüğü baştan uygular. Sınama ve onarım için. */
  yenidenKur() {
    metinBelleginiTemizle(this.db);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const t of IZDUSUM_TABLOLARI) this.db.exec(`DELETE FROM ${t}`);
      for (const i of this.islemler()) this.uygula(i);
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); metinBelleginiTemizle(this.db); throw e; }
  }

  islemler(sinir = -1, sondan = false): Islem[] {
    const rows = this.db.selectObjects(
      `SELECT * FROM islemler ORDER BY no ${sondan ? 'DESC' : 'ASC'} LIMIT ?`, [sinir]);
    return rows.map((r) => ({
      kod: r.kod as string, kurulum: r.kurulum as string, sira: Number(r.sira), zaman: Number(r.zaman),
      grup: (r.grup as string) ?? null, tur: r.tur as string, veri: JSON.parse(r.veri as string),
      ikili: (r.ikili as Uint8Array) ?? null, gordu: JSON.parse(r.gordu as string),
    }));
  }

  islemSayisi(): number {
    return Number(this.db.selectValue('SELECT count(*) FROM islemler'));
  }
}
