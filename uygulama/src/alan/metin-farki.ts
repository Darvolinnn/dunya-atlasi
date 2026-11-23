// Sürüm farkı (K38, §10.8). İki metnin paragrafları önce bütün olarak eşlenir (aynı kalanlar çapadır); aradaki
// değişen paragraflar sırayla eşleşir ve içleri sözcük sözcük karşılaştırılır. Yalnız görünüş içindir: hangi
// paragrafın "aynı paragraf" olduğu program tarafından anlamca çıkarılmaz (K1), sırayla eşlenir.

export type FarkParcasi = { tur: 'ayni' | 'ekle' | 'sil'; metin: string };
export type ParagrafFarki =
  | { tur: 'ayni'; eski: number; yeni: number; metin: string }
  | { tur: 'degisti'; eski: number; yeni: number; parcalar: FarkParcasi[] }
  | { tur: 'eklendi'; yeni: number; metin: string }
  /** `yer`: şimdiki metinde geri konacağı sıra (o sıradaki paragrafın önüne). */
  | { tur: 'silindi'; eski: number; yer: number; metin: string };

const EN_COK_HUCRE = 4_000_000;

/** En uzun ortak alt dizi: eşleşen (i, j) çiftleri sırayla. Çok büyükse boş (hepsi değişmiş sayılır). */
function ortak<T>(a: readonly T[], b: readonly T[]): [number, number][] {
  const n = a.length, m = b.length;
  if (!n || !m || n * m > EN_COK_HUCRE) return [];
  const t = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    t[i * (m + 1) + j] = a[i] === b[j] ? t[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(t[(i + 1) * (m + 1) + j], t[i * (m + 1) + j + 1]);
  const l: [number, number][] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { l.push([i, j]); i++; j++; }
    else if (t[(i + 1) * (m + 1) + j] >= t[i * (m + 1) + j + 1]) i++;
    else j++;
  }
  return l;
}

const sozcukler = (s: string) => s.match(/^\s+|\S+\s*/g) ?? [];

/** İki paragrafın sözcük farkı; ardışık aynı türler birleşir. */
export function sozcukFarki(eski: string, yeni: string): FarkParcasi[] {
  const a = sozcukler(eski), b = sozcukler(yeni);
  const es = ortak(a, b);
  const l: FarkParcasi[] = [];
  const ekle = (tur: FarkParcasi['tur'], metin: string) => {
    if (!metin) return;
    const son = l[l.length - 1];
    if (son?.tur === tur) son.metin += metin; else l.push({ tur, metin });
  };
  let i = 0, j = 0;
  for (const [x, y] of [...es, [a.length, b.length] as [number, number]]) {
    ekle('sil', a.slice(i, x).join('')); ekle('ekle', b.slice(j, y).join(''));
    if (x < a.length) ekle('ayni', a[x]);
    i = x + 1; j = y + 1;
  }
  return l;
}

/** Eski ve yeni metnin paragraf listelerinden fark. */
export function metinFarki(eski: readonly string[], yeni: readonly string[]): ParagrafFarki[] {
  const es = ortak(eski, yeni);
  const l: ParagrafFarki[] = [];
  let i = 0, j = 0;
  for (const [x, y] of [...es, [eski.length, yeni.length] as [number, number]]) {
    const n = Math.min(x - i, y - j);
    for (let k = 0; k < n; k++) l.push({ tur: 'degisti', eski: i + k, yeni: j + k, parcalar: sozcukFarki(eski[i + k], yeni[j + k]) });
    for (let k = j + n; k < y; k++) l.push({ tur: 'eklendi', yeni: k, metin: yeni[k] });
    for (let k = i + n; k < x; k++) l.push({ tur: 'silindi', eski: k, yer: y, metin: eski[k] });
    if (x < eski.length) l.push({ tur: 'ayni', eski: x, yeni: y, metin: eski[x] });
    i = x + 1; j = y + 1;
  }
  return l;
}
