import { useLayoutEffect, useRef } from 'preact/hooks';

/**
 * Geri hareketi önce açık paneli kapatsın (tablette sistemin geri hareketi, tarayıcıda Geri düğmesi).
 * Panel açılınca geçmişe aynı adresle bir işaret eklenir; geri gelince en son açılan panel kapanır, sayfa değişmez.
 * Panel başka yoldan (Kapat, Esc, sürükleme) kapanırsa işaret geçmişten geri alınır; böylece sonraki geri hareketi
 * boşa gitmez. Sayfa değişince kalan eski işaretler geri gelindiğinde kendiliğinden atlanır.
 */
type Kayit = { no: number; adres: string; kapat: () => void };
const yigin: Kayit[] = [];
let sayac = 0;
let yutulacak = 0; // Kendi `history.back()` çağrılarımızın yol açtığı geri olayları.
let kuruldu = false;

const isaret = (s: unknown): number | null => {
  const n = (s as { geriPanel?: unknown } | null)?.geriPanel;
  return typeof n === 'number' ? n : null;
};

function kur() {
  if (kuruldu || typeof window === 'undefined') return;
  kuruldu = true;
  window.addEventListener('popstate', (e: PopStateEvent) => {
    if (yutulacak > 0) { yutulacak--; return; }
    const simdiki = isaret(e.state) ?? 0;
    // Gelinen yerden sonra bu sayfada açılmış paneller kapanır (en sondan başlayarak). Başka sayfada açılıp
    // açık kalan panel (yan panel gibi) geri hareketi o sayfaya dönünce kapanır; sayfa değişirken kapanmaz.
    let kapandi = false;
    for (let i = yigin.length - 1; i >= 0; i--) {
      const k = yigin[i];
      if (k.no <= simdiki || k.adres !== location.href) continue;
      yigin.splice(i, 1);
      kapandi = true;
      k.kapat();
    }
    // Açık paneli olmayan eski bir işarete gelindiyse bir adım daha geri gidilir; geri hareketi boşa gitmez.
    if (!kapandi && isaret(e.state) !== null && !yigin.some((k) => k.no === simdiki)) history.back();
  });
}

/** `acik` iken geri hareketi `kapat`ı çağırır. */
export function useGeriIleKapat(acik: boolean, kapat: () => void) {
  const son = useRef(kapat);
  son.current = kapat;
  // Çizimle aynı anda: panel göründüğü anda yapılan geri hareketi de paneli kapatsın.
  useLayoutEffect(() => {
    if (!acik || typeof history === 'undefined') return;
    kur();
    const no = ++sayac;
    const kayit: Kayit = { no, adres: location.href, kapat: () => son.current() };
    try { history.pushState({ ...(history.state ?? {}), geriPanel: no }, ''); } catch { return; }
    yigin.push(kayit);
    return () => {
      const i = yigin.indexOf(kayit);
      if (i < 0) return; // Geri hareketiyle kapandı; işaret zaten geride kaldı.
      yigin.splice(i, 1);
      // Panel başka yoldan kapandı: işaret hâlâ en üstteyse geri alınır.
      if (isaret(history.state) === no) { yutulacak++; history.back(); }
    };
  }, [acik]);
}

/** Koşullu çizilen paneller için: bu bileşen çizili olduğu sürece geri hareketi `kapat`ı çağırır. */
export function GeriIleKapat({ kapat }: { kapat: () => void }) {
  useGeriIleKapat(true, kapat);
  return null;
}
