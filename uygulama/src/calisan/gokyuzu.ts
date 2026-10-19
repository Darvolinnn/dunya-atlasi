// §15-7, birinci düzey. Kullanım sözleşmesi (§18.2):
// Soru: bu tarihte hangi evre ve mevsimler var; seçilen evreler hangi günlerde çakışır?
// En az veri: bir ayın adı, dönemi, gün hassasiyetinde başlangıç tarihi ve evresi.
// Eksik veri: tanım/tarih/eşleme eksikliği söylenir; bilinmeyen, yok sayılmaz.
// Okunanlar: gökyüzü tanımı, zaman seti ve bunların alan çatışmaları; yazılan: yalnızca tanım.
// Yorumlanmayanlar: tutulma, gece aydınlığı, iklim, fiziksel gelgit ve serbest yazının anlamı.
// Kabul: aynı gün dolunay olan iki ay bulunur; yıl tarihi tek bir güne indirgenmez.
// Tanım isteğe bağlıdır; yazar değiştirir, yeni hesaplar değişen tanımla geçmişi de yeniden hesaplar.
import { GUN_PARCA, tarihCoz, tarihAciklamasi, yilGunu, type EvrenTarihi, type ZamanSeti } from '../alan/tarih';
import { kodGecerliMi } from '../alan/kod';
import type { AyEvresi, GokyuzuTanimi, GokyuzuKosulu, GokyuzuSonucu, GokyuzuCakismalari, GokyuzuZarfi } from '../veri/api';
import type { EvrenVt } from './evren-vt';

export const EVRELER: { kod: AyEvresi; ad: string }[] = [
  { kod: 'yeni', ad: 'Yeni ay' }, { kod: 'buyuyen_hilal', ad: 'Büyüyen hilal' },
  { kod: 'ilk_dordun', ad: 'İlk dördün' }, { kod: 'buyuyen_siskin', ad: 'Büyüyen şişkin ay' },
  { kod: 'dolunay', ad: 'Dolunay' }, { kod: 'kuculen_siskin', ad: 'Küçülen şişkin ay' },
  { kod: 'son_dordun', ad: 'Son dördün' }, { kod: 'kuculen_hilal', ad: 'Küçülen hilal' },
];
export const SINIRLAR = 'Yalnızca takvim döngüleri hesaplanır. Ayların aynı evrede olması tutulma demek değildir; üç dolunay geceyi gündüze çevirmez. Gelgiti hesaplamak için kıyı ve derinlik bilgisi gerekir, burada yalnızca kıyı notu ve tekrar süresi saklanır. Yalnızca yılı bilinen bir tarih için gün uydurulmaz, o yıl içindeki olası evreler gösterilir. Bir hesapta en çok 100.000 gün incelenir. Çakışma araması en çok 50 gün gösterir.';
const mod = (a: number, b: number) => ((a % b) + b) % b;
const metin = (x: unknown, ad: string, sinir = 120) => {
  if (typeof x !== 'string' || !x.trim() || x.length > sinir) throw new Error(`${ad} yazın. En çok ${sinir} harf olabilir.`);
  return x.trim();
};
const evreMi = (x: unknown): x is AyEvresi => EVRELER.some((e) => e.kod === x);
function tarihOku(ifade: string, z: ZamanSeti): EvrenTarihi {
  const t = tarihCoz(metin(ifade, 'Tarihi'), z);
  if (!t?.eksen || t.eksen.enErken === null || t.eksen.enGec === null) throw new Error('Tarihin iki sınırı da takvimde belli olmalı.');
  if (![t.eksen.enErken, t.eksen.enGec].every(Number.isSafeInteger)) throw new Error('Tarih hesaplanabilecek aralığın dışında.');
  return t;
}
function gunler(t: EvrenTarihi): [number, number] {
  return [Math.floor(t.eksen!.enErken! / GUN_PARCA), Math.floor(t.eksen!.enGec! / GUN_PARCA)];
}
function baslangic(a: GokyuzuTanimi['aylar'][number], z: ZamanSeti): number {
  const t = tarihOku(a.baslangic, z), [b, s] = gunler(t);
  if (t.hassasiyet !== 'gun' || b !== s) throw new Error('Ayın başlangıcı için günü bilinen bir tarih yazın.');
  return b;
}

