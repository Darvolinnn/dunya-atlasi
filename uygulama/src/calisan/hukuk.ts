// Hukuk ve statü kesişimi (§15-11, §4.3). Kural "koşul → yasak / hak / yükümlülük → yaptırım" olarak yazılır; fiilî
// uygulama ayrıca yazılır. Bir kişi bir yere girince ona uygulanabilecek kurallar listelenir. Koşullar yalnızca
// kayıtlı ilişkilerden okunur; ilişki kayıtlı değilse "değil" denmez, "kayıtlı değil" denir (§2.2 kural 4). Çatışan
// yetkiler yan yana kalır; program birini doğru saymaz. Konu, yaptırım ve notlar serbest metindir, anlamı çıkarılmaz.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { karsilastir, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { katla } from '../alan/turkce';
import type { HukukKosulu, HukukKurali, HukukTanimGirdisi, HukukTanimi, KisaKayit, UygulananKural, UygulananKurallar } from '../veri/api';
import { formulDegerlendir, FormulHatasi, Hesaplanamadi } from '../alan/formul';
import type { EvrenVt } from './evren-vt';
import { formulCoz, formulGoster, formulOrtami } from './formul-ortami';
import { yonlendir, zamanSetiOku } from './izdusum';

export interface HukukBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

export const HUKUK_SAHIPLERI = ['siyasi', 'kultur', 'inanc', 'topluluk', 'sehir', 'mekan', 'makam'];
const YER_TURLERI = ['mekan', 'sehir'];
export const KOSUL_ILISKILERI: { kod: string; ad: string }[] = [
  { kod: 'uye', ad: 'üyesi' }, { kod: 'kulturu', ad: 'kültüründen' }, { kod: 'turu', ad: 'türünden' },
  { kod: 'yurutur', ad: 'makamını yürüten' }, { kod: 'hizmet', ad: 'hizmetinde' }, { kod: 'yasar', ad: 'orada yaşayan' },
];
const TURLER = ['yasak', 'hak', 'yukumluluk'] as const;
const FIILI = ['uygulaniyor', 'gevsek', 'uygulanmiyor'] as const;
const DERINLIK = 10;
const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;

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
const sade = (s: string) => s.replace(/\s+/g, ' ').trim();
const metin = (s: unknown, n: number, bos = true) => {
  const x = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!x && !bos) throw new Error('Boş olamaz.');
  if (x.length > n) throw new Error('Metin çok uzun.');
  return x;
};

export function kuralOku(e: EvrenVt, r: Record<string, unknown>): HukukKurali {
  const t = JSON.parse(r.tanim as string) as HukukTanimi;
  return {
    kod: r.kod as string, sahip: kisa(e, r.sahip as string), tanim: t,
    yer: t.yer ? kisa(e, t.yer) : null,
    kimlere: t.kimlere.map((k) => ({ ...k, hedefKayit: kisa(e, k.hedef) })),
    formulYazisi: t.formul ? formulGoster(e, t.formul) : null,
  };
}
export function kuralBul(e: EvrenVt, kod: unknown, silinmis = false): HukukKurali {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject(`SELECT * FROM hukuk_kurallari WHERE kod=? ${silinmis ? '' : 'AND silindi IS NULL'}`, [kod]) : undefined;
  if (!r) throw new Error('Hukuk kuralı bulunamadı.');
  return kuralOku(e, r);
}

export function hukukKurallari(e: EvrenVt, sahip?: string): HukukKurali[] {
  return e.db.selectObjects(`SELECT h.* FROM hukuk_kurallari h JOIN kayitlar k ON k.kod=h.sahip WHERE h.silindi IS NULL AND k.silindi IS NULL
    ${sahip ? 'AND h.sahip=?' : ''} ORDER BY k.ad, h.olusturma`, sahip ? [sahip] : []).map((r) => kuralOku(e, r));
}

const BOS_TANIM = (ad: string): HukukTanimi => ({ ad, tur: 'yasak', konu: '', kimlere: [], yer: null, yaptirim: '', fiili: null, fiiliNot: '', baslangic: null, bitis: null });

export function hukukKuraliOlustur(b: HukukBaglami, sahip: string, ad: string) {
  if (!HUKUK_SAHIPLERI.includes(kayitTuru(b.e, sahip))) throw new Error('Bu türdeki kayda hukuk kuralı eklenmez.');
  const kod = yeniKod();
  b.yaz([{ tur: 'hukuk_kurali_olustur', veri: { kod, sahip, tanim: BOS_TANIM(metin(ad, 120, false)) } }], [sahip]);
  return { kod };
}

