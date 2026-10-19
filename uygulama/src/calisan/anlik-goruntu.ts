// Anlık görüntü (§10.1): sonuç tablolarının belli bir işlemdeki hâli aynı veritabanında saklanır. Başka cihazdan
// daha önceye düşen bir işlem gelince tablolar baştan değil, o işlemden önceki en yakın görüntüden kurulur; yalnızca
// görüntüden sonraki işlemler yeniden uygulanır. Görüntü yalnızca bir hızlandırmadır: veri günlükte durur, görüntü
// silinse ya da kullanılamasa tablolar yine günlükten baştan kurulur.
//
// İki yuva tutulur (en son iki görüntü); böylece birkaç günlük çevrimdışı çalışmanın işlemleri de görüntülerden
// birinin sonrasına düşer. Satırların eklenme sırası (rowid) korunur; bazı listeler eşitlikte ona göre sıralanır.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { IZDUSUM_SURUMU, IZDUSUM_TABLOLARI } from './izdusum';

export type Anahtar = [number, string, number];
const karsilastir = (a: Anahtar, b: Anahtar) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || a[2] - b[2];

export interface Goruntu { yuva: number; anahtar: Anahtar; islem: number }

export function goruntuSemasi(db: Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS goruntuler(
    yuva INTEGER PRIMARY KEY, saat INTEGER NOT NULL, kurulum TEXT NOT NULL, sira INTEGER NOT NULL,
    islem INTEGER NOT NULL, surum INTEGER NOT NULL)`);
}

function goruntuler(db: Database): Goruntu[] {
  return db.selectObjects('SELECT * FROM goruntuler WHERE surum=? ORDER BY islem', [IZDUSUM_SURUMU]).map((r) => ({
    yuva: Number(r.yuva), anahtar: [Number(r.saat), String(r.kurulum), Number(r.sira)] as Anahtar, islem: Number(r.islem),
  }));
}

/** Son görüntünün alındığı andaki işlem sayısı (görüntü yoksa 0). */
export function sonGoruntuIslemi(db: Database): number {
  return Number(db.selectValue('SELECT max(islem) FROM goruntuler WHERE surum=?', [IZDUSUM_SURUMU]) ?? 0);
}

const tabloAdi = (yuva: number, t: string) => `goruntu${yuva}_${t}`;

function yuvayiSil(db: Database, yuva: number) {
  for (const t of IZDUSUM_TABLOLARI) db.exec(`DROP TABLE IF EXISTS ${tabloAdi(yuva, t)}`);
  db.exec({ sql: 'DELETE FROM goruntuler WHERE yuva=?', bind: [yuva] });
}

/** Tabloların şimdiki hâlini (son uygulanan işlem: anahtar) en eski yuvanın yerine kaydeder. Açık bir veritabanı işleminde çağrılır. */
export function goruntuAl(db: Database, anahtar: Anahtar, islem: number) {
  const mevcut = goruntuler(db);
  const yuva = mevcut.length < 2 ? [1, 2].find((y) => !mevcut.some((g) => g.yuva === y))! : mevcut[0].yuva;
  yuvayiSil(db, yuva);
  for (const t of IZDUSUM_TABLOLARI) db.exec(`CREATE TABLE ${tabloAdi(yuva, t)} AS SELECT rowid AS goruntu_rowid, * FROM ${t}`);
  db.exec({ sql: 'INSERT INTO goruntuler(yuva, saat, kurulum, sira, islem, surum) VALUES(?,?,?,?,?,?)', bind: [yuva, ...anahtar, islem, IZDUSUM_SURUMU] });
}

/** Anahtardan kesin önce alınmış en yeni görüntü. */
export function goruntuBul(db: Database, once: Anahtar): Goruntu | null {
  return goruntuler(db).filter((g) => karsilastir(g.anahtar, once) < 0).pop() ?? null;
}

/** Anahtarda ya da sonrasında alınmış görüntüleri siler (oraya daha önceye düşen bir işlem geldi); anahtar yoksa hepsini. */
export function goruntuleriSil(db: Database, anahtar?: Anahtar) {
  const yuvalar = db.selectObjects('SELECT yuva, saat, kurulum, sira, surum FROM goruntuler').filter((r) =>
    !anahtar || Number(r.surum) !== IZDUSUM_SURUMU || karsilastir([Number(r.saat), String(r.kurulum), Number(r.sira)], anahtar) >= 0);
  for (const r of yuvalar) yuvayiSil(db, Number(r.yuva));
  // Eski sürümden kalmış ve kaydı olmayan tablolar da gider.
  if (!anahtar) {
    for (const r of db.selectObjects("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'goruntu%\\_%' ESCAPE '\\'")) db.exec(`DROP TABLE IF EXISTS ${String(r.name)}`);
    db.exec('DELETE FROM goruntuler');
  }
}

/** Sonuç tablolarını görüntüdeki hâline getirir (satır sırası dahil). Açık bir veritabanı işleminde çağrılır. */
export function goruntuYukle(db: Database, yuva: number) {
  for (const t of IZDUSUM_TABLOLARI) {
    const sutunlar = db.selectObjects(`PRAGMA table_info(${t})`).map((r) => `"${String(r.name)}"`).join(', ');
    db.exec(`DELETE FROM ${t}`);
    db.exec(`INSERT INTO ${t}(rowid, ${sutunlar}) SELECT goruntu_rowid, ${sutunlar} FROM ${tabloAdi(yuva, t)} ORDER BY goruntu_rowid`);
  }
}
