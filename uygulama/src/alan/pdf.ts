// Eserin PDF çıktısı (§10.11): yazdırma penceresine gerek kalmadan doğrudan PDF dosyası. Yazı tipi (Literata)
// programın içinde gelir ve PDF'e gömülür; ağ gerekmez, Türkçe harfler her cihazda aynı görünür ve metin
// kopyalanıp aranabilir. Sayfa düzeni: 13,5×21 cm kitap ölçüsü, kapak, her bölüm yeni sayfada,
// iki yana yaslı paragraflar, sahneler arasında ayraç, altta sayfa numarası.
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { AYRAC_METNI, VARSAYILAN_GORUNUM, type Blok, type Kitap, type KitapGorseli, type Parca } from './kitap';

/** Gömülecek yazı tiplerinin dosyaları (TrueType). `yedek`: ana yazı tipinde olmayan harfler (ses yazısı
 *  işaretleri, ※ gibi) için ikinci yazı tipi (Noto Serif); yalnız kitapta böyle bir harf varsa yüklenir. */
export interface YaziTipleri { duz: Uint8Array; egik: Uint8Array; kalin: Uint8Array; kalinEgik: Uint8Array; yedek?: Omit<YaziTipleri, 'yedek'> }

/** Ana yazı tipinin karakterleri ve onda olmayan harfler için yedeği. `yedek` yoksa (ölçüm geçişi) harf ana yazı
 *  tipiyle yerleştirilir; yalnız bu biçimde yedeğin gerektiği `kullanilan`a yazılır. */
interface Yedek { kendi: Set<number>; yedekte: Set<number>; yedek: PDFFont | null; bicim: number; kullanilan: Set<number> }
const YEDEKLER = new WeakMap<PDFFont, Yedek>();

/** Metni, her harfi onu içeren yazı tipiyle yazılacak parçalara böler. */
function parcala(metin: string, yt: PDFFont): { metin: string; yt: PDFFont }[] {
  const y = YEDEKLER.get(yt);
  if (!y) return [{ metin, yt }];
  const l: { metin: string; yt: PDFFont }[] = [];
  for (const h of metin) {
    const c = h.codePointAt(0)!;
    let t = yt;
    if (!y.kendi.has(c) && y.yedekte.has(c)) { y.kullanilan.add(y.bicim); t = y.yedek ?? yt; }
    const son = l[l.length - 1];
    if (son && son.yt === t) son.metin += h; else l.push({ metin: h, yt: t });
  }
  return l;
}
const enOlc = (metin: string, yt: PDFFont, boy: number) => parcala(metin, yt).reduce((t, p) => t + p.yt.widthOfTextAtSize(p.metin, boy), 0);
function yaz(s: PDFPage, metin: string, yt: PDFFont, boy: number, x: number, y: number) {
  for (const p of parcala(metin, yt)) { s.drawText(p.metin, { x, y, size: boy, font: p.yt, color: RENK }); x += p.yt.widthOfTextAtSize(p.metin, boy); }
}

const MM = 72 / 25.4;
// Türkiye'de romanların yaygın kitap ölçüsü 13,5×21 cm; 11 punto, 1,3 satır aralığı.
const GEN = 135 * MM, YUK = 210 * MM;
const UST = 17 * MM, ALT = 20 * MM, YAN = 15 * MM;
const BOY = 11, SATIR = BOY * 1.3, GIRINTI = BOY * 1.5;
const ALINTI_GIRINTI = 8 * MM;
const RENK = rgb(0.1, 0.1, 0.1);

interface Kelime { parcalar: { metin: string; yt: PDFFont }[]; gen: number; bosluk: number; boy: number }
type Satir = { kelimeler: Kelime[]; son: boolean };

/**
 * Kitapta geçip PDF'in yazı tiplerinde bulunmayan karakterler (emoji, Çince gibi); PDF'te boş çıkarlar. Yazara
 * söylenir; Word ve EPUB çıktısında okuyucunun yazı tipleriyle görünürler.
 */
