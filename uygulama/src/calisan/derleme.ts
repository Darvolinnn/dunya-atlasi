// Gezinti ve görsel pano (§7). İkisi de yazarın kendi derlediği listedir; kayıtlar kopyalanmaz, liste onlara bağlanır.
// Gezinti, uzun aradan sonra evrene dönmek için hazırlanmış kayıt dizisidir ("Başkentte bir gün"). Görsel pano eskiz,
// kıyafet, arma ve mimari görsellerini toplar: görselin bir noktasına not, iki görseli yan yana koyma, güncel görünümü
// işaretleme ve eski çizimleri gelişim geçmişi olarak saklama.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { turkceKarsilastir } from '../alan/turkce';
import type { Derleme, DerlemeOzeti, GezintiAdimi, PanoOgesi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

export interface DerlemeBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}
export type DerlemeTuru = 'gezinti' | 'pano';
const TURLER: DerlemeTuru[] = ['gezinti', 'pano'];
export type SakliOge = Omit<PanoOgesi, 'kayit' | 'eksik'> & { kayit: string | null };

const temiz = (s: unknown, n: number) => String(s ?? '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const kayitVar = (e: EvrenVt, kod: unknown) => typeof kod === 'string' && kodGecerliMi(kod) && e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kod]) !== undefined;
const kisa = (e: EvrenVt, kod: string) => {
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT ad, tur, silindi FROM kayitlar WHERE kod=?', [k]);
  return r && !r.silindi ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
};

export function derlemeler(e: EvrenVt, tur: DerlemeTuru): DerlemeOzeti[] {
  return e.db.selectObjects('SELECT kod, ad, ogeler, duzenleme FROM derlemeler WHERE tur=? AND silindi IS NULL', [tur])
    .map((r) => ({ kod: r.kod as string, tur, ad: r.ad as string, ogeSayisi: (JSON.parse(r.ogeler as string) as unknown[]).length, duzenleme: Number(r.duzenleme) }))
    .sort((a, b) => turkceKarsilastir(a.ad, b.ad));
}

function bul(e: EvrenVt, kod: unknown) {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM derlemeler WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Bulunamadı; silinmiş olabilir.');
  return r;
}

export function derleme(e: EvrenVt, kod: string): Derleme {
  const r = bul(e, kod);
  const tur = r.tur as DerlemeTuru;
  const ham = JSON.parse(r.ogeler as string) as unknown[];
  const medya = (ad: string) => e.db.selectValue('SELECT 1 FROM medya WHERE ad=?', [ad]) !== undefined;
  if (tur === 'gezinti') {
    const adimlar = (ham as { kayit: string; not: string }[]).map((a) => ({ kayit: kisa(e, a.kayit), not: a.not }));
    return { kod, tur, ad: r.ad as string, adimlar, ogeler: [] };
  }
  const ogeler = (ham as SakliOge[]).map((o) => ({ ...o, kayit: o.kayit ? kisa(e, o.kayit) : null, eksik: !medya(o.gorsel) }));
  return { kod, tur, ad: r.ad as string, adimlar: [], ogeler };
}

export function derlemeOlustur(b: DerlemeBaglami, tur: DerlemeTuru, ad: string) {
  if (!TURLER.includes(tur)) throw new Error('Geçersiz tür.');
  const a = temiz(ad, 120);
  if (!a) throw new Error('Ad boş olamaz.');
  const kod = yeniKod();
  b.yaz([{ tur: 'derleme_yaz', veri: { kod, derlemeTuru: tur, alan: 'ad', deger: a, derlemeAd: a } }], []);
  return { kod };
}

export function derlemeAdYaz(b: DerlemeBaglami, kod: string, ad: string) {
  const r = bul(b.e, kod);
  const a = temiz(ad, 120);
  if (!a) throw new Error('Ad boş olamaz.');
  if (a === r.ad) return;
  b.yaz([{ tur: 'derleme_yaz', veri: { kod, derlemeTuru: r.tur, alan: 'ad', deger: a, derlemeAd: r.ad } }], []);
}

/** Gezinti adımları: sıralı kayıtlar ve her adımın kısa notu. */
export function gezintiYaz(b: DerlemeBaglami, kod: string, adimlar: GezintiAdimi[]) {
  const r = bul(b.e, kod);
  if (r.tur !== 'gezinti') throw new Error('Bu bir gezinti değil.');
  if (!Array.isArray(adimlar) || adimlar.length > 200) throw new Error('En çok 200 adım olabilir.');
  const yeni = adimlar.map((a) => {
    if (!kayitVar(b.e, a?.kayit)) throw new Error('Adımdaki kayıt bulunamadı.');
    return { kayit: yonlendir(b.e.db, a.kayit) as string, not: temiz(a.not, 1000) };
  });
  if (JSON.stringify(yeni) === r.ogeler) return;
  b.yaz([{ tur: 'derleme_yaz', veri: { kod, derlemeTuru: 'gezinti', alan: 'ogeler', deger: yeni, derlemeAd: r.ad } }], [...new Set(yeni.map((a) => a.kayit))]);
}

/** Pano ögeleri. Bir kaydın yalnızca bir görseli güncel olabilir; aynı kaydın başka görseli güncel işaretlenince öncekisi eskiye geçer. */
export function panoYaz(b: DerlemeBaglami, kod: string, ogeler: SakliOge[]) {
  const r = bul(b.e, kod);
  if (r.tur !== 'pano') throw new Error('Bu bir görsel pano değil.');
  if (!Array.isArray(ogeler) || ogeler.length > 300) throw new Error('En çok 300 görsel olabilir.');
  const yeni = ogeler.map((o) => {
    if (!/^[0-9a-f]{64}$/.test(String(o?.gorsel))) throw new Error('Geçersiz görsel.');
    if (o.kayit && !kayitVar(b.e, o.kayit)) throw new Error('Görselin bağlı olduğu kayıt bulunamadı.');
    if (!Array.isArray(o.notlar) || o.notlar.length > 50) throw new Error('Bir görselde en çok 50 not olabilir.');
    const notlar = o.notlar.map((n) => {
      const x = Number(n?.x), y = Number(n?.y);
      if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) throw new Error('Not görselin dışında.');
      const metin = temiz(n.metin, 500);
      if (!metin) throw new Error('Notun metnini yazın.');
      return { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000, metin };
    });
    const durum = o.durum === 'guncel' || o.durum === 'eski' ? o.durum : null;
    return { kod: kodGecerliMi(o.kod) ? o.kod : yeniKod(), gorsel: o.gorsel, kayit: o.kayit ? yonlendir(b.e.db, o.kayit) as string : null, baslik: temiz(o.baslik, 200), durum, notlar };
  });
  // Aynı kayıtta birden çok güncel varsa sonuncusu kalır, ötekiler eskiye geçer.
  const gorulen = new Set<string>();
  for (let i = yeni.length - 1; i >= 0; i--) {
    const o = yeni[i];
    if (o.durum !== 'guncel' || !o.kayit) continue;
    if (gorulen.has(o.kayit)) o.durum = 'eski';
    gorulen.add(o.kayit);
  }
  if (JSON.stringify(yeni) === r.ogeler) return;
  b.yaz([{ tur: 'derleme_yaz', veri: { kod, derlemeTuru: 'pano', alan: 'ogeler', deger: yeni, derlemeAd: r.ad } }], [...new Set(yeni.flatMap((o) => (o.kayit ? [o.kayit] : [])))]);
}

