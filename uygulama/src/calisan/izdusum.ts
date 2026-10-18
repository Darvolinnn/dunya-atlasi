// İşlemlerin görünen tablolara uygulanması. Her işlem türünün tek uygulayıcısı buradadır.
// Uygulayıcılar belirlenimcidir: aynı günlük her cihazda aynı tabloları üretir.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { gorduMu, type Islem } from '../alan/islem';
import { A } from '../alan/automerge';
import { baglantilar, duzMetin } from '../alan/metin-sema';
import { katla } from '../alan/turkce';

/** Görünen tabloların yapısı değişince artar; açılışta tablolar günlükten yeniden kurulur. */
export const IZDUSUM_SURUMU = 4;

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
  tarih TEXT,
  alan_kararlari TEXT NOT NULL DEFAULT '{}',
  gorseller TEXT NOT NULL DEFAULT '[]',
  sahne_olayi TEXT,
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER,
  silen TEXT
);
CREATE INDEX IF NOT EXISTS kayitlar_sahne_olayi ON kayitlar(sahne_olayi);
CREATE TABLE IF NOT EXISTS iliskiler(
  kod TEXT PRIMARY KEY,
  tur TEXT NOT NULL,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  rol TEXT,
  baslangic TEXT,
  bitis TEXT,
  aciklama TEXT NOT NULL DEFAULT '',
  karar TEXT NOT NULL,
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS iliskiler_a ON iliskiler(a);
CREATE INDEX IF NOT EXISTS iliskiler_b ON iliskiler(b);
CREATE TABLE IF NOT EXISTS degisimler(
  kod TEXT PRIMARY KEY,
  olay TEXT NOT NULL,
  sahne TEXT,
  konu TEXT,
  metin TEXT NOT NULL,
  karar TEXT NOT NULL,
  olusturma INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS degisimler_olay ON degisimler(olay);
CREATE INDEX IF NOT EXISTS degisimler_konu ON degisimler(konu);
CREATE TABLE IF NOT EXISTS medya(
  ad TEXT PRIMARY KEY,
  tur TEXT NOT NULL,
  boyut INTEGER NOT NULL,
  en INTEGER,
  boy INTEGER,
  dosya_adi TEXT NOT NULL DEFAULT '',
  olusturma INTEGER NOT NULL
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
CREATE TABLE IF NOT EXISTS alan_yazanlari(
  nesne TEXT NOT NULL,
  alan TEXT NOT NULL,
  islem TEXT NOT NULL,
  kurulum TEXT NOT NULL,
  sira INTEGER NOT NULL,
  deger TEXT NOT NULL,
  zaman INTEGER NOT NULL,
  PRIMARY KEY(nesne, alan, islem)
);
CREATE TABLE IF NOT EXISTS silme_catismalari(
  kayit TEXT NOT NULL,
  silme TEXT NOT NULL,
  duzenleme TEXT NOT NULL,
  kurulum TEXT NOT NULL,
  sira INTEGER NOT NULL,
  tur TEXT NOT NULL,
  zaman INTEGER NOT NULL,
  PRIMARY KEY(kayit, duzenleme)
);
CREATE TABLE IF NOT EXISTS metin_yazanlari(
  kayit TEXT NOT NULL,
  alan TEXT NOT NULL,
  islem TEXT NOT NULL,
  kurulum TEXT NOT NULL,
  sira INTEGER NOT NULL,
  basliklar TEXT NOT NULL,
  temel TEXT,
  zaman INTEGER NOT NULL,
  PRIMARY KEY(kayit, alan, islem)
);
CREATE TABLE IF NOT EXISTS metin_catismalari(
  kayit TEXT NOT NULL,
  alan TEXT NOT NULL,
  a TEXT NOT NULL, a_kurulum TEXT NOT NULL, a_sira INTEGER NOT NULL, a_basliklar TEXT NOT NULL, a_zaman INTEGER NOT NULL,
  b TEXT NOT NULL, b_kurulum TEXT NOT NULL, b_sira INTEGER NOT NULL, b_basliklar TEXT NOT NULL, b_zaman INTEGER NOT NULL,
  temel TEXT NOT NULL,
  PRIMARY KEY(kayit, alan, a, b)
);
`;
export const IZDUSUM_TABLOLARI = ['evren', 'kayitlar', 'metinler', 'baglantilar', 'iliskiler', 'degisimler', 'medya',
  'alan_yazanlari', 'silme_catismalari', 'metin_yazanlari', 'metin_catismalari'];

type Uygulayici = (db: Database, i: Islem) => void;

const evrenAlani = (db: Database, k: string, v: unknown) =>
  db.exec({ sql: 'INSERT INTO evren(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', bind: [k, String(v)] });

const DEGISEBILIR = new Set(['ad', 'tur', 'ozet', 'okunus', 'karar']);

function listeDegistir(db: Database, kod: string, sutun: 'lakaplar' | 'etiketler' | 'onceki_adlar' | 'gorseller', ekle?: unknown, cikar?: unknown) {
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

// ---- Çatışmalar (§10.3, §10.6) ----
// Bir alanın "yazanları": o alana yazmış ve sonradan görülüp üzerine yazılmamış işlemler. Biri öbürünü
// görmeden iki cihaz aynı alana farklı değer yazdıysa ikisi de yazan olarak kalır: çatışma. Alanda görünen
// değer uygulama sırasında sonuncudur ama çatışma çözülene kadar iki değer de gösterilir (§2.2 kural 15).
// Çatışma, ikisini de görmüş yeni bir yazmayla çözülür.
function alanYaz(db: Database, i: Islem, nesne: string, alan: string, deger: unknown) {
  for (const y of db.selectObjects('SELECT islem, kurulum, sira FROM alan_yazanlari WHERE nesne=? AND alan=?', [nesne, alan])) {
    if (gorduMu(i, y.kurulum as string, Number(y.sira))) db.exec({ sql: 'DELETE FROM alan_yazanlari WHERE nesne=? AND alan=? AND islem=?', bind: [nesne, alan, y.islem as string] });
  }
  db.exec({ sql: 'INSERT OR REPLACE INTO alan_yazanlari(nesne, alan, islem, kurulum, sira, deger, zaman) VALUES(?,?,?,?,?,?,?)',
    bind: [nesne, alan, i.kod, i.kurulum, i.sira, JSON.stringify(deger ?? null), i.zaman] });
}

/** Silinmiş kayda, silmeyi görmemiş bir cihazdan gelen düzenleme: kayıt geri gelmez, düzenleme kaybolmaz (§10.6). */
const KAYDA_DOKUNAN = new Set(['kayit_degistir', 'kayit_lakap', 'kayit_etiket', 'kayit_tarih', 'kayit_alan_karar', 'kayit_gorsel', 'metin']);
const dokunulanKayit = (i: Islem) => (i.tur === 'metin' ? i.veri.kayit : i.veri.kod) as string;

function silmeDenetle(db: Database, i: Islem) {
  if (!KAYDA_DOKUNAN.has(i.tur) || (i.tur === 'metin' && i.veri.ilk)) return;
  const kayit = dokunulanKayit(i);
  const silen = db.selectValue('SELECT silen FROM kayitlar WHERE kod=? AND silindi IS NOT NULL', [kayit]) as string | undefined;
  if (!silen) return;
  const s = db.selectObject('SELECT kurulum, sira FROM islemler WHERE kod=?', [silen]);
  if (!s || gorduMu(i, s.kurulum as string, Number(s.sira))) return;
  db.exec({ sql: 'INSERT OR IGNORE INTO silme_catismalari(kayit, silme, duzenleme, kurulum, sira, tur, zaman) VALUES(?,?,?,?,?,?,?)',
    bind: [kayit, silen, i.kod, i.kurulum, i.sira, i.tur, i.zaman] });
}

/** Silme uygulanırken: bu silmeyi görmemiş ve daha önce uygulanmış düzenlemeler. */
function silmedenOnceki(db: Database, i: Islem) {
  const kayit = i.veri.kod as string;
  const adaylar = db.selectObjects(
    `SELECT kod, kurulum, sira, tur, zaman, veri FROM islemler
     WHERE (json_extract(veri,'$.kod')=? OR json_extract(veri,'$.kayit')=?)
       AND (saat < ? OR (saat = ? AND (kurulum < ? OR (kurulum = ? AND sira < ?))))`,
    [kayit, kayit, i.saat ?? 0, i.saat ?? 0, i.kurulum, i.kurulum, i.sira]);
  for (const r of adaylar) {
    if (!KAYDA_DOKUNAN.has(r.tur as string) || gorduMu(i, r.kurulum as string, Number(r.sira))) continue;
    if (r.tur === 'metin' && JSON.parse(r.veri as string).ilk) continue;
    db.exec({ sql: 'INSERT OR IGNORE INTO silme_catismalari(kayit, silme, duzenleme, kurulum, sira, tur, zaman) VALUES(?,?,?,?,?,?,?)',
      bind: [kayit, i.kod, r.kod as string, r.kurulum as string, Number(r.sira), r.tur as string, Number(r.zaman)] });
  }
}

/** Gördüğü düzenlemelerin silme çatışmalarını kapatır (geri yükleme ya da "silinmiş kalsın"). */
function silmeCatismalariniKapat(db: Database, i: Islem, kayit: string) {
  for (const r of db.selectObjects('SELECT duzenleme, kurulum, sira FROM silme_catismalari WHERE kayit=?', [kayit])) {
    if (gorduMu(i, r.kurulum as string, Number(r.sira))) db.exec({ sql: 'DELETE FROM silme_catismalari WHERE kayit=? AND duzenleme=?', bind: [kayit, r.duzenleme as string] });
  }
}

/** Paragraf dizisinde değişen bölge (temeldeki kapalı aralık). */
function degisenBolge(temel: string[], yeni: string[]): [number, number] | null {
  let bas = 0;
  while (bas < temel.length && bas < yeni.length && temel[bas] === yeni[bas]) bas++;
  if (bas === temel.length && bas === yeni.length) return null;
  let son = 0;
  while (son < temel.length - bas && son < yeni.length - bas && temel[temel.length - 1 - son] === yeni[yeni.length - 1 - son]) son++;
  const bitis = temel.length - son; // dışlayan
  return [bas, Math.max(bas, bitis - 1)];
}
const paragraflar = (d: A.Doc<{ t: string }>, basliklar: string[]) => duzMetin(A.spans(A.view(d, basliklar), ['t']) as never).split('\n');

/**
 * Aynı metne birbirini görmeden yazılmış iki değişiklik. Automerge ikisini de kaybetmeden birleştirir; aynı
 * paragraflara dokunduklarında inceleme için ortak başlangıç ve iki sürüm saklanır (§10.3).
 */
function metinYazanlari(db: Database, i: Islem, belge: A.Doc<{ t: string }>) {
  const { kayit, alan } = i.veri as { kayit: string; alan: string };
  const basliklar = (i.veri.basliklar as string[]) ?? [];
  const temel = (i.veri.temel as string[] | undefined) ?? null;
  for (const y of db.selectObjects('SELECT * FROM metin_yazanlari WHERE kayit=? AND alan=?', [kayit, alan])) {
    if (gorduMu(i, y.kurulum as string, Number(y.sira))) {
      db.exec({ sql: 'DELETE FROM metin_yazanlari WHERE kayit=? AND alan=? AND islem=?', bind: [kayit, alan, y.islem as string] });
      continue;
    }
    if (!temel) continue;
    try {
      const t = paragraflar(belge, temel);
      const a = degisenBolge(t, paragraflar(belge, basliklar));
      const b = degisenBolge(t, paragraflar(belge, JSON.parse(y.basliklar as string)));
      if (a && b && a[0] <= b[1] && b[0] <= a[1]) {
        db.exec({
          sql: `INSERT OR IGNORE INTO metin_catismalari(kayit, alan, a, a_kurulum, a_sira, a_basliklar, a_zaman, b, b_kurulum, b_sira, b_basliklar, b_zaman, temel)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          bind: [kayit, alan, y.islem as string, y.kurulum as string, Number(y.sira), y.basliklar as string, Number(y.zaman),
            i.kod, i.kurulum, i.sira, JSON.stringify(basliklar), i.zaman, JSON.stringify(temel)],
        });
      }
    } catch { /* geçmişte bulunamayan sürüm: kendiliğinden birleşmiş sayılır */ }
  }
  db.exec({ sql: 'INSERT OR REPLACE INTO metin_yazanlari(kayit, alan, islem, kurulum, sira, basliklar, temel, zaman) VALUES(?,?,?,?,?,?,?,?)',
    bind: [kayit, alan, i.kod, i.kurulum, i.sira, JSON.stringify(basliklar), temel ? JSON.stringify(temel) : null, i.zaman] });
}

