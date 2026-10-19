import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KurulumBilgisi } from '../veri/api';
import { EvrenlerEkrani } from './EvrenlerEkrani';
import { EvrenEkrani } from './EvrenEkrani';
import { KayitEkrani } from './KayitEkrani';
import { YazEkrani } from './YazEkrani';
import { HizliNot } from './HizliNot';
import { CalismaSaglayici } from './Calisma';
import { EsitlemeEkrani, EsitlemeOzeti, EsitlemeSaglayici, EsitlemeSeridi } from './Esitleme';

export type Yol = { ekran: 'evrenler' } | { ekran: 'esitleme' } | { ekran: 'evren'; kod: string; sekme: string; alt: string | null } | { ekran: 'kayit'; evren: string; kod: string }
  | { ekran: 'yaz'; evren: string; kod: string | null };

function yolOku(): Yol {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'e' && p[1] && p[2] === 'k' && p[3]) return { ekran: 'kayit', evren: p[1], kod: p[3] };
  if (p[0] === 'esitleme') return { ekran: 'esitleme' };
  // Evren açılınca yazma düzeni gelir (§5.10, K24).
  if (p[0] === 'e' && p[1] && (!p[2] || p[2] === 'yaz')) return { ekran: 'yaz', evren: p[1], kod: p[3] || null };
  if (p[0] === 'e' && p[1]) return { ekran: 'evren', kod: p[1], sekme: p[2] === 'gorunumler' ? 'cizelge' : p[2], alt: p[3] || null };
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

  const evren = yol.ekran === 'evren' ? yol.kod : yol.ekran === 'kayit' || yol.ekran === 'yaz' ? yol.evren : null;
  const acikKayit = yol.ekran === 'kayit' ? yol.kod : yol.ekran === 'yaz' ? yol.kod : null;
  if (hata) return <main class="sayfa"><h1>Dünya Atlası</h1><p class="hata">Yerel veritabanı açılamadı: {hata}</p></main>;
  if (!kurulum) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;

  return (
    <EsitlemeSaglayici istemci={istemci}>
      <CalismaSaglayici istemci={istemci} evren={evren} kayit={acikKayit}>
      <EsitlemeSeridi />
      {yol.ekran === 'evrenler' ? <EvrenlerEkrani istemci={istemci} />
        : yol.ekran === 'esitleme' ? <EsitlemeEkrani istemci={istemci} />
        : yol.ekran === 'kayit' ? <KayitEkrani key={yol.kod} istemci={istemci} evren={yol.evren} kod={yol.kod} />
        : yol.ekran === 'yaz' ? <YazEkrani key={`${yol.evren}/${yol.kod}`} istemci={istemci} evren={yol.evren} kod={yol.kod} />
        : <EvrenEkrani istemci={istemci} kod={yol.kod} sekme={yol.sekme} alt={yol.alt} />}
      <HizliNot istemci={istemci} evren={evren} />
      {!evren && <footer class="alt" aria-label="Durum">
        <span>Bu cihaza kaydediliyor</span>
        <span>{kalici === null ? '' : kalici ? 'Tarayıcı verileri kalıcı tutuyor' : 'Tarayıcı kalıcı depolama izni vermedi'}</span>
        <span>Kurulum: {kurulum.ad}</span>
        <EsitlemeOzeti />
        <span>Komutlar: Ctrl+K</span>
      </footer>}
      </CalismaSaglayici>
    </EsitlemeSaglayici>
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
