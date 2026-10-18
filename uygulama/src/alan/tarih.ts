// Evren tarihi (§3.4, K12). Her tarih iki biçimde saklanır: yazarın girdiği ifade ve kanonik eksende
// [en erken, en geç] aralığı. Eksenin birimi günün bir parçasıdır (bir gün GUN_PARCA parça), böylece gün
// bölümleri de aynı eksende durur. Evren tek bir takvim tanımlar (aylar, gün bölümleri, mevsimler; paralel
// takvimler ve çağlar aşama 3'tedir). Takvim değişince eksen ifadeden yeniden hesaplanır; ifade hiç değişmez.
import { katla } from './turkce';

export interface Ay { ad: string; gun: number }
/** ilkAy > sonAy ise mevsim yılın sonundan ertesi yıla taşar (Kış: 12. aydan 2. aya). Aylar 0'dan sayılır. */
export interface Mevsim { ad: string; ilkAy: number; sonAy: number }
export interface Takvim {
  kod: string; surum: number;
  /** Yıl sayısının önündeki ad ("Yıl 412", "Döngü 412"). */
  ad: string;
  /** Ay tanımlı değilse yılın gün sayısı; aylar varsa ayların toplamıdır. */
  yilGun: number;
  aylar?: Ay[]; gunBolumleri?: string[]; mevsimler?: Mevsim[];
}
export const VARSAYILAN_TAKVIM: Takvim = { kod: 'varsayilan', surum: 1, ad: 'Yıl', yilGun: 365 };
/** Bir günün eksendeki parça sayısı; gün bölümleri bu parçaları paylaşır. */
export const GUN_PARCA = 1440;

export type TarihBicimi = 'kesin' | 'yaklasik' | 'aralik' | 'once' | 'sonra' | 'bilinmiyor' | 'sembolik';
export type Hassasiyet = 'yil' | 'mevsim' | 'ay' | 'gun' | 'bolum';

export interface EvrenTarihi {
  /** Yazarın ifadesi; görünüm her zaman bundan üretilir. */
  ifade: string;
  bicim: TarihBicimi;
  hassasiyet: Hassasiyet | null;
  takvim: string;
  takvimSurumu: number;
  /** Kanonik eksende parça aralığı; eşlenemiyorsa null. Sonsuz uç null'dır. */
  eksen: { enErken: number | null; enGec: number | null } | null;
  /** Yaklaşık tarihte kabul edilen pay (yıl). Görünür bir varsayımdır. */
  pay?: number;
}

/** Yaklaşık tarihin payı yazılmamışsa bu kadar yıl sayılır ve ekranda söylenir. */
export const VARSAYILAN_PAY = 10;

export const yilGunu = (t: Takvim) => (t.aylar?.length ? t.aylar.reduce((a, x) => a + x.gun, 0) : t.yilGun);
export const yilParcasi = (t: Takvim) => yilGunu(t) * GUN_PARCA;

