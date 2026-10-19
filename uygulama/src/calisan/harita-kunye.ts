import type { Database } from '@sqlite.org/sqlite-wasm';
import type { EvrenVt } from './evren-vt';
import type { IslemGirdisi } from '../alan/islem';
import { yonlendir, zamanSetiOku } from './izdusum';
import { tarihCoz } from '../alan/tarih';
import type { Catisma, HaritaKunyesi, HaritaKunyeTanimi } from '../veri/api';

type CatismaDegeri = Extract<Catisma, { tur: 'alan' }>['degerler'][number];

const METIN_SINIRI = 500;
const HATA_SINIRI = 300;
const EN_COK_HATA = 50;

export function nesneAnahtari(harita: string): string {
  return `harita_kunye:${harita}`;
}

export function haritaKoduCoz(nesne: string): string {
  return nesne.startsWith('harita_kunye:') ? nesne.slice('harita_kunye:'.length) : nesne;
}

function metinTemizle(deger: unknown, sinir = METIN_SINIRI): string {
  return typeof deger === 'string' ? deger.trim().slice(0, sinir) : '';
}

function tarihDenetle(e: EvrenVt, ifade: unknown): string {
  const t = metinTemizle(ifade, 120);
  if (!t) return '';
  if (!tarihCoz(t, zamanSetiOku(e.db))?.eksen) {
    throw new Error(`Tarih okunamadı: "${t}".`);
  }
  return t;
}

export function tanimTemizle(girdi: unknown, db?: Database): HaritaKunyeTanimi | null {
  if (!girdi || typeof girdi !== 'object') return null;
  const g = girdi as Partial<HaritaKunyeTanimi>;
  const tarih = metinTemizle(g.tarih, 120);
  const hamYapan = typeof g.yapan === 'string' && g.yapan.trim() ? g.yapan.trim() : null;
  const yapan = hamYapan ? (db ? yonlendir(db, hamYapan) : hamYapan) : null;
  const amac = metinTemizle(g.amac, METIN_SINIRI);
  const bilinenHatalar = Array.isArray(g.bilinenHatalar)
    ? g.bilinenHatalar.map((x) => metinTemizle(x, HATA_SINIRI)).filter(Boolean).slice(0, EN_COK_HATA)
    : [];
  if (!tarih && !yapan && !amac && bilinenHatalar.length === 0) return null;
  return { tarih, yapan, amac, bilinenHatalar };
}

