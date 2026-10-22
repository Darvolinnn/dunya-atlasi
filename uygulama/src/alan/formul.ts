// Kural ve formül dili (TK8, §18.1 "Kural ve formül dili"). Formül hukuk kuralının "kimlere uygulanır" kısmını yazar.
// Yapı taşları: kayıtlı ilişki, seçim ve evet/hayır alanı, tarih alanı, birimli sayı alanı ve yaş; "ve", "veya",
// "değil" ve parantez. Sonuç üç değerlidir (evet · hayır · belirsiz); boş, çelişkili ya da kayıtsız bilgi "hayır"
// sayılmaz. Alan ve kayıt adla yazılır, kodla saklanır. Okunamayan formül kaydedilmez ve hatanın yeri gösterilir;
// sonradan bozulan formül "hesaplanamadı" der, kendiliğinden düzeltilmez. Formül hesap yapmaz, yazıdan anlam çıkarmaz.
import type { SablonAlani } from './sablon';
import type { EvrenTarihi } from './tarih';
import { birimAdi, birimCevir, type SayiDegeri } from './nicelik';
import { katla } from './turkce';

export const FORMUL_DIL_SURUMU = 1;
const EN_UZUN = 1000;
const EN_COK_PARCA = 50;
const EN_DERIN = 30;

/** Formülde yazılabilen ilişkiler; kodlar hukuk koşullarındakiyle aynıdır (§15-11). */
export const FORMUL_ILISKILERI: { kod: string; yazi: string }[] = [
  { kod: 'uye', yazi: 'üyesi' }, { kod: 'kulturu', yazi: 'kültüründen' }, { kod: 'turu', yazi: 'türünden' },
  { kod: 'yurutur', yazi: 'makamını yürüten' }, { kod: 'hizmet', yazi: 'hizmetinde' }, { kod: 'yasar', yazi: 'orada yaşayan' },
];

export type Karsilastirici = '=' | '!=' | '<' | '<=' | '>' | '>=';
export type Dugum =
  | { t: 've'; l: Dugum[] }
  | { t: 'veya'; l: Dugum[] }
  | { t: 'degil'; a: Dugum }
  | { t: 'iliski'; iliski: string; kayit: string }
  | { t: 'onay'; alan: string }
  | { t: 'secim'; alan: string; op: '=' | '!='; secenek: string }
  | { t: 'tarih'; alan: string; op: Karsilastirici; tarih: EvrenTarihi }
  | { t: 'sayi'; alan: string; op: Karsilastirici; deger: number; birim: string }
  | { t: 'yas'; op: Karsilastirici; deger: number };
export interface Formul { dil: number; agac: Dugum }

export class FormulHatasi extends Error {
  constructor(mesaj: string, public konum: number, public uzunluk = 1) { super(mesaj); }
}

/** Ad çözümü: yazılan adın karşılığı. Birden çok aday dönerse formül kaydedilmez, hangisi olduğu sorulur. */
export interface FormulCozucu {
  kayitlar(ad: string): { kod: string; ad: string; turAdi: string }[];
  alanlar(ad: string): (SablonAlani & { turAdi: string })[];
  tarih(ifade: string): EvrenTarihi | null;
}

// ---------- Okuma ----------

type YaziJetonu = { t: 'kayit' | 'alan' | 'metin' | 'kelime'; s: string; k: number; n: number };
type Jeton =
  | { t: 'ac' | 'kapa'; k: number; n: number }
  | YaziJetonu
  | { t: 'sayi'; s: string; v: number; k: number; n: number }
  | { t: 'op'; s: Karsilastirici; k: number; n: number };

const OPLAR: [string, Karsilastirici][] = [['<=', '<='], ['>=', '>='], ['!=', '!='], ['≠', '!='], ['≤', '<='], ['≥', '>='], ['<', '<'], ['>', '>'], ['=', '=']];

