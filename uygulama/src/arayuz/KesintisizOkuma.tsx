// Eserin ya da bölümün kesintisiz okunuşu (K39, öneri 1): sahneler okuma sırasıyla art arda, salt okunur. Bir
// paragrafa çift tıklamak (ya da sahne başlığına tıklamak) o sahneyi yazma ekranında açar. Windows'ta metin
// bilgisayarın Türkçe sesiyle dinlenebilir (K45, SesliOkuma).
import type { Istemci } from '../veri/istemci';
import type { OkumaParcasi } from '../veri/api';
import { MetinGorunumu } from './MetinEditoru';
import { git } from './Uygulama';
import { useEffect, useRef, useState } from 'preact/hooks';
import { SesliOkuma, sesliOkumaVarMi } from './SesliOkuma';

export function KesintisizOkuma({ istemci, evren, kapsam }: { istemci: Istemci; evren: string; kapsam: string }) {
  const [l, setL] = useState<OkumaParcasi[] | null>(null);
  const [hata, setHata] = useState('');
  const kap = useRef<HTMLDivElement>(null);
  useEffect(() => { istemci.iste('okumaMetni', { evren, kapsam }).then(setL, (x) => setHata((x as Error).message)); }, [evren, kapsam]);
  if (hata) return <p class="hata kucuk">{hata}</p>;
  if (!l) return <p class="soluk kucuk">Açılıyor…</p>;
  if (!l.length) return <p class="soluk">Henüz sahne yok.</p>;
  const ac = (kod: string) => git(`/e/${evren}/yaz/${kod}`);
  return (
    <div class="kesintisiz-okuma" ref={kap}>
      <p class="soluk kucuk">Okuma sırasıyla bütün sahneler. Bir paragrafa çift tıklayınca o sahne yazma ekranında açılır.</p>
      {sesliOkumaVarMi() && <SesliOkuma kap={kap} />}
      {l.map((x, i) => (
        <section key={x.sahne.kod} class="okuma-sahnesi" onDblClick={() => ac(x.sahne.kod)}>
          {x.bolum && x.bolum.kod !== l[i - 1]?.bolum?.kod && <h3 class="okuma-bolumu">{x.bolum.sira}. bölüm: {x.bolum.ad}</h3>}
          <div class="okuma-sahne-basi"><a href={`#/e/${evren}/yaz/${x.sahne.kod}`}>{x.sahne.ad}</a></div>
          {x.spans.length ? <MetinGorunumu spans={x.spans} /> : <p class="soluk kucuk">Bu sahne henüz yazılmadı.</p>}
        </section>
      ))}
    </div>
  );
}
