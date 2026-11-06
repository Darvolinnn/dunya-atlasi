/** F15 / §18.2: Yazar hangi anlatı kararını hangi eserde hatırlamak istiyor?
 * En az veri: yazarın cümlesi ve kapsamı. Bağlı kayıt yoksa hatırlatma yoktur; eksik sayılmaz.
 * Okunanlar: maddeler, dışarıda bırakmalar, açık kayıt bağları, anlatı üyeliği ve çatışmalar.
 * Değişenler: yalnız bu paketin maddeleri ve eser seçimleri, işlem günlüğü üzerinden.
 * Metinden anlam, eksiklik, kronoloji veya denetim kuralı çıkarılmaz.
 * Kabul: evren maddesi iki esere gelir; birinin seçimi yalnız o eserden çıkarır.
 * Veri sözleşmesi: metin boş olamaz; bağlı kayıt listesi boş olabilir. Kapsam güncel eserlere
 * uygulanır; geçmişi değiştiren olay üretilmez. Karar durumunu yalnız yazar belirler.
 */
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { kararGecerli } from '../alan/turler';
import { turkceKarsilastir } from '../alan/turkce';
import type { IslemGirdisi } from '../alan/islem';
import type { EserSozlesmesi, KisaKayit, SozlesmeHatirlatmasi, SozlesmeMaddesi, SozlesmeTanimi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { anlatiYeri } from './anlati';

interface Baglam { e: EvrenVt; yaz(g: IslemGirdisi[], kayitlar: string[]): void }
export const SOZLESME_TURLERI = { aciklanmayacak: 'Açıklanmayacak', acik_birakildi: 'Bilinçli açık bırakıldı', anlati_kurali: 'Anlatı kuralı' } as const;
function kayit(e: EvrenVt, kod: string, tur?: string): KisaKayit {
  const k = typeof kod === 'string' && kodGecerliMi(kod) ? yonlendir(e.db, kod) : '';
  const r = e.db.selectObject('SELECT kod,ad,tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  if (!r || tur && r.tur !== tur) throw new Error(tur === 'eser' ? 'Seçilen eser bulunamadı.' : 'Seçilen kayıt bulunamadı.');
  return r as unknown as KisaKayit;
}
const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod,ad,tur FROM kayitlar WHERE kod=?', [k]);
  return r ? r as unknown as KisaKayit : { kod: k, ad: 'Kaldırılmış kayıt', tur: 'diger' };
};
export function sozlesmeCatismali(e: EvrenVt, kod: string, alan?: string): boolean {
  return e.db.selectValue(`SELECT 1 FROM alan_yazanlari WHERE nesne=? ${alan ? 'AND alan=?' : "AND alan IN ('sozlesme_tanim','sozlesme_silindi')"} GROUP BY alan HAVING count(DISTINCT deger)>1 LIMIT 1`, alan ? [kod, alan] : [kod]) !== undefined;
}
function maddeVar(e: EvrenVt, kod: string) {
  if (typeof kod !== 'string' || !kodGecerliMi(kod) || !e.db.selectValue('SELECT kod FROM sozlesme_maddeleri WHERE kod=?', [kod])) throw new Error('Sözleşme maddesi bulunamadı.');
}
export function sozlesmeMaddeleri(e: EvrenVt, cop = false): SozlesmeMaddesi[] {
  return e.db.selectObjects(`SELECT kod,tanim,silindi FROM sozlesme_maddeleri WHERE silindi IS ${cop ? 'NOT ' : ''}NULL`).map((r) => {
    const t = JSON.parse(String(r.tanim)) as SozlesmeTanimi;
    const bagliKayitlar = [...new Set(t.bagliKayitlar.map((k) => yonlendir(e.db, k)))];
    const kapsam: SozlesmeTanimi['kapsam'] = t.kapsam.tur === 'evren' ? { tur: 'evren' } : { tur: 'eserler', eserler: [...new Set(t.kapsam.eserler.map((k) => yonlendir(e.db, k)))] };
    return { ...t, kapsam, bagliKayitlar, kod: String(r.kod), silindi: r.silindi !== null, catismali: sozlesmeCatismali(e, String(r.kod)), bagli: bagliKayitlar.map((k) => kisa(e, k)), eserler: kapsam.tur === 'eserler' ? kapsam.eserler.map((k) => kisa(e, k)) : [] };
  }).sort((a, b) => turkceKarsilastir(a.metin, b.metin) || a.kod.localeCompare(b.kod));
}
export function sozlesmeMaddeYaz(b: Baglam, kod: string | null, t: SozlesmeTanimi) {
  if (kod !== null) maddeVar(b.e, kod);
  const metin = typeof t?.metin === 'string' ? t.metin.trim() : '';
  if (!metin || [...metin].length > 500) throw new Error('Madde bir ile 500 karakter arasında olmalı (boşluklar dahil).');
  if (!Object.hasOwn(SOZLESME_TURLERI, t.tur) || !kararGecerli(t.karar)) throw new Error('Maddenin türünü ve karar durumunu seçin.');
  if (!t.kapsam || !['evren', 'eserler'].includes(t.kapsam.tur)) throw new Error('Maddenin kapsamını seçin.');
  let kapsam: SozlesmeTanimi['kapsam'] = { tur: 'evren' };
  if (t.kapsam.tur === 'eserler') {
    if (!Array.isArray(t.kapsam.eserler) || !t.kapsam.eserler.length || t.kapsam.eserler.length > 500) throw new Error('En az bir, en çok 500 eser seçin.');
    kapsam = { tur: 'eserler', eserler: [...new Set(t.kapsam.eserler.map((k) => kayit(b.e, k, 'eser').kod))] };
  }
  if (!Array.isArray(t.bagliKayitlar) || t.bagliKayitlar.length > 500) throw new Error('En çok 500 bağlı kayıt seçilebilir.');
  const bagliKayitlar = [...new Set(t.bagliKayitlar.map((k) => kayit(b.e, k).kod))];
  const tanim: SozlesmeTanimi = { metin, tur: t.tur, karar: t.karar, kapsam, bagliKayitlar };
  const onceki = kod ? sozlesmeMaddeleri(b.e).concat(sozlesmeMaddeleri(b.e, true)).find((m) => m.kod === kod) : undefined;
  kod ??= yeniKod();
  b.yaz([{ tur: 'sozlesme_madde_yaz', veri: { kod, tanim } }], [...new Set([...bagliKayitlar, ...(kapsam.tur === 'eserler' ? kapsam.eserler : []), ...(onceki?.bagliKayitlar ?? []), ...(onceki?.eserler.map((e) => e.kod) ?? [])])]);
  return { kod };
}
export function sozlesmeMaddeKaldir(b: Baglam, kod: string, geri: boolean) {
  maddeVar(b.e, kod);
  const m = [...sozlesmeMaddeleri(b.e), ...sozlesmeMaddeleri(b.e, true)].find((m) => m.kod === kod)!;
  b.yaz([{ tur: geri ? 'sozlesme_madde_geri_yukle' : 'sozlesme_madde_sil', veri: { kod } }], [...m.bagliKayitlar, ...m.eserler.map((e) => e.kod)]);
}
function disaridaDurumu(e: EvrenVt, madde: string, eser: string): 'gecerli' | 'disarida' | 'belirsiz' {
  const r = e.db.selectObjects('SELECT eser,disarida FROM sozlesme_disarida WHERE madde=?', [madde]).filter((r) => yonlendir(e.db, String(r.eser)) === eser);
  if (r.some((r) => sozlesmeCatismali(e, madde, `sozlesme_disarida:${r.eser}`)) || new Set(r.map((r) => Number(r.disarida))).size > 1) return 'belirsiz';
  return r.some((r) => r.disarida === 1) ? 'disarida' : 'gecerli';
}
export function sozlesmeDisaridaYaz(b: Baglam, madde: string, eser: string, disarida: boolean) {
  maddeVar(b.e, madde);
  const k = kayit(b.e, eser, 'eser').kod;
  const m = sozlesmeMaddeleri(b.e).find((m) => m.kod === madde);
  if (!m || m.kapsam.tur !== 'evren') throw new Error('Bir eserin dışında yalnızca bütün evrende geçerli olan etkin bir madde bırakılabilir.');
  if (typeof disarida !== 'boolean') throw new Error('Maddenin bu eserde geçerli olup olmadığını seçin.');
  b.yaz([{ tur: 'sozlesme_disarida_yaz', veri: { madde, eser: k, disarida } }], [k, ...m.bagliKayitlar]);
}
export function eserSozlesmesi(e: EvrenVt, eser: string): EserSozlesmesi {
  const k = kayit(e, eser, 'eser');
  return { eser: k, maddeler: sozlesmeMaddeleri(e).filter((m) => m.karar !== 'vazgecildi' && (m.kapsam.tur === 'evren' || m.kapsam.eserler.includes(k.kod)))
    .map((madde) => ({ madde, durum: madde.catismali ? 'belirsiz' : madde.kapsam.tur === 'evren' ? disaridaDurumu(e, madde.kod, k.kod) : 'gecerli' })) };
}
const eserler = (e: EvrenVt) => e.db.selectObjects("SELECT kod,ad,tur FROM kayitlar WHERE tur='eser' AND silindi IS NULL AND karar<>'vazgecildi'") as unknown as KisaKayit[];
const etkin = (m: SozlesmeMaddesi) => m.karar !== 'vazgecildi' && !m.catismali;
const bagCanli = (e: EvrenVt, kod: string) => e.db.selectValue('SELECT kod FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) !== undefined;

/** Yalnız açık kayıt bağlantıları ve katılım ilişkileri kullanılır; düz metin taranmaz. */
export function sozlesmeHatirlatmalari(e: EvrenVt, kayitKodu: string): SozlesmeHatirlatmasi[] {
  const k = kayit(e, kayitKodu);
  const maddeler = sozlesmeMaddeleri(e).filter(etkin), tumEserler = eserler(e);
  if (k.tur === 'sahne') {
    const ust = e.db.selectValue('SELECT ust FROM anlati WHERE kod=?', [k.kod]) as string | undefined;
    if (sozlesmeCatismali(e, k.kod, 'anlati') || ust && sozlesmeCatismali(e, ust, 'anlati')) return [];
    const eser = anlatiYeri(e, k.kod).eser;
    if (!eser) return [];
    const hedefler = new Set([k.kod, ...e.db.selectObjects('SELECT hedef FROM baglantilar WHERE kaynak=?', [k.kod]).map((r) => yonlendir(e.db, String(r.hedef))),
      ...e.db.selectObjects("SELECT a FROM iliskiler WHERE b=? AND tur IN ('sahnede','bakis','anlatici','odak') AND silindi IS NULL", [k.kod]).map((r) => yonlendir(e.db, String(r.a)))]);
    return eserSozlesmesi(e, eser.kod).maddeler.filter((m) => m.durum === 'gecerli' && m.madde.bagliKayitlar.some((b) => hedefler.has(b) && bagCanli(e, b)))
      .map(({ madde }) => ({ madde, evren: false, eserler: [{ ...eser, tur: 'eser' }], disaridaEserler: [] }));
  }
  return maddeler.filter((m) => m.bagliKayitlar.includes(k.kod)).flatMap((madde) => {
    const ilgili = tumEserler.filter((s) => madde.kapsam.tur === 'evren' || madde.kapsam.eserler.includes(s.kod));
    const gecerli = ilgili.filter((s) => madde.kapsam.tur !== 'evren' || disaridaDurumu(e, madde.kod, s.kod) === 'gecerli');
    if (madde.kapsam.tur !== 'evren' && !gecerli.length) return [];
    return [{ madde, evren: madde.kapsam.tur === 'evren', eserler: gecerli,
      disaridaEserler: ilgili.filter((s) => disaridaDurumu(e, madde.kod, s.kod) === 'disarida') }];
  });
}

/** Başka sayımlar değiştirilmez. Eser verilirse yalnız o eserin geçerli maddeleri;
 * verilmezse yaşayan kapsamların birleşimi. Fikir maddeleri dahildir, vazgeçilmiş/silinmiş
 * veya çatışmalı maddeler dahil değildir. Dönüşteki kayıtlar güncel birleşme hedefleridir. */
export function acikBirakilanKayitlar(e: EvrenVt, eser?: string): Set<string> {
  const maddeler = eser ? eserSozlesmesi(e, eser).maddeler.filter((m) => m.durum === 'gecerli').map((m) => m.madde)
    : sozlesmeMaddeleri(e).filter((m) => m.kapsam.tur === 'evren' || m.eserler.some((s) => eserler(e).some((x) => x.kod === s.kod)));
  return new Set(maddeler.filter((m) => etkin(m) && m.tur === 'acik_birakildi').flatMap((m) => m.bagliKayitlar.filter((k) => bagCanli(e, k))));
}