function kayitAdiOku(db: Database, kod: string | null): string | null {
  if (!kod) return null;
  const k = yonlendir(db, kod);
  return (db.selectValue('SELECT ad FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]) as string | undefined) ?? null;
}

function satirdanKunye(db: Database, r: Record<string, unknown>): HaritaKunyesi | null {
  const harita = r.kod as string;
  const haritaAd = r.ad as string;
  let ham: unknown = null;
  try { ham = JSON.parse(r.tanim as string); } catch { return null; }
  const tanim = tanimTemizle(ham, db);
  if (!tanim) return null;
  const yapanAd = kayitAdiOku(db, tanim.yapan);
  const catismali = Number(
    db.selectValue('SELECT count(*) FROM alan_yazanlari WHERE nesne=? AND alan=?', [nesneAnahtari(harita), 'harita_kunye']) ?? 0,
  ) > 1;
  return { harita, haritaAd, tanim, yapanAd, catismali };
}

export function haritaKunyesi(e: EvrenVt, harita: string): HaritaKunyesi | null {
  const r = e.db.selectObject(
    `SELECT h.kod, h.ad, k.tanim
     FROM haritalar h
     JOIN harita_kunyeleri k ON k.harita = h.kod
     WHERE h.kod = ? AND h.silindi IS NULL`,
    [harita],
  );
  if (!r) return null;
  return satirdanKunye(e.db, r);
}

export function haritaKunyeleri(e: EvrenVt): HaritaKunyesi[] {
  const satirlar = e.db.selectObjects(
    `SELECT h.kod, h.ad, k.tanim
     FROM harita_kunyeleri k
     JOIN haritalar h ON h.kod = k.harita
     WHERE h.silindi IS NULL
     ORDER BY h.kod`,
  );
  const sonuc: HaritaKunyesi[] = [];
  for (const r of satirlar) {
    const k = satirdanKunye(e.db, r);
    if (k) sonuc.push(k);
  }
  return sonuc;
}

export function haritaKunyeYaz(
  e: EvrenVt,
  yaz: (islemler: IslemGirdisi[], kayitlar?: string[]) => void,
  harita: string,
  girdi: HaritaKunyeTanimi | null,
): void {
  const hr = e.db.selectObject('SELECT kod, ad, yer FROM haritalar WHERE kod=? AND silindi IS NULL', [harita]);
  if (!hr) throw new Error('Harita bulunamadı.');

  let temiz: HaritaKunyeTanimi | null = null;
  if (girdi !== null) {
    if (!girdi || typeof girdi !== 'object') throw new Error('Geçersiz harita künyesi.');
    const tarih = tarihDenetle(e, girdi.tarih);
    let yapan: string | null = null;
    if (typeof girdi.yapan === 'string' && girdi.yapan.trim()) {
      yapan = yonlendir(e.db, girdi.yapan.trim());
      const kr = e.db.selectObject('SELECT kod FROM kayitlar WHERE kod=? AND silindi IS NULL', [yapan]);
      if (!kr) throw new Error('Haritayı yapan kayıt bulunamadı.');
    }
    temiz = tanimTemizle({ ...girdi, tarih, yapan }, e.db);
  }

  const ilgili: string[] = [];
  if (hr.yer) ilgili.push(hr.yer as string);
  if (temiz?.yapan) ilgili.push(temiz.yapan);

  yaz([{ tur: 'harita_kunye_yaz', veri: { harita, haritaAd: hr.ad as string, tanim: temiz } }], ilgili);
}

export function catismaDegerYazisi(deger: unknown, kayitAdi: (kod: string) => string): string {
  const t = tanimTemizle(deger);
  if (!t) return '(boş)';
  const parcalar: string[] = [];
  if (t.tarih) parcalar.push(`tarih: ${t.tarih}`);
  if (t.yapan) parcalar.push(`yapan: ${kayitAdi(t.yapan)}`);
  if (t.amac) parcalar.push(`amaç: ${t.amac}`);
  if (t.bilinenHatalar.length > 0) parcalar.push(`${t.bilinenHatalar.length} bilinen hata`);
  return parcalar.join(' · ') || '(boş)';
}

export function catismaSatiri(
  e: EvrenVt,
  nesne: string,
  alan: string,
  degerler: CatismaDegeri[],
  kayitAdi: (kod: string) => string,
): Catisma {
  const harita = haritaKoduCoz(nesne);
  const hr = e.db.selectObject('SELECT ad, yer FROM haritalar WHERE kod=?', [harita]);
  return {
    tur: 'alan',
    nesne,
    alan,
    nesneTuru: hr?.yer ? 'kayit' : 'evren',
    kayit: (hr?.yer as string) ?? null,
    baslik: hr?.ad ? `“${hr.ad as string}” haritası` : 'Harita künyesi',
    alanEtiketi: 'Harita künyesi',
    degerler: degerler.map((d) => ({ ...d, yazi: catismaDegerYazisi(d.deger, kayitAdi) })),
  };
}

export function cozumGirdisi(e: EvrenVt, nesne: string, deger: unknown): IslemGirdisi {
  const harita = haritaKoduCoz(nesne);
  const hr = e.db.selectObject('SELECT ad FROM haritalar WHERE kod=?', [harita]);
  const temiz = tanimTemizle(deger, e.db);
  return {
    tur: 'harita_kunye_yaz',
    veri: { harita, haritaAd: (hr?.ad as string) ?? '', tanim: temiz, cozum: true },
  };
}
