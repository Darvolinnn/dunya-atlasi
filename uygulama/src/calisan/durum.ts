// Durum geçmişi (§3.5) ve sahne bağlam paneli (§5.5). Aralıklar evren zamanına bağlanır; sınır bir olaya
// bağlanırsa olayın tarihi değişince kendiliğinden kayar (dayanak görünür; gizli çapa yoktur).
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { farkCoz, farkGecerli, farkYazisi, kaydir, tarihCoz, siraAnahtari, karsilastir, type EvrenTarihi, type Fark } from '../alan/tarih';
import { ayrilmaYazisi } from '../alan/turkce-ek';
import { durumKipiGecerli, gecerlilik, type DurumKipi, type Sinir } from '../alan/durum';
import type { DurumGirdisi, DurumSatiri, SinirBilgisi } from '../veri/api';
import { kararGecerli } from '../alan/turler';
import type { EvrenVt } from './evren-vt';
import { takvimOku, zamanSetiOku } from './izdusum';

export interface DurumBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  olayTarihi(kod: string): EvrenTarihi | null;
}

/** Saklanan sınır: tarih ya da bir olay ve isteğe bağlı fark (olayın tarihi okunurken alınır). */
export interface SinirVerisi { tarih?: EvrenTarihi | null; olay?: string | null; fark?: Fark | null }

export const temiz = (s: unknown, uzunluk: number, bos = true) => {
  const x = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!x && !bos) throw new Error('Boş olamaz.');
  if (x.length > uzunluk) throw new Error('Metin çok uzun.');
  return x;
};

export function sinirCoz(b: DurumBaglami, girdi: { ifade?: string; olay?: string | null; fark?: string | null } | null | undefined): SinirVerisi | null {
  if (!girdi) return null;
  if (girdi.olay) {
    if (!kodGecerliMi(girdi.olay) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [girdi.olay]) === undefined) throw new Error('Bağlanan olay bulunamadı.');
    const f = String(girdi.fark ?? '').trim();
    if (!f) return { olay: girdi.olay };
    const fark = farkCoz(f);
    if (!fark) throw new Error('Farkı “3 gün sonra” ya da “2 yıl önce” gibi yaz; boş bırakırsan olayın kendi tarihi kullanılır.');
    return { olay: girdi.olay, fark };
  }
  const t = tarihCoz(temiz(girdi.ifade, 120), zamanSetiOku(b.e.db));
  return t ? { tarih: t } : null;
}

export function sinirBilgisi(b: DurumBaglami, v: SinirVerisi | null): SinirBilgisi | null {
  if (!v) return null;
  if (v.olay) {
    const r = b.e.db.selectObject('SELECT ad, tur, okunus FROM kayitlar WHERE kod=?', [v.olay]);
    const ad = (r?.ad as string | undefined) ?? 'Silinmiş kayıt';
    const t = b.olayTarihi(v.olay);
    if (!v.fark || !farkGecerli(v.fark)) return { tarih: t, olay: { kod: v.olay, ad } };
    // Olay + fark: olayın tarihi değişince sınır da kayar (çapalı sınır, §3.5).
    const ana = takvimOku(b.e.db);
    const ayrilma = r ? ayrilmaYazisi(ad, r.tur as string, (r.okunus as string) ?? '') : ayrilmaYazisi(ad);
    const tarih: EvrenTarihi | null = t ? { ifade: `${ayrilma} ${farkYazisi(v.fark)}`, bicim: 'goreli', hassasiyet: v.fark.birim === 'yil' ? 'yil' : t.hassasiyet,
      takvim: ana.kod, takvimSurumu: ana.surum, kisitlar: [{ olay: v.olay, ...v.fark }], eksen: kaydir(t.eksen, v.fark, ana) } : null;
    return { tarih, olay: { kod: v.olay, ad }, fark: v.fark };
  }
  return { tarih: v.tarih ?? null, olay: null };
}
const sinir = (s: SinirBilgisi | null): Sinir => (s ? s.tarih : 'acik');

