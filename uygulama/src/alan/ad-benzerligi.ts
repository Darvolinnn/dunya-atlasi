// Ad benzerliği (K45): yeni ya da değişen bir ad, evrendeki başka bir kaydın adına çok yakınsa (Alder / Alden) yazara
// tek satırla söylenir; kayıt yine oluşturulur. Anlam çıkarılmaz (K1): yalnız harflere bakılır. Türkçe harfler ve
// büyük-küçük harf ayırt edilmez; harf farkı sayısı adın uzunluğuna göre sınırlıdır.
import { katla } from './turkce';

export interface AdAday { kod: string; ad: string; tur: string }
export interface BenzerAd extends AdAday { neden: 'ayni' | 'yakin' }

/** Yalnız harf ve rakamlar, katlanmış; kelimeler tek boşlukla. */
const sadelestir = (s: string) => (katla(s).match(/[\p{L}\p{N}]+/gu) ?? []).join(' ');

/** İki dizi arasındaki harf farkı: ekleme, silme, değiştirme ve yan yana iki harfin yer değiştirmesi birer farktır. */
export function harfFarki(a: string, b: string, sinir = 3): number {
  if (Math.abs(a.length - b.length) > sinir) return sinir + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let enAz = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const m = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + m);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < enAz) enAz = v;
    }
    if (enAz > sinir) return sinir + 1;
  }
  return d[a.length][b.length];
}

/** Bu uzunluktaki bir adda kaç harf farkı "çok yakın" sayılır: 4 harfe kadar hiç, 5–7 harfte 1, daha uzunda 2. */
const izin = (uzunluk: number) => (uzunluk < 5 ? 0 : uzunluk < 8 ? 1 : 2);

/** Ada çok yakın (ya da aynı) adlı kayıtlar; en çok `sinir` tane, aynı adlılar önce. */
export function benzerAdlar(ad: string, adaylar: readonly AdAday[], sinir = 3): BenzerAd[] {
  const y = sadelestir(ad);
  if (y.replace(/ /g, '').length < 3) return [];
  const ayni: BenzerAd[] = [], yakin: { a: BenzerAd; fark: number }[] = [];
  for (const k of adaylar) {
    const x = sadelestir(k.ad);
    if (!x) continue;
    if (x === y) { ayni.push({ ...k, neden: 'ayni' }); continue; }
    const enKisa = Math.min(x.length, y.length);
    const f = harfFarki(x, y, 2);
    if (f > 0 && f <= izin(enKisa)) { yakin.push({ a: { ...k, neden: 'yakin' }, fark: f }); continue; }
    // Biri tek, öbürü çok kelimeliyse ilk kelimeler de karşılaştırılır ("Kuzey Kapısı" ile "Kuzey Ormanı" karşılaştırılmaz): aynıysa ("Alden Taşçı" ile "Alden") ya da çok yakınsa ("Alder").
    const xi = x.split(' ')[0], yi = y.split(' ')[0];
    const tekVeCok = x.includes(' ') !== y.includes(' ');
    if (tekVeCok && xi === yi && xi.length >= 4) { yakin.push({ a: { ...k, neden: 'yakin' }, fark: 0.5 }); continue; }
    if (tekVeCok && xi !== yi) {
      const fi = harfFarki(xi, yi, 2);
      if (fi > 0 && fi <= izin(Math.min(xi.length, yi.length))) yakin.push({ a: { ...k, neden: 'yakin' }, fark: fi + 0.5 });
    }
  }
  yakin.sort((p, q) => p.fark - q.fark);
  return [...ayni, ...yakin.map((x) => x.a)].slice(0, sinir);
}