/** Tarihler yazarın ifadesiyle gelir, burada çözülür. Koşul hedefi ve yer kayıt olmalıdır. */
export function hukukKuraliYaz(b: HukukBaglami, kod: string, g: HukukTanimGirdisi) {
  const k = kuralBul(b.e, kod);
  if (!TURLER.includes(g.tur as typeof TURLER[number])) throw new Error('Geçersiz kural türü.');
  if (g.fiili !== null && !FIILI.includes(g.fiili as typeof FIILI[number])) throw new Error('Geçersiz seçim.');
  if (!Array.isArray(g.kimlere) || g.kimlere.length > 8) throw new Error('Koşul listesi geçersiz.');
  const kimlere: HukukKosulu[] = g.kimlere.map((x) => {
    if (!KOSUL_ILISKILERI.some((i) => i.kod === x?.iliski)) throw new Error('Geçersiz koşul.');
    kayitTuru(b.e, x.hedef);
    return { iliski: x.iliski, hedef: x.hedef, degil: !!x.degil };
  });
  // Formül yazı olarak gelir; gelmezse (ya da saklanan biçimiyle geri gelirse) kuralın formülü değişmez. Böylece
  // formülü bozulmuş (kaydı silinmiş) ya da aynı adlı kayıtlara değen bir kuralın öbür bölümleri de kaydedilebilir.
  let formul = k.tanim.formul ?? null;
  const ayni = typeof g.formul === 'string' && !!k.tanim.formul && sade(g.formul) === sade(formulGoster(b.e, k.tanim.formul));
  if (!ayni && (typeof g.formul === 'string' || g.formul === null)) try { formul = formulCoz(b.e, g.formul); } catch (x) {
    if (x instanceof FormulHatasi) throw new Error(`Formül okunamadı: ${x.message}`);
    throw x;
  }
  if (formul && kimlere.length) throw new Error('Koşul listesiyle formül birlikte kullanılamaz; birini boşaltın.');
  if (g.yer !== null && !YER_TURLERI.includes(kayitTuru(b.e, g.yer))) throw new Error('Kuralın geçtiği yer bir mekân ya da şehir olmalı.');
  const z = zamanSetiOku(b.e.db);
  const tarih = (s: string, ad: string) => {
    const x = metin(s, 80);
    if (!x) return null;
    const t = tarihCoz(x, z);
    if (!t?.eksen) throw new Error(`${ad} okunamadı.`);
    return t;
  };
  const tanim: HukukTanimi = {
    ad: metin(g.ad, 120, false), tur: g.tur, konu: metin(g.konu, 200), kimlere, yer: g.yer, yaptirim: metin(g.yaptirim, 300),
    fiili: g.fiili, fiiliNot: metin(g.fiiliNot, 300), baslangic: tarih(g.baslangic, 'Başlangıç'), bitis: tarih(g.bitis, 'Bitiş'),
  };
  if (formul) tanim.formul = formul;
  if (JSON.stringify(tanim) === JSON.stringify(k.tanim)) return;
  b.yaz([{ tur: 'hukuk_kurali_yaz', veri: { kod, tanim, sahip: k.sahip.kod } }], [k.sahip.kod]);
}

export function hukukKuraliSil(b: HukukBaglami, kod: string, geriYukle: boolean) {
  const k = kuralBul(b.e, kod, true);
  b.yaz([{ tur: geriYukle ? 'hukuk_kurali_geri_yukle' : 'hukuk_kurali_sil', veri: { kod, ad: k.tanim.ad, sahip: k.sahip.kod } }], [k.sahip.kod]);
}

// ---------- Hesap ----------

const ustler = (e: EvrenVt, kod: string, tur: string) => e.db.selectObjects(`SELECT i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.b
  WHERE i.a=? AND i.tur=? AND ${ETKIN} AND k.silindi IS NULL`, [kod, tur]).map((r) => r.b as string);

