// Evreni inceleme görünümleri (§7): soy ağacı, filtreli ağ ve durum geçmişi. Hepsi salt okunurdur ve aynı
// ilişki ve durum kayıtlarından gelir (§2.1 tek kaynak). Çizim arayüzdedir; burada yalnızca veri toplanır.
import { gecerlilik, type Gecerlilik } from '../alan/durum';
import { iliskiTuruBul, rolAdi } from '../alan/iliski-turleri';
import { kodGecerliMi } from '../alan/kod';
import { karsilastir, siraAnahtari, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { turkceKarsilastir } from '../alan/turkce';
import type { AgSonucu, AgDugumu, AgKenari, BolumMatrisi, DurumGecmisi, EtkiIncelemeleri, EtkiIncelemesi, IncelemeKarari, KurguHatlari, NedenSonucAgi, SoyAgaci, YapiSahnesi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { zamanSetiOku } from './izdusum';
import { durumlar, type DurumBaglami } from './durum';
import { bagimlilar, NEDEN_TURLERI, type Bagimlilar } from './etki';
import { eserYapisi } from './anlati';
import { goruyorMu, gorunurlukOku } from '../alan/gorunurluk';
import { yonlendir } from './izdusum';
import type { KisaKayit } from '../veri/api';

// ---------- Bakış açısı (§3.6) ----------
/**
 * Bakış açısı süzgeci: null evrenin gerçeğidir (inançlar gösterilmez). Bir bilen seçilince onun bilmediği gizli
 * gerçekler düşer, onun inancındaki kayıt ve ilişkiler eklenir. Grup inancı üyelere geçmez.
 */
export interface Bakis { kisa: KisaKayit | null; gorur(ham: unknown): boolean; inanc(ham: unknown): boolean }
export function bakisHazirla(e: EvrenVt, bakis: string | null | undefined): Bakis {
  let kisa: KisaKayit | null = null;
  if (bakis) {
    const k = yonlendir(e.db, bakis);
    const r = kodGecerliMi(k) ? e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]) : undefined;
    if (!r) throw new Error('Bakış açısı kaydı bulunamadı.');
    kisa = { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string };
  }
  const kod = (k: string) => yonlendir(e.db, k);
  return {
    kisa,
    gorur: (ham) => goruyorMu(gorunurlukOku(ham), kisa?.kod ?? null, kod),
    inanc: (ham) => !!gorunurlukOku(ham).katman,
  };
}

/** Bir görünümde en çok bu kadar kayıt çizilir; fazlası için süzgeç önerilir. */
export const AG_SINIRI = 300;

const tarihOku = (ham: unknown): EvrenTarihi | null => (ham ? JSON.parse(ham as string) : null);

function anCoz(e: EvrenVt, an: string | null | undefined): EvrenTarihi | null {
  if (!an || !String(an).trim()) return null;
  const t = tarihCoz(String(an).trim().slice(0, 120), zamanSetiOku(e.db));
  if (!t) return null;
  if (!t.eksen) throw new Error('Bu tarih sıralamaya yerleşmiyor; başka bir tarih yaz.');
  return t;
}

/** İlişkinin verilen anda geçerliliği; an yoksa sorulmaz. */
function iliskiGecerliligi(r: Record<string, unknown>, an: EvrenTarihi | null): Gecerlilik | null {
  if (!an) return null;
  const bas = tarihOku(r.baslangic), bit = tarihOku(r.bitis);
  return gecerlilik('aralik', bas ?? 'acik', bit ?? 'acik', an);
}

