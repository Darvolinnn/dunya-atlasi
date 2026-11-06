// Eserin biçimden bağımsız okuma düzeni (§10.11): PDF ve Word (.docx) çıktıları bundan yazılır. Bağlantılar okura
// düz metin olarak görünür; vurgu ve kalın korunur.
import type { Node as PmNode } from 'prosemirror-model';

export interface Parca { metin: string; kalin?: boolean; egik?: boolean }
/** Paragraf, metnin içindeki başlık ya da alıntı paragrafı. */
export interface Blok { tur: 'paragraf' | 'baslik' | 'alinti'; parcalar: Parca[] }
export interface KitapSahnesi { baslik: string | null; bloklar: Blok[] }
export interface KitapBolumu { baslik: string; sahneler: KitapSahnesi[] }
export interface Kitap { ad: string; bolumler: KitapBolumu[] }

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