/** Yer ve onu kapsayan yerler (en yakından uzağa) ile bu yerlerin bağlı olduğu yönetimler ve onların metbuları. */
function yerZinciri(e: EvrenVt, yer: string) {
  const yerler: string[] = [yer];
  for (let n = 0; n < DERINLIK; n++) {
    const ust = yerler.flatMap((y) => ustler(e, y, 'parca')).filter((u) => !yerler.includes(u));
    if (!ust.length) break;
    yerler.push(...ust);
  }
  const yonetimler: string[] = [];
  let duzey = yerler.flatMap((y) => ustler(e, y, 'bagli'));
  for (let n = 0; n < DERINLIK && duzey.length; n++) {
    duzey = duzey.filter((y, i) => !yonetimler.includes(y) && duzey.indexOf(y) === i);
    yonetimler.push(...duzey);
    duzey = duzey.flatMap((y) => ustler(e, y, 'bagli'));
  }
  return { yerler, yonetimler };
}

/** Bir kişinin bir yerdeki (ve isteğe bağlı tarihteki) durumu: kuralların değerlendirildiği bağlam. */
export interface KuralBaglami { e: EvrenVt; kisi: string; yer: string; yerler: string[]; yonetimler: string[]; tarih: EvrenTarihi | null }

export function kuralBaglami(e: EvrenVt, kisi: string, yer: string, tarihIfade: string | null): KuralBaglami {
  kayitTuru(e, kisi);
  if (!YER_TURLERI.includes(kayitTuru(e, yer))) throw new Error('Bir mekân ya da şehir seçin.');
  const tarih = tarihIfade?.trim() ? tarihCoz(tarihIfade, zamanSetiOku(e.db)) : null;
  if (tarihIfade?.trim() && !tarih?.eksen) throw new Error('Tarih okunamadı.');
  return { e, kisi, yer, ...yerZinciri(e, yer), tarih: tarih as EvrenTarihi | null };
}

/** Tek bir kuralın bu bağlamda uygulanıp uygulanmadığı; uygulanmıyorsa nedeni (kural atölyesi bunu gösterir, F16). */
export function kuralDegerlendir(c: KuralBaglami, k: HukukKurali): { uygulanan: UygulananKural | null; neden: string } {
  const { e, kisi, yer, yerler, yonetimler, tarih } = c;
  const iliskisi = (iliski: string, hedef: string) => e.db.selectValue(`SELECT 1 FROM iliskiler i WHERE i.a=? AND i.b=? AND i.tur=? AND ${ETKIN}`, [kisi, yonlendir(e.db, hedef), iliski]) !== undefined;
  const sahipYer = YER_TURLERI.includes(k.sahip.tur);
  // Kural nerede geçer: açık yer yazıldıysa orada; yoksa sahibi bir yerse orada, bir yönetimse ona bağlı yerlerde;
  // kültür, inanç, topluluk ve makam kuralları yer yazılmadıysa üyelerine her yerde uygulanır.
  let nedenYer: string;
  if (k.yer) {
    if (!yerler.includes(k.yer.kod)) return { uygulanan: null, neden: `Kural yalnızca “${k.yer.ad}” içinde geçer.` };
    nedenYer = k.yer.kod === yer ? 'bu yerde geçer' : `“${k.yer.ad}” içinde geçer`;
  } else if (sahipYer) {
    if (!yerler.includes(k.sahip.kod)) return { uygulanan: null, neden: `Kural yalnızca “${k.sahip.ad}” içinde geçer.` };
    nedenYer = k.sahip.kod === yer ? 'bu yerin kuralı' : `“${k.sahip.ad}” içinde`;
  } else if (k.sahip.tur === 'siyasi') {
    if (!yonetimler.includes(k.sahip.kod)) return { uygulanan: null, neden: `Bu yer “${k.sahip.ad}” yönetimine bağlı kayıtlı değil.` };
    nedenYer = `bu yer “${k.sahip.ad}” yönetimine bağlı`;
  } else nedenYer = 'yer sınırı yazılmamış; kişiyle birlikte gider';

  const kosullar = k.kimlere.map((x) => {
    const var_ = iliskisi(x.iliski, x.hedef);
    const ad = `${x.degil ? 'değil: ' : ''}“${x.hedefKayit.ad}” ${KOSUL_ILISKILERI.find((y) => y.kod === x.iliski)!.ad}`;
    return { ad, durum: (x.degil ? (var_ ? 'tutmuyor' : 'kayitsiz') : (var_ ? 'tutuyor' : 'kayitsiz')) as 'tutuyor' | 'tutmuyor' | 'kayitsiz' };
  });
  const tutmayan = kosullar.find((x) => x.durum === 'tutmuyor');
  if (tutmayan) return { uygulanan: null, neden: `Koşul tutmuyor: ${tutmayan.ad}.` };
  // Formül (TK8): evet → uygulanır; hayır → uygulanmaz; belirsiz → bilgi eksik; bozulmuşsa hesaplanamadı.
  let formulNedenleri: string[] | undefined, hesaplanamadi: string | undefined;
  if (k.tanim.formul) {
    try {
      const f = formulDegerlendir(k.tanim.formul, formulOrtami(e, kisi, tarih));
      if (f.sonuc === 'hayir') return { uygulanan: null, neden: 'Formül bu kişi için tutmuyor.' };
      if (f.sonuc === 'belirsiz') formulNedenleri = f.nedenler;
    } catch (x) {
      if (!(x instanceof Hesaplanamadi)) throw x;
      hesaplanamadi = `Formül hesaplanamadı: ${x.message}`;
    }
  }
  let zaman: UygulananKural['zaman'] = 'gecerli';
  if (k.tanim.baslangic || k.tanim.bitis) {
    if (!tarih) zaman = 'tarihsiz';
    else if ((k.tanim.baslangic && karsilastir(tarih, k.tanim.baslangic) === 'once') || (k.tanim.bitis && karsilastir(tarih, k.tanim.bitis) === 'sonra')) return { uygulanan: null, neden: 'Tarih, kuralın geçerlilik aralığının dışında.' };
    else if ((k.tanim.baslangic && karsilastir(tarih, k.tanim.baslangic) === 'belirsiz') || (k.tanim.bitis && karsilastir(tarih, k.tanim.bitis) === 'belirsiz')) zaman = 'belirsiz';
  }
  const durum = hesaplanamadi ? 'hesaplanamadi' : kosullar.every((x) => x.durum === 'tutuyor') && !formulNedenleri ? 'uygulanir' : 'kosul_kayitsiz';
  const u: UygulananKural = { kural: k, nedenYer, kosullar, durum, zaman };
  if (formulNedenleri) u.formulNedenleri = formulNedenleri;
  if (hesaplanamadi) u.hesaplanamadi = hesaplanamadi;
  return { uygulanan: u, neden: nedenYer };
}

