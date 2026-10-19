// Metin işaretleme (§5.7). Yazar bir cümleyi seçip bir kayda bağlar; isterse o kaydın hangi bilgisine (tarih, alan,
// zamanla değişen bir değer, bir soru ya da ilişki) bağlı olduğunu da söyler. Dört şey ayrıdır: metindeki işaret
// (metin belgesinde, kararlı konumla) · işaretin kendisi (bu modülün kaydı) · bağlı evren bilgisi · sürümleri (imza).
// Program cümlenin anlamını çıkarmaz (K1); yalnızca yazarın kurduğu bağı tutar.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { iliskiTuruBul } from '../alan/iliski-turleri';
import type { IncelemeKarari, IsaretAlani, IsaretIncelemeleri, IsaretIncelemesi, KisaKayit, MetinIsareti } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { kayitSablonu } from './sablon';

export interface IsaretBaglami { e: EvrenVt; yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void }

const temiz = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const kayitVar = (e: EvrenVt, kod: unknown): kod is string => typeof kod === 'string' && kodGecerliMi(kod) && e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kod]) !== undefined;
function kisa(e: EvrenVt, kod: string): KisaKayit {
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT ad, tur, silindi FROM kayitlar WHERE kod=?', [k]);
  return r && !r.silindi ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}

/** Bir kaydın işaretin bağlanabileceği bilgileri. */
export function isaretAlanlari(e: EvrenVt, hedef: string): IsaretAlani[] {
  if (!kayitVar(e, hedef)) throw new Error('Kayıt bulunamadı.');
  const k = yonlendir(e.db, hedef) as string;
  const l: IsaretAlani[] = [{ kod: 'ad', ad: 'Adı', grup: 'Kayıt' }, { kod: 'tarih', ad: 'Evren tarihi', grup: 'Kayıt' }];
  try { for (const a of kayitSablonu(e, k).sablon.alanlar) l.push({ kod: `alan:${a.kod}`, ad: a.ad, grup: 'Alanlar' }); } catch { /* şablonsuz */ }
  for (const r of e.db.selectObjects('SELECT kod, ozellik, deger FROM durumlar WHERE konu=? AND silindi IS NULL ORDER BY olusturma', [k]))
    l.push({ kod: `durum:${r.kod}`, ad: `${r.ozellik}: ${r.deger}`, grup: 'Zamanla değişenler' });
  for (const r of e.db.selectObjects('SELECT kod, soru FROM iddialar WHERE konu=? AND silindi IS NULL ORDER BY olusturma', [k]))
    l.push({ kod: `iddia:${r.kod}`, ad: `“${r.soru}”`, grup: 'Sorular ve sırlar' });
  for (const r of e.db.selectObjects('SELECT kod, tur, a, b FROM iliskiler WHERE (a=?1 OR b=?1) AND silindi IS NULL ORDER BY olusturma', [k])) {
    const t = iliskiTuruBul(r.tur as string);
    const oteki = kisa(e, (r.a === k ? r.b : r.a) as string);
    l.push({ kod: `iliski:${r.kod}`, ad: `${r.a === k ? t.aIcin : t.bIcin}: ${oteki.ad}`, grup: 'İlişkiler' });
  }
  return l;
}

/** İşaretin bağlı olduğu bilginin şimdiki hâli. Bilgi değişince imza değişir; inceleme buna göre açılır (§9.3). */
export function alanImzasi(e: EvrenVt, hedef: string, hedefAlan: string | null): string {
  const k = yonlendir(e.db, hedef) as string;
  const kr = e.db.selectObject('SELECT ad, tarih, silindi FROM kayitlar WHERE kod=?', [k]);
  if (!kr || kr.silindi) return 'yok';
  if (!hedefAlan) return `kayit:${k}`;
  const [tur, ...geri] = hedefAlan.split(':');
  const kod = geri.join(':');
  const satir = (sql: string) => JSON.stringify(e.db.selectObject(sql, [kod]) ?? null);
  switch (tur) {
    case 'ad': return JSON.stringify(kr.ad);
    case 'tarih': return JSON.stringify(kr.tarih ?? null);
    case 'alan': return JSON.stringify(e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [k, kod]) ?? null);
    case 'durum': return satir('SELECT ozellik, deger, hedef, kip, baslangic, bitis, karar, silindi FROM durumlar WHERE kod=?');
    case 'iddia': return satir('SELECT soru, secenekler, gercek, karar, silindi FROM iddialar WHERE kod=?');
    case 'iliski': return satir('SELECT tur, a, b, baslangic, bitis, karar, silindi FROM iliskiler WHERE kod=?');
    default: return 'yok';
  }
}

