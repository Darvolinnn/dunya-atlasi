// F22 / §7, salt okunur kullanım sözleşmesi (§18.2):
// Soru: seçilen kapsamda hangi zaman diliminde ve harita bölgesinde kaç olay/sahne/kelime/kayıt var?
// En az veri: tarih aralığı ve adım; harita isteğe bağlıdır. Tarih/konum yoksa ayrı sayılır.
// Okunanlar: kayıtlar, tarihler, eser yapısı, açık bağlantılar, sahne gövdesi, harita işaret ve çizimleri.
// Yazılanlar: hiçbir kayıt, tablo veya işlem. Metinden olay, yer, önem ya da denge çıkarılmaz.
// Kabul: altı sahnedeki tek olay bir olaydır; dilimler arasındaki belirsizlik korunur.
import * as A from '@automerge/automerge/slim';
import { duzMetin } from '../alan/metin-sema';
import { eksenYili, karsilastir, tarihCoz, yilParcasi, yilYazisi, type EvrenTarihi, type ZamanSeti } from '../alan/tarih';
import { kelimeler, turkceKarsilastir } from '../alan/turkce';
import type { CizelgeOgesi, HaritaAyrintisi, HaritaCizimi, HaritaIsareti, KisaKayit, YogunlukIstegi, YogunlukKaydi, YogunlukSayilari, YogunlukSatiri, YogunlukSonucu } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi, zamanSetiOku } from './izdusum';
import { eserYapisi } from './anlati';
import { haritalar } from './harita';
import { bakisHazirla } from './gorunum';

export interface SayimKaydi extends KisaKayit { tarih: EvrenTarihi | null; kelime: number; yerler: string[] }
export const bosSayilar = (): YogunlukSayilari => ({ olay: 0, sahne: 0, kelime: 0, kayit: 0 });
const ekle = (n: YogunlukSayilari, k: SayimKaydi) => { n.kayit++; if (k.tur === 'olay') n.olay++; if (k.tur === 'sahne') { n.sahne++; n.kelime += k.kelime; } };
export const boslukCumlesi = (ad: string) => `Bu kapsamda ${ad} için kayıtlı olay yok.`;
const satir = (kod: string, ad: string): YogunlukSatiri => ({ kod, ad, enAz: bosSayilar(), enCok: bosSayilar(), aciklama: '' });
interface Dilim extends YogunlukSatiri { bas: number; son: number }
function aralik(z: ZamanSeti, s: YogunlukIstegi): { bas: number; son: number; dilimler: Dilim[] } {
  if (![1, 10, 100].includes(s.adim)) throw new Error('Yıl, on yıl ya da yüzyıl adımını seçin.');
  const yil = (x: unknown) => {
    if (typeof x !== 'string' || !x.trim() || x.length > 120) throw new Error('Başlangıç ve bitiş yıllarını yazın.');
    const t = tarihCoz(x, z);
    if (!t?.eksen || t.hassasiyet !== 'yil' || t.bicim !== 'kesin' || t.takvim !== z.ana.kod || t.akis || t.eksen.enErken === null) throw new Error('Aralığın iki ucuna ana takvimde birer kesin yıl yazın.');
    return eksenYili(t.eksen.enErken, z);
  };
  const ilk = yil(s.baslangic), sonYil = yil(s.bitis);
  if (ilk > sonYil) throw new Error('Başlangıç yılı bitişten sonra olamaz.');
  if (Math.ceil((sonYil - ilk + 1) / s.adim) > 1000) throw new Error('En çok 1.000 zaman dilimi gösterilir. Aralığı daraltın ya da daha büyük bir adım seçin.');
  const yp = yilParcasi(z.ana), bas = ilk * yp, son = (sonYil + 1) * yp - 1;
  const dilimler: Dilim[] = [];
  for (let y = ilk; y <= sonYil; y += s.adim) {
    const bit = Math.min(y + s.adim - 1, sonYil), ad = y === bit ? yilYazisi(y, z.ana) : `${yilYazisi(y, z.ana)} – ${yilYazisi(bit, z.ana)}`;
    dilimler.push({ ...satir(String(y), ad), bas: y * yp, son: (bit + 1) * yp - 1 });
  }
  return { bas, son, dilimler };
}
export function kelimeSay(metin: string): number { return kelimeler(metin).length; }

