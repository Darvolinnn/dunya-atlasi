// Arayüz ile veritabanı çalışanı arasındaki istekler. Arayüz veritabanına yalnızca bunlarla erişir.
import type { Islem } from '../alan/islem';
import type { Akis, EvrenTarihi, Fark, Karsilastirma, ParalelTakvim, Takvim, ZamanSeti } from '../alan/tarih';
import type { DurumKipi, Gecerlilik } from '../alan/durum';
import type { Sablon, Soru, SoruDurumu } from '../alan/sablon';
import type { BilgiEtiketi, BilgiKaynagi, Inanc } from '../alan/bilgi';
import type { Gorunurluk } from '../alan/gorunurluk';

export interface KurulumBilgisi { kod: string; ad: string; sqlite: string }
export interface EvrenOzeti { kod: string; ad: string; olusturma: number; sonAcilis: number | null }
export interface EvrenBilgisi extends EvrenOzeti {
  islemSayisi: number; kayitSayisi: number; copSayisi: number; catismaSayisi: number; sorunSayisi: number;
  /** Adlandırılmış sürüm (salt okunur) ya da deneme kopyasıysa bağlı olduğu evren (§9.7). */
  bag?: { tur: 'surum' | 'dal'; evren: string; evrenAdi: string; ad: string } | null;
}
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
/** Süreklilik defteri (§5.6). Geçiş modeli: serbest durum (hesap yok), sayılabilir kaynak, iyileşme süresi. */
export type IzModeli = 'durum' | 'sayi' | 'iyilesme';
export interface IzTanimi { kod: string; konu: KisaKayit; ad: string; model: IzModeli; birim: string; sure: number | null }
/** Bir izin evren zamanı boyunca adımları: gözlem ya da değişim, ve sayılabilir kaynakta adımdan sonraki hesap. */
export interface IzAdimi {
  tur: 'gozlem' | 'degisim'; sahne: { kod: string; ad: string } | null; an: 'bas' | 'son' | null; olay: { kod: string; ad: string } | null;
  degisim: string | null; deger: string; miktar: number | null; tarih: EvrenTarihi | null;
  /** Sayılabilir kaynakta bu adımdan önce hesaplanan değer; gözlemle uyuşmazsa ikisi de görünür. */
  hesap: number | null; uyusmaz: boolean;
}
export interface IzGecmisi { iz: IzTanimi; adimlar: IzAdimi[]; tarihsiz: IzAdimi[] }
export interface SahneIzi {
  iz: IzTanimi;
  bas: { gozlenen: string | null; beklenen: string | null; dayanak: string | null };
  degisimler: { kod: string; olay: { kod: string; ad: string }; metin: string; miktar: number | null; karar: string }[];
  son: { gozlenen: string | null; hesaplanan: string | null };
  netFark: number | null;
  notlar: string[];
}
export interface SahneSurekliligi { izler: SahneIzi[]; eklenebilir: IzTanimi[]; tarihli: boolean }
/** Varsayım paketi (§3.11) ve çalışma masası (§5.9). */
export type Varsayim =
  | { kod: string; tur: 'metin'; metin: string }
  | { kod: string; tur: 'olay'; olay: string; deger: boolean }
  | { kod: string; tur: 'rota'; rota: string; deger: boolean }
  | { kod: string; tur: 'bilgi'; bilen: string; iddia: string; deger: boolean };
export type VarsayimGirdisi =
  | { tur: 'metin'; metin: string } | { tur: 'olay'; olay: string; deger: boolean }
  | { tur: 'rota'; rota: string; deger: boolean } | { tur: 'bilgi'; bilen: string; iddia: string; deger: boolean };
