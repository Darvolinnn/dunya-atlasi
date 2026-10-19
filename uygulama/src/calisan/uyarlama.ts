// F35 / §9.7, kullanım sözleşmesi (§18.2): yazarın iki eser veya eser/deneme kopyası arasında seçtiği
// kayıtların karşılıklarını ve son gözden geçirmeden sonraki değişiklikleri listeler. Eşleme dışında hiçbir
// kaydı değiştirmez; eser/baskı/okur bilgisi veya yayın kilidi taşımaz, birleştirme ve aktarım yapmaz (F18).
// En sade yorum: A ana evrendeki eserdir, B başka eser ya da bir deneme kopyasındaki eserdir. Sıra, yazarın
// sıraladığı iki listedir; otomatik olay eşleştirmesi yapılmaz. Eser bağlamı üyelik iddiası değildir.
// Tanım ve gözden geçirme tek alan olarak çatışır: eski tanım için verilen onay yeni tanımı gizlice onaylamaz.
// Takip saatle değil görülen işlem sıralarıyla yapılır; geç eşitlenen ve eşzamanlı işlemler de görülür.
import type { Islem, IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { UYARLAMA_TURLERI } from '../alan/uyarlama';
import type { Catisma, KisaKayit, UyarlamaAdaylari, UyarlamaEslemesi, UyarlamaKaydi, UyarlamaTanimi, UyarlamaTarafi, UyarlamaTarafGorunumu } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { eserYapisi } from './anlati';

export interface UyarlamaBaglami { e: EvrenVt; dalAc(kod: string): EvrenVt; yaz(g: IslemGirdisi[], k: string[]): void }
type Gorulen = Record<string, number>;
interface Deger { tanim: UyarlamaTanimi; gorulen: { a: Gorulen; b: Gorulen } }
interface Sakli { kod: string; deger: Deger; silindi: boolean }
const anahtar = (e: EvrenVt, k: string) => yonlendir(e.db, k);
function sakli(e: EvrenVt, kod: string): Sakli {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM uyarlama_eslemeleri WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('Uyarlama eşlemesi bulunamadı.');
  return { kod, deger: JSON.parse(r.deger as string), silindi: !!r.silindi };
}
function catismali(e: EvrenVt, kod: string): boolean {
  return !!e.db.selectValue("SELECT 1 FROM alan_yazanlari WHERE nesne=? AND alan IN ('uyarlama_esleme','uyarlama_silindi') GROUP BY alan HAVING count(DISTINCT deger)>1 LIMIT 1", [kod]);
}
function dalOku(b: UyarlamaBaglami, dal: string | null) {
  if (!dal) return { e: b.e, dal: null, sorun: null };
  const r = b.e.db.selectObject('SELECT ad,silindi FROM dallar WHERE kod=?', [dal]);
  const durum = !r ? 'yok' as const : r.silindi !== null ? 'silindi' as const : 'etkin' as const;
  const d = { kod: dal, ad: (r?.ad as string) ?? 'Bulunamayan deneme kopyası', durum };
  if (durum !== 'etkin') return { e: null, dal: d, sorun: durum === 'silindi' ? 'Deneme kopyası kaldırılmış.' : 'Deneme kopyası bulunamadı.' };
  try { return { e: b.dalAc(dal), dal: d, sorun: null }; }
  catch { return { e: null, dal: d, sorun: 'Deneme kopyası bu cihazda açılamıyor.' }; }
}
function kayit(e: EvrenVt | null, kod: string): UyarlamaKaydi {
  const yeni = e ? anahtar(e, kod) : kod;
  const r = e?.db.selectObject('SELECT ad,tur,silindi FROM kayitlar WHERE kod=?', [yeni]);
  return { kod: yeni, sakliKod: kod, ad: (r?.ad as string) ?? 'Bulunamayan kayıt', tur: (r?.tur as string) ?? 'diger', silindi: !!r?.silindi, bulunamadi: !r };
}
function etkinKayit(e: EvrenVt, kod: unknown, eser = false): string {
  if (!kodGecerliMi(kod)) throw new Error(eser ? 'Eseri seçin.' : 'Eşlenecek kaydı seçin.');
  const k = kayit(e, kod);
  if (k.bulunamadi || k.silindi || eser && k.tur !== 'eser') throw new Error(eser ? 'Eser bulunamadı veya kaldırılmış.' : 'Eşlenecek kayıt bulunamadı veya kaldırılmış.');
  return k.kod;
}
function dogrula(b: UyarlamaBaglami, t: UyarlamaTanimi): UyarlamaTanimi {
  if (!t || !UYARLAMA_TURLERI.some((x) => x.kod === t.tur)) throw new Error('Eşlemenin türünü seçin.');
  if (typeof t.not !== 'string' || t.not.length > 2000) throw new Error('Eşleme notu en çok 2.000 harf olabilir.');
  if (!t.a || !t.b || t.a.dal !== null) throw new Error('İlk taraf ana evrendeki bir eser olmalı.');
  const taraf = (s: UyarlamaTarafi): UyarlamaTarafi => {
    if (s.dal !== null && !kodGecerliMi(s.dal)) throw new Error('Deneme kopyasını seçin.');
    const x = dalOku(b, s.dal);
    if (!x.e) throw new Error(x.sorun!);
    if (!Array.isArray(s.kayitlar) || s.kayitlar.length > 100) throw new Error('Bir tarafta en çok 100 kayıt seçilebilir.');
    const eser = etkinKayit(x.e, s.eser, true), kayitlar = s.kayitlar.map((k) => etkinKayit(x.e!, k));
    if (new Set(kayitlar).size !== kayitlar.length) throw new Error('Aynı kayıt bir tarafta birden çok kez seçilemez.');
    return { eser, dal: s.dal, kayitlar };
  };
  const a = taraf(t.a), c = taraf(t.b);
  if (!a.kayitlar.length || (t.tur !== 'cikarildi' && !c.kayitlar.length)) throw new Error('Karşılaştırılacak kayıtları seçin.');
  if (t.tur === 'cikarildi' && c.kayitlar.length) throw new Error('Çıkarılmış karşılıkta ikinci tarafın kayıt listesi boş olmalı.');
  if (t.tur === 'indirgeme' && (a.kayitlar.length < 2 || c.kayitlar.length !== 1)) throw new Error('İndirgeme için ilk tarafta en az iki, ikinci tarafta tek kayıt seçin.');
  if (t.tur === 'sira' && (a.kayitlar.length < 2 || c.kayitlar.length < 2)) throw new Error('Sıra karşılaştırması için iki tarafta da en az iki kayıt seçin.');
  if (a.eser === c.eser && !c.dal) throw new Error('İkinci tarafta başka bir eser veya deneme kopyası seçin.');
  return { a, b: c, tur: t.tur, not: t.not.trim() };
}
const ilgili = (t: UyarlamaTanimi) => [...new Set([t.a.eser, t.b.eser, ...t.a.kayitlar, ...t.b.kayitlar])];
function gorulen(b: UyarlamaBaglami, t: UyarlamaTanimi, once?: Deger['gorulen']): Deger['gorulen'] {
  const al = (s: UyarlamaTarafi, eski: Gorulen = {}) => {
    const g = dalOku(b, s.dal).e?.gorulenler() ?? {};
    return Object.fromEntries([...new Set([...Object.keys(eski), ...Object.keys(g)])].map((k) => [k, Math.max(eski[k] ?? 0, g[k] ?? 0)]));
  };
  return { a: al(t.a, once?.a), b: al(t.b, once?.b) };
}
function gerideMi(b: UyarlamaBaglami, d: Deger): boolean {
  return (['a', 'b'] as const).some((taraf) => {
    const e = dalOku(b, d.tanim[taraf].dal).e;
    return e && Object.entries(d.gorulen[taraf]).some(([k, n]) => (e.gorulenler()[k] ?? 0) < n);
  });
}
export function yaz(b: UyarlamaBaglami, kod: string | null, tanim: UyarlamaTanimi) {
  if (kod && sakli(b.e, kod).silindi) throw new Error('Kaldırılmış eşleme değiştirilemez.');
  if (kod && catismali(b.e, kod)) throw new Error('Önce eşlemenin çelişen seçimlerini inceleyin.');
  if (kod && gerideMi(b, sakli(b.e, kod).deger)) throw new Error('Son gözden geçirmenin dayandığı değişiklikler bu cihaza ulaşmadan eşlemeyi değiştirmeyin.');
  const t = dogrula(b, tanim), yeni = kod ?? yeniKod();
  b.yaz([{ tur: 'uyarlama_yaz', veri: { kod: yeni, deger: { tanim: t, gorulen: gorulen(b, t) } } }], ilgili(t));
  return { kod: yeni };
}
export function sil(b: UyarlamaBaglami, kod: string) {
  const r = sakli(b.e, kod);
  if (!r.silindi) b.yaz([{ tur: 'uyarlama_sil', veri: { kod, silindi: true } }], ilgili(r.deger.tanim));
}
export function gozdenGecir(b: UyarlamaBaglami, kod: string) {
  const r = sakli(b.e, kod);
  if (r.silindi) throw new Error('Kaldırılmış eşleme gözden geçirilemez.');
  if (catismali(b.e, kod)) throw new Error('Önce eşlemenin çelişen seçimlerini inceleyin.');
  if (gerideMi(b, r.deger)) throw new Error('Son gözden geçirmenin dayandığı değişiklikler bu cihaza ulaşmadan yeniden onaylanamaz.');
  b.yaz([{ tur: 'uyarlama_gozden_gecir', veri: { kod, deger: { tanim: r.deger.tanim, gorulen: gorulen(b, r.deger.tanim, r.deger.gorulen) } } }], ilgili(r.deger.tanim));
}
export function adaylar(b: UyarlamaBaglami, dal: string | null): UyarlamaAdaylari {
  const x = dalOku(b, dal);
  if (!x.e) return { eserler: [], kayitlar: [], sorun: x.sorun };
  const kayitlar: KisaKayit[] = x.e.db.selectObjects('SELECT kod,ad,tur FROM kayitlar WHERE silindi IS NULL ORDER BY ad,kod').map((r) => ({ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }));
  return { kayitlar, eserler: kayitlar.filter((k) => k.tur === 'eser'), sorun: null };
}

/** Yalnızca yapılandırılmış kimlik alanları incelenir; serbest yazı taranmaz. */
function etki(e: EvrenVt, i: Islem, hedefler: Set<string>, eserKayitlari: Set<string>): string | null {
  const v = i.veri;
  const varMi = (x: unknown) => typeof x === 'string' && (hedefler.has(x) || hedefler.has(anahtar(e, x)));
  if (i.tur === 'kayit_degistir' && ['ad', 'tur'].includes(String(v.alan)) && varMi(v.kod)) return v.alan === 'ad' ? 'Kayıt adı değişti.' : 'Kayıt türü değişti.';
  if (i.tur === 'kayit_tarih' && varMi(v.kod)) return 'Kayıt tarihi değişti.';
  if (['takvim_yaz', 'akis_yaz'].includes(i.tur)) return 'Tarihlerin dayandığı takvim veya zaman akışı değişti.';
  if (['kayit_sil', 'kayit_geri_yukle'].includes(i.tur) && varMi(v.kod)) return i.tur === 'kayit_sil' ? 'Kayıt kaldırıldı.' : 'Kayıt geri getirildi.';
  if (['kayit_birlestir', 'birlesme_geri_al'].includes(i.tur) && (varMi(v.kaynak) || varMi(v.hedef))) return 'Kaydın birleştirilmesi değişti.';
  if (i.tur === 'anlati_yerlestir' && (varMi(v.kod) || eserKayitlari.has(String(v.kod)) || eserKayitlari.has(String(v.ust)) || eserKayitlari.has(String((v.onceki as { ust?: string } | null)?.ust)))) return 'Eserin okuma sırası veya yerleşimi değişti.';
  if (i.tur.startsWith('iliski_')) {
    const r = typeof v.kod === 'string' ? e.db.selectObject('SELECT a,b,tur FROM iliskiler WHERE kod=?', [v.kod]) : undefined;
    if ((varMi(v.a) || varMi(v.b) || varMi(r?.a) || varMi(r?.b)) && ['sahnede', 'olayda', 'anlatir'].includes(String(r?.tur ?? v.tur ?? v.iliski))) return 'Katılımcı veya anlatılan olay bağı değişti.';
  }
  return null;
}
function tarafOku(b: UyarlamaBaglami, s: UyarlamaTarafi, eski: Gorulen, taraf: 'a' | 'b') {
  const x = dalOku(b, s.dal), e = x.e;
  const gorunum: UyarlamaTarafGorunumu = { eser: kayit(e, s.eser), dal: x.dal, kayitlar: s.kayitlar.map((k) => kayit(e, k)) };
  const uyarilar: string[] = x.sorun ? [x.sorun] : [];
  if (gorunum.eser.bulunamadi || gorunum.eser.silindi) uyarilar.push('Tarafın eseri bulunamıyor veya kaldırılmış.');
  if (gorunum.kayitlar.some((k) => k.silindi || k.bulunamadi)) uyarilar.push('Eşlenen kayıtlardan biri bulunamıyor veya kaldırılmış.');
  const degisiklikler: UyarlamaEslemesi['degisiklikler'] = [];
  if (e) {
    const simdi = e.gorulenler();
    if (Object.entries(eski).some(([k, n]) => (simdi[k] ?? 0) < n)) uyarilar.push('Son gözden geçirmenin dayandığı değişikliklerin bir kısmı bu cihaza henüz ulaşmamış.');
    const hedefler = new Set([s.eser, ...s.kayitlar, ...gorunum.kayitlar.map((k) => k.kod), gorunum.eser.kod]);
    const dogrudan = new Set(hedefler);
    for (const i of e.db.selectObjects("SELECT a,b FROM iliskiler WHERE tur IN ('sahnede','olayda','anlatir')")) {
      if (dogrudan.has(i.a as string) || dogrudan.has(i.b as string)) { hedefler.add(i.a as string); hedefler.add(i.b as string); }
    }
    for (const k of gorunum.kayitlar) {
      let alt = k.kod;
      const ziyaret = new Set<string>();
      for (let n = 0; n < 20 && !ziyaret.has(alt); n++) {
        ziyaret.add(alt);
        const ust = e.db.selectValue('SELECT ust FROM anlati WHERE kod=?', [alt]) as string | undefined;
        if (!ust) break;
        hedefler.add(ust); alt = ust;
      }
    }
    const y = eserYapisi(e, gorunum.eser.kod);
    const eserKayitlari = new Set([s.eser, gorunum.eser.kod, ...y.dogrudan.map((k) => k.kod), ...y.bolumler.flatMap((c) => [c.kod, ...c.sahneler.map((k) => k.kod)])]);
    for (const i of e.gorulmeyenler(eski)) {
      const aciklama = etki(e, i, hedefler, eserKayitlari);
      if (aciklama) degisiklikler.push({ taraf, islem: i.kod, aciklama });
    }
  }
  return { gorunum, uyarilar, degisiklikler };
}
export function liste(b: UyarlamaBaglami, eser: string | null): UyarlamaEslemesi[] {
  const sonuc: UyarlamaEslemesi[] = [];
  for (const r of b.e.db.selectObjects('SELECT kod,deger,silindi FROM uyarlama_eslemeleri ORDER BY kod')) {
    const kod = r.kod as string, d = JSON.parse(r.deger as string) as Deger, t = d.tanim;
    const c = catismali(b.e, kod);
    if (r.silindi && !c) continue;
    if (eser && anahtar(b.e, t.a.eser) !== anahtar(b.e, eser) && (t.b.dal || anahtar(b.e, t.b.eser) !== anahtar(b.e, eser))) continue;
    const a = tarafOku(b, t.a, d.gorulen.a, 'a'), z = tarafOku(b, t.b, d.gorulen.b, 'b');
    const degisiklikler = [...a.degisiklikler, ...z.degisiklikler];
    // Dal kaldırılması ana evren günlüğündedir; B'nin kendi günlüğünde bulunmaz.
    if (t.b.dal) for (const i of b.e.gorulmeyenler(d.gorulen.a)) if (['dal_sil', 'dal_geri_yukle'].includes(i.tur) && i.veri.kod === t.b.dal) degisiklikler.push({ taraf: 'b', islem: i.kod, aciklama: i.tur === 'dal_sil' ? 'Deneme kopyası kaldırıldı.' : 'Deneme kopyası geri getirildi.' });
    sonuc.push({ kod, tanim: t, a: a.gorunum, b: z.gorunum, etkilenmis: degisiklikler.length > 0, catismali: c, silindi: !!r.silindi, degisiklikler, uyarilar: [...new Set([...a.uyarilar, ...z.uyarilar])] });
  }
  return sonuc;
}
export function catismaSatiri(nesne: string, alan: string, degerler: { islem: string; deger: unknown; kurulum: string; zaman: number }[]): Catisma {
  return { tur: 'alan', nesne, alan, nesneTuru: 'evren', kayit: null, baslik: 'Uyarlama eşlemesi', alanEtiketi: alan === 'uyarlama_esleme' ? 'Eşleme ve gözden geçirme' : 'Eşlemenin kaldırılması',
    degerler: degerler.map((d) => { const t = (d.deger as Deger | null)?.tanim; return { ...d, yazi: alan === 'uyarlama_silindi' ? d.deger ? 'Kaldırıldı' : 'Kaldırılmadı' : t ? `${UYARLAMA_TURLERI.find((x) => x.kod === t.tur)?.ad}; ${t.a.kayitlar.length} kayıt → ${t.b.kayitlar.length} kayıt; ${t.not}` : 'Eşleme yazılmamış' }; }) };
}
export function cozumGirdisi(kod: string, alan: string, deger: unknown): IslemGirdisi {
  return alan === 'uyarlama_silindi' ? { tur: 'uyarlama_sil', veri: { kod, silindi: !!deger, cozum: true } } : { tur: 'uyarlama_yaz', veri: { kod, deger, sadeceTanim: true, cozum: true } };
}
