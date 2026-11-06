// F26 kullanım sözleşmesi (§18.2): Bu konuda kimin hangi hakkı/yükümlülüğü kayıtlı?
// En az tür, konu ve bir sahip gerekir. Süre yoksa zamanı belirsizdir; kayıt yokluğu hak yokluğu değildir.
// Kayıtlar, tarih sınırları ve tanımalar okunur; yalnızca hak ve tanıma işlemleri yazılır.
// Hukuk kurallarından hak, kapsam/koşul yazısından anlam veya fiilî kontrol çıkarılmaz.
// Kabul örneği: iki otoritenin farklı tanıması yan yana kalır; aynı dönemde iki mülkiyet yalnızca bilgidir.
import { yeniKod, kodGecerliMi } from '../alan/kod';
import { gecerlilik, type Sinir, type Gecerlilik } from '../alan/durum';
import { kararGecerli, KARARLAR } from '../alan/turler';
import { farkYazisi, karsilastir, tarihCoz } from '../alan/tarih';
import type { HakGirdisi, HakTanimi, HakListesi, HakSatiri, HakTanimaDurumu, KisaKayit, SinirGirdisi } from '../veri/api';
import { sinirCoz, sinirBilgisi, type DurumBaglami, type SinirVerisi } from './durum';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';

