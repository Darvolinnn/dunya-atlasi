import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EvrenOzeti } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { git } from './Uygulama';
import { SayfaYardimi } from './SayfaYardimi';
import { IceAktar, YedektenGeriYukle } from './Tasima';
import { onayla } from './onay';

export function EvrenlerEkrani({ istemci }: { istemci: Istemci }) {
  const [evrenler, setEvrenler] = useState<EvrenOzeti[] | null>(null);
  const [yeniAd, setYeniAd] = useState('');
  const [aciliyor, setAciliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [panel, setPanel] = useState<'yok' | 'yedek' | 'ice'>('yok');

  const yukle = () => istemci.iste('evrenler').then(setEvrenler, (e) => setHata(e.message));
  useEffect(() => { yukle(); return istemci.dinle((d) => { if (d.uzaktan) yukle(); }); }, []);

  /** Evreni yalnızca bu cihazdan kaldırır (§10.1). Onay, kaybolacak olanı açıkça söyler. */
  const kaldir = async (e: EvrenOzeti) => {
    setHata(null);
    try {
      const [d, dosyaYedegi, donemsel] = await Promise.all([istemci.iste('esitlemeDurumu'), istemci.iste('sonYedek', { evren: e.kod }),
        istemci.iste('donemselYedekDurumu', { evren: e.kod }).catch(() => null)]);
      const v = d.evrenler.find((x) => x.kod === e.kod);
      const driveda = !!(v?.esitlenir && v.sonEsitleme);
      const yalniz = v ? v.yalnizBuCihazda + v.denemeler.reduce((n, y) => n + y.yalnizBuCihazda, 0) : 0;
      const yedek = Math.max(dosyaYedegi ?? 0, donemsel?.son?.dogrulandi ? donemsel.son.zaman : 0);
      const yedekCumlesi = yedek
        ? `Son yedek: ${zamanYaz(yedek)}. O tarihten sonraki değişiklikler yedekte yok.`
        : 'Bu evrenin hiç yedeği yok. Önce evrenin Yedek sayfasından yedek almanızı öneririz.';
      const soru = driveda && !yalniz
        ? `“${e.ad}” bu cihazdan kaldırılsın mı?\n\nDrive'daki kopyası ve öbür cihazlarınız etkilenmez. İsterseniz “Eşitleme ve cihazlar” sayfasından yeniden indirebilirsiniz.`
        : driveda
          ? `“${e.ad}” bu cihazdan kaldırılsın mı?\n\n${yalniz} değişiklik henüz Drive'a gönderilmedi; kaldırırsanız bu değişiklikler kaybolur.\n\n${yedekCumlesi}`
          : `“${e.ad}” yalnızca bu cihazda. Kaldırırsanız geri getirilemez.\n\n${yedekCumlesi}\n\nKaldırılsın mı?`;
      if (!onayla(soru)) return;
      if ((!driveda || yalniz) && !yedek && !onayla(`Son kez soruyoruz: “${e.ad}” ve içindeki her şey kalıcı olarak silinecek. Devam edilsin mi?`)) return;
      await istemci.iste('evrenKaldir', { evren: e.kod });
      yukle();
    } catch (x) { setHata((x as Error).message); }
  };

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
      <header class="ust"><span class="ad">Dünya Atlası</span><span class="bosluk" /><a class="dugme sade" href="#/esitleme">Eşitleme ve cihazlar</a></header>
      <main class="sayfa">
        <div class="satir" style="justify-content:space-between">
          <div class="baslik-satiri"><h1>Evrenler</h1><SayfaYardimi sayfa="evrenler" /></div>
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
            <p class="soluk kucuk">Adı sonradan değiştirebilirsiniz.</p>
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
              <div class="evren-karti" key={e.kod}>
                <button class="kart" onClick={() => git(`/e/${e.kod}`)}>
                  <h3>{e.ad}</h3>
                  <div class="soluk kucuk">{e.sonAcilis ? `Son açılış: ${zamanYaz(e.sonAcilis)}` : `Oluşturulma: ${zamanYaz(e.olusturma)}`}</div>
                </button>
                <button class="dugme sade kucuk tehlikeli evren-kaldir" aria-label={`“${e.ad}” evrenini bu cihazdan kaldır`} title="Bu cihazdan kaldır" onClick={() => void kaldir(e)}>Kaldır</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
