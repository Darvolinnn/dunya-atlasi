// Harita: yükle, işaretle, bağla (§8.1). Her haritanın kendi uzayı vardır; ilk görselin piksel boyutu uzayın
// boyutu olur ve en-boy oranı korunur. Görsel uzaya oturtulmuş bir katmandır; işaretler uzayda saklanır.
import { bakisHazirla } from './gorunum';
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { turkceKarsilastir } from '../alan/turkce';
import type { HaritaAyrintisi, HaritaKatmani, HaritaOzeti, IsaretGirdisi, KayitHaritalari } from '../veri/api';
import { buyukHatalar, donusumGecerli, hizala, olcektenDonusum, type Donusum, type KontrolCifti } from '../alan/hizalama';
import type { EvrenVt } from './evren-vt';
import { gecerlilik } from '../alan/durum';
import { eksenYili, karsilastir, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import type { HaritaCizimi, SinirGirdisi } from '../veri/api';
import { sinirBilgisi, sinirCoz, type DurumBaglami, type SinirVerisi } from './durum';
import { zamanSetiOku } from './izdusum';
import { asamalarOku } from './yol';

export interface HaritaBaglami {
  e: EvrenVt;
  olayTarihi(kod: string): EvrenTarihi | null;
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
      gorsel: katmanlarOku(r.katmanlar as string).find((k) => !k.silindi)?.gorsel ?? null, isaretSayisi: Number(r.isaret_sayisi),
    }))
    .sort((x, y) => turkceKarsilastir(x.ad, y.ad));
}

/** Saklanan katman; eski biçim (x, y, ölçek) dönüşüme çevrilerek okunur. */
interface SakliKatman { kod: string; ad: string; gorsel: string; donusum: Donusum; noktalar?: KontrolCifti[]; onceki?: Donusum; silindi?: number }
export function katmanlarOku(ham: string): SakliKatman[] {
  return (JSON.parse(ham) as (Partial<SakliKatman> & { gorsel: string; x?: number; y?: number; olcek?: number })[]).map((k, i) => ({
    ...k, kod: k.kod ?? (i === 0 ? 'ana' : `k${i}`), ad: k.ad || (i === 0 ? 'Ana görsel' : `Katman ${i + 1}`), gorsel: k.gorsel,
    donusum: donusumGecerli(k.donusum) ? k.donusum : olcektenDonusum(k.x ?? 0, k.y ?? 0, k.olcek ?? 1),
  }));
}
const medyaBoyu = (e: EvrenVt, gorsel: string) => {
  const m = e.db.selectObject('SELECT en, boy FROM medya WHERE ad=?', [gorsel]);
  return m ? { en: Number(m.en), boy: Number(m.boy) } : null;
};

