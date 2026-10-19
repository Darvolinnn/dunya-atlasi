// F07 Kurumlar kararları nasıl uygular (§16.1 F07, §3.10, §3.8):
// Olaya bağlı süreçlerde her adımın sorumlusu (kişi ya da makam) ve süreç için durdurabilir / fiilî veto listeleri.
// Bu bilgiler yalnızca bilgi olarak gösterilir; adımların durumunu ve sürecin sonucunu değiştirmez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { OlaySurecSorumlulari, SurecEngelSatiri, SurecEngelTuru } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;

export function SurecSorumluBolumu({ istemci, evren, olay, surum }: { istemci: Istemci; evren: string; olay: string; surum: number }) {
  const [veri, setVeri] = useState<OlaySurecSorumlulari | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = () => {
    istemci.iste('olaySurecSorumlulari', { evren, olay }).then((x) => { setVeri(x); setHata(null); }, (e) => setHata(hataYaz(e)));
  };

  useEffect(() => { yukle(); }, [evren, olay, surum]);

  if (!veri || !veri.surecler.length) return hata ? <p class="hata kucuk">{hata}</p> : null;

  const isle = (p: Promise<unknown>) => p.then(() => { setHata(null); yukle(); }, (e) => setHata(hataYaz(e)));

  return (
    <div class="surec-sorumlu-bolumu" aria-label="Süreç sorumluları ve durdurabilecek olanlar">
      <h3>Sorumlular ve durdurabilecek olanlar</h3>
      <p class="soluk kucuk">{veri.not}</p>
      {veri.surecler.map((s) => (
        <div key={s.kural} class="kart surec-sorumlu-karti">
          <div class="satir">
            <strong>{s.kuralAd}</strong>
            {s.catismali && <span class="rozet uyari-rozet">iki cihazda farklı yazıldı</span>}
          </div>
          {s.adimlar.length > 0 && (
            <ol class="adim-listesi">
              {s.adimlar.map((a) => (
                <li key={a.kod} class="satir surec-sorumlu-adim">
                  <span style="flex:1">{a.ad}</span>
                  <span class="soluk kucuk">Sorumlu:</span>
                  {a.sorumlu ? (
                    <span class="satir kucuk">
                      <a href={`#/e/${evren}/k/${a.sorumlu.kod}`} class={a.sorumlu.silindi ? 'silinmis' : ''}>{a.sorumlu.ad}</a>
                      <KayitSec
                        istemci={istemci}
                        evren={evren}
                        secili={{ kod: a.sorumlu.kod, ad: a.sorumlu.ad }}
                        etiket="Değiştir"
                        sec={(secim) => {
                          if (secim) void isle(istemci.iste('surecAdimSorumlusuYaz', { evren, olay, kural: s.kural, adim: a.kod, sorumlu: secim.kod }));
                        }}
                      />
                      <button
                        type="button"
                        class="dugme sade kucuk"
                        aria-label={`${a.ad}: sorumluyu kaldır`}
                        onClick={() => void isle(istemci.iste('surecAdimSorumlusuYaz', { evren, olay, kural: s.kural, adim: a.kod, sorumlu: null }))}
                      >
                        Kaldır
                      </button>
                    </span>
                  ) : (
                    <KayitSec
                      istemci={istemci}
                      evren={evren}
                      secili={null}
                      etiket="Sorumlu seç (kişi ya da makam)"
                      sec={(secim) => {
                        if (secim) void isle(istemci.iste('surecAdimSorumlusuYaz', { evren, olay, kural: s.kural, adim: a.kod, sorumlu: secim.kod }));
                      }}
                    />
                  )}
                </li>
              ))}
            </ol>
          )}
          <EngelListesi
            istemci={istemci}
            evren={evren}
            olay={olay}
            kural={s.kural}
            tur="durdurabilir"
            baslik="Durdurabilecek olanlar"
            aciklama="Resmî ya da kurumsal olarak bu süreci durdurabilecek kişi, makam ya da kurumlar."
            satirlar={s.durdurabilir}
            isle={isle}
          />
          <EngelListesi
            istemci={istemci}
            evren={evren}
            olay={olay}
            kural={s.kural}
            tur="veto"
            baslik="Fiilî vetosu olanlar"
            aciklama="Resmî yetkisi olmasa da fiilen süreci tıkayabilecek ya da engelleyebilecek olanlar."
            satirlar={s.veto}
            isle={isle}
          />
        </div>
      ))}
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}

function EngelListesi({
  istemci,
  evren,
  olay,
  kural,
  tur,
  baslik,
  aciklama,
  satirlar,
  isle,
}: {
  istemci: Istemci;
  evren: string;
  olay: string;
  kural: string;
  tur: SurecEngelTuru;
  baslik: string;
  aciklama: string;
  satirlar: SurecEngelSatiri[];
  isle: (p: Promise<unknown>) => void;
}) {
  const [secili, setSecili] = useState<{ kod: string; ad: string } | null>(null);
  const [not, setNot] = useState('');

  const ekle = (e: Event) => {
    e.preventDefault();
    if (!secili) return;
    isle(
      istemci
        .iste('surecEngelEkle', { evren, olay, kural, tur, kayit: secili.kod, not })
        .then(() => { setSecili(null); setNot(''); }),
    );
  };

  return (
    <div class="surec-sorumlu-engel">
      <div class="kucuk"><strong>{baslik}</strong> <span class="soluk">· {aciklama}</span></div>
      {satirlar.length > 0 && (
        <ul class="toplanan-listesi">
          {satirlar.map((x) => (
            <EngelSatirGorunumu
              key={x.kod}
              istemci={istemci}
              evren={evren}
              olay={olay}
              kural={kural}
              tur={tur}
              satir={x}
              isle={isle}
            />
          ))}
        </ul>
      )}
      <form class="satir kucuk" onSubmit={ekle}>
        <KayitSec istemci={istemci} evren={evren} secili={secili} etiket="Kayıt seç" sec={setSecili} />
        <input
          class="girdi kucuk"
          style="flex:1;min-width:140px"
          lang="tr"
          aria-label={`${baslik} için kısa not`}
          placeholder="Kısa not (isteğe bağlı)"
          value={not}
          onInput={(e) => setNot((e.target as HTMLInputElement).value)}
        />
        <button class="dugme kucuk" type="submit" disabled={!secili}>Ekle</button>
      </form>
    </div>
  );
}

function EngelSatirGorunumu({
  istemci,
  evren,
  olay,
  kural,
  tur,
  satir,
  isle,
}: {
  istemci: Istemci;
  evren: string;
  olay: string;
  kural: string;
  tur: SurecEngelTuru;
  satir: SurecEngelSatiri;
  isle: (p: Promise<unknown>) => void;
}) {
  const [not, setNot] = useState(satir.not);
  useEffect(() => { setNot(satir.not); }, [satir.not]);

  const notKaydet = () => {
    if (not.trim() === satir.not.trim()) return;
    isle(istemci.iste('surecEngelDegistir', { evren, olay, kural, tur, kod: satir.kod, not }));
  };

  return (
    <li class="satir kucuk">
      <a href={`#/e/${evren}/k/${satir.kayit.kod}`} class={satir.kayit.silindi ? 'silinmis' : ''}>
        <strong>{satir.kayit.ad}</strong>
      </a>
      <input
        class="girdi kucuk"
        style="flex:1;min-width:120px"
        lang="tr"
        aria-label={`${satir.kayit.ad} için not`}
        placeholder="Kısa not"
        value={not}
        onInput={(e) => setNot((e.target as HTMLInputElement).value)}
        onBlur={notKaydet}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      <button
        type="button"
        class="dugme sade kucuk"
        aria-label={`${satir.kayit.ad}: listeden kaldır`}
        onClick={() => onayla('Bu kayıt listeden kaldırılsın mı?') && isle(istemci.iste('surecEngelSil', { evren, olay, kural, tur, kod: satir.kod }))}
      >
        Kaldır
      </button>
    </li>
  );
}
