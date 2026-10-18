// İsteklerin karşılandığı yer. Dosya açma dışarıdan verilir: tarayıcıda SAH havuzu, sınamada bellek.
// Automerge WASM'ı bu sınıf kurulmadan önce hazırlanmış olmalıdır.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { IslemGirdisi } from '../alan/islem';
import { A } from '../alan/automerge';
import { baglantilar, duzMetindenSpans, spanAyari } from '../alan/metin-sema';
import { akisGecerli, eksenAraligi, farkCoz, farkGecerli, farkYazisi, goreliTarih, karsilastir, paralelGecerli, siraAnahtari, tarihAciklamasi, tarihCoz, takvimGecerli, VARSAYILAN_TAKVIM, yilGunu, type Akis, type EvrenTarihi, type Kisit, type ParalelTakvim, type Takvim, type ZamanSeti } from '../alan/tarih';
import { iliskiTuruBul, iliskiTuruGecerli, rolAdi } from '../alan/iliski-turleri';
import { icerikAdi, onizlemeAdi, type GorselIsleyici, type MedyaDeposu } from './medya';
import { iceAktarimPlani, type IceDosya } from './ice-aktarim';
import { zipOku, zipYaz, type ZipDosyasi } from '../alan/zip';
import { VERI_BICIMI, type Islem } from '../alan/islem';
import { b64, b64Coz } from '../alan/paket';
import { katla, kelimeler, turkceKarsilastir } from '../alan/turkce';
import { adDegistir, ekKalibi, ekYaz, kokAdaylari, sesBilgisi } from '../alan/turkce-ek';
import { kararGecerli, turBul, turGecerli } from '../alan/turler';
import type { BilgiAlani, BilgiGirdisi, GorunurlukBilgisi, IsaretGirdisi, DurumAlani, DurumGirdisi, KisaKayit, SahneAlani, SahneBaglami, SahneKatilimcisi, KaldigiYer, KaldigiYerBilgisi, Catisma, EsitlemeDurumu, IceAktarimRaporu, YedekBilgisi, AdDuzeltmesi, AramaSonucu, Basliklar, BaglananKayit, DegisebilirAlan, DegisimSatiri, DurumSatiri, IliskiSatiri, Istekler, Kayit, KayitOzeti, SahneOlayBilgisi, Spans } from '../veri/api';
import { EvrenVt } from './evren-vt';
import { Esitleme, IzinHatasi, type EsitlemeErisimi, type Tasiyici } from './esitleme';
import { KurulumVt } from './kurulum-vt';
import { DonemselYedek, donemselDurum, type YedekTasiyici } from './donemsel-yedek';
import { metinBelgesi, takvimOku, yonlendir, zamanSetiOku } from './izdusum';
const yonlendirKod = (e: EvrenVt, k: string) => yonlendir(e.db, k);
import * as anlati from './anlati';
import * as durum from './durum';
import * as sablonlar from './sablon';
import * as harita from './harita';
import * as birlesme from './birlesme';
import * as saglik from './saglik';
import * as denetim from './denetim';
import type { Donusum, KontrolCifti } from '../alan/hizalama';
import * as gorunum from './gorunum';
import * as bilgi from './bilgi';
import { BILGI_KAYNAKLARI, INANCLAR } from '../alan/bilgi';
import { gorunurlukGecerli, gorunurlukOku, sadeGercekMi, type Gorunurluk } from '../alan/gorunurluk';
import { yasHesapla } from '../alan/yas';
import { MESELE_DURUMLARI, type Sablon, type SoruDurumu } from '../alan/sablon';
import { gecerlilik, DURUM_KIPLERI } from '../alan/durum';

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
const BILGI_ALAN_ADLARI: Record<string, string> = {
  secenek: 'İnandığı cevap', inanc: 'İnanç', saklama: 'Kimden saklıyor', kaynak: 'Nereden biliyor', kaynakKayit: 'Kimden ya da hangi belgeden',
  sahne: 'Öğrendiği sahne', baslangic: 'Başlangıç', bitis: 'Bitiş', aciklama: 'Açıklama', karar: 'Karar durumu',
};

