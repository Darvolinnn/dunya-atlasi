import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KurulumBilgisi } from '../veri/api';
import { EvrenlerEkrani } from './EvrenlerEkrani';
import { EvrenEkrani } from './EvrenEkrani';

export type Yol = { ekran: 'evrenler' } | { ekran: 'evren'; kod: string; sekme: string };

function yolOku(): Yol {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'e' && p[1]) return { ekran: 'evren', kod: p[1], sekme: p[2] || 'genel' };
  return { ekran: 'evrenler' };
}
export const git = (yol: string) => { location.hash = yol; };

function useYol(): Yol {
  const [yol, setYol] = useState(yolOku);
  useEffect(() => {
    const f = () => setYol(yolOku());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return yol;
}

/** Tarayıcıdan verileri kalıcı tutmasını ister (§10.9). Garanti değildir; asıl güvence ileride Drive ve yedek. */
function useKalicilik(): boolean | null {
  const [k, setK] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      if (!navigator.storage?.persisted) return;
      let p = await navigator.storage.persisted();
      if (!p && navigator.storage.persist) p = await navigator.storage.persist();
      setK(p);
    })();
  }, []);
  return k;
}

export function Uygulama({ istemci }: { istemci: Istemci }) {
  const yol = useYol();
  const [kurulum, setKurulum] = useState<KurulumBilgisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kalici = useKalicilik();

  useEffect(() => { istemci.iste('baslat').then(setKurulum, (e) => setHata(e.message)); }, [istemci]);

  if (hata) return <main class="sayfa"><h1>Dünya Atlası</h1><p class="hata">Yerel veritabanı açılamadı: {hata}</p></main>;
  if (!kurulum) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;

  return (
    <>
      {yol.ekran === 'evrenler'
        ? <EvrenlerEkrani istemci={istemci} />
        : <EvrenEkrani istemci={istemci} kod={yol.kod} sekme={yol.sekme} />}
      <footer class="alt" aria-label="Durum">
        <span>Bu cihaza kaydediliyor</span>
        <span>{kalici === null ? '' : kalici ? 'Tarayıcı verileri kalıcı tutuyor' : 'Tarayıcı kalıcı depolama izni vermedi'}</span>
        <span>Kurulum: {kurulum.ad}</span>
        <span>Eşitleme: henüz yok (bu sürüm yalnızca bu cihazda)</span>
      </footer>
    </>
  );
}

export function BaskaSekme() {
  return (
    <main class="sayfa">
      <h1>Dünya Atlası</h1>
      <div class="uyari" style="margin-top:16px">
        <p><strong>Program başka bir sekmede açık.</strong></p>
        <p>Aynı tarayıcıda veriler tek sekmeden yazılır. Öbür sekmeyi kapatıp bu sayfayı yenileyin.</p>
        <button class="dugme" onClick={() => location.reload()}>Yenile</button>
      </div>
    </main>
  );
}
