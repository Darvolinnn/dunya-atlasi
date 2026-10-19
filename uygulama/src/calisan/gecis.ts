// Mümkün ile erişilebilir (F09, §8.4). Fiziksel erişim (rota), bilgi (yolu bilir), izin, kaynak ve seçilen eylem ayrı
// katmanlardır. Bir rotaya geçiş şartı bağlanabilir: izin (gereken mühür, belge ya da makam kaydı) ya da ücret. İzin,
// kişiden o kayda tarihli "taşıdığı izin" ilişkisidir; geçerliliği yola çıkışta değil, rotanın başına varış anında
// değerlendirilir (D17). Ücretin ödenip ödenemeyeceğini program bilmez, yalnızca gösterir; geçip geçmediği yazarın
// seçtiği eylemdir. Program kişinin izni olduğunu ya da geçidin açık olduğunu varsaymaz.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { GUN_PARCA, type EvrenTarihi } from '../alan/tarih';
import type { GecisSarti, GecisSartiGirdisi, KisaKayit, RotaAdimi, SartDurumu } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

export const IZIN_ILISKISI = 'izinli';
interface SakliSart { kod: string; tur: 'izin' | 'ucret'; kayit: string | null; aciklama: string }

function kisa(e: EvrenVt, kod: string | null): KisaKayit | null {
  if (!kod) return null;
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : null;
}

function sakli(e: EvrenVt, rota: string): SakliSart[] {
  const r = e.db.selectValue('SELECT sartlar FROM rota_gecis_sartlari WHERE rota=?', [rota]) as string | undefined;
  return r ? JSON.parse(r) as SakliSart[] : [];
}

export function sartlar(e: EvrenVt, rota: string): GecisSarti[] {
  return sakli(e, rota).map((s) => ({ kod: s.kod, tur: s.tur, kayit: kisa(e, s.kayit), aciklama: s.aciklama }));
}

export function sartlarYaz(b: { e: EvrenVt; yaz(g: IslemGirdisi[], k: string[]): void }, rota: string, girdi: GecisSartiGirdisi[]) {
  const t = kodGecerliMi(rota) ? b.e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [rota]) : undefined;
  if (t !== 'rota') throw new Error('Bu bir rota kaydı değil.');
  if (!Array.isArray(girdi) || girdi.length > 20) throw new Error('Geçiş şartları geçersiz.');
  const yeni: SakliSart[] = girdi.map((g) => {
    if (g?.tur !== 'izin' && g?.tur !== 'ucret') throw new Error('Şart izin ya da ücret olmalı.');
    const aciklama = String(g.aciklama ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
    let kayit: string | null = null;
    if (g.kayit) {
      if (!kodGecerliMi(g.kayit) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [g.kayit]) === undefined) throw new Error('Seçilen kayıt bulunamadı.');
      kayit = g.kayit;
    }
    if (g.tur === 'izin' && !kayit) throw new Error('İzin için gereken mührü, belgeyi ya da makamı seçin.');
    if (g.tur === 'ucret' && !aciklama) throw new Error('Ücreti yazın (ör. 3 gümüş).');
    return { kod: g.kod && kodGecerliMi(g.kod) ? g.kod : yeniKod(), tur: g.tur, kayit, aciklama };
  });
  if (JSON.stringify(yeni) === JSON.stringify(sakli(b.e, rota))) return;
  b.yaz([{ tur: 'rota_sart_yaz', veri: { rota, sartlar: yeni } }], [rota, ...yeni.map((s) => s.kayit).filter((x): x is string => !!x)]);
}

type Aralik = [number, number];
function aralik(t: EvrenTarihi | null | undefined): Aralik | null {
  const x = t?.eksen;
  if (!x || (x.enErken === null && x.enGec === null)) return null;
  return [x.enErken ?? -Infinity, x.enGec ?? Infinity];
}

/** Kişinin izni varış anında geçerli mi? Varış bilinmiyorsa yalnızca tarihsiz izin geçerli sayılır. */
export function izinDurumu(e: EvrenVt, kisi: string, izin: string, varis: Aralik | null): SartDurumu['durum'] {
  const l = e.db.selectObjects(`SELECT baslangic, bitis FROM iliskiler WHERE a=? AND b=? AND tur=? AND silindi IS NULL AND karar<>'vazgecildi'`,
    [yonlendir(e.db, kisi), yonlendir(e.db, izin), IZIN_ILISKISI]);
  if (!l.length) return 'yok';
  const durumlar = l.map((r): SartDurumu['durum'] => {
    const bas = aralik(r.baslangic ? JSON.parse(r.baslangic as string) : null), bit = aralik(r.bitis ? JSON.parse(r.bitis as string) : null);
    if (!bas && !bit) return 'gecerli';
    if (!varis) return 'tarih_yok';
    if ((!bas || bas[1] <= varis[0]) && (!bit || bit[0] >= varis[1])) return 'gecerli';
    if (bit && bit[1] < varis[0]) return 'bitmis';
    if (bas && bas[0] > varis[1]) return 'baslamamis';
    return 'belirsiz';
  });
  for (const d of ['gecerli', 'belirsiz', 'tarih_yok', 'bitmis', 'baslamamis'] as const) if (durumlar.includes(d)) return d;
  return 'yok';
}

/** Yolun adımlarına geçiş şartlarını ve kişinin durumunu ekler. Varış: çıkış + önceki adımların süresi. */
export function adimlaraSartEkle(e: EvrenVt, adimlar: RotaAdimi[], kisi: string | null, cikis: EvrenTarihi | null): RotaAdimi[] {
  let varis = aralik(cikis);
  return adimlar.map((a) => {
    const v = varis;
    const s = sakli(e, a.rota.kod).map((x): SartDurumu => ({
      tur: x.tur, kayit: kisa(e, x.kayit), aciklama: x.aciklama,
      durum: x.tur === 'ucret' ? 'ucret' : !kisi ? 'kisi_yok' : izinDurumu(e, kisi, x.kayit!, v),
    }));
    varis = v && a.gun !== null ? [v[0] + a.gun * GUN_PARCA, v[1] + a.gun * GUN_PARCA] : null;
    return s.length ? { ...a, sartlar: s } : a;
  });
}

/** Yolculuk aşaması için: yolcuların rotanın izin şartlarını aşamanın çıkış anında karşılayıp karşılamadığı. */
export function asamaIzinUyarisi(e: EvrenVt, rota: string, yolcular: KisaKayit[], cikis: EvrenTarihi | null): string | null {
  const izinler = sakli(e, rota).filter((s) => s.tur === 'izin' && s.kayit);
  if (!izinler.length || !yolcular.length) return null;
  const v = aralik(cikis), sorunlar: string[] = [];
  for (const s of izinler) for (const y of yolcular) {
    const d = izinDurumu(e, y.kod, s.kayit!, v);
    if (d === 'gecerli' || d === 'tarih_yok') continue;
    sorunlar.push(`${y.ad}: ${kisa(e, s.kayit)?.ad ?? 'gereken izin'} ${d === 'yok' ? 'kayıtlı değil' : d === 'bitmis' ? 'geçide varıldığında bitmiş' : d === 'baslamamis' ? 'geçide varıldığında henüz başlamamış' : 'geçerliliği belirsiz'}`);
  }
  return sorunlar.length ? `Geçiş izni: ${sorunlar.join('; ')}. Program geçişi engellemez; açıklama gerekebilir.` : null;
}
