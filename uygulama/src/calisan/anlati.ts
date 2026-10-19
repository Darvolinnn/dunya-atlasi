// Anlatı yapısı (§3.3): eser → bölüm → sahne. Sıra, sahne kodlarına dayanır; bölüm numarası saklanmaz,
// okuma sırasından hesaplanır. Sahne başka bölüme taşınınca evren tarihi değişmez; okura sunulan sıraya bağlı
// şeylerin kısa özeti (anlatı etki özeti) yalnızca açık işaretlere, yani bağlantılara dayanır.
import type { IslemGirdisi } from '../alan/islem';
import { araKonum } from '../alan/sira';
import { yeniKod } from '../alan/kod';
import type { AnlatiEtkisi, AnlatiYeri, EserYapisi, YapiSahnesi } from '../veri/api';
import type { EvrenVt } from './evren-vt';

export interface AnlatiBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  kayitGirdileri(kod: string, v: { ad: string; tur: string; karar: string; ozet: string }): IslemGirdisi[];
}

type Satir = { kod: string; ad: string; tur: string; karar: string; konum: string; tarih: string | null };

const cocuklar = (e: EvrenVt, ust: string): Satir[] => e.db.selectObjects(
  `SELECT k.kod, k.ad, k.tur, k.karar, a.konum, k.tarih FROM anlati a JOIN kayitlar k ON k.kod=a.kod
   WHERE a.ust=? AND k.silindi IS NULL ORDER BY a.konum, a.kod`, [ust]) as Satir[];

const sahne = (r: Satir, sira: number): YapiSahnesi => ({ kod: r.kod, ad: r.ad, tur: r.tur, karar: r.karar, tarih: r.tarih ? JSON.parse(r.tarih) : null, sira });

/** Bir eserin bölümleri ve sahneleri, okuma sırasıyla. Bölüme yerleşmemiş sahneler eserin başında durur. */
export function eserYapisi(e: EvrenVt, eser: string): EserYapisi {
  const ad = e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [eser]) as string;
  const ust = cocuklar(e, eser);
  let n = 0;
  const dogrudan = ust.filter((r) => r.tur !== 'bolum').map((r) => sahne(r, ++n));
  const bolumler = ust.filter((r) => r.tur === 'bolum').map((b, i) => ({
    kod: b.kod, ad: b.ad, karar: b.karar, sira: i + 1, sahneler: cocuklar(e, b.kod).filter((r) => r.tur !== 'bolum').map((r) => sahne(r, ++n)),
  }));
  return { eser: { kod: eser, ad }, bolumler, dogrudan };
}

/** Okuma sırası: eserin bütün sahneleri. */
const okumaSirasi = (y: EserYapisi) => [...y.dogrudan, ...y.bolumler.flatMap((b) => b.sahneler)];

function ustBul(e: EvrenVt, kod: string): string | null {
  return (e.db.selectValue('SELECT ust FROM anlati WHERE kod=?', [kod]) as string | undefined) ?? null;
}
const turu = (e: EvrenVt, kod: string) => e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined;

/** Bir kaydın (sahne ya da bölüm) eserdeki yeri. */
export function anlatiYeri(e: EvrenVt, kod: string): AnlatiYeri {
  const bos: AnlatiYeri = { eser: null, bolum: null, sira: null, onceki: null, sonraki: null };
  const ust = ustBul(e, kod);
  if (!ust) return bos;
  const ustTur = turu(e, ust);
  const eserKod = ustTur === 'bolum' ? ustBul(e, ust) : ust;
  if (!eserKod || turu(e, eserKod) !== 'eser') return bos;
  const y = eserYapisi(e, eserKod);
  const eser = y.eser;
  if (turu(e, kod) === 'bolum') {
    const b = y.bolumler.find((x) => x.kod === kod);
    return { ...bos, eser, bolum: b ? { kod: b.kod, ad: b.ad, sira: b.sira } : null };
  }
  const sira = okumaSirasi(y);
  const i = sira.findIndex((s) => s.kod === kod);
  const b = y.bolumler.find((x) => x.sahneler.some((s) => s.kod === kod));
  return {
    eser, bolum: b ? { kod: b.kod, ad: b.ad, sira: b.sira } : null, sira: i >= 0 ? i + 1 : null,
    onceki: i > 0 ? { kod: sira[i - 1].kod, ad: sira[i - 1].ad } : null,
    sonraki: i >= 0 && i < sira.length - 1 ? { kod: sira[i + 1].kod, ad: sira[i + 1].ad } : null,
  };
}

/** Hiçbir esere yerleşmemiş sahne ve bölümler. */
export function yerlesmemisler(e: EvrenVt): YapiSahnesi[] {
  return (e.db.selectObjects(
    `SELECT k.kod, k.ad, k.tur, k.karar, '' konum, k.tarih FROM kayitlar k
     WHERE k.tur IN ('sahne','bolum') AND k.silindi IS NULL AND k.kod NOT IN (SELECT kod FROM anlati) ORDER BY k.olusturma`) as Satir[])
    .map((r, i) => sahne(r, i + 1));
}

