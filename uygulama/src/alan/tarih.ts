// Evren tarihi (§3.4, K12). Her tarih iki biçimde saklanır: yazarın girdiği ifade ve kanonik eksende
// [en erken, en geç] gün aralığı. Özel takvim tanımı aşama 2'dedir; o zamana kadar her evrende tek bir
// varsayılan takvim vardır (yalnızca yıl; bir yıl 365 gün sayılır). Takvim değişince eksen ifadeden
// yeniden hesaplanır; ifade hiç değişmez.

export interface Takvim { kod: string; surum: number; ad: string; yilGun: number }
export const VARSAYILAN_TAKVIM: Takvim = { kod: 'varsayilan', surum: 1, ad: 'Yıl', yilGun: 365 };

export type TarihBicimi = 'kesin' | 'yaklasik' | 'aralik' | 'once' | 'sonra' | 'bilinmiyor' | 'sembolik';

export interface EvrenTarihi {
  /** Yazarın ifadesi; görünüm her zaman bundan üretilir. */
  ifade: string;
  bicim: TarihBicimi;
  hassasiyet: 'yil' | null;
  takvim: string;
  takvimSurumu: number;
  /** Kanonik eksende gün aralığı; eşlenemiyorsa null. Sonsuz uçlar null değil, büyük sayı değil: ayrı bayrak. */
  eksen: { enErken: number | null; enGec: number | null } | null;
  /** Yaklaşık tarihte kabul edilen pay (yıl). Görünür bir varsayımdır. */
  pay?: number;
}

/** Yaklaşık tarihin payı yazılmamışsa bu kadar yıl sayılır ve ekranda söylenir. */
export const VARSAYILAN_PAY = 10;

const SAYI = String.raw`(-?\d{1,7})`;
const yilBas = (y: number, t: Takvim) => y * t.yilGun;
const yilSon = (y: number, t: Takvim) => y * t.yilGun + t.yilGun - 1;

/** Yazarın ifadesini çözer. Çözülemeyen ifade kaybolmaz: sembolik kalır (eksen yok). */
export function tarihCoz(ifade: string, t: Takvim = VARSAYILAN_TAKVIM): EvrenTarihi | null {
  const ham = ifade.replace(/\s+/g, ' ').trim();
  if (!ham) return null;
  const k = ham.toLocaleLowerCase('tr-TR');
  const temel = { ifade: ham, takvim: t.kod, takvimSurumu: t.surum };
  if (/^(bilinmiyor|bilinmez|\?)$/.test(k)) return { ...temel, bicim: 'bilinmiyor', hassasiyet: null, eksen: null };
  let m = k.match(new RegExp(`^${SAYI}\\s*(?:[-–—]|ile)\\s*${SAYI}(?:\\s+(?:arası|arasında))?$`));
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => x - y);
    return { ...temel, bicim: 'aralik', hassasiyet: 'yil', eksen: { enErken: yilBas(a, t), enGec: yilSon(b, t) } };
  }
  m = k.match(new RegExp(`^(?:yaklaşık|aşağı yukarı|~|≈|takriben|tahminen)\\s*${SAYI}(?:\\s*(?:±|\\+-|\\+/-)\\s*(\\d{1,5}))?$`))
    ?? k.match(new RegExp(`^${SAYI}\\s*(?:civarı|sularında|dolayları|dolaylarında)(?:\\s*(?:±|\\+-)\\s*(\\d{1,5}))?$`));
  if (m) {
    const y = Number(m[1]);
    const pay = m[2] !== undefined ? Number(m[2]) : VARSAYILAN_PAY;
    return { ...temel, bicim: 'yaklasik', hassasiyet: 'yil', pay, eksen: { enErken: yilBas(y - pay, t), enGec: yilSon(y + pay, t) } };
  }
  m = k.match(new RegExp(`^${SAYI}(?:['’]?(?:den|dan|ten|tan))?\\s+(önce|öncesi|sonra|sonrası|ve öncesi|ve sonrası)$`));
  if (m) {
    const y = Number(m[1]);
    const once = m[2].includes('önce');
    const dahil = m[2].startsWith('ve');
    return once
      ? { ...temel, bicim: 'once', hassasiyet: 'yil', eksen: { enErken: null, enGec: dahil ? yilSon(y, t) : yilBas(y, t) - 1 } }
      : { ...temel, bicim: 'sonra', hassasiyet: 'yil', eksen: { enErken: dahil ? yilBas(y, t) : yilSon(y, t) + 1, enGec: null } };
  }
  // "412", "412 yazı", "Yıl 412", "412'de": yıl düzeyinde kesin; geri kalan ifade yazarın sözü olarak korunur.
  m = k.match(new RegExp(`^(?:yıl\\s+)?${SAYI}(?=$|[\\s'’,.])`));
  if (m) {
    const y = Number(m[1]);
    return { ...temel, bicim: 'kesin', hassasiyet: 'yil', eksen: { enErken: yilBas(y, t), enGec: yilSon(y, t) } };
  }
  return { ...temel, bicim: 'sembolik', hassasiyet: null, eksen: null };
}

/** Takvim değişince eksen ifadeden yeniden hesaplanır; ifade korunur (§3.4 varsayılan). */
export const tarihYenidenHesapla = (t: EvrenTarihi, takvim: Takvim) => tarihCoz(t.ifade, takvim);

export type Karsilastirma = 'once' | 'sonra' | 'belirsiz';

/**
 * Üç değerli karşılaştırma (§3.4): a, b'den kesin önce mi, kesin sonra mı? Aralıklar örtüşüyorsa,
 * bir tarih eşlenemiyorsa ya da bilinmiyorsa belirsiz.
 */
export function karsilastir(a: EvrenTarihi | null, b: EvrenTarihi | null): Karsilastirma {
  if (!a?.eksen || !b?.eksen) return 'belirsiz';
  const { enErken: a1, enGec: a2 } = a.eksen;
  const { enErken: b1, enGec: b2 } = b.eksen;
  if (a2 !== null && b1 !== null && a2 < b1) return 'once';
  if (a1 !== null && b2 !== null && a1 > b2) return 'sonra';
  return 'belirsiz';
}

/** Ekranda gösterilecek açıklama: ifade ve gerekiyorsa nasıl anlaşıldığı. */
export function tarihAciklamasi(t: EvrenTarihi, takvim: Takvim = VARSAYILAN_TAKVIM): string {
  const y = (g: number) => Math.floor(g / takvim.yilGun);
  switch (t.bicim) {
    case 'yaklasik': return `${y(t.eksen!.enErken!)}–${y(t.eksen!.enGec!)} arası sayılıyor (±${t.pay} yıl)`;
    case 'aralik': return `${y(t.eksen!.enErken!)} ile ${y(t.eksen!.enGec!)} arası`;
    case 'once': return `${y(t.eksen!.enGec!)} ve öncesi`;
    case 'sonra': return `${y(t.eksen!.enErken!)} ve sonrası`;
    case 'kesin': return `Yıl ${y(t.eksen!.enErken!)}`;
    case 'bilinmiyor': return 'Bilinmiyor';
    case 'sembolik': return 'Takvime çevrilemedi; sıralamada yeri belirsiz';
  }
}

/** Sıralama için: en erken uç; eksensiz tarihler sona. */
export const siraAnahtari = (t: EvrenTarihi | null) => t?.eksen ? (t.eksen.enErken ?? -Infinity) : Infinity;
