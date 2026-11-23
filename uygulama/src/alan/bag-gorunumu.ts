// Bağlantı görünümü (K37): metindeki bağlantıların rengi ve biçimi. Seçim evrene yazılır, bütün cihazlarda aynı
// görünür. Renkler açık ve koyu temada ayrı tonlarla okunur kalır (stil.css --bag-*). PDF ve Word çıktısını değiştirmez.
export const BAG_RENKLERI = [
  { kod: 'altin', ad: 'Altın' },
  { kod: 'kirmizi', ad: 'Kırmızı' },
  { kod: 'gul', ad: 'Gül' },
  { kod: 'mor', ad: 'Mor' },
  { kod: 'mavi', ad: 'Mavi' },
  { kod: 'deniz', ad: 'Deniz yeşili' },
  { kod: 'yesil', ad: 'Yeşil' },
  { kod: 'tur', ad: 'Türüne göre' },
] as const;

export interface BagGorunumu { renk: string; zemin: boolean; kalin: boolean; alti: boolean }
export const VARSAYILAN_BAG: BagGorunumu = { renk: 'altin', zemin: false, kalin: false, alti: true };

export function bagGorunumuGecerli(x: unknown): x is BagGorunumu {
  if (!x || typeof x !== 'object') return false;
  const g = x as Record<string, unknown>;
  return BAG_RENKLERI.some((r) => r.kod === g.renk) && typeof g.zemin === 'boolean' && typeof g.kalin === 'boolean' && typeof g.alti === 'boolean'
    && Object.keys(g).length === 4;
}

export const bagVarsayilanMi = (g: BagGorunumu) =>
  g.renk === VARSAYILAN_BAG.renk && g.zemin === VARSAYILAN_BAG.zemin && g.kalin === VARSAYILAN_BAG.kalin && g.alti === VARSAYILAN_BAG.alti;

/** Bir öğeye konacak işaretler; stil.css bunlara göre boyar. */
export const bagIsaretleri = (g: BagGorunumu) => ({
  'data-bag-renk': g.renk, 'data-bag-zemin': g.zemin ? '1' : '0', 'data-bag-kalin': g.kalin ? '1' : '0', 'data-bag-alti': g.alti ? '1' : '0',
});

export function bagGorunumuOku(v: string | undefined | null): BagGorunumu | null {
  if (!v) return null;
  try { const g = JSON.parse(v) as unknown; return bagGorunumuGecerli(g) ? g : null; } catch { return null; }
}
