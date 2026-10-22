// Yazma düzeni (§5.10, K24): solda gezinti çubuğu ve eser ağacı, ortada metin, sağda dar ve kapatılabilir bağlam
// paneli (sekmeler: Bağlam · Plan · Süreklilik · Bilgi). Metnin üstünde tek ince satır; seyrek işler "Sahne ⋯"
// menüsünde. Sahnenin bütün alanları kayıt sayfasındadır; buradan bir bağlantıyla açılır.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { BosSayfa, odakla } from './ortak';
import type { Istemci } from '../veri/istemci';
import type { EserYapisi, EvrenBilgisi, Kayit, KaldigiYerBilgisi, KisaKayit, SahneBaglami, SahneOlayBilgisi } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { EvrenKabugu } from './Kabuk';
import { MetinEditoru, type EditorDenetimi } from './MetinEditoru';
import { SahnePlani } from './Sablon';
import { AnlatiYolu, EserYapisiBolumu, SahneAlanlari, SahneBaglamPaneli, SahneBilgileri, sahneBaglamiBos, useSahneBaglami } from './Anlati';
import { SureklilikDefteri } from './Sureklilik';
import { TarihAlani } from './KayitBolumleri';
import { AlanGirdisi } from './KayitEkrani';
import { CatismaListesi } from './Catismalar';
import { YAZMA_TURLERI, useCalisma } from './Calisma';
import { git } from './Uygulama';
import { geriAlinabilir } from './onay';
import { SayfaYardimi } from './SayfaYardimi';
import { IlkAdimlar } from './IlkAdimlar';
import { gitVeYap, YENI_SAHNE_OLAYI } from './yonlendirme';
import { soruSetiBul } from '../alan/sablon';
import { ODAK_OLAYI } from './kisayollar';

const PLAN_SORULARI = (soruSetiBul('sahne_plani')?.sorular ?? []).slice(0, 3).map((q) => q.metin);

// Bağlam panelinin tercihi üç değerlidir: '1' kapalı, '0' açık, yoksa kullanıcı seçmemiştir. Seçmediyse panel boş
// sahnede kapalı, dolu sahnede açık durur.
const baglamAnahtari = 'dunya-atlasi:yazma-baglami-kapali';
const odakAnahtari = 'dunya-atlasi:odak-kipi';
/** Odak kipi (K28, §5.10): gezinti, eser ağacı, bağlam paneli ve sıradaki adım gizlenir; tercih cihazda. */
function useOdakKipi(): [boolean, (v: boolean) => void] {
  const [acik, setAcik] = useState(() => okuYerel(odakAnahtari) === '1');
  const ayarla = (v: boolean) => { setAcik(v); yazYerel(odakAnahtari, v ? '1' : '0'); };
  const ref = useRef(acik); ref.current = acik;
  useEffect(() => {
    const olay = (e: Event) => { const d = (e as CustomEvent<boolean | null>).detail; ayarla(d ?? !ref.current); };
    const tus = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); ayarla(!ref.current); }
      else if (e.key === 'Escape' && ref.current && !document.querySelector('.perde, [role="dialog"], .secici')) ayarla(false);
    };
    addEventListener(ODAK_OLAYI, olay); addEventListener('keydown', tus);
    return () => { removeEventListener(ODAK_OLAYI, olay); removeEventListener('keydown', tus); };
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('odak-kipi', acik); return () => document.documentElement.classList.remove('odak-kipi'); }, [acik]);
  return [acik, ayarla];
}

