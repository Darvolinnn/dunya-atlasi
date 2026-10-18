// Arayüz ile veritabanı çalışanı arasındaki istekler. Arayüz veritabanına yalnızca bunlarla erişir.
import type { Islem } from '../alan/islem';
import type { EvrenTarihi, Karsilastirma } from '../alan/tarih';
import type { DurumKipi, Gecerlilik } from '../alan/durum';

export interface KurulumBilgisi { kod: string; ad: string; sqlite: string }
export interface EvrenOzeti { kod: string; ad: string; olusturma: number; sonAcilis: number | null }
export interface EvrenBilgisi extends EvrenOzeti { islemSayisi: number; kayitSayisi: number; copSayisi: number; catismaSayisi: number }
export type GunlukSatiri = Omit<Islem, 'ikili'> & { ikiliBoyut: number };

export interface KayitOzeti {
  kod: string; tur: string; ad: string; ozet: string; karar: string;
  lakaplar: string[]; duzenleme: number; silindi: number | null;
  /** Evren tarihi; sahne olayında sahneden gelir. */
  tarih?: EvrenTarihi | null;
  /** İlk görselin içerik adı. */
  gorsel?: string | null;
}
export interface Kayit extends KayitOzeti {
  okunus: string; etiketler: string[]; oncekiAdlar: string[]; olusturma: number;
  tarih: EvrenTarihi | null;
  /** Alan düzeyinde karar durumu; yazılmayan alan kesindir (K13). */
  alanKararlari: Record<string, string>;
  gorseller: string[];
  /** Bu kayıt bir sahnenin sahne olayıysa o sahnenin kodu. */
  sahneOlayi: string | null;
  sahneTarihi: EvrenTarihi | null;
}
export interface IliskiSatiri {
  kod: string; tur: string; ben: 'a' | 'b'; etiket: string; grup: string;
  karsi: { kod: string; ad: string; tur: string };
  rol: string | null; rolAdi: string | null;
  baslangic: EvrenTarihi | null; bitis: EvrenTarihi | null; aciklama: string; karar: string;
  uyari: string | null;
}
export interface DegisimSatiri {
  kod: string; metin: string; karar: string; olusturma: number;
  olay: { kod: string; ad: string }; sahne: { kod: string; ad: string } | null;
  konu: { kod: string; ad: string; tur: string } | null;
  tarih: EvrenTarihi | null;
}
export interface SahneOlayBilgisi { kod: string; ad: string; sahneOlayi: boolean; tarih: EvrenTarihi | null; degisimler: DegisimSatiri[] }
export type GorselSonucu =
  | { durum: 'var'; veri: Uint8Array; tur: string; en: number; boy: number; dosyaAdi: string }
  | { durum: 'indirilmemis' } | { durum: 'yok' };
/** Automerge zengin metin parçaları (blok işaretleri ve metin). */
export type Spans = unknown[];
export type Basliklar = string[];
export interface AramaSonucu {
  kod: string; tur: string; ad: string; ozet: string; karar: string;
  /** Hangi addan ya da yerden bulunduğu. kok: çekimli biçimden köke inilerek. */
  nereden: { tur: 'ad' | 'kok' | 'lakap' | 'onceki' | 'okunus' | 'ozet' | 'metin'; metin: string };
  /** Ad ya da kökü tam eşleşti mi (bağlantı seçiminde güçlü öneri). */
  tam: boolean;
  /** Metinde bulunduysa çevresi. */
  parca?: string;
}
export interface IceAktarimRaporu {
  kayitSayisi: number; baglantiSayisi: number;
  /** Bağlantı verilmiş ama dosyası olmayan adlar: fikir olarak oluşturulur. */
  bahsedilenler: string[];
  tekrarAdlar: string[]; taninmayanTurler: string[]; digerAlanlar: string[];
  /** Düz metne dönen biçimler, insan diliyle. */
  kayiplar: string[];
  eksikGorseller: string[]; gorselSayisi: number; okunamayan: string[];
  turler: [string, number][];
}
export interface YedekBilgisi {
  evrenKod: string; evrenAdi: string; tarih: number; islemSayisi: number; kayitSayisi: number;
  medyaSayisi: number; eksikMedya: number;
  /** Bu evren bu cihazda zaten var mı (varsa yedek ayrı bir evren olarak açılır). */
  mevcut: { kod: string; ad: string } | null;
  veriBicimi: number;
}
/** İnceleme bekleyen çatışma (§10.3, §10.6). Kurulum adları kullanıcıya gösterilecek biçimdedir. */
export type Catisma =
  | { tur: 'alan'; nesne: string; alan: string; nesneTuru: 'kayit' | 'iliski' | 'evren' | 'durum'; kayit: string | null; baslik: string;
      /** yazi: değerin okunur hâli (yer, kayıt adı gibi); yoksa değer doğrudan gösterilir. */
      degerler: { islem: string; deger: unknown; yazi?: string; kurulum: string; zaman: number }[] }
  | { tur: 'silme'; kayit: string; baslik: string; duzenlemeSayisi: number; zaman: number; kurulumlar: string[] }
  | { tur: 'metin'; kayit: string; alan: string; baslik: string; temel: Basliklar;
      a: { basliklar: Basliklar; kurulum: string; zaman: number }; b: { basliklar: Basliklar; kurulum: string; zaman: number } };
