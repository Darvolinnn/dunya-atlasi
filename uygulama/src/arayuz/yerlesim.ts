// Görünümlerin çizim yerleşimi. Belirlenimcidir: aynı veri her açılışta aynı resmi verir. Çakışmasız çizim
// vaat edilmez (§7); amaç okunabilir bir başlangıçtır, yazar odaklanarak ve dal kapatarak sadeleştirir.
import type { AgKenari, SoyAgaci } from '../veri/api';

export interface Nokta { x: number; y: number }

// ---------- Soy ağacı ----------
export const SOY_EN = 150, SOY_BOY = 44, SOY_ARA = 28, SOY_KAT = 90;

export interface SoyYerlesimi {
  konum: Map<string, Nokta>;
  /** Kuşak: odak 0, ebeveynler −1, çocuklar +1. */
  kusak: Map<string, number>;
  /** Kapalı dalın arkasında kalan (çizilmeyen) akraba sayısı. */
  gizli: Map<string, number>;
  kenarlar: AgKenari[];
  genislik: number; yukseklik: number; solUst: Nokta;
}

/**
 * Kuşaklar odaktan genişlik öncelikli dolaşımla bulunur (ebeveyn bir üst, çocuk bir alt, eş ve kardeş aynı
 * kuşak). Kapalı bir kaydın ötesine geçilmez. Kuşak içindeki sıra ebeveyn ve çocukların ortalama yerine göre
 * birkaç turda düzeltilir; eşler yan yana konur.
 */
export function soyYerlesimi(t: SoyAgaci, kapali: ReadonlySet<string>): SoyYerlesimi {
  const komsu = new Map<string, { o: string; fark: number; k: AgKenari }[]>();
  const ekle = (x: string, o: string, fark: number, k: AgKenari) => komsu.set(x, [...(komsu.get(x) ?? []), { o, fark, k }]);
  for (const k of t.kenarlar) {
    if (k.tur === 'ebeveyn') { ekle(k.a, k.b, 1, k); ekle(k.b, k.a, -1, k); }
    else { ekle(k.a, k.b, 0, k); ekle(k.b, k.a, 0, k); }
  }
  const kusak = new Map<string, number>([[t.odak, 0]]);
  const sira: string[] = [t.odak];
  const kuyruk = [t.odak];
  while (kuyruk.length) {
    const x = kuyruk.shift()!;
    if (x !== t.odak && kapali.has(x)) continue;
    for (const { o, fark } of komsu.get(x) ?? []) {
      if (kusak.has(o)) continue;
      kusak.set(o, kusak.get(x)! + fark);
      sira.push(o); kuyruk.push(o);
    }
  }
  const gizli = new Map<string, number>();
  for (const x of kapali) {
    if (!kusak.has(x) || x === t.odak) continue;
    // Bu kayıttan, başka görünür kayıttan geçmeden ulaşılabilen ve görünmeyen akrabalar.
    const g = new Set<string>(); const y = [x];
    while (y.length) { const u = y.pop()!; for (const { o } of komsu.get(u) ?? []) if (!kusak.has(o) && !g.has(o)) { g.add(o); y.push(o); } }
    if (g.size) gizli.set(x, g.size);
  }
  const kenarlar = t.kenarlar.filter((k) => kusak.has(k.a) && kusak.has(k.b));

  const katlar = new Map<number, string[]>();
  for (const x of sira) { const g = kusak.get(x)!; katlar.set(g, [...(katlar.get(g) ?? []), x]); }
  const sirasi = new Map<string, number>();
  const yenile = () => { for (const l of katlar.values()) l.forEach((x, i) => sirasi.set(x, i - (l.length - 1) / 2)); };
  yenile();
  const ortalama = (x: string, fark: number) => {
    const l = (komsu.get(x) ?? []).filter((n) => n.fark === fark && sirasi.has(n.o)).map((n) => sirasi.get(n.o)!);
    return l.length ? l.reduce((a, b) => a + b, 0) / l.length : null;
  };
  const kusaklar = [...katlar.keys()].sort((a, b) => a - b);
  for (let tur = 0; tur < 4; tur++) {
    const yon = tur % 2 === 0 ? kusaklar : [...kusaklar].reverse();
    for (const g of yon) {
      const l = katlar.get(g)!;
      const fark = tur % 2 === 0 ? -1 : 1;
      const anahtar = new Map(l.map((x) => [x, ortalama(x, fark) ?? sirasi.get(x)!]));
      l.sort((a, b) => anahtar.get(a)! - anahtar.get(b)! || sira.indexOf(a) - sira.indexOf(b));
      // Eşler yan yana: her kaydın ilk eşi hemen arkasına alınır.
      const yerlesti = new Set<string>(); const yeni: string[] = [];
      for (const x of l) {
        if (yerlesti.has(x)) continue;
        yeni.push(x); yerlesti.add(x);
        for (const { o, k } of komsu.get(x) ?? []) if (k.tur === 'es' && kusak.get(o) === g && !yerlesti.has(o)) { yeni.push(o); yerlesti.add(o); }
      }
      katlar.set(g, yeni);
      yenile();
    }
  }
  const konum = new Map<string, Nokta>();
  let minX = Infinity, maxX = -Infinity;
  for (const [g, l] of katlar) l.forEach((x, i) => {
    const px = (i - (l.length - 1) / 2) * (SOY_EN + SOY_ARA);
    konum.set(x, { x: px, y: g * (SOY_BOY + SOY_KAT) });
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
  });
  const gMin = Math.min(...kusaklar), gMax = Math.max(...kusaklar);
  const pay = 40;
  return {
    konum, kusak, gizli, kenarlar,
    solUst: { x: minX - SOY_EN / 2 - pay, y: gMin * (SOY_BOY + SOY_KAT) - SOY_BOY / 2 - pay },
    genislik: maxX - minX + SOY_EN + 2 * pay,
    yukseklik: (gMax - gMin) * (SOY_BOY + SOY_KAT) + SOY_BOY + 2 * pay,
  };
}