/** Sessiz kelime sayacı (K28): "bugün" bu cihazda, gün başındaki sayıya göre; eşitlenmez. */
function bugunEklenen(evren: string, kod: string, n: number): number {
  const g = new Date(); const gun = `${g.getFullYear()}-${g.getMonth() + 1}-${g.getDate()}`;
  const a = `dunya-atlasi:gunluk-kelime:${evren}:${kod}`;
  let kayit: { gun: string; ilk: number } | null = null;
  try { kayit = JSON.parse(okuYerel(a) ?? 'null'); } catch { kayit = null; }
  if (!kayit || kayit.gun !== gun) { kayit = { gun, ilk: n }; yazYerel(a, JSON.stringify(kayit)); }
  return n - kayit.ilk;
}
const sayiYaz = (n: number) => n.toLocaleString('tr-TR');

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
  const [baglamTercihi, setBaglamTercihi] = useState<boolean | null>(() => { const v = okuYerel(baglamAnahtari); return v === '1' ? true : v === '0' ? false : null; });
  const denetim = useRef<EditorDenetimi | null>(null);
  const calisma = useCalisma();
  const [baslangic] = useState(() => calisma?.konumAl(kod) ?? null);
  const [imlecParcasi, setImlecParcasi] = useState<string | null>(null);
  const [kelime, setKelime] = useState<number | null>(null);
  const [odak, setOdak] = useOdakKipi();
  const [onceki, setOnceki] = useState<string>('');
  const [sekme, setSekme] = useBaglamSekmesi();
  useEffect(() => { setKelime(null); }, [kod]);

  useEffect(() => { istemci.iste('kayit', { evren, kod }).then((k) => { setKayit(k); setHata(null); }, (e) => setHata(e.message)); }, [evren, kod, surum]);
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then((b) => setBag(b.bag ?? null), () => {}); }, [evren]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren && (d.kayitlar.includes(kod) || !d.kayitlar.length)) setSurum((s) => s + 1); }), [evren, kod]);
  useEffect(() => { if (kayit) document.title = `${kayit.ad} · Dünya Atlası`; return () => { document.title = 'Dünya Atlası'; }; }, [kayit?.ad]);
  const sahne = kayit?.tur === 'sahne';
  useEffect(() => {
    setOnceki('');
    if (!sahne) return;
    istemci.iste('anlatiYeri', { evren, kod }).then((y) => y.onceki ? istemci.iste('sonParagraf', { evren, kod: y.onceki.kod }) : '').then(setOnceki, () => {});
  }, [evren, kod, sahne]);
  const sahneBaglami = useSahneBaglami(istemci, evren, sahne ? kod : null);
  const parcaBaglami = useSahneBaglami(istemci, evren, sahne && imlecParcasi ? kod : null, imlecParcasi);

  // Panel yalnız yazar açınca kayarak gelir; sahne değişince yerinde durur.
  const [baglamKaysin, setBaglamKaysin] = useState(false);

  if (hata) return <main class="sayfa"><p class="hata">{hata}</p></main>;
  if (!kayit) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;
  const baglamAc = (acik: boolean) => { setBaglamKaysin(acik); setBaglamTercihi(!acik); yazYerel(baglamAnahtari, acik ? '0' : '1'); };
  const bos = sahneBaglamiBos(sahneBaglami);
  // Seçilmemişken bağlam okunana kadar panel açılmaz; dolu sahnede okununca açılır.
  const baglamKapali = baglamTercihi ?? (!sahneBaglami || bos);
  const baglamGorunur = sahne && !baglamKapali && !odak;
  const bugun = kelime !== null ? bugunEklenen(evren, kod, kelime) : 0;
  const planAc = () => { baglamAc(true); setOdak(false); setSekme('plan'); void gitVeYap(null, [{ odak: '.sahne-plani textarea' }]); };
  const bosYardim = sahne ? (
    <>
      {onceki && <p class="bos-yardim-onceki">Önceki sahne şöyle bitti: “{onceki}”</p>}
      <ul class="bos-yardim-sorular">{PLAN_SORULARI.map((q) => <li key={q}><a href="#" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); planAc(); }}>{q}</a></li>)}</ul>
      <p class="kucuk">Sorulara tıklayınca sahne planı açılır. Yazmaya başlayınca bu yazı kaybolur.</p>
    </>
  ) : undefined;
  const saltOkunur = bag?.tur === 'surum';
  const parcaVar = !!(imlecParcasi && parcaBaglami);
  const gosterilenBaglam = parcaVar ? parcaBaglami : sahneBaglami;

  return (
    <div class={baglamGorunur ? 'yaz-duzeni' : 'yaz-duzeni baglamsiz'}>
      <main class="yaz-metni">
        <div class="yaz-ust">
          {YAZMA_TURLERI.includes(kayit.tur) && kayit.tur !== 'eser' ? <AnlatiYolu istemci={istemci} evren={evren} kayit={kayit} yazma /> : <span />}
          <span class="bosluk" />
          {kelime !== null && <span class="kelime-sayaci" aria-live="off">{sahne ? 'Bu sahne ' : ''}{sayiYaz(kelime)} kelime{bugun ? ` · bugün ${bugun > 0 ? '+' : '−'}${sayiYaz(Math.abs(bugun))}` : ''}</span>}
          <button class={odak ? 'dugme kucuk odak-dugmesi secili' : 'dugme sade kucuk odak-dugmesi'} aria-pressed={odak} title="Odak kipi (Ctrl+Shift+F); çıkmak için Esc" onClick={() => setOdak(!odak)}>{odak ? 'Odaktan çık' : 'Odak'}</button>
          {sahne && baglamKapali && !odak && <button class="dugme sade kucuk" onClick={() => baglamAc(true)}>{bos ? 'Bağlam ekle' : 'Bağlamı göster'}</button>}
          <SayfaYardimi sayfa="yaz" />
          <IslemMenusu ad={TUR_ADI[kayit.tur] ?? 'Kayıt'}>
            <a class="menu-ogesi" href={`#/e/${evren}/k/${kod}`}>Bütün alanlar</a>
            {!kayit.silindi && !saltOkunur && (
              <button class="menu-ogesi tehlikeli" title="Çöp kutusundan geri getirilebilir" onClick={async () => {
                await denetim.current?.kaydet();
                await geriAlinabilir(`“${kayit.ad}” çöp kutusuna taşındı.`, () => istemci.iste('kayitSil', { evren, kod }), () => istemci.iste('kayitGeriYukle', { evren, kod }).then(() => git(`/e/${evren}/yaz/${kod}`)));
                git(`/e/${evren}/yaz`);
              }}>Çöp kutusuna taşı</button>
            )}
          </IslemMenusu>
        </div>
        {kayit.silindi && <p class="uyari">Bu kayıt çöp kutusunda. Geri getirmek için <a href={`#/e/${evren}/k/${kod}`}>kayıt sayfasını</a> açın.</p>}
        <CatismaListesi istemci={istemci} evren={evren} kod={kod} surum={surum} />
        <article class="yaz-kagidi">
          <div class="yaz-baslik">
            <AlanGirdisi etiket="Başlık" deger={kayit.ad} buyuk zorunlu kaydet={(v) => istemci.iste('kayitDegistir', { evren, kod, alan: 'ad', deger: v })} />
          </div>
          <MetinEditoru saltOkunur={saltOkunur} key={kod} istemci={istemci} evren={evren} kayit={kod} denetim={denetim} baslangic={baslangic}
            baglamParcalari={sahne} parcaDegisti={setImlecParcasi} kelimeDegisti={setKelime} bosYardim={bosYardim} />
          {(kayit.tur === 'eser' || kayit.tur === 'bolum') && <EserYapisiBolumu istemci={istemci} evren={evren} kayit={kayit} />}
        </article>
      </main>
      {baglamGorunur && (
        <aside class={baglamKaysin ? 'yaz-baglami kayarak' : 'yaz-baglami'} aria-label="Sahnenin bağlamı">
          <div class="yaz-baglami-basi">
            <div class="sekmeler baglam-sekmeleri" role="tablist" aria-label="Bağlam paneli">
              {BAGLAM_SEKMELERI.map(([k, ad]) => (
                <button key={k} class="sekme" role="tab" id={`baglam-sekme-${k}`} aria-selected={sekme === k} aria-controls="baglam-sekme-icerik" onClick={() => setSekme(k)}>{ad}</button>
              ))}
            </div>
            <button class="dugme sade kucuk" aria-label="Bağlam panelini kapat" onClick={() => baglamAc(false)}>×</button>
          </div>
          <div key={sekme} id="baglam-sekme-icerik" role="tabpanel" aria-labelledby={`baglam-sekme-${sekme}`} class="baglam-sekme-icerik">
            {sekme === 'baglam' && <>
              <SahneOzeti istemci={istemci} evren={evren} kayit={kayit} baglam={sahneBaglami} bos={bos} />
              <SahneBaglamPaneli evren={evren} baglam={gosterilenBaglam} parca={parcaVar} bos={bos && !parcaVar} bilgisiz />
            </>}
            {sekme === 'plan' && <SahnePlani istemci={istemci} evren={evren} kod={kod} acik bosMetin="Bu sahnenin şablonunda plan soruları yok." />}
            {sekme === 'sureklilik' && <SahneSurekliligi istemci={istemci} evren={evren} kod={kod} surum={surum} />}
            {sekme === 'bilgi' && (gosterilenBaglam ? <SahneBilgileri evren={evren} baglam={gosterilenBaglam} /> : <p class="soluk kucuk">Açılıyor…</p>)}
          </div>
          <a class="kucuk" href={`#/e/${evren}/k/${kod}`}>Sahnedekiler, süreklilik ve bütün alanlar →</a>
        </aside>
      )}
    </div>
  );
}

