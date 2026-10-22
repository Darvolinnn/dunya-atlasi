// Birimli sayı alanı (§18.1 "Nicelik ve alan anlamı", "Kural ve formül dili"). Bir alanın nicelik türü, birimi ve
// hassasiyeti tanımlıdır; "10" tek başına anlamsızdır. Uzunluk ve kütle birimleri kendi içinde çevrilir; süre yalnızca
// dakika, saat, gün ve hafta arasında çevrilir (ay ve yıl takvime bağlıdır). Para, miktar ve "diğer" çevrilmez:
// yalnızca aynı birimle karşılaştırılır. Birimler uyuşmazsa hesap durur ve nedenini söyler.
import { katla } from './turkce';

export type NicelikTuru = 'uzunluk' | 'kutle' | 'sure' | 'miktar' | 'para' | 'diger';
export const NICELIK_TURLERI: { kod: NicelikTuru; ad: string; birimler: string[]; serbest: boolean }[] = [
  { kod: 'uzunluk', ad: 'Uzunluk', birimler: ['mm', 'cm', 'm', 'km'], serbest: false },
  { kod: 'kutle', ad: 'Kütle', birimler: ['g', 'kg', 'ton'], serbest: false },
  { kod: 'sure', ad: 'Süre', birimler: ['dakika', 'saat', 'gün', 'hafta', 'ay', 'yıl'], serbest: false },
  { kod: 'miktar', ad: 'Miktar (sayı)', birimler: ['adet', 'kişi'], serbest: true },
  { kod: 'para', ad: 'Para', birimler: [], serbest: true },
  { kod: 'diger', ad: 'Diğer', birimler: [], serbest: true },
];
/** Çevrilebilen birimlerin ortak birime oranı. Listede olmayan birim yalnızca kendisiyle karşılaştırılır. */
const ORAN: Record<string, number> = {
  mm: 0.001, cm: 0.01, m: 1, km: 1000,
  g: 0.001, kg: 1, ton: 1000,
  dakika: 1 / 1440, saat: 1 / 24, 'gün': 1, hafta: 7,
};
const ORAN_TURU: Record<string, NicelikTuru> = {
  mm: 'uzunluk', cm: 'uzunluk', m: 'uzunluk', km: 'uzunluk', g: 'kutle', kg: 'kutle', ton: 'kutle',
  dakika: 'sure', saat: 'sure', 'gün': 'sure', hafta: 'sure',
};
/** Yazarın kullanabileceği eş yazımlar. */
const ES: Record<string, string> = {
  metre: 'm', santimetre: 'cm', milimetre: 'mm', kilometre: 'km', gram: 'g', kilogram: 'kg', kilo: 'kg',
  gun: 'gün', yil: 'yıl', dk: 'dakika', sa: 'saat',
};
export const EN_COK_HASSASIYET = 6;

/** Birim yazısını bilinen biçime indirir; bilinmeyen birim kırpılmış hâliyle kalır. */
export function birimAdi(b: string): string {
  const x = String(b ?? '').replace(/\s+/g, ' ').trim();
  const k = katla(x);
  if (ES[k]) return ES[k];
  for (const t of NICELIK_TURLERI) for (const y of t.birimler) if (katla(y) === k) return y;
  return x;
}

/** a biriminde verilen sayıyı b birimine çevirir; çevrilemezse null. */
export function birimCevir(sayi: number, a: string, b: string): number | null {
  const x = birimAdi(a), y = birimAdi(b);
  if (x === y) return sayi;
  if (ORAN[x] === undefined || ORAN[y] === undefined || ORAN_TURU[x] !== ORAN_TURU[y]) return null;
  return (sayi * ORAN[x]) / ORAN[y];
}

export interface SayiDegeri { enAz: number; enCok: number; birim: string }

/** Türkçe yazılmış bir sayı: ondalık virgülle ("1,75"), binlikler noktayla ayrılır ("12.000", "1.250,5"). Noktadan
 *  sonra tam üç basamaklı gruplar geliyorsa nokta binlik ayırıcıdır; değilse ondalık sayılır ("1.75"). */
