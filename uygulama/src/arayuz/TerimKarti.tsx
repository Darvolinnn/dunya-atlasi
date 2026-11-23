// Metindeki sözlük kelimesinin ya da bağlantının kısa kartı (K37): adı, türü ve anlamı (kaydın özeti).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AranacakAd } from '../alan/bagsiz-ad';
import { turBul } from '../alan/turler';

export interface KartBilgisi { kod: string; ad: string; tur: string; anlam: string; ek: string; terim: boolean }

/** Sözlük kelimeleri (metinde işaretlenecek adlarıyla) ve bütün kayıtların kısa bilgisi; evren değişince yenilenir. */
export function useSozlukBilgisi(istemci: Istemci, evren: string, hazir: boolean, adlarDegisti: (adlar: AranacakAd[]) => void) {
  const [bilgiler, setBilgiler] = useState<Map<string, KartBilgisi>>(new Map());
  const [adlar, setAdlar] = useState<AranacakAd[]>([]);
  const geri = useRef(adlarDegisti); geri.current = adlarDegisti;
  useEffect(() => {
    let iptal = false;
    const oku = () => Promise.all([istemci.iste('sozlukIpuclari', { evren }), istemci.iste('adDizini', { evren })]).then(([terimler, dizin]) => {
      if (iptal) return;
      const m = new Map<string, KartBilgisi>();
      for (const a of dizin.adlar) m.set(a.kod, { kod: a.kod, ad: a.ad, tur: a.tur, anlam: a.ozet, ek: turBul(a.tur).ad, terim: false });
      for (const t of terimler) m.set(t.kod, { kod: t.kod, ad: t.ad, tur: t.tur, anlam: t.anlam, ek: [t.sozcukTuru, t.dil].filter(Boolean).join(' · ') || turBul(t.tur).ad, terim: true });
      setBilgiler(m);
      setAdlar(terimler.flatMap((t) => t.ifadeler.map((ifade) => ({ kod: t.kod, ifade }))));
    }, () => {});
    oku();
    const birak = istemci.dinle((d) => { if (d.evren === evren) oku(); });
    return () => { iptal = true; birak(); };
  }, [evren]);
  useEffect(() => { if (hazir) geri.current(adlar); }, [hazir, adlar]);
  return { bilgi: (kod: string) => bilgiler.get(kod) ?? null };
}

export function TerimKarti({ evren, bilgi, yer, ustunde }: { evren: string; bilgi: KartBilgisi; yer: DOMRect; ustunde: (b: boolean) => void }) {
  const sol = Math.max(8, Math.min(yer.left, window.innerWidth - 328));
  const alttaYer = window.innerHeight - yer.bottom > 160;
  const stil = alttaYer ? { left: `${sol}px`, top: `${yer.bottom + 6}px` } : { left: `${sol}px`, bottom: `${window.innerHeight - yer.top + 6}px` };
  return (
    <div class="terim-karti" role="tooltip" style={stil} onMouseEnter={() => ustunde(true)} onMouseLeave={() => ustunde(false)}>
      <strong>{bilgi.ad}</strong> <span class="soluk kucuk">{bilgi.ek}</span>
      <p>{bilgi.anlam || <span class="soluk">{bilgi.terim ? 'Anlamı yazılmamış.' : 'Özeti yazılmamış.'}</span>}</p>
      <div class="satir">
        {bilgi.terim && <a class="dugme kucuk" href={`#/e/${evren}/terimler`}>Sözlükte aç</a>}
        <a class="dugme kucuk" href={`#/e/${evren}/k/${bilgi.kod}`}>Kaydı aç</a>
      </div>
    </div>
  );
}