const TUR_ADI: Record<string, string> = { sahne: 'Sahne', bolum: 'Bölüm', eser: 'Eser', seri: 'Seri' };

/** Yazma ekranındaki seyrek işler (bütün alanlar, çöp kutusu) başlıkta değil bu menüde durur. */
function IslemMenusu({ ad, children }: { ad: string; children: preact.ComponentChildren }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useLayoutEffect(() => {
    const kapat = (e: Event) => { const d = ref.current; if (d?.open && !d.contains(e.target as Node)) d.open = false; };
    const tus = (e: KeyboardEvent) => { const d = ref.current; if (e.key === 'Escape' && d?.open) { d.open = false; d.querySelector('summary')?.focus(); } };
    addEventListener('pointerdown', kapat); addEventListener('keydown', tus);
    return () => { removeEventListener('pointerdown', kapat); removeEventListener('keydown', tus); };
  }, []);
  return (
    <details class="islem-menusu" ref={ref}>
      <summary class="dugme sade kucuk" aria-label={`${ad} işlemleri`}>{ad} ⋯</summary>
      <div class="menu-icerik" onClick={() => { if (ref.current) ref.current.open = false; }}>{children}</div>
    </details>
  );
}

const BAGLAM_SEKMELERI = [['baglam', 'Bağlam'], ['plan', 'Plan'], ['sureklilik', 'Süreklilik'], ['bilgi', 'Bilgi']] as const;
type BaglamSekmesi = typeof BAGLAM_SEKMELERI[number][0];
const sekmeAnahtari = 'dunya-atlasi:yazma-baglam-sekmesi';
/** Bağlam panelinde seçili sekme cihazda hatırlanır. */
function useBaglamSekmesi(): [BaglamSekmesi, (s: BaglamSekmesi) => void] {
  const [sekme, setSekme] = useState<BaglamSekmesi>(() => {
    const v = okuYerel(sekmeAnahtari);
    return BAGLAM_SEKMELERI.some(([k]) => k === v) ? v as BaglamSekmesi : 'baglam';
  });
  return [sekme, (s) => { setSekme(s); yazYerel(sekmeAnahtari, s); }];
}

