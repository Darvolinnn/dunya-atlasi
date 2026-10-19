// Süreçler, adımlar ve eşikler (§3.10); makam ile kişi (§3.8). Bir sürecin sonucu, ilgili kurumun ya da kuralın
// yazarın yazdığı açık tanımına bağlıdır; program evrensel kural koymaz. Kural bir kayda (makam, kurum, kültür,
// ritüel…) aittir: adımlar, önkoşullar, geri dönülmez eşikler ve sonucun hangi adımlarla doğduğu. Olay bir ya da
// daha çok kurala bağlanır; her adımın durumu ayrı kaydedilir. Eksik adım "olmadı" sayılmaz, bilinmiyordur. İki kural
// farklı sonuç veriyorsa tek bir "oldu / olmadı"ya zorlanmaz; yazar hangisinin fiilen uygulandığını ayrıca seçer.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { siraAnahtari, type EvrenTarihi } from '../alan/tarih';
import type { AdimDurumu, KisaKayit, MakamYurutucusu, OlaySureci, OlaySurecleri, SurecAdimi, SurecKurali, SurecSonucu } from '../veri/api';
import type { EvrenVt } from './evren-vt';

export interface SurecBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

export const ADIM_DURUMLARI: { kod: AdimDurumu; ad: string }[] = [
  { kod: 'planlandi', ad: 'Planlandı' }, { kod: 'basladi', ad: 'Başladı' }, { kod: 'tamam', ad: 'Tamamlandı' },
  { kod: 'yarida', ad: 'Yarıda kaldı' }, { kod: 'yapilmadi', ad: 'Yapılmadı' },
];
const DURUM_ADI = Object.fromEntries(ADIM_DURUMLARI.map((d) => [d.kod, d.ad.toLocaleLowerCase('tr-TR')])) as Record<AdimDurumu, string>;
/** Süreç kuralı tanımlanabilen kayıt türleri; süreci yaşayan kayıt olaydır. */
export const SUREC_SAHIPLERI = ['makam', 'topluluk', 'siyasi', 'kultur', 'inanc', 'rituel', 'antlasma', 'buyu_sistemi', 'buyu_uygulamasi', 'evren_kurali', 'teknoloji'];
export const SUREC_OLAYLARI = ['olay'];

const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [kod]);
  return r ? { kod, ad: r.ad as string, tur: r.tur as string } : { kod, ad: 'Silinmiş kayıt', tur: 'diger' };
};
function kayitTuru(e: EvrenVt, kod: unknown): string {
  const t = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  return t;
}
const metin = (s: unknown, n: number, bos = true) => {
  const x = String(s ?? '').replace(/[ \t]+/g, ' ').trim();
  if (!x && !bos) throw new Error('Ad boş olamaz.');
  if (x.length > n) throw new Error('Metin çok uzun.');
  return x;
};

function kuralOku(e: EvrenVt, r: Record<string, unknown>): SurecKurali {
  return { kod: r.kod as string, sahip: kisa(e, r.sahip as string), ad: r.ad as string, kosullar: r.kosullar as string, adimlar: JSON.parse(r.adimlar as string) };
}
function kuralBul(e: EvrenVt, kod: unknown, silinmis = false): SurecKurali {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject(`SELECT * FROM surec_kurallari WHERE kod=? ${silinmis ? '' : 'AND silindi IS NULL'}`, [kod]) : undefined;
  if (!r) throw new Error('Süreç kuralı bulunamadı.');
  return kuralOku(e, r);
}

export function surecKurallari(e: EvrenVt, sahip?: string): SurecKurali[] {
  return e.db.selectObjects(`SELECT s.* FROM surec_kurallari s JOIN kayitlar k ON k.kod=s.sahip WHERE s.silindi IS NULL AND k.silindi IS NULL
    ${sahip ? 'AND s.sahip=?' : ''} ORDER BY k.ad, s.olusturma`, sahip ? [sahip] : []).map((r) => kuralOku(e, r));
}

export function surecKuraliOlustur(b: SurecBaglami, sahip: string, ad: string) {
  const t = kayitTuru(b.e, sahip);
  if (!SUREC_SAHIPLERI.includes(t)) throw new Error('Bu türden bir kayda süreç kuralı eklenmez.');
  const kod = yeniKod();
  b.yaz([{ tur: 'surec_kurali_olustur', veri: { kod, sahip, ad: metin(ad, 120, false) } }], [sahip]);
  return { kod };
}

