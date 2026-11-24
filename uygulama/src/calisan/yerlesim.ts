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
  // Katlar ve anlar (K38) plan sütununda `ek` altında saklanır; eski kayıtlarda yoktur.
  const { ek, ...plan } = JSON.parse(String(r.plan)) as YerlesimPlani & { ek?: YerlesimEki };
  const kisi = (o: YerlesimOgesi) => o.tur === 'karakter' ? { ...o, kisi: yonlendir(e.db, o.kisi) } : o;
  return { plan: { ...plan, mekan: yonlendir(e.db, plan.mekan) }, ogeler: (JSON.parse(String(r.ogeler)) as YerlesimOgesi[]).map(kisi), ...(ek ?? {}) };
}
export type YerlesimEki = Pick<SahneYerlesimi, 'katAdi' | 'ekKatlar' | 'anlar'>;
/** Yerleşimin katlar ve anlar kısmı; boşsa undefined (eski biçimle aynı kalır). */
export function ekiAyir(v: SahneYerlesimi): YerlesimEki | undefined {
  const ek: YerlesimEki = {};
  if (v.katAdi) ek.katAdi = v.katAdi;
  if (v.ekKatlar?.length) ek.ekKatlar = v.ekKatlar;
  if (v.anlar?.length) ek.anlar = v.anlar;
  return Object.keys(ek).length ? ek : undefined;
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
function planDogrula(e: EvrenVt, plan: YerlesimPlani, eski: YerlesimPlani | null): YerlesimPlani {
  if (!plan || !sayi(plan.en, 1, 1000000) || !sayi(plan.boy, 1, 1000000)) throw new Error('Geçerli bir kat planı seçin.');
  // Önceden sabitlenen görsel mekândan çıkarılmış olsa da sahnede saklanabilir.
  const ayni = eski && eski.gorsel === plan.gorsel && eski.mekan === yonlendir(e.db, plan.mekan) && eski.en === plan.en && eski.boy === plan.boy;
  if (!ayni) {
    const k = kayit(e, plan.mekan);
    const m = e.db.selectObject('SELECT en, boy FROM medya WHERE ad=?', [plan.gorsel]);
    if (!['mekan', 'sehir', 'siyasi'].includes(k.tur) || !k.gorseller.includes(plan.gorsel) || !m || m.en !== plan.en || m.boy !== plan.boy) throw new Error('Mekânın kayıtlı görsellerinden bir kat planı seçin.');
  }
  return { mekan: yonlendir(e.db, plan.mekan), gorsel: plan.gorsel, en: plan.en, boy: plan.boy };
}
const adDogrula = (ad: unknown, enCok: number, ne: string) => { if (typeof ad !== 'string' || !ad.trim() || ad.length > enCok) throw new Error(`${ne} adı boş olamaz, en çok ${enCok} karakter olabilir.`); return ad.trim(); };

export function dogrula(e: EvrenVt, sahne: string, v: SahneYerlesimi, katilimcilar: string[]): SahneYerlesimi {
  kayit(e, sahne, 'sahne');
  const eski = oku(e, sahne);
  const plan = planDogrula(e, v.plan, eski?.plan ?? null);
  const ekKatlar = v.ekKatlar ?? [];
  if (!Array.isArray(ekKatlar) || ekKatlar.length > 12) throw new Error('Bir sahnede en çok 13 kat planı olabilir.');
  const katKodlari = new Set<string | null>([null]);
  for (const k of ekKatlar) { if (!k || !kodGecerliMi(k.kod) || katKodlari.has(k.kod)) throw new Error('Katlardan biri geçersiz.'); katKodlari.add(k.kod); }
  const kodlar = new Set<string>(), kisiler = new Set<string>();
  const ogeDogrula = (ogeler: YerlesimOgesi[], kat: string | null) => {
    if (!Array.isArray(ogeler) || ogeler.length > 500) throw new Error('Yerleşimde en çok 500 öğe olabilir.');
    return ogeler.map((o) => {
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
          if (kat !== null) throw new Error('Karakterler katlara anlarla yerleştirilir.');
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
          if (o.katAzaltma !== undefined && !sayi(o.katAzaltma, 0, 1000)) throw new Error('Kat değişiminde düşülecek miktarı kontrol edin.');
          if (o.uzaklik === null && !o.duzey.trim()) throw new Error('Ses düzeyini ya da duyulma uzaklığını yazın.');
        } else if (o.tur === 'gecit') {
          if (!katKodlari.has(o.kat) || o.kat === kat) throw new Error('Merdivenin ya da açıklığın bağlandığı başka bir katı seçin.');
        } else throw new Error('Öğe türünü seçin.');
      }
      return o;
    });
  };
  const ogeler = ogeDogrula(v.ogeler, null);
  const katlar = ekKatlar.map((k) => ({ kod: k.kod, ad: adDogrula(k.ad, 60, 'Katın'),
    plan: planDogrula(e, k.plan, eski?.ekKatlar?.find((x) => x.kod === k.kod)?.plan ?? null), ogeler: ogeDogrula(k.ogeler, k.kod) }));
  const karakterler = new Set(ogeler.filter((o) => o.tur === 'karakter').map((o) => o.kod));
  const anlar = v.anlar ?? [];
  if (!Array.isArray(anlar) || anlar.length > 60) throw new Error('Bir sahnede en çok 60 an olabilir.');
  const anKodlari = new Set<string>();
  const yeniAnlar = anlar.map((a) => {
    if (!a || !kodGecerliMi(a.kod) || anKodlari.has(a.kod) || !a.konumlar || typeof a.konumlar !== 'object') throw new Error('Anlardan biri geçersiz.');
    anKodlari.add(a.kod);
    const konumlar: NonNullable<SahneYerlesimi['anlar']>[number]['konumlar'] = {};
    for (const [k, d] of Object.entries(a.konumlar)) {
      if (!karakterler.has(k)) continue;
      if (!d || !katKodlari.has(d.kat) || !sayi(d.yon, 0, 360)) throw new Error('Andaki bir yerleşim geçersiz.');
      nokta(d.konum);
      konumlar[k] = { kat: d.kat, konum: { x: d.konum.x, y: d.konum.y }, yon: d.yon };
    }
    return { kod: a.kod, ad: adDogrula(a.ad, 120, 'Anın'), konumlar };
  });
  const katAdi = typeof v.katAdi === 'string' && v.katAdi.trim() ? adDogrula(v.katAdi, 60, 'Katın') : undefined;
  return { plan, ogeler, ...ekiAyir({ plan, ogeler, katAdi, ekKatlar: katlar, anlar: yeniAnlar }) };
}
