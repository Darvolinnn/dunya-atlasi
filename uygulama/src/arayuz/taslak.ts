// Metin kurtarma taslağı (§10.7): editördeki yazı, asıl kayda geçene kadar bu cihazın kendi veritabanında
// ayrıca tutulur (tarayıcının kendi kısa süreli belleği ani kapanmada kaybolabildiği için orada değil).
// Program aniden kapanırsa sonraki açılışta "kaydedilmemiş yazı bulundu" denir. Taslak evren verisi değildir,
// eşitlenmez; asıl kayıt başarılı olunca silinir, kendiliğinden hiçbir zaman uygulanmaz.
import type { Spans } from '../veri/api';

export interface TaslakDeposu { oku(k: string): Promise<string | null>; yaz(k: string, v: string): Promise<void>; sil(k: string): Promise<void> }
export interface Taslak { spans: Spans; temel: string[]; zaman: number }

export const taslakAnahtari = (evren: string, kayit: string, alan: string) => `${evren}:${kayit}:${alan}`;
/** Önceki oturumdan kalan, kullanıcının henüz karar vermediği taslak burada bekler; yeni yazı onu ezmez. */
export const kurtarmaAnahtari = (anahtar: string) => `${anahtar}:kurtarma`;

/** Yazar; yazılamadıysa (dolu depo) false döner. */
export async function taslakYaz(depo: TaslakDeposu, anahtar: string, t: Taslak): Promise<boolean> {
  try { await depo.yaz(anahtar, JSON.stringify(t)); return true; } catch { return false; }
}

export async function taslakOku(depo: TaslakDeposu, anahtar: string): Promise<Taslak | null> {
  try {
    const t = JSON.parse((await depo.oku(anahtar)) ?? 'null');
    return t && Array.isArray(t.spans) && Array.isArray(t.temel) && typeof t.zaman === 'number' ? t : null;
  } catch { return null; }
}

export async function taslakSil(depo: TaslakDeposu, anahtar: string) {
  try { await depo.sil(anahtar); } catch { /* yok */ }
}

/**
 * Metin açılınca: önceki oturumdan karar bekleyen taslak varsa o, yoksa son oturumun taslağı. Taslak kayıtlı
 * metinle aynıysa (kayıt yetişmiş) silinir. Farklıysa kurtarma alanına taşınır ve döner; taşıma yazılamazsa asıl
 * taslak yerinde kalır.
 */
export async function acilistaTaslak(depo: TaslakDeposu, anahtar: string, kayitli: Spans): Promise<Taslak | null> {
  const ayni = (t: Taslak) => JSON.stringify(t.spans) === JSON.stringify(kayitli);
  const bekleyen = await taslakOku(depo, kurtarmaAnahtari(anahtar));
  const son = await taslakOku(depo, anahtar);
  if (son && !ayni(son) && (!bekleyen || son.zaman > bekleyen.zaman)) {
    // Kurtarma alanına yazılamadıysa asıl taslak silinmez; bir sonraki açılışta yine bulunur.
    if (await taslakYaz(depo, kurtarmaAnahtari(anahtar), son)) await taslakSil(depo, anahtar);
    return son;
  }
  await taslakSil(depo, anahtar);
  if (bekleyen && ayni(bekleyen)) { await taslakSil(depo, kurtarmaAnahtari(anahtar)); return null; }
  return bekleyen;
}