function hedefAlanAdi(e: EvrenVt, hedef: string | null, hedefAlan: string | null): string | null {
  if (!hedef || !hedefAlan) return null;
  try { return isaretAlanlari(e, hedef).find((a) => a.kod === hedefAlan)?.ad ?? 'Kaldırılmış bilgi'; } catch { return 'Kaldırılmış bilgi'; }
}

function bul(e: EvrenVt, kod: unknown) {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM metin_isaretleri WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('İşaret bulunamadı.');
  return r;
}

function hedefAlaniDogrula(e: EvrenVt, hedef: string | null, hedefAlan: unknown): string | null {
  if (hedefAlan === null || hedefAlan === undefined || hedefAlan === '') return null;
  if (!hedef) throw new Error('Önce işaretin bağlanacağı kaydı seçin.');
  if (typeof hedefAlan !== 'string' || !isaretAlanlari(e, hedef).some((a) => a.kod === hedefAlan)) throw new Error('Seçilen bilgi bu kayıtta yok.');
  return hedefAlan;
}

export function isaretOlustur(b: IsaretBaglami, g: { kayit: string; alan: string; hedef: string | null; hedefAlan?: string | null; iddia?: string; kritik?: boolean }) {
  if (!kayitVar(b.e, g.kayit)) throw new Error('Metnin kaydı bulunamadı.');
  if (typeof g.alan !== 'string' || !/^[a-z_]{1,40}$/.test(g.alan)) throw new Error('Geçersiz metin.');
  const hedef = g.hedef ? (kayitVar(b.e, g.hedef) ? yonlendir(b.e.db, g.hedef) as string : (() => { throw new Error('Bağlanacak kayıt bulunamadı.'); })()) : null;
  const hedefAlan = hedefAlaniDogrula(b.e, hedef, g.hedefAlan);
  const kod = yeniKod();
  const veri = {
    kod, kayit: yonlendir(b.e.db, g.kayit) as string, alan: g.alan, hedef, hedefAlan, iddia: temiz(g.iddia, 300), kritik: !!g.kritik,
    imza: hedef ? alanImzasi(b.e, hedef, hedefAlan) : null,
  };
  b.yaz([{ tur: 'metin_isareti_olustur', veri }], [veri.kayit, ...(hedef ? [hedef] : [])]);
  return { kod };
}

export type IsaretAlaniAdi = 'hedef' | 'hedefAlan' | 'iddia' | 'kritik';

export function isaretYaz(b: IsaretBaglami, kod: string, alan: IsaretAlaniAdi, deger: unknown) {
  const r = bul(b.e, kod);
  if (r.silindi) throw new Error('İşaret kaldırılmış.');
  const girdiler: IslemGirdisi[] = [];
  const yaz = (a: string, d: unknown) => girdiler.push({ tur: 'metin_isareti_yaz', veri: { kod, kayit: r.kayit, alan: a, deger: d } });
  let hedef = r.hedef as string | null, hedefAlan = r.hedef_alan as string | null;
  if (alan === 'hedef') {
    const yeni = deger ? (kayitVar(b.e, deger) ? yonlendir(b.e.db, deger) as string : (() => { throw new Error('Bağlanacak kayıt bulunamadı.'); })()) : null;
    if (yeni === hedef) return;
    hedef = yeni; yaz('hedef', yeni);
    if (hedefAlan) { hedefAlan = null; yaz('hedefAlan', null); }
  } else if (alan === 'hedefAlan') {
    const yeni = hedefAlaniDogrula(b.e, hedef, deger);
    if (yeni === hedefAlan) return;
    hedefAlan = yeni; yaz('hedefAlan', yeni);
  } else if (alan === 'iddia') {
    const yeni = temiz(deger, 300);
    if (yeni === r.iddia) return;
    yaz('iddia', yeni);
  } else if (alan === 'kritik') {
    const yeni = !!deger;
    if (yeni === !!r.kritik) return;
    yaz('kritik', yeni);
  } else throw new Error('Geçersiz alan.');
  // Bağ değişince işaretin dayandığı sürüm de yenilenir.
  if (alan === 'hedef' || alan === 'hedefAlan') yaz('imza', hedef ? alanImzasi(b.e, hedef, hedefAlan) : null);
  b.yaz(girdiler, [r.kayit as string, ...(hedef ? [hedef] : [])]);
}