export function harita(b: HaritaBaglami, kod: string, bakis: string | null = null, anIfade: string | null = null): HaritaAyrintisi {
  const e = b.e;
  const h = haritaOku(e, kod);
  const bk = bakisHazirla(e, bakis);
  const r = e.db.selectObject('SELECT katmanlar FROM haritalar WHERE kod=?', [kod])!;
  const sakli = katmanlarOku(r.katmanlar as string);
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
  // Hizalamada hatası büyük kontrol noktasının çevresi yeniden çizilmiş olabilir: oradaki işaretler gözden geçirilir (§8.5).
  const uzayBoyu = Math.max(h.en, h.boy);
  const katmanlar: HaritaKatmani[] = sakli.map((k) => {
    const boy = medyaBoyu(e, k.gorsel) ?? { en: h.en, boy: h.boy };
    const hz = k.noktalar && k.noktalar.length >= 2 ? hizala(k.noktalar) : null;
    const kotu = hz ? buyukHatalar(hz, uzayBoyu) : [];
    const gozdenGecir = kotu.length ? isaretler.filter((i) => i.konum.x !== null && kotu.some((n) => {
      const [x, y] = k.noktalar![n].uzay;
      return Math.hypot(i.konum.x! - x, i.konum.y! - y) <= uzayBoyu * 0.08;
    })).map((i) => ({ kod: i.kod, ad: i.kayit.ad })) : [];
    return { kod: k.kod, ad: k.ad, gorsel: k.gorsel, donusum: k.donusum, en: boy.en, boy: boy.boy, silindi: !!k.silindi, onceki: k.onceki ?? null,
      noktalar: k.noktalar ?? [], hatalar: hz?.hatalar ?? [], gozdenGecir };
  });
  // Çizimler ve zaman kaydırıcısı (§8.2): seçilen tarihte geçerli olmayan bölge gösterilmez, belirsiz olan soluk gösterilir.
  const z = zamanSetiOku(e.db);
  const an = anIfade && anIfade.trim() ? tarihCoz(anIfade.trim().slice(0, 120), z) : null;
  const db: DurumBaglami = { e, yaz: () => { throw new Error('Okuma'); }, olayTarihi: b.olayTarihi };
  const oku = (ham: unknown) => sinirBilgisi(db, ham ? JSON.parse(ham as string) as SinirVerisi : null);
  const yillar: number[] = [];
  const cizimler: HaritaCizimi[] = e.db.selectObjects(`SELECT c.*, k.ad, k.tur, k.karar, k.gorunurluk FROM cizimler c JOIN kayitlar k ON k.kod=c.kayit
      WHERE c.harita=? AND c.silindi IS NULL AND k.silindi IS NULL ORDER BY c.olusturma`, [kod])
    .filter((x) => bk.gorur(x.gorunurluk))
    .map((x) => {
      const baslangic = oku(x.baslangic), bitis = oku(x.bitis);
      for (const s of [baslangic, bitis]) if (s?.tarih?.eksen?.enErken != null) yillar.push(eksenYili(s.tarih.eksen.enErken, z));
      return {
        ...(bk.kisa && bk.inanc(x.gorunurluk) ? { inanc: true } : {}),
        kod: x.kod as string, kayit: { kod: x.kayit as string, ad: x.ad as string, tur: x.tur as string }, karar: x.karar as string,
        bicim: x.bicim as HaritaCizimi['bicim'], kip: (x.kip as HaritaCizimi['kip']) ?? null, noktalar: JSON.parse(x.noktalar as string),
        baslangic, bitis,
        gecerli: an ? gecerlilik('aralik', baslangic ? baslangic.tarih : 'acik', bitis ? bitis.tarih : 'acik', an) : null,
      };
    });
  // "Burada ne oldu?": yeri bu haritada işaretli olay ve sahneler, seçilen tarihle örtüşüyorsa.
  const yerler = new Set(isaretler.map((i) => i.kayit.kod));
  if (h.yer) yerler.add(h.yer);
  const buTarihte = an?.eksen ? e.db.selectObjects(`SELECT DISTINCT o.kod, o.ad, o.tur, coalesce(o.tarih, s.tarih) tarih, y.kod yer, y.ad yer_ad FROM iliskiler i
      JOIN kayitlar o ON o.kod=i.a JOIN kayitlar y ON y.kod=i.b LEFT JOIN kayitlar s ON s.kod=o.sahne_olayi
      WHERE i.tur='sahne_yeri' AND i.silindi IS NULL AND i.karar<>'vazgecildi' AND o.silindi IS NULL AND o.karar<>'vazgecildi' AND y.silindi IS NULL`)
    .flatMap((r) => {
      const t = r.tarih ? JSON.parse(r.tarih as string) as EvrenTarihi : null;
      if (!yerler.has(r.yer as string) || !t?.eksen || karsilastir(t, an) !== 'belirsiz') return [];
      return [{ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string, tarih: t.ifade, yer: r.yer_ad as string }];
    }) : [];
  // "Yolculuğun hangi aşamasındaydılar?": seçilen tarihte süren aşamalar, uçlarından biri bu haritadaysa.
  if (an?.eksen) {
    for (const y of e.db.selectObjects(`SELECT y.kod, k.ad, k.tur FROM yolculuklar y JOIN kayitlar k ON k.kod=y.kod WHERE k.silindi IS NULL AND k.karar<>'vazgecildi'`)) {
      asamalarOku(e, y.kod as string).forEach((a) => {
        if (!a.cikis?.eksen || !(yerler.has(a.nereden ?? '') || yerler.has(a.nereye ?? ''))) return;
        const bas = a.cikis.eksen.enErken, bit = a.varis?.eksen?.enGec ?? a.cikis.eksen.enGec;
        if (bas === null || bit === null || an.eksen!.enGec! < bas || an.eksen!.enErken! > bit) return;
        const ad = (k: string | null) => (k ? (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string | undefined) ?? '?' : '?');
        buTarihte.push({ kod: y.kod as string, ad: y.ad as string, tur: y.tur as string, tarih: `${a.cikis.ifade}${a.varis ? ` – ${a.varis.ifade}` : ''}${a.durum === 'plan' ? ' (planlanan)' : ''}`,
          yer: `${ad(a.nereden)} → ${ad(a.nereye)}` });
      });
    }
  }
  const zamanAraligi = yillar.length ? { enKucuk: Math.min(...yillar), enBuyuk: Math.max(...yillar) } : null;
  return { kod, ad: h.ad, en: h.en, boy: h.boy, silindi: h.silindi, yer: h.yer ? { kod: h.yer, ad: yerAd ?? 'Silinmiş kayıt' } : null, katmanlar, isaretler, ustHaritalar, bakis: bk.kisa,
    cizimler, an: an ? { ifade: an.ifade, gecerli: !!an.eksen } : null, zamanAraligi, buTarihte };
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
    cizimler: e.db.selectObjects(`SELECT c.kod, c.bicim, c.kip, h.kod harita, h.ad FROM cizimler c JOIN haritalar h ON h.kod=c.harita
        WHERE c.kayit=? AND c.silindi IS NULL AND h.silindi IS NULL ORDER BY h.ad`, [kayit])
      .map((r) => ({ kod: r.kod as string, harita: r.harita as string, haritaAd: r.ad as string, bicim: r.bicim as 'bolge' | 'yol', kip: (r.kip as 'denetim' | 'iddia') ?? null })),
  };
}