function kenar(r: Record<string, unknown>, an: EvrenTarihi | null, bk?: Bakis): AgKenari {
  const t = iliskiTuruBul(r.tur as string);
  return {
    kod: r.kod as string, tur: r.tur as string, a: r.a as string, b: r.b as string,
    etiket: t.karsilikli ? t.aIcin : `${t.bIcin} → ${t.aIcin}`, aIcin: t.aIcin, bIcin: t.bIcin, karsilikli: t.karsilikli,
    rol: (r.rol as string) ?? null, rolAdi: rolAdi(r.tur as string, (r.rol as string) ?? null),
    karar: r.karar as string, gecerlilik: iliskiGecerliligi(r, an),
    baslangic: tarihOku(r.baslangic), bitis: tarihOku(r.bitis),
    ...(bk?.kisa && bk.inanc(r.gorunurluk) ? { inanc: true } : {}),
  };
}

function dugumler(e: EvrenVt, kodlar: Iterable<string>, bk?: Bakis): Map<string, AgDugumu> {
  const m = new Map<string, AgDugumu>();
  const liste = [...kodlar];
  for (let i = 0; i < liste.length; i += 400) {
    const parca = liste.slice(i, i + 400);
    for (const r of e.db.selectObjects(`SELECT kod, ad, tur, karar, gorunurluk FROM kayitlar WHERE kod IN (${parca.map(() => '?').join(',')})`, parca)) {
      m.set(r.kod as string, { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string, karar: r.karar as string, ...(bk?.kisa && bk.inanc(r.gorunurluk) ? { inanc: true } : {}) });
    }
  }
  return m;
}

// ---------- Soy ağacı ----------
/**
 * Odaktaki kaydın aile bağlarıyla ulaşılan bütün akrabaları (ebeveyn, eş, kardeş). Ortak atalar tek düğümdür;
 * soy içi evlilikte eşlerin ortak ataları gösterilir (§15-8). Verilen anda geçerli olmayan bağlar düşer,
 * belirsiz olanlar işaretlenir. Vazgeçilmiş bağlar ve çöp kutusundaki kayıtlar gösterilmez.
 */
export function soyAgaci(e: EvrenVt, odak: string, anIfade?: string | null, bakisKod?: string | null): SoyAgaci {
  if (!kodGecerliMi(odak) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [odak]) === undefined) throw new Error('Kayıt bulunamadı.');
  const an = anCoz(e, anIfade);
  const bk = bakisHazirla(e, bakisKod);
  const tum = e.db.selectObjects(
    `SELECT i.*, x.gorunurluk xg, y.gorunurluk yg FROM iliskiler i JOIN kayitlar x ON x.kod=i.a JOIN kayitlar y ON y.kod=i.b
     WHERE i.tur IN ('ebeveyn','es','kardes') AND i.silindi IS NULL AND i.karar!='vazgecildi' AND x.silindi IS NULL AND y.silindi IS NULL`)
    .filter((r) => bk.gorur(r.gorunurluk) && bk.gorur(r.xg) && bk.gorur(r.yg));
  const komsu = new Map<string, Record<string, unknown>[]>();
  for (const r of tum) {
    if (iliskiGecerliligi(r, an) === 'hayir') continue;
    for (const u of [r.a as string, r.b as string]) komsu.set(u, [...(komsu.get(u) ?? []), r]);
  }
  const gorulen = new Set([odak]);
  const kuyruk = [odak];
  let kesildi = false;
  const kenarlar = new Map<string, Record<string, unknown>>();
  while (kuyruk.length) {
    const k = kuyruk.shift()!;
    for (const r of komsu.get(k) ?? []) {
      const o = r.a === k ? (r.b as string) : (r.a as string);
      if (!gorulen.has(o)) {
        if (gorulen.size >= AG_SINIRI) { kesildi = true; continue; }
        gorulen.add(o); kuyruk.push(o);
      }
      kenarlar.set(r.kod as string, r);
    }
  }
  const ks = [...kenarlar.values()].map((r) => kenar(r, an, bk));
  // Soy içi evlilik: eşlerin kan ya da belirtilmemiş ebeveynlik üzerinden ortak bir atası var mı?
  const ebeveynleri = new Map<string, string[]>();
  for (const k of ks) if (k.tur === 'ebeveyn' && k.rol !== 'evlatlik') ebeveynleri.set(k.b, [...(ebeveynleri.get(k.b) ?? []), k.a]);
  const atalar = (x: string) => {
    const s = new Set<string>(); const yigin = [...(ebeveynleri.get(x) ?? [])];
    while (yigin.length) { const p = yigin.pop()!; if (!s.has(p)) { s.add(p); yigin.push(...(ebeveynleri.get(p) ?? [])); } }
    return s;
  };
  const d = dugumler(e, gorulen, bk);
  const soyIci: SoyAgaci['soyIci'] = [];
  for (const k of ks) {
    if (k.tur !== 'es') continue;
    const x = atalar(k.a), y = atalar(k.b);
    const ortak = [...x].filter((a) => y.has(a));
    // Yalnızca en yakın ortak atalar: başka bir ortak atanın atası olanlar düşer.
    const yakin = ortak.filter((a) => !ortak.some((b) => b !== a && atalar(b).has(a)));
    if (yakin.length) soyIci.push({ kenar: k.kod, ortakAtalar: yakin.map((a) => ({ kod: a, ad: d.get(a)?.ad ?? '' })) });
  }
  return { odak, an, bakis: bk.kisa, dugumler: [...d.values()], kenarlar: ks, soyIci, kesildi };
}

