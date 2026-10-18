// Arayüz ile veritabanı çalışanı arasındaki istekler. Arayüz veritabanına yalnızca bunlarla erişir.
import type { Islem } from '../alan/islem';
import type { Akis, EvrenTarihi, Fark, Karsilastirma, ParalelTakvim, Takvim, ZamanSeti } from '../alan/tarih';
import type { DurumKipi, Gecerlilik } from '../alan/durum';
import type { Sablon, Soru, SoruDurumu } from '../alan/sablon';
import type { BilgiEtiketi, BilgiKaynagi, Inanc } from '../alan/bilgi';
import type { Gorunurluk } from '../alan/gorunurluk';

export interface KurulumBilgisi { kod: string; ad: string; sqlite: string }
export interface EvrenOzeti { kod: string; ad: string; olusturma: number; sonAcilis: number | null }
export interface EvrenBilgisi extends EvrenOzeti { islemSayisi: number; kayitSayisi: number; copSayisi: number; catismaSayisi: number; sorunSayisi: number }
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
  /** Editoryal birleştirme (§9.5): bu kayıt bir başkasına yönlendiriyorsa o kayıt; bu kayda birleştirilmiş kayıtlar. */
  birlesti: { kod: string; ad: string } | null;
  birlesenler: { kod: string; ad: string }[];
  /** Bilgi katmanı (§3.6); evrenin sade gerçeğiyse null. */
  gorunurluk: GorunurlukBilgisi | null;
}
/** Bilgi katmanının okunur hâli: kimin inancı ya da gizliyse kimlerin bildiği. */
export interface GorunurlukBilgisi { katman: KisaKayit | null; gizli: boolean; bilenler: KisaKayit[] }
export interface IliskiSatiri {
  kod: string; tur: string; ben: 'a' | 'b'; etiket: string; grup: string;
  karsi: { kod: string; ad: string; tur: string };
  rol: string | null; rolAdi: string | null;
  baslangic: EvrenTarihi | null; bitis: EvrenTarihi | null; aciklama: string; karar: string;
  uyari: string | null;
  gorunurluk: GorunurlukBilgisi | null;
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
      /** Alanın kullanıcıya gösterilecek adı (şablon alanı, soru); yoksa arayüz alan kodundan bulur. */
      alanEtiketi?: string;
      /** yazi: değerin okunur hâli (yer, kayıt adı gibi); yoksa değer doğrudan gösterilir. */
      degerler: { islem: string; deger: unknown; yazi?: string; kurulum: string; zaman: number }[] }
  | { tur: 'silme'; kayit: string; baslik: string; duzenlemeSayisi: number; zaman: number; kurulumlar: string[]; birlesti?: { kod: string; ad: string } }
  | { tur: 'ters_birlesme'; islem: string; kayit: string; baslik: string; diger: { kod: string; ad: string }; zaman: number }
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
/** Sınır: tarih ya da bir olay (isteğe bağlı farkla: "Kuşatma'dan 3 gün sonra"). */
export interface SinirBilgisi { tarih: EvrenTarihi | null; olay: { kod: string; ad: string } | null; fark?: Fark | null }
export interface SinirGirdisi { ifade?: string; olay?: string | null; fark?: string | null }
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
  /** Doğum tarihi biliniyorsa sahnenin tarihindeki yaşı. */
  yas: string | null;
}
export interface SahneBaglami {
  tarih: EvrenTarihi | null;
  yer: (KisaKayit & { durumlar: DurumSatiri[] }) | null;
  bakis: KisaKayit | null; anlatici: KisaKayit | null; odak: KisaKayit | null;
  katilimcilar: SahneKatilimcisi[];
  /** Bakış açısı karakterinin sahnenin tarihinde bildikleri (§5.5). */
  bakisBilgileri: AnBilgisi[];
}