type Nokta = [number, number];
function uzaklik(p: Nokta, a: Nokta, b: Nokta): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
/** Kenardaki nokta dahildir. Yaklaşık daire merkez noktasına indirgenmez. */
export function bolgede(p: Nokta, noktalar: Nokta[], yaricap = 0): 'kesin' | 'belirsiz' | null {
  let ic = false, mesafe = Infinity;
  for (let i = 0, j = noktalar.length - 1; i < noktalar.length; j = i++) {
    const a = noktalar[j], b = noktalar[i];
    mesafe = Math.min(mesafe, uzaklik(p, a, b));
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ic = !ic;
  }
  if (noktalar.length < 3) return null;
  if (yaricap === 0 && mesafe < 1e-8) return 'kesin';
  if (ic && mesafe >= yaricap) return 'kesin';
  return ic || mesafe <= yaricap ? 'belirsiz' : null;
}
function konumlar(k: SayimKaydi, cizimler: HaritaCizimi[], isaretler: Map<string, HaritaIsareti[]>): { kod: string; kesin: boolean }[] | null {
  const kaynaklar = isaretler.has(k.kod) ? [k.kod] : k.yerler.length ? k.yerler : [k.kod];
  const olasiliklar: Map<string, boolean>[] = [];
  for (const yer of kaynaklar) {
    const kendi = cizimler.filter((c) => c.kayit.kod === yer);
    if (kendi.length) { olasiliklar.push(new Map(kendi.map((c) => [c.kod, true]))); continue; }
    const isaret = isaretler.get(yer);
    if (!isaret?.length) return null;
    for (const i of isaret) {
      const p = i.konum;
      if (p.kesinlik === 'bilinmiyor' || p.x === null || p.y === null) return null;
      if (p.kesinlik === 'yaklasik' && !(p.yaricap !== null && p.yaricap > 0)) return null;
      const m = new Map<string, boolean>();
      for (const c of cizimler) {
        const sonuc = bolgede([p.x, p.y], c.noktalar, p.kesinlik === 'yaklasik' ? (p.yaricap ?? 0) : 0);
        if (sonuc) m.set(c.kod, sonuc === 'kesin');
      }
      olasiliklar.push(m);
    }
  }
  return [...new Set(olasiliklar.flatMap((m) => [...m.keys()]))].map((kod) => ({ kod, kesin: olasiliklar.every((m) => m.get(kod) === true) }));
}

/** Saf sayım: kayıt bir kez dolaşılır; dilim dayanakları kayıt başına bir aralıkla taşınır. */
export function say(kaynak: SayimKaydi[], z: ZamanSeti, s: YogunlukIstegi, harita: HaritaAyrintisi | null) {
  const { bas, son, dilimler } = aralik(z, s);
  const bolgeCizimleri = harita?.cizimler.filter((c) => c.bicim === 'bolge' && c.karar !== 'vazgecildi' && !c.inanc) ?? [];
  const bolgeler = bolgeCizimleri.map((c) => satir(c.kod, `${c.kayit.ad}${c.kip === 'iddia' ? ' (iddia)' : ''}${c.baslangic || c.bitis ? ` · ${c.baslangic?.tarih?.ifade ?? 'başlangıcı yazılmamış'} – ${c.bitis?.tarih?.ifade ?? 'bitişi yazılmamış'}` : ''}`));
  const bolgeMap = new Map(bolgeler.map((b) => [b.kod, b]));
  const isaretler = new Map<string, HaritaIsareti[]>();
  for (const i of harita?.isaretler ?? []) if (i.karar !== 'vazgecildi' && !i.inanc) isaretler.set(i.kayit.kod, [...(isaretler.get(i.kayit.kod) ?? []), i]);
  const tarihsiz = bosSayilar(), zamanDisinda = bosSayilar(), konumsuz = bosSayilar(), bolgeDisinda = bosSayilar();
  const pencere: EvrenTarihi = { ifade: '', bicim: 'aralik', hassasiyet: 'yil', takvim: z.ana.kod, takvimSurumu: z.ana.surum, eksen: { enErken: bas, enGec: son } };
  const kayitlar: YogunlukKaydi[] = [];
  for (const k of new Map(kaynak.filter((k) => !s.tur || k.tur === s.tur).map((k) => [k.kod, k])).values()) {
    const r: YogunlukKaydi = { kod: k.kod, ad: k.ad, tur: k.tur, kelime: k.tur === 'sahne' ? k.kelime : 0, tarih: k.tarih, dilimler: null, zamanDurumu: 'tarihsiz', bolgeler: [], konumDurumu: 'konumsuz' };
    const e = k.tarih?.eksen;
    if (!e || (e.enErken === null && e.enGec === null)) ekle(tarihsiz, k);
    else if (karsilastir(k.tarih, pencere) !== 'belirsiz') { r.zamanDurumu = 'disarida'; ekle(zamanDisinda, k); }
    else {
      const b = e.enErken ?? -Infinity, o = e.enGec ?? Infinity;
      const ilk = Math.max(0, Math.floor((Math.max(b, bas) - bas) / (s.adim * yilParcasi(z.ana))));
      const sonDilim = Math.min(dilimler.length - 1, Math.floor((Math.min(o, son) - bas) / (s.adim * yilParcasi(z.ana))));
      const kesin = ilk === sonDilim && b >= dilimler[ilk].bas && o <= dilimler[ilk].son;
      r.zamanDurumu = 'dilimde'; r.dilimler = { ilk, son: sonDilim, kesin };
      for (let i = ilk; i <= sonDilim; i++) { ekle(dilimler[i].enCok, k); if (kesin) ekle(dilimler[i].enAz, k); }
    }
    if (harita) {
      const bol = konumlar(k, bolgeCizimleri, isaretler);
      if (bol === null) ekle(konumsuz, k);
      else {
        r.bolgeler = bol; r.konumDurumu = bol.length ? 'konumlu' : 'disarida';
        if (!bol.length) ekle(bolgeDisinda, k);
        for (const a of bol) { const b = bolgeMap.get(a.kod)!; ekle(b.enCok, k); if (a.kesin) ekle(b.enAz, k); }
      }
    }
    kayitlar.push(r);
  }
  for (const d of [...dilimler, ...bolgeler]) d.aciklama = d.enCok.olay === 0 ? boslukCumlesi(d.ad) : `${d.ad}: bu kapsamda en az ${d.enAz.olay}, en çok ${d.enCok.olay} kayıtlı olay.`;
  return { dilimler: dilimler.map(({ bas: _b, son: _s, ...d }) => d), bolgeler, kayitlar, tarihsiz, zamanDisinda, konumsuz, bolgeDisinda };
}

