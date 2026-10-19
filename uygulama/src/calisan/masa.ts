// Çalışma masaları (§5.9) ve varsayım paketleri (§3.11). Masa bir konu için kurulan alandır: kayıtlar kopyalanmaz,
// masa onlara bağlanır; düzeni, notları, seçili paketi ve "bugün neyi çözmeye çalışıyorum?" satırı korunur ve eşitlenir.
// Paket, birlikte geçerli sayılan varsayımların listesidir. Varsayım kanona kendiliğinden yazılmaz; evrene yazmak ayrı
// bir yazar işlemidir. Hesap, paketin hangi varsayımlarını kullandığını ve hangilerini kullanamadığını söyler.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { karsilastir, tarihCoz, siraAnahtari, type EvrenTarihi } from '../alan/tarih';
import { turkceKarsilastir } from '../alan/turkce';
import type { KisaKayit, Masa, MasaOzeti, MasaUyesi, Paket, PaketOzeti, Varsayim, VarsayimGirdisi, VarsayimSatiri } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';

export interface MasaBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  tarih(kod: string): EvrenTarihi | null;
}

const temiz = (s: unknown, n: number, bos = true) => {
  const x = String(s ?? '').replace(/[ \t]+/g, ' ').trim();
  if (!x && !bos) throw new Error('Ad boş olamaz.');
  if (x.length > n) throw new Error('Metin çok uzun.');
  return x;
};
const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
};
function kayitVar(e: EvrenVt, kod: unknown, tur?: string, mesaj = 'Kayıt bulunamadı.'): string {
  const t = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t || (tur && t !== tur)) throw new Error(mesaj);
  return kod as string;
}

// ---------- Varsayım paketleri ----------
const paketSatiri = (r: Record<string, unknown>): PaketOzeti => ({
  kod: r.kod as string, ad: r.ad as string, aciklama: r.aciklama as string, duzenleme: Number(r.duzenleme),
  varsayimSayisi: (JSON.parse(r.varsayimlar as string) as unknown[]).length,
});

export const paketler = (e: EvrenVt): PaketOzeti[] =>
  e.db.selectObjects('SELECT * FROM paketler WHERE silindi IS NULL').map(paketSatiri).sort((a, b) => turkceKarsilastir(a.ad, b.ad));

function paketBul(e: EvrenVt, kod: unknown) {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM paketler WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Varsayım paketi bulunamadı.');
  return r;
}
const varsayimlarOku = (r: Record<string, unknown>) => JSON.parse(r.varsayimlar as string) as Varsayim[];

/** Bir varsayımın okunuşu, evrende kayıtlı olanla karşılaştırması ve hangi hesapların onu kullandığı. */
function varsayimSatiri(e: EvrenVt, v: Varsayim): VarsayimSatiri {
  if (v.tur === 'metin') return { v, yazi: v.metin, kayitlar: [], evrendeki: null, kullanan: 'Hesaplara girmez; yalnızca not olarak durur.', evreneYazilabilir: false };
  if (v.tur === 'olay') {
    const o = kisa(e, v.olay);
    const k = e.db.selectValue('SELECT karar FROM kayitlar WHERE kod=? AND silindi IS NULL', [o.kod]) as string | undefined;
    const evrendeki = k === undefined ? 'Olay silinmiş' : k === 'vazgecildi' ? 'Evrende vazgeçilmiş' : k === 'fikir' ? 'Evrende henüz fikir' : 'Evrende kayıtlı';
    const uyumlu = k !== undefined && (v.deger ? k !== 'vazgecildi' && k !== 'fikir' : k === 'vazgecildi');
    return { v, yazi: `“${o.ad}” ${v.deger ? 'gerçekleşti' : 'gerçekleşmedi'}`, kayitlar: [o], evrendeki, kullanan: 'Tutarlılık denetimleri',
      evreneYazilabilir: k !== undefined && !uyumlu };
  }
  if (v.tur === 'rota') {
    const r = kisa(e, v.rota);
    return { v, yazi: `“${r.ad}” ${v.deger ? 'açık' : 'kapalı'}`, kayitlar: [r], evrendeki: null, kullanan: 'Tutarlılık denetimleri (rota süreleri)', evreneYazilabilir: false };
  }
  const bilen = kisa(e, v.bilen);
  const soru = (e.db.selectValue('SELECT soru FROM iddialar WHERE kod=?', [v.iddia]) as string | undefined) ?? 'silinmiş bir iddia';
  return { v, yazi: `${bilen.ad} “${soru}” konusunu ${v.deger ? 'biliyor' : 'bilmiyor'}`, kayitlar: [bilen], evrendeki: null,
    kullanan: 'Henüz bu varsayımı kullanan bir hesap yok.', evreneYazilabilir: false };
}

