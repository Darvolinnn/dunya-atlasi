// Arayüz ile veritabanı çalışanı arasındaki istekler. Arayüz veritabanına yalnızca bunlarla erişir.
import type { Islem } from '../alan/islem';

export interface KurulumBilgisi { kod: string; ad: string; sqlite: string }
export interface EvrenOzeti { kod: string; ad: string; olusturma: number; sonAcilis: number | null }
export interface EvrenBilgisi extends EvrenOzeti { islemSayisi: number }
export type GunlukSatiri = Omit<Islem, 'ikili'> & { ikiliBoyut: number };

export interface Istekler {
  baslat(): KurulumBilgisi;
  evrenler(): EvrenOzeti[];
  evrenOlustur(a: { ad: string }): { kod: string };
  evrenAdlandir(a: { evren: string; ad: string }): void;
  evrenBilgisi(a: { evren: string }): EvrenBilgisi;
  islemGunlugu(a: { evren: string; sinir: number }): GunlukSatiri[];
}

export type IstekAdi = keyof Istekler;
export type IstekArg<K extends IstekAdi> = Parameters<Istekler[K]>[0];
export type IstekSonuc<K extends IstekAdi> = ReturnType<Istekler[K]>;

/** Çalışandan arayüze: bir evrende işlem yazıldı (ekranlar yenilensin). */
export interface DegisiklikBildirimi { degisti: { evren: string; turler: string[] } }