/** Sahnenin tarihi, mekânı, bakış açısı ve sahnedekiler okunacak bir kartta; kutular yalnız "Düzenle" ile açılır.
 *  Boş sahnede kutular açık gelir. */
function SahneOzeti({ istemci, evren, kayit, baglam, bos }: { istemci: Istemci; evren: string; kayit: Kayit; baglam: SahneBaglami | null; bos: boolean }) {
  const [duzenle, setDuzenle] = useState(false);
  useEffect(() => { setDuzenle(false); }, [kayit.kod]);
  const acik = duzenle || bos || !baglam;
  const bag = (k: { kod: string; ad: string } | null) => k ? <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a> : <span class="soluk">yok</span>;
  const tarih = baglam?.tarih?.ifade ?? null;
  const satirlar: [string, preact.ComponentChildren][] = [
    ['Ne zaman', tarih ?? <span class="soluk">tarih yok</span>],
    ['Nerede', bag(baglam?.yer ?? null)],
    ['Kimin gözünden', bag(baglam?.bakis ?? null)],
  ];
  if (baglam?.anlatici) satirlar.push(['Anlatıcı', bag(baglam.anlatici)]);
  if (baglam?.odak) satirlar.push(['Odak karakter', bag(baglam.odak)]);
  if (baglam?.katilimcilar.length) satirlar.push(['Sahnede', baglam.katilimcilar.map((k, i) => <span key={k.kod}>{i ? ', ' : ''}{bag(k)}</span>)]);
  return (
    <section class="sahne-ozeti" aria-label="Bu sahne">
      <div class="satir">
        <span class="etiket">Bu sahne</span>
        <span class="bosluk" />
        {!bos && baglam && <button class="dugme sade kucuk" aria-expanded={acik} onClick={() => setDuzenle(!duzenle)}>{duzenle ? 'Bitti' : 'Düzenle'}</button>}
      </div>
      {acik ? <div class="sahne-ozeti-duzen">
        <TarihAlani istemci={istemci} evren={evren} kayit={kayit} />
        <SahneAlanlari istemci={istemci} evren={evren} kayit={kayit} baglam={baglam} />
        <a class="kucuk" href={`#/e/${evren}/k/${kayit.kod}`}>Sahnedekileri ekle →</a>
      </div> : (
        <dl class="sahne-ozeti-liste">
          {satirlar.map(([ad, deger]) => <div key={ad}><dt>{ad}</dt><dd>{deger}</dd></div>)}
        </dl>
      )}
    </section>
  );
}

