// Bir evrenin yerel veritabanı. Her evren ayrı dosyadır (ayrı eşitlenir ve yedeklenir, §10.1).
// Yazma tek yoldan yapılır: islemYap(). İşlem günlüğe yazılır ve aynı veritabanı işleminde uygulanır;
// görünen tablolar (izdüşüm) yalnızca işlemlerden türetilir ve yenidenKur() ile baştan üretilebilir.
//
// Uygulama sırası (saat, kurulum, sıra) sırasıdır. Bir işlem gördüğü her işlemden sonra gelir; birbirini
// görmemiş işlemlerin sırası her cihazda aynı kuralla belirlenir. Başka cihazdan gelen bir işlem bu cihazın
// zaten uyguladığı bir işlemden önceye düşerse tablolar günlükten baştan kurulur.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { VERI_BICIMI, type Islem, type IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { UYGULAYICILAR, sonrasi, IZDUSUM_SEMA, IZDUSUM_SURUMU, IZDUSUM_TABLOLARI, metinBelleginiTemizle } from './izdusum';

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
  saat INTEGER,
  UNIQUE(kurulum, sira)
);
CREATE INDEX IF NOT EXISTS islemler_grup ON islemler(grup);
CREATE TABLE IF NOT EXISTS bekleyen_islemler(kod TEXT PRIMARY KEY, islem TEXT NOT NULL, ikili BLOB);
`;

export class VeriBicimiHatasi extends Error {}

type Anahtar = [number, string, number];
const anahtarKarsilastir = (a: Anahtar, b: Anahtar) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || a[2] - b[2];
const anahtari = (i: Islem): Anahtar => [i.saat!, i.kurulum, i.sira];

export interface AlmaSonucu { alinan: number; bekleyen: number; bastanKuruldu: boolean; islemler: Islem[] }

export class EvrenVt {
  /** Bilinen her kurulumun bu cihazda bulunan son sırası (görülenler). */
  private gorulen: Record<string, number> = {};
  /** Uygulanmış en son işlemin sıra anahtarı. */
  private son: Anahtar = [0, '', 0];

  constructor(readonly db: Database, readonly kurulum: string) {
    db.exec('PRAGMA foreign_keys=ON;');
    db.exec(GUNLUK_SEMA);
    const bicim = db.selectValue("SELECT v FROM meta WHERE k='veri_bicimi'") as string | undefined;
    if (bicim === undefined) db.exec({ sql: "INSERT INTO meta VALUES('veri_bicimi', ?)", bind: [String(VERI_BICIMI)] });
    else if (Number(bicim) > VERI_BICIMI) throw new VeriBicimiHatasi(`Bu evren daha yeni bir sürümle kaydedilmiş (biçim ${bicim}). Güncelleme gerekli.`);
    this.saatleriTamamla();
    db.exec('CREATE INDEX IF NOT EXISTS islemler_sira ON islemler(saat, kurulum, sira)');
    const izdusum = Number(this.meta('izdusum_surumu') ?? 0);
    if (izdusum !== IZDUSUM_SURUMU) {
      // Tabloların yapısı değişti: tablolar silinir ve günlükten baştan kurulur (veri günlükte durur).
      for (const t of IZDUSUM_TABLOLARI) db.exec(`DROP TABLE IF EXISTS ${t}`);
      db.exec(IZDUSUM_SEMA);
      this.yenidenKur();
      db.exec({ sql: "INSERT INTO meta VALUES('izdusum_surumu', ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", bind: [String(IZDUSUM_SURUMU)] });
    } else db.exec(IZDUSUM_SEMA);
    for (const r of db.selectObjects('SELECT kurulum, max(sira) s FROM islemler GROUP BY kurulum')) {
      this.gorulen[r.kurulum as string] = Number(r.s);
    }
    const s = db.selectObject('SELECT saat, kurulum, sira FROM islemler ORDER BY saat DESC, kurulum DESC, sira DESC LIMIT 1');
    if (s) this.son = [Number(s.saat), s.kurulum as string, Number(s.sira)];
  }

  /** Saat sütunu eklenmeden önce yazılmış işlemlere saat verir (eski veritabanları). */
  private saatleriTamamla() {
    const sutunlar = this.db.selectObjects('PRAGMA table_info(islemler)').map((r) => r.name);
    if (!sutunlar.includes('saat')) this.db.exec('ALTER TABLE islemler ADD COLUMN saat INTEGER');
    if (this.db.selectValue('SELECT 1 FROM islemler WHERE saat IS NULL LIMIT 1') === undefined) return;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const r of this.db.selectObjects('SELECT no, kurulum, sira, gordu FROM islemler ORDER BY no')) {
        const saat = this.saatHesapla(JSON.parse(r.gordu as string));
        this.db.exec({ sql: 'UPDATE islemler SET saat=? WHERE no=?', bind: [saat, r.no as number] });
      }
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  /** Gördüğü işlemlerin saatlerinin en büyüğünden bir fazlası. */
  private saatHesapla(gordu: Record<string, number>): number {
    let en = 0;
    for (const [k, s] of Object.entries(gordu)) {
      const v = this.db.selectValue('SELECT saat FROM islemler WHERE kurulum=? AND sira=?', [k, s]);
      if (v !== undefined && v !== null) en = Math.max(en, Number(v));
    }
    return en + 1;
  }

  meta(k: string): string | undefined {
    return this.db.selectValue('SELECT v FROM meta WHERE k=?', [k]) as string | undefined;
  }

  /** Bu cihazdaki işlemlerin özeti: kurulum → son sıra. */
  gorulenler(): Record<string, number> { return { ...this.gorulen }; }

  /**
   * Bir ya da birden çok değişikliği tek işlem grubu olarak yazar ve uygular (§10.4).
   * Hepsi ya birlikte yazılır ya hiçbiri.
   */
  islemYap(girdiler: IslemGirdisi[], zaman = Date.now()): Islem[] {
    if (!girdiler.length) return [];
    const grup = girdiler.length > 1 ? yeniKod(zaman) : null;
    const yazilan: Islem[] = [];
    const onceki = { ...this.gorulen };
    const oncekiSon = this.son;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const g of girdiler) {
        const sira = (this.gorulen[this.kurulum] ?? 0) + 1;
        const islem: Islem = {
          kod: yeniKod(zaman), kurulum: this.kurulum, sira, zaman, grup,
          tur: g.tur, veri: g.veri, ikili: g.ikili ?? null,
          gordu: { ...this.gorulen }, saat: this.son[0] + 1,
        };
        this.kaydet(islem);
        this.uygula(islem);
        this.gorulen[this.kurulum] = sira;
        this.son = anahtari(islem);
        yazilan.push(islem);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      this.gorulen = onceki;
      this.son = oncekiSon;
      metinBelleginiTemizle(this.db); // bellekteki belgeler geri alınan işlemi içermesin
      throw e;
    }
    return yazilan;
  }

  /**
   * Başka bir kaynaktan gelen işlemleri (eşitleme, yedek paketi) olduğu gibi alır: kodu, kurulumu, sırası ve
   * gördükleri korunur. Zaten olan işlem atlanır. Gördüğü işlemlerden biri henüz bu cihazda yoksa işlem
   * bekletilir ve eksik gelince uygulanır (yarım ulaşan grup hesaplara girmez, §10.4). Hepsi tek veritabanı
   * işleminde yazılır.
   */
  disaridanAl(gelenler: Islem[]): AlmaSonucu {
    const onceki = { ...this.gorulen };
    const oncekiSon = this.son;
    const alinanlar: Islem[] = [];
    let bastan = false;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // Bekleyenler ve yeni gelenler birlikte değerlendirilir.
      const adaylar = new Map<string, Islem>();
      for (const r of this.db.selectObjects('SELECT islem, ikili FROM bekleyen_islemler')) {
        const i = JSON.parse(r.islem as string) as Islem;
        adaylar.set(i.kod, { ...i, ikili: (r.ikili as Uint8Array) ?? null });
      }
      for (const i of gelenler) {
        islemDenetle(i);
        if (adaylar.has(i.kod) || this.db.selectValue('SELECT 1 FROM islemler WHERE kod=?', [i.kod]) !== undefined) continue;
        if ((this.gorulen[i.kurulum] ?? 0) >= i.sira) continue; // aynı yerde başka işlem: bozuk ya da tekrar
        adaylar.set(i.kod, i);
      }
      // Hazır olanları (gördüğü her işlem burada olanları) sırayla al.
      let kalan = [...adaylar.values()];
      for (;;) {
        const hazir = kalan.filter((i) => (this.gorulen[i.kurulum] ?? 0) === i.sira - 1
          && Object.entries(i.gordu).every(([k, s]) => k === i.kurulum ? s === i.sira - 1 : (this.gorulen[k] ?? 0) >= s));
        if (!hazir.length) break;
        // Her turda her kurulumdan yalnızca sıradaki işlem hazırdır; bunlar birbirini görmemiştir.
        const saatli = hazir.map((i) => {
          const saat = this.saatHesapla(i.gordu);
          if (i.saat !== undefined && i.saat !== saat) throw new Error('Gelen değişikliğin sıra bilgisi tutarsız.');
          return { ...i, saat };
        }).sort((a, b) => anahtarKarsilastir(anahtari(a), anahtari(b)));
        for (const islem of saatli) {
          const i = islem;
          this.kaydet(islem);
          const a = anahtari(islem);
          if (!bastan && anahtarKarsilastir(a, this.son) > 0) { this.uygula(islem); this.son = a; }
          else { bastan = true; if (anahtarKarsilastir(a, this.son) > 0) this.son = a; }
          this.gorulen[i.kurulum] = i.sira;
          alinanlar.push(islem);
        }
        const alinan = new Set(hazir.map((i) => i.kod));
        kalan = kalan.filter((i) => !alinan.has(i.kod));
      }
      this.db.exec('DELETE FROM bekleyen_islemler');
      for (const i of kalan) {
        this.db.exec({ sql: 'INSERT INTO bekleyen_islemler(kod, islem, ikili) VALUES(?,?,?)', bind: [i.kod, JSON.stringify({ ...i, ikili: null }), i.ikili ?? null] });
      }
      if (bastan) this.bastanUygula();
      this.db.exec('COMMIT');
      return { alinan: alinanlar.length, bekleyen: kalan.length, bastanKuruldu: bastan, islemler: alinanlar };
    } catch (e) {
      this.db.exec('ROLLBACK');
      this.gorulen = onceki;
      this.son = oncekiSon;
      metinBelleginiTemizle(this.db);
      throw e;
    }
  }

  private kaydet(i: Islem) {
    this.db.exec({
      sql: 'INSERT INTO islemler(kod,kurulum,sira,zaman,grup,tur,veri,ikili,gordu,saat) VALUES(?,?,?,?,?,?,?,?,?,?)',
      bind: [i.kod, i.kurulum, i.sira, i.zaman, i.grup, i.tur, JSON.stringify(i.veri), i.ikili ?? null, JSON.stringify(i.gordu), i.saat!],
    });
  }

  private uygula(i: Islem) {
    const u = UYGULAYICILAR[i.tur];
    // Anlaşılmayan işlem atılmaz: günlükte kalır, yalnızca uygulanmaz (§10.7).
    if (u) { u(this.db, i); sonrasi(this.db, i); }
  }

  /** İzdüşüm tablolarını silip bütün günlüğü baştan uygular (açık bir veritabanı işleminin içinde). */
  private bastanUygula() {
    metinBelleginiTemizle(this.db);
    for (const t of IZDUSUM_TABLOLARI) this.db.exec(`DELETE FROM ${t}`);
    for (const i of this.islemler()) this.uygula(i);
  }

  /** İzdüşüm tablolarını silip bütün günlüğü baştan uygular. Sınama ve onarım için. */
  yenidenKur() {
    this.db.exec('BEGIN IMMEDIATE');
    try { this.bastanUygula(); this.db.exec('COMMIT'); }
    catch (e) { this.db.exec('ROLLBACK'); metinBelleginiTemizle(this.db); throw e; }
  }

  /** İşlemler uygulama sırasıyla (ya da sondan). */
  islemler(sinir = -1, sondan = false): Islem[] {
    const y = sondan ? 'DESC' : 'ASC';
    return this.db.selectObjects(`SELECT * FROM islemler ORDER BY saat ${y}, kurulum ${y}, sira ${y} LIMIT ?`, [sinir]).map(satirdan);
  }

  /** Verilen özetin görmediği işlemler (karşı tarafa gönderilecekler), uygulama sırasıyla. */
  gorulmeyenler(gorulen: Record<string, number>, kurulum?: string): Islem[] {
    const sonuc: Islem[] = [];
    for (const [k, s] of Object.entries(this.gorulen)) {
      if (kurulum && k !== kurulum) continue;
      if ((gorulen[k] ?? 0) >= s) continue;
      sonuc.push(...this.db.selectObjects('SELECT * FROM islemler WHERE kurulum=? AND sira>? ORDER BY sira', [k, gorulen[k] ?? 0]).map(satirdan));
    }
    return sonuc.sort((a, b) => anahtarKarsilastir(anahtari(a), anahtari(b)));
  }

  bekleyenSayisi(): number {
    return Number(this.db.selectValue('SELECT count(*) FROM bekleyen_islemler'));
  }

  islemSayisi(): number {
    return Number(this.db.selectValue('SELECT count(*) FROM islemler'));
  }
}

function satirdan(r: Record<string, unknown>): Islem {
  return {
    kod: r.kod as string, kurulum: r.kurulum as string, sira: Number(r.sira), zaman: Number(r.zaman),
    grup: (r.grup as string) ?? null, tur: r.tur as string, veri: JSON.parse(r.veri as string),
    ikili: (r.ikili as Uint8Array) ?? null, gordu: JSON.parse(r.gordu as string), saat: Number(r.saat),
  };
}

/** Dışarıdan gelen işlemin biçimi doğru mu? Bozuk işlem hiçbir şey yazmadan reddedilir. */
function islemDenetle(i: Islem) {
  const iyi = i && kodGecerliMi(i.kod) && kodGecerliMi(i.kurulum) && Number.isInteger(i.sira) && i.sira > 0
    && typeof i.tur === 'string' && i.veri && typeof i.veri === 'object' && i.gordu && typeof i.gordu === 'object'
    && Object.entries(i.gordu).every(([k, s]) => kodGecerliMi(k) && Number.isInteger(s) && s >= 0)
    && (i.ikili === null || i.ikili === undefined || i.ikili instanceof Uint8Array);
  if (!iyi) throw new Error('Gelen değişikliklerden biri bozuk.');
}
