// F12 "Büyü neden her yerde kullanılmıyor": bir büyü, teknoloji ya da evren kuralının bağlı alanları (mahkeme,
// diplomasi, ticaret…) bir masada toplanır; her alan için maliyet, erişim, karşı önlem ve yasak yazarın kısa
// metinleridir. Program metinleri yorumlamaz ve toplumsal hüküm vermez. Boş hücre "yazılmamış"tır, eksik sayılmaz.
// Aday alanlar yalnızca kayda doğrudan ilişkisi olan kayıtlardan gösterilir.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { KULLANIM_SAHIPLERI } from '../alan/kullanim-masasi';
import type { KisaKayit, KullanimMasasi, KullanimMasasiTanimi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

export interface KullanimBaglami { e: EvrenVt; yaz(g: IslemGirdisi[], k: string[]): void }
const HUCRELER = ['maliyet', 'erisim', 'karsiOnlem', 'yasak'] as const;
// Aday sayılmayan yazarlık ve anlatı kayıtları.
const ADAY_DISI = new Set(['sahne', 'bolum', 'eser', 'not', 'acik_mesele', 'gerekce', 'kaynak', 'kurgu_hatti']);

function sahipOku(e: EvrenVt, kodGirdi: string) {
  const kod = kodGecerliMi(kodGirdi) ? yonlendir(e.db, kodGirdi) : '';
  const tur = kod ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!tur) throw new Error('Kayıt bulunamadı.');
  if (!KULLANIM_SAHIPLERI.includes(tur)) throw new Error('Bu masa büyü, teknoloji ve evren kuralı kayıtları içindir.');
  return kod;
}
function kisa(e: EvrenVt, kod: string): KisaKayit {
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}
export function tanimOku(e: EvrenVt, kod: string): KullanimMasasiTanimi {
  const ham = e.db.selectValue('SELECT tanim FROM kullanim_masalari WHERE kod=?', [kod]) as string | undefined;
  return ham ? JSON.parse(ham) : { alanlar: [] };
}

export function kullanimMasasiYaz(b: KullanimBaglami, kodGirdi: string, t: KullanimMasasiTanimi) {
  const e = b.e, kod = sahipOku(e, kodGirdi);
  if (!t || !Array.isArray(t.alanlar)) throw new Error('Masa okunamadı.');
  if (t.alanlar.length > 30) throw new Error('En çok 30 alan yazılabilir.');
  const temiz = (s: unknown, n: number, ne: string) => {
    const x = String(s ?? '').replace(/\s+/g, ' ').trim();
    if (x.length > n) throw new Error(`${ne} en çok ${n} karakter olabilir (boşluklar dahil).`);
    return x;
  };
  const gorulen = new Set<string>();
  const alanlar = t.alanlar.map((a) => {
    let kayit: string | null = null;
    if (a.kayit) {
      kayit = kodGecerliMi(a.kayit) ? yonlendir(e.db, a.kayit) : '';
      if (!kayit || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kayit]) === undefined) throw new Error('Seçilen alan kaydı bulunamadı.');
      if (kayit === kod) throw new Error('Kayıt kendi masasında alan olamaz.');
      if (gorulen.has(kayit)) throw new Error('Aynı kayıt masada iki kez yer alamaz.');
      gorulen.add(kayit);
    }
    const ad = temiz(a.ad, 80, 'Alanın adı');
    if (!ad && !kayit) throw new Error('Alanın adını yazın ya da bir kayıt seçin.');
    return {
      kod: a.kod && kodGecerliMi(a.kod) ? a.kod : yeniKod(), ad, kayit,
      maliyet: temiz(a.maliyet, 300, 'Maliyet'), erisim: temiz(a.erisim, 300, 'Erişim'), karsiOnlem: temiz(a.karsiOnlem, 300, 'Karşı önlem'), yasak: temiz(a.yasak, 300, 'Yasak'),
    };
  });
  const yeni: KullanimMasasiTanimi = { alanlar };
  if (JSON.stringify(yeni) === JSON.stringify(tanimOku(e, kod))) return;
  const ad = e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [kod]) as string;
  b.yaz([{ tur: 'kullanim_masasi_yaz', veri: { kod, tanim: yeni, ad } }], [kod, ...gorulen]);
}

/** Masa: alanlar, hücreler ve kayda doğrudan bağlı aday alanlar. Hiçbir şey yazmaz. */
export function kullanimMasasi(e: EvrenVt, kodGirdi: string): KullanimMasasi {
  const kod = sahipOku(e, kodGirdi);
  const t = tanimOku(e, kod);
  const alanlar = t.alanlar.map((a) => ({ ...a, kayitKaydi: a.kayit ? kisa(e, a.kayit) : null, yazilmamis: HUCRELER.filter((h) => !a[h]) }));
  const masada = new Set(t.alanlar.map((a) => a.kayit && yonlendir(e.db, a.kayit)).filter(Boolean));
  const adaylar = new Map<string, KisaKayit>();
  for (const r of e.db.selectObjects(`SELECT CASE WHEN i.a=? THEN i.b ELSE i.a END diger FROM iliskiler i
      WHERE (i.a=? OR i.b=?) AND i.silindi IS NULL AND i.karar<>'vazgecildi'`, [kod, kod, kod])) {
    const k = kisa(e, r.diger as string);
    if (k.kod === kod || masada.has(k.kod) || ADAY_DISI.has(k.tur) || k.tur === 'diger') continue;
    if (e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL AND karar<>'vazgecildi'", [k.kod]) === undefined) continue;
    adaylar.set(k.kod, k);
  }
  return {
    kayit: kisa(e, kod), alanlar, adaylar: [...adaylar.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')),
    not: 'Hücrelerde yalnızca sizin yazdıklarınız var. Program bunlardan sonuç çıkarmaz, toplumun ne yapacağına da karar vermez. Boş hücre eksik sayılmaz.',
  };
}
