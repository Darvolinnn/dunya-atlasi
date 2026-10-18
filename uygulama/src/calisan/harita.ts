// Harita: yükle, işaretle, bağla (§8.1). Her haritanın kendi uzayı vardır; ilk görselin piksel boyutu uzayın
// boyutu olur ve en-boy oranı korunur. Görsel uzaya oturtulmuş bir katmandır; işaretler uzayda saklanır.
import { bakisHazirla } from './gorunum';
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { turkceKarsilastir } from '../alan/turkce';
import type { HaritaAyrintisi, HaritaOzeti, IsaretGirdisi, KayitHaritalari } from '../veri/api';
import type { EvrenVt } from './evren-vt';

export interface HaritaBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const temizAd = (s: unknown) => {
  const x = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!x) throw new Error('Haritanın bir adı olmalı.');
  if (x.length > 200) throw new Error('Ad çok uzun.');
  return x;
};

function kayitVar(e: EvrenVt, kod: unknown): asserts kod is string {
  if (typeof kod !== 'string' || !kodGecerliMi(kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) === undefined) {
    throw new Error('Kayıt bulunamadı.');
  }
}

function haritaOku(e: EvrenVt, kod: string) {
  if (!kodGecerliMi(kod)) throw new Error('Harita bulunamadı.');
  const r = e.db.selectObject('SELECT * FROM haritalar WHERE kod=?', [kod]);
  if (!r) throw new Error('Harita bulunamadı.');
  return { kod, ad: r.ad as string, yer: (r.yer as string) ?? null, en: Number(r.en), boy: Number(r.boy), silindi: r.silindi !== null };
}

function isaretOku(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT i.kod, i.harita, i.kayit, h.ad harita_ad FROM isaretler i JOIN haritalar h ON h.kod=i.harita WHERE i.kod=?', [kod]) : undefined;
  if (!r) throw new Error('İşaret bulunamadı.');
  return { kod, harita: r.harita as string, kayit: r.kayit as string, haritaAd: r.harita_ad as string };
}

export function haritaOlustur(b: HaritaBaglami, a: { ad: string; yer: string | null; gorsel: string }, girdiler: IslemGirdisi[] = []) {
  const ad = temizAd(a.ad);
  if (a.yer) kayitVar(b.e, a.yer);
  const m = b.e.db.selectObject('SELECT en, boy FROM medya WHERE ad=?', [a.gorsel]);
  // Yeni yüklenen görselin boyutu henüz tabloda değilse girdilerdeki medya kaydından okunur.
  const yeni = girdiler.find((g) => g.tur === 'medya_ekle' && g.veri.ad === a.gorsel)?.veri;
  const en = Number(m?.en ?? yeni?.en), boy = Number(m?.boy ?? yeni?.boy);
  if (!(en > 0 && boy > 0)) throw new Error('Görselin boyutu okunamadı; harita oluşturulamadı.');
  const kod = yeniKod();
  b.yaz([...girdiler, { tur: 'harita_olustur', veri: { kod, ad, yer: a.yer, en, boy, gorsel: a.gorsel } }], a.yer ? [a.yer] : []);
  return { kod };
}

export function haritalar(e: EvrenVt, silinmis = false): HaritaOzeti[] {
  return e.db.selectObjects(`SELECT h.kod, h.ad, h.yer, k.ad yer_ad, k.tur yer_tur, h.katmanlar, h.en, h.boy,
      (SELECT count(*) FROM isaretler i JOIN kayitlar ik ON ik.kod=i.kayit WHERE i.harita=h.kod AND i.silindi IS NULL AND ik.silindi IS NULL) isaret_sayisi
      FROM haritalar h LEFT JOIN kayitlar k ON k.kod=h.yer WHERE h.silindi IS ${silinmis ? 'NOT ' : ''}NULL`)
    .map((r) => ({
      kod: r.kod as string, ad: r.ad as string, en: Number(r.en), boy: Number(r.boy),
      yer: r.yer ? { kod: r.yer as string, ad: (r.yer_ad as string) ?? 'Silinmiş kayıt', tur: (r.yer_tur as string) ?? 'diger' } : null,
      gorsel: (JSON.parse(r.katmanlar as string) as { gorsel: string }[])[0]?.gorsel ?? null, isaretSayisi: Number(r.isaret_sayisi),
    }))
    .sort((x, y) => turkceKarsilastir(x.ad, y.ad));
}

