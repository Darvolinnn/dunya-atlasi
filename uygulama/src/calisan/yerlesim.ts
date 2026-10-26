/** §18.2 kullanım sözleşmesi:
 * Soru: Seçilen konumdan görüş hattı açık mı, ses hangi varsayımlarla ulaşabilir?
 * En az veri: sahne, mekân görselinin içerik adı ve boyutları, konumlar ve engeller.
 * Eksik veri: yerleşim yok; ses mesafesi/gürültüsü yoksa hesaplanamıyor.
 * Okunanlar: sahne katılımcıları, mekân görselleri, kaydedilmiş yerleşim ve çatışmalar.
 * Değişen: yalnız sahnenin yerleşimi, işlem günlüğü üzerinden. Kalıcı plan değişmez.
 * Yorum: algı, dikkat, bilgi veya evrensel fizik eşiği çıkarılmaz.
 * Kabul: kapalı kapı hattı keser; açılması yalnız bu sahnenin sonucunu değiştirir.
 * Veri sözleşmesi: boş yerleşim null; geçmiş plan içerik adıyla sabittir; yazar kaydeder.
 */
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { kodGecerliMi } from '../alan/kod';
import { turkceKarsilastir } from '../alan/turkce';
import type { SahneYerlesimi, YerlesimOgesi, YerlesimPlani, YerlesimPlanSecimi } from '../veri/api';

