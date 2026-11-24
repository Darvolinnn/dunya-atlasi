// Yazma ekranının iki okuma süzgeci (K38, A3 ve A4): görünüşü değiştirir, metne hiçbir şey eklemez.
// - Paragraf odağı: imlecin olduğu paragraf parlak kalır, ötekiler soluklaşır.
// - Yalnız diyaloglar: tırnakla (“ " « ‘) ya da konuşma çizgisiyle (— –) başlayan paragraflar öne çıkar.
// Kipler `html` öğesindeki sınıflarla açılır (YazEkrani); yalnız yazma ekranındaki metne uygulanır.
import { Plugin, type EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const PARAGRAF_ODAGI_SINIFI = 'paragraf-odagi';
export const DIYALOG_SINIFI = 'yalniz-diyalog';

/** Paragrafın metni bir konuşmayla mı başlıyor? Anlam çıkarılmaz; yalnız ilk işarete bakılır. */
export const diyalogMu = (metin: string) => /^\s*["“”«‘'—–-]/.test(metin) && /\S/.test(metin.replace(/^\s*["“”«‘'—–-]+/, ''));

function suslemeler(s: EditorState): DecorationSet {
  const l: Decoration[] = [];
  const imlec = s.selection.$head;
  const etkin = imlec.depth >= 1 ? imlec.before(1) : -1;
  s.doc.forEach((n, konum) => {
    const siniflar: string[] = [];
    if (konum === etkin) siniflar.push('etkin-paragraf');
    if (n.isTextblock && diyalogMu(n.textContent)) siniflar.push('diyalog-paragrafi');
    if (siniflar.length) l.push(Decoration.node(konum, konum + n.nodeSize, { class: siniflar.join(' ') }));
  });
  return DecorationSet.create(s.doc, l);
}

export function okumaSuzgecleri() {
  return new Plugin({ props: { decorations: suslemeler } });
}
