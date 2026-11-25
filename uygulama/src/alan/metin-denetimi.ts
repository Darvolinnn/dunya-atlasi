// Metin denetimi (K44): eserin ya da bölümün metninde kurala dayalı üç tarama. Yapay zekâ yoktur, anlam çıkarılmaz
// (K1): yalnız harflere, işaretlere ve kayıtlı adlara bakılır. Her bulgu bir öneridir; metne dokunulmaz.
// 1) Özel adların ekleri: kayıtlı bir ad kesmeyle ek aldıysa ek, adın okunuşuna göre denetlenir (Kael'a → Kael'e).
//    Okunuş girilmemiş ve yazımdan kestirilemiyorsa yalnız aynı ekin farklı yazılışları gösterilir.
// 2) Dizgi: çift boşluk, noktalamadan önce boşluk, kapanmamış tırnak, ara sözde kısa çizgi ve metin boyunca
//    karışık kullanılan konuşma çizgisi, tırnak ve üç nokta biçimleri (az kullanılan biçim gösterilir).
// 3) Yakın tekrar: aynı başlangıçlı sözcüklerin (ilk beş harf) kısa bir aralıkta üç ya da daha çok kez geçmesi.
import { katla } from './turkce';
import { ekKalibi, ekYaz, sesBilgisi } from './turkce-ek';

export interface DenetimSahnesi { kod: string; ad: string; paragraflar: string[] }
export interface DenetimAdi { kod: string; ad: string; okunus: string }
export type DenetimTuru = 'ek' | 'dizgi' | 'tekrar';
export interface MetinBulgusu {
  tur: DenetimTuru;
  sahne: { kod: string; ad: string };
  paragraf: number;
  /** Gösterilecek parça: işaretli kısmın önü, kendisi ve ardı. */
  once: string; isaretli: string; sonra: string;
  mesaj: string;
  /** Ek bulgusunda adın kaydı (okunuşu oradan girilir). */
  kayit?: string;
}
export interface MetinDenetimiSonucu { bulgular: MetinBulgusu[]; sahne: number; kelime: number; kesildi: boolean }