export function pdfdeOlmayanlar(k: Kitap, yt: YaziTipleri): string[] {
  type Tip = { hasGlyphForCodePoint(c: number): boolean };
  const ac = (d: Uint8Array) => fontkit.create(d as never) as unknown as Tip;
  const tipler = (['duz', 'egik', 'kalin', 'kalinEgik'] as const).map((a) => [ac(yt[a]), ...(yt.yedek ? [ac(yt.yedek[a])] : [])]);
  const harfler = new Set<string>();
  const topla = (x: unknown): void => {
    if (typeof x === 'string') { for (const h of x) harfler.add(h); return; }
    if (!x || typeof x !== 'object' || x instanceof Uint8Array) return;
    for (const v of Object.values(x)) topla(v);
  };
  topla(k);
  return [...harfler].filter((h) => {
    const c = h.codePointAt(0)!;
    // Boşluklar, satır sonu ve görünmeyen biçim karakterleri çizilmez.
    if (/[\s\p{Cc}\p{Cf}]/u.test(h)) return false;
    return !tipler.every((l) => l.some((t) => t.hasGlyphForCodePoint(c)));
  });
}

export async function pdfYaz(k: Kitap, yt: YaziTipleri, zaman = new Date()): Promise<Uint8Array> {
  if (!yt.yedek) return (await olustur(k, yt, zaman, null))!;
  // Yedek yazı tipi alt kümelenemiyor (pdf-lib'in alt kümesinde Noto Serif harfleri bozuk, boş çıkıyor); bütünü
  // gömülür. PDF büyümesin diye önce hangi biçimlerde (düz, eğik…) gerektiği ölçülür, yalnız onlar gömülür.
  const kullanilan = new Set<number>();
  await olustur(k, yt, zaman, { kullanilan, gom: false });
  return (await olustur(k, yt, zaman, { kullanilan, gom: true }))!;
}