export const SAYI_DESENI = String.raw`-?[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?(?![.,]?\d)|-?\d+(?:[.,]\d+)?`;
const TAM_SAYI = new RegExp(`^(?:${SAYI_DESENI})$`);
/** Sayı yazısını okur; okunamazsa NaN. Baştaki uzun eksi işareti (−) de eksi sayılır. "0.125" ondalıktır. */
export function sayiOku(yazi: string): number {
  const s = String(yazi ?? '').trim().replace(/^−/, '-');
  if (!TAM_SAYI.test(s)) return NaN;
  return Number(/^-?[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.'));
}
/** Saklanan sayının girdi kutusundaki yazısı: ondalık virgülle ("1,234"; "1.234" bin sanılmasın). */
export const sayiGirdisi = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? ''
  : n.toLocaleString('tr-TR', { useGrouping: false, maximumFractionDigits: 20 }).replace('−', '-'));

/** "180", "1,75 m", "170–180 cm" biçimindeki girdiyi çözer ve alanın birimine çevirir. Birim yazılmazsa alanın
 *  birimi sayılır. Hassasiyet alanın birimindeki ondalık basamak sayısıdır. */
export function sayiCoz(girdi: unknown, alanBirimi: string, hassasiyet = 0): SayiDegeri | null {
  if (girdi && typeof girdi === 'object' && 'enAz' in (girdi as object)) {
    // Saklanmış değer yeniden yazılırken ondalık virgülle yazılır ("1.234" binlik ayırıcı sanılmasın).
    const g = girdi as SayiDegeri;
    return sayiCoz(`${sayiGirdisi(g.enAz)}${g.enCok !== g.enAz ? `-${sayiGirdisi(g.enCok)}` : ''} ${g.birim}`, alanBirimi, hassasiyet);
  }
  const s = String(girdi ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const m = s.match(new RegExp(`^(${SAYI_DESENI})(?:\\s*[-–]\\s*(${SAYI_DESENI}))?\\s*(.*)$`, 'u'));
  if (!m) throw new Error('Sayı okunamadı. Örnek: 180, 1,75 ya da 170–180.');
  const hedef = birimAdi(alanBirimi);
  const birim = m[3] ? birimAdi(m[3]) : hedef;
  if (birim.length > 30) throw new Error('Birim çok uzun.');
  const cevir = (t: string) => {
    const x = birimCevir(sayiOku(t), birim, hedef);
    if (x === null) throw new Error(`“${birim}” bu alanın birimine (${hedef}) çevrilemez.`);
    const yuvarlak = Math.round(x * 1e9) / 1e9;
    if (Math.round(yuvarlak * 10 ** hassasiyet) / 10 ** hassasiyet !== yuvarlak) {
      throw new Error(hassasiyet ? `${hedef} cinsinden en çok ${hassasiyet} ondalık basamak yazılabilir.` : `Bu alana ${hedef} cinsinden tam sayı yazılır.`);
    }
    return yuvarlak;
  };
  const enAz = cevir(m[1]), enCok = m[2] !== undefined ? cevir(m[2]) : enAz;
  if (enCok < enAz) throw new Error('Aralığın küçük sayısı önce yazılır.');
  return { enAz, enCok, birim: hedef };
}

const sayiYaz = (n: number) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
export const sayiMetni = (v: SayiDegeri) => `${sayiYaz(v.enAz)}${v.enCok !== v.enAz ? `–${sayiYaz(v.enCok)}` : ''} ${v.birim}`.trim();
export const sayiDegeriMi = (d: unknown): d is SayiDegeri => !!d && typeof d === 'object' && typeof (d as SayiDegeri).enAz === 'number' && typeof (d as SayiDegeri).enCok === 'number';

/** Nicelik türü ve birim birlikte geçerli mi? Çevrilen türlerde birim listeden seçilir. */
export function birimGecerli(nicelik: unknown, birim: unknown): boolean {
  const t = NICELIK_TURLERI.find((x) => x.kod === nicelik);
  if (!t || typeof birim !== 'string' || !birim.trim() || birim.length > 30) return false;
  return t.serbest || t.birimler.includes(birimAdi(birim));
}
