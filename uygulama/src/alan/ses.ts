// Ses değişim kuralları (§15-4): "A → B / sol_sağ". Kurallar sırayla uygulanır; her kural sözcüğün özgün hâline
// bakarak bütün uygun yerlerde aynı anda uygular (soldan sağa, çakışmasız). Büyük harf bir ses sınıfıdır (V, C ya da
// yazarın tanımladığı), [ptk] adsız sınıftır, # sözcük sınırıdır, ∅ ya da 0 boş demektir. Sınıftan sınıfa kural
// sıraya göre eşler: [ptk] → [bdg]. Program yalnızca yazılan kuralı uygular; hangi kuralın neyi değiştirdiğini döker.

export interface SesSinifi { ad: string; harfler: string }
export interface SesIzi { sira: number; kural: string; once: string; sonra: string }

type Ogeler = { tur: 'harf'; d: string } | { tur: 'sinif'; harfler: string[] } | { tur: 'sinir' };
interface Kural { a: Ogeler[]; b: Ogeler[]; sol: Ogeler[]; sag: Ogeler[] }

export const VARSAYILAN_SINIFLAR: SesSinifi[] = [
  { ad: 'V', harfler: 'aeıioöuüâîû' },
  { ad: 'C', harfler: 'bcçdfgğhjklmnprsştvyzqwx' },
];

const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');
const harfler = (s: string) => Array.from(s);

function siniflar(tanimli: SesSinifi[]) {
  const m = new Map<string, string[]>();
  for (const s of [...VARSAYILAN_SINIFLAR, ...tanimli]) m.set(s.ad, harfler(kucuk(s.harfler.replace(/[\s,]/g, ''))));
  return m;
}

function ogelere(p: string, s: Map<string, string[]>, yer: string): Ogeler[] {
  const l: Ogeler[] = [];
  const c = harfler(p.replace(/\s+/g, ''));
  for (let i = 0; i < c.length; i++) {
    const h = c[i];
    if (h === '∅' || h === '0') continue;
    if (h === '#') { l.push({ tur: 'sinir' }); continue; }
    if (h === '[') {
      const j = c.indexOf(']', i);
      if (j < 0) throw new Error(`${yer}: “[” kapanmamış.`);
      const icerik = c.slice(i + 1, j).map(kucuk);
      if (!icerik.length) throw new Error(`${yer}: boş köşeli ayraç.`);
      l.push({ tur: 'sinif', harfler: icerik });
      i = j;
      continue;
    }
    if (']_/>→'.includes(h)) throw new Error(`${yer}: beklenmeyen “${h}”.`);
    const buyuk = h !== kucuk(h);
    if (buyuk) {
      const x = s.get(h);
      if (!x) throw new Error(`${yer}: “${h}” ses sınıfı tanımlı değil.`);
      l.push({ tur: 'sinif', harfler: x });
    } else l.push({ tur: 'harf', d: h });
  }
  return l;
}

export function kuralCoz(metin: string, tanimli: SesSinifi[] = []): Kural {
  const s = siniflar(tanimli);
  const m = metin.trim().match(/^(.*?)\s*(?:→|->|>)\s*(.*?)\s*(?:\/\s*(.*))?$/);
  if (!m) throw new Error('Kural “a → b / bağlam” biçiminde olmalı.');
  const [, ac, bc, baglam] = m;
  const a = ogelere(ac, s, 'Sol taraf');
  const b = ogelere(bc, s, 'Sağ taraf');
  if (a.some((x) => x.tur === 'sinir') || b.some((x) => x.tur === 'sinir')) throw new Error('Sözcük sınırı (#) yalnızca bağlamda kullanılır.');
  if (b.some((x) => x.tur === 'sinif')) {
    const tek = b.length === 1 && a.length === 1 && a[0].tur === 'sinif' && b[0].tur === 'sinif';
    if (!tek || (a[0] as { harfler: string[] }).harfler.length !== (b[0] as { harfler: string[] }).harfler.length) throw new Error('Sınıftan sınıfa kural iki yanda eşit uzunlukta birer sınıf ister.');
  }
  let sol: Ogeler[] = [], sag: Ogeler[] = [];
  if (baglam !== undefined) {
    const parca = baglam.split('_');
    if (parca.length !== 2) throw new Error('Bağlamda tek bir “_” olmalı: sol_sağ.');
    sol = ogelere(parca[0], s, 'Bağlam');
    sag = ogelere(parca[1], s, 'Bağlam');
    if (sol.slice(1).some((x) => x.tur === 'sinir') || sag.slice(0, -1).some((x) => x.tur === 'sinir')) throw new Error('Sözcük sınırı (#) bağlamın yalnızca ucunda olabilir.');
  }
  if (!a.length && baglam === undefined) throw new Error('Boştan ekleme kuralı bir bağlam ister.');
  return { a, b, sol, sag };
}

