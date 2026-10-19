// Sıradan bir gün ve karşılaştırmalı okuma (§7). Sıradan gün, bir yere (ve isteğe bağlı döneme ve statüye) yazılmış
// barınma, yemek, ulaşım, iş, ibadet ve eğlence kartlarını toplar; kapsayan yerlerin kartları da gelir, en yakın yer
// önce. Anlatı üretilmez. Karşılaştırmalı okuma kayıtları (ya da bir kaydın farklı tarihlerini) alan alan yan yana koyar.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { tarihCoz, type EvrenTarihi } from '../alan/tarih';
import type { DurumSatiri, GundelikKart, KarsilastirmaliOkuma, KisaKayit, SiradanGun } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { kayitSablonu } from './sablon';
import { sayiDegeriMi, sayiMetni } from '../alan/nicelik';

export interface GundelikBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

export const KONULAR: { kod: GundelikKart['konu']; ad: string }[] = [
  { kod: 'barinma', ad: 'Barınma' }, { kod: 'yemek', ad: 'Yemek' }, { kod: 'ulasim', ad: 'Ulaşım' },
  { kod: 'is', ad: 'İş' }, { kod: 'ibadet', ad: 'İbadet' }, { kod: 'eglence', ad: 'Eğlence' },
];
const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;
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

type SakliKart = { kod: string; konu: GundelikKart['konu']; donem: string | null; statu: string | null; metin: string };
function kartlarOku(e: EvrenVt, yer: string): SakliKart[] {
  const r = e.db.selectValue('SELECT kartlar FROM gundelik_kartlari WHERE kod=?', [yer]) as string | undefined;
  return r ? JSON.parse(r) : [];
}
const disari = (e: EvrenVt, yer: string, k: SakliKart): GundelikKart => ({
  kod: k.kod, konu: k.konu, metin: k.metin, yer: kisa(e, yer), donem: k.donem ? kisa(e, k.donem) : null, statu: k.statu ? kisa(e, k.statu) : null,
});

export function gundelikKartlari(e: EvrenVt, yer: string): GundelikKart[] {
  kayitTuru(e, yer);
  return kartlarOku(e, yer).map((k) => disari(e, yer, k));
}

export function gundelikYaz(b: GundelikBaglami, yer: string, l: { kod?: string | null; konu: string; donem: string | null; statu: string | null; metin: string }[]) {
  kayitTuru(b.e, yer);
  if (!Array.isArray(l) || l.length > 300) throw new Error('Liste çok uzun ya da geçersiz.');
  const yeni: SakliKart[] = l.map((k) => {
    if (!KONULAR.some((x) => x.kod === k.konu)) throw new Error('Geçersiz konu.');
    if (k.donem) kayitTuru(b.e, k.donem);
    if (k.statu) kayitTuru(b.e, k.statu);
    const metin = String(k.metin ?? '').replace(/[ \t]+/g, ' ').trim().slice(0, 2000);
    if (!metin) throw new Error('Kartın metnini yazın.');
    return { kod: k.kod && kodGecerliMi(k.kod) ? k.kod : yeniKod(), konu: k.konu as SakliKart['konu'], donem: k.donem || null, statu: k.statu || null, metin };
  });
  if (JSON.stringify(yeni) === JSON.stringify(kartlarOku(b.e, yer))) return;
  b.yaz([{ tur: 'gundelik_yaz', veri: { yer, kartlar: yeni } }], [yer]);
}

function kapsayanlar(e: EvrenVt, yer: string) {
  const yerler = [yer];
  for (let n = 0; n < 12; n++) {
    const ust = e.db.selectObjects(`SELECT i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.a IN (${yerler.map(() => '?').join(',')}) AND i.tur='parca' AND ${ETKIN} AND k.silindi IS NULL`, yerler)
      .map((r) => r.b as string).filter((u, i, l) => !yerler.includes(u) && l.indexOf(u) === i);
    if (!ust.length) break;
    yerler.push(...ust);
  }
  return yerler;
}

/** Bir yer, dönem ve statü için yazılmış gündelik hayat kartları; dönemi ya da statüsü yazılmamış kart geneldir. */
export function siradanGun(e: EvrenVt, yer: string, donem: string | null, statu: string | null): SiradanGun {
  kayitTuru(e, yer);
  if (donem) kayitTuru(e, donem);
  if (statu) kayitTuru(e, statu);
  const yerler = kapsayanlar(e, yer);
  const konular = KONULAR.map((k) => ({ konu: k.kod, ad: k.ad, kartlar: [] as (GundelikKart & { genel: boolean })[] }));
  for (const y of yerler) {
    for (const k of kartlarOku(e, y)) {
      const kd = k.donem ? yonlendir(e.db, k.donem) : null, ks = k.statu ? yonlendir(e.db, k.statu) : null;
      if (kd && kd !== donem) continue;
      if (ks && ks !== statu) continue;
      konular.find((x) => x.konu === k.konu)!.kartlar.push({ ...disari(e, y, k), genel: (donem !== null && !kd) || (statu !== null && !ks) });
    }
  }
  return {
    yer: kisa(e, yer), donem: donem ? kisa(e, donem) : null, statu: statu ? kisa(e, statu) : null, yerler: yerler.map((y) => kisa(e, y)), konular,
    not: 'Yalnızca yazılmış kartlar; boş konu, o yerde böyle bir şey olmadığı anlamına gelmez. Kapsayan yerlerin kartları da gösterilir.',
  };
}

