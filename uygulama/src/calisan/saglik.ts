// Evren sağlık taraması (§9.4) ve inceleme kuyruğu kararları (§9.3). Tarama verinin yapısındaki sorunları listeler:
// kopuk bağlantılar, silinmiş ya da vazgeçilmiş kayıtlara giden bağlantılar, eksik görsel dosyaları, kod sorunları.
// Bağlantısız fikir ya da tarihi belirsiz olay hata sayılmaz; ayrı bilgi listesinde durur.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { turkceKarsilastir } from '../alan/turkce';
import type { IncelemeKarari, SaglikBulgusu, SaglikTaramasi } from '../veri/api';
import type { EvrenVt } from './evren-vt';

export interface SaglikBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

type Ham = Omit<SaglikBulgusu, 'karar'>;

function kararlar(e: EvrenVt): Map<string, IncelemeKarari & { dayanak: string }> {
  return new Map(e.db.selectObjects('SELECT * FROM inceleme_kararlari').map((r) => [r.anahtar as string,
    { durum: r.durum as IncelemeKarari['durum'], gerekce: r.gerekce as string, zaman: Number(r.zaman), dayanak: r.dayanak as string }]));
}

function sorunlar(e: EvrenVt): Ham[] {
  const db = e.db;
  const liste: Ham[] = [];
  const kisa = (r: Record<string, unknown>, p = '') => ({ kod: r[p + 'kod'] as string, ad: r[p + 'ad'] as string, tur: r[p + 'tur'] as string });

  // Metindeki bağlantılar. Birleştirilmiş kayda giden bağlantı yönlendirilir; sorun değildir.
  for (const r of db.selectObjects(`SELECT DISTINCT b.kaynak kod, k.ad, k.tur, b.hedef, b.metin, h.kod h_kod, h.ad h_ad, h.tur h_tur, h.silindi h_silindi, h.karar h_karar
      FROM baglantilar b JOIN kayitlar k ON k.kod=b.kaynak LEFT JOIN kayitlar h ON h.kod=b.hedef
      WHERE k.silindi IS NULL AND b.hedef NOT IN (SELECT kod FROM yonlendirmeler)`)) {
    const kaynak = kisa(r), hedef = r.h_kod ? kisa(r, 'h_') : null;
    if (!hedef) {
      liste.push({ anahtar: `kopuk:${kaynak.kod}:${r.hedef}`, tur: 'kopuk_baglanti', kayit: kaynak, hedef: null, dayanak: 'yok',
        baslik: `“${r.metin}” bağlantısı hiçbir kayda varmıyor`, aciklama: 'Bağlandığı kayıt bu evrende yok. Metni düzeltin ya da bağlantıyı başka bir kayda yönlendirin.' });
    } else if (r.h_silindi !== null) {
      liste.push({ anahtar: `silinmis:${kaynak.kod}:${hedef.kod}`, tur: 'silinmis_baglanti', kayit: kaynak, hedef, dayanak: 'silindi',
        baslik: `“${r.metin}” bağlantısı çöp kutusundaki bir kayda gidiyor`, aciklama: `${hedef.ad} çöp kutusunda. Geri getirebilir ya da metindeki bağlantıyı kaldırabilirsiniz.` });
    } else if (r.h_karar === 'vazgecildi') {
      liste.push({ anahtar: `vazgecilmis:${kaynak.kod}:${hedef.kod}`, tur: 'vazgecilmis_baglanti', kayit: kaynak, hedef, dayanak: 'vazgecildi',
        baslik: `“${r.metin}” bağlantısı vazgeçilmiş bir kayda gidiyor`, aciklama: `${hedef.ad} vazgeçilmiş olarak işaretli. Metin hâlâ ona dayanıyor olabilir.` });
    }
  }

  // Görsel dosyaları: kayıtta ya da haritada adı geçen ama hiç saklanmamış görsel.
  const medya = new Set(db.selectObjects('SELECT ad FROM medya').map((r) => r.ad as string));
  for (const r of db.selectObjects('SELECT kod, ad, tur, gorseller FROM kayitlar WHERE silindi IS NULL')) {
    for (const g of JSON.parse(r.gorseller as string) as string[]) {
      if (!medya.has(g)) liste.push({ anahtar: `gorsel:${r.kod}:${g}`, tur: 'eksik_gorsel', kayit: kisa(r), hedef: null, dayanak: 'yok',
        baslik: 'Görsel dosyası eksik', aciklama: 'Kayıtta bir görsel var ama dosyası hiçbir cihazdan gelmemiş. Görseli yeniden ekleyebilir ya da kayıttan çıkarabilirsiniz.' });
    }
  }
  for (const r of db.selectObjects('SELECT h.kod, h.ad, h.katmanlar, k.kod y_kod, k.ad y_ad, k.tur y_tur FROM haritalar h LEFT JOIN kayitlar k ON k.kod=h.yer WHERE h.silindi IS NULL')) {
    for (const k of JSON.parse(r.katmanlar as string) as { gorsel: string }[]) {
      if (!medya.has(k.gorsel)) liste.push({ anahtar: `harita-gorsel:${r.kod}:${k.gorsel}`, tur: 'eksik_gorsel', kayit: r.y_kod ? kisa(r, 'y_') : null, hedef: null, dayanak: 'yok',
        harita: { kod: r.kod as string, ad: r.ad as string }, baslik: `“${r.ad}” haritasının görsel dosyası eksik`, aciklama: 'İşaretler yerinde; yalnızca görsel gösterilemiyor.' });
    }
  }

  // Kod sorunları: var olmayan bir kayda bağlı satırlar.
  const yok = (sutun: string) => `${sutun} IS NOT NULL AND ${sutun} NOT IN (SELECT kod FROM kayitlar)`;
  const kodSorunu = (anahtar: string, baslik: string, kayit: Record<string, unknown> | null) =>
    liste.push({ anahtar, tur: 'kod_sorunu', kayit: kayit && kayit.kod ? kisa(kayit) : null, hedef: null, dayanak: 'yok', baslik,
      aciklama: 'Bu bilgi var olmayan bir kayda bağlı. Bu genellikle yarım kalmış bir eşitlemeden ya da elle değiştirilmiş bir yedekten kaynaklanır.' });
  for (const r of db.selectObjects(`SELECT i.kod i, k.kod, k.ad, k.tur FROM iliskiler i LEFT JOIN kayitlar k ON k.kod IN (i.a, i.b)
      WHERE i.silindi IS NULL AND (${yok('i.a')} OR ${yok('i.b')})`)) kodSorunu(`kod:iliski:${r.i}`, 'Bir ilişkinin ucu olan kayıt bulunamıyor', r);
  for (const r of db.selectObjects(`SELECT d.kod d, d.ozellik, k.kod, k.ad, k.tur FROM durumlar d LEFT JOIN kayitlar k ON k.kod=d.konu
      WHERE d.silindi IS NULL AND (${yok('d.konu')} OR ${yok('d.hedef')})`)) kodSorunu(`kod:durum:${r.d}`, `“${r.ozellik}” durumunun bağlı olduğu kayıt bulunamıyor`, r);
  for (const r of db.selectObjects(`SELECT i.kod i, h.ad FROM isaretler i JOIN haritalar h ON h.kod=i.harita WHERE i.silindi IS NULL AND ${yok('i.kayit')}`)) {
    kodSorunu(`kod:isaret:${r.i}`, `“${r.ad}” haritasında bir işaretin kaydı bulunamıyor`, null);
  }
  for (const r of db.selectObjects(`SELECT c.kod c, h.ad FROM cizimler c JOIN haritalar h ON h.kod=c.harita WHERE c.silindi IS NULL AND ${yok('c.kayit')}`)) {
    kodSorunu(`kod:cizim:${r.c}`, `“${r.ad}” haritasında bir çizimin kaydı bulunamıyor`, null);
  }
  for (const r of db.selectObjects(`SELECT a.kod, k.ad, k.tur FROM anlati a LEFT JOIN kayitlar k ON k.kod=a.kod WHERE ${yok('a.ust')}`)) {
    kodSorunu(`kod:anlati:${r.kod}`, 'Eser yapısında üstü bulunamayan bir parça var', r.ad ? r : null);
  }
  for (const r of db.selectObjects(`SELECT DISTINCT kayit FROM alan_degerleri WHERE ${yok('kayit')}`)) kodSorunu(`kod:alan:${r.kayit}`, 'Var olmayan bir kayda ait alan değerleri var', null);
  for (const r of db.selectObjects('SELECT kod, ad, tur FROM kayitlar')) {
    if (!kodGecerliMi(r.kod as string)) kodSorunu(`kod:gecersiz:${r.kod}`, 'Kodu geçersiz bir kayıt var', r);
  }
  return liste.filter((x, i) => liste.findIndex((y) => y.anahtar === x.anahtar) === i);
}