export interface VarsayimSatiri { v: Varsayim; yazi: string; kayitlar: KisaKayit[]; evrendeki: string | null; kullanan: string; evreneYazilabilir: boolean }
export type BoslukTuru = 'acik' | 'bilinmiyor' | 'gecersiz';
export type VarsayilanEkseniAdi = 'kapsama' | 'bagli' | 'kultur' | 'tur';
export interface VarsayilanKaynagi { kaynak: KisaKayit; deger: unknown; eksen: VarsayilanEkseniAdi; yol: KisaKayit[] }
export interface VarsayilanKarari { durum: 'birlikte' | 'kapsam' | 'oncelik'; oncelikli: string | null; aciklama: string }
export interface FetihCevabi { durum: 'suruyor' | 'yeni' | 'birlikte'; tarih: EvrenTarihi | null }
/** Bağlılığı değişmiş kayıtta eski yönetimden gelen alan için soru (§3.7). */
export interface FetihSorusu {
  gecis: string; eski: KisaKayit; bitis: string | null;
  eskiKaynaklar: VarsayilanKaynagi[]; yeniKaynaklar: VarsayilanKaynagi[]; cevap: FetihCevabi | null;
}
export interface AlanVarsayilani {
  eksen: VarsayilanEkseniAdi; eksenAdi: string; kaynaklar: VarsayilanKaynagi[];
  durum: 'yok' | 'tek' | 'cozulmemis' | 'birlikte' | 'kapsam' | 'oncelik' | 'gizli' | 'fetih';
  bosluk: BoslukTuru | null; karar: VarsayilanKarari | null; fetih: FetihSorusu | null;
}
export type GeciselEksen = 'kapsama' | 'bagli' | 'kultur';
/** Geçişli sorgu sonucu: alt birim (birim null) ya da bir birime bağlı kayıt (birim, bağlandığı yer). */
export interface GeciselSonuc { kod: string; birim: KisaKayit | null; etiket: string }
export interface ToplananKayit { kayit: KisaKayit; birimler: KisaKayit[] }
export interface SurecAdimi { kod: string; ad: string; onkosul: string[]; esik: boolean; sonuc: boolean; etki: string }
export interface SurecKurali { kod: string; sahip: KisaKayit; ad: string; kosullar: string; adimlar: SurecAdimi[] }
export type AdimDurumu = 'planlandi' | 'basladi' | 'tamam' | 'yarida' | 'yapilmadi';
export interface SurecSonucu { durum: 'dogdu' | 'dogmadi' | 'bilinmiyor' | 'tanimsiz' | 'plan'; yazi: string; esik: string | null }
export interface OlaySureci { kural: SurecKurali; silinmis: boolean; durumlar: Record<string, AdimDurumu>; sonuc: SurecSonucu; fiili: boolean; celismeler: string[] }
export interface OlaySurecleri { surecler: OlaySureci[]; catisma: boolean }
export interface MakamYurutucusu { iliski: string; kisi: KisaKayit; baslangic: EvrenTarihi | null; bitis: EvrenTarihi | null; fikir: boolean; not: string | null }
export interface HukukKosulu { iliski: string; hedef: string; degil: boolean }
export interface HukukTanimi {
  ad: string; tur: 'yasak' | 'hak' | 'yukumluluk'; konu: string; kimlere: HukukKosulu[]; yer: string | null; yaptirim: string;
  fiili: 'uygulaniyor' | 'gevsek' | 'uygulanmiyor' | null; fiiliNot: string; baslangic: EvrenTarihi | null; bitis: EvrenTarihi | null;
}
export interface HukukKurali { kod: string; sahip: KisaKayit; tanim: HukukTanimi; yer: KisaKayit | null; kimlere: (HukukKosulu & { hedefKayit: KisaKayit })[] }
export interface UygulananKural {
  kural: HukukKurali; nedenYer: string; kosullar: { ad: string; durum: 'tutuyor' | 'tutmuyor' | 'kayitsiz' }[];
  durum: 'uygulanir' | 'kosul_kayitsiz'; zaman: 'gecerli' | 'tarihsiz' | 'belirsiz';
}
export interface UygulananKurallar {
  kisi: KisaKayit; yer: KisaKayit; tarih: EvrenTarihi | null; kurallar: UygulananKural[];
  catismalar: { konu: string; kurallar: string[] }[]; yerler: KisaKayit[]; yonetimler: KisaKayit[];
}
/** Kesintiye dayanıklılık (F10): bağın ne kadar dayanabileceği (aralık) ve ikamesi. */
export interface Dayaniklilik { enAz: number | null; enCok: number | null; birim: 'gun' | 'hafta' | 'ay' | 'yil'; ikame: string | null; not: string }
export interface KesintiAdimi {
  kayit: KisaKayit; derinlik: number; neden: string; yol: KisaKayit[]; iliski: string | null;
  dayaniklilik: (Dayaniklilik & { ikameKayit: KisaKayit | null }) | null; digerKaynaklar: KisaKayit[];
}
export interface KesintiZinciri { kaynak: KisaKayit; adimlar: KesintiAdimi[]; not: string }
export interface UretimOzeti {
  urun: KisaKayit; ureten: KisaKayit[]; girdiler: KisaKayit[]; kullananUrunler: KisaKayit[];
  fazlasiOlan: KisaKayit[]; acigiOlan: KisaKayit[]; tasiyanYollar: KisaKayit[]; bagimlilar: KisaKayit[];
}
/** Haberleşme yöntemi (§15-3): kayıtlı rotaları kullanabilir (hız katsayısıyla) ve kendi bağlantıları olabilir. */
export interface KanalTanimi { rotalar: boolean; kosul: string | null; carpan: number; baglantilar: { a: string; b: string; gun: number }[] }
export interface HaberCikisi { yer: KisaKayit | null; tarih: EvrenTarihi | null; kanallar: KisaKayit[] }
export interface RotaAdimi { rota: KisaKayit; nereden: KisaKayit; nereye: KisaKayit; gun: number | null; kosul: string | null }
interface RotaCozumu { hukum: 'bulundu' | 'bulunamadi'; kip: 'sure' | 'kroki' | null; toplam: number | null; adimlar: RotaAdimi[]; eksik: KisaKayit[] }
export interface RotaSonucu extends RotaCozumu {
  nereden: KisaKayit; nereye: KisaKayit; kosul: string | null;
  bilinen: (RotaCozumu & { kisi: KisaKayit; bildigiRota: number }) | null;
  paket: { kod: string; ad: string } | null; kapsam: string;
}
export interface HaberYayilimi {
  cikis: HaberCikisi; kanallar: KisaKayit[];
  ulasilan: { yer: KisaKayit; gun: number; yazi: string; tarih: string | null; yol: string[] }[];
  suresiz: KisaKayit[]; durum: 'cikis_yok' | 'kanal_yok' | 'hesaplandi'; not: string;
}
/** Dil tanımı (§4.3, §15-4): ses paleti, ses sınıfları, ses değişim kuralları, örnekler, sözlük. */
export interface DilSozcugu { bicim: string; anlam: string; tur: 'kok' | 'onek' | 'sonek' }
export interface DilTanimi {
  heceler: string[]; siniflar: { ad: string; harfler: string }[]; kurallar: { kural: string; not: string }[];
  ornekler: { kaynak: string; beklenen: string }[]; sozluk: DilSozcugu[];
}
export interface SesIzi { sira: number; kural: string; once: string; sonra: string }
export type YeterlilikDuzeyi = 'yok' | 'az' | 'orta' | 'iyi' | 'ana';
/** Dil yeterliliği tek bir yüzde değildir: dört beceri ayrı tutulur. */
export interface DilYeterliligi { konusma: YeterlilikDuzeyi | null; anlama: YeterlilikDuzeyi | null; okuma: YeterlilikDuzeyi | null; yazma: YeterlilikDuzeyi | null; not: string }
export interface KisiDili { dil: KisaKayit; iliski: string; yeterlilik: DilYeterliligi | null }
export interface DilBilgisi {
  tanim: DilTanimi; kaynaklar: KisaKayit[]; turevler: KisaKayit[]; kuralHatalari: { sira: number; hata: string }[];
  ornekler: { kaynak: string; beklenen: string; sonuc: string; tutuyor: boolean | null; iz: SesIzi[] }[];
  bilenler: { kisi: KisaKayit; iliski: string; yeterlilik: DilYeterliligi | null }[];
}
export interface TuretilenBicim { dil: KisaKayit; kaynakBicim: string; bicim: string; yol: KisaKayit[]; iz: SesIzi[]; hata: string | null; kayitli: string | null }
export interface AdBicimi { dil: KisaKayit; bicim: string; turetildi: { kaynakDil: KisaKayit; kaynakBicim: string } | null }
export interface UretilenAd { ad: string; parcalar: { bicim: string; anlam: string }[]; varOlan: boolean }
/** Teknoloji (§4.4): keşif, yayılma ve gündelik hayata girme ayrı tarihlerdir. */
export interface TeknolojiAsamasi { asama: 'kesif' | 'yayilma' | 'gundelik'; yer: KisaKayit | null; tarih: EvrenTarihi | null; not: string }
export interface TeknolojiTanimi { duzeyler: { alan: string; duzey: string }[]; asamalar: TeknolojiAsamasi[] }
export interface TeknolojiDurumu {
  yer: KisaKayit; tarih: EvrenTarihi; yerler: KisaKayit[]; not: string;
  satirlar: { teknoloji: KisaKayit; kesin: TeknolojiAsamasi['asama'] | null; belki: TeknolojiAsamasi['asama'] | null; dayanak: string[]; baskaYerde: KisaKayit[] }[];
}
export interface MotifYorumu { yorumlayan: KisaKayit | null; donem: KisaKayit | null; anlam: string }
export interface MotifBilgisi { yorumlar: MotifYorumu[]; sahneler: { sahne: KisaKayit; eser: { kod: string; ad: string } | null; sira: number | null }[] }
/** Kalıtım (§15-8): yazarın tanımladığı özellik; tek genli (baskın, çekinik) ya da çok genli. */
export interface KalitimOzelligi { kod: string; ad: string; kip: 'baskin' | 'cekinik' | 'cok_genli'; not: string }
/** Kişinin özellikteki değeri: görünür mü, kaç kopya taşıyor (biliniyorsa). */
export interface KalitimDegeri { gorunur: boolean | null; kopya: 0 | 1 | 2 | null }
export interface KalitimSatiri { ozellik: KalitimOzelligi; deger: KalitimDegeri | null; olasilik: { enAz: number; enCok: number } | null; aciklama: string; beklenmez: boolean }
export interface KalitimBilgisi { ozellikler: KalitimSatiri[]; ebeveynler: KisaKayit[]; evlatlik: KisaKayit[] }
export interface VerasetKurali { tur: 'ilk_dogan' | 'kardes_once' | 'secim'; evlatlik: boolean; evlilikDisi: boolean; not: string }
export interface TahtSirasi {
  makam: KisaKayit; tarih: EvrenTarihi; kural: VerasetKurali | null; yuruten: KisaKayit | null;
  durum: 'hesaplandi' | 'yuruten_yok' | 'birden_cok' | 'kural_yok' | 'secim';
  sira: { kisi: KisaKayit; yakinlik: string; uyarilar: string[] }[];
  sonrakiler: { kisi: KisaKayit; baslangic: string }[]; not: string;
}
/** Sahnenin yazarca işaretlenen niyeti (F13): bir açıklamayı destekler, zayıflatır ya da açıklar. */
export interface SahneNiyeti { iddia: string; secenek: string | null; tur: 'destekler' | 'zayiflatir' | 'aciklar' }
export type MontajHedefi = 'surpriz' | 'gerilim';
export interface KurguMontaji {
  eser: KisaKayit; sahneler: { kod: string; ad: string; sira: number; bolum: string | null }[];
  sorular: {
    iddia: { kod: string; soru: string; konu: KisaKayit; gercek: string | null }; hedef: MontajHedefi | null; okurOgrenir: number | null; uyarilar: string[];
    olaylar: { sira: number; sahne: KisaKayit; tur: 'ipucu' | 'yaniltmaca' | 'destekler' | 'zayiflatir' | 'aciklama' | 'okur'; secenek: string | null; inanc?: string; gercegi?: boolean }[];
  }[];
  izler: { kayit: KisaKayit; siralar: number[]; enUzunAra: number; sondan: number }[];
  /** Hücre: 0 bulunuyor, n son görüldüğünden bu yana sahne sayısı, -1 henüz görünmedi. */
  yokluk: { kisi: KisaKayit; hucreler: number[]; sayi: number }[];
  not: string;
}
/** Gündelik hayat kartı (§7 sıradan bir gün): bir yere, isteğe bağlı döneme ve statüye yazılır. */
export interface GundelikKart { kod: string; konu: 'barinma' | 'yemek' | 'ulasim' | 'is' | 'ibadet' | 'eglence'; metin: string; yer: KisaKayit; donem: KisaKayit | null; statu: KisaKayit | null }
export interface SiradanGun {
  yer: KisaKayit; donem: KisaKayit | null; statu: KisaKayit | null; yerler: KisaKayit[]; not: string;
  konular: { konu: GundelikKart['konu']; ad: string; kartlar: (GundelikKart & { genel: boolean })[] }[];
}
export interface KarsilastirmaliOkuma {
  sutunlar: { kayit: KisaKayit; tarih: EvrenTarihi | null; ozet: string }[];
  satirlar: { baslik: string; grup: 'alan' | 'soru' | 'durum'; degerler: (string | null)[] }[]; not: string;
}
export interface EvrenSurumu { kod: string; ad: string; aciklama: string; olusturma: number; islemSayisi: number }
export interface FarkAlani { alan: string; etiket: string; once: string | null; sonra: string | null }
export interface KayitFarki { kod: string; ad: string; tur: string; durum: 'yeni' | 'silindi' | 'degisti'; alanlar: FarkAlani[] }
export interface IliskiFarki { kod: string; tur: string; a: KisaKayit; b: KisaKayit; durum: 'yeni' | 'silindi' | 'degisti'; ayrinti: string[] }
export interface EvrenFarki { kayitlar: KayitFarki[]; iliskiler: IliskiFarki[] }
export interface Yayim { kod: string; eser: KisaKayit; surum: { kod: string; ad: string }; baski: string; olusturma: number; acik: number }
export interface YayimCelismesi { anahtar: string; kayit: KisaKayit; baslik: string; once: string | null; sonra: string | null; karar: string | null }
export interface MetinIsareti {
  kod: string; kayit: KisaKayit; alan: string; hedef: KisaKayit | null; hedefAlan: string | null; hedefAlanAdi: string | null;
  iddia: string; kritik: boolean; yerler: string[];
  /** yerinde: metinde tek yerde · metinde_yok: işaretli parça silinmiş · belirsiz: metinde birden çok yerde ya da başka metinde */
  durum: 'yerinde' | 'metinde_yok' | 'belirsiz';
}
export interface IsaretAlani { kod: string; ad: string; grup: string }
/** İşaretli cümlenin incelenmesi (§9.3, F24): bağlı bilgi değişti ya da kritik cümle değişti. */
export interface IsaretIncelemesi {
  anahtar: string; tur: 'deger' | 'metin'; isaret: MetinIsareti;
  /** deger: bağlı bilginin şimdiki hâli; metin: cümlenin onaylanmış ve şimdiki hâli */
  once: string | null; sonra: string | null; aciklama: string;
  karar: (IncelemeKarari & { niyet?: string | null }) | null;
}
export interface IsaretIncelemeleri { acik: IsaretIncelemesi[]; ertelenen: IsaretIncelemesi[]; kapanan: IsaretIncelemesi[] }
export interface BelgeSunumu { bicim: 'mektup' | 'gazete' | 'ilan' | 'izin' | 'gunluk' | 'antlasma' | 'mezar'; yazan: string | null; alici: string | null; yer: string | null; muhur: string | null; muhurYazisi: string; imzalayanlar: string[] }
export type AyEvresi = 'yeni' | 'buyuyen_hilal' | 'ilk_dordun' | 'buyuyen_siskin' | 'dolunay' | 'kuculen_siskin' | 'son_dordun' | 'kuculen_hilal';
export interface GokyuzuTanimi {
  aylar: { kod: string; ad: string; donem: number; baslangic: string; evre: AyEvresi }[];
  mevsimler: { ad: string; baslangicGunu: number }[];
  gelgitler: { kiyi: string; not: string; saat: number }[];
}
export interface GokyuzuKosulu { ay: string; evre: AyEvresi }
export interface GokyuzuZarfi {
  tur: 'bu kurallara göre zorunlu sonuç';
  hukum: 'çözüm bulundu' | 'kayıtlı seçeneklerde bulunamadı' | 'denetlenemiyor';
  guncellik: 'güncel'; kapsam: string; dayanak: string[]; varsayimlar: string[];
}
export interface GokyuzuSonucu {
  tarih: EvrenTarihi; aralik: boolean;
  aylar: { kod: string; ad: string; evreler: AyEvresi[] }[];
  mevsimler: string[]; zarf: GokyuzuZarfi;
}
export interface GokyuzuCakismalari {
  gunler: EvrenTarihi[]; dahaFazla: boolean; zarf: GokyuzuZarfi;
}
export type SozlukKapsami = { tur: 'evren' } | { tur: 'eser' | 'donem'; kayit: string } | { tur: 'turler'; turler: string[] };
export interface SozlukGirdisi { ifade: string; aciklama: string; teknoloji: string | null }
export interface SozlukTanimi { ad: string; tur: 'yasak' | 'hitap' | 'teknoloji'; girdiler: SozlukGirdisi[]; kapsam: SozlukKapsami }
export interface Sozluk extends SozlukTanimi { kod: string; silindi: boolean; catismali: boolean }
export interface SozlukEslesmesi {
  anahtar: string; sozluk: string; sozlukAdi: string; ifade: string; aciklama: string; kayit: KisaKayit;
  alan: string; paragraf: number; alinti: string; ileti: string; dayanak: string; fikir: boolean;
}
export interface SozlukDenetimi {
  sonuclar: SozlukEslesmesi[]; dahaFazlasi: boolean; denetlenen: number; eksikler: string[];
  guncellik: 'guncel'; kapsam: string; not: string;
}
export interface YerlesimNoktasi { x: number; y: number }
export interface YerlesimPlani { mekan: string; gorsel: string; en: number; boy: number }
export type YerlesimOgesi = { kod: string; ad: string } & (
  | { tur: 'duvar' | 'kapi' | 'pencere' | 'siper'; a: YerlesimNoktasi; b: YerlesimNoktasi; acik: boolean }
  | { tur: 'karakter'; kisi: string; konum: YerlesimNoktasi; yon: number; aci: number; uzaklik: number; adimlar: YerlesimNoktasi[] }
  | { tur: 'isik'; konum: YerlesimNoktasi; yaricap: number }
  | { tur: 'ses'; konum: YerlesimNoktasi; duzey: string; uzaklik: number | null; azaltma: number; gurultu: string }
);
export interface SahneYerlesimi { plan: YerlesimPlani; ogeler: YerlesimOgesi[] }
export interface YerlesimOkumasi { yerlesim: SahneYerlesimi | null; katilimcilar: KisaKayit[]; catismali: boolean }
export interface YerlesimPlanSecimi extends YerlesimPlani { ad: string }

