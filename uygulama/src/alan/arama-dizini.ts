// Metin arama dizini (K38, D1; §18 arama): her metnin sözcükleri Türkçe ek kurallarıyla olası köklerine indirilir ve
// köklerle saklanır. Arama da aranan sözcüğü köklerine indirir; ortak bir kök bulunan metin bulunur ("kılıcıyla"
// aranınca "kılıçtan" geçen sahne). Anlam çıkarılmaz (K1): yalnız ek kuralları.
import { kelimeler } from './turkce';
import { kokAdaylari } from './turkce-ek';

/** Kısa ortak kökler eşleşme sayılmaz ("adam" ile "adada" "ada"da buluşmasın). */
export const EN_KISA_ORTAK_KOK = 4;

/** Bir metnin dizine girecek kökleri (sözcüklerin kendileri dahil). */
export function dizinKokleri(duz: string): Set<string> {
  const s = new Set<string>();
  const gorulen = new Set<string>();
  for (const k of kelimeler(duz)) {
    if (gorulen.has(k)) continue;
    gorulen.add(k);
    for (const x of kokAdaylari(k)) s.add(x);
    s.add(k);
  }
  return s;
}

/** Aranan tek sözcüğün dizinde aranacak biçimleri: kendisi ve yeterince uzun kökleri. */
export function aramaKokleri(sozcuk: string): string[] {
  const [k] = kelimeler(sozcuk);
  if (!k) return [];
  return [...new Set([k, ...kokAdaylari(k).filter((x) => x.length >= EN_KISA_ORTAK_KOK)])];
}

/** Metindeki, aranan köklerle buluşan ilk sözcüğün katlanmış metindeki yeri ve uzunluğu. */
export function kokluSozcukYeri(katli: string, kokler: string[]): { i: number; uzunluk: number } | null {
  const ara = new Set(kokler);
  for (const m of katli.matchAll(/[\p{L}\p{N}]+/gu)) {
    const w = m[0];
    if (ara.has(w) || kokAdaylari(w).some((x) => ara.has(x))) return { i: m.index!, uzunluk: w.length };
  }
  return null;
}
