// Kalıtım ve veraset (§15-8). Soybilim, biyolojik ebeveynlik, hukuki ebeveynlik ve veraset ayrıdır: kalıtım yalnızca
// biyolojik ebeveynlerden (kan bağı, evlilik dışı ya da türü yazılmamış ebeveyn) hesaplanır, evlatlıkta hesaplanmaz.
// Tek genli özellikte olasılık, ebeveynlerin olası genotiplerine göre en az–en çok aralığıdır; çok genli özellikte
// hesap yapılmaz. Beklenmeyen bir sonuç gizli ebeveyn kanıtı sayılmaz. Taht sırası seçilen kurala göre hukuki
// sıradır; fiilen kimin tahta çıktığı yürütme kayıtlarından ayrıca gösterilir.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { karsilastir, siraAnahtari, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import type { KalitimDegeri, KalitimOzelligi, KalitimSatiri, KisaKayit, TahtSirasi, VerasetKurali } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { makamYurutenleri } from './surec';

export interface SoyBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const ETKIN = `i.silindi IS NULL AND i.karar<>'vazgecildi'`;
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
const temiz = (x: unknown, n = 300) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Ebeveynler (a: ebeveyn, b: çocuk) ve rolleri. */
function ebeveynler(e: EvrenVt, kisi: string) {
  return e.db.selectObjects(`SELECT i.a, i.rol FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.b=? AND i.tur='ebeveyn' AND ${ETKIN} AND k.silindi IS NULL`, [kisi])
    .map((r) => ({ kod: r.a as string, rol: (r.rol as string | null) ?? null }));
}
function cocuklar(e: EvrenVt, kisi: string) {
  return e.db.selectObjects(`SELECT i.b, i.rol FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.a=? AND i.tur='ebeveyn' AND ${ETKIN} AND k.silindi IS NULL`, [kisi])
    .map((r) => ({ kod: r.b as string, rol: (r.rol as string | null) ?? null }));
}
const biyolojik = (rol: string | null) => rol !== 'evlatlik';

// ---------- Kalıtım ----------

export function kalitimOzellikleri(e: EvrenVt): KalitimOzelligi[] {
  return e.db.selectObjects('SELECT kod, tanim FROM kalitim_ozellikleri ORDER BY olusturma').map((r) => ({ kod: r.kod as string, ...JSON.parse(r.tanim as string) as Omit<KalitimOzelligi, 'kod'> }));
}

export function kalitimOzelligiYaz(b: SoyBaglami, kod: string | null, t: Omit<KalitimOzelligi, 'kod'> | null): { kod: string } {
  if (kod && b.e.db.selectValue('SELECT 1 FROM kalitim_ozellikleri WHERE kod=?', [kod]) === undefined) throw new Error('Özellik bulunamadı.');
  if (!kod && !t) throw new Error('Özellik bulunamadı.');
  let tanim: Omit<KalitimOzelligi, 'kod'> | null = null;
  if (t) {
    const ad = temiz(t.ad, 80);
    if (!ad) throw new Error('Özelliğin adını yazın.');
    if (!['baskin', 'cekinik', 'cok_genli'].includes(t.kip)) throw new Error('Geçersiz kalıtım biçimi.');
    tanim = { ad, kip: t.kip, not: temiz(t.not) };
  }
  const k = kod ?? yeniKod();
  b.yaz([{ tur: 'kalitim_ozelligi_yaz', veri: { kod: k, tanim } }], []);
  return { kod: k };
}

function degerlerOku(e: EvrenVt, kisi: string): Record<string, KalitimDegeri> {
  const r = e.db.selectValue('SELECT degerler FROM kalitim_degerleri WHERE kod=?', [kisi]) as string | undefined;
  return r ? JSON.parse(r) : {};
}

