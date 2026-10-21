import { useEffect, useState } from 'preact/hooks';
import { KurguSecici } from './ortak';
import { SonYedekSatiri } from './Esitleme';
import { KURGU_TURLERI } from '../alan/turler';
import type { Istemci } from '../veri/istemci';
import type { EvrenBilgisi, GunlukSatiri } from '../veri/api';
import { gizliAdimMi, islemAciklamasi, zamanYaz } from '../alan/islem-metni';
import { DriveYedekleri, YedekSekmesi, YerelYedekler } from './Tasima';
import { Bahsedilenler, CopKutusu, KayitListesi } from './KayitListesi';
import { Masa } from './Masa';
import { MasalarSekmesi } from './Masalar';
import { TakvimSekmesi, ZamanCizelgesi } from './Takvim';
import { HaritalarSekmesi } from './Harita';
import { AgGorunumu, BolumMatrisiGorunumu, DurumGecmisiSekmesi, KurguHatlariGorunumu, NedenSonucGorunumu, SoyAgaciGorunumu } from './Gorunumler';
import { IncelemeKuyrugu } from './Inceleme';
import { KarsilastirmaSekmesi, SiradanGunSekmesi } from './Gundelik';
import { GokyuzuSekmesi } from './Gokyuzu';
import { YogunlukSekmesi } from './Yogunluk';
import { DerlemeSekmesi } from './Derleme';
import { SozlukSekmesi } from './Sozluk';
import { AnlatiSozlesmesiSekmesi } from './AnlatiSozlesmesi';
import { KosulMasasiSekmesi } from './KosulMasasi';
import { KesifSekmesi } from './Kesif';
import { BagSeridi, SurumlerSekmesi } from './Surumler';
import { MarkdownCiktisi } from './Cikti';
import { MasaPusulasi, MeseleSekmesi, SablonlarSekmesi } from './Sablon';

import { SayfaYardimi } from './SayfaYardimi';
import { OlayOrgusuGorunumu } from './OlayOrgusu';
import { ANA_SAYFALAR, DIGER_SAYFALAR, EvrenKabugu, GORUNUMLER, gorunumMu } from './Kabuk';

const SAYFA_ADLARI = new Map<string, string>([...ANA_SAYFALAR, ...DIGER_SAYFALAR, ...GORUNUMLER]);

export function EvrenEkrani({ istemci, kod, sekme, alt = null }: { istemci: Istemci; kod: string; sekme: string; alt?: string | null }) {
  const [bilgi, setBilgi] = useState<EvrenBilgisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [surum, setSurum] = useState(0);

  useEffect(() => { istemci.iste('evrenBilgisi', { evren: kod }).then(setBilgi, (e) => setHata(e.message)); }, [kod, surum]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === kod) setSurum((s) => s + 1); }), [kod]);

  if (hata) return <main class="sayfa"><p class="hata">{hata}</p><a href="#/">Evrenlere dön</a></main>;
  if (!bilgi) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;
  const baslik = sekme === 'masa' ? null : SAYFA_ADLARI.get(sekme) ?? null;
  // Açık harita bütün genişliği kullanır; başlığı haritanın kendi satırındadır (taslak 4A).
  const haritaAcik = sekme === 'haritalar' && !!alt;

  return (
    <EvrenKabugu istemci={istemci} evren={kod} etkin={sekme}>
      <main class={haritaAcik ? 'sayfa genis' : 'sayfa'}>
        <BagSeridi bag={bilgi.bag} />
        {sekme === 'masa' && (
          <>
            {bilgi.bag ? <div class="baslik-satiri"><h1>{bilgi.ad}</h1><SayfaYardimi sayfa="masa" /></div> : <AdBasligi istemci={istemci} bilgi={bilgi} />}
            <p class="soluk kucuk">Oluşturulma: {zamanYaz(bilgi.olusturma)} · {bilgi.islemSayisi} değişiklik</p>
            {!bilgi.bag && <SonYedekSatiri istemci={istemci} evren={kod} />}
            {!bilgi.bag && <KurguAyari istemci={istemci} bilgi={bilgi} />}
          </>
        )}
        {baslik && !haritaAcik && <div class="baslik-satiri sayfa-basligi"><h1>{gorunumMu(sekme) ? <><span class="soluk">Grafikler · </span>{baslik}</> : baslik}</h1><SayfaYardimi sayfa={sekme} /></div>}
        {sekme === 'inceleme' ? <IncelemeKuyrugu istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'yedek' ? <><YedekSekmesi istemci={istemci} evren={kod} surum={surum} /><YerelYedekler istemci={istemci} evren={kod} surum={surum} /><MarkdownCiktisi istemci={istemci} evren={kod} /><DriveYedekleri istemci={istemci} evren={kod} surum={surum} /></>
          : sekme === 'surumler' && !bilgi.bag ? <SurumlerSekmesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'gecmis' ? <Gecmis istemci={istemci} kod={kod} surum={surum} />
          : sekme === 'bahsedilen' ? <Bahsedilenler istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'cop' ? <CopKutusu istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'masalar' ? <MasalarSekmesi istemci={istemci} evren={kod} alt={alt} surum={surum} />
          : sekme === 'kayitlar' ? <KayitListesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'meseleler' ? <MeseleSekmesi istemci={istemci} evren={kod} />
          : sekme === 'haritalar' ? <HaritalarSekmesi istemci={istemci} evren={kod} kod={alt} />
          : sekme === 'cizelge' ? <ZamanCizelgesi istemci={istemci} evren={kod} />
          : sekme === 'ag' ? <AgGorunumu istemci={istemci} evren={kod} merkez={alt} />
          : sekme === 'soy' ? <SoyAgaciGorunumu istemci={istemci} evren={kod} odak={alt} />
          : sekme === 'durumlar' ? <DurumGecmisiSekmesi istemci={istemci} evren={kod} ozellik={alt} />
          : sekme === 'neden' ? <NedenSonucGorunumu istemci={istemci} evren={kod} merkez={alt} />
          : sekme === 'hatlar' ? <KurguHatlariGorunumu istemci={istemci} evren={kod} />
          : sekme === 'orgu' ? <OlayOrgusuGorunumu istemci={istemci} evren={kod} eser={alt} />
          : sekme === 'matris' ? <BolumMatrisiGorunumu istemci={istemci} evren={kod} eser={alt} />
          : sekme === 'gun' ? <SiradanGunSekmesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'gokyuzu' ? <GokyuzuSekmesi key={kod} istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'yogunluk' ? <YogunlukSekmesi key={kod} istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'karsilastir' ? <KarsilastirmaSekmesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'sozluk' ? <SozlukSekmesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'sozlesme' ? <AnlatiSozlesmesiSekmesi key={kod} istemci={istemci} evren={kod} surum={surum} saltOkunur={!!bilgi.bag} />
          : sekme === 'kosullar' ? <KosulMasasiSekmesi istemci={istemci} evren={kod} />
          : sekme === 'kesif' ? <KesifSekmesi istemci={istemci} evren={kod} />
          : sekme === 'gezinti' || sekme === 'pano' ? <DerlemeSekmesi istemci={istemci} evren={kod} tur={sekme} secili={alt} surum={surum} />
          : sekme === 'takvim' ? <TakvimSekmesi istemci={istemci} evren={kod} />
          : sekme === 'sablonlar' ? <SablonlarSekmesi istemci={istemci} evren={kod} tur={alt} />
          : <Masa istemci={istemci} evren={kod} surum={surum} ekler={<MasaPusulasi istemci={istemci} evren={kod} kayitSayisi={bilgi.kayitSayisi} />} />}
      </main>
    </EvrenKabugu>
  );
}

