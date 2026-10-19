// F23 bağlam karşılaştırma masası (§7, §5.2): aynı kayıt iki ile dört bağlamda yan yana. Bağlam; içeriğin hangi
// kaynağı (güncel, adlandırılmış sürüm ya da deneme kopyası), hangi evren tarihi ve kimin bilgisidir. Yayın kapsamı
// şimdilik yoktur (K20). Bir satır sütunlar arasında farklıysa farkın hangi bağlamdan gelebileceği söylenir: şablon
// alanı ve gerçek yalnızca kaynağa, zamanla değişen değer kaynağa ve tarihe, bilgi her üçüne bağlıdır. Anlam
// karşılaştırılmaz; aynı alan ve aynı soru eşleşir.
import type { BaglamKarsilastirmasi, BaglamSatiri, DurumSatiri, KisaKayit } from '../veri/api';
import type { EvrenTarihi } from '../alan/tarih';
import { tarihCoz } from '../alan/tarih';
import type { EvrenVt } from './evren-vt';
import { karsilastirmaliOkuma } from './gundelik';
import { anBilgisi, kayitIddialari } from './bilgi';
import type { DurumBaglami } from './durum';
import { zamanSetiOku } from './izdusum';

export type Eksen = 'kaynak' | 'tarih' | 'bilen';
export const EKSEN_ADI: Record<Eksen, string> = { kaynak: 'kaynak (sürüm ya da deneme)', tarih: 'evren zamanı', bilen: 'bilgi katmanı' };
const ETKILEYEN: Record<BaglamSatiri['grup'], Eksen[]> = { alan: ['kaynak'], soru: ['kaynak'], gercek: ['kaynak'], durum: ['kaynak', 'tarih'], bilgi: ['kaynak', 'tarih', 'bilen'] };

export interface Sutun {
  kaynakAnahtari: string; kaynakAdi: string; tarih: string | null; bilen: KisaKayit | null;
  e: EvrenVt; b: DurumBaglami; durumOku: (kod: string, an: EvrenTarihi | null) => DurumSatiri[];
}

export function karsilastir(kayit: string, sutunlar: Sutun[]): BaglamKarsilastirmasi {
  if (sutunlar.length < 2 || sutunlar.length > 4) throw new Error('İki ila dört bağlam seçin.');
  const satirlar = new Map<string, BaglamSatiri>();
  const koy = (anahtar: string, baslik: string, grup: BaglamSatiri['grup'], i: number, deger: string | null) => {
    if (!satirlar.has(anahtar)) satirlar.set(anahtar, { baslik, grup, degerler: sutunlar.map(() => null), farkli: false, neden: [] });
    const s = satirlar.get(anahtar)!;
    s.degerler[i] = s.degerler[i] && deger ? `${s.degerler[i]}; ${deger}` : deger ?? s.degerler[i];
  };
  const basliklar: BaglamKarsilastirmasi['sutunlar'] = [];
  sutunlar.forEach((c, i) => {
    const e = c.e;
    const var_ = e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kayit]) !== undefined;
    const ad = var_ ? e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [kayit]) as string : null;
    const an = c.tarih ? tarihCoz(c.tarih, zamanSetiOku(e.db)) : null;
    basliklar.push({ kaynak: c.kaynakAdi, tarih: an, bilen: c.bilen, ad, yok: !var_ });
    if (!var_) return;
    const o = karsilastirmaliOkuma(e, [{ kayit, tarih: c.tarih }], c.durumOku);
    koy('ad', 'Ad', 'alan', i, ad);
    const ozet = e.db.selectValue('SELECT ozet FROM kayitlar WHERE kod=?', [kayit]) as string;
    if (ozet) koy('ozet', 'Özet', 'alan', i, ozet);
    for (const s of o.satirlar) koy(`${s.grup}:${s.baslik}`, s.baslik, s.grup, i, s.degerler[0]);
    const iddialar = kayitIddialari(c.b, kayit);
    for (const d of iddialar) {
      const g = d.secenekler.find((x) => x.kod === d.gercek);
      koy(`gercek:${d.kod}`, `Gerçek: ${d.soru}`, 'gercek', i, g ? g.metin : 'açık bırakıldı');
    }
    if (c.bilen) {
      const kendi = new Set(iddialar.map((d) => d.kod));
      for (const x of anBilgisi(c.b, c.bilen.kod, an)) {
        if (!kendi.has(x.iddia.kod)) continue;
        const yazi = x.satirlar.map((s) => `${s.gecerli === 'belirsiz' ? 'belki: ' : ''}${s.etiket.ad}${s.secenek ? ` “${s.secenek.metin}”` : ''}`).join('; ');
        koy(`bilgi:${x.iddia.kod}`, `Bilen için: ${x.iddia.soru}`, 'bilgi', i, yazi);
      }
    }
  });
  // Hangi bağlam eksenleri sütunlar arasında değişiyor?
  const degisen = new Set<Eksen>();
  const anahtar = (c: Sutun, x: Eksen) => x === 'kaynak' ? c.kaynakAnahtari : x === 'tarih' ? (c.tarih ?? '').trim().toLocaleLowerCase('tr-TR') : c.bilen?.kod ?? '';
  for (const x of ['kaynak', 'tarih', 'bilen'] as Eksen[]) if (new Set(sutunlar.map((c) => anahtar(c, x))).size > 1) degisen.add(x);
  const sonuc = [...satirlar.values()].filter((s) => s.degerler.some((d) => d !== null)).map((s) => {
    const dolu = s.degerler.map((d, i) => basliklar[i].yok ? undefined : d);
    const farkli = new Set(dolu.filter((d) => d !== undefined)).size > 1;
    return { ...s, farkli, neden: farkli ? ETKILEYEN[s.grup].filter((x) => degisen.has(x)).map((x) => EKSEN_ADI[x]) : [] };
  });
  const notlar = ['Boş hücre “yok” demek değildir; o bağlamda bir şey yazılmadığını gösterir. Yalnızca aynı alanlar ve aynı sorular yan yana konur, anlam benzerliğine bakılmaz.'];
  if (degisen.has('kaynak') && (degisen.has('tarih') || degisen.has('bilen'))) notlar.push('Bağlamlar farklı kaynaklardan seçildi. Burada gördüğünüz bir karşılaştırmadır, eski sürümün ya da deneme kopyasının kendisi değildir.');
  if (!degisen.size) notlar.push('Seçilen bağlamlar aynı, bu yüzden fark çıkmaz.');
  return { sutunlar: basliklar, satirlar: sonuc, notlar };
}