function jetonla(s: string): Jeton[] {
  const l: Jeton[] = [];
  let i = 0;
  const kapali = (ac: string, kapa: string, t: 'kayit' | 'alan' | 'metin', ne: string) => {
    const j = s.indexOf(kapa, i + 1);
    if (j < 0) throw new FormulHatasi(`${ne} kapanmamış: “${kapa}” eksik.`, i, s.length - i);
    const ic = s.slice(i + 1, j).replace(/\s+/g, ' ').trim();
    if (!ic) throw new FormulHatasi(`${ne} boş.`, i, j - i + 1);
    l.push({ t, s: ic, k: i, n: j - i + 1 });
    i = j + 1;
    void ac;
  };
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(') { l.push({ t: 'ac', k: i, n: 1 }); i++; continue; }
    if (c === ')') { l.push({ t: 'kapa', k: i, n: 1 }); i++; continue; }
    if (c === '[') { kapali('[', ']', 'kayit', 'Kayıt adı'); continue; }
    if (c === '{') { kapali('{', '}', 'alan', 'Alan adı'); continue; }
    if (c === '"') { kapali('"', '"', 'metin', 'Tırnak'); continue; }
    if (c === '“') { kapali('“', '”', 'metin', 'Tırnak'); continue; }
    const op = OPLAR.find(([y]) => s.startsWith(y, i));
    if (op) { l.push({ t: 'op', s: op[1], k: i, n: op[0].length }); i += op[0].length; continue; }
    const sayi = /^-?\d+(?:[.,]\d+)?/.exec(s.slice(i));
    if (sayi) { l.push({ t: 'sayi', s: sayi[0], v: Number(sayi[0].replace(',', '.')), k: i, n: sayi[0].length }); i += sayi[0].length; continue; }
    const kelime = /^[\p{L}\p{M}'’]+/u.exec(s.slice(i));
    if (kelime) { l.push({ t: 'kelime', s: kelime[0], k: i, n: kelime[0].length }); i += kelime[0].length; continue; }
    throw new FormulHatasi(`“${c}” işareti formülde kullanılamaz.`, i);
  }
  return l;
}

const kk = (j: Jeton | undefined) => (j && j.t === 'kelime' ? katla(j.s) : null);
const ILISKI_KELIMELERI = FORMUL_ILISKILERI.map((x) => ({ kod: x.kod, kelimeler: x.yazi.split(' ').map(katla) }));
const ANAHTAR = new Set(['ve', 'veya', 'degil', 'yas', ...ILISKI_KELIMELERI.flatMap((x) => x.kelimeler)]);

/** Yazarın formül yazısını okur, adları çözer ve türleri denetler. Hata olursa yeriyle birlikte FormulHatasi atar. */
export function formulOku(yazi: string, c: FormulCozucu): Formul {
  if (typeof yazi !== 'string') throw new FormulHatasi('Formül okunamadı.', 0);
  if (yazi.length > EN_UZUN) throw new FormulHatasi(`Formül en çok ${EN_UZUN} harf olabilir.`, EN_UZUN, yazi.length - EN_UZUN);
  const j = jetonla(yazi);
  if (!j.length) throw new FormulHatasi('Formül boş.', 0, 0);
  let i = 0, parca = 0;
  const son = () => j[j.length - 1];
  const sonrasi = (x: Jeton | undefined) => (x ? x.k + x.n : yazi.length);
  const bekle = (ne: string): never => {
    const x = j[i];
    if (!x) throw new FormulHatasi(`Formül yarım kaldı: ${ne} bekleniyor.`, sonrasi(son()), 0);
    throw new FormulHatasi(`Burada ${ne} bekleniyor.`, x.k, x.n);
  };
  const iliskiKelimesi = (): { kod: string; k: number; n: number } | null => {
    for (const r of ILISKI_KELIMELERI) {
      if (r.kelimeler.every((w, n) => kk(j[i + n]) === w)) {
        const ilk = j[i], sonJ = j[i + r.kelimeler.length - 1];
        i += r.kelimeler.length;
        return { kod: r.kod, k: ilk.k, n: sonJ.k + sonJ.n - ilk.k };
      }
    }
    return null;
  };
  const kayitCoz = (x: YaziJetonu) => {
    const { ad, tur } = ayir(x.s);
    let l = c.kayitlar(ad);
    if (tur) l = l.filter((y) => katla(y.turAdi) === katla(tur));
    if (!l.length) throw new FormulHatasi(`“${x.s}” adlı bir kayıt bulunamadı.`, x.k, x.n);
    if (l.length > 1) throw new FormulHatasi(`“${ad}” adını taşıyan birden çok kayıt var (${l.map((y) => y.turAdi).join(', ')}). Hangisi olduğunu [${ad} (${l[0].turAdi})] biçiminde yazın.`, x.k, x.n);
    return l[0].kod;
  };
  const alanCoz = (x: YaziJetonu) => {
    const { ad, tur } = ayir(x.s);
    let l = c.alanlar(ad);
    if (tur) l = l.filter((y) => katla(y.turAdi) === katla(tur));
    const kodlar = new Map(l.map((y) => [y.kod, y]));
    if (!kodlar.size) throw new FormulHatasi(`“${x.s}” adlı bir alan hiçbir şablonda yok.`, x.k, x.n);
    if (kodlar.size > 1) throw new FormulHatasi(`“${ad}” adını taşıyan birden çok alan var (${l.map((y) => y.turAdi).join(', ')}). Hangisi olduğunu {${ad} (${l[0].turAdi})} biçiminde yazın.`, x.k, x.n);
    const turler = new Set(l.map((y) => `${y.tur}|${y.birim ?? ''}`));
    if (turler.size > 1) throw new FormulHatasi(`“${ad}” alanı şablonlarda farklı türlerle tanımlı, bu yüzden formülde kullanılamaz.`, x.k, x.n);
    return l[0];
  };

  const veya = (d: number): Dugum => {
    if (d > EN_DERIN) throw new FormulHatasi('Formülde çok fazla iç içe parantez var.', j[i]?.k ?? 0);
    const l = [ve(d)];
    while (kk(j[i]) === 'veya') { i++; l.push(ve(d)); }
    return l.length > 1 ? { t: 'veya', l } : l[0];
  };
  const ve = (d: number): Dugum => {
    const l = [tekil(d)];
    while (kk(j[i]) === 've') { i++; l.push(tekil(d)); }
    return l.length > 1 ? { t: 've', l } : l[0];
  };
  const tekil = (d: number): Dugum => {
    if (kk(j[i]) === 'degil') { i++; return { t: 'degil', a: tekil(d + 1) }; }
    return atom(d);
  };
  const atom = (d: number): Dugum => {
    const x = j[i];
    if (!x) return bekle('bir koşul');
    if (++parca > EN_COK_PARCA) throw new FormulHatasi(`Formülde en çok ${EN_COK_PARCA} koşul olabilir.`, x.k, x.n);
    if (x.t === 'ac') {
      i++;
      const ic = veya(d + 1);
      if (j[i]?.t !== 'kapa') {
        if (!j[i]) throw new FormulHatasi('Parantez kapanmamış.', x.k, 1);
        return bekle('“)”');
      }
      i++;
      return ic;
    }
    // İlişki: "üyesi [X]" ya da "[X] üyesi"
    const onceIliski = iliskiKelimesi();
    if (onceIliski) {
      const y = j[i];
      if (y?.t !== 'kayit') return bekle('köşeli parantez içinde bir kayıt adı, ör. [Kuzey Loncası]');
      i++;
      return { t: 'iliski', iliski: onceIliski.kod, kayit: kayitCoz(y) };
    }
    if (x.t === 'kayit') {
      i++;
      const r = iliskiKelimesi();
      if (!r) return bekle(`bir ilişki (${FORMUL_ILISKILERI.map((y) => y.yazi).join(', ')})`);
      return { t: 'iliski', iliski: r.kod, kayit: kayitCoz(x) };
    }
    if (kk(x) === 'yas') {
      i++;
      const op = j[i];
      if (op?.t !== 'op') return bekle('bir karşılaştırma (<, <=, >, >=, =, !=)');
      i++;
      const v = j[i];
      if (v?.t !== 'sayi') return bekle('bir sayı, ör. 16 yıl');
      i++;
      const b = j[i];
      if (b?.t === 'kelime' && !ANAHTAR.has(katla(b.s))) {
        if (birimAdi(b.s) !== 'yıl') throw new FormulHatasi('Yaş yıl olarak yazılır.', b.k, b.n);
        i++;
      }
      return { t: 'yas', op: op.s, deger: v.v };
    }
    if (x.t === 'alan') {
      i++;
      const a = alanCoz(x);
      const op = j[i]?.t === 'op' ? (j[i++] as Extract<Jeton, { t: 'op' }>) : null;
      if (a.tur === 'metin' || a.tur === 'uzun') throw new FormulHatasi('Metin alanları formülde kullanılamaz, çünkü program yazıdan anlam çıkarmaz.', x.k, x.n);
      if (a.tur === 'onay') {
        if (op) throw new FormulHatasi('Evet / hayır alanı karşılaştırılmaz, yalnızca adını yazın.', op.k, op.n);
        return { t: 'onay', alan: a.kod };
      }
      if (!op) return bekle('bir karşılaştırma (=, !=, <, >, <=, >=)');
      const v = j[i];
      if (a.tur === 'secim') {
        if (op.s !== '=' && op.s !== '!=') throw new FormulHatasi('Seçim alanı yalnızca = ya da != ile karşılaştırılır.', op.k, op.n);
        if (v?.t !== 'metin') return bekle('tırnak içinde bir seçenek, ör. "Subay"');
        i++;
        const s = a.secenekler?.find((y) => katla(y.ad) === katla(v.s));
        if (!s) throw new FormulHatasi(`“${v.s}” bu alanın seçeneklerinden biri değil. Seçenekler: ${(a.secenekler ?? []).map((y) => y.ad).join(', ')}.`, v.k, v.n);
        return { t: 'secim', alan: a.kod, op: op.s, secenek: s.kod };
      }
      if (a.tur === 'tarih') {
        if (v?.t !== 'metin') return bekle('tırnak içinde bir evren tarihi, ör. "400"');
        i++;
        const t = c.tarih(v.s);
        if (!t?.eksen) throw new FormulHatasi(`“${v.s}” bir evren tarihi olarak okunamadı.`, v.k, v.n);
        return { t: 'tarih', alan: a.kod, op: op.s, tarih: t };
      }
      // birimli sayı
      if (v?.t !== 'sayi') return bekle(`bir sayı, ör. 10 ${a.birim ?? ''}`.trim());
      i++;
      let birim = a.birim ?? '';
      const b = j[i];
      if (b?.t === 'kelime' && !ANAHTAR.has(katla(b.s))) { birim = birimAdi(b.s); i++; }
      const n = birimCevir(v.v, birim, a.birim ?? '');
      if (n === null) {
        const yer = b?.t === 'kelime' ? b : v;
        throw new FormulHatasi(`“${birim}” bu alanın birimine (${a.birim}) çevrilemez.`, yer.k, yer.n);
      }
      return { t: 'sayi', alan: a.kod, op: op.s, deger: Math.round(n * 1e9) / 1e9, birim: a.birim ?? '' };
    }
    if (x.t === 'kelime' && (kk(x) === 've' || kk(x) === 'veya')) throw new FormulHatasi(`“${x.s}” öncesinde bir koşul bekleniyor.`, x.k, x.n);
    if (x.t === 'kelime') throw new FormulHatasi(`“${x.s}” tanınmadı. Alan adını {süslü parantez}, kayıt adını [köşeli parantez] içinde yazın.`, x.k, x.n);
    return bekle('bir koşul');
  };

  const agac = veya(0);
  if (i < j.length) {
    const x = j[i];
    if (x.t === 'kapa') throw new FormulHatasi('Bu parantezin açılışı yok.', x.k, 1);
    throw new FormulHatasi('Burada “ve” ya da “veya” bekleniyor.', x.k, x.n);
  }
  return { dil: FORMUL_DIL_SURUMU, agac };
}

/** "[Kuzey (şehir)]" yazımındaki tür ayrımı. */
function ayir(s: string): { ad: string; tur: string | null } {
  const m = /^(.*?)\s*\(([^()]+)\)$/.exec(s);
  return m && m[1] ? { ad: m[1].trim(), tur: m[2].trim() } : { ad: s, tur: null };
}

// ---------- Gösterme ----------

export interface FormulAdlari { kayit(kod: string): string; alan(kod: string): string; secenek(alan: string, kod: string): string }
const OP_YAZI: Record<Karsilastirici, string> = { '=': '=', '!=': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=' };
const sayiYazi = (n: number) => String(n).replace('.', ',');

/** Saklanan formülün güncel adlarla yazısı. */
export function formulYazisi(f: Formul, a: FormulAdlari): string {
  const yaz = (d: Dugum, ust: number): string => {
    switch (d.t) {
      case 'veya': { const s = d.l.map((x) => yaz(x, 1)).join(' veya '); return ust > 1 ? `(${s})` : s; }
      case 've': { const s = d.l.map((x) => yaz(x, 2)).join(' ve '); return ust > 2 ? `(${s})` : s; }
      case 'degil': return `değil ${yaz(d.a, 3)}`;
      case 'iliski': return `${FORMUL_ILISKILERI.find((x) => x.kod === d.iliski)?.yazi ?? d.iliski} [${a.kayit(d.kayit)}]`;
      case 'onay': return `{${a.alan(d.alan)}}`;
      case 'secim': return `{${a.alan(d.alan)}} ${OP_YAZI[d.op]} "${a.secenek(d.alan, d.secenek)}"`;
      case 'tarih': return `{${a.alan(d.alan)}} ${OP_YAZI[d.op]} "${d.tarih.ifade}"`;
      case 'sayi': return `{${a.alan(d.alan)}} ${OP_YAZI[d.op]} ${sayiYazi(d.deger)} ${d.birim}`.trim();
      case 'yas': return `yaş ${OP_YAZI[d.op]} ${sayiYazi(d.deger)} yıl`;
    }
  };
  return yaz(f.agac, 0);
}

/** Formülün kullandığı kayıt ve alan kodları (bağ ve bozulma denetimi için). */
export function formulKodlari(f: Formul): { kayitlar: string[]; alanlar: string[] } {
  const k = new Set<string>(), a = new Set<string>();
  const gez = (d: Dugum) => {
    if (d.t === 've' || d.t === 'veya') d.l.forEach(gez);
    else if (d.t === 'degil') gez(d.a);
    else if (d.t === 'iliski') k.add(d.kayit);
    else if (d.t !== 'yas') a.add(d.alan);
  };
  gez(f.agac);
  return { kayitlar: [...k], alanlar: [...a] };
}

// ---------- Değerlendirme ----------

export type Uclu = 'evet' | 'hayir' | 'belirsiz';
export type AlanOkumasi =
  | { durum: 'var'; deger: unknown }
  | { durum: 'bos' | 'celiskili' | 'konu_disi' };
/** Değerlendirmenin dünyası: kişiye ait kayıtlı bilgiler. Hiçbiri yazmaz. */
export interface FormulOrtami {
  iliski(iliski: string, kayit: string): boolean;
  kayitAdi(kod: string): string | null;
  /** Alanın bugünkü tanımı (hangi şablonda olursa olsun); hiçbir şablonda yoksa null. */
  alanTanimi(kod: string): SablonAlani | null;
  alan(kod: string): AlanOkumasi;
  /** Kişinin değerlendirme tarihindeki yaşı (yıl); bilinmiyorsa nedeni. */
  yas(): { enAz: number | null; enCok: number | null } | { neden: string };
}
export class Hesaplanamadi extends Error {}
export interface FormulSonucu { sonuc: Uclu; nedenler: string[] }

type Aralik = [number, number];
function aralikKarsilastir(a: Aralik, op: Karsilastirici, b: Aralik): Uclu {
  const [a1, a2] = a, [b1, b2] = b;
  switch (op) {
    case '<': return a2 < b1 ? 'evet' : a1 >= b2 ? 'hayir' : 'belirsiz';
    case '<=': return a2 <= b1 ? 'evet' : a1 > b2 ? 'hayir' : 'belirsiz';
    case '>': return a1 > b2 ? 'evet' : a2 <= b1 ? 'hayir' : 'belirsiz';
    case '>=': return a1 >= b2 ? 'evet' : a2 < b1 ? 'hayir' : 'belirsiz';
    case '=': return a1 === a2 && b1 === b2 && a1 === b1 ? 'evet' : a2 < b1 || a1 > b2 ? 'hayir' : 'belirsiz';
    case '!=': { const e = aralikKarsilastir(a, '=', b); return e === 'evet' ? 'hayir' : e === 'hayir' ? 'evet' : 'belirsiz'; }
  }
}
const ac = (x: number | null, uc: 'alt' | 'ust') => (x === null ? (uc === 'alt' ? -Infinity : Infinity) : x);

/**
 * Tarih alanı: formüldeki tarih kendi hassasiyetinde bir bütündür ("400" bütün 400 yılı). `= "400"` alanın 400 yılı
 * içinde olması, `<= "400"` 400 yılı ya da öncesi, `< "400"` 400 yılından önce demektir. Alanın tarihi sınırın iki
 * yanına düşüyorsa sonuç belirsizdir (§3.4 üç değerli karşılaştırma).
 */
function tarihKarsilastir(a: Aralik, op: Karsilastirici, b: Aralik): Uclu {
  const [a1, a2] = a, [b1, b2] = b;
  switch (op) {
    case '<': return a2 < b1 ? 'evet' : a1 >= b1 ? 'hayir' : 'belirsiz';
    case '<=': return a2 <= b2 ? 'evet' : a1 > b2 ? 'hayir' : 'belirsiz';
    case '>': return a1 > b2 ? 'evet' : a2 <= b2 ? 'hayir' : 'belirsiz';
    case '>=': return a1 >= b1 ? 'evet' : a2 < b1 ? 'hayir' : 'belirsiz';
    case '=': return a1 >= b1 && a2 <= b2 ? 'evet' : a2 < b1 || a1 > b2 ? 'hayir' : 'belirsiz';
    case '!=': { const e = tarihKarsilastir(a, '=', b); return e === 'evet' ? 'hayir' : e === 'hayir' ? 'evet' : 'belirsiz'; }
  }
}

export function formulDegerlendir(f: Formul, o: FormulOrtami): FormulSonucu {
  if (f.dil !== FORMUL_DIL_SURUMU) throw new Hesaplanamadi('Bu formül daha yeni bir program sürümüyle yazılmış.');
  const nedenler: string[] = [];
  const belirsiz = (n: string): Uclu => { if (!nedenler.includes(n)) nedenler.push(n); return 'belirsiz'; };
  const tanim = (kod: string, tur: SablonAlani['tur']) => {
    const t = o.alanTanimi(kod);
    if (!t) throw new Hesaplanamadi('Formüldeki bir alan artık hiçbir şablonda yok.');
    if (t.tur !== tur) throw new Hesaplanamadi(`“${t.ad}” alanının türü değişti.`);
    return t;
  };
  const oku = (kod: string, ad: string): { deger: unknown } | Uclu => {
    const r = o.alan(kod);
    if (r.durum === 'var') return { deger: r.deger };
    if (r.durum === 'bos') return belirsiz(`“${ad}” boş.`);
    if (r.durum === 'celiskili') return belirsiz(`“${ad}” iki cihazda farklı yazılmış.`);
    return belirsiz(`“${ad}” bu kayıt için geçerli değil.`);
  };
  const deg = (d: Dugum): Uclu => {
    switch (d.t) {
      case 've': {
        const l = d.l.map(deg);
        return l.includes('hayir') ? 'hayir' : l.every((x) => x === 'evet') ? 'evet' : 'belirsiz';
      }
      case 'veya': {
        const l = d.l.map(deg);
        return l.includes('evet') ? 'evet' : l.every((x) => x === 'hayir') ? 'hayir' : 'belirsiz';
      }
      case 'degil': { const x = deg(d.a); return x === 'evet' ? 'hayir' : x === 'hayir' ? 'evet' : 'belirsiz'; }
      case 'iliski': {
        const ad = o.kayitAdi(d.kayit);
        if (ad === null) throw new Hesaplanamadi('Formüldeki bir kayıt silindi.');
        const r = FORMUL_ILISKILERI.find((x) => x.kod === d.iliski)!;
        return o.iliski(d.iliski, d.kayit) ? 'evet' : belirsiz(`“${ad}” ${r.yazi} olduğu kayıtlı değil.`);
      }
      case 'onay': {
        const t = tanim(d.alan, 'onay');
        const r = oku(d.alan, t.ad);
        // Evet / hayır alanında boş değer "hayır" değildir; yalnızca işaretli değer "evet"tir.
        return typeof r === 'string' ? r : r.deger === true ? 'evet' : r.deger === false ? 'hayir' : belirsiz(`“${t.ad}” boş.`);
      }
      case 'secim': {
        const t = tanim(d.alan, 'secim');
        if (!t.secenekler?.some((s) => s.kod === d.secenek)) throw new Hesaplanamadi(`“${t.ad}” alanında formülün kullandığı seçenek kaldırıldı.`);
        const r = oku(d.alan, t.ad);
        if (typeof r === 'string') return r;
        const esit = r.deger === d.secenek;
        return (d.op === '=') === esit ? 'evet' : 'hayir';
      }
      case 'tarih': {
        const t = tanim(d.alan, 'tarih');
        const r = oku(d.alan, t.ad);
        if (typeof r === 'string') return r;
        const v = (r.deger as EvrenTarihi | null)?.eksen, b = d.tarih.eksen;
        if (!v || !b) return belirsiz(`“${t.ad}” bir tarihe yerleştirilemiyor.`);
        const x = tarihKarsilastir([ac(v.enErken, 'alt'), ac(v.enGec, 'ust')], d.op, [ac(b.enErken, 'alt'), ac(b.enGec, 'ust')]);
        return x === 'belirsiz' ? belirsiz(`“${t.ad}” ile “${d.tarih.ifade}” karşılaştırması kesin değil.`) : x;
      }
      case 'sayi': {
        const t = tanim(d.alan, 'sayi');
        const r = oku(d.alan, t.ad);
        if (typeof r === 'string') return r;
        const v = r.deger as SayiDegeri;
        const a1 = birimCevir(v.enAz, v.birim, d.birim), a2 = birimCevir(v.enCok, v.birim, d.birim);
        if (a1 === null || a2 === null) throw new Hesaplanamadi(`“${t.ad}” değerinin birimi (${v.birim}) formüldeki birime (${d.birim}) çevrilemiyor.`);
        const x = aralikKarsilastir([a1, a2], d.op, [d.deger, d.deger]);
        return x === 'belirsiz' ? belirsiz(`“${t.ad}” aralığı karşılaştırmanın iki yanına düşüyor.`) : x;
      }
      case 'yas': {
        const y = o.yas();
        if ('neden' in y) return belirsiz(y.neden);
        const x = aralikKarsilastir([ac(y.enAz, 'alt'), ac(y.enCok, 'ust')], d.op, [d.deger, d.deger]);
        return x === 'belirsiz' ? belirsiz('Yaş bu karşılaştırma için kesin değil.') : x;
      }
    }
  };
  const sonuc = deg(f.agac);
  return { sonuc, nedenler: sonuc === 'belirsiz' ? nedenler : [] };
}
