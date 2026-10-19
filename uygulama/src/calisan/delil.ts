// F08 delil geçmişi ve soruşturma masası (§3.9). Bir evren içi belgenin gerçek yazarı (görünen yazar belge
// sunumundadır, §11.5), elden ele geçişi, belge ailesi (kopya, tercüme, sansürlü sürüm) ve hangi sorulara delil
// olduğu. Hepsi yazarın açık kaydıdır; "sahte" hükmü verilmez, yalnızca iki yazarın farklı olduğu gösterilir.
// Aynı aileden belgeler bağımsız kaynak sayılmaz (§3.9); iddia dosyası (F28) bunu kullanır.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { tarihCoz } from '../alan/tarih';
import type { DelilGecmisi, DelilTanimi, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { sunumOku } from './belge';
import { DELIL_AILE_TURLERI } from '../alan/delil';

export interface DelilBaglami { e: EvrenVt; yaz(g: IslemGirdisi[], k: string[]): void }
export const BOS_DELIL: DelilTanimi = { gercekYazar: null, aile: null, elde: [] };

function belgeMi(e: EvrenVt, kod: string) {
  return kodGecerliMi(kod) && e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND tur='belge' AND silindi IS NULL", [kod]) !== undefined;
}
function kisa(e: EvrenVt, kod: string | null): KisaKayit | null {
  if (!kod) return null;
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}
function tumTanimlar(e: EvrenVt) {
  return new Map(e.db.selectObjects('SELECT kod, tanim FROM delil_gecmisi').map((r) => [r.kod as string, JSON.parse(r.tanim as string) as DelilTanimi]));
}
export function delilOku(e: EvrenVt, kod: string): DelilTanimi {
  const ham = e.db.selectValue('SELECT tanim FROM delil_gecmisi WHERE kod=?', [kod]) as string | undefined;
  return ham ? { ...BOS_DELIL, ...JSON.parse(ham) } : { ...BOS_DELIL, elde: [] };
}
/** Belgenin ailesinin kökü: ana belge zinciri izlenir. */
function kokBul(tum: Map<string, DelilTanimi>, kod: string) {
  let x = kod;
  for (let n = 0; tum.get(x)?.aile?.ana && n < 500; n++) x = tum.get(x)!.aile!.ana;
  return x;
}
/** Belge koduna göre aile kökü; iddia dosyası aynı kökten gelen belgeleri tek kaynak sayar. */
export function belgeAilesiKoku(e: EvrenVt): (kod: string) => string {
  const tum = tumTanimlar(e);
  return (kod) => kokBul(tum, kod);
}

export function delilYaz(b: DelilBaglami, kod: string, t: DelilTanimi) {
  const e = b.e;
  if (!belgeMi(e, kod)) throw new Error('Evren içi belge bulunamadı.');
  if (!t || typeof t !== 'object') throw new Error('Delil geçmişi okunamadı.');
  const kayit = (k: unknown, ne: string) => {
    if (k === null || k === undefined || k === '') return null;
    if (typeof k !== 'string' || !kodGecerliMi(k) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]) === undefined) throw new Error(`${ne} bulunamadı.`);
    return yonlendir(e.db, k);
  };
  const gercekYazar = kayit(t.gercekYazar, 'Gerçek yazar');
  let aile: DelilTanimi['aile'] = null;
  if (t.aile) {
    const ana = yonlendir(e.db, String(t.aile.ana ?? ''));
    if (!belgeMi(e, ana) || ana === kod) throw new Error('Ana belge başka bir evren içi belge olmalı.');
    if (!DELIL_AILE_TURLERI.some((x) => x.kod === t.aile!.tur)) throw new Error('Kopya, tercüme ya da sansürlü sürümden birini seçin.');
    const tum = tumTanimlar(e);
    for (let x: string | null = ana, n = 0; x; x = tum.get(x)?.aile?.ana ?? null, n++) {
      if (x === kod || n > 500) throw new Error('Belgeler birbirinin kopyası olarak bir döngü oluşturamaz.');
    }
    aile = { ana, tur: t.aile.tur };
  }
  if (!Array.isArray(t.elde) || t.elde.length > 50) throw new Error('En çok 50 el değiştirme yazılabilir.');
  const z = zamanSetiOku(e.db);
  const elde = t.elde.map((x) => {
    const kisi = kayit(x?.kisi, 'Belgeyi elinde tutan');
    if (!kisi) throw new Error('Belgenin kimde olduğunu seçin.');
    const tarih = String(x.tarih ?? '').replace(/\s+/g, ' ').trim();
    if (tarih && !tarihCoz(tarih, z)?.eksen) throw new Error(`Tarih okunamadı: “${tarih}”.`);
    const nasil = String(x.nasil ?? '').replace(/\s+/g, ' ').trim();
    if (nasil.length > 120) throw new Error('“Nasıl geçti?” en çok 120 harf olabilir.');
    return { kisi, tarih, nasil };
  });
  const yeni: DelilTanimi = { gercekYazar, aile, elde };
  if (JSON.stringify(yeni) === JSON.stringify(delilOku(e, kod))) return;
  b.yaz([{ tur: 'delil_yaz', veri: { kod, tanim: yeni } }], [kod, ...(gercekYazar ? [gercekYazar] : []), ...(aile ? [aile.ana] : [])]);
}