// ---------- Filtreli ağ ----------
export interface AgSecenekleri {
  merkez?: string | null;
  derinlik?: number;
  iliskiTurleri?: string[] | null;
  kayitTurleri?: string[] | null;
  an?: string | null;
  baglantilar?: boolean;
  vazgecilmis?: boolean;
  bakis?: string | null;
}

/**
 * Seçili kaydın yakın bağlantıları ya da bütün evren (§7 Ağ). İlişki türü, kayıt türü ve dönemle süzülür.
 * Metindeki bağlantılar yalnızca istenirse ve ayrı çizgiyle gelir: bahsetmek ilişki kurmak değildir (§2.1).
 */
export function ag(e: EvrenVt, s: AgSecenekleri): AgSonucu {
  const an = anCoz(e, s.an);
  const derinlik = Math.max(1, Math.min(4, Math.floor(Number(s.derinlik) || 1)));
  const merkez = s.merkez ?? null;
  if (merkez && (!kodGecerliMi(merkez) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [merkez]) === undefined)) throw new Error('Kayıt bulunamadı.');
  const iTur = s.iliskiTurleri?.length ? new Set(s.iliskiTurleri) : null;
  const kTur = s.kayitTurleri?.length ? new Set(s.kayitTurleri) : null;
  const bk = bakisHazirla(e, s.bakis);
  const kayit = new Map<string, { tur: string; karar: string }>();
  for (const r of e.db.selectObjects(`SELECT kod, tur, karar, gorunurluk FROM kayitlar WHERE silindi IS NULL`)) {
    if (r.kod === merkez || bk.gorur(r.gorunurluk)) kayit.set(r.kod as string, { tur: r.tur as string, karar: r.karar as string });
  }
  const uygun = (k: string) => {
    const x = kayit.get(k);
    if (!x) return false;
    if (k === merkez) return true;
    if (!s.vazgecilmis && x.karar === 'vazgecildi') return false;
    return !kTur || kTur.has(x.tur);
  };
  const komsu = new Map<string, AgKenari[]>();
  const ekle = (k: AgKenari) => { for (const u of [k.a, k.b]) komsu.set(u, [...(komsu.get(u) ?? []), k]); };
  for (const r of e.db.selectObjects(`SELECT * FROM iliskiler WHERE silindi IS NULL`)) {
    if (!s.vazgecilmis && r.karar === 'vazgecildi') continue;
    if (iTur && !iTur.has(r.tur as string)) continue;
    if (!bk.gorur(r.gorunurluk)) continue;
    if (!uygun(r.a as string) || !uygun(r.b as string)) continue;
    const k = kenar(r, an, bk);
    if (k.gecerlilik === 'hayir') continue;
    ekle(k);
  }
  if (s.baglantilar) {
    const ciftler = new Map<string, { a: string; b: string; n: number }>();
    for (const r of e.db.selectObjects(`SELECT kaynak, hedef, count(*) n FROM baglantilar WHERE kaynak!=hedef GROUP BY kaynak, hedef`)) {
      const a = r.kaynak as string, b = r.hedef as string;
      if (!uygun(a) || !uygun(b)) continue;
      ciftler.set(a + b, { a, b, n: r.n as number });
    }
    for (const c of ciftler.values()) {
      ekle({ kod: 'b:' + c.a + c.b, tur: 'baglanti', a: c.a, b: c.b, etiket: c.n > 1 ? `Metninde ${c.n} kez bahsediyor` : 'Metninde bahsediyor',
        aIcin: 'Bahsettiği', bIcin: 'Ondan bahseden', karsilikli: false, rol: null, rolAdi: null, karar: 'kesin', gecerlilik: null, baslangic: null, bitis: null, baglanti: true });
    }
  }
  const secilen = new Set<string>();
  const kenarlar = new Map<string, AgKenari>();
  let kesildi = false;
  if (merkez) {
    secilen.add(merkez);
    let sinir = [merkez];
    for (let d = 0; d < derinlik && sinir.length; d++) {
      const sonraki: string[] = [];
      for (const k of sinir) for (const x of komsu.get(k) ?? []) {
        const o = x.a === k ? x.b : x.a;
        if (!secilen.has(o)) {
          if (secilen.size >= AG_SINIRI) { kesildi = true; continue; }
          secilen.add(o); sonraki.push(o);
        }
      }
      sinir = sonraki;
    }
  } else {
    // Bütün evren: en çok bağı olan kayıtlardan başlanır; bağı olmayan kayıtlar ağda yer almaz.
    const sirali = [...komsu.keys()].sort((x, y) => (komsu.get(y)!.length - komsu.get(x)!.length) || x.localeCompare(y));
    for (const k of sirali) { if (secilen.size >= AG_SINIRI) { kesildi = true; break; } secilen.add(k); }
  }
  for (const k of secilen) for (const x of komsu.get(k) ?? []) if (secilen.has(x.a) && secilen.has(x.b)) kenarlar.set(x.kod, x);
  const d = dugumler(e, secilen, bk);
  return {
    merkez, an, bakis: bk.kisa, kesildi,
    dugumler: [...d.values()].sort((x, y) => turkceKarsilastir(x.ad, y.ad)),
    kenarlar: [...kenarlar.values()],
    baglantisiz: merkez ? 0 : [...kayit.keys()].filter((k) => uygun(k) && !komsu.has(k)).length,
  };
}