export function paket(e: EvrenVt, kod: string): Paket {
  const r = paketBul(e, kod);
  const masalar = e.db.selectObjects('SELECT kod, ad FROM masalar WHERE paket=? AND silindi IS NULL ORDER BY ad', [kod]).map((m) => ({ kod: m.kod as string, ad: m.ad as string }));
  return { ...paketSatiri(r), varsayimlar: varsayimlarOku(r).map((v) => varsayimSatiri(e, v)), masalar };
}

export function paketOlustur(b: MasaBaglami, ad: string) {
  const kod = yeniKod();
  b.yaz([{ tur: 'paket_olustur', veri: { kod, ad: temiz(ad, 120, false) } }], []);
  return { kod };
}

export function paketYaz(b: MasaBaglami, kod: string, alan: 'ad' | 'aciklama', deger: string) {
  const r = paketBul(b.e, kod);
  if (alan !== 'ad' && alan !== 'aciklama') throw new Error('Geçersiz alan.');
  const v = temiz(deger, alan === 'ad' ? 120 : 1000, alan !== 'ad');
  if (v === r[alan]) return;
  b.yaz([{ tur: 'paket_yaz', veri: { kod, alan, deger: v, onceki: r[alan], paketAd: r.ad } }], []);
}

function varsayimDenetle(e: EvrenVt, g: VarsayimGirdisi): Varsayim {
  const kod = yeniKod();
  if (g.tur === 'metin') return { kod, tur: 'metin', metin: temiz(g.metin, 300, false) };
  if (g.tur === 'olay') return { kod, tur: 'olay', olay: kayitVar(e, g.olay, undefined, 'Olay bulunamadı.'), deger: !!g.deger };
  if (g.tur === 'rota') return { kod, tur: 'rota', rota: kayitVar(e, g.rota, 'rota', 'Rota bulunamadı.'), deger: !!g.deger };
  if (g.tur === 'bilgi') {
    const bilen = kayitVar(e, g.bilen, undefined, 'Bilen kayıt bulunamadı.');
    if (typeof g.iddia !== 'string' || e.db.selectValue('SELECT 1 FROM iddialar WHERE kod=? AND silindi IS NULL', [g.iddia]) === undefined) throw new Error('İddia bulunamadı.');
    return { kod, tur: 'bilgi', bilen, iddia: g.iddia, deger: !!g.deger };
  }
  throw new Error('Geçersiz varsayım.');
}

/** Aynı şeyi söyleyen iki varsayım (aynı olay, rota ya da bilen–iddia) tek pakette bulunmaz; çelişen ikisi de bulunmaz. */
const ayniKonu = (a: Varsayim, b: Varsayim) => a.tur === b.tur && (
  (a.tur === 'olay' && a.olay === (b as typeof a).olay) || (a.tur === 'rota' && a.rota === (b as typeof a).rota)
  || (a.tur === 'bilgi' && a.bilen === (b as typeof a).bilen && a.iddia === (b as typeof a).iddia));

export function varsayimEkle(b: MasaBaglami, paketKod: string, g: VarsayimGirdisi) {
  const r = paketBul(b.e, paketKod);
  const l = varsayimlarOku(r);
  const v = varsayimDenetle(b.e, g);
  if (v.tur !== 'metin' && l.some((x) => ayniKonu(x, v))) throw new Error('Bu pakette aynı konuda bir varsayım zaten var. İki seçeneği ayrı paketlerde tutun.');
  if (l.length >= 100) throw new Error('Bir pakette en çok 100 varsayım olur.');
  b.yaz([{ tur: 'paket_yaz', veri: { kod: paketKod, alan: 'varsayimlar', deger: [...l, v], paketAd: r.ad } }], []);
  return { kod: v.kod };
}

