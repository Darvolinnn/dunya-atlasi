// İddia ve bilgi durumu (§3.6). Önerme (iddia), ileri sürme ve inanma ayrı kayıtlardır. Arayüzdeki kısa liste
// (bilmiyor · yanlış biliyor · şüpheleniyor · biliyor ama saklıyor · biliyor) üç ayrı eksenden türetilir:
// inanç derecesi, gerçekle uyum (yalnızca yazar gerçeği belirlediyse) ve saklama.
import { kodGecerliMi } from './kod';
import { tarihMi } from './tarih';
import { kararGecerli } from './turler';

export type Inanc = 'bilmiyor' | 'inaniyor' | 'supheleniyor' | 'reddediyor';
export const INANCLAR: { kod: Inanc; ad: string }[] = [
  { kod: 'inaniyor', ad: 'İnanıyor' },
  { kod: 'supheleniyor', ad: 'Şüpheleniyor' },
  { kod: 'reddediyor', ad: 'Reddediyor' },
  { kod: 'bilmiyor', ad: 'Bilmiyor' },
];
export type BilgiKaynagi = 'gordu' | 'duydu' | 'belge' | 'cikarim';
export const BILGI_KAYNAKLARI: { kod: BilgiKaynagi; ad: string }[] = [
  { kod: 'gordu', ad: 'Gördü' },
  { kod: 'duydu', ad: 'Birinden duydu' },
  { kod: 'belge', ad: 'Belge okudu' },
  { kod: 'cikarim', ad: 'Çıkarım yaptı' },
];

export interface Secenek { kod: string; metin: string }

export const IDDIA_ALANLARI = ['soru', 'secenekler', 'gercek', 'karar'];
export const BILGI_ALANLARI = ['secenek', 'inanc', 'saklama', 'kaynak', 'kaynakKayit', 'sahne', 'baslangic', 'bitis', 'aciklama', 'karar'];

const metin = (v: unknown, n: number, bos: boolean) => typeof v === 'string' && v.length <= n && (bos || v.trim().length > 0);
const kodYaDaBos = (v: unknown) => v === null || kodGecerliMi(v);
const sinirMi = (v: unknown) => v === null || (!!v && typeof v === 'object' && (tarihMi((v as { tarih?: unknown }).tarih) || kodGecerliMi((v as { olay?: unknown }).olay)));

/** İzdüşümde iddia alanının değeri; geçersizse undefined (işlem yok sayılır). */
export function iddiaDegeri(alan: string, v: unknown): unknown {
  switch (alan) {
    case 'soru': return metin(v, 300, false) ? v : undefined;
    case 'secenekler':
      return Array.isArray(v) && v.length <= 30 && v.every((s) => s && kodGecerliMi(s.kod) && metin(s.metin, 300, false))
        && new Set(v.map((s) => s.kod)).size === v.length ? v.map((s) => ({ kod: s.kod, metin: s.metin })) : undefined;
    case 'gercek': return kodYaDaBos(v) ? v : undefined;
    case 'karar': return kararGecerli(v) ? v : undefined;
  }
  return undefined;
}

export function bilgiDegeri(alan: string, v: unknown): unknown {
  switch (alan) {
    case 'secenek': case 'kaynakKayit': case 'sahne': return kodYaDaBos(v) ? v : undefined;
    case 'inanc': return INANCLAR.some((x) => x.kod === v) ? v : undefined;
    case 'saklama': return v === null || (Array.isArray(v) && v.length <= 100 && v.every(kodGecerliMi)) ? v : undefined;
    case 'kaynak': return v === null || BILGI_KAYNAKLARI.some((x) => x.kod === v) ? v : undefined;
    case 'baslangic': case 'bitis': return sinirMi(v) ? v : undefined;
    case 'aciklama': return v === null ? '' : metin(v, 500, true) ? v : undefined;
    case 'karar': return kararGecerli(v) ? v : undefined;
  }
  return undefined;
}

export type BilgiEtiketiKodu = 'bilmiyor' | 'yanlis' | 'supheleniyor' | 'sakliyor' | 'biliyor' | 'inaniyor' | 'reddediyor';
export interface BilgiEtiketi {
  kod: BilgiEtiketiKodu; ad: string;
  /** Gerçekle uyum; yazar gerçeği belirlemediyse null (Z9). */
  uyum: 'dogru' | 'yanlis' | null;
}

/**
 * Kısa liste: bilmiyor · yanlış biliyor · şüpheleniyor · biliyor ama saklıyor · biliyor. Gerçek belirlenmemişse
 * "yanlış biliyor" ya da "biliyor" denmez; yalnızca neye inandığı söylenir (Z9). Okur hiçbir şey saklamaz.
 */
export function bilgiEtiketi(inanc: Inanc, secenek: string | null, gercek: string | null, saklama: string[] | null, okur = false): BilgiEtiketi {
  if (inanc === 'bilmiyor' || !secenek) return { kod: 'bilmiyor', ad: 'Bilmiyor', uyum: null };
  const uyum = gercek ? (secenek === gercek ? 'dogru' : 'yanlis') : null;
  if (inanc === 'supheleniyor') return { kod: 'supheleniyor', ad: 'Şüpheleniyor', uyum };
  if (inanc === 'reddediyor') {
    // Gerçeği reddetmek yanlış bilmektir; yanlış bir cevabı reddetmek bir şey bildiği anlamına gelmez.
    return uyum === 'dogru' ? { kod: 'yanlis', ad: 'Yanlış biliyor (gerçeği reddediyor)', uyum: 'yanlis' } : { kod: 'reddediyor', ad: 'Reddediyor', uyum: null };
  }
  if (uyum === null) return { kod: 'inaniyor', ad: 'İnanıyor (gerçek belirlenmemiş)', uyum };
  if (uyum === 'yanlis') return { kod: 'yanlis', ad: 'Yanlış biliyor', uyum };
  if (saklama && !okur) return { kod: 'sakliyor', ad: 'Biliyor ama saklıyor', uyum };
  return { kod: 'biliyor', ad: 'Biliyor', uyum };
}