/** Bir kaydın durum geçmişi. `an` verilirse her satırın o andaki geçerliliği de hesaplanır. */
export function durumlar(b: DurumBaglami, konu: string, an?: EvrenTarihi | null): DurumSatiri[] {
  const satirlar = b.e.db.selectObjects(
    `SELECT d.*, h.ad hedef_ad, h.tur hedef_tur FROM durumlar d LEFT JOIN kayitlar h ON h.kod=d.hedef
     WHERE d.konu=? AND d.silindi IS NULL ORDER BY d.ozellik, d.olusturma`, [konu]);
  const liste: DurumSatiri[] = satirlar.map((r) => ({
    kod: r.kod as string, konu, ozellik: r.ozellik as string, deger: r.deger as string,
    hedef: r.hedef ? { kod: r.hedef as string, ad: (r.hedef_ad as string) ?? 'Silinmiş kayıt', tur: (r.hedef_tur as string) ?? 'diger' } : null,
    kip: (durumKipiGecerli(r.kip) ? r.kip : 'aralik') as DurumKipi, karar: r.karar as string,
    baslangic: sinirBilgisi(b, r.baslangic ? JSON.parse(r.baslangic as string) : null),
    bitis: sinirBilgisi(b, r.bitis ? JSON.parse(r.bitis as string) : null),
    sonraki: null, uyari: null,
  }));
  // Aynı özelliğin kayıtları başlangıca göre sıralanır; "sonraki değişikliğe kadar" bir sonrakinde biter.
  const ozellikler = new Map<string, DurumSatiri[]>();
  for (const d of liste) {
    const anahtar = d.ozellik.toLocaleLowerCase('tr-TR');
    ozellikler.set(anahtar, [...(ozellikler.get(anahtar) ?? []), d]);
  }
  const sirali: DurumSatiri[] = [];
  for (const grup of ozellikler.values()) {
    grup.sort((x, y) => siraAnahtari(x.baslangic?.tarih ?? null) - siraAnahtari(y.baslangic?.tarih ?? null));
    grup.forEach((d, i) => {
      if (d.kip === 'sonraki') {
        const sonra = grup.slice(i + 1).find((x) => x.kip !== 'anlik' && x.baslangic?.tarih && d.baslangic?.tarih && karsilastir(d.baslangic.tarih, x.baslangic.tarih) !== 'sonra');
        d.sonraki = sonra?.baslangic ?? null;
      }
      if (d.baslangic?.tarih && d.bitis?.tarih && karsilastir(d.baslangic.tarih, d.bitis.tarih) === 'sonra') d.uyari = 'Bitiş, başlangıçtan önce görünüyor.';
      if (d.baslangic?.olay && !d.baslangic.tarih) d.uyari = `Başlangıcın bağlı olduğu “${d.baslangic.olay.ad}” kaydının tarihi yok; zamanı belirsiz.`;
      if (an !== undefined) d.gecerli = gecerlilik(d.kip, sinir(d.baslangic), d.kip === 'sonraki' ? sinir(d.sonraki) : sinir(d.bitis), an);
    });
    sirali.push(...grup);
  }
  return sirali;
}

export function durumEkle(b: DurumBaglami, konu: string, g: DurumGirdisi) {
  const ozellik = temiz(g.ozellik, 80, false);
  const deger = temiz(g.deger, 300);
  const hedef = g.hedef ?? null;
  if (hedef && (!kodGecerliMi(hedef) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [hedef]) === undefined)) throw new Error('Seçilen kayıt bulunamadı.');
  if (!deger && !hedef) throw new Error('Değer boş olamaz.');
  const kip = g.kip ?? 'sonraki';
  if (!durumKipiGecerli(kip)) throw new Error('Geçersiz süre biçimi.');
  const karar = g.karar ?? 'kesin';
  if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
  const baslangic = sinirCoz(b, g.baslangic);
  const bitis = kip === 'aralik' ? sinirCoz(b, g.bitis) : null;
  if (kip === 'anlik' && !baslangic) throw new Error('Anlık gözlemin bir tarihi olmalı.');
  const kod = yeniKod();
  b.yaz([{ tur: 'durum_ekle', veri: { kod, konu, ozellik, deger, ...(hedef ? { hedef } : {}), kip, karar, baslangic, bitis } }], [konu, ...(hedef ? [hedef] : [])]);
  return { kod };
}

function durumBul(b: DurumBaglami, kod: string) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT * FROM durumlar WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('Durum bulunamadı.');
  return r;
}

export function durumDegistir(b: DurumBaglami, kod: string, alan: string, girdi: unknown) {
  const r = durumBul(b, kod);
  let deger: unknown;
  switch (alan) {
    case 'ozellik': deger = temiz(girdi, 80, false); break;
    case 'deger': deger = temiz(girdi, 300); break;
    case 'hedef':
      deger = girdi ? String(girdi) : null;
      if (deger && (!kodGecerliMi(deger) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [deger]) === undefined)) throw new Error('Seçilen kayıt bulunamadı.');
      break;
    case 'kip': if (!durumKipiGecerli(girdi)) throw new Error('Geçersiz süre biçimi.'); deger = girdi; break;
    case 'karar': if (!kararGecerli(girdi)) throw new Error('Geçersiz karar durumu.'); deger = girdi; break;
    case 'baslangic': case 'bitis': deger = sinirCoz(b, girdi as { ifade?: string; olay?: string | null } | null); break;
    default: throw new Error('Bu alan değiştirilemez.');
  }
  const ham = r[alan];
  const onceki = alan === 'baslangic' || alan === 'bitis' ? (ham ? JSON.parse(ham as string) : null) : ham ?? null;
  if (JSON.stringify(onceki) === JSON.stringify(deger)) return;
  b.yaz([{ tur: 'durum_degistir', veri: { kod, alan, deger, onceki, konu: r.konu, ozellik: r.ozellik } }], [r.konu as string]);
}

export function durumSil(b: DurumBaglami, kod: string, geriYukle = false) {
  const r = durumBul(b, kod);
  b.yaz([{ tur: geriYukle ? 'durum_geri_yukle' : 'durum_sil', veri: { kod, konu: r.konu, ozellik: r.ozellik } }], [r.konu as string]);
}

/** Kullanılmış özellik adları (yeni durum eklerken öneri). */
export function ozellikAdlari(e: EvrenVt): string[] {
  return (e.db.selectObjects('SELECT ozellik, count(*) n FROM durumlar WHERE silindi IS NULL GROUP BY ozellik ORDER BY n DESC LIMIT 50') as { ozellik: string }[]).map((r) => r.ozellik);
}
