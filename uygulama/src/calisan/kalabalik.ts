// F40: alt gruplar gözlem anına aittir; olaylardan alt grup değişikliği çıkarılmaz.
// Aynı zaman aralığındaki gözlem ve olayın sırası bilinmiyorsa olay koşullu hesaba katılır.
// Adı bilinen üyeler, kesin kişi üyeliklerinin geçmiş listesidir; tarihteki nüfus hesabına katılmaz.
import { altGrupFarki, ayrikMi, KALABALIK_TURLERI, KALABALIK_OLAY_ADLARI, miktarDogrula, miktarEkle, miktarYaz } from '../alan/kalabalik';
import { yeniKod, kodGecerliMi } from '../alan/kod';
import type { IslemGirdisi } from '../alan/islem';
import { tarihCoz, type EvrenTarihi } from '../alan/tarih';
import type { Catisma, KalabalikGozlemi, KalabalikOlayi, KalabalikSatiri, KalabalikSonucu, SinirGirdisi } from '../veri/api';
import { sinirBilgisi, sinirCoz, temiz, type DurumBaglami } from './durum';
import { zamanSetiOku, yonlendir } from './izdusum';

type Bicim = 'gozlem' | 'olay';
type Tanim = KalabalikGozlemi | KalabalikOlayi;
const tablo = (b: Bicim) => b === 'gozlem' ? 'kalabalik_gozlemleri' : 'kalabalik_olaylari';
const bicimDogrula = (b: Bicim) => { if (b !== 'gozlem' && b !== 'olay') throw new Error('Gözlem ya da olay seçin.'); };
function sahip(b: DurumBaglami, kod: string): string {
  if (!kodGecerliMi(kod)) throw new Error('Kalabalık kaydı bulunamadı.');
  const k = yonlendir(b.e.db, kod);
  const r = b.e.db.selectObject('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  if (!r || !KALABALIK_TURLERI.includes(String(r.tur))) throw new Error('Toplu sayım yalnızca topluluk ve kafile kayıtlarında tutulur.');
  return k;
}
function tarihDogrula(b: DurumBaglami, g: SinirGirdisi): SinirGirdisi {
  if (!g || typeof g !== 'object') throw new Error('Bir tarih girin veya olay seçin.');
  if (g.olay && g.ifade?.trim()) throw new Error('Tarih ya da olay dayanağından birini seçin.');
  const t: SinirGirdisi = g.olay ? { olay: yonlendir(b.e.db, g.olay), fark: temiz(g.fark, 120) } : { ifade: temiz(g.ifade, 120, false) };
  if (t.olay && b.e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND tur='olay' AND silindi IS NULL", [t.olay]) === undefined) throw new Error('Bir olay kaydı seçin.');
  if (!sinirCoz(b, t)) throw new Error('Bir tarih girin veya olay seçin.');
  return t;
}
export function yaz(b: DurumBaglami, bicim: Bicim, kod: string | null, t: Tanim): { kod: string } {
  bicimDogrula(bicim);
  if (!t || typeof t !== 'object') throw new Error('Sayım bilgisi eksik.');
  const kayit = sahip(b, t.kayit);
  const ortak = { kayit, tarih: tarihDogrula(b, t.tarih), miktar: miktarDogrula(t.miktar), not: temiz(t.not, 1000) };
  let deger: Tanim;
  if (bicim === 'gozlem') {
    const g = t as KalabalikGozlemi;
    if (!Array.isArray(g.altGruplar) || g.altGruplar.length > 50 || !Array.isArray(g.ortusmeler) || g.ortusmeler.length > 1225) throw new Error('En çok 50 alt grup tanımlanabilir.');
    const altGruplar = g.altGruplar.map((a) => {
      if (!a || !kodGecerliMi(a.kod)) throw new Error('Alt grup bulunamadı.');
      const miktar = miktarDogrula(a.miktar);
      if (miktar.enAz > ortak.miktar.enCok) throw new Error('Alt grup toplamdan büyük olamaz.');
      return { kod: a.kod, ad: temiz(a.ad, 100, false), miktar };
    });
    if (new Set(altGruplar.map((a) => a.kod)).size !== altGruplar.length) throw new Error('Aynı alt grup iki kez eklenemez.');
    const ciftler = new Set<string>();
    const ortusmeler = g.ortusmeler.map((o) => {
      const a = altGruplar.find((x) => x.kod === o.a), z = altGruplar.find((x) => x.kod === o.b);
      const cift = [o.a, o.b].sort().join(':');
      if (!a || !z || a === z || ciftler.has(cift)) throw new Error('Örtüşme için iki farklı alt grup seçin; aynı çifti bir kez yazın.');
      ciftler.add(cift);
      const miktar = miktarDogrula(o.miktar);
      if (miktar.enCok > Math.min(a.miktar.enCok, z.miktar.enCok)) throw new Error('Örtüşme iki alt gruptan büyük olamaz.');
      altGrupFarki(a.miktar, z.miktar, ortak.miktar, miktar);
      return { a: a.kod, b: z.kod, miktar };
    });
    for (let i = 0; i < altGruplar.length; i++) for (let j = i + 1; j < altGruplar.length; j++) altGrupFarki(altGruplar[i].miktar, altGruplar[j].miktar, ortak.miktar, null);
    deger = { ...ortak, altGruplar, ortusmeler };
  } else {
    const tur = (t as KalabalikOlayi).tur;
    if (!Object.hasOwn(KALABALIK_OLAY_ADLARI, tur)) throw new Error('Katılma, ayrılma ya da ölüm seçin.');
    deger = { ...ortak, tur };
  }
  if (kod) {
    if (!kodGecerliMi(kod)) throw new Error('Sayım bulunamadı.');
    const r = b.e.db.selectObject(`SELECT deger,silindi FROM ${tablo(bicim)} WHERE kod=?`, [kod]);
    if (!r || r.silindi) throw new Error('Sayım bulunamadı veya kaldırılmış.');
    if (yonlendir(b.e.db, (JSON.parse(r.deger as string) as Tanim).kayit) !== kayit) throw new Error('Sayımın bağlı olduğu kalabalık değiştirilemez.');
  }
  const k = kod ?? yeniKod();
  b.yaz([{ tur: `kalabalik_${bicim}_yaz`, veri: { kod: k, deger, ilk: !kod } }], [kayit]);
  return { kod: k };
}
export function kaldir(b: DurumBaglami, bicim: Bicim, kod: string, geriYukle: boolean): void {
  bicimDogrula(bicim);
  const r = b.e.db.selectObject(`SELECT deger FROM ${tablo(bicim)} WHERE kod=?`, [kod]);
  if (!r) throw new Error('Sayım bulunamadı.');
  const kayit = sahip(b, (JSON.parse(r.deger as string) as Tanim).kayit);
  b.yaz([{ tur: `kalabalik_${bicim}_sil`, veri: { kod, silindi: !geriYukle } }], [kayit]);
}
function satirlar<T extends Tanim>(b: DurumBaglami, bicim: Bicim, kayit: string): KalabalikSatiri<T>[] {
  const sonuc: KalabalikSatiri<T>[] = [];
  for (const r of b.e.db.selectObjects(`SELECT * FROM ${tablo(bicim)} ORDER BY kod`)) {
    const tanim = JSON.parse(r.deger as string) as T;
    if (yonlendir(b.e.db, tanim.kayit) !== kayit) continue;
    const catismali = !!b.e.db.selectValue("SELECT 1 FROM alan_yazanlari WHERE nesne=? AND alan LIKE 'kalabalik_%' GROUP BY alan HAVING count(DISTINCT deger)>1", [r.kod!]);
    let tarih = null;
    // Silinmiş olay dayanağının tarihi bilinmiyor sayılır; tarih uydurulmaz.
    if (!tanim.tarih.olay || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [yonlendir(b.e.db, tanim.tarih.olay)])) {
      tarih = sinirBilgisi(b, sinirCoz(b, { ...tanim.tarih, olay: tanim.tarih.olay ? yonlendir(b.e.db, tanim.tarih.olay) : null }));
    }
    sonuc.push({ kod: r.kod as string, tanim, tarih, silindi: !!r.silindi, catismali });
  }
  return sonuc;
}
function eksen(t: EvrenTarihi | null | undefined): [number, number] | null {
  const a = t?.eksen;
  return a && a.enErken !== null && a.enGec !== null ? [a.enErken, a.enGec] : null;
}
export function oku(b: DurumBaglami, kod: string, tarih: string | null): KalabalikSonucu {
  const kayit = sahip(b, kod);
  const gozlemler = satirlar<KalabalikGozlemi>(b, 'gozlem', kayit), olaylar = satirlar<KalabalikOlayi>(b, 'olay', kayit);
  const uyarilar = new Set<string>();
  const uyeler = b.e.db.selectObjects("SELECT DISTINCT k.kod,k.ad,k.tur FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.b=? AND i.tur='uye' AND i.silindi IS NULL AND k.silindi IS NULL AND k.tur='karakter' AND i.karar='kesin' ORDER BY k.ad", [kayit]).map((r) => ({ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }));
  const sonuc: KalabalikSonucu = { gozlemler, olaylar, uyeler, tahminler: [], uyarilar: [] };
  const an = tarih ? eksen(tarihCoz(tarih, zamanSetiOku(b.e.db))) : null;
  if (!an) { sonuc.uyarilar.push(tarih ? 'Seçilen tarih sayısal sıraya yerleştirilemiyor; tahmin hesaplanmadı.' : 'Tahmin için bir evren tarihi girin.'); return sonuc; }
  const etkinG = gozlemler.filter((g) => !g.silindi && !g.catismali);
  const etkinO = olaylar.filter((g) => !g.silindi && !g.catismali);
  if ([...gozlemler, ...olaylar].some((g) => g.catismali)) uyarilar.add('İki cihazda farklı yazılan sayımlar çözülene kadar tahmine katılmadı. Tahmin eksik olabilir.');
  const adaylar = etkinG.filter((g) => {
    const x = eksen(g.tarih?.tarih);
    if (!x) { uyarilar.add('Tarihi sıralanamayan gözlem tahmine katılmadı.'); return false; }
    if (x[0] > an[1]) return false;
    if (x[1] > an[0] && !(x[0] === an[0] && x[1] === an[1])) { uyarilar.add('Seçilen tarihle kısmen örtüşen gözlem tahmine katılmadı.'); return false; }
    return true;
  });
  for (const g of adaylar) {
    const bas = eksen(g.tarih!.tarih)!;
    let miktar = g.tanim.miktar, belirsiz = false;
    const kullanilan: string[] = [];
    for (const o of etkinO) {
      const t = eksen(o.tarih?.tarih);
      if (!t) {
        uyarilar.add('Tarihi sıralanamayan olayın hangi gözlemden sonra olduğu bilinmiyor; sonuç koşulludur.');
        miktar = miktarEkle(miktar, o.tanim.miktar, o.tanim.tur !== 'katilma', true); belirsiz = true; kullanilan.push(o.kod); continue;
      }
      if (t[1] < bas[0] || t[0] > an[1]) continue;
      const kosullu = !(t[0] > bas[1] && t[1] <= an[0]);
      miktar = miktarEkle(miktar, o.tanim.miktar, o.tanim.tur !== 'katilma', kosullu);
      belirsiz ||= kosullu; kullanilan.push(o.kod);
    }
    const sonGozlem = !adaylar.some((d) => eksen(d.tarih!.tarih)![0] > bas[1]);
    sonuc.tahminler.push({ gozlem: g.kod, miktar, olaylar: kullanilan, sonGozlem, uyusmaz: false, belirsiz });
  }
  const sonlar = sonuc.tahminler.filter((t) => t.sonGozlem);
  for (const t of sonuc.tahminler) t.uyusmaz = sonlar.some((s) => s !== t && ayrikMi(s.miktar, t.miktar));
  // Son gözlem ile uyuşmayan eski dayanak korunur; uyumlu eski gözlem ayrıca toplam sayılmaz.
  sonuc.tahminler = sonuc.tahminler.filter((t) => t.sonGozlem || t.uyusmaz);
  if (sonuc.tahminler.some((t) => t.uyusmaz)) {
    for (const t of sonlar) t.uyusmaz = true;
    uyarilar.add('Gözlem ile olaylardan gelen sayım uyuşmuyor. Dayanaklar yan yana gösteriliyor; birine öncelik verilmedi.');
  }
  if (sonuc.tahminler.some((t) => t.miktar.enAz < 0)) uyarilar.add('Olaylar toplamı sıfırın altına indiriyor; sayımları inceleyin.');
  if (!sonuc.tahminler.length) uyarilar.add('Bu tarihte dayanak alınabilecek bir gözlem yok.');
  sonuc.uyarilar = [...uyarilar];
  return sonuc;
}
export function catismaSatiri(b: DurumBaglami, nesne: string, alan: string, degerler: Extract<Catisma, { tur: 'alan' }>['degerler']): Catisma {
  const bicim: Bicim = alan.startsWith('kalabalik_gozlem') ? 'gozlem' : 'olay';
  const r = b.e.db.selectObject(`SELECT deger FROM ${tablo(bicim)} WHERE kod=?`, [nesne]);
  const kayit = r ? yonlendir(b.e.db, (JSON.parse(r.deger as string) as Tanim).kayit) : null;
  return { tur: 'alan', nesne, alan, nesneTuru: 'kayit', kayit, baslik: 'Kalabalık sayımı', alanEtiketi: alan.endsWith('_silindi') ? 'Sayımın kaldırılması' : bicim === 'gozlem' ? 'Kalabalık gözlemi' : 'Kalabalığı değiştiren olay',
    degerler: degerler.map((d) => ({ ...d, yazi: alan.endsWith('_silindi') ? d.deger ? 'Kaldırıldı' : 'Kaldırılmadı' : tanimYaz(b, d.deger as Tanim) })) };
}
function tanimYaz(b: DurumBaglami, t: Tanim): string {
  const alt = 'altGruplar' in t ? `; alt gruplar: ${t.altGruplar.map((a) => `${a.ad}: ${miktarYaz(a.miktar)}`).join(', ') || 'yok'}; örtüşmeler: ${t.ortusmeler.map((o) => `${t.altGruplar.find((a) => a.kod === o.a)?.ad} / ${t.altGruplar.find((a) => a.kod === o.b)?.ad}: ${miktarYaz(o.miktar)}`).join(', ') || 'bilinmiyor'}` : `; ${KALABALIK_OLAY_ADLARI[t.tur]}`;
  const dayanak = t.tarih.olay ? `${b.e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [yonlendir(b.e.db, t.tarih.olay)]) ?? 'Silinmiş olay'} ${t.tarih.fark ?? ''}` : t.tarih.ifade;
  return `${dayanak}: ${miktarYaz(t.miktar)}${alt}; ${t.not}`;
}
export function cozumGirdisi(kod: string, alan: string, deger: unknown): IslemGirdisi {
  const bicim = alan.startsWith('kalabalik_gozlem') ? 'gozlem' : 'olay';
  return alan.endsWith('_silindi') ? { tur: `kalabalik_${bicim}_sil`, veri: { kod, silindi: !!deger, cozum: true } } : { tur: `kalabalik_${bicim}_yaz`, veri: { kod, deger, cozum: true } };
}