// ---------- Durum geçmişi ----------
/** Bir özelliğin (ör. "Unvan") evrendeki bütün kayıtlarda zaman içindeki değerleri (§3.5). */
export function durumGecmisi(b: DurumBaglami, ozellik: string, anIfade?: string | null): DurumGecmisi {
  const e = b.e;
  const an = anCoz(e, anIfade);
  const ad = String(ozellik ?? '').trim();
  if (!ad) throw new Error('Bir özellik seç.');
  const anahtar = ad.toLocaleLowerCase('tr-TR');
  const konular = (e.db.selectObjects(
    `SELECT DISTINCT d.konu, k.ad FROM durumlar d JOIN kayitlar k ON k.kod=d.konu WHERE d.silindi IS NULL AND k.silindi IS NULL`) as { konu: string; ad: string }[]);
  const satirlar: DurumGecmisi['kayitlar'] = [];
  for (const k of konular) {
    const ds = durumlar(b, k.konu, an ?? undefined).filter((d) => d.ozellik.toLocaleLowerCase('tr-TR') === anahtar && d.karar !== 'vazgecildi');
    if (!ds.length) continue;
    const r = e.db.selectObject('SELECT tur FROM kayitlar WHERE kod=?', [k.konu])!;
    satirlar.push({ kod: k.konu, ad: k.ad, tur: r.tur as string, durumlar: ds });
  }
  satirlar.sort((x, y) => turkceKarsilastir(x.ad, y.ad));
  return { ozellik: ad, an, kayitlar: satirlar };
}