/** İddia ve bilgi durumu (§3.6). */
export interface IddiaSecenegi { kod: string; metin: string }
export interface IddiaOzeti { kod: string; soru: string; konu: KisaKayit; secenekler: IddiaSecenegi[]; gercek: string | null }
export interface BilgiSatiri {
  kod: string; iddia: IddiaOzeti;
  bilen: KisaKayit;
  /** Bilen bir eserse okurdur; zamanı okuma sırasıdır. */
  okur: boolean;
  secenek: IddiaSecenegi | null; inanc: Inanc; etiket: BilgiEtiketi;
  /** null: saklamıyor · boş: herkesten saklıyor · dolu: bunlardan saklıyor. */
  saklama: KisaKayit[] | null;
  kaynak: BilgiKaynagi | null; kaynakKayit: KisaKayit | null;
  sahne: KisaKayit | null;
  /** Okur için sahnenin eserdeki okuma sırası. */
  okumaSirasi: number | null;
  baslangic: SinirBilgisi | null; bitis: SinirBilgisi | null;
  aciklama: string; karar: string; uyari: string | null;
}
export interface IddiaSatiri extends IddiaOzeti { karar: string; bilgiler: BilgiSatiri[] }
export interface BilgiGirdisi {
  iddia: string; bilen: string; inanc: Inanc; secenek?: string | null;
  saklama?: string[] | null; kaynak?: BilgiKaynagi | null; kaynakKayit?: string | null; sahne?: string | null;
  baslangic?: SinirGirdisi | null; bitis?: SinirGirdisi | null; aciklama?: string; karar?: string;
}
export type BilgiAlani = 'secenek' | 'inanc' | 'saklama' | 'kaynak' | 'kaynakKayit' | 'sahne' | 'baslangic' | 'bitis' | 'aciklama' | 'karar';
/** Bir bilenin bir andaki bilgisi: tek bir geçerli kayıt ya da (gizli seçim olmadan) birden çok olası kayıt. */
export interface AnBilgisi { iddia: IddiaOzeti; durum: 'tek' | 'belirsiz'; satirlar: (BilgiSatiri & { gecerli: Gecerlilik })[] }

/** Şablon ve soru kütüphanesi (§3.1, §6). */
export interface SablonBilgisi { sablon: Sablon; varsayilan: boolean; varsayilanSablon: Sablon; /** Alan kodu → değeri dolu kayıt sayısı. */ kullanim: Record<string, number> }
export interface SoruCevabi { durum: SoruDurumu; cevap: string; kayitla: KisaKayit | null }
export interface SoruSatiri extends Soru {
  /** Soru bu kayda sonradan eklenen bir setten geliyorsa setin kodu. */
  set: string | null;
  cevap: SoruCevabi | null;
  /** Şablondan çıkarılmış ama cevabı olan soru. */
  eski: boolean;
}
export interface KayitSablonu {
  tur: string; sablon: Sablon; degerler: Record<string, unknown>;
  /** Şablonda olmayan (tür değişmiş ya da alan kaldırılmış) değerler; silinmez. */
  eskiler: { kod: string; deger: unknown }[];
  setler: string[]; sorular: SoruSatiri[];
}
export type EvrenSorulari = { kod: string; ad: string; sorular: SoruSatiri[] }[];
export interface MeseleSatiri { kod: string; ad: string; karar: string; duzenleme: number; durum: string; onemli: boolean; bagli: KisaKayit[] }
export interface GerekceSatiri { kod: string; ad: string; karar: string; duzenleme: number; soru: string; cozum: string; gerekce: string; etkilenen: KisaKayit[] }
export interface MeseleListesi { meseleler: MeseleSatiri[]; gerekceler: GerekceSatiri[] }

