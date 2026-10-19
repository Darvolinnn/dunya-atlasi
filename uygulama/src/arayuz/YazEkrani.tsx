// Yazma düzeni (§5.10, K24): solda gezinti çubuğu ve eser ağacı, ortada metin, sağda dar ve kapatılabilir bağlam
// paneli. Sahnenin bütün alanları kayıt sayfasındadır; buradan bir bağlantıyla açılır.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EserYapisi, EvrenBilgisi, Kayit, KaldigiYerBilgisi, KisaKayit } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { EvrenKabugu } from './Kabuk';
import { MetinEditoru, type EditorDenetimi } from './MetinEditoru';
import { AnlatiYolu, EserYapisiBolumu, SahneAlanlari, SahneBaglamPaneli, useSahneBaglami } from './Anlati';
import { TarihAlani } from './KayitBolumleri';
import { AlanGirdisi } from './KayitEkrani';
import { CatismaListesi } from './Catismalar';
import { YAZMA_TURLERI, useCalisma } from './Calisma';
import { git } from './Uygulama';
import { onayla } from './onay';
import { SayfaYardimi } from './SayfaYardimi';

const baglamAnahtari = 'dunya-atlasi:yazma-baglami-kapali';
const okuYerel = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };

export function YazEkrani({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string | null }) {
  return (
    <EvrenKabugu istemci={istemci} evren={evren} etkin="yaz" acik={kod}>
      {kod ? <YazmaAlani istemci={istemci} evren={evren} kod={kod} /> : <YaziMasasi istemci={istemci} evren={evren} />}
    </EvrenKabugu>
  );
}

function YazmaAlani({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const [kayit, setKayit] = useState<Kayit | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [surum, setSurum] = useState(0);
  const [bag, setBag] = useState<EvrenBilgisi['bag']>(null);
  const [baglamKapali, setBaglamKapali] = useState(() => okuYerel(baglamAnahtari) === '1');
  const denetim = useRef<EditorDenetimi | null>(null);
  const calisma = useCalisma();
  const [baslangic] = useState(() => calisma?.konumAl(kod) ?? null);
  const [imlecParcasi, setImlecParcasi] = useState<string | null>(null);

  useEffect(() => { istemci.iste('kayit', { evren, kod }).then((k) => { setKayit(k); setHata(null); }, (e) => setHata(e.message)); }, [evren, kod, surum]);
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then((b) => setBag(b.bag ?? null), () => {}); }, [evren]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren && (d.kayitlar.includes(kod) || !d.kayitlar.length)) setSurum((s) => s + 1); }), [evren, kod]);
  useEffect(() => { if (kayit) document.title = `${kayit.ad} · Dünya Atlası`; return () => { document.title = 'Dünya Atlası'; }; }, [kayit?.ad]);
  const sahne = kayit?.tur === 'sahne';
  const sahneBaglami = useSahneBaglami(istemci, evren, sahne ? kod : null);
  const parcaBaglami = useSahneBaglami(istemci, evren, sahne && imlecParcasi ? kod : null, imlecParcasi);

  if (hata) return <main class="sayfa"><p class="hata">{hata}</p></main>;
  if (!kayit) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;
  const baglamAc = (acik: boolean) => { setBaglamKapali(!acik); yazYerel(baglamAnahtari, acik ? '0' : '1'); };
  const baglamGorunur = sahne && !baglamKapali;
  const saltOkunur = bag?.tur === 'surum';

  return (
    <div class={baglamGorunur ? 'yaz-duzeni' : 'yaz-duzeni baglamsiz'}>
      <main class="yaz-metni">
        <div class="yaz-ust">
          {YAZMA_TURLERI.includes(kayit.tur) && kayit.tur !== 'eser' ? <AnlatiYolu istemci={istemci} evren={evren} kayit={kayit} yazma /> : <span />}
          <span class="bosluk" />
          {sahne && baglamKapali && <button class="dugme sade kucuk" onClick={() => baglamAc(true)}>Bağlamı göster</button>}
          <a class="dugme sade kucuk" href={`#/e/${evren}/k/${kod}`}>Bütün alanlar</a>
          <SayfaYardimi sayfa="yaz" />
          {!kayit.silindi && !saltOkunur && (
            <button class="dugme sade kucuk tehlikeli" title="Çöp kutusundan geri getirilebilir" onClick={async () => { if (!(onayla(`“${kayit.ad}” çöp kutusuna taşınsın mı? Çöp kutusundan geri getirebilirsiniz.`))) return;
              await denetim.current?.kaydet();
              await istemci.iste('kayitSil', { evren, kod });
              git(`/e/${evren}/yaz`);
            }}>Çöp kutusuna taşı</button>
          )}
        </div>
        {kayit.silindi && <p class="uyari">Bu kayıt çöp kutusunda. Geri getirmek için <a href={`#/e/${evren}/k/${kod}`}>kayıt sayfasını</a> açın.</p>}
        <CatismaListesi istemci={istemci} evren={evren} kod={kod} surum={surum} />
        <article class="yaz-kagidi">
          <div class="yaz-baslik">
            <AlanGirdisi etiket="Başlık" deger={kayit.ad} buyuk zorunlu kaydet={(v) => istemci.iste('kayitDegistir', { evren, kod, alan: 'ad', deger: v })} />
          </div>
          <MetinEditoru saltOkunur={saltOkunur} key={kod} istemci={istemci} evren={evren} kayit={kod} denetim={denetim} baslangic={baslangic}
            baglamParcalari={sahne} parcaDegisti={setImlecParcasi} />
          {(kayit.tur === 'eser' || kayit.tur === 'bolum') && <EserYapisiBolumu istemci={istemci} evren={evren} kayit={kayit} />}
        </article>
      </main>
      {baglamGorunur && (
        <aside class="yaz-baglami" aria-label="Sahnenin bağlamı">
          <div class="satir yaz-baglami-basi">
            <strong>Bağlam</strong>
            <span class="bosluk" />
            <button class="dugme sade kucuk" aria-label="Bağlam panelini kapat" onClick={() => baglamAc(false)}>×</button>
          </div>
          <TarihAlani istemci={istemci} evren={evren} kayit={kayit} />
          <SahneAlanlari istemci={istemci} evren={evren} kayit={kayit} baglam={sahneBaglami} />
          <SahneBaglamPaneli evren={evren} baglam={imlecParcasi && parcaBaglami ? parcaBaglami : sahneBaglami} parca={!!(imlecParcasi && parcaBaglami)} />
          <a class="kucuk" href={`#/e/${evren}/k/${kod}`}>Sahnedekiler, süreklilik ve bütün alanlar →</a>
        </aside>
      )}
    </div>
  );
}