function AdBasligi({ istemci, bilgi }: { istemci: Istemci; bilgi: EvrenBilgisi }) {
  const [duzenle, setDuzenle] = useState(false);
  const [ad, setAd] = useState(bilgi.ad);
  const [hata, setHata] = useState<string | null>(null);
  const kaydet = async (e: Event) => {
    e.preventDefault();
    if (ad.trim() === bilgi.ad) { setDuzenle(false); return; }
    try { await istemci.iste('evrenAdlandir', { evren: bilgi.kod, ad }); setDuzenle(false); setHata(null); }
    catch (err) { setHata((err as Error).message); }
  };
  if (!duzenle) {
    return (
      <div class="satir">
        <h1>{bilgi.ad}</h1>
        <SayfaYardimi sayfa="masa" />
        <button class="dugme sade" onClick={() => { setAd(bilgi.ad); setDuzenle(true); }}>Adı değiştir</button>
      </div>
    );
  }
  return (
    <form class="satir" onSubmit={kaydet}>
      <label class="soluk" for="evren-adi">Evrenin adı</label>
      <input id="evren-adi" class="girdi" style="flex:1;min-width:200px" value={ad} autoFocus onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
      <button class="dugme ana" type="submit" disabled={!ad.trim()}>Kaydet</button>
      <button class="dugme" type="button" onClick={() => setDuzenle(false)}>Vazgeç</button>
      {hata && <span class="hata">{hata}</span>}
    </form>
  );
}

function Gecmis({ istemci, kod, surum }: { istemci: Istemci; kod: string; surum: number }) {
  const [satirlar, setSatirlar] = useState<GunlukSatiri[] | null>(null);
  const [adlar, setAdlar] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    istemci.iste('islemGunlugu', { evren: kod, sinir: 200 }).then(setSatirlar);
    Promise.all([istemci.iste('kayitlar', { evren: kod }), istemci.iste('kayitlar', { evren: kod, cop: true })])
      .then(([a, b]) => setAdlar(new Map([...a, ...b].map((k) => [k.kod, k.ad]))));
  }, [kod, surum]);
  if (!satirlar) return null;
  return (
    <>
      <p class="soluk kucuk">Bu evrende yapılan bütün değişiklikler burada sırayla listelenir. En yenisi en üsttedir.</p>
      <ul class="gunluk">
        {satirlar.filter((s) => !gizliAdimMi(s.tur, s.veri)).map((s) => (
          <li key={s.kod}>
            <span>{islemAciklamasi(s.tur, s.veri, (k) => adlar.get(String(k)) ?? 'Kayıt')}</span>
            <span class="soluk kucuk">{zamanYaz(s.zaman)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** "Ne yazıyorsunuz?" seçimi sonradan buradan değişir (§4, K28). */
function KurguAyari({ istemci, bilgi }: { istemci: Istemci; bilgi: EvrenBilgisi }) {
  const [hata, setHata] = useState<string | null>(null);
  const k = KURGU_TURLERI.find((x) => x.kod === bilgi.kurguTuru);
  return (
    <details class="kurgu-ayari">
      <summary class="kucuk soluk">Ne yazıyorsunuz? {k ? k.ad : 'Seçilmedi'}</summary>
      <p class="soluk kucuk">Kurgunuza uzak bölümler menüde “Diğer” altına alınır. Gizlenen bölümlerin kayıtları silinmez, yalnızca menüden kalkar.</p>
      <KurguSecici deger={bilgi.kurguTuru} degis={(kurgu) => istemci.iste('kurguTuruYaz', { evren: bilgi.kod, kurgu }).then(() => setHata(null), (e) => setHata((e as Error).message))} />
      {hata && <p class="hata kucuk">{hata}</p>}
    </details>
  );
}
