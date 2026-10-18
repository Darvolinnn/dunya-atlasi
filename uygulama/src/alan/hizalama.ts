// Harita hizalama (§8.5): bir görsel katmanı harita uzayına kontrol noktası çiftleriyle oturtulur.
// 2 çift: taşıma, döndürme, tek oranlı ölçek (benzerlik). 3 ve daha çok çift: genel afin dönüşüm (en küçük kareler);
// her çiftin hatası ayrı verilir. İşaretler uzayda durduğu için oturtma onlara dokunmaz.

/** [a, b, c, d, e, f]: (x, y) → (a·x + c·y + e, b·x + d·y + f). */
export type Donusum = [number, number, number, number, number, number];
export type Nokta = [number, number];
export interface KontrolCifti { gorsel: Nokta; uzay: Nokta }
export interface Hizalama { donusum: Donusum; yontem: 'benzerlik' | 'afin'; hatalar: number[]; ortalama: number }

export const BIRIM: Donusum = [1, 0, 0, 1, 0, 0];

export const uygula = (d: Donusum, [x, y]: Nokta): Nokta => [d[0] * x + d[2] * y + d[4], d[1] * x + d[3] * y + d[5]];

export function ters(d: Donusum): Donusum | null {
  const [a, b, c, dd, e, f] = d;
  const det = a * dd - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  return [dd / det, -b / det, -c / det, a / det, (c * f - dd * e) / det, (b * e - a * f) / det];
}

export const donusumGecerli = (d: unknown): d is Donusum => Array.isArray(d) && d.length === 6 && d.every((x) => typeof x === 'number' && Number.isFinite(x))
  && Math.abs(d[0] * d[3] - d[1] * d[2]) > 1e-9;

/** Eski biçim (x, y, ölçek) dönüşüme çevrilir. */
export const olcektenDonusum = (x: number, y: number, olcek: number): Donusum => [olcek, 0, 0, olcek, x, y];

/** Benzerlik dönüşümü: x' = a·x − b·y + tx, y' = b·x + a·y + ty (en küçük kareler). */
function benzerlik(c: KontrolCifti[]): Donusum | null {
  const n = c.length;
  const gx = c.reduce((s, p) => s + p.gorsel[0], 0) / n, gy = c.reduce((s, p) => s + p.gorsel[1], 0) / n;
  const ux = c.reduce((s, p) => s + p.uzay[0], 0) / n, uy = c.reduce((s, p) => s + p.uzay[1], 0) / n;
  let pay1 = 0, pay2 = 0, payda = 0;
  for (const p of c) {
    const x = p.gorsel[0] - gx, y = p.gorsel[1] - gy, X = p.uzay[0] - ux, Y = p.uzay[1] - uy;
    pay1 += x * X + y * Y; pay2 += x * Y - y * X; payda += x * x + y * y;
  }
  if (payda < 1e-12) return null;
  const a = pay1 / payda, b = pay2 / payda;
  return [a, b, -b, a, ux - a * gx + b * gy, uy - b * gx - a * gy];
}

/** 3×3 doğrusal sistem (Cramer). */
function coz3(m: number[][], v: number[]): number[] | null {
  const det = (x: number[][]) => x[0][0] * (x[1][1] * x[2][2] - x[1][2] * x[2][1]) - x[0][1] * (x[1][0] * x[2][2] - x[1][2] * x[2][0]) + x[0][2] * (x[1][0] * x[2][1] - x[1][1] * x[2][0]);
  const D = det(m);
  if (Math.abs(D) < 1e-9) return null;
  return [0, 1, 2].map((k) => det(m.map((r, i) => r.map((x, j) => (j === k ? v[i] : x)))) / D);
}

/** Afin dönüşüm (en küçük kareler); noktalar aynı doğru üzerindeyse çözülmez. */
function afin(c: KontrolCifti[]): Donusum | null {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bx = [0, 0, 0], by = [0, 0, 0];
  // Sayısal kararlılık için noktalar ortalamaya göre alınır.
  const gx = c.reduce((s, p) => s + p.gorsel[0], 0) / c.length, gy = c.reduce((s, p) => s + p.gorsel[1], 0) / c.length;
  for (const p of c) {
    const r = [p.gorsel[0] - gx, p.gorsel[1] - gy, 1];
    for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += r[i] * r[j]; bx[i] += r[i] * p.uzay[0]; by[i] += r[i] * p.uzay[1]; }
  }
  const x = coz3(A, bx), y = coz3(A, by);
  if (!x || !y) return null;
  // Ortalamaya kaydırılmış çözüm asıl koordinatlara döndürülür.
  return [x[0], y[0], x[1], y[1], x[2] - x[0] * gx - x[1] * gy, y[2] - y[0] * gx - y[1] * gy];
}

export function hizala(ciftler: KontrolCifti[]): Hizalama | null {
  if (ciftler.length < 2) return null;
  let yontem: Hizalama['yontem'] = 'benzerlik';
  let d: Donusum | null = null;
  if (ciftler.length >= 3) { d = afin(ciftler); if (d) yontem = 'afin'; }
  if (!d) d = benzerlik(ciftler);
  if (!d || !donusumGecerli(d)) return null;
  const hatalar = ciftler.map((p) => { const [x, y] = uygula(d!, p.gorsel); return Math.hypot(x - p.uzay[0], y - p.uzay[1]); });
  return { donusum: d, yontem, hatalar, ortalama: hatalar.reduce((s, h) => s + h, 0) / hatalar.length };
}

/**
 * Hatası belirgin biçimde büyük kontrol noktaları: haritanın yeniden çizildiği yer (§8.5). Üç çiftte hata hep sıfırdır;
 * dört ve daha çok çiftte, hatası ortalamanın iki katını ve uzay boyutunun %1'ini aşanlar.
 */
export function buyukHatalar(h: Hizalama, uzayBoyu: number): number[] {
  if (h.hatalar.length < 4) return [];
  return h.hatalar.flatMap((x, i) => (x > 2 * h.ortalama && x > uzayBoyu * 0.01 ? [i] : []));
}
