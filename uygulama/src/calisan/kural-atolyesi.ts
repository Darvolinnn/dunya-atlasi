// Kural atölyesi (F16). Bir hukuk kuralı için yazar örnek durumlar saklar: kişi, yer, isteğe
// bağlı tarih ve beklenen sonuç (uygulanmalı · uygulanmamalı · sınır durumu). Program her örneği kuralın bugünkü
// tanımıyla ve bir önceki tanımıyla değerlendirir; beklentiyle uyuşmayanları ve kural değişince sonucu değişenleri
// gösterir. Örneği ya da beklentiyi kendiliğinden değiştirmez; konu ve yaptırım yazısından anlam çıkarmaz (K1).
// Kural kopyalanırken örnekleri de kopyalanır; kopya ayrı bir kuraldır, kaynağına bağlı kalmaz.
// Kural "kimlere" kısmını formülle yazdıysa (TK8) formül de değerlendirilir; bozulmuş formül "hesaplanamadı" der.
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { IslemGirdisi } from '../alan/islem';
import type { HukukTanimi, KisaKayit, KuralOrnegi, KuralOrnegiTanimi, KuralOrnekleri, OrnekBeklentisi, OrnekSonucu } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { HUKUK_SAHIPLERI, kuralBaglami, kuralBul, kuralDegerlendir, kuralOku } from './hukuk';
import { yonlendir } from './izdusum';

export interface AtolyeBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

export const BEKLENTILER: { kod: OrnekBeklentisi; ad: string }[] = [
  { kod: 'uygulanir', ad: 'Uygulanmalı' }, { kod: 'uygulanmaz', ad: 'Uygulanmamalı' }, { kod: 'sinir', ad: 'Sınır durumu (belirsiz kalmalı)' },
];
const EN_COK_ORNEK = 50;

const kisa = (e: EvrenVt, kod: string): KisaKayit & { silindi: boolean } => {
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT ad, tur, silindi FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string, silindi: r.silindi !== null } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger', silindi: true };
};
const metin = (s: unknown, n: number) => {
  const x = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (x.length > n) throw new Error('Metin çok uzun.');
  return x;
};

function tanimDenetle(e: EvrenVt, t: KuralOrnegiTanimi): KuralOrnegiTanimi {
  if (!t || typeof t !== 'object') throw new Error('Örnek geçersiz.');
  for (const [kod, ad] of [[t.kisi, 'Kişi'], [t.yer, 'Yer']] as const) {
    if (typeof kod !== 'string' || !kodGecerliMi(kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) === undefined) throw new Error(`${ad} seçilmedi.`);
  }
  if (!BEKLENTILER.some((b) => b.kod === t.beklenen)) throw new Error('Beklenen sonucu seçin.');
  const tanim = { kisi: t.kisi, yer: t.yer, tarih: metin(t.tarih, 80), beklenen: t.beklenen, not: metin(t.not, 300) };
  kuralBaglami(e, tanim.kisi, tanim.yer, tanim.tarih || null); // kişi, yer ve tarih okunabiliyor mu
  return tanim;
}

export function kuralOrnegiYaz(b: AtolyeBaglami, kural: string, kod: string | null, t: KuralOrnegiTanimi) {
  const k = kuralBul(b.e, kural);
  const tanim = tanimDenetle(b.e, t);
  if (kod) {
    const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT tanim FROM kural_ornekleri WHERE kod=? AND kural=? AND silindi IS NULL', [kod, kural]) : undefined;
    if (!r) throw new Error('Örnek bulunamadı.');
    if (r.tanim === JSON.stringify(tanim)) return { kod };
  } else if (Number(b.e.db.selectValue('SELECT count(*) FROM kural_ornekleri WHERE kural=? AND silindi IS NULL', [kural])) >= EN_COK_ORNEK) {
    throw new Error(`Bir kurala en çok ${EN_COK_ORNEK} örnek yazılır.`);
  }
  const yeni = kod ?? yeniKod();
  b.yaz([{ tur: 'kural_ornegi_yaz', veri: { kod: yeni, kural, tanim, kuralAd: k.tanim.ad, sahip: k.sahip.kod } }], [k.sahip.kod]);
  return { kod: yeni };
}

export function kuralOrnegiSil(b: AtolyeBaglami, kod: string) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT kural FROM kural_ornekleri WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Örnek bulunamadı.');
  const k = kuralBul(b.e, r.kural, true);
  b.yaz([{ tur: 'kural_ornegi_sil', veri: { kod, kural: r.kural, kuralAd: k.tanim.ad, sahip: k.sahip.kod } }], [k.sahip.kod]);
}

/** Kuralın uygulama sırasıyla bir önceki tanımı (oluşturma ya da önceki değişiklik); yoksa null. */
function oncekiTanim(e: EvrenVt, kural: string): HukukTanimi | null {
  const l = e.db.selectObjects(`SELECT veri FROM islemler WHERE tur IN ('hukuk_kurali_olustur','hukuk_kurali_yaz') AND json_extract(veri,'$.kod')=?
    ORDER BY saat DESC, kurulum DESC, sira DESC LIMIT 2`, [kural]);
  return l.length < 2 ? null : (JSON.parse(l[1].veri as string).tanim as HukukTanimi);
}