// ---------- Katmanlar ve hizalama (§8.1, §8.5) ----------
function katmanBul(e: EvrenVt, harita: string, katman: string) {
  const h = haritaOku(e, harita);
  if (h.silindi) throw new Error('Bu harita kaldırılmış.');
  const l = katmanlarOku(e.db.selectValue('SELECT katmanlar FROM haritalar WHERE kod=?', [harita]) as string);
  const k = l.find((x) => x.kod === katman);
  if (!k) throw new Error('Katman bulunamadı.');
  return { h, l, k };
}

/** Yeni katman haritanın genişliğine oturtulur; sonra hizalanır. */
export function katmanEkle(b: HaritaBaglami, harita: string, a: { ad: string; gorsel: string }, girdiler: IslemGirdisi[] = []) {
  const h = haritaOku(b.e, harita);
  if (h.silindi) throw new Error('Bu harita kaldırılmış.');
  const yeni = girdiler.find((g) => g.tur === 'medya_ekle' && g.veri.ad === a.gorsel)?.veri;
  const en = Number(medyaBoyu(b.e, a.gorsel)?.en ?? yeni?.en);
  if (!(en > 0)) throw new Error('Görselin boyutu okunamadı.');
  const kod = yeniKod();
  const s = h.en / en;
  b.yaz([...girdiler, { tur: 'harita_katman_ekle', veri: { harita, haritaAd: h.ad, katman: { kod, ad: temizAd(a.ad), gorsel: a.gorsel, donusum: [s, 0, 0, s, 0, 0] } } }], h.yer ? [h.yer] : []);
  return { kod };
}