/** Kuralın tanımı tek parça yazılır; önkoşul yalnızca önceki bir adım olabilir (döngü kurulamaz). */
export function surecKuraliYaz(b: SurecBaglami, kod: string, tanim: { ad: string; kosullar: string; adimlar: SurecAdimi[] }) {
  const k = kuralBul(b.e, kod);
  if (!Array.isArray(tanim?.adimlar) || tanim.adimlar.length > 40) throw new Error('Adım listesi geçersiz.');
  const goruldu = new Set<string>();
  const adimlar: SurecAdimi[] = tanim.adimlar.map((a) => {
    if (!a || typeof a.kod !== 'string' || !/^[a-z0-9]{1,24}$/.test(a.kod) || goruldu.has(a.kod)) throw new Error('Adım listesi geçersiz.');
    const onkosul = Array.isArray(a.onkosul) ? [...new Set(a.onkosul.filter((x) => typeof x === 'string'))] : [];
    if (onkosul.some((x) => !goruldu.has(x))) throw new Error('Bir adımın önkoşulu ancak kendinden önceki bir adım olabilir.');
    goruldu.add(a.kod);
    return { kod: a.kod, ad: metin(a.ad, 120, false), onkosul, esik: !!a.esik, sonuc: !!a.sonuc, etki: metin(a.etki, 300) };
  });
  const yeni = { ad: metin(tanim.ad, 120, false), kosullar: metin(tanim.kosullar, 1000), adimlar };
  if (JSON.stringify(yeni) === JSON.stringify({ ad: k.ad, kosullar: k.kosullar, adimlar: k.adimlar })) return;
  b.yaz([{ tur: 'surec_kurali_yaz', veri: { kod, tanim: yeni, sahip: k.sahip.kod } }], [k.sahip.kod]);
}

export function surecKuraliSil(b: SurecBaglami, kod: string, geriYukle: boolean) {
  const k = kuralBul(b.e, kod, true);
  b.yaz([{ tur: geriYukle ? 'surec_kurali_geri_yukle' : 'surec_kurali_sil', veri: { kod, ad: k.ad, sahip: k.sahip.kod } }], [k.sahip.kod]);
}

function olayKontrol(e: EvrenVt, olay: string) {
  if (!SUREC_OLAYLARI.includes(kayitTuru(e, olay))) throw new Error('Süreç yalnızca bir olaya bağlanır.');
}

export function surecBagla(b: SurecBaglami, olay: string, kural: string, bagli: boolean) {
  olayKontrol(b.e, olay);
  const k = kuralBul(b.e, kural, !bagli);
  const var_ = b.e.db.selectValue('SELECT 1 FROM surec_baglari WHERE olay=? AND kural=? AND silindi IS NULL', [olay, kural]) !== undefined;
  if (var_ === bagli) return;
  b.yaz([{ tur: 'surec_bagla', veri: { olay, kural, bagli, ad: k.ad } }], [olay]);
}

export function surecAdimi(b: SurecBaglami, olay: string, kural: string, adim: string, durum: AdimDurumu | null) {
  olayKontrol(b.e, olay);
  const k = kuralBul(b.e, kural);
  const a = k.adimlar.find((x) => x.kod === adim);
  if (!a) throw new Error('Bu adım kuralda yok.');
  if (durum !== null && !ADIM_DURUMLARI.some((d) => d.kod === durum)) throw new Error('Geçersiz seçim.');
  if (b.e.db.selectValue('SELECT 1 FROM surec_baglari WHERE olay=? AND kural=? AND silindi IS NULL', [olay, kural]) === undefined) throw new Error('Kural bu olaya bağlı değil.');
  const onceki = (b.e.db.selectValue('SELECT durum FROM surec_adimlari WHERE olay=? AND kural=? AND adim=?', [olay, kural, adim]) as string | undefined) ?? null;
  if (onceki === durum) return;
  b.yaz([{ tur: 'surec_adimi', veri: { olay, kural, adim, durum, onceki, adimAd: a.ad, kuralAd: k.ad } }], [olay]);
}

export function surecFiili(b: SurecBaglami, olay: string, kural: string | null) {
  olayKontrol(b.e, olay);
  if (kural !== null && b.e.db.selectValue('SELECT 1 FROM surec_baglari WHERE olay=? AND kural=? AND silindi IS NULL', [olay, kural]) === undefined) throw new Error('Kural bu olaya bağlı değil.');
  b.yaz([{ tur: 'surec_fiili', veri: { olay, kural, ad: kural ? kuralBul(b.e, kural).ad : null } }], [olay]);
}