// ---------- Neden–sonuç ağı ----------
/**
 * Olaylar arasındaki açık neden–sonuç bağları (§7, §4.5). Aynı tarih neden bağı sayılmaz (§2.2 kural 8); yalnızca
 * yazarın kurduğu bağlar çizilir. Nedeni sonucundan sonra görünen bağ işaretlenir, engellenmez.
 */
export function nedenSonucAgi(e: EvrenVt, merkez: string | null, derinlikGirdi?: number): NedenSonucAgi {
  const derinlik = Math.max(1, Math.min(6, Math.floor(Number(derinlikGirdi) || 3)));
  if (merkez && (!kodGecerliMi(merkez) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [merkez]) === undefined)) throw new Error('Kayıt bulunamadı.');
  const satirlar = e.db.selectObjects(
    `SELECT i.* FROM iliskiler i JOIN kayitlar x ON x.kod=i.a JOIN kayitlar y ON y.kod=i.b
     WHERE i.tur IN (${NEDEN_TURLERI.map(() => '?').join(',')}) AND i.silindi IS NULL AND i.karar!='vazgecildi' AND x.silindi IS NULL AND y.silindi IS NULL`, NEDEN_TURLERI);
  const komsu = new Map<string, Record<string, unknown>[]>();
  for (const r of satirlar) for (const u of [r.a as string, r.b as string]) komsu.set(u, [...(komsu.get(u) ?? []), r]);
  const secilen = new Set<string>();
  if (merkez) {
    secilen.add(merkez);
    let sinir = [merkez];
    for (let d = 0; d < derinlik && sinir.length; d++) {
      const sonraki: string[] = [];
      for (const k of sinir) for (const r of komsu.get(k) ?? []) {
        const o = r.a === k ? (r.b as string) : (r.a as string);
        if (!secilen.has(o) && secilen.size < AG_SINIRI) { secilen.add(o); sonraki.push(o); }
      }
      sinir = sonraki;
    }
  } else for (const k of komsu.keys()) if (secilen.size < AG_SINIRI) secilen.add(k);
  const tarihler = new Map<string, EvrenTarihi | null>();
  for (const k of secilen) {
    const r = e.db.selectObject('SELECT k.tarih, s.tarih st FROM kayitlar k LEFT JOIN kayitlar s ON s.kod=k.sahne_olayi WHERE k.kod=?', [k]);
    tarihler.set(k, tarihOku(r?.tarih ?? r?.st));
  }
  const kenarlar = satirlar.filter((r) => secilen.has(r.a as string) && secilen.has(r.b as string)).map((r) => {
    const k = kenar(r, null);
    const ta = tarihler.get(k.a) ?? null, tb = tarihler.get(k.b) ?? null;
    const sira = k.tur !== 'engelledi' && ta?.eksen && tb?.eksen ? karsilastir(ta, tb) : null;
    return { ...k, zamanUyarisi: sira === 'sonra' ? 'Neden, sonucundan sonra görünüyor.' : null };
  });
  const d = dugumler(e, secilen);
  return {
    merkez,
    dugumler: [...d.values()].map((x) => ({ ...x, tarih: tarihler.get(x.kod) ?? null })).sort((x, y) => siraAnahtari(x.tarih) - siraAnahtari(y.tarih) || turkceKarsilastir(x.ad, y.ad)),
    kenarlar,
  };
}

// ---------- Etki analizi ----------
export function etkiRaporu(e: EvrenVt, kod: string): Bagimlilar {
  if (!kodGecerliMi(kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kod]) === undefined) throw new Error('Kayıt bulunamadı.');
  return bagimlilar(e.db, kod);
}

