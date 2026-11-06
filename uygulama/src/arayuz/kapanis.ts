import { useRef } from 'preact/hooks';

/**
 * Pencerenin yumuşak kapanışı (K32): perde 120 ms'de solar, içindeki pencere hafifçe aşağı iner, sonra kapanır.
 * Yalnız vazgeçme yollarında (Esc, perdeye tıklama, Kapat düğmesi) kullanılır; bir komut çalıştıran kapanış
 * beklemeden kapanır. "Animasyonları azalt" açıksa ya da tarayıcı desteklemiyorsa hemen kapanır.
 * Dönen işlev her çizimde aynıdır; boş bağımlılıklı olay dinleyicilerinde güvenle kullanılır.
 */
export function useYumusakKapanis(kapat: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const son = useRef(kapat);
  son.current = kapat;
  const kapaniyor = useRef(false);
  const vazgec = useRef(() => {
    if (kapaniyor.current) return;
    const el = ref.current;
    if (!el?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { son.current(); return; }
    kapaniyor.current = true;
    el.style.pointerEvents = 'none';
    const secenek = { duration: 120, easing: 'ease-in', fill: 'forwards' as const };
    const ic = el.querySelector<HTMLElement>(':scope > .perde-ic, :scope > .palet');
    ic?.animate([{ transform: 'none' }, { transform: 'translateY(4px) scale(0.99)' }], secenek);
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], secenek);
    let bitti = false;
    const bitir = () => { if (!bitti) { bitti = true; son.current(); } };
    a.onfinish = bitir; a.oncancel = bitir;
    setTimeout(bitir, 400); // Sekme arka plandayken animasyon durabilir; pencere yine kapanır.
  }).current;
  return [ref, vazgec] as const;
}