export function isaretSil(b: IsaretBaglami, kod: string, geriYukle = false) {
  const r = bul(b.e, kod);
  if (!!r.silindi === !geriYukle) return;
  b.yaz([{ tur: geriYukle ? 'metin_isareti_geri_yukle' : 'metin_isareti_sil', veri: { kod, kayit: r.kayit } }], [r.kayit as string]);
}

function satir(e: EvrenVt, r: Record<string, unknown>): MetinIsareti {
  const yerler = e.db.selectObjects('SELECT kayit, alan, metin FROM metin_isaret_yerleri WHERE isaret=? ORDER BY kayit, alan, sira', [r.kod as string]);
  const hedef = r.hedef ? yonlendir(e.db, r.hedef as string) as string : null;
  return {
    kod: r.kod as string, kayit: kisa(e, r.kayit as string), alan: r.alan as string,
    hedef: hedef ? kisa(e, hedef) : null, hedefAlan: (r.hedef_alan as string | null) ?? null, hedefAlanAdi: hedefAlanAdi(e, hedef, (r.hedef_alan as string | null) ?? null),
    iddia: r.iddia as string, kritik: !!r.kritik, yerler: yerler.map((y) => y.metin as string),
    durum: !yerler.length ? 'metinde_yok' : yerler.length > 1 || yerler.some((y) => y.kayit !== r.kayit || y.alan !== r.alan) ? 'belirsiz' : 'yerinde',
  };
}

/** Bir kaydın metnindeki işaretler ve başka metinlerde bu kayda bağlanmış işaretler. */
export function kayitIsaretleri(e: EvrenVt, kod: string): { metindekiler: MetinIsareti[]; buKayda: MetinIsareti[] } {
  if (!kayitVar(e, kod)) throw new Error('Kayıt bulunamadı.');
  const k = yonlendir(e.db, kod) as string;
  const metindekiler = e.db.selectObjects(`SELECT * FROM metin_isaretleri WHERE silindi IS NULL AND (kayit=?1 OR kod IN (SELECT isaret FROM metin_isaret_yerleri WHERE kayit=?1))
    ORDER BY olusturma`, [k]).map((r) => satir(e, r));
  const buKayda = e.db.selectObjects('SELECT * FROM metin_isaretleri WHERE silindi IS NULL AND hedef IS NOT NULL ORDER BY olusturma')
    .filter((r) => yonlendir(e.db, r.hedef as string) === k).map((r) => satir(e, r));
  return { metindekiler, buKayda };
}

/** Editörde işaretli parçaların kısa açıklaması (silinmiş işaretler görünmez). */
export function isaretOzetleri(e: EvrenVt, kodlar: string[]): { kod: string; hedef: KisaKayit | null; hedefAlanAdi: string | null; iddia: string; kritik: boolean }[] {
  return kodlar.filter((k) => kodGecerliMi(k)).flatMap((k) => {
    const r = e.db.selectObject('SELECT * FROM metin_isaretleri WHERE kod=? AND silindi IS NULL', [k]);
    if (!r) return [];
    const s = satir(e, r);
    return [{ kod: k, hedef: s.hedef, hedefAlanAdi: s.hedefAlanAdi, iddia: s.iddia, kritik: s.kritik }];
  });
}

// ---------- İnceleme (§9.3) ve değişiklik niyeti (F24) ----------
/** Değişiklik niyeti (F24). Program yeni değeri metinden çıkarmaz; yazarın niyetini kaydeder ve yapılacak yeri gösterir. */
export const NIYETLER = [
  { kod: 'eski_duzelt', ad: 'Eski kaydı düzelt', aciklama: 'Evrende doğrusu bu; bağlı bilgi buna göre düzeltilecek.' },
  { kod: 'bu_tarihten', ad: 'Bu tarihten itibaren değiştir', aciklama: 'Önceki hâl doğruydu; değişiklik bir tarihten sonra geçerli (zamanla değişen değer olarak yazılır).' },
  { kod: 'taslakta', ad: 'Taslakta dene', aciklama: 'Ana çizgiye değil, bir deneme kopyasına aittir.' },
  { kod: 'inanc', ad: 'Yalnızca bu kişinin inancını değiştir', aciklama: 'Gerçek değişmedi; bir karakterin bildiği ya da sandığı değişti.' },
] as const;
export type Niyet = typeof NIYETLER[number]['kod'];