// ---------- Hesap ----------

/** Bir kurala göre sonuç. Yalnızca yazarın işaretlediği adım durumlarından çıkar; boş adım bilinmiyordur. */
export function surecSonucu(k: SurecKurali, d: Record<string, AdimDurumu>): SurecSonucu {
  let esik: string | null = null;
  for (const a of k.adimlar) if (a.esik && d[a.kod] === 'tamam') esik = a.ad;
  const gerekli = k.adimlar.filter((a) => a.sonuc);
  const ad = (l: SurecAdimi[]) => l.map((a) => `“${a.ad}”`).join(', ');
  if (!gerekli.length) return { durum: 'tanimsiz', yazi: 'Bu kural, sonucun hangi adımlarla doğduğunu belirtmiyor.', esik };
  const kalan = gerekli.filter((a) => d[a.kod] === 'yarida' || d[a.kod] === 'yapilmadi');
  if (kalan.length) return { durum: 'dogmadi', yazi: `Bu kurala göre sonuç doğmadı: ${kalan.map((a) => `“${a.ad}” ${DURUM_ADI[d[a.kod]]}`).join(', ')}.`, esik };
  if (gerekli.every((a) => d[a.kod] === 'tamam')) return { durum: 'dogdu', yazi: `Bu kurala göre sonuç doğdu: ${ad(gerekli)} tamamlandı.`, esik };
  const isaretli = k.adimlar.filter((a) => d[a.kod]);
  if (isaretli.length && isaretli.every((a) => d[a.kod] === 'planlandi')) return { durum: 'plan', yazi: 'Süreç yalnızca planlandı, başladığı kaydedilmedi.', esik };
  const bilinmeyen = gerekli.filter((a) => !d[a.kod] || d[a.kod] === 'planlandi' || d[a.kod] === 'basladi');
  return { durum: 'bilinmiyor', yazi: `Sonuç bilinmiyor: ${bilinmeyen.map((a) => `“${a.ad}” ${d[a.kod] ? DURUM_ADI[d[a.kod]] : 'kaydedilmedi'}`).join(', ')}. Kaydedilmemiş bir adım “olmadı” sayılmaz.`, esik };
}

/** Bir adım gerçekleşmiş görünürken önkoşul adımı "yapılmadı" ya da "yarıda kaldı" ise. Önkoşulu bilinmeyen adım uyarı vermez. */
export function onkosulCelismeleri(k: SurecKurali, d: Record<string, AdimDurumu>) {
  const l: { adim: SurecAdimi; onkosul: SurecAdimi; kesin: boolean }[] = [];
  for (const a of k.adimlar) {
    if (!['basladi', 'tamam', 'yarida'].includes(d[a.kod])) continue;
    for (const p of a.onkosul) {
      const o = k.adimlar.find((x) => x.kod === p);
      if (o && (d[p] === 'yapilmadi' || d[p] === 'yarida')) l.push({ adim: a, onkosul: o, kesin: d[p] === 'yapilmadi' });
    }
  }
  return l;
}

function adimDurumlari(e: EvrenVt, olay: string, kural: string): Record<string, AdimDurumu> {
  return Object.fromEntries(e.db.selectObjects('SELECT adim, durum FROM surec_adimlari WHERE olay=? AND kural=?', [olay, kural]).map((r) => [r.adim as string, r.durum as AdimDurumu]));
}

export function olaySurecleri(e: EvrenVt, olay: string): OlaySurecleri {
  const surecler: OlaySureci[] = e.db.selectObjects(`SELECT b.fiili, s.* FROM surec_baglari b JOIN surec_kurallari s ON s.kod=b.kural
      WHERE b.olay=? AND b.silindi IS NULL ORDER BY b.olusturma`, [olay]).map((r) => {
    const kural = kuralOku(e, r);
    const durumlar = adimDurumlari(e, olay, kural.kod);
    return {
      kural, silinmis: r.silindi != null, durumlar, sonuc: surecSonucu(kural, durumlar), fiili: !!r.fiili,
      celismeler: onkosulCelismeleri(kural, durumlar).map((c) => `“${c.adim.ad}” ${DURUM_ADI[durumlar[c.adim.kod]]}, ama önkoşulu “${c.onkosul.ad}” ${DURUM_ADI[durumlar[c.onkosul.kod]]}.`),
    };
  });
  const kesinler = new Set(surecler.filter((s) => !s.silinmis && (s.sonuc.durum === 'dogdu' || s.sonuc.durum === 'dogmadi')).map((s) => s.sonuc.durum));
  return { surecler, catisma: kesinler.size > 1 };
}