async function olustur(k: Kitap, yt: YaziTipleri, zaman: Date, yedekGecisi: { kullanilan: Set<number>; gom: boolean } | null): Promise<Uint8Array | null> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [duz, egik, kalin, kalinEgik] = await Promise.all([yt.duz, yt.egik, yt.kalin, yt.kalinEgik].map((d) => pdf.embedFont(d, { subset: true })));
  if (yt.yedek && yedekGecisi) {
    const { kullanilan, gom } = yedekGecisi, y = yt.yedek;
    const kaynak = [y.duz, y.egik, y.kalin, y.kalinEgik];
    await Promise.all([duz, egik, kalin, kalinEgik].map(async (f, i) => {
      const yedekte = new Set((fontkit.create(kaynak[i] as never) as unknown as { characterSet: number[] }).characterSet);
      const yedek = gom && kullanilan.has(i) ? await pdf.embedFont(kaynak[i], { subset: false }) : null;
      YEDEKLER.set(f, { kendi: new Set(f.getCharacterSet()), yedekte, yedek, bicim: i, kullanilan });
    }));
  }
  const yaziTipi = (p: { kalin?: boolean; egik?: boolean }) => p.kalin ? (p.egik ? kalinEgik : kalin) : p.egik ? egik : duz;
  pdf.setTitle(k.ad, { showInWindowTitleBar: true });
  pdf.setLanguage('tr-TR');
  pdf.setCreator('Dünya Atlası');
  pdf.setProducer('Dünya Atlası');
  pdf.setCreationDate(zaman);
  pdf.setModificationDate(zaman);

  const g = k.gorunum ?? VARSAYILAN_GORUNUM;
  const resim = (x: KitapGorseli) => (x.tur === 'image/png' ? pdf.embedPng(x.veri) : pdf.embedJpg(x.veri));
  /** Görseli kutuya oranını bozmadan, ortalayarak sığdırır. */
  const resimCiz = (sf: PDFPage, r: PDFImage, x: number, y: number, gen: number, yuk: number) => {
    const o = Math.min(gen / r.width, yuk / r.height);
    sf.drawImage(r, { x: x + (gen - r.width * o) / 2, y: y + (yuk - r.height * o) / 2, width: r.width * o, height: r.height * o });
    return r.height * o;
  };

  // Kapak: görsel seçildiyse önce görsel sayfası, sonra ad sayfası.
  let onSayfa = 0;
  if (k.kapak) {
    const r = await resim(k.kapak).catch(() => null);
    if (r) { const kp = pdf.addPage([GEN, YUK]); resimCiz(kp, r, 0, 0, GEN, YUK); onSayfa++; }
  }
  const kapak = pdf.addPage([GEN, YUK]);
  onSayfa++;
  ortala(kapak, k.ad, duz, 22, YUK * 0.6, GEN - 2 * YAN);

  let sayfa!: PDFPage, y = 0;
  const numarali: PDFPage[] = [];
  const icindekiler: { metin: string; girinti: number; sayfa: number }[] = [];
  const yeniSayfa = () => { sayfa = pdf.addPage([GEN, YUK]); numarali.push(sayfa); y = YUK - UST; };
  /** Sayfada en az `gereken` yükseklik yoksa yeni sayfaya geçer. */
  const yerAc = (gereken: number) => { if (y - gereken < ALT) yeniSayfa(); };

  /** Bir bloğu satırlara bölüp yazar. `basHarf`: ilk harf üç satır boyunda, ilk üç satır içeriden başlar. */
  const blokYaz = (parcalar: Parca[], o: { girinti: number; sol: number; sag: number; egik?: boolean; kalin?: boolean; yasla: boolean; basHarf?: boolean }) => {
    const genislik = GEN - 2 * YAN - o.sol - o.sag;
    let liste = parcalar.map((p) => ({ ...p, egik: p.egik || o.egik, kalin: p.kalin || o.kalin }));
    let harf: { metin: string; yt: PDFFont; boy: number; gen: number } | null = null;
    const ilkHarf = o.basHarf ? Array.from(liste[0]?.metin ?? '')[0] : undefined;
    if (ilkHarf && /\p{L}/u.test(ilkHarf)) {
      const boy = (2 * SATIR + 0.7 * BOY) / 0.7, yt = yaziTipi(liste[0]);
      harf = { metin: ilkHarf, yt, boy, gen: enOlc(ilkHarf, yt, boy) };
      liste = [{ ...liste[0], metin: liste[0].metin.slice(ilkHarf.length) }, ...liste.slice(1)];
    }
    const girinti = (i: number) => (harf ? (i < 3 ? harf.gen + 3 : 0) : i === 0 ? o.girinti : 0);
    const satirlar = satirlaraBol(kelimeler(liste, yaziTipi), genislik, girinti);
    if (harf) {
      yerAc(3 * SATIR);
      yaz(sayfa, harf.metin, harf.yt, harf.boy, YAN + o.sol, y - 3 * SATIR + (SATIR - BOY) / 2);
    }
    satirlar.forEach((st, i) => {
      // Paragrafın tek satırı sayfanın dibinde kalmasın (öksüz satır): ilk satırdan sonra en az bir satır daha sığmalı.
      if (i === 0 && satirlar.length > 1) yerAc(2 * SATIR); else yerAc(SATIR);
      y -= SATIR;
      const bas = YAN + o.sol + girinti(i);
      satirCiz(sayfa, st, bas, y + (SATIR - BOY) / 2, genislik - girinti(i), o.yasla && !st.son);
    });
    // Baş harften kısa paragraf: harfin altı boş kalmasın diye satırlar harfin boyuna tamamlanır.
    if (harf && satirlar.length < 3) y -= (3 - satirlar.length) * SATIR;
  };
  const susCiz = (yy: number, olcek = 1) => sayfa.drawSvgPath(SUS_YOLU, { x: GEN / 2 - 10 * olcek, y: yy + 16 * olcek, scale: olcek, color: RENK });
  const ayrac = () => {
    yerAc(4 * SATIR);
    y -= SATIR * 1.5;
    if (g.ayrac === 'sus') susCiz(y - 2, 0.75);
    else if (g.ayrac !== 'bos') ortala(sayfa, AYRAC_METNI[g.ayrac], duz, BOY, y, GEN - 2 * YAN);
    y -= SATIR * 0.5;
  };
  const basliKoy = (baslik: string, numara?: string) => {
    yeniSayfa();
    y -= numara ? 24 * MM : 30 * MM;
    if (numara) { y -= 9 * 1.4; ortala(sayfa, aralikli(numara.toLocaleUpperCase('tr-TR')), duz, 8.5, y, GEN - 2 * YAN); y -= 3 * MM; }
    for (const satir of satirlaraBol(kelimeler([{ metin: baslik }], yaziTipi, 16), GEN - 2 * YAN, 0)) {
      y -= 16 * 1.4;
      satirCiz(sayfa, satir, YAN, y, GEN - 2 * YAN, false, true);
    }
  };

  for (const b of k.bolumler) {
    basliKoy(b.baslik, b.numara);
    icindekiler.push({ metin: b.numara ? `${b.numara}: ${b.baslik}` : b.baslik, girinti: 0, sayfa: numarali.length });
    if (g.sus) { y -= 9 * MM; susCiz(y); y -= 6 * MM; } else y -= 12 * MM;
    let ilk = true, bolumunIlki = true;
    b.sahneler.forEach((s, i) => {
      if (i > 0) { ayrac(); ilk = true; }
      if (g.icindekiler === 'sahneler') icindekiler.push({ metin: s.ad ?? s.baslik ?? '', girinti: 5 * MM, sayfa: numarali.length });
      if (s.baslik) {
        yerAc(3 * SATIR);
        if (i > 0 || y < YUK - UST - 42 * MM) y -= SATIR * 0.5;
        blokYaz([{ metin: s.baslik }], { girinti: 0, sol: 0, sag: 0, egik: true, yasla: false });
        y -= SATIR * 0.3;
        ilk = true;
      }
      for (const bl of s.bloklar as Blok[]) {
        if (bl.tur === 'baslik') {
          yerAc(3 * SATIR);
          y -= SATIR * 0.5;
          blokYaz(bl.parcalar, { girinti: 0, sol: 0, sag: 0, kalin: true, yasla: false });
          ilk = true;
        } else if (bl.tur === 'alinti') {
          y -= SATIR * 0.3;
          blokYaz(bl.parcalar, { girinti: 0, sol: ALINTI_GIRINTI, sag: ALINTI_GIRINTI, egik: true, yasla: true });
          y -= SATIR * 0.3;
          ilk = true;
        } else {
          blokYaz(bl.parcalar, { girinti: ilk ? 0 : GIRINTI, sol: 0, sag: 0, yasla: true, basHarf: g.basHarf && bolumunIlki });
          ilk = false; bolumunIlki = false;
        }
      }
    });
  }

  // Kitap sonu ekleri.
  for (const ek of k.ekler ?? []) {
    basliKoy(ek.baslik);
    icindekiler.push({ metin: ek.baslik, girinti: 0, sayfa: numarali.length });
    y -= 8 * MM;
    if (ek.gorsel) {
      const r = await resim(ek.gorsel).catch(() => null);
      if (r) { const yuk = y - ALT; y -= resimCiz(sayfa, r, YAN, ALT, GEN - 2 * YAN, yuk) + 4 * MM; }
    }
    for (const x of ek.girdiler) {
      blokYaz([{ metin: x.ad, kalin: true }, ...(x.aciklama ? [{ metin: ` — ${x.aciklama}` }] : [])], { girinti: 0, sol: 0, sag: 0, yasla: false });
      y -= SATIR * 0.35;
    }
    if (ek.not) { y -= SATIR * 0.5; blokYaz([{ metin: ek.not }], { girinti: 0, sol: 0, sag: 0, egik: true, yasla: false }); }
  }

  // İçindekiler: metin yazıldıktan sonra sayfa numaralarıyla, ad sayfasının ardına konur.
  if (g.icindekiler !== 'yok' && icindekiler.length) {
    const sigan = Math.floor((YUK - UST - ALT - 24 * MM) / SATIR);
    const sayfaSayisi = Math.ceil(icindekiler.length / sigan);
    for (let p = 0; p < sayfaSayisi; p++) {
      const sf = pdf.insertPage(onSayfa + p, [GEN, YUK]);
      let yy = YUK - UST;
      if (p === 0) { yy -= 12 * MM; ortala(sf, 'İçindekiler', duz, 14, yy, GEN - 2 * YAN); }
      yy -= 12 * MM;
      for (const x of icindekiler.slice(p * sigan, (p + 1) * sigan)) {
        yy -= SATIR;
        const no = String(x.sayfa), noGen = duz.widthOfTextAtSize(no, BOY);
        const gen = GEN - 2 * YAN - x.girinti - noGen - 4 * MM, yt = x.girinti ? egik : duz;
        yaz(sf, kirp(x.metin, yt, BOY, gen), yt, BOY, YAN + x.girinti, yy);
        sf.drawText(no, { x: GEN - YAN - noGen, y: yy, size: BOY, font: duz, color: RENK });
      }
    }
  }
  numarali.forEach((s, i) => ortala(s, String(i + 1), duz, 9, ALT / 2, GEN));
  return yedekGecisi && !yedekGecisi.gom ? null : pdf.save();
}

