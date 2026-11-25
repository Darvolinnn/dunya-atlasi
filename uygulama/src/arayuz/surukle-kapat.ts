import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import { hareketAzMi } from './tema';

/**
 * Sağdan gelen paneli parmakla sağa sürükleyerek kapatma. Yalnız dokunma ve kalemle çalışır (farede yazı seçimini bozmasın).
 * Dikey kaydırma tarayıcıda kalır (`touch-action: pan-y`); hareket belirgin biçimde yataysa panel parmağı izler.
 * Bırakınca genişliğin üçte birini geçtiyse ya da hızlı fırlatıldıysa panel sağa çıkar ve kapanır; geçmediyse yerine döner.
 * Sürüklenerek kapanan panel için K41'in çıkış kopyası oynamaz (`data-suruklendi`): panel zaten ekran dışındadır.
 */
const ESIK = 10; // px: bu kadar kaymadan yön kararı verilmez (dokunuş düğmeye basmak sayılır).
const HIZ_ESIGI = 0.5; // px/ms: kısa ama hızlı fırlatma da kapatır.

export function useSurukleKapat(ref: RefObject<HTMLElement>, kapat: () => void, etkin = true) {
  const son = useRef(kapat);
  son.current = kapat;
  useEffect(() => {
    const el = ref.current;
    if (!el || !etkin) return;
    let bas: { id: number; x: number; y: number; t: number } | null = null;
    let surukleniyor = false;
    let dx = 0;
    let onceki = { x: 0, t: 0 };
    let hiz = 0;
    const birak = () => {
      el.style.transition = '';
      el.style.transform = '';
      el.classList.remove('surukleniyor');
    };
    const asagi = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary) return;
      bas = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      onceki = { x: e.clientX, t: e.timeStamp };
      surukleniyor = false; dx = 0; hiz = 0;
    };
    const hareket = (e: PointerEvent) => {
      if (!bas || e.pointerId !== bas.id) return;
      const x = e.clientX - bas.x;
      const y = e.clientY - bas.y;
      if (!surukleniyor) {
        if (Math.abs(x) < ESIK && Math.abs(y) < ESIK) return;
        // Dikey ya da sola hareket: kaydırmadır, panel karışmaz.
        if (x <= 0 || Math.abs(x) < Math.abs(y) * 1.2) { bas = null; return; }
        surukleniyor = true;
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('surukleniyor');
        el.style.transition = 'none';
      }
      dx = Math.max(0, x);
      const dt = e.timeStamp - onceki.t;
      if (dt > 0) hiz = (e.clientX - onceki.x) / dt;
      onceki = { x: e.clientX, t: e.timeStamp };
      el.style.transform = `translateX(${dx}px)`;
    };
    const yukari = (e: PointerEvent) => {
      if (!bas || e.pointerId !== bas.id) return;
      bas = null;
      if (!surukleniyor) return;
      surukleniyor = false;
      const kapansin = e.type === 'pointerup' && (dx > el.offsetWidth / 3 || hiz > HIZ_ESIGI);
      if (!kapansin) {
        if (hareketAzMi()) { birak(); return; }
        el.style.transition = 'transform 180ms ease-out';
        el.style.transform = '';
        setTimeout(birak, 200);
        return;
      }
      el.dataset.suruklendi = '1';
      if (hareketAzMi()) { son.current(); return; }
      el.style.transition = 'transform 160ms ease-in';
      el.style.transform = 'translateX(100%)';
      let bitti = false;
      const bitir = () => { if (!bitti) { bitti = true; son.current(); } };
      el.addEventListener('transitionend', bitir, { once: true });
      setTimeout(bitir, 260);
    };
    // Sürükleme sırasında içerideki bağlantı ya da düğmeye tıklanmış sayılmasın.
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
    };
  }, [ref.current, etkin]);
}