// ---------- Ağ: kuvvet yerleşimi ----------
/**
 * Fruchterman–Reingold yerleşimi; başlangıç yerleri sıraya göre bir çember üzerindedir, rastgelelik yoktur.
 * Merkez verilirse ortada sabit kalır ve başlangıçta komşuları ona yakın konur.
 */
export function kuvvetYerlesimi(kodlar: string[], kenarlar: { a: string; b: string }[], merkez: string | null = null, adim = 200): Map<string, Nokta> {
  const n = kodlar.length;
  const konum = new Map<string, Nokta>();
  if (!n) return konum;
  const alan = 900 * 900;
  const k = Math.max(70, Math.min(130, Math.sqrt(alan / n) * 0.6));
  // Merkezden uzaklığa göre halkalar.
  const komsu = new Map<string, string[]>();
  for (const e of kenarlar) { komsu.set(e.a, [...(komsu.get(e.a) ?? []), e.b]); komsu.set(e.b, [...(komsu.get(e.b) ?? []), e.a]); }
  const derinlik = new Map<string, number>();
  if (merkez) {
    derinlik.set(merkez, 0); const q = [merkez];
    while (q.length) { const x = q.shift()!; for (const o of komsu.get(x) ?? []) if (!derinlik.has(o)) { derinlik.set(o, derinlik.get(x)! + 1); q.push(o); } }
  }
  kodlar.forEach((x, i) => {
    const aci = (2 * Math.PI * i) / n;
    const r = merkez ? (x === merkez ? 0 : (derinlik.get(x) ?? 3) * k) : 300;
    konum.set(x, { x: Math.cos(aci) * r, y: Math.sin(aci) * r });
  });
  if (n === 1) return konum;
  let sicaklik = 120;
  const soguma = sicaklik / (adim + 1);
  const yer = kodlar.map((x) => konum.get(x)!);
  const indeks = new Map(kodlar.map((x, i) => [x, i]));
  const iz = kenarlar.map((e) => [indeks.get(e.a), indeks.get(e.b)]).filter((x): x is [number, number] => x[0] !== undefined && x[1] !== undefined && x[0] !== x[1]);
  const dx = new Float64Array(n), dy = new Float64Array(n);
  for (let s = 0; s < adim; s++) {
    dx.fill(0); dy.fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let ax = yer[i].x - yer[j].x, ay = yer[i].y - yer[j].y;
      let d2 = ax * ax + ay * ay;
      if (d2 < 0.01) { ax = 0.1 * ((i % 3) - 1 || 1); ay = 0.1; d2 = ax * ax + ay * ay; }
      const f = (k * k) / d2;
      dx[i] += ax * f; dy[i] += ay * f; dx[j] -= ax * f; dy[j] -= ay * f;
    }
    for (const [i, j] of iz) {
      const ax = yer[i].x - yer[j].x, ay = yer[i].y - yer[j].y;
      const d = Math.sqrt(ax * ax + ay * ay) || 0.1;
      const f = d / k;
      dx[i] -= ax * f; dy[i] -= ay * f; dx[j] += ax * f; dy[j] += ay * f;
    }
    for (let i = 0; i < n; i++) {
      // Merkezsiz görünümde kopuk parçalar uzaklaşmasın diye hafif bir çekim.
      dx[i] -= yer[i].x * 0.01; dy[i] -= yer[i].y * 0.01;
      if (kodlar[i] === merkez) continue;
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const m = Math.min(d, sicaklik);
      yer[i] = { x: yer[i].x + (dx[i] / d) * m, y: yer[i].y + (dy[i] / d) * m };
    }
    sicaklik -= soguma;
  }
  kodlar.forEach((x, i) => konum.set(x, yer[i]));
  return konum;
}
