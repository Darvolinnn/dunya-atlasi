// "-- " yazınca uzun çizgi "— " (K39, öneri 2). Hemen ardından Geri silme tuşu çevirmeyi geri alır ve yazılanı
// bırakır; Ctrl+Z de geri alır. Yalnız düz metin değişir, anlam çıkarılmaz (K1).
import { Plugin, PluginKey } from 'prosemirror-state';

interface Son { bas: number; son: number }
const anahtar = new PluginKey<Son | null>('uzunCizgi');

export function uzunCizgiEklentisi(): Plugin<Son | null> {
  return new Plugin<Son | null>({
    key: anahtar,
    state: {
      init: () => null,
      // Belge başka bir yolla değişirse çevirmenin geri alınabilirliği biter.
      apply: (tr, onceki) => (tr.getMeta(anahtar) !== undefined ? tr.getMeta(anahtar) : tr.docChanged || tr.selectionSet ? null : onceki),
    },
    props: {
      handleTextInput(view, from, to, text) {
        if (text !== ' ' || from !== to) return false;
        const $p = view.state.doc.resolve(from);
        if (!$p.parent.isTextblock) return false;
        const once = $p.parent.textBetween(Math.max(0, $p.parentOffset - 3), $p.parentOffset, undefined, '￼');
        // "--" ama "---" değil (yazar bilerek üç tire yazmış olabilir).
        if (!once.endsWith('--') || once.endsWith('---')) return false;
        const bas = from - 2;
        const tr = view.state.tr.insertText('— ', bas, from);
        tr.setMeta(anahtar, { bas, son: bas + 2 });
        view.dispatch(tr);
        return true;
      },
      handleKeyDown(view, e) {
        if (e.key !== 'Backspace' || e.ctrlKey || e.metaKey || e.altKey) return false;
        const s = anahtar.getState(view.state);
        const { from, empty } = view.state.selection;
        if (!s || !empty || from !== s.son) return false;
        const tr = view.state.tr.insertText('-- ', s.bas, s.son);
        tr.setMeta(anahtar, null);
        view.dispatch(tr);
        return true;
      },
    },
  });
}