/**
 * İnceleme kuyruğundaki etki incelemeleri. Bağımlılık sonradan kaldırıldıysa inceleme düşer. Kapatılmış
 * (düzeltildi ya da gerekçeyle kabul) inceleme, aynı kaynak yeniden değişmedikçe açılmaz.
 */
export function etkiIncelemeleri(e: EvrenVt): EtkiIncelemeleri {
  const kararlar = new Map(e.db.selectObjects('SELECT * FROM inceleme_kararlari WHERE anahtar LIKE ?', ['etki:%']).map((r) => [r.anahtar as string, r]));
  const acik: EtkiIncelemesi[] = [], ertelenen: EtkiIncelemesi[] = [], kapanan: EtkiIncelemesi[] = [];
  const bagCache = new Map<string, Set<string>>();
  for (const r of e.db.selectObjects(`SELECT x.*, k.ad k_ad, k.tur k_tur, h.ad h_ad, h.tur h_tur FROM etki_incelemeleri x
      JOIN kayitlar k ON k.kod=x.kaynak JOIN kayitlar h ON h.kod=x.hedef WHERE k.silindi IS NULL AND h.silindi IS NULL ORDER BY x.zaman DESC`)) {
    const kaynak = r.kaynak as string;
    if (!bagCache.has(kaynak)) bagCache.set(kaynak, new Set(bagimlilar(e.db, kaynak).bagimli.map((b) => b.kod)));
    if (!bagCache.get(kaynak)!.has(r.hedef as string)) continue;
    const kr = kararlar.get(r.anahtar as string);
    const karar = kr ? { durum: kr.durum as IncelemeKarari['durum'], gerekce: kr.gerekce as string, zaman: Number(kr.zaman) } : null;
    const x: EtkiIncelemesi = {
      anahtar: r.anahtar as string, islem: r.islem as string, degisim: r.degisim as 'tarih' | 'katilimci',
      kaynak: { kod: kaynak, ad: r.k_ad as string, tur: r.k_tur as string }, hedef: { kod: r.hedef as string, ad: r.h_ad as string, tur: r.h_tur as string },
      once: (r.once as string) ?? null, sonra: (r.sonra as string) ?? null, aciklama: r.aciklama as string, zaman: Number(r.zaman), karar,
    };
    if (karar?.durum === 'ertelendi') ertelenen.push(x);
    else if (karar && kr!.dayanak === r.islem) kapanan.push(x);
    else acik.push({ ...x, karar: null });
  }
  return { acik, ertelenen, kapanan };
}

export function etkiKarari(e: EvrenVt, anahtar: string): { dayanak: string; baslik: string; kayit: string } {
  const r = e.db.selectObject('SELECT x.*, k.ad k_ad, h.ad h_ad FROM etki_incelemeleri x JOIN kayitlar k ON k.kod=x.kaynak JOIN kayitlar h ON h.kod=x.hedef WHERE anahtar=?', [anahtar]);
  if (!r) throw new Error('Bu inceleme artık yok.');
  return { dayanak: r.islem as string, baslik: `${r.k_ad} değişti; ${r.h_ad} incelenmeli`, kayit: r.hedef as string };
}

// ---------- Kurgu hatları ----------
/**
 * Her kurgu hattı için bağlı sahneler okuma sırasıyla ve ipuçlarının durumu (§4.6). "Son bağlantılı sahne sekiz
 * sahne önceydi" gibi somut bilgi verilir; tempo yargısı verilmez.
 */