export const HAK_TURLERI = { mulkiyet: 'Mülkiyet', kullanim: 'Kullanım hakkı', yetki: 'Yetki', yukumluluk: 'Yükümlülük', izin: 'İzin' };
const TANIMALAR = { taniyor: 'Tanıyor', tanimiyor: 'Tanımıyor', bilinmiyor: 'Bilinmiyor' };
function kisa(e: EvrenVt, kod: string): KisaKayit {
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod,ad,tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}
function kayit(e: EvrenVt, kod: unknown, ileti: string): string {
  if (typeof kod !== 'string' || !kodGecerliMi(kod)) throw new Error(ileti);
  const k = yonlendir(e.db, kod);
  if (!e.db.selectValue('SELECT kod FROM kayitlar WHERE kod=? AND silindi IS NULL', [k])) throw new Error(ileti);
  return k;
}
function bul(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT tanim,silindi FROM haklar WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('Hak kaydı bulunamadı.');
  return { tanim: JSON.parse(r.tanim as string) as HakTanimi, silindi: r.silindi !== null };
}
export function ilgiliKayitlar(e: EvrenVt, kod: string, t?: HakTanimi): string[] {
  t ??= bul(e, kod).tanim;
  return [...new Set([t.konu, ...t.sahipler, t.otorite, t.baslangic?.olay, t.bitis?.olay,
    ...e.db.selectObjects('SELECT otorite FROM hak_tanimalari WHERE hak=?', [kod]).map((r) => r.otorite as string)]
    .filter((k): k is string => !!k).map((k) => yonlendir(e.db, k)))];
}
const sinirBaglami = (b: DurumBaglami): DurumBaglami => ({ ...b, olayTarihi: (k) => b.olayTarihi(yonlendir(b.e.db, k)) });
function bilgi(b: DurumBaglami, s: SinirVerisi | null) {
  if (!s) return null;
  // Tarihler güncel takvimle okunur; bağlı olayın değişen tarihi sinirBilgisi tarafından çözülür.
  const v = s.olay ? { ...s, olay: yonlendir(b.e.db, s.olay) } : { tarih: s.tarih ? tarihCoz(s.tarih.ifade, zamanSetiOku(b.e.db)) : null };
  return sinirBilgisi(sinirBaglami(b), v);
}
function sinirDogrula(b: DurumBaglami, g: SinirGirdisi | null | undefined): SinirVerisi | null {
  if (!g) return null;
  if (typeof g !== 'object' || (g.ifade !== undefined && typeof g.ifade !== 'string') || (g.fark != null && typeof g.fark !== 'string') || (g.olay != null && typeof g.olay !== 'string')) throw new Error('Süreyi bir tarih ya da olay seçerek yazın.');
  if (g.olay && g.ifade?.trim()) throw new Error('Süre için tarih veya olaydan yalnızca birini seçin.');
  if (g.fark?.trim() && !g.olay) throw new Error('Önce sürenin bağlı olduğu olayı seçin.');
  let olay: string | null = null;
  if (g.olay) {
    olay = kayit(b.e, g.olay, 'Sürenin bağlı olduğu olay bulunamadı.');
    if (!['olay', 'sahne'].includes(kisa(b.e, olay).tur)) throw new Error('Süreyi bir olay ya da sahne kaydına bağlayın.');
  }
  const s = sinirCoz(sinirBaglami(b), { ...g, olay });
  if (g.ifade?.trim() && !s?.tarih?.eksen) throw new Error('Sürenin tarihi okunamadı.');
  return s;
}
function dogrula(b: DurumBaglami, g: HakGirdisi): HakTanimi {
  if (!g || !Object.hasOwn(HAK_TURLERI, g.tur)) throw new Error('Hakkın türünü seçin.');
  const konu = kayit(b.e, g.konu, 'Hakkın konusu olan kaydı seçin.');
  if (!Array.isArray(g.sahipler) || !g.sahipler.length || g.sahipler.length > 100) throw new Error('Bir ile yüz arasında hak sahibi seçin.');
  const sahipler = [...new Set(g.sahipler.map((k) => kayit(b.e, k, 'Hak sahibinin kaydını seçin.')))];
  const metin = (s: unknown, n: number) => { if (typeof s !== 'string' || s.length > n) throw new Error('Kapsam ve koşulu kısa bir yazıyla belirtin.'); return s.trim(); };
  if (!kararGecerli(g.karar)) throw new Error('Karar durumunu seçin.');
  const otorite = g.otorite == null ? null : kayit(b.e, g.otorite, 'Hakkı tanıyan otoritenin kaydını seçin.');
  const baslangic = sinirDogrula(b, g.baslangic), bitis = sinirDogrula(b, g.bitis);
  const bas = bilgi(b, baslangic)?.tarih, bit = bilgi(b, bitis)?.tarih;
  if (bas && bit && karsilastir(bas, bit) === 'sonra') throw new Error('Sürenin bitişi başlangıcından önce olamaz.');
  return { tur: g.tur, konu, sahipler, kapsam: metin(g.kapsam, 300), kosul: metin(g.kosul, 1000), otorite, karar: g.karar, baslangic, bitis };
}
export function hakEkle(b: DurumBaglami, g: HakGirdisi) {
  const tanim = dogrula(b, g), kod = yeniKod();
  b.yaz([{ tur: 'hak_ekle', veri: { kod, tanim } }], ilgiliKayitlar(b.e, kod, tanim));
  return { kod };
}
export function hakDegistir(b: DurumBaglami, kod: string, g: HakGirdisi) {
  const onceki = bul(b.e, kod).tanim, tanim = dogrula(b, g);
  b.yaz([{ tur: 'hak_degistir', veri: { kod, tanim } }], [...new Set([...ilgiliKayitlar(b.e, kod, onceki), ...ilgiliKayitlar(b.e, kod, tanim)])]);
}
export function hakSil(b: DurumBaglami, kod: string, geri = false) {
  bul(b.e, kod);
  b.yaz([{ tur: geri ? 'hak_geri_yukle' : 'hak_sil', veri: { kod } }], ilgiliKayitlar(b.e, kod));
}
export function hakTanimaYaz(b: DurumBaglami, hak: string, kod: string | null, otorite: string, durum: HakTanimaDurumu) {
  bul(b.e, hak);
  const o = kayit(b.e, otorite, 'Tutumu bildiren otoriteyi seçin.');
  if (!Object.hasOwn(TANIMALAR, durum)) throw new Error('Otoritenin tutumunu seçin.');
  if (kod && (!kodGecerliMi(kod) || !b.e.db.selectValue('SELECT kod FROM hak_tanimalari WHERE kod=? AND hak=?', [kod, hak]))) throw new Error('Tanıma kaydı bulunamadı.');
  const onceki = kod ? b.e.db.selectValue('SELECT otorite FROM hak_tanimalari WHERE kod=?', [kod]) as string : null;
  kod ??= yeniKod();
  b.yaz([{ tur: 'hak_tanima_yaz', veri: { kod, hak, otorite: o, durum } }], [...ilgiliKayitlar(b.e, hak), o, ...(onceki ? [yonlendir(b.e.db, onceki)] : [])]);
  return { kod };
}