function kayit(e: EvrenVt, kod: string, tur?: string) {
  const k = typeof kod === 'string' && kodGecerliMi(kod) ? yonlendir(e.db, kod) : '';
  const r = e.db.selectObject('SELECT tur, gorseller FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  if (!r || tur && r.tur !== tur) throw new Error(tur === 'sahne' ? 'Bir sahne seçin.' : 'Kayıt bulunamadı.');
  return { kod: k, tur: String(r.tur), gorseller: JSON.parse(String(r.gorseller)) as string[] };
}
export function oku(e: EvrenVt, sahne: string): SahneYerlesimi | null {
  const s = kayit(e, sahne, 'sahne').kod;
  const r = e.db.selectObject('SELECT plan, ogeler FROM sahne_yerlesimleri WHERE kod=?', [s]);
  if (!r) return null;
  const plan = JSON.parse(String(r.plan)) as YerlesimPlani;
  return { plan: { ...plan, mekan: yonlendir(e.db, plan.mekan) }, ogeler: (JSON.parse(String(r.ogeler)) as YerlesimOgesi[]).map((o) => o.tur === 'karakter' ? { ...o, kisi: yonlendir(e.db, o.kisi) } : o) };
}
export function planlar(e: EvrenVt): YerlesimPlanSecimi[] {
  const sonuc: YerlesimPlanSecimi[] = [];
  for (const k of e.db.selectObjects("SELECT kod, ad, gorseller FROM kayitlar WHERE tur IN ('mekan','sehir','siyasi') AND silindi IS NULL ORDER BY ad, kod")) {
    for (const gorsel of JSON.parse(String(k.gorseller)) as string[]) {
      const m = e.db.selectObject('SELECT en, boy FROM medya WHERE ad=?', [gorsel]);
      if (m && Number(m.en) > 0 && Number(m.boy) > 0) sonuc.push({ mekan: String(k.kod), ad: String(k.ad), gorsel, en: Number(m.en), boy: Number(m.boy) });
    }
  }
  return sonuc.sort((a, b) => turkceKarsilastir(a.ad, b.ad) || turkceKarsilastir(a.gorsel, b.gorsel));
}
const sayi = (n: unknown, enAz: number, enCok: number) => typeof n === 'number' && Number.isFinite(n) && n >= enAz && n <= enCok;
function nokta(p: unknown) {
  const n = p as { x?: unknown; y?: unknown } | null;
  if (!n || !sayi(n.x, 0, 1) || !sayi(n.y, 0, 1)) throw new Error('Konum görselin sınırları içinde olmalı.');
}
export function dogrula(e: EvrenVt, sahne: string, plan: YerlesimPlani, ogeler: YerlesimOgesi[], katilimcilar: string[]): SahneYerlesimi {
  kayit(e, sahne, 'sahne');
  if (!plan || !sayi(plan.en, 1, 1000000) || !sayi(plan.boy, 1, 1000000)) throw new Error('Geçerli bir kat planı seçin.');
  const eski = oku(e, sahne);
  // Önceden sabitlenen görsel mekândan çıkarılmış olsa da sahnede saklanabilir.
  const ayni = eski && eski.plan.gorsel === plan.gorsel && eski.plan.mekan === yonlendir(e.db, plan.mekan) && eski.plan.en === plan.en && eski.plan.boy === plan.boy;
  if (!ayni) {
    const k = kayit(e, plan.mekan);
    const m = e.db.selectObject('SELECT en, boy FROM medya WHERE ad=?', [plan.gorsel]);
    if (!['mekan', 'sehir', 'siyasi'].includes(k.tur) || !k.gorseller.includes(plan.gorsel) || !m || m.en !== plan.en || m.boy !== plan.boy) throw new Error('Mekânın kayıtlı görsellerinden bir kat planı seçin.');
  }
  if (!Array.isArray(ogeler) || ogeler.length > 500) throw new Error('Yerleşimde en çok 500 öğe olabilir.');
  const kodlar = new Set<string>(), kisiler = new Set<string>();
  const yeni = ogeler.map((o) => {
    if (!o || !kodGecerliMi(o.kod) || kodlar.has(o.kod)) throw new Error('Öğelerden biri geçersiz ya da birden çok kez eklenmiş.');
    kodlar.add(o.kod);
    if (typeof o.ad !== 'string' || o.ad.length > 120) throw new Error('Öğe adı en çok 120 karakter olabilir (boşluklar dahil).');
    if ('a' in o) {
      if (!['duvar', 'kapi', 'pencere', 'siper'].includes(o.tur) || typeof o.acik !== 'boolean') throw new Error('Engel türünü seçin.');
      nokta(o.a); nokta(o.b);
      if (o.a.x === o.b.x && o.a.y === o.b.y) throw new Error('Çizginin iki ucu ayrı olmalı.');
    } else {
      nokta(o.konum);
      if (o.tur === 'karakter') {
        const k = kayit(e, o.kisi, 'karakter').kod;
        if (!katilimcilar.includes(k)) throw new Error('Karakteri önce sahnenin katılımcılarına ekleyin.');
        if (kisiler.has(k)) throw new Error('Aynı karakteri ikinci kez yerleştirmek yerine ona hareket adımları ekleyin.');
        kisiler.add(k);
        if (!sayi(o.yon, 0, 360) || !sayi(o.aci, 0, 360) || !sayi(o.uzaklik, 0, 1000) || !Array.isArray(o.adimlar) || o.adimlar.length > 500) throw new Error('Bakış ve hareket değerlerini kontrol edin.');
        o.adimlar.forEach(nokta);
        return { ...o, kisi: k };
      } else if (o.tur === 'isik') {
        if (!sayi(o.yaricap, 0, 1000)) throw new Error('Işığın yarıçapını kontrol edin.');
      } else if (o.tur === 'ses') {
        if (!(o.uzaklik === null || sayi(o.uzaklik, 0, 1000)) || !sayi(o.azaltma, 0, 1000) || typeof o.duzey !== 'string' || typeof o.gurultu !== 'string' || o.duzey.length > 300 || o.gurultu.length > 300) throw new Error('Ses varsayımlarını kontrol edin.');
        if (o.uzaklik === null && !o.duzey.trim()) throw new Error('Ses düzeyini ya da duyulma uzaklığını yazın.');
      } else throw new Error('Öğe türünü seçin.');
    }
    return o;
  });
  return { plan: { ...plan, mekan: yonlendir(e.db, plan.mekan) }, ogeler: yeni };
}