export function varsayimCikar(b: MasaBaglami, paketKod: string, kod: string) {
  const r = paketBul(b.e, paketKod);
  const l = varsayimlarOku(r);
  if (!l.some((x) => x.kod === kod)) throw new Error('Varsayım bulunamadı.');
  b.yaz([{ tur: 'paket_yaz', veri: { kod: paketKod, alan: 'varsayimlar', deger: l.filter((x) => x.kod !== kod), paketAd: r.ad } }], []);
}

export function paketSil(b: MasaBaglami, kod: string, geriYukle: boolean) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT * FROM paketler WHERE kod=?', [kod]) : undefined;
  if (!r || (r.silindi === null) === geriYukle) throw new Error('Varsayım paketi bulunamadı.');
  b.yaz([{ tur: geriYukle ? 'paket_geri_yukle' : 'paket_sil', veri: { kod, paketAd: r.ad } }], []);
}

/**
 * Varsayımı evrene yazmak ayrı bir yazar işlemidir (§3.11, §2.2 kural 1). Şimdilik olay varsayımları yazılabilir:
 * "gerçekleşti" olayı kesin, "gerçekleşmedi" vazgeçilmiş yapar. Paket değişmez.
 */
export function varsayimiEvreneYaz(b: MasaBaglami, paketKod: string, kod: string): { olay: string; karar: 'kesin' | 'vazgecildi' } | null {
  const v = varsayimlarOku(paketBul(b.e, paketKod)).find((x) => x.kod === kod);
  if (!v) throw new Error('Varsayım bulunamadı.');
  if (v.tur !== 'olay') throw new Error('Bu varsayım evrene buradan yazılamaz; ilgili kayıttan elle girin.');
  const r = b.e.db.selectObject('SELECT karar FROM kayitlar WHERE kod=? AND silindi IS NULL', [v.olay]);
  if (!r) throw new Error('Olay bulunamadı.');
  const yeni = v.deger ? 'kesin' : 'vazgecildi';
  return r.karar === yeni ? null : { olay: v.olay, karar: yeni };
}

/** Hesapların kullandığı biçim: olay ve rota varsayımları. */
export interface PaketEtkisi { kod: string; ad: string; olay: Map<string, boolean>; rota: Map<string, boolean>; kullanilmayan: number }
export function paketEtkisi(e: EvrenVt, kod: string | null | undefined): PaketEtkisi | null {
  if (!kod) return null;
  const r = paketBul(e, kod);
  const l = varsayimlarOku(r);
  const olay = new Map<string, boolean>(), rota = new Map<string, boolean>();
  let kullanilmayan = 0;
  for (const v of l) {
    if (v.tur === 'olay') olay.set(yonlendir(e.db, v.olay), v.deger);
    else if (v.tur === 'rota') rota.set(yonlendir(e.db, v.rota), v.deger);
    else kullanilmayan++;
  }
  return { kod, ad: r.ad as string, olay, rota, kullanilmayan };
}

// ---------- Çalışma masaları ----------
function masaBul(e: EvrenVt, kod: unknown) {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM masalar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Çalışma masası bulunamadı.');
  return r;
}
type UyeRef = { tur: 'kayit' | 'harita'; kod: string };
const uyelerOku = (r: Record<string, unknown>) => JSON.parse(r.uyeler as string) as UyeRef[];

export const masalar = (e: EvrenVt): MasaOzeti[] => e.db.selectObjects('SELECT * FROM masalar WHERE silindi IS NULL ORDER BY duzenleme DESC')
  .map((r) => ({ kod: r.kod as string, ad: r.ad as string, amac: r.amac as string, duzenleme: Number(r.duzenleme), uyeSayisi: uyelerOku(r).length }));

/** Masadaki kayıtların gruplanması (yalnızca gösterim; masa kendi düzenini sıra olarak korur). */
const GRUPLAR: [string, string[]][] = [
  ['Karakterler ve topluluklar', ['karakter', 'topluluk', 'siyasi', 'makam', 'kafile']],
  ['Yerler ve yollar', ['mekan', 'sehir', 'rota', 'yolculuk']],
  ['Olaylar ve dönemler', ['olay', 'donem', 'antlasma', 'haber']],
  ['Sahneler', ['eser', 'bolum', 'sahne', 'kurgu_hatti']],
  ['Kaynaklar ve belgeler', ['kaynak', 'belge']],
  ['Açık sorular', ['acik_mesele', 'gerekce']],
];
const grupBul = (tur: string) => GRUPLAR.find(([, l]) => l.includes(tur))?.[0] ?? 'Diğer kayıtlar';