export function harita(e: EvrenVt, kod: string, bakis: string | null = null): HaritaAyrintisi {
  const h = haritaOku(e, kod);
  const bk = bakisHazirla(e, bakis);
  const r = e.db.selectObject('SELECT katmanlar FROM haritalar WHERE kod=?', [kod])!;
  const katmanlar = (JSON.parse(r.katmanlar as string) as { gorsel: string; x: number; y: number; olcek: number }[]).map((k) => {
    const m = e.db.selectObject('SELECT en, boy FROM medya WHERE ad=?', [k.gorsel]);
    return { ...k, en: Number(m?.en ?? h.en), boy: Number(m?.boy ?? h.boy) };
  });
  const yerAd = h.yer ? (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [h.yer]) as string | undefined) : undefined;
  const isaretler = e.db.selectObjects(`SELECT i.*, k.ad, k.tur, k.karar, k.gorunurluk,
      (SELECT kod FROM haritalar WHERE yer=i.kayit AND silindi IS NULL AND kod<>i.harita ORDER BY olusturma LIMIT 1) alt_harita
      FROM isaretler i JOIN kayitlar k ON k.kod=i.kayit WHERE i.harita=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY k.ad`, [kod])
    .filter((x) => bk.gorur(x.gorunurluk))
    .map((x) => ({
      ...(bk.kisa && bk.inanc(x.gorunurluk) ? { inanc: true } : {}),
      kod: x.kod as string, kayit: { kod: x.kayit as string, ad: x.ad as string, tur: x.tur as string }, karar: x.karar as string,
      konum: { kesinlik: x.kesinlik as IsaretGirdisi['kesinlik'], x: x.x as number | null, y: x.y as number | null, yaricap: x.yaricap as number | null },
      altHarita: (x.alt_harita as string) ?? null,
    }));
  // Bu haritanın yerini gösteren başka haritalar (iç içe gezinti, §8.1).
  const ustHaritalar = h.yer ? e.db.selectObjects(`SELECT DISTINCT h.kod, h.ad FROM isaretler i JOIN haritalar h ON h.kod=i.harita
      WHERE i.kayit=? AND i.silindi IS NULL AND h.silindi IS NULL AND h.kod<>?`, [h.yer, kod]).map((x) => ({ kod: x.kod as string, ad: x.ad as string })) : [];
  return { kod, ad: h.ad, en: h.en, boy: h.boy, silindi: h.silindi, yer: h.yer ? { kod: h.yer, ad: yerAd ?? 'Silinmiş kayıt' } : null, katmanlar, isaretler, ustHaritalar, bakis: bk.kisa };
}

export function haritaDegistir(b: HaritaBaglami, kod: string, alan: 'ad' | 'yer', deger: unknown) {
  const h = haritaOku(b.e, kod);
  if (alan === 'ad') {
    const ad = temizAd(deger);
    if (ad !== h.ad) b.yaz([{ tur: 'harita_degistir', veri: { kod, alan, deger: ad, haritaAd: h.ad } }], []);
  } else if (alan === 'yer') {
    if (deger !== null) kayitVar(b.e, deger);
    if (deger !== h.yer) b.yaz([{ tur: 'harita_degistir', veri: { kod, alan, deger, haritaAd: h.ad } }], deger ? [deger as string] : []);
  } else throw new Error('Geçersiz alan.');
}

export function haritaSil(b: HaritaBaglami, kod: string, geriYukle: boolean) {
  const h = haritaOku(b.e, kod);
  if (h.silindi === !geriYukle) return;
  b.yaz([{ tur: geriYukle ? 'harita_geri_yukle' : 'harita_sil', veri: { kod, haritaAd: h.ad } }], []);
}

