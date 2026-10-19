// Bir kaydın sayfası: adı, türü, karar durumu, kısa özet, okunuş, lakaplar ve etiketler, serbest metin,
// sürüm geçmişi (§10.8) ve çöp kutusuna taşıma.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AdDuzeltmesi, EvrenBilgisi, BaglananKayit, DegisebilirAlan, GunlukSatiri, Kayit, Spans } from '../veri/api';
import { sesBilgisi } from '../alan/turkce-ek';
import { KARARLAR, turBul } from '../alan/turler';
import { gizliAdimMi, islemAciklamasi, zamanYaz } from '../alan/islem-metni';
import { MetinEditoru, MetinGorunumu, type EditorDenetimi } from './MetinEditoru';
import { KararSecici, TurSecici } from './ortak';
import { Gorseller, Iliskiler, KayitDegisimleri, NotDonustur, SahneBolumu, TarihAlani } from './KayitBolumleri';
import { KayitIzleri } from './Sureklilik';
import { KayitMasalari } from './Masalar';
import { AltBirimlerdenToplananlar } from './Kapsama';
import { HUKUK_SAHIPLERI, HukukKurallariBolumu, UygulananKurallarAraci } from './Hukuk';
import { AdBicimleriBolumu, DilBolumu, KisiDilleriBolumu } from './Dil';
import { MotifBolumu, TEKNOLOJI_YERLERI, TeknolojiBolumu, TeknolojiDurumuAraci } from './Teknoloji';
import { KalitimBolumu, VerasetBolumu } from './Soy';
import { GUNDELIK_YERLERI, GundelikBolumu } from './Gundelik';
import { BagSeridi, YayimBolumu } from './Surumler';
import { SayfaYardimi } from './Rehber';
import { EserCiktisi } from './Cikti';
import { BelgeSunumBolumu } from './Belge';
import { EserSozlesmesiBolumu, SozlesmeHatirlatmasiSatiri } from './AnlatiSozlesmesi';
import { HaklarBolumu } from './Haklar';
import { IsaretlerBolumu } from './Isaretler';
import { BaglamKarsilastirmaBolumu } from './Baglam';
import { SonrakiSoruBolumu } from './SonrakiSoru';
import { SahneYerlesimi } from './SahneYerlesimi';
import { KurguMontajiBolumu, SahneNiyetleriBolumu } from './Montaj';
import { HaberYayilimiBolumu, KanalBolumu, ROTA_ARACI_TURLERI, RotaAraci } from './Haber';
import { KESINTI_TURLERI, KesintiBolumu, UretimOzetiBolumu } from './Uretim';
import { MakamYurutenleri, OlaySurecBolumu, SUREC_SAHIPLERI, SurecKurallariBolumu } from './Surec';
import { git } from './Uygulama';
import { CatismaListesi } from './Catismalar';
import { YAZMA_TURLERI, useCalisma } from './Calisma';
import { EvrenKabugu } from './Kabuk';
import { KayitHaritaBolumu } from './Harita';
import { RotaBolumu, YolculukBolumu } from './Yol';
import { DelilBolumu } from './Delil';
import { KullanimMasasiBolumu } from './KullanimMasasi';
import { KULLANIM_SAHIPLERI } from '../alan/kullanim-masasi';
import { BakimBolumu, BakimUzmanligiBolumu } from './Bakim';
import { BirlesmeBilgisi, BirlestirDugmesi } from './Birlesme';
import { KayitMeseleleri, SablonAlanlari, SoruBolumu, useKayitSablonu } from './Sablon';
import { BilinenlerBolumu, GorunurlukAlani, GorunurlukRozeti } from './Bilgiler';
import { AnlatiYolu, DurumGecmisi, EserYapisiBolumu, SahneAlanlari, SahneBaglamPaneli, useSahneBaglami } from './Anlati';
import { UyarlamaBolumu } from './Uyarlama';
import { KimlikBolumu } from './Kimlik';
import { KullanildigiYerler } from './MetinKullanim';
import { DonusumBolumu } from './Donusum';
import { KalabalikBolumu } from './Kalabalik';
import { KaliciIzBolumu } from './KaliciIz';
import { onayla } from './onay';