// ---------- Karşılaştırmalı okuma ----------

const degerYazisi = (d: unknown, secenekler?: { kod: string; ad: string }[]): string | null => {
  if (d === null || d === undefined || d === '') return null;
  if (typeof d === 'object' && d && 'ifade' in d) return (d as EvrenTarihi).ifade;
  if (sayiDegeriMi(d)) return sayiMetni(d);
  if (d === true) return 'Evet';
  if (secenekler) return secenekler.find((s) => s.kod === d)?.ad ?? String(d);
  return String(d);
};

export function karsilastirmaliOkuma(e: EvrenVt, sutunlar: { kayit: string; tarih: string | null }[], durumOku: (kod: string, an: EvrenTarihi | null) => DurumSatiri[]): KarsilastirmaliOkuma {
  if (!Array.isArray(sutunlar) || sutunlar.length < 1 || sutunlar.length > 6) throw new Error('Bir ile altı arasında sütun seçin.');
  const z = zamanSetiOku(e.db);
  const basliklar: KarsilastirmaliOkuma['sutunlar'] = [];
  const satirlar = new Map<string, { baslik: string; grup: 'alan' | 'soru' | 'durum'; degerler: (string | null)[] }>();
  const koy = (anahtar: string, baslik: string, grup: 'alan' | 'soru' | 'durum', i: number, deger: string | null) => {
    if (!satirlar.has(anahtar)) satirlar.set(anahtar, { baslik, grup, degerler: sutunlar.map(() => null) });
    const s = satirlar.get(anahtar)!;
    s.degerler[i] = s.degerler[i] ? `${s.degerler[i]}; ${deger}` : deger;
  };
  sutunlar.forEach((c, i) => {
    kayitTuru(e, c.kayit);
    const ifade = String(c.tarih ?? '').trim();
    const an = ifade ? tarihCoz(ifade.slice(0, 120), z) : null;
    if (ifade && !an?.eksen) throw new Error(`Tarih okunamadı: “${ifade}”.`);
    const ozet = e.db.selectValue('SELECT ozet FROM kayitlar WHERE kod=?', [c.kayit]) as string;
    basliklar.push({ kayit: kisa(e, c.kayit), tarih: an, ozet });
    const ks = kayitSablonu(e, c.kayit);
    for (const a of ks.sablon.alanlar) {
      const d = degerYazisi(ks.degerler[a.kod], a.secenekler?.map((s) => ({ kod: s.kod, ad: s.ad })));
      if (d !== null) koy(`alan:${a.kod}`, a.ad, 'alan', i, d);
      else if (!satirlar.has(`alan:${a.kod}`)) koy(`alan:${a.kod}`, a.ad, 'alan', i, null);
    }
    for (const q of ks.sorular) if (q.cevap?.cevap) koy(`soru:${q.kod}`, q.metin, 'soru', i, q.cevap.cevap);
    // Tarih seçilmezse her özelliğin bitişi yazılmamış (süren) son kaydı gösterilir.
    const tum = durumOku(c.kayit, an);
    const secilen = an ? tum.filter((d) => d.gecerli !== 'hayir')
      : [...new Set(tum.map((d) => d.ozellik.toLocaleLowerCase('tr-TR')))].map((o) => {
        const g = tum.filter((d) => d.ozellik.toLocaleLowerCase('tr-TR') === o);
        const suren = g.filter((d) => !d.bitis && !d.sonraki);
        const bas = (d: DurumSatiri) => d.baslangic?.tarih?.eksen?.enErken ?? -Infinity;
        return (suren.length ? suren : g).reduce((m, d) => (bas(d) >= bas(m) ? d : m));
      });
    for (const d of secilen) {
      const deger = `${d.deger}${d.hedef ? `${d.deger ? ' ' : ''}${d.hedef.ad}` : ''}`;
      koy(`durum:${d.ozellik.toLocaleLowerCase('tr-TR')}`, d.ozellik, 'durum', i, an && d.gecerli === 'belirsiz' ? `belki: ${deger}` : deger);
    }
  });
  return {
    sutunlar: basliklar,
    satirlar: [...satirlar.values()].filter((s) => s.degerler.some((d) => d !== null)),
    not: 'Şablon alanları, cevaplanmış sorular ve zamanla değişenler yan yana. Boş hücre “yok” değil, yazılmamış demektir. Aynı soru ya da alan kodu eşleşir; anlamdan eşleştirme yapılmaz.',
  };
}