export function masa(b: MasaBaglami, kod: string): Masa {
  const { e } = b;
  const r = masaBul(e, kod);
  const uyeler: MasaUyesi[] = uyelerOku(r).map((u) => {
    if (u.tur === 'harita') {
      const h = e.db.selectObject('SELECT ad, silindi FROM haritalar WHERE kod=?', [u.kod]);
      return { tur: 'harita', kod: u.kod, ad: (h?.ad as string) ?? 'Silinmiş harita', kayitTuru: null, grup: 'Haritalar', silindi: !h || h.silindi !== null };
    }
    const k = yonlendir(e.db, u.kod);
    const x = e.db.selectObject('SELECT ad, tur, silindi FROM kayitlar WHERE kod=?', [k]);
    return { tur: 'kayit', kod: k, ad: (x?.ad as string) ?? 'Silinmiş kayıt', kayitTuru: (x?.tur as string) ?? null, grup: grupBul((x?.tur as string) ?? 'diger'), silindi: !x || x.silindi !== null };
  });
  const oku = (x: unknown) => (x ? JSON.parse(x as string) as EvrenTarihi : null);
  const bas = oku(r.bas), bit = oku(r.bit);
  const p = r.paket ? e.db.selectObject('SELECT * FROM paketler WHERE kod=? AND silindi IS NULL', [r.paket]) : undefined;
  return {
    kod, ad: r.ad as string, amac: r.amac as string, notlar: r.notlar as string, bas, bit,
    paket: p ? paketSatiri(p) : null, paketSilinmis: !!r.paket && !p, uyeler, olaylar: araliktakiOlaylar(b, uyeler, bas, bit),
  };
}

/**
 * Masanın tarih aralığında, masadaki kayıtlara bağlı olaylar. Aralık karşılaştırması üç değerlidir: belirsiz olanlar
 * ayrı işaretlenir, sessizce içeri ya da dışarı atılmaz.
 */
