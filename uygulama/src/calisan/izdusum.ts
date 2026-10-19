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
import { akisGecerli, kisitGecerli, paralelGecerli, tarihCoz, tarihMi, takvimGecerli, VARSAYILAN_TAKVIM, type EvrenTarihi, type Takvim, type ZamanSeti } from '../alan/tarih';
import { BIRIM, donusumGecerli } from '../alan/hizalama';
import { goreliCoz } from '../alan/goreli';

/** Evrenin şu anki takvimi (§3.4). */
export function takvimOku(db: Database): Takvim {
  const ham = db.selectValue("SELECT v FROM evren WHERE k='takvim'") as string | undefined;
  return ham ? JSON.parse(ham) : VARSAYILAN_TAKVIM;
}
/** Evrenin bütün zaman tanımları: ana takvim, paralel takvimler ve zaman akışları (§3.4). */
export function zamanSetiOku(db: Database): ZamanSeti {
  const oku = (on: string) => (db.selectObjects(`SELECT v FROM evren WHERE k LIKE '${on}:%' ORDER BY k`) as { v: string }[]).map((r) => JSON.parse(r.v));
  return { ana: takvimOku(db), diger: oku('takvim'), akislar: oku('akis') };
}
/**
 * Tarihin ekseni her zaman ifadeden ve evrenin o anki zaman tanımlarından hesaplanır; başka cihazın hesabına
 * güvenilmez. Göreli tarihin ekseni çözücüden gelir (goreliYenile).
 */
function tz(db: Database, t: unknown, z: ZamanSeti = zamanSetiOku(db)): unknown {
  if (!tarihMi(t)) return t;
  if (t.bicim === 'goreli') {
    const k = (t as EvrenTarihi).kisitlar;
    if (!Array.isArray(k) || !k.length || k.length > 20 || !k.every(kisitGecerli)) return null;
    return { ifade: String(t.ifade).slice(0, 300), bicim: 'goreli', hassasiyet: k.some((x) => x.birim === 'yil') ? 'yil' : null, takvim: z.ana.kod, takvimSurumu: z.ana.surum,
      kisitlar: k.map((x) => ({ olay: x.olay, yon: x.yon, en: x.en, cok: x.cok, birim: x.birim })), eksen: null };
  }
  return tarihCoz(t.ifade, z);
}
const sinirTz = (db: Database, s: unknown, z?: ZamanSeti) => (s && typeof s === 'object' && (s as { tarih?: unknown }).tarih ? { ...(s as object), tarih: tz(db, (s as { tarih: unknown }).tarih, z) } : s);

/**
 * Göreli tarihlerin eksenini kısıt ağından yeniden hesaplar (§15 araç 1). Dayanağın tarihi değişince bağlı tarihler
 * kendiliğinden kayar. Yalnızca göreli tarihi olan evrenlerde çalışır.
 */
export function goreliYenile(db: Database) {
  const goreliler = db.selectObjects(`SELECT k.kod, k.tarih FROM goreli_tarihler g JOIN kayitlar k ON k.kod=g.kod WHERE k.silindi IS NULL AND k.tarih IS NOT NULL`);
  if (!goreliler.length) return;
  const tarihler = new Map<string, EvrenTarihi | null>();
  const kuyruk: string[] = [];
  for (const r of goreliler) { tarihler.set(r.kod as string, JSON.parse(r.tarih as string)); kuyruk.push(r.kod as string); }
  while (kuyruk.length) {
    const t = tarihler.get(kuyruk.pop()!);
    for (const k of t?.kisitlar ?? []) {
      const o = yonlendir(db, k.olay);
      if (tarihler.has(o)) continue;
      const r = db.selectObject('SELECT tarih FROM kayitlar WHERE kod=? AND silindi IS NULL', [o]);
      if (!r) continue;
      const ot = r.tarih ? JSON.parse(r.tarih as string) as EvrenTarihi : null;
      tarihler.set(o, ot);
      if (ot?.bicim === 'goreli') kuyruk.push(o);
    }
  }
  const sonuc = goreliCoz(tarihler, takvimOku(db), (k) => yonlendir(db, k));
  for (const [kod, s] of sonuc) {
    const t = tarihler.get(kod)!;
    const yeni: EvrenTarihi = { ...t, eksen: s.eksen };
    if (s.celiski) yeni.celiski = s.celiski; else delete yeni.celiski;
    if (JSON.stringify(yeni) !== JSON.stringify(t)) db.exec({ sql: 'UPDATE kayitlar SET tarih=? WHERE kod=?', bind: [JSON.stringify(yeni), kod] });
  }
}
const json = (v: unknown) => (v ? JSON.stringify(v) : null);

/** Takvim değişti: bütün tarihlerin ekseni yeniden hesaplanır, ifadeler korunur. */
function tarihleriYenidenHesapla(db: Database) {
  const z = zamanSetiOku(db);
  const yeni = (ham: unknown) => (ham ? json(tz(db, JSON.parse(ham as string), z)) : null);
  for (const r of db.selectObjects('SELECT kod, tarih FROM kayitlar WHERE tarih IS NOT NULL')) db.exec({ sql: 'UPDATE kayitlar SET tarih=? WHERE kod=?', bind: [yeni(r.tarih), r.kod as string] });
  for (const r of db.selectObjects('SELECT kod, baslangic, bitis FROM iliskiler WHERE baslangic IS NOT NULL OR bitis IS NOT NULL')) {
    db.exec({ sql: 'UPDATE iliskiler SET baslangic=?, bitis=? WHERE kod=?', bind: [yeni(r.baslangic), yeni(r.bitis), r.kod as string] });
  }
  const sinir = (ham: unknown) => (ham ? JSON.stringify(sinirTz(db, JSON.parse(ham as string), z)) : null);
  for (const tablo of ['durumlar', 'bilgiler', 'cizimler']) {
    for (const r of db.selectObjects(`SELECT kod, baslangic, bitis FROM ${tablo} WHERE baslangic IS NOT NULL OR bitis IS NOT NULL`)) {
      db.exec({ sql: `UPDATE ${tablo} SET baslangic=?, bitis=? WHERE kod=?`, bind: [sinir(r.baslangic), sinir(r.bitis), r.kod as string] });
    }
  }
  for (const r of db.selectObjects('SELECT kod, bas, bit FROM masalar WHERE bas IS NOT NULL OR bit IS NOT NULL')) {
    const t = (x: unknown) => (x ? JSON.stringify(tz(db, JSON.parse(x as string), z)) : null);
    db.exec({ sql: 'UPDATE masalar SET bas=?, bit=? WHERE kod=?', bind: [t(r.bas), t(r.bit), r.kod as string] });
  }
  for (const r of db.selectObjects('SELECT kod, asamalar FROM yolculuklar')) {
    const l = (JSON.parse(r.asamalar as string) as Record<string, unknown>[]).map((a) => ({ ...a, cikis: tz(db, a.cikis, z), varis: tz(db, a.varis, z) }));
    db.exec({ sql: 'UPDATE yolculuklar SET asamalar=? WHERE kod=?', bind: [JSON.stringify(l), r.kod as string] });
  }
  for (const r of db.selectObjects('SELECT kayit, alan, deger FROM alan_degerleri')) {
    const d = JSON.parse(r.deger as string);
    if (tarihMi(d)) db.exec({ sql: 'UPDATE alan_degerleri SET deger=? WHERE kayit=? AND alan=?', bind: [JSON.stringify(tz(db, d, z)), r.kayit as string, r.alan as string] });
  }
  goreliYenile(db);
}

