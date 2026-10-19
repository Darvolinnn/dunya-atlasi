// Evren tarihi (§3.4, K12). Her tarih iki biçimde saklanır: yazarın girdiği ifade ve kanonik eksende
// [en erken, en geç] aralığı. Eksenin birimi günün bir parçasıdır (bir gün GUN_PARCA parça), böylece gün
// bölümleri de aynı eksende durur. Evrenin bir ana takvimi vardır (eksen onunla sayılır); paralel takvimler ana
// takvime bir başlangıç eşlemesiyle bağlanır, eşleme bilinmiyorsa tarihleri ana eksene çevrilmez (Z7). Çağlar
// yılların adlandırılmış bölümleridir. Zaman akışındaki tarih ana eksene oranla çevrilir (Z18). Takvim değişince
// eksen ifadeden yeniden hesaplanır; ifade hiç değişmez.
import { katla } from './turkce';

export interface Ay { ad: string; gun: number }
/** ilkAy > sonAy ise mevsim yılın sonundan ertesi yıla taşar (Kış: 12. aydan 2. aya). Aylar 0'dan sayılır. */
export interface Mevsim { ad: string; ilkAy: number; sonAy: number }
/**
 * Çağ: yılların adlandırılmış bölümü ("Üçüncü Çağ 412"). `baslangic` takvimin düz yıl sayısında çağın 1. yılıdır.
 * Geri sayan çağ ("Kuruluş öncesi 30") başlangıcından geriye doğru sayılır ve ilk ileri sayan çağdan önce gelir.
 */
export interface Cag { ad: string; baslangic: number; ters?: boolean }
export interface Takvim {
  kod: string; surum: number;
  /** Yıl sayısının önündeki ad ("Yıl 412", "Döngü 412"). */
  ad: string;
  /** Ay tanımlı değilse yılın gün sayısı; aylar varsa ayların toplamıdır. */
  yilGun: number;
  aylar?: Ay[]; gunBolumleri?: string[]; mevsimler?: Mevsim[]; caglar?: Cag[];
}

/** Ana takvimin yanındaki takvim (bir kültürün, kurumun ya da boyutun takvimi). */
export interface ParalelTakvim extends Takvim {
  /** "Bu takvimin {yil}. yılının ilk günü, ana takvimde {ana}." Yoksa tarihleri ana eksene çevrilmez (Z7). */
  cap: { yil: number; ana: string } | null;
  /** Bağlı olduğu kayıt (mekân, kültür, kurum, boyut); yalnızca bilgi. */
  bagli: string | null;
}

/** Zaman akışında bir dönemin oranı: akışta geçen `akis` gün, ana akışta `ana` gün (aralık olabilir); null bilinmiyor. */
export interface AkisOrani { bas: string | null; akis: number; ana: [number, number] | null }
/** Zamanın kendine özgü hızla aktığı kapsam (§3.4): Fey Boyutu, bir rüya alemi. */
export interface Akis {
  kod: string; ad: string; bagli: string | null;
  /** Akışın 1. gününün başladığı ana takvim tarihi. */
  cap: string;
  /** İlk dönemin `bas` değeri null'dır (akışın başı); sonrakiler ana takvimde geçiş tarihidir. */
  oranlar: AkisOrani[];
}

/** Evrenin bütün zaman tanımları: tarih okunurken ve gösterilirken birlikte kullanılır. */
export interface ZamanSeti { ana: Takvim; diger: ParalelTakvim[]; akislar: Akis[] }
export type TakvimYa = Takvim | ZamanSeti;
export const setMi = (x: TakvimYa): x is ZamanSeti => 'ana' in x && 'diger' in x;
export const anaTakvim = (x: TakvimYa): Takvim => (setMi(x) ? x.ana : x);

/** Bir olaya göre fark (§3.4 göreli ve çapalı tarih). Miktar yoksa yalnızca önce–sonra. */
export interface Fark { yon: 'once' | 'sonra'; en: number | null; cok: number | null; birim: 'gun' | 'yil' }
/** Göreli tarihin bir kısıtı: "Tufan'dan 80–120 yıl sonra". */
export interface Kisit extends Fark { olay: string }
export const VARSAYILAN_TAKVIM: Takvim = { kod: 'varsayilan', surum: 1, ad: 'Yıl', yilGun: 365 };
/** Bir günün eksendeki parça sayısı; gün bölümleri bu parçaları paylaşır. */
export const GUN_PARCA = 1440;