/** Hata sayılmayan bilgiler: bağlantısız fikirler ve tarihi belirsiz olaylar. */
function bilgiler(e: EvrenVt): Ham[] {
  const liste: Ham[] = [];
  for (const r of e.db.selectObjects(`SELECT k.kod, k.ad, k.tur FROM kayitlar k WHERE k.silindi IS NULL AND k.karar='fikir' AND k.tur NOT IN ('not','acik_mesele','gerekce')
      AND NOT EXISTS (SELECT 1 FROM baglantilar WHERE hedef=k.kod OR kaynak=k.kod)
      AND NOT EXISTS (SELECT 1 FROM iliskiler WHERE silindi IS NULL AND (a=k.kod OR b=k.kod))`)) {
    liste.push({ anahtar: `fikir:${r.kod}`, tur: 'baglantisiz_fikir', kayit: { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }, hedef: null, dayanak: '',
      baslik: 'Hiçbir şeye bağlı olmayan fikir', aciklama: 'Ne bir metinde anılıyor ne de bir ilişkisi var. Bu bir hata değil.' });
  }
  for (const r of e.db.selectObjects(`SELECT k.kod, k.ad, k.tur, coalesce(k.tarih, s.tarih) tarih FROM kayitlar k LEFT JOIN kayitlar s ON s.kod=k.sahne_olayi
      WHERE k.silindi IS NULL AND k.tur='olay' AND k.karar<>'vazgecildi'`)) {
    const t = r.tarih ? JSON.parse(r.tarih as string) as { eksen: unknown; bicim: string } : null;
    if (t?.eksen) continue;
    liste.push({ anahtar: `tarihsiz:${r.kod}`, tur: 'belirsiz_tarih', kayit: { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }, hedef: null, dayanak: '',
      baslik: t ? 'Olayın tarihi sıralamaya yerleşmiyor' : 'Olayın tarihi yok', aciklama: t ? `“${(t as { ifade?: string }).ifade ?? ''}” takvime çevrilemedi.` : 'Zaman çizelgesinde görünmez. Bu bir hata değil.' });
  }
  return liste;
}

