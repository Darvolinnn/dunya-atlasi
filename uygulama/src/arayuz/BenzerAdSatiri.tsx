// Ad benzerliği uyarısı (K45): yazılan ad evrendeki başka bir kaydın adına çok yakınsa ya da aynıysa ad kutusunun
// altında tek sessiz satır. Kayıt yine oluşturulur; yalnız harflere bakılır (K1).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { BenzerAd } from '../veri/api';
import { turBul } from '../alan/turler';

/** Yazarken 300 ms bekleyip sorar; boş ya da kısa adda boş liste. */
export function useBenzerAdlar(istemci: Istemci, evren: string, ad: string, haric: string | null = null): BenzerAd[] {
  const [l, setL] = useState<BenzerAd[]>([]);
  useEffect(() => {
    if (ad.trim().length < 3) { setL([]); return; }
    let iptal = false;
    const t = setTimeout(() => { istemci.iste('benzerAdlar', { evren, ad, haric }).then((x) => { if (!iptal) setL(x); }, () => {}); }, 300);
    return () => { iptal = true; clearTimeout(t); };
  }, [evren, ad, haric]);
  return l;
}

export function BenzerAdSatiri({ evren, l }: { evren: string; l: BenzerAd[] }) {
  if (!l.length) return null;
  const ayni = l.every((x) => x.neden === 'ayni');
  return (
    <p class="benzer-ad soluk kucuk" role="status">
      {ayni ? 'Bu adla bir kayıt zaten var: ' : 'Benzer adlı kayıt var: '}
      {l.map((x, i) => <>{i > 0 && ', '}<a key={x.kod} href={`#/e/${evren}/k/${x.kod}`} tabIndex={-1}>{x.ad}</a> ({turBul(x.tur).ad.toLocaleLowerCase('tr-TR')})</>)}
      {ayni ? '.' : '. Okurken karışabilir.'}
    </p>
  );
}
