// F24 değişiklik niyeti: önemli tarihli bir değer (tarihi olan, kesinleşmiş durum) değişirken yazar
// değişikliğin ne olduğunu seçer. Program anlam çıkarmaz; seçilen niyeti işlemlere çevirir.
// Her niyet tek bir işlem grubudur (§10.4). "Taslakta dene" dal açtığı için hizmette yapılır.
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { karsilastir } from '../alan/tarih';
import type { IslemGirdisi } from '../alan/islem';
import type { SinirGirdisi } from '../veri/api';
import { sinirBilgisi, sinirCoz, temiz, type DurumBaglami } from './durum';

export type DegerAlani = 'deger' | 'hedef';

function durumOku(b: DurumBaglami, kod: string) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT * FROM durumlar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Durum bulunamadı.');
  return r;
}

function yeniDeger(b: DurumBaglami, alan: DegerAlani, girdi: unknown): string | null {
  if (alan === 'deger') return temiz(girdi, 300);
  if (alan !== 'hedef') throw new Error('Yalnızca değer değiştirilebilir.');
  const h = girdi ? String(girdi) : null;
  if (h && (!kodGecerliMi(h) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [h]) === undefined)) throw new Error('Seçilen kayıt bulunamadı.');
  return h;
}

const ad = (b: DurumBaglami, kod: unknown) => (b.e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [kod as string]) as string | undefined) ?? 'Silinmiş kayıt';
const degerYazisi = (b: DurumBaglami, deger: unknown, hedef: unknown) => hedef ? ad(b, hedef) + (deger ? ` (${deger})` : '') : String(deger ?? '');

/** Eski değer başlangıcına kadar kalır; yeni değer verilen tarihten başlar. */
export function buTarihten(b: DurumBaglami, kod: string, alan: DegerAlani, girdi: unknown, tarih: SinirGirdisi | null) {
  const r = durumOku(b, kod);
  if (r.kip === 'anlik') throw new Error('Tek bir ana ait gözlem bir tarihten itibaren değiştirilemez. Eski kaydı düzeltin.');
  const v = yeniDeger(b, alan, girdi);
  const deger = alan === 'deger' ? v ?? '' : r.deger as string;
  const hedef = alan === 'hedef' ? v : (r.hedef as string | null) ?? null;
  if (!deger && !hedef) throw new Error('Bir değer yazın.');
  if (deger === r.deger && hedef === (r.hedef ?? null)) throw new Error('Yeni değer eskisiyle aynı.');
  const t = sinirCoz(b, tarih);
  if (!t) throw new Error('Yeni değerin hangi tarihten itibaren geçerli olduğunu yazın.');
  const yeniBas = sinirBilgisi(b, t)?.tarih ?? null;
  const eskiBas = sinirBilgisi(b, r.baslangic ? JSON.parse(r.baslangic as string) : null)?.tarih ?? null;
  const eskiBitisHam = r.bitis ? JSON.parse(r.bitis as string) : null;
  const eskiBit = r.kip === 'aralik' ? sinirBilgisi(b, eskiBitisHam)?.tarih ?? null : null;
  if (!yeniBas) throw new Error('Bağlanan olayın tarihi yok. Bir tarih yazın.');
  if (eskiBas && karsilastir(eskiBas, yeniBas) !== 'once') throw new Error('Yeni tarih, eski değerin başlangıcından kesin olarak sonra olmalı.');
  if (eskiBit && karsilastir(yeniBas, eskiBit) !== 'once') throw new Error('Yeni tarih, eski değerin bitişinden önce olmalı.');
  const konu = r.konu as string;
  const girdiler: IslemGirdisi[] = [];
  if (r.kip === 'aralik') girdiler.push({ tur: 'durum_degistir', veri: { kod, alan: 'bitis', deger: t, onceki: eskiBitisHam, konu, ozellik: r.ozellik, niyet: 'bu_tarihten' } });
  const yeni = yeniKod();
  girdiler.push({ tur: 'durum_ekle', veri: {
    kod: yeni, konu, ozellik: r.ozellik, deger, ...(hedef ? { hedef } : {}), kip: r.kip, karar: r.karar,
    baslangic: t, bitis: r.kip === 'aralik' ? eskiBitisHam : null, niyet: 'bu_tarihten',
  } });
  b.yaz(girdiler, [konu, ...(hedef ? [hedef] : [])]);
  return { kod: yeni };
}

/**
 * Gerçek değişmez; bir bilen yeni değere inanır. Değer, eski (gerçek) ve yeni cevaplı bir soruya çevrilir;
 * aynı soru daha önce açıldıysa o kullanılır.
 */
export function inanc(b: DurumBaglami, kod: string, alan: DegerAlani, girdi: unknown, bilen: string, tarih: SinirGirdisi | null) {
  const r = durumOku(b, kod);
  const v = yeniDeger(b, alan, girdi);
  if (!kodGecerliMi(bilen) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [bilen]) === undefined) throw new Error('İnancı değişen kişiyi seçin.');
  const konu = r.konu as string;
  if (bilen === konu) throw new Error('Kaydın kendisi dışında birini seçin.');
  const eski = degerYazisi(b, r.deger, r.hedef);
  const yeniYazi = alan === 'deger' ? degerYazisi(b, v, r.hedef) : degerYazisi(b, r.deger, v);
  if (!yeniYazi.trim()) throw new Error('Bir değer yazın.');
  if (eski.toLocaleLowerCase('tr-TR') === yeniYazi.toLocaleLowerCase('tr-TR')) throw new Error('Yeni değer eskisiyle aynı.');
  const bas = sinirBilgisi(b, r.baslangic ? JSON.parse(r.baslangic as string) : null)?.tarih;
  const soru = temiz(`${r.ozellik}${bas ? ` · ${bas.ifade} tarihinden itibaren` : ''}`, 300, false);
  const baslangic = sinirCoz(b, tarih);
  const girdiler: IslemGirdisi[] = [];
  let iddia: string | null = null, secenek: string | null = null;
  for (const x of b.e.db.selectObjects('SELECT kod, secenekler FROM iddialar WHERE konu=? AND soru=? AND silindi IS NULL', [konu, soru])) {
    const l = JSON.parse(x.secenekler as string) as { kod: string; metin: string }[];
    const s = l.find((y) => y.metin.toLocaleLowerCase('tr-TR') === yeniYazi.toLocaleLowerCase('tr-TR'));
    if (s && l.some((y) => y.metin.toLocaleLowerCase('tr-TR') === eski.toLocaleLowerCase('tr-TR'))) { iddia = x.kod as string; secenek = s.kod; break; }
  }
  if (!iddia) {
    iddia = yeniKod();
    const gercek = yeniKod();
    secenek = yeniKod();
    girdiler.push({ tur: 'iddia_ekle', veri: { kod: iddia, konu, soru, secenekler: [{ kod: gercek, metin: eski }, { kod: secenek, metin: yeniYazi }], gercek, karar: 'kesin', niyet: 'inanc' } });
  }
  const bilgi = yeniKod();
  girdiler.push({ tur: 'bilgi_ekle', veri: {
    kod: bilgi, iddia, bilen, inanc: 'inaniyor', secenek, saklama: null, kaynak: null, kaynakKayit: null, sahne: null,
    baslangic, bitis: null, aciklama: '', karar: 'kesin', soru, niyet: 'inanc',
  } });
  b.yaz(girdiler, [konu, bilen]);
  return { iddia, bilgi };
}
