// Şablonlar, alan değerleri, soru kütüphanesi (§3.1, §6) ve açık meseleler ile gerekçe defteri (§4.6).
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { turGecerli } from '../alan/turler';
import { birimAdi, sayiCoz } from '../alan/nicelik';
import {
  CELISKI_NOTU, EVREN_SETLERI, MESELE_DURUMLARI, sablonGecerli, soruDurumuGecerli, soruSetiBul, varsayilanSablon,
  type Sablon, type SablonAlani, type Soru,
} from '../alan/sablon';
import type { EvrenSorulari, KayitSablonu, KisaKayit, MeseleListesi, NotSatiri, SablonBilgisi, SoruSatiri, KarakterYollari } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { zamanSetiOku } from './izdusum';

export interface SablonBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  kayitGirdileri(kod: string, v: { ad: string; tur: string; karar: string; ozet: string }): IslemGirdisi[];
}

export function sablonOku(e: EvrenVt, tur: string): Sablon {
  const ham = e.db.selectValue('SELECT veri FROM sablonlar WHERE tur=?', [tur]) as string | undefined;
  return ham ? JSON.parse(ham) : varsayilanSablon(tur);
}

export function sablonBilgisi(e: EvrenVt, tur: string): SablonBilgisi {
  if (!turGecerli(tur)) throw new Error('Bilinmeyen tür.');
  const kullanim: Record<string, number> = {};
  for (const r of e.db.selectObjects(
    `SELECT d.alan, count(*) n FROM alan_degerleri d JOIN kayitlar k ON k.kod=d.kayit WHERE k.tur=? AND k.silindi IS NULL GROUP BY d.alan`, [tur])) {
    kullanim[r.alan as string] = Number(r.n);
  }
  const degisti = e.db.selectValue('SELECT 1 FROM sablonlar WHERE tur=?', [tur]) !== undefined;
  return { sablon: sablonOku(e, tur), varsayilan: !degisti, kullanim, varsayilanSablon: varsayilanSablon(tur) };
}

export function sablonYaz(b: SablonBaglami, tur: string, sablon: Sablon | null) {
  if (!turGecerli(tur)) throw new Error('Bilinmeyen tür.');
  if (sablon !== null) {
    // Adlar ve metinler kırpılır; biçim denetimi sonra yapılır.
    sablon = {
      alanlar: sablon.alanlar.map((a) => ({
        kod: a.kod, ad: String(a.ad ?? '').trim(), tur: a.tur, ...(a.ipucu?.trim() ? { ipucu: a.ipucu.trim() } : {}),
        ...(a.tur === 'secim' ? { secenekler: (a.secenekler ?? []).map((x) => ({ kod: x.kod, ad: String(x.ad ?? '').trim() })) } : {}),
        ...(a.tur === 'sayi' ? { nicelik: a.nicelik, birim: birimAdi(String(a.birim ?? '')), hassasiyet: Number(a.hassasiyet ?? 0) } : {}),
        ...(a.varsayilan ? { varsayilan: a.varsayilan } : {}),
        ...(a.sabit ? { sabit: true } : {}),
      })),
      sorular: sablon.sorular.map((q) => ({ kod: q.kod, metin: String(q.metin ?? '').trim(), ...(q.ipucu?.trim() ? { ipucu: q.ipucu.trim() } : {}) })),
    };
    // Sabit alanın türü ve sabitliği yazardan gelmez; varsayılandan alınır.
    const sabitler = new Map(varsayilanSablon(tur).alanlar.filter((a) => a.sabit).map((a) => [a.kod, a]));
    sablon.alanlar = sablon.alanlar.map((a) => (sabitler.has(a.kod) ? { ...sabitler.get(a.kod)!, ad: a.ad || sabitler.get(a.kod)!.ad, ...(a.ipucu ? { ipucu: a.ipucu } : {}) } : { ...a, sabit: undefined }))
      .map((a) => JSON.parse(JSON.stringify(a)));
    if (!sablonGecerli(sablon, tur)) throw new Error('Şablonda boş ya da tekrarlanan bir alan, seçenek veya soru var.');
  }
  const onceki = b.e.db.selectValue('SELECT veri FROM sablonlar WHERE tur=?', [tur]) as string | undefined;
  if ((onceki ?? null) === (sablon ? JSON.stringify(sablon) : null)) return;
  b.yaz([{ tur: 'sablon_yaz', veri: { tur, sablon } }], []);
}

const kisa = (e: EvrenVt, kod: string | null): KisaKayit | null => {
  if (!kod) return null;
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]);
  return r ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : null;
};

