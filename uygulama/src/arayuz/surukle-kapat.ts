import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import { hareketAzMi } from './tema';

/**
 * Kenardan gelen paneli parmakla, kalemle ya da fareyle geldiği yöne sürükleyerek kapatma.
 * Sağdan gelen panel sağa, alttan gelen panel aşağı çekilir; panel eli izler. Bırakınca yolun üçte birini geçtiyse
 * ya da hızlı fırlatıldıysa panel kayarak çıkar ve kapanır; geçmediyse yerine döner.
 * Dikey kaydırma tarayıcıda kalır (`touch-action: pan-y`); hareket belirgin biçimde sürükleme yönündeyse panel karışır.
 * Yazı alanlarında ve kaydırıcılarda sürükleme başlamaz; fareyle bağlantılarda da (tarayıcının bağlantı sürüklemesi). Düğmeden
 * başlayan sürükleme düğmeye basılmış sayılmaz.
 * Sürüklenerek kapanan panel için K41'in çıkış kopyası oynamaz (`data-suruklendi`): panel zaten ekran dışındadır.
 */
export type SurukleYonu = 'sag' | 'asagi';
export interface SurukleSecenek {
  /** Şu anki yön; `null` dönerse sürükleme kapalıdır (örneğin geniş ekranda sayfaya gömülü bağlam paneli). */
  yon?: () => SurukleYonu | null;
  /** Verilirse sürükleme yalnız bu seçiciye uyan bölgede başlar (alttan gelen panelin başlığı gibi). */
  bolge?: (yon: SurukleYonu) => string | null;
}

const ESIK = 10; // px: bu kadar kaymadan yön kararı verilmez (dokunuş ya da tıklama sayılır).
const HIZ_ESIGI = 0.5; // px/ms: kısa ama hızlı fırlatma da kapatır.
const DOKUNMA = 'input, textarea, select, [contenteditable="true"], .ProseMirror, canvas, [role="slider"], .panel-tutamagi';
const FARE_DOKUNMA = `${DOKUNMA}, a`;

export function useSurukleKapat(ref: RefObject<HTMLElement>, kapat: () => void, secenek: SurukleSecenek = {}) {
  const son = useRef(kapat);
  son.current = kapat;
  const sec = useRef(secenek);
  sec.current = secenek;
  const bagli = useRef<{ el: HTMLElement; coz: () => void } | null>(null);
  // Panel koşullu çizildiği için öğe her çizimden sonra denetlenir; değiştiyse dinleyiciler yeniden bağlanır.
  useEffect(() => {
    const el = ref.current;
    if (bagli.current?.el === el) return;
    bagli.current?.coz();
    bagli.current = el ? { el, coz: bagla(el, () => son.current(), () => sec.current) } : null;
  });
  useEffect(() => () => { bagli.current?.coz(); bagli.current = null; }, []);
}