/** F04 değişiklik masası: bir olayın tarihi değişmeden önceki önizleme. */
export interface MasaSatiri extends KisaKayit {
  /** Korunabilen satırın anahtarı; yaş gibi hesaplanan değerlerde null. */
  anahtar: string | null; aciklama: string; once: string; sonra: string;
  korunabilir: boolean; korunuyor: boolean; korunamaz: string | null;
}
export interface DegisiklikMasasi {
  olay: KisaKayit; once: string; sonra: string;
  hesap: MasaSatiri[]; celisen: (KisaKayit & { aciklama: string })[]; incelenecek: EtkiSatiri[]; bahseden: EtkiSatiri[];
}
/** §15-13 sonuçtan koşullara masası (F03). */
export interface KosulPlani { adimlar: RotaAdimi[]; toplam: number; pay: number; varis: string | null; bilinmeyen: KisaKayit[]; gerekenler: string[] }
export interface KosulMasasi {
  tur: 'kayıtlı ağa göre zorunlu sonuç'; hukum: 'çözüm bulundu' | 'kayıtlı seçeneklerde bulunamadı'; guncellik: 'güncel';
  planlar: KosulPlani[]; dahaFazla: boolean; nedenler: string[]; suresizler: KisaKayit[]; kapsam: string; varsayimlar: string[];
}
/** F23 bağlam karşılaştırma. */
export interface BaglamSatiri { baslik: string; grup: 'alan' | 'soru' | 'durum' | 'gercek' | 'bilgi'; degerler: (string | null)[]; farkli: boolean; neden: string[] }
export interface BaglamKarsilastirmasi {
  sutunlar: { kaynak: string; tarih: EvrenTarihi | null; bilen: KisaKayit | null; ad: string | null; yok: boolean }[];
  satirlar: BaglamSatiri[]; notlar: string[];
}
export interface BaglamSecimi { kaynak: string | null; tarih: string | null; bilen: string | null }
/** F28 iddia dosyası (§3.9): bir soru hakkındaki bir anlatım ve hangi cevabı desteklediği ya da hangisine itiraz ettiği. */
export interface AnlatimTanimi {
  iddia: string; kaynak: string | null; tur: 'resmi' | 'tanik' | 'belge' | 'aile' | 'soylenti' | 'diger';
  destek: string | null; itiraz: string[]; dayanak: string | null; dayanakTuru: 'kopya' | 'tercume' | 'aktarma' | null;
  ozet: string; karar: string;
}
export interface Anlatim extends AnlatimTanimi { kod: string; kaynakKaydi: KisaKayit | null; kok: string; catismali: boolean }
export interface IddiaDosyasi {
  iddia: { kod: string; soru: string; konu: KisaKayit; gercek: string | null };
  anlatimlar: Anlatim[];
  cevaplar: { secenek: { kod: string; metin: string }; gercek: boolean; durum: 'ikisi de' | 'destek var' | 'itiraz var' | 'dayanak yok'; destek: string[]; itiraz: string[]; bagimsizDestek: number; bagimsizItiraz: number }[];
  kaldirilan: { kod: string; ozet: string; kaynakKaydi: KisaKayit | null }[];
  not: string;
}
/** F08 delil geçmişi (§3.9): gerçek yazar, belge ailesi ve elden ele geçiş. Görünen yazar belge sunumundadır. */
export interface DelilTanimi {
  gercekYazar: string | null;
  aile: { ana: string; tur: 'kopya' | 'tercume' | 'sansurlu' } | null;
  elde: { kisi: string; tarih: string; nasil: string }[];
}
export interface DelilGecmisi {
  belge: KisaKayit; tanim: DelilTanimi;
  gorunenYazar: KisaKayit | null; gercekYazar: KisaKayit | null;
  yazarDurumu: 'aynı' | 'farklı' | 'gerçek yazılmamış' | 'görünen yazılmamış';
  aile: { kok: KisaKayit; uyeler: { kayit: KisaKayit; tur: 'kopya' | 'tercume' | 'sansurlu' | null; ana: KisaKayit | null; bu: boolean }[] };
  elde: { kisi: KisaKayit; tarih: string; nasil: string }[];
  deliller: { iddia: string; soru: string; konu: KisaKayit; anlatim: string; belge: KisaKayit; destek: string | null; itiraz: string[]; karar: string }[];
  okuyanlar: { kisi: KisaKayit; belge: KisaKayit }[];
  notlar: string[];
}
/** F33 bir sonraki yararlı soru: seçilen hesabın girdileri ve eksik bilginin kullanıldığı diğer hesaplar. */
export interface SonrakiSoruGirdisi { ad: string; durum: 'var' | 'eksik' | 'kısmen'; aciklama: string; kayit: KisaKayit | null; kullanim: string[] }
export interface SonrakiSoru {
  hesap: 'yolculuk' | 'yol' | 'haber' | 'yas' | 'yaslar' | 'gokyuzu'; ad: string; kayit: KisaKayit;
  girdiler: SonrakiSoruGirdisi[]; hazir: boolean; siradaki: SonrakiSoruGirdisi | null; not: string;
}
/** F31 keşif sorusu: tanımlı ilişkilerden çıkan aday; "mümkün" der, "oldu" demez. */
export interface KesifAdayi { kisiler: KisaKayit[]; yer: KisaKayit | null; konu?: KisaKayit | null; aralik: string; yazi: string; dayanaklar: string[] }
export type KesifSablonu = 'farkli_inananlar' | 'celisen_haklar';
export interface KesifSonucu { sablon: KesifSablonu; soru: string; adaylar: KesifAdayi[]; dahaFazla: boolean; kapsam: string; not: string }
/** F12 "neden her yerde kullanılmıyor" masası: bağlı alanlar ve her biri için yazarın dört kısa metni. */
export interface KullanimAlani { kod: string; ad: string; kayit: string | null; maliyet: string; erisim: string; karsiOnlem: string; yasak: string }
export interface KullanimMasasiTanimi { alanlar: KullanimAlani[] }
export interface KullanimMasasi {
  kayit: KisaKayit;
  alanlar: (KullanimAlani & { kayitKaydi: KisaKayit | null; yazilmamis: ('maliyet' | 'erisim' | 'karsiOnlem' | 'yasak')[] })[];
  adaylar: KisaKayit[]; not: string;
}
export type YogunlukOlcutu = 'olay' | 'sahne' | 'kelime' | 'kayit';
export interface YogunlukSayilari { olay: number; sahne: number; kelime: number; kayit: number }
export interface YogunlukIstegi { baslangic: string; bitis: string; adim: 1 | 10 | 100; eser?: string | null; tur?: string | null; harita?: string | null }
export interface YogunlukSatiri { kod: string; ad: string; enAz: YogunlukSayilari; enCok: YogunlukSayilari; aciklama: string }
export interface YogunlukKaydi extends KisaKayit {
  tarih: EvrenTarihi | null; kelime: number;
  dilimler: { ilk: number; son: number; kesin: boolean } | null;
  zamanDurumu: 'dilimde' | 'tarihsiz' | 'disarida';
  bolgeler: { kod: string; kesin: boolean }[];
  konumDurumu: 'konumlu' | 'konumsuz' | 'disarida';
}
export interface YogunlukSonucu {
  dilimler: YogunlukSatiri[]; bolgeler: YogunlukSatiri[]; kayitlar: YogunlukKaydi[];
  tarihsiz: YogunlukSayilari; zamanDisinda: YogunlukSayilari; konumsuz: YogunlukSayilari; bolgeDisinda: YogunlukSayilari;
  eserler: KisaKayit[]; haritalar: { kod: string; ad: string }[]; turler: string[];
  harita: { kod: string; ad: string } | null;
  zarf: { tur: 'bu kurallara göre zorunlu sonuç'; hukum: 'çözüm bulundu'; guncellik: 'güncel'; kapsam: string; dayanak: string[]; varsayimlar: string[] };
}
export type SozlesmeTuru = 'aciklanmayacak' | 'acik_birakildi' | 'anlati_kurali';
export interface SozlesmeTanimi {
  metin: string; tur: SozlesmeTuru; karar: 'fikir' | 'kesin' | 'vazgecildi';
  kapsam: { tur: 'evren' } | { tur: 'eserler'; eserler: string[] }; bagliKayitlar: string[];
}
export interface SozlesmeMaddesi extends SozlesmeTanimi {
  kod: string; silindi: boolean; catismali: boolean; bagli: KisaKayit[]; eserler: KisaKayit[];
}
export interface EserSozlesmesi {
  eser: KisaKayit; maddeler: { madde: SozlesmeMaddesi; durum: 'gecerli' | 'disarida' | 'belirsiz' }[];
}
export interface SozlesmeHatirlatmasi { madde: SozlesmeMaddesi; evren: boolean; eserler: KisaKayit[]; disaridaEserler: KisaKayit[] }