function cevaplar(e: EvrenVt, kayit: string) {
  return new Map(e.db.selectObjects('SELECT * FROM soru_cevaplari WHERE kayit=?', [kayit]).map((r) => [r.soru as string, r]));
}
const cevapYaz = (e: EvrenVt, r: Record<string, unknown> | undefined) =>
  r ? { durum: r.durum as never, cevap: r.cevap as string, kayitla: kisa(e, (r.kayitla as string) ?? null) } : null;

/**
 * Karakterlerin kitaplardaki yolu (K27, Model §8): kapsam bir eserse yalnız o eser, bir seriyse serinin eserleri
 * önerilen okuma sırasıyla. Her karakter × eser hücresi bir `eser_odagi` ilişkisi ve onun sorularıdır; hücreler
 * birbirini değiştirmez. Karakterin evren kaydı tektir.
 */
export function karakterYollari(e: EvrenVt, kapsam: string): KarakterYollari {
  const tur = kayitTuru(e, kapsam);
  if (tur !== 'eser' && tur !== 'seri') throw new Error('Bir eser ya da seri seçin.');
  const eserler = (tur === 'eser'
    ? e.db.selectObjects('SELECT kod, ad FROM kayitlar WHERE kod=?', [kapsam])
    : e.db.selectObjects(`SELECT k.kod, k.ad FROM anlati a JOIN kayitlar k ON k.kod=a.kod WHERE a.ust=? AND k.tur='eser' AND k.silindi IS NULL ORDER BY a.konum, a.kod`, [kapsam])) as { kod: string; ad: string }[];
  const set = soruSetiBul('karakter_kitapta')!;
  const karakterler = new Map<string, KarakterYollari['karakterler'][number]>();
  for (const x of eserler) {
    for (const r of e.db.selectObjects(`SELECT i.kod iliski, k.kod, k.ad FROM iliskiler i JOIN kayitlar k ON k.kod=i.a
      WHERE i.tur='eser_odagi' AND i.b=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY i.olusturma, i.rowid`, [x.kod])) {
      const kod = r.kod as string;
      if (!karakterler.has(kod)) karakterler.set(kod, { kod, ad: r.ad as string, tur: 'karakter', hucreler: {} });
      const c = cevaplar(e, r.iliski as string);
      karakterler.get(kod)!.hucreler[x.kod] = {
        iliski: r.iliski as string,
        sorular: set.sorular.map((q) => ({ ...q, set: null, eski: false, cevap: cevapYaz(e, c.get(q.kod)) })),
      };
    }
  }
  return { eserler, karakterler: [...karakterler.values()] };
}

function kayitTuru(e: EvrenVt, kod: string): string {
  const t = kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  return t;
}

/** Kaydın şablon alanları, değerleri ve soruları. Şablonda olmayan değerler ve cevaplar ayrıca döner, silinmez. */
export function kayitSablonu(e: EvrenVt, kod: string): KayitSablonu {
  const tur = kayitTuru(e, kod);
  const sablon = sablonOku(e, tur);
  const degerler: Record<string, unknown> = {};
  for (const r of e.db.selectObjects('SELECT alan, deger FROM alan_degerleri WHERE kayit=?', [kod])) degerler[r.alan as string] = JSON.parse(r.deger as string);
  const bilinen = new Set(sablon.alanlar.map((a) => a.kod));
  const eskiler = Object.entries(degerler).filter(([k]) => !bilinen.has(k)).map(([k, deger]) => ({ kod: k, deger }));
  const setler = e.db.selectObjects('SELECT soru_seti FROM kayit_soru_setleri WHERE kayit=?', [kod]).map((r) => r.soru_seti as string).filter((s) => soruSetiBul(s));
  const c = cevaplar(e, kod);
  const sorular: SoruSatiri[] = [];
  const goruldu = new Set<string>();
  const ekle = (q: { kod: string; metin: string; ipucu?: string }, set: string | null) => {
    if (goruldu.has(q.kod)) return;
    goruldu.add(q.kod);
    sorular.push({ ...q, set, cevap: cevapYaz(e, c.get(q.kod)), eski: false });
  };
  for (const q of sablon.sorular) ekle(q, null);
  for (const s of setler) for (const q of soruSetiBul(s)!.sorular) ekle(q, s);
  // Şablondan çıkmış ama cevaplanmış sorular kaybolmaz.
  for (const [soru, r] of c) if (!goruldu.has(soru)) sorular.push({ kod: soru, metin: (r.metin as string) || 'Şablondan çıkarılmış bir soru', set: null, cevap: cevapYaz(e, r), eski: true });
  return { tur, sablon, degerler, eskiler, setler, sorular };
}