/** Süreklilik sekmesi: sahnenin süreklilik defteri (§5.6). */
function SahneSurekliligi({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [olaylar, setOlaylar] = useState<SahneOlayBilgisi[] | null>(null);
  useEffect(() => { istemci.iste('sahneOlaylari', { evren, sahne: kod }).then(setOlaylar, () => setOlaylar([])); }, [evren, kod, surum]);
  if (!olaylar) return <p class="soluk kucuk">Açılıyor…</p>;
  return <SureklilikDefteri istemci={istemci} evren={evren} sahne={kod} olaylar={olaylar} surum={surum} />;
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
    try {
      const { kod } = await istemci.iste('kayitOlustur', { evren, ad, tur: 'eser' }); setAd(''); git(`/e/${evren}/yaz/${kod}`);
      // Yeni eserin ardından ilk sahnenin adı sorulur (K26).
      void gitVeYap(null, [{ bekle: `.eser-agaci a[href$="/yaz/${kod}"]`, olay: YENI_SAHNE_OLAYI, detay: kod }]);
    }
    catch (x) { setHata((x as Error).message); }
  };
  if (!eserler || kaldigi === undefined) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;
  const sahneSayisi = (y: EserYapisi) => y.dogrudan.length + y.bolumler.reduce((n, b) => n + b.sahneler.length, 0);

  return (
    <main class="sayfa yazi-masasi">
      <div class="baslik-satiri sayfa-basligi"><h1>Yaz</h1><SayfaYardimi sayfa="yaz" /></div>
      <IlkAdimlar istemci={istemci} evren={evren} />
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
      {!eserler.length && <BosSayfa baslik="İlk eserinizi ekleyin" eylem={{ ad: 'Eser ekle', yap: () => odakla('input[aria-label="Yeni eserin adı"]') }} konu={23}>
        Romanınızın ya da öykünüzün adını aşağıya yazarak başlayın. Bölümleri ve sahneleri soldaki listeden eklersiniz.
      </BosSayfa>}
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