const EN_COK = 1500;
const KELIME = /[\p{L}\p{N}]+(?:['’]\p{L}+)?/gu;
const BAGLAM = 40;
const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Yer = { s: DenetimSahnesi; p: number; bas: number; son: number };
function bulgu(tur: DenetimTuru, y: Yer, mesaj: string, kayit?: string): MetinBulgusu {
  const m = y.s.paragraflar[y.p];
  const a = Math.max(0, y.bas - BAGLAM), z = Math.min(m.length, y.son + BAGLAM);
  return { tur, sahne: { kod: y.s.kod, ad: y.s.ad }, paragraf: y.p, once: (a > 0 ? '…' : '') + m.slice(a, y.bas), isaretli: m.slice(y.bas, y.son),
    sonra: m.slice(y.son, z) + (z < m.length ? '…' : ''), mesaj, ...(kayit ? { kayit } : {}) };
}

// ---------- 1) Özel adların ekleri ----------
/** Ekin sesten bağımsız iskeleti: Kael'e ile Kael'a, Velkar'da ile Velkar'ta aynı ekin iki yazılışıdır. */
function ekIskeleti(ek: string): string {
  return kucuk(ek).replace(/^[yns](?=[aeıioöuü])/, '').replace(/[ae]/g, 'A').replace(/[ıiuü]/g, 'I').replace(/[dt]/g, 'D').replace(/[cç]/g, 'C');
}

export function ekDenetimi(sahneler: readonly DenetimSahnesi[], adlar: readonly DenetimAdi[]): MetinBulgusu[] {
  const sonuc: MetinBulgusu[] = [];
  // Uzun adlar önce: "Kara Kael" bulunduysa içindeki "Kael" ayrıca sayılmaz.
  const alinan = new Set<string>();
  const sirali = [...adlar].filter((a) => a.ad.trim().length >= 2).sort((a, b) => b.ad.length - a.ad.length);
  for (const a of sirali) {
    const ad = a.ad.trim().replace(/\s+/g, ' ');
    const ses = sesBilgisi(a.okunus || ad);
    const guvenilir = !!a.okunus.trim() || ses.kesin;
    const re = new RegExp(`(?<![\\p{L}\\p{N}'’])${kacis(ad).replace(/ /g, '\\s+')}(['’])(\\p{L}+)`, 'gu');
    const yerler: { y: Yer; ek: string }[] = [];
    for (const s of sahneler) s.paragraflar.forEach((m, p) => {
      for (const x of m.matchAll(re)) {
        const bas = x.index!, son = bas + x[0].length;
        const anahtar = `${s.kod}:${p}:${son}`;
        if (alinan.has(anahtar)) continue;
        alinan.add(anahtar);
        yerler.push({ y: { s, p, bas, son }, ek: x[2] });
      }
    });
    if (!yerler.length) continue;
    if (guvenilir) {
      for (const { y, ek } of yerler) {
        const beklenen = ekYaz(ses, ekKalibi(ses, ek));
        if (beklenen && beklenen !== kucuk(ek)) {
          sonuc.push(bulgu('ek', y, `“${ad}${y.s.paragraflar[y.p][y.son - ek.length - 1]}${beklenen}” olmalı${a.okunus.trim() ? ` (okunuşu: ${a.okunus.trim()})` : ''}.`, a.kod));
        }
      }
    } else {
      // Okunuş belli değil: aynı ekin birden çok yazılışı varsa az kullanılanlar gösterilir.
      const gruplar = new Map<string, Map<string, { y: Yer; ek: string }[]>>();
      for (const x of yerler) {
        const g = gruplar.get(ekIskeleti(x.ek)) ?? new Map();
        const k = kucuk(x.ek);
        g.set(k, [...(g.get(k) ?? []), x]);
        gruplar.set(ekIskeleti(x.ek), g);
      }
      for (const g of gruplar.values()) {
        if (g.size < 2) continue;
        const l = [...g.entries()].sort((p, q) => q[1].length - p[1].length);
        const ozet = l.map(([k, v]) => `${ad}'${k} ${v.length} kez`).join(', ');
        for (const [, v] of l.slice(1)) for (const { y } of v) {
          sonuc.push(bulgu('ek', y, `Aynı ek farklı yazılmış: ${ozet}. Kaydın sayfasında okunuşunu girerseniz hangisinin doğru olduğu da söylenir.`, a.kod));
        }
      }
    }
  }
  return sonuc;
}

// ---------- 2) Dizgi ----------
const KONUSMA_BASI: [RegExp, string][] = [[/^—/, 'uzun çizgi (—)'], [/^–/, 'orta çizgi (–)'], [/^-(?!-)/, 'kısa çizgi (-)'], [/^[“”]/, 'tırnak (“ ”)'], [/^"/, 'düz tırnak (")'], [/^«/, 'açılı tırnak (« »)']];
const TIRNAKLAR: [RegExp, string][] = [[/[“”]/g, '“ ”'], [/"/g, '"'], [/[«»]/g, '« »']];

export function dizgiDenetimi(sahneler: readonly DenetimSahnesi[]): MetinBulgusu[] {
  const sonuc: MetinBulgusu[] = [];
  const konusma = new Map<string, Yer[]>(), tirnak = new Map<string, Yer[]>(), ucNokta = new Map<string, Yer[]>();
  const ekle = (m: Map<string, Yer[]>, k: string, y: Yer) => m.set(k, [...(m.get(k) ?? []), y]);
  for (const s of sahneler) s.paragraflar.forEach((m, p) => {
    const yer = (bas: number, son: number): Yer => ({ s, p, bas, son });
    for (const x of m.matchAll(/(?<=\S) {2,}(?=\S)/g)) sonuc.push(bulgu('dizgi', yer(x.index!, x.index! + x[0].length), 'Çift boşluk.'));
    for (const x of m.matchAll(/(?<=\p{L}) +(?=[,;:!?]|\.(?!\.))/gu)) sonuc.push(bulgu('dizgi', yer(x.index!, x.index! + x[0].length + 1), 'Noktalama işaretinden önce boşluk.'));
    for (const x of m.matchAll(/(?<=\p{L}[,.!?]?) (-{1,2}) (?=\p{L})/gu)) sonuc.push(bulgu('dizgi', yer(x.index!, x.index! + x[0].length), 'Ara sözde kısa çizgi; uzun çizgi (—) mi olmalı?'));
    const acan = (m.match(/“/g) ?? []).length, kapayan = (m.match(/”/g) ?? []).length, duz = (m.match(/"/g) ?? []).length;
    if (acan !== kapayan || duz % 2 === 1) {
      const i = acan > kapayan ? m.lastIndexOf('“') : acan < kapayan ? m.indexOf('”') : m.lastIndexOf('"');
      sonuc.push(bulgu('dizgi', yer(i, i + 1), 'Tırnak açılmış ama kapanmamış (ya da kapanmış ama açılmamış).'));
    }
    const b = m.trimStart(), bosluk = m.length - b.length;
    for (const [re, ad] of KONUSMA_BASI) if (re.test(b)) { ekle(konusma, ad, yer(bosluk, bosluk + 1)); break; }
    for (const [re, ad] of TIRNAKLAR) for (const x of m.matchAll(re)) ekle(tirnak, ad, yer(x.index!, x.index! + 1));
    for (const x of m.matchAll(/\.{3}|…/g)) ekle(ucNokta, x[0] === '…' ? 'tek işaretli üç nokta (…)' : 'üç ayrı nokta (...)', yer(x.index!, x.index! + x[0].length));
  });
  // Karışık biçimler: en çok kullanılan biçim doğru sayılır, ötekiler gösterilir.
  const karisik = (m: Map<string, Yer[]>, ne: string) => {
    if (m.size < 2) return;
    const l = [...m.entries()].sort((p, q) => q[1].length - p[1].length);
    for (const [ad, yerler] of l.slice(1)) for (const y of yerler) sonuc.push(bulgu('dizgi', y, `${ne} çoğunlukla ${l[0][0]} ile; burada ${ad}.`));
  };
  karisik(konusma, 'Konuşmalar');
  karisik(tirnak, 'Tırnaklar');
  karisik(ucNokta, 'Üç nokta');
  return sonuc;
}

// ---------- 3) Yakın tekrar ----------
/** Tekrarı doğal olan sık sözcükler (katlanmış). */
const SIK = new Set(('ama ancak artik bile belki birlikte boyle bunu bunlar burada butun cunku daha degil degildi dedi diye fakat gibi hala hemen '
  + 'herkes hepsi hicbir icin ikisi iste kadar kendi kendini kendine kimse nasil neden nerede niye olan olarak oldu olmak onlar onun orada sadece '
  + 'simdi sonra soyle sunu tekrar yine yoktu vardi zaten once hatta bizim sizin benim senin onlarin seyler sey yalniz').split(' '));
const SIK_ON = ['oldu', 'olur', 'olma', 'olac', 'olan', 'dedi', 'diye', 'degi', 'vard', 'yokt', 'kend', 'bunl', 'sonr'];

/** Sözcüğün karşılaştırma anahtarı: katlanmış ilk beş harf (Türkçede kökün kaba yaklaşığı); sık sözcüklerde null. */
export function tekrarAnahtari(sozcuk: string): string | null {
  const k = katla(sozcuk.replace(/['’].*$/u, ''));
  if (k.length < 4 || SIK.has(k)) return null;
  const a = k.slice(0, 5);
  return SIK_ON.some((o) => a.startsWith(o)) ? null : a;
}

export function tekrarDenetimi(sahneler: readonly DenetimSahnesi[], adlar: readonly DenetimAdi[], pencere = 100, enAz = 3): MetinBulgusu[] {
  const sonuc: MetinBulgusu[] = [];
  // Kayıt adları bilerek tekrarlanır (karakter, yer); onların kelimeleri sayılmaz.
  const adKelimeleri = new Set(adlar.flatMap((a) => [a.ad, a.okunus]).flatMap((x) => (katla(x).match(/\p{L}+/gu) ?? [])).map((x) => x.slice(0, 5)));
  for (const s of sahneler) {
    const kelimeler: { a: string; p: number; bas: number; son: number; sozcuk: string; konum: number }[] = [];
    // Pencere metindeki bütün kelimelerle ölçülür, yalnız sayılanlarla değil.
    let konum = 0;
    s.paragraflar.forEach((m, p) => {
      for (const x of m.matchAll(KELIME)) {
        const a = /\p{L}/u.test(x[0][0]) ? tekrarAnahtari(x[0]) : null;
        if (a && !adKelimeleri.has(a)) kelimeler.push({ a, p, bas: x.index!, son: x.index! + x[0].length, sozcuk: x[0], konum });
        konum++;
      }
    });
    // Her anahtar için sıra; pencereye en az `enAz` kez giren öbek bir bulgudur, öbek bitince yenisi aranır.
    const sira = new Map<string, number[]>();
    kelimeler.forEach((k, i) => sira.set(k.a, [...(sira.get(k.a) ?? []), i]));
    for (const l of sira.values()) {
      if (l.length < enAz) continue;
      const kz = l.map((i) => kelimeler[i].konum);
      for (let i = 0; i + enAz - 1 < l.length;) {
        let j = i;
        while (j + 1 < l.length && kz[j + 1] - kz[i] < pencere) j++;
        if (j - i + 1 >= enAz) {
          const ilk = kelimeler[l[i]];
          const bicimler = [...new Set(l.slice(i, j + 1).map((x) => kucuk(kelimeler[x].sozcuk)))];
          sonuc.push(bulgu('tekrar', { s, p: ilk.p, bas: ilk.bas, son: ilk.son },
            `${j - i + 1} kez, ${kz[j] - kz[i] + 1} kelime içinde: ${bicimler.join(', ')}.`));
          i = j + 1;
        } else i++;
      }
    }
  }
  return sonuc.sort((a, b) => a.sahne.kod === b.sahne.kod ? a.paragraf - b.paragraf : 0);
}

/** Üç taramanın hepsi; sahnelerin okuma sırası korunur. Çok bulgu varsa ilk `EN_COK` tanesi döner. */
export function metniDenetle(sahneler: readonly DenetimSahnesi[], adlar: readonly DenetimAdi[], pencere = 100): MetinDenetimiSonucu {
  const sahneSirasi = new Map(sahneler.map((s, i) => [s.kod, i]));
  const hepsi = [...ekDenetimi(sahneler, adlar), ...dizgiDenetimi(sahneler), ...tekrarDenetimi(sahneler, adlar, pencere)]
    .sort((a, b) => (sahneSirasi.get(a.sahne.kod)! - sahneSirasi.get(b.sahne.kod)!) || a.paragraf - b.paragraf);
  const kelime = sahneler.reduce((t, s) => t + s.paragraflar.reduce((u, m) => u + (m.match(KELIME) ?? []).length, 0), 0);
  return { bulgular: hepsi.slice(0, EN_COK), sahne: sahneler.length, kelime, kesildi: hepsi.length > EN_COK };
}