/** Takvim değişikliğinin önizlemesi (§3.4). */
export interface TakvimEtkisi {
  toplam: number; degisenSayisi: number; cozulemezSayisi: number;
  /** Dayanağa göre verilmiş tarihler: yazılışları değişmez, yerleri dayanaklarından yeniden hesaplanır. */
  goreliSayisi: number;
  degisen: { yer: string; kayit: string; ifade: string; once: string; sonra: string; cozulemez: boolean }[];
}
/** Harita (§8.1). Koordinatlar haritanın uzayındadır (ilk görselin piksel boyutu). */
export interface IsaretGirdisi { kesinlik: 'kesin' | 'yaklasik' | 'bilinmiyor'; x: number | null; y: number | null; yaricap: number | null }
/** Haritanın uzayına oturtulmuş görsel (§8.1, §8.5). Dönüşüm görselin pikselini uzaya taşır: (x, y) → (a·x + c·y + e, b·x + d·y + f). */
export interface HaritaKatmani {
  kod: string; ad: string; gorsel: string; donusum: [number, number, number, number, number, number]; en: number; boy: number; silindi: boolean;
  onceki: [number, number, number, number, number, number] | null;
  noktalar: { gorsel: [number, number]; uzay: [number, number] }[]; hatalar: number[];
  /** Hatası büyük kontrol noktalarının çevresindeki işaretler. */
  gozdenGecir: { kod: string; ad: string }[];
}
export interface HaritaOzeti { kod: string; ad: string; en: number; boy: number; yer: KisaKayit | null; gorsel: string | null; isaretSayisi: number }
export interface HaritaIsareti { kod: string; kayit: KisaKayit; karar: string; konum: IsaretGirdisi; altHarita: string | null; /** Bakış açısında: yalnızca o bilenin inancında var. */ inanc?: boolean }
export interface HaritaAyrintisi {
  kod: string; ad: string; en: number; boy: number; silindi: boolean; yer: { kod: string; ad: string } | null;
  katmanlar: HaritaKatmani[];
  isaretler: HaritaIsareti[]; ustHaritalar: { kod: string; ad: string }[];
  bakis: KisaKayit | null;
  cizimler: HaritaCizimi[];
  /** Zaman kaydırıcısında seçilen tarih; çözülemediyse gecerli false. */
  an: { ifade: string; gecerli: boolean } | null;
  /** Çizimlerin sınırlarındaki en erken ve en geç yıl (kaydırıcının aralığı). */
  zamanAraligi: { enKucuk: number; enBuyuk: number } | null;
  /** Seçilen tarihte, yeri bu haritada işaretli olay ve sahneler. */
  buTarihte: { kod: string; ad: string; tur: string; tarih: string; yer: string }[];
}
/** Haritada bölge (çokgen) ya da yol çizgisi (§8.2). Bölge fiilî denetim ya da iddiadır; tartışmalı toprakta her taraf ayrı çizilir. */
export interface HaritaCizimi {
  kod: string; kayit: KisaKayit; karar: string; bicim: 'bolge' | 'yol'; kip: 'denetim' | 'iddia' | null; noktalar: [number, number][];
  baslangic: SinirBilgisi | null; bitis: SinirBilgisi | null;
  /** Seçilen tarihte geçerli mi (tarih seçilmemişse null). */
  gecerli: 'evet' | 'hayir' | 'belirsiz' | null;
  inanc?: boolean;
}
export interface KayitHaritalari {
  isaretler: { kod: string; harita: string; haritaAd: string; kesinlik: IsaretGirdisi['kesinlik'] }[];
  haritalar: { kod: string; ad: string }[];
  cizimler: { kod: string; harita: string; haritaAd: string; bicim: 'bolge' | 'yol'; kip: 'denetim' | 'iddia' | null }[];
}
/** Editoryal birleştirme önizlemesi (§9.5). */
export interface BirlesmeAlani { alan: string; etiket: string; kaynak: string; hedef: string; celiski: boolean }
export interface BirlesmeOnizlemesi {
  kaynak: KisaKayit; hedef: KisaKayit; adlar: string[]; alanlar: BirlesmeAlani[];
  iliskiler: number; aradakiIliskiler: number; durumlar: number; isaretler: number; haritalar: number; degisimler: number;
  baglantilar: number; gorseller: number; metinVar: boolean;
}
/** Sağlık taraması (§9.4) ve inceleme kararları (§9.3). */
export interface IncelemeKarari {
  durum: 'kabul' | 'ertelendi' | 'duzeltildi'; gerekce: string; zaman: number;
  /** Denetim istisnasının türü (§9.1): bilerek kabul edilen çelişki ya da kuralın burada uygulanmadığı. */
  istisna?: 'tercih' | 'kapsam' | null;
}
/** Kural tabanlı denetimler (§9.1). Hüküm ve kapsam ayrı gösterilir; "sorun yok" yalnızca sayılan kurallar için geçerlidir. */
export type DenetimKurali = 'yasam' | 'dongu' | 'konum' | 'esya' | 'bilgi' | 'surec';
export interface DenetimBulgusu {
  anahtar: string; kural: DenetimKurali; hukum: 'celiski' | 'olasi'; baslik: string;
  /** Uyarının dayanağı: hangi değerlerden çıktığı, okunur cümleyle. */
  dayanak: string;
  kayitlar: KisaKayit[];
  /** Fikir durumundaki bir değere dayanıyor; ayrı ve sessiz grupta durur (K13). */
  fikir: boolean;
  karar: IncelemeKarari | null;
}
export interface DenetimOzeti {
  kural: DenetimKurali; ad: string; tanim: string;
  sonuc: 'sorun_yok' | 'bulgu_var' | 'konu_degil' | 'denetlenemiyor';
  denetlenen: number; not: string;
}
export interface Denetimler { kurallar: DenetimOzeti[]; acik: DenetimBulgusu[]; ertelenen: DenetimBulgusu[]; kabul: DenetimBulgusu[]; fikir: DenetimBulgusu[] }
export interface SaglikBulgusu {
  anahtar: string; tur: 'kopuk_baglanti' | 'silinmis_baglanti' | 'vazgecilmis_baglanti' | 'eksik_gorsel' | 'kod_sorunu' | 'baglantisiz_fikir' | 'belirsiz_tarih';
  baslik: string; aciklama: string; kayit: KisaKayit | null; hedef: KisaKayit | null; harita?: { kod: string; ad: string }; dayanak: string; karar: IncelemeKarari | null;
}
export interface SaglikTaramasi { acik: SaglikBulgusu[]; ertelenen: SaglikBulgusu[]; kabul: SaglikBulgusu[]; bilgiler: SaglikBulgusu[] | null }
/** Görünümlerde bir kayıt (§7). */
export interface AgDugumu {
  kod: string; ad: string; tur: string; karar: string;
  /** Bakış açısı süzgecinde: yalnızca o bilenin inancında var. */
  inanc?: boolean;
}
/** Görünümlerde bir ilişki ya da (istenirse) metindeki bağlantı. a → b yönlüdür. */
export interface AgKenari {
  kod: string; tur: string; a: string; b: string;
  /** Kısa okunuş: karşılıklı türlerde tek ad, yönlülerde "B'nin gözünden → A'nın gözünden". */
  etiket: string; aIcin: string; bIcin: string; karsilikli: boolean;
  rol: string | null; rolAdi: string | null; karar: string;
  /** Bakılan andaki geçerliliği (bir an verildiyse). */
  gecerlilik: Gecerlilik | null;
  baslangic: EvrenTarihi | null; bitis: EvrenTarihi | null;
  /** Metindeki bağlantı (ilişki değil). */
  baglanti?: boolean;
  /** Bakış açısı süzgecinde: yalnızca o bilenin inancında var. */
  inanc?: boolean;
}
export interface SoyAgaci {
  odak: string; an: EvrenTarihi | null; bakis: KisaKayit | null;
  dugumler: AgDugumu[]; kenarlar: AgKenari[];
  /** Eşleri ortak bir atası olan evlilikler ve en yakın ortak ataları. */
  soyIci: { kenar: string; ortakAtalar: { kod: string; ad: string }[] }[];
  kesildi: boolean;
}
export interface AgSonucu {
  merkez: string | null; an: EvrenTarihi | null; bakis: KisaKayit | null;
  dugumler: AgDugumu[]; kenarlar: AgKenari[];
  /** Çizim sınırı aşıldı: bazı kayıtlar gösterilmiyor. */
  kesildi: boolean;
  /** Bütün evren görünümünde hiçbir bağı olmadığı için ağda yer almayan kayıt sayısı. */
  baglantisiz: number;
}
export interface DurumGecmisi {
  ozellik: string; an: EvrenTarihi | null;
  kayitlar: { kod: string; ad: string; tur: string; durumlar: DurumSatiri[] }[];
}
export interface NedenSonucAgi {
  merkez: string | null;
  dugumler: (AgDugumu & { tarih: EvrenTarihi | null })[];
  kenarlar: (AgKenari & { zamanUyarisi: string | null })[];
}
export interface EtkiSatiri { kod: string; ad: string; tur: string; aciklama: string }
/** Etki raporu (§9.2): hesapla değişenler · incelenmesi gerekenler · yalnızca bahsedenler. */
export interface EtkiRaporu { hesap: EtkiSatiri[]; bagimli: EtkiSatiri[]; bahseden: EtkiSatiri[] }
export interface EtkiIncelemesi {
  anahtar: string; islem: string; degisim: 'tarih' | 'katilimci';
  kaynak: KisaKayit; hedef: KisaKayit;
  once: string | null; sonra: string | null; aciklama: string; zaman: number;
  karar: IncelemeKarari | null;
}
export interface EtkiIncelemeleri { acik: EtkiIncelemesi[]; ertelenen: EtkiIncelemesi[]; kapanan: EtkiIncelemesi[] }
export interface HatSahnesi { kod: string; ad: string; sira: number; bolum: string | null; baglar: { rol: string | null; rolAdi: string | null; aciklama: string; karar: string }[] }
export interface KurguHatlari {
  hatlar: {
    kod: string; ad: string; karar: string;
    eserler: { eser: { kod: string; ad: string }; toplam: number; sahneler: HatSahnesi[]; sonBagliSira: number | null; sonrakiSahne: number | null }[];
    /** Hiçbir esere yerleşmemiş bağlı kayıtlar. */
    yerlesmemis: { kod: string; ad: string; tur: string; rol: string | null; rolAdi: string | null; aciklama: string; karar: string }[];
    /** İpucu durumlarının sayısı. */
    ipucu: Record<string, number>;
  }[];
}
export interface BolumMatrisi {
  eser: { kod: string; ad: string };
  sutunlar: { kod: string; ad: string; sahneSayisi: number }[];
  satirlar: { kayit: AgDugumu; hucreler: { bulunuyor: number; aniliyor: number; bakis: number; etki: number; bilgi: number; okur: number }[]; gorunduguSahne: number; konuOlduguSahne: number }[];
}
export interface CizelgeOgesi { kod: string; ad: string; tur: string; karar: string; tarih: EvrenTarihi; eser: string | null; inanc?: boolean }

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
  kayitTarih(a: { evren: string; kod: string; ifade?: string; kisitlar?: { olay: string; fark: string }[] | null }): { tarih: EvrenTarihi | null };
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
  sablon(a: { evren: string; tur: string }): SablonBilgisi;
  sablonYaz(a: { evren: string; tur: string; sablon: Sablon | null }): void;
  kayitSablonu(a: { evren: string; kod: string }): KayitSablonu;
  kayitAlanYaz(a: { evren: string; kod: string; alan: string; deger: unknown }): void;
  soruCevapla(a: { evren: string; kod: string; soru: string; durum: SoruDurumu | null; cevap?: string }): void;
  soruKayitla(a: { evren: string; kod: string; soru: string; ad: string; tur: string }): { kod: string };
  kayitSoruSeti(a: { evren: string; kod: string; set: string; ekle: boolean }): void;
  evrenSorulari(a: { evren: string }): EvrenSorulari;
  meseleler(a: { evren: string; kod?: string }): MeseleListesi;
  yazarKaydiEkle(a: { evren: string; tur: 'acik_mesele' | 'gerekce'; ad: string; bagla?: string | null; onemli?: boolean }): { kod: string };
  takvim(a: { evren: string }): Takvim;
  takvimEtkisi(a: { evren: string; takvim: Takvim | ParalelTakvim | null; kod?: string | null }): TakvimEtkisi;
  takvimYaz(a: { evren: string; takvim: Takvim | null }): void;
  zamanSeti(a: { evren: string }): ZamanSeti;
  paralelTakvimYaz(a: { evren: string; kod?: string | null; takvim: ParalelTakvim | null }): { kod: string };
  akisYaz(a: { evren: string; kod?: string | null; akis: Akis | null }): { kod: string };
  akisEtkisi(a: { evren: string; kod: string; akis: Akis | null }): TakvimEtkisi;
  zamanCizelgesi(a: { evren: string; bakis?: string | null }): CizelgeOgesi[];
  soyAgaci(a: { evren: string; odak: string; an?: string | null; bakis?: string | null }): SoyAgaci;
  ag(a: { evren: string; merkez?: string | null; derinlik?: number; iliskiTurleri?: string[] | null; kayitTurleri?: string[] | null; an?: string | null; baglantilar?: boolean; vazgecilmis?: boolean; bakis?: string | null }): AgSonucu;
  kayitIddialari(a: { evren: string; kod: string }): IddiaSatiri[];
  iddialar(a: { evren: string }): IddiaOzeti[];
  iddiaEkle(a: { evren: string; konu: string; soru: string; secenekler: string[]; gercek?: number | null; karar?: string }): { kod: string };
  iddiaDegistir(a: { evren: string; kod: string; alan: 'soru' | 'secenekler' | 'gercek' | 'karar'; deger: unknown }): void;
  iddiaSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  bilenBilgileri(a: { evren: string; kod: string }): BilgiSatiri[];
  bilgiEkle(a: { evren: string; bilgi: BilgiGirdisi }): { kod: string };
  bilgiDegistir(a: { evren: string; kod: string; alan: BilgiAlani; deger: unknown }): void;
  bilgiSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  gorunurlukYaz(a: { evren: string; kod: string; nesne: 'kayit' | 'iliski'; deger: Gorunurluk | null }): void;
  durumGecmisi(a: { evren: string; ozellik: string; an?: string | null }): DurumGecmisi;
  kayitDurumGecmisi(a: { evren: string; kod: string }): DurumGecmisi[];
  nedenSonucAgi(a: { evren: string; merkez?: string | null; derinlik?: number }): NedenSonucAgi;
  etkiRaporu(a: { evren: string; kod: string }): EtkiRaporu;
  etkiIncelemeleri(a: { evren: string }): EtkiIncelemeleri;
  etkiKarari(a: { evren: string; anahtar: string; durum: 'kabul' | 'ertelendi' | 'duzeltildi' | null; gerekce?: string }): void;
  kurguHatlari(a: { evren: string }): KurguHatlari;
  bolumMatrisi(a: { evren: string; eser: string; turler?: string[] | null }): BolumMatrisi;
  haritalar(a: { evren: string; silinmis?: boolean }): HaritaOzeti[];
  harita(a: { evren: string; kod: string; bakis?: string | null; an?: string | null }): HaritaAyrintisi;
  cizimEkle(a: { evren: string; harita: string; kayit: string; bicim: 'bolge' | 'yol'; kip?: 'denetim' | 'iddia' | null; noktalar: [number, number][]; baslangic?: SinirGirdisi | null; bitis?: SinirGirdisi | null }): { kod: string };
  cizimDegistir(a: { evren: string; kod: string; alan: 'noktalar' | 'kayit' | 'kip' | 'baslangic' | 'bitis'; deger: unknown }): void;
  cizimSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  haritaYukle(a: { evren: string; ad: string; yer?: string | null; dosyaAdi: string; tur: string; veri: Uint8Array }): Promise<{ kod: string }>;
  gorseldenHarita(a: { evren: string; kayit: string; gorsel: string }): { kod: string };
  haritaDegistir(a: { evren: string; kod: string; alan: 'ad' | 'yer'; deger: unknown }): void;
  haritaSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  isaretKoy(a: { evren: string; harita: string; kayit: string; konum: IsaretGirdisi }): { kod: string };
  isaretDegistir(a: { evren: string; kod: string; alan: 'konum' | 'kayit'; deger: unknown }): void;
  isaretSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  katmanEkle(a: { evren: string; harita: string; ad: string; dosyaAdi: string; tur: string; veri: Uint8Array }): Promise<{ kod: string }>;
  katmanGorseli(a: { evren: string; harita: string; katman: string; dosyaAdi: string; tur: string; veri: Uint8Array }): Promise<void>;
  katmanDegistir(a: { evren: string; harita: string; katman: string; alan: 'ad' | 'silindi'; deger: unknown }): void;
  katmanHizala(a: { evren: string; harita: string; katman: string; noktalar: { gorsel: [number, number]; uzay: [number, number] }[] | null; donusum?: [number, number, number, number, number, number] | null }): void;
  kayitHaritalari(a: { evren: string; kod: string }): KayitHaritalari;
  birlesmeOnizle(a: { evren: string; kaynak: string; hedef: string }): BirlesmeOnizlemesi;
  birlestir(a: { evren: string; kaynak: string; hedef: string; secimler: Record<string, 'kaynak' | 'hedef'> }): void;
  birlesmeyiGeriAl(a: { evren: string; kod: string }): void;
  tersBirlesmeCoz(a: { evren: string; islem: string }): void;
  parcadanKayit(a: { evren: string; kaynak: string; ad: string; tur: string; spans: Spans }): { kod: string };
  saglikTaramasi(a: { evren: string; bilgi?: boolean }): SaglikTaramasi;
  incelemeKarari(a: { evren: string; anahtar: string; durum: 'kabul' | 'ertelendi' | null; gerekce?: string; istisna?: 'tercih' | 'kapsam' | null }): void;
  denetimler(a: { evren: string }): Denetimler;
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
