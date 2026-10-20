// Yazma düzeni (§5.10, K24): solda gezinti çubuğu ve eser ağacı, ortada metin, sağda dar ve kapatılabilir bağlam
// paneli. Sahnenin bütün alanları kayıt sayfasındadır; buradan bir bağlantıyla açılır.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EserYapisi, EvrenBilgisi, Kayit, KaldigiYerBilgisi, KisaKayit, IlkAdimDayanaklari } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { EvrenKabugu } from './Kabuk';
import { MetinEditoru, type EditorDenetimi } from './MetinEditoru';
import { SahnePlani } from './Sablon';
import { AnlatiYolu, EserYapisiBolumu, SahneAlanlari, SahneBaglamPaneli, sahneBaglamiBos, useSahneBaglami } from './Anlati';
import { TarihAlani } from './KayitBolumleri';
import { AlanGirdisi } from './KayitEkrani';
import { CatismaListesi } from './Catismalar';
import { YAZMA_TURLERI, useCalisma } from './Calisma';
import { git } from './Uygulama';
import { onayla } from './onay';
import { SayfaYardimi } from './SayfaYardimi';
import { yazarlikRehberiAc } from './YazarlikRehberi';

// Bağlam panelinin tercihi üç değerlidir: '1' kapalı, '0' açık, yoksa kullanıcı seçmemiştir. Seçmediyse panel boş
// sahnede kapalı, dolu sahnede açık durur.
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
  const [baglamTercihi, setBaglamTercihi] = useState<boolean | null>(() => { const v = okuYerel(baglamAnahtari); return v === '1' ? true : v === '0' ? false : null; });
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
  const baglamAc = (acik: boolean) => { setBaglamTercihi(!acik); yazYerel(baglamAnahtari, acik ? '0' : '1'); };
  const bos = sahneBaglamiBos(sahneBaglami);
  // Seçilmemişken bağlam okunana kadar panel açılmaz; dolu sahnede okununca açılır.
  const baglamKapali = baglamTercihi ?? (!sahneBaglami || bos);
  const baglamGorunur = sahne && !baglamKapali;
  const saltOkunur = bag?.tur === 'surum';

  return (
    <div class={baglamGorunur ? 'yaz-duzeni' : 'yaz-duzeni baglamsiz'}>
      <main class="yaz-metni">
        <div class="yaz-ust">
          {YAZMA_TURLERI.includes(kayit.tur) && kayit.tur !== 'eser' ? <AnlatiYolu istemci={istemci} evren={evren} kayit={kayit} yazma /> : <span />}
          <span class="bosluk" />
          {sahne && baglamKapali && <button class="dugme sade kucuk" onClick={() => baglamAc(true)}>{bos ? 'Bağlam ekle' : 'Bağlamı göster'}</button>}
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
          <SahnePlani istemci={istemci} evren={evren} kod={kod} />
          <TarihAlani istemci={istemci} evren={evren} kayit={kayit} />
          <SahneAlanlari istemci={istemci} evren={evren} kayit={kayit} baglam={sahneBaglami} />
          <SahneBaglamPaneli evren={evren} baglam={imlecParcasi && parcaBaglami ? parcaBaglami : sahneBaglami} parca={!!(imlecParcasi && parcaBaglami)} bos={bos && !(imlecParcasi && parcaBaglami)} />
          <a class="kucuk" href={`#/e/${evren}/k/${kod}`}>Sahnedekiler, süreklilik ve bütün alanlar →</a>
        </aside>
      )}
    </div>
  );
}

/** "İlk adımlar" (K26, K27): yeni bir evrende başlamanın dört adımı; yol seçimi başlangıç noktasını değiştirir.
 *  Adımın yapıldığı kayıtlı veriden anlaşılır. "Geç" adımı yapılmış saymaz; liste her adım yapıldığında ya da ilgisiz
 *  sayıldığında, ya da "Gizle"ye basılınca görünmez. Yol, geçilen adımlar ve "Gizle" bu cihazda evren başına saklanır. */
