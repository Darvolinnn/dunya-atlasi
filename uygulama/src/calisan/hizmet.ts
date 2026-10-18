// İsteklerin karşılandığı yer. Dosya açma dışarıdan verilir: tarayıcıda SAH havuzu, sınamada bellek.
// Automerge WASM'ı bu sınıf kurulmadan önce hazırlanmış olmalıdır.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { IslemGirdisi } from '../alan/islem';
import { A } from '../alan/automerge';
import { baglantilar, duzMetindenSpans, spanAyari } from '../alan/metin-sema';
import { karsilastir, siraAnahtari, tarihCoz, VARSAYILAN_TAKVIM, type EvrenTarihi } from '../alan/tarih';
import { iliskiTuruBul, iliskiTuruGecerli, rolAdi } from '../alan/iliski-turleri';
import { icerikAdi, onizlemeAdi, type GorselIsleyici, type MedyaDeposu } from './medya';
import { iceAktarimPlani, type IceDosya } from './ice-aktarim';
import { zipOku, zipYaz, type ZipDosyasi } from '../alan/zip';
import { VERI_BICIMI, type Islem } from '../alan/islem';
import { b64, b64Coz } from '../alan/paket';
import { katla, kelimeler, turkceKarsilastir } from '../alan/turkce';
import { adDegistir, kokAdaylari } from '../alan/turkce-ek';
import { kararGecerli, turGecerli } from '../alan/turler';
import type { Catisma, EsitlemeDurumu, IceAktarimRaporu, YedekBilgisi, AdDuzeltmesi, AramaSonucu, Basliklar, BaglananKayit, DegisebilirAlan, DegisimSatiri, IliskiSatiri, Istekler, Kayit, KayitOzeti, SahneOlayBilgisi, Spans } from '../veri/api';
import { EvrenVt } from './evren-vt';
import { Esitleme, IzinHatasi, type EsitlemeErisimi, type Tasiyici } from './esitleme';
import { KurulumVt } from './kurulum-vt';
import { metinBelgesi } from './izdusum';

export type DosyaAcici = (ad: string) => Database;
export type Bildirici = (evren: string, turler: string[], kayitlar: string[], uzaktan?: boolean) => void;

const temizle = (deger: unknown, { bos = false, uzunluk = 200 } = {}) => {
  const s = String(deger ?? '').replace(/\s+/g, ' ').trim();
  if (!s && !bos) throw new Error('Ad boş olamaz.');
  if (s.length > uzunluk) throw new Error('Metin çok uzun.');
  return s;
};
/** Automerge aktör kodu: kurulum kodunun baytları (onaltılık). */
const aktor = (kurulum: string) => [...new TextEncoder().encode(kurulum)].map((b) => b.toString(16).padStart(2, '0')).join('');
const METIN_ALANLARI = new Set(['govde']);

export class Hizmet implements Omit<Istekler, 'jetonVer' | 'baglantiyiKes'> {
  private readonly kurulum: KurulumVt;
  private readonly acik = new Map<string, EvrenVt>();
  private readonly aktor: string;

  constructor(private readonly ac: DosyaAcici, varsayilanKurulumAdi: string, private readonly sqliteSurumu: string,
    private readonly bildir: Bildirici = () => {},
    private readonly medya: MedyaDeposu | null = null, private readonly gorselIsle: GorselIsleyici | null = null) {
    this.kurulum = new KurulumVt(ac('/kurulum.db'), varsayilanKurulumAdi);
    this.aktor = aktor(this.kurulum.kod);
  }

  private evren(kod: string): EvrenVt {
    if (!kodGecerliMi(kod)) throw new Error('Geçersiz evren kodu.');
    let e = this.acik.get(kod);
    if (!e) {
      if (!this.kurulum.evrenler().some((x) => x.kod === kod)) throw new Error('Bu evren bu cihazda yok.');
      e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
      this.acik.set(kod, e);
    }
    return e;
  }

  /** İşlemleri yazar ve arayüze bildirir. */
  private yaz(evren: string, girdiler: IslemGirdisi[], kayitlar: string[] = []) {
    const yazilan = this.evren(evren).islemYap(girdiler);
    this.bildir(evren, [...new Set(yazilan.map((i) => i.tur))], kayitlar);
    return yazilan;
  }

