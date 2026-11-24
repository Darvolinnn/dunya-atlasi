// "Geri al" şeridi (K29, §10.8, taslak A): ekranın altında, birkaç saniye görünür; üstüne gelince süre durur.
import { useEffect, useRef, useState } from 'preact/hooks';
import { geriAlDinle, type GeriAlinabilirIs } from './onay';

const SURE = 8000;

export function GeriAlSeridi() {
  const [is, setIs] = useState<GeriAlinabilirIs | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  const zaman = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kur = () => { if (zaman.current) clearTimeout(zaman.current); zaman.current = setTimeout(() => setIs(null), SURE); };
  const durdur = () => { if (zaman.current) clearTimeout(zaman.current); zaman.current = null; };
  useEffect(() => geriAlDinle((x) => { setIs(x); setHata(null); setBekle(false); if (x) kur(); }), []);
  useEffect(() => () => durdur(), []);
  useEffect(() => {
    if (!is) return;
    // Esc başka bir pencereyi, seçiciyi ya da yazılan bir alanı kapatıyorsa şerit kapanmaz. Yakalama evresinde bakılır:
    // o pencere kendi tuşuyla kapanmadan önce.
    const tus = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('.perde, [role="dialog"], [role="alertdialog"], .secici, [role="listbox"], details[open] > .acilir')) return;
      if ((document.activeElement as HTMLElement | null)?.matches?.('input, textarea, select')) return;
      setIs(null);
    };
    addEventListener('keydown', tus, true);
    return () => removeEventListener('keydown', tus, true);
  }, [is]);
  if (!is) return null;
  const geriAl = async () => {
    setBekle(true);
    try { await is.geriAl(); setIs(null); durdur(); } catch (e) { setHata((e as Error).message); setBekle(false); }
  };
  return (
    <div class="geri-al-seridi" role="status" aria-live="polite" onMouseEnter={durdur} onMouseLeave={kur} onFocusCapture={durdur}>
      <span>{hata ? `Geri alınamadı: ${hata}` : is.ileti}</span>
      <button type="button" class="geri-al-dugmesi" disabled={bekle} onClick={() => void geriAl()}>Geri al</button>
      <button type="button" class="geri-al-kapat" aria-label="Kapat" onClick={() => { setIs(null); durdur(); }}>×</button>
      <span key={is.ileti + String(bekle)} class="geri-al-sure" style={{ animationDuration: `${SURE}ms` }} />
    </div>
  );
}