export function kurguHatlari(e: EvrenVt): KurguHatlari {
  const eserler = (e.db.selectObjects("SELECT kod FROM kayitlar WHERE tur='eser' AND silindi IS NULL ORDER BY olusturma") as { kod: string }[])
    .map((r) => eserYapisi(e, r.kod));
  const okuma = eserler.map((y) => ({ eser: y.eser, sahneler: [...y.dogrudan, ...y.bolumler.flatMap((b) => b.sahneler.map((s) => ({ ...s, bolum: b.ad })))] as (YapiSahnesi & { bolum?: string })[] }));
  const hatlar = e.db.selectObjects("SELECT kod, ad, karar FROM kayitlar WHERE tur='kurgu_hatti' AND silindi IS NULL") as { kod: string; ad: string; karar: string }[];
  const sonuc: KurguHatlari['hatlar'] = [];
  for (const h of hatlar) {
    const baglar = e.db.selectObjects(`SELECT i.a, i.rol, i.aciklama, i.karar, k.ad, k.tur FROM iliskiler i JOIN kayitlar k ON k.kod=i.a
      WHERE i.tur='kurgu_hattinda' AND i.b=? AND i.silindi IS NULL AND k.silindi IS NULL`, [h.kod]) as { a: string; rol: string | null; aciklama: string; karar: string; ad: string; tur: string }[];
    const bag = new Map<string, typeof baglar>();
    for (const b of baglar) bag.set(b.a, [...(bag.get(b.a) ?? []), b]);
    const eserlerde = okuma.map((o) => {
      const sira = o.sahneler.map((s, i) => ({ kod: s.kod, ad: s.ad, sira: i + 1, bolum: s.bolum ?? null, baglar: (bag.get(s.kod) ?? []).map((b) => ({ rol: b.rol, rolAdi: rolAdi('kurgu_hattinda', b.rol), aciklama: b.aciklama, karar: b.karar })) }));
      const bagli = sira.filter((s) => s.baglar.length);
      const son = bagli.length ? bagli[bagli.length - 1].sira : null;
      return { eser: o.eser, toplam: sira.length, sahneler: sira, sonBagliSira: son, sonrakiSahne: son === null ? null : sira.length - son };
    }).filter((x) => x.sahneler.some((s) => s.baglar.length));
    const eserdeki = new Set(okuma.flatMap((o) => o.sahneler.map((s) => s.kod)));
    const yerlesmemis = baglar.filter((b) => !eserdeki.has(b.a)).map((b) => ({ kod: b.a, ad: b.ad, tur: b.tur, rol: b.rol, rolAdi: rolAdi('kurgu_hattinda', b.rol), aciklama: b.aciklama, karar: b.karar }));
    const ipucu: Record<string, number> = {};
    for (const b of baglar) if (b.rol?.startsWith('ipucu_')) ipucu[b.rol] = (ipucu[b.rol] ?? 0) + 1;
    sonuc.push({ kod: h.kod, ad: h.ad, karar: h.karar, eserler: eserlerde, yerlesmemis, ipucu });
  }
  sonuc.sort((x, y) => turkceKarsilastir(x.ad, y.ad));
  return { hatlar: sonuc };
}

// ---------- Bölüm × kayıt matrisi ----------
/**
 * Bir eserin bölümleri × kayıtlar (§7). Katmanlar ayrı sayılır: fiziksel katılım, anılma (rol ya da metindeki
 * bağlantı), bakış açısı, olay etkisi. "Kaç sahnede görünüyor" ile "kaç sahnede konu oluyor" ayrıdır.
 */