/** İlk tanıtım: eserde bir kayda ilk bağlanan sahne (okuma sırasıyla). */
function ilkTanitimlar(e: EvrenVt, sira: { kod: string; ad: string }[]) {
  const ilk = new Map<string, { kod: string; ad: string }>();
  for (const s of sira) {
    for (const r of e.db.selectObjects('SELECT DISTINCT hedef FROM baglantilar WHERE kaynak=?', [s.kod])) {
      const h = r.hedef as string;
      if (!ilk.has(h)) ilk.set(h, { kod: s.kod, ad: s.ad });
    }
  }
  return ilk;
}

/**
 * Bir sahneyi ya da bölümü yerleştirir: `ust` içinde `sira` numaralı yere (0'dan; kardeşlerin sayısı
 * kadar olabilir). ust null ise yapıdan çıkarır. Taşımadan sonra adların ilk tanıtıldığı sahne değişenler
 * döner (anlatı etki özeti, §3.3).
 */
export function yerlestir(b: AnlatiBaglami, kod: string, ust: string | null, sira: number | null): { etki: AnlatiEtkisi[] } {
  const { e } = b;
  const tur = turu(e, kod);
  if (tur !== 'sahne' && tur !== 'bolum') throw new Error('Yalnızca sahneler ve bölümler yerleştirilebilir.');
  if (ust !== null) {
    const ustTur = turu(e, ust);
    if (ustTur === undefined) throw new Error('Kayıt bulunamadı.');
    if (tur === 'bolum' && ustTur !== 'eser') throw new Error('Bölüm yalnızca bir eserin içine yerleştirilebilir.');
    if (tur === 'sahne' && ustTur !== 'eser' && ustTur !== 'bolum') throw new Error('Sahne yalnızca bir eserin ya da bölümün içine yerleştirilebilir.');
  }
  const eserOf = (u: string | null) => (u && turu(e, u) === 'bolum' ? ustBul(e, u) : u);
  const etkilenenEserler = [...new Set([eserOf(ustBul(e, kod)), eserOf(ust)].filter((x): x is string => !!x && turu(e, x) === 'eser'))];
  const once = new Map(etkilenenEserler.map((x) => [x, ilkTanitimlar(e, okumaSirasi(eserYapisi(e, x)))]));

  let konum: string | null = null;
  if (ust !== null) {
    const kardes = cocuklar(e, ust).filter((r) => r.kod !== kod && (tur === 'bolum' ? r.tur === 'bolum' : r.tur !== 'bolum'));
    // Bölümler ve sahneler aynı üst altında ayrı sıralanır; sahnenin konumu yalnız sahneler arasında hesaplanır.
    const i = Math.max(0, Math.min(sira ?? kardes.length, kardes.length));
    const sol = i > 0 ? kardes[i - 1].konum : null;
    const sag = i < kardes.length ? kardes[i].konum : null;
    // Komşu anahtarlar eşitse (iki cihaz aynı yeri seçmiş) aradaki yer sağdakinden sonrasına kayar.
    konum = sol !== null && sag !== null && sol >= sag ? araKonum(sol, null) : araKonum(sol, sag);
  }
  const onceki = e.db.selectObject('SELECT ust, konum FROM anlati WHERE kod=?', [kod]);
  if ((onceki?.ust ?? null) === ust && ust === null) return { etki: [] };
  b.yaz([{ tur: 'anlati_yerlestir', veri: { kod, ust, konum, onceki: onceki ? { ust: onceki.ust, konum: onceki.konum } : null } }], [kod, ...(ust ? [ust] : [])]);

  const etki: AnlatiEtkisi[] = [];
  for (const x of etkilenenEserler) {
    const sonra = ilkTanitimlar(e, okumaSirasi(eserYapisi(e, x)));
    const eski = once.get(x)!;
    for (const h of new Set([...eski.keys(), ...sonra.keys()])) {
      const a = eski.get(h) ?? null, c = sonra.get(h) ?? null;
      if (a?.kod === c?.kod) continue;
      const ad = e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [h]) as string | undefined;
      if (ad === undefined) continue;
      etki.push({ kayit: { kod: h, ad }, onceki: a, yeni: c });
    }
  }
  return { etki };
}

/** Yeni bölüm ya da sahne oluşturup aynı işlem grubunda sonuna yerleştirir. */
export function olusturVeYerlestir(b: AnlatiBaglami, ust: string, ad: string, tur: 'bolum' | 'sahne') {
  const { e } = b;
  const ustTur = turu(e, ust);
  if (!ustTur) throw new Error('Kayıt bulunamadı.');
  if (tur === 'bolum' && ustTur !== 'eser') throw new Error('Bölüm yalnızca bir esere eklenebilir.');
  if (tur === 'sahne' && ustTur !== 'eser' && ustTur !== 'bolum') throw new Error('Sahne yalnızca bir esere ya da bölüme eklenebilir.');
  const kardes = cocuklar(e, ust).filter((r) => (tur === 'bolum' ? r.tur === 'bolum' : r.tur !== 'bolum'));
  const kod = yeniKod();
  const konum = araKonum(kardes.length ? kardes[kardes.length - 1].konum : null, null);
  b.yaz([...b.kayitGirdileri(kod, { ad, tur, karar: 'kesin', ozet: '' }), { tur: 'anlati_yerlestir', veri: { kod, ust, konum, onceki: null } }], [kod, ust]);
  return { kod };
}