export type TarihBicimi = 'kesin' | 'yaklasik' | 'aralik' | 'once' | 'sonra' | 'bilinmiyor' | 'sembolik' | 'goreli';
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
  /** Paralel takvimde ya da zaman akışında yazılmış tarihin kendi sayımındaki yeri. */
  yerel?: { enErken: number | null; enGec: number | null } | null;
  /** Zaman akışı kodu; yoksa ana akış. */
  akis?: string;
  /** Göreli tarihin kısıtları; eksen bunlardan hesaplanır (göreli kronoloji çözücü). */
  kisitlar?: Kisit[];
  /** Kısıtlar birbiriyle çelişiyorsa çelişen zincirdeki kayıtlar. */
  celiski?: string[];
  /** Yalnızca gösterim için: çelişen kayıtların bugünkü adları. Saklanmaz. */
  celiskiAdlari?: string[];
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
function takvimliCoz(ham: string, t: Takvim, yd: (n: number) => number): { enErken: number; enGec: number; hassasiyet: Hassasiyet } | 'sembolik' | null {
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
  yil = yd(yil);

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

/** Ad ifadede ayrı bir söz olarak (ekiyle birlikte) geçiyorsa adın çıkarıldığı kalan; geçmiyorsa null. */
function adAyikla(k: string, ad: string): string | null {
  const a = ad.toLocaleLowerCase('tr-TR').trim();
  if (!a) return null;
  const m = k.match(new RegExp(`(^|[^\\p{L}\\p{N}])${kacis(a)}(?:['’]?\\p{L}*)?(?=$|[^\\p{L}\\p{N}])`, 'u'));
  return m ? (k.slice(0, m.index! + m[1].length) + ' ' + k.slice(m.index! + m[0].length)).replace(/\s+/g, ' ').trim() : null;
}

const cagdanYil = (c: Cag, n: number) => (c.ters ? c.baslangic - n + 1 : c.baslangic + n - 1);

/** Takvimin düz yıl sayısındaki yılın çağı ve çağ içindeki sırası; çağ tanımlı değilse null. */
export function cagYili(y: number, t: Takvim): { cag: Cag; n: number } | null {
  const c = t.caglar ?? [];
  const ileri = c.filter((x) => !x.ters).sort((a, b) => b.baslangic - a.baslangic).find((x) => y >= x.baslangic);
  if (ileri) return { cag: ileri, n: y - ileri.baslangic + 1 };
  const ters = c.find((x) => x.ters);
  if (ters && y <= ters.baslangic) return { cag: ters, n: ters.baslangic - y + 1 };
  return null;
}
/** Yılın okunuşu: "Üçüncü Çağ 412" ya da "Yıl 412". */
export function yilYazisi(y: number, t: Takvim): string {
  const c = cagYili(y, t);
  return c ? `${c.cag.ad} ${c.n}` : `${t.ad} ${y}`;
}

/** Yazarın ifadesini çözer. Çözülemeyen ifade kaybolmaz: sembolik kalır (eksen yok). */
export function tarihCoz(ifade: string, t: TakvimYa = VARSAYILAN_TAKVIM): EvrenTarihi | null {
  return setMi(t) ? setleCoz(ifade, t) : tekCoz(ifade, t);
}

function tekCoz(ifade: string, t: Takvim): EvrenTarihi | null {
  const ham = ifade.replace(/\s+/g, ' ').trim();
  if (!ham) return null;
  let k = ham.toLocaleLowerCase('tr-TR');
  const temel = { ifade: ham, takvim: t.kod, takvimSurumu: t.surum };
  // Çağ adı geçiyorsa yıllar o çağın içinde sayılır ("Üçüncü Çağ 412", "Kuruluş öncesi 30").
  let cag: Cag | null = null;
  for (const c of [...(t.caglar ?? [])].sort((a, b) => b.ad.length - a.ad.length)) {
    const kalan = adAyikla(k, c.ad);
    if (kalan !== null) { cag = c; k = kalan; break; }
  }
  const yd = (n: number) => (cag ? cagdanYil(cag, n) : n);
  const sembolik: EvrenTarihi = { ...temel, bicim: 'sembolik', hassasiyet: null, eksen: null };
  if (/^(bilinmiyor|bilinmez|\?)$/.test(k)) return { ...temel, bicim: 'bilinmiyor', hassasiyet: null, eksen: null };
  let m = k.match(new RegExp(`^${SAYI}\\s*(?:[-–—]|ile)\\s*${SAYI}(?:\\s+(?:arası|arasında))?$`));
  if (m) {
    const [a, b] = [yd(Number(m[1])), yd(Number(m[2]))].sort((x, y) => x - y);
    return { ...temel, bicim: 'aralik', hassasiyet: 'yil', eksen: { enErken: yilBas(a, t), enGec: yilSon(b, t) } };
  }
  m = k.match(new RegExp(`^(?:yaklaşık|aşağı yukarı|~|≈|takriben|tahminen)\\s*${SAYI}(?:\\s*(?:±|\\+-|\\+/-)\\s*(\\d{1,5}))?$`))
    ?? k.match(new RegExp(`^${SAYI}\\s*(?:civarı|sularında|dolayları|dolaylarında)(?:\\s*(?:±|\\+-)\\s*(\\d{1,5}))?$`));
  if (m) {
    const y = yd(Number(m[1]));
    const pay = m[2] !== undefined ? Number(m[2]) : VARSAYILAN_PAY;
    return { ...temel, bicim: 'yaklasik', hassasiyet: 'yil', pay, eksen: { enErken: yilBas(y - pay, t), enGec: yilSon(y + pay, t) } };
  }
  m = k.match(new RegExp(`^${SAYI}(?:['’]?(?:den|dan|ten|tan))?\\s+(önce|öncesi|sonra|sonrası|ve öncesi|ve sonrası)$`));
  if (m) {
    const y = yd(Number(m[1]));
    const once = m[2].includes('önce');
    const dahil = m[2].startsWith('ve');
    return once
      ? { ...temel, bicim: 'once', hassasiyet: 'yil', eksen: { enErken: null, enGec: dahil ? yilSon(y, t) : yilBas(y, t) - 1 } }
      : { ...temel, bicim: 'sonra', hassasiyet: 'yil', eksen: { enErken: dahil ? yilBas(y, t) : yilSon(y, t) + 1, enGec: null } };
  }
  const ayrinti = takvimliCoz(cag ? k : ham, t, yd);
  if (ayrinti === 'sembolik') return sembolik;
  if (ayrinti) return { ...temel, bicim: 'kesin', hassasiyet: ayrinti.hassasiyet, eksen: { enErken: ayrinti.enErken, enGec: ayrinti.enGec } };
  // "412", "412 yazı", "Yıl 412", "412'de": yıl düzeyinde kesin; geri kalan ifade yazarın sözü olarak korunur.
  m = k.match(new RegExp(`^(?:(?:yıl|${kacis(t.ad.toLocaleLowerCase('tr-TR'))})\\s+)?${SAYI}(?=$|[\\s'’,.])`));
  // Kalan sözde başka bir sayı varsa ("12 Hasat 412") hangisinin yıl olduğu bilinemez.
  if (m && !/\d/.test(k.slice(m[0].length))) {
    const y = yd(Number(m[1]));
    return { ...temel, bicim: 'kesin', hassasiyet: 'yil', eksen: { enErken: yilBas(y, t), enGec: yilSon(y, t) } };
  }
  return sembolik;
}

/** Paralel takvimin yerel ekseninden ana eksene kayma aralığı [en az, en çok]; eşleme yoksa null (Z7). */
export function takvimKaymasi(p: ParalelTakvim, ana: Takvim): [number, number] | null {
  if (!p.cap) return null;
  const c = tekCoz(p.cap.ana, ana);
  if (!c?.eksen || c.eksen.enErken === null || c.eksen.enGec === null) return null;
  const bas = p.cap.yil * yilParcasi(p);
  return [c.eksen.enErken - bas, gunBasi(c.eksen.enGec) - bas];
}
const gunBasi = (x: number) => Math.floor(x / GUN_PARCA) * GUN_PARCA;

/**
 * Akıştaki yerel konumu (akışın başından beri geçen parça) ana eksene çevirir. Oran aralıksa sonuç da aralıktır;
 * oranı bilinmeyen döneme girilince yalnızca "o dönemin başından sonra" bilinir (Z18).
 */
export function akisEksene(a: Akis, ana: Takvim, l1: number, l2: number): { enErken: number | null; enGec: number | null } | null {
  const cap = tekCoz(a.cap, ana);
  if (!cap?.eksen || cap.eksen.enErken === null || cap.eksen.enGec === null) return null;
  const sinirlar: number[] = [];
  for (let i = 1; i < a.oranlar.length; i++) {
    const b = tekCoz(a.oranlar[i].bas ?? '', ana)?.eksen?.enErken;
    if (b === null || b === undefined) return null;
    sinirlar.push(b);
  }
  const cevir = (L: number, uc: 0 | 1): number | null => {
    let pos = uc === 0 ? cap.eksen!.enErken! : gunBasi(cap.eksen!.enGec!);
    let kalan = L;
    for (let i = 0; i < a.oranlar.length; i++) {
      const o = a.oranlar[i];
      const son = i < sinirlar.length ? sinirlar[i] : Infinity;
      if (son <= pos) continue;
      if (!o.ana) return uc === 0 ? pos : null;
      const r = o.ana[uc] / o.akis;
      const uzunluk = r === 0 ? Infinity : (son - pos) / r;
      if (kalan < uzunluk) return Math.floor(pos + kalan * r);
      kalan -= uzunluk;
      pos = son;
    }
    return uc === 0 ? pos : null;
  };
  const enErken = cevir(l1, 0), enGec = cevir(l2, 1);
  return enErken === null && enGec === null ? null : { enErken, enGec };
}

/** Akış adıyla yazılmış tarih: "Fey 30. gün", "Fey'de 3. yıl". */
function akisCoz(ham: string, kalan: string, a: Akis, ana: Takvim): EvrenTarihi {
  const temel = { ifade: ham, takvim: ana.kod, takvimSurumu: ana.surum, akis: a.kod };
  const m = kalan.match(/^(\d{1,7})\s*\.?\s*(gün|yıl)\p{L}*$/u);
  const n = m ? Number(m[1]) : 0;
  if (!m || n < 1) return { ...temel, bicim: 'sembolik', hassasiyet: null, eksen: null, yerel: null };
  const birim = m[2] === 'yıl' ? yilParcasi(ana) : GUN_PARCA;
  const l1 = (n - 1) * birim, l2 = n * birim - 1;
  return { ...temel, bicim: 'kesin', hassasiyet: m[2] === 'yıl' ? 'yil' : 'gun', yerel: { enErken: l1, enGec: l2 }, eksen: akisEksene(a, ana, l1, l2) };
}

/** Zaman setiyle çözüm: akış adı, paralel takvimin yıl sözü ya da çağı geçiyorsa o; yoksa ana takvim. */
function setleCoz(ifade: string, z: ZamanSeti): EvrenTarihi | null {
  const ham = ifade.replace(/\s+/g, ' ').trim();
  if (!ham) return null;
  const k = ham.toLocaleLowerCase('tr-TR');
  for (const a of z.akislar) {
    const kalan = adAyikla(k, a.ad);
    if (kalan !== null) return akisCoz(ham, kalan, a, z.ana);
  }
  for (const p of z.diger) {
    if (adAyikla(k, p.ad) === null && !(p.caglar ?? []).some((c) => adAyikla(k, c.ad) !== null)) continue;
    const r = tekCoz(ham, p)!;
    const kay = takvimKaymasi(p, z.ana);
    const e = r.eksen;
    const eksen = e && kay ? { enErken: e.enErken === null ? null : e.enErken + kay[0], enGec: e.enGec === null ? null : e.enGec + kay[1] } : null;
    return { ...r, yerel: e, eksen };
  }
  return tekCoz(ham, z.ana);
}

/** Takvim değişince eksen ifadeden yeniden hesaplanır; ifade korunur (§3.4 varsayılan). Göreli tarih çözücüyle hesaplanır. */
export const tarihYenidenHesapla = (t: EvrenTarihi, takvim: TakvimYa) => (t.bicim === 'goreli' ? t : tarihCoz(t.ifade, takvim));

// ---------- Göreli ve çapalı tarih ----------
const FARK = /^(?:(\d{1,7})(?:\s*[-–—]\s*(\d{1,7}))?\s*(gün|yıl)\s+)?(önce|sonra)$/u;
/** "sonra", "14 gün sonra", "80–120 yıl sonra", "300 yıl önce". */
export function farkCoz(s: string): Fark | null {
  const m = String(s ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR').match(FARK);
  if (!m) return null;
  const en = m[1] ? Number(m[1]) : null;
  const cok = m[2] ? Number(m[2]) : en;
  if (en !== null && cok! < en) return null;
  return { yon: m[4] === 'önce' ? 'once' : 'sonra', en, cok, birim: m[3] === 'yıl' ? 'yil' : 'gun' };
}
export const farkYazisi = (f: Fark) =>
  `${f.en === null ? '' : `${f.en === f.cok ? f.en : `${f.en}–${f.cok}`} ${f.birim === 'yil' ? 'yıl' : 'gün'} `}${f.yon === 'once' ? 'önce' : 'sonra'}`;
const sayiMi = (n: unknown) => n === null || (Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 1e7);
export const farkGecerli = (f: unknown): f is Fark => {
  const x = f as Fark;
  return !!x && typeof x === 'object' && (x.yon === 'once' || x.yon === 'sonra') && (x.birim === 'gun' || x.birim === 'yil')
    && sayiMi(x.en) && sayiMi(x.cok) && (x.en === null) === (x.cok === null) && (x.en === null || x.en <= x.cok!);
};
/** Farkın eksendeki karşılığı [en az, en çok]; miktar yoksa null. Yıl ana takvimin yılıdır. */
export function farkParcasi(f: Fark, ana: Takvim): [number, number] | null {
  if (f.en === null || f.cok === null) return null;
  const u = f.birim === 'yil' ? yilParcasi(ana) : GUN_PARCA;
  return [f.en * u, f.cok * u];
}
/** Dayanağın eksenine fark uygulanır: X ∈ [a, b] iken X'ten d sonra [a+d1, b+d2]; miktarsız "sonra" (a, ∞). */
export function kaydir(e: { enErken: number | null; enGec: number | null } | null, f: Fark, ana: Takvim): { enErken: number | null; enGec: number | null } | null {
  if (!e) return null;
  const d = farkParcasi(f, ana);
  const { enErken: a, enGec: b } = e;
  const ekle = (x: number | null, y: number) => (x === null ? null : x + y);
  if (f.yon === 'sonra') return d ? { enErken: ekle(a, d[0]), enGec: ekle(b, d[1]) } : { enErken: ekle(a, 1), enGec: null };
  return d ? { enErken: ekle(a, -d[1]), enGec: ekle(b, -d[0]) } : { enErken: null, enGec: ekle(b, -1) };
}
export const kisitGecerli = (k: unknown): k is Kisit => farkGecerli(k) && typeof (k as Kisit).olay === 'string';
/** Göreli tarih: ifade kısıtların okunuşudur; eksen çözücüden gelir. */
export function goreliTarih(kisitlar: Kisit[], ifade: string, t: Takvim): EvrenTarihi {
  return { ifade, bicim: 'goreli', hassasiyet: kisitlar.some((k) => k.birim === 'yil') ? 'yil' : null, takvim: t.kod, takvimSurumu: t.surum, kisitlar, eksen: null };
}

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

/** Eksendeki bir noktanın yılı (ana takvimde). */
export const eksenYili = (n: number, t: TakvimYa = VARSAYILAN_TAKVIM) => Math.floor(n / yilParcasi(anaTakvim(t)));

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

/** Eksen aralığının okunuşu: tek yıl, yıl aralığı ya da açık uç. */
export function eksenAraligi(e: { enErken: number | null; enGec: number | null } | null | undefined, t: Takvim): string {
  if (!e || (e.enErken === null && e.enGec === null)) return 'yeri bilinmiyor';
  const y = (n: number) => yilYazisi(eksenYili(n, t), t);
  if (e.enErken !== null && e.enGec !== null) {
    if (Math.floor(e.enErken / GUN_PARCA) === Math.floor(e.enGec / GUN_PARCA) && t.aylar?.length) return tekAciklama({ ifade: '', bicim: 'kesin', hassasiyet: 'gun', takvim: t.kod, takvimSurumu: t.surum, eksen: e }, t);
    const a = y(e.enErken), b = y(e.enGec);
    return a === b ? a : `${a} ile ${b} arası`;
  }
  return e.enErken !== null ? `${y(e.enErken)} ve sonrası` : `${y(e.enGec!)} ve öncesi`;
}

/** Ekranda gösterilecek açıklama: ifade nasıl anlaşıldı. Zaman setiyle paralel takvim ve akış tarihleri de okunur. */
export function tarihAciklamasi(t: EvrenTarihi, x: TakvimYa = VARSAYILAN_TAKVIM): string {
  const ana = anaTakvim(x);
  if (t.bicim === 'goreli') {
    if (t.celiski?.length) return 'Kısıtlar birbiriyle çelişiyor, olası bir tarih yok';
    if (!t.eksen || (t.eksen.enErken === null && t.eksen.enGec === null)) return 'Yalnızca göreli sırası biliniyor';
    return `Olası: ${eksenAraligi(t.eksen, ana)}`;
  }
  if (t.akis) {
    const a = setMi(x) ? x.akislar.find((y) => y.kod === t.akis) : undefined;
    const ad = a?.ad ?? 'Akış';
    if (!t.yerel || t.yerel.enErken === null) return `${ad}: akış içindeki yeri okunamadı (ör. “${ad} 30. gün”)`;
    const yerel = t.hassasiyet === 'yil' ? `${Math.floor(t.yerel.enErken / yilParcasi(ana)) + 1}. yılı` : `${Math.floor(t.yerel.enErken / GUN_PARCA) + 1}. günü`;
    return `${ad} akışının ${yerel}. Ana akışta ${t.eksen ? eksenAraligi(t.eksen, ana) : 'yeri hesaplanamıyor (başlangıç ya da oran eksik)'}`;
  }
  if (setMi(x) && t.takvim !== ana.kod) {
    const p = x.diger.find((y) => y.kod === t.takvim);
    if (p) {
      const yazi = tekAciklama({ ...t, eksen: t.yerel ?? t.eksen }, p);
      return t.eksen || !t.yerel ? yazi : `${yazi} (ana takvime çevrilemiyor: başlangıç eşlemesi yok)`;
    }
  }
  return tekAciklama(t, ana);
}

/** Tarihin öbür takvimlerdeki karşılıkları (paralel gösterim). Eşleme belirsizse aralık çıkar; uydurulmaz. */
export function paralelYazilar(t: EvrenTarihi, z: ZamanSeti): { takvim: string; yazi: string }[] {
  if (!t.eksen || t.eksen.enErken === null || t.eksen.enGec === null) return [];
  const { enErken: a, enGec: b } = t.eksen;
  const sonuc: { takvim: string; yazi: string }[] = [];
  const liste: [Takvim, [number, number] | null][] = [[z.ana, [0, 0]], ...z.diger.map((p) => [p, takvimKaymasi(p, z.ana)] as [Takvim, [number, number] | null])];
  for (const [tk, kay] of liste) {
    // Tarihin kendi takvimi atlanır (akış ve göreli tarihin açıklaması ana takvimi zaten söyler).
    if (!kay || tk.kod === t.takvim) continue;
    const l1 = a - kay[1], l2 = b - kay[0];
    const tekGun = Math.floor(l1 / GUN_PARCA) === Math.floor(l2 / GUN_PARCA);
    const y1 = Math.floor(l1 / yilParcasi(tk)), y2 = Math.floor(l2 / yilParcasi(tk));
    const yazi = tekGun && tk.aylar?.length && t.hassasiyet !== 'yil' ? tekAciklama({ ...t, bicim: 'kesin', hassasiyet: 'gun', eksen: { enErken: l1, enGec: l2 } }, tk)
      : y1 === y2 ? yilYazisi(y1, tk) : `${yilYazisi(y1, tk)} ile ${yilYazisi(y2, tk)} arası`;
    sonuc.push({ takvim: tk === z.ana ? 'Ana takvim' : tk.ad, yazi });
  }
  return sonuc;
}

function tekAciklama(t: EvrenTarihi, takvim: Takvim): string {
  const y = (g: number) => (takvim.caglar?.length ? yilYazisi(eksenYili(g, takvim), takvim) : String(eksenYili(g, takvim)));
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
        return `${yilYazisi(e.yil, takvim)}, ${mv ?? 'mevsim'}`;
      }
      if (t.hassasiyet === 'ay' && ay) return `${yilYazisi(e.yil, takvim)}, ${ay}`;
      if (t.hassasiyet === 'gun' && ay) return `${yilYazisi(e.yil, takvim)}, ${ay} ayının ${e.gun}. günü`;
      if (t.hassasiyet === 'bolum' && ay) return `${yilYazisi(e.yil, takvim)}, ${ay} ayının ${e.gun}. günü, ${takvim.gunBolumleri?.[e.bolum] ?? ''}`;
      return yilYazisi(e.yil, takvim);
    }
    case 'bilinmiyor': return 'Bilinmiyor';
    case 'sembolik': return 'Takvime çevrilemedi; sıralamada yeri belirsiz';
    case 'goreli': return eksenAraligi(t.eksen, takvim);
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
  const caglar = x.caglar ?? [];
  if (!Array.isArray(caglar) || caglar.length > 20) return false;
  if (caglar.some((c) => !metinMi(c?.ad, 40) || /\d/.test(c.ad) || !Number.isInteger(c.baslangic) || Math.abs(c.baslangic) > 1e7 || (c.ters !== undefined && typeof c.ters !== 'boolean'))) return false;
  const ileri = caglar.filter((c) => !c.ters), ters = caglar.filter((c) => c.ters);
  if (ters.length > 1 || new Set(ileri.map((c) => c.baslangic)).size !== ileri.length) return false;
  if (ters.length && ileri.length && ters[0].baslangic >= Math.min(...ileri.map((c) => c.baslangic))) return false;
  const adlar = [...aylar.map((a) => a.ad), ...bolumler, ...mevsimler.map((m) => m.ad), ...caglar.map((c) => c.ad)].map((a) => katla(a.trim()));
  return new Set(adlar).size === adlar.length;
}

