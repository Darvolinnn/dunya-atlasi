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
import { UYGULAYICILAR, sonrasi, IZDUSUM_SEMA, IZDUSUM_SURUMU, IZDUSUM_TABLOLARI, metinBelleginiTemizle, topluBaslat, topluBirak, topluBitir } from './izdusum';
import { goruntuAl, goruntuBul, goruntuleriSil, goruntuSemasi, goruntuYukle, sonGoruntuIslemi, type Goruntu } from './anlik-goruntu';

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

/**
 * Değişiklik geçmişi yalnızca büyür (§10.1): hiçbir kod yolu bir işlemi silemez ya da değiştiremez. Bu kural
 * veritabanının kendisinde de durur; ileride yazılacak hatalı bir kod geçmişi bozmaya kalkarsa yazma reddedilir.
 * Tek istisna eski veritabanlarına saat verilmesidir (saat boşken yalnızca saat yazılabilir).
 */
const GUNLUK_KORUMASI = `
CREATE TRIGGER IF NOT EXISTS islemler_silinmez BEFORE DELETE ON islemler
BEGIN SELECT RAISE(ABORT, 'Değişiklik geçmişi silinemez.'); END;
CREATE TRIGGER IF NOT EXISTS islemler_degismez BEFORE UPDATE ON islemler
WHEN NOT (OLD.saat IS NULL AND NEW.no = OLD.no AND NEW.kod = OLD.kod AND NEW.kurulum = OLD.kurulum AND NEW.sira = OLD.sira
  AND NEW.zaman = OLD.zaman AND NEW.grup IS OLD.grup AND NEW.tur = OLD.tur AND NEW.veri = OLD.veri AND NEW.ikili IS OLD.ikili
  AND NEW.gordu = OLD.gordu)
BEGIN SELECT RAISE(ABORT, 'Değişiklik geçmişi değiştirilemez.'); END;
`;

export class VeriBicimiHatasi extends Error {}

/**
 * Aynı kurulumun aynı sıra numarasında iki farklı değişiklik: bu cihazın verileri eski bir yedekten geri gelmiş ya da
 * başka bir bilgisayara kopyalanmış olabilir. Hiçbiri sessizce atılmaz; evrenin eşitlemesi durur (§10.5).
 */
export class CatallanmaHatasi extends Error {
  constructor() {
    super('Bu evrenin bu cihazdaki kopyası ile başka bir kopyası ayrı yollara ayrılmış (bu cihazın verileri eski bir yedekten geri gelmiş '
      + 'ya da başka bir bilgisayara kopyalanmış olabilir). Hiçbir şey silinmedi; bu evrenin eşitlemesi durduruldu. Önce bu evrenin '
      + 'dosyaya tam yedeğini alın; sonra evreni bu cihazdan kaldırıp Drive\'dan yeniden indirin ve yedeği ayrı bir evren olarak geri yükleyin.');
  }
}

type Anahtar = [number, string, number];
const anahtarKarsilastir = (a: Anahtar, b: Anahtar) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || a[2] - b[2];
const anahtari = (i: Islem): Anahtar => [i.saat!, i.kurulum, i.sira];

/** Baştan kurmada ilerleme; yalnızca uzun sürecek (çok işlemli) kurmalarda çağrılır. */
export type Ilerleme = (d: { neden: 'guncelleme' | 'kurulum'; yapilan: number; toplam: number }) => void;
/** Bundan az işlemli evrende kurma kısa sürer; ilerleme bildirilmez (ekranda şerit yanıp sönmesin). */
const ILERLEME_ESIGI = 5000;

export interface AlmaSonucu { alinan: number; bekleyen: number; bastanKuruldu: boolean; islemler: Islem[] }