export function catismaYazisi(e: EvrenVt, alan: string, d: unknown): string {
  if (alan === 'hak_silindi') return d ? 'Kaldırıldı' : 'Etkin';
  if (alan.startsWith('hak_tanima:')) {
    const t = d as { otorite: string; durum: HakTanimaDurumu };
    return `${kisa(e, t.otorite).ad}: ${TANIMALAR[t.durum]}`;
  }
  const t = d as HakTanimi;
  const tarih = (s: HakTanimi['baslangic']) => !s ? 'yazılmamış' : s.olay ? `${kisa(e, s.olay).ad}${s.fark ? `, ${farkYazisi(s.fark)}` : ''}` : s.tarih?.ifade ?? 'zamanı belirsiz';
  return `${HAK_TURLERI[t.tur]} · ${t.sahipler.map((k) => kisa(e, k).ad).join(', ')} · ${kisa(e, t.konu).ad} · ${t.kapsam} · ${t.kosul} · ${t.otorite ? kisa(e, t.otorite).ad : 'otorite yazılmamış'} · ${tarih(t.baslangic)} – ${tarih(t.bitis)} · ${KARARLAR.find((k) => k.kod === t.karar)?.ad ?? ''}`;
}
function secenekler(e: EvrenVt, kod: string, alan: string) {
  const l = e.db.selectObjects('SELECT deger FROM alan_yazanlari WHERE nesne=? AND alan=? GROUP BY deger', [kod, alan]);
  return l.length > 1 ? l.map((r) => catismaYazisi(e, alan, JSON.parse(r.deger as string))) : [];
}
function sinirlar(s: HakSatiri): [Sinir, Sinir] {
  // İki sınır da yazılmamışsa sınırsız geçerlilik çıkarılmaz.
  if (!s.baslangic && !s.bitis) return [null, null];
  return [s.baslangic ? s.baslangic.tarih : 'acik', s.bitis ? s.bitis.tarih : 'acik'];
}
function ortusme(a: HakSatiri, b: HakSatiri): Gecerlilik {
  const [ab, as] = sinirlar(a), [bb, bs] = sinirlar(b);
  const once = (x: Sinir, y: Sinir): Gecerlilik => {
    if (x === 'acik' || y === 'acik') return 'evet';
    if (!x?.eksen || !y?.eksen) return 'belirsiz';
    const k = karsilastir(x, y);
    return k === 'once' ? 'evet' : k === 'sonra' ? 'hayir' : 'belirsiz';
  };
  const x = once(ab, bs), y = once(bb, as);
  return x === 'hayir' || y === 'hayir' ? 'hayir' : x === 'evet' && y === 'evet' ? 'evet' : 'belirsiz';
}
export function haklar(b: DurumBaglami, kod: string, ifade: string | null = null, cop = false): HakListesi {
  const aranan = kayit(b.e, kod, 'Hakları gösterilecek kaydı seçin.');
  if (ifade !== null && (typeof ifade !== 'string' || ifade.length > 120)) throw new Error('Evren tarihini kısa bir ifadeyle yazın.');
  const tarih = ifade?.trim() ? tarihCoz(ifade.trim(), zamanSetiOku(b.e.db)) : null;
  if (ifade?.trim() && !tarih?.eksen) throw new Error('Evren tarihi okunamadı.');
  const liste: HakSatiri[] = [];
  const konuKodlari = new Set<string>(), sahipKodlari = new Set<string>();
  for (const r of b.e.db.selectObjects('SELECT kod,tanim,silindi FROM haklar ORDER BY kod')) {
    const t = JSON.parse(r.tanim as string) as HakTanimi;
    const hak = r.kod as string;
    const secimler = [...secenekler(b.e, hak, 'hak_tanim'), ...secenekler(b.e, hak, 'hak_silindi')];
    if (cop ? r.silindi === null : r.silindi !== null && !secimler.length) continue;
    const konu = kisa(b.e, t.konu), sahipler = [...new Map(t.sahipler.map((k) => { const s = kisa(b.e, k); return [s.kod, s] as const; })).values()];
    const adaylar = secimler.length ? [t, ...b.e.db.selectObjects("SELECT deger FROM alan_yazanlari WHERE nesne=? AND alan='hak_tanim'", [hak]).map((d) => JSON.parse(d.deger as string) as HakTanimi)] : [t];
    const konusu = adaylar.some((a) => yonlendir(b.e.db, a.konu) === aranan), sahibi = adaylar.some((a) => a.sahipler.some((k) => yonlendir(b.e.db, k) === aranan));
    if (!konusu && !sahibi) continue;
    if (konusu) konuKodlari.add(hak);
    if (sahibi) sahipKodlari.add(hak);
    const s: HakSatiri = { kod: hak, tanim: t, konu, sahipler, otorite: t.otorite ? kisa(b.e, t.otorite) : null,
      baslangic: bilgi(b, t.baslangic), bitis: bilgi(b, t.bitis), tanimalar: [], silindi: r.silindi !== null, secenekler: secimler, gecerli: 'belirsiz', zaman: 'Zamanı belirsiz' };
    for (const sinir of [s.baslangic, s.bitis]) if (sinir?.olay) {
      const c = b.e.db.selectValue("SELECT 1 FROM alan_yazanlari WHERE nesne=? AND alan='tarih' GROUP BY alan HAVING count(DISTINCT deger)>1", [sinir.olay.kod]);
      if (c) secimler.push(`“${sinir.olay.ad}” olayının tarihi iki cihazda farklı; zamanı belirsiz.`);
    }
    s.tanimalar = b.e.db.selectObjects('SELECT kod,otorite,durum FROM hak_tanimalari WHERE hak=? ORDER BY kod', [hak]).map((r) => ({
      kod: r.kod as string, otorite: kisa(b.e, r.otorite as string), durum: r.durum as HakTanimaDurumu,
      secenekler: secenekler(b.e, hak, `hak_tanima:${r.kod}`),
    }));
    if (!secimler.length) s.gecerli = gecerlilik('aralik', ...sinirlar(s), tarih);
    s.zaman = secimler.length ? 'İki cihazdaki değerler seçilmeyi bekliyor; zamanı belirsiz' : s.gecerli === 'evet' ? 'Bu tarihte geçerli' : s.gecerli === 'hayir' ? 'Bu tarihin dışında' : 'Zamanı belirsiz';
    if (tarih && s.gecerli === 'hayir') continue;
    liste.push(s);
  }
  const konu = liste.filter((s) => konuKodlari.has(s.kod)), sahibi = liste.filter((s) => sahipKodlari.has(s.kod));
  const bilgiler: HakListesi['bilgiler'] = [];
  const mulkler = konu.filter((s) => s.tanim.tur === 'mulkiyet' && s.tanim.karar !== 'vazgecildi' && !s.secenekler.length && !s.silindi);
  for (let i = 0; i < mulkler.length; i++) for (let j = i + 1; j < mulkler.length; j++) {
    const a = mulkler[i], c = mulkler[j];
    if (a.tanim.kapsam !== c.tanim.kapsam) continue;
    const g = tarih ? a.gecerli === 'evet' && c.gecerli === 'evet' ? 'evet' : 'belirsiz' : ortusme(a, c);
    if (g !== 'hayir') bilgiler.push({ haklar: [a.kod, c.kod], ileti: g === 'evet' ? 'Aynı konuda iki mülkiyet kaydı aynı dönemde geçerli.' : 'Aynı konuda iki mülkiyet kaydının dönemleri örtüşebilir; zamanı belirsiz.' });
  }
  return { konu, sahibi, bilgiler, tarih };
}
