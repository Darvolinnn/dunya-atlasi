// Daktilo kipi (K33, §5.10): açıkken yazılan satır metin alanının ortasında tutulur, metin yukarı kayar. Yalnız
// klavyeyle yazınca ya da imleç tuşlarla taşınınca ortalanır; fareyle tıklamak ve kaydırarak geriye okumak serbesttir.
// Kip yazma ekranında `html` öğesindeki sınıfla açılır (YazEkrani); yalnız yazma ekranındaki metne uygulanır.
import { Plugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const DAKTILO_SINIFI = 'daktilo-kipi';
/** Kip açılınca metin hemen ortalansın diye gönderilir. */
export const DAKTILO_ACILDI = 'dunya-atlasi:daktilo-acildi';

const acik = (v: EditorView) => document.documentElement.classList.contains(DAKTILO_SINIFI) && !!v.dom.closest('.yaz-kagidi');

/** Metni kaydıran en yakın kap; yazma ekranında sayfanın kendisidir. */
function kaydiran(el: HTMLElement): HTMLElement {
  for (let k = el.parentElement; k; k = k.parentElement) {
    if (k.scrollHeight > k.clientHeight && /auto|scroll/.test(getComputedStyle(k).overflowY)) return k;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** İmlecin satırını kaydırılan alanın ortasına getirir. */
export function ortala(v: EditorView) {
  if (!acik(v)) return;
  let r: { top: number; bottom: number };
  try { r = v.coordsAtPos(v.state.selection.head); } catch { return; }
  const k = kaydiran(v.dom);
  const sayfa = k === document.scrollingElement;
  const ust = sayfa ? 0 : k.getBoundingClientRect().top;
  const yukseklik = sayfa ? window.innerHeight : k.clientHeight;
  const fark = (r.top + r.bottom) / 2 - ust - yukseklik / 2;
  if (Math.abs(fark) < 2) return;
  const az = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  k.scrollBy({ top: fark, behavior: az ? 'auto' : 'smooth' });
}

export function daktiloEklentisi() {
  let klavye = false;
  return new Plugin({
    props: {
      handleDOMEvents: {
        keydown: () => { klavye = true; return false; },
        mousedown: () => { klavye = false; return false; },
        touchstart: () => { klavye = false; return false; },
      },
    },
    view(v) {
      const acildi = () => { if (v.hasFocus()) ortala(v); };
      addEventListener(DAKTILO_ACILDI, acildi);
      return {
        update(v, onceki) {
          if (klavye && (v.state.doc !== onceki.doc || !v.state.selection.eq(onceki.selection))) ortala(v);
        },
        destroy() { removeEventListener(DAKTILO_ACILDI, acildi); },
      };
    },
  });
}