export function kalitimDegeriYaz(b: SoyBaglami, kisi: string, ozellik: string, d: KalitimDegeri | null) {
  kayitTuru(b.e, kisi);
  if (b.e.db.selectValue('SELECT 1 FROM kalitim_ozellikleri WHERE kod=?', [ozellik]) === undefined) throw new Error('Özellik bulunamadı.');
  let deger: KalitimDegeri | null = null;
  if (d) {
    if (d.gorunur !== null && typeof d.gorunur !== 'boolean') throw new Error('Geçersiz değer.');
    if (d.kopya !== null && ![0, 1, 2].includes(d.kopya)) throw new Error('Geçersiz değer.');
    deger = { gorunur: d.gorunur, kopya: d.kopya };
    if (deger.gorunur === null && deger.kopya === null) deger = null;
  }
  b.yaz([{ tur: 'kalitim_degeri_yaz', veri: { kisi, ozellik, deger } }], [kisi]);
}

/** Kişinin olası kopya sayıları (0, 1, 2) yazılan değere ve özelliğin biçimine göre. */
function olasiKopyalar(o: KalitimOzelligi, d: KalitimDegeri | undefined): number[] {
  if (d?.kopya !== null && d?.kopya !== undefined) return [d.kopya];
  if (d?.gorunur === true) return o.kip === 'baskin' ? [1, 2] : [2];
  if (d?.gorunur === false) return o.kip === 'baskin' ? [0] : [0, 1];
  return [0, 1, 2];
}

export function kalitim(e: EvrenVt, kisi: string): { ozellikler: KalitimSatiri[]; ebeveynler: KisaKayit[]; evlatlik: KisaKayit[] } {
  kayitTuru(e, kisi);
  const ebs = ebeveynler(e, kisi);
  const biyo = ebs.filter((x) => biyolojik(x.rol)).slice(0, 2);
  const kendi = degerlerOku(e, kisi);
  const ozellikler = kalitimOzellikleri(e).map((o): KalitimSatiri => {
    const deger = kendi[o.kod] ?? null;
    if (o.kip === 'cok_genli') return { ozellik: o, deger, olasilik: null, aciklama: 'Çok genli özellik: olasılık hesaplanmaz.', beklenmez: false };
    if (!biyo.length) return { ozellik: o, deger, olasilik: null, aciklama: 'Biyolojik ebeveyn kayıtlı değil.', beklenmez: false };
    const k1 = olasiKopyalar(o, degerlerOku(e, biyo[0].kod)[o.kod]);
    const k2 = biyo[1] ? olasiKopyalar(o, degerlerOku(e, biyo[1].kod)[o.kod]) : [0, 1, 2];
    let enAz = 1, enCok = 0;
    for (const a of k1) for (const b of k2) {
      const p1 = a / 2, p2 = b / 2;
      const p = o.kip === 'baskin' ? 1 - (1 - p1) * (1 - p2) : p1 * p2;
      enAz = Math.min(enAz, p); enCok = Math.max(enCok, p);
    }
    // Kişinin kendi kopya sayısı ebeveynlerden gelemezse ya da görünür olup olmaması beklenmezse.
    const kendiK = deger?.kopya ?? null;
    const gelebilir = kendiK === null || k1.some((a) => k2.some((b) => (kendiK === 0 ? a < 2 && b < 2 : kendiK === 2 ? a > 0 && b > 0 : (a > 0 || b > 0) && (a < 2 || b < 2))));
    const beklenmez = (deger?.gorunur === true && enCok === 0) || (deger?.gorunur === false && enAz === 1) || !gelebilir;
    const eksik = biyo.length < 2 ? ' Bir ebeveyn kayıtlı değil; onun için her olasılık sayıldı.' : '';
    return { ozellik: o, deger, olasilik: { enAz, enCok },
      aciklama: `Tek genli kurala göre görünme olasılığı.${eksik}${beklenmez ? ' Kayıtlı ebeveynlerle beklenmez; bu, gizli bir ebeveynin kanıtı sayılmaz.' : ''}`, beklenmez };
  });
  return { ozellikler, ebeveynler: biyo.map((x) => kisa(e, x.kod)), evlatlik: ebs.filter((x) => !biyolojik(x.rol)).map((x) => kisa(e, x.kod)) };
}