/** Bağlı bilginin okunur hâli. */
export function alanYazisi(e: EvrenVt, hedef: string, hedefAlan: string | null): string {
  const k = yonlendir(e.db, hedef) as string;
  const kr = e.db.selectObject('SELECT ad, tarih, silindi FROM kayitlar WHERE kod=?', [k]);
  if (!kr) return 'Kayıt yok';
  if (kr.silindi) return 'Kayıt çöp kutusunda';
  if (!hedefAlan) return k !== hedef ? `“${kr.ad}” kaydıyla birleştirildi` : String(kr.ad);
  const [tur, ...geri] = hedefAlan.split(':');
  const kod = geri.join(':');
  const tarih = (s: unknown) => { try { const v = typeof s === 'string' && s ? JSON.parse(s) : null; return v?.ifade ?? v?.tarih?.ifade ?? (v?.olay ? 'bir olaya bağlı' : null); } catch { return null; } };
  switch (tur) {
    case 'ad': return String(kr.ad);
    case 'tarih': return tarih(kr.tarih) ?? 'Tarih yok';
    case 'alan': {
      const v = e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [k, kod]) as string | undefined;
      if (v === undefined) return 'Boş';
      const d = JSON.parse(v);
      return typeof d === 'object' && d ? (d.ifade ?? JSON.stringify(d)) : String(d);
    }
    case 'durum': {
      const r = e.db.selectObject('SELECT ozellik, deger, baslangic, bitis, silindi FROM durumlar WHERE kod=?', [kod]);
      if (!r || r.silindi) return 'Değer kaldırılmış';
      const b = tarih(r.baslangic), s = tarih(r.bitis);
      return `${r.ozellik}: ${r.deger}${b || s ? ` (${b ?? '…'} – ${s ?? '…'})` : ''}`;
    }
    case 'iddia': {
      const r = e.db.selectObject('SELECT soru, secenekler, gercek, silindi FROM iddialar WHERE kod=?', [kod]);
      if (!r || r.silindi) return 'Soru kaldırılmış';
      const sec = JSON.parse(r.secenekler as string) as { kod: string; metin: string }[];
      const g = sec.find((x) => x.kod === r.gercek);
      return `“${r.soru}”${g ? ` · gerçek: ${g.metin}` : ' · gerçek belirlenmedi'}`;
    }
    case 'iliski': {
      const r = e.db.selectObject('SELECT tur, a, b, silindi FROM iliskiler WHERE kod=?', [kod]);
      if (!r || r.silindi) return 'İlişki kaldırılmış';
      const t = iliskiTuruBul(r.tur as string);
      return `${kisa(e, r.a as string).ad} – ${kisa(e, r.b as string).ad} (${t.aIcin.toLocaleLowerCase('tr-TR')})`;
    }
    default: return '';
  }
}

