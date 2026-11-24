// Kesilen parçalar (K39, öneri 3): seçili uzun bir parça kesilince ya da silinince sahnenin çekmecesine kopyası
// konur. Kısa düzeltmeler (birkaç kelime) çekmeceyi doldurmasın diye alınmaz. Metin olduğu gibi saklanır (K1).
import { Plugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

const EN_AZ_KELIME = 8;
/** Çekmeceye parça eklenince pencereye gönderilen olay. */
export const KESILEN_OLAYI = 'dunya-atlasi:kesilen-parca';

function seciliMetin(v: EditorView): string | null {
  const { from, to, empty } = v.state.selection;
  if (empty) return null;
  const t = v.state.doc.textBetween(from, to, '\n', ' ').trim();
  return t && (t.split(/\s+/).length >= EN_AZ_KELIME || t.includes('\n')) ? t : null;
}

export function kesilenEklentisi(kesildi: (metin: string) => void): Plugin {
  return new Plugin({
    props: {
      handleDOMEvents: {
        cut(v) { const t = seciliMetin(v); if (t) kesildi(t); return false; },
      },
      handleKeyDown(v, e) {
        if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.metaKey) { const t = seciliMetin(v); if (t) kesildi(t); }
        return false;
      },
    },
  });
}