  private kayitVarMi(e: EvrenVt, kod: string) {
    if (!kodGecerliMi(kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kod]) === undefined) throw new Error('Kayıt bulunamadı.');
  }

  // ---------- Evrenler ----------
  baslat() { return { kod: this.kurulum.kod, ad: this.kurulum.ad, sqlite: this.sqliteSurumu }; }
  evrenler() { return this.kurulum.evrenler(); }

  evrenOlustur({ ad }: { ad: string }) {
    const temiz = temizle(ad);
    const kod = yeniKod();
    const e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
    const [islem] = e.islemYap([{ tur: 'evren_olustur', veri: { kod, ad: temiz } }]);
    this.kurulum.evrenEkle(kod, temiz, islem.zaman);
    this.acik.set(kod, e);
    return { kod };
  }

  evrenAdlandir({ evren, ad }: { evren: string; ad: string }) {
    const temiz = temizle(ad);
    this.yaz(evren, [{ tur: 'evren_adlandir', veri: { ad: temiz } }]);
    this.kurulum.evrenAdi(evren, temiz);
  }

  evrenBilgisi({ evren }: { evren: string }) {
    const e = this.evren(evren);
    const oz = this.kurulum.evrenler().find((x) => x.kod === evren)!;
    this.kurulum.acildi(evren);
    const ad = e.db.selectValue("SELECT v FROM evren WHERE k='ad'") as string | undefined;
    return {
      ...oz, ad: ad ?? oz.ad, islemSayisi: e.islemSayisi(),
      kayitSayisi: Number(e.db.selectValue('SELECT count(*) FROM kayitlar WHERE silindi IS NULL')),
      copSayisi: Number(e.db.selectValue('SELECT count(*) FROM kayitlar WHERE silindi IS NOT NULL')),
      catismaSayisi: this.catismaSayisi({ evren }),
    };
  }

  islemGunlugu({ evren, sinir }: { evren: string; sinir: number }) {
    return this.evren(evren).islemler(Math.min(Math.max(1, sinir), 1000), true)
      .map(({ ikili, ...i }) => ({ ...i, ikiliBoyut: ikili?.length ?? 0 }));
  }

  // ---------- Cihazlar arası değişiklik alışverişi (§10) ----------
  /** Bu cihazdaki işlemlerin özeti: kurulum → son sıra. */
  gorulenler({ evren }: { evren: string }) { return this.evren(evren).gorulenler(); }

  /** Verilen özetin görmediği işlemler; kurulum verilirse yalnızca onunkiler. */
  islemleriVer({ evren, gorulen, kurulum }: { evren: string; gorulen: Record<string, number>; kurulum?: string }): Islem[] {
    return this.evren(evren).gorulmeyenler(gorulen, kurulum);
  }

  /** Başka cihazdan gelen işlemleri alır; arayüze "uzaktan" diye bildirir. */
  islemleriAl({ evren, islemler }: { evren: string; islemler: Islem[] }) {
    const e = this.evren(evren);
    const r = e.disaridanAl(islemler);
    if (r.alinan) {
      const kayitlar = new Set<string>();
      for (const i of r.islemler) for (const k of [i.veri.kod, i.veri.kayit, i.veri.a, i.veri.b]) if (typeof k === 'string') kayitlar.add(k);
      const ad = e.db.selectValue("SELECT v FROM evren WHERE k='ad'") as string | undefined;
      if (ad) this.kurulum.evrenAdi(evren, ad);
      this.bildir(evren, [...new Set(r.islemler.map((i) => i.tur))], [...kayitlar], true);
    }
    return { alinan: r.alinan, bekleyen: r.bekleyen };
  }

  /** Başka cihazda oluşturulmuş bir evreni bu cihaza ilk kez kurar (işlemleriyle). */
  evreniDisaridanKur({ kod, islemler }: { kod: string; islemler: Islem[] }) {
    if (!kodGecerliMi(kod)) throw new Error('Geçersiz evren kodu.');
    if (this.kurulum.evrenler().some((x) => x.kod === kod)) return { kod, yeni: false };
    const e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
    if (e.islemSayisi() === 0) e.disaridanAl(islemler);
    const ad = (e.db.selectValue("SELECT v FROM evren WHERE k='ad'") as string | undefined) ?? 'Adsız evren';
    if (e.db.selectValue("SELECT v FROM evren WHERE k='kod'") !== kod) throw new Error('Gelen evren eksik.');
    this.kurulum.evrenEkle(kod, ad, Number(e.db.selectValue("SELECT v FROM evren WHERE k='olusturma'")) || Date.now());
    this.acik.set(kod, e);
    return { kod, yeni: true };
  }

  // ---------- Drive eşitlemesi (§10) ----------
  private esitleme: Esitleme | null = null;
  private esitlemeSuruyor: Promise<void> | null = null;
  private esitlemeHatasi: { mesaj: string; izin: boolean; zaman: number } | null = null;

  private esitlemeErisimi(): EsitlemeErisimi {
    return {
      kurulum: this.kurulum, medya: this.medya, evrenVt: (k) => this.evren(k), evrenler: () => this.kurulum.evrenler(),
      islemleriAl: (evren, islemler) => this.islemleriAl({ evren, islemler }),
      evreniDisaridanKur: (kod, islemler) => { this.evreniDisaridanKur({ kod, islemler }); },
    };
  }

  /** Uzak depoyu bağlar (Google izni gelince) ya da kaldırır. */
  tasiyiciAyarla(t: Tasiyici | null) {
    this.esitleme = t ? new Esitleme(this.esitlemeErisimi(), t) : null;
    if (t && this.esitlemeHatasi?.izin) this.esitlemeHatasi = null;
  }

  /** Bütün eşitlenen evrenleri eşitler. Aynı anda tek eşitleme çalışır; ikinci çağrı ilkini bekler. */
  async esitle(): Promise<EsitlemeDurumu> {
    if (!this.esitleme) return this.esitlemeDurumu();
    if (!this.esitlemeSuruyor) {
      const es = this.esitleme;
      this.esitlemeSuruyor = (async () => {
        await Promise.resolve(); // gövde, işaret konmadan önce bitmesin
        try {
          for (const e of this.kurulum.evrenler()) await es.evreniEsitle(e.kod);
          this.esitlemeHatasi = null;
        } catch (err) {
          const izin = err instanceof IzinHatasi;
          this.esitlemeHatasi = { mesaj: izin ? 'Google izni yenilenmeli.' : (err as Error).message, izin, zaman: Date.now() };
          if (izin) this.esitleme = null;
        } finally { this.esitlemeSuruyor = null; }
      })();
    }
    await this.esitlemeSuruyor;
    return this.esitlemeDurumu();
  }

  esitlemeDurumu(): EsitlemeDurumu {
    const es = this.esitleme ?? new Esitleme(this.esitlemeErisimi(), null);
    return {
      bagli: !!this.esitleme, calisiyor: !!this.esitlemeSuruyor, hata: this.esitlemeHatasi,
      kurulum: { kod: this.kurulum.kod, ad: this.kurulum.ad },
      evrenler: this.kurulum.evrenler().map((e) => es.durum(e.kod, e.ad)),
    };
  }

  async uzakEvrenler() {
    if (!this.esitleme) throw new Error('Önce Google Drive\'a bağlanın.');
    return this.esitleme.uzakEvrenler();
  }

  async evreniIndir({ kod }: { kod: string }) {
    if (!this.esitleme) throw new Error('Önce Google Drive\'a bağlanın.');
    await this.esitleme.evreniIndir(kod);
    return { kod };
  }

  evrenEsitlemeAyari({ evren, esitlenir }: { evren: string; esitlenir: boolean }) {
    this.evren(evren);
    this.kurulum.ayarYaz(`esitle:${evren}`, esitlenir ? '1' : '0');
  }

  kurulumAdiDegistir({ ad }: { ad: string }) { this.kurulum.adDegistir(temizle(ad, { uzunluk: 80 })); }

  /** Bir kurulumu "artık kullanılmıyor" diye işaretler; geçmişi silinmez (§10.5). */
  kurulumKullanimDisi({ kod, disi }: { kod: string; disi: boolean }) {
    if (!kodGecerliMi(kod) || kod === this.kurulum.kod) throw new Error('Bu cihaz kendini kullanım dışı bırakamaz.');
    new Esitleme(this.esitlemeErisimi(), null).kullanimDisiIsaretle(kod, disi);
  }

  // ---------- Çatışmalar (§10.3, §10.6) ----------
  private kurulumAdi(kod: string) {
    if (kod === this.kurulum.kod) return 'bu cihaz';
    return this.kurulum.kurulumAdi(kod) ?? 'başka bir cihaz';
  }

  /** İnceleme bekleyen bütün çatışmalar, tek yerde. */
  catismalar({ evren, kod }: { evren: string; kod?: string }): Catisma[] {
    const e = this.evren(evren);
    const kayitAdi = (k: string) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string | undefined) ?? 'Kayıt';
    const sonuc: Catisma[] = [];
    const gruplar = e.db.selectObjects(
      `SELECT nesne, alan FROM alan_yazanlari ${kod ? 'WHERE nesne=? OR nesne IN (SELECT kod FROM iliskiler WHERE a=? OR b=?)' : ''}
       GROUP BY nesne, alan HAVING count(DISTINCT deger) > 1`, kod ? [kod, kod, kod] : []);
    for (const g of gruplar) {
      const nesne = g.nesne as string;
      const alan = g.alan as string;
      const iliski = e.db.selectObject('SELECT a, b, tur FROM iliskiler WHERE kod=?', [nesne]);
      const degerler = e.db.selectObjects('SELECT islem, kurulum, deger, zaman FROM alan_yazanlari WHERE nesne=? AND alan=? ORDER BY zaman', [nesne, alan])
        .map((r) => ({ islem: r.islem as string, deger: JSON.parse(r.deger as string), kurulum: this.kurulumAdi(r.kurulum as string), zaman: Number(r.zaman) }));
      sonuc.push({
        tur: 'alan', nesne, alan,
        nesneTuru: nesne === 'evren' ? 'evren' : iliski ? 'iliski' : 'kayit',
        kayit: iliski ? iliski.a as string : nesne === 'evren' ? null : nesne,
        baslik: nesne === 'evren' ? 'Evren' : iliski ? `${kayitAdi(iliski.a as string)} – ${kayitAdi(iliski.b as string)} ilişkisi` : kayitAdi(nesne),
        degerler,
      });
    }
    for (const r of e.db.selectObjects(`SELECT kayit, count(*) n, max(zaman) zaman, group_concat(DISTINCT kurulum) kurulumlar FROM silme_catismalari
        ${kod ? 'WHERE kayit=?' : ''} GROUP BY kayit`, kod ? [kod] : [])) {
      sonuc.push({ tur: 'silme', kayit: r.kayit as string, baslik: kayitAdi(r.kayit as string), duzenlemeSayisi: Number(r.n), zaman: Number(r.zaman),
        kurulumlar: String(r.kurulumlar).split(',').map((k) => this.kurulumAdi(k)) });
    }
    for (const r of e.db.selectObjects(`SELECT * FROM metin_catismalari ${kod ? 'WHERE kayit=?' : ''} ORDER BY b_zaman`, kod ? [kod] : [])) {
      sonuc.push({ tur: 'metin', kayit: r.kayit as string, alan: r.alan as string, baslik: kayitAdi(r.kayit as string),
        temel: JSON.parse(r.temel as string), a: { basliklar: JSON.parse(r.a_basliklar as string), kurulum: this.kurulumAdi(r.a_kurulum as string), zaman: Number(r.a_zaman) },
        b: { basliklar: JSON.parse(r.b_basliklar as string), kurulum: this.kurulumAdi(r.b_kurulum as string), zaman: Number(r.b_zaman) } });
    }
    return sonuc;
  }

  catismaSayisi({ evren }: { evren: string }) { return this.catismalar({ evren }).length; }

  /** Alan çatışması: yazar değerlerden birini seçer; seçim ikisini de görmüş yeni bir yazma olarak kaydedilir. */
  alanCatismasiCoz({ evren, nesne, alan, islem }: { evren: string; nesne: string; alan: string; islem: string }) {
    const e = this.evren(evren);
    const r = e.db.selectObject('SELECT deger FROM alan_yazanlari WHERE nesne=? AND alan=? AND islem=?', [nesne, alan, islem]);
    if (!r) throw new Error('Bu çatışma artık yok.');
    const deger = JSON.parse(r.deger as string);
    if (nesne === 'evren' && alan === 'ad') { this.yaz(evren, [{ tur: 'evren_adlandir', veri: { ad: String(deger) } }]); this.kurulum.evrenAdi(evren, String(deger)); return; }
    const iliski = e.db.selectObject('SELECT a, b FROM iliskiler WHERE kod=?', [nesne]);
    if (iliski) { this.yaz(evren, [{ tur: 'iliski_degistir', veri: { kod: nesne, alan, deger, cozum: true } }], [iliski.a as string, iliski.b as string]); return; }
    this.kayitVarMi(e, nesne);
    if (alan === 'tarih') this.yaz(evren, [{ tur: 'kayit_tarih', veri: { kod: nesne, tarih: deger, cozum: true } }], [nesne]);
    else if (alan.startsWith('karar:')) this.yaz(evren, [{ tur: 'kayit_alan_karar', veri: { kod: nesne, alan: alan.slice(6), karar: deger } }], [nesne]);
    else this.yaz(evren, [{ tur: 'kayit_degistir', veri: { kod: nesne, alan, deger, cozum: true } }], [nesne]);
  }

  /** Silinmiş kayda gelen düzenleme: kayıt geri yüklenir ya da silinmiş kalır (düzenleme çöp kutusunda durur). */
  silmeCatismasiCoz({ evren, kayit, geriYukle }: { evren: string; kayit: string; geriYukle: boolean }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kayit);
    this.yaz(evren, [geriYukle ? { tur: 'kayit_geri_yukle', veri: { kod: kayit } } : { tur: 'catisma_coz', veri: { tur: 'silme', kayit } }], [kayit]);
  }

  /** Aynı paragrafa iki cihazdan yazılmış metin incelendi; metin şimdiki hâliyle kalır. */
  metinCatismasiCoz({ evren, kayit, alan }: { evren: string; kayit: string; alan: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kayit);
    if (!METIN_ALANLARI.has(alan)) throw new Error('Bilinmeyen metin alanı.');
    this.yaz(evren, [{ tur: 'catisma_coz', veri: { tur: 'metin', kayit, alan } }], [kayit]);
  }

  // ---------- Kayıtlar ----------
  kayitlar({ evren, cop = false }: { evren: string; cop?: boolean }): KayitOzeti[] {
    const e = this.evren(evren);
    return e.db.selectObjects(
      `SELECT k.kod, k.tur, k.ad, k.ozet, k.karar, k.lakaplar, k.duzenleme, k.silindi, k.gorseller,
              coalesce(k.tarih, s.tarih) tarih
       FROM kayitlar k LEFT JOIN kayitlar s ON s.kod=k.sahne_olayi
       WHERE k.silindi IS ${cop ? 'NOT ' : ''}NULL ORDER BY k.duzenleme DESC`)
      .map((r) => ({
        kod: r.kod as string, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string,
        lakaplar: JSON.parse(r.lakaplar as string), duzenleme: Number(r.duzenleme), silindi: r.silindi == null ? null : Number(r.silindi),
        tarih: r.tarih ? JSON.parse(r.tarih as string) : null, gorsel: (JSON.parse(r.gorseller as string) as string[])[0] ?? null,
      }));
  }

  kayit({ evren, kod }: { evren: string; kod: string }): Kayit {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    const r = e.db.selectObject('SELECT * FROM kayitlar WHERE kod=?', [kod])!;
    return {
      kod, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string, okunus: r.okunus as string,
      lakaplar: JSON.parse(r.lakaplar as string), etiketler: JSON.parse(r.etiketler as string), oncekiAdlar: JSON.parse(r.onceki_adlar as string),
      olusturma: Number(r.olusturma), duzenleme: Number(r.duzenleme), silindi: r.silindi == null ? null : Number(r.silindi),
      tarih: r.tarih ? JSON.parse(r.tarih as string) : null, alanKararlari: JSON.parse(r.alan_kararlari as string),
      gorseller: JSON.parse(r.gorseller as string), gorsel: (JSON.parse(r.gorseller as string) as string[])[0] ?? null,
      sahneOlayi: (r.sahne_olayi as string) ?? null,
      sahneTarihi: r.sahne_olayi ? this.tarihOku(e, r.sahne_olayi as string) : null,
    };
  }

  private tarihOku(e: EvrenVt, kod: string): EvrenTarihi | null {
    const t = e.db.selectValue('SELECT tarih FROM kayitlar WHERE kod=?', [kod]) as string | null | undefined;
    return t ? JSON.parse(t) : null;
  }
  /** Bir olayın geçerli tarihi: kendi tarihi, yoksa sahne olayıysa sahnenin tarihi (§3.3). */
  private olayTarihi(e: EvrenVt, kod: string): EvrenTarihi | null {
    const r = e.db.selectObject('SELECT tarih, sahne_olayi FROM kayitlar WHERE kod=?', [kod]);
    if (!r) return null;
    if (r.tarih) return JSON.parse(r.tarih as string);
    return r.sahne_olayi ? this.tarihOku(e, r.sahne_olayi as string) : null;
  }

  /** Yeni kaydın işlemleri. Kaydın gövde metni ilk değişiklikle birlikte doğar; bütün cihazlar aynı kökten başlar. */
  private kayitGirdileri(kod: string, v: { ad: string; tur: string; karar: string; ozet: string; spans?: Spans; sahneOlayi?: string }): IslemGirdisi[] {
    const kok = A.from({ t: '' }, { actor: this.aktor });
    const girdiler: IslemGirdisi[] = [
      { tur: 'kayit_olustur', veri: { kod, tur: turGecerli(v.tur) ? v.tur : 'diger', ad: v.ad, karar: v.karar, ozet: v.ozet, ...(v.sahneOlayi ? { sahneOlayi: v.sahneOlayi } : {}) } },
      { tur: 'metin', veri: { kayit: kod, alan: 'govde', basliklar: A.getHeads(kok), ilk: true }, ikili: A.save(kok) },
    ];
    if (v.spans && v.spans.length) {
      const dolu = A.change(A.clone(kok, { actor: this.aktor }), (x) => A.updateSpans(x, ['t'], v.spans as never, spanAyari()));
      girdiler.push({ tur: 'metin', veri: { kayit: kod, alan: 'govde', basliklar: A.getHeads(dolu) }, ikili: A.saveSince(dolu, A.getHeads(kok)) });
    }
    return girdiler;
  }

  kayitOlustur({ evren, ad, tur, karar = 'kesin', ozet = '' }: { evren: string; ad: string; tur: string; karar?: string; ozet?: string }) {
    const temizAd = temizle(ad);
    if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
    const kod = yeniKod();
    this.yaz(evren, this.kayitGirdileri(kod, { ad: temizAd, tur, karar, ozet: temizle(ozet, { bos: true, uzunluk: 500 }) }), [kod]);
    return { kod };
  }

  /** Hızlı not (§5.8): form yok; ilk satır adı olur, metin notun gövdesidir. */
  hizliNot({ evren, metin }: { evren: string; metin: string }) {
    const duz = String(metin ?? '').replace(/\r\n?/g, '\n').trim();
    if (!duz) throw new Error('Not boş.');
    if (duz.length > 100_000) throw new Error('Not çok uzun.');
    const ilk = duz.split('\n')[0].replace(/\s+/g, ' ').trim();
    const ad = ilk.length > 60 ? ilk.slice(0, 60).replace(/\s+\S*$/, '') + '…' : ilk;
    const kod = yeniKod();
    this.yaz(evren, this.kayitGirdileri(kod, { ad: ad || 'Not', tur: 'not', karar: 'fikir', ozet: '', spans: duzMetindenSpans(duz) }), [kod]);
    return { kod, ad: ad || 'Not' };
  }

  /** Notu kayda dönüştürür (§4.6, T2): metin yeni kayda kopyalanır, not yerinde kalır ve ikisi bağlı kalır. */
  nottanKayit({ evren, not, ad, tur }: { evren: string; not: string; ad: string; tur: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, not);
    if (!turGecerli(tur)) throw new Error('Bilinmeyen tür.');
    const d = metinBelgesi(e.db, not, 'govde');
    const kod = yeniKod();
    this.yaz(evren, [
      ...this.kayitGirdileri(kod, { ad: temizle(ad), tur, karar: 'fikir', ozet: '', spans: d ? A.spans(d, ['t']) as Spans : undefined }),
      { tur: 'iliski_ekle', veri: { kod: yeniKod(), tur: 'nottan', a: not, b: kod, karar: 'kesin' } },
    ], [kod, not]);
    return { kod };
  }

  kayitDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: DegisebilirAlan; deger: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    let temiz: string;
    if (alan === 'ad') temiz = temizle(deger);
    else if (alan === 'tur') { temiz = String(deger); if (!turGecerli(temiz)) throw new Error('Bilinmeyen tür.'); }
    else if (alan === 'karar') { temiz = String(deger); if (!kararGecerli(temiz)) throw new Error('Geçersiz karar durumu.'); }
    else if (alan === 'ozet') temiz = temizle(deger, { bos: true, uzunluk: 500 });
    else if (alan === 'okunus') temiz = temizle(deger, { bos: true });
    else throw new Error('Bu alan değiştirilemez.');
    const onceki = e.db.selectValue(`SELECT ${alan} FROM kayitlar WHERE kod=?`, [kod]) as string;
    if (onceki === temiz) return;
    this.yaz(evren, [{ tur: 'kayit_degistir', veri: { kod, alan, deger: temiz, onceki } }], [kod]);
  }

  /** Evren tarihi (§3.4): ifade ve kanonik eksen birlikte saklanır. Boş ifade tarihi kaldırır. */
  kayitTarih({ evren, kod, ifade }: { evren: string; kod: string; ifade: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    const tarih = tarihCoz(temizle(ifade, { bos: true }), VARSAYILAN_TAKVIM);
    const onceki = this.tarihOku(e, kod);
    if (JSON.stringify(onceki?.ifade ?? null) === JSON.stringify(tarih?.ifade ?? null)) return { tarih };
    this.yaz(evren, [{ tur: 'kayit_tarih', veri: { kod, tarih, onceki } }], [kod]);
    return { tarih };
  }

  /** Alan düzeyinde karar durumu (§3.6): düz girilen değer kesindir; tek dokunuşla fikre çevrilir. */
  alanKarari({ evren, kod, alan, karar }: { evren: string; kod: string; alan: string; karar: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    if (!['ad', 'ozet', 'okunus', 'tarih'].includes(alan)) throw new Error('Bu alanın karar durumu tutulmuyor.');
    if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
    this.yaz(evren, [{ tur: 'kayit_alan_karar', veri: { kod, alan, karar } }], [kod]);
  }

  kayitListe({ evren, kod, liste, ekle, cikar }: { evren: string; kod: string; liste: 'lakap' | 'etiket'; ekle?: string; cikar?: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    if (liste !== 'lakap' && liste !== 'etiket') throw new Error('Bilinmeyen liste.');
    const veri: Record<string, unknown> = { kod };
    if (ekle !== undefined) veri.ekle = temizle(ekle, { uzunluk: 100 });
    if (cikar !== undefined) veri.cikar = String(cikar);
    this.yaz(evren, [{ tur: liste === 'lakap' ? 'kayit_lakap' : 'kayit_etiket', veri }], [kod]);
  }

  kayitSil({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    this.yaz(evren, [{ tur: 'kayit_sil', veri: { kod } }], [kod]);
  }

  kayitGeriYukle({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    this.yaz(evren, [{ tur: 'kayit_geri_yukle', veri: { kod } }], [kod]);
  }

  /** Bir kaydın sürüm geçmişi (§10.8): o kayda dokunan bütün işlemler, en yenisi önce. */
  kayitGecmisi({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    return e.db.selectObjects(
      `SELECT * FROM islemler WHERE json_extract(veri,'$.kod')=? OR json_extract(veri,'$.kayit')=? ORDER BY no DESC LIMIT 500`, [kod, kod])
      .map((r) => ({
        kod: r.kod as string, kurulum: r.kurulum as string, sira: Number(r.sira), zaman: Number(r.zaman), grup: (r.grup as string) ?? null,
        tur: r.tur as string, veri: JSON.parse(r.veri as string), gordu: JSON.parse(r.gordu as string), ikiliBoyut: (r.ikili as Uint8Array | null)?.length ?? 0,
      }));
  }

  // ---------- Uzun metin ----------
  private belge(e: EvrenVt, kayit: string, alan: string) {
    if (!METIN_ALANLARI.has(alan)) throw new Error('Bilinmeyen metin alanı.');
    this.kayitVarMi(e, kayit);
    const d = metinBelgesi(e.db, kayit, alan);
    if (!d) throw new Error('Metin bulunamadı.');
    return d;
  }

  metinAc({ evren, kayit, alan }: { evren: string; kayit: string; alan: string }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    return { spans: A.spans(d, ['t']) as Spans, basliklar: A.getHeads(d) };
  }

  /** Otomatik kaydetme: editördeki metin tek değişiklik olarak yazılır (TK2). */
  metinKaydet({ evren, kayit, alan, spans, temel }: { evren: string; kayit: string; alan: string; spans: Spans; temel: Basliklar }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    const simdiki = A.getHeads(d);
    const ayni = JSON.stringify([...simdiki].sort()) === JSON.stringify([...temel].sort());
    if (!Array.isArray(temel) || !temel.every((h) => typeof h === 'string' && A.hasHeads(d, [h]))) throw new Error('Metnin sürümü bulunamadı; sayfayı yenileyin.');
    let yeni: A.Doc<{ t: string }>;
    if (ayni) yeni = A.change(A.clone(d, { actor: this.aktor }), (x) => A.updateSpans(x, ['t'], spans as never, spanAyari()));
    else {
      // Editör eski bir sürümün üzerinde çalışıyorsa (bu arada başka cihazdan değişiklik geldi) yazılan, o sürümün
      // üzerine yapılmış değişiklik olarak kaydedilir; Automerge ikisini kaybetmeden birleştirir (§10.3).
      // Dal ayrı bir yazar koduyla açılır: aynı yazarın sonraki değişiklikleriyle sıra numarası çakışmasın.
      const ek = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
      const dal = A.change(A.clone(A.view(d, temel), { actor: this.aktor + ek }), (x) => A.updateSpans(x, ['t'], spans as never, spanAyari()));
      yeni = A.merge(A.clone(d, { actor: this.aktor }), dal);
    }
    const basliklar = A.getHeads(yeni);
    if (JSON.stringify([...basliklar].sort()) === JSON.stringify([...simdiki].sort())) return { basliklar: simdiki, degisti: false, birlesti: false };
    this.yaz(evren, [{ tur: 'metin', veri: { kayit, alan, basliklar, temel }, ikili: A.saveSince(yeni, simdiki) }], [kayit]);
    return { basliklar, degisti: true, birlesti: !ayni, ...(!ayni ? { spans: A.spans(yeni, ['t']) as Spans } : {}) };
  }

  /** Metnin geçmişteki bir hâli (sürüm geçmişinde göstermek için). */
  metinSurumu({ evren, kayit, alan, basliklar }: { evren: string; kayit: string; alan: string; basliklar: Basliklar }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    return { spans: A.spans(A.view(d, basliklar), ['t']) as Spans };
  }

  /** Eski bir sürümü geri getirir: o hâl yeni bir değişiklik olarak yazılır; aradaki sürümler geçmişte kalır (§10.8). */
  metinGeriYukle({ evren, kayit, alan, basliklar }: { evren: string; kayit: string; alan: string; basliklar: Basliklar }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    const simdiki = A.getHeads(d);
    const eski = A.spans(A.view(d, basliklar), ['t']);
    const calisma = A.clone(d, { actor: this.aktor });
    const yeni = A.change(calisma, (x) => A.updateSpans(x, ['t'], eski as never, spanAyari()));
    const sonra = A.getHeads(yeni);
    if (JSON.stringify(sonra) === JSON.stringify(A.getHeads(calisma))) return { basliklar: simdiki, degisti: false };
    this.yaz(evren, [{ tur: 'metin', veri: { kayit, alan, basliklar: sonra, geriYukleme: true }, ikili: A.saveSince(yeni, simdiki) }], [kayit]);
    return { basliklar: sonra, degisti: true };
  }

  // ---------- Arama (§18 arama ve sıralama) ----------
  /**
   * Türkçe kurallarla arama: adlar, lakaplar, eski adlar ve okunuş; sonra kısa özet ve (istenirse) metin.
   * Çekimli biçim köke indirilir ("kılıcıyla" → "Kılıç"). Sonuçta hangi addan bulunduğu söylenir.
   */
  ara({ evren, metin, sinir = 50, metinde = true }: { evren: string; metin: string; sinir?: number; metinde?: boolean }): AramaSonucu[] {
    const e = this.evren(evren);
    const q = katla(metin).replace(/\s+/g, ' ').trim();
    if (!q) return [];
    const parcalar = kelimeler(metin);
    const kokler = new Set(kokAdaylari(metin).slice(1));
    const kelimeSinirinda = (s: string) => s.startsWith(q) || s.includes(' ' + q) || s.includes('-' + q);
    const sonuc: (AramaSonucu & { puan: number })[] = [];
    const satirlar = e.db.selectObjects(
      `SELECT k.kod, k.tur, k.ad, k.ozet, k.karar, k.lakaplar, k.onceki_adlar, k.okunus, m.duz, m.katli
       FROM kayitlar k LEFT JOIN metinler m ON m.kayit=k.kod AND m.alan='govde' WHERE k.silindi IS NULL`);
    for (const r of satirlar) {
      const adlar: [AramaSonucu['nereden']['tur'], string][] = [['ad', r.ad as string]];
      for (const l of JSON.parse(r.lakaplar as string) as string[]) adlar.push(['lakap', l]);
      for (const l of JSON.parse(r.onceki_adlar as string) as string[]) adlar.push(['onceki', l]);
      if (r.okunus) adlar.push(['okunus', r.okunus as string]);
      let en: { puan: number; nereden: AramaSonucu['nereden']; tam: boolean; parca?: string } | null = null;
      const dene = (puan: number, nereden: AramaSonucu['nereden'], tam = false, parca?: string) => { if (!en || puan > en.puan) en = { puan, nereden, tam, parca }; };
      for (const [tur, ad] of adlar) {
        const k = katla(ad);
        const ek = tur === 'ad' ? 10 : 0;
        if (k === q) dene(90 + ek, { tur, metin: ad }, true);
        else if (kokler.has(k)) dene(75 + ek, { tur: tur === 'ad' ? 'kok' : tur, metin: ad }, true);
        else if (k.startsWith(q)) dene(70 + ek, { tur, metin: ad });
        else if (kelimeSinirinda(k)) dene(60 + ek, { tur, metin: ad });
        else if (parcalar.length > 1 && parcalar.every((p) => k.includes(p))) dene(50 + ek, { tur, metin: ad });
        else if (k.includes(q)) dene(40 + ek, { tur, metin: ad });
      }
      if (!en && katla(r.ozet as string).includes(q)) dene(30, { tur: 'ozet', metin: r.ozet as string });
      if (!en && metinde && r.katli && (r.katli as string).includes(q)) {
        const i = (r.katli as string).indexOf(q);
        const duz = r.duz as string;
        const bas = Math.max(0, i - 40);
        const parca = (bas > 0 ? '…' : '') + duz.slice(bas, i + q.length + 60).replace(/\s+/g, ' ') + (i + q.length + 60 < duz.length ? '…' : '');
        dene(20, { tur: 'metin', metin: '' }, false, parca);
      }
      if (en) {
        const b = en as { puan: number; nereden: AramaSonucu['nereden']; tam: boolean; parca?: string };
        sonuc.push({ kod: r.kod as string, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string,
          nereden: b.nereden, tam: b.tam, parca: b.parca, puan: b.puan });
      }
    }
    sonuc.sort((a, b) => b.puan - a.puan || turkceKarsilastir(a.ad, b.ad));
    return sonuc.slice(0, Math.min(Math.max(1, sinir), 500)).map(({ puan, ...x }) => x);
  }

  // ---------- Bağlantılar (§5.1) ----------
  /** Bu kayda bağlanan kayıtlar ve bağlantının görünen ifadeleri. */
  baglananlar({ evren, kod }: { evren: string; kod: string }): BaglananKayit[] {
    const e = this.evren(evren);
    const harita = new Map<string, BaglananKayit>();
    for (const r of e.db.selectObjects(
      `SELECT b.kaynak, b.metin, k.ad, k.tur FROM baglantilar b JOIN kayitlar k ON k.kod=b.kaynak
       WHERE b.hedef=? AND k.silindi IS NULL ORDER BY k.duzenleme DESC, b.sira`, [kod])) {
      let x = harita.get(r.kaynak as string);
      if (!x) { x = { kod: r.kaynak as string, ad: r.ad as string, tur: r.tur as string, ifadeler: [] }; harita.set(x.kod, x); }
      if (!x.ifadeler.includes(r.metin as string)) x.ifadeler.push(r.metin as string);
    }
    return [...harita.values()];
  }

  /** "Bahsedilen ama yazılmamış": bağlantı verilmiş ama metni boş kayıtlar (§5.1). */
  bahsedilenler({ evren }: { evren: string }): (KayitOzeti & { anilma: number })[] {
    const e = this.evren(evren);
    return e.db.selectObjects(
      `SELECT k.kod, k.tur, k.ad, k.ozet, k.karar, k.lakaplar, k.duzenleme, count(*) anilma
       FROM kayitlar k JOIN baglantilar b ON b.hedef=k.kod JOIN kayitlar kk ON kk.kod=b.kaynak AND kk.silindi IS NULL
       LEFT JOIN metinler m ON m.kayit=k.kod AND m.alan='govde'
       WHERE k.silindi IS NULL AND trim(coalesce(m.duz,''))='' GROUP BY k.kod ORDER BY anilma DESC, k.duzenleme DESC`)
      .map((r) => ({ kod: r.kod as string, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string,
        lakaplar: JSON.parse(r.lakaplar as string), duzenleme: Number(r.duzenleme), silindi: null, anilma: Number(r.anilma) }));
  }

  /** Bir bağlantının hedefi ve görünen ifadesi değişmeden önce kaynakların metinleri (ad düzeltmesi için). */
  private adDuzeltmeleri(e: EvrenVt, kod: string, eskiAd: string, yeniAd: string, eskiOkunus: string, yeniOkunus: string) {
    const sonuc: (AdDuzeltmesi & { parcalar: number[] })[] = [];
    const kaynaklar = e.db.selectObjects(
      `SELECT DISTINCT b.kaynak, k.ad FROM baglantilar b JOIN kayitlar k ON k.kod=b.kaynak WHERE b.hedef=? AND b.alan='govde'`, [kod]);
    for (const r of kaynaklar) {
      const d = metinBelgesi(e.db, r.kaynak as string, 'govde');
      if (!d) continue;
      baglantilar(A.spans(d, ['t']) as never).forEach((b, sira) => {
        if (b.hedef !== kod) return;
        const yeni = adDegistir(b.metin, eskiAd, yeniAd, eskiOkunus, yeniOkunus);
        if (yeni === null || yeni === b.metin) return;
        sonuc.push({ kaynak: r.kaynak as string, kaynakAd: r.ad as string, sira, eski: b.metin, yeni, parcalar: b.parcalar });
      });
    }
    return sonuc;
  }

  /** Yazar düzeltmesi önizlemesi: bağlantılı ifadeler yeni adla nasıl görünecek (§5.1). */
  adDuzeltmeOnizle({ evren, kod, eskiAd, yeniAd, eskiOkunus = '' }: { evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string }): AdDuzeltmesi[] {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    return this.adDuzeltmeleri(e, kod, eskiAd, yeniAd, eskiOkunus, '').map(({ parcalar, ...x }) => x);
  }

  /** Seçilen bağlantılı ifadeleri yeni adla değiştirir; hepsi tek işlem grubudur. */
  adDuzeltmeUygula({ evren, kod, eskiAd, yeniAd, eskiOkunus = '', secilenler }: {
    evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string; secilenler: string[];
  }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    const secili = new Set(secilenler);
    const kaynaga = new Map<string, (AdDuzeltmesi & { parcalar: number[] })[]>();
    for (const x of this.adDuzeltmeleri(e, kod, eskiAd, yeniAd, eskiOkunus, '')) {
      if (!secili.has(`${x.kaynak}:${x.sira}`)) continue;
      kaynaga.set(x.kaynak, [...(kaynaga.get(x.kaynak) ?? []), x]);
    }
    const girdiler = [];
    for (const [kaynak, liste] of kaynaga) {
      const d = metinBelgesi(e.db, kaynak, 'govde')!;
      const spans = (A.spans(d, ['t']) as { type: string; value: unknown; marks?: unknown }[]).map((x) => ({ ...x }));
      const sil = new Set<number>();
      for (const x of liste) {
        spans[x.parcalar[0]].value = x.yeni;
        for (const i of x.parcalar.slice(1)) sil.add(i);
      }
      const yeniSpans = spans.filter((_, i) => !sil.has(i));
      const onceki = A.getHeads(d);
      const yeni = A.change(A.clone(d, { actor: this.aktor }), (x) => A.updateSpans(x, ['t'], yeniSpans as never, spanAyari()));
      girdiler.push({ tur: 'metin', veri: { kayit: kaynak, alan: 'govde', basliklar: A.getHeads(yeni), adDuzeltme: kod }, ikili: A.saveSince(yeni, onceki) });
    }
    if (girdiler.length) this.yaz(evren, girdiler, [kod, ...kaynaga.keys()]);
    return { degisen: [...kaynaga.values()].reduce((n, l) => n + l.length, 0) };
  }

  // ---------- İlişkiler (§3.2) ----------
  /** Bir kaydın ilişkileri, o kaydın gözünden okunmuş. Karşı kaydı çöp kutusunda olanlar gösterilmez. */
  iliskiler({ evren, kod }: { evren: string; kod: string }): IliskiSatiri[] {
    const e = this.evren(evren);
    return e.db.selectObjects(
      `SELECT i.*, k.ad karsi_ad, k.tur karsi_tur, k.kod karsi_kod FROM iliskiler i
       JOIN kayitlar k ON k.kod = CASE WHEN i.a=? THEN i.b ELSE i.a END
       WHERE (i.a=? OR i.b=?) AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY i.tur, i.olusturma`, [kod, kod, kod])
      .map((r) => {
        const tur = iliskiTuruBul(r.tur as string);
        const ben = r.a === kod ? 'a' : 'b';
        const baslangic = r.baslangic ? JSON.parse(r.baslangic as string) : null;
        const bitis = r.bitis ? JSON.parse(r.bitis as string) : null;
        return {
          kod: r.kod as string, tur: r.tur as string, ben, etiket: ben === 'a' ? tur.aIcin : tur.bIcin, grup: tur.grup,
          karsi: { kod: r.karsi_kod as string, ad: r.karsi_ad as string, tur: r.karsi_tur as string },
          rol: (r.rol as string) ?? null, rolAdi: rolAdi(r.tur as string, (r.rol as string) ?? null),
          baslangic, bitis, aciklama: r.aciklama as string, karar: r.karar as string,
          uyari: karsilastir(baslangic, bitis) === 'sonra' ? 'Bitiş, başlangıçtan önce görünüyor.' : null,
        };
      });
  }

  iliskiEkle({ evren, tur, a, b, rol = null, baslangic = '', bitis = '', aciklama = '', karar = 'kesin' }: {
    evren: string; tur: string; a: string; b: string; rol?: string | null; baslangic?: string; bitis?: string; aciklama?: string; karar?: string;
  }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, a);
    this.kayitVarMi(e, b);
    if (a === b) throw new Error('Bir kayıt kendisiyle ilişkilendirilemez.');
    if (!iliskiTuruGecerli(tur)) throw new Error('Bilinmeyen ilişki türü.');
    if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
    const t = iliskiTuruBul(tur);
    if (rol !== null && !t.roller?.some((r) => r.kod === rol)) throw new Error('Bu ilişki için geçersiz rol.');
    const kod = yeniKod();
    this.yaz(evren, [{ tur: 'iliski_ekle', veri: {
      kod, tur, a, b, ...(rol ? { rol } : {}), karar, aciklama: temizle(aciklama, { bos: true, uzunluk: 500 }),
      baslangic: tarihCoz(temizle(baslangic, { bos: true })), bitis: tarihCoz(temizle(bitis, { bos: true })),
    } }], [a, b]);
    return { kod };
  }

  private iliskiBul(e: EvrenVt, kod: string) {
    const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM iliskiler WHERE kod=?', [kod]) : undefined;
    if (!r) throw new Error('İlişki bulunamadı.');
    return r;
  }

  iliskiDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: 'baslangic' | 'bitis' | 'aciklama' | 'karar' | 'rol'; deger: string }) {
    const e = this.evren(evren);
    const r = this.iliskiBul(e, kod);
    let yeni: unknown;
    if (alan === 'baslangic' || alan === 'bitis') yeni = tarihCoz(temizle(deger, { bos: true }));
    else if (alan === 'aciklama') yeni = temizle(deger, { bos: true, uzunluk: 500 });
    else if (alan === 'karar') { if (!kararGecerli(deger)) throw new Error('Geçersiz karar durumu.'); yeni = deger; }
    else if (alan === 'rol') { if (!iliskiTuruBul(r.tur as string).roller?.some((x) => x.kod === deger)) throw new Error('Geçersiz rol.'); yeni = deger; }
    else throw new Error('Bu alan değiştirilemez.');
    const onceki = alan === 'baslangic' || alan === 'bitis' ? (r[alan] ? JSON.parse(r[alan] as string) : null) : r[alan];
    this.yaz(evren, [{ tur: 'iliski_degistir', veri: { kod, alan, deger: yeni, onceki } }], [r.a as string, r.b as string]);
  }

  iliskiSil({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    const r = this.iliskiBul(e, kod);
    this.yaz(evren, [{ tur: 'iliski_sil', veri: { kod, a: r.a, b: r.b, iliski: r.tur } }], [r.a as string, r.b as string]);
  }

  iliskiGeriYukle({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    const r = this.iliskiBul(e, kod);
    this.yaz(evren, [{ tur: 'iliski_geri_yukle', veri: { kod, a: r.a, b: r.b, iliski: r.tur } }], [r.a as string, r.b as string]);
  }

  // ---------- Sahne olayı (§3.3, K14) ve değişimler (§5.6) ----------
  private sahneOlayiBul(e: EvrenVt, sahne: string): string | null {
    return (e.db.selectValue('SELECT kod FROM kayitlar WHERE sahne_olayi=? AND silindi IS NULL ORDER BY olusturma LIMIT 1', [sahne]) as string) ?? null;
  }

  private degisimler(e: EvrenVt, kosul: string, arg: string): DegisimSatiri[] {
    return e.db.selectObjects(
      `SELECT d.*, o.ad olay_ad, s.ad sahne_ad, k.ad konu_ad, k.tur konu_tur FROM degisimler d
       JOIN kayitlar o ON o.kod=d.olay LEFT JOIN kayitlar s ON s.kod=d.sahne LEFT JOIN kayitlar k ON k.kod=d.konu
       WHERE ${kosul} AND d.silindi IS NULL AND o.silindi IS NULL ORDER BY d.olusturma`, [arg])
      .map((r) => ({
        kod: r.kod as string, metin: r.metin as string, karar: r.karar as string, olusturma: Number(r.olusturma),
        olay: { kod: r.olay as string, ad: r.olay_ad as string }, sahne: r.sahne ? { kod: r.sahne as string, ad: r.sahne_ad as string } : null,
        konu: r.konu && r.konu_ad != null ? { kod: r.konu as string, ad: r.konu_ad as string, tur: r.konu_tur as string } : null,
        tarih: this.olayTarihi(e, r.olay as string),
      }));
  }

  /** Bir sahnenin anlattığı olaylar ve değişimleri; sahne olayı ilk ihtiyaçta oluşur, öncesinde yoktur. */
  sahneOlaylari({ evren, sahne }: { evren: string; sahne: string }): SahneOlayBilgisi[] {
    const e = this.evren(evren);
    this.kayitVarMi(e, sahne);
    return e.db.selectObjects(
      `SELECT k.kod, k.ad, k.sahne_olayi FROM iliskiler i JOIN kayitlar k ON k.kod=i.b
       WHERE i.tur='anlatir' AND i.a=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY (k.sahne_olayi=?) DESC, i.olusturma`, [sahne, sahne])
      .map((r) => ({
        kod: r.kod as string, ad: r.ad as string, sahneOlayi: r.sahne_olayi === sahne,
        tarih: this.olayTarihi(e, r.kod as string), degisimler: this.degisimler(e, 'd.olay=?', r.kod as string),
      }));
  }

  /**
   * Sahnede bir değişim kaydeder ("Elin'in eli yaralandı", T12). Olay verilmezse sahnenin kendi sahne olayına
   * bağlanır; sahne olayı yoksa aynı işlem grubunda oluşur (görünür adla, tarihi sahneden gelir).
   */
  degisimEkle({ evren, sahne, olay = null, konu = null, metin, karar = 'kesin' }: {
    evren: string; sahne: string; olay?: string | null; konu?: string | null; metin: string; karar?: string;
  }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, sahne);
    if (konu) this.kayitVarMi(e, konu);
    if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
    const temiz = temizle(metin, { uzunluk: 500 });
    const girdiler: IslemGirdisi[] = [];
    let hedef = olay;
    if (hedef) this.kayitVarMi(e, hedef);
    else {
      hedef = this.sahneOlayiBul(e, sahne);
      if (!hedef) {
        hedef = yeniKod();
        const sahneAdi = e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [sahne]) as string;
        girdiler.push(...this.kayitGirdileri(hedef, { ad: `Sahne: ${sahneAdi}`.slice(0, 200), tur: 'olay', karar: 'kesin', ozet: '', sahneOlayi: sahne }));
        girdiler.push({ tur: 'iliski_ekle', veri: { kod: yeniKod(), tur: 'anlatir', a: sahne, b: hedef, karar: 'kesin' } });
      }
    }
    const kod = yeniKod();
    girdiler.push({ tur: 'degisim_ekle', veri: { kod, olay: hedef, sahne, ...(konu ? { konu } : {}), metin: temiz, karar } });
    this.yaz(evren, girdiler, [sahne, hedef, ...(konu ? [konu] : [])]);
    return { kod, olay: hedef };
  }

  degisimSil({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM degisimler WHERE kod=?', [kod]) : undefined;
    if (!r) throw new Error('Değişim bulunamadı.');
    this.yaz(evren, [{ tur: 'degisim_sil', veri: { kod, olay: r.olay, metin: r.metin } }], [r.olay as string, ...(r.konu ? [r.konu as string] : [])]);
  }

  /** Bir kaydın geçirdiği değişimler, evren tarihine göre (eşlenemeyenler sonda). */
  kayitDegisimleri({ evren, kod }: { evren: string; kod: string }): DegisimSatiri[] {
    const e = this.evren(evren);
    return this.degisimler(e, 'd.konu=?', kod).sort((x, y) => siraAnahtari(x.tarih) - siraAnahtari(y.tarih) || x.olusturma - y.olusturma);
  }

  // ---------- Görseller (§10.12) ----------
  async gorselEkle({ evren, kod, dosyaAdi, tur, veri }: { evren: string; kod: string; dosyaAdi: string; tur: string; veri: Uint8Array }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    if (!this.medya || !this.gorselIsle) throw new Error('Görsel saklama bu cihazda kullanılamıyor.');
    if (!(veri instanceof Uint8Array) || veri.length === 0) throw new Error('Dosya boş.');
    if (veri.length > 200 * 1024 * 1024) throw new Error('Dosya çok büyük (en çok 200 MB).');
    const g = await this.gorselIsle(veri, String(tur));
    const ad = await icerikAdi(g.veri);
    if (!(await this.medya.var(ad))) await this.medya.yaz(ad, g.veri);
    if (g.onizleme && !(await this.medya.var(onizlemeAdi(ad)))) await this.medya.yaz(onizlemeAdi(ad), g.onizleme);
    const girdiler: IslemGirdisi[] = [];
    if (e.db.selectValue('SELECT 1 FROM medya WHERE ad=?', [ad]) === undefined) {
      girdiler.push({ tur: 'medya_ekle', veri: { ad, tur: g.tur, boyut: g.veri.length, en: g.en, boy: g.boy, dosyaAdi: temizle(dosyaAdi, { bos: true }), onizleme: !!g.onizleme } });
    }
    const liste = JSON.parse(e.db.selectValue('SELECT gorseller FROM kayitlar WHERE kod=?', [kod]) as string) as string[];
    if (!liste.includes(ad)) girdiler.push({ tur: 'kayit_gorsel', veri: { kod, ekle: ad } });
    if (girdiler.length) this.yaz(evren, girdiler, [kod]);
    return { ad, yeni: girdiler.length > 0 };
  }

  kayitGorselCikar({ evren, kod, ad }: { evren: string; kod: string; ad: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    this.yaz(evren, [{ tur: 'kayit_gorsel', veri: { kod, cikar: String(ad) } }], [kod]);
  }

  /** Görselin kendisi ya da küçük önizlemesi. İndirilmemiş ile silinmiş ayrı söylenir (§10.8). */
  async gorsel({ evren, ad, onizleme = false }: { evren: string; ad: string; onizleme?: boolean }) {
    const e = this.evren(evren);
    if (!/^[0-9a-f]{64}$/.test(String(ad))) throw new Error('Geçersiz görsel adı.');
    const r = e.db.selectObject('SELECT tur, en, boy, dosya_adi FROM medya WHERE ad=?', [ad]);
    if (!r) return { durum: 'yok' as const };
    if (!this.medya) return { durum: 'indirilmemis' as const };
    const veri = (onizleme ? await this.medya.oku(onizlemeAdi(ad)) : null) ?? await this.medya.oku(ad);
    if (!veri) return { durum: 'indirilmemis' as const };
    const turu = onizleme && (await this.medya.var(onizlemeAdi(ad))) ? 'image/webp' : r.tur as string;
    return { durum: 'var' as const, veri, tur: turu, en: r.en as number, boy: r.boy as number, dosyaAdi: r.dosya_adi as string };
  }

  // ---------- İçe aktarım (§10.11, A6, T14) ----------
  private iceDosyalar(dosyalar: IceDosya[]): IceDosya[] {
    if (!Array.isArray(dosyalar) || dosyalar.length > 20000) throw new Error('Çok fazla dosya.');
    return dosyalar.map((d) => ({ yol: String(d.yol).replace(/\\/g, '/'), metin: typeof d.metin === 'string' ? d.metin : undefined,
      veri: d.veri instanceof Uint8Array ? d.veri : undefined, tur: d.tur ? String(d.tur) : undefined }));
  }

  iceAktarIncele({ dosyalar }: { dosyalar: IceDosya[] }): IceAktarimRaporu {
    return iceAktarimPlani(this.iceDosyalar(dosyalar)).rapor;
  }

  /** Dosyaları yeni bir evrene aktarır (ayrı alan); mevcut evrenlere dokunmaz. */
  async iceAktar({ dosyalar, evrenAdi }: { dosyalar: IceDosya[]; evrenAdi: string }) {
    const temiz = this.iceDosyalar(dosyalar);
    const { plan, rapor } = iceAktarimPlani(temiz);
    if (!plan.length) throw new Error('İçe alınacak kayıt bulunamadı.');
    const { kod: evren } = this.evrenOlustur({ ad: evrenAdi });
    const girdiler: IslemGirdisi[] = [];
    for (const p of plan) {
      girdiler.push(...this.kayitGirdileri(p.kod, { ad: temizle(p.ad), tur: p.tur, karar: p.karar, ozet: temizle(p.ozet, { bos: true, uzunluk: 500 }), spans: p.spans }));
      for (const l of p.lakaplar) girdiler.push({ tur: 'kayit_lakap', veri: { kod: p.kod, ekle: l } });
      for (const t of p.etiketler) girdiler.push({ tur: 'kayit_etiket', veri: { kod: p.kod, ekle: t } });
      if (p.okunus) girdiler.push({ tur: 'kayit_degistir', veri: { kod: p.kod, alan: 'okunus', deger: temizle(p.okunus, { bos: true }), onceki: '' } });
      if (p.tarih) girdiler.push({ tur: 'kayit_tarih', veri: { kod: p.kod, tarih: tarihCoz(p.tarih), onceki: null } });
    }
    this.yaz(evren, girdiler);
    const gorselHatalari: string[] = [];
    const dosyaHaritasi = new Map(temiz.filter((d) => d.veri).map((d) => [d.yol, d]));
    for (const p of plan) for (const yol of p.gorseller) {
      const d = dosyaHaritasi.get(yol)!;
      const tur = d.tur || ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' } as Record<string, string>)[yol.split('.').pop()!.toLowerCase()];
      try { await this.gorselEkle({ evren, kod: p.kod, dosyaAdi: yol.split('/').pop()!, tur, veri: d.veri! }); }
      catch (e) { gorselHatalari.push(`${yol}: ${(e as Error).message}`); }
    }
    return { kod: evren, rapor, gorselHatalari };
  }

  // ---------- Dosyaya tam yedek ve geri yükleme (§10.11 taşınabilir paket) ----------
  /** Evrenin bütün işlem günlüğü ve görselleri tek bir paket dosyasında. Kayıpsız geri yüklenir. */
  async yedekAl({ evren }: { evren: string }) {
    const e = this.evren(evren);
    const bilgi = this.evrenBilgisi({ evren });
    const islemler = e.islemler();
    const satirlar = islemler.map((i) => JSON.stringify({ ...i, ikili: i.ikili ? b64(i.ikili) : null }));
    const medyaAdlari = (e.db.selectObjects('SELECT ad FROM medya ORDER BY olusturma') as { ad: string }[]).map((r) => r.ad);
    const dosyalar: ZipDosyasi[] = [];
    let eksik = 0;
    for (const ad of medyaAdlari) {
      const veri = await this.medya?.oku(ad);
      if (!veri) { eksik++; continue; }
      dosyalar.push({ ad: `medya/${ad}`, veri, sikistirma: false });
      const k = await this.medya?.oku(onizlemeAdi(ad));
      if (k) dosyalar.push({ ad: `medya/${onizlemeAdi(ad)}`, veri: k, sikistirma: false });
    }
    const simdi = Date.now();
    const paket = { bicim: 'dunya-atlasi-paket', paketSurumu: 1, veriBicimi: VERI_BICIMI, evren: { kod: evren, ad: bilgi.ad },
      olusturma: simdi, kurulum: { kod: this.kurulum.kod, ad: this.kurulum.ad }, islemSayisi: islemler.length, kayitSayisi: bilgi.kayitSayisi,
      medya: medyaAdlari.length, eksikMedya: eksik };
    const aciklama = [
      'Dünya Atlası evren paketi',
      '',
      `Evren: ${bilgi.ad}`,
      `Alındığı an: ${new Date(simdi).toISOString()}`,
      `Kayıt: ${bilgi.kayitSayisi} (çöp kutusunda ${bilgi.copSayisi})`,
      `Değişiklik: ${islemler.length}`,
      `Görsel: ${medyaAdlari.length - eksik}${eksik ? ` (${eksik} görsel bu cihazda olmadığı için pakette yok)` : ''}`,
      '',
      'İçindekiler:',
      '- paket.json: paketin özeti ve veri biçimi sürümü',
      '- islemler.jsonl: evrende yapılmış bütün değişiklikler, yapıldıkları sırayla (her satır bir değişiklik).',
      '  Kayıtlar, metinler, bağlantılar, ilişkiler, tarihler ve sürüm geçmişi bunlardan yeniden kurulur.',
      '- medya/: görseller, içerikleriyle adlandırılmış olarak (her görsel bir kez)',
      '',
      'Geri yüklemek için: Dünya Atlası > Evrenler > Yedekten geri yükle.',
    ].join('\n');
    const zip = await zipYaz([
      { ad: 'aciklama.txt', veri: new TextEncoder().encode(aciklama) },
      { ad: 'paket.json', veri: new TextEncoder().encode(JSON.stringify(paket, null, 2)) },
      { ad: 'islemler.jsonl', veri: new TextEncoder().encode(satirlar.join('\n')) },
      ...dosyalar,
    ]);
    this.kurulum.ayarYaz(`son_yedek:${evren}`, String(simdi));
    const gun = new Date(simdi).toISOString().slice(0, 10);
    // Dosya adı yalnız İngiliz harfleriyle: bazı tarayıcılar Türkçe harfli indirme adını yok sayıyor.
    const dosyaAdi = `${katla(bilgi.ad).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evren'}-yedek-${gun}.zip`;
    return { dosyaAdi, veri: zip };
  }

  sonYedek({ evren }: { evren: string }) {
    const v = this.kurulum.ayar(`son_yedek:${evren}`);
    return v ? Number(v) : null;
  }

  private async paketAc(veri: Uint8Array) {
    if (!(veri instanceof Uint8Array)) throw new Error('Dosya okunamadı.');
    const dosyalar = await zipOku(veri);
    const p = dosyalar.get('paket.json');
    const g = dosyalar.get('islemler.jsonl');
    if (!p || !g) throw new Error('Bu dosya bir Dünya Atlası yedeği değil.');
    const paket = JSON.parse(new TextDecoder().decode(p));
    if (paket.bicim !== 'dunya-atlasi-paket') throw new Error('Bu dosya bir Dünya Atlası yedeği değil.');
    if (Number(paket.veriBicimi) > VERI_BICIMI) throw new Error('Bu yedek programın daha yeni bir sürümüyle alınmış. Önce programı güncelleyin.');
    if (!kodGecerliMi(paket.evren?.kod)) throw new Error('Yedekteki evren kodu bozuk.');
    const metin = new TextDecoder().decode(g);
    const islemler: Islem[] = metin ? metin.split('\n').filter(Boolean).map((satir, n) => {
      const i = JSON.parse(satir);
      if (!kodGecerliMi(i.kod) || !kodGecerliMi(i.kurulum) || typeof i.tur !== 'string' || !Number.isInteger(i.sira)) throw new Error(`Yedekte bozuk değişiklik (satır ${n + 1}).`);
      return { ...i, ikili: i.ikili ? b64Coz(i.ikili) : null };
    }) : [];
    return { paket, islemler, dosyalar };
  }

  async yedekIncele({ veri }: { veri: Uint8Array }): Promise<YedekBilgisi> {
    const { paket, islemler, dosyalar } = await this.paketAc(veri);
    const mevcut = this.kurulum.evrenler().find((x) => x.kod === paket.evren.kod);
    const medya = [...dosyalar.keys()].filter((a) => a.startsWith('medya/') && !a.endsWith('.onizleme')).length;
    return {
      evrenKod: paket.evren.kod, evrenAdi: String(paket.evren.ad), tarih: Number(paket.olusturma), islemSayisi: islemler.length,
      kayitSayisi: Number(paket.kayitSayisi) || islemler.filter((i) => i.tur === 'kayit_olustur').length,
      medyaSayisi: medya, eksikMedya: Number(paket.eksikMedya) || 0, mevcut: mevcut ? { kod: mevcut.kod, ad: mevcut.ad } : null,
      veriBicimi: Number(paket.veriBicimi),
    };
  }

  /**
   * Yedeği geri yükler. Evren bu cihazda yoksa kendi koduyla geri gelir; varsa mevcut evrene dokunulmaz,
   * yedek ayrı bir evren olarak açılır (kurtarma alanı, §10.8). İnceledikten sonra "yerine koy" denebilir.
   */
  async yedektenYukle({ veri }: { veri: Uint8Array }) {
    const { paket, islemler, dosyalar } = await this.paketAc(veri);
    const ayri = this.kurulum.evrenler().some((x) => x.kod === paket.evren.kod);
    const kod = ayri ? yeniKod() : paket.evren.kod as string;
    for (const [ad, icerik] of dosyalar) {
      if (!ad.startsWith('medya/') || !this.medya) continue;
      const dosya = ad.slice('medya/'.length);
      if (!/^[0-9a-f]{64}(\.onizleme)?$/.test(dosya)) continue;
      if (!dosya.endsWith('.onizleme') && (await icerikAdi(icerik)) !== dosya) throw new Error(`Yedekteki görsel bozuk: ${dosya}`);
      if (!(await this.medya.var(dosya))) await this.medya.yaz(dosya, icerik);
    }
    const e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
    if (e.islemSayisi() > 0) throw new Error('Bu cihazda aynı adlı bir evren dosyası zaten dolu.');
    e.disaridanAl(islemler);
    const adi = (e.db.selectValue("SELECT v FROM evren WHERE k='ad'") as string | undefined) ?? String(paket.evren.ad);
    const gosterilen = ayri ? `${adi} (yedekten, ${new Date(Number(paket.olusturma)).toLocaleDateString('tr-TR')})` : adi;
    if (ayri) e.islemYap([{ tur: 'evren_adlandir', veri: { ad: gosterilen } }]);
    this.kurulum.evrenEkle(kod, gosterilen, Number(e.db.selectValue("SELECT v FROM evren WHERE k='olusturma'")) || Date.now());
    this.acik.set(kod, e);
    return { kod, ayri };
  }

  /** Geri yüklenen kopyayı asıl evrenin yerine koyar: kopya asıl adı alır, asıl "eski" diye adlanır. Hiçbir şey silinmez. */
  evrenYerineKoy({ kopya, asil }: { kopya: string; asil: string }) {
    if (kopya === asil) throw new Error('Aynı evren.');
    const asilAd = this.evrenBilgisi({ evren: asil }).ad;
    this.evrenBilgisi({ evren: kopya });
    const eski = `${asilAd} (eski, ${new Date().toLocaleDateString('tr-TR')})`;
    this.evrenAdlandir({ evren: asil, ad: eski });
    this.evrenAdlandir({ evren: kopya, ad: asilAd });
  }
}
