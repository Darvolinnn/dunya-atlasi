// Evreni inceleme görünümleri (§7): soy ağacı, filtreli ağ ve durum geçmişi. Hepsi salt okunurdur ve aynı
// ilişki ve durum kayıtlarından gelir (§2.1 tek kaynak). Çizim arayüzdedir; burada yalnızca veri toplanır.
import { gecerlilik, type Gecerlilik } from '../alan/durum';
import { iliskiTuruBul, rolAdi } from '../alan/iliski-turleri';
import { kodGecerliMi } from '../alan/kod';
import { tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { turkceKarsilastir } from '../alan/turkce';
import type { AgSonucu, AgDugumu, AgKenari, DurumGecmisi, SoyAgaci } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { takvimOku } from './izdusum';
import { durumlar, type DurumBaglami } from './durum';

/** Bir görünümde en çok bu kadar kayıt çizilir; fazlası için süzgeç önerilir. */
export const AG_SINIRI = 300;

const tarihOku = (ham: unknown): EvrenTarihi | null => (ham ? JSON.parse(ham as string) : null);

function anCoz(e: EvrenVt, an: string | null | undefined): EvrenTarihi | null {
  if (!an || !String(an).trim()) return null;
  const t = tarihCoz(String(an).trim().slice(0, 120), takvimOku(e.db));
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

function kenar(r: Record<string, unknown>, an: EvrenTarihi | null): AgKenari {
  const t = iliskiTuruBul(r.tur as string);
  return {
    kod: r.kod as string, tur: r.tur as string, a: r.a as string, b: r.b as string,
    etiket: t.karsilikli ? t.aIcin : `${t.bIcin} → ${t.aIcin}`, aIcin: t.aIcin, bIcin: t.bIcin, karsilikli: t.karsilikli,
    rol: (r.rol as string) ?? null, rolAdi: rolAdi(r.tur as string, (r.rol as string) ?? null),
    karar: r.karar as string, gecerlilik: iliskiGecerliligi(r, an),
    baslangic: tarihOku(r.baslangic), bitis: tarihOku(r.bitis),
  };
}

function dugumler(e: EvrenVt, kodlar: Iterable<string>): Map<string, AgDugumu> {
  const m = new Map<string, AgDugumu>();
  const liste = [...kodlar];
  for (let i = 0; i < liste.length; i += 400) {
    const parca = liste.slice(i, i + 400);
    for (const r of e.db.selectObjects(`SELECT kod, ad, tur, karar FROM kayitlar WHERE kod IN (${parca.map(() => '?').join(',')})`, parca)) {
      m.set(r.kod as string, { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string, karar: r.karar as string });
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
export function soyAgaci(e: EvrenVt, odak: string, anIfade?: string | null): SoyAgaci {
  if (!kodGecerliMi(odak) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [odak]) === undefined) throw new Error('Kayıt bulunamadı.');
  const an = anCoz(e, anIfade);
  const tum = e.db.selectObjects(
    `SELECT i.* FROM iliskiler i JOIN kayitlar x ON x.kod=i.a JOIN kayitlar y ON y.kod=i.b
     WHERE i.tur IN ('ebeveyn','es','kardes') AND i.silindi IS NULL AND i.karar!='vazgecildi' AND x.silindi IS NULL AND y.silindi IS NULL`);
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
  const ks = [...kenarlar.values()].map((r) => kenar(r, an));
  // Soy içi evlilik: eşlerin kan ya da belirtilmemiş ebeveynlik üzerinden ortak bir atası var mı?
  const ebeveynleri = new Map<string, string[]>();
  for (const k of ks) if (k.tur === 'ebeveyn' && k.rol !== 'evlatlik') ebeveynleri.set(k.b, [...(ebeveynleri.get(k.b) ?? []), k.a]);
  const atalar = (x: string) => {
    const s = new Set<string>(); const yigin = [...(ebeveynleri.get(x) ?? [])];
    while (yigin.length) { const p = yigin.pop()!; if (!s.has(p)) { s.add(p); yigin.push(...(ebeveynleri.get(p) ?? [])); } }
    return s;
  };
  const d = dugumler(e, gorulen);
  const soyIci: SoyAgaci['soyIci'] = [];
  for (const k of ks) {
    if (k.tur !== 'es') continue;
    const x = atalar(k.a), y = atalar(k.b);
    const ortak = [...x].filter((a) => y.has(a));
    // Yalnızca en yakın ortak atalar: başka bir ortak atanın atası olanlar düşer.
    const yakin = ortak.filter((a) => !ortak.some((b) => b !== a && atalar(b).has(a)));
    if (yakin.length) soyIci.push({ kenar: k.kod, ortakAtalar: yakin.map((a) => ({ kod: a, ad: d.get(a)?.ad ?? '' })) });
  }
  return { odak, an, dugumler: [...d.values()], kenarlar: ks, soyIci, kesildi };
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
  const kayit = new Map<string, { tur: string; karar: string }>();
  for (const r of e.db.selectObjects(`SELECT kod, tur, karar FROM kayitlar WHERE silindi IS NULL`)) kayit.set(r.kod as string, { tur: r.tur as string, karar: r.karar as string });
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
    if (!uygun(r.a as string) || !uygun(r.b as string)) continue;
    const k = kenar(r, an);
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
  const d = dugumler(e, secilen);
  return {
    merkez, an, kesildi,
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
