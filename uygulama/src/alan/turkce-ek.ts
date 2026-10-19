// Türkçe ek modülü (§5.1). Kök bulma ve ek uyumu aynı kural tablosunu kullanır: ünlü uyumu, ünsüz
// benzeşmesi (Velkar'da / Kaelet'te), kaynaştırma harfi (Velkar'ı / Ela'yı), ünsüz yumuşaması ve ünlü
// düşmesi. Uydurma adlar okunduğu gibi ek alır; okunuş verilmemişse yazımdan tahmin edilir.
import { katla } from './turkce';
import { turBul } from './turler';

const KALIN = new Set(['a', 'ı', 'o', 'u']);
const YUVARLAK = new Set(['o', 'u', 'ö', 'ü']);
const UNLU = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü']);
const SERT = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p']);
/** Türkçede olmayan ama okunuşu tahmin edilebilen harfler. Bunlar kullanılınca tahmin "kesin değil" sayılır. */
const YABANCI_UNLU: Record<string, string> = { 'â': 'a', 'î': 'i', 'û': 'u', 'ä': 'e', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'á': 'a', 'à': 'a', 'å': 'o', 'ø': 'ö', 'œ': 'ö', 'í': 'i', 'ì': 'i', 'ï': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ú': 'u', 'ù': 'u', 'ý': 'i', 'æ': 'e' };

export interface Ses {
  /** Son ünlü (Türkçe harfle); yoksa null. */
  sonUnlu: string | null;
  /** Ünlüyle mi bitiyor? */
  unluyleBiter: boolean;
  /** Sert ünsüzle mi bitiyor? */
  sertleBiter: boolean;
  /** Tahmin güvenilir mi? Değilse yazara okunuşu sorulur (§6.1). */
  kesin: boolean;
}

/** Bir adın (ya da okunuşunun) ek alırken nasıl davrandığı. */
export function sesBilgisi(ad: string): Ses {
  const kelime = ad.trim().toLocaleLowerCase('tr-TR').split(/\s+/).pop() ?? '';
  let kesin = /^[\p{L}]+$/u.test(kelime) && kelime.length > 0;
  const harfler: string[] = [];
  for (const h of kelime.normalize('NFC')) {
    if (UNLU.has(h) || /[a-zçğışöü]/.test(h)) harfler.push(h);
    else if (YABANCI_UNLU[h]) { harfler.push(YABANCI_UNLU[h]); kesin = false; }
    else if (/\p{L}/u.test(h)) { kesin = false; }
  }
  // Türkçe sözcükte bulunmayan harfler (w, x, q) okunuşu belirsizleştirir.
  if (/[wxq]/.test(kelime)) kesin = false;
  let sonUnlu: string | null = null;
  for (let i = harfler.length - 1; i >= 0; i--) if (UNLU.has(harfler[i])) { sonUnlu = harfler[i]; break; }
  if (!sonUnlu) kesin = false;
  const son = harfler[harfler.length - 1] ?? '';
  return { sonUnlu, unluyleBiter: UNLU.has(son), sertleBiter: SERT.has(son), kesin };
}

// Ek kalıbı birimleri: A (a/e), I (ı/i/u/ü), D (d/t), C (c/ç), kaynaştırma (y/n/s yalnızca ünlüden sonra), düz harf.
type Birim = { t: 'A' } | { t: 'I' } | { t: 'D' } | { t: 'C' } | { t: 'K'; h: 'y' | 'n' | 's' } | { t: 'H'; h: string };

/** Bir adın ardındaki ek dizisini ("'dan", "'ın", "'yla", "'dakiler") kalıba çevirir. */
export function ekKalibi(onceki: Ses, ek: string): Birim[] {
  const s = ek.toLocaleLowerCase('tr-TR');
  const b: Birim[] = [];
  let i = 0;
  const unluMu = (c: string | undefined) => !!c && UNLU.has(c);
  if (onceki.unluyleBiter) {
    if ((s[0] === 'y' || s[0] === 'n' || s[0] === 's') && unluMu(s[1])) { b.push({ t: 'K', h: s[0] as 'y' | 'n' | 's' }); i = 1; }
    else if (s[0] === 'y' && s[1] === 'l' && unluMu(s[2])) { b.push({ t: 'K', h: 'y' }); i = 1; }
  } else if (unluMu(s[0])) {
    // Ünsüzden sonra kaynaştırma görünmez; hangisi olduğu ekin kendisinden anlaşılır: -(n)In ilgi, öbürleri -(y).
    b.push({ t: 'K', h: /^[ıiuü]n(?![aeıioöuü])/.test(s) ? 'n' : 'y' });
  } else if (s[0] === 'l' && unluMu(s[1]) && s[2] !== 'r') {
    b.push({ t: 'K', h: 'y' }); // -(y)lA: Velkar'la / Ela'yla
  }
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === 'k' && s[i + 1] === 'i' && b.length && b[b.length - 1].t === 'A') { b.push({ t: 'H', h: 'k' }, { t: 'H', h: 'i' }); i++; continue; } // -ki değişmez
    if (c === 'a' || c === 'e') b.push({ t: 'A' });
    else if (c === 'ı' || c === 'i' || c === 'u' || c === 'ü') b.push({ t: 'I' });
    else if (c === 'd' || c === 't') b.push({ t: 'D' });
    else if (c === 'c' || c === 'ç') b.push({ t: 'C' });
    else b.push({ t: 'H', h: c });
  }
  return b;
}

