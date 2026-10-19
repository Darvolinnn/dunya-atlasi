// Başkasının bilgisine dair inanç (F05, §3.6): "vezir, prensesin bilmediğini sanıyor". Yalnızca yazarın seçtiği
// soru (sır) ve kişiler için açılır; program kendiliğinden hiçbir iç içe inanç üretmez. Kayıt: kim sanıyor, kimin
// hakkında, onun ne durumda olduğunu sanıyor ve isteğe bağlı tarih. Program bunu, hakkında olunan kişinin o
// tarihteki kayıtlı bilgisiyle karşılaştırır. Kayıtlı bilgi yoksa "bilmiyor" sayılmaz (§3.6); gerçek belirlenmemişse
// "biliyor / bilmiyor" karşılaştırılamaz (Z9).
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { tarihCoz } from '../alan/tarih';
import { SANILAN_DURUMLAR, type BilgiEtiketiKodu, type SanilanDurum } from '../alan/bilgi';
import type { DairInanc, DairInancTanimi, KisaKayit } from '../veri/api';
import { anBilgisi, bilenBilgileri } from './bilgi';
import { temiz, type DurumBaglami } from './durum';
import { yonlendir, zamanSetiOku } from './izdusum';

/** Sanılan durumla uyuşan gerçek etiketler: bilip saklayan kişi için "biliyor" sanmak da doğrudur. */
const UYAN: Record<SanilanDurum, BilgiEtiketiKodu[]> = {
  bilmiyor: ['bilmiyor'], supheleniyor: ['supheleniyor'], biliyor: ['biliyor', 'sakliyor'], sakliyor: ['sakliyor'], yanlis: ['yanlis'],
};

const kisa = (b: DurumBaglami, kod: string): KisaKayit & { silindi: boolean } => {
  const k = yonlendir(b.e.db, kod) as string;
  const r = b.e.db.selectObject('SELECT ad, tur, silindi FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string, silindi: r.silindi !== null } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger', silindi: true };
};
const tarihOku = (b: DurumBaglami, ifade: string) => {
  if (!ifade) return null;
  const t = tarihCoz(ifade, zamanSetiOku(b.e.db));
  if (!t?.eksen) throw new Error('Tarih okunamadı.');
  return t;
};
function iddiaVar(b: DurumBaglami, iddia: string) {
  const r = kodGecerliMi(iddia) ? b.e.db.selectObject('SELECT konu FROM iddialar WHERE kod=? AND silindi IS NULL', [iddia]) : undefined;
  if (!r) throw new Error('Soru bulunamadı.');
  return r.konu as string;
}

function denetle(b: DurumBaglami, t: DairInancTanimi): DairInancTanimi {
  if (!t || typeof t !== 'object') throw new Error('Kayıt geçersiz.');
  // Birleştirilmiş kişinin eski kodu birleştiği kayda çevrilir.
  t = { ...t, sanan: typeof t.sanan === 'string' ? yonlendir(b.e.db, t.sanan) : t.sanan, hakkinda: typeof t.hakkinda === 'string' ? yonlendir(b.e.db, t.hakkinda) : t.hakkinda };
  for (const [kod, ad] of [[t.sanan, 'Sanan kişi'], [t.hakkinda, 'Hakkında olunan kişi']] as const) {
    if (typeof kod !== 'string' || !kodGecerliMi(kod) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) === undefined) throw new Error(`${ad} seçilmedi.`);
  }
  if (t.sanan === t.hakkinda) throw new Error('Kişinin kendi bilgisi için “Kim ne biliyor?” kullanılır.');
  if (!SANILAN_DURUMLAR.some((x) => x.kod === t.sanilan)) throw new Error('Ne sandığını seçin.');
  const tanim = { sanan: t.sanan, hakkinda: t.hakkinda, sanilan: t.sanilan, tarih: temiz(t.tarih, 80), aciklama: temiz(t.aciklama, 500) };
  tarihOku(b, tanim.tarih);
  return tanim;
}

