// Okuma sırasında ardışık iki sahnenin evren tarihleri arasındaki fark (K39, öneri 7). Yalnız girilmiş tarihlere
// bakılır; metinden anlam çıkarılmaz (K1). Tarih geriye gidiyorsa bu bir bilgidir, hata sayılmaz: geri dönüş
// bilerek yazılmış olabilir.
import { anaTakvim, gunFarki, yilGunu, type EvrenTarihi, type TakvimYa } from './tarih';

export interface ZamanFarki { yazi: string; geri: boolean; aciklama: string }

const sayi = (n: number) => n.toLocaleString('tr-TR');

function sure(az: number, cok: number, yil: number): string {
  if (az >= yil) {
    const a = Math.floor(az / yil), c = Math.floor(cok / yil);
    return a === c ? `${sayi(a)} yıl` : `${sayi(a)}–${sayi(c)} yıl`;
  }
  return az === cok ? `${sayi(az)} gün` : cok >= yil ? `${sayi(az)} gün – ${sayi(Math.floor(cok / yil))} yıl` : `${sayi(az)}–${sayi(cok)} gün`;
}

/** Önceki sahneden bu sahneye geçen zaman; tarihlerden biri yoksa ya da aralıklar örtüşüyorsa (sıra belirsiz) null. */
export function zamanFarki(onceki: EvrenTarihi | null, simdiki: EvrenTarihi | null, t: TakvimYa): ZamanFarki | null {
  const f = gunFarki(onceki, simdiki);
  if (!f) return null;
  const yil = Math.max(1, yilGunu(anaTakvim(t)));
  if (f.enAz === 0 && f.enCok === 0) return { yazi: 'aynı gün', geri: false, aciklama: 'Önceki sahneyle aynı gün.' };
  if (f.enAz > 0) {
    const s = sure(f.enAz, f.enCok, yil);
    return { yazi: `+${s}`, geri: false, aciklama: `Önceki sahneden ${s} sonra.` };
  }
  if (f.enCok < 0) {
    const s = sure(-f.enCok, -f.enAz, yil);
    return { yazi: `−${s} ↺`, geri: true, aciklama: `Önceki sahneden ${s} önce geçiyor. Bilerek yazılmış bir geri dönüşse sorun yok.` };
  }
  return null;
}
