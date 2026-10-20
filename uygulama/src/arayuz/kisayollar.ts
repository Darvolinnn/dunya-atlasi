// Programın tanıdığı kısayolların tek listesi (§12.2, K28). Komut paleti ve "Kısayollar" listesi buradan okur.
export interface Kisayol { anahtar: string; ad: string; tus: string; not?: string }

export const KISAYOLLAR: Kisayol[] = [
  { anahtar: 'palet', ad: 'Komut paleti', tus: 'Ctrl+K', not: 'Metin dışındayken / tuşu da açar' },
  { anahtar: 'bagla', ad: 'Bağlantı aç', tus: '[[ ya da @', not: 'Türkçe klavyede [ işareti AltGr+8, @ işareti AltGr+Q ile yazılır. @ yalnız kelime başında açar. Metindeyken Ctrl+K de açar' },
  { anahtar: 'not', ad: 'Hızlı not', tus: 'Alt+N' },
  { anahtar: 'odak', ad: 'Odak kipi', tus: 'Ctrl+Shift+F', not: 'Yazma ekranında; Esc ile çıkılır' },
  { anahtar: 'kisayollar', ad: 'Kısayollar', tus: '?', not: 'Metin dışındayken' },
  { anahtar: 'bag-ac', ad: 'Bağlantılı kaydı aç', tus: 'Ctrl+tıklama' },
  { anahtar: 'kalin', ad: 'Kalın', tus: 'Ctrl+B' },
  { anahtar: 'egik', ad: 'İtalik', tus: 'Ctrl+I' },
  { anahtar: 'geri', ad: 'Geri al', tus: 'Ctrl+Z' },
  { anahtar: 'yinele', ad: 'Yinele', tus: 'Ctrl+Y' },
  { anahtar: 'yan', ad: 'Palette yan panelde aç', tus: 'Shift+Enter' },
  { anahtar: 'kapat', ad: 'Kapat', tus: 'Esc' },
];
export const kisayolTusu = (anahtar: string) => KISAYOLLAR.find((k) => k.anahtar === anahtar)?.tus;
export const KISAYOL_OLAYI = 'dunya-atlasi:kisayollar';
/** Odak kipini açar/kapatır (K28, §5.10); detail verilmezse durumu çevirir. */
export const ODAK_OLAYI = 'dunya-atlasi:odak-kipi';