/** ❦ benzeri süs (Literata'da bu işaret yok; çizilir): 20×18'lik kutuda yaprak ve sapı. */
const SUS_YOLU = 'M10 18 C 4.5 13.5 0.5 10 2.6 5.6 C 4.4 2 8.4 2.6 10 6 C 11.6 2.6 15.6 2 17.4 5.6 C 19.5 10 15.5 13.5 10 18 Z M9.4 6.2 C 9 3.5 10.6 1 13.8 0.2 L 14 0.9 C 11.3 1.7 10.2 3.8 10.6 6.2 Z';
/** Harfler arasına ince boşluk (bölüm numarası). */
const aralikli = (s: string) => Array.from(s).join('\u2009');
function kirp(s: string, yt: PDFFont, boy: number, gen: number) {
  if (enOlc(s, yt, boy) <= gen) return s;
  let l = Array.from(s);
  while (l.length && enOlc(l.join('') + '…', yt, boy) > gen) l = l.slice(0, -1);
  return l.join('').trimEnd() + '…';
}

function ortala(s: PDFPage, metin: string, yt: PDFFont, boy: number, y: number, gen: number) {
  const g = enOlc(metin, yt, boy);
  if (g <= gen) { yaz(s, metin, yt, boy, (GEN - g) / 2, y); return; }
  // Uzun ad: satırlara bölünür, ortalanır.
  const satirlar = satirlaraBol(kelimeler([{ metin }], () => yt, boy), gen, 0);
  satirlar.forEach((st, i) => satirCiz(s, st, (GEN - gen) / 2, y - i * boy * 1.3, gen, false, true));
}

