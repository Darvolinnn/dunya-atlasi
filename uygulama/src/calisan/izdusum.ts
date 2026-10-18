// İşlemlerin görünen tablolara uygulanması. Her işlem türünün tek uygulayıcısı buradadır.
// Uygulayıcılar belirlenimcidir: aynı günlük her cihazda aynı tabloları üretir.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { gorduMu, type Islem } from '../alan/islem';
import { A } from '../alan/automerge';
import { baglantilar, duzMetin } from '../alan/metin-sema';
import { katla } from '../alan/turkce';
import { siraGecerli } from '../alan/sira';
import { sablonGecerli } from '../alan/sablon';
import { etkiAc } from './etki';
import { gorunurlukGecerli, sadeGercekMi } from '../alan/gorunurluk';
import { BILGI_ALANLARI, IDDIA_ALANLARI, bilgiDegeri, iddiaDegeri } from '../alan/bilgi';
import { tarihCoz, tarihMi, takvimGecerli, VARSAYILAN_TAKVIM, type Takvim } from '../alan/tarih';

/** Evrenin şu anki takvimi (§3.4). */
export function takvimOku(db: Database): Takvim {
  const ham = db.selectValue("SELECT v FROM evren WHERE k='takvim'") as string | undefined;
  return ham ? JSON.parse(ham) : VARSAYILAN_TAKVIM;
}
/** Tarihin ekseni her zaman ifadeden ve evrenin o anki takviminden hesaplanır; başka cihazın hesabına güvenilmez. */
function tz(db: Database, t: unknown): unknown {
  return tarihMi(t) ? tarihCoz(t.ifade, takvimOku(db)) : t;
}
const sinirTz = (db: Database, s: unknown) => (s && typeof s === 'object' && (s as { tarih?: unknown }).tarih ? { ...(s as object), tarih: tz(db, (s as { tarih: unknown }).tarih) } : s);
const json = (v: unknown) => (v ? JSON.stringify(v) : null);

/** Takvim değişti: bütün tarihlerin ekseni yeniden hesaplanır, ifadeler korunur. */
function tarihleriYenidenHesapla(db: Database) {
  const t = takvimOku(db);
  const yeni = (ham: unknown) => (ham ? JSON.stringify(tarihCoz(JSON.parse(ham as string).ifade, t)) : null);
  for (const r of db.selectObjects('SELECT kod, tarih FROM kayitlar WHERE tarih IS NOT NULL')) db.exec({ sql: 'UPDATE kayitlar SET tarih=? WHERE kod=?', bind: [yeni(r.tarih), r.kod as string] });
  for (const r of db.selectObjects('SELECT kod, baslangic, bitis FROM iliskiler WHERE baslangic IS NOT NULL OR bitis IS NOT NULL')) {
    db.exec({ sql: 'UPDATE iliskiler SET baslangic=?, bitis=? WHERE kod=?', bind: [yeni(r.baslangic), yeni(r.bitis), r.kod as string] });
  }
  const sinir = (ham: unknown) => (ham ? JSON.stringify(sinirTz(db, JSON.parse(ham as string))) : null);
  for (const tablo of ['durumlar', 'bilgiler']) {
    for (const r of db.selectObjects(`SELECT kod, baslangic, bitis FROM ${tablo} WHERE baslangic IS NOT NULL OR bitis IS NOT NULL`)) {
      db.exec({ sql: `UPDATE ${tablo} SET baslangic=?, bitis=? WHERE kod=?`, bind: [sinir(r.baslangic), sinir(r.bitis), r.kod as string] });
    }
  }
  for (const r of db.selectObjects('SELECT kayit, alan, deger FROM alan_degerleri')) {
    const d = JSON.parse(r.deger as string);
    if (tarihMi(d)) db.exec({ sql: 'UPDATE alan_degerleri SET deger=? WHERE kayit=? AND alan=?', bind: [JSON.stringify(tz(db, d)), r.kayit as string, r.alan as string] });
  }
}

