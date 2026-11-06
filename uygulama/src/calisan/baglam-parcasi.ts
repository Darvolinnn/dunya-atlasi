// Sahne içinde bağlam parçaları (F29, §3.3). Bir paragraf ya da cümle (geçmişe dönüş, okunan mektup, öbür cephe)
// kendi tarihini, yerini ve bakış açısını alabilir; yazar sahneyi bölmek zorunda kalmaz. Parça metinde, metin
// işaretiyle aynı kararlı işaretle (§5.7) durur; işaretin kodu bu kaydın kodudur. Her alan için üç seçenek vardır:
// sahneyle aynı · belirtilmemiş (bağlam boş bırakılabilir) · bu parçaya özgü değer. Yan panel imlecin bulunduğu
// parçanın bağlamını gösterir. Program metinden bağlam çıkarmaz (K1).
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { tarihCoz, type EvrenTarihi } from '../alan/tarih';
import type { BaglamParcasi, BaglamParcasiTanimi, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';

export interface ParcaBaglami { e: EvrenVt; yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void }

/** Saklanan tanım: tarih çözülmüş olarak tutulur. */
export interface SakliParca {
  tarih: { kip: 'sahne' | 'bos' | 'deger'; deger: EvrenTarihi | null };
  yer: { kip: 'sahne' | 'bos' | 'deger'; kod: string | null };
  bakis: { kip: 'sahne' | 'bos' | 'deger'; kod: string | null };
  not: string;
}
const KIPLER = ['sahne', 'bos', 'deger'];

function kisa(e: EvrenVt, kod: string | null): KisaKayit | null {
  if (!kod) return null;
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT ad, tur, silindi FROM kayitlar WHERE kod=?', [k]);
  return r && r.silindi === null ? { kod: k, ad: r.ad as string, tur: r.tur as string } : null;
}

function denetle(e: EvrenVt, t: BaglamParcasiTanimi): SakliParca {
  if (!t || typeof t !== 'object') throw new Error('Bağlam okunamadı.');
  for (const a of [t.tarih, t.yer, t.bakis]) if (!a || !KIPLER.includes(a.kip)) throw new Error('Her alan için bir seçim yapın.');
  let tarih: EvrenTarihi | null = null;
  if (t.tarih.kip === 'deger') {
    const ifade = String(t.tarih.ifade ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
    tarih = ifade ? tarihCoz(ifade, zamanSetiOku(e.db)) : null;
    if (!tarih?.eksen) throw new Error('Parçanın tarihi okunamadı.');
  }
  const kayit = (a: { kip: string; kod?: string | null }, ad: string) => {
    if (a.kip !== 'deger') return null;
    if (!kodGecerliMi(a.kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [a.kod]) === undefined) throw new Error(`${ad} seçilmedi.`);
    return a.kod as string;
  };
  const not = String(t.not ?? '').replace(/\s+/g, ' ').trim();
  if (not.length > 300) throw new Error('Not en çok 300 karakter olabilir (boşluklar dahil).');
  return {
    tarih: { kip: t.tarih.kip, deger: tarih },
    yer: { kip: t.yer.kip, kod: kayit(t.yer, 'Yer') },
    bakis: { kip: t.bakis.kip, kod: kayit(t.bakis, 'Bakış açısı') },
    not,
  };
}

export function parcaOlustur(b: ParcaBaglami, kayit: string, alan: string, t: BaglamParcasiTanimi) {
  const r = kodGecerliMi(kayit) ? b.e.db.selectObject('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kayit]) : undefined;
  if (!r) throw new Error('Sahne bulunamadı.');
  if (r.tur !== 'sahne') throw new Error('Bağlam parçası yalnızca sahne metninde açılabilir.');
  if (typeof alan !== 'string' || !/^[a-z_]{1,40}$/.test(alan)) throw new Error('Geçersiz metin.');
  const kod = yeniKod();
  b.yaz([{ tur: 'baglam_parcasi_yaz', veri: { kod, kayit, alan, tanim: denetle(b.e, t) } }], [kayit]);
  return { kod };
}

function bul(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM baglam_parcalari WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Bağlam parçası bulunamadı.');
  return r;
}

export function parcaYaz(b: ParcaBaglami, kod: string, t: BaglamParcasiTanimi) {
  const r = bul(b.e, kod);
  const tanim = denetle(b.e, t);
  if (r.tanim === JSON.stringify(tanim)) return;
  b.yaz([{ tur: 'baglam_parcasi_yaz', veri: { kod, kayit: r.kayit, alan: r.alan, tanim } }], [r.kayit as string]);
}

/** Kaydı kaldırır; metindeki işareti editör kaldırır. */
export function parcaSil(b: ParcaBaglami, kod: string) {
  const r = bul(b.e, kod);
  b.yaz([{ tur: 'baglam_parcasi_sil', veri: { kod, kayit: r.kayit } }], [r.kayit as string]);
}

export function parcaOku(e: EvrenVt, kod: string): SakliParca & { kayit: string } {
  const r = bul(e, kod);
  return { ...(JSON.parse(r.tanim as string) as SakliParca), kayit: r.kayit as string };
}

export function parcalar(e: EvrenVt, kayit: string): BaglamParcasi[] {
  return e.db.selectObjects('SELECT * FROM baglam_parcalari WHERE kayit=? AND silindi IS NULL ORDER BY olusturma, rowid', [kayit]).map((r) => {
    const t = JSON.parse(r.tanim as string) as SakliParca;
    const yerler = e.db.selectObjects('SELECT metin FROM metin_isaret_yerleri WHERE isaret=? AND kayit=? ORDER BY sira', [r.kod as string, r.kayit as string]);
    return {
      kod: r.kod as string, metin: yerler.map((y) => y.metin as string), not: t.not,
      tarih: { kip: t.tarih.kip, ifade: t.tarih.deger?.ifade ?? '' },
      yer: { kip: t.yer.kip, kayit: kisa(e, t.yer.kod) },
      bakis: { kip: t.bakis.kip, kayit: kisa(e, t.bakis.kod) },
    };
  });
}