/** Durum geçmişi tutulmayan türler (anlatı parçaları ve notlar). */
const DURUMSUZ = new Set(['sahne', 'bolum', 'eser', 'not']);
/** Kayıt sayfasında az kullanılan bölümler katlanır (§5.10); açık olup olmadığı bu cihaza özeldir. */
const DIGER_ANAHTARI = 'dunya-atlasi:kayit-diger-bolumler';

export function KayitEkrani({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const [kayit, setKayit] = useState<Kayit | null>(null);
  const [evrenAdi, setEvrenAdi] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [surum, setSurum] = useState(0);
  const [editorAnahtari, setEditorAnahtari] = useState(0);
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const denetim = useRef<EditorDenetimi | null>(null);
  const [duzeltme, setDuzeltme] = useState<{ eskiAd: string; yeniAd: string; eskiOkunus: string; liste: AdDuzeltmesi[] } | null>(null);
  const calisma = useCalisma();
  const [baslangic] = useState(() => calisma?.konumAl(kod) ?? null);
  const [digerAcik, setDigerAcik] = useState(() => { try { return localStorage.getItem(DIGER_ANAHTARI) === '1'; } catch { return false; } });
  const digerAc = (v: boolean) => { setDigerAcik(v); try { localStorage.setItem(DIGER_ANAHTARI, v ? '1' : '0'); } catch { /* yok */ } };

  useEffect(() => { istemci.iste('kayit', { evren, kod }).then((k) => { setKayit(k); setHata(null); }, (e) => setHata(e.message)); }, [evren, kod, surum]);
  const [bag, setBag] = useState<EvrenBilgisi['bag']>(null);
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then((b) => { setEvrenAdi(b.ad); setBag(b.bag ?? null); }, () => {}); }, [evren]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren && (d.kayitlar.includes(kod) || !d.kayitlar.length)) setSurum((s) => s + 1); }), [evren, kod]);
  useEffect(() => { if (kayit) document.title = `${kayit.ad} · Dünya Atlası`; return () => { document.title = 'Dünya Atlası'; }; }, [kayit?.ad]);

  const sahneBaglami = useSahneBaglami(istemci, evren, kayit?.tur === 'sahne' ? kod : null);
  const [imlecParcasi, setImlecParcasi] = useState<string | null>(null);
  useEffect(() => setImlecParcasi(null), [kod]);
  const parcaBaglami = useSahneBaglami(istemci, evren, kayit?.tur === 'sahne' && imlecParcasi ? kod : null, imlecParcasi);
  const ks = useKayitSablonu(istemci, evren, kod);

  if (hata) return <main class="sayfa"><p class="hata">{hata}</p><a href={`#/e/${evren}`}>Kayıtlara dön</a></main>;
  if (!kayit) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;

  const degistir = (alan: DegisebilirAlan, deger: string) => istemci.iste('kayitDegistir', { evren, kod, alan, deger });
  const tur = turBul(kayit.tur);

  return (
    <EvrenKabugu istemci={istemci} evren={evren} etkin={YAZMA_TURLERI.includes(kayit.tur) ? 'yaz' : 'kayitlar'} acik={kod}>
      <main class="sayfa kayit-sayfasi">
        <div class="satir kayit-ust">
          <a class="dugme sade kucuk" href={`#/e/${evren}/kayitlar`}>← {evrenAdi ? `${evrenAdi} · Kayıtlar` : 'Kayıtlar'}</a>
          <span class="bosluk" />
          {YAZMA_TURLERI.includes(kayit.tur) && <a class="dugme ana kucuk" href={`#/e/${evren}/yaz/${kod}`}>Yazma ekranında aç</a>}
          <button class="dugme sade kucuk" aria-expanded={gecmisAcik} onClick={() => setGecmisAcik(!gecmisAcik)}>Sürüm geçmişi</button>
          <SayfaYardimi sayfa="kayit" />
        </div>
        <BagSeridi bag={bag} />
        <BirlesmeBilgisi istemci={istemci} evren={evren} kayit={kayit} />
        {kayit.silindi && !kayit.birlesti && (
          <div class="uyari satir" style="margin-bottom:16px">
            <span style="flex:1">Bu kayıt {zamanYaz(kayit.silindi)} tarihinde çöp kutusuna taşındı.</span>
            <button class="dugme ana" onClick={() => istemci.iste('kayitGeriYukle', { evren, kod })}>Geri getir</button>
          </div>
        )}
        <CatismaListesi istemci={istemci} evren={evren} kod={kod} surum={surum} />
        {(kayit.tur === 'sahne' || kayit.tur === 'bolum') && <AnlatiYolu istemci={istemci} evren={evren} kayit={kayit} />}
        <div class="kayit-basi">
          <span class="tur-rozeti" title={tur.ad} aria-hidden="true">{tur.kisa}</span>
          <GorunurlukRozeti g={kayit.gorunurluk} />
          <AlanGirdisi etiket="Ad" deger={kayit.ad} buyuk zorunlu kaydet={async (v) => {
            const eskiAd = kayit.ad, eskiOkunus = kayit.okunus;
            await degistir('ad', v);
            const yeniAd = v.trim().replace(/\s+/g, ' ');
            const liste = await istemci.iste('adDuzeltmeOnizle', { evren, kod, eskiAd, yeniAd, eskiOkunus });
            setDuzeltme(liste.length ? { eskiAd, yeniAd, eskiOkunus, liste } : null);
          }} />
        </div>
        {duzeltme && (
          <AdDuzeltmePaneli duzeltme={duzeltme} okunusVar={!!kayit.okunus} kapat={() => setDuzeltme(null)}
            uygula={async (secilenler) => {
              await denetim.current?.kaydet();
              await istemci.iste('adDuzeltmeUygula', { evren, kod, eskiAd: duzeltme.eskiAd, yeniAd: duzeltme.yeniAd, eskiOkunus: duzeltme.eskiOkunus, secilenler });
              if (duzeltme.liste.some((x) => x.kaynak === kod)) setEditorAnahtari((n) => n + 1);
              setDuzeltme(null);
            }} />
        )}
        <div class="alanlar">
          <label class="alan">
            <span class="alan-adi">Tür</span>
            <TurSecici deger={kayit.tur} onDegis={(v) => degistir('tur', v)} />
          </label>
          <label class="alan">
            <span class="alan-adi">Karar durumu</span>
            <select class="girdi" value={kayit.karar} onChange={(e) => degistir('karar', (e.target as HTMLSelectElement).value)}>
              {KARARLAR.map((k) => <option value={k.kod}>{k.ad}</option>)}
            </select>
          </label>
          <TarihAlani istemci={istemci} evren={evren} kayit={kayit} />
          {kayit.tur === 'sahne' && <SahneAlanlari istemci={istemci} evren={evren} kayit={kayit} baglam={sahneBaglami} />}
          <SablonAlanlari istemci={istemci} evren={evren} kayit={kayit} ks={ks} />
          <div class="alan genis">
            <span class="alan-adi satir">Kısa özet <KararSecici etiket="Kısa özet" karar={kayit.alanKararlari.ozet ?? 'kesin'} onDegis={(k) => istemci.iste('alanKarari', { evren, kod, alan: 'ozet', karar: k })} /></span>
            <AlanGirdisi etiket="Kısa özet" deger={kayit.ozet} kaydet={(v) => degistir('ozet', v)} ipucu="Kim ya da ne olduğu, tek satırda" />
          </div>
        </div>
        <details class="katlanir">
          <summary>Okunuş, başka adlar ve etiketler{kayit.lakaplar.length + kayit.etiketler.length ? ` (${kayit.lakaplar.length + kayit.etiketler.length})` : ''}</summary>
          <div class="alanlar">
          <div class="alan">
            <span class="alan-adi satir">Okunuş <KararSecici etiket="Okunuş" karar={kayit.alanKararlari.okunus ?? 'kesin'} onDegis={(k) => istemci.iste('alanKarari', { evren, kod, alan: 'okunus', karar: k })} /></span>
            <AlanGirdisi etiket="Okunuş" deger={kayit.okunus} kaydet={(v) => degistir('okunus', v)} ipucu="Örn. Jean → Jan" />
          </div>
          <div class="alan genis">
            <span class="alan-adi">Lakaplar ve başka adlar</span>
            <Liste ogeler={kayit.lakaplar} ekleEtiketi="Lakap ekle" ekle={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'lakap', ekle: v })}
              cikar={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'lakap', cikar: v })} />
          </div>
          <div class="alan genis">
            <span class="alan-adi">Etiketler</span>
            <Liste ogeler={kayit.etiketler} ekleEtiketi="Etiket ekle" ekle={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'etiket', ekle: v })}
              cikar={(v) => istemci.iste('kayitListe', { evren, kod, liste: 'etiket', cikar: v })} />
          </div>
          <GorunurlukAlani istemci={istemci} evren={evren} kod={kod} nesne="kayit" deger={kayit.gorunurluk} />
          {kayit.oncekiAdlar.length > 0 && (
            <p class="soluk kucuk genis">Önceki adları (aramada bunlarla da bulunur): {kayit.oncekiAdlar.join(', ')}</p>
          )}
          </div>
        </details>

        <Gorseller istemci={istemci} evren={evren} kayit={kayit} />
        <KayitHaritaBolumu istemci={istemci} evren={evren} kayit={kayit} />
        {kayit.tur === 'rota' && <RotaBolumu istemci={istemci} evren={evren} kayit={kayit} />}
        {ROTA_ARACI_TURLERI.includes(kayit.tur) && <RotaAraci istemci={istemci} evren={evren} kod={kod} ad={kayit.ad} />}
        {kayit.tur === 'haberlesme' && <KanalBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
        {kayit.tur === 'haber' && <HaberYayilimiBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
        {kayit.tur === 'yolculuk' && <YolculukBolumu istemci={istemci} evren={evren} kayit={kayit} />}

        <MetinEditoru saltOkunur={bag?.tur === 'surum'} key={editorAnahtari} istemci={istemci} evren={evren} kayit={kod} denetim={denetim} baslangic={editorAnahtari === 0 ? baslangic : null}
          baglamParcalari={kayit.tur === 'sahne'} parcaDegisti={setImlecParcasi} />

        {(kayit.tur === 'eser' || kayit.tur === 'bolum') && <EserYapisiBolumu istemci={istemci} evren={evren} kayit={kayit} />}
        {kayit.tur === 'sahne' && <SahneBaglamPaneli evren={evren} baglam={imlecParcasi && parcaBaglami ? parcaBaglami : sahneBaglami} parca={!!(imlecParcasi && parcaBaglami)} />}
        {kayit.tur === 'sahne' && <SahneBolumu istemci={istemci} evren={evren} kayit={kayit} surum={surum} />}
        <Iliskiler istemci={istemci} evren={evren} kayit={kayit} surum={surum} />

        <details class="diger-bolumler" open={digerAcik} onToggle={(e) => digerAc((e.target as HTMLDetailsElement).open)}>
          <summary>Diğer bölümler</summary>
          <p class="soluk kucuk">İşaretler, haklar, bilinenler, sorular, değişimler ve türe özgü araçlar.</p>
          <IsaretlerBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} saltOkunur={!!bag} />
          {kayit.tur === 'sahne' && <SahneYerlesimi key={kod} istemci={istemci} evren={evren} kod={kod} surum={surum} saltOkunur={!!bag} />}
          {kayit.tur === 'eser' && <EserSozlesmesiBolumu key={kod} istemci={istemci} evren={evren} kod={kod} surum={surum} saltOkunur={!!bag} />}
          {kayit.tur !== 'eser' && <SozlesmeHatirlatmasiSatiri key={kod} istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          <HaklarBolumu key={kod} istemci={istemci} evren={evren} kod={kod} ad={kayit.ad} surum={surum} saltOkunur={!!bag} />
          <BakimBolumu istemci={istemci} evren={evren} kod={kod} tur={kayit.tur} saltOkunur={!!bag} />
          <KalabalikBolumu key={kod} istemci={istemci} evren={evren} kod={kod} tur={kayit.tur} surum={surum} saltOkunur={!!bag} />
          <BakimUzmanligiBolumu istemci={istemci} evren={evren} kod={kod} />
          <DonusumBolumu key={kod} istemci={istemci} evren={evren} kod={kod} saltOkunur={!!bag} />
          {kayit.tur === 'belge' && <BelgeSunumBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} saltOkunur={!!bag} />}
          {kayit.tur === 'belge' && <DelilBolumu istemci={istemci} evren={evren} kod={kod} saltOkunur={!!bag} />}
          {KULLANIM_SAHIPLERI.includes(kayit.tur) && <KullanimMasasiBolumu istemci={istemci} evren={evren} kod={kod} saltOkunur={!!bag} />}
          {kayit.tur === 'eser' && <EserCiktisi istemci={istemci} evren={evren} eser={kod} />}
          {kayit.tur === 'eser' && <YayimBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} saltOkunur={!!bag} />}
          {kayit.tur === 'eser' && <KurguMontajiBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'eser' && <UyarlamaBolumu istemci={istemci} evren={evren} eser={kod} surum={surum} />}
          {kayit.tur === 'sahne' && <SahneNiyetleriBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'makam' && <MakamYurutenleri istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {SUREC_SAHIPLERI.includes(kayit.tur) && <SurecKurallariBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {HUKUK_SAHIPLERI.includes(kayit.tur) && <HukukKurallariBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'karakter' && <UygulananKurallarAraci istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'dil' && <DilBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'karakter' && <KisiDilleriBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'teknoloji' && <TeknolojiBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'motif' && <MotifBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {TEKNOLOJI_YERLERI.includes(kayit.tur) && <TeknolojiDurumuAraci istemci={istemci} evren={evren} kod={kod} />}
          {kayit.tur === 'karakter' && <KalitimBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          <KullanildigiYerler key={`ky-${kod}`} istemci={istemci} evren={evren} kod={kod} />
          {(kayit.tur === 'karakter' || kayit.tur === 'kimlik') && <KimlikBolumu key={kod} istemci={istemci} evren={evren} kod={kod} tur={kayit.tur} />}
          {(kayit.tur === 'makam' || kayit.tur === 'siyasi') && <VerasetBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {GUNDELIK_YERLERI.includes(kayit.tur) && <GundelikBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {kayit.tur === 'olay' && <OlaySurecBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          <KaliciIzBolumu istemci={istemci} evren={evren} kod={kod} tur={kayit.tur} surum={surum} saltOkunur={bag?.tur === 'surum'} />
          {!DURUMSUZ.has(kayit.tur) && <DurumGecmisi istemci={istemci} evren={evren} kayit={kayit} />}
          {kayit.tur !== 'not' && <BilinenlerBolumu istemci={istemci} evren={evren} kayit={kayit} />}
          <SoruBolumu istemci={istemci} evren={evren} kayit={kayit} ks={ks} />
          <KayitMeseleleri istemci={istemci} evren={evren} kayit={kayit} />
          {!bag && <SonrakiSoruBolumu istemci={istemci} evren={evren} kod={kod} tur={kayit.tur} />}
          {!bag && <BaglamKarsilastirmaBolumu istemci={istemci} evren={evren} kod={kod} />}
          {kayit.tur === 'urun' && <UretimOzetiBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {KESINTI_TURLERI.includes(kayit.tur) && <KesintiBolumu istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          {!['dil', 'not', 'sahne', 'eser', 'bolum'].includes(kayit.tur) && <AdBicimleriBolumu istemci={istemci} evren={evren} kod={kod} ad={kayit.ad} surum={surum} />}
          <AltBirimlerdenToplananlar istemci={istemci} evren={evren} kod={kod} tur={kayit.tur} surum={surum} />
          <KayitDegisimleri istemci={istemci} evren={evren} kod={kod} surum={surum} />
          <KayitMasalari istemci={istemci} evren={evren} kod={kod} surum={surum} />
          {!['sahne', 'not', 'eser', 'bolum'].includes(kayit.tur) && <KayitIzleri istemci={istemci} evren={evren} kod={kod} surum={surum} />}
          <Baglananlar istemci={istemci} evren={evren} kod={kod} surum={surum} />
        </details>

        {gecmisAcik && (
          <SurumGecmisi istemci={istemci} evren={evren} kayit={kayit} surum={surum}
            geriGetir={async (basliklar) => {
              await denetim.current?.kaydet();
              await istemci.iste('metinGeriYukle', { evren, kayit: kod, alan: 'govde', basliklar });
              setEditorAnahtari((n) => n + 1);
            }} />
        )}

        <div class="kayit-alti">
          <span class="soluk kucuk">Oluşturulma: {zamanYaz(kayit.olusturma)} · Son değişiklik: {zamanYaz(kayit.duzenleme)}</span>
          <span class="bosluk" />
          {!kayit.silindi && <a class="dugme sade" href={`#/e/${evren}/ag/${kod}`}>Ağda göster</a>}
          {!kayit.silindi && kayit.tur === 'karakter' && <a class="dugme sade" href={`#/e/${evren}/soy/${kod}`}>Soy ağacı</a>}
          {kayit.tur === 'not' && !kayit.silindi && <NotDonustur istemci={istemci} evren={evren} kayit={kayit} />}
          {!kayit.silindi && <BirlestirDugmesi istemci={istemci} evren={evren} kayit={kayit} onceKaydet={async () => { await denetim.current?.kaydet(); }} />}
          {!kayit.silindi && (
            <button class="dugme tehlikeli" onClick={async () => { if (!(onayla(`“${kayit.ad}” çöp kutusuna taşınsın mı? Çöp kutusundan geri getirebilirsiniz.`))) return;
              await denetim.current?.kaydet();
              await istemci.iste('kayitSil', { evren, kod });
              git(`/e/${evren}`);
            }}>Çöp kutusuna taşı</button>
          )}
        </div>
      </main>
    </EvrenKabugu>
  );
}

/** Tek satırlık alan: odaktan çıkınca ya da Enter'a basınca kaydeder, Esc ile vazgeçer. */
export function AlanGirdisi({ etiket, deger, kaydet, ipucu, buyuk, zorunlu }: {
  etiket: string; deger: string; kaydet: (v: string) => Promise<unknown>; ipucu?: string; buyuk?: boolean; zorunlu?: boolean;
}) {
  const [yerel, setYerel] = useState(deger);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setYerel(deger), [deger]);
  const bitir = async () => {
    if (yerel.trim() === deger.trim()) { setYerel(deger); return; }
    if (zorunlu && !yerel.trim()) { setYerel(deger); return; }
    try { await kaydet(yerel); setHata(null); } catch (e) { setHata((e as Error).message); }
  };
  return (
    <span class="alan-girdisi">
      <input class={buyuk ? 'girdi buyuk' : 'girdi'} aria-label={etiket} value={yerel} placeholder={ipucu}
        spellcheck={!buyuk} lang="tr"
        onInput={(e) => setYerel((e.target as HTMLInputElement).value)}
        onBlur={bitir}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') { setYerel(deger); setTimeout(() => (e.target as HTMLInputElement).blur()); }
        }} />
      {hata && <span class="hata kucuk">{hata}</span>}
    </span>
  );
}

function Liste({ ogeler, ekle, cikar, ekleEtiketi }: { ogeler: string[]; ekle: (v: string) => Promise<unknown>; cikar: (v: string) => Promise<unknown>; ekleEtiketi: string }) {
  const [yeni, setYeni] = useState('');
  return (
    <div class="liste">
      {ogeler.map((o) => (
        <span class="cip" key={o}>{o}<button type="button" aria-label={`${o} çıkar`} onClick={() => cikar(o)}>×</button></span>
      ))}
      <form class="cip-ekle" onSubmit={async (e) => { e.preventDefault(); if (!yeni.trim()) return; await ekle(yeni); setYeni(''); }}>
        <input class="girdi kucuk-girdi" aria-label={ekleEtiketi} placeholder={ekleEtiketi} value={yeni} lang="tr"
          onInput={(e) => setYeni((e.target as HTMLInputElement).value)} />
      </form>
    </div>
  );
}

function SurumGecmisi({ istemci, evren, kayit, surum, geriGetir }: {
  istemci: Istemci; evren: string; kayit: Kayit; surum: number; geriGetir: (b: string[]) => Promise<void>;
}) {
  const [satirlar, setSatirlar] = useState<GunlukSatiri[] | null>(null);
  const [secili, setSecili] = useState<{ satir: GunlukSatiri; spans: Spans } | null>(null);
  useEffect(() => { istemci.iste('kayitGecmisi', { evren, kod: kayit.kod }).then(setSatirlar); }, [kayit.kod, surum]);
  if (!satirlar) return null;
  const metinSurumleri = satirlar.filter((s) => s.tur === 'metin' && !gizliAdimMi(s.tur, s.veri));
  const enYeni = metinSurumleri[0]?.kod;
  const goster = async (s: GunlukSatiri) => {
    const r = await istemci.iste('metinSurumu', { evren, kayit: kayit.kod, alan: 'govde', basliklar: s.veri.basliklar as string[] });
    setSecili({ satir: s, spans: r.spans });
  };
  return (
    <section class="kart surum-gecmisi" aria-label="Sürüm geçmişi">
      <h2>Sürüm geçmişi</h2>
      <p class="soluk kucuk">Bu kayıtta yapılan bütün değişiklikler. Metnin eski bir hâline bakıp onu geri getirebilirsiniz. Geri getirme de yeni bir sürüm olarak eklenir; hiçbir sürüm silinmez.</p>
      {secili && (
        <div class="onizleme">
          <div class="satir">
            <strong style="flex:1">{zamanYaz(secili.satir.zaman)} tarihindeki metin</strong>
            {secili.satir.kod !== enYeni && (
              <button class="dugme ana" onClick={async () => { if (!onayla('Metin bu eski hâline döndürülsün mü?')) return; await geriGetir(secili.satir.veri.basliklar as string[]); setSecili(null); }}>Bu hâli geri getir</button>
            )}
            <button class="dugme" onClick={() => setSecili(null)}>Kapat</button>
          </div>
          <MetinGorunumu spans={secili.spans} />
        </div>
      )}
      <ul class="gunluk">
        {satirlar.filter((s) => !gizliAdimMi(s.tur, s.veri)).map((s) => (
          <li key={s.kod}>
            <span>{islemAciklamasi(s.tur, s.veri, () => kayit.ad)}</span>
            <span class="satir">
              <span class="soluk kucuk">{zamanYaz(s.zaman)}</span>
              {s.tur === 'metin' && <button class="dugme sade kucuk" onClick={() => goster(s)}>Metni göster</button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Yazar düzeltmesi (§5.1): bağlantılı ifadeler yeni adla ve uyumlu ekle değişir; yazar hangilerinin değişeceğini seçer. */
function AdDuzeltmePaneli({ duzeltme, okunusVar, uygula, kapat }: {
  duzeltme: { eskiAd: string; yeniAd: string; liste: AdDuzeltmesi[] }; okunusVar: boolean;
  uygula: (secilenler: string[]) => Promise<void>; kapat: () => void;
}) {
  const anahtar = (x: AdDuzeltmesi) => `${x.kaynak}:${x.sira}`;
  const [secili, setSecili] = useState(() => new Set(duzeltme.liste.map(anahtar)));
  const [calisiyor, setCalisiyor] = useState(false);
  const belirsiz = !sesBilgisi(duzeltme.yeniAd).kesin;
  const degistir = (k: string) => { const s = new Set(secili); if (s.has(k)) s.delete(k); else s.add(k); setSecili(s); };
  return (
    <section class="kart ad-duzeltme" aria-label="Bağlantılarda ad">
      <h2>“{duzeltme.eskiAd}” başka metinlerde {duzeltme.liste.length} yerde geçiyor</h2>
      <p class="soluk kucuk">Bağlantılar zaten yeni ada gidiyor. İsterseniz metinlerde görünen ad da değişsin; ekler yeni ada uydurulur.
        Değiştirmek istemediklerinizin işaretini kaldırın.</p>
      {belirsiz && !okunusVar && <p class="uyari kucuk">“{duzeltme.yeniAd}” adının nasıl okunduğu kesin değil. Ekleri kontrol edin; gerekirse aşağıdaki “Okunuş” alanına okunuşunu yazıp adı yeniden kaydedin.</p>}
      <ul class="duzeltme-listesi">
        {duzeltme.liste.map((x) => (
          <li key={anahtar(x)}>
            <label class="satir">
              <input type="checkbox" checked={secili.has(anahtar(x))} onChange={() => degistir(anahtar(x))} />
              <span class="soluk">{x.kaynakAd}:</span>
              <span><s>{x.eski}</s> → <strong>{x.yeni}</strong></span>
            </label>
          </li>
        ))}
      </ul>
      <div class="satir">
        <button class="dugme ana" disabled={calisiyor || !secili.size} onClick={async () => { setCalisiyor(true); try { await uygula([...secili]); } finally { setCalisiyor(false); } }}>
          {secili.size === duzeltme.liste.length ? 'Hepsini değiştir' : `Seçilen ${secili.size} yeri değiştir`}
        </button>
        <button class="dugme" onClick={kapat}>Hiçbirini değiştirme</button>
      </div>
    </section>
  );
}

function Baglananlar({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [liste, setListe] = useState<BaglananKayit[] | null>(null);
  useEffect(() => { istemci.iste('baglananlar', { evren, kod }).then(setListe); }, [kod, surum]);
  if (!liste || !liste.length) return null;
  return (
    <section class="baglananlar" aria-label="Bu kayda bağlananlar">
      <h2>Bu kayda bağlananlar ({liste.length})</h2>
      <ul class="kayit-listesi">
        {liste.map((b) => {
          const tur = turBul(b.tur);
          return (
            <li key={b.kod}>
              <a class="kayit-satiri" href={`#/e/${evren}/k/${b.kod}`}>
                <span class="tur-rozeti" aria-hidden="true" title={tur.ad}>{tur.kisa}</span>
                <span class="govde">
                  <span class="satir-ad">{b.ad}</span>
                  <span class="soluk kucuk">{b.ifadeler.map((i) => `“${i}”`).join(', ')}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
