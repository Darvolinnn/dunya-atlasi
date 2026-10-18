import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EvrenOzeti } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { git } from './Uygulama';
import { IceAktar, YedektenGeriYukle } from './Tasima';

export function EvrenlerEkrani({ istemci }: { istemci: Istemci }) {
  const [evrenler, setEvrenler] = useState<EvrenOzeti[] | null>(null);
  const [yeniAd, setYeniAd] = useState('');
  const [aciliyor, setAciliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [panel, setPanel] = useState<'yok' | 'yedek' | 'ice'>('yok');

  const yukle = () => istemci.iste('evrenler').then(setEvrenler, (e) => setHata(e.message));
  useEffect(() => { yukle(); }, []);

  const olustur = async (e: Event) => {
    e.preventDefault();
    setHata(null);
    try {
      const { kod } = await istemci.iste('evrenOlustur', { ad: yeniAd });
      setYeniAd(''); setAciliyor(false);
      git(`/e/${kod}`);
    } catch (err) { setHata((err as Error).message); }
  };

  return (
    <>
      <header class="ust"><span class="ad">Dünya Atlası</span></header>
      <main class="sayfa">
        <div class="satir" style="justify-content:space-between">
          <h1>Evrenler</h1>
          <div class="satir">
            <button class="dugme" onClick={() => setPanel(panel === 'yedek' ? 'yok' : 'yedek')} aria-expanded={panel === 'yedek'}>Yedekten geri yükle</button>
            <button class="dugme" onClick={() => setPanel(panel === 'ice' ? 'yok' : 'ice')} aria-expanded={panel === 'ice'}>İçe aktar</button>
            {!aciliyor && <button class="dugme ana" onClick={() => setAciliyor(true)}>Yeni evren</button>}
          </div>
        </div>
        {panel === 'yedek' && <YedektenGeriYukle istemci={istemci} kapat={() => setPanel('yok')} yenile={yukle} />}
        {panel === 'ice' && <IceAktar istemci={istemci} kapat={() => setPanel('yok')} yenile={yukle} />}
        {aciliyor && (
          <form class="kart" style="margin-top:16px" onSubmit={olustur}>
            <label for="yeni-evren-adi"><h3>Yeni evrenin adı</h3></label>
            <p class="soluk kucuk">Adı sonradan değiştirebilirsin.</p>
            <div class="satir">
              <input id="yeni-evren-adi" class="girdi" style="flex:1;min-width:200px" value={yeniAd} autoFocus
                onInput={(e) => setYeniAd((e.target as HTMLInputElement).value)} />
              <button class="dugme ana" type="submit" disabled={!yeniAd.trim()}>Oluştur</button>
              <button class="dugme" type="button" onClick={() => { setAciliyor(false); setYeniAd(''); }}>Vazgeç</button>
            </div>
          </form>
        )}
        {hata && <p class="hata" role="alert">{hata}</p>}
        {evrenler && evrenler.length === 0 && !aciliyor && panel === 'yok' && (
          <div class="bos">
            <p>Henüz bir evren yok.</p>
            <button class="dugme ana" onClick={() => setAciliyor(true)}>İlk evreni oluştur</button>
          </div>
        )}
        {evrenler && evrenler.length > 0 && (
          <div class="kartlar">
            {evrenler.map((e) => (
              <button class="kart" key={e.kod} onClick={() => git(`/e/${e.kod}`)}>
                <h3>{e.ad}</h3>
                <div class="soluk kucuk">{e.sonAcilis ? `Son açılış ${zamanYaz(e.sonAcilis)}` : `Oluşturuldu ${zamanYaz(e.olusturma)}`}</div>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
