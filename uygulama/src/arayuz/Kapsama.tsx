// Yer sayfasında alt birimlerden toplananlar (§3.7): salt okunur, kaynaklarıyla; yerin özelliği sayılmaz.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { ToplananKayit } from '../veri/api';
import { turBul } from '../alan/turler';
import { turkceKarsilastir } from '../alan/turkce';

const GRUPLAR: [string, string][] = [['urun', 'Üretim'], ['inanc', 'İnanç'], ['topluluk', 'Topluluklar'], ['acik_mesele', 'Açık meseleler']];

export function AltBirimlerdenToplananlar({ istemci, evren, kod, tur, surum }: { istemci: Istemci; evren: string; kod: string; tur: string; surum: number }) {
  const [l, setL] = useState<ToplananKayit[]>([]);
  useEffect(() => { if (['mekan', 'sehir', 'siyasi'].includes(tur)) istemci.iste('altBirimlerdenToplananlar', { evren, kod }).then(setL, () => setL([])); }, [kod, tur, surum]);
  if (!l.length) return null;
  return (
    <section class="toplananlar" aria-label="Alt birimlerden toplananlar">
      <h2>Alt birimlerde kayıtlı gördüklerimiz</h2>
      <p class="soluk kucuk">{tur === 'siyasi' ? 'Bağlı yönetimlerde ve yerlerde' : 'Parçalarında'} yazılmış kayıtlar. Bunlar {turBul(tur).ad.toLocaleLowerCase('tr-TR')} kaydının özelliği değildir; bir kayıt birden çok yere bağlıysa bir kez sayılır.</p>
      {GRUPLAR.map(([t, ad]) => {
        const g = l.filter((x) => x.kayit.tur === t).sort((a, b) => turkceKarsilastir(a.kayit.ad, b.kayit.ad));
        if (!g.length) return null;
        return (
          <div key={t}>
            <strong class="kucuk">{ad}</strong>
            <ul class="toplanan-listesi">
              {g.map((x) => (
                <li key={x.kayit.kod}><a href={`#/e/${evren}/k/${x.kayit.kod}`}>{x.kayit.ad}</a>
                  <span class="soluk kucuk"> · {x.birimler.map((b, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/k/${b.kod}`}>{b.ad}</a></>)}</span></li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
