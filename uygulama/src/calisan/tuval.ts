// Pano (K37): serbest tuval. Evrende istendiği kadar pano olur; her pano derlemeler tablosunda `tuval` türüdür.
// Öğeler tek tek yazılır (`tuval_oge`, `tuval_oge_sil`): iki cihazda aynı panonun farklı öğeleri değişirse ikisi de
// kalır; aynı öğe iki yerde değişirse günlükte sonra gelen geçerlidir. Kart bir kayda bağlıdır, kayıt kopyalanmaz.
// Ok yalnız panodadır; kayıtlar arasında ilişki kurmaz.
import { kodGecerliMi } from '../alan/kod';
import type { Tuval, TuvalKarti, TuvalOgesi, TuvalOgeTuru } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import type { DerlemeBaglami } from './derleme';

export const TUVAL_TURLERI: TuvalOgeTuru[] = ['kart', 'not', 'yazi', 'balon', 'sekil', 'ok', 'gorsel', 'cikartma', 'kalem'];
export const TUVAL_RENKLERI = ['yuzey', 'sari', 'pembe', 'yesil', 'mavi', 'mor', 'turuncu', 'krem'] as const;
const EN_COK_OGE = 2000;
const ID = /^[a-z0-9]{6,40}$/;

function bul(e: EvrenVt, kod: unknown) {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject("SELECT * FROM derlemeler WHERE kod=? AND tur='tuval' AND silindi IS NULL", [kod]) : undefined;
  if (!r) throw new Error('Pano bulunamadı, silinmiş olabilir.');
  return r;
}

export const tuvalOgeleri = (ham: string): TuvalOgesi[] => {
  try { const x = JSON.parse(ham) as unknown; return Array.isArray(x) ? x as TuvalOgesi[] : []; } catch { return []; }
};

export function tuval(e: EvrenVt, kod: string): Tuval {
  const r = bul(e, kod);
  const ogeler = tuvalOgeleri(r.ogeler as string).sort((a, b) => a.sira - b.sira);
  const kartlar: Record<string, TuvalKarti> = {};
  for (const o of ogeler) {
    if (!o.kayit || kartlar[o.kayit]) continue;
    const k = yonlendir(e.db, o.kayit) as string;
    const s = e.db.selectObject('SELECT kod, ad, tur, ozet, gorseller, silindi FROM kayitlar WHERE kod=?', [k]);
    const gorseller = s ? JSON.parse(s.gorseller as string) as string[] : [];
    kartlar[o.kayit] = s ? { kod: k, ad: s.ad as string, tur: s.tur as string, ozet: s.ozet as string, gorsel: gorseller[0] ?? null, silindi: !!s.silindi }
      : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger', ozet: '', gorsel: null, silindi: true };
  }
  return { kod, ad: r.ad as string, ogeler, kartlar };
}

const sayi = (v: unknown, alt: number, ust: number, yoksa = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(ust, Math.max(alt, Math.round(n * 10) / 10)) : yoksa; };
const yazi = (v: unknown, n: number) => String(v ?? '').replace(/\r\n?/g, '\n').slice(0, n);

