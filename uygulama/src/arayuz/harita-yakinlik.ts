// Haritada yakınlaştırma ve kaydırma (K38, B2): fare tekerleği ve iki parmak imlecin altındaki noktayı yerinde
// tutarak yakınlaştırır; "Gez ve seç"te fareyle sürüklemek haritayı kaydırır. Tek parmak tarayıcının kendi
// kaydırmasıyla kayar. Sürüklemeden sonra gelen tıklama işaret seçmez.
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

export const EN_AZ_YAKINLIK = 0.25;
export const EN_COK_YAKINLIK = 12;
const sinirla = (x: number) => Math.min(EN_COK_YAKINLIK, Math.max(EN_AZ_YAKINLIK, x));

export function useHaritaYakinlik(
  tuval: RefObject<HTMLDivElement>, yakinlik: number, setYakinlik: (x: number) => void, gez: boolean,
) {
  const simdiki = useRef(yakinlik);
  simdiki.current = yakinlik;
  /** Yakınlık değişince tuvalde yerinde tutulacak nokta: içerikteki oranı ve tuvaldeki yeri. */
  const capa = useRef<{ ox: number; oy: number; x: number; y: number } | null>(null);
  const suruklendi = useRef(false);
  const gezRef = useRef(gez);
  gezRef.current = gez;

  const yakinlas = (yeni: number, istemciX: number, istemciY: number) => {
    const t = tuval.current; if (!t) return;
    const y = sinirla(yeni);
    if (y === simdiki.current) return;
    const r = t.getBoundingClientRect();
    const x = istemciX - r.left, yy = istemciY - r.top;
    capa.current = { ox: (t.scrollLeft + x) / Math.max(1, t.scrollWidth), oy: (t.scrollTop + yy) / Math.max(1, t.scrollHeight), x, y: yy };
    setYakinlik(y);
  };

  useLayoutEffect(() => {
    const t = tuval.current, c = capa.current;
    capa.current = null;
    if (!t || !c) return;
    t.scrollLeft = c.ox * t.scrollWidth - c.x;
    t.scrollTop = c.oy * t.scrollHeight - c.y;
  }, [yakinlik]);

  // Dinleyiciler belgede durur ve olay anında tuvale bakar: harita yeniden çizilince tuval öğesi değişebilir.
  useEffect(() => {
    const icinde = (e: Event): HTMLDivElement | null => {
      const t = tuval.current;
      return t && e.target instanceof Node && t.contains(e.target) ? t : null;
    };
    const teker = (e: WheelEvent) => {
      if (!icinde(e) || e.shiftKey) return; // Shift + tekerlek yana kaydırır
      e.preventDefault();
      const adim = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      yakinlas(simdiki.current * Math.exp(-adim * 0.0015), e.clientX, e.clientY);
    };
    const parmaklar = new Map<number, { x: number; y: number }>();
    let ilkAralik = 0, ilkYakinlik = 1;
    let surukle: { x: number; y: number; sl: number; st: number; tasindi: boolean } | null = null;
    const aralik = () => { const [a, b] = [...parmaklar.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const bas = (e: PointerEvent) => {
      const t = icinde(e); if (!t) return;
      if (e.pointerType === 'touch') {
        parmaklar.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (parmaklar.size === 2) { ilkAralik = aralik(); ilkYakinlik = simdiki.current; }
        return;
      }
      if (e.pointerType === 'mouse' && e.button === 0 && gezRef.current) {
        suruklendi.current = false;
        surukle = { x: e.clientX, y: e.clientY, sl: t.scrollLeft, st: t.scrollTop, tasindi: false };
      }
    };
    const kipirda = (e: PointerEvent) => {
      if (parmaklar.has(e.pointerId)) {
        parmaklar.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (parmaklar.size === 2 && ilkAralik > 0) {
          const [a, b] = [...parmaklar.values()];
          yakinlas(ilkYakinlik * (aralik() / ilkAralik), (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        return;
      }
      const t = tuval.current;
      if (!surukle || !t) return;
      const dx = e.clientX - surukle.x, dy = e.clientY - surukle.y;
      if (!surukle.tasindi && Math.hypot(dx, dy) < 5) return;
      surukle.tasindi = true;
      suruklendi.current = true;
      t.classList.add('surukleniyor');
      t.scrollLeft = surukle.sl - dx;
      t.scrollTop = surukle.st - dy;
    };
    const birak = (e: PointerEvent) => {
      parmaklar.delete(e.pointerId);
      if (parmaklar.size < 2) ilkAralik = 0;
      if (surukle) { surukle = null; tuval.current?.classList.remove('surukleniyor'); }
    };
    // Sürüklemeden sonra gelen tıklama ne yeni işaret açar ne de işaret seçer.
    const tiklama = (e: MouseEvent) => { if (suruklendi.current && icinde(e)) { suruklendi.current = false; e.stopPropagation(); e.preventDefault(); } };
    document.addEventListener('click', tiklama, true);
    document.addEventListener('wheel', teker, { passive: false });
    document.addEventListener('pointerdown', bas);
    addEventListener('pointermove', kipirda);
    addEventListener('pointerup', birak);
    addEventListener('pointercancel', birak);
    return () => {
      document.removeEventListener('click', tiklama, true);
      document.removeEventListener('wheel', teker);
      document.removeEventListener('pointerdown', bas);
      removeEventListener('pointermove', kipirda);
      removeEventListener('pointerup', birak);
      removeEventListener('pointercancel', birak);
    };
  }, []);
}
