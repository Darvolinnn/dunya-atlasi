// Eserin biçimden bağımsız okuma düzeni (§10.11): PDF ve Word (.docx) çıktıları bundan yazılır. Bağlantılar okura
// düz metin olarak görünür; vurgu ve kalın korunur.
import type { Node as PmNode } from 'prosemirror-model';

export interface Parca { metin: string; kalin?: boolean; egik?: boolean }
/** Paragraf, metnin içindeki başlık ya da alıntı paragrafı. */
export interface Blok { tur: 'paragraf' | 'baslik' | 'alinti'; parcalar: Parca[] }
export interface KitapSahnesi { baslik: string | null; bloklar: Blok[]; /** İçindekiler için sahnenin adı. */ ad?: string }
export interface KitapBolumu { baslik: string; sahneler: KitapSahnesi[]; /** "Birinci Bölüm" (bölüm numarası yazıyla seçiliyse). */ numara?: string }
export interface Kitap { ad: string; bolumler: KitapBolumu[]; gorunum?: KitapGorunumu; kapak?: KitapGorseli | null; ekler?: KitapEki[] }

/** Kitap görünümü (K38, §10.11): PDF, Word ve EPUB aynı ayarları kullanır; eser başına saklanır. */
export type SahneAyraci = 'yildizlar' | 'uc-yildiz' | 'sus' | 'bos';
export type IcindekilerDerinligi = 'bolumler' | 'sahneler' | 'yok';
export interface KitapGorunumu {
  /** Kapak görselinin içerik adı; yoksa sade kapak. */
  kapak: string | null;
  basHarf: boolean; sus: boolean; bolumYaziyla: boolean;
  ayrac: SahneAyraci; icindekiler: IcindekilerDerinligi;
  kisiler: boolean; terimler: boolean; takvim: boolean;
  /** Kitabın sonuna konacak haritanın kodu. */
  harita: string | null;
}
export const VARSAYILAN_GORUNUM: KitapGorunumu = {
  kapak: null, basHarf: false, sus: false, bolumYaziyla: false, ayrac: 'uc-yildiz', icindekiler: 'yok', kisiler: false, terimler: false, takvim: false, harita: null,
};
export const AYRAC_METNI: Record<SahneAyraci, string> = { yildizlar: '⁂', 'uc-yildiz': '*   *   *', sus: '❦', bos: '' };
export const SUS = '❦';
export interface KitapGorseli { veri: Uint8Array; tur: 'image/png' | 'image/jpeg'; en: number; boy: number }
/** Kitap sonu eki: dizin, sözlük ya da takvim satırları; harita için görsel. */
export interface KitapEki { baslik: string; girdiler: { ad: string; aciklama: string }[]; gorsel?: KitapGorseli | null; not?: string }

/** Gelen ayarı doğrular; tanınmayan değerler varsayılana döner. */
export function gorunumDuzelt(v: unknown): KitapGorunumu {
  const x = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const b = (k: keyof KitapGorunumu) => (typeof x[k] === 'boolean' ? x[k] as boolean : VARSAYILAN_GORUNUM[k] as boolean);
  const kod = (k: string) => (typeof x[k] === 'string' && /^[0-9a-z]{1,64}$/.test(x[k] as string) ? x[k] as string : null);
  return {
    kapak: typeof x.kapak === 'string' && /^[0-9a-f]{64}$/.test(x.kapak) ? x.kapak : null,
    basHarf: b('basHarf'), sus: b('sus'), bolumYaziyla: b('bolumYaziyla'),
    ayrac: (['yildizlar', 'uc-yildiz', 'sus', 'bos'] as const).includes(x.ayrac as SahneAyraci) ? x.ayrac as SahneAyraci : VARSAYILAN_GORUNUM.ayrac,
    icindekiler: (['bolumler', 'sahneler', 'yok'] as const).includes(x.icindekiler as IcindekilerDerinligi) ? x.icindekiler as IcindekilerDerinligi : VARSAYILAN_GORUNUM.icindekiler,
    kisiler: b('kisiler'), terimler: b('terimler'), takvim: b('takvim'), harita: kod('harita'),
  };
}

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
/** Sıra sayısı yazıyla ("birinci", "yirmi üçüncü"); 1–999. Büyük harfle başlar. */
export function siraSayisi(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 999) return `${n}.`;
  const y = Math.floor(n / 100), o = Math.floor((n % 100) / 10), b = n % 10;
  const sozler = [y ? (y === 1 ? 'yüz' : `${BIRLER[y]} yüz`) : '', ONLAR[o], BIRLER[b]].filter(Boolean).join(' ');
  const son = sozler.slice(-1);
  // Ünlü uyumu: son ünlüye göre -(i)nci/-(ı)ncı/-(u)ncu/-(ü)ncü; ünlüyle bitende ekin ilk ünlüsü düşer; dört → dördüncü.
  const unluler = sozler.match(/[aeıioöuü]/g)!;
  const u = unluler[unluler.length - 1];
  const ek = { a: 'ıncı', ı: 'ıncı', e: 'inci', i: 'inci', o: 'uncu', u: 'uncu', ö: 'üncü', ü: 'üncü' }[u]!;
  const yazi = /[aeıioöuü]/.test(son) ? sozler + ek.slice(1) : sozler.replace(/dört$/, 'dörd') + ek;
  return yazi.charAt(0).toLocaleUpperCase('tr-TR') + yazi.slice(1);
}

/** Denetim karakterleri (sekme ve satır sonu dışında) çıktıyı bozar; atılır. */
const DENETIM = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F￾￿]/g;
export const temizMetin = (s: string) => s.replace(DENETIM, '');

function parcalar(n: PmNode): Parca[] {
  const l: Parca[] = [];
  n.forEach((c) => {
    if (!c.isText || !c.text) return;
    const kalin = c.marks.some((m) => m.type.name === 'strong'), egik = c.marks.some((m) => m.type.name === 'em');
    const metin = temizMetin(c.text);
    if (!metin) return;
    const son = l[l.length - 1];
    if (son && !!son.kalin === kalin && !!son.egik === egik) son.metin += metin;
    else l.push({ metin, ...(kalin ? { kalin } : {}), ...(egik ? { egik } : {}) });
  });
  return l;
}

/** Sahne metnini bloklara çevirir; boş paragraflar atılır (EPUB çıktısıyla aynı). */
export function bloklaraCevir(doc: PmNode, alintida = false): Blok[] {
  const l: Blok[] = [];
  doc.forEach((b) => {
    if (b.type.name === 'blockquote' || b.type.name === 'unknownBlock') { l.push(...bloklaraCevir(b, true)); return; }
    const p = parcalar(b);
    if (!p.some((x) => x.metin.trim())) return;
    l.push({ tur: alintida ? 'alinti' : b.type.name === 'heading' ? 'baslik' : 'paragraf', parcalar: p });
  });
  return l;
}
