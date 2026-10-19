// Durum geçmişi (§3.5): unvan, ikamet, sahiplik gibi zamanla değişen değerler geçerlilik aralığıyla saklanır.
// Bir anın durumu üç değerlidir (§3.4): geçerli, geçerli değil ya da belirsiz (iki olası hâl de gösterilir).
import { karsilastir, type EvrenTarihi } from './tarih';

/** anlik: tek bir anın gözlemi · aralik: başlangıç–bitiş · sonraki: aynı özelliğin bir sonraki kaydına kadar. */
export type DurumKipi = 'aralik' | 'sonraki' | 'anlik';
export const DURUM_KIPLERI: { kod: DurumKipi; ad: string; aciklama: string }[] = [
  { kod: 'sonraki', ad: 'Sonraki değişikliğe kadar', aciklama: 'Aynı özellik yeniden değişene kadar sürer' },
  { kod: 'aralik', ad: 'Belirli aralık', aciklama: 'Başlangıç ve bitişi olan durum' },
  { kod: 'anlik', ad: 'Tek anlık gözlem', aciklama: 'Yalnızca o an için geçerlidir, sonrasına taşınmaz' },
];
export const durumKipiGecerli = (k: unknown): k is DurumKipi => k === 'aralik' || k === 'sonraki' || k === 'anlik';

export type Gecerlilik = 'evet' | 'hayir' | 'belirsiz';

/**
 * Sınır: 'acik' (sınırsız: "… –" ya da "– …"), null (sınır var ama tarihi bilinmiyor; ör. bağlı olayın tarihi
 * girilmemiş) ya da tarih. Bitiş dışlayıcıdır: 418'de biten unvan ile 418'de başlayan unvan 418'de belirsizdir.
 */
export type Sinir = EvrenTarihi | null | 'acik';

const ve = (a: Gecerlilik, b: Gecerlilik): Gecerlilik => a === 'hayir' || b === 'hayir' ? 'hayir' : a === 'belirsiz' || b === 'belirsiz' ? 'belirsiz' : 'evet';

export function gecerlilik(kip: DurumKipi, bas: Sinir, bit: Sinir, an: EvrenTarihi | null): Gecerlilik {
  if (!an?.eksen) return 'belirsiz';
  if (kip === 'anlik') {
    if (bas === 'acik' || !bas?.eksen) return 'belirsiz';
    const k = karsilastir(bas, an);
    if (k !== 'belirsiz') return 'hayir';
    const ayni = bas.eksen.enErken === an.eksen.enErken && bas.eksen.enGec === an.eksen.enGec && bas.eksen.enErken !== null && bas.eksen.enGec !== null;
    return ayni ? 'evet' : 'belirsiz';
  }
  let g: Gecerlilik = 'evet';
  if (bas !== 'acik') {
    const k = bas ? karsilastir(bas, an) : 'belirsiz';
    g = ve(g, k === 'once' ? 'evet' : k === 'sonra' ? 'hayir' : 'belirsiz');
  }
  if (bit !== 'acik') {
    const k = bit ? karsilastir(bit, an) : 'belirsiz';
    g = ve(g, k === 'sonra' ? 'evet' : k === 'once' ? 'hayir' : 'belirsiz');
  }
  return g;
}