/** Katmanın görseli değişince (yeniden çizim, kırpma) yeni görsel eskisinin kapladığı alana oturtulur; işaretler yerinde kalır. */
export function katmanGorseli(b: HaritaBaglami, harita: string, katman: string, gorsel: string, girdiler: IslemGirdisi[] = []) {
  const { h, k } = katmanBul(b.e, harita, katman);
  const eski = medyaBoyu(b.e, k.gorsel) ?? { en: h.en, boy: h.boy };
  const yeni = medyaBoyu(b.e, gorsel) ?? (() => { const v = girdiler.find((g) => g.tur === 'medya_ekle' && g.veri.ad === gorsel)?.veri; return v ? { en: Number(v.en), boy: Number(v.boy) } : null; })();
  if (!yeni || !(yeni.en > 0 && yeni.boy > 0)) throw new Error('Görselin boyutu okunamadı.');
  const sx = eski.en / yeni.en, sy = eski.boy / yeni.boy, d = k.donusum;
  const donusum: Donusum = [d[0] * sx, d[1] * sx, d[2] * sy, d[3] * sy, d[4], d[5]];
  b.yaz([...girdiler, { tur: 'harita_katman', veri: { harita, haritaAd: h.ad, katman, katmanAd: k.ad, alan: 'gorsel', deger: { gorsel, donusum } } }], h.yer ? [h.yer] : []);
}

export function katmanDegistir(b: HaritaBaglami, harita: string, katman: string, alan: 'ad' | 'silindi', deger: unknown) {
  const { h, l, k } = katmanBul(b.e, harita, katman);
  let v: unknown;
  if (alan === 'ad') { v = temizAd(deger); if (v === k.ad) return; }
  else if (alan === 'silindi') {
    v = !!deger;
    if (v === !!k.silindi) return;
    if (v && l.filter((x) => !x.silindi).length <= 1) throw new Error('Haritanın en az bir görseli kalmalı.');
  } else throw new Error('Geçersiz alan.');
  b.yaz([{ tur: 'harita_katman', veri: { harita, haritaAd: h.ad, katman, katmanAd: k.ad, alan, deger: v } }], h.yer ? [h.yer] : []);
}

/** Kontrol noktası çiftleriyle oturtma; `donusum` verilirse (önceki oturtmaya dönüş) noktasız yazılır. */
export function katmanHizala(b: HaritaBaglami, harita: string, katman: string, noktalar: KontrolCifti[] | null, donusum: Donusum | null = null) {
  const { h, k } = katmanBul(b.e, harita, katman);
  let deger: { donusum: Donusum; noktalar?: KontrolCifti[] };
  if (noktalar) {
    const temiz = noktalar.slice(0, 50).map((n) => ({ gorsel: [Number(n.gorsel[0]), Number(n.gorsel[1])] as [number, number], uzay: [Number(n.uzay[0]), Number(n.uzay[1])] as [number, number] }));
    if (temiz.some((n) => ![...n.gorsel, ...n.uzay].every(Number.isFinite))) throw new Error('Noktalardan biri geçersiz.');
    const x = hizala(temiz);
    if (!x) throw new Error('Bu noktalarla oturtma yapılamıyor. En az iki ayrı nokta çifti gerekir; üç çiftte noktalar aynı doğru üzerinde olmamalı.');
    deger = { donusum: x.donusum, noktalar: temiz };
  } else {
    if (!donusumGecerli(donusum)) throw new Error('Geçersiz oturtma.');
    deger = { donusum };
  }
  b.yaz([{ tur: 'harita_katman', veri: { harita, haritaAd: h.ad, katman, katmanAd: k.ad, alan: 'donusum', deger } }], h.yer ? [h.yer] : []);
}

// ---------- Bölgeler ve yol çizgileri (§8.2) ----------
const durumBaglami = (b: HaritaBaglami): DurumBaglami => ({ e: b.e, yaz: b.yaz, olayTarihi: b.olayTarihi });