export interface EsitlemeDurumu {
  bagli: boolean; calisiyor: boolean; hata: { mesaj: string; izin: boolean; zaman: number } | null;
  kurulum: { kod: string; ad: string };
  evrenler: EvrenEsitlemeDurumu[];
}
export interface DriveYedegi { id: string; gun: string; zaman: number; ad: string; kurulum: string }
export interface DonemselYedekDurumu {
  son: { zaman: number; gun: string; dogrulandi: boolean } | null; gunSayisi: number; aySayisi: number; hata: string | null;
  bagli: boolean; esitlenir: boolean;
}
export interface EvrenEsitlemeDurumu {
  kod: string; ad: string; esitlenir: boolean; sonEsitleme: number | null; yalnizBuCihazda: number; bekleyen: number; guncellemeGerekli: boolean;
  cihazlar: { kod: string; ad: string; sonGorulme: number; kullanimDisi: boolean; bekleyen: number; buCihaz: boolean }[];
}
/** Kaldığın yer (§5.9): cihazlar arasında eşitlenir; panel yerleşimi gibi cihaza özel şeyler burada yok. */
export interface KaldigiYer { kayit: string | null; konum: number | null; yanPanel: string[]; not: string; zaman: number }
export interface KaldigiYerBilgisi extends KaldigiYer {
  /** Başka bir cihazda bırakıldıysa o cihazın adı. */
  cihaz: string | null;
  kayitAdi: string | null; kayitTuru: string | null;
  yanPanelKayitlari: { kod: string; ad: string; tur: string }[];
}
export interface BaglananKayit { kod: string; ad: string; tur: string; ifadeler: string[] }
export interface AdDuzeltmesi { kaynak: string; kaynakAd: string; sira: number; eski: string; yeni: string }
/** Anlatı yapısı (§3.3). */
export interface YapiSahnesi { kod: string; ad: string; tur: string; karar: string; tarih: EvrenTarihi | null; sira: number }
export interface YapiBolumu { kod: string; ad: string; karar: string; sira: number; sahneler: YapiSahnesi[] }
export interface EserYapisi { eser: { kod: string; ad: string }; bolumler: YapiBolumu[]; dogrudan: YapiSahnesi[] }
export interface AnlatiYeri {
  eser: { kod: string; ad: string } | null;
  bolum: { kod: string; ad: string; sira: number } | null;
  /** Sahnenin eserin okuma sırasındaki yeri (1'den). */
  sira: number | null;
  onceki: { kod: string; ad: string } | null;
  sonraki: { kod: string; ad: string } | null;
}
/** Taşımadan sonra bir kaydın eserde ilk anıldığı sahne değişti. */
export interface AnlatiEtkisi { kayit: { kod: string; ad: string }; onceki: { kod: string; ad: string } | null; yeni: { kod: string; ad: string } | null }

/** Durum geçmişi (§3.5). */
export interface SinirBilgisi { tarih: EvrenTarihi | null; olay: { kod: string; ad: string } | null }
export interface SinirGirdisi { ifade?: string; olay?: string | null }
export interface DurumSatiri {
  kod: string; konu: string; ozellik: string; deger: string;
  hedef: { kod: string; ad: string; tur: string } | null;
  kip: DurumKipi; karar: string;
  baslangic: SinirBilgisi | null; bitis: SinirBilgisi | null;
  /** "Sonraki değişikliğe kadar" kaydında bir sonraki kaydın başlangıcı. */
  sonraki: SinirBilgisi | null;
  /** Bakılan andaki geçerliliği (bir an verildiyse). */
  gecerli?: Gecerlilik;
  uyari: string | null;
}
export interface DurumGirdisi {
  ozellik: string; deger?: string; hedef?: string | null; kip?: string; karar?: string;
  baslangic?: SinirGirdisi | null; bitis?: SinirGirdisi | null;
}
export type DurumAlani = 'ozellik' | 'deger' | 'hedef' | 'kip' | 'karar' | 'baslangic' | 'bitis';

