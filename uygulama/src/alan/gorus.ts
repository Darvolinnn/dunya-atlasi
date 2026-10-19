// Oranlı noktalar saklanır; hesapta y, boy/en ile ölçeklenir. Uzaklık birimi plan enidir.
import type { SahneYerlesimi, YerlesimNoktasi as Nokta, YerlesimOgesi } from '../veri/api';
const EPS = 1e-9;
const capraz = (a: Nokta, b: Nokta, c: Nokta) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const ustunde = (a: Nokta, b: Nokta, p: Nokta) => Math.abs(capraz(a, b, p)) <= EPS && p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;

/** Uçta dokunma ve aynı doğru üzerindeki örtüşme de kesişimdir. */
export function dogrularKesisir(a: Nokta, b: Nokta, c: Nokta, d: Nokta): boolean {
  const u = capraz(a, b, c), v = capraz(a, b, d), w = capraz(c, d, a), z = capraz(c, d, b);
  return ((u > EPS && v < -EPS || u < -EPS && v > EPS) && (w > EPS && z < -EPS || w < -EPS && z > EPS))
    || ustunde(a, b, c) || ustunde(a, b, d) || ustunde(c, d, a) || ustunde(c, d, b);
}

export function aciIcinde(a: Nokta, b: Nokta, yon: number, aci: number): boolean {
  if (Math.hypot(b.x - a.x, b.y - a.y) <= EPS) return true;
  const hedef = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  const fark = ((hedef - yon) % 360 + 540) % 360 - 180;
  return Math.abs(fark) <= aci / 2 + EPS;
}

export const engelMi = (o: YerlesimOgesi) => o.tur === 'duvar' || o.tur === 'siper' || o.tur === 'kapi' && !o.acik;
const nokta = (y: SahneYerlesimi, p: Nokta): Nokta => ({ x: p.x, y: p.y * y.plan.boy / y.plan.en });
export function engelSayisi(y: SahneYerlesimi, a: Nokta, b: Nokta): number {
  return y.ogeler.filter((o) => engelMi(o) && 'a' in o && dogrularKesisir(a, b, o.a, o.b)).length;
}
export function gorusHatti(y: SahneYerlesimi, kisi: Extract<YerlesimOgesi, { tur: 'karakter' }>, hedef: Nokta): boolean {
  const a = nokta(y, kisi.konum), b = nokta(y, hedef);
  return Math.hypot(b.x - a.x, b.y - a.y) <= kisi.uzaklik + EPS && aciIcinde(a, b, kisi.yon, kisi.aci) && engelSayisi(y, kisi.konum, hedef) === 0;
}
/** Metinsel ses düzeyi mesafeye çevrilmez. Uzaklık veya gürültü varsayımı yoksa hesap belirsizdir. */
export function sesUlasir(y: SahneYerlesimi, ses: Extract<YerlesimOgesi, { tur: 'ses' }>, hedef: Nokta): boolean | null {
  if (ses.uzaklik === null || !ses.gurultu.trim()) return null;
  const a = nokta(y, ses.konum), b = nokta(y, hedef);
  const kalan = ses.uzaklik - engelSayisi(y, ses.konum, hedef) * ses.azaltma;
  return kalan >= 0 && Math.hypot(b.x - a.x, b.y - a.y) <= kalan + EPS;
}