function bagla(el: HTMLElement, kapat: () => void, secenek: () => SurukleSecenek): () => void {
  let bas: { id: number; x: number; y: number; yon: SurukleYonu; fare: boolean } | null = null;
  let surukleniyor = false;
  let d = 0;
  let onceki = { v: 0, t: 0 };
  let hiz = 0;
  const olcu = (yon: SurukleYonu) => (yon === 'sag' ? el.offsetWidth : el.offsetHeight) || 1;
  const kaydir = (yon: SurukleYonu, v: string) => { el.style.transform = yon === 'sag' ? `translateX(${v})` : `translateY(${v})`; };
  const temizle = () => {
    el.style.transition = '';
    el.style.transform = '';
    el.classList.remove('surukleniyor');
    document.documentElement.classList.remove('panel-surukleniyor');
  };
  const asagi = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || el.dataset.suruklendi) return;
    const s = secenek();
    const yon = s.yon ? s.yon() : 'sag';
    if (!yon) return;
    const hedef = e.target as Element | null;
    const fare = e.pointerType === 'mouse';
    if (hedef?.closest?.(fare ? FARE_DOKUNMA : DOKUNMA)) return;
    const bolge = s.bolge?.(yon);
    if (bolge && !hedef?.closest?.(bolge)) return;
    bas = { id: e.pointerId, x: e.clientX, y: e.clientY, yon, fare };
    onceki = { v: yon === 'sag' ? e.clientX : e.clientY, t: e.timeStamp };
    surukleniyor = false; d = 0; hiz = 0;
  };
  const hareket = (e: PointerEvent) => {
    if (!bas || e.pointerId !== bas.id) return;
    const ana = bas.yon === 'sag' ? e.clientX - bas.x : e.clientY - bas.y;
    const yan = bas.yon === 'sag' ? e.clientY - bas.y : e.clientX - bas.x;
    if (!surukleniyor) {
      if (Math.abs(ana) < ESIK && Math.abs(yan) < ESIK) return;
      // Ters yöne ya da yana hareket: kaydırma ya da yazı seçimidir, panel karışmaz.
      if (ana <= 0 || Math.abs(ana) < Math.abs(yan) * 1.2) { bas = null; return; }
      surukleniyor = true;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('surukleniyor');
      document.documentElement.classList.add('panel-surukleniyor');
      if (bas.fare) getSelection()?.removeAllRanges();
      el.style.transition = 'none';
    }
    e.preventDefault();
    d = Math.max(0, ana);
    const v = bas.yon === 'sag' ? e.clientX : e.clientY;
    const dt = e.timeStamp - onceki.t;
    if (dt > 0) hiz = hiz * 0.4 + ((v - onceki.v) / dt) * 0.6;
    onceki = { v, t: e.timeStamp };
    kaydir(bas.yon, `${d}px`);
  };
  const yukari = (e: PointerEvent) => {
    if (!bas || e.pointerId !== bas.id) return;
    const { yon } = bas;
    bas = null;
    if (!surukleniyor) return;
    surukleniyor = false;
    document.documentElement.classList.remove('panel-surukleniyor');
    const kapansin = e.type === 'pointerup' && (d > olcu(yon) / 3 || hiz > HIZ_ESIGI);
    if (!kapansin) {
      if (hareketAzMi()) { temizle(); return; }
      el.style.transition = 'transform 200ms cubic-bezier(0.3, 1.25, 0.5, 1)';
      el.style.transform = '';
      setTimeout(temizle, 220);
      return;
    }
    el.dataset.suruklendi = '1';
    if (hareketAzMi()) { kapat(); return; }
    // Kalan yolu, bırakılan hıza yakın bir sürede kayarak tamamlar.
    const kalan = Math.max(0, olcu(yon) - d);
    const sure = Math.round(Math.min(220, Math.max(120, hiz > 0 ? kalan / Math.max(hiz, 1) : 200)));
    el.style.transition = `transform ${sure}ms cubic-bezier(0.4, 0, 1, 1)`;
    kaydir(yon, '100%');
    let bitti = false;
    const bitir = () => { if (!bitti) { bitti = true; kapat(); } };
    el.addEventListener('transitionend', bitir, { once: true });
    setTimeout(bitir, sure + 80);
  };
  // Sürükleme sonunda içerideki bağlantı ya da düğmeye tıklanmış sayılmasın.
  const tik = (e: MouseEvent) => { if (el.classList.contains('surukleniyor')) { e.preventDefault(); e.stopPropagation(); } };
  el.addEventListener('pointerdown', asagi);
  el.addEventListener('pointermove', hareket);
  el.addEventListener('pointerup', yukari);
  el.addEventListener('pointercancel', yukari);
  el.addEventListener('click', tik, true);
  return () => {
    el.removeEventListener('pointerdown', asagi);
    el.removeEventListener('pointermove', hareket);
    el.removeEventListener('pointerup', yukari);
    el.removeEventListener('pointercancel', yukari);
    el.removeEventListener('click', tik, true);
    document.documentElement.classList.remove('panel-surukleniyor');
  };
}

/** Ekran sorgusunu o anda okur (yön işlevlerinde kullanılır). */
export const ekranUyar = (sorgu: string) => typeof matchMedia === 'function' && matchMedia(sorgu).matches;
