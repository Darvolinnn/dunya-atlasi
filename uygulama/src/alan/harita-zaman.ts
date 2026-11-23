// Haritada zaman (K38, §8.2): kaydın kuruluş ve yıkılış tarihine göre işaretin durumu, süren yolculukta kafilenin
// yol üstündeki yaklaşık yeri. Saf hesaplar; tarih eksenindeki sayılarla çalışır.
import { karsilastir, type EvrenTarihi } from './tarih';

export type VarlikDurumu = 'var' | 'henuz-yok' | 'yikilmis' | 'belirsiz';

/** Seçilen tarihte kayıt var mı: kuruluştan önceyse "henüz yok", yıkılıştan sonraysa "yıkılmış"; ayrışmıyorsa "belirsiz". */
export function varlikDurumu(kurulus: EvrenTarihi | null, yikilis: EvrenTarihi | null, an: EvrenTarihi | null): VarlikDurumu {
  if (!an?.eksen) return 'var';
  const k = kurulus?.eksen ? karsilastir(kurulus, an) : 'once';
  if (k === 'sonra') return 'henuz-yok';
  const y = yikilis?.eksen ? karsilastir(yikilis, an) : 'sonra';
  if (y === 'once') return 'yikilmis';
  return k === 'belirsiz' || y === 'belirsiz' ? 'belirsiz' : 'var';
}

const sinirla = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Çıkış ve varış arasında seçilen tarihte yolun ne kadarının alındığı: [en az, en çok] (0–1). Sabit hızla gidildiği
 * varsayılır. Tarihlerden biri eksikse ya da seçilen tarih yolculuğun dışındaysa null.
 */
export function yolOrani(cikis: EvrenTarihi | null, varis: EvrenTarihi | null, an: EvrenTarihi | null): [number, number] | null {
  const c = cikis?.eksen, v = varis?.eksen, a = an?.eksen;
  if (!c || !v || !a || c.enErken === null || c.enGec === null || v.enErken === null || v.enGec === null || a.enErken === null || a.enGec === null) return null;
  if (a.enGec < c.enErken || a.enErken > v.enGec + 1) return null;
  const oran = (t: number, bas: number, bit: number) => (bit <= bas ? (t >= bit ? 1 : 0) : sinirla((t - bas) / (bit - bas)));
  // En geride: geç çıkmış, geç varacak, seçilen anın başı. En ileride: erken çıkmış, erken varacak, anın sonu.
  const enAz = oran(a.enErken, c.enGec, v.enGec + 1), enCok = oran(a.enGec + 1, c.enErken, v.enErken);
  return [Math.min(enAz, enCok), Math.max(enAz, enCok)];
}

type Nokta = [number, number];
const uzunluk = (l: readonly Nokta[]) => l.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - l[i][0], p[1] - l[i][1]), 0);

/** Çizginin başından itibaren uzunluğunun `oran` kadarındaki nokta. */
export function cizgiUstunde(l: readonly Nokta[], oran: number): Nokta {
  if (l.length < 2) return l[0] ?? [0, 0];
  let kalan = uzunluk(l) * sinirla(oran);
  for (let i = 1; i < l.length; i++) {
    const [x0, y0] = l[i - 1], [x1, y1] = l[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (kalan <= d || i === l.length - 1) { const t = d ? Math.min(1, kalan / d) : 0; return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]; }
    kalan -= d;
  }
  return l[l.length - 1];
}

/** Çizginin `a` ile `b` oranları arasındaki parçası. */
export function cizgiParcasi(l: readonly Nokta[], a: number, b: number): Nokta[] {
  if (l.length < 2) return [...l];
  const top = uzunluk(l), bas = top * sinirla(Math.min(a, b)), bit = top * sinirla(Math.max(a, b));
  const sonuc: Nokta[] = [cizgiUstunde(l, top ? bas / top : 0)];
  let yol = 0;
  for (let i = 1; i < l.length; i++) {
    yol += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
    if (yol > bas && yol < bit) sonuc.push(l[i]);
  }
  sonuc.push(cizgiUstunde(l, top ? bit / top : 1));
  return sonuc;
}