/** Denetim (§9.1 Süreç): olay kaydı silinmez; önkoşulla çelişme gösterilir, açıklama kendiliğinden üretilmez. */
export function surecDenetimi(e: EvrenVt) {
  const bulgular: { anahtar: string; hukum: 'celiski' | 'olasi'; baslik: string; dayanak: string; kayitlar: KisaKayit[]; fikir: boolean; imza: string }[] = [];
  let denetlenen = 0;
  for (const r of e.db.selectObjects(`SELECT b.olay, s.*, k.karar okarar FROM surec_baglari b JOIN surec_kurallari s ON s.kod=b.kural JOIN kayitlar k ON k.kod=b.olay
      JOIN kayitlar h ON h.kod=s.sahip WHERE b.silindi IS NULL AND s.silindi IS NULL AND k.silindi IS NULL AND h.silindi IS NULL AND k.karar<>'vazgecildi'`)) {
    const kural = kuralOku(e, r), olay = r.olay as string;
    if (!kural.adimlar.some((a) => a.onkosul.length)) continue;
    denetlenen++;
    const d = adimDurumlari(e, olay, kural.kod);
    for (const c of onkosulCelismeleri(kural, d)) {
      const o = kisa(e, olay);
      bulgular.push({
        anahtar: `denetim:surec:${olay}:${kural.kod}:${c.adim.kod}:${c.onkosul.kod}`, hukum: c.kesin ? 'celiski' : 'olasi',
        baslik: `“${o.ad}”: “${c.adim.ad}” önkoşulu olmadan ${DURUM_ADI[d[c.adim.kod]]}`,
        dayanak: `“${kural.ad}” kuralına (${kural.sahip.ad}) göre “${c.adim.ad}” için önce “${c.onkosul.ad}” gerekir. Bu olayda ise “${c.onkosul.ad}” ${DURUM_ADI[d[c.onkosul.kod]]} olarak işaretli. Olay kaydı değiştirilmez, ama bir açıklama gerekebilir.`,
        kayitlar: [o, kural.sahip], fikir: r.okarar === 'fikir', imza: JSON.stringify([d[c.adim.kod], d[c.onkosul.kod]]),
      });
    }
  }
  return { bulgular, denetlenen };
}

// ---------- Makam ----------

/** Makamı yürütenler, başlangıca göre; bilinen boş dönemler ve aynı anda iki yürüten ayrıca yazılır (yargı değil, not). */
export function makamYurutenleri(e: EvrenVt, makam: string): MakamYurutucusu[] {
  const oku = (s: unknown) => (s ? JSON.parse(s as string) as EvrenTarihi : null);
  const l = e.db.selectObjects(`SELECT i.kod ik, i.a, i.baslangic, i.bitis, i.karar FROM iliskiler i JOIN kayitlar k ON k.kod=i.a
      WHERE i.tur='yurutur' AND i.b=? AND i.silindi IS NULL AND i.karar<>'vazgecildi' AND k.silindi IS NULL`, [makam])
    .map((r) => ({ iliski: r.ik as string, kisi: kisa(e, r.a as string), baslangic: oku(r.baslangic), bitis: oku(r.bitis), fikir: r.karar === 'fikir', not: null as string | null }))
    .sort((a, b) => siraAnahtari(a.baslangic) - siraAnahtari(b.baslangic));
  for (let i = 1; i < l.length; i++) {
    const o = l[i - 1], s = l[i];
    const bit = o.bitis?.eksen?.enGec ?? null, bas = s.baslangic?.eksen?.enErken ?? null;
    if (!o.bitis && s.baslangic) s.not = `“${o.kisi.ad}” için bitiş yazılmamış, bu yüzden bu dönemde iki yürüten görünüyor.`;
    else if (bit !== null && bas !== null && bas < (o.bitis?.eksen?.enErken ?? bit)) s.not = `“${o.kisi.ad}” ile aynı dönemde yürütüyor görünüyor.`;
    else if (bit !== null && bas !== null && bas > bit + 1) s.not = `Önceki yürütenden sonra boş dönem var: ${o.bitis!.ifade} – ${s.baslangic!.ifade}.`;
  }
  return l;
}
