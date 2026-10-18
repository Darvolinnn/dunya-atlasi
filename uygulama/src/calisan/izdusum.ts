// İşlemlerin görünen tablolara uygulanması. Her işlem türünün tek uygulayıcısı buradadır.
// Uygulayıcılar belirlenimcidir: aynı günlük her cihazda aynı tabloları üretir.
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { Islem } from '../alan/islem';
import { A } from '../alan/automerge';
import { baglantilar, duzMetin } from '../alan/metin-sema';
import { katla } from '../alan/turkce';

/** Görünen tabloların yapısı değişince artar; açılışta tablolar günlükten yeniden kurulur. */
export const IZDUSUM_SURUMU = 2;

export const IZDUSUM_SEMA = `
CREATE TABLE IF NOT EXISTS evren(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS kayitlar(
  kod TEXT PRIMARY KEY,
  tur TEXT NOT NULL,
  ad TEXT NOT NULL,
  ozet TEXT NOT NULL DEFAULT '',
  okunus TEXT NOT NULL DEFAULT '',
  karar TEXT NOT NULL,
  lakaplar TEXT NOT NULL DEFAULT '[]',
  onceki_adlar TEXT NOT NULL DEFAULT '[]',
  etiketler TEXT NOT NULL DEFAULT '[]',
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE TABLE IF NOT EXISTS metinler(
  kayit TEXT NOT NULL,
  alan TEXT NOT NULL,
  belge BLOB NOT NULL,
  duz TEXT NOT NULL,
  katli TEXT NOT NULL DEFAULT '',
  duzenleme INTEGER NOT NULL,
  PRIMARY KEY(kayit, alan)
);
CREATE TABLE IF NOT EXISTS baglantilar(
  kaynak TEXT NOT NULL,
  alan TEXT NOT NULL,
  sira INTEGER NOT NULL,
  hedef TEXT NOT NULL,
  metin TEXT NOT NULL,
  PRIMARY KEY(kaynak, alan, sira)
);
CREATE INDEX IF NOT EXISTS baglantilar_hedef ON baglantilar(hedef);
`;
export const IZDUSUM_TABLOLARI = ['evren', 'kayitlar', 'metinler', 'baglantilar'];

type Uygulayici = (db: Database, i: Islem) => void;

const evrenAlani = (db: Database, k: string, v: unknown) =>
  db.exec({ sql: 'INSERT INTO evren(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', bind: [k, String(v)] });

const DEGISEBILIR = new Set(['ad', 'tur', 'ozet', 'okunus', 'karar']);

function listeDegistir(db: Database, kod: string, sutun: 'lakaplar' | 'etiketler' | 'onceki_adlar', ekle?: unknown, cikar?: unknown) {
  const ham = db.selectValue(`SELECT ${sutun} FROM kayitlar WHERE kod=?`, [kod]) as string | undefined;
  if (ham === undefined) return;
  let liste: string[] = JSON.parse(ham);
  if (typeof cikar === 'string') liste = liste.filter((x) => x !== cikar);
  if (typeof ekle === 'string' && ekle && !liste.includes(ekle)) liste.push(ekle);
  db.exec({ sql: `UPDATE kayitlar SET ${sutun}=? WHERE kod=?`, bind: [JSON.stringify(liste), kod] });
}

// ---- Uzun metin (Automerge) ----
// Açık belgeler bellekte tutulur; her işlem bellekteki belgeye eklenir ve kaydedilir.
const belgeler = new WeakMap<Database, Map<string, A.Doc<{ t: string }>>>();
export function metinBelgesi(db: Database, kayit: string, alan: string): A.Doc<{ t: string }> | null {
  let m = belgeler.get(db);
  if (!m) { m = new Map(); belgeler.set(db, m); }
  const anahtar = kayit + '\u0000' + alan;
  let d = m.get(anahtar);
  if (!d) {
    const b = db.selectValue('SELECT belge FROM metinler WHERE kayit=? AND alan=?', [kayit, alan]) as Uint8Array | undefined;
    if (!b) return null;
    d = A.load<{ t: string }>(b);
    m.set(anahtar, d);
  }
  return d;
}
export function metinBelleginiTemizle(db: Database) { belgeler.delete(db); }

export const UYGULAYICILAR: Record<string, Uygulayici> = {
  evren_olustur(db, i) {
    evrenAlani(db, 'kod', i.veri.kod);
    evrenAlani(db, 'ad', i.veri.ad);
    evrenAlani(db, 'olusturma', i.zaman);
  },
  evren_adlandir(db, i) {
    evrenAlani(db, 'ad', i.veri.ad);
  },

  kayit_olustur(db, i) {
    const v = i.veri;
    db.exec({
      sql: `INSERT OR IGNORE INTO kayitlar(kod, tur, ad, ozet, karar, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?)`,
      bind: [v.kod as string, v.tur as string, v.ad as string, (v.ozet as string) ?? '', v.karar as string, i.zaman, i.zaman],
    });
  },
  kayit_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: string };
    if (!DEGISEBILIR.has(alan)) return;
    if (alan === 'ad') {
      const eski = db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [kod]) as string | undefined;
      if (eski && eski !== deger) listeDegistir(db, kod, 'onceki_adlar', eski, deger);
    }
    db.exec({ sql: `UPDATE kayitlar SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [deger, i.zaman, kod] });
  },
  kayit_lakap(db, i) {
    listeDegistir(db, i.veri.kod as string, 'lakaplar', i.veri.ekle, i.veri.cikar);
    db.exec({ sql: 'UPDATE kayitlar SET duzenleme=? WHERE kod=?', bind: [i.zaman, i.veri.kod as string] });
  },
  kayit_etiket(db, i) {
    listeDegistir(db, i.veri.kod as string, 'etiketler', i.veri.ekle, i.veri.cikar);
    db.exec({ sql: 'UPDATE kayitlar SET duzenleme=? WHERE kod=?', bind: [i.zaman, i.veri.kod as string] });
  },
  kayit_sil(db, i) {
    db.exec({ sql: 'UPDATE kayitlar SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  kayit_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE kayitlar SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },

  metin(db, i) {
    const { kayit, alan } = i.veri as { kayit: string; alan: string };
    if (!i.ikili) return;
    const onceki = metinBelgesi(db, kayit, alan) ?? A.init<{ t: string }>();
    const yeni = A.loadIncremental(onceki, i.ikili);
    belgeler.get(db)!.set(kayit + '\u0000' + alan, yeni);
    const spans = A.spans(yeni, ['t']) as never;
    const duz = duzMetin(spans);
    db.exec({
      sql: `INSERT INTO metinler(kayit, alan, belge, duz, katli, duzenleme) VALUES(?,?,?,?,?,?)
            ON CONFLICT(kayit, alan) DO UPDATE SET belge=excluded.belge, duz=excluded.duz, katli=excluded.katli, duzenleme=excluded.duzenleme`,
      bind: [kayit, alan, A.save(yeni), duz, katla(duz), i.zaman],
    });
    db.exec({ sql: 'DELETE FROM baglantilar WHERE kaynak=? AND alan=?', bind: [kayit, alan] });
    baglantilar(spans).forEach((b, sira) => db.exec({
      sql: 'INSERT INTO baglantilar(kaynak, alan, sira, hedef, metin) VALUES(?,?,?,?,?)', bind: [kayit, alan, sira, b.hedef, b.metin],
    }));
    db.exec({ sql: 'UPDATE kayitlar SET duzenleme=? WHERE kod=?', bind: [i.zaman, kayit] });
  },
};
