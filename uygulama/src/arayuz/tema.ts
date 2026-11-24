// Görünüm (§12.1): program koyu temayla açılır; kullanıcı "Eşitleme ve cihazlar" sayfasından açık temayı
// ya da cihazın ayarını seçebilir. Seçim bu cihazda tutulur.
export type Tema = 'koyu' | 'acik' | 'sistem';
export const TEMALAR: { kod: Tema; ad: string }[] = [
  { kod: 'koyu', ad: 'Koyu' },
  { kod: 'acik', ad: 'Açık' },
  { kod: 'sistem', ad: 'Cihazın ayarı' },
];
const ANAHTAR = 'dunya-atlasi:tema';

export function temaOku(): Tema {
  try {
    const t = localStorage.getItem(ANAHTAR);
    if (t === 'acik' || t === 'sistem' || t === 'koyu') return t;
  } catch { /* tarayıcı depolamaya izin vermiyor */ }
  return 'koyu';
}

export function temaUygula(t: Tema = temaOku()) {
  const kok = document.documentElement;
  if (t === 'sistem') delete kok.dataset.tema;
  else kok.dataset.tema = t;
}

export function temaYaz(t: Tema) {
  try { localStorage.setItem(ANAHTAR, t); } catch { /* yalnızca bu açılışta geçerli olur */ }
  temaUygula(t);
}

/** stil.css'teki hareket değişkenleri; JS ile oynatılan geçişler (sayfa, evrene giriş, kayan vurgu) bunları okur. */
export function hareketDegerleri() {
  const s = getComputedStyle(document.documentElement);
  const sayi = (ad: string, yedek: number) => { const v = parseFloat(s.getPropertyValue(ad)); return Number.isFinite(v) ? v : yedek; };
  return {
    sure: sayi('--hz-sure', 200),
    mesafe: sayi('--hz-mesafe', 8),
    olcek: sayi('--hz-olcek', 0.985),
    egri: s.getPropertyValue('--hz-egri').trim() || 'cubic-bezier(0.2, 0.7, 0.3, 1)',
  };
}

/** "Animasyonları azalt" açık mı (cihaz ayarı). */
export const hareketAzMi = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