/** Alan değerini türüne göre çözer; boş değer alanı boşaltır. */
function degerCoz(e: EvrenVt, a: SablonAlani, girdi: unknown): unknown {
  if (girdi === null || girdi === undefined || girdi === '') return null;
  switch (a.tur) {
    case 'metin': case 'uzun': {
      const s = String(girdi).replace(a.tur === 'metin' ? /\s+/g : /[ \t]+/g, ' ').trim();
      if (s.length > (a.tur === 'metin' ? 300 : 5000)) throw new Error('Metin çok uzun.');
      return s || null;
    }
    case 'tarih': return tarihCoz(String(girdi).slice(0, 120), zamanSetiOku(e.db));
    case 'secim':
      if (!a.secenekler?.some((x) => x.kod === girdi)) throw new Error('Geçersiz seçenek.');
      return girdi;
    case 'onay': return girdi === true ? true : null;
    case 'sayi': return sayiCoz(girdi, a.birim ?? '', a.hassasiyet ?? 0);
  }
}

export function kayitAlanYaz(b: SablonBaglami, kod: string, alan: string, girdi: unknown) {
  const tur = kayitTuru(b.e, kod);
  const a = sablonOku(b.e, tur).alanlar.find((x) => x.kod === alan);
  const ham = b.e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [kod, alan]) as string | undefined;
  if (!a) {
    // Şablonda olmayan alan yalnızca boşaltılabilir.
    if (girdi !== null && girdi !== '') throw new Error('Bu alan şablonda yok.');
    if (ham === undefined) return;
    b.yaz([{ tur: 'kayit_alan', veri: { kod, alan, ad: alan, deger: null, onceki: JSON.parse(ham) } }], [kod]);
    return;
  }
  const deger = degerCoz(b.e, a, girdi);
  const onceki = ham === undefined ? null : JSON.parse(ham);
  if (JSON.stringify(onceki) === JSON.stringify(deger)) return;
  b.yaz([{ tur: 'kayit_alan', veri: { kod, alan, ad: a.ad, deger, onceki } }], [kod]);
}

/** Alan değeri okunur (yaş hesabı ve özet için). */
export function alanDegeri<T = unknown>(e: EvrenVt, kod: string, alan: string): T | null {
  const ham = e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [kod, alan]) as string | undefined;
  return ham === undefined ? null : JSON.parse(ham);
}
export const tarihDegeri = (e: EvrenVt, kod: string, alan: string) => alanDegeri<EvrenTarihi>(e, kod, alan);

/** Sorusu olan ilişki (K27): karakterin bir eserdeki yolu. */
const odakIliskisiMi = (e: EvrenVt, kod: string) => kodGecerliMi(kod)
  && e.db.selectValue("SELECT 1 FROM iliskiler WHERE kod=? AND tur='eser_odagi' AND silindi IS NULL", [kod]) !== undefined;

function soruTanimi(e: EvrenVt, kod: string, soru: string): Soru {
  let q: Soru | undefined;
  if (odakIliskisiMi(e, kod)) q = soruSetiBul('karakter_kitapta')!.sorular.find((x) => x.kod === soru);
  else if (kod === 'evren') for (const s of EVREN_SETLERI) { q ??= soruSetiBul(s)!.sorular.find((x) => x.kod === soru); }
  else q = kayitSablonu(e, kod).sorular.find((x) => x.kod === soru);
  if (!q) throw new Error('Bilinmeyen soru.');
  return q;
}
const soruMetni = (e: EvrenVt, kod: string, soru: string) => soruTanimi(e, kod, soru).metin;

/** Cevabın yanına bir sahne ya da olay bağlar (yalnız buna izin veren sorularda); yazılı cevap korunur. */
export function soruBagla(b: SablonBaglami, kod: string, soru: string, hedef: string | null) {
  const q = soruTanimi(b.e, kod, soru);
  if (!q.bagla) throw new Error('Bu soruya kayıt bağlanmaz.');
  if (hedef !== null && !q.bagla.includes(kayitTuru(b.e, hedef))) throw new Error('Bu soruya yalnız bir sahne ya da olay bağlanabilir.');
  const r = b.e.db.selectObject('SELECT durum, cevap FROM soru_cevaplari WHERE kayit=? AND soru=?', [kod, soru]);
  const cevap = (r?.durum === 'cevaplandi' ? r.cevap as string : '') ?? '';
  const durum = hedef || cevap ? 'cevaplandi' : null;
  b.yaz([{ tur: 'soru_cevapla', veri: { kod, soru, durum, cevap: durum ? cevap : '', metin: q.metin, ...(hedef ? { kayitla: hedef } : {}) } }], [kod]);
}