/** Görünen tabloların yapısı değişince artar; açılışta tablolar günlükten yeniden kurulur. */
export const IZDUSUM_SURUMU = 12;

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
  gorunurluk TEXT,
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
  gorunurluk TEXT,
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
CREATE TABLE IF NOT EXISTS anlati(
  kod TEXT PRIMARY KEY,
  ust TEXT NOT NULL,
  konum TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS anlati_ust ON anlati(ust, konum);
CREATE TABLE IF NOT EXISTS durumlar(
  kod TEXT PRIMARY KEY,
  konu TEXT NOT NULL,
  ozellik TEXT NOT NULL,
  deger TEXT NOT NULL DEFAULT '',
  hedef TEXT,
  kip TEXT NOT NULL,
  baslangic TEXT,
  bitis TEXT,
  karar TEXT NOT NULL,
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS durumlar_konu ON durumlar(konu);
CREATE INDEX IF NOT EXISTS durumlar_hedef ON durumlar(hedef);
CREATE TABLE IF NOT EXISTS sablonlar(
  tur TEXT PRIMARY KEY,
  veri TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alan_degerleri(
  kayit TEXT NOT NULL,
  alan TEXT NOT NULL,
  deger TEXT NOT NULL,
  duzenleme INTEGER NOT NULL,
  PRIMARY KEY(kayit, alan)
);
CREATE TABLE IF NOT EXISTS soru_cevaplari(
  kayit TEXT NOT NULL,
  soru TEXT NOT NULL,
  durum TEXT NOT NULL,
  cevap TEXT NOT NULL DEFAULT '',
  metin TEXT NOT NULL DEFAULT '',
  kayitla TEXT,
  duzenleme INTEGER NOT NULL,
  PRIMARY KEY(kayit, soru)
);
CREATE TABLE IF NOT EXISTS kayit_soru_setleri(
  kayit TEXT NOT NULL,
  soru_seti TEXT NOT NULL,
  PRIMARY KEY(kayit, soru_seti)
);
CREATE TABLE IF NOT EXISTS metin_catismalari(
  kayit TEXT NOT NULL,
  alan TEXT NOT NULL,
  a TEXT NOT NULL, a_kurulum TEXT NOT NULL, a_sira INTEGER NOT NULL, a_basliklar TEXT NOT NULL, a_zaman INTEGER NOT NULL,
  b TEXT NOT NULL, b_kurulum TEXT NOT NULL, b_sira INTEGER NOT NULL, b_basliklar TEXT NOT NULL, b_zaman INTEGER NOT NULL,
  temel TEXT NOT NULL,
  PRIMARY KEY(kayit, alan, a, b)
);
CREATE TABLE IF NOT EXISTS haritalar(
  kod TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  yer TEXT,
  en REAL NOT NULL,
  boy REAL NOT NULL,
  katmanlar TEXT NOT NULL DEFAULT '[]',
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS haritalar_yer ON haritalar(yer);
CREATE TABLE IF NOT EXISTS isaretler(
  kod TEXT PRIMARY KEY,
  harita TEXT NOT NULL,
  kayit TEXT NOT NULL,
  kesinlik TEXT NOT NULL,
  x REAL, y REAL, yaricap REAL,
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS isaretler_harita ON isaretler(harita);
CREATE INDEX IF NOT EXISTS isaretler_kayit ON isaretler(kayit);
CREATE TABLE IF NOT EXISTS yonlendirmeler(
  kod TEXT PRIMARY KEY,
  hedef TEXT NOT NULL,
  islem TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS yonlendirmeler_hedef ON yonlendirmeler(hedef);
CREATE TABLE IF NOT EXISTS birlesme_tasinanlar(
  islem TEXT NOT NULL,
  tablo TEXT NOT NULL,
  sutun TEXT NOT NULL,
  kod TEXT NOT NULL,
  PRIMARY KEY(islem, tablo, sutun, kod)
);
CREATE TABLE IF NOT EXISTS inceleme_kararlari(
  anahtar TEXT PRIMARY KEY,
  durum TEXT NOT NULL,
  gerekce TEXT NOT NULL DEFAULT '',
  dayanak TEXT NOT NULL DEFAULT '',
  zaman INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS etki_incelemeleri(
  anahtar TEXT PRIMARY KEY,
  kaynak TEXT NOT NULL,
  hedef TEXT NOT NULL,
  islem TEXT NOT NULL,
  degisim TEXT NOT NULL,
  once TEXT,
  sonra TEXT,
  aciklama TEXT NOT NULL,
  zaman INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS iddialar(
  kod TEXT PRIMARY KEY,
  konu TEXT NOT NULL,
  soru TEXT NOT NULL,
  secenekler TEXT NOT NULL DEFAULT '[]',
  gercek TEXT,
  karar TEXT NOT NULL,
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS iddialar_konu ON iddialar(konu);
CREATE TABLE IF NOT EXISTS bilgiler(
  kod TEXT PRIMARY KEY,
  iddia TEXT NOT NULL,
  bilen TEXT NOT NULL,
  secenek TEXT,
  inanc TEXT NOT NULL,
  saklama TEXT,
  kaynak TEXT,
  kaynak_kayit TEXT,
  sahne TEXT,
  baslangic TEXT,
  bitis TEXT,
  aciklama TEXT NOT NULL DEFAULT '',
  karar TEXT NOT NULL,
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS bilgiler_iddia ON bilgiler(iddia);
CREATE INDEX IF NOT EXISTS bilgiler_bilen ON bilgiler(bilen);
CREATE INDEX IF NOT EXISTS bilgiler_sahne ON bilgiler(sahne);
CREATE TABLE IF NOT EXISTS ters_birlesmeler(
  islem TEXT PRIMARY KEY,
  kaynak TEXT NOT NULL,
  hedef TEXT NOT NULL,
  zaman INTEGER NOT NULL
);
`;
export const IZDUSUM_TABLOLARI = ['evren', 'kayitlar', 'metinler', 'baglantilar', 'iliskiler', 'degisimler', 'medya',
  'alan_yazanlari', 'silme_catismalari', 'metin_yazanlari', 'metin_catismalari', 'anlati', 'durumlar', 'sablonlar', 'alan_degerleri', 'soru_cevaplari', 'kayit_soru_setleri', 'haritalar', 'isaretler', 'yonlendirmeler', 'birlesme_tasinanlar', 'ters_birlesmeler', 'inceleme_kararlari', 'etki_incelemeleri', 'iddialar', 'bilgiler'];

type Uygulayici = (db: Database, i: Islem) => void;

function katilimciEtkisi(db: Database, i: Islem, olay: string, kisi: string, ne: string) {
  const o = yonlendir(db, olay), k = yonlendir(db, kisi);
  const ad = db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string | undefined;
  etkiAc(db, i.kod, i.zaman, o, 'katilimci', null, `${ad ?? 'Bir kayıt'} ${ne}`);
}

/** Birleştirilmiş kaydın kodu yeni kayda yönlendirir (§9.5); başka cihazdan gelen eski kodlu işlemler de doğru kayda varır. */
export function yonlendir<T extends string | null | undefined>(db: Database, kod: T): T {
  if (!kod) return kod;
  let k: string = kod;
  for (let n = 0; n < 20; n++) {
    const h = db.selectValue('SELECT hedef FROM yonlendirmeler WHERE kod=?', [k]) as string | undefined;
    if (!h) break;
    k = h;
  }
  return k as T;
}

/** Birleştirilmiş koda sonradan yazılan satır yönlendirilir ve o birleştirme geri alınırsa eski kayda dönsün diye not edilir. */
function yonlendirNotla(db: Database, kod: string | null | undefined, tablo: string, sutun: string, satir: string): string | null {
  if (!kod) return kod ?? null;
  const y = db.selectValue('SELECT islem FROM yonlendirmeler WHERE kod=?', [kod]) as string | undefined;
  if (y) db.exec({ sql: 'INSERT OR IGNORE INTO birlesme_tasinanlar(islem, tablo, sutun, kod) VALUES(?,?,?,?)', bind: [y, tablo, sutun, satir] });
  return yonlendir(db, kod);
}

/** Birleştirmede kaynak kayda bağlı satırlar hedefe taşınır; geri almak için hangi satırın taşındığı tutulur. */
const BIRLESME_SUTUNLARI: [string, string][] = [['iliskiler', 'a'], ['iliskiler', 'b'], ['durumlar', 'konu'], ['durumlar', 'hedef'], ['isaretler', 'kayit'],
  ['haritalar', 'yer'], ['degisimler', 'konu'], ['degisimler', 'olay'], ['kayitlar', 'sahne_olayi'], ['anlati', 'ust'], ['yonlendirmeler', 'hedef'],
  ['iddialar', 'konu'], ['bilgiler', 'bilen'], ['bilgiler', 'kaynak_kayit'], ['bilgiler', 'sahne']];

export type Kesinlik = 'kesin' | 'yaklasik' | 'bilinmiyor';
export interface IsaretKonumu { kesinlik: Kesinlik; x: number | null; y: number | null; yaricap: number | null }

/** İşaretin konumu harita uzayına sığdırılır; yeri bilinmeyen işaretin koordinatı yoktur (§8.1). */
function isaretKonumu(db: Database, harita: string, k: unknown): IsaretKonumu | null {
  const u = db.selectObject('SELECT en, boy FROM haritalar WHERE kod=?', [harita]);
  const v = k as Partial<IsaretKonumu> | null;
  if (!u || !v || !['kesin', 'yaklasik', 'bilinmiyor'].includes(v.kesinlik as string)) return null;
  if (v.kesinlik === 'bilinmiyor') return { kesinlik: 'bilinmiyor', x: null, y: null, yaricap: null };
  const en = Number(u.en), boy = Number(u.boy);
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
  const sinirla = (n: number, ust: number) => Math.min(ust, Math.max(0, n));
  const yaricap = v.kesinlik === 'yaklasik' ? sinirla(Number.isFinite(v.yaricap) ? v.yaricap as number : Math.max(en, boy) * 0.05, Math.max(en, boy)) : null;
  return { kesinlik: v.kesinlik as Kesinlik, x: sinirla(v.x as number, en), y: sinirla(v.y as number, boy), yaricap };
}

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
const KAYDA_DOKUNAN = new Set(['kayit_alan', 'soru_cevapla', 'kayit_degistir', 'kayit_lakap', 'kayit_etiket', 'kayit_tarih', 'kayit_alan_karar', 'kayit_gorsel', 'metin']);
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
function silmedenOnceki(db: Database, i: Islem, kayit = i.veri.kod as string) {
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
  /** Takvim tanımı (§3.4): bir şema değişikliğidir; bütün tarihler yeni takvimle yeniden hesaplanır. */
  takvim_yaz(db, i) {
    const { takvim } = i.veri as { takvim: unknown };
    if (takvim !== null && !takvimGecerli(takvim)) return;
    if (takvim) evrenAlani(db, 'takvim', JSON.stringify(takvim));
    else db.exec("DELETE FROM evren WHERE k='takvim'");
    tarihleriYenidenHesapla(db);
    alanYaz(db, i, 'evren', 'takvim', takvim ?? null);
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
    if (tur === 'ters_birlesme') db.exec({ sql: 'DELETE FROM ters_birlesmeler WHERE islem=?', bind: [String(i.veri.islem)] });
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
    const once = db.selectValue('SELECT tarih FROM kayitlar WHERE kod=?', [kod]) as string | null | undefined;
    const onceIfade = once ? (JSON.parse(once).ifade as string) : null;
    const sonraIfade = tarihMi(tarih) ? tarih.ifade : null;
    // Önceden bir tarihi olan kaydın tarihi değişince ya da olaydan bir katılımcı çıkarılınca bağımlıları incelemeye açılır (§9.2, §9.3).
    if (onceIfade && onceIfade !== sonraIfade) etkiAc(db, i.kod, i.zaman, kod, 'tarih', onceIfade, sonraIfade);
    db.exec({ sql: 'UPDATE kayitlar SET tarih=?, duzenleme=? WHERE kod=?', bind: [json(tz(db, tarih)), i.zaman, kod] });
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
      bind: [v.kod as string, v.tur as string, yonlendirNotla(db, v.a as string, 'iliskiler', 'a', v.kod as string), yonlendirNotla(db, v.b as string, 'iliskiler', 'b', v.kod as string), (v.rol as string) ?? null,
        json(tz(db, v.baslangic)), json(tz(db, v.bitis)), (v.aciklama as string) ?? '', v.karar as string, i.zaman, i.zaman],
    });
  },
  iliski_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (!['baslangic', 'bitis', 'aciklama', 'karar', 'rol'].includes(alan)) return;
    const d = alan === 'baslangic' || alan === 'bitis' ? json(tz(db, deger)) : deger;
    db.exec({ sql: `UPDATE iliskiler SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [d as string | null, i.zaman, kod] });
    alanYaz(db, i, kod, alan, deger ?? null);
  },
  iliski_sil(db, i) {
    const r = db.selectObject('SELECT tur, a, b FROM iliskiler WHERE kod=? AND silindi IS NULL', [i.veri.kod as string]);
    if (r?.tur === 'olayda') katilimciEtkisi(db, i, r.b as string, r.a as string, 'çıkarıldı');
    db.exec({ sql: 'UPDATE iliskiler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  iliski_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE iliskiler SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },

  degisim_ekle(db, i) {
    const v = i.veri as Record<string, unknown>;
    db.exec({
      sql: 'INSERT OR IGNORE INTO degisimler(kod, olay, sahne, konu, metin, karar, olusturma) VALUES(?,?,?,?,?,?,?)',
      bind: [v.kod as string, yonlendirNotla(db, v.olay as string, 'degisimler', 'olay', v.kod as string), (v.sahne as string) ?? null, yonlendirNotla(db, (v.konu as string) ?? null, 'degisimler', 'konu', v.kod as string), v.metin as string, v.karar as string, i.zaman],
    });
  },
  degisim_sil(db, i) {
    db.exec({ sql: 'UPDATE degisimler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },

  /** Anlatı yapısı (§3.3): bölüm esere, sahne esere ya da bölüme yerleşir; sıra anahtarla tutulur. */
  anlati_yerlestir(db, i) {
    const { kod, ust, konum } = i.veri as { kod: string; ust: string | null; konum: string | null };
    if (ust && siraGecerli(konum)) db.exec({ sql: 'INSERT INTO anlati(kod, ust, konum) VALUES(?,?,?) ON CONFLICT(kod) DO UPDATE SET ust=excluded.ust, konum=excluded.konum', bind: [kod, yonlendir(db, ust), konum] });
    else db.exec({ sql: 'DELETE FROM anlati WHERE kod=?', bind: [kod] });
    alanYaz(db, i, kod, 'anlati', ust && siraGecerli(konum) ? { ust, konum } : null);
  },

  durum_ekle(db, i) {
    const v = i.veri as Record<string, unknown>;
    db.exec({
      sql: `INSERT OR IGNORE INTO durumlar(kod, konu, ozellik, deger, hedef, kip, baslangic, bitis, karar, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      bind: [v.kod as string, yonlendirNotla(db, v.konu as string, 'durumlar', 'konu', v.kod as string), v.ozellik as string, (v.deger as string) ?? '', yonlendirNotla(db, (v.hedef as string) ?? null, 'durumlar', 'hedef', v.kod as string), v.kip as string,
        json(sinirTz(db, v.baslangic)), json(sinirTz(db, v.bitis)), v.karar as string, i.zaman, i.zaman],
    });
  },
  durum_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (!['ozellik', 'deger', 'hedef', 'kip', 'baslangic', 'bitis', 'karar'].includes(alan)) return;
    const d = alan === 'baslangic' || alan === 'bitis' ? json(sinirTz(db, deger)) : alan === 'hedef' ? yonlendir(db, (deger as string) ?? null) : (deger ?? '');
    db.exec({ sql: `UPDATE durumlar SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [d as string | null, i.zaman, kod] });
    alanYaz(db, i, kod, alan, deger ?? null);
  },
  durum_sil(db, i) {
    db.exec({ sql: 'UPDATE durumlar SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  durum_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE durumlar SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },

  /** Şablon (§3.1): tür için bütün şablon yazılır; null varsayılana döner. Değerler silinmez. */
  sablon_yaz(db, i) {
    const { tur, sablon } = i.veri as { tur: string; sablon: unknown };
    if (sablon && sablonGecerli(sablon, tur)) db.exec({ sql: 'INSERT OR REPLACE INTO sablonlar(tur, veri) VALUES(?,?)', bind: [tur, JSON.stringify(sablon)] });
    else if (!sablon) db.exec({ sql: 'DELETE FROM sablonlar WHERE tur=?', bind: [tur] });
    else return;
    alanYaz(db, i, 'sablon:' + tur, 'sablon', sablon ?? null);
  },
  /** Şablon alanının değeri; boş değer satırı kaldırır. */
  kayit_alan(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (typeof alan !== 'string' || !alan) return;
    if (deger === null || deger === undefined || deger === '' || deger === false) db.exec({ sql: 'DELETE FROM alan_degerleri WHERE kayit=? AND alan=?', bind: [kod, alan] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO alan_degerleri(kayit, alan, deger, duzenleme) VALUES(?,?,?,?)', bind: [kod, alan, JSON.stringify(tz(db, deger)), i.zaman] });
    db.exec({ sql: 'UPDATE kayitlar SET duzenleme=? WHERE kod=?', bind: [i.zaman, kod] });
    alanYaz(db, i, kod, 'f:' + alan, deger ?? null);
  },
  /** Soru kütüphanesi (§6): cevap, sonraya bırakma ya da ilgisiz; durum null ise cevapsıza döner. */
  soru_cevapla(db, i) {
    const { kod, soru, durum, cevap, kayitla, metin } = i.veri as { kod: string; soru: string; durum: string | null; cevap?: string; kayitla?: string | null; metin?: string };
    if (typeof soru !== 'string' || !soru) return;
    if (!durum) db.exec({ sql: 'DELETE FROM soru_cevaplari WHERE kayit=? AND soru=?', bind: [kod, soru] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO soru_cevaplari(kayit, soru, durum, cevap, metin, kayitla, duzenleme) VALUES(?,?,?,?,?,?,?)', bind: [kod, soru, durum, cevap ?? '', metin ?? '', kayitla ?? null, i.zaman] });
    if (kod !== 'evren') db.exec({ sql: 'UPDATE kayitlar SET duzenleme=? WHERE kod=?', bind: [i.zaman, kod] });
    alanYaz(db, i, kod, 's:' + soru, durum ? { durum, cevap: cevap ?? '', kayitla: kayitla ?? null } : null);
  },
  kayit_soru_seti(db, i) {
    const { kod, set, ekle } = i.veri as { kod: string; set: string; ekle: boolean };
    if (ekle) db.exec({ sql: 'INSERT OR IGNORE INTO kayit_soru_setleri(kayit, soru_seti) VALUES(?,?)', bind: [kod, set] });
    else db.exec({ sql: 'DELETE FROM kayit_soru_setleri WHERE kayit=? AND soru_seti=?', bind: [kod, set] });
  },

  /** Harita (§8.1): kendi uzayı olan, üstüne görsellerin oturtulduğu yüzey. İşaretler görselde değil uzayda durur. */
  harita_olustur(db, i) {
    const v = i.veri as { kod: string; ad: string; yer?: string | null; en: number; boy: number; gorsel: string };
    if (!(v.en > 0 && v.boy > 0) || typeof v.gorsel !== 'string') return;
    db.exec({ sql: 'INSERT OR IGNORE INTO haritalar(kod, ad, yer, en, boy, katmanlar, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?,?)',
      bind: [v.kod, String(v.ad), yonlendirNotla(db, v.yer ?? null, 'haritalar', 'yer', v.kod), v.en, v.boy, JSON.stringify([{ gorsel: v.gorsel, x: 0, y: 0, olcek: 1 }]), i.zaman, i.zaman] });
  },
  harita_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (alan !== 'ad' && alan !== 'yer') return;
    db.exec({ sql: `UPDATE haritalar SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [alan === 'yer' ? yonlendir(db, (deger as string | null) ?? null) : (deger as string | null) ?? '', i.zaman, kod] });
    alanYaz(db, i, kod, alan, deger ?? null);
  },
  harita_sil(db, i) {
    db.exec({ sql: 'UPDATE haritalar SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  harita_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE haritalar SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },
  isaret_koy(db, i) {
    const v = i.veri as { kod: string; harita: string; kayit: string; konum: unknown };
    const k = isaretKonumu(db, v.harita, v.konum);
    if (!k) return;
    db.exec({ sql: 'INSERT OR IGNORE INTO isaretler(kod, harita, kayit, kesinlik, x, y, yaricap, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?,?,?)',
      bind: [v.kod, v.harita, yonlendirNotla(db, v.kayit, 'isaretler', 'kayit', v.kod), k.kesinlik, k.x, k.y, k.yaricap, i.zaman, i.zaman] });
  },
  isaret_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    const harita = db.selectValue('SELECT harita FROM isaretler WHERE kod=?', [kod]) as string | undefined;
    if (harita === undefined) return;
    if (alan === 'konum') {
      const k = isaretKonumu(db, harita, deger);
      if (!k) return;
      db.exec({ sql: 'UPDATE isaretler SET kesinlik=?, x=?, y=?, yaricap=?, duzenleme=? WHERE kod=?', bind: [k.kesinlik, k.x, k.y, k.yaricap, i.zaman, kod] });
      alanYaz(db, i, kod, alan, k);
    } else if (alan === 'kayit' && typeof deger === 'string') {
      db.exec({ sql: 'UPDATE isaretler SET kayit=?, duzenleme=? WHERE kod=?', bind: [yonlendir(db, deger), i.zaman, kod] });
      alanYaz(db, i, kod, alan, deger);
    }
  },
  isaret_sil(db, i) {
    db.exec({ sql: 'UPDATE isaretler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  isaret_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE isaretler SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },

  /** Editoryal birleştirme (§9.5): kaynak kayıt silinmez, hedefe yönlendirir; bağlı satırlar hedefe taşınır. */
  kayit_birlestir(db, i) {
    const { kaynak, hedef } = i.veri as { kaynak: string; hedef: string };
    const son = yonlendir(db, hedef);
    // Ters yönde iki birleştirme: önce uygulanan korunur, ikincisi incelemeye düşer (§10.3).
    if (son === kaynak || kaynak === hedef) {
      db.exec({ sql: 'INSERT OR IGNORE INTO ters_birlesmeler(islem, kaynak, hedef, zaman) VALUES(?,?,?,?)', bind: [i.kod, kaynak, hedef, i.zaman] });
      return;
    }
    if (db.selectValue('SELECT 1 FROM yonlendirmeler WHERE kod=?', [kaynak]) !== undefined) return;
    if (db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kaynak]) === undefined) return;
    for (const [tablo, sutun] of BIRLESME_SUTUNLARI) {
      for (const r of db.selectObjects(`SELECT kod FROM ${tablo} WHERE ${sutun}=?`, [kaynak])) {
        db.exec({ sql: 'INSERT OR IGNORE INTO birlesme_tasinanlar(islem, tablo, sutun, kod) VALUES(?,?,?,?)', bind: [i.kod, tablo, sutun, r.kod as string] });
      }
      db.exec({ sql: `UPDATE ${tablo} SET ${sutun}=? WHERE ${sutun}=?`, bind: [son, kaynak] });
    }
    // İki kayıt arasındaki ilişkiler kendine ilişki olur: kaldırılır, geri alınınca döner.
    for (const r of db.selectObjects('SELECT kod FROM iliskiler WHERE a=? AND b=? AND silindi IS NULL', [son, son])) {
      db.exec({ sql: 'INSERT OR IGNORE INTO birlesme_tasinanlar(islem, tablo, sutun, kod) VALUES(?,?,?,?)', bind: [i.kod, 'iliskiler', 'silindi', r.kod as string] });
      db.exec({ sql: 'UPDATE iliskiler SET silindi=? WHERE kod=?', bind: [i.zaman, r.kod as string] });
    }
    db.exec({ sql: 'INSERT INTO yonlendirmeler(kod, hedef, islem) VALUES(?,?,?)', bind: [kaynak, son, i.kod] });
    db.exec({ sql: 'UPDATE kayitlar SET silindi=?, silen=? WHERE kod=?', bind: [i.zaman, i.kod, kaynak] });
    db.exec({ sql: 'UPDATE kayitlar SET duzenleme=? WHERE kod=?', bind: [i.zaman, son] });
    // Birleştirmeyi görmeden eski kayda yazılmış ve sıralamada önce gelen düzenlemeler de incelemeye düşer.
    silmedenOnceki(db, i, kaynak);
  },
  birlesme_geri_al(db, i) {
    const { kaynak, islem } = i.veri as { kaynak: string; islem: string };
    if (db.selectValue('SELECT islem FROM yonlendirmeler WHERE kod=?', [kaynak]) !== islem) return;
    for (const r of db.selectObjects('SELECT tablo, sutun, kod FROM birlesme_tasinanlar WHERE islem=?', [islem])) {
      const [tablo, sutun] = [r.tablo as string, r.sutun as string];
      if (sutun === 'silindi') db.exec({ sql: 'UPDATE iliskiler SET silindi=NULL WHERE kod=?', bind: [r.kod as string] });
      else if (BIRLESME_SUTUNLARI.some(([t, s]) => t === tablo && s === sutun)) db.exec({ sql: `UPDATE ${tablo} SET ${sutun}=? WHERE kod=?`, bind: [kaynak, r.kod as string] });
    }
    db.exec({ sql: 'DELETE FROM birlesme_tasinanlar WHERE islem=?', bind: [islem] });
    db.exec({ sql: 'DELETE FROM yonlendirmeler WHERE kod=?', bind: [kaynak] });
    db.exec({ sql: 'UPDATE kayitlar SET silindi=NULL, silen=NULL WHERE kod=? AND silen=?', bind: [kaynak, islem] });
    silmeCatismalariniKapat(db, i, kaynak);
  },

  /** İnceleme kuyruğu (§9.3): bulgu gerekçeyle kabul edilir ya da ertelenir; null karar kuyruğa geri koyar. */
  inceleme_karari(db, i) {
    const { anahtar, durum, gerekce, dayanak } = i.veri as { anahtar: string; durum: string | null; gerekce?: string; dayanak?: string };
    if (typeof anahtar !== 'string' || !anahtar) return;
    if (durum === 'kabul' || durum === 'ertelendi' || durum === 'duzeltildi') {
      db.exec({ sql: 'INSERT OR REPLACE INTO inceleme_kararlari(anahtar, durum, gerekce, dayanak, zaman) VALUES(?,?,?,?,?)', bind: [anahtar, durum, gerekce ?? '', dayanak ?? '', i.zaman] });
    } else db.exec({ sql: 'DELETE FROM inceleme_kararlari WHERE anahtar=?', bind: [anahtar] });
  },

  /** Bilgi katmanı (§3.6): kayıt ya da ilişki evrenin gerçeği, gizli bir gerçek ya da yalnızca birinin inancıdır. */
  gorunurluk_yaz(db, i) {
    const { kod, nesne, deger } = i.veri as { kod: string; nesne: string; deger: unknown };
    if (nesne !== 'kayit' && nesne !== 'iliski') return;
    if (deger !== null && !gorunurlukGecerli(deger)) return;
    const d = deger && !sadeGercekMi(deger) ? JSON.stringify(deger) : null;
    db.exec({ sql: `UPDATE ${nesne === 'kayit' ? 'kayitlar' : 'iliskiler'} SET gorunurluk=?, duzenleme=? WHERE kod=?`, bind: [d, i.zaman, kod] });
    alanYaz(db, i, kod, 'gorunurluk', d ? deger : null);
  },

  /** İddia (§3.6): bir kayıt hakkında soru ve olası cevapları; yazar gerçeği belirleyebilir ya da açık bırakır. */
  iddia_ekle(db, i) {
    const v = i.veri as Record<string, unknown>;
    const secenekler = iddiaDegeri('secenekler', v.secenekler);
    if (secenekler === undefined || typeof v.soru !== 'string') return;
    const gercek = iddiaDegeri('gercek', v.gercek ?? null);
    db.exec({
      sql: 'INSERT OR IGNORE INTO iddialar(kod, konu, soru, secenekler, gercek, karar, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?,?)',
      bind: [v.kod as string, yonlendirNotla(db, v.konu as string, 'iddialar', 'konu', v.kod as string), v.soru, JSON.stringify(secenekler), (gercek as string) ?? null, v.karar as string, i.zaman, i.zaman],
    });
  },
  iddia_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (!IDDIA_ALANLARI.includes(alan)) return;
    const d = iddiaDegeri(alan, deger);
    if (d === undefined) return;
    db.exec({ sql: `UPDATE iddialar SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [alan === 'secenekler' ? JSON.stringify(d) : (d as string | null), i.zaman, kod] });
    alanYaz(db, i, kod, alan, d);
  },
  iddia_sil(db, i) {
    db.exec({ sql: 'UPDATE iddialar SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  iddia_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE iddialar SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },
  /** Bilgi durumu (§3.6): bir bilenin (karakter, grup ya da okur) bir iddiaya tutumu; zamanı ve kaynağıyla. */
  bilgi_ekle(db, i) {
    const v = i.veri as Record<string, unknown>;
    const kod = v.kod as string;
    const d: Record<string, unknown> = {};
    for (const a of BILGI_ALANLARI) { const x = bilgiDegeri(a, v[a] ?? null); if (x === undefined) return; d[a] = x; }
    db.exec({
      sql: `INSERT OR IGNORE INTO bilgiler(kod, iddia, bilen, secenek, inanc, saklama, kaynak, kaynak_kayit, sahne, baslangic, bitis, aciklama, karar, olusturma, duzenleme)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      bind: [kod, v.iddia as string, yonlendirNotla(db, v.bilen as string, 'bilgiler', 'bilen', kod), d.secenek as string | null, d.inanc as string,
        json(d.saklama), d.kaynak as string | null, yonlendirNotla(db, d.kaynakKayit as string | null, 'bilgiler', 'kaynak_kayit', kod),
        yonlendirNotla(db, d.sahne as string | null, 'bilgiler', 'sahne', kod), json(sinirTz(db, d.baslangic)), json(sinirTz(db, d.bitis)),
        d.aciklama as string, d.karar as string, i.zaman, i.zaman],
    });
  },
  bilgi_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (!BILGI_ALANLARI.includes(alan)) return;
    const d = bilgiDegeri(alan, deger);
    if (d === undefined) return;
    const sutun = alan === 'kaynakKayit' ? 'kaynak_kayit' : alan;
    const yaz = alan === 'saklama' ? json(d) : alan === 'baslangic' || alan === 'bitis' ? json(sinirTz(db, d))
      : alan === 'kaynakKayit' || alan === 'sahne' ? yonlendir(db, d as string | null) : d;
    db.exec({ sql: `UPDATE bilgiler SET ${sutun}=?, duzenleme=? WHERE kod=?`, bind: [yaz as string | null, i.zaman, kod] });
    alanYaz(db, i, kod, alan, d);
  },
  bilgi_sil(db, i) {
    db.exec({ sql: 'UPDATE bilgiler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  bilgi_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE bilgiler SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
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