/** Bütün veritabanı okumaları burada; hiçbir yazma yolu çağrılmaz. */
export function oku(e: EvrenVt, s: YogunlukIstegi, cizelgeOku: () => CizelgeOgesi[], haritaOku: (kod: string) => HaritaAyrintisi): YogunlukSonucu {
  const z = zamanSetiOku(e.db);
  aralik(z, s);
  if ((s.tur && (typeof s.tur !== 'string' || s.tur.length > 120)) || (s.eser && typeof s.eser !== 'string') || (s.harita && typeof s.harita !== 'string')) throw new Error('Eser, kayıt türü ve harita seçimlerini gözden geçirin.');
  const bk = bakisHazirla(e, null);
  const tum = e.db.selectObjects("SELECT kod,ad,tur,karar,sahne_olayi,gorunurluk FROM kayitlar WHERE silindi IS NULL AND karar<>'vazgecildi'").filter((k) => bk.gorur(k.gorunurluk));
  const eserler = tum.filter((k) => k.tur === 'eser').map((k) => ({ kod: k.kod as string, ad: k.ad as string, tur: 'eser' })).sort((a, b) => turkceKarsilastir(a.ad, b.ad));
  const haritaListesi = haritalar(e);
  if (s.eser && !eserler.some((k) => k.kod === s.eser)) throw new Error('Seçilen eser bulunamadı.');
  if (s.harita && !haritaListesi.some((h) => h.kod === s.harita)) throw new Error('Seçilen harita bulunamadı.');
  const iliskiler = e.db.selectObjects("SELECT kod,tur,a,b,gorunurluk FROM iliskiler WHERE silindi IS NULL AND karar<>'vazgecildi' AND bitis IS NULL AND tur IN ('anlatir','sahne_yeri','sahnede')").filter((i) => bk.gorur(i.gorunurluk));
  let kapsam: Set<string> | null = null;
  if (s.eser) {
    const y = eserYapisi(e, s.eser), sahneler = new Set([...y.dogrudan, ...y.bolumler.flatMap((b) => b.sahneler)].filter((k) => k.tur === 'sahne' && k.karar !== 'vazgecildi').map((k) => k.kod));
    kapsam = new Set(sahneler);
    for (const b of e.db.selectObjects('SELECT DISTINCT kaynak,hedef FROM baglantilar')) if (sahneler.has(b.kaynak as string)) kapsam.add(b.hedef as string);
    for (const i of iliskiler) {
      if (sahneler.has(i.a as string) && ['anlatir', 'sahne_yeri'].includes(i.tur as string)) kapsam.add(i.b as string);
      if (sahneler.has(i.b as string) && i.tur === 'sahnede') kapsam.add(i.a as string);
    }
    // Başka eserin sahnesine yapılan atıf, o sahneyi bu eserin sahnesi yapmaz.
    for (const k of tum) if (k.tur === 'sahne' && !sahneler.has(k.kod as string)) kapsam.delete(k.kod as string);
  }
  const secilen = tum.filter((k) => (!kapsam || kapsam.has(k.kod as string)) && (!s.tur || k.tur === s.tur));
  const tarihler = new Map(cizelgeOku().map((k) => [k.kod, k.tarih]));
  const ilgili = new Set(secilen.flatMap((k) => [k.kod as string, ...(k.sahne_olayi ? [k.sahne_olayi as string] : [])]));
  const h = s.harita ? haritaOku(s.harita) : null;
  if (s.eser) { ilgili.add(s.eser); for (const k of tum) if (k.tur === 'sahne' || k.tur === 'bolum') ilgili.add(k.kod as string); }
  if (h) { ilgili.add(h.kod); for (const i of [...h.isaretler, ...h.cizimler]) { ilgili.add(i.kod); ilgili.add(i.kayit.kod); } }
  for (const i of iliskiler) if (ilgili.has(i.a as string) || ilgili.has(i.b as string)) ilgili.add(i.kod as string);
  const cakisma = e.db.selectObjects('SELECT nesne,alan FROM alan_yazanlari GROUP BY nesne,alan HAVING count(DISTINCT deger)>1');
  if (cakisma.some((c) => c.nesne === 'evren' && /^(takvim|akis)/.test(c.alan as string) || ilgili.has(c.nesne as string) && ['tarih', 'anlati', 'konum', 'noktalar', 'kayit', 'baslangic', 'bitis', 'tur', 'karar', 'gorunurluk', 'a', 'b', 'kip'].includes(c.alan as string))) throw new Error('Saymadan önce kapsamdaki tarih, eser yapısı ya da konum seçimlerindeki çelişkileri inceleyin.');
  const yerler = new Map<string, string[]>();
  for (const i of iliskiler) if (i.tur === 'sahne_yeri') yerler.set(i.a as string, [...(yerler.get(i.a as string) ?? []), i.b as string]);
  const kayitlar: SayimKaydi[] = secilen.map((k) => {
    const kod = k.kod as string;
    const d = k.tur === 'sahne' ? metinBelgesi(e.db, kod, 'govde') : null;
    return { kod, ad: k.ad as string, tur: k.tur as string, tarih: tarihler.get(kod) ?? (k.sahne_olayi ? tarihler.get(k.sahne_olayi as string) : null) ?? null,
      kelime: d ? kelimeSay(duzMetin(A.spans(d, ['t']) as never)) : 0, yerler: yerler.get(kod) ?? (k.sahne_olayi ? yerler.get(k.sahne_olayi as string) : []) ?? [] };
  });
  const sonuc = say(kayitlar, z, s, h);
  return { ...sonuc, eserler, haritalar: haritaListesi.map((h) => ({ kod: h.kod, ad: h.ad })), turler: [...new Set(tum.map((k) => k.tur as string))].sort(turkceKarsilastir), harita: h ? { kod: h.kod, ad: h.ad } : null,
    zarf: { tur: 'bu kurallara göre zorunlu sonuç', hukum: 'çözüm bulundu', guncellik: 'güncel',
      kapsam: `${s.baslangic} – ${s.bitis}; ${s.adim} yıllık dilimler; ${s.eser ? eserler.find((e) => e.kod === s.eser)!.ad : 'bütün eserler ve kayıtlar'}; ${s.tur ?? 'bütün kayıt türleri'}; ${h?.ad ?? 'harita seçilmedi'}`,
      dayanak: [`Ana takvim: ${z.ana.ad}, ${z.ana.surum}. sürüm.`, `${kayitlar.length} ayrı kayıt; her kaydın dağılımı ve sayıldığı yerler aşağıda listelenir.`, 'Olay, sahne, kelime ve kayıt ayrı ayrı sayılır; biri ötekinin yerine geçmez.'],
      varsayimlar: ['Zaman dilimleri seçilen başlangıç yılında başlar. Tarih bütünüyle tek dilimdeyse kesin sayılır; diğer olası dilimlerde yalnızca üst sınıra katılır. Üst sınırlar toplanamaz.',
        'Eser kapsamı: kendi sahneleri, bu sahnelerin metin bağlantıları, anlattığı olaylar, seçilmiş yerler ve açıkça bağlanmış katılımcılar. Serbest yazıdan anlam çıkarılmaz.',
        'Kelime sayısına yalnızca sahnelerin metni girer. Özet ve notlar sayılmaz.',
        'Harita dağılımı zaman şeridinden bağımsızdır ve aynı eser ile tür kapsamındaki bütün kayıtlı konumları sayar. Tarihli bölge çizimleri ayrı adlarıyla gösterilir, sınırların dönemleri birleştirilmez.',
        'Yaklaşık konumun dairesi bütünüyle bölgedeyse kesin, sınırı kesiyorsa belirsizdir. Birden çok konum seçeneğinde ortak kesin bölgeler alt, olası bölgeler üst sınıra katılır. Konum seçeneklerinden biri bilinmiyorsa kayıt konumsuz grubunda tutulur.',
        'Örtüşen bölgeler aynı kaydı içerebilir, bu yüzden bölge sayıları toplanamaz. Tarihsiz ve konumsuz kayıtlar sayıma girmez ama ayrı bir grupta gösterilir.'] } };
}