export function dairInancYaz(b: DurumBaglami, iddia: string, kod: string | null, t: DairInancTanimi) {
  const konu = iddiaVar(b, iddia);
  const tanim = denetle(b, t);
  if (kod) {
    const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT tanim FROM dair_inanclar WHERE kod=? AND iddia=? AND silindi IS NULL', [kod, iddia]) : undefined;
    if (!r) throw new Error('Kayıt bulunamadı.');
    if (r.tanim === JSON.stringify(tanim)) return { kod };
  }
  const yeni = kod ?? yeniKod();
  b.yaz([{ tur: 'dair_inanc_yaz', veri: { kod: yeni, iddia, tanim, konu } }], [konu, tanim.sanan, tanim.hakkinda]);
  return { kod: yeni };
}

export function dairInancSil(b: DurumBaglami, kod: string) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT iddia, tanim FROM dair_inanclar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Kayıt bulunamadı.');
  const t = JSON.parse(r.tanim as string) as DairInancTanimi;
  const konu = b.e.db.selectValue('SELECT konu FROM iddialar WHERE kod=?', [r.iddia]) as string | undefined;
  b.yaz([{ tur: 'dair_inanc_sil', veri: { kod, iddia: r.iddia, konu: konu ?? null, sanan: t.sanan, hakkinda: t.hakkinda } }], [...(konu ? [konu] : []), t.sanan, t.hakkinda]);
}

/** Hakkında olunan kişinin kayıtlı bilgisiyle karşılaştırma. */
function karsilastir(b: DurumBaglami, iddia: string, t: DairInancTanimi, hakkinda: KisaKayit): Pick<DairInanc, 'gercekDurum' | 'uyum' | 'neden'> {
  let satirlar;
  if (t.tarih) {
    let an;
    try { an = tarihOku(b, t.tarih); } catch (x) { return { gercekDurum: null, uyum: 'belirsiz', neden: (x as Error).message }; }
    const a = anBilgisi(b, hakkinda.kod, an).find((x) => x.iddia.kod === iddia);
    if (a && a.durum !== 'tek') return { gercekDurum: null, uyum: 'belirsiz', neden: `${hakkinda.ad} için bu tarihte birden çok kayıt geçerli olabilir.` };
    satirlar = a ? a.satirlar : [];
  } else {
    satirlar = bilenBilgileri(b, hakkinda.kod).filter((x) => x.iddia.kod === iddia && x.karar !== 'vazgecildi');
    if (satirlar.length > 1) return { gercekDurum: null, uyum: 'belirsiz', neden: `${hakkinda.ad} için birden çok kayıt var; karşılaştırmak için tarih yazın.` };
  }
  if (!satirlar.length) return { gercekDurum: null, uyum: 'belirsiz', neden: `${hakkinda.ad} için bu konuda kayıtlı bilgi yok (bu, bilmediği anlamına gelmez).` };
  const e = satirlar[0].etiket;
  if (e.kod === 'inaniyor' || e.kod === 'reddediyor') return { gercekDurum: e.ad, uyum: 'belirsiz', neden: 'Gerçek belirlenmediği için bildiği ya da bilmediği söylenemez.' };
  return { gercekDurum: e.ad, uyum: UYAN[t.sanilan].includes(e.kod) ? 'dogru' : 'yanlis', neden: '' };
}

export function dairInanclar(b: DurumBaglami, iddia: string): DairInanc[] {
  iddiaVar(b, iddia);
  return b.e.db.selectObjects('SELECT kod, tanim FROM dair_inanclar WHERE iddia=? AND silindi IS NULL ORDER BY olusturma, kod', [iddia]).map((r) => {
    const tanim = JSON.parse(r.tanim as string) as DairInancTanimi;
    const sanan = kisa(b, tanim.sanan), hakkinda = kisa(b, tanim.hakkinda);
    const temel = { kod: r.kod as string, tanim, sanan, hakkinda };
    if (sanan.silindi || hakkinda.silindi) return { ...temel, gercekDurum: null, uyum: 'belirsiz' as const, neden: 'Kişilerden biri silinmiş.' };
    return { ...temel, ...karsilastir(b, iddia, tanim, hakkinda) };
  });
}
