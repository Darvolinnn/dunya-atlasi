// Görselin ekranda gösterimi: çalışandan bir kez alınır, adres olarak saklanır (içerik değişmez).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';

const onbellek = new Map<string, Promise<{ url: string | null; durum: string }>>();

export function gorselAdresi(istemci: Istemci, evren: string, ad: string, onizleme: boolean) {
  const anahtar = `${ad}:${onizleme ? 'k' : 'b'}`;
  let p = onbellek.get(anahtar);
  if (!p) {
    p = istemci.iste('gorsel', { evren, ad, onizleme }).then((g) => g.durum === 'var'
      ? { url: URL.createObjectURL(new Blob([g.veri as BlobPart], { type: g.tur })), durum: 'var' }
      : { url: null, durum: g.durum });
    p.catch(() => onbellek.delete(anahtar));
    onbellek.set(anahtar, p);
  }
  return p;
}

// Küçük resimlerin odak noktaları (K39): evren başına bir kez okunur, evren değişince yenilenir.
type Odaklar = Record<string, { x: number; y: number }>;
const odakOnbellegi = new Map<string, Odaklar>();
const odakDinleyicileri = new Map<string, { sayi: number; birak: () => void; abone: Set<(o: Odaklar) => void> }>();
export function useGorselOdaklari(istemci: Istemci, evren: string): Odaklar {
  const [o, setO] = useState<Odaklar>(odakOnbellegi.get(evren) ?? {});
  useEffect(() => {
    let d = odakDinleyicileri.get(evren);
    const oku = () => istemci.iste('gorselOdaklari', { evren }).then((x) => { odakOnbellegi.set(evren, x); odakDinleyicileri.get(evren)?.abone.forEach((f) => f(x)); }, () => {});
    if (!d) {
      d = { sayi: 0, birak: istemci.dinle((x) => { if (x.evren === evren && !x.kayitlar.length) void oku(); }), abone: new Set() };
      odakDinleyicileri.set(evren, d);
      void oku();
    }
    d.sayi++; d.abone.add(setO);
    if (odakOnbellegi.has(evren)) setO(odakOnbellegi.get(evren)!);
    return () => { d!.abone.delete(setO); if (--d!.sayi === 0) { d!.birak(); odakDinleyicileri.delete(evren); } };
  }, [evren]);
  return o;
}

export function Gorsel({ istemci, evren, ad, onizleme = true, alt = '', sinif = '' }: {
  istemci: Istemci; evren: string; ad: string; onizleme?: boolean; alt?: string; sinif?: string;
}) {
  const odaklar = useGorselOdaklari(istemci, evren);
  const odak = onizleme ? odaklar[ad] : undefined;
  const [s, setS] = useState<{ url: string | null; durum: string } | null>(null);
  useEffect(() => { let iptal = false; gorselAdresi(istemci, evren, ad, onizleme).then((x) => { if (!iptal) setS(x); }); return () => { iptal = true; }; }, [ad, onizleme]);
  if (!s) return <span class={`gorsel-yer ${sinif}`} aria-hidden="true" />;
  if (!s.url) return <span class={`gorsel-yer bos ${sinif}`} title={s.durum === 'indirilmemis' ? 'Bu cihaza henüz indirilmedi' : 'Görsel bulunamadı'}>{s.durum === 'indirilmemis' ? 'İndirilmedi' : 'Yok'}</span>;
  return <img class={sinif} src={s.url} alt={alt} loading="lazy" decoding="async" style={odak ? { objectPosition: `${odak.x}% ${odak.y}%` } : undefined} />;
}