function hukum(beklenen: OrnekBeklentisi, sonuc: OrnekSonucu): KuralOrnegi['hukum'] {
  if (sonuc === 'hesaplanamadi') return 'belirsiz';
  if (beklenen === 'sinir') return sonuc === 'belirsiz' ? 'geciyor' : 'uyariyor';
  if (sonuc === 'belirsiz') return 'belirsiz';
  return sonuc === beklenen ? 'geciyor' : 'uyariyor';
}

export function kuralOrnekleri(e: EvrenVt, kural: string): KuralOrnekleri {
  const k = kuralBul(e, kural);
  const r0 = e.db.selectObject('SELECT * FROM hukuk_kurallari WHERE kod=?', [kural])!;
  const onceki = oncekiTanim(e, kural);
  const eski = onceki && JSON.stringify(onceki) !== JSON.stringify(k.tanim) ? kuralOku(e, { ...r0, tanim: JSON.stringify(onceki) }) : null;
  const ornekler = e.db.selectObjects('SELECT kod, tanim FROM kural_ornekleri WHERE kural=? AND silindi IS NULL ORDER BY olusturma, rowid', [kural]).map((r): KuralOrnegi => {
    const t = JSON.parse(r.tanim as string) as KuralOrnegiTanimi;
    const kisi = kisa(e, t.kisi), yer = kisa(e, t.yer);
    const temel = { kod: r.kod as string, tanim: t, kisi, yer };
    if (kisi.silindi || yer.silindi) return { ...temel, sonuc: 'hesaplanamadi', neden: 'Örnekteki kişi ya da yer silinmiş.', hukum: 'belirsiz', onceki: null };
    let c;
    try { c = kuralBaglami(e, kisi.kod, yer.kod, t.tarih || null); } catch (x) {
      return { ...temel, sonuc: 'hesaplanamadi', neden: (x as Error).message, hukum: 'belirsiz', onceki: null };
    }
    const sonucu = (kk: typeof k): { sonuc: OrnekSonucu; neden: string } => {
      const d = kuralDegerlendir(c, kk);
      if (!d.uygulanan) return { sonuc: 'uygulanmaz', neden: d.neden };
      const u = d.uygulanan;
      if (u.durum === 'hesaplanamadi') return { sonuc: 'hesaplanamadi', neden: u.hesaplanamadi ?? 'Formül hesaplanamadı.' };
      if (u.formulNedenleri) return { sonuc: 'belirsiz', neden: `Formül kesin sonuç vermiyor: ${u.formulNedenleri.join(' ')}` };
      if (u.durum === 'kosul_kayitsiz') return { sonuc: 'belirsiz', neden: `Koşulu kayıtlı değil: ${u.kosullar.filter((x) => x.durum === 'kayitsiz').map((x) => x.ad).join(', ')}.` };
      if (u.zaman === 'tarihsiz') return { sonuc: 'belirsiz', neden: 'Kuralın geçerlilik aralığı var; örnekte tarih yok.' };
      if (u.zaman === 'belirsiz') return { sonuc: 'belirsiz', neden: 'Tarih, kuralın geçerlilik sınırına göre belirsiz.' };
      return { sonuc: 'uygulanir', neden: `Uygulanır: ${u.nedenYer}.` };
    };
    const simdi = sonucu(k);
    return { ...temel, ...simdi, hukum: hukum(t.beklenen, simdi.sonuc), onceki: eski ? sonucu(eski).sonuc : null };
  });
  return { kural, oncekiTanimVar: !!eski, ornekler };
}

/** Kuralı (aynı ya da başka bir sahibe) örnekleriyle birlikte kopyalar; hepsi tek işlem grubudur. */
export function hukukKuraliKopyala(b: AtolyeBaglami, kod: string, sahip: string | null) {
  const k = kuralBul(b.e, kod);
  const hedef = sahip ?? k.sahip.kod;
  const tur = kodGecerliMi(hedef) ? b.e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [hedef]) as string | undefined : undefined;
  if (!tur) throw new Error('Kayıt bulunamadı.');
  if (!HUKUK_SAHIPLERI.includes(tur)) throw new Error('Bu türdeki kayda hukuk kuralı eklenmez.');
  const yeni = yeniKod();
  const tanim: HukukTanimi = { ...structuredClone(k.tanim), ad: `${k.tanim.ad} (kopya)`.slice(0, 120) };
  const girdiler: IslemGirdisi[] = [{ tur: 'hukuk_kurali_olustur', veri: { kod: yeni, sahip: hedef, tanim, kaynak: kod } }];
  for (const r of b.e.db.selectObjects('SELECT tanim FROM kural_ornekleri WHERE kural=? AND silindi IS NULL ORDER BY olusturma, rowid', [kod])) {
    girdiler.push({ tur: 'kural_ornegi_yaz', veri: { kod: yeniKod(), kural: yeni, tanim: JSON.parse(r.tanim as string), kuralAd: tanim.ad, sahip: hedef } });
  }
  b.yaz(girdiler, [hedef]);
  return { kod: yeni };
}
