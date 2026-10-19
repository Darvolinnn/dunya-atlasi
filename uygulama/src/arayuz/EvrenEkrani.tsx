import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EvrenBilgisi, GunlukSatiri } from '../veri/api';
import { gizliAdimMi, islemAciklamasi, zamanYaz } from '../alan/islem-metni';
import { git } from './Uygulama';
import { DriveYedekleri, YedekSekmesi } from './Tasima';
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
import { KosulMasasiSekmesi } from './KosulMasasi';
import { KesifSekmesi } from './Kesif';
import { BagSeridi, SurumlerSekmesi } from './Surumler';
import { MarkdownCiktisi } from './Cikti';
import { MasaPusulasi, MeseleSekmesi, SablonlarSekmesi } from './Sablon';

/** İnceleme görünümleri (§7) tek sekme altında; aynı verinin farklı çizimleri. */
const GORUNUMLER = [['cizelge', 'Zaman çizelgesi'], ['ag', 'Ağ'], ['soy', 'Soy ağacı'], ['neden', 'Neden–sonuç'], ['durumlar', 'Durum geçmişi'],
  ['yogunluk', 'Yoğunluk ve boşluk'],
  ['gokyuzu', 'Gökyüzü'],
  ['sozluk', 'Sözlük denetimi'],
  ['kosullar', 'Sonuçtan koşullara'],
  ['kesif', 'Keşif soruları'],
  ['hatlar', 'Kurgu hatları'], ['matris', 'Bölüm × kayıt'], ['gun', 'Sıradan bir gün'], ['karsilastir', 'Karşılaştırmalı okuma'], ['gezinti', 'Gezintiler'], ['pano', 'Görsel panolar']] as const;
let sonGorunum = 'cizelge';

export function EvrenEkrani({ istemci, kod, sekme, alt = null }: { istemci: Istemci; kod: string; sekme: string; alt?: string | null }) {
  const [bilgi, setBilgi] = useState<EvrenBilgisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [surum, setSurum] = useState(0);

  useEffect(() => { istemci.iste('evrenBilgisi', { evren: kod }).then(setBilgi, (e) => setHata(e.message)); }, [kod, surum]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === kod) setSurum((s) => s + 1); }), [kod]);

  if (GORUNUMLER.some(([g]) => g === sekme)) sonGorunum = sekme;
  if (hata) return <main class="sayfa"><p class="hata">{hata}</p><a href="#/">Evrenlere dön</a></main>;
  if (!bilgi) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;

  return (
    <>
      <header class="ust">
        <a href="#/" class="dugme sade">← Evrenler</a>
        <span class="ad">{bilgi.ad}</span>
        <span class="bosluk" />
      </header>
      <main class="sayfa">
        <BagSeridi bag={bilgi.bag} />
        {bilgi.bag ? <h1>{bilgi.ad}</h1> : <AdBasligi istemci={istemci} bilgi={bilgi} />}
        <p class="soluk kucuk">Oluşturuldu {zamanYaz(bilgi.olusturma)} · {bilgi.islemSayisi} değişiklik kayıtlı</p>
        <div class="sekmeler" role="tablist">
          {([['masa', 'Masa'], ['masalar', 'Çalışma masaları'], ['kayitlar', `Kayıtlar (${bilgi.kayitSayisi})`], ['meseleler', 'Açık meseleler'], ['sablonlar', 'Şablonlar'], ['haritalar', 'Haritalar'], ['gorunumler', 'Görünümler'], ['takvim', 'Takvim'], ['bahsedilen', 'Bahsedilen ama yazılmamış'], ['cop', `Çöp kutusu (${bilgi.copSayisi})`], ['gecmis', 'Geçmiş'], ['surumler', 'Sürümler'], ['yedek', 'Yedek'],
            ['inceleme', bilgi.catismaSayisi + bilgi.sorunSayisi ? `İnceleme (${bilgi.catismaSayisi + bilgi.sorunSayisi})` : 'İnceleme']] as const).filter(([k]) => !bilgi.bag || !['surumler', 'yedek'].includes(k)).map(([k, ad]) => (
            <button class="sekme" role="tab" aria-selected={k === 'gorunumler' ? GORUNUMLER.some(([g]) => g === sekme) : sekme === k}
              onClick={() => git(`/e/${kod}/${k === 'gorunumler' ? sonGorunum : k}`)}>{ad}</button>
          ))}
        </div>
        {GORUNUMLER.some(([g]) => g === sekme) && (
          <div class="sekmeler alt-sekmeler" role="tablist" aria-label="Görünümler">
            {GORUNUMLER.map(([k, ad]) => <button class="sekme" role="tab" aria-selected={sekme === k} onClick={() => git(`/e/${kod}/${k}`)}>{ad}</button>)}
          </div>
        )}
        {sekme === 'inceleme' ? <IncelemeKuyrugu istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'yedek' ? <><YedekSekmesi istemci={istemci} evren={kod} surum={surum} /><MarkdownCiktisi istemci={istemci} evren={kod} /><DriveYedekleri istemci={istemci} evren={kod} surum={surum} /></>
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
          : sekme === 'matris' ? <BolumMatrisiGorunumu istemci={istemci} evren={kod} eser={alt} />
          : sekme === 'gun' ? <SiradanGunSekmesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'gokyuzu' ? <GokyuzuSekmesi key={kod} istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'yogunluk' ? <YogunlukSekmesi key={kod} istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'karsilastir' ? <KarsilastirmaSekmesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'sozluk' ? <SozlukSekmesi istemci={istemci} evren={kod} surum={surum} />
          : sekme === 'kosullar' ? <KosulMasasiSekmesi istemci={istemci} evren={kod} />
          : sekme === 'kesif' ? <KesifSekmesi istemci={istemci} evren={kod} />
          : sekme === 'gezinti' || sekme === 'pano' ? <DerlemeSekmesi istemci={istemci} evren={kod} tur={sekme} secili={alt} surum={surum} />
          : sekme === 'takvim' ? <TakvimSekmesi istemci={istemci} evren={kod} />
          : sekme === 'sablonlar' ? <SablonlarSekmesi istemci={istemci} evren={kod} tur={alt} />
          : <Masa istemci={istemci} evren={kod} surum={surum} ekler={<MasaPusulasi istemci={istemci} evren={kod} kayitSayisi={bilgi.kayitSayisi} />} />}
      </main>
    </>
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
      <p class="soluk kucuk">Bu evrende yapılan her değişiklik, yapıldığı sırayla burada tutulur. En yenisi en üstte.</p>
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