/** Açık işaret incelemeleri. Bağlı bilgi değişmedikçe (ya da kritik cümle değişmedikçe) inceleme açılmaz. */
export function isaretIncelemeleri(e: EvrenVt, kayit: string | null = null): IsaretIncelemeleri {
  const kararlar = new Map(e.db.selectObjects("SELECT * FROM inceleme_kararlari WHERE anahtar LIKE 'isaret%'").map((r) => [r.anahtar as string, r]));
  const sonuc: IsaretIncelemeleri = { acik: [], ertelenen: [], kapanan: [] };
  const satirlar = e.db.selectObjects(`SELECT * FROM metin_isaretleri WHERE silindi IS NULL ${kayit ? 'AND kayit=?' : ''} ORDER BY kritik DESC, olusturma`, kayit ? [kayit] : []);
  for (const r of satirlar) {
    const kod = r.kod as string;
    const kr = e.db.selectValue('SELECT silindi FROM kayitlar WHERE kod=?', [r.kayit as string]);
    if (kr) continue; // metnin kaydı çöp kutusunda
    let isaret: MetinIsareti | null = null;
    const ekle = (anahtar: string, tur: 'deger' | 'metin', dayanak: string, once: string | null, sonra: string | null, aciklama: string, acikMi: boolean) => {
      const kx = kararlar.get(anahtar);
      const karar = kx ? { durum: kx.durum as IncelemeKarari['durum'], gerekce: kx.gerekce as string, zaman: Number(kx.zaman), niyet: (kx.istisna as string | null) ?? null } : null;
      isaret ??= satir(e, r);
      const x: IsaretIncelemesi = { anahtar, tur, isaret, once, sonra, aciklama, karar };
      if (acikMi) {
        if (karar?.durum === 'ertelendi' && kx!.dayanak === dayanak) sonuc.ertelenen.push(x);
        else sonuc.acik.push({ ...x, karar: null });
      } else if (karar && karar.durum !== 'ertelendi') sonuc.kapanan.push(x);
    };
    // 1. Bağlı bilgi değişti (anlamı sınıflandırılmamış işarette yalnızca kayıt silinince ya da birleştirilince).
    if (r.hedef) {
      const imza = alanImzasi(e, r.hedef as string, (r.hedef_alan as string | null) ?? null);
      const degisti = r.imza !== null && imza !== r.imza;
      ekle(`isaret:${kod}`, 'deger', imza, null, alanYazisi(e, r.hedef as string, (r.hedef_alan as string | null) ?? null),
        r.hedef_alan ? 'İşaretlendiğinden beri bağlı olduğu bilgi değişti.' : 'Bağlı olduğu kayıt silindi ya da başka bir kayıtla birleştirildi.', degisti);
    }
    // 2. Kritik işaretli cümle değişti (F24).
    if (r.kritik && r.metin !== null) {
      const yerler = e.db.selectObjects('SELECT metin FROM metin_isaret_yerleri WHERE isaret=? AND kayit=? AND alan=?', [kod, r.kayit as string, r.alan as string]);
      const simdi = yerler.length === 1 ? (yerler[0].metin as string) : null;
      ekle(`isaret-metin:${kod}`, 'metin', simdi ?? '', r.metin as string, simdi, 'Kritik işaretli cümle değişti: düzeltme mi, yeni bir şey mi?', simdi !== null && simdi !== r.metin);
    }
  }
  return sonuc;
}

/** İnceleme kararı. Düzeltildi ya da kabul edildi denince işaret yeni hâle göre güncellenir; yeniden değişmedikçe açılmaz. */
export function isaretKarari(b: IsaretBaglami, anahtar: string, durum: 'kabul' | 'ertelendi' | 'duzeltildi' | null, gerekce: string, niyet: Niyet | null) {
  const m = /^(isaret|isaret-metin):(.+)$/.exec(anahtar);
  if (!m) throw new Error('Bu inceleme artık yok.');
  const r = bul(b.e, m[2]);
  if (r.silindi) throw new Error('İşaret kaldırılmış.');
  if (durum !== null && !['kabul', 'ertelendi', 'duzeltildi'].includes(durum)) throw new Error('Geçersiz karar.');
  if (niyet !== null && !NIYETLER.some((x) => x.kod === niyet)) throw new Error('Geçersiz seçim.');
  const g = temiz(gerekce, 500);
  if (durum === 'kabul' && !g && !niyet) throw new Error('Kabul ederken kısa bir gerekçe yazın.');
  const metinMi = m[1] === 'isaret-metin';
  let dayanak = '';
  const girdiler: IslemGirdisi[] = [];
  if (metinMi) {
    const yerler = b.e.db.selectObjects('SELECT metin FROM metin_isaret_yerleri WHERE isaret=? AND kayit=? AND alan=?', [r.kod as string, r.kayit as string, r.alan as string]);
    dayanak = yerler.length === 1 ? (yerler[0].metin as string) : '';
    if ((durum === 'kabul' || durum === 'duzeltildi') && dayanak) girdiler.push({ tur: 'metin_isareti_yaz', veri: { kod: r.kod, kayit: r.kayit, alan: 'metin', deger: dayanak } });
  } else if (r.hedef) {
    dayanak = alanImzasi(b.e, r.hedef as string, (r.hedef_alan as string | null) ?? null);
    if (durum === 'kabul' || durum === 'duzeltildi') girdiler.push({ tur: 'metin_isareti_yaz', veri: { kod: r.kod, kayit: r.kayit, alan: 'imza', deger: dayanak } });
  }
  const niyetAdi = niyet ? NIYETLER.find((x) => x.kod === niyet)!.ad : '';
  girdiler.push({ tur: 'inceleme_karari', veri: { anahtar, durum, gerekce: g || niyetAdi, dayanak, istisna: niyet, baslik: 'İşaretli cümle' } });
  b.yaz(girdiler, [r.kayit as string, ...(r.hedef ? [r.hedef as string] : [])]);
}