export function bolumMatrisi(e: EvrenVt, eser: string, turler?: string[] | null): BolumMatrisi {
  if (!kodGecerliMi(eser) || e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND tur='eser' AND silindi IS NULL", [eser]) === undefined) throw new Error('Eser bulunamadı.');
  const y = eserYapisi(e, eser);
  const sutunlar = [
    ...(y.dogrudan.length ? [{ kod: eser, ad: 'Bölümsüz sahneler', sahneler: y.dogrudan.map((s) => s.kod) }] : []),
    ...y.bolumler.map((b) => ({ kod: b.kod, ad: b.ad, sahneler: b.sahneler.map((s) => s.kod) })),
  ];
  const sahneSutun = new Map<string, number>();
  sutunlar.forEach((s, i) => s.sahneler.forEach((k) => sahneSutun.set(k, i)));
  const sahneler = [...sahneSutun.keys()];
  type Hucre = BolumMatrisi['satirlar'][number]['hucreler'][number];
  const satir = new Map<string, Hucre[]>();
  const sahneKumeleri = new Map<string, { gorunur: Set<string>; konu: Set<string> }>();
  const isle = (kayit: string, sahne: string, alan: keyof Hucre) => {
    const i = sahneSutun.get(sahne);
    if (i === undefined || kayit === sahne) return;
    if (!satir.has(kayit)) satir.set(kayit, sutunlar.map(() => ({ bulunuyor: 0, aniliyor: 0, bakis: 0, etki: 0, bilgi: 0, okur: 0 })));
    satir.get(kayit)![i][alan]++;
    const k = sahneKumeleri.get(kayit) ?? { gorunur: new Set(), konu: new Set() };
    if (alan === 'bulunuyor') k.gorunur.add(sahne);
    k.konu.add(sahne);
    sahneKumeleri.set(kayit, k);
  };
  if (sahneler.length) {
    const yer = sahneler.map(() => '?').join(',');
    for (const r of e.db.selectObjects(`SELECT a, b, tur, rol FROM iliskiler WHERE silindi IS NULL AND karar!='vazgecildi' AND tur IN ('sahnede','bakis','odak','anlatici') AND b IN (${yer})`, sahneler)) {
      if (r.tur === 'sahnede') isle(r.a as string, r.b as string, r.rol === 'bulunuyor' || r.rol === null ? 'bulunuyor' : 'aniliyor');
      else isle(r.a as string, r.b as string, 'bakis');
    }
    // Metindeki bağlantı da anılmadır; aynı sahnede birden çok bağlantı tek anılma sayılır.
    for (const r of e.db.selectObjects(`SELECT DISTINCT kaynak, hedef FROM baglantilar WHERE kaynak IN (${yer})`, sahneler)) isle(r.hedef as string, r.kaynak as string, 'aniliyor');
    for (const r of e.db.selectObjects(`SELECT DISTINCT sahne, konu FROM degisimler WHERE silindi IS NULL AND konu IS NOT NULL AND sahne IN (${yer})`, sahneler)) isle(r.konu as string, r.sahne as string, 'etki');
    // Bilgi edinme: bilen o sahnede bir şey öğrenir. Okura açıklanma: bu eserin okuru o sahnede bir iddiayı öğrenir;
    // satır iddianın konusudur ("sır" kaydı ayrı değildir, sorunun sorulduğu kayıttır).
    for (const r of e.db.selectObjects(`SELECT DISTINCT x.sahne, x.bilen, i.konu, k.tur FROM bilgiler x JOIN iddialar i ON i.kod=x.iddia JOIN kayitlar k ON k.kod=x.bilen
        WHERE x.silindi IS NULL AND i.silindi IS NULL AND x.karar!='vazgecildi' AND x.sahne IN (${yer})`, sahneler)) {
      if (r.tur === 'eser') { if (r.bilen === eser) isle(r.konu as string, r.sahne as string, 'okur'); }
      else isle(r.bilen as string, r.sahne as string, 'bilgi');
    }
  }
  const tSecili = turler?.length ? new Set(turler) : null;
  const d = dugumler(e, satir.keys());
  const satirlar = [...satir].filter(([k]) => d.has(k) && !['sahne', 'bolum', 'eser'].includes(d.get(k)!.tur) && (!tSecili || tSecili.has(d.get(k)!.tur)))
    .map(([k, hucreler]) => ({ kayit: d.get(k)!, hucreler, gorunduguSahne: sahneKumeleri.get(k)!.gorunur.size, konuOlduguSahne: sahneKumeleri.get(k)!.konu.size }))
    .sort((a, b) => b.konuOlduguSahne - a.konuOlduguSahne || turkceKarsilastir(a.kayit.ad, b.kayit.ad));
  return { eser: y.eser, sutunlar: sutunlar.map((s) => ({ kod: s.kod, ad: s.ad, sahneSayisi: s.sahneler.length })), satirlar };
}