/** Kalıbı yeni adın sesine göre yazar. */
export function ekYaz(ses: Ses, kalip: Birim[]): string {
  let unlu = ses.sonUnlu ?? 'e';
  let unluSonra = ses.unluyleBiter;
  let sert = ses.sertleBiter;
  let s = '';
  const koy = (h: string) => {
    s += h;
    if (UNLU.has(h)) { unlu = h; unluSonra = true; sert = false; }
    else { unluSonra = false; sert = SERT.has(h); }
  };
  for (const b of kalip) {
    switch (b.t) {
      case 'K': if (unluSonra) koy(b.h); break;
      case 'A': koy(KALIN.has(unlu) ? 'a' : 'e'); break;
      case 'I': koy(KALIN.has(unlu) ? (YUVARLAK.has(unlu) ? 'u' : 'ı') : (YUVARLAK.has(unlu) ? 'ü' : 'i')); break;
      case 'D': koy(sert ? 't' : 'd'); break;
      case 'C': koy(sert ? 'ç' : 'c'); break;
      case 'H': koy(b.h); break;
    }
  }
  return s;
}

const KESME = /^(.*?)(['’])([\p{L}]+)$/u;

/**
 * Bağlantının görünen ifadesinde adı değiştirir ve kesmeden sonraki eki yeni ada uydurur.
 * "Velkar'dan" + Elin → "Elin'den". İfade eski adla başlamıyorsa null döner (değiştirilmez).
 */
export function adDegistir(gorunen: string, eskiAd: string, yeniAd: string, eskiOkunus = '', yeniOkunus = ''): string | null {
  const m = gorunen.match(KESME);
  const govde = m ? m[1] : gorunen;
  if (katla(govde) !== katla(eskiAd)) return null;
  if (!m) return yeniAd;
  const kalip = ekKalibi(sesBilgisi(eskiOkunus || eskiAd), m[3]);
  return yeniAd + m[2] + ekYaz(sesBilgisi(yeniOkunus || yeniAd), kalip);
}

// ---------- Kök bulma ----------
// Katlanmış (Türkçe harfsiz) biçim üzerinde çalışır; aday kökler kayıt adlarıyla karşılaştırılır.
const EKLER = [
  'dakiler', 'takiler', 'daki', 'deki', 'taki', 'teki',
  'lardan', 'lerden', 'larda', 'lerde', 'lari', 'leri', 'larin', 'lerin', 'lar', 'ler',
  'ndan', 'nden', 'nda', 'nde', 'nin', 'nun', 'yla', 'yle', 'dan', 'den', 'tan', 'ten',
  'nca', 'nce', 'ca', 'ce', 'da', 'de', 'ta', 'te', 'in', 'un', 'yi', 'yu', 'ya', 'ye', 'la', 'le',
  'si', 'su', 'ni', 'nu', 'na', 'ne', 'im', 'um', 'i', 'u', 'a', 'e', 'm', 'n',
];
const UNSUZ = /[bcdfghjklmnpqrstvwxyz]/;
const YUMUSAMA: Record<string, string> = { g: 'k', b: 'p', d: 't' }; // ğ → k (katlanmış g), c ve ç aynı katlanır

/**
 * Çekimli bir ifadeden olası kökler (katlanmış), en az ek atılandan başlayarak.
 * "kuzey kılıcıyla" → ["kuzey kilicilya"…, "kuzey kilici", "kuzey kilic", …].
 */
export function kokAdaylari(ifade: string, derinlik = 3): string[] {
  const temiz = katla(ifade.replace(/['’]/g, '')).replace(/\s+/g, ' ').trim();
  const sonuc: string[] = [];
  const ekle = (x: string) => { if (x.length >= 2 && !sonuc.includes(x)) sonuc.push(x); };
  ekle(temiz);
  // Kesmeli yazım: ek kesmeden sonradır, kök kesmeden öncesidir.
  const kesme = katla(ifade).match(/^(.*?)['’][\p{L}]+$/u);
  if (kesme) ekle(kesme[1].trim());
  let katman = [temiz];
  for (let d = 0; d < derinlik; d++) {
    const sonraki: string[] = [];
    for (const k of katman) {
      for (const ek of EKLER) {
        if (!k.endsWith(ek) || k.length - ek.length < 2) continue;
        const kok = k.slice(0, -ek.length);
        if (/\s$/.test(kok)) continue;
        sonraki.push(kok);
        ekle(kok);
        const son = kok[kok.length - 1];
        if (YUMUSAMA[son]) ekle(kok.slice(0, -1) + YUMUSAMA[son]);
        // Ünlü düşmesi: ağzı → ağz → ağız; şehri → şehr → şehir
        if (UNSUZ.test(son) && UNSUZ.test(kok[kok.length - 2] ?? '')) {
          for (const u of ['i', 'u', 'a', 'e']) ekle(kok.slice(0, -1) + u + son);
        }
      }
    }
    katman = sonraki;
  }
  return sonuc;
}

function turAyrilma(tur: string): string {
  const gorunen = turBul(tur).ad;
  const parca = gorunen === 'Diğer' ? 'kayıt' : gorunen.split(/\s+(?:\/|ve)\s+/)[0].trim().toLocaleLowerCase('tr-TR');
  const ilkSes = sesBilgisi(parca);
  let iyelikli: string;
  if (/\s/.test(parca) && /[ıiuü]$/.test(parca)) iyelikli = parca;
  else if (parca === 'şehir') iyelikli = 'şehri';
  else if (parca === 'kayıt') iyelikli = 'kaydı';
  else if (parca.endsWith('k')) iyelikli = parca.slice(0, -1) + 'ğ' + ekYaz(ilkSes, ekKalibi(ilkSes, 'i'));
  else if (parca.endsWith('ç')) iyelikli = parca.slice(0, -1) + 'c' + ekYaz(ilkSes, ekKalibi(ilkSes, 'i'));
  else iyelikli = parca + ekYaz(ilkSes, ekKalibi(ilkSes, ilkSes.unluyleBiter ? 'si' : 'i'));
  const sonSes = sesBilgisi(iyelikli);
  return `${iyelikli}n${ekYaz(sonSes, ekKalibi(sonSes, 'dan'))}`;
}

/**
 * Göreli tarih ifadesinde dayanak adının ayrılma durumu ("Tufan'dan", "“Kuzey Kapısı” olayından").
 * İyelik belirsizliği varsa ("Büyük Kapı" / "Kuzey Kapısı", "Kralın ölümü") tahmin etmez; tür adıyla nötr yazar (§5.1).
 */
export function ayrilmaYazisi(ad: string, tur = 'olay', okunus = ''): string {
  const temiz = ad.trim().replace(/\s+/g, ' ');
  const parcalar = temiz.split(' ');
  const ses = sesBilgisi(okunus || temiz);
  const ozelAd = parcalar.length > 0 && parcalar.every((p) => /^\p{Lu}/u.test(p));
  const sonHarf = temiz.toLocaleLowerCase('tr-TR').slice(-1);
  const iyelikBelirsiz = parcalar.length > 1 && ['ı', 'i', 'u', 'ü'].includes(sonHarf);
  if (ozelAd && ses.kesin && !iyelikBelirsiz) {
    return `${temiz}'${ekYaz(ses, ekKalibi(ses, 'dan'))}`;
  }
  return `“${temiz}” ${turAyrilma(tur)}`;
}