const SAYI = String.raw`(-?\d{1,7})`;
const yilBas = (y: number, t: Takvim) => y * yilParcasi(t);
const yilSon = (y: number, t: Takvim) => (y + 1) * yilParcasi(t) - 1;
const ayBasGun = (t: Takvim, ay: number) => t.aylar!.slice(0, ay).reduce((a, x) => a + x.gun, 0);
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ad + Türkçe ek ("Hasat'ın", "Hasatta"). Kesme işareti katlamadan önce silinir. */
const EK = String.raw`(?:n?[iu]n|n?[iu]n[dt][ae]|[dt][ae]n?|y?[ae]|s?[iu]|n?[iu])?`;
function adBul(metin: string, adlar: string[]): { i: number; kalan: string } | null {
  const sirali = adlar.map((ad, i) => ({ ad: katla(ad).replace(/['’]/g, ''), i })).filter((x) => x.ad).sort((a, b) => b.ad.length - a.ad.length);
  for (const { ad, i } of sirali) {
    const r = new RegExp(`(^|[^\\p{L}\\p{N}])${kacis(ad)}${EK}(?=$|[^\\p{L}\\p{N}])`, 'u');
    const m = metin.match(r);
    if (m) return { i, kalan: metin.slice(0, m.index! + m[1].length) + ' ' + metin.slice(m.index! + m[0].length) };
  }
  return null;
}

/** Ay, gün, mevsim ve gün bölümü içeren ifade. Çözülemezse null (çağıran sembolik bırakır). */
function takvimliCoz(ham: string, t: Takvim): { enErken: number; enGec: number; hassasiyet: Hassasiyet } | 'sembolik' | null {
  let m = katla(ham).replace(/['’]/g, '');
  const ay = t.aylar?.length ? adBul(m, t.aylar.map((a) => a.ad)) : null;
  if (ay) m = ay.kalan;
  const mevsim = !ay && t.mevsimler?.length ? adBul(m, t.mevsimler.map((x) => x.ad)) : null;
  if (mevsim) m = mevsim.kalan;
  const bolum = t.gunBolumleri?.length ? adBul(m, t.gunBolumleri) : null;
  if (bolum) m = bolum.kalan;
  if (!ay && !mevsim && !bolum) return null;

  let yil: number | null = null, gun: number | null = null;
  const yilEslesme = m.match(new RegExp(`(?:yil|${kacis(katla(t.ad))})\\s*${SAYI}`)) ?? m.match(new RegExp(`${SAYI}\\s*yili`));
  if (yilEslesme) { yil = Number(yilEslesme[1]); m = m.replace(yilEslesme[0], ' '); }
  const gunEslesme = m.match(/(\d{1,4})\s*\.\s*(?:gun\p{L}*)?/u) ?? m.match(/(\d{1,4})\s*gun\p{L}*/u);
  if (gunEslesme) { gun = Number(gunEslesme[1]); m = m.replace(gunEslesme[0], ' '); }
  const sayilar = [...m.matchAll(/-?\d{1,7}/g)].map((x) => Number(x[0]));
  if (yil === null && gun === null && ay && sayilar.length === 2) { gun = sayilar[0]; yil = sayilar[1]; }
  else if (yil === null && sayilar.length === 1) yil = sayilar[0];
  else if (yil === null || sayilar.length) return 'sembolik';
  if (yil === null) return 'sembolik';

  const yp = yilParcasi(t);
  if (ay) {
    const a = t.aylar![ay.i];
    const ayBas = yil * yp + ayBasGun(t, ay.i) * GUN_PARCA;
    if (gun === null) return bolum ? 'sembolik' : { enErken: ayBas, enGec: ayBas + a.gun * GUN_PARCA - 1, hassasiyet: 'ay' };
    if (gun < 1 || gun > a.gun) return 'sembolik';
    const gunBas = ayBas + (gun - 1) * GUN_PARCA;
    if (!bolum) return { enErken: gunBas, enGec: gunBas + GUN_PARCA - 1, hassasiyet: 'gun' };
    const n = t.gunBolumleri!.length;
    return { enErken: gunBas + Math.floor((bolum.i * GUN_PARCA) / n), enGec: gunBas + Math.floor(((bolum.i + 1) * GUN_PARCA) / n) - 1, hassasiyet: 'bolum' };
  }
  if (mevsim && !bolum && gun === null) {
    const x = t.mevsimler![mevsim.i];
    const bas = yil * yp + ayBasGun(t, x.ilkAy) * GUN_PARCA;
    const sonYil = x.ilkAy > x.sonAy ? yil + 1 : yil;
    const son = sonYil * yp + (ayBasGun(t, x.sonAy) + t.aylar![x.sonAy].gun) * GUN_PARCA - 1;
    return { enErken: bas, enGec: son, hassasiyet: 'mevsim' };
  }
  // Gün bölümü ya da gün, ay olmadan yerleştirilemez.
  return 'sembolik';
}

/** Yazarın ifadesini çözer. Çözülemeyen ifade kaybolmaz: sembolik kalır (eksen yok). */
export function tarihCoz(ifade: string, t: Takvim = VARSAYILAN_TAKVIM): EvrenTarihi | null {
  const ham = ifade.replace(/\s+/g, ' ').trim();
  if (!ham) return null;
  const k = ham.toLocaleLowerCase('tr-TR');
  const temel = { ifade: ham, takvim: t.kod, takvimSurumu: t.surum };
  const sembolik: EvrenTarihi = { ...temel, bicim: 'sembolik', hassasiyet: null, eksen: null };
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
  const ayrinti = takvimliCoz(ham, t);
  if (ayrinti === 'sembolik') return sembolik;
  if (ayrinti) return { ...temel, bicim: 'kesin', hassasiyet: ayrinti.hassasiyet, eksen: { enErken: ayrinti.enErken, enGec: ayrinti.enGec } };
  // "412", "412 yazı", "Yıl 412", "412'de": yıl düzeyinde kesin; geri kalan ifade yazarın sözü olarak korunur.
  m = k.match(new RegExp(`^(?:(?:yıl|${kacis(t.ad.toLocaleLowerCase('tr-TR'))})\\s+)?${SAYI}(?=$|[\\s'’,.])`));
  // Kalan sözde başka bir sayı varsa ("12 Hasat 412") hangisinin yıl olduğu bilinemez.
  if (m && !/\d/.test(k.slice(m[0].length))) {
    const y = Number(m[1]);
    return { ...temel, bicim: 'kesin', hassasiyet: 'yil', eksen: { enErken: yilBas(y, t), enGec: yilSon(y, t) } };
  }
  return sembolik;
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

/** Eksendeki bir noktanın yılı. */
export const eksenYili = (n: number, t: Takvim = VARSAYILAN_TAKVIM) => Math.floor(n / yilParcasi(t));

/** Eksendeki noktanın takvimdeki yeri (ay ve gün; aylar tanımlıysa). */
function eksenYeri(n: number, t: Takvim) {
  const yil = eksenYili(n, t);
  const yildaParca = n - yil * yilParcasi(t);
  const gun = Math.floor(yildaParca / GUN_PARCA);
  let ay = 0, kalan = gun;
  while (t.aylar?.length && ay < t.aylar.length - 1 && kalan >= t.aylar[ay].gun) { kalan -= t.aylar[ay].gun; ay++; }
  const n2 = t.gunBolumleri?.length ?? 0;
  const bolum = n2 ? Math.min(n2 - 1, Math.floor(((yildaParca % GUN_PARCA) * n2) / GUN_PARCA)) : 0;
  return { yil, ay, gun: kalan + 1, bolum };
}

/** Ekranda gösterilecek açıklama: ifade nasıl anlaşıldı. */
export function tarihAciklamasi(t: EvrenTarihi, takvim: Takvim = VARSAYILAN_TAKVIM): string {
  const y = (g: number) => eksenYili(g, takvim);
  switch (t.bicim) {
    case 'yaklasik': return `${y(t.eksen!.enErken!)}–${y(t.eksen!.enGec!)} arası sayılıyor (±${t.pay} yıl)`;
    case 'aralik': return `${y(t.eksen!.enErken!)} ile ${y(t.eksen!.enGec!)} arası`;
    case 'once': return `${y(t.eksen!.enGec!)} ve öncesi`;
    case 'sonra': return `${y(t.eksen!.enErken!)} ve sonrası`;
    case 'kesin': {
      const e = eksenYeri(t.eksen!.enErken!, takvim);
      const ay = takvim.aylar?.[e.ay]?.ad;
      if (t.hassasiyet === 'mevsim') {
        const mv = takvim.mevsimler?.find((x) => x.ilkAy === e.ay)?.ad;
        return `${takvim.ad} ${e.yil}, ${mv ?? 'mevsim'}`;
      }
      if (t.hassasiyet === 'ay' && ay) return `${takvim.ad} ${e.yil}, ${ay}`;
      if (t.hassasiyet === 'gun' && ay) return `${takvim.ad} ${e.yil}, ${ay} ayının ${e.gun}. günü`;
      if (t.hassasiyet === 'bolum' && ay) return `${takvim.ad} ${e.yil}, ${ay} ayının ${e.gun}. günü, ${takvim.gunBolumleri?.[e.bolum] ?? ''}`;
      return `${takvim.ad} ${e.yil}`;
    }
    case 'bilinmiyor': return 'Bilinmiyor';
    case 'sembolik': return 'Takvime çevrilemedi; sıralamada yeri belirsiz';
  }
}

/** Sıralama için: en erken uç; eksensiz tarihler sona. */
export const siraAnahtari = (t: EvrenTarihi | null) => t?.eksen ? (t.eksen.enErken ?? -Infinity) : Infinity;

/** Tarih gibi görünen değer mi (alan değerlerinde tarih ayırmak için). */
export const tarihMi = (v: unknown): v is EvrenTarihi =>
  !!v && typeof v === 'object' && typeof (v as EvrenTarihi).ifade === 'string' && typeof (v as EvrenTarihi).bicim === 'string';

const metinMi = (s: unknown, n: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= n;
const tamsayi = (n: unknown, en: number, cok: number) => Number.isInteger(n) && (n as number) >= en && (n as number) <= cok;

/**
 * Takvim tanımı doğru mu. Ay, mevsim ve gün bölümü adları birbirine karışmamalı (tarih okunurken ayırt
 * edilir); adlar sayı içermez.
 */
export function takvimGecerli(t: unknown): t is Takvim {
  if (!t || typeof t !== 'object') return false;
  const x = t as Takvim;
  if (!metinMi(x.ad, 40) || /\d/.test(x.ad) || !tamsayi(x.surum, 1, 1e6) || typeof x.kod !== 'string') return false;
  const aylar = x.aylar ?? [], bolumler = x.gunBolumleri ?? [], mevsimler = x.mevsimler ?? [];
  if (!Array.isArray(aylar) || !Array.isArray(bolumler) || !Array.isArray(mevsimler)) return false;
  if (aylar.length > 40 || bolumler.length > 24 || mevsimler.length > 12) return false;
  if (!aylar.length && !tamsayi(x.yilGun, 1, 100000)) return false;
  if (aylar.some((a) => !metinMi(a?.ad, 40) || /\d/.test(a.ad) || !tamsayi(a.gun, 1, 1000))) return false;
  if (bolumler.some((b) => !metinMi(b, 40) || /\d/.test(b))) return false;
  if (mevsimler.length && !aylar.length) return false;
  if (mevsimler.some((m) => !metinMi(m?.ad, 40) || /\d/.test(m.ad) || !tamsayi(m.ilkAy, 0, aylar.length - 1) || !tamsayi(m.sonAy, 0, aylar.length - 1))) return false;
  const adlar = [...aylar.map((a) => a.ad), ...bolumler, ...mevsimler.map((m) => m.ad)].map((a) => katla(a.trim()));
  return new Set(adlar).size === adlar.length;
}
