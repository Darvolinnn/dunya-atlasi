// F11 Geçmişin bugünkü izleri (§4.5, §5, §16.1): Olay sayfasında kısa vadeli sonuçlar ile kalıcı izler ayrı
// listelenir; mekân ve şehir sayfalarında o yere bağlı izler olay tarihine göre sıralı dönem katmanları olarak görünür.
import { useState } from 'preact/hooks';
import type { IzKaydi, KaliciIzTuru, KisaKayit, MekanIzKatmani, OlayIzleri } from '../veri/api';
import type { Istemci } from '../veri/istemci';
import { useYukle } from './Anlati';

const hataYaz = (e: unknown) => (e as Error).message;

export function KaliciIzBolumu({
  istemci,
  evren,
  kod,
  tur,
  surum,
  saltOkunur,
}: {
  istemci: Istemci;
  evren: string;
  kod: string;
  tur: string;
  surum?: number;
  saltOkunur?: boolean;
}) {
  if (tur === 'olay') {
    return <OlayIzleriBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} saltOkunur={saltOkunur} />;
  }
  if (tur === 'mekan' || tur === 'sehir') {
    return <MekanIzKatmanlariBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />;
  }
  return null;
}

function OlayIzleriBolumu({
  istemci,
  evren,
  kod,
  surum,
  saltOkunur,
}: {
  istemci: Istemci;
  evren: string;
  kod: string;
  surum?: number;
  saltOkunur?: boolean;
}) {
  const [veri, yenile] = useYukle<OlayIzleri | null>(
    istemci,
    evren,
    () => istemci.iste('olayIzleri', { evren, olay: kod }),
    [kod, surum],
  );
  const [duzenlenen, setDuzenlenen] = useState<IzKaydi | 'yeni' | null>(null);
  const [izTuru, setIzTuru] = useState<KaliciIzTuru>('kalici');
  const [ad, setAd] = useState('');
  const [yer, setYer] = useState('');
  const [bitis, setBitis] = useState('');
  const [gercekKoken, setGercekKoken] = useState('');
  const [anlatilanHikaye, setAnlatilanHikaye] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  if (!veri) return null;

  const formuAc = (hedef: IzKaydi | 'yeni', varsayilanTur: KaliciIzTuru = 'kalici') => {
    setHata(null);
    setDuzenlenen(hedef);
    if (hedef === 'yeni') {
      setIzTuru(varsayilanTur);
      setAd('');
      setYer('');
      setBitis('');
      setGercekKoken('');
      setAnlatilanHikaye('');
    } else {
      setIzTuru(hedef.tur);
      setAd(hedef.ad);
      setYer(hedef.yer?.kod ?? '');
      setBitis(hedef.bitis?.ifade ?? '');
      setGercekKoken(hedef.gercekKoken);
      setAnlatilanHikaye(hedef.anlatilanHikaye);
    }
  };

  const kaydet = async (e: Event) => {
    e.preventDefault();
    try {
      setHata(null);
      await istemci.iste('izKaydiYaz', {
        evren,
        kod: duzenlenen && duzenlenen !== 'yeni' ? duzenlenen.kod : null,
        olay: kod,
        tur: izTuru,
        ad,
        yer: yer || null,
        bitis: bitis.trim() || null,
        gercekKoken,
        anlatilanHikaye,
      });
      setDuzenlenen(null);
      yenile();
    } catch (err) {
      setHata(hataYaz(err));
    }
  };

  const sil = async (izKod: string) => {
    try {
      setHata(null);
      await istemci.iste('izKaydiSil', { evren, kod: izKod });
      yenile();
    } catch (err) {
      setHata(hataYaz(err));
    }
  };

  const geriYukle = async (izKod: string) => {
    try {
      setHata(null);
      await istemci.iste('izKaydiGeriYukle', { evren, kod: izKod });
      yenile();
    } catch (err) {
      setHata(hataYaz(err));
    }
  };

  const listeSatiri = (iz: IzKaydi) => (
    <li key={iz.kod} class="kalici-iz-karti">
      <div class="satir">
        <strong>{iz.ad}</strong>
        {iz.yer && (
          <span class="kucuk">
            Yer: <a href={`#/e/${evren}/k/${iz.yer.kod}`}>{iz.yer.ad}</a>
          </span>
        )}
        {iz.bitis && <span class="soluk kucuk">Bitiş: {iz.bitis.ifade}</span>}
        <span class="bosluk" />
        {!saltOkunur && (
          <>
            <button type="button" class="dugme sade kucuk" onClick={() => formuAc(iz)}>
              Düzenle
            </button>
            <button type="button" class="dugme sade kucuk" onClick={() => sil(iz.kod)}>
              Kaldır
            </button>
          </>
        )}
      </div>
      {iz.gercekKoken && (
        <div class="kucuk kalici-iz-alan">
          <span class="soluk">Gerçek kökeni: </span>
          <span>{iz.gercekKoken}</span>
        </div>
      )}
      {iz.anlatilanHikaye && (
        <div class="kucuk kalici-iz-alan">
          <span class="soluk">Anlatılan hikâyesi: </span>
          <span>{iz.anlatilanHikaye}</span>
        </div>
      )}
    </li>
  );

  return (
    <section class="surecler kalici-iz-bolumu" aria-label="Olayın sonuçları ve kalıcı izleri">
      <div class="satir">
        <h2>Olayın sonuçları ve kalıcı izleri</h2>
        <span class="bosluk" />
        {!saltOkunur && duzenlenen === null && (
          <button type="button" class="dugme sade kucuk" onClick={() => formuAc('yeni', 'kalici')}>
            İz ekle
          </button>
        )}
      </div>

      {hata && <p class="hata kucuk">{hata}</p>}

      {duzenlenen !== null && !saltOkunur && (
        <form class="kalici-iz-formu" onSubmit={kaydet}>
          <div class="satir">
            <label class="satir kucuk">
              <span>Tür</span>
              <select
                class="girdi"
                aria-label="İz türü"
                value={izTuru}
                onChange={(e) => setIzTuru((e.target as HTMLSelectElement).value as KaliciIzTuru)}
              >
                <option value="kisa_vadeli">Kısa vadeli sonuç</option>
                <option value="kalici">Kalıcı iz</option>
              </select>
            </label>
            <label class="satir kucuk" style="flex:1">
              <span>Kısa ad</span>
              <input
                class="girdi"
                lang="tr"
                aria-label="Kısa ad"
                placeholder="Ör. Şehitler Mezarlığı, Yanık Çarşı adı, Gümüş Türküsü"
                value={ad}
                onInput={(e) => setAd((e.target as HTMLInputElement).value)}
              />
            </label>
          </div>
          <div class="satir">
            <label class="satir kucuk">
              <span>Yer (isteğe bağlı)</span>
              <select
                class="girdi"
                aria-label="Yer kaydı"
                value={yer}
                onChange={(e) => setYer((e.target as HTMLSelectElement).value)}
              >
                <option value="">(yer seçilmedi)</option>
                {veri.yerAdaylari.map((y: KisaKayit) => (
                  <option key={y.kod} value={y.kod}>
                    {y.ad}
                  </option>
                ))}
              </select>
            </label>
            <label class="satir kucuk">
              <span>Bitiş tarihi (isteğe bağlı)</span>
              <input
                class="girdi"
                lang="tr"
                aria-label="Bitiş tarihi"
                placeholder="Ör. 480"
                value={bitis}
                onInput={(e) => setBitis((e.target as HTMLInputElement).value)}
              />
            </label>
          </div>
          <label class="kucuk">
            <span class="soluk">Gerçek kökeni</span>
            <textarea
              class="girdi"
              rows={2}
              lang="tr"
              aria-label="Gerçek kökeni"
              placeholder="Olaydan gerçekte nasıl doğdu?"
              value={gercekKoken}
              onInput={(e) => setGercekKoken((e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <label class="kucuk">
            <span class="soluk">Anlatılan hikâyesi</span>
            <textarea
              class="girdi"
              rows={2}
              lang="tr"
              aria-label="Anlatılan hikâyesi"
              placeholder="Bugün halk arasında veya kayıtlarda nasıl anlatılıyor?"
              value={anlatilanHikaye}
              onInput={(e) => setAnlatilanHikaye((e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <div class="satir">
            <button type="submit" class="dugme birincil kucuk">
              Kaydet
            </button>
            <button type="button" class="dugme sade kucuk" onClick={() => setDuzenlenen(null)}>
              Vazgeç
            </button>
          </div>
        </form>
      )}

      <div class="kalici-iz-gruplar">
        <div class="kalici-iz-grup">
          <div class="satir">
            <h3 class="kucuk">Kısa vadeli sonuçlar</h3>
          </div>
          {veri.kisaVadeli.length === 0 ? (
            <p class="soluk kucuk">Kısa vadeli sonuç yazılmamış.</p>
          ) : (
            <ul class="kalici-iz-listesi">{veri.kisaVadeli.map(listeSatiri)}</ul>
          )}
        </div>

        <div class="kalici-iz-grup">
          <div class="satir">
            <h3 class="kucuk">Kalıcı izler</h3>
          </div>
          {veri.kalici.length === 0 ? (
            <p class="soluk kucuk">Kalıcı iz yazılmamış.</p>
          ) : (
            <ul class="kalici-iz-listesi">{veri.kalici.map(listeSatiri)}</ul>
          )}
        </div>
      </div>

      {veri.silinenler.length > 0 && !saltOkunur && (
        <details class="kucuk" style="margin-top:8px">
          <summary class="soluk">Kaldırılan izler ({veri.silinenler.length})</summary>
          <ul class="kalici-iz-listesi">
            {veri.silinenler.map((iz) => (
              <li key={iz.kod} class="satir">
                <span class="soluk">{iz.ad}</span>
                <span class="bosluk" />
                <button type="button" class="dugme sade kucuk" onClick={() => geriYukle(iz.kod)}>
                  Geri getir
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function MekanIzKatmanlariBolumu({
  istemci,
  evren,
  kod,
  surum,
}: {
  istemci: Istemci;
  evren: string;
  kod: string;
  surum?: number;
}) {
  const [katmanlar] = useYukle<MekanIzKatmani[] | null>(
    istemci,
    evren,
    () => istemci.iste('mekanIzKatmanlari', { evren, yer: kod }),
    [kod, surum],
  );

  if (!katmanlar) return null;

  return (
    <section class="surecler kalici-iz-katmanlari" aria-label="Dönem katmanları">
      <div class="satir">
        <h2>Dönem katmanları (geçmişin izleri)</h2>
      </div>
      {katmanlar.length === 0 ? (
        <p class="soluk kucuk">Bu yere bağlı geçmiş izi henüz kaydedilmemiş.</p>
      ) : (
        <div class="kalici-iz-katman-listesi">
          {katmanlar.map((k) => (
            <div key={k.anahtar} class="kalici-iz-katman">
              <h3 class="kucuk">{k.baslik}</h3>
              <ul class="kalici-iz-listesi">
                {k.izler.map((iz) => (
                  <li key={iz.kod} class="kalici-iz-karti">
                    <div class="satir">
                      <strong>{iz.ad}</strong>
                      <span class="soluk kucuk">
                        ({iz.tur === 'kisa_vadeli' ? 'Kısa vadeli sonuç' : 'Kalıcı iz'})
                      </span>
                      <span class="kucuk">
                        Olay: <a href={`#/e/${evren}/k/${iz.olay.kod}`}>{iz.olay.ad}</a>
                      </span>
                      {iz.bitis && <span class="soluk kucuk">Bitiş: {iz.bitis.ifade}</span>}
                    </div>
                    {iz.gercekKoken && (
                      <div class="kucuk kalici-iz-alan">
                        <span class="soluk">Gerçek kökeni: </span>
                        <span>{iz.gercekKoken}</span>
                      </div>
                    )}
                    {iz.anlatilanHikaye && (
                      <div class="kucuk kalici-iz-alan">
                        <span class="soluk">Anlatılan hikâyesi: </span>
                        <span>{iz.anlatilanHikaye}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