function araliktakiOlaylar(b: MasaBaglami, uyeler: MasaUyesi[], bas: EvrenTarihi | null, bit: EvrenTarihi | null) {
  const { e } = b;
  if (!bas?.eksen && !bit?.eksen) return [];
  const kayitlar = uyeler.filter((u) => u.tur === 'kayit' && !u.silindi).map((u) => u.kod);
  if (!kayitlar.length) return [];
  const yer = kayitlar.map(() => '?').join(',');
  const adaylar = new Set<string>([
    ...kayitlar.filter((k) => e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND tur='olay'", [k]) !== undefined),
    ...e.db.selectObjects(`SELECT DISTINCT i.b k FROM iliskiler i JOIN kayitlar o ON o.kod=i.b WHERE i.silindi IS NULL AND o.silindi IS NULL AND o.tur='olay' AND i.a IN (${yer})`, kayitlar).map((x) => x.k as string),
    ...e.db.selectObjects(`SELECT DISTINCT i.a k FROM iliskiler i JOIN kayitlar o ON o.kod=i.a WHERE i.silindi IS NULL AND o.silindi IS NULL AND o.tur='olay' AND i.b IN (${yer})`, kayitlar).map((x) => x.k as string),
  ]);
  const sonuc: { kod: string; ad: string; tarih: EvrenTarihi | null; belirsiz: boolean }[] = [];
  for (const k of adaylar) {
    const t = b.tarih(k);
    if (!t?.eksen) continue;
    const once = bas?.eksen ? karsilastir(t, bas) : 'sonra';
    const sonra = bit?.eksen ? karsilastir(t, bit) : 'once';
    if (once === 'once' || sonra === 'sonra') continue;
    sonuc.push({ kod: k, ad: kisa(e, k).ad, tarih: t, belirsiz: once === 'belirsiz' || sonra === 'belirsiz' });
  }
  return sonuc.sort((x, y) => siraAnahtari(x.tarih) - siraAnahtari(y.tarih));
}

export function masaOlustur(b: MasaBaglami, ad: string) {
  const kod = yeniKod();
  b.yaz([{ tur: 'masa_olustur', veri: { kod, ad: temiz(ad, 120, false) } }], []);
  return { kod };
}

export type MasaAlani = 'ad' | 'amac' | 'notlar' | 'bas' | 'bit' | 'paket';
export function masaYaz(b: MasaBaglami, kod: string, alan: MasaAlani, deger: string | null) {
  const { e } = b;
  const r = masaBul(e, kod);
  let v: unknown;
  if (alan === 'ad') v = temiz(deger, 120, false);
  else if (alan === 'amac') v = temiz(deger, 300);
  else if (alan === 'notlar') { v = String(deger ?? '').trim(); if ((v as string).length > 10000) throw new Error('Not çok uzun.'); }
  else if (alan === 'bas' || alan === 'bit') {
    const s = temiz(deger, 120);
    const t = s ? tarihCoz(s, zamanSetiOku(e.db)) : null;
    if (s && !t?.eksen) throw new Error('Bu tarih okunamadı ya da evren takvimine yerleştirilemedi.');
    v = t;
  } else if (alan === 'paket') v = deger ? (paketBul(e, deger), deger) : null;
  else throw new Error('Geçersiz alan.');
  const onceki = alan === 'bas' || alan === 'bit' ? (r[alan] ? JSON.parse(r[alan] as string) : null) : r[alan];
  if (JSON.stringify(onceki ?? null) === JSON.stringify(v ?? null) || ((alan === 'bas' || alan === 'bit') && (onceki as EvrenTarihi | null)?.ifade === (v as EvrenTarihi | null)?.ifade)) return;
  b.yaz([{ tur: 'masa_yaz', veri: { kod, alan, deger: v, masaAd: r.ad } }], []);
}

/** Masaya kayıt ya da harita bağlar, çıkarır ya da sırasını değiştirir. */
export function masaUyeleri(b: MasaBaglami, kod: string, islem: { ekle?: UyeRef; cikar?: UyeRef; tasi?: { uye: UyeRef; sira: number } }) {
  const { e } = b;
  const r = masaBul(e, kod);
  const l = uyelerOku(r);
  const ayni = (a: UyeRef, c: UyeRef) => a.tur === c.tur && a.kod === c.kod;
  let yeni = l;
  if (islem.ekle) {
    const u = islem.ekle;
    if (u.tur === 'kayit') kayitVar(e, u.kod);
    else if (u.tur !== 'harita' || e.db.selectValue('SELECT 1 FROM haritalar WHERE kod=? AND silindi IS NULL', [u.kod]) === undefined) throw new Error('Harita bulunamadı.');
    if (l.some((x) => ayni(x, u))) return;
    if (l.length >= 500) throw new Error('Bir masada en çok 500 kayıt olur.');
    yeni = [...l, { tur: u.tur, kod: u.kod }];
  } else if (islem.cikar) {
    yeni = l.filter((x) => !ayni(x, islem.cikar!));
    if (yeni.length === l.length) return;
  } else if (islem.tasi) {
    const i = l.findIndex((x) => ayni(x, islem.tasi!.uye));
    if (i < 0) return;
    yeni = [...l];
    const [u] = yeni.splice(i, 1);
    yeni.splice(Math.max(0, Math.min(islem.tasi.sira, yeni.length)), 0, u);
  } else return;
  b.yaz([{ tur: 'masa_yaz', veri: { kod, alan: 'uyeler', deger: yeni, masaAd: r.ad } }], islem.ekle?.tur === 'kayit' ? [islem.ekle.kod] : []);
}

export function masaSil(b: MasaBaglami, kod: string, geriYukle: boolean) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT * FROM masalar WHERE kod=?', [kod]) : undefined;
  if (!r || (r.silindi === null) === geriYukle) throw new Error('Çalışma masası bulunamadı.');
  b.yaz([{ tur: geriYukle ? 'masa_geri_yukle' : 'masa_sil', veri: { kod, masaAd: r.ad } }], []);
}

/** Bir kaydın bağlı olduğu masalar (kayıt sayfasında gösterilir). */
export const kayitMasalari = (e: EvrenVt, kod: string) => masalar(e).filter((m) => {
  const r = e.db.selectObject('SELECT uyeler FROM masalar WHERE kod=?', [m.kod]);
  return r ? (JSON.parse(r.uyeler as string) as UyeRef[]).some((u) => u.tur === 'kayit' && yonlendir(e.db, u.kod) === kod) : false;
}).map((m) => ({ kod: m.kod, ad: m.ad }));