/** Paralel takvim: takvim kuralları, başlangıç eşlemesi ve bağlı kayıt. */
export function paralelGecerli(t: unknown): t is ParalelTakvim {
  if (!takvimGecerli(t)) return false;
  const p = t as ParalelTakvim;
  if (!/^[0-9a-z]{4,40}$/i.test(p.kod) || p.kod === 'ana' || p.kod === VARSAYILAN_TAKVIM.kod) return false;
  if (p.cap !== null && (!p.cap || typeof p.cap !== 'object' || !Number.isInteger(p.cap.yil) || Math.abs(p.cap.yil) > 1e7 || !metinMi(p.cap.ana, 120))) return false;
  return p.bagli === null || (typeof p.bagli === 'string' && p.bagli.length <= 40);
}

/** Zaman akışı: ad, başlangıç ve oran dönemleri. */
export function akisGecerli(a: unknown): a is Akis {
  if (!a || typeof a !== 'object') return false;
  const x = a as Akis;
  if (!/^[0-9a-z]{4,40}$/i.test(x.kod) || !metinMi(x.ad, 60) || /\d/.test(x.ad) || !metinMi(x.cap, 120)) return false;
  if (x.bagli !== null && (typeof x.bagli !== 'string' || x.bagli.length > 40)) return false;
  if (!Array.isArray(x.oranlar) || !x.oranlar.length || x.oranlar.length > 20) return false;
  const sayi = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e6;
  return x.oranlar.every((o, i) => o && (i === 0 ? o.bas === null : metinMi(o.bas, 120)) && sayi(o.akis) && o.akis > 0
    && (o.ana === null || (Array.isArray(o.ana) && o.ana.length === 2 && sayi(o.ana[0]) && sayi(o.ana[1]) && o.ana[0] <= o.ana[1])));
}
