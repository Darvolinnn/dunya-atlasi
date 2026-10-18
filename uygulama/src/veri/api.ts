// Arayüz ile veritabanı çalışanı arasındaki istekler. Arayüz veritabanına yalnızca bunlarla erişir.
import type { Islem } from '../alan/islem';

export interface KurulumBilgisi { kod: string; ad: string; sqlite: string }
export interface EvrenOzeti { kod: string; ad: string; olusturma: number; sonAcilis: number | null }
export interface EvrenBilgisi extends EvrenOzeti { islemSayisi: number; kayitSayisi: number; copSayisi: number }
export type GunlukSatiri = Omit<Islem, 'ikili'> & { ikiliBoyut: number };

export interface KayitOzeti {
  kod: string; tur: string; ad: string; ozet: string; karar: string;
  lakaplar: string[]; duzenleme: number; silindi: number | null;
}
export interface Kayit extends KayitOzeti {
  okunus: string; etiketler: string[]; oncekiAdlar: string[]; olusturma: number;
}
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
  ara(a: { evren: string; metin: string; sinir?: number; metinde?: boolean }): AramaSonucu[];
  baglananlar(a: { evren: string; kod: string }): BaglananKayit[];
  bahsedilenler(a: { evren: string }): (KayitOzeti & { anilma: number })[];
  adDuzeltmeOnizle(a: { evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string }): AdDuzeltmesi[];
  adDuzeltmeUygula(a: { evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string; secilenler: string[] }): { degisen: number };
  metinGeriYukle(a: { evren: string; kayit: string; alan: string; basliklar: Basliklar }): { basliklar: Basliklar; degisti: boolean };
}

export type IstekAdi = keyof Istekler;
export type IstekArg<K extends IstekAdi> = Parameters<Istekler[K]>[0];
export type IstekSonuc<K extends IstekAdi> = ReturnType<Istekler[K]>;

/** Çalışandan arayüze: bir evrende işlem yazıldı (ekranlar yenilensin). */
export interface DegisiklikBildirimi { degisti: { evren: string; turler: string[]; kayitlar: string[] } }
