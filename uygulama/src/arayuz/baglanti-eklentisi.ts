// Editörde bağlantı yazma (§5.1): "[[" seçim kutusunu açar, "]]" kısayol sözdizimini çözer,
// bağlantının hemen ardına yazılan ek ("'dan") bağlantının görünümüne katılır.
import { Plugin, type EditorState, type Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Mark, MarkType } from 'prosemirror-model';
import { metinSemasi } from '../alan/metin-sema';
import { TURLER } from '../alan/turler';
import { katla } from '../alan/turkce';

const sema = metinSemasi.schema;
export const bagTuru: MarkType = sema.marks.bag;

/** Seçim kutusunun açılma isteği. */
export interface SeciciIstegi {
  /** Değiştirilecek ya da işaretlenecek aralık. */
  from: number; to: number;
  /** Aramaya yazılacak ilk metin. */
  sorgu: string;
  /** Seçilince yazılacak görünen ifade; yoksa kaydın adı yazılır. */
  gorunen: string | null;
  /** true: aralıktaki metin korunur, yalnızca bağlantı eklenir. */
  isaretle: boolean;
  /** Kısayolda tek güçlü eşleşme varsa sormadan bağlansın mı ("]]" ile kapatılan). */
  kendiligindenBagla?: boolean;
  /** Arama metni editörde yazılıyor ("[[" sonrası ya da "]]" ile kapatılmış kısayol). */
  satirIci?: boolean;
}

/** "Ad::Tür::özet" sözdizimindeki türü bulur: görünen ad ya da kodun başı. Bulunamazsa Diğer. */
export function turCoz(yazilan: string): string {
  const k = katla(yazilan.trim());
  if (!k) return 'diger';
  const t = TURLER.find((t) => katla(t.ad) === k || t.kod === k)
    ?? TURLER.find((t) => katla(t.ad).startsWith(k) || katla(t.ad).split(/[\s/]+/).some((p) => p === k));
  return t?.kod ?? 'diger';
}

/** İmlecin içinde bulunduğu bağlantının aralığı ve hedefi. */
export function bagAraligi(state: EditorState): { from: number; to: number; hedef: string } | null {
  const { $from, empty, from, to } = state.selection;
  const isaret = (m: readonly Mark[]) => m.find((x) => x.type === bagTuru);
  let m: Mark | undefined;
  if (empty) m = isaret($from.marks()) ?? isaret($from.nodeBefore?.marks ?? []) ?? isaret($from.nodeAfter?.marks ?? []);
  else { state.doc.nodesBetween(from, to, (n) => { m ??= isaret(n.marks); }); }
  if (!m) return null;
  const hedef = m.attrs.hedef as string;
  const parent = $from.parent;
  const bas = $from.start();
  let aralik: { from: number; to: number } | null = null;
  let suren: { from: number; to: number } | null = null;
  parent.forEach((n, ofs) => {
    const a = bas + ofs, b = a + n.nodeSize;
    const bagli = n.marks.some((x) => x.type === bagTuru && x.attrs.hedef === hedef);
    if (bagli) suren = suren && suren.to === a ? { from: suren.from, to: b } : { from: a, to: b };
    else suren = null;
    if (suren && suren.from <= $from.pos && $from.pos <= suren.to) aralik = suren;
  });
  return aralik ? { ...(aralik as { from: number; to: number }), hedef } : null;
}

/** Satır içi bağlantı yazımı: "[[" ile başlar; kutu açıkken klavye ona iletilir. */
export interface SatirIci { bas: number }

export function baglantiEklentisi(o: {
  ac: (i: SeciciIstegi) => void;
  satirIciBasla: (bas: number) => void;
  yeniKayit: (ad: string, tur: string, ozet: string) => Promise<string>;
}) {
  return new Plugin({
    props: {
      handleTextInput(view: EditorView, from: number, to: number, text: string) {
        const { state } = view;
        const $from = state.doc.resolve(from);
        const once = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
        if (text === '[' && once.endsWith('[') && from === to) {
          // "[[": metin yazılmaya devam eder, seçim kutusu yazılanı arar.
          view.dispatch(state.tr.insertText('[', from));
          o.satirIciBasla(from - 1);
          return true;
        }
        if (text === ']' && once.endsWith(']') && from === to) {
          const m = once.match(/\[\[([^[\]\ufffc]+)\]$/);
          if (!m) return false;
          const ic = m[1];
          const bas = from - m[0].length;
          view.dispatch(state.tr.insertText(']', from));
          const son = from + 1;
          if (ic.includes('::')) {
            const [ad, tur = '', ozet = ''] = ic.split('::');
            if (!ad.trim()) return true;
            o.yeniKayit(ad.trim(), turCoz(tur), ozet.trim()).then((kod) => {
              const tr = view.state.tr.replaceWith(bas, son, sema.text(ad.trim(), [bagTuru.create({ hedef: kod })]));
              view.dispatch(tr.removeStoredMark(bagTuru));
            });
            return true;
          }
          const [hedefAdi, gorunen] = ic.includes('|') ? [ic.slice(0, ic.indexOf('|')), ic.slice(ic.indexOf('|') + 1)] : [ic, ic];
          o.ac({ from: bas, to: son, sorgu: hedefAdi.trim(), gorunen: gorunen.trim() || hedefAdi.trim(), isaretle: false, kendiligindenBagla: true });
          return true;
        }
        return false;
      },
    },
    // Bağlantının hemen ardına boşluksuz yazılan ek bağlantıya katılır: [[Velkar]]'dan.
    appendTransaction(trs: readonly Transaction[], _eski: EditorState, yeni: EditorState) {
      if (!trs.some((t) => t.docChanged)) return null;
      let tr: Transaction | null = null;
      for (const t of trs) {
        if (!t.docChanged) continue;
        t.mapping.maps.forEach((harita) => harita.forEach((_a, _b, bas, son) => {
          if (son <= bas) return;
          const b = Math.min(bas, yeni.doc.content.size);
          const $b = yeni.doc.resolve(b);
          const onceki = $b.nodeBefore;
          const hedefIsaret = onceki?.marks.find((x) => x.type === bagTuru);
          if (!hedefIsaret || !$b.parent.isTextblock) return;
          const sonra = $b.parent.textBetween($b.parentOffset, $b.parent.content.size, undefined, '￼');
          const ek = sonra.match(/^['’]?[\p{L}\p{M}]*/u);
          if (!ek || !ek[0]) return;
          const bit = b + ek[0].length;
          tr ??= yeni.tr;
          tr.addMark(b, bit, hedefIsaret);
        }));
      }
      return tr;
    },
  });
}
