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
