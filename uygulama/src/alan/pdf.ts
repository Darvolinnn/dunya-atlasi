// Eserin PDF çıktısı (§10.11): yazdırma penceresine gerek kalmadan doğrudan PDF dosyası. Yazı tipi (Literata)
// programın içinde gelir ve PDF'e gömülür; ağ gerekmez, Türkçe harfler her cihazda aynı görünür ve metin
// kopyalanıp aranabilir. Sayfa düzeni: 13,5×21 cm kitap ölçüsü, kapak, her bölüm yeni sayfada,
// iki yana yaslı paragraflar, sahneler arasında ayraç, altta sayfa numarası.
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Blok, Kitap, Parca } from './kitap';

/** Gömülecek yazı tiplerinin dosyaları (TrueType). */
export interface YaziTipleri { duz: Uint8Array; egik: Uint8Array; kalin: Uint8Array; kalinEgik: Uint8Array }

const MM = 72 / 25.4;
// Türkiye'de romanların yaygın kitap ölçüsü 13,5×21 cm; 11 punto, 1,3 satır aralığı.
const GEN = 135 * MM, YUK = 210 * MM;
const UST = 17 * MM, ALT = 20 * MM, YAN = 15 * MM;
const BOY = 11, SATIR = BOY * 1.3, GIRINTI = BOY * 1.5;
const ALINTI_GIRINTI = 8 * MM;
const RENK = rgb(0.1, 0.1, 0.1);

interface Kelime { parcalar: { metin: string; yt: PDFFont }[]; gen: number; bosluk: number; boy: number }
type Satir = { kelimeler: Kelime[]; son: boolean };

export async function pdfYaz(k: Kitap, yt: YaziTipleri, zaman = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [duz, egik, kalin, kalinEgik] = await Promise.all([yt.duz, yt.egik, yt.kalin, yt.kalinEgik].map((d) => pdf.embedFont(d, { subset: true })));
  const yaziTipi = (p: { kalin?: boolean; egik?: boolean }) => p.kalin ? (p.egik ? kalinEgik : kalin) : p.egik ? egik : duz;
  pdf.setTitle(k.ad, { showInWindowTitleBar: true });
  pdf.setLanguage('tr-TR');
  pdf.setCreator('Dünya Atlası');
  pdf.setProducer('Dünya Atlası');
  pdf.setCreationDate(zaman);
  pdf.setModificationDate(zaman);

  // Kapak
  const kapak = pdf.addPage([GEN, YUK]);
  ortala(kapak, k.ad, duz, 22, YUK * 0.6, GEN - 2 * YAN);

  let sayfa!: PDFPage, y = 0;
  const numarali: PDFPage[] = [];
  const yeniSayfa = () => { sayfa = pdf.addPage([GEN, YUK]); numarali.push(sayfa); y = YUK - UST; };
  /** Sayfada en az `gereken` yükseklik yoksa yeni sayfaya geçer. */
  const yerAc = (gereken: number) => { if (y - gereken < ALT) yeniSayfa(); };

  /** Bir bloğu satırlara bölüp yazar. */
  const blokYaz = (parcalar: Parca[], o: { girinti: number; sol: number; sag: number; egik?: boolean; kalin?: boolean; yasla: boolean }) => {
    const genislik = GEN - 2 * YAN - o.sol - o.sag;
    const satirlar = satirlaraBol(kelimeler(parcalar.map((p) => ({ ...p, egik: p.egik || o.egik, kalin: p.kalin || o.kalin })), yaziTipi), genislik, o.girinti);
    satirlar.forEach((s, i) => {
      // Paragrafın tek satırı sayfanın dibinde kalmasın (öksüz satır): ilk satırdan sonra en az bir satır daha sığmalı.
      if (i === 0 && satirlar.length > 1) yerAc(2 * SATIR); else yerAc(SATIR);
      y -= SATIR;
      const bas = YAN + o.sol + (i === 0 ? o.girinti : 0);
      const gen = genislik - (i === 0 ? o.girinti : 0);
      satirCiz(sayfa, s, bas, y + (SATIR - BOY) / 2, gen, o.yasla && !s.son);
    });
  };

  for (const b of k.bolumler) {
    yeniSayfa();
    y -= 30 * MM;
    for (const satir of satirlaraBol(kelimeler([{ metin: b.baslik }], yaziTipi, 16), GEN - 2 * YAN, 0)) {
      y -= 16 * 1.4;
      satirCiz(sayfa, satir, YAN, y, GEN - 2 * YAN, false, true);
    }
    y -= 12 * MM;
    let ilk = true;
    b.sahneler.forEach((s, i) => {
      if (i > 0) {
        yerAc(4 * SATIR);
        y -= SATIR * 1.5;
        ortala(sayfa, '*   *   *', duz, BOY, y, GEN - 2 * YAN);
        y -= SATIR * 0.5;
        ilk = true;
      }
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
          blokYaz(bl.parcalar, { girinti: ilk ? 0 : GIRINTI, sol: 0, sag: 0, yasla: true });
          ilk = false;
        }
      }
    });
  }
  numarali.forEach((s, i) => ortala(s, String(i + 1), duz, 9, ALT / 2, GEN));
  return pdf.save();
}

function ortala(s: PDFPage, metin: string, yt: PDFFont, boy: number, y: number, gen: number) {
  const g = yt.widthOfTextAtSize(metin, boy);
  if (g <= gen) { s.drawText(metin, { x: (GEN - g) / 2, y, size: boy, font: yt, color: RENK }); return; }
  // Uzun ad: satırlara bölünür, ortalanır.
  const satirlar = satirlaraBol(kelimeler([{ metin }], () => yt, boy), gen, 0);
  satirlar.forEach((st, i) => satirCiz(s, st, (GEN - gen) / 2, y - i * boy * 1.3, gen, false, true));
}

/** Parçaları kelimelere böler; boşluksuz biçim değişimi (ör. yarısı kalın kelime) aynı kelimede kalır. */
function kelimeler(parcalar: Parca[], yaziTipi: (p: Parca) => PDFFont, boy = BOY): (Kelime | 'satir')[] {
  const l: (Kelime | 'satir')[] = [];
  let k: Kelime | null = null;
  for (const p of parcalar) {
    const yt = yaziTipi(p);
    for (const t of p.metin.replace(/\t/g, ' ').split(/(\n|[   -  　]+)/)) {
      if (!t) continue;
      if (t === '\n') { k = null; l.push('satir'); continue; }
      if (/^\s+$/.test(t)) { if (k) { k.bosluk = yt.widthOfTextAtSize(' ', boy); k = null; } continue; }
      if (!k) { k = { parcalar: [], gen: 0, bosluk: 0, boy }; l.push(k); }
      k.parcalar.push({ metin: t, yt });
      k.gen += yt.widthOfTextAtSize(t, boy);
    }
  }
  return l;
}

function satirlaraBol(l: (Kelime | 'satir')[], genislik: number, girinti: number): Satir[] {
  const satirlar: Satir[] = [];
  let simdiki: Kelime[] = [], gen = 0;
  const sinir = () => genislik - (satirlar.length === 0 ? girinti : 0);
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