// ---------- Veraset ----------

const BOS_KURAL: VerasetKurali = { tur: 'ilk_dogan', evlatlik: false, evlilikDisi: false, not: '' };
export function verasetOku(e: EvrenVt, makam: string): VerasetKurali | null {
  const r = e.db.selectValue('SELECT tanim FROM veraset_kurallari WHERE kod=?', [makam]) as string | undefined;
  return r ? { ...BOS_KURAL, ...JSON.parse(r) as VerasetKurali } : null;
}

export function verasetYaz(b: SoyBaglami, makam: string, k: VerasetKurali | null) {
  if (!['makam', 'siyasi'].includes(kayitTuru(b.e, makam))) throw new Error('Veraset kuralı bir makam ya da siyasi varlık için yazılır.');
  let tanim: VerasetKurali | null = null;
  if (k) {
    if (!['ilk_dogan', 'kardes_once', 'secim'].includes(k.tur)) throw new Error('Geçersiz veraset kuralı.');
    tanim = { tur: k.tur, evlatlik: !!k.evlatlik, evlilikDisi: !!k.evlilikDisi, not: temiz(k.not) };
  }
  b.yaz([{ tur: 'veraset_yaz', veri: { kod: makam, tanim } }], [makam]);
}

function yasamSiniri(e: EvrenVt, kisi: string) {
  const oku = (alan: string) => {
    const r = e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [kisi, alan]) as string | undefined;
    const t = r ? JSON.parse(r) as EvrenTarihi | null : null;
    return t && typeof t === 'object' && 'ifade' in t ? t : null;
  };
  return { dogum: oku('dogum'), olum: oku('olum') };
}

const YAKINLIK = ['', 'çocuğu', 'torunu', 'torununun çocuğu'];