/** Sahne bağlam paneli (§5.5): sahnenin evren tarihindeki hâl, salt okunur. */
export type SahneAlani = 'sahne_yeri' | 'bakis' | 'anlatici' | 'odak';
export interface KisaKayit { kod: string; ad: string; tur: string }
export interface SahneKatilimcisi extends KisaKayit {
  roller: string[];
  durumlar: DurumSatiri[];
  iliskiler: (IliskiSatiri & { gecerli: Gecerlilik })[];
  /** Sahneden önce (ya da belki önce) geçirdiği değişimler. */
  degisimler: (DegisimSatiri & { sira: Karsilastirma })[];
}
export interface SahneBaglami {
  tarih: EvrenTarihi | null;
  yer: (KisaKayit & { durumlar: DurumSatiri[] }) | null;
  bakis: KisaKayit | null; anlatici: KisaKayit | null; odak: KisaKayit | null;
  katilimcilar: SahneKatilimcisi[];
}

export type DegisebilirAlan = 'ad' | 'tur' | 'ozet' | 'okunus' | 'karar';

export interface Istekler {
  baslat(): KurulumBilgisi;
  evrenler(): EvrenOzeti[];
  evrenOlustur(a: { ad: string }): { kod: string };
  evrenAdlandir(a: { evren: string; ad: string }): void;
  evrenBilgisi(a: { evren: string }): EvrenBilgisi;
  islemGunlugu(a: { evren: string; sinir: number }): GunlukSatiri[];

  kayitlar(a: { evren: string; cop?: boolean }): KayitOzeti[];
  kayit(a: { evren: string; kod: string }): Kayit;
  kayitOlustur(a: { evren: string; ad: string; tur: string; karar?: string; ozet?: string }): { kod: string };
  kayitDegistir(a: { evren: string; kod: string; alan: DegisebilirAlan; deger: string }): void;
  kayitListe(a: { evren: string; kod: string; liste: 'lakap' | 'etiket'; ekle?: string; cikar?: string }): void;
  kayitSil(a: { evren: string; kod: string }): void;
  kayitGeriYukle(a: { evren: string; kod: string }): void;
  kayitGecmisi(a: { evren: string; kod: string }): GunlukSatiri[];

  metinAc(a: { evren: string; kayit: string; alan: string }): { spans: Spans; basliklar: Basliklar };
  metinKaydet(a: { evren: string; kayit: string; alan: string; spans: Spans; temel: Basliklar }): { basliklar: Basliklar; degisti: boolean; birlesti: boolean; spans?: Spans };
  metinSurumu(a: { evren: string; kayit: string; alan: string; basliklar: Basliklar }): { spans: Spans };
  kayitTarih(a: { evren: string; kod: string; ifade: string }): { tarih: EvrenTarihi | null };
  alanKarari(a: { evren: string; kod: string; alan: string; karar: string }): void;
  hizliNot(a: { evren: string; metin: string }): { kod: string; ad: string };
  nottanKayit(a: { evren: string; not: string; ad: string; tur: string }): { kod: string };

  iliskiler(a: { evren: string; kod: string }): IliskiSatiri[];
  iliskiEkle(a: { evren: string; tur: string; a: string; b: string; rol?: string | null; baslangic?: string; bitis?: string; aciklama?: string; karar?: string }): { kod: string };
  iliskiDegistir(a: { evren: string; kod: string; alan: 'baslangic' | 'bitis' | 'aciklama' | 'karar' | 'rol'; deger: string }): void;
  iliskiSil(a: { evren: string; kod: string }): void;
  iliskiGeriYukle(a: { evren: string; kod: string }): void;

  sahneOlaylari(a: { evren: string; sahne: string }): SahneOlayBilgisi[];
  degisimEkle(a: { evren: string; sahne: string; olay?: string | null; konu?: string | null; metin: string; karar?: string }): { kod: string; olay: string };
  degisimSil(a: { evren: string; kod: string }): void;
  kayitDegisimleri(a: { evren: string; kod: string }): DegisimSatiri[];

  gorselEkle(a: { evren: string; kod: string; dosyaAdi: string; tur: string; veri: Uint8Array }): Promise<{ ad: string; yeni: boolean }>;
  kayitGorselCikar(a: { evren: string; kod: string; ad: string }): void;
  gorsel(a: { evren: string; ad: string; onizleme?: boolean }): Promise<GorselSonucu>;

  iceAktarIncele(a: { dosyalar: { yol: string; metin?: string; veri?: Uint8Array; tur?: string }[] }): IceAktarimRaporu;
  iceAktar(a: { dosyalar: { yol: string; metin?: string; veri?: Uint8Array; tur?: string }[]; evrenAdi: string }): Promise<{ kod: string; rapor: IceAktarimRaporu; gorselHatalari: string[] }>;
  yedekAl(a: { evren: string }): Promise<{ dosyaAdi: string; veri: Uint8Array }>;
  yedekIncele(a: { veri: Uint8Array }): Promise<YedekBilgisi>;
  yedektenYukle(a: { veri: Uint8Array }): Promise<{ kod: string; ayri: boolean }>;
  evrenYerineKoy(a: { kopya: string; asil: string }): void;
  sonYedek(a: { evren: string }): number | null;