/** Yaz seçilip henüz bir parça açılmamışken: kaldığın yer ve eserler. */
function YaziMasasi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const calisma = useCalisma();
  const [kaldigi, setKaldigi] = useState<KaldigiYerBilgisi | null | undefined>(undefined);
  const [eserler, setEserler] = useState<(KisaKayit & { yapi: EserYapisi })[] | null>(null);
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [surum, setSurum] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setSurum((s) => s + 1); }), [evren]);
  useEffect(() => { istemci.iste('kaldigiYer', { evren }).then(setKaldigi, () => setKaldigi(null)); }, [evren]);
  useEffect(() => {
    istemci.iste('eserler', { evren }).then((l) => Promise.all(l.map(async (e) => ({ ...e, yapi: await istemci.iste('eserYapisi', { evren, eser: e.kod }) }))))
      .then(setEserler, () => setEserler([]));
  }, [evren, surum]);
  const olustur = async (e: Event) => {
    e.preventDefault();
    try { const { kod } = await istemci.iste('kayitOlustur', { evren, ad, tur: 'eser' }); setAd(''); git(`/e/${evren}/yaz/${kod}`); }
    catch (x) { setHata((x as Error).message); }
  };
  if (!eserler || kaldigi === undefined) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;
  const sahneSayisi = (y: EserYapisi) => y.dogrudan.length + y.bolumler.reduce((n, b) => n + b.sahneler.length, 0);

  return (
    <main class="sayfa yazi-masasi">
      <div class="baslik-satiri sayfa-basligi"><h1>Yaz</h1><SayfaYardimi sayfa="yaz" /></div>
      {kaldigi?.kayit && kaldigi.kayitAdi && (
        <section class="kart kaldigin-yer">
          <div class="soluk kucuk">Kaldığınız yer · {zamanYaz(kaldigi.zaman)}{kaldigi.cihaz ? ` · ${kaldigi.cihaz} cihazında` : ''}</div>
          <div class="satir">
            <strong class="kaldigin-ad">{kaldigi.kayitAdi}</strong>
            <span class="bosluk" />
            <button class="dugme ana" onClick={() => calisma?.devamEt({ kayit: kaldigi.kayit, konum: kaldigi.konum, yanPanel: kaldigi.yanPanel, tur: kaldigi.kayitTuru })}>Devam et</button>
          </div>
          {kaldigi.not && <p class="soluk kucuk">{kaldigi.not}</p>}
        </section>
      )}
      <h2 class="ara-baslik">Eserler</h2>
      {!eserler.length && <p class="soluk">Henüz bir eseriniz yok. Romanınızın ya da öykünüzün adını yazarak başlayın. Bölümleri ve sahneleri soldaki listeden eklersiniz.</p>}
      <div class="kartlar">
        {eserler.map((e) => (
          <a class="kart eser-karti" key={e.kod} href={`#/e/${evren}/yaz/${e.kod}`}>
            <h3>{e.ad}</h3>
            <div class="soluk kucuk">{e.yapi.bolumler.length} bölüm · {sahneSayisi(e.yapi)} sahne</div>
          </a>
        ))}
      </div>
      <form class="satir yeni-eser" onSubmit={olustur}>
        <input class="girdi" style="flex:1;min-width:220px" lang="tr" aria-label="Yeni eserin adı" placeholder="Yeni eserin adı" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        <button class="dugme ana" type="submit" disabled={!ad.trim()}>Eser oluştur</button>
      </form>
      {hata && <p class="hata">{hata}</p>}
    </main>
  );
}