const uyar = (o: Ogeler, h: string | undefined) => h !== undefined && (o.tur === 'harf' ? o.d === h : o.tur === 'sinif' ? o.harfler.includes(h) : false);

function solTutar(k: Kural, w: string[], i: number) {
  let j = i - 1;
  for (let n = k.sol.length - 1; n >= 0; n--) {
    const o = k.sol[n];
    if (o.tur === 'sinir') { if (j !== -1) return false; continue; }
    if (!uyar(o, w[j])) return false;
    j--;
  }
  return true;
}
function sagTutar(k: Kural, w: string[], i: number) {
  let j = i;
  for (const o of k.sag) {
    if (o.tur === 'sinir') { if (j !== w.length) return false; continue; }
    if (!uyar(o, w[j])) return false;
    j++;
  }
  return true;
}

function kuralUygula(k: Kural, w: string[]): string[] {
  const out: string[] = [];
  const yeni = (eslesen: string[]) => {
    if (k.b.length === 1 && k.b[0].tur === 'sinif' && k.a[0]?.tur === 'sinif') return [k.b[0].harfler[k.a[0].harfler.indexOf(eslesen[0])]];
    return k.b.map((x) => (x as { d: string }).d);
  };
  if (!k.a.length) {
    for (let i = 0; i <= w.length; i++) {
      if (solTutar(k, w, i) && sagTutar(k, w, i)) out.push(...yeni([]));
      if (i < w.length) out.push(w[i]);
    }
    return out;
  }
  let i = 0;
  while (i < w.length) {
    const n = k.a.length;
    const tutar = i + n <= w.length && k.a.every((o, j) => uyar(o, w[i + j])) && solTutar(k, w, i) && sagTutar(k, w, i + n);
    if (tutar) { out.push(...yeni(w.slice(i, i + n))); i += n; } else { out.push(w[i]); i++; }
  }
  return out;
}

/** Sözcüğe kuralları sırayla uygular; yalnızca bir şey değiştiren kurallar ize girer. */
export function sesDegistir(sozcuk: string, kurallar: string[], tanimli: SesSinifi[] = []): { sonuc: string; iz: SesIzi[]; hatalar: { sira: number; hata: string }[] } {
  const ilkBuyuk = sozcuk.length > 0 && Array.from(sozcuk)[0] !== kucuk(Array.from(sozcuk)[0]);
  let w = harfler(kucuk(sozcuk.trim()));
  const iz: SesIzi[] = [];
  const hatalar: { sira: number; hata: string }[] = [];
  kurallar.forEach((metin, sira) => {
    if (!metin.trim()) return;
    let k: Kural;
    try { k = kuralCoz(metin, tanimli); } catch (e) { hatalar.push({ sira, hata: (e as Error).message }); return; }
    const once = w.join('');
    w = kuralUygula(k, w);
    const sonra = w.join('');
    if (once !== sonra) iz.push({ sira, kural: metin.trim(), once, sonra });
  });
  let sonuc = w.join('');
  if (ilkBuyuk && sonuc) sonuc = Array.from(sonuc)[0].toLocaleUpperCase('tr-TR') + Array.from(sonuc).slice(1).join('');
  return { sonuc, iz, hatalar };
}
