// F40: yaklaşık tek sayı için kendiliğinden hata payı üretilmez; alt grup farkını yazar seçer.
export interface KalabalikMiktari { enAz: number; enCok: number; yaklasik: boolean }
export const KALABALIK_TURLERI = ['topluluk', 'kafile'];
export const KALABALIK_OLAY_ADLARI = { katilma: 'Katılma', ayrilma: 'Ayrılma', olum: 'Ölüm' };

export function miktarDogrula(m: KalabalikMiktari): KalabalikMiktari {
  if (!m || !Number.isSafeInteger(m.enAz) || !Number.isSafeInteger(m.enCok) || m.enAz < 0 || m.enCok < m.enAz || typeof m.yaklasik !== 'boolean') {
    throw new Error('Miktar, sıfır ya da daha büyük bir tam sayı ya da böyle iki sayıdan oluşan bir aralık olmalı.');
  }
  return { enAz: m.enAz, enCok: m.enCok, yaklasik: m.yaklasik };
}
export function miktarYaz(m: KalabalikMiktari): string {
  return `${m.yaklasik ? 'yaklaşık ' : ''}${m.enAz === m.enCok ? m.enAz : `${m.enAz}–${m.enCok}`} kişi`;
}
export function miktarEkle(a: KalabalikMiktari, b: KalabalikMiktari, azalt = false, belirsiz = false): KalabalikMiktari {
  const enAz = a.enAz + (azalt ? -b.enCok : belirsiz ? 0 : b.enAz);
  const enCok = a.enCok + (azalt ? belirsiz ? 0 : -b.enAz : b.enCok);
  if (!Number.isSafeInteger(enAz) || !Number.isSafeInteger(enCok)) throw new Error('Miktar hesaplanamayacak kadar büyük.');
  // Negatif sonuç gizlice sıfıra yuvarlanmaz; tutarsız dayanak olarak gösterilir.
  return { enAz, enCok, yaklasik: a.yaklasik || b.yaklasik };
}
export function ayrikMi(a: KalabalikMiktari, b: KalabalikMiktari): boolean {
  return a.enCok < b.enAz || b.enCok < a.enAz;
}
/** A dışında B: kesişimin alt sınırı toplamdan, üst sınırı iki alt gruptan gelir. */
export function altGrupFarki(a: KalabalikMiktari, b: KalabalikMiktari, toplam: KalabalikMiktari, ortusme: KalabalikMiktari | null): KalabalikMiktari {
  const alt = Math.max(0, a.enAz + b.enAz - toplam.enCok, ortusme?.enAz ?? 0);
  const ust = Math.min(a.enCok, b.enCok, ortusme?.enCok ?? Infinity);
  if (alt > ust) throw new Error('Alt gruplar ve örtüşme miktarı uyuşmuyor.');
  const enAz = Math.max(0, a.enAz - ust, a.enAz - b.enCok);
  const enCok = Math.min(a.enCok - alt, toplam.enCok - b.enAz);
  if (enAz > enCok) throw new Error('Alt gruplar ve toplam uyuşmuyor.');
  return { enAz, enCok, yaklasik: a.yaklasik || b.yaklasik || toplam.yaklasik || !!ortusme?.yaklasik };
}