/** Parçaları kelimelere böler; boşluksuz biçim değişimi (ör. yarısı kalın kelime) aynı kelimede kalır. Bölünmez
 *  boşluk (U+00A0, U+202F) kelimeyi bölmez: "12 Hasat" aynı satırda kalır. */
export function kelimeler(parcalar: Parca[], yaziTipi: (p: Parca) => PDFFont, boy = BOY): (Kelime | 'satir')[] {
  const l: (Kelime | 'satir')[] = [];
  let k: Kelime | null = null;
  for (const p of parcalar) {
    const yt = yaziTipi(p);
    for (const t of p.metin.replace(/\t/g, ' ').split(/(\n|[  - 　]+)/)) {
      if (!t) continue;
      if (t === '\n') { k = null; l.push('satir'); continue; }
      if (/^\s+$/.test(t)) { if (k) { k.bosluk = yt.widthOfTextAtSize(' ', boy); k = null; } continue; }
      if (!k) { k = { parcalar: [], gen: 0, bosluk: 0, boy }; l.push(k); }
      for (const p of parcala(t, yt)) { k.parcalar.push(p); k.gen += p.yt.widthOfTextAtSize(p.metin, boy); }
    }
  }
  return l;
}

function satirlaraBol(l: (Kelime | 'satir')[], genislik: number, girinti: number | ((satir: number) => number)): Satir[] {
  const satirlar: Satir[] = [];
  let simdiki: Kelime[] = [], gen = 0;
  const sinir = () => genislik - (typeof girinti === 'function' ? girinti(satirlar.length) : satirlar.length === 0 ? girinti : 0);
  const bitir = (son: boolean) => { satirlar.push({ kelimeler: simdiki, son }); simdiki = []; gen = 0; };
  for (const x of l) {
    if (x === 'satir') { bitir(true); continue; }
    const once = simdiki.length ? simdiki[simdiki.length - 1].bosluk : 0;
    if (simdiki.length && gen + once + x.gen > sinir()) bitir(false);
    if (!simdiki.length && x.gen > sinir()) {
      // Satıra sığmayan tek kelime: harf harf bölünür.
      for (const parca of harfleBol(x, sinir())) { simdiki.push(parca); bitir(false); }
      const son = satirlar.pop()!;
      simdiki = son.kelimeler; gen = simdiki.reduce((t, k) => t + k.gen, 0);
      continue;
    }
    gen += (simdiki.length ? once : 0) + x.gen;
    simdiki.push(x);
  }
  if (simdiki.length || !satirlar.length) bitir(true);
  satirlar[satirlar.length - 1].son = true;
  return satirlar;
}

