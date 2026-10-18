// Türkçe harf kuralları (§18 arama ve sıralama).

const KATLAMA: Record<string, string> = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th' };

/**
 * Arama için katlama: Türkçe küçük harf (I→ı, İ→i), sonra Türkçe ve aksanlı harfler sadeleşir.
 * "KILIÇ", "Kılıcı" → "kilic", "kilici"; "Elinä" → "elina".
 */
export function katla(s: string): string {
  return s.toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüøæœßłđðþ]/g, (c) => KATLAMA[c])
    .normalize('NFD').replace(/\p{M}/gu, '');
}

/** Arama kelimeleri (katlanmış). Kesme işareti kelimeyi böler: "Velkar'dan" → velkar, dan. */
export function kelimeler(s: string): string[] {
  return katla(s).match(/[\p{L}\p{N}]+/gu) ?? [];
}

const siralayici = new Intl.Collator('tr-TR', { sensitivity: 'base', numeric: true });
/** Türkçe alfabeye göre sıralama. */
export const turkceKarsilastir = (a: string, b: string) => siralayici.compare(a, b);