/** Hizmet sınırında doğrulanır; yalnızca bilinen alanlar işlem günlüğüne girer. */
export function tanimDogrula(x: unknown, z: ZamanSeti): GokyuzuTanimi {
  const t = x as GokyuzuTanimi | null;
  if (!t || !Array.isArray(t.aylar) || t.aylar.length < 1 || t.aylar.length > 32) throw new Error('Bir ile 32 arasında ay tanımlayın.');
  if (!Array.isArray(t.mevsimler) || t.mevsimler.length > 100 || !Array.isArray(t.gelgitler) || t.gelgitler.length > 100) throw new Error('En çok 100 mevsim ve 100 gelgit notu eklenebilir.');
  const aylar = t.aylar.map((a) => {
    if (!a || !kodGecerliMi(a.kod)) throw new Error('Ayı yeniden ekleyin.');
    if (!Number.isFinite(a.donem) || a.donem < 1) throw new Error('Ay dönemi 1 günden kısa olamaz.');
    if (!evreMi(a.evre)) throw new Error('Ayın başlangıç evresini seçin.');
    const ay = { kod: a.kod, ad: metin(a.ad, 'Ayın adını'), donem: a.donem, baslangic: metin(a.baslangic, 'Başlangıç tarihini'), evre: a.evre };
    baslangic(ay, z);
    return ay;
  });
  if (new Set(aylar.map((a) => a.kod)).size !== aylar.length) throw new Error('Aynı ay birden çok kez eklenemez.');
  const mevsimler = t.mevsimler.map((m) => {
    if (!m || !Number.isInteger(m.baslangicGunu) || m.baslangicGunu < 1 || m.baslangicGunu > yilGunu(z.ana)) throw new Error('Mevsimin başlangıç günü yılın içinde olmalı.');
    return { ad: metin(m.ad, 'Mevsimin adını'), baslangicGunu: m.baslangicGunu };
  });
  if (new Set(mevsimler.map((m) => m.baslangicGunu)).size !== mevsimler.length || new Set(mevsimler.map((m) => m.ad.toLocaleLowerCase('tr-TR'))).size !== mevsimler.length) throw new Error('Mevsim adları ve başlangıç günleri birbirinden farklı olmalı.');
  const gelgitler = t.gelgitler.map((g) => {
    if (!g || !kodGecerliMi(g.kiyi)) throw new Error('Gelgit notunun kıyısını seçin.');
    if (!Number.isFinite(g.saat) || g.saat <= 0) throw new Error('Gelgitin tekrar süresi sıfırdan büyük olmalı.');
    return { kiyi: g.kiyi, not: metin(g.not, 'Kıyı notunu', 2000), saat: g.saat };
  });
  return { aylar, mevsimler, gelgitler };
}
export function tanimOku(e: EvrenVt): GokyuzuTanimi | null {
  const s = e.db.selectValue("SELECT tanim FROM gokyuzu_tanimi WHERE kod='evren'") as string | undefined;
  return s ? JSON.parse(s) : null;
}
export const ilgiliKayitlar = (x: unknown): string[] => [...new Set((x as GokyuzuTanimi | null)?.gelgitler?.map((g) => g.kiyi) ?? [])];
export const tanimYazisi = (x: unknown): string => {
  const t = x as GokyuzuTanimi | null;
  return t ? `${t.aylar.map((a) => `${a.ad}: ${a.donem} gün, ${a.baslangic}, ${EVRELER.find((e) => e.kod === a.evre)?.ad}`).join('; ')}; ${t.mevsimler.map((m) => `${m.ad}: ${m.baslangicGunu}. gün`).join('; ')}; ${t.gelgitler.map((g) => `${g.not}, her ${g.saat} saatte`).join('; ')}` : 'Tanım yazılmamış';
};
/** Çözülmemiş tanım/takvim/akış seçeneklerinden gizli seçim yapılmaz (§2.2/15). */
export function hesapTanimi(e: EvrenVt): GokyuzuTanimi {
  const c = e.db.selectValue("SELECT 1 FROM alan_yazanlari WHERE nesne='evren' AND (alan='gokyuzu' OR alan='takvim' OR alan LIKE 'takvim:%' OR alan LIKE 'akis:%') GROUP BY alan HAVING count(DISTINCT deger)>1 LIMIT 1");
  if (c) throw new Error('Hesaplamadan önce Gökyüzü ve Takvim bölümündeki çelişen seçimleri inceleyin.');
  const t = tanimOku(e);
  if (!t) throw new Error('Önce bir gökyüzü tanımı kaydedin.');
  return t;
}
/** Saf günlük döngü: başlangıç evresi sekizin merkezidir; sınırlar sonraki evreye aittir. */
export function evreHesapla(gun: number, ilkGun: number, donem: number, evre: AyEvresi): AyEvresi {
  const ilk = EVRELER.findIndex((e) => e.kod === evre);
  return EVRELER[mod(Math.floor(mod(gun - ilkGun, donem) / donem * 8 + ilk + 0.5), 8)].kod;
}
function mevsimHesapla(t: GokyuzuTanimi, z: ZamanSeti, gun: number): string | null {
  const l = [...t.mevsimler].sort((a, b) => a.baslangicGunu - b.baslangicGunu);
  const d = mod(gun, yilGunu(z.ana)) + 1;
  return (l.filter((m) => m.baslangicGunu <= d).at(-1) ?? l.at(-1))?.ad ?? null;
}
function zarf(t: GokyuzuTanimi, z: ZamanSeti, kapsam: string, bulundu = true): GokyuzuZarfi {
  return { tur: 'bu kurallara göre zorunlu sonuç', hukum: bulundu ? 'çözüm bulundu' : 'kayıtlı seçeneklerde bulunamadı', guncellik: 'güncel', kapsam,
    dayanak: [tanimYazisi(t), `${z.ana.ad}, ${z.ana.surum}. takvim sürümü; yılda ${yilGunu(z.ana)} gün`, 'Takvim döngüsü, 1. hesap kuralı'],
    varsayimlar: ['Ay evreleri sekiz eşit aşamaya ayrılır; başlangıç evresi kendi aşamasının ortasıdır. Her gün için bir evre hesaplanır.', 'Mevsimler ana takvimde her yıl yinelenir; ilk başlangıçtan önce son mevsim sürer.', 'Gelgit notundan bir gelgit zamanı ya da yüksekliği hesaplanmaz.'] };
}
function sinir(b: number, s: number) {
  if (b > s) throw new Error('Başlangıç tarihi bitişten sonra olamaz.');
  if (s - b + 1 > 100000) throw new Error('Bir hesapta en çok 100.000 gün incelenebilir. Daha dar bir tarih aralığı seçin.');
}
export function hesapla(tanim: GokyuzuTanimi, z: ZamanSeti, ifade: string): GokyuzuSonucu {
  const t = tanimDogrula(tanim, z), tarih = tarihOku(ifade, z), [b, s] = gunler(tarih);
  sinir(b, s);
  const aylar = t.aylar.map((a) => {
    const ilk = baslangic(a, z), evreler = new Set<AyEvresi>();
    for (let d = b; d <= s; d++) evreler.add(evreHesapla(d, ilk, a.donem, a.evre));
    return { kod: a.kod, ad: a.ad, evreler: EVRELER.map((e) => e.kod).filter((e) => evreler.has(e)) };
  });
  const mevsimler = new Set<string>();
  for (let d = b; d <= s; d++) { const m = mevsimHesapla(t, z, d); if (m) mevsimler.add(m); }
  return { tarih, aralik: b !== s, aylar, mevsimler: [...mevsimler], zarf: zarf(t, z, `${tarih.ifade}; ana zaman akışı; yalnızca kayıtlı gökyüzü tanımı`) };
}
function gunTarihi(d: number, z: ZamanSeti): EvrenTarihi {
  const t: EvrenTarihi = { ifade: '', bicim: 'kesin', hassasiyet: 'gun', takvim: z.ana.kod, takvimSurumu: z.ana.surum,
    eksen: { enErken: d * GUN_PARCA, enGec: (d + 1) * GUN_PARCA - 1 } };
  // Mevcut tarih nesnesi ve mevcut takvim göstericisi kullanılır; yeni girdi biçimi yoktur.
  t.ifade = tarihAciklamasi(t, z);
  if (!z.ana.aylar?.length) t.ifade += `, ${mod(d, yilGunu(z.ana)) + 1}. gün`;
  return t;
}
export function cakismaAra(tanim: GokyuzuTanimi, z: ZamanSeti, bas: string, son: string, kosullar: GokyuzuKosulu[], mevsim?: string | null): GokyuzuCakismalari {
  const t = tanimDogrula(tanim, z), a = tarihOku(bas, z), o = tarihOku(son, z);
  const b = gunler(a)[0], s = gunler(o)[1];
  sinir(b, s);
  if (!Array.isArray(kosullar) || kosullar.length > t.aylar.length || (!kosullar.length && !mevsim)) throw new Error('En az bir ay evresi ya da mevsim seçin.');
  if (mevsim && !t.mevsimler.some((m) => m.ad === mevsim)) throw new Error('Aranacak mevsim tanımda bulunamadı.');
  const sec = kosullar.map((k) => {
    const ay = k && t.aylar.find((a) => a.kod === k.ay);
    if (!ay || !evreMi(k.evre)) throw new Error('Aranacak ayı ve evreyi tanımdan seçin.');
    return { ay, evre: k.evre, ilk: baslangic(ay, z) };
  });
  if (new Set(sec.map((c) => c.ay.kod)).size !== sec.length) throw new Error('Her ay için yalnızca bir evre seçin.');
  const bulunan: EvrenTarihi[] = [];
  let dahaFazla = false;
  for (let d = b; d <= s; d++) {
    if ((!mevsim || mevsimHesapla(t, z, d) === mevsim) && sec.every((c) => evreHesapla(d, c.ilk, c.ay.donem, c.ay.evre) === c.evre)) {
      if (bulunan.length === 50) { dahaFazla = true; break; }
      bulunan.push(gunTarihi(d, z));
    }
  }
  return { gunler: bulunan, dahaFazla, zarf: zarf(t, z, `${bas} ile ${son}; ${sec.map((c) => `${c.ay.ad}: ${EVRELER.find((e) => e.kod === c.evre)!.ad}`).join('; ')}${mevsim ? `; ${mevsim}` : ''}; ana zaman akışı`, bulunan.length > 0) };
}