/** Soruşturma masası: belgenin yazarları, ailesi, elden ele geçişi ve delil olduğu sorular. Hiçbir şey yazmaz. */
export function delilGecmisi(e: EvrenVt, kodGirdi: string): DelilGecmisi {
  const kod = kodGecerliMi(kodGirdi) ? yonlendir(e.db, kodGirdi) : '';
  if (!belgeMi(e, kod)) throw new Error('Evren içi belge bulunamadı.');
  const tanim = delilOku(e, kod);
  const sunum = sunumOku(e, kod);
  const gorunen = kisa(e, sunum.yazan), gercek = kisa(e, tanim.gercekYazar);
  const yazarDurumu: DelilGecmisi['yazarDurumu'] = !gercek ? 'gerçek yazılmamış' : !gorunen ? 'görünen yazılmamış' : gercek.kod === gorunen.kod ? 'aynı' : 'farklı';
  const tum = tumTanimlar(e);
  const kok = kokBul(tum, kod);
  const uyeKodlari = [kok, ...[...tum.keys()].filter((k) => k !== kok && kokBul(tum, k) === kok && belgeMi(e, k))];
  const uyeler = uyeKodlari.map((k) => ({ kayit: kisa(e, k)!, tur: tum.get(k)?.aile?.tur ?? null, ana: kisa(e, tum.get(k)?.aile?.ana ?? null), bu: k === kod }));
  const z = zamanSetiOku(e.db);
  const elde = tanim.elde.map((x, sira) => ({ kisi: kisa(e, x.kisi)!, tarih: x.tarih, nasil: x.nasil, sira, eksen: x.tarih ? tarihCoz(x.tarih, z)?.eksen?.enErken ?? null : null }))
    .sort((a, b) => (a.eksen ?? Infinity) - (b.eksen ?? Infinity) || a.sira - b.sira)
    .map(({ kisi, tarih, nasil }) => ({ kisi, tarih, nasil }));
  const uyeSet = new Set(uyeKodlari);
  const deliller: DelilGecmisi['deliller'] = [];
  for (const r of e.db.selectObjects(`SELECT a.kod, a.tanim, i.kod AS iddia, i.soru, i.konu, i.secenekler FROM anlatimlar a JOIN iddialar i ON i.kod=a.iddia
      WHERE a.silindi IS NULL AND i.silindi IS NULL ORDER BY i.olusturma, a.olusturma`)) {
    const t = JSON.parse(r.tanim as string) as { kaynak: string | null; destek: string | null; itiraz: string[]; karar: string };
    const kaynak = t.kaynak ? yonlendir(e.db, t.kaynak) : null;
    if (!kaynak || !uyeSet.has(kaynak)) continue;
    const sec = JSON.parse(r.secenekler as string) as { kod: string; metin: string }[];
    const metin = (k: string) => sec.find((s) => s.kod === k)?.metin ?? 'kaldırılmış cevap';
    deliller.push({ iddia: r.iddia as string, soru: r.soru as string, konu: kisa(e, r.konu as string)!, anlatim: r.kod as string, belge: kisa(e, kaynak)!,
      destek: t.destek ? metin(t.destek) : null, itiraz: t.itiraz.map(metin), karar: t.karar });
  }
  const okuyanlar = e.db.selectObjects(`SELECT DISTINCT bilen, kaynak_kayit FROM bilgiler WHERE silindi IS NULL AND kaynak='belge' AND kaynak_kayit IS NOT NULL`)
    .filter((r) => uyeSet.has(yonlendir(e.db, r.kaynak_kayit as string)))
    .map((r) => ({ kisi: kisa(e, r.bilen as string)!, belge: kisa(e, r.kaynak_kayit as string)! }));
  const notlar = ['Belgede yazan ile gerçekte olan ayrı şeylerdir. Bu masa hüküm vermez, yalnızca yazdıklarınızı yan yana koyar.'];
  if (uyeler.length > 1) notlar.push(`Bu ailedeki ${uyeler.length} belge iddia dosyasında tek bağımsız kaynak sayılır.`);
  return { belge: kisa(e, kod)!, tanim, gorunenYazar: gorunen, gercekYazar: gercek, yazarDurumu, aile: { kok: kisa(e, kok)!, uyeler }, elde, deliller, okuyanlar, notlar };
}
