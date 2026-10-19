import type { UyarlamaTuru } from '../veri/api';

export const UYARLAMA_TURLERI: { kod: UyarlamaTuru; ad: string }[] = [
  { kod: 'karsilik', ad: 'Karşılık' }, { kod: 'indirgeme', ad: 'Birden çok kayıt tek kayda indirgeniyor' },
  { kod: 'sira', ad: 'Sıra karşılaştırması' }, { kod: 'cikarildi', ad: 'Karşılığı yok; çıkarıldı' },
];