/** Seçilen kurala göre belirli tarihte taht sırası. */
export function tahtSirasi(e: EvrenVt, makam: string, tarihIfade: string): TahtSirasi {
  kayitTuru(e, makam);
  const tarih = tarihCoz(temiz(tarihIfade, 120), zamanSetiOku(e.db));
  if (!tarih?.eksen) throw new Error('Tarih okunamadı.');
  const kural = verasetOku(e, makam);
  const yurutenler = makamYurutenleri(e, makam);
  // Başlangıcı yazılmamış yürütme bu tarihte de sürüyor sayılır (bitişi önce değilse); başlangıcı sonraysa sayılmaz.
  const simdiki = yurutenler.filter((y) => !(y.baslangic && karsilastir(y.baslangic, tarih) === 'sonra') && !(y.bitis && karsilastir(y.bitis, tarih) === 'once'));
  const sonrakiler = yurutenler.filter((y) => y.baslangic && karsilastir(y.baslangic, tarih) === 'sonra').map((y) => ({ kisi: y.kisi, baslangic: y.baslangic!.ifade }));
  const not = 'Hukuken varis olmak fiilen tahta çıkmak değildir. Sıra yalnızca kayıtlı ebeveyn bağlarından, doğum ve ölüm tarihlerinden hesaplandı; cinsiyet ve başka koşullar sayılmaz.';
  const temel = { makam: kisa(e, makam), tarih, kural, sonrakiler, not };
  if (!simdiki.length) return { ...temel, yuruten: null, sira: [], durum: 'yuruten_yok' };
  if (simdiki.length > 1) return { ...temel, yuruten: simdiki[0].kisi, sira: [], durum: 'birden_cok' };
  const yuruten = simdiki[0].kisi;
  if (!kural) return { ...temel, yuruten, sira: [], durum: 'kural_yok' };
  if (kural.tur === 'secim') return { ...temel, yuruten, sira: [], durum: 'secim' };

  const sayilir = (rol: string | null) => rol === 'evlatlik' ? kural.evlatlik : rol === 'evlilik_disi' ? kural.evlilikDisi : true;
  const durum = (k: string) => {
    const s = yasamSiniri(e, k);
    if (s.dogum && karsilastir(s.dogum, tarih) === 'sonra') return 'dogmamis' as const;
    if (s.olum && karsilastir(s.olum, tarih) === 'once') return 'olmus' as const;
    if ((s.dogum && karsilastir(s.dogum, tarih) === 'belirsiz') || (s.olum && karsilastir(s.olum, tarih) === 'belirsiz')) return 'belirsiz' as const;
    return s.dogum ? 'yasiyor' as const : 'dogum_bilinmiyor' as const;
  };
  const sirali = (l: { kod: string; rol: string | null }[]) => l.filter((x) => sayilir(x.rol))
    .map((x) => ({ ...x, d: yasamSiniri(e, x.kod).dogum })).sort((a, b) => (a.d ? siraAnahtari(a.d) : Infinity) - (b.d ? siraAnahtari(b.d) : Infinity));
  const sira: TahtSirasi['sira'] = [];
  const gorulen = new Set([yuruten.kod]);
  const ekle = (kod: string, yakinlik: string, rol: string | null) => {
    const d = durum(kod);
    if (d === 'dogmamis' || d === 'olmus') return;
    const uyarilar: string[] = [];
    if (d === 'belirsiz') uyarilar.push('bu tarihte yaşayıp yaşamadığı belirsiz');
    if (d === 'dogum_bilinmiyor') uyarilar.push('doğum tarihi yok; sıradaki yeri kesin değil');
    if (rol === 'evlatlik') uyarilar.push('evlatlık');
    if (rol === 'evlilik_disi') uyarilar.push('evlilik dışı');
    sira.push({ kisi: kisa(e, kod), yakinlik, uyarilar });
  };
  // Bir kişinin soyu: çocuklar doğum sırasıyla, her çocuğun soyu bir sonraki çocuktan önce (ölenin soyu onu temsil eder).
  const soy = (kod: string, derinlik: number, etiket: (n: number) => string) => {
    if (derinlik > 8 || sira.length >= 40) return;
    for (const c of sirali(cocuklar(e, kod))) {
      if (gorulen.has(c.kod)) continue;
      gorulen.add(c.kod);
      ekle(c.kod, etiket(derinlik), c.rol);
      soy(c.kod, derinlik + 1, etiket);
    }
  };
  const torun = (n: number) => YAKINLIK[n] ?? `${n}. kuşaktan torunu`;
  const ebs = sirali(ebeveynler(e, yuruten.kod));
  const kardesler: { kod: string; rol: string | null }[] = [];
  for (const p of ebs) for (const c of sirali(cocuklar(e, p.kod))) if (c.kod !== yuruten.kod && !kardesler.some((x) => x.kod === c.kod)) kardesler.push(c);
  const kardesSirali = sirali(kardesler);
  if (kural.tur === 'kardes_once') {
    for (const k of kardesSirali) { if (!gorulen.has(k.kod)) { gorulen.add(k.kod); ekle(k.kod, 'kardeşi', k.rol); } }
    soy(yuruten.kod, 1, torun);
    for (const k of kardesSirali) soy(k.kod, 1, (n) => n === 1 ? 'yeğeni' : 'kardeşinin torunu');
  } else {
    soy(yuruten.kod, 1, torun);
    for (const k of kardesSirali) {
      if (gorulen.has(k.kod)) continue;
      gorulen.add(k.kod);
      ekle(k.kod, 'kardeşi', k.rol);
      soy(k.kod, 1, (n) => n === 1 ? 'yeğeni' : 'kardeşinin torunu');
    }
  }
  return { ...temel, yuruten, sira, durum: 'hesaplandi' };
}
