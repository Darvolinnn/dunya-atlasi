// Bağlantısız geçen adlar (K29, §5.1). Metinde bir kaydın adı, lakabı ya da önceki adı bağlantısız geçiyorsa yazara
// gösterilir; program kendiliğinden bağlamaz. Anlam çıkarılmaz (K1): yalnız adın kendisine ve Türkçe ekli biçimine
// (ek modülü) bakılır. Büyük-küçük harf ve Türkçe harfler ayırt edilmez; yalnız büyük harfle başlayan bir ad metinde
// küçük harfle yazılmışsa önerilmez ("Deniz" adı ile "deniz kıyısı" karışmasın). Kelimenin ortasında eşleşmez.
import { katla } from './turkce';
import { kokAdaylari } from './turkce-ek';

/** Bir kaydın aranacak bir adı (ad, lakap ya da önceki ad). */
export interface AranacakAd { kod: string; ifade: string }
/** Metnin bir paragrafı: düz yazısı ve her harfin bir bağlantının içinde olup olmadığı. */
export interface MetinBlogu { metin: string; bagli: boolean[] }
export interface BagsizAd {
  /** Bu ifadeyle eşleşen kayıtlar (aynı adı taşıyan birden çok kayıt olabilir). */
  kodlar: string[];
  /** Metinde geçtiği biçim ("Deniz'in"). */
  ifade: string;
  blok: number; bas: number; son: number;
  /** Geçtiği cümle (gösterim ve "bu sefer değil" için). */
  cumle: string;
}

const KELIME = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)?/gu;
const buyukMu = (c: string) => c !== c.toLocaleLowerCase('tr-TR');

interface Hazir { kod: string; parcalar: string[]; buyuk: boolean }

/** Adları ilk kelimelerine göre dizinler; ikiden kısa adlar ("Al") aranmaz. */
function hazirla(adlar: AranacakAd[]): Map<string, Hazir[]> {
  const m = new Map<string, Hazir[]>();
  for (const a of adlar) {
    const ifade = a.ifade.trim().replace(/\s+/g, ' ');
    const parcalar = katla(ifade).split(' ').filter(Boolean);
    if (!parcalar.length || parcalar.join(' ').length < 3) continue;
    const h = { kod: a.kod, parcalar, buyuk: buyukMu(ifade[0]) };
    m.set(parcalar[0], [...(m.get(parcalar[0]) ?? []), h]);
  }
  // Uzun adlar önce denensin ("Başkent Arşivi", "Başkent"ten önce).
  for (const l of m.values()) l.sort((x, y) => y.parcalar.length - x.parcalar.length);
  return m;
}

/** Kelimenin katlanmış hâli ve çekimden atılmış kök adayları. */
const kokler = (kelime: string) => new Set([katla(kelime.replace(/['’]/g, '')), ...kokAdaylari(kelime)]);

function cumleBul(metin: string, bas: number, son: number): string {
  let a = bas, z = son;
  while (a > 0 && !/[.!?…\n]/.test(metin[a - 1])) a--;
  while (z < metin.length && !/[.!?…\n]/.test(metin[z])) z++;
  const c = metin.slice(a, Math.min(z + 1, metin.length)).trim();
  return c.length > 160 ? (bas - a > 80 ? '…' : '') + metin.slice(Math.max(a, bas - 70), Math.min(z + 1, son + 70)).trim() + '…' : c;
}

/** "Bu sefer değil" için bir yerin kimliği: metin, hedef ve cümle (cümle değişince yeniden önerilir). */
export function yerAnahtari(kayit: string, kod: string, cumle: string): string {
  const s = `${kayit}|${kod}|${katla(cumle)}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * Bloklardaki bağlantısız ad geçişleri, metin sırasıyla. `haric` kodlarındaki kayıtlar aranmaz (metnin kendi kaydı,
 * "bu adı hiç önerme" denenler). En çok `sinir` sonuç döner.
 */
export function bagsizAdlar(bloklar: MetinBlogu[], adlar: AranacakAd[], haric: ReadonlySet<string> = new Set(), sinir = 50): BagsizAd[] {
  const dizin = hazirla(adlar.filter((a) => !haric.has(a.kod)));
  const sonuc: BagsizAd[] = [];
  bloklar.forEach((b, bi) => {
    const kelimeler = [...b.metin.matchAll(KELIME)].map((m) => ({ yazi: m[0], bas: m.index!, son: m.index! + m[0].length, katli: katla(m[0]) }));
    for (let i = 0; i < kelimeler.length && sonuc.length < sinir; i++) {
      const ilk = kelimeler[i];
      // İlk kelime tek kelimelik bir adsa çekimli olabilir; çok kelimelilerde yalnız son kelime çekim alır.
      const adaylar = new Set<Hazir>();
      for (const k of kokler(ilk.yazi)) for (const h of dizin.get(k) ?? []) if (h.parcalar.length === 1) adaylar.add(h);
      for (const h of dizin.get(ilk.katli) ?? []) adaylar.add(h);
      let eslesen: { h: Hazir[]; n: number } | null = null;
      for (const h of [...adaylar].sort((x, y) => y.parcalar.length - x.parcalar.length)) {
        const n = h.parcalar.length;
        if (eslesen && n < eslesen.n) break;
        if (i + n > kelimeler.length) continue;
        let tamam = true;
        for (let j = 0; j < n - 1 && tamam; j++) tamam = kelimeler[i + j].katli === h.parcalar[j];
        if (!tamam || !kokler(kelimeler[i + n - 1].yazi).has(h.parcalar[n - 1])) continue;
        if (h.buyuk && !buyukMu(ilk.yazi[0])) continue;
        // Kelime arasında yalnız boşluk olmalı (satır, noktalama ya da başka harf değil).
        if (n > 1 && kelimeler.slice(i + 1, i + n).some((k, j) => !/^ +$/.test(b.metin.slice(kelimeler[i + j].son, k.bas)))) continue;
        eslesen = eslesen && eslesen.n === n ? { h: [...eslesen.h, h], n } : { h: [h], n };
      }
      if (!eslesen) continue;
      const bas = ilk.bas, son = kelimeler[i + eslesen.n - 1].son;
      i += eslesen.n - 1;
      if (b.bagli.slice(bas, son).some(Boolean)) continue;
      sonuc.push({ kodlar: [...new Set(eslesen.h.map((x) => x.kod))], ifade: b.metin.slice(bas, son), blok: bi, bas, son, cumle: cumleBul(b.metin, bas, son) });
    }
  });
  return sonuc;
}