/** Kişi bir yere girince ona uygulanabilecek kayıtlı kurallar. Tarih verilirse geçerlilik aralığı da denetlenir. */
export function uygulananKurallar(e: EvrenVt, kisi: string, yer: string, tarihIfade: string | null): UygulananKurallar {
  const c = kuralBaglami(e, kisi, yer, tarihIfade);
  const { yerler, yonetimler, tarih } = c;
  const sonuc: UygulananKural[] = [];
  for (const k of hukukKurallari(e)) {
    const u = kuralDegerlendir(c, k).uygulanan;
    if (u) sonuc.push(u);
  }
  // Aynı konuda biri yasaklarken öteki hak tanıyorsa: çatışan yetkiler. Konu yazının aynısı olmalıdır; anlam çıkarılmaz.
  const gruplar = new Map<string, UygulananKural[]>();
  for (const x of sonuc) if (x.kural.tanim.konu) gruplar.set(katla(x.kural.tanim.konu), [...(gruplar.get(katla(x.kural.tanim.konu)) ?? []), x]);
  const catismalar = [...gruplar.values()].filter((l) => l.some((x) => x.kural.tanim.tur === 'yasak') && l.some((x) => x.kural.tanim.tur === 'hak'))
    .map((l) => ({ konu: l[0].kural.tanim.konu, kurallar: l.map((x) => x.kural.kod) }));
  return { yer: kisa(e, yer), kisi: kisa(e, kisi), tarih, kurallar: sonuc, catismalar, yerler: yerler.map((y) => kisa(e, y)), yonetimler: yonetimler.map((y) => kisa(e, y)) };
}

/** Yazılan formülün okunup okunamadığı; okunduysa güncel adlarla yazısı, okunamadıysa hatanın yeri (yazarken). */
export function formulDenetle(e: EvrenVt, yazi: string): { yazi: string } | { hata: string; konum: number; uzunluk: number } {
  try {
    const f = formulCoz(e, yazi);
    return { yazi: f ? formulGoster(e, f) : '' };
  } catch (x) {
    if (x instanceof FormulHatasi) return { hata: x.message, konum: x.konum, uzunluk: x.uzunluk };
    throw x;
  }
}