/** Her işlemden sonra: silinmiş kayda gelen düzenleme mi? */
export function sonrasi(db: Database, i: Islem) { silmeDenetle(db, i); }

export const UYGULAYICILAR: Record<string, Uygulayici> = {
  evren_olustur(db, i) {
    evrenAlani(db, 'kod', i.veri.kod);
    evrenAlani(db, 'ad', i.veri.ad);
    evrenAlani(db, 'olusturma', i.zaman);
  },
  evren_adlandir(db, i) {
    evrenAlani(db, 'ad', i.veri.ad);
    alanYaz(db, i, 'evren', 'ad', i.veri.ad);
  },

  kayit_olustur(db, i) {
    const v = i.veri;
    db.exec({
      sql: `INSERT OR IGNORE INTO kayitlar(kod, tur, ad, ozet, karar, sahne_olayi, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?,?)`,
      bind: [v.kod as string, v.tur as string, v.ad as string, (v.ozet as string) ?? '', v.karar as string, (v.sahneOlayi as string) ?? null, i.zaman, i.zaman],
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
    alanYaz(db, i, kod, alan, deger);
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
    const kod = i.veri.kod as string;
    db.exec({ sql: 'UPDATE kayitlar SET silindi=?, silen=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.kod, kod] });
    silmeCatismalariniKapat(db, i, kod);
    silmedenOnceki(db, i);
  },
  kayit_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE kayitlar SET silindi=NULL, silen=NULL WHERE kod=?', bind: [i.veri.kod as string] });
    silmeCatismalariniKapat(db, i, i.veri.kod as string);
  },
  /** Yazar bir çatışmayı inceledi: silinmiş kayıt silinmiş kalır ya da birleşmiş metin olduğu gibi kalır. */
  catisma_coz(db, i) {
    const { tur, kayit, alan } = i.veri as { tur: string; kayit: string; alan?: string };
    if (tur === 'silme') silmeCatismalariniKapat(db, i, kayit);
    if (tur === 'metin') {
      for (const r of db.selectObjects('SELECT a, b, a_kurulum, a_sira, b_kurulum, b_sira FROM metin_catismalari WHERE kayit=? AND alan=?', [kayit, alan ?? 'govde'])) {
        if (gorduMu(i, r.a_kurulum as string, Number(r.a_sira)) && gorduMu(i, r.b_kurulum as string, Number(r.b_sira))) {
          db.exec({ sql: 'DELETE FROM metin_catismalari WHERE kayit=? AND alan=? AND a=? AND b=?', bind: [kayit, alan ?? 'govde', r.a as string, r.b as string] });
        }
      }
    }
  },

  kayit_tarih(db, i) {
    const { kod, tarih } = i.veri as { kod: string; tarih: unknown };
    db.exec({ sql: 'UPDATE kayitlar SET tarih=?, duzenleme=? WHERE kod=?', bind: [tarih ? JSON.stringify(tarih) : null, i.zaman, kod] });
    alanYaz(db, i, kod, 'tarih', tarih ?? null);
  },
  kayit_alan_karar(db, i) {
    const { kod, alan, karar } = i.veri as { kod: string; alan: string; karar: string };
    const ham = db.selectValue('SELECT alan_kararlari FROM kayitlar WHERE kod=?', [kod]) as string | undefined;
    if (ham === undefined) return;
    const k = JSON.parse(ham) as Record<string, string>;
    if (karar === 'kesin') delete k[alan]; else k[alan] = karar; // düz değer varsayılan olarak kesindir (K13)
    db.exec({ sql: 'UPDATE kayitlar SET alan_kararlari=?, duzenleme=? WHERE kod=?', bind: [JSON.stringify(k), i.zaman, kod] });
    alanYaz(db, i, kod, 'karar:' + alan, karar);
  },
  kayit_gorsel(db, i) {
    listeDegistir(db, i.veri.kod as string, 'gorseller', i.veri.ekle, i.veri.cikar);
    db.exec({ sql: 'UPDATE kayitlar SET duzenleme=? WHERE kod=?', bind: [i.zaman, i.veri.kod as string] });
  },

  iliski_ekle(db, i) {
    const v = i.veri as Record<string, unknown>;
    db.exec({
      sql: `INSERT OR IGNORE INTO iliskiler(kod, tur, a, b, rol, baslangic, bitis, aciklama, karar, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      bind: [v.kod as string, v.tur as string, v.a as string, v.b as string, (v.rol as string) ?? null,
        v.baslangic ? JSON.stringify(v.baslangic) : null, v.bitis ? JSON.stringify(v.bitis) : null, (v.aciklama as string) ?? '', v.karar as string, i.zaman, i.zaman],
    });
  },
  iliski_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (!['baslangic', 'bitis', 'aciklama', 'karar', 'rol'].includes(alan)) return;
    const d = alan === 'baslangic' || alan === 'bitis' ? (deger ? JSON.stringify(deger) : null) : deger;
    db.exec({ sql: `UPDATE iliskiler SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [d as string | null, i.zaman, kod] });
    alanYaz(db, i, kod, alan, deger ?? null);
  },
  iliski_sil(db, i) {
    db.exec({ sql: 'UPDATE iliskiler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  iliski_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE iliskiler SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },

  degisim_ekle(db, i) {
    const v = i.veri as Record<string, unknown>;
    db.exec({
      sql: 'INSERT OR IGNORE INTO degisimler(kod, olay, sahne, konu, metin, karar, olusturma) VALUES(?,?,?,?,?,?,?)',
      bind: [v.kod as string, v.olay as string, (v.sahne as string) ?? null, (v.konu as string) ?? null, v.metin as string, v.karar as string, i.zaman],
    });
  },
  degisim_sil(db, i) {
    db.exec({ sql: 'UPDATE degisimler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },

  medya_ekle(db, i) {
    const v = i.veri as Record<string, unknown>;
    db.exec({
      sql: 'INSERT OR IGNORE INTO medya(ad, tur, boyut, en, boy, dosya_adi, olusturma) VALUES(?,?,?,?,?,?,?)',
      bind: [v.ad as string, v.tur as string, v.boyut as number, (v.en as number) ?? null, (v.boy as number) ?? null, (v.dosyaAdi as string) ?? '', i.zaman],
    });
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
    if (!i.veri.ilk) metinYazanlari(db, i, yeni);
  },
};
