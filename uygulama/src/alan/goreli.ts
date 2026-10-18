// Göreli kronoloji çözücü (§15 araç 1, §3.4). "Tufan'dan 80–120 yıl sonra, ama kralın ölümünden önce" gibi
// kısıtlar bir zamansal kısıt ağı olarak çözülür: her tarih eksende bir noktadır, her kısıt iki nokta arasındaki
// farkın sınırıdır, kesin tarihler başlangıç noktasına göre sınırdır. En kısa yollar her noktanın olası en erken ve
// en geç yerini verir; ağdaki eksi döngü çelişen kısıt zinciridir. Desteklenen kısıtlar: bir olaydan önce ya da
// sonra, isteğe bağlı gün ya da yıl farkıyla (tek değer ya da aralık). "Ya önce ya sonra" gibi seçmeli kısıtlar
// desteklenmez. Gösterilen zincirin en küçük çelişki kümesi olduğu vaat edilmez.
import { farkParcasi, type EvrenTarihi, type Takvim } from './tarih';

export interface GoreliSonuc { eksen: { enErken: number | null; enGec: number | null } | null; celiski: string[] | null }

interface Kenar { u: number; v: number; w: number; kayit: string }

/**
 * `tarihler`: çözüme giren kayıtlar (göreli olanlar ve dayanakları; kodlar yönlendirmesi çözülmüş). Yalnızca göreli
 * tarihlerin sonucu döner; kesin tarihler yazarın sözüdür ve değiştirilmez.
 */
export function goreliCoz(tarihler: Map<string, EvrenTarihi | null>, ana: Takvim, kod: (k: string) => string = (k) => k): Map<string, GoreliSonuc> {
  const kodlar = [...tarihler.keys()];
  const sira = new Map(kodlar.map((k, i) => [k, i + 1]));
  const n = kodlar.length + 1; // 0: eksenin başlangıcı
  const kenarlar: Kenar[] = [];
  const ekle = (u: number, v: number, w: number, kayit: string) => kenarlar.push({ u, v, w, kayit });
  for (const [k, t] of tarihler) {
    const i = sira.get(k)!;
    if (!t) continue;
    if (t.bicim === 'goreli') {
      for (const x of t.kisitlar ?? []) {
        const j = sira.get(kod(x.olay));
        if (j === undefined || j === i) continue;
        const d = farkParcasi(x, ana);
        // sonra: d1 ≤ T − X ≤ d2 · önce: d1 ≤ X − T ≤ d2 · miktarsız: T − X ≥ 1 ya da X − T ≥ 1
        const [a, b] = x.yon === 'sonra' ? [j, i] : [i, j];
        if (d) { ekle(a, b, d[1], k); ekle(b, a, -d[0], k); } else ekle(b, a, -1, k);
      }
    } else if (t.eksen) {
      if (t.eksen.enGec !== null) ekle(0, i, t.eksen.enGec, k);
      if (t.eksen.enErken !== null) ekle(i, 0, -t.eksen.enErken, k);
    }
  }

  // Bağlı bileşenler: çelişki yalnızca kendi bileşenindeki tarihleri etkiler.
  const ust = Array.from({ length: n }, (_, i) => i);
  const bul = (x: number): number => (ust[x] === x ? x : (ust[x] = bul(ust[x])));
  for (const e of kenarlar) if (e.u && e.v) ust[bul(e.u)] = bul(e.v);

  // Eksi döngü: her yerden sıfırla başlayan Bellman–Ford.
  const d0 = new Array(n).fill(0), onceki: (Kenar | null)[] = new Array(n).fill(null);
  let son = -1;
  for (let tur = 0; tur < n; tur++) {
    son = -1;
    for (const e of kenarlar) if (d0[e.u] + e.w < d0[e.v]) { d0[e.v] = d0[e.u] + e.w; onceki[e.v] = e; son = e.v; }
    if (son < 0) break;
  }
  const celisenBilesen = new Map<number, string[]>();
  if (son >= 0) {
    // Döngüye girene kadar geri yürü, sonra döngüyü topla.
    let x = son;
    for (let i = 0; i < n && onceki[x]; i++) x = onceki[x]!.u;
    const zincir: string[] = [];
    let y = x;
    for (let i = 0; i <= n && onceki[y]; i++) {
      const e = onceki[y]!;
      if (!zincir.includes(e.kayit)) zincir.unshift(e.kayit);
      y = e.u;
      if (y === x) break;
    }
    const bilesenler = new Set(zincir.map((k) => bul(sira.get(k)!)));
    // Döngü başlangıç noktasından geçiyorsa (iki kesin tarihle çelişki) zincirdeki kayıtların bileşenleri işaretlenir.
    for (const b of bilesenler) celisenBilesen.set(b, zincir);
  }

  const enKisa = (ters: boolean) => {
    const d = new Array(n).fill(Infinity);
    d[0] = 0;
    for (let tur = 0; tur < n; tur++) {
      let degisti = false;
      for (const e of kenarlar) {
        const [u, v] = ters ? [e.v, e.u] : [e.u, e.v];
        if (d[u] + e.w < d[v]) { d[v] = d[u] + e.w; degisti = true; }
      }
      if (!degisti) break;
    }
    return d;
  };
  const sonuc = new Map<string, GoreliSonuc>();
  const celiskiVar = celisenBilesen.size > 0;
  // Çelişkili bileşenler çıkarılınca kalanlar ayrıca çözülür.
  const temiz = celiskiVar ? new Map([...tarihler].filter(([x]) => !celisenBilesen.has(bul(sira.get(x)!)))) : null;
  const kalan = temiz && temiz.size < tarihler.size ? goreliCoz(temiz, ana, kod) : null;
  const ileri = celiskiVar ? null : enKisa(false), geri = celiskiVar ? null : enKisa(true);
  for (const [k, t] of tarihler) {
    if (t?.bicim !== 'goreli') continue;
    const i = sira.get(k)!;
    const c = celisenBilesen.get(bul(i));
    if (c) { sonuc.set(k, { eksen: null, celiski: c }); continue; }
    if (celiskiVar) { sonuc.set(k, kalan?.get(k) ?? { eksen: null, celiski: null }); continue; }
    const enGec = Number.isFinite(ileri![i]) ? ileri![i] : null;
    const enErken = Number.isFinite(geri![i]) ? -geri![i] : null;
    sonuc.set(k, { eksen: enErken === null && enGec === null ? null : { enErken, enGec }, celiski: null });
  }
  return sonuc;
}