function harfleBol(k: Kelime, sinir: number): Kelime[] {
  const boy = k.boy;
  const l: Kelime[] = [];
  let simdiki: Kelime = { parcalar: [], gen: 0, bosluk: 0, boy };
  for (const p of k.parcalar) {
    for (const h of Array.from(p.metin)) {
      const g = p.yt.widthOfTextAtSize(h, boy);
      if (simdiki.gen + g > sinir && simdiki.parcalar.length) { l.push(simdiki); simdiki = { parcalar: [], gen: 0, bosluk: 0, boy }; }
      const son = simdiki.parcalar[simdiki.parcalar.length - 1];
      if (son && son.yt === p.yt) son.metin += h; else simdiki.parcalar.push({ metin: h, yt: p.yt });
      simdiki.gen += g;
    }
  }
  simdiki.bosluk = k.bosluk;
  l.push(simdiki);
  return l;
}

function satirCiz(s: PDFPage, st: Satir, x: number, y: number, gen: number, yasla: boolean, ortaya = false) {
  const kelimeGen = st.kelimeler.reduce((t, k) => t + k.gen, 0);
  const bosluklar = st.kelimeler.slice(0, -1).reduce((t, k) => t + k.bosluk, 0);
  const aralik = st.kelimeler.length - 1;
  const ek = yasla && aralik > 0 ? Math.max(0, gen - kelimeGen - bosluklar) / aralik : 0;
  let cx = ortaya ? x + (gen - kelimeGen - bosluklar) / 2 : x;
  st.kelimeler.forEach((k, i) => {
    for (const p of k.parcalar) {
      s.drawText(p.metin, { x: cx, y, size: k.boy, font: p.yt, color: RENK });
      cx += p.yt.widthOfTextAtSize(p.metin, k.boy);
    }
    if (i < st.kelimeler.length - 1) cx += k.bosluk + ek;
  });
}