export function soruCevapla(b: SablonBaglami, kod: string, soru: string, durum: string | null, cevap = '', kayitla: string | null = null) {
  if (kod !== 'evren' && !odakIliskisiMi(b.e, kod)) kayitTuru(b.e, kod);
  if (durum !== null && !soruDurumuGecerli(durum)) throw new Error('Geçersiz soru durumu.');
  const metin = soruMetni(b.e, kod, soru);
  const temiz = String(cevap ?? '').replace(/[ \t]+/g, ' ').trim();
  if (temiz.length > 5000) throw new Error('Cevap çok uzun.');
  // Bağ alan sorularda yazılı cevabı değiştirmek bağlı sahneyi düşürmez.
  if (!kayitla && durum === 'cevaplandi' && soruTanimi(b.e, kod, soru).bagla) {
    kayitla = (b.e.db.selectValue('SELECT kayitla FROM soru_cevaplari WHERE kayit=? AND soru=?', [kod, soru]) as string | null | undefined) ?? null;
  }
  if (durum === 'cevaplandi' && !temiz && !kayitla) durum = null;
  b.yaz([{ tur: 'soru_cevapla', veri: { kod, soru, durum, cevap: durum ? temiz : '', metin, ...(kayitla ? { kayitla } : {}) } }], kod === 'evren' ? [] : [kod]);
}

/** "İnsanlar neye inanıyor?" → inanç kaydı: yeni kayıt, kayda bağ ve cevap tek işlem grubunda. */
export function soruKayitla(b: SablonBaglami, kod: string, soru: string, ad: string, tur: string) {
  if (!turGecerli(tur)) throw new Error('Bilinmeyen tür.');
  const temizAd = String(ad ?? '').replace(/\s+/g, ' ').trim();
  if (!temizAd) throw new Error('Ad boş olamaz.');
  if (odakIliskisiMi(b.e, kod)) throw new Error('Bu soru yeni bir kayıtla cevaplanamaz.');
  if (kod !== 'evren') kayitTuru(b.e, kod);
  const metin = soruMetni(b.e, kod, soru);
  const yeni = yeniKod();
  const girdiler: IslemGirdisi[] = [...b.kayitGirdileri(yeni, { ad: temizAd, tur, karar: 'fikir', ozet: '' })];
  if (kod !== 'evren') girdiler.push({ tur: 'iliski_ekle', veri: { kod: yeniKod(), tur: 'ilgili', a: kod, b: yeni, karar: 'kesin', aciklama: metin.slice(0, 500) } });
  girdiler.push({ tur: 'soru_cevapla', veri: { kod, soru, durum: 'cevaplandi', cevap: '', metin, kayitla: yeni } });
  b.yaz(girdiler, kod === 'evren' ? [yeni] : [kod, yeni]);
  return { kod: yeni };
}

export function kayitSoruSeti(b: SablonBaglami, kod: string, set: string, ekle: boolean) {
  kayitTuru(b.e, kod);
  if (!soruSetiBul(set) || EVREN_SETLERI.includes(set)) throw new Error('Bilinmeyen soru seti.');
  b.yaz([{ tur: 'kayit_soru_seti', veri: { kod, set, ekle } }], [kod]);
}

export function evrenSorulari(e: EvrenVt): EvrenSorulari {
  const c = cevaplar(e, 'evren');
  return EVREN_SETLERI.map((k) => {
    const s = soruSetiBul(k)!;
    return { kod: s.kod, ad: s.ad, sorular: s.sorular.map((q) => ({ ...q, set: s.kod, cevap: cevapYaz(e, c.get(q.kod)), eski: false })) };
  });
}