export type HakTuru = 'mulkiyet' | 'kullanim' | 'yetki' | 'yukumluluk' | 'izin';
export type HakTanimaDurumu = 'taniyor' | 'tanimiyor' | 'bilinmiyor';
export interface HakGirdisi {
  tur: HakTuru; sahipler: string[]; konu: string; kapsam: string; kosul: string; otorite: string | null; karar: string;
  baslangic?: SinirGirdisi | null; bitis?: SinirGirdisi | null;
}
export interface HakSiniri { tarih?: EvrenTarihi | null; olay?: string | null; fark?: Fark | null }
export interface HakTanimi extends Omit<HakGirdisi, 'baslangic' | 'bitis'> { baslangic: HakSiniri | null; bitis: HakSiniri | null }
export interface HakTanimasi { kod: string; otorite: KisaKayit; durum: HakTanimaDurumu; secenekler: string[] }
export interface HakSatiri {
  kod: string; tanim: HakTanimi; konu: KisaKayit; sahipler: KisaKayit[]; otorite: KisaKayit | null;
  baslangic: SinirBilgisi | null; bitis: SinirBilgisi | null; tanimalar: HakTanimasi[];
  gecerli: Gecerlilik; zaman: string; silindi: boolean; secenekler: string[];
}
export interface HakListesi {
  konu: HakSatiri[]; sahibi: HakSatiri[]; tarih: EvrenTarihi | null;
  bilgiler: { haklar: string[]; ileti: string }[];
}
export interface EvrenDali { kod: string; ad: string; aciklama: string; olusturma: number }
export interface AktarimBirimi {
  anahtar: string; tur: 'kayit' | 'iliski' | 'diger'; baslik: string; kayitTuru: string | null; durum: 'yeni' | 'silindi' | 'degisti';
  islemSayisi: number;
  /** Ana evren bu birimde dalla zaten aynı (aktarılmış ya da aynı değişiklik yapılmış). */
  ayni: boolean;
  /** Dal açıldıktan sonra ana evrende de değişmiş alanlar. */
  celisen: string[];
  gerekenler: { kod: string; ad: string; neden: 'dalda_yeni' | 'anada_silinmis' }[];
  ozet: string[];
}
export interface DalFarki { dalda: EvrenFarki; anada: EvrenFarki; birimler: AktarimBirimi[] }
export interface DerlemeOzeti { kod: string; tur: 'gezinti' | 'pano'; ad: string; ogeSayisi: number; duzenleme: number }
export interface GezintiAdimi { kayit: string; not: string }
export interface PanoNotu { x: number; y: number; metin: string }
export interface PanoOgesi { kod: string; gorsel: string; kayit: KisaKayit | null; baslik: string; durum: 'guncel' | 'eski' | null; notlar: PanoNotu[]; eksik: boolean }
export interface Derleme { kod: string; tur: 'gezinti' | 'pano'; ad: string; adimlar: { kayit: KisaKayit; not: string }[]; ogeler: PanoOgesi[] }
export interface PaketOzeti { kod: string; ad: string; aciklama: string; varsayimSayisi: number; duzenleme: number }
export interface Paket extends PaketOzeti { varsayimlar: VarsayimSatiri[]; masalar: { kod: string; ad: string }[] }
export interface MasaOzeti { kod: string; ad: string; amac: string; duzenleme: number; uyeSayisi: number }
export interface MasaUyesi { tur: 'kayit' | 'harita'; kod: string; ad: string; kayitTuru: string | null; grup: string; silindi: boolean }
export interface Masa {
  kod: string; ad: string; amac: string; notlar: string; bas: EvrenTarihi | null; bit: EvrenTarihi | null;
  paket: PaketOzeti | null; paketSilinmis: boolean; uyeler: MasaUyesi[];
  olaylar: { kod: string; ad: string; tarih: EvrenTarihi | null; belirsiz: boolean }[];
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
/** Rota (§4.2): iki uç, elle girilmiş mesafe, koşula göre süreler (gün), duraklar. */
export interface RotaVerisi {
  a: KisaKayit | null; b: KisaKayit | null; mesafe: { deger: number; birim: string } | null;
  sureler: { kosul: string; gun: number }[]; duraklar: KisaKayit[];
  /** Bu rotayı kullanan yolculuklar. */
  kullananlar: KisaKayit[];
}
export interface RotaGirdisi { a: string | null; b: string | null; mesafe: { deger: number; birim: string } | null; sureler: { kosul: string; gun: number }[]; duraklar: string[] }
/** Yolculuğun bir aşaması: bir yerden ötekine, isteğe bağlı bir rotayla. Planlanan ile gerçekleşen ayrıdır. */
export interface YolculukAsamasi {
  nereden: KisaKayit | null; nereye: KisaKayit | null; rota: KisaKayit | null; cikis: EvrenTarihi | null; varis: EvrenTarihi | null;
  durum: 'plan' | 'gerceklesti'; uyari: string | null; sure: { enAz: number; enCok: number } | null;
}
export interface YolculukAsamaGirdisi { nereden: string | null; nereye: string | null; rota: string | null; cikis: string; varis: string; durum: 'plan' | 'gerceklesti' }
export interface Yolculuk { asamalar: YolculukAsamasi[]; yolcular: (KisaKayit & { rol: string | null })[] }
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
export interface Denetimler {
  /** Hesabın dayandığı varsayım paketi; yoksa yalnızca kaydedilmiş veri. */
  paket: { kod: string; ad: string; kullanilan: number; kullanilmayan: number } | null;
  kurallar: DenetimOzeti[]; acik: DenetimBulgusu[]; ertelenen: DenetimBulgusu[]; kabul: DenetimBulgusu[]; fikir: DenetimBulgusu[] }
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
  yogunluk(a: { evren: string } & YogunlukIstegi): YogunlukSonucu;
  haklar(a: { evren: string; kayit: string; tarih?: string | null; cop?: boolean }): HakListesi;
  hakEkle(a: { evren: string; hak: HakGirdisi }): { kod: string };
  hakDegistir(a: { evren: string; kod: string; hak: HakGirdisi }): void;
  hakSil(a: { evren: string; kod: string }): void;
  hakGeriYukle(a: { evren: string; kod: string }): void;
  hakTanimaYaz(a: { evren: string; hak: string; kod?: string | null; otorite: string; durum: HakTanimaDurumu }): { kod: string };
  gokyuzuTanimi(a: { evren: string }): GokyuzuTanimi | null;
  gokyuzuYaz(a: { evren: string; tanim: GokyuzuTanimi }): void;
  gokyuzuHesapla(a: { evren: string; tarih: string }): GokyuzuSonucu;
  gokyuzuCakismaAra(a: { evren: string; baslangic: string; bitis: string; kosullar: GokyuzuKosulu[]; mevsim?: string | null }): GokyuzuCakismalari;
  sozlukler(a: { evren: string; cop?: boolean }): Sozluk[];
  sozlukYaz(a: { evren: string; kod?: string | null; tanim: SozlukTanimi }): { kod: string };
  sozlukSil(a: { evren: string; kod: string }): void;
  sozlukGeriYukle(a: { evren: string; kod: string }): void;
  sozlukDenetle(a: { evren: string }): SozlukDenetimi;
  sozlukIsareti(a: { evren: string; sozluk: string; anahtar: string; bilerek: boolean }): void;
  iddiaDosyasi(a: { evren: string; iddia: string }): IddiaDosyasi;
  anlatimYaz(a: { evren: string; kod?: string | null; tanim: AnlatimTanimi }): { kod: string };
  anlatimSil(a: { evren: string; kod: string }): void;
  anlatimGeriYukle(a: { evren: string; kod: string }): void;
  delilGecmisi(a: { evren: string; kod: string }): DelilGecmisi;
  delilYaz(a: { evren: string; kod: string; tanim: DelilTanimi }): void;
  sorulabilirHesaplar(a: { evren: string; kod: string }): { hesap: SonrakiSoru['hesap']; ad: string }[];
  kullanimMasasi(a: { evren: string; kod: string }): KullanimMasasi;
  kullanimMasasiYaz(a: { evren: string; kod: string; tanim: KullanimMasasiTanimi }): void;
  kesifSorusu(a: { evren: string; sablon: KesifSablonu; iddia?: string | null }): KesifSonucu;
  kesifAdayiKaydet(a: { evren: string; bicim: 'sahne' | 'mesele'; ad: string; aciklama: string; kisiler: string[]; yer: string | null; konu?: string | null }): { kod: string };
  sonrakiSoru(a: { evren: string; kod: string; hesap: SonrakiSoru['hesap']; nereden?: string | null; tarih?: string | null }): SonrakiSoru;
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
  degisimEkle(a: { evren: string; sahne: string; olay?: string | null; konu?: string | null; metin: string; karar?: string; iz?: string | null; miktar?: number | null }): { kod: string; olay: string };
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
  durumNiyeti(a: { evren: string; kod: string; alan: 'deger' | 'hedef'; deger: unknown; niyet: 'eski_duzelt' | 'bu_tarihten' | 'taslakta' | 'inanc'; tarih?: SinirGirdisi | null; bilen?: string | null }): { evren: string };
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
  degisiklikMasasi(a: { evren: string; kod: string; ifade: string; koru: string[] }): DegisiklikMasasi;
  degisiklikUygula(a: { evren: string; kod: string; ifade: string; koru: string[] }): void;
  etkiIncelemeleri(a: { evren: string }): EtkiIncelemeleri;
  etkiKarari(a: { evren: string; anahtar: string; durum: 'kabul' | 'ertelendi' | 'duzeltildi' | null; gerekce?: string }): void;
  kurguHatlari(a: { evren: string }): KurguHatlari;
  bolumMatrisi(a: { evren: string; eser: string; turler?: string[] | null }): BolumMatrisi;
  haritalar(a: { evren: string; silinmis?: boolean }): HaritaOzeti[];
  harita(a: { evren: string; kod: string; bakis?: string | null; an?: string | null }): HaritaAyrintisi;
  cizimEkle(a: { evren: string; harita: string; kayit: string; bicim: 'bolge' | 'yol'; kip?: 'denetim' | 'iddia' | null; noktalar: [number, number][]; baslangic?: SinirGirdisi | null; bitis?: SinirGirdisi | null }): { kod: string };
  cizimDegistir(a: { evren: string; kod: string; alan: 'noktalar' | 'kayit' | 'kip' | 'baslangic' | 'bitis'; deger: unknown }): void;
  cizimSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  rota(a: { evren: string; kod: string }): RotaVerisi;
  rotaYaz(a: { evren: string; kod: string; rota: RotaGirdisi }): void;
  yolculuk(a: { evren: string; kod: string }): Yolculuk;
  yolculukYaz(a: { evren: string; kod: string; asamalar: YolculukAsamaGirdisi[] }): void;
  izOlustur(a: { evren: string; konu: string; ad: string; model: IzModeli; birim?: string; sure?: number | null }): { kod: string };
  izDegistir(a: { evren: string; kod: string; ad: string; birim?: string; sure?: number | null }): void;
  izSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  izGozlem(a: { evren: string; iz: string; sahne: string; an: 'bas' | 'son'; deger: string }): void;
  sahneSurekliligi(a: { evren: string; sahne: string; ek?: string[] }): SahneSurekliligi;
  masalar(a: { evren: string }): MasaOzeti[];
  masa(a: { evren: string; kod: string }): Masa;
  masaOlustur(a: { evren: string; ad: string }): { kod: string };
  masaYaz(a: { evren: string; kod: string; alan: 'ad' | 'amac' | 'notlar' | 'bas' | 'bit' | 'paket'; deger: string | null }): void;
  masaUyeleri(a: { evren: string; kod: string; ekle?: { tur: 'kayit' | 'harita'; kod: string }; cikar?: { tur: 'kayit' | 'harita'; kod: string }; tasi?: { uye: { tur: 'kayit' | 'harita'; kod: string }; sira: number } }): void;
  masaSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  kayitMasalari(a: { evren: string; kod: string }): { kod: string; ad: string }[];
  paketler(a: { evren: string }): PaketOzeti[];
  paket(a: { evren: string; kod: string }): Paket;
  paketOlustur(a: { evren: string; ad: string }): { kod: string };
  paketAlanYaz(a: { evren: string; kod: string; alan: 'ad' | 'aciklama'; deger: string }): void;
  varsayimEkle(a: { evren: string; paket: string; varsayim: VarsayimGirdisi }): { kod: string };
  varsayimCikar(a: { evren: string; paket: string; kod: string }): void;
  varsayimiEvreneYaz(a: { evren: string; paket: string; kod: string }): void;
  paketSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  kayitIzleri(a: { evren: string; kod: string }): IzGecmisi[];
  kayitVarsayilanlari(a: { evren: string; kod: string }): Record<string, AlanVarsayilani>;
  alanBoslugu(a: { evren: string; kod: string; alan: string; tur: BoslukTuru | null }): void;
  varsayilanKarari(a: { evren: string; kod: string; alan: string; karar: VarsayilanKarari | null }): void;
  surecKurallari(a: { evren: string; sahip?: string }): SurecKurali[];
  surecKuraliOlustur(a: { evren: string; sahip: string; ad: string }): { kod: string };
  surecKuraliYaz(a: { evren: string; kod: string; tanim: { ad: string; kosullar: string; adimlar: SurecAdimi[] } }): void;
  surecKuraliSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  olaySurecleri(a: { evren: string; olay: string }): OlaySurecleri;
  surecBagla(a: { evren: string; olay: string; kural: string; bagli: boolean }): void;
  surecAdimi(a: { evren: string; olay: string; kural: string; adim: string; durum: AdimDurumu | null }): void;
  surecFiili(a: { evren: string; olay: string; kural: string | null }): void;
  makamYurutenleri(a: { evren: string; makam: string }): MakamYurutucusu[];
  hukukKurallari(a: { evren: string; sahip?: string }): HukukKurali[];
  hukukKuraliOlustur(a: { evren: string; sahip: string; ad: string }): { kod: string };
  hukukKuraliYaz(a: { evren: string; kod: string; tanim: Omit<HukukTanimi, 'baslangic' | 'bitis'> & { baslangic: string; bitis: string } }): void;
  hukukKuraliSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  uygulananKurallar(a: { evren: string; kisi: string; yer: string; tarih?: string | null }): UygulananKurallar;
  kesintiZinciri(a: { evren: string; kaynak: string }): KesintiZinciri;
  uretimOzeti(a: { evren: string; urun: string }): UretimOzeti;
  dayaniklilikYaz(a: { evren: string; iliski: string; deger: Dayaniklilik | null }): void;
  geciselKayitlar(a: { evren: string; kok: string; eksen: GeciselEksen }): GeciselSonuc[];
  gundelikKartlari(a: { evren: string; yer: string }): GundelikKart[];
  sozlesmeMaddeleri(a: { evren: string; cop?: boolean }): SozlesmeMaddesi[];
  sozlesmeMaddeYaz(a: { evren: string; kod?: string | null; tanim: SozlesmeTanimi }): { kod: string };
  sozlesmeMaddeSil(a: { evren: string; kod: string }): void;
  sozlesmeMaddeGeriYukle(a: { evren: string; kod: string }): void;
  sozlesmeDisaridaYaz(a: { evren: string; madde: string; eser: string; disarida: boolean }): void;
  eserSozlesmesi(a: { evren: string; eser: string }): EserSozlesmesi;
  sozlesmeHatirlatmalari(a: { evren: string; kayit: string }): SozlesmeHatirlatmasi[];
  yerlesim(a: { evren: string; sahne: string }): YerlesimOkumasi;
  yerlesimPlanlari(a: { evren: string }): YerlesimPlanSecimi[];
  yerlesimYaz(a: { evren: string; sahne: string; plan: YerlesimPlani; ogeler: YerlesimOgesi[] }): void;
  gundelikYaz(a: { evren: string; yer: string; kartlar: { kod?: string | null; konu: string; donem: string | null; statu: string | null; metin: string }[] }): void;
  siradanGun(a: { evren: string; yer: string; donem?: string | null; statu?: string | null }): SiradanGun;
  karsilastirmaliOkuma(a: { evren: string; sutunlar: { kayit: string; tarih: string | null }[] }): KarsilastirmaliOkuma;
  baglamKarsilastir(a: { evren: string; kayit: string; baglamlar: BaglamSecimi[] }): BaglamKarsilastirmasi;
  derlemeler(a: { evren: string; tur: 'gezinti' | 'pano' }): DerlemeOzeti[];
  surumler(a: { evren: string }): EvrenSurumu[];
  surumOlustur(a: { evren: string; ad: string; aciklama?: string }): { kod: string };
  surumYaz(a: { evren: string; kod: string; alan: 'ad' | 'aciklama'; deger: string }): void;
  surumSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  surumFarki(a: { evren: string; surum: string }): EvrenFarki;
  dallar(a: { evren: string }): EvrenDali[];
  yayimlar(a: { evren: string; eser?: string | null }): Yayim[];
  markdownDisaAktar(a: { evren: string }): Promise<{ dosyaAdi: string; veri: Uint8Array; kayitSayisi: number; eksikGorsel: number }>;
  epubYaz(a: { evren: string; eser: string; sahneBasliklari?: boolean }): Promise<{ dosyaAdi: string; veri: Uint8Array }>;
  eserBaskiSayfasi(a: { evren: string; eser: string; sahneBasliklari?: boolean }): { html: string };
  belgeSunumu(a: { evren: string; kod: string }): { sunum: BelgeSunumu; adlar: Record<string, string> };
  belgeSunumuYaz(a: { evren: string; kod: string; sunum: BelgeSunumu }): void;
  belgeCiktisi(a: { evren: string; kod: string }): { html: string };
  isaretAlanlari(a: { evren: string; hedef: string }): IsaretAlani[];
  metinIsaretiOlustur(a: { evren: string; kayit: string; alan: string; hedef: string | null; hedefAlan?: string | null; iddia?: string; kritik?: boolean }): { kod: string };
  metinIsaretiYaz(a: { evren: string; kod: string; alan: 'hedef' | 'hedefAlan' | 'iddia' | 'kritik'; deger: unknown }): void;
  metinIsaretiSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  kayitIsaretleri(a: { evren: string; kod: string }): { metindekiler: MetinIsareti[]; buKayda: MetinIsareti[] };
  isaretIncelemeleri(a: { evren: string; kayit?: string | null }): IsaretIncelemeleri;
  isaretKarari(a: { evren: string; anahtar: string; durum: 'kabul' | 'ertelendi' | 'duzeltildi' | null; gerekce?: string; niyet?: 'eski_duzelt' | 'bu_tarihten' | 'taslakta' | 'inanc' | null }): void;
  isaretOzetleri(a: { evren: string; kodlar: string[] }): { kod: string; hedef: KisaKayit | null; hedefAlanAdi: string | null; iddia: string; kritik: boolean }[];
  yayimla(a: { evren: string; eser: string; baski: string }): { kod: string };
  yayimSil(a: { evren: string; kod: string }): void;
  yayimCelismeleri(a: { evren: string; yayim: string }): YayimCelismesi[];
  yayimKarari(a: { evren: string; yayim: string; anahtar: string; karar: string | null }): void;
  dalOlustur(a: { evren: string; ad: string; aciklama?: string }): { kod: string };
  dalYaz(a: { evren: string; kod: string; alan: 'ad' | 'aciklama'; deger: string }): void;
  dalSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  dalFarki(a: { evren: string; dal: string }): DalFarki;
  dalAktar(a: { evren: string; dal: string; birimler: string[]; eslemeler: Record<string, string> }): { aktarilan: number; birakilan: string[] };
  derleme(a: { evren: string; kod: string }): Derleme;
  derlemeOlustur(a: { evren: string; tur: 'gezinti' | 'pano'; ad: string }): { kod: string };
  derlemeAdYaz(a: { evren: string; kod: string; ad: string }): void;
  gezintiYaz(a: { evren: string; kod: string; adimlar: GezintiAdimi[] }): void;
  panoYaz(a: { evren: string; kod: string; ogeler: (Omit<PanoOgesi, 'kayit' | 'eksik'> & { kayit: string | null })[] }): void;
  panoGorseliSakla(a: { evren: string; dosyaAdi: string; tur: string; veri: Uint8Array }): Promise<{ ad: string }>;
  derlemeSil(a: { evren: string; kod: string; geriYukle?: boolean }): void;
  kayitDerlemeleri(a: { evren: string; kod: string }): DerlemeOzeti[];
  kurguMontaji(a: { evren: string; eser: string }): KurguMontaji;
  sahneNiyetleri(a: { evren: string; sahne: string }): SahneNiyeti[];
  sahneNiyetleriYaz(a: { evren: string; sahne: string; niyetler: SahneNiyeti[] }): void;
  montajHedefiYaz(a: { evren: string; eser: string; iddia: string; hedef: MontajHedefi | null }): void;
  montajTasi(a: { evren: string; sahne: string; yon: -1 | 1 }): { etki: AnlatiEtkisi[] };
  kalitimOzellikleri(a: { evren: string }): KalitimOzelligi[];
  kalitimOzelligiYaz(a: { evren: string; kod: string | null; tanim: Omit<KalitimOzelligi, 'kod'> | null }): { kod: string };
  kalitim(a: { evren: string; kod: string }): KalitimBilgisi;
  kalitimDegeriYaz(a: { evren: string; kod: string; ozellik: string; deger: KalitimDegeri | null }): void;
  veraset(a: { evren: string; kod: string }): VerasetKurali | null;
  verasetYaz(a: { evren: string; kod: string; kural: VerasetKurali | null }): void;
  tahtSirasi(a: { evren: string; kod: string; tarih: string }): TahtSirasi;
  teknoloji(a: { evren: string; kod: string }): TeknolojiTanimi;
  teknolojiYaz(a: { evren: string; kod: string; tanim: { duzeyler: { alan: string; duzey: string }[]; asamalar: { asama: string; yer: string | null; tarih: string; not: string }[] } }): void;
  teknolojiDurumu(a: { evren: string; yer: string; tarih: string }): TeknolojiDurumu;
  motif(a: { evren: string; kod: string }): MotifBilgisi;
  motifYorumlariYaz(a: { evren: string; kod: string; yorumlar: { yorumlayan: string | null; donem: string | null; anlam: string }[] }): void;
  dil(a: { evren: string; kod: string }): DilBilgisi;
  dilYaz(a: { evren: string; kod: string; tanim: DilTanimi }): void;
  sesDene(a: { evren: string; dil: string; bicim: string }): { sonuc: string; iz: SesIzi[]; hatalar: { sira: number; hata: string }[] };
  adTuret(a: { evren: string; dil: string; bicim: string; kayit?: string | null }): TuretilenBicim[];
  adUret(a: { evren: string; dil: string; kip: 'hece' | 'bicim'; enAz: number; enCok: number; adet: number }): UretilenAd[];
  adBicimleri(a: { evren: string; kod: string }): AdBicimi[];
  adBicimiYaz(a: { evren: string; kod: string; dil: string; bicim: string | null; kaynakDil?: string | null; kaynakBicim?: string | null }): void;
  kisiDilleri(a: { evren: string; kod: string }): KisiDili[];
  dilYeterliligiYaz(a: { evren: string; iliski: string; deger: DilYeterliligi | null }): void;
  enKisaRota(a: { evren: string; nereden: string; nereye: string; kosul?: string | null; kisi?: string | null; paket?: string | null }): RotaSonucu;
  kosulMasasi(a: { evren: string; nereden: string; nereye: string; enCokGun: number; cikis?: string | null; kosul?: string | null; kisi?: string | null; yasakRotalar?: string[]; yasakYerler?: string[]; paket?: string | null }): KosulMasasi;
  kanal(a: { evren: string; kod: string }): KanalTanimi;
  kanalYaz(a: { evren: string; kod: string; tanim: KanalTanimi }): void;
  haberCikisi(a: { evren: string; kod: string }): HaberCikisi;
  haberCikisiYaz(a: { evren: string; kod: string; yer: string | null; tarih: string; kanallar: string[] }): void;
  haberYayilimi(a: { evren: string; kod: string; paket?: string | null }): HaberYayilimi;
  altBirimlerdenToplananlar(a: { evren: string; kod: string }): ToplananKayit[];
  fetihCevabi(a: { evren: string; kod: string; gecis: string; alan: string; cevap: { durum: FetihCevabi['durum']; tarih?: string } | null }): void;
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
  denetimler(a: { evren: string; paket?: string | null }): Denetimler;
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