export class EvrenVt {
  /** Bilinen her kurulumun bu cihazda bulunan son sırası (görülenler). */
  private gorulen: Record<string, number> = {};
  /** Uygulanmış en son işlemin sıra anahtarı. */
  private son: Anahtar = [0, '', 0];
  /** Günlükteki işlem sayısı (her kayıtta saymamak için bellekte tutulur). */
  private islemAdedi = 0;
  /** `topluYaz` içindeyken islemYap kendi veritabanı işlemini açmaz, dıştakinin içinde bir kayıt noktası kullanır. */
  private topluDerinlik = 0;
  /** Bu kadar işlemde bir anlık görüntü alınır (§10.1). Sınamalar küçültebilir. */
  static goruntuAraligi = 5000;
  /** Son baştan kurmanın nasıl yapıldığı (sınama ve ölçüm için). */
  sonKurma: { goruntudenMi: boolean; uygulanan: number } | null = null;

  /** Bitmemiş bildirilmiş kurma; kurma hatayla yarıda kalırsa şerit bununla kapatılır. */
  private acikIlerleme: { neden: 'guncelleme' | 'kurulum'; toplam: number } | null = null;

  constructor(readonly db: Database, readonly kurulum: string, private readonly bildirim: Ilerleme = () => {}) {
    db.exec('PRAGMA foreign_keys=ON;');
    // Yeni dosyada bütün tablolar tek veritabanı işleminde kurulur: tablo tablo ayrı kaydetmek tarayıcının dosya
    // deposunda yeni evren oluşturmayı saniyelerce uzatıyordu. Günlük boş olduğu için baştan kurmaya gerek yoktur.
    if (db.selectValue("SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta'") === undefined) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec(GUNLUK_SEMA);
        db.exec(GUNLUK_KORUMASI);
        db.exec(IZDUSUM_SEMA);
        goruntuSemasi(db);
        db.exec('CREATE INDEX IF NOT EXISTS islemler_sira ON islemler(saat, kurulum, sira)');
        db.exec({ sql: "INSERT INTO meta VALUES('veri_bicimi', ?), ('izdusum_surumu', ?)", bind: [String(VERI_BICIMI), String(IZDUSUM_SURUMU)] });
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
      return;
    }
    db.exec(GUNLUK_SEMA);
    const bicim = db.selectValue("SELECT v FROM meta WHERE k='veri_bicimi'") as string | undefined;
    if (bicim === undefined) db.exec({ sql: "INSERT INTO meta VALUES('veri_bicimi', ?)", bind: [String(VERI_BICIMI)] });
    else if (Number(bicim) > VERI_BICIMI) throw new VeriBicimiHatasi(`Bu evren programın daha yeni bir sürümüyle kaydedilmiş (biçim ${bicim}). Açmak için programı güncelleyin.`);
    else if (Number(bicim) < VERI_BICIMI) db.exec({ sql: "UPDATE meta SET v=? WHERE k='veri_bicimi'", bind: [String(VERI_BICIMI)] });
    this.saatleriTamamla();
    db.exec(GUNLUK_KORUMASI);
    db.exec('CREATE INDEX IF NOT EXISTS islemler_sira ON islemler(saat, kurulum, sira)');
    const izdusum = Number(this.meta('izdusum_surumu') ?? 0);
    if (izdusum !== IZDUSUM_SURUMU) {
      // Tabloların yapısı değişti: tablolar ve eski görüntüleri silinir, günlükten baştan kurulur (veri günlükte durur).
      goruntuSemasi(db);
      goruntuleriSil(db);
      for (const t of IZDUSUM_TABLOLARI) db.exec(`DROP TABLE IF EXISTS ${t}`);
      db.exec(IZDUSUM_SEMA);
      this.yenidenKur('guncelleme');
      db.exec({ sql: "INSERT INTO meta VALUES('izdusum_surumu', ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", bind: [String(IZDUSUM_SURUMU)] });
    } else db.exec(IZDUSUM_SEMA);
    goruntuSemasi(db);
    this.islemAdedi = this.islemSayisi();
    for (const r of db.selectObjects('SELECT kurulum, max(sira) s FROM islemler GROUP BY kurulum')) {
      this.gorulen[r.kurulum as string] = Number(r.s);
    }
    const s = db.selectObject('SELECT saat, kurulum, sira FROM islemler ORDER BY saat DESC, kurulum DESC, sira DESC LIMIT 1');
    if (s) this.son = [Number(s.saat), s.kurulum as string, Number(s.sira)];
  }

  private ilerleme(d: Parameters<Ilerleme>[0]) {
    this.acikIlerleme = d.yapilan >= d.toplam ? null : { neden: d.neden, toplam: d.toplam };
    this.bildirim(d);
  }

  /** Kurma hatayla yarıda kaldıysa şeridin ekranda asılı kalmaması için bitişi bildirir. */
  private ilerlemeyiKapat() {
    const a = this.acikIlerleme;
    if (a) this.ilerleme({ neden: a.neden, yapilan: a.toplam, toplam: a.toplam });
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

  /** Toplu yazma sürüyor mu (o sırada eşitleme bu evreni atlar). */
  get topluSuruyor() { return this.topluDerinlik > 0; }

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
    const icte = this.topluDerinlik > 0;
    this.db.exec(icte ? 'SAVEPOINT islem_yap' : 'BEGIN IMMEDIATE');
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
      this.db.exec(icte ? 'RELEASE islem_yap' : 'COMMIT');
    } catch (e) {
      this.db.exec(icte ? 'ROLLBACK TO islem_yap; RELEASE islem_yap' : 'ROLLBACK');
      this.gorulen = onceki;
      this.son = oncekiSon;
      metinBelleginiTemizle(this.db); // bellekteki belgeler geri alınan işlemi içermesin
      throw e;
    }
    this.islemAdedi += yazilan.length;
    if (!icte) this.goruntuGerekirseAl();
    return yazilan;
  }

  /**
   * İçindeki bütün islemYap çağrılarını tek veritabanı işleminde diske yazar (örnek evren kurulumu gibi çok sayıda
   * küçük yazı). Her çağrı yine ayrı işlem ya da işlem grubudur ve günlükteki sırası aynıdır; yalnız diske tek seferde
   * yazılır. Biri hata verirse yalnız o geri alınır; `yap` hata verirse hepsi geri alınır.
   */
  async topluYaz<T>(yap: () => Promise<T> | T): Promise<T> {
    if (this.topluDerinlik) return yap();
    const onceki = { ...this.gorulen }, oncekiSon = this.son, oncekiAdet = this.islemAdedi;
    this.db.exec('BEGIN IMMEDIATE');
    this.topluDerinlik++;
    let sonuc: T;
    try { sonuc = await yap(); }
    catch (e) {
      this.topluDerinlik--;
      this.db.exec('ROLLBACK');
      this.gorulen = onceki; this.son = oncekiSon; this.islemAdedi = oncekiAdet;
      metinBelleginiTemizle(this.db);
      throw e;
    }
    this.topluDerinlik--;
    this.db.exec('COMMIT');
    this.goruntuGerekirseAl();
    return sonuc;
  }

  /**
   * Başka bir kaynaktan gelen işlemleri (eşitleme, yedek paketi) olduğu gibi alır: kodu, kurulumu, sırası ve
   * gördükleri korunur. Zaten olan işlem atlanır. Gördüğü işlemlerden biri henüz bu cihazda yoksa işlem
   * bekletilir ve eksik gelince uygulanır (yarım ulaşan grup hesaplara girmez, §10.4). Hepsi tek veritabanı
   * işleminde yazılır.
   */
  disaridanAl(gelenler: Islem[]): AlmaSonucu {
    // Toplu yazma kendi veritabanı işlemini açık tutar; içine başka kaynaktan yazılmaz (geri alınırsa onlar da giderdi).
    if (this.topluDerinlik) throw new Error('Evrene şu anda çok sayıda değişiklik yazılıyor; eşitleme biraz sonra yeniden denenecek.');
    const onceki = { ...this.gorulen };
    const oncekiSon = this.son;
    const alinanlar: Islem[] = [];
    let bastan = false;
    /** Daha önceye düşen işlemlerin en küçük anahtarı: görüntü bundan önce alınmış olmalı. */
    let enErkenGec: Anahtar | null = null;
    this.db.exec('BEGIN IMMEDIATE');
    topluBaslat(this.db);
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
        // Bu kurulumun bu sırasında burada başka bir değişiklik var: aynı kurulum iki ayrı yerde yazmış. Biri sessizce atılmaz.
        if ((this.gorulen[i.kurulum] ?? 0) >= i.sira) throw new CatallanmaHatasi();
        adaylar.set(i.kod, i);
      }
      // Hazır olanları (gördüğü her işlem burada olanları) sırayla al. Adaylar kurulum ve sıraya göre dizinlenir:
      // her turda yalnızca kurulumların sıradaki işlemine bakılır (bütün listeyi her turda taramak büyük
      // günlükte kareli büyüyordu).
      const dizin = new Map<string, Map<number, Islem[]>>();
      for (const i of adaylar.values()) {
        const k = dizin.get(i.kurulum) ?? new Map<number, Islem[]>();
        dizin.set(i.kurulum, k);
        if (k.has(i.sira)) throw new CatallanmaHatasi(); // aynı kurulumun aynı sırasında iki farklı değişiklik
        k.set(i.sira, [i]);
      }
      const alinanKodlar = new Set<string>();
      const bildir = adaylar.size >= ILERLEME_ESIGI;
      if (bildir) this.ilerleme({ neden: 'kurulum', yapilan: 0, toplam: adaylar.size });
      for (;;) {
        const hazir: Islem[] = [];
        for (const [kurulum, siralar] of dizin) {
          for (const i of siralar.get((this.gorulen[kurulum] ?? 0) + 1) ?? []) {
            if (Object.entries(i.gordu).every(([k, s]) => k === i.kurulum ? s === i.sira - 1 : (this.gorulen[k] ?? 0) >= s)) hazir.push(i);
          }
        }
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
          else {
            bastan = true;
            if (anahtarKarsilastir(a, this.son) > 0) this.son = a;
            else if (!enErkenGec || anahtarKarsilastir(a, enErkenGec) < 0) enErkenGec = a;
          }
          this.gorulen[i.kurulum] = i.sira;
          alinanlar.push(islem);
        }
        const once = alinanKodlar.size;
        for (const i of hazir) { alinanKodlar.add(i.kod); dizin.get(i.kurulum)!.delete(i.sira); }
        if (bildir && Math.floor(once / 2000) !== Math.floor(alinanKodlar.size / 2000)) {
          this.ilerleme({ neden: 'kurulum', yapilan: Math.min(alinanKodlar.size, adaylar.size - 1), toplam: adaylar.size });
        }
      }
      const kalan = [...adaylar.values()].filter((i) => !alinanKodlar.has(i.kod));
      this.db.exec('DELETE FROM bekleyen_islemler');
      for (const i of kalan) {
        this.db.exec({ sql: 'INSERT INTO bekleyen_islemler(kod, islem, ikili) VALUES(?,?,?)', bind: [i.kod, JSON.stringify({ ...i, ikili: null }), i.ikili ?? null] });
      }
      if (bastan) {
        topluBirak(this.db);
        // Önce gelen işlemden önce alınmış görüntü kullanılır; ondan sonra alınmışlar artık yanlıştır.
        const g = enErkenGec ? goruntuBul(this.db, enErkenGec) : null;
        if (enErkenGec) goruntuleriSil(this.db, enErkenGec);
        this.bastanUygula('kurulum', g);
      } else topluBitir(this.db);
      if (bildir) this.ilerleme({ neden: 'kurulum', yapilan: adaylar.size, toplam: adaylar.size });
      this.db.exec('COMMIT');
      this.islemAdedi += alinanlar.length;
      this.goruntuGerekirseAl();
      return { alinan: alinanlar.length, bekleyen: kalan.length, bastanKuruldu: bastan, islemler: alinanlar };
    } catch (e) {
      this.db.exec('ROLLBACK');
      this.gorulen = onceki;
      this.son = oncekiSon;
      metinBelleginiTemizle(this.db);
      this.ilerlemeyiKapat();
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

  /**
   * İzdüşüm tablolarını silip bütün günlüğü baştan uygular (açık bir veritabanı işleminin içinde). Günlük sayfa
   * sayfa okunur ve metinler toplu uygulanır (§10.1).
   */
  private bastanUygula(neden: 'guncelleme' | 'kurulum', goruntu: Goruntu | null = null) {
    metinBelleginiTemizle(this.db);
    // Görüntü varsa tablolar onun hâline getirilir ve yalnızca ondan sonraki işlemler uygulanır.
    if (goruntu) goruntuYukle(this.db, goruntu.yuva);
    else for (const t of IZDUSUM_TABLOLARI) this.db.exec(`DELETE FROM ${t}`);
    topluBaslat(this.db);
    let son: [number, string, number] = goruntu ? goruntu.anahtar : [-Infinity, '', 0];
    const toplam = Number(this.db.selectValue('SELECT count(*) FROM islemler WHERE (saat, kurulum, sira) > (?, ?, ?)', son));
    this.sonKurma = { goruntudenMi: !!goruntu, uygulanan: toplam };
    const bildir = toplam >= ILERLEME_ESIGI;
    let yapilan = 0;
    if (bildir) this.ilerleme({ neden, yapilan, toplam });
    for (;;) {
      const sayfa = this.db.selectObjects(
        'SELECT * FROM islemler WHERE (saat, kurulum, sira) > (?, ?, ?) ORDER BY saat, kurulum, sira LIMIT 2000', son).map(satirdan);
      if (!sayfa.length) break;
      for (const i of sayfa) this.uygula(i);
      const x = sayfa[sayfa.length - 1];
      son = [x.saat!, x.kurulum, x.sira];
      yapilan += sayfa.length;
      if (bildir) this.ilerleme({ neden, yapilan: Math.min(yapilan, toplam - 1), toplam });
    }
    topluBitir(this.db);
    if (bildir) this.ilerleme({ neden, yapilan: toplam, toplam });
  }

  /** Son görüntüden bu yana yeterince işlem olduysa yeni görüntü alır (kendi veritabanı işleminde). */
  private goruntuGerekirseAl() {
    if (this.islemAdedi - sonGoruntuIslemi(this.db) < EvrenVt.goruntuAraligi) return;
    this.db.exec('BEGIN IMMEDIATE');
    try { goruntuAl(this.db, this.son, this.islemAdedi); this.db.exec('COMMIT'); }
    catch { this.db.exec('ROLLBACK'); } // görüntü yalnızca hızlandırmadır; alınamazsa baştan kurma yine çalışır
  }

  /** İzdüşüm tablolarını silip bütün günlüğü baştan uygular. Sınama ve onarım için. */
  yenidenKur(neden: 'guncelleme' | 'kurulum' = 'kurulum') {
    this.db.exec('BEGIN IMMEDIATE');
    try { this.bastanUygula(neden); this.db.exec('COMMIT'); }
    catch (e) { this.db.exec('ROLLBACK'); metinBelleginiTemizle(this.db); this.ilerlemeyiKapat(); throw e; }
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
      // Tek tek eklenir: push(...dizi) yüz binlerce işlemde yığını taşırır.
      for (const r of this.db.selectObjects('SELECT * FROM islemler WHERE kurulum=? AND sira>? ORDER BY sira', [k, gorulen[k] ?? 0])) sonuc.push(satirdan(r));
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