type Yol = 'sahne' | 'fikir' | 'karakter' | 'dunya';
interface Adim { kod: string; tamam: (d: IlkAdimDayanaklari) => boolean; metin: preact.ComponentChildren; soru?: string }
const YOLLAR: { kod: Yol; ad: string; konu: number; adimlar: Adim[] }[] = [
  { kod: 'sahne', ad: 'Bir sahneyle', konu: 20, adimlar: [
    { kod: 'eser', tamam: (d) => d.eser, metin: <>Bir eser oluşturun: aşağıya romanınızın ya da öykünüzün adını yazın.</> },
    { kod: 'sahne', tamam: (d) => d.sahne, metin: <>İlk sahnenizi ekleyin: soldaki listede eserin altındaki “+ Sahne”ye basın ve yazmaya başlayın.</> },
    { kod: 'baglanti', tamam: (d) => d.baglanti, metin: <>Metinde bir karakterin ya da yerin adını <strong>[[</strong> ile başlayarak yazın; kaydı yoksa oluşturulur ve metne bağlanır.</> },
    { kod: 'baglam', tamam: (d) => d.baglam, metin: <>Sahneye bir tarih ya da mekân verin: başlıktaki “Bağlam ekle”ye basın. Bağlam paneli o andaki durumu göstermeye başlar.</> },
  ] },
  { kod: 'fikir', ad: 'Bir hikâye fikriyle', konu: 1, adimlar: [
    { kod: 'not', tamam: (d) => d.not, metin: <>Fikrinizi not alın: Alt+N ile hızlı notu açıp aklınızdakini tek cümleyle yazın. Ayrıntı şimdi gerekmiyor.</> },
    { kod: 'nottanEser', tamam: (d) => d.nottanEser, metin: <>Nottan bir eser oluşturun: notun sayfasındaki “Kayda dönüştür” ile türü “Eser” seçin; not yerinde kalır.</> },
    { kod: 'cekirdek', tamam: (d) => d.cekirdek, metin: <>Eserin “Hikâye çekirdeği” sorularından ilkini cevaplayın: kim, ne istiyor?</> },
    { kod: 'sahne', tamam: (d) => d.sahne, metin: <>İlk sahneyi ekleyin ve yazmaya başlayın.</> },
  ] },
  { kod: 'karakter', ad: 'Bir karakterle', konu: 5, adimlar: [
    { kod: 'karakter', tamam: (d) => d.karakter, metin: <>Bir karakter oluşturun: “Kayıtlar” sayfasında ya da Ctrl+K ile adını yazarak.</> },
    { kod: 'istek', tamam: (d) => d.istek, metin: <>Karakterin “En çok ne istiyor?” sorusunu cevaplayın. Somut bir hedef olsun.</> },
    { kod: 'karsit', tamam: (d) => d.karsit, metin: <>Karşıt gücü belirleyin: karakteri bir rakibine ya da düşmanına ilişkiyle bağlayın, ya da “Karşıt karakter” sorularından ilkini cevaplayın.</> },
    { kod: 'karakterSahnede', tamam: (d) => d.karakterSahnede, metin: <>Karakterin bulunduğu ilk sahneyi ekleyin ve onu sahnedekilere “Bulunuyor” olarak ekleyin.</> },
  ] },
  { kod: 'dunya', ad: 'Bir dünyayla', konu: 19, adimlar: [
    { kod: 'kural', tamam: (d) => d.kural, soru: 'pusula.4', metin: <>Dünyanızın kuralını yazın: Genel bakış sayfasındaki Dünya Pusulası’nda “Hangi kural kırılırsa her şey değişir?” ya da bir “Evren kuralı” kaydı.</> },
    { kod: 'guc', tamam: (d) => d.guc, soru: 'pusula.3', metin: <>Güç kimde ve bedeli ne? Dünya Pusulası’nın üçüncü sorusu.</> },
    { kod: 'yer', tamam: (d) => d.yer, metin: <>Bir yer oluşturun: bir mekân, şehir ya da ülke kaydı.</> },
    { kod: 'yerdeIs', tamam: (d) => d.yerdeIs, metin: <>O yerde geçen bir sahne yazın ya da bir notta o yere [[ ile bağlanın.</> },
  ] },
];

function IlkAdimlar({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const anahtar = `dunya-atlasi:ilk-adimlar-gizli:${evren}`;
  const yolAnahtari = `dunya-atlasi:ilk-adimlar-yol:${evren}`;
  const gecAnahtari = `dunya-atlasi:ilk-adimlar-gecilen:${evren}`;
  const [gizli, setGizli] = useState(() => okuYerel(anahtar) === '1');
  const [yol, setYol] = useState<Yol>(() => (YOLLAR.some((y) => y.kod === okuYerel(yolAnahtari)) ? okuYerel(yolAnahtari) as Yol : 'sahne'));
  const [gecilen, setGecilen] = useState<string[]>(() => { try { return JSON.parse(okuYerel(gecAnahtari) ?? '[]'); } catch { return []; } });
  const [d, setD] = useState<IlkAdimDayanaklari | null>(null);
  useEffect(() => { if (!gizli) istemci.iste('ilkAdimlar', { evren }).then(setD, () => {}); }, [evren, surum, gizli]);
  if (gizli || !d) return null;
  const y = YOLLAR.find((x) => x.kod === yol)!;
  const durum = (a: Adim) => a.tamam(d) ? 'tamam' : a.soru && d.sorular[a.soru] === 'ilgisiz' ? 'ilgisiz'
    : gecilen.includes(`${yol}.${a.kod}`) || (a.soru && d.sorular[a.soru] === 'sonra') ? 'gecildi' : 'baslanmadi';
  const adimlar = y.adimlar.map((a) => ({ a, durum: durum(a) })).filter((x) => x.durum !== 'ilgisiz');
  if (adimlar.every((x) => x.durum === 'tamam')) return null;
  const yapilan = adimlar.filter((x) => x.durum === 'tamam').length;
  const sira = adimlar.findIndex((x) => x.durum === 'baslanmadi');
  const gec = (a: Adim) => {
    if (a.soru) { istemci.iste('soruCevapla', { evren, kod: 'evren', soru: a.soru, durum: 'sonra' }).catch(() => {}); return; }
    const l = [...gecilen, `${yol}.${a.kod}`]; setGecilen(l); yazYerel(gecAnahtari, JSON.stringify(l));
  };
  return (
    <section class="kart ilk-adimlar" aria-label="İlk adımlar">
      <div class="satir">
        <strong>İlk adımlar</strong><span class="bosluk" />
        <span class="soluk kucuk">{yapilan} / {adimlar.length} tamam</span>
        <button class="dugme sade kucuk" onClick={() => { setGizli(true); yazYerel(anahtar, '1'); }}>Gizle</button>
      </div>
      <fieldset class="ilk-adim-yollari">
        <legend class="soluk kucuk">Nasıl başlamak istersiniz?</legend>
        {YOLLAR.map((x) => (
          <label key={x.kod}><input type="radio" name={`ilk-adim-yolu-${evren}`} checked={yol === x.kod} onChange={() => { setYol(x.kod); yazYerel(yolAnahtari, x.kod); }} /> {x.ad}</label>
        ))}
      </fieldset>
      <ol>
        {adimlar.map(({ a, durum: dr }, i) => (
          <li key={a.kod} class={dr === 'tamam' ? 'tamam' : dr === 'gecildi' ? 'gecildi' : i === sira ? 'sirada' : 'soluk'}>
            {a.metin}{dr === 'tamam' && <span aria-label="tamam"> ✓</span>}
            {dr === 'gecildi' && <span class="soluk kucuk"> · Geçildi</span>}
            {dr === 'baslanmadi' && <> <button class="dugme sade kucuk" onClick={() => gec(a)}>Geç</button></>}
          </li>
        ))}
      </ol>
      <button class="dugme sade kucuk" onClick={() => yazarlikRehberiAc(y.konu)}>Bu adımlar neden?</button>
    </section>
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
      <IlkAdimlar istemci={istemci} evren={evren} surum={surum} />
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