/** Açık meseleler ve gerekçe defteri; kod verilirse yalnızca o kayda bağlı olanlar. */
export function meseleler(e: EvrenVt, kod?: string): MeseleListesi {
  const bagli = (k: string, iliski: string) => e.db.selectObjects(
    `SELECT k.kod, k.ad, k.tur FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.tur=? AND i.a=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY i.olusturma`,
    [iliski, k]) as unknown as KisaKayit[];
  const satirlar = (tur: string, iliski: string) => e.db.selectObjects(
    `SELECT k.kod, k.ad, k.karar, k.duzenleme FROM kayitlar k WHERE k.tur=? AND k.silindi IS NULL
     ${kod ? 'AND k.kod IN (SELECT a FROM iliskiler WHERE tur=? AND b=? AND silindi IS NULL)' : ''} ORDER BY k.duzenleme DESC`,
    kod ? [tur, iliski, kod] : [tur]);
  const durumSirasi = new Map(MESELE_DURUMLARI.map((d, i) => [d.kod, i]));
  const ml = satirlar('acik_mesele', 'mesele_konusu').map((r) => ({
    kod: r.kod as string, ad: r.ad as string, karar: r.karar as string, duzenleme: Number(r.duzenleme),
    durum: (alanDegeri<string>(e, r.kod as string, 'durum') ?? 'dusunulecek'),
    onemli: alanDegeri<boolean>(e, r.kod as string, 'onemli') === true,
    bagli: bagli(r.kod as string, 'mesele_konusu'),
  })).sort((a, b) => (durumSirasi.get(a.durum) ?? 0) - (durumSirasi.get(b.durum) ?? 0) || Number(b.onemli) - Number(a.onemli) || b.duzenleme - a.duzenleme);
  const gl = satirlar('gerekce', 'gerekce_konusu').map((r) => ({
    kod: r.kod as string, ad: r.ad as string, karar: r.karar as string, duzenleme: Number(r.duzenleme),
    soru: alanDegeri<string>(e, r.kod as string, 'soru') ?? '', cozum: alanDegeri<string>(e, r.kod as string, 'cozum') ?? '',
    gerekce: alanDegeri<string>(e, r.kod as string, 'gerekce') ?? '',
    etkilenen: bagli(r.kod as string, 'gerekce_konusu'),
  }));
  const celiskiNotlari = kod ? [] : notPanosu(e).filter((n) => n.notTuru === CELISKI_NOTU && n.notDurumu !== 'kullanildi' && n.notDurumu !== 'arsiv');
  return { meseleler: ml, gerekceler: gl, celiskiNotlari };
}

/** Notlar, türü ve durumuyla (§4.6, K28); son değişen önce. */
export function notPanosu(e: EvrenVt): NotSatiri[] {
  return e.db.selectObjects(`SELECT kod, ad, ozet, duzenleme FROM kayitlar WHERE tur='not' AND silindi IS NULL ORDER BY duzenleme DESC`).map((r) => ({
    kod: r.kod as string, ad: r.ad as string, ozet: r.ozet as string, duzenleme: Number(r.duzenleme),
    notTuru: alanDegeri<string>(e, r.kod as string, 'not_turu'), notDurumu: alanDegeri<string>(e, r.kod as string, 'not_durumu') ?? 'fikir',
  }));
}

/** Yeni açık mesele ya da gerekçe kaydı; bir kayda bağlanacaksa ilişki aynı işlem grubunda kurulur. */
export function yazarKaydiEkle(b: SablonBaglami, tur: 'acik_mesele' | 'gerekce', ad: string, bagla: string | null, onemli = false) {
  if (tur !== 'acik_mesele' && tur !== 'gerekce') throw new Error('Geçersiz tür.');
  const temizAd = String(ad ?? '').replace(/\s+/g, ' ').trim();
  if (!temizAd) throw new Error('Boş olamaz.');
  if (temizAd.length > 300) throw new Error('Metin çok uzun.');
  if (bagla) kayitTuru(b.e, bagla);
  const kod = yeniKod();
  const girdiler: IslemGirdisi[] = [...b.kayitGirdileri(kod, { ad: temizAd, tur, karar: 'kesin', ozet: '' })];
  if (tur === 'acik_mesele') {
    girdiler.push({ tur: 'kayit_alan', veri: { kod, alan: 'durum', ad: 'Durum', deger: 'dusunulecek', onceki: null } });
    if (onemli) girdiler.push({ tur: 'kayit_alan', veri: { kod, alan: 'onemli', ad: 'Önemli', deger: true, onceki: null } });
  } else girdiler.push({ tur: 'kayit_alan', veri: { kod, alan: 'soru', ad: 'Soru', deger: temizAd, onceki: null } });
  if (bagla) girdiler.push({ tur: 'iliski_ekle', veri: { kod: yeniKod(), tur: tur === 'acik_mesele' ? 'mesele_konusu' : 'gerekce_konusu', a: kod, b: bagla, karar: 'kesin' } });
  b.yaz(girdiler, [kod, ...(bagla ? [bagla] : [])]);
  return { kod };
}

export const alanKarariGecerli = (alan: string) => /^f:[a-z0-9_.-]{1,40}$/.test(alan);