  catismalar(a: { evren: string; kod?: string }): Catisma[];
  catismaSayisi(a: { evren: string }): number;
  alanCatismasiCoz(a: { evren: string; nesne: string; alan: string; islem: string }): void;
  silmeCatismasiCoz(a: { evren: string; kayit: string; geriYukle: boolean }): void;
  metinCatismasiCoz(a: { evren: string; kayit: string; alan: string }): void;
  gorulenler(a: { evren: string }): Record<string, number>;
  islemleriVer(a: { evren: string; gorulen: Record<string, number>; kurulum?: string }): Islem[];
  islemleriAl(a: { evren: string; islemler: Islem[] }): { alinan: number; bekleyen: number };
  evreniDisaridanKur(a: { kod: string; islemler: Islem[] }): { kod: string; yeni: boolean };

  /** Google izni geldi: Drive bağlanır. Hesabın e-postası döner (yalnızca bu cihazda saklanır). */
  jetonVer(a: { jeton: string; bitis: number }): Promise<{ eposta: string; ad: string }>;
  /** Drive bağlantısını keser; izni geri almak için anahtarı döner. */
  baglantiyiKes(): { jeton: string | null };
  donemselYedekDurumu(a: { evren: string }): DonemselYedekDurumu;
  driveYedekleri(a: { evren: string }): Promise<DriveYedegi[]>;
  drivedaYedekAl(a: { evren: string }): Promise<DonemselYedekDurumu>;
  drivedanGeriYukle(a: { id: string }): Promise<{ kod: string; ayri: boolean }>;
  yedekAyarlari(a: { gunSayisi: number; aySayisi: number }): void;
  esitle(): Promise<EsitlemeDurumu>;
  esitlemeDurumu(): EsitlemeDurumu;
  uzakEvrenler(): Promise<{ kod: string; ad: string; sonGorulme: number }[]>;
  evreniIndir(a: { kod: string }): Promise<{ kod: string }>;
  evrenEsitlemeAyari(a: { evren: string; esitlenir: boolean }): void;
  kurulumAdiDegistir(a: { ad: string }): void;
  kurulumKullanimDisi(a: { kod: string; disi: boolean }): void;

  kaldigiYer(a: { evren: string }): KaldigiYerBilgisi | null;
  kaldigiYerYaz(a: { evren: string; yer: Omit<KaldigiYer, 'zaman'> }): void;
  eserYapisi(a: { evren: string; eser: string }): EserYapisi;
  anlatiYeri(a: { evren: string; kod: string }): AnlatiYeri;
  yerlesmemisler(a: { evren: string }): YapiSahnesi[];
  eserler(a: { evren: string }): KisaKayit[];
  anlatiYerlestir(a: { evren: string; kod: string; ust: string | null; sira?: number | null }): { etki: AnlatiEtkisi[] };
  anlatiOlustur(a: { evren: string; ust: string; ad: string; tur: 'bolum' | 'sahne' }): { kod: string };
  durumlar(a: { evren: string; kod: string; an?: string | null }): { durumlar: DurumSatiri[]; an: EvrenTarihi | null };
  durumEkle(a: { evren: string; kod: string; durum: DurumGirdisi }): { kod: string };
  durumDegistir(a: { evren: string; kod: string; alan: DurumAlani; deger: unknown }): void;
  durumSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  ozellikAdlari(a: { evren: string }): string[];
  sahneAlaniAyarla(a: { evren: string; sahne: string; alan: SahneAlani; kayit: string | null }): void;
  sahneBaglami(a: { evren: string; sahne: string }): SahneBaglami;
  ara(a: { evren: string; metin: string; sinir?: number; metinde?: boolean }): AramaSonucu[];
  baglananlar(a: { evren: string; kod: string }): BaglananKayit[];
  bahsedilenler(a: { evren: string }): (KayitOzeti & { anilma: number })[];
  adDuzeltmeOnizle(a: { evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string }): AdDuzeltmesi[];
  adDuzeltmeUygula(a: { evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string; secilenler: string[] }): { degisen: number };
  metinGeriYukle(a: { evren: string; kayit: string; alan: string; basliklar: Basliklar }): { basliklar: Basliklar; degisti: boolean };
}

export type IstekAdi = keyof Istekler;
export type IstekArg<K extends IstekAdi> = Parameters<Istekler[K]>[0];
export type IstekSonuc<K extends IstekAdi> = Awaited<ReturnType<Istekler[K]>>;

/** Çalışandan arayüze: bir evrende işlem yazıldı (ekranlar yenilensin). */
export interface DegisiklikBildirimi { degisti: { evren: string; turler: string[]; kayitlar: string[]; uzaktan?: boolean } }