export function derlemeSil(b: DerlemeBaglami, kod: string, geriYukle: boolean) {
  const r = b.e.db.selectObject('SELECT ad, tur, silindi FROM derlemeler WHERE kod=?', [kod]);
  if (!r) throw new Error('Bulunamadı.');
  if (!!r.silindi !== geriYukle) return;
  b.yaz([{ tur: geriYukle ? 'derleme_geri_yukle' : 'derleme_sil', veri: { kod, derlemeTuru: r.tur, derlemeAd: r.ad } }], []);
}

/** Bir kaydın göründüğü gezintiler ve panolar. */
export function kayitDerlemeleri(e: EvrenVt, kayit: string): DerlemeOzeti[] {
  const k = yonlendir(e.db, kayit) as string;
  return e.db.selectObjects('SELECT kod, tur, ad, ogeler, duzenleme FROM derlemeler WHERE silindi IS NULL')
    .filter((r) => (JSON.parse(r.ogeler as string) as { kayit: string | null }[]).some((o) => o.kayit && yonlendir(e.db, o.kayit) === k))
    .map((r) => ({ kod: r.kod as string, tur: r.tur as DerlemeTuru, ad: r.ad as string, ogeSayisi: (JSON.parse(r.ogeler as string) as unknown[]).length, duzenleme: Number(r.duzenleme) }));
}
