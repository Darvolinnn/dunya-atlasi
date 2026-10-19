// Harita künyesi (§8.3, F17): her haritanın evren içi tarihi, yapanı, amacı ve bilinen hataları tutulur.
// Künye haritanın yanında görünür; boşsa hiçbir alan kalabalığı eklemez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { HaritaKunyesi, HaritaKunyeTanimi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { useYukle } from './Anlati';

const hataYaz = (e: unknown) => (e as Error).message;
type Secim = { kod: string; ad: string };

export function HaritaKunyeBolumu({
  istemci,
  evren,
  harita,
  saltOkunur,
}: {
  istemci: Istemci;
  evren: string;
  harita: string;
  saltOkunur?: boolean;
}) {
  const [kunye, yenile] = useYukle<HaritaKunyesi | null>(
    istemci,
    evren,
    () => istemci.iste('haritaKunyesi', { evren, harita }),
    [harita],
  );
  const [duzenle, setDuzenle] = useState(false);

  useEffect(() => {
    setDuzenle(false);
  }, [harita]);

  if (!kunye && !duzenle) {
    if (saltOkunur) return null;
    return (
      <div class="satir">
        <button type="button" class="dugme sade kucuk" onClick={() => setDuzenle(true)}>
          Harita künyesi ekle
        </button>
      </div>
    );
  }

  return (
    <section class="harita-kunye" aria-label="Harita künyesi">
      <div class="satir">
        <h2>Harita künyesi</h2>
        {kunye?.catismali && <span class="rozet uyari">İki cihazda farklı</span>}
        <span class="bosluk" />
        {!saltOkunur && (
          <button
            type="button"
            class="dugme sade kucuk"
            aria-expanded={duzenle}
            onClick={() => setDuzenle(!duzenle)}
          >
            {duzenle ? 'Kapat' : 'Düzenle'}
          </button>
        )}
      </div>
      {kunye && !duzenle && (
        <div class="kucuk">
          {kunye.tanim.tarih && (
            <p>
              <span class="soluk">Tarihi:</span> {kunye.tanim.tarih}
            </p>
          )}
          {kunye.tanim.yapan && (
            <p>
              <span class="soluk">Yapan:</span>{' '}
              {kunye.yapanAd ? <a href={`#/e/${evren}/k/${kunye.tanim.yapan}`}>{kunye.yapanAd}</a> : <span>Silinmiş veya bulunamayan kayıt</span>}
            </p>
          )}
          {kunye.tanim.amac && (
            <p>
              <span class="soluk">Amacı:</span> {kunye.tanim.amac}
            </p>
          )}
          {kunye.tanim.bilinenHatalar.length > 0 && (
            <div>
              <span class="soluk">Bilinen hatalar:</span>
              <ul class="isaret-listesi">
                {kunye.tanim.bilinenHatalar.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {duzenle && !saltOkunur && (
        <HaritaKunyeFormu
          istemci={istemci}
          evren={evren}
          harita={harita}
          mevcut={kunye}
          kapat={() => {
            setDuzenle(false);
            yenile();
          }}
        />
      )}
    </section>
  );
}

function HaritaKunyeFormu({
  istemci,
  evren,
  harita,
  mevcut,
  kapat,
}: {
  istemci: Istemci;
  evren: string;
  harita: string;
  mevcut: HaritaKunyesi | null;
  kapat: () => void;
}) {
  const [tarih, setTarih] = useState(mevcut?.tanim.tarih ?? '');
  const [yapan, setYapan] = useState<Secim | null>(
    mevcut?.tanim.yapan ? { kod: mevcut.tanim.yapan, ad: mevcut.yapanAd ?? mevcut.tanim.yapan } : null,
  );
  const [amac, setAmac] = useState(mevcut?.tanim.amac ?? '');
  const [hatalar, setHatalar] = useState<string[]>(
    mevcut?.tanim.bilinenHatalar.length ? [...mevcut.tanim.bilinenHatalar] : [''],
  );
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = (e: Event) => {
    e.preventDefault();
    const tanim: HaritaKunyeTanimi = {
      tarih: tarih.trim(),
      yapan: yapan?.kod ?? null,
      amac: amac.trim(),
      bilinenHatalar: hatalar.map((x) => x.trim()).filter(Boolean),
    };
    istemci.iste('haritaKunyeYaz', { evren, harita, tanim }).then(kapat, (err) => setHata(hataYaz(err)));
  };

  const temizle = () => {
    istemci.iste('haritaKunyeYaz', { evren, harita, tanim: null }).then(kapat, (err) => setHata(hataYaz(err)));
  };

  return (
    <form class="kart" onSubmit={kaydet}>
      <div class="alan">
        <label class="alan-adi" for={`harita-kunye-tarih-${harita}`}>
          Evren içi tarihi
        </label>
        <input
          id={`harita-kunye-tarih-${harita}`}
          class="girdi"
          lang="tr"
          placeholder="Ör. 312 veya ~300"
          value={tarih}
          onInput={(e) => setTarih((e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="alan">
        <span class="alan-adi">Yapan</span>
        <span class="satir">
          <KayitSec istemci={istemci} evren={evren} secili={yapan} etiket="Yapanı seç" sec={setYapan} />
          {yapan && (
            <button
              type="button"
              class="dugme sade kucuk"
              aria-label="Yapanı kaldır"
              onClick={() => setYapan(null)}
            >
              ×
            </button>
          )}
        </span>
      </div>
      <div class="alan">
        <label class="alan-adi" for={`harita-kunye-amac-${harita}`}>
          Amacı
        </label>
        <input
          id={`harita-kunye-amac-${harita}`}
          class="girdi"
          lang="tr"
          maxLength={500}
          placeholder="Ör. Tüccar kervan kılavuzu, sınır iddiası"
          value={amac}
          onInput={(e) => setAmac((e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="alan">
        <span class="alan-adi">Bilinen hatalar</span>
        {hatalar.map((m, i) => (
          <div class="satir" key={i}>
            <input
              class="girdi"
              style="flex:1"
              lang="tr"
              maxLength={300}
              aria-label={`${i + 1}. bilinen hata`}
              placeholder="Ör. Kuzey kıyısı abartılı çizilmiş"
              value={m}
              onInput={(e) =>
                setHatalar(hatalar.map((x, j) => (j === i ? (e.target as HTMLInputElement).value : x)))
              }
            />
            <button
              type="button"
              class="dugme sade kucuk"
              aria-label={`${i + 1}. bilinen hatayı çıkar`}
              onClick={() => setHatalar(hatalar.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          class="dugme sade kucuk"
          onClick={() => setHatalar([...hatalar, ''])}
        >
          Bilinen hata ekle
        </button>
      </div>
      {hata && (
        <p class="hata kucuk" role="alert">
          {hata}
        </p>
      )}
      <div class="satir">
        <button class="dugme ana kucuk" type="submit">
          Kaydet
        </button>
        {mevcut && (
          <button class="dugme sade kucuk" type="button" onClick={temizle}>
            Künyeyi kaldır
          </button>
        )}
        <button class="dugme sade kucuk" type="button" onClick={kapat}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}