const sirala = (l: SaglikBulgusu[]) => l.sort((a, b) => turkceKarsilastir(a.kayit?.ad ?? '', b.kayit?.ad ?? '') || a.baslik.localeCompare(b.baslik));

/** Kabul edilmiş bulgu, dayanağı değişmedikçe açılmaz; ertelenmiş bulgu kuyrukta ayrı durur (§9.3). */
export function tarama(e: EvrenVt, bilgiIste = false): SaglikTaramasi {
  const k = kararlar(e);
  const acik: SaglikBulgusu[] = [], ertelenen: SaglikBulgusu[] = [], kabul: SaglikBulgusu[] = [];
  for (const b of sorunlar(e)) {
    const karar = k.get(b.anahtar);
    if (karar?.durum === 'ertelendi') ertelenen.push({ ...b, karar });
    else if (karar?.durum === 'kabul' && karar.dayanak === b.dayanak) kabul.push({ ...b, karar });
    else acik.push({ ...b, karar: null });
  }
  return { acik: sirala(acik), ertelenen: sirala(ertelenen), kabul: sirala(kabul), bilgiler: bilgiIste ? sirala(bilgiler(e).map((b) => ({ ...b, karar: null }))) : null };
}

export const acikSorunSayisi = (e: EvrenVt) => tarama(e).acik.length;

export function kararVer(b: SaglikBaglami, anahtar: string, durum: 'kabul' | 'ertelendi' | null, gerekce: string) {
  const bulgu = sorunlar(b.e).find((x) => x.anahtar === anahtar);
  if (!bulgu && durum) throw new Error('Bu sorun artık yok.');
  const g = String(gerekce ?? '').replace(/\s+/g, ' ').trim();
  if (durum === 'kabul' && !g) throw new Error('Kabul ederken kısa bir gerekçe yazın.');
  if (g.length > 500) throw new Error('Gerekçe çok uzun.');
  b.yaz([{ tur: 'inceleme_karari', veri: { anahtar, durum, gerekce: g, dayanak: bulgu?.dayanak ?? '', baslik: bulgu?.baslik ?? '' } }], bulgu?.kayit ? [bulgu.kayit.kod] : []);
}