function konumTemizle(k: IsaretGirdisi): IsaretGirdisi {
  if (!k || !['kesin', 'yaklasik', 'bilinmiyor'].includes(k.kesinlik)) throw new Error('Geçersiz işaret kesinliği.');
  if (k.kesinlik === 'bilinmiyor') return { kesinlik: 'bilinmiyor', x: null, y: null, yaricap: null };
  if (!Number.isFinite(k.x) || !Number.isFinite(k.y)) throw new Error('İşaretin yeri belli değil.');
  return { kesinlik: k.kesinlik, x: k.x, y: k.y, yaricap: k.kesinlik === 'yaklasik' && Number.isFinite(k.yaricap) ? k.yaricap : null };
}

export function isaretKoy(b: HaritaBaglami, harita: string, kayit: string, konum: IsaretGirdisi) {
  const h = haritaOku(b.e, harita);
  if (h.silindi) throw new Error('Bu harita kaldırılmış.');
  kayitVar(b.e, kayit);
  const kod = yeniKod();
  b.yaz([{ tur: 'isaret_koy', veri: { kod, harita, kayit, konum: konumTemizle(konum), haritaAd: h.ad } }], [kayit]);
  return { kod };
}

export function isaretDegistir(b: HaritaBaglami, kod: string, alan: 'konum' | 'kayit', deger: unknown) {
  const i = isaretOku(b.e, kod);
  if (alan === 'konum') {
    b.yaz([{ tur: 'isaret_degistir', veri: { kod, alan, deger: konumTemizle(deger as IsaretGirdisi), kayit: i.kayit, haritaAd: i.haritaAd } }], [i.kayit]);
  } else if (alan === 'kayit') {
    kayitVar(b.e, deger);
    if (deger !== i.kayit) b.yaz([{ tur: 'isaret_degistir', veri: { kod, alan, deger, kayit: i.kayit, haritaAd: i.haritaAd } }], [i.kayit, deger]);
  } else throw new Error('Geçersiz alan.');
}

export function isaretSil(b: HaritaBaglami, kod: string, geriYukle: boolean) {
  const i = isaretOku(b.e, kod);
  b.yaz([{ tur: geriYukle ? 'isaret_geri_yukle' : 'isaret_sil', veri: { kod, kayit: i.kayit, haritaAd: i.haritaAd } }], [i.kayit]);
}

/** Kayıt sayfası için: kaydın işaretli olduğu haritalar ve kaydın kendi haritaları. */
export function kayitHaritalari(e: EvrenVt, kayit: string): KayitHaritalari {
  return {
    isaretler: e.db.selectObjects(`SELECT i.kod, i.kesinlik, h.kod harita, h.ad FROM isaretler i JOIN haritalar h ON h.kod=i.harita
        WHERE i.kayit=? AND i.silindi IS NULL AND h.silindi IS NULL ORDER BY h.ad`, [kayit])
      .map((r) => ({ kod: r.kod as string, harita: r.harita as string, haritaAd: r.ad as string, kesinlik: r.kesinlik as IsaretGirdisi['kesinlik'] })),
    haritalar: e.db.selectObjects('SELECT kod, ad FROM haritalar WHERE yer=? AND silindi IS NULL ORDER BY ad', [kayit]).map((r) => ({ kod: r.kod as string, ad: r.ad as string })),
  };
}

/** Bu görsel bu kayıtta zaten işaretleme yüzeyi olarak açılmış mı? */
export function gorselHaritasi(e: EvrenVt, yer: string, gorsel: string): string | null {
  for (const r of e.db.selectObjects('SELECT kod, katmanlar FROM haritalar WHERE yer=? AND silindi IS NULL', [yer])) {
    if ((JSON.parse(r.katmanlar as string) as { gorsel: string }[]).some((k) => k.gorsel === gorsel)) return r.kod as string;
  }
  return null;
}
