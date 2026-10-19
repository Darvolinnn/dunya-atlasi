// Teknoloji ve motif (§4.4, §4.6, F20). Teknolojinin keşfi, bir yere yayılması ve gündelik hayata girmesi ayrı
// tarihlerdir; bir yerde belli bir tarihte hangi aşamaya ulaştığı yalnızca bu kayıtlardan hesaplanır. Kayıt yoksa
// "yok" denmez (§2.2 kural 4). Kimin bildiği, üretebildiği, kullanabildiği ayrı ilişkilerdir. Motifin yorumları
// yorumlayana ve döneme göre ayrı tutulur; geçtiği sahneler okuma sırasıyla gösterilir.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { karsilastir, tarihCoz, tarihAciklamasi, type EvrenTarihi } from '../alan/tarih';
import type { KisaKayit, MotifBilgisi, MotifYorumu, TeknolojiAsamasi, TeknolojiDurumu, TeknolojiTanimi } from '../veri/api';
import { anlatiYeri } from './anlati';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';

export interface TeknolojiBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;
const DERINLIK = 12;
export const ASAMALAR: { kod: TeknolojiAsamasi['asama']; ad: string }[] = [
  { kod: 'kesif', ad: 'Keşif' }, { kod: 'yayilma', ad: 'Yayılma' }, { kod: 'gundelik', ad: 'Gündelik hayata girme' },
];

const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
};
function kayitTuru(e: EvrenVt, kod: unknown): string {
  const t = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  return t;
}
const temiz = (x: unknown, n = 300) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// ---------- Teknoloji ----------

type SakliAsama = { asama: TeknolojiAsamasi['asama']; yer: string | null; tarih: EvrenTarihi | null; not: string };
interface SakliTeknoloji { duzeyler: { alan: string; duzey: string }[]; asamalar: SakliAsama[] }
const BOS_TEK: SakliTeknoloji = { duzeyler: [], asamalar: [] };

function sakliOku(e: EvrenVt, kod: string): SakliTeknoloji {
  const r = e.db.selectValue('SELECT tanim FROM teknoloji_tanimlari WHERE kod=?', [kod]) as string | undefined;
  return r ? JSON.parse(r) as SakliTeknoloji : BOS_TEK;
}

export function teknolojiOku(e: EvrenVt, kod: string): TeknolojiTanimi {
  if (kayitTuru(e, kod) !== 'teknoloji') throw new Error('Bu bir teknoloji kaydı değil.');
  const t = sakliOku(e, kod);
  return { duzeyler: t.duzeyler, asamalar: t.asamalar.map((a) => ({ ...a, yer: a.yer ? kisa(e, a.yer) : null })) };
}

export function teknolojiYaz(b: TeknolojiBaglami, kod: string, g: { duzeyler: { alan: string; duzey: string }[]; asamalar: { asama: string; yer: string | null; tarih: string; not: string }[] }) {
  if (kayitTuru(b.e, kod) !== 'teknoloji') throw new Error('Bu bir teknoloji kaydı değil.');
  if (!Array.isArray(g.duzeyler) || g.duzeyler.length > 100 || !Array.isArray(g.asamalar) || g.asamalar.length > 300) throw new Error('Liste çok uzun ya da geçersiz.');
  const z = zamanSetiOku(b.e.db);
  const duzeyler = g.duzeyler.map((d) => ({ alan: temiz(d.alan, 80), duzey: temiz(d.duzey, 200) })).filter((d) => d.alan || d.duzey);
  const asamalar: SakliAsama[] = g.asamalar.map((a) => {
    if (!ASAMALAR.some((x) => x.kod === a.asama)) throw new Error('Geçersiz aşama.');
    if (a.yer) kayitTuru(b.e, a.yer);
    const ifade = temiz(a.tarih, 120);
    let tarih: EvrenTarihi | null = null;
    if (ifade) { tarih = tarihCoz(ifade, z); if (!tarih?.eksen) throw new Error(`Tarih okunamadı: “${ifade}”.`); }
    return { asama: a.asama as SakliAsama['asama'], yer: a.yer ? yonlendir(b.e.db, a.yer) as string : null, tarih, not: temiz(a.not) };
  });
  const yeni = { duzeyler, asamalar };
  if (JSON.stringify(yeni) === JSON.stringify(sakliOku(b.e, kod))) return;
  b.yaz([{ tur: 'teknoloji_yaz', veri: { kod, tanim: yeni } }], [kod, ...asamalar.flatMap((a) => (a.yer ? [a.yer] : []))]);
}

/** Yer ve onu kapsayan yerler, en yakından uzağa. */
function kapsayanlar(e: EvrenVt, yer: string) {
  const yerler = [yer];
  for (let n = 0; n < DERINLIK; n++) {
    const ust = e.db.selectObjects(`SELECT i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.a IN (${yerler.map(() => '?').join(',')}) AND i.tur='parca' AND ${ETKIN} AND k.silindi IS NULL`, yerler)
      .map((r) => r.b as string).filter((u, i, l) => !yerler.includes(u) && l.indexOf(u) === i);
    if (!ust.length) break;
    yerler.push(...ust);
  }
  return yerler;
}

