// Yaş (§3.4): doğum tarihi biliniyorsa bir andaki yaş hesaplanır ve hangi tarihe bakıldığı yazılır.
// Hassasiyet korunur: yıl düzeyinde iki tarihten tek yaş değil, olası en küçük ve en büyük yaş çıkar. Yaş takvim
// günleriyle sayılır: doğum gününde yeni yaşına girmiş olur, doğduğu gün 0 yaşındadır.
import { anaTakvim, GUN_PARCA, karsilastir, VARSAYILAN_TAKVIM, yilGunu, type EvrenTarihi, type TakvimYa } from './tarih';

export interface Yas { metin: string; enAz: number | null; enCok: number | null }

export function yasHesapla(dogum: EvrenTarihi | null, an: EvrenTarihi | null, olum: EvrenTarihi | null = null, tk: TakvimYa = VARSAYILAN_TAKVIM): Yas | null {
  const t = anaTakvim(tk);
  if (!dogum || !an) return null;
  const bilinmiyor = { metin: 'Yaşı hesaplanamıyor (tarihlerden biri takvime çevrilemedi)', enAz: null, enCok: null };
  if (!dogum.eksen || !an.eksen) return bilinmiyor;
  const { enErken: d1, enGec: d2 } = dogum.eksen;
  const { enErken: a1, enGec: a2 } = an.eksen;
  const gun = (n: number) => Math.floor(n / GUN_PARCA), yg = yilGunu(t);
  const enAz = a1 !== null && d2 !== null ? Math.floor((gun(a1) - gun(d2)) / yg) : null;
  const enCok = a2 !== null && d1 !== null ? Math.floor((gun(a2) - gun(d1)) / yg) : null;
  const olumSirasi = olum ? karsilastir(olum, an) : null;
  if (olumSirasi === 'once') return { metin: 'Bu tarihte ölmüş', enAz, enCok };
  if (enCok !== null && enCok < 0) return { metin: 'Bu tarihte henüz doğmamış', enAz, enCok };
  const ek = olumSirasi === 'belirsiz' ? ' (ölmüş olabilir)' : '';
  const az = enAz === null ? null : Math.max(0, enAz);
  if (az === null && enCok === null) return bilinmiyor;
  if (az === null) return { metin: `En çok ${enCok} yaşında${ek}`, enAz, enCok };
  if (enCok === null) return { metin: `En az ${az} yaşında${ek}`, enAz, enCok };
  if (enAz !== null && enAz < 0) return { metin: `Doğmuş olabilir; en çok ${enCok} yaşında${ek}`, enAz, enCok };
  return { metin: `${az === enCok ? az : `${az}–${enCok}`} yaşında${ek}`, enAz, enCok };
}