/** Görünen tabloların yapısı değişince artar; açılışta tablolar günlükten yeniden kurulur. */
export const IZDUSUM_SURUMU = 27;

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
  iz TEXT,
  miktar REAL,
  olusturma INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS degisimler_olay ON degisimler(olay);
CREATE INDEX IF NOT EXISTS degisimler_iz ON degisimler(iz);
CREATE TABLE IF NOT EXISTS izler(
  kod TEXT PRIMARY KEY,
  konu TEXT NOT NULL,
  ad TEXT NOT NULL,
  model TEXT NOT NULL,
  birim TEXT NOT NULL DEFAULT '',
  sure REAL,
  olusturma INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS izler_konu ON izler(konu);
CREATE TABLE IF NOT EXISTS iz_gozlemleri(
  iz TEXT NOT NULL,
  sahne TEXT NOT NULL,
  an TEXT NOT NULL,
  deger TEXT NOT NULL,
  duzenleme INTEGER NOT NULL,
  PRIMARY KEY(iz, sahne, an)
);
CREATE INDEX IF NOT EXISTS iz_gozlemleri_sahne ON iz_gozlemleri(sahne);
CREATE TABLE IF NOT EXISTS alan_bosluklari(
  kayit TEXT NOT NULL,
  alan TEXT NOT NULL,
  tur TEXT NOT NULL,
  PRIMARY KEY(kayit, alan)
);
CREATE TABLE IF NOT EXISTS varsayilan_kararlari(
  kayit TEXT NOT NULL,
  alan TEXT NOT NULL,
  durum TEXT NOT NULL,
  oncelikli TEXT,
  aciklama TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(kayit, alan)
);
CREATE TABLE IF NOT EXISTS fetih_cevaplari(
  kayit TEXT NOT NULL,
  gecis TEXT NOT NULL,
  alan TEXT NOT NULL,
  durum TEXT NOT NULL,
  tarih TEXT,
  PRIMARY KEY(kayit, gecis, alan)
);
CREATE TABLE IF NOT EXISTS surec_kurallari(
  kod TEXT PRIMARY KEY,
  sahip TEXT NOT NULL,
  ad TEXT NOT NULL,
  kosullar TEXT NOT NULL DEFAULT '',
  adimlar TEXT NOT NULL DEFAULT '[]',
  olusturma INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS surec_kurallari_sahip ON surec_kurallari(sahip);
CREATE TABLE IF NOT EXISTS surec_baglari(
  kod TEXT PRIMARY KEY,
  olay TEXT NOT NULL,
  kural TEXT NOT NULL,
  fiili INTEGER NOT NULL DEFAULT 0,
  olusturma INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS surec_baglari_olay ON surec_baglari(olay);
CREATE TABLE IF NOT EXISTS surec_adimlari(
  kod TEXT PRIMARY KEY,
  olay TEXT NOT NULL,
  kural TEXT NOT NULL,
  adim TEXT NOT NULL,
  durum TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS surec_adimlari_olay ON surec_adimlari(olay, kural);
CREATE TABLE IF NOT EXISTS hukuk_kurallari(
  kod TEXT PRIMARY KEY,
  sahip TEXT NOT NULL,
  tanim TEXT NOT NULL,
  olusturma INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS hukuk_kurallari_sahip ON hukuk_kurallari(sahip);
CREATE TABLE IF NOT EXISTS dayaniklilik(
  iliski TEXT PRIMARY KEY,
  deger TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS haber_kanallari(
  kod TEXT PRIMARY KEY,
  tanim TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS haber_cikislari(
  kod TEXT PRIMARY KEY,
  yer TEXT,
  tarih TEXT,
  kanallar TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dil_tanimlari(
  kod TEXT PRIMARY KEY,
  tanim TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ad_bicimleri(
  kod TEXT PRIMARY KEY,
  bicimler TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dil_yeterlilikleri(
  iliski TEXT PRIMARY KEY,
  deger TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS teknoloji_tanimlari(
  kod TEXT PRIMARY KEY,
  tanim TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS motif_yorumlari(
  kod TEXT PRIMARY KEY,
  yorumlar TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS masalar(
  kod TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  amac TEXT NOT NULL DEFAULT '',
  notlar TEXT NOT NULL DEFAULT '',
  bas TEXT,
  bit TEXT,
  paket TEXT,
  uyeler TEXT NOT NULL DEFAULT '[]',
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE TABLE IF NOT EXISTS paketler(
  kod TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  aciklama TEXT NOT NULL DEFAULT '',
  varsayimlar TEXT NOT NULL DEFAULT '[]',
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
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
CREATE TABLE IF NOT EXISTS cizimler(
  kod TEXT PRIMARY KEY,
  harita TEXT NOT NULL,
  kayit TEXT NOT NULL,
  bicim TEXT NOT NULL,
  kip TEXT,
  noktalar TEXT NOT NULL,
  baslangic TEXT,
  bitis TEXT,
  olusturma INTEGER NOT NULL,
  duzenleme INTEGER NOT NULL,
  silindi INTEGER
);
CREATE INDEX IF NOT EXISTS cizimler_harita ON cizimler(harita);
CREATE INDEX IF NOT EXISTS cizimler_kayit ON cizimler(kayit);
CREATE TABLE IF NOT EXISTS rotalar(
  kod TEXT PRIMARY KEY,
  a TEXT,
  b TEXT,
  mesafe TEXT,
  sureler TEXT NOT NULL DEFAULT '[]',
  duraklar TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS rotalar_a ON rotalar(a);
CREATE INDEX IF NOT EXISTS rotalar_b ON rotalar(b);
CREATE TABLE IF NOT EXISTS yolculuklar(
  kod TEXT PRIMARY KEY,
  asamalar TEXT NOT NULL DEFAULT '[]'
);
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
  istisna TEXT,
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
CREATE TABLE IF NOT EXISTS goreli_tarihler(kod TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS ters_birlesmeler(
  islem TEXT PRIMARY KEY,
  kaynak TEXT NOT NULL,
  hedef TEXT NOT NULL,
  zaman INTEGER NOT NULL
);
`;
export const IZDUSUM_TABLOLARI = ['evren', 'kayitlar', 'metinler', 'baglantilar', 'iliskiler', 'degisimler', 'izler', 'iz_gozlemleri', 'alan_bosluklari', 'varsayilan_kararlari', 'fetih_cevaplari', 'surec_kurallari', 'surec_baglari', 'surec_adimlari', 'hukuk_kurallari', 'dayaniklilik', 'haber_kanallari', 'haber_cikislari', 'dil_tanimlari', 'ad_bicimleri', 'dil_yeterlilikleri', 'teknoloji_tanimlari', 'motif_yorumlari', 'masalar', 'paketler', 'medya',
  'alan_yazanlari', 'silme_catismalari', 'metin_yazanlari', 'metin_catismalari', 'anlati', 'durumlar', 'sablonlar', 'alan_degerleri', 'soru_cevaplari', 'kayit_soru_setleri', 'haritalar', 'isaretler', 'cizimler', 'rotalar', 'yolculuklar', 'yonlendirmeler', 'birlesme_tasinanlar', 'ters_birlesmeler', 'inceleme_kararlari', 'etki_incelemeleri', 'iddialar', 'bilgiler', 'goreli_tarihler'];

type Uygulayici = (db: Database, i: Islem) => void;

/** Varsayımlar: serbest metin, olay gerçekleşti/gerçekleşmedi, rota açık/kapalı, bilen bir iddiayı biliyor/bilmiyor. */
function varsayimlarTemiz(db: Database, d: unknown) {
  const k = (x: unknown) => (typeof x === 'string' ? yonlendir(db, x) : null);
  return (Array.isArray(d) ? d : []).slice(0, 100).flatMap((v: Record<string, unknown>): Record<string, unknown>[] => {
    const kod = typeof v?.kod === 'string' ? v.kod : null;
    if (!kod) return [];
    if (v.tur === 'metin') return [{ kod, tur: 'metin', metin: String(v.metin ?? '').slice(0, 300) }];
    if (v.tur === 'olay' && k(v.olay)) return [{ kod, tur: 'olay', olay: k(v.olay), deger: !!v.deger }];
    if (v.tur === 'rota' && k(v.rota)) return [{ kod, tur: 'rota', rota: k(v.rota), deger: !!v.deger }];
    if (v.tur === 'bilgi' && k(v.bilen) && typeof v.iddia === 'string') return [{ kod, tur: 'bilgi', bilen: k(v.bilen), iddia: v.iddia, deger: !!v.deger }];
    return [];
  });
}

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
const BIRLESME_SUTUNLARI: [string, string][] = [['iliskiler', 'a'], ['iliskiler', 'b'], ['durumlar', 'konu'], ['durumlar', 'hedef'], ['isaretler', 'kayit'], ['cizimler', 'kayit'], ['rotalar', 'a'], ['rotalar', 'b'],
  ['haritalar', 'yer'], ['degisimler', 'konu'], ['degisimler', 'olay'], ['izler', 'konu'], ['kayitlar', 'sahne_olayi'], ['anlati', 'ust'], ['yonlendirmeler', 'hedef'],
  ['iddialar', 'konu'], ['surec_kurallari', 'sahip'], ['hukuk_kurallari', 'sahip'], ['surec_baglari', 'olay'], ['surec_adimlari', 'olay'], ['bilgiler', 'bilen'], ['bilgiler', 'kaynak_kayit'], ['bilgiler', 'sahne'], ['haber_cikislari', 'yer']];

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

/** Çizim noktaları harita uzayına sığdırılır; bölge en az 3, yol en az 2 noktadır. */
function cizimNoktalari(db: Database, harita: string, bicim: string, n: unknown): [number, number][] | null {
  const u = db.selectObject('SELECT en, boy FROM haritalar WHERE kod=?', [harita]);
  if (!u || (bicim !== 'bolge' && bicim !== 'yol') || !Array.isArray(n)) return null;
  const en = Number(u.en), boy = Number(u.boy);
  const l = n.slice(0, 500).filter((p): p is [number, number] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map(([x, y]) => [Math.min(en, Math.max(0, x)), Math.min(boy, Math.max(0, y))] as [number, number]);
  return l.length >= (bicim === 'bolge' ? 3 : 2) ? l : null;
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
    const { takvim, kod } = i.veri as { takvim: unknown; kod?: string };
    // Kodlu takvim paralel takvimdir (ana takvimin yanında); kodsuz olan ana takvim.
    const anahtar = kod ? `takvim:${kod}` : 'takvim';
    if (takvim !== null && !(kod ? paralelGecerli(takvim) && (takvim as { kod: string }).kod === kod : takvimGecerli(takvim))) return;
    if (takvim) evrenAlani(db, anahtar, JSON.stringify(takvim));
    else db.exec({ sql: 'DELETE FROM evren WHERE k=?', bind: [anahtar] });
    tarihleriYenidenHesapla(db);
    alanYaz(db, i, 'evren', anahtar, takvim ?? null);
  },
  /** Zaman akışı (§3.4): tanımı değişince akıştaki tarihlerin ana eksendeki yeri yeniden hesaplanır. */
  akis_yaz(db, i) {
    const { akis, kod } = i.veri as { akis: unknown; kod: string };
    if (typeof kod !== 'string' || (akis !== null && !(akisGecerli(akis) && akis.kod === kod))) return;
    if (akis) evrenAlani(db, `akis:${kod}`, JSON.stringify(akis));
    else db.exec({ sql: 'DELETE FROM evren WHERE k=?', bind: [`akis:${kod}`] });
    tarihleriYenidenHesapla(db);
    alanYaz(db, i, 'evren', `akis:${kod}`, akis ?? null);
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
    goreliYenile(db);
  },
  kayit_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE kayitlar SET silindi=NULL, silen=NULL WHERE kod=?', bind: [i.veri.kod as string] });
    silmeCatismalariniKapat(db, i, i.veri.kod as string);
    goreliYenile(db);
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
    const yeni = tz(db, tarih) as EvrenTarihi | null;
    db.exec({ sql: 'UPDATE kayitlar SET tarih=?, duzenleme=? WHERE kod=?', bind: [json(yeni), i.zaman, kod] });
    if (yeni?.bicim === 'goreli') db.exec({ sql: 'INSERT OR IGNORE INTO goreli_tarihler(kod) VALUES(?)', bind: [kod] });
    else db.exec({ sql: 'DELETE FROM goreli_tarihler WHERE kod=?', bind: [kod] });
    goreliYenile(db);
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
      sql: 'INSERT OR IGNORE INTO degisimler(kod, olay, sahne, konu, metin, karar, iz, miktar, olusturma) VALUES(?,?,?,?,?,?,?,?,?)',
      bind: [v.kod as string, yonlendirNotla(db, v.olay as string, 'degisimler', 'olay', v.kod as string), (v.sahne as string) ?? null, yonlendirNotla(db, (v.konu as string) ?? null, 'degisimler', 'konu', v.kod as string), v.metin as string, v.karar as string,
        typeof v.iz === 'string' ? v.iz : null, typeof v.miktar === 'number' && Number.isFinite(v.miktar) ? v.miktar : null, i.zaman],
    });
  },
  degisim_sil(db, i) {
    db.exec({ sql: 'UPDATE degisimler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },

  /** Süreklilik defteri (§5.6): izlenen ayrıntı, sahne başı ve sonunda gözlenen durum. */
  iz_olustur(db, i) {
    const v = i.veri as Record<string, unknown>;
    if (typeof v.kod !== 'string' || typeof v.konu !== 'string') return;
    const model = ['durum', 'sayi', 'iyilesme'].includes(v.model as string) ? v.model as string : 'durum';
    db.exec({ sql: 'INSERT OR IGNORE INTO izler(kod, konu, ad, model, birim, sure, olusturma) VALUES(?,?,?,?,?,?,?)',
      bind: [v.kod, yonlendirNotla(db, v.konu, 'izler', 'konu', v.kod) as string, String(v.ad ?? '').slice(0, 120), model, String(v.birim ?? '').slice(0, 30),
        typeof v.sure === 'number' && v.sure > 0 ? v.sure : null, i.zaman] });
  },
  iz_degistir(db, i) {
    const { kod, tanim } = i.veri as { kod: string; tanim: { ad?: unknown; birim?: unknown; sure?: unknown } | null };
    if (typeof kod !== 'string' || !tanim) return;
    db.exec({ sql: 'UPDATE izler SET ad=?, birim=?, sure=? WHERE kod=?',
      bind: [String(tanim.ad ?? '').slice(0, 120), String(tanim.birim ?? '').slice(0, 30), typeof tanim.sure === 'number' && tanim.sure > 0 ? tanim.sure : null, kod] });
    alanYaz(db, i, kod, 'iz', tanim);
  },
  iz_sil(db, i) {
    db.exec({ sql: 'UPDATE izler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  iz_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE izler SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },
  /** Boş alanın türü (§3.6): henüz düşünülmedi (kayıt yok), bilerek açık, evrende bilinmiyor, bu kayıt için geçersiz. */
  alan_boslugu(db, i) {
    const { kod, alan, tur } = i.veri as { kod: string; alan: string; tur: string | null };
    if (typeof kod !== 'string' || typeof alan !== 'string') return;
    if (!tur || !['acik', 'bilinmiyor', 'gecersiz'].includes(tur)) db.exec({ sql: 'DELETE FROM alan_bosluklari WHERE kayit=? AND alan=?', bind: [kod, alan] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO alan_bosluklari(kayit, alan, tur) VALUES(?,?,?)', bind: [kod, alan, tur] });
    alanYaz(db, i, kod, 'bosluk:' + alan, tur ?? null);
  },
  /** Birden çok kaynaktan gelen varsayılanın durumu (§3.7): birlikte geçerli, kapsamları farklı ya da öncelikli kaynak. */
  varsayilan_karari(db, i) {
    const { kod, alan, karar } = i.veri as { kod: string; alan: string; karar: { durum?: unknown; oncelikli?: unknown; aciklama?: unknown } | null };
    if (typeof kod !== 'string' || typeof alan !== 'string') return;
    if (!karar || !['birlikte', 'kapsam', 'oncelik'].includes(karar.durum as string)) db.exec({ sql: 'DELETE FROM varsayilan_kararlari WHERE kayit=? AND alan=?', bind: [kod, alan] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO varsayilan_kararlari(kayit, alan, durum, oncelikli, aciklama) VALUES(?,?,?,?,?)',
      bind: [kod, alan, karar.durum as string, typeof karar.oncelikli === 'string' ? yonlendir(db, karar.oncelikli) : null, String(karar.aciklama ?? '').slice(0, 300)] });
    alanYaz(db, i, kod, 'varsayilan:' + alan, karar ?? null);
  },
  /** Bağlılık değişince eski yönetimden gelen alan için cevap (§3.7): eski sürüyor, yeni şu tarihte başladı, ikisi birlikte. */
  fetih_cevabi(db, i) {
    const { kod, gecis, alan, cevap } = i.veri as { kod: string; gecis: string; alan: string; cevap: { durum?: unknown; tarih?: unknown } | null };
    if (typeof kod !== 'string' || typeof gecis !== 'string' || typeof alan !== 'string') return;
    if (!cevap || !['suruyor', 'yeni', 'birlikte'].includes(cevap.durum as string)) db.exec({ sql: 'DELETE FROM fetih_cevaplari WHERE kayit=? AND gecis=? AND alan=?', bind: [kod, gecis, alan] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO fetih_cevaplari(kayit, gecis, alan, durum, tarih) VALUES(?,?,?,?,?)',
      bind: [kod, gecis, alan, cevap.durum as string, cevap.durum === 'yeni' && cevap.tarih ? JSON.stringify(cevap.tarih) : null] });
    alanYaz(db, i, kod, `fetih:${gecis}:${alan}`, cevap ?? null);
  },
  /** Süreç kuralı (§3.10): bir kayda ait adımlar, önkoşullar, eşikler; olayda adım durumları. */
  surec_kurali_olustur(db, i) {
    const v = i.veri as Record<string, unknown>;
    if (typeof v.kod !== 'string' || typeof v.sahip !== 'string') return;
    db.exec({ sql: 'INSERT OR IGNORE INTO surec_kurallari(kod, sahip, ad, olusturma) VALUES(?,?,?,?)',
      bind: [v.kod, yonlendirNotla(db, v.sahip, 'surec_kurallari', 'sahip', v.kod) as string, String(v.ad ?? '').slice(0, 120), i.zaman] });
  },
  surec_kurali_yaz(db, i) {
    const { kod, tanim } = i.veri as { kod: string; tanim: { ad?: unknown; kosullar?: unknown; adimlar?: unknown } | null };
    if (typeof kod !== 'string' || !tanim) return;
    db.exec({ sql: 'UPDATE surec_kurallari SET ad=?, kosullar=?, adimlar=? WHERE kod=?',
      bind: [String(tanim.ad ?? '').slice(0, 120), String(tanim.kosullar ?? '').slice(0, 1000), JSON.stringify(Array.isArray(tanim.adimlar) ? tanim.adimlar.slice(0, 40) : []), kod] });
    alanYaz(db, i, kod, 'kural', tanim);
  },
  surec_kurali_sil(db, i) {
    db.exec({ sql: 'UPDATE surec_kurallari SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  surec_kurali_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE surec_kurallari SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },
  surec_bagla(db, i) {
    const { olay, kural, bagli } = i.veri as { olay: string; kural: string; bagli: boolean };
    if (typeof olay !== 'string' || typeof kural !== 'string') return;
    const o = yonlendir(db, olay) as string;
    const var_ = db.selectValue('SELECT kod FROM surec_baglari WHERE olay=? AND kural=?', [o, kural]) as string | undefined;
    if (bagli && var_) db.exec({ sql: 'UPDATE surec_baglari SET silindi=NULL WHERE kod=?', bind: [var_] });
    else if (bagli) db.exec({ sql: 'INSERT INTO surec_baglari(kod, olay, kural, olusturma) VALUES(?,?,?,?)', bind: [i.kod, yonlendirNotla(db, olay, 'surec_baglari', 'olay', i.kod) as string, kural, i.zaman] });
    else if (var_) db.exec({ sql: 'UPDATE surec_baglari SET silindi=?, fiili=0 WHERE kod=?', bind: [i.zaman, var_] });
  },
  surec_adimi(db, i) {
    const { olay, kural, adim, durum } = i.veri as { olay: string; kural: string; adim: string; durum: string | null };
    if (typeof olay !== 'string' || typeof kural !== 'string' || typeof adim !== 'string') return;
    const o = yonlendir(db, olay) as string;
    const var_ = db.selectValue('SELECT kod FROM surec_adimlari WHERE olay=? AND kural=? AND adim=?', [o, kural, adim]) as string | undefined;
    if (!durum || !['planlandi', 'basladi', 'tamam', 'yarida', 'yapilmadi'].includes(durum)) { if (var_) db.exec({ sql: 'DELETE FROM surec_adimlari WHERE kod=?', bind: [var_] }); }
    else if (var_) db.exec({ sql: 'UPDATE surec_adimlari SET durum=? WHERE kod=?', bind: [durum, var_] });
    else db.exec({ sql: 'INSERT INTO surec_adimlari(kod, olay, kural, adim, durum) VALUES(?,?,?,?,?)', bind: [i.kod, yonlendirNotla(db, olay, 'surec_adimlari', 'olay', i.kod) as string, kural, adim, durum] });
    alanYaz(db, i, o, `surec:${kural}:${adim}`, durum && ['planlandi', 'basladi', 'tamam', 'yarida', 'yapilmadi'].includes(durum) ? durum : null);
  },
  /** Çatışan otoriteler: hangi kuralın hükmünün fiilen uygulandığı ayrıca kaydedilir. */
  surec_fiili(db, i) {
    const { olay, kural } = i.veri as { olay: string; kural: string | null };
    if (typeof olay !== 'string') return;
    const o = yonlendir(db, olay) as string;
    db.exec({ sql: 'UPDATE surec_baglari SET fiili=(kural IS ?) WHERE olay=?', bind: [typeof kural === 'string' ? kural : null, o] });
    alanYaz(db, i, o, 'surec_fiili', typeof kural === 'string' ? kural : null);
  },
  /** Hukuk kuralı (§15-11): koşul → yasak / hak / yükümlülük → yaptırım; fiilî uygulama ayrı. */
  hukuk_kurali_olustur(db, i) {
    const v = i.veri as Record<string, unknown>;
    if (typeof v.kod !== 'string' || typeof v.sahip !== 'string' || !v.tanim) return;
    db.exec({ sql: 'INSERT OR IGNORE INTO hukuk_kurallari(kod, sahip, tanim, olusturma) VALUES(?,?,?,?)',
      bind: [v.kod, yonlendirNotla(db, v.sahip, 'hukuk_kurallari', 'sahip', v.kod) as string, JSON.stringify(v.tanim), i.zaman] });
  },
  hukuk_kurali_yaz(db, i) {
    const { kod, tanim } = i.veri as { kod: string; tanim: unknown };
    if (typeof kod !== 'string' || !tanim || typeof tanim !== 'object') return;
    db.exec({ sql: 'UPDATE hukuk_kurallari SET tanim=? WHERE kod=?', bind: [JSON.stringify(tanim), kod] });
    alanYaz(db, i, kod, 'hukuk', tanim);
  },
  hukuk_kurali_sil(db, i) {
    db.exec({ sql: 'UPDATE hukuk_kurallari SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  hukuk_kurali_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE hukuk_kurallari SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },
  /** Kesintiye dayanıklılık (F10): bir bağın dayanma süresi ve ikamesi. */
  dayaniklilik_yaz(db, i) {
    const { iliski, deger } = i.veri as { iliski: string; deger: unknown };
    if (typeof iliski !== 'string') return;
    if (!deger || typeof deger !== 'object') db.exec({ sql: 'DELETE FROM dayaniklilik WHERE iliski=?', bind: [iliski] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO dayaniklilik(iliski, deger) VALUES(?,?)', bind: [iliski, JSON.stringify(deger)] });
    alanYaz(db, i, iliski, 'dayaniklilik', deger ?? null);
  },
  /** Haberleşme yönteminin kanal tanımı (§15-3). */
  kanal_yaz(db, i) {
    const { kod, tanim } = i.veri as { kod: string; tanim: unknown };
    if (typeof kod !== 'string' || !tanim || typeof tanim !== 'object') return;
    db.exec({ sql: 'INSERT OR REPLACE INTO haber_kanallari(kod, tanim) VALUES(?,?)', bind: [kod, JSON.stringify(tanim)] });
    alanYaz(db, i, kod, 'kanal', tanim);
  },
  /** Haberin çıkış yeri, tarihi ve kanalları. */
  haber_cikis_yaz(db, i) {
    const { kod, cikis } = i.veri as { kod: string; cikis: { yer?: unknown; tarih?: unknown; kanallar?: unknown } | null };
    if (typeof kod !== 'string' || !cikis || typeof cikis !== 'object') return;
    const yer = typeof cikis.yer === 'string' ? yonlendirNotla(db, cikis.yer, 'haber_cikislari', 'yer', kod) : null;
    const kanallar = Array.isArray(cikis.kanallar) ? cikis.kanallar.filter((x): x is string => typeof x === 'string') : [];
    db.exec({ sql: 'INSERT OR REPLACE INTO haber_cikislari(kod, yer, tarih, kanallar) VALUES(?,?,?,?)', bind: [kod, yer, cikis.tarih ? JSON.stringify(cikis.tarih) : null, JSON.stringify(kanallar)] });
    alanYaz(db, i, kod, 'haber_cikis', cikis);
  },
  /** Dil tanımı (§15-4). */
  dil_yaz(db, i) {
    const { kod, tanim } = i.veri as { kod: string; tanim: unknown };
    if (typeof kod !== 'string' || !tanim || typeof tanim !== 'object') return;
    db.exec({ sql: 'INSERT OR REPLACE INTO dil_tanimlari(kod, tanim) VALUES(?,?)', bind: [kod, JSON.stringify(tanim)] });
    alanYaz(db, i, kod, 'dil', tanim);
  },
  /** Kaydın bir dildeki biçimi; yazar seçmeden yazılmaz. */
  ad_bicimi_yaz(db, i) {
    const { kayit, dil, deger } = i.veri as { kayit: string; dil: string; deger: unknown };
    if (typeof kayit !== 'string' || typeof dil !== 'string') return;
    const r = db.selectValue('SELECT bicimler FROM ad_bicimleri WHERE kod=?', [kayit]) as string | undefined;
    const m = r ? JSON.parse(r) as Record<string, unknown> : {};
    if (deger && typeof deger === 'object') m[dil] = deger; else delete m[dil];
    db.exec({ sql: 'INSERT OR REPLACE INTO ad_bicimleri(kod, bicimler) VALUES(?,?)', bind: [kayit, JSON.stringify(m)] });
    alanYaz(db, i, kayit, `ad_bicimi:${dil}`, deger ?? null);
  },
  /** Dil yeterliliği: konuşma, anlama, okuma, yazma ayrı. */
  dil_yeterliligi_yaz(db, i) {
    const { iliski, deger } = i.veri as { iliski: string; deger: unknown };
    if (typeof iliski !== 'string') return;
    if (!deger || typeof deger !== 'object') db.exec({ sql: 'DELETE FROM dil_yeterlilikleri WHERE iliski=?', bind: [iliski] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO dil_yeterlilikleri(iliski, deger) VALUES(?,?)', bind: [iliski, JSON.stringify(deger)] });
    alanYaz(db, i, iliski, 'dil_yeterliligi', deger ?? null);
  },
  /** Teknolojinin alanlara göre düzeyi ve keşif, yayılma, gündelik hayata girme kayıtları. */
  teknoloji_yaz(db, i) {
    const { kod, tanim } = i.veri as { kod: string; tanim: unknown };
    if (typeof kod !== 'string' || !tanim || typeof tanim !== 'object') return;
    db.exec({ sql: 'INSERT OR REPLACE INTO teknoloji_tanimlari(kod, tanim) VALUES(?,?)', bind: [kod, JSON.stringify(tanim)] });
    alanYaz(db, i, kod, 'teknoloji', tanim);
  },
  /** Motifin yorumlayana ve döneme göre yorumları. */
  motif_yorum_yaz(db, i) {
    const { kod, yorumlar } = i.veri as { kod: string; yorumlar: unknown };
    if (typeof kod !== 'string' || !Array.isArray(yorumlar)) return;
    db.exec({ sql: 'INSERT OR REPLACE INTO motif_yorumlari(kod, yorumlar) VALUES(?,?)', bind: [kod, JSON.stringify(yorumlar)] });
    alanYaz(db, i, kod, 'motif_yorumlari', yorumlar);
  },
  /** Çalışma masası (§5.9): kayıtlar kopyalanmaz, masa onlara bağlanır. */
  masa_olustur(db, i) {
    const v = i.veri as { kod?: unknown; ad?: unknown };
    if (typeof v.kod !== 'string') return;
    db.exec({ sql: 'INSERT OR IGNORE INTO masalar(kod, ad, olusturma, duzenleme) VALUES(?,?,?,?)', bind: [v.kod, String(v.ad ?? '').slice(0, 120), i.zaman, i.zaman] });
  },
  masa_yaz(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (typeof kod !== 'string') return;
    const metin = (n: number) => String(deger ?? '').slice(0, n);
    const deg: Record<string, () => unknown> = {
      ad: () => metin(120), amac: () => metin(300), notlar: () => metin(10000),
      bas: () => (deger ? JSON.stringify(tz(db, deger)) : null), bit: () => (deger ? JSON.stringify(tz(db, deger)) : null),
      paket: () => (typeof deger === 'string' ? deger : null),
      uyeler: () => JSON.stringify((Array.isArray(deger) ? deger : []).filter((u: { tur?: unknown; kod?: unknown }) => (u?.tur === 'kayit' || u?.tur === 'harita') && typeof u.kod === 'string')
        .slice(0, 500).map((u: { tur: string; kod: string }) => ({ tur: u.tur, kod: u.tur === 'kayit' ? yonlendir(db, u.kod) : u.kod }))),
    };
    if (!deg[alan]) return;
    db.exec({ sql: `UPDATE masalar SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [deg[alan]() as string | null, i.zaman, kod] });
    alanYaz(db, i, kod, alan, deger ?? null);
  },
  masa_sil(db, i) {
    db.exec({ sql: 'UPDATE masalar SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  masa_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE masalar SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },
  /** Varsayım paketi (§3.11): birlikte geçerli sayılan varsayımlar; kanona yazılmaz. */
  paket_olustur(db, i) {
    const v = i.veri as { kod?: unknown; ad?: unknown };
    if (typeof v.kod !== 'string') return;
    db.exec({ sql: 'INSERT OR IGNORE INTO paketler(kod, ad, olusturma, duzenleme) VALUES(?,?,?,?)', bind: [v.kod, String(v.ad ?? '').slice(0, 120), i.zaman, i.zaman] });
  },
  paket_yaz(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    if (typeof kod !== 'string' || !['ad', 'aciklama', 'varsayimlar'].includes(alan)) return;
    const v = alan === 'varsayimlar' ? JSON.stringify(varsayimlarTemiz(db, deger)) : String(deger ?? '').slice(0, alan === 'ad' ? 120 : 1000);
    db.exec({ sql: `UPDATE paketler SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [v, i.zaman, kod] });
    alanYaz(db, i, kod, alan, deger ?? null);
  },
  paket_sil(db, i) {
    db.exec({ sql: 'UPDATE paketler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  paket_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE paketler SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
  },
  iz_gozlem(db, i) {
    const { iz, sahne, an, deger } = i.veri as { iz: string; sahne: string; an: string; deger: unknown };
    if (typeof iz !== 'string' || typeof sahne !== 'string' || (an !== 'bas' && an !== 'son')) return;
    const s = yonlendir(db, sahne);
    if (typeof deger !== 'string' || !deger) db.exec({ sql: 'DELETE FROM iz_gozlemleri WHERE iz=? AND sahne=? AND an=?', bind: [iz, s, an] });
    else db.exec({ sql: 'INSERT OR REPLACE INTO iz_gozlemleri(iz, sahne, an, deger, duzenleme) VALUES(?,?,?,?,?)', bind: [iz, s, an, deger.slice(0, 200), i.zaman] });
    alanYaz(db, i, iz, `gozlem:${s}:${an}`, typeof deger === 'string' && deger ? deger : null);
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
      bind: [v.kod, String(v.ad), yonlendirNotla(db, v.yer ?? null, 'haritalar', 'yer', v.kod), v.en, v.boy,
        JSON.stringify([{ kod: 'ana', ad: 'Ana görsel', gorsel: v.gorsel, donusum: BIRIM }]), i.zaman, i.zaman] });
  },
  /** Harita katmanı (§8.1, §8.5): aynı uzaya oturtulmuş başka bir görsel (eski harita, eskiz, yeniden çizim). */
  harita_katman_ekle(db, i) {
    const { harita, katman } = i.veri as { harita: string; katman: { kod: string; ad: string; gorsel: string; donusum: unknown } };
    const ham = db.selectValue('SELECT katmanlar FROM haritalar WHERE kod=?', [harita]) as string | undefined;
    if (ham === undefined || !katman || typeof katman.kod !== 'string' || typeof katman.gorsel !== 'string' || !donusumGecerli(katman.donusum)) return;
    const l = JSON.parse(ham) as { kod: string }[];
    if (l.some((k) => k.kod === katman.kod)) return;
    l.push({ kod: katman.kod, ad: String(katman.ad ?? ''), gorsel: katman.gorsel, donusum: katman.donusum } as { kod: string });
    db.exec({ sql: 'UPDATE haritalar SET katmanlar=?, duzenleme=? WHERE kod=?', bind: [JSON.stringify(l), i.zaman, harita] });
  },
  harita_katman(db, i) {
    const { harita, katman, alan, deger } = i.veri as { harita: string; katman: string; alan: string; deger: unknown };
    const ham = db.selectValue('SELECT katmanlar FROM haritalar WHERE kod=?', [harita]) as string | undefined;
    if (ham === undefined) return;
    const l = JSON.parse(ham) as Record<string, unknown>[];
    const k = l.find((x) => x.kod === katman);
    if (!k) return;
    if (alan === 'ad' && typeof deger === 'string') k.ad = deger.slice(0, 200);
    else if (alan === 'silindi') { if (deger) k.silindi = i.zaman; else delete k.silindi; }
    else if (alan === 'donusum') {
      const d = deger as { donusum: unknown; noktalar?: unknown } | null;
      if (!d || !donusumGecerli(d.donusum)) return;
      k.onceki = k.donusum; k.donusum = d.donusum;
      if (Array.isArray(d.noktalar)) k.noktalar = d.noktalar.slice(0, 50); else delete k.noktalar;
    } else if (alan === 'gorsel') {
      const d = deger as { gorsel: unknown; donusum: unknown } | null;
      if (!d || typeof d.gorsel !== 'string' || !donusumGecerli(d.donusum)) return;
      k.gorsel = d.gorsel; k.onceki = k.donusum; k.donusum = d.donusum; delete k.noktalar;
    } else return;
    db.exec({ sql: 'UPDATE haritalar SET katmanlar=?, duzenleme=? WHERE kod=?', bind: [JSON.stringify(l), i.zaman, harita] });
    alanYaz(db, i, harita, `katman:${katman}:${alan}`, deger ?? null);
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
  /** Haritada çizim (§8.2): bölge (çokgen; fiilî denetim ya da iddia) ya da yol çizgisi. Zamanla değişir (§3.5). */
  cizim_ekle(db, i) {
    const v = i.veri as { kod: string; harita: string; kayit: string; bicim: string; kip?: string | null; noktalar: unknown; baslangic?: unknown; bitis?: unknown };
    const n = cizimNoktalari(db, v.harita, v.bicim, v.noktalar);
    if (!n || typeof v.kayit !== 'string') return;
    db.exec({ sql: 'INSERT OR IGNORE INTO cizimler(kod, harita, kayit, bicim, kip, noktalar, baslangic, bitis, olusturma, duzenleme) VALUES(?,?,?,?,?,?,?,?,?,?)',
      bind: [v.kod, v.harita, yonlendirNotla(db, v.kayit, 'cizimler', 'kayit', v.kod), v.bicim, v.bicim === 'bolge' ? (v.kip === 'iddia' ? 'iddia' : 'denetim') : null,
        JSON.stringify(n), json(sinirTz(db, v.baslangic)), json(sinirTz(db, v.bitis)), i.zaman, i.zaman] });
  },
  cizim_degistir(db, i) {
    const { kod, alan, deger } = i.veri as { kod: string; alan: string; deger: unknown };
    const r = db.selectObject('SELECT harita, bicim FROM cizimler WHERE kod=?', [kod]);
    if (!r) return;
    let d: string | null;
    if (alan === 'noktalar') { const n = cizimNoktalari(db, r.harita as string, r.bicim as string, deger); if (!n) return; d = JSON.stringify(n); }
    else if (alan === 'kayit' && typeof deger === 'string') d = yonlendir(db, deger);
    else if (alan === 'kip' && r.bicim === 'bolge' && (deger === 'denetim' || deger === 'iddia')) d = deger;
    else if (alan === 'baslangic' || alan === 'bitis') d = json(sinirTz(db, deger));
    else return;
    db.exec({ sql: `UPDATE cizimler SET ${alan}=?, duzenleme=? WHERE kod=?`, bind: [d, i.zaman, kod] });
    alanYaz(db, i, kod, alan, deger ?? null);
  },
  /** Rota (§4.2, §8.4 süre ağı): iki uç, elle girilmiş mesafe, koşula göre süreler, duraklar. Program koşulu yorumlamaz. */
  rota_yaz(db, i) {
    const { kod, rota } = i.veri as { kod: string; rota: { a?: unknown; b?: unknown; mesafe?: unknown; sureler?: unknown; duraklar?: unknown } | null };
    if (typeof kod !== 'string') return;
    if (!rota) db.exec({ sql: 'DELETE FROM rotalar WHERE kod=?', bind: [kod] });
    else {
      const k = (x: unknown) => (typeof x === 'string' ? yonlendir(db, x) : null);
      const m = rota.mesafe as { deger?: unknown; birim?: unknown } | null;
      const mesafe = m && Number.isFinite(m.deger) && (m.deger as number) >= 0 ? { deger: m.deger, birim: String(m.birim ?? '').slice(0, 30) } : null;
      const sureler = (Array.isArray(rota.sureler) ? rota.sureler : []).slice(0, 30)
        .filter((x: { gun?: unknown }) => Number.isFinite(x?.gun) && (x.gun as number) > 0).map((x: { kosul?: unknown; gun: number }) => ({ kosul: String(x.kosul ?? '').slice(0, 80), gun: x.gun }));
      const duraklar = (Array.isArray(rota.duraklar) ? rota.duraklar : []).filter((x): x is string => typeof x === 'string').slice(0, 50);
      db.exec({ sql: 'INSERT OR REPLACE INTO rotalar(kod, a, b, mesafe, sureler, duraklar) VALUES(?,?,?,?,?,?)',
        bind: [kod, k(rota.a), k(rota.b), mesafe ? JSON.stringify(mesafe) : null, JSON.stringify(sureler), JSON.stringify(duraklar)] });
    }
    alanYaz(db, i, kod, 'rota', rota ?? null);
  },
  /** Yolculuk (§4.2): belirli bir zamanda yer yer ilerleyen aşamalar; planlanan ve gerçekleşen ayrı işaretlenir. */
  yolculuk_yaz(db, i) {
    const { kod, asamalar } = i.veri as { kod: string; asamalar: unknown };
    if (typeof kod !== 'string' || !Array.isArray(asamalar)) return;
    const k = (x: unknown) => (typeof x === 'string' ? x : null);
    const l = asamalar.slice(0, 100).map((a: Record<string, unknown>) => ({
      nereden: k(a?.nereden), nereye: k(a?.nereye), rota: k(a?.rota), cikis: tz(db, a?.cikis) ?? null, varis: tz(db, a?.varis) ?? null,
      durum: a?.durum === 'plan' ? 'plan' : 'gerceklesti',
    }));
    db.exec({ sql: 'INSERT OR REPLACE INTO yolculuklar(kod, asamalar) VALUES(?,?)', bind: [kod, JSON.stringify(l)] });
    alanYaz(db, i, kod, 'asamalar', asamalar);
  },
  cizim_sil(db, i) {
    db.exec({ sql: 'UPDATE cizimler SET silindi=? WHERE kod=? AND silindi IS NULL', bind: [i.zaman, i.veri.kod as string] });
  },
  cizim_geri_yukle(db, i) {
    db.exec({ sql: 'UPDATE cizimler SET silindi=NULL WHERE kod=?', bind: [i.veri.kod as string] });
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
    goreliYenile(db);
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
    goreliYenile(db);
  },

  /** İnceleme kuyruğu (§9.3): bulgu gerekçeyle kabul edilir ya da ertelenir; null karar kuyruğa geri koyar. */
  inceleme_karari(db, i) {
    const { anahtar, durum, gerekce, dayanak, istisna } = i.veri as { anahtar: string; durum: string | null; gerekce?: string; dayanak?: string; istisna?: string | null };
    if (typeof anahtar !== 'string' || !anahtar) return;
    if (durum === 'kabul' || durum === 'ertelendi' || durum === 'duzeltildi') {
      const ist = durum === 'kabul' && (istisna === 'tercih' || istisna === 'kapsam') ? istisna : null;
      db.exec({ sql: 'INSERT OR REPLACE INTO inceleme_kararlari(anahtar, durum, gerekce, dayanak, istisna, zaman) VALUES(?,?,?,?,?,?)', bind: [anahtar, durum, gerekce ?? '', dayanak ?? '', ist, i.zaman] });
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