/** Bir yerde belli bir tarihte teknolojilerin kayıtlara göre hangi aşamaya ulaşabildiği. */
export function teknolojiDurumu(e: EvrenVt, yer: string, tarihIfade: string): TeknolojiDurumu {
  kayitTuru(e, yer);
  const z = zamanSetiOku(e.db);
  const tarih = tarihCoz(temiz(tarihIfade, 120), z);
  if (!tarih?.eksen) throw new Error('Tarih okunamadı.');
  const yerler = kapsayanlar(e, yer);
  const teknolojiler = e.db.selectObjects(`SELECT kod FROM kayitlar WHERE tur='teknoloji' AND silindi IS NULL AND karar<>'vazgecildi' ORDER BY ad`).map((r) => r.kod as string);
  const satirlar: TeknolojiDurumu['satirlar'] = [];
  for (const t of teknolojiler) {
    const l = sakliOku(e, t).asamalar;
    if (!l.length) continue;
    const ilgili = l.filter((a) => a.yer === null || yerler.includes(yonlendir(e.db, a.yer) as string));
    const disarida = l.filter((a) => a.yer !== null && !yerler.includes(yonlendir(e.db, a.yer) as string) && a.tarih && karsilastir(tarih, a.tarih) === 'sonra');
    let kesin: SakliAsama['asama'] | null = null, belki: SakliAsama['asama'] | null = null;
    const dayanak: string[] = [];
    for (const s of ASAMALAR) {
      for (const a of ilgili.filter((x) => x.asama === s.kod)) {
        const k = a.tarih ? karsilastir(tarih, a.tarih) : 'belirsiz';
        const nerede = a.yer ? `“${kisa(e, a.yer).ad}”` : 'genel';
        const ne = a.tarih ? tarihAciklamasi(a.tarih, z) : 'tarihsiz';
        if (k === 'sonra') { kesin = s.kod; dayanak.push(`${s.ad}: ${nerede}, ${ne}`); } else if (k === 'belirsiz') { belki = s.kod; dayanak.push(`${s.ad} belki: ${nerede}, ${ne}`); }
      }
    }
    if (belki && kesin && ASAMALAR.findIndex((x) => x.kod === belki) <= ASAMALAR.findIndex((x) => x.kod === kesin)) belki = null;
    satirlar.push({ teknoloji: kisa(e, t), kesin, belki, dayanak, baskaYerde: [...new Set(disarida.map((a) => a.yer!))].map((y) => kisa(e, y)) });
  }
  return {
    yer: kisa(e, yer), tarih, yerler: yerler.map((y) => kisa(e, y)), satirlar,
    not: 'Yalnızca yazılmış keşif, yayılma ve gündelik hayata girme kayıtları gösterilir. Kaydı olmayan bir teknoloji için “yok” denmez. Bir teknolojinin bir yere ulaşmış olması, oradaki birinin onu tanıdığını ya da kullanabildiğini göstermez.',
  };
}

// ---------- Motif ----------

type SakliYorum = { yorumlayan: string | null; donem: string | null; anlam: string };
function yorumlarOku(e: EvrenVt, kod: string): SakliYorum[] {
  const r = e.db.selectValue('SELECT yorumlar FROM motif_yorumlari WHERE kod=?', [kod]) as string | undefined;
  return r ? JSON.parse(r) as SakliYorum[] : [];
}

export function motifBilgisi(e: EvrenVt, kod: string): MotifBilgisi {
  kayitTuru(e, kod);
  const yorumlar: MotifYorumu[] = yorumlarOku(e, kod).map((y) => ({ yorumlayan: y.yorumlayan ? kisa(e, y.yorumlayan) : null, donem: y.donem ? kisa(e, y.donem) : null, anlam: y.anlam }));
  const sahneler = e.db.selectObjects(`SELECT i.a FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.b=? AND i.tur='motif_gecer' AND ${ETKIN} AND k.silindi IS NULL`, [kod])
    .map((r) => { const s = r.a as string; const y = anlatiYeri(e, s); return { sahne: kisa(e, s), eser: y.eser, sira: y.sira }; })
    .sort((a, b) => (a.eser?.ad ?? '￿').localeCompare(b.eser?.ad ?? '￿', 'tr') || (a.sira ?? 1e9) - (b.sira ?? 1e9));
  return { yorumlar, sahneler };
}

export function motifYorumlariYaz(b: TeknolojiBaglami, kod: string, l: { yorumlayan: string | null; donem: string | null; anlam: string }[]) {
  kayitTuru(b.e, kod);
  if (!Array.isArray(l) || l.length > 100) throw new Error('Liste çok uzun ya da geçersiz.');
  const yeni: SakliYorum[] = l.map((y) => {
    if (y.yorumlayan) kayitTuru(b.e, y.yorumlayan);
    if (y.donem) kayitTuru(b.e, y.donem);
    const anlam = temiz(y.anlam, 500);
    if (!anlam) throw new Error('Yorumun anlamını yazın.');
    return { yorumlayan: y.yorumlayan || null, donem: y.donem || null, anlam };
  });
  if (JSON.stringify(yeni) === JSON.stringify(yorumlarOku(b.e, kod))) return;
  b.yaz([{ tur: 'motif_yorum_yaz', veri: { kod, yorumlar: yeni } }], [kod]);
}
