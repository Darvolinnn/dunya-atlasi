// Deneyim kipleri (§5.11, K43): Sade, Hikâye, Tam. Kip yalnız görünüşü değiştirir; hiçbir veri silinmez.
// Seçim ve sabitlenen araçlar cihazda evren başına hatırlanır, eşitlenmez.
import { useEffect, useState } from 'preact/hooks';

export type Kip = 'sade' | 'hikaye' | 'tam';
export const KIPLER: readonly (readonly [Kip, string, string])[] = [
  ['sade', 'Sade', 'Yalnız yazı ve kayıtlar; öbür araçlar Araçlar sayfasında durur.'],
  ['hikaye', 'Hikâye', 'Yazıya ek olarak genel bakış, haritalar, takvim, sözlük ve uyarılar.'],
  ['tam', 'Tam', 'Bütün sayfalar ve araçlar görünür.'],
];
const SIRA: Record<Kip, number> = { sade: 0, hikaye: 1, tam: 2 };
export const KIP_ADI: Record<Kip, string> = { sade: 'Sade', hikaye: 'Hikâye', tam: 'Tam' };
/** a kipi b kipinin gösterdiği her şeyi gösterir mi. */
export const kipKapsar = (a: Kip, b: Kip) => SIRA[a] >= SIRA[b];

/** Gezinti çubuğundaki ana sayfaların hangi kipten itibaren göründüğü. */
export const MENU_KIPI: Record<string, Kip> = {
  yaz: 'sade', kayitlar: 'sade', araclar: 'sade',
  masa: 'hikaye', terimler: 'hikaye', haritalar: 'hikaye', takvim: 'hikaye', inceleme: 'hikaye',
  tuval: 'tam',
};

const kipAnahtari = (evren: string) => `dunya-atlasi:kip:${evren}`;
const sabitAnahtari = (evren: string) => `dunya-atlasi:sabit:${evren}`;
const OLAY = 'dunya-atlasi:kip-degisti';
const oku = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yaz = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };
const duyur = () => { try { window.dispatchEvent(new Event(OLAY)); } catch { /* yok */ } };

/** Kayıt yoksa Tam: bu karardan önce var olan evrenler Tam kipte açılır. */
export function kipOku(evren: string): Kip {
  const k = oku(kipAnahtari(evren));
  return k === 'sade' || k === 'hikaye' || k === 'tam' ? k : 'tam';
}
export function kipYaz(evren: string, kip: Kip) { yaz(kipAnahtari(evren), kip); duyur(); }

export function sabitlerOku(evren: string): string[] {
  try { const l = JSON.parse(oku(sabitAnahtari(evren)) ?? '[]'); return Array.isArray(l) ? l.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
export function sabitDegistir(evren: string, arac: string) {
  const l = sabitlerOku(evren);
  yaz(sabitAnahtari(evren), JSON.stringify(l.includes(arac) ? l.filter((x) => x !== arac) : [...l, arac]));
  duyur();
}

function useDegisim() {
  const [, setN] = useState(0);
  useEffect(() => {
    const f = () => setN((n) => n + 1);
    window.addEventListener(OLAY, f); window.addEventListener('storage', f);
    return () => { window.removeEventListener(OLAY, f); window.removeEventListener('storage', f); };
  }, []);
}
export function useKip(evren: string): Kip { useDegisim(); return kipOku(evren); }
export function useSabitler(evren: string): string[] { useDegisim(); return sabitlerOku(evren); }