/** Gelen öğeyi denetler ve sadeleştirir; geçersizse hata verir. */
export function ogeTemizle(e: EvrenVt, o: Partial<TuvalOgesi>): TuvalOgesi {
  if (!o || typeof o !== 'object' || !ID.test(String(o.id))) throw new Error('Geçersiz öğe.');
  if (!TUVAL_TURLERI.includes(o.tur as TuvalOgeTuru)) throw new Error('Geçersiz öğe türü.');
  const tur = o.tur as TuvalOgeTuru;
  let kayit: string | null = null;
  if (tur === 'kart') {
    if (typeof o.kayit !== 'string' || !kodGecerliMi(o.kayit) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [o.kayit]) === undefined) throw new Error('Kartın kaydı bulunamadı.');
    kayit = yonlendir(e.db, o.kayit) as string;
  }
  let gorsel: string | null = null;
  if (tur === 'gorsel') {
    if (!/^[0-9a-f]{64}$/.test(String(o.gorsel))) throw new Error('Geçersiz görsel.');
    gorsel = String(o.gorsel);
  }
  let cizgi: number[] | null = null;
  if (tur === 'kalem') {
    if (!Array.isArray(o.cizgi) || o.cizgi.length < 4 || o.cizgi.length > 4000 || o.cizgi.length % 2) throw new Error('Geçersiz çizim.');
    cizgi = o.cizgi.map((v) => Math.min(1000, Math.max(0, Math.round(Number(v) || 0))));
  }
  let bas: string | null = null, son: string | null = null;
  if (tur === 'ok') {
    if (!ID.test(String(o.bas)) || !ID.test(String(o.son)) || o.bas === o.son) throw new Error('Ok iki ayrı öğeyi bağlamalı.');
    bas = String(o.bas); son = String(o.son);
  }
  const renk = (TUVAL_RENKLERI as readonly string[]).includes(String(o.renk)) ? String(o.renk) : 'yuzey';
  return {
    id: String(o.id), tur, x: sayi(o.x, -100000, 100000), y: sayi(o.y, -100000, 100000),
    g: sayi(o.g, 8, 4000, 160), h: sayi(o.h, 8, 4000, 100), aci: sayi(o.aci, -360, 360), sira: sayi(o.sira, -1e9, 1e9),
    renk, metin: yazi(o.metin, tur === 'cikartma' ? 16 : 4000), kayit, gorsel,
    sekil: tur === 'sekil' ? (o.sekil === 'elips' ? 'elips' : 'dikdortgen') : null, cizgi, bas, son,
    kalin: tur === 'kalem' || tur === 'sekil' || tur === 'ok' ? sayi(o.kalin, 1, 24, 2) : 0,
  };
}

/** Bir ya da birkaç öğeyi ekler ya da değiştirir; tek işlemdir. */
export function tuvalOgeYaz(b: DerlemeBaglami, kod: string, ogeler: Partial<TuvalOgesi>[]) {
  const r = bul(b.e, kod);
  if (!Array.isArray(ogeler) || !ogeler.length || ogeler.length > 500) throw new Error('Geçersiz öğe listesi.');
  const eski = new Map(tuvalOgeleri(r.ogeler as string).map((o) => [o.id, o]));
  const yeni = ogeler.map((o) => ogeTemizle(b.e, o));
  const yeniSayi = yeni.filter((o) => !eski.has(o.id)).length;
  if (eski.size + yeniSayi > EN_COK_OGE) throw new Error(`Bir panoda en çok ${EN_COK_OGE} öğe olabilir.`);
  const degisen = yeni.filter((o) => JSON.stringify(eski.get(o.id)) !== JSON.stringify(o));
  if (!degisen.length) return;
  b.yaz([{ tur: 'tuval_oge', veri: { kod, ogeler: degisen, derlemeAd: r.ad } }], [...new Set(degisen.flatMap((o) => (o.kayit ? [o.kayit] : [])))]);
}

/** Öğeleri kaldırır; kaldırılan öğeye bağlı oklar da gider. */
export function tuvalOgeSil(b: DerlemeBaglami, kod: string, idler: string[]) {
  const r = bul(b.e, kod);
  if (!Array.isArray(idler) || !idler.length || idler.length > 2000 || !idler.every((x) => ID.test(String(x)))) throw new Error('Geçersiz öğe listesi.');
  const var_ = new Set(tuvalOgeleri(r.ogeler as string).map((o) => o.id));
  const sil = idler.filter((x) => var_.has(x));
  if (!sil.length) return;
  b.yaz([{ tur: 'tuval_oge_sil', veri: { kod, idler: sil, derlemeAd: r.ad } }], []);
}
