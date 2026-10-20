/** Sessiz kelime sayacı (K28, §5.10): harf ya da rakam içeren her boşlukla ayrılmış parça bir kelimedir. "Lale'nin" ve "yarı-insan" tek kelimedir. */
export function kelimeSay(metin: string): number {
  let n = 0;
  for (const parca of metin.split(/\s+/)) if (/[\p{L}\p{N}]/u.test(parca)) n++;
  return n;
}
