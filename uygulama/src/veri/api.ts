// Arayüz ile veritabanı çalışanı arasındaki istekler. Arayüz veritabanına yalnızca bunlarla erişir.
import type { Islem } from '../alan/islem';
import type { EvrenTarihi } from '../alan/tarih';

export interface KurulumBilgisi { kod: string; ad: string; sqlite: string }
export interface EvrenOzeti { kod: string; ad: string; olusturma: number; sonAcilis: number | null }
export interface EvrenBilgisi extends EvrenOzeti { islemSayisi: number; kayitSayisi: number; copSayisi: number }
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
export interface BaglananKayit { kod: string; ad: string; tur: string; ifadeler: string[] }
export interface AdDuzeltmesi { kaynak: string; kaynakAd: string; sira: number; eski: string; yeni: string }
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
  metinKaydet(a: { evren: string; kayit: string; alan: string; spans: Spans; temel: Basliklar }): { basliklar: Basliklar; degisti: boolean };
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
export interface DegisiklikBildirimi { degisti: { evren: string; turler: string[]; kayitlar: string[] } }