function cizimOku(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT c.*, h.ad harita_ad FROM cizimler c JOIN haritalar h ON h.kod=c.harita WHERE c.kod=?', [kod]) : undefined;
  if (!r) throw new Error('Çizim bulunamadı.');
  return r;
}
const noktalarTemiz = (n: unknown, bicim: string) => {
  if (!Array.isArray(n)) throw new Error('Noktalar geçersiz.');
  const l = n.slice(0, 500).map((p) => [Number((p as number[])[0]), Number((p as number[])[1])] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (l.length < (bicim === 'bolge' ? 3 : 2)) throw new Error(bicim === 'bolge' ? 'Bir bölge için en az üç nokta gerekir.' : 'Bir yol için en az iki nokta gerekir.');
  return l;
};

export function cizimEkle(b: HaritaBaglami, a: { harita: string; kayit: string; bicim: 'bolge' | 'yol'; kip?: 'denetim' | 'iddia' | null; noktalar: [number, number][];
  baslangic?: SinirGirdisi | null; bitis?: SinirGirdisi | null }) {
  const h = haritaOku(b.e, a.harita);
  if (h.silindi) throw new Error('Bu harita kaldırılmış.');
  if (a.bicim !== 'bolge' && a.bicim !== 'yol') throw new Error('Geçersiz çizim.');
  kayitVar(b.e, a.kayit);
  const d = durumBaglami(b);
  const kod = yeniKod();
  b.yaz([{ tur: 'cizim_ekle', veri: { kod, harita: a.harita, haritaAd: h.ad, kayit: a.kayit, bicim: a.bicim, kip: a.bicim === 'bolge' ? (a.kip === 'iddia' ? 'iddia' : 'denetim') : null,
    noktalar: noktalarTemiz(a.noktalar, a.bicim), baslangic: sinirCoz(d, a.baslangic), bitis: sinirCoz(d, a.bitis) } }], [a.kayit]);
  return { kod };
}

export function cizimDegistir(b: HaritaBaglami, kod: string, alan: 'noktalar' | 'kayit' | 'kip' | 'baslangic' | 'bitis', deger: unknown) {
  const r = cizimOku(b.e, kod);
  let v: unknown;
  if (alan === 'noktalar') v = noktalarTemiz(deger, r.bicim as string);
  else if (alan === 'kayit') { kayitVar(b.e, deger); v = deger; }
  else if (alan === 'kip') { if (r.bicim !== 'bolge' || (deger !== 'denetim' && deger !== 'iddia')) throw new Error('Geçersiz bölge türü.'); v = deger; }
  else if (alan === 'baslangic' || alan === 'bitis') v = sinirCoz(durumBaglami(b), deger as SinirGirdisi | null);
  else throw new Error('Geçersiz alan.');
  const ham = r[alan];
  const onceki = alan === 'baslangic' || alan === 'bitis' || alan === 'noktalar' ? (ham ? JSON.parse(ham as string) : null) : ham ?? null;
  if (JSON.stringify(onceki) === JSON.stringify(v)) return;
  b.yaz([{ tur: 'cizim_degistir', veri: { kod, alan, deger: v, kayit: r.kayit, bicim: r.bicim, haritaAd: r.harita_ad } }], [r.kayit as string, ...(alan === 'kayit' ? [v as string] : [])]);
}

export function cizimSil(b: HaritaBaglami, kod: string, geriYukle: boolean) {
  const r = cizimOku(b.e, kod);
  b.yaz([{ tur: geriYukle ? 'cizim_geri_yukle' : 'cizim_sil', veri: { kod, kayit: r.kayit, bicim: r.bicim, haritaAd: r.harita_ad } }], [r.kayit as string]);
}

/** Bu görsel bu kayıtta zaten işaretleme yüzeyi olarak açılmış mı? */
export function gorselHaritasi(e: EvrenVt, yer: string, gorsel: string): string | null {
  for (const r of e.db.selectObjects('SELECT kod, katmanlar FROM haritalar WHERE yer=? AND silindi IS NULL', [yer])) {
    if ((JSON.parse(r.katmanlar as string) as { gorsel: string }[]).some((k) => k.gorsel === gorsel)) return r.kod as string;
  }
  return null;
}
