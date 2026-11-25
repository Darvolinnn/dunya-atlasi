// Kesilen parçalar çekmecesi ve metnin bir hâline ad verme (K39, öneri 3). Uzun bir parça kesilince ya da silinince
// kopyası sahnenin çekmecesine düşer; oradan imlecin yerine geri konabilir. Adlı hâller sürüm geçmişinde görünür.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EditorDenetimi } from './MetinEditoru';
import { KESILEN_OLAYI } from './kesilen-eklentisi';
import { geriAlinabilir } from './onay';
import { zamanYaz } from '../alan/islem-metni';

type Parca = { kod: string; metin: string; zaman: number };

/** Sahnenin kesilen parçaları; yazma ekranında "Sahne ⋯ → Kesilen parçalar" ile üst satırın altında açılır (§5.11). */
export function KesilenParcalar({ istemci, evren, sahne, denetim, kapat }: { istemci: Istemci; evren: string; sahne: string; denetim: { current: EditorDenetimi | null }; kapat: () => void }) {
  const [l, setL] = useState<Parca[]>([]);
  const [yenile, setYenile] = useState(0);
  useEffect(() => { istemci.iste('kesilenParcalar', { evren, sahne }).then(setL, () => setL([])); }, [evren, sahne, yenile]);
  useEffect(() => {
    const f = () => setYenile((x) => x + 1);
    addEventListener(KESILEN_OLAYI, f);
    return () => removeEventListener(KESILEN_OLAYI, f);
  }, []);
  const cikar = (p: Parca) => geriAlinabilir('Parça çekmeceden çıkarıldı.',
    () => istemci.iste('kesilenParcaSil', { evren, sahne, kod: p.kod }).then(() => setYenile((x) => x + 1)),
    () => istemci.iste('kesilenParcaEkle', { evren, sahne, metin: p.metin, kod: p.kod }).then(() => setYenile((x) => x + 1)));
  return (
      <div class="onceki-son-kutu kesilenler-kutu ust-panel" role="list" aria-label="Kesilen parçalar">
        <div class="satir"><p class="soluk kucuk" style="flex:1">{l.length ? 'Bu sahneden kesilen ya da silinen uzun parçalar. Geri koymak için imleci yerleştirip “İmlece ekle”ye basın.' : 'Bu sahneden kesilen parça yok. Uzun bir parçayı kestiğinizde ya da sildiğinizde burada saklanır.'}</p>
          <button class="dugme sade kucuk" onClick={kapat}>Kapat</button></div>
        {l.map((p) => (
          <div key={p.kod} class="kesilen-parca" role="listitem">
            <p class="kesilen-metin">{p.metin}</p>
            <div class="satir kucuk"><span class="soluk">{zamanYaz(p.zaman)}</span><span class="bosluk" />
              <button class="dugme sade kucuk" onMouseDown={(e) => e.preventDefault()} onClick={() => denetim.current?.ekle(p.metin)}>İmlece ekle</button>
              <button class="dugme sade kucuk" onClick={() => void cikar(p)}>Çıkar</button>
            </div>
          </div>
        ))}
      </div>
  );
}

/** Metnin şimdiki hâline ad verir ("İkinci taslak"); önce kaydedilir, ad son metin sürümüne bağlanır. */
export function SurumAdiFormu({ istemci, evren, kayit, denetim, kapat }: { istemci: Istemci; evren: string; kayit: string; denetim: { current: EditorDenetimi | null }; kapat: () => void }) {
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const gonder = async (e: Event) => {
    e.preventDefault();
    try {
      await denetim.current?.kaydet();
      const son = (await istemci.iste('kayitGecmisi', { evren, kod: kayit })).find((s) => s.tur === 'metin');
      if (!son) { setHata('Bu metnin henüz kaydedilmiş bir hâli yok.'); return; }
      await istemci.iste('surumAdiYaz', { evren, islem: son.kod, ad });
      setBilgi(`Bu hâl “${ad.trim()}” adıyla sürüm geçmişinde.`); setHata(''); setAd('');
    } catch (x) { setHata((x as Error).message); }
  };
  return (
    <form class="satir surum-adi-formu" onSubmit={gonder}>
      <input class="girdi" lang="tr" autoFocus aria-label="Bu hâlin adı" placeholder="Bu hâlin adı (ör. İkinci taslak)" maxLength={120} value={ad}
        onInput={(e) => setAd((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Escape') kapat(); }} />
      <button class="dugme" type="submit" disabled={!ad.trim()}>Ad ver</button>
      <button class="dugme sade" type="button" onClick={kapat}>Kapat</button>
      {hata && <span class="hata kucuk">{hata}</span>}
      {bilgi && <span class="kucuk" role="status">{bilgi}</span>}
    </form>
  );
}
