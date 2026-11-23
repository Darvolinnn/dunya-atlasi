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

// ——— Katlar ve sahne içi anlar (K38) ———
type Karakter = Extract<YerlesimOgesi, { tur: 'karakter' }>;
type Ses = Extract<YerlesimOgesi, { tur: 'ses' }>;
export interface KarakterAni { kat: string | null; konum: Nokta; yon: number }

/** Bir katın planı ve öğeleri; karakterler yalnız ilk katın listesinde durur, burada çıkarılır. */
export function katYerlesimi(y: SahneYerlesimi, kat: string | null): SahneYerlesimi {
  if (kat === null) return { plan: y.plan, ogeler: y.ogeler.filter((o) => o.tur !== 'karakter') };
  const k = y.ekKatlar?.find((x) => x.kod === kat);
  return k ? { plan: k.plan, ogeler: k.ogeler } : { plan: y.plan, ogeler: [] };
}
export const katAdi = (y: SahneYerlesimi, kat: string | null) => kat === null ? (y.katAdi || 'İlk kat') : y.ekKatlar?.find((k) => k.kod === kat)?.ad ?? 'Kaldırılmış kat';

/** Karakterin n. andaki katı, yeri ve yönü; anı yazılmamışsa önceki anlardaki ya da yerleşimdeki yeri. */
export function karakterAni(y: SahneYerlesimi, k: Karakter, an: number): KarakterAni {
  let d: KarakterAni = { kat: null, konum: k.konum, yon: k.yon };
  for (let i = 0; i <= an && i < (y.anlar?.length ?? 0); i++) { const x = y.anlar![i].konumlar[k.kod]; if (x) d = x; }
  return d;
}

/** Karakterin o andaki hâliyle görüş: farklı kattakiler görülmez. */
export function andaGorur(y: SahneYerlesimi, k: Karakter, an: number, hedef: KarakterAni): boolean {
  const a = karakterAni(y, k, an);
  if (a.kat !== hedef.kat) return false;
  return gorusHatti(katYerlesimi(y, a.kat), { ...k, konum: a.konum, yon: a.yon }, hedef.konum);
}

export interface SesSonucu { ulasir: boolean | null; katDegisimi: number; kalan: number | null }
/**
 * Sesin başka bir kattaki noktaya ulaşması: kaynaktan bir geçide, geçitten öbür kata (her kat değişiminde
 * `katAzaltma` düşülür), oradan hedefe. Her katta o katın engelleri sayılır; uzaklık birimi o katın planının enidir.
 * En az kayıplı yol seçilir. Uzaklık ya da gürültü varsayımı yoksa hesap belirsizdir.
 */
export function sesKatlarArasi(y: SahneYerlesimi, ses: Ses, sesKati: string | null, hedef: { kat: string | null; konum: Nokta }): SesSonucu {
  if (ses.uzaklik === null || !ses.gurultu.trim()) return { ulasir: null, katDegisimi: 0, kalan: null };
  const katKaybi = ses.katAzaltma ?? ses.azaltma;
  const bacak = (kat: string | null, a: Nokta, b: Nokta) => {
    const ky = katYerlesimi(y, kat), p = nokta(ky, a), q = nokta(ky, b);
    return Math.hypot(q.x - p.x, q.y - p.y) + engelSayisi(ky, a, b) * ses.azaltma;
  };
  // Geçitler: her biri iki katı aynı oranlı yerde bağlar.
  const katlar: (string | null)[] = [null, ...(y.ekKatlar ?? []).map((k) => k.kod)];
  const gecitler: { a: string | null; b: string | null; konum: Nokta }[] = [];
  for (const kat of katlar) for (const o of katYerlesimi(y, kat).ogeler) if (o.tur === 'gecit' && o.kat !== kat && katlar.includes(o.kat)) gecitler.push({ a: kat, b: o.kat, konum: o.konum });
  // Dijkstra: düğüm = (kat, nokta); başlangıç kaynak, bitiş hedef.
  type Dugum = { kat: string | null; konum: Nokta; maliyet: number; deg: number };
  const anahtar = (d: { kat: string | null; konum: Nokta }) => `${d.kat}:${d.konum.x}:${d.konum.y}`;
  const en = new Map<string, number>();
  const kuyruk: Dugum[] = [{ kat: sesKati, konum: ses.konum, maliyet: 0, deg: 0 }];
  let iyi: { maliyet: number; deg: number } | null = null;
  while (kuyruk.length) {
    kuyruk.sort((a, b) => a.maliyet - b.maliyet);
    const d = kuyruk.shift()!;
    if (iyi && d.maliyet >= iyi.maliyet) break;
    if ((en.get(anahtar(d)) ?? Infinity) <= d.maliyet && d.maliyet > 0) continue;
    en.set(anahtar(d), d.maliyet);
    if (d.kat === hedef.kat) { const m = d.maliyet + bacak(d.kat, d.konum, hedef.konum); if (!iyi || m < iyi.maliyet) iyi = { maliyet: m, deg: d.deg }; }
    for (const g of gecitler) {
      const ote = g.a === d.kat ? g.b : g.b === d.kat ? g.a : undefined;
      if (ote === undefined) continue;
      kuyruk.push({ kat: ote, konum: g.konum, maliyet: d.maliyet + bacak(d.kat, d.konum, g.konum) + katKaybi, deg: d.deg + 1 });
    }
  }
  if (!iyi) return { ulasir: false, katDegisimi: 0, kalan: null };
  const kalan = ses.uzaklik - iyi.maliyet;
  return { ulasir: kalan >= -EPS, katDegisimi: iyi.deg, kalan };
}
