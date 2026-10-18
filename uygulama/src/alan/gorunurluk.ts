// Bilgi katmanı ve bakış açısı (§3.6). Bir kayıt ya da ilişki ya evrenin gerçeğidir ya da yalnızca birinin
// (karakter, grup, okur) inancıdır. Gerçek olan bir şey gizli de olabilir: o zaman yalnızca seçilen bilenler görür.
// Bakış açısı süzgeci gerçeği yalnızca gizlemez; o bilenin inandığı alternatifi de gösterir.
// Grup inancı üyelere kendiliğinden geçmez ("Konsey biliyor" bütün üyelerin bildiği anlamına gelmez).
import { kodGecerliMi } from './kod';

export interface Gorunurluk {
  /** Doluysa bu, evrenin gerçeği değil; yalnızca bu kaydın (bilenin) inancıdır. */
  katman: string | null;
  /** Gerçek ama gizli: yalnızca `bilenler` bilir. */
  gizli: boolean;
  bilenler: string[];
}

export const GERCEK: Gorunurluk = { katman: null, gizli: false, bilenler: [] };


export function gorunurlukGecerli(v: unknown): v is Gorunurluk {
  if (!v || typeof v !== 'object') return false;
  const g = v as Partial<Gorunurluk>;
  if (g.katman !== null && !kodGecerliMi(g.katman)) return false;
  if (typeof g.gizli !== 'boolean') return false;
  if (!Array.isArray(g.bilenler) || g.bilenler.length > 200 || !g.bilenler.every((x) => kodGecerliMi(x))) return false;
  if (g.katman && (g.gizli || g.bilenler.length)) return false;
  return true;
}

export function gorunurlukOku(ham: unknown): Gorunurluk {
  if (!ham) return GERCEK;
  try {
    const v = typeof ham === 'string' ? JSON.parse(ham) : ham;
    return gorunurlukGecerli(v) ? v : GERCEK;
  } catch { return GERCEK; }
}

/** Sade gerçek (görünürlük kaydı gerekmez). */
export const sadeGercekMi = (g: Gorunurluk) => !g.katman && !g.gizli;

/**
 * Verilen bakış açısından görünüyor mu? `bakis` null ise evrenin gerçeği: inançlar gösterilmez, gizli gerçekler
 * gösterilir. `kod` birleştirme yönlendirmesini çözer.
 */
export function goruyorMu(g: Gorunurluk, bakis: string | null, kod: (k: string) => string = (k) => k): boolean {
  if (!bakis) return !g.katman;
  if (g.katman) return kod(g.katman) === bakis;
  if (g.gizli) return g.bilenler.some((b) => kod(b) === bakis);
  return true;
}