const katmanEtiketi = (alan: string) => ({ ad: 'Katmanın adı', silindi: 'Katmanın durumu', donusum: 'Katmanın oturtulması', gorsel: 'Katmanın görseli' } as Record<string, string>)[alan.split(':')[2]] ?? 'Katman';

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
      copSayisi: Number(e.db.selectValue('SELECT count(*) FROM kayitlar WHERE silindi IS NOT NULL AND kod NOT IN (SELECT kod FROM yonlendirmeler)')),
      catismaSayisi: this.catismaSayisi({ evren }),
      sorunSayisi: saglik.acikSorunSayisi(e) + gorunum.etkiIncelemeleri(e).acik.length + denetim.acikDenetimSayisi(e),
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
  tasiyiciAyarla(t: Tasiyici | null, yedek: YedekTasiyici | null = null) {
    this.esitleme = t ? new Esitleme(this.esitlemeErisimi(), t) : null;
    this.donemsel = t && yedek ? new DonemselYedek({
      kurulum: this.kurulum, medya: this.medya,
      paketYaz: (evren, medyaDahil) => this.paketYaz(evren, medyaDahil),
      yedektenYukle: (veri) => this.yedektenYukle({ veri }),
    }, yedek) : null;
    if (t && this.esitlemeHatasi?.izin) this.esitlemeHatasi = null;
  }

  // ---------- Dönemsel yedek (§10.10) ----------
  private donemsel: DonemselYedek | null = null;
  private donemselYedekle = true;

  private esitlenirMi(evren: string) { return this.kurulum.ayar(`esitle:${evren}`) !== '0'; }

  /** Drive'a eşitlenen evrenlerin bugünkü yedeği yoksa alınır. Yedek hatası eşitlemeyi bozmaz; ayrıca gösterilir. */
  private async donemselYedekleriAl() {
    const d = this.donemsel;
    if (!d || !this.donemselYedekle) return;
    for (const e of this.kurulum.evrenler()) {
      if (!this.esitlenirMi(e.kod)) continue;
      try { await d.al(e.kod); } catch (err) { if (err instanceof IzinHatasi) throw err; }
    }
  }

  donemselYedekDurumu({ evren }: { evren: string }) {
    this.evren(evren);
    return { ...donemselDurum(this.kurulum, evren), bagli: !!this.donemsel, esitlenir: this.esitlenirMi(evren) };
  }

  async driveYedekleri({ evren }: { evren: string }) {
    if (!this.donemsel) throw new Error('Önce Google Drive\'a bağlanın.');
    return this.donemsel.liste(evren);
  }

  async drivedaYedekAl({ evren }: { evren: string }) {
    if (!this.donemsel) throw new Error('Önce Google Drive\'a bağlanın.');
    this.evren(evren);
    await this.donemsel.al(evren, true);
    return this.donemselYedekDurumu({ evren });
  }

  async drivedanGeriYukle({ id }: { id: string }) {
    if (!this.donemsel) throw new Error('Önce Google Drive\'a bağlanın.');
    if (typeof id !== 'string' || !id) throw new Error('Yedek bulunamadı.');
    return this.donemsel.geriYukle(id);
  }

  yedekAyarlari({ gunSayisi, aySayisi }: { gunSayisi: number; aySayisi: number }) {
    if (!Number.isInteger(gunSayisi) || gunSayisi < 1 || gunSayisi > 3650) throw new Error('Gün sayısı 1 ile 3650 arasında olmalı.');
    if (!Number.isInteger(aySayisi) || aySayisi < 0 || aySayisi > 120) throw new Error('Ay sayısı 0 ile 120 arasında olmalı.');
    this.kurulum.ayarYaz('yedek_gun', String(gunSayisi));
    this.kurulum.ayarYaz('yedek_ay', String(aySayisi));
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
          await this.donemselYedekleriAl();
          this.esitlemeHatasi = null;
        } catch (err) {
          const izin = err instanceof IzinHatasi;
          this.esitlemeHatasi = { mesaj: izin ? 'Google izni yenilenmeli.' : (err as Error).message, izin, zaman: Date.now() };
          if (izin) { this.esitleme = null; this.donemsel = null; }
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

  // ---------- Kaldığın yer (§5.9) ----------
  /** En son bırakılan yer: bu cihazda ya da eşitlemeyle gelen başka bir cihazda (hangisi yeniyse). */
  kaldigiYer({ evren }: { evren: string }): KaldigiYerBilgisi | null {
    const e = this.evren(evren);
    const oku = (k: string): (KaldigiYer & { cihaz?: string }) | null => {
      try { const x = JSON.parse(this.kurulum.ayar(k) ?? 'null'); return x && typeof x === 'object' ? x : null; } catch { return null; }
    };
    const yerel = oku(`kaldigi:${evren}`);
    const uzak = oku(`kaldigi_uzak:${evren}`);
    const y = uzak && (!yerel || uzak.zaman > yerel.zaman) ? uzak : yerel;
    if (!y) return null;
    const bilgi = (kod: string | null) => kod ? e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
    const k = bilgi(y.kayit);
    return {
      kayit: k ? y.kayit : null, konum: k ? y.konum : null, not: String(y.not ?? ''), zaman: Number(y.zaman) || 0,
      yanPanel: (y.yanPanel ?? []).filter((x) => bilgi(x)),
      cihaz: y === uzak && y.cihaz ? this.kurulumAdi(y.cihaz) : null,
      kayitAdi: k ? k.ad as string : null, kayitTuru: k ? k.tur as string : null,
      yanPanelKayitlari: (y.yanPanel ?? []).map(bilgi).filter(Boolean).map((r) => ({ kod: r!.kod as string, ad: r!.ad as string, tur: r!.tur as string })),
    };
  }

  kaldigiYerYaz({ evren, yer }: { evren: string; yer: Omit<KaldigiYer, 'zaman'> }) {
    this.evren(evren);
    const kayit = yer?.kayit && kodGecerliMi(yer.kayit) ? yer.kayit : null;
    const konum = Number.isInteger(yer?.konum) && (yer.konum as number) >= 0 ? yer.konum : null;
    const yanPanel = Array.isArray(yer?.yanPanel) ? yer.yanPanel.filter((x) => kodGecerliMi(x)).slice(0, 12) : [];
    const not = typeof yer?.not === 'string' ? yer.not.slice(0, 2000) : '';
    this.kurulum.ayarYaz(`kaldigi:${evren}`, JSON.stringify({ kayit, konum, yanPanel, not, zaman: Date.now() }));
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
      `SELECT nesne, alan FROM alan_yazanlari ${kod ? `WHERE nesne=?1 OR nesne IN (SELECT kod FROM iliskiler WHERE a=?1 OR b=?1) OR nesne IN (SELECT kod FROM durumlar WHERE konu=?1)
         OR nesne IN (SELECT kod FROM isaretler WHERE kayit=?1) OR nesne IN (SELECT kod FROM haritalar WHERE yer=?1)
         OR nesne IN (SELECT kod FROM iddialar WHERE konu=?1) OR nesne IN (SELECT kod FROM bilgiler WHERE bilen=?1)` : ''}
       GROUP BY nesne, alan HAVING count(DISTINCT deger) > 1`, kod ? [kod] : []);
    for (const g of gruplar) {
      const nesne = g.nesne as string;
      const alan = g.alan as string;
      const iliski = e.db.selectObject('SELECT a, b, tur FROM iliskiler WHERE kod=?', [nesne]);
      const dr = iliski ? undefined : e.db.selectObject('SELECT konu, ozellik FROM durumlar WHERE kod=?', [nesne]);
      const degerler = e.db.selectObjects('SELECT islem, kurulum, deger, zaman FROM alan_yazanlari WHERE nesne=? AND alan=? ORDER BY zaman', [nesne, alan])
        .map((r) => {
          const deger = JSON.parse(r.deger as string);
          return { islem: r.islem as string, deger, yazi: this.degerYazisi(e, alan, deger, !!dr, nesne), kurulum: this.kurulumAdi(r.kurulum as string), zaman: Number(r.zaman) };
        });
      if (dr) {
        sonuc.push({ tur: 'alan', nesne, alan, nesneTuru: 'durum', kayit: dr.konu as string, baslik: `${kayitAdi(dr.konu as string)} · ${dr.ozellik}`, degerler });
        continue;
      }
      const idr = iliski ? undefined : e.db.selectObject('SELECT konu, soru FROM iddialar WHERE kod=?', [nesne]);
      if (idr) {
        sonuc.push({ tur: 'alan', nesne, alan, nesneTuru: 'kayit', kayit: idr.konu as string, baslik: `${kayitAdi(idr.konu as string)} · “${idr.soru}”`,
          alanEtiketi: ({ soru: 'Soru', secenekler: 'Olası cevaplar', gercek: 'Gerçek', karar: 'Karar durumu' } as Record<string, string>)[alan] ?? alan, degerler });
        continue;
      }
      const bir = iliski ? undefined : e.db.selectObject('SELECT x.bilen, i.soru FROM bilgiler x JOIN iddialar i ON i.kod=x.iddia WHERE x.kod=?', [nesne]);
      if (bir) {
        sonuc.push({ tur: 'alan', nesne, alan, nesneTuru: 'kayit', kayit: bir.bilen as string, baslik: `${kayitAdi(bir.bilen as string)} · “${bir.soru}” bilgisi`,
          alanEtiketi: BILGI_ALAN_ADLARI[alan] ?? alan, degerler });
        continue;
      }
      const hr = iliski || dr ? undefined : e.db.selectObject('SELECT ad, yer FROM haritalar WHERE kod=?', [nesne]);
      if (hr) {
        sonuc.push({ tur: 'alan', nesne, alan, nesneTuru: hr.yer ? 'kayit' : 'evren', kayit: (hr.yer as string) ?? null, baslik: `“${hr.ad}” haritası`,
          alanEtiketi: alan.startsWith('katman:') ? katmanEtiketi(alan) : alan === 'ad' ? 'Haritanın adı' : 'Haritanın gösterdiği yer', degerler });
        continue;
      }
      const isr = iliski || dr ? undefined : e.db.selectObject('SELECT i.kayit, h.ad FROM isaretler i JOIN haritalar h ON h.kod=i.harita WHERE i.kod=?', [nesne]);
      if (isr) {
        sonuc.push({ tur: 'alan', nesne, alan, nesneTuru: 'kayit', kayit: isr.kayit as string, baslik: kayitAdi(isr.kayit as string),
          alanEtiketi: alan === 'konum' ? `“${isr.ad}” haritasındaki yeri` : `“${isr.ad}” haritasındaki işaretin bağlı olduğu kayıt`, degerler });
        continue;
      }
      if (nesne.startsWith('sablon:')) {
        const tur = nesne.slice(7);
        sonuc.push({ tur: 'alan', nesne, alan, nesneTuru: 'evren', kayit: null, baslik: `“${turBul(tur).ad}” şablonu`, alanEtiketi: 'Şablon',
          degerler: degerler.map((d) => ({ ...d, yazi: d.deger ? `${(d.deger as Sablon).alanlar.length} alan, ${(d.deger as Sablon).sorular.length} soru` : 'Varsayılan şablon' })) });
        continue;
      }
      const etiket = this.alanEtiketi(e, nesne, alan);
      if (etiket) {
        sonuc.push({ tur: 'alan', nesne, alan, nesneTuru: nesne === 'evren' ? 'evren' : 'kayit', kayit: nesne === 'evren' ? null : nesne,
          baslik: nesne === 'evren' ? 'Evren' : kayitAdi(nesne), alanEtiketi: etiket, degerler });
        continue;
      }
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
      const b = birlesme.birlesmeBilgisi(e, r.kayit as string).birlesti;
      sonuc.push({ tur: 'silme', kayit: r.kayit as string, baslik: kayitAdi(r.kayit as string), duzenlemeSayisi: Number(r.n), zaman: Number(r.zaman),
        kurulumlar: String(r.kurulumlar).split(',').map((k) => this.kurulumAdi(k)), ...(b ? { birlesti: b } : {}) });
    }
    for (const r of e.db.selectObjects(`SELECT * FROM ters_birlesmeler ${kod ? 'WHERE kaynak=?1 OR hedef=?1' : ''} ORDER BY zaman`, kod ? [kod] : [])) {
      sonuc.push({ tur: 'ters_birlesme', islem: r.islem as string, kayit: yonlendirKod(e, r.hedef as string), baslik: kayitAdi(yonlendirKod(e, r.hedef as string)),
        diger: { kod: r.kaynak as string, ad: kayitAdi(r.kaynak as string) }, zaman: Number(r.zaman) });
    }
    for (const r of e.db.selectObjects(`SELECT * FROM metin_catismalari ${kod ? 'WHERE kayit=?' : ''} ORDER BY b_zaman`, kod ? [kod] : [])) {
      sonuc.push({ tur: 'metin', kayit: r.kayit as string, alan: r.alan as string, baslik: kayitAdi(r.kayit as string),
        temel: JSON.parse(r.temel as string), a: { basliklar: JSON.parse(r.a_basliklar as string), kurulum: this.kurulumAdi(r.a_kurulum as string), zaman: Number(r.a_zaman) },
        b: { basliklar: JSON.parse(r.b_basliklar as string), kurulum: this.kurulumAdi(r.b_kurulum as string), zaman: Number(r.b_zaman) } });
    }
    return sonuc;
  }

  catismaSayisi({ evren }: { evren: string }) { return this.catismalar({ evren }).length; }

  /** Şablon alanı ya da soru çatışmasında alanın adı. */
  private alanEtiketi(e: EvrenVt, nesne: string, alan: string): string | null {
    if (nesne === 'evren' && alan.startsWith('takvim:')) return 'Paralel takvim';
    if (nesne === 'evren' && alan.startsWith('akis:')) return 'Zaman akışı';
    if (alan.startsWith('s:')) {
      const m = e.db.selectValue('SELECT metin FROM soru_cevaplari WHERE kayit=? AND soru=?', [nesne, alan.slice(2)]) as string | undefined;
      return m ? `Soru: ${m}` : 'Soru';
    }
    if (alan.startsWith('f:') || alan.startsWith('karar:f:')) {
      const kod = alan.startsWith('f:') ? alan.slice(2) : alan.slice(8);
      const tur = e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [nesne]) as string | undefined;
      const ad = tur ? sablonlar.sablonOku(e, tur).alanlar.find((a) => a.kod === kod)?.ad : undefined;
      return alan.startsWith('karar:') ? `${ad ?? 'Alan'} (karar durumu)` : ad ?? 'Şablonda olmayan alan';
    }
    return null;
  }

  /** Çatışan değerin okunur hâli; düz değerlerde boş kalır, arayüz değeri olduğu gibi gösterir. */
  private degerYazisi(e: EvrenVt, alan: string, deger: unknown, durumAlani: boolean, nesne = ''): string | undefined {
    const ad = (k: unknown) => (typeof k === 'string' ? (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string | undefined) : undefined) ?? 'silinmiş kayıt';
    if (alan.startsWith('s:')) {
      if (!deger) return 'Cevapsız';
      const v = deger as { durum: string; cevap: string; kayitla: string | null };
      return v.durum === 'sonra' ? 'Sonraya bırakıldı' : v.durum === 'ilgisiz' ? 'İlgisiz' : v.kayitla ? `Kayıtla: ${ad(v.kayitla)}` : v.cevap;
    }
    if (alan.startsWith('katman:')) {
      const ka = alan.split(':')[2];
      if (ka === 'silindi') return deger ? 'Kaldırıldı' : 'Duruyor';
      if (ka === 'donusum') { const n = (deger as { noktalar?: unknown[] } | null)?.noktalar?.length; return n ? `${n} nokta çiftiyle oturtma` : 'Önceki oturtma'; }
      if (ka === 'gorsel') return 'Başka bir görsel';
      return String(deger ?? '');
    }
    if (alan.startsWith('f:')) {
      if (deger === null || deger === undefined) return '(boş)';
      if (deger === true) return 'Evet';
      if (typeof deger === 'object' && 'ifade' in (deger as object)) return (deger as { ifade: string }).ifade;
      const secenek = MESELE_DURUMLARI.find((x) => x.kod === deger);
      if (alan === 'f:durum' && secenek) return secenek.ad;
      const tur = e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [nesne]) as string | undefined;
      const a = tur ? sablonlar.sablonOku(e, tur).alanlar.find((x) => x.kod === alan.slice(2)) : undefined;
      return a?.secenekler?.find((x) => x.kod === deger)?.ad ?? String(deger);
    }
    if (nesne === 'evren' && (alan === 'takvim' || alan.startsWith('takvim:'))) {
      const t = deger as Takvim | null;
      const cag = t?.caglar?.length ? `, ${t.caglar.length} çağ` : '';
      return t ? `${alan === 'takvim' ? '' : `“${t.ad}”: `}${t.aylar?.length ?? 0} ay, ${yilGunu(t)} gün, ${t.gunBolumleri?.length ?? 0} gün bölümü${cag}`
        : alan === 'takvim' ? 'Varsayılan takvim' : 'Takvim kaldırıldı';
    }
    if (nesne === 'evren' && alan.startsWith('akis:')) {
      const a = deger as Akis | null;
      return a ? `“${a.ad}”: ${a.cap} başlangıçlı, ${a.oranlar.length} dönem` : 'Akış kaldırıldı';
    }
    if (alan === 'konum' && deger && typeof deger === 'object' && 'kesinlik' in deger) {
      const k = deger as IsaretGirdisi;
      const u = e.db.selectObject('SELECT h.en, h.boy FROM isaretler i JOIN haritalar h ON h.kod=i.harita WHERE i.kod=?', [nesne]);
      const yer = u && k.x !== null && k.y !== null ? `, soldan %${Math.round((k.x / Number(u.en)) * 100)}, üstten %${Math.round((k.y / Number(u.boy)) * 100)}` : '';
      return k.kesinlik === 'bilinmiyor' ? 'Yeri bilinmiyor' : `${k.kesinlik === 'kesin' ? 'Kesin yer' : 'Yaklaşık bölge'}${yer}`;
    }
    if ((alan === 'yer' || alan === 'kayit') && e.db.selectValue('SELECT 1 FROM haritalar WHERE kod=? UNION SELECT 1 FROM isaretler WHERE kod=?', [nesne, nesne]) !== undefined) {
      return deger ? ad(deger) : '(yok)';
    }
    if (alan === 'anlati') {
      if (!deger) return 'Hiçbir esere yerleşmemiş';
      return `${ad((deger as { ust: string }).ust)} içinde`;
    }
    if (alan === 'gorunurluk') {
      const g = deger as Gorunurluk | null;
      if (!g) return 'Evrenin gerçeği';
      return g.katman ? `Yalnızca ${ad(g.katman)} böyle sanıyor` : `Gizli gerçek; bilenler: ${g.bilenler.map(ad).join(', ')}`;
    }
    const idr = e.db.selectObject('SELECT secenekler FROM iddialar WHERE kod=?', [nesne]);
    const bir = idr ? undefined : e.db.selectObject('SELECT i.secenekler FROM bilgiler x JOIN iddialar i ON i.kod=x.iddia WHERE x.kod=?', [nesne]);
    const secenekAdi = (r: Record<string, unknown>, k: unknown) => (JSON.parse(r.secenekler as string) as { kod: string; metin: string }[]).find((x) => x.kod === k)?.metin ?? 'çıkarılmış cevap';
    if (idr) {
      if (alan === 'secenekler') return (deger as { metin: string }[]).map((x) => x.metin).join(' · ');
      if (alan === 'gercek') return deger ? secenekAdi(idr, deger) : 'Belirlenmedi';
      return undefined;
    }
    if (bir) {
      switch (alan) {
        case 'secenek': return deger ? secenekAdi(bir, deger) : '(yok)';
        case 'inanc': return INANCLAR.find((x) => x.kod === deger)?.ad;
        case 'saklama': return deger === null ? 'Saklamıyor' : (deger as string[]).length ? (deger as string[]).map(ad).join(', ') : 'Herkesten saklıyor';
        case 'kaynak': return BILGI_KAYNAKLARI.find((x) => x.kod === deger)?.ad ?? '(belirtilmemiş)';
        case 'kaynakKayit': case 'sahne': return deger ? ad(deger) : '(yok)';
      }
    }
    if (!durumAlani && !bir) return undefined;
    if (alan === 'hedef') return deger ? ad(deger) : '(boş)';
    if (alan === 'kip') return DURUM_KIPLERI.find((k) => k.kod === deger)?.ad;
    if (alan === 'baslangic' || alan === 'bitis') {
      const v = deger as { tarih?: { ifade: string } | null; olay?: string | null; fark?: unknown } | null;
      if (!v) return '(sınırsız)';
      return v.olay ? `“${ad(v.olay)}” olayı${v.fark && farkGecerli(v.fark) ? `, ${farkYazisi(v.fark)}` : ''}` : v.tarih?.ifade ?? '(boş)';
    }
    return undefined;
  }

  /** Alan çatışması: yazar değerlerden birini seçer; seçim ikisini de görmüş yeni bir yazma olarak kaydedilir. */
  alanCatismasiCoz({ evren, nesne, alan, islem }: { evren: string; nesne: string; alan: string; islem: string }) {
    const e = this.evren(evren);
    const r = e.db.selectObject('SELECT deger FROM alan_yazanlari WHERE nesne=? AND alan=? AND islem=?', [nesne, alan, islem]);
    if (!r) throw new Error('Bu çatışma artık yok.');
    const deger = JSON.parse(r.deger as string);
    if (nesne.startsWith('sablon:')) { this.yaz(evren, [{ tur: 'sablon_yaz', veri: { tur: nesne.slice(7), sablon: deger, cozum: true } }]); return; }
    if (alan.startsWith('s:')) {
      const v = deger as { durum: string; cevap: string; kayitla: string | null } | null;
      const metin = (e.db.selectValue('SELECT metin FROM soru_cevaplari WHERE kayit=? AND soru=?', [nesne, alan.slice(2)]) as string | undefined) ?? '';
      this.yaz(evren, [{ tur: 'soru_cevapla', veri: { kod: nesne, soru: alan.slice(2), durum: v?.durum ?? null, cevap: v?.cevap ?? '', metin, ...(v?.kayitla ? { kayitla: v.kayitla } : {}), cozum: true } }], nesne === 'evren' ? [] : [nesne]);
      return;
    }
    if (alan.startsWith('f:')) {
      this.kayitVarMi(e, nesne);
      this.yaz(evren, [{ tur: 'kayit_alan', veri: { kod: nesne, alan: alan.slice(2), ad: this.alanEtiketi(e, nesne, alan), deger, cozum: true } }], [nesne]);
      return;
    }
    if (nesne === 'evren' && alan === 'takvim') { this.yaz(evren, [{ tur: 'takvim_yaz', veri: { takvim: deger, cozum: true } }]); return; }
    if (nesne === 'evren' && alan.startsWith('takvim:')) { this.yaz(evren, [{ tur: 'takvim_yaz', veri: { kod: alan.slice(7), takvim: deger, cozum: true } }]); return; }
    if (nesne === 'evren' && alan.startsWith('akis:')) { this.yaz(evren, [{ tur: 'akis_yaz', veri: { kod: alan.slice(5), akis: deger, cozum: true } }]); return; }
    if (nesne === 'evren' && alan === 'ad') { this.yaz(evren, [{ tur: 'evren_adlandir', veri: { ad: String(deger) } }]); this.kurulum.evrenAdi(evren, String(deger)); return; }
    const hr = e.db.selectObject('SELECT ad FROM haritalar WHERE kod=?', [nesne]);
    if (hr && alan.startsWith('katman:')) {
      const [, katman, ka] = alan.split(':');
      this.yaz(evren, [{ tur: 'harita_katman', veri: { harita: nesne, haritaAd: hr.ad, katman, alan: ka, deger, cozum: true } }]);
      return;
    }
    if (hr) { this.yaz(evren, [{ tur: 'harita_degistir', veri: { kod: nesne, alan, deger, haritaAd: hr.ad, cozum: true } }]); return; }
    const isr = e.db.selectObject('SELECT i.kayit, h.ad FROM isaretler i JOIN haritalar h ON h.kod=i.harita WHERE i.kod=?', [nesne]);
    if (isr) { this.yaz(evren, [{ tur: 'isaret_degistir', veri: { kod: nesne, alan, deger, kayit: isr.kayit, haritaAd: isr.ad, cozum: true } }], [isr.kayit as string]); return; }
    if (alan === 'gorunurluk') {
      const il = e.db.selectObject('SELECT a, b FROM iliskiler WHERE kod=?', [nesne]);
      this.yaz(evren, [{ tur: 'gorunurluk_yaz', veri: { kod: nesne, nesne: il ? 'iliski' : 'kayit', deger, cozum: true } }], il ? [il.a as string, il.b as string] : [nesne]);
      return;
    }
    const idr = e.db.selectObject('SELECT konu, soru FROM iddialar WHERE kod=?', [nesne]);
    if (idr) { this.yaz(evren, [{ tur: 'iddia_degistir', veri: { kod: nesne, alan, deger, konu: idr.konu, soru: idr.soru, cozum: true } }], [idr.konu as string]); return; }
    const bir = e.db.selectObject('SELECT x.bilen, i.soru FROM bilgiler x JOIN iddialar i ON i.kod=x.iddia WHERE x.kod=?', [nesne]);
    if (bir) { this.yaz(evren, [{ tur: 'bilgi_degistir', veri: { kod: nesne, alan, deger, bilen: bir.bilen, soru: bir.soru, cozum: true } }], [bir.bilen as string]); return; }
    const iliski = e.db.selectObject('SELECT a, b FROM iliskiler WHERE kod=?', [nesne]);
    const dr = iliski ? undefined : e.db.selectObject('SELECT konu, ozellik FROM durumlar WHERE kod=?', [nesne]);
    if (dr) {
      this.yaz(evren, [{ tur: 'durum_degistir', veri: { kod: nesne, alan, deger, konu: dr.konu, ozellik: dr.ozellik, cozum: true } }], [dr.konu as string]);
      return;
    }
    if (alan === 'anlati') {
      this.kayitVarMi(e, nesne);
      const v = deger as { ust: string; konum: string } | null;
      this.yaz(evren, [{ tur: 'anlati_yerlestir', veri: { kod: nesne, ust: v?.ust ?? null, konum: v?.konum ?? null, cozum: true } }], [nesne, ...(v ? [v.ust] : [])]);
      return;
    }
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
       WHERE k.silindi IS ${cop ? 'NOT ' : ''}NULL ${cop ? 'AND k.kod NOT IN (SELECT kod FROM yonlendirmeler)' : ''} ORDER BY k.duzenleme DESC`)
      .map((r) => ({
        kod: r.kod as string, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string,
        lakaplar: JSON.parse(r.lakaplar as string), duzenleme: Number(r.duzenleme), silindi: r.silindi == null ? null : Number(r.silindi),
        tarih: this.tarihGoster(e, r.tarih), gorsel: (JSON.parse(r.gorseller as string) as string[])[0] ?? null,
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
      tarih: this.tarihGoster(e, r.tarih), alanKararlari: JSON.parse(r.alan_kararlari as string),
      gorseller: JSON.parse(r.gorseller as string), gorsel: (JSON.parse(r.gorseller as string) as string[])[0] ?? null,
      sahneOlayi: (r.sahne_olayi as string) ?? null,
      sahneTarihi: r.sahne_olayi ? this.tarihOku(e, r.sahne_olayi as string) : null,
      ...birlesme.birlesmeBilgisi(e, kod),
      gorunurluk: this.gorunurlukBilgisi(e, r.gorunurluk),
    };
  }

  /** Bilgi katmanının okunur hâli (§3.6); sade gerçekse null. */
  private gorunurlukBilgisi(e: EvrenVt, ham: unknown): GorunurlukBilgisi | null {
    const g = gorunurlukOku(ham);
    if (sadeGercekMi(g)) return null;
    const kisa = (k: string) => {
      const y = yonlendirKod(e, k);
      const r = e.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [y]);
      return { kod: y, ad: (r?.ad as string) ?? 'Silinmiş kayıt', tur: (r?.tur as string) ?? 'diger' };
    };
    return { katman: g.katman ? kisa(g.katman) : null, gizli: g.gizli, bilenler: g.bilenler.map(kisa) };
  }

  /** Kayıt ya da ilişki: evrenin gerçeği, gizli bir gerçek ya da yalnızca bir bilenin inancı (§3.6). */
  gorunurlukYaz({ evren, kod, nesne, deger }: { evren: string; kod: string; nesne: 'kayit' | 'iliski'; deger: Gorunurluk | null }) {
    const e = this.evren(evren);
    let ilgili: string[];
    let onceki: unknown;
    if (nesne === 'kayit') { this.kayitVarMi(e, kod); ilgili = [kod]; onceki = e.db.selectValue('SELECT gorunurluk FROM kayitlar WHERE kod=?', [kod]); }
    else if (nesne === 'iliski') { const r = this.iliskiBul(e, kod); ilgili = [r.a as string, r.b as string]; onceki = r.gorunurluk; }
    else throw new Error('Bilinmeyen nesne.');
    let yeni: Gorunurluk | null = null;
    if (deger) {
      const g: Gorunurluk = { katman: deger.katman || null, gizli: !!deger.gizli && !deger.katman, bilenler: deger.katman ? [] : [...new Set(deger.bilenler ?? [])] };
      if (!g.gizli) g.bilenler = [];
      if (!gorunurlukGecerli(g)) throw new Error('Bilgi katmanı okunamadı.');
      for (const k of [...(g.katman ? [g.katman] : []), ...g.bilenler]) this.kayitVarMi(e, k);
      if (g.katman && ilgili.includes(g.katman) && nesne === 'kayit') throw new Error('Bir kayıt kendi inancı olamaz.');
      if (g.gizli && !g.bilenler.length) throw new Error('Gizli bir gerçeği kimlerin bildiğini seç.');
      yeni = sadeGercekMi(g) ? null : g;
    }
    if (JSON.stringify(sadeGercekMi(gorunurlukOku(onceki)) ? null : gorunurlukOku(onceki)) === JSON.stringify(yeni)) return;
    this.yaz(evren, [{ tur: 'gorunurluk_yaz', veri: { kod, nesne, deger: yeni } }], ilgili);
  }

  // ---------- İddialar ve bilgi durumları (§3.6) ----------
  kayitIddialari({ evren, kod }: { evren: string; kod: string }) { this.kayitVarMi(this.evren(evren), kod); return bilgi.kayitIddialari(this.durumBaglami(evren), kod); }
  iddialar({ evren }: { evren: string }) { return bilgi.iddialar(this.evren(evren)); }
  iddiaEkle({ evren, konu, soru, secenekler, gercek = null, karar = 'kesin' }: { evren: string; konu: string; soru: string; secenekler: string[]; gercek?: number | null; karar?: string }) {
    return bilgi.iddiaEkle(this.durumBaglami(evren), konu, soru, secenekler, gercek, karar);
  }
  iddiaDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: 'soru' | 'secenekler' | 'gercek' | 'karar'; deger: unknown }) { bilgi.iddiaDegistir(this.durumBaglami(evren), kod, alan, deger); }
  iddiaSil({ evren, kod, geriYukle = false }: { evren: string; kod: string; geriYukle?: boolean }) { bilgi.iddiaSil(this.durumBaglami(evren), kod, geriYukle); }
  bilenBilgileri({ evren, kod }: { evren: string; kod: string }) { this.kayitVarMi(this.evren(evren), kod); return bilgi.bilenBilgileri(this.durumBaglami(evren), kod); }
  bilgiEkle({ evren, bilgi: g }: { evren: string; bilgi: BilgiGirdisi }) { return bilgi.bilgiEkle(this.durumBaglami(evren), g); }
  bilgiDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: BilgiAlani; deger: unknown }) { bilgi.bilgiDegistir(this.durumBaglami(evren), kod, alan, deger); }
  bilgiSil({ evren, kod, geriYukle = false }: { evren: string; kod: string; geriYukle?: boolean }) { bilgi.bilgiSil(this.durumBaglami(evren), kod, geriYukle); }

  private tarihOku(e: EvrenVt, kod: string): EvrenTarihi | null {
    return this.tarihGoster(e, e.db.selectValue('SELECT tarih FROM kayitlar WHERE kod=?', [kod]));
  }
  /** Göreli tarihin okunuşu dayanakların bugünkü adlarıyla yazılır ("Tufan'dan 80–120 yıl sonra"). */
  private goreliIfade(e: EvrenVt, kisitlar: Kisit[]): string {
    return kisitlar.map((k) => {
      const ad = (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [yonlendir(e.db, k.olay)]) as string | undefined) ?? 'silinmiş bir kayıt';
      const ses = sesBilgisi(ad);
      return `${ad}'${ekYaz(ses, ekKalibi(ses, 'dan'))} ${farkYazisi(k)}`;
    }).join('; ');
  }
  private tarihGoster(e: EvrenVt, ham: unknown): EvrenTarihi | null {
    if (!ham) return null;
    const t = JSON.parse(ham as string) as EvrenTarihi;
    if (t.bicim === 'goreli') {
      t.ifade = this.goreliIfade(e, t.kisitlar ?? []);
      if (t.celiski) t.celiskiAdlari = t.celiski.map((k) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string | undefined) ?? 'Silinmiş kayıt');
    }
    return t;
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

  /** Bölme (§9.5): bir metin parçası yeni kayda dönüşür; eski yerinde ona bağlantı kalır (bağlantıyı editör yazar). */
  parcadanKayit({ evren, kaynak, ad, tur, spans }: { evren: string; kaynak: string; ad: string; tur: string; spans: Spans }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kaynak);
    if (!turGecerli(tur)) throw new Error('Bilinmeyen tür.');
    if (!Array.isArray(spans) || !spans.length || spans.length > 20000) throw new Error('Ayrılacak metin boş.');
    const kod = yeniKod();
    this.yaz(evren, this.kayitGirdileri(kod, { ad: temizle(ad), tur, karar: 'fikir', ozet: '', spans }), [kod, kaynak]);
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

  /**
   * Evren tarihi (§3.4): ifade ve kanonik eksen birlikte saklanır. Boş ifade tarihi kaldırır. `kisitlar` verilirse
   * tarih göreli ya da çapalıdır ("Tufan'dan 80–120 yıl sonra"); ekseni çözücü hesaplar, dayanak kayınca kayar.
   */
  kayitTarih({ evren, kod, ifade = '', kisitlar = null }: { evren: string; kod: string; ifade?: string; kisitlar?: { olay: string; fark: string }[] | null }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    let tarih: EvrenTarihi | null;
    if (Array.isArray(kisitlar) && kisitlar.length) {
      if (kisitlar.length > 20) throw new Error('En çok 20 kısıt girilebilir.');
      const k: Kisit[] = kisitlar.map((x) => {
        const olay = yonlendir(e.db, String(x?.olay ?? ''));
        if (!kodGecerliMi(olay) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [olay]) === undefined) throw new Error('Dayanak kayıt bulunamadı.');
        if (olay === kod) throw new Error('Bir kaydın tarihi kendisine göre verilemez.');
        const f = farkCoz(String(x?.fark ?? ''));
        if (!f) throw new Error('Farkı “sonra”, “14 gün sonra” ya da “80–120 yıl önce” gibi yaz.');
        return { olay, ...f };
      });
      tarih = goreliTarih(k, this.goreliIfade(e, k), takvimOku(e.db));
    } else tarih = tarihCoz(temizle(ifade, { bos: true }), zamanSetiOku(e.db));
    const onceki = this.tarihOku(e, kod);
    const anahtar = (t: EvrenTarihi | null) => JSON.stringify(t ? (t.bicim === 'goreli' ? t.kisitlar : t.ifade) : null);
    if (anahtar(onceki) === anahtar(tarih)) return { tarih };
    this.yaz(evren, [{ tur: 'kayit_tarih', veri: { kod, tarih, onceki } }], [kod]);
    return { tarih };
  }

  /** Alan düzeyinde karar durumu (§3.6): düz girilen değer kesindir; tek dokunuşla fikre çevrilir. */
  alanKarari({ evren, kod, alan, karar }: { evren: string; kod: string; alan: string; karar: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    let ad: string | undefined;
    if (sablonlar.alanKarariGecerli(alan)) {
      ad = sablonlar.sablonOku(e, e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [kod]) as string).alanlar.find((a) => a.kod === alan.slice(2))?.ad;
      if (!ad) throw new Error('Bu alan şablonda yok.');
    } else if (!['ad', 'ozet', 'okunus', 'tarih'].includes(alan)) throw new Error('Bu alanın karar durumu tutulmuyor.');
    if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
    this.yaz(evren, [{ tur: 'kayit_alan_karar', veri: { kod, alan, karar, ...(ad ? { ad } : {}) } }], [kod]);
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
    if (e.db.selectValue('SELECT 1 FROM yonlendirmeler WHERE kod=?', [kod]) !== undefined) throw new Error('Bu kayıt başka bir kayıtla birleştirilmiş; geri getirmek için birleştirmeyi geri al.');
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
       WHERE (b.hedef=?1 OR b.hedef IN (SELECT kod FROM yonlendirmeler WHERE hedef=?1)) AND k.silindi IS NULL ORDER BY k.duzenleme DESC, b.sira`, [kod])) {
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
          gorunurluk: this.gorunurlukBilgisi(e, r.gorunurluk),
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
    if (!rol && t.rolIstegeBagli) rol = null;
    if (rol !== null && !t.roller?.some((r) => r.kod === rol)) throw new Error('Bu ilişki için geçersiz rol.');
    const kod = yeniKod();
    this.yaz(evren, [{ tur: 'iliski_ekle', veri: {
      kod, tur, a, b, ...(rol ? { rol } : {}), karar, aciklama: temizle(aciklama, { bos: true, uzunluk: 500 }),
      baslangic: tarihCoz(temizle(baslangic, { bos: true }), zamanSetiOku(e.db)), bitis: tarihCoz(temizle(bitis, { bos: true }), zamanSetiOku(e.db)),
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
    if (alan === 'baslangic' || alan === 'bitis') yeni = tarihCoz(temizle(deger, { bos: true }), zamanSetiOku(e.db));
    else if (alan === 'aciklama') yeni = temizle(deger, { bos: true, uzunluk: 500 });
    else if (alan === 'karar') { if (!kararGecerli(deger)) throw new Error('Geçersiz karar durumu.'); yeni = deger; }
    else if (alan === 'rol') {
      const t = iliskiTuruBul(r.tur as string);
      if (!deger && t.rolIstegeBagli) yeni = null;
      else if (!t.roller?.some((x) => x.kod === deger)) throw new Error('Geçersiz rol.');
      else yeni = deger;
    }
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

  // ---------- Anlatı yapısı: eser, bölüm, sahne (§3.3) ----------
  private anlatiBaglami(evren: string): anlati.AnlatiBaglami {
    return { e: this.evren(evren), yaz: (g, k) => { this.yaz(evren, g, k); }, kayitGirdileri: (kod, v) => this.kayitGirdileri(kod, v) };
  }
  private durumBaglami(evren: string): durum.DurumBaglami {
    const e = this.evren(evren);
    return { e, yaz: (g, k) => { this.yaz(evren, g, k); }, olayTarihi: (kod) => this.olayTarihi(e, kod) };
  }

  eserYapisi({ evren, eser }: { evren: string; eser: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, eser);
    return anlati.eserYapisi(e, eser);
  }
  anlatiYeri({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    return anlati.anlatiYeri(e, kod);
  }
  yerlesmemisler({ evren }: { evren: string }) { return anlati.yerlesmemisler(this.evren(evren)); }
  eserler({ evren }: { evren: string }): KisaKayit[] {
    return this.evren(evren).db.selectObjects("SELECT kod, ad, tur FROM kayitlar WHERE tur='eser' AND silindi IS NULL ORDER BY olusturma") as unknown as KisaKayit[];
  }
  anlatiYerlestir({ evren, kod, ust, sira = null }: { evren: string; kod: string; ust: string | null; sira?: number | null }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    if (ust !== null) this.kayitVarMi(e, ust);
    if (sira !== null && (!Number.isInteger(sira) || sira < 0)) throw new Error('Geçersiz sıra.');
    return anlati.yerlestir(this.anlatiBaglami(evren), kod, ust, sira);
  }
  anlatiOlustur({ evren, ust, ad, tur }: { evren: string; ust: string; ad: string; tur: 'bolum' | 'sahne' }) {
    if (tur !== 'bolum' && tur !== 'sahne') throw new Error('Geçersiz tür.');
    return anlati.olusturVeYerlestir(this.anlatiBaglami(evren), ust, temizle(ad), tur);
  }

  // ---------- Durum geçmişi (§3.5) ----------
  /** `an` bir sahne ya da olay kodudur; durumların o kaydın evren tarihindeki geçerliliği hesaplanır. */
  durumlar({ evren, kod, an = null }: { evren: string; kod: string; an?: string | null }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    if (!an) return { durumlar: durum.durumlar(this.durumBaglami(evren), kod), an: null };
    this.kayitVarMi(e, an);
    const t = this.olayTarihi(e, an);
    return { durumlar: durum.durumlar(this.durumBaglami(evren), kod, t), an: t };
  }
  durumEkle({ evren, kod, durum: g }: { evren: string; kod: string; durum: DurumGirdisi }) {
    this.kayitVarMi(this.evren(evren), kod);
    return durum.durumEkle(this.durumBaglami(evren), kod, g);
  }
  durumDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: DurumAlani; deger: unknown }) {
    durum.durumDegistir(this.durumBaglami(evren), kod, alan, deger);
  }
  durumSil({ evren, kod, geriYukle = false }: { evren: string; kod: string; geriYukle?: boolean }) {
    durum.durumSil(this.durumBaglami(evren), kod, geriYukle);
  }
  ozellikAdlari({ evren }: { evren: string }) { return durum.ozellikAdlari(this.evren(evren)); }

  // ---------- Sahne alanları ve bağlam paneli (§3.3, §5.5) ----------
  /** Sahnenin mekânı, bakış açısı, anlatıcısı ve odak karakteri ilişki olarak tutulur; her birinden bir tane olur. */
  private sahneIliskileri(e: EvrenVt, sahne: string, alan: SahneAlani) {
    const sahneSutunu = alan === 'sahne_yeri' ? 'a' : 'b';
    const karsi = sahneSutunu === 'a' ? 'b' : 'a';
    return e.db.selectObjects(
      `SELECT i.kod, i.${karsi} kayit, k.ad, k.tur FROM iliskiler i JOIN kayitlar k ON k.kod=i.${karsi}
       WHERE i.tur=? AND i.${sahneSutunu}=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY i.olusturma`, [alan, sahne])
      .map((r) => ({ iliski: r.kod as string, kod: r.kayit as string, ad: r.ad as string, tur: r.tur as string }));
  }

  sahneAlaniAyarla({ evren, sahne, alan, kayit }: { evren: string; sahne: string; alan: SahneAlani; kayit: string | null }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, sahne);
    if (!['sahne_yeri', 'bakis', 'anlatici', 'odak'].includes(alan)) throw new Error('Bilinmeyen sahne alanı.');
    if (kayit) { this.kayitVarMi(e, kayit); if (kayit === sahne) throw new Error('Sahne kendisine bağlanamaz.'); }
    const mevcut = this.sahneIliskileri(e, sahne, alan);
    if (mevcut.length === 1 && mevcut[0].kod === kayit) return;
    const girdiler: IslemGirdisi[] = mevcut.map((m) => {
      const [a, b] = alan === 'sahne_yeri' ? [sahne, m.kod] : [m.kod, sahne];
      return { tur: 'iliski_sil', veri: { kod: m.iliski, a, b, iliski: alan } };
    });
    if (kayit) {
      const [a, b] = alan === 'sahne_yeri' ? [sahne, kayit] : [kayit, sahne];
      girdiler.push({ tur: 'iliski_ekle', veri: { kod: yeniKod(), tur: alan, a, b, karar: 'kesin' } });
    }
    this.yaz(evren, girdiler, [sahne, ...mevcut.map((m) => m.kod), ...(kayit ? [kayit] : [])]);
  }

  /** Sahnenin evren tarihindeki hâli (§5.5): katılımcıların durumu, o tarihte süren ilişkileri, önceki değişimleri; mekânın durumu. */
  sahneBaglami({ evren, sahne }: { evren: string; sahne: string }): SahneBaglami {
    const e = this.evren(evren);
    this.kayitVarMi(e, sahne);
    const an = this.olayTarihi(e, sahne);
    const db = this.durumBaglami(evren);
    const tek = (alan: SahneAlani): KisaKayit | null => {
      const m = this.sahneIliskileri(e, sahne, alan)[0];
      return m ? { kod: m.kod, ad: m.ad, tur: m.tur } : null;
    };
    const gorunur = <T extends { gecerli?: string }>(x: T) => x.gecerli !== 'hayir';
    const yer = tek('sahne_yeri');
    const bakis = tek('bakis'), anlatici = tek('anlatici'), odak = tek('odak');

    const katilim = new Map<string, KisaKayit & { roller: string[] }>();
    const ekle = (k: KisaKayit, rol: string) => {
      const v = katilim.get(k.kod) ?? { ...k, roller: [] };
      if (!v.roller.includes(rol)) v.roller.push(rol);
      katilim.set(k.kod, v);
    };
    if (bakis) ekle(bakis, 'Bakış açısı');
    if (odak) ekle(odak, 'Odak karakter');
    if (anlatici) ekle(anlatici, 'Anlatıcı');
    for (const r of e.db.selectObjects(
      `SELECT k.kod, k.ad, k.tur, i.rol FROM iliskiler i JOIN kayitlar k ON k.kod=i.a
       WHERE i.tur='sahnede' AND i.b=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY i.olusturma`, [sahne])) {
      ekle({ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }, rolAdi('sahnede', (r.rol as string) ?? null) ?? 'Sahnede');
    }

    // Sahne yapısı ve yazarlık bağları (açık mesele, gerekçe, not) evrenin o anki hâli değildir.
    const SAHNE_TURLERI = new Set(['anlatir', 'sahnede', 'olayda', 'sahne_yeri', 'bakis', 'anlatici', 'odak', 'mesele_konusu', 'gerekce_konusu', 'nottan']);
    const katilimcilar: SahneKatilimcisi[] = [...katilim.values()].map((k) => ({
      ...k,
      durumlar: durum.durumlar(db, k.kod, an).filter(gorunur),
      iliskiler: this.iliskiler({ evren, kod: k.kod })
        .filter((i) => !SAHNE_TURLERI.has(i.tur))
        .map((i) => ({ ...i, gecerli: gecerlilik('aralik', i.baslangic ?? 'acik', i.bitis ?? 'acik', an) }))
        .filter(gorunur),
      degisimler: an ? this.kayitDegisimleri({ evren, kod: k.kod })
        .filter((d) => d.sahne?.kod !== sahne)
        .map((d) => ({ ...d, sira: karsilastir(d.tarih, an) }))
        .filter((d) => d.sira !== 'sonra') : [],
      yas: yasHesapla(sablonlar.tarihDegeri(e, k.kod, 'dogum'), an, sablonlar.tarihDegeri(e, k.kod, 'olum'), zamanSetiOku(e.db))?.metin ?? null,
    }));
    return {
      tarih: an,
      yer: yer ? { ...yer, durumlar: durum.durumlar(db, yer.kod, an).filter(gorunur) } : null,
      bakis, anlatici, odak, katilimcilar,
      bakisBilgileri: bakis ? bilgi.anBilgisi(db, bakis.kod, an) : [],
    };
  }

  // ---------- Şablonlar, soru kütüphanesi, açık meseleler ve gerekçe defteri (§3.1, §6, §4.6) ----------
  private sablonBaglami(evren: string): sablonlar.SablonBaglami {
    return { e: this.evren(evren), yaz: (g, k) => { this.yaz(evren, g, k); }, kayitGirdileri: (kod, v) => this.kayitGirdileri(kod, v) };
  }
  sablon({ evren, tur }: { evren: string; tur: string }) { return sablonlar.sablonBilgisi(this.evren(evren), tur); }
  sablonYaz({ evren, tur, sablon }: { evren: string; tur: string; sablon: Sablon | null }) { sablonlar.sablonYaz(this.sablonBaglami(evren), tur, sablon); }
  kayitSablonu({ evren, kod }: { evren: string; kod: string }) { return sablonlar.kayitSablonu(this.evren(evren), kod); }
  kayitAlanYaz({ evren, kod, alan, deger }: { evren: string; kod: string; alan: string; deger: unknown }) {
    sablonlar.kayitAlanYaz(this.sablonBaglami(evren), kod, alan, deger);
  }
  soruCevapla({ evren, kod, soru, durum: d, cevap = '' }: { evren: string; kod: string; soru: string; durum: SoruDurumu | null; cevap?: string }) {
    sablonlar.soruCevapla(this.sablonBaglami(evren), kod, soru, d, cevap);
  }
  soruKayitla({ evren, kod, soru, ad, tur }: { evren: string; kod: string; soru: string; ad: string; tur: string }) {
    return sablonlar.soruKayitla(this.sablonBaglami(evren), kod, soru, ad, tur);
  }
  kayitSoruSeti({ evren, kod, set, ekle }: { evren: string; kod: string; set: string; ekle: boolean }) {
    sablonlar.kayitSoruSeti(this.sablonBaglami(evren), kod, set, ekle);
  }
  evrenSorulari({ evren }: { evren: string }) { return sablonlar.evrenSorulari(this.evren(evren)); }
  meseleler({ evren, kod }: { evren: string; kod?: string }) {
    const e = this.evren(evren);
    if (kod) this.kayitVarMi(e, kod);
    return sablonlar.meseleler(e, kod);
  }
  yazarKaydiEkle({ evren, tur, ad, bagla = null, onemli = false }: { evren: string; tur: 'acik_mesele' | 'gerekce'; ad: string; bagla?: string | null; onemli?: boolean }) {
    return sablonlar.yazarKaydiEkle(this.sablonBaglami(evren), tur, ad, bagla, onemli);
  }

  // ---------- Takvim (§3.4) ve zaman çizelgesi (§7) ----------
  takvim({ evren }: { evren: string }): Takvim { return takvimOku(this.evren(evren).db); }

  /** Ana takvim, paralel takvimler ve zaman akışları (§3.4). */
  zamanSeti({ evren }: { evren: string }): ZamanSeti { return zamanSetiOku(this.evren(evren).db); }

  /** Yazarın girdiği takvim tanımını temizler. */
  private takvimTemizle(t: Takvim, kod: string, surum: number): Takvim {
    const ad = (x: unknown) => String(x ?? '').replace(/\s+/g, ' ').trim();
    const yeni: Takvim = {
      kod, surum, ad: ad(t.ad) || 'Yıl', yilGun: Number(t.yilGun) || 365,
      aylar: (t.aylar ?? []).map((a) => ({ ad: ad(a.ad), gun: Number(a.gun) })),
      gunBolumleri: (t.gunBolumleri ?? []).map(ad),
      mevsimler: (t.mevsimler ?? []).map((m) => ({ ad: ad(m.ad), ilkAy: Number(m.ilkAy), sonAy: Number(m.sonAy) })),
    };
    const caglar = (t.caglar ?? []).map((c) => ({ ad: ad(c.ad), baslangic: Number(c.baslangic), ...(c.ters ? { ters: true } : {}) }));
    if (caglar.length) yeni.caglar = caglar;
    if (yeni.aylar!.length) yeni.yilGun = yilGunu(yeni);
    if (!takvimGecerli(yeni)) {
      if (caglar.some((c) => !Number.isInteger(c.baslangic))) throw new Error('Çağın başladığı yıl bir tam sayı olmalı.');
      if (caglar.filter((c) => c.ters).length > 1) throw new Error('Geriye sayan en çok bir çağ olabilir.');
      throw new Error('Takvimde boş, sayı içeren ya da tekrar eden bir ad, ya da geçersiz bir gün sayısı var. Geriye sayan çağ, ileri sayan çağların hepsinden önce başlamalı.');
    }
    return yeni;
  }

  /** Tarih okunurken takvimi, çağı ve akışı adından tanıyoruz: adlar birbirinden ayırt edilebilmeli. */
  private zamanAdlariniDenetle(z: ZamanSeti, haric: string, adlar: string[]) {
    const mevcut: string[] = [];
    if (haric !== 'ana') mevcut.push(z.ana.ad, ...(z.ana.caglar ?? []).map((c) => c.ad));
    for (const p of z.diger) if (p.kod !== haric) mevcut.push(p.ad, ...(p.caglar ?? []).map((c) => c.ad));
    for (const a of z.akislar) if (a.kod !== haric) mevcut.push(a.ad);
    const k = new Set(mevcut.map(katla));
    const cakisan = adlar.find((x) => k.has(katla(x)));
    if (cakisan) throw new Error(`“${cakisan}” adı başka bir takvimde, çağda ya da zaman akışında da var; tarih yazılırken hangisi olduğu ayırt edilemez.`);
  }

  /** Ana takvim: bir sonraki sürüm numarasıyla. */
  private takvimHazirla(e: EvrenVt, t: Takvim): Takvim {
    const z = zamanSetiOku(e.db);
    const yeni = this.takvimTemizle(t, 'ana', z.ana.surum + 1);
    this.zamanAdlariniDenetle(z, 'ana', [yeni.ad, ...(yeni.caglar ?? []).map((c) => c.ad)]);
    return yeni;
  }

  /** Paralel takvim: takvim kuralları, ana takvime başlangıç eşlemesi (bilinmiyorsa boş) ve bağlı kayıt. */
  private paralelHazirla(e: EvrenVt, kod: string | null, t: ParalelTakvim): ParalelTakvim {
    const z = zamanSetiOku(e.db);
    const eski = kod ? z.diger.find((x) => x.kod === kod) : undefined;
    if (kod && !eski) throw new Error('Takvim bulunamadı.');
    const temel = this.takvimTemizle(t, kod ?? yeniKod(), (eski?.surum ?? 0) + 1);
    if (!String(t.ad ?? '').trim()) throw new Error('Takvimin yıl için kullandığı sözü yaz (örn. “Döngü”).');
    if (katla(temel.ad) === katla('Yıl')) throw new Error('Paralel takvimin yıl sözü ana takvimden ayırt edilebilmeli; “Yıl” dışında bir söz seç.');
    const capAna = String(t.cap?.ana ?? '').replace(/\s+/g, ' ').trim();
    const cap = t.cap && capAna ? { yil: Number(t.cap.yil), ana: capAna } : null;
    if (cap) {
      if (!Number.isInteger(cap.yil)) throw new Error('Başlangıç yılı bir tam sayı olmalı.');
      const c = tarihCoz(cap.ana, z.ana);
      if (!c?.eksen || c.eksen.enErken === null || c.eksen.enGec === null) throw new Error('Başlangıç tarihi ana takvimde okunamadı; “1 Kar 101” ya da “101” gibi yaz.');
    }
    const bagli = t.bagli ? String(t.bagli) : null;
    if (bagli) this.kayitVarMi(e, bagli);
    const p: ParalelTakvim = { ...temel, cap, bagli };
    if (!paralelGecerli(p)) throw new Error('Takvim tanımı geçersiz.');
    this.zamanAdlariniDenetle(z, p.kod, [p.ad, ...(p.caglar ?? []).map((c) => c.ad)]);
    return p;
  }

  /** Zaman akışı: ad, akışın başladığı ana takvim tarihi ve oran dönemleri. */
  private akisHazirla(e: EvrenVt, kod: string | null, a: Akis): Akis {
    const z = zamanSetiOku(e.db);
    if (kod && !z.akislar.some((x) => x.kod === kod)) throw new Error('Zaman akışı bulunamadı.');
    const metin = (x: unknown) => String(x ?? '').replace(/\s+/g, ' ').trim();
    const ad = metin(a.ad);
    if (!ad) throw new Error('Zaman akışına bir ad ver (örn. “Fey”).');
    if (/\d/.test(ad)) throw new Error('Akışın adı sayı içermemeli; tarih yazılırken ad ile gün sayısı karışır.');
    const okunur = (s: string) => { const t = tarihCoz(s, z.ana); return !!t?.eksen && t.eksen.enErken !== null; };
    const cap = metin(a.cap);
    if (!okunur(cap)) throw new Error('Akışın başladığı tarih ana takvimde okunamadı.');
    const oranlar = (Array.isArray(a.oranlar) ? a.oranlar : []).map((o, i) => {
      const bas = i === 0 ? null : metin(o?.bas);
      if (bas !== null && !okunur(bas)) throw new Error(`${i + 1}. dönemin başladığı tarih ana takvimde okunamadı.`);
      const akis = Number(o?.akis);
      const ana = o?.ana ? [Number(o.ana[0]), Number(o.ana[1] ?? o.ana[0])] as [number, number] : null;
      if (!(akis > 0) || (ana && !(ana[0] >= 0 && ana[1] >= ana[0]))) throw new Error('Oran: akışta geçen gün sıfırdan büyük, ana akıştaki gün sıfır ya da daha büyük olmalı (aralıksa küçükten büyüğe).');
      return { bas, akis, ana };
    });
    if (!oranlar.length) throw new Error('En az bir oran dönemi gir.');
    const bagli = a.bagli ? String(a.bagli) : null;
    if (bagli) this.kayitVarMi(e, bagli);
    const yeni: Akis = { kod: kod ?? yeniKod(), ad, bagli, cap, oranlar };
    if (!akisGecerli(yeni)) throw new Error('Zaman akışı tanımı geçersiz.');
    this.zamanAdlariniDenetle(z, yeni.kod, [ad]);
    return yeni;
  }

  /** Takvim ya da akış değişirse hangi tarihlerin evrendeki yeri değişir (§3.4): ifadeler korunur, yer yeniden hesaplanır. */
  takvimEtkisi({ evren, takvim, kod = null }: { evren: string; takvim: Takvim | ParalelTakvim | null; kod?: string | null }) {
    const e = this.evren(evren);
    const eski = zamanSetiOku(e.db);
    let yeni: ZamanSeti;
    if (kod) {
      const p = takvim ? this.paralelHazirla(e, kod, takvim as ParalelTakvim) : null;
      yeni = { ...eski, diger: [...eski.diger.filter((x) => x.kod !== kod), ...(p ? [p] : [])] };
    } else yeni = { ...eski, ana: takvim ? this.takvimHazirla(e, takvim) : { ...VARSAYILAN_TAKVIM, surum: eski.ana.surum } };
    return this.zamanEtkisi(e, eski, yeni);
  }
  akisEtkisi({ evren, kod, akis }: { evren: string; kod: string; akis: Akis | null }) {
    const e = this.evren(evren);
    const eski = zamanSetiOku(e.db);
    const a = akis ? this.akisHazirla(e, kod, akis) : null;
    return this.zamanEtkisi(e, eski, { ...eski, akislar: [...eski.akislar.filter((x) => x.kod !== kod), ...(a ? [a] : [])] });
  }

  private zamanEtkisi(e: EvrenVt, eski: ZamanSeti, yeni: ZamanSeti) {
    const ad = (k: string) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string | undefined) ?? 'Kayıt';
    const tarihler: { yer: string; kayit: string; t: EvrenTarihi }[] = [];
    for (const r of e.db.selectObjects('SELECT kod, ad, tarih FROM kayitlar WHERE tarih IS NOT NULL AND silindi IS NULL')) tarihler.push({ yer: `${r.ad} · evren tarihi`, kayit: r.kod as string, t: JSON.parse(r.tarih as string) });
    for (const r of e.db.selectObjects('SELECT a, b, baslangic, bitis FROM iliskiler WHERE silindi IS NULL AND (baslangic IS NOT NULL OR bitis IS NOT NULL)')) {
      for (const [k, n] of [['baslangic', 'başlangıcı'], ['bitis', 'bitişi']] as const) if (r[k]) tarihler.push({ yer: `${ad(r.a as string)} – ${ad(r.b as string)} ilişkisinin ${n}`, kayit: r.a as string, t: JSON.parse(r[k] as string) });
    }
    for (const r of e.db.selectObjects('SELECT konu, ozellik, baslangic, bitis FROM durumlar WHERE silindi IS NULL')) {
      for (const [k, n] of [['baslangic', 'başlangıcı'], ['bitis', 'bitişi']] as const) {
        const v = r[k] ? JSON.parse(r[k] as string) as { tarih?: EvrenTarihi } : null;
        if (v?.tarih) tarihler.push({ yer: `${ad(r.konu as string)} · ${r.ozellik} ${n}`, kayit: r.konu as string, t: v.tarih });
      }
    }
    for (const r of e.db.selectObjects('SELECT b.bilen, i.soru, b.baslangic, b.bitis FROM bilgiler b JOIN iddialar i ON i.kod=b.iddia WHERE b.silindi IS NULL')) {
      for (const [k, n] of [['baslangic', 'başlangıcı'], ['bitis', 'bitişi']] as const) {
        const v = r[k] ? JSON.parse(r[k] as string) as { tarih?: EvrenTarihi } : null;
        if (v?.tarih) tarihler.push({ yer: `${ad(r.bilen as string)} · “${r.soru}” bilgisinin ${n}`, kayit: r.bilen as string, t: v.tarih });
      }
    }
    for (const r of e.db.selectObjects('SELECT d.kayit, d.alan, d.deger, k.tur FROM alan_degerleri d JOIN kayitlar k ON k.kod=d.kayit WHERE k.silindi IS NULL')) {
      const v = JSON.parse(r.deger as string);
      if (v && typeof v === 'object' && 'ifade' in v) {
        const alanAd = sablonlar.sablonOku(e, r.tur as string).alanlar.find((a) => a.kod === r.alan)?.ad ?? 'alan';
        tarihler.push({ yer: `${ad(r.kayit as string)} · ${alanAd}`, kayit: r.kayit as string, t: v });
      }
    }
    const goreliSayisi = tarihler.filter((x) => x.t.bicim === 'goreli').length;
    const degisen = tarihler.filter((x) => x.t.bicim !== 'goreli').map((x) => {
      const y = tarihCoz(x.t.ifade, yeni)!;
      // Paralel takvimde yazılmış tarihin okunuşu aynı kalsa da ana takvimdeki yeri kayabilir: o da yazılır.
      const oku = (t: EvrenTarihi, z: ZamanSeti) => (!t.akis && z.diger.some((p) => p.kod === t.takvim) ? `${tarihAciklamasi(t, z)} · ana takvimde ${eksenAraligi(t.eksen, z.ana)}` : tarihAciklamasi(t, z));
      const once = oku(x.t, eski), sonra = oku(y, yeni);
      // Yalnızca yıl düzeyindeki tarihlerin sırası değişmez; okunuşu aynı kalanlar listelenmez.
      return { yer: x.yer, kayit: x.kayit, ifade: x.t.ifade, once, sonra, cozulemez: !!x.t.eksen && !y.eksen, degisti: once !== sonra || !!x.t.eksen !== !!y.eksen };
    }).filter((x) => x.degisti);
    return { toplam: tarihler.length, degisen: degisen.slice(0, 300), degisenSayisi: degisen.length, cozulemezSayisi: degisen.filter((x) => x.cozulemez).length, goreliSayisi };
  }

  takvimYaz({ evren, takvim }: { evren: string; takvim: Takvim | null }) {
    const e = this.evren(evren);
    const yeni = takvim ? this.takvimHazirla(e, takvim) : null;
    this.yaz(evren, [{ tur: 'takvim_yaz', veri: { takvim: yeni } }]);
  }
  /** Paralel takvim ekle (kod boş), değiştir ya da kaldır (takvim boş). Kaldırılan takvimle yazılmış tarihler silinmez; ana takvimle okunur. */
  paralelTakvimYaz({ evren, kod = null, takvim }: { evren: string; kod?: string | null; takvim: ParalelTakvim | null }) {
    const e = this.evren(evren);
    if (!takvim) {
      if (!kod || !zamanSetiOku(e.db).diger.some((x) => x.kod === kod)) throw new Error('Takvim bulunamadı.');
      this.yaz(evren, [{ tur: 'takvim_yaz', veri: { kod, takvim: null, ad: zamanSetiOku(e.db).diger.find((x) => x.kod === kod)!.ad } }]);
      return { kod };
    }
    const p = this.paralelHazirla(e, kod, takvim);
    this.yaz(evren, [{ tur: 'takvim_yaz', veri: { kod: p.kod, takvim: p } }]);
    return { kod: p.kod };
  }
  /** Zaman akışı ekle (kod boş), değiştir ya da kaldır (akış boş). */
  akisYaz({ evren, kod = null, akis }: { evren: string; kod?: string | null; akis: Akis | null }) {
    const e = this.evren(evren);
    if (!akis) {
      const a = zamanSetiOku(e.db).akislar.find((x) => x.kod === kod);
      if (!kod || !a) throw new Error('Zaman akışı bulunamadı.');
      this.yaz(evren, [{ tur: 'akis_yaz', veri: { kod, akis: null, ad: a.ad } }]);
      return { kod };
    }
    const a = this.akisHazirla(e, kod, akis);
    this.yaz(evren, [{ tur: 'akis_yaz', veri: { kod: a.kod, akis: a } }]);
    return { kod: a.kod };
  }

  /** Zaman çizelgesi: tarihi olan kayıtlar. Sahne olayı, tarihi sahneden geliyorsa sahnenin yerinde gösterilmez (aynı şey). */
  zamanCizelgesi({ evren, bakis = null }: { evren: string; bakis?: string | null }) {
    const e = this.evren(evren);
    const bk = gorunum.bakisHazirla(e, bakis);
    const eserOf = new Map<string, string>();
    for (const r of e.db.selectObjects(`SELECT a.kod, CASE WHEN u.tur='bolum' THEN (SELECT ust FROM anlati WHERE kod=u.kod) ELSE a.ust END eser
        FROM anlati a JOIN kayitlar u ON u.kod=a.ust`)) if (r.eser) eserOf.set(r.kod as string, r.eser as string);
    return e.db.selectObjects(`SELECT kod, ad, tur, karar, tarih, gorunurluk FROM kayitlar WHERE tarih IS NOT NULL AND silindi IS NULL`)
      .filter((r) => bk.gorur(r.gorunurluk))
      .map((r) => ({ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string, karar: r.karar as string, tarih: this.tarihGoster(e, r.tarih)!, eser: eserOf.get(r.kod as string) ?? null,
        ...(bk.kisa && bk.inanc(r.gorunurluk) ? { inanc: true } : {}) }))
      .sort((a, b) => siraAnahtari(a.tarih) - siraAnahtari(b.tarih) || turkceKarsilastir(a.ad, b.ad));
  }

  // ---------- İnceleme görünümleri (§7) ----------
  soyAgaci({ evren, odak, an = null, bakis = null }: { evren: string; odak: string; an?: string | null; bakis?: string | null }) { return gorunum.soyAgaci(this.evren(evren), odak, an, bakis); }
  ag({ evren, ...s }: { evren: string } & gorunum.AgSecenekleri) { return gorunum.ag(this.evren(evren), s); }
  durumGecmisi({ evren, ozellik, an = null }: { evren: string; ozellik: string; an?: string | null }) { return gorunum.durumGecmisi(this.durumBaglami(evren), ozellik, an); }
  /** Bir kaydın her özelliği ayrı şerit olarak (§3.5). */
  kayitDurumGecmisi({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    const r = e.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [kod])!;
    const gruplar = new Map<string, DurumSatiri[]>();
    for (const d of durum.durumlar(this.durumBaglami(evren), kod)) {
      if (d.karar === 'vazgecildi') continue;
      const k = d.ozellik.toLocaleLowerCase('tr-TR');
      gruplar.set(k, [...(gruplar.get(k) ?? []), d]);
    }
    return [...gruplar.values()].sort((x, y) => turkceKarsilastir(x[0].ozellik, y[0].ozellik)).map((ds) => ({ ozellik: ds[0].ozellik, an: null, kayitlar: [{ kod, ad: r.ad as string, tur: r.tur as string, durumlar: ds }] }));
  }

  nedenSonucAgi({ evren, merkez = null, derinlik }: { evren: string; merkez?: string | null; derinlik?: number }) { return gorunum.nedenSonucAgi(this.evren(evren), merkez, derinlik); }
  etkiRaporu({ evren, kod }: { evren: string; kod: string }) { return gorunum.etkiRaporu(this.evren(evren), kod); }
  etkiIncelemeleri({ evren }: { evren: string }) { return gorunum.etkiIncelemeleri(this.evren(evren)); }
  /** Etki incelemesini kapatma (§9.3): düzeltildi, gerekçeyle kabul ya da ertele; null yeniden açar. */
  etkiKarari({ evren, anahtar, durum, gerekce = '' }: { evren: string; anahtar: string; durum: 'kabul' | 'ertelendi' | 'duzeltildi' | null; gerekce?: string }) {
    const e = this.evren(evren);
    const x = gorunum.etkiKarari(e, String(anahtar));
    if (durum !== null && !['kabul', 'ertelendi', 'duzeltildi'].includes(durum)) throw new Error('Geçersiz karar.');
    const g = String(gerekce ?? '').replace(/\s+/g, ' ').trim();
    if (durum === 'kabul' && !g) throw new Error('Kabul ederken kısa bir gerekçe yaz.');
    if (g.length > 500) throw new Error('Gerekçe çok uzun.');
    this.yaz(evren, [{ tur: 'inceleme_karari', veri: { anahtar, durum, gerekce: g, dayanak: x.dayanak, baslik: x.baslik } }], [x.kayit]);
  }
  kurguHatlari({ evren }: { evren: string }) { return gorunum.kurguHatlari(this.evren(evren)); }
  bolumMatrisi({ evren, eser, turler = null }: { evren: string; eser: string; turler?: string[] | null }) { return gorunum.bolumMatrisi(this.evren(evren), eser, turler); }

  // ---------- Harita: yükle, işaretle, bağla (§8.1) ----------
  private haritaBaglami(evren: string): harita.HaritaBaglami {
    return { e: this.evren(evren), yaz: (g, k) => { this.yaz(evren, g, k); } };
  }
  haritalar({ evren, silinmis = false }: { evren: string; silinmis?: boolean }) { return harita.haritalar(this.evren(evren), !!silinmis); }
  harita({ evren, kod, bakis = null }: { evren: string; kod: string; bakis?: string | null }) { return harita.harita(this.evren(evren), kod, bakis); }
  async haritaYukle({ evren, ad, yer = null, dosyaAdi, tur, veri }: { evren: string; ad: string; yer?: string | null; dosyaAdi: string; tur: string; veri: Uint8Array }) {
    const e = this.evren(evren);
    if (yer) this.kayitVarMi(e, yer);
    const g = await this.gorselSakla(e, dosyaAdi, tur, veri);
    return harita.haritaOlustur(this.haritaBaglami(evren), { ad, yer, gorsel: g.ad }, g.girdiler);
  }
  /** Bir kaydın görseli üzerinde işaretleme (kat planı, eşya, karakter görseli): aynı bileşen, aynı harita uzayı. */
  gorseldenHarita({ evren, kayit, gorsel }: { evren: string; kayit: string; gorsel: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kayit);
    const liste = JSON.parse(e.db.selectValue('SELECT gorseller FROM kayitlar WHERE kod=?', [kayit]) as string) as string[];
    if (!liste.includes(gorsel)) throw new Error('Bu görsel bu kayıtta yok.');
    const var_ = harita.gorselHaritasi(e, kayit, gorsel);
    if (var_) return { kod: var_ };
    const ad = e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [kayit]) as string;
    return harita.haritaOlustur(this.haritaBaglami(evren), { ad: `${ad} görseli`, yer: kayit, gorsel });
  }
  haritaDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: 'ad' | 'yer'; deger: unknown }) { harita.haritaDegistir(this.haritaBaglami(evren), kod, alan, deger); }
  haritaSil({ evren, kod, geriYukle = false }: { evren: string; kod: string; geriYukle?: boolean }) { harita.haritaSil(this.haritaBaglami(evren), kod, geriYukle); }
  isaretKoy({ evren, harita: h, kayit, konum }: { evren: string; harita: string; kayit: string; konum: IsaretGirdisi }) { return harita.isaretKoy(this.haritaBaglami(evren), h, kayit, konum); }
  isaretDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: 'konum' | 'kayit'; deger: unknown }) { harita.isaretDegistir(this.haritaBaglami(evren), kod, alan, deger); }
  isaretSil({ evren, kod, geriYukle = false }: { evren: string; kod: string; geriYukle?: boolean }) { harita.isaretSil(this.haritaBaglami(evren), kod, geriYukle); }
  async katmanEkle({ evren, harita: h, ad, dosyaAdi, tur, veri }: { evren: string; harita: string; ad: string; dosyaAdi: string; tur: string; veri: Uint8Array }) {
    const g = await this.gorselSakla(this.evren(evren), dosyaAdi, tur, veri);
    return harita.katmanEkle(this.haritaBaglami(evren), h, { ad: ad || dosyaAdi.replace(/\.[^.]+$/, ''), gorsel: g.ad }, g.girdiler);
  }
  async katmanGorseli({ evren, harita: h, katman, dosyaAdi, tur, veri }: { evren: string; harita: string; katman: string; dosyaAdi: string; tur: string; veri: Uint8Array }) {
    const g = await this.gorselSakla(this.evren(evren), dosyaAdi, tur, veri);
    harita.katmanGorseli(this.haritaBaglami(evren), h, katman, g.ad, g.girdiler);
  }
  katmanDegistir({ evren, harita: h, katman, alan, deger }: { evren: string; harita: string; katman: string; alan: 'ad' | 'silindi'; deger: unknown }) {
    harita.katmanDegistir(this.haritaBaglami(evren), h, katman, alan, deger);
  }
  katmanHizala({ evren, harita: h, katman, noktalar, donusum = null }: { evren: string; harita: string; katman: string; noktalar: KontrolCifti[] | null; donusum?: Donusum | null }) {
    harita.katmanHizala(this.haritaBaglami(evren), h, katman, noktalar, donusum);
  }
  kayitHaritalari({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    return harita.kayitHaritalari(e, kod);
  }

  // ---------- Editoryal birleştirme (§9.5) ----------
  private birlesmeBaglami(evren: string): birlesme.BirlesmeBaglami {
    return { e: this.evren(evren), yaz: (g, k) => { this.yaz(evren, g, k); } };
  }
  birlesmeOnizle({ evren, kaynak, hedef }: { evren: string; kaynak: string; hedef: string }) { return birlesme.onizle(this.evren(evren), kaynak, hedef); }
  birlestir({ evren, kaynak, hedef, secimler = {} }: { evren: string; kaynak: string; hedef: string; secimler?: Record<string, 'kaynak' | 'hedef'> }) {
    birlesme.birlestir(this.birlesmeBaglami(evren), kaynak, hedef, secimler && typeof secimler === 'object' ? secimler : {});
  }
  birlesmeyiGeriAl({ evren, kod }: { evren: string; kod: string }) { birlesme.geriAl(this.birlesmeBaglami(evren), kod); }
  /** Ters yönde birleştirme incelendi: önce uygulanan birleştirme kalır. */
  tersBirlesmeCoz({ evren, islem }: { evren: string; islem: string }) {
    const e = this.evren(evren);
    if (e.db.selectValue('SELECT 1 FROM ters_birlesmeler WHERE islem=?', [islem]) === undefined) throw new Error('Bu çatışma artık yok.');
    this.yaz(evren, [{ tur: 'catisma_coz', veri: { tur: 'ters_birlesme', islem } }]);
  }

  // ---------- Sağlık taraması (§9.4) ve inceleme kuyruğu (§9.3) ----------
  saglikTaramasi({ evren, bilgi = false }: { evren: string; bilgi?: boolean }) { return saglik.tarama(this.evren(evren), !!bilgi); }
  incelemeKarari({ evren, anahtar, durum, gerekce = '', istisna = null }: { evren: string; anahtar: string; durum: 'kabul' | 'ertelendi' | null; gerekce?: string; istisna?: 'tercih' | 'kapsam' | null }) {
    if (durum !== null && durum !== 'kabul' && durum !== 'ertelendi') throw new Error('Geçersiz karar.');
    if (String(anahtar).startsWith('denetim:')) {
      denetim.kararVer({ e: this.evren(evren), yaz: (g, k) => { this.yaz(evren, g, k); } }, String(anahtar), durum, gerekce, istisna);
      return;
    }
    saglik.kararVer({ e: this.evren(evren), yaz: (g, k) => { this.yaz(evren, g, k); } }, String(anahtar), durum, gerekce);
  }

  /** Kural tabanlı tutarlılık denetimleri (§9.1). */
  denetimler({ evren }: { evren: string }) { return denetim.denetimler(this.evren(evren)); }

  // ---------- Görseller (§10.12) ----------
  /** Görseli içerik adıyla saklar; medya tablosunda yoksa eklenecek işlemi verir (TK5). */
  private async gorselSakla(e: EvrenVt, dosyaAdi: string, tur: string, veri: Uint8Array) {
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
    return { ad, girdiler };
  }

  async gorselEkle({ evren, kod, dosyaAdi, tur, veri }: { evren: string; kod: string; dosyaAdi: string; tur: string; veri: Uint8Array }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    const { ad, girdiler } = await this.gorselSakla(e, dosyaAdi, tur, veri);
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
    const p = await this.paketYaz(evren, true);
    this.kurulum.ayarYaz(`son_yedek:${evren}`, String(p.zaman));
    return { dosyaAdi: p.dosyaAdi, veri: p.veri };
  }

  /**
   * Taşınabilir paket. Drive'daki dönemsel yedeklerde görseller pakete girmez: yedek klasöründe her görsel
   * bir kez saklanır (§10.10); paket hangi görselleri kullandığını yazar.
   */
  async paketYaz(evren: string, medyaDahil: boolean) {
    const e = this.evren(evren);
    const bilgi = this.evrenBilgisi({ evren });
    const islemler = e.islemler();
    const satirlar = islemler.map((i) => JSON.stringify({ ...i, ikili: i.ikili ? b64(i.ikili) : null }));
    const medyaAdlari = (e.db.selectObjects('SELECT ad FROM medya ORDER BY olusturma') as { ad: string }[]).map((r) => r.ad);
    const dosyalar: ZipDosyasi[] = [];
    let eksik = 0;
    for (const ad of medyaDahil ? medyaAdlari : []) {
      const veri = await this.medya?.oku(ad);
      if (!veri) { eksik++; continue; }
      dosyalar.push({ ad: `medya/${ad}`, veri, sikistirma: false });
      const k = await this.medya?.oku(onizlemeAdi(ad));
      if (k) dosyalar.push({ ad: `medya/${onizlemeAdi(ad)}`, veri: k, sikistirma: false });
    }
    const simdi = Date.now();
    const paket = { bicim: 'dunya-atlasi-paket', paketSurumu: 1, veriBicimi: VERI_BICIMI, evren: { kod: evren, ad: bilgi.ad },
      olusturma: simdi, kurulum: { kod: this.kurulum.kod, ad: this.kurulum.ad }, islemSayisi: islemler.length, kayitSayisi: bilgi.kayitSayisi,
      medya: medyaAdlari.length, eksikMedya: eksik, medyaAyri: !medyaDahil, medyaAdlari };
    const aciklama = [
      'Dünya Atlası evren paketi',
      '',
      `Evren: ${bilgi.ad}`,
      `Alındığı an: ${new Date(simdi).toISOString()}`,
      `Kayıt: ${bilgi.kayitSayisi} (çöp kutusunda ${bilgi.copSayisi})`,
      `Değişiklik: ${islemler.length}`,
      medyaDahil ? `Görsel: ${medyaAdlari.length - eksik}${eksik ? ` (${eksik} görsel bu cihazda olmadığı için pakette yok)` : ''}`
        : `Görsel: ${medyaAdlari.length} (pakette değil; yedek klasöründeki "medya" klasöründe, her görsel bir kez)`,
      '',
      'İçindekiler:',
      '- paket.json: paketin özeti ve veri biçimi sürümü',
      '- islemler.jsonl: evrende yapılmış bütün değişiklikler, yapıldıkları sırayla (her satır bir değişiklik).',
      '  Kayıtlar, metinler, bağlantılar, ilişkiler, tarihler ve sürüm geçmişi bunlardan yeniden kurulur.',
      medyaDahil ? '- medya/: görseller, içerikleriyle adlandırılmış olarak (her görsel bir kez)' : '- görseller: yedek klasöründeki "medya" klasöründe',
      '',
      medyaDahil ? 'Geri yüklemek için: Dünya Atlası > Evrenler > Yedekten geri yükle.' : 'Geri yüklemek için: Dünya Atlası > evren > Yedek > Drive\'daki yedekler.',
    ].join('\n');
    const zip = await zipYaz([
      { ad: 'aciklama.txt', veri: new TextEncoder().encode(aciklama) },
      { ad: 'paket.json', veri: new TextEncoder().encode(JSON.stringify(paket, null, 2)) },
      { ad: 'islemler.jsonl', veri: new TextEncoder().encode(satirlar.join('\n')) },
      ...dosyalar,
    ]);
    const gun = new Date(simdi).toISOString().slice(0, 10);
    // Dosya adı yalnız İngiliz harfleriyle: bazı tarayıcılar Türkçe harfli indirme adını yok sayıyor.
    const dosyaAdi = `${katla(bilgi.ad).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evren'}-yedek-${gun}.zip`;
    return { dosyaAdi, veri: zip, zaman: simdi, medyaAdlari, ad: bilgi.ad };
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
