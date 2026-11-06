// Veritabanı çalışanı: SQLite WASM, tarayıcının özel dosya alanında, SAH havuzu (TK1).
// Aynı anda tek sekme açabilir; tek sekme kuralı arayüzde Web Locks ile sağlanır (§10.5).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { IstekAdi } from '../veri/api';
import { Hizmet } from './hizmet';
import { automergeHazirla } from '../alan/automerge';
import automergeWasm from '@automerge/automerge/automerge.wasm?url';
import { OpfsDeposu, tarayiciIsleyici } from './medya-tarayici';
import { DriveTasiyici } from './drive';
import type { AltKlasor, YerelDosya, YerelKlasor } from './klasor-tasiyici';
import { kullaniciIletisi } from './ileti';

let hizmet: Hizmet | null = null;
let havuz: { getFileCount(): number; getCapacity(): number; addCapacity(n: number): Promise<number>; unlink(ad: string): boolean; getFileNames(): string[] } | null = null;
let hazirlik: Promise<Hizmet> | null = null;

// Arayüzün çağırabildiği istekler; başka hiçbir yöntem dışarıdan çağrılamaz.
const IZINLI: ReadonlySet<IstekAdi> = new Set<IstekAdi>(['baslat', 'evrenler', 'evrenOlustur', 'evrenKaldir', 'ilkAdimlar', 'aracTanitimlari', 'seriler', 'alternatifler', 'kitapSonuAciklar', 'etkinCalisma', 'etkinCalismaYaz', 'simdi', 'karakterYollari', 'evrenAdlandir', 'kurguTuruYaz', 'adDizini', 'bagsizAdAyari', 'evrenBilgisi', 'islemGunlugu',
  'yogunluk',
  'sozlesmeMaddeleri', 'sozlesmeMaddeYaz', 'sozlesmeMaddeSil', 'sozlesmeMaddeGeriYukle', 'sozlesmeDisaridaYaz', 'eserSozlesmesi', 'sozlesmeHatirlatmalari',
  'haklar', 'hakEkle', 'hakDegistir', 'hakSil', 'hakGeriYukle', 'hakTanimaYaz',
  'gokyuzuTanimi', 'gokyuzuYaz', 'gokyuzuHesapla', 'gokyuzuCakismaAra',
  'durumNiyeti', 'iddiaDosyasi', 'anlatimYaz', 'anlatimSil', 'anlatimGeriYukle', 'delilGecmisi', 'delilYaz', 'sorulabilirHesaplar', 'sonrakiSoru', 'kesifSorusu', 'kullanimMasasi', 'kullanimMasasiYaz', 'kesifAdayiKaydet', 'baglamKarsilastir', 'kosulMasasi', 'degisiklikMasasi', 'degisiklikUygula', 'sozlukler', 'sozlukYaz', 'sozlukSil', 'sozlukGeriYukle', 'sozlukDenetle', 'sozlukIsareti',
  'bakimTanimYaz', 'bakimTanimSil', 'bakimTanimGeriYukle', 'bakimKaydiYaz', 'bakimKaydiSil', 'bakimKaydiGeriYukle', 'bakimOku', 'bakimDurumu', 'bakimUzmanligi',
  'yerlesim', 'yerlesimPlanlari', 'yerlesimYaz',
  'kayitlar', 'kayit', 'kayitOlustur', 'kayitDegistir', 'kayitListe', 'kayitSil', 'kayitGeriYukle', 'kayitGecmisi',
  'metinAc', 'metinKaydet', 'metinSurumu', 'metinGeriYukle',
  'ara', 'baglananlar', 'andiklari', 'sonParagraf', 'bahsedilenler', 'adDuzeltmeOnizle', 'adDuzeltmeUygula',
  'kayitTarih', 'alanKarari', 'hizliNot', 'nottanKayit', 'iliskiler', 'iliskiEkle', 'iliskiDegistir', 'iliskiSil', 'iliskiGeriYukle',
  'sahneOlaylari', 'degisimEkle', 'degisimSil', 'kayitDegisimleri', 'gorselEkle', 'kayitGorselCikar', 'gorsel',
  'haritalar', 'harita', 'haritaYukle', 'gorseldenHarita', 'haritaDegistir', 'haritaSil', 'isaretKoy', 'isaretDegistir', 'isaretSil', 'kayitHaritalari',
  'soyAgaci', 'ag', 'durumGecmisi', 'kayitDurumGecmisi', 'nedenSonucAgi', 'etkiRaporu', 'etkiIncelemeleri', 'etkiKarari', 'kurguHatlari', 'bolumMatrisi',
  'kayitIddialari', 'iddialar', 'iddiaEkle', 'iddiaDegistir', 'iddiaSil', 'bilenBilgileri', 'bilgiEkle', 'bilgiDegistir', 'bilgiSil', 'gorunurlukYaz',
  'birlesmeOnizle', 'birlestir', 'birlesmeyiGeriAl', 'tersBirlesmeCoz', 'saglikTaramasi', 'incelemeKarari', 'denetimler', 'katmanEkle', 'katmanGorseli', 'katmanDegistir', 'katmanHizala', 'cizimEkle', 'cizimDegistir', 'cizimSil', 'rota', 'rotaYaz', 'yolculuk', 'yolculukYaz', 'izOlustur', 'izDegistir', 'izSil', 'izGozlem', 'sahneSurekliligi', 'kayitIzleri', 'masalar', 'masa', 'masaOlustur', 'masaYaz', 'masaUyeleri', 'masaSil', 'kayitMasalari', 'paketler', 'paket', 'paketOlustur', 'paketAlanYaz', 'varsayimEkle', 'varsayimCikar', 'varsayimiEvreneYaz', 'paketSil', 'kayitVarsayilanlari', 'alanBoslugu', 'varsayilanKarari', 'fetihCevabi', 'geciselKayitlar', 'gundelikKartlari', 'gundelikYaz', 'siradanGun', 'karsilastirmaliOkuma', 'derlemeler', 'surumler', 'surumOlustur', 'surumYaz', 'surumSil', 'surumFarki', 'dallar', 'yayimlar', 'markdownDisaAktar', 'epubYaz', 'eserBaskiSayfasi', 'belgeSunumu', 'belgeSunumuYaz', 'belgeCiktisi', 'isaretAlanlari', 'metinIsaretiOlustur', 'metinIsaretiYaz', 'metinIsaretiSil', 'kayitIsaretleri', 'isaretOzetleri', 'isaretIncelemeleri', 'isaretKarari', 'yayimla', 'yayimSil', 'yayimCelismeleri', 'yayimKarari', 'dalOlustur', 'dalYaz', 'dalSil', 'dalFarki', 'dalAktar', 'derleme', 'derlemeOlustur', 'derlemeAdYaz', 'gezintiYaz', 'panoYaz', 'panoGorseliSakla', 'derlemeSil', 'kayitDerlemeleri', 'kurguMontaji', 'sahneNiyetleri', 'sahneNiyetleriYaz', 'montajHedefiYaz', 'montajTasi', 'olayOrgusu', 'seriPlani', 'olasiFinalEkle', 'olasiFinalBagla', 'okumaYollariYaz', 'kalitimOzellikleri', 'kalitimOzelligiYaz', 'kalitim', 'kalitimDegeriYaz', 'veraset', 'verasetYaz', 'tahtSirasi', 'teknoloji', 'teknolojiYaz', 'teknolojiDurumu', 'motif', 'motifYorumlariYaz', 'dil', 'dilYaz', 'sesDene', 'adTuret', 'adUret', 'adBicimleri', 'adBicimiYaz', 'kisiDilleri', 'dilYeterliligiYaz', 'enKisaRota', 'kanal', 'kanalYaz', 'haberCikisi', 'haberCikisiYaz', 'haberYayilimi', 'kesintiZinciri', 'uretimOzeti', 'dayaniklilikYaz', 'hukukKurallari', 'hukukKuraliOlustur', 'hukukKuraliYaz', 'formulDenetle', 'hukukKuraliSil', 'uygulananKurallar', 'kuralOrnekleri', 'kuralOrnegiYaz', 'kuralOrnegiSil', 'hukukKuraliKopyala', 'surecKurallari', 'surecKuraliOlustur', 'surecKuraliYaz', 'surecKuraliSil', 'olaySurecleri', 'surecBagla', 'surecAdimi', 'surecFiili', 'makamYurutenleri', 'altBirimlerdenToplananlar', 'parcadanKayit',
  'iceAktarIncele', 'iceAktar', 'ornekEvrenKur', 'yedekAl', 'yedekIncele', 'yedektenYukle', 'evrenYerineKoy', 'sonYedek',
  'catismalar', 'catismaSayisi', 'alanCatismasiCoz', 'silmeCatismasiCoz', 'metinCatismasiCoz',
  'esitle', 'esitlemeDurumu', 'uzakEvrenler', 'evreniIndir', 'evrenEsitlemeAyari', 'kurulumAdiDegistir', 'kurulumKullanimDisi',
  'kaldigiYer', 'kaldigiYerYaz', 'taslakOku', 'taslakYaz', 'taslakSil', 'donemselYedekDurumu', 'driveYedekleri', 'drivedaYedekAl', 'drivedanGeriYukle', 'yedekAyarlari',
  'eserYapisi', 'anlatiYeri', 'yerlesmemisler', 'eserler', 'anlatiYerlestir', 'anlatiOlustur',
  'durumlar', 'durumEkle', 'durumDegistir', 'durumSil', 'ozellikAdlari', 'sahneAlaniAyarla', 'sahneBaglami',
  'sablon', 'sablonYaz', 'kayitSablonu', 'kayitAlanYaz', 'soruCevapla', 'soruKayitla', 'soruBagla', 'kayitSoruSeti', 'evrenSorulari', 'meseleler', 'notPanosu', 'sonCalisma', 'yazarKaydiEkle',
  'takvim', 'takvimEtkisi', 'takvimYaz', 'zamanCizelgesi', 'zamanSeti', 'paralelTakvimYaz', 'akisYaz', 'akisEtkisi', 'yasananSure',
  'uyarlamaListesi', 'uyarlamaAdaylari', 'uyarlamaYaz', 'uyarlamaSil', 'uyarlamaGozdenGecir',
  'dairInanclar', 'dairInancYaz', 'dairInancSil',
  'kimlikBilgisi', 'kimlikAyirmaAdaylari', 'kimlikAyir', 'kimlikBirlestirOnizle', 'kimlikBirlestir',
  'baglamParcalari', 'baglamParcasiOlustur', 'baglamParcasiYaz', 'baglamParcasiSil',
  'rotaSartlari', 'rotaSartlariYaz',
  'metinKullanimlari', 'metinKullanildigiYerler', 'metinKullanimOlustur', 'metinKullanimGuncelle', 'metinKullanimTurev', 'metinKullanimTasi', 'metinKullanimSil',
  'donusumListesi', 'donusumSecenekleri', 'donusumYaz', 'donusumGeriAl',
  'kalabalikOku', 'kalabalikGozlemYaz', 'kalabalikOlayYaz', 'kalabalikKaldir',
  'haritaKunyesi', 'haritaKunyeleri', 'haritaKunyeYaz',
  'olaySurecSorumlulari', 'surecAdimSorumlusuYaz', 'surecEngelEkle', 'surecEngelDegistir', 'surecEngelSil',
  'olayIzleri', 'mekanIzKatmanlari', 'izKaydiYaz', 'izKaydiSil', 'izKaydiGeriYukle',
  'olcekliHaritaDurumu', 'olcekliOlcekYaz', 'olcekliVarsayilanHizYaz', 'olcekliAraziYaz', 'olcekliAraziSil', 'olcekliOlcum', 'olcekliKonturlar',
  'yerelYedekDurumu', 'yerelYedekAyari', 'yerelYedekAl', 'yerelYedekleri', 'yereldenGeriYukle', 'gunlukYerelYedekler',
  'jetonVer', 'baglantiyiKes', 'yerelKlasorBagla']);

// Drive izni yalnızca bu çalışanın belleğinde durur; hiçbir yere yazılmaz.
let jeton: string | null = null;
let tasiyicilar: DriveTasiyici[] = [];

// Bu bilgisayardaki yedek klasörü (K31): kabuğun istekleri yalnızca sayfadan çağrılabilir. Çalışan isteği sayfaya
// gönderir, sayfa kabuğa iletip yanıtı geri yollar (istemci.ts).
let kabukNo = 0;
const kabukBekleyen = new Map<number, { ok: (v: unknown) => void; no: (e: Error) => void }>();
function kabukIste(komut: string, arg: { alt: AltKlasor; ad?: string }, veri?: Uint8Array): Promise<unknown> {
  return new Promise((ok, no) => {
    const n = ++kabukNo;
    kabukBekleyen.set(n, { ok, no });
    const kopya = veri?.slice();
    postMessage({ kabuk: { no: n, komut, arg, veri: kopya } }, { transfer: kopya ? [kopya.buffer] : [] });
  });
}
const kabukKlasoru: YerelKlasor = {
  listele: (alt) => kabukIste('yerel_yedek_listele', { alt }) as Promise<YerelDosya[]>,
  oku: (alt, ad) => kabukIste('yerel_yedek_oku', { alt, ad }) as Promise<Uint8Array>,
  yaz: async (alt, ad, veri) => { await kabukIste('yerel_yedek_yaz', { alt, ad }, veri); },
  sil: async (alt, ad) => { await kabukIste('yerel_yedek_sil', { alt, ad }); },
};
/** Program açıldıktan yarım dakika sonra ve açık kaldıkça yarım saatte bir: günü gelen yedekler alınır. */
const ILK_YEREL_YEDEK = 30_000;
const YEREL_YEDEK_ARALIGI = 30 * 60_000;
let yerelZamanlayici: ReturnType<typeof setInterval> | null = null;

const ozel = {
  yerelKlasorBagla(h: Hizmet, a: { yer: string }) {
    h.yerelKlasorAyarla(kabukKlasoru, typeof a?.yer === 'string' ? a.yer : '');
    if (!yerelZamanlayici) {
      setTimeout(() => { void h.gunlukYerelYedekler(); }, ILK_YEREL_YEDEK);
      yerelZamanlayici = setInterval(() => { void h.gunlukYerelYedekler(); }, YEREL_YEDEK_ARALIGI);
    }
  },
  async jetonVer(h: Hizmet, a: { jeton: string; bitis: number }) {
    if (typeof a?.jeton !== 'string' || !Number.isFinite(a.bitis)) throw new Error('Geçersiz izin.');
    const t = new DriveTasiyici(a.jeton, a.bitis, 'appDataFolder', h.yuklemeSecenekleri());
    const hesap = await t.hesap();
    jeton = a.jeton;
    const yedek = new DriveTasiyici(a.jeton, a.bitis, 'drive', h.yuklemeSecenekleri());
    h.tasiyiciAyarla(t, yedek);
    tasiyicilar = [t, yedek];
    return hesap;
  },
  baglantiyiKes(h: Hizmet) {
    const j = jeton;
    jeton = null;
    h.tasiyiciAyarla(null);
    for (const t of tasiyicilar) t.iptal();
    tasiyicilar = [];
    return { jeton: j };
  },
};

function kurulumAdi(): string {
  const ua = navigator.userAgent;
  const tarayici = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Tarayıcı';
  const cihaz = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Mac/.test(ua) ? 'Mac' : 'Cihaz';
  return `${cihaz} · ${tarayici}`;
}

async function hazirla(): Promise<Hizmet> {
  const [sqlite3] = await Promise.all([sqlite3InitModule(), automergeHazirla(automergeWasm)]);
  const h = await sqlite3.installOpfsSAHPoolVfs({ name: 'dunya-atlasi', directory: '/dunya-atlasi', initialCapacity: 16 });
  havuz = h as never;
  const ac = (ad: string) => new h.OpfsSAHPoolDb(ad);
  return new Hizmet(ac, kurulumAdi(), sqlite3.version.libVersion, (evren, turler, kayitlar, uzaktan) => postMessage({ degisti: { evren, turler, kayitlar, uzaktan } }),
    new OpfsDeposu(), tarayiciIsleyici, () => new sqlite3.oo1.DB(':memory:'), (ilerleme) => postMessage({ ilerleme }), (ad) => { havuz?.unlink(ad); },
    () => havuz?.getFileNames() ?? []);
}

type Gelen = { no: number; ad: IstekAdi; arg: unknown } | { kabukYanit: { no: number; sonuc?: unknown; hata?: string } };

onmessage = async (e: MessageEvent<Gelen>) => {
  if ('kabukYanit' in e.data) {
    const y = e.data.kabukYanit;
    const b = kabukBekleyen.get(y.no);
    if (!b) return;
    kabukBekleyen.delete(y.no);
    if (typeof y.hata === 'string') b.no(new Error(y.hata)); else b.ok(y.sonuc);
    return;
  }
  const { no, ad, arg } = e.data;
  try {
    hazirlik ??= hazirla();
    hizmet ??= await hazirlik;
    // Her veritabanı dosyası ve günlüğü havuzda bir yer tutar; yeni evren için yer kalsın.
    if (havuz && havuz.getFileCount() + 6 > havuz.getCapacity()) await havuz.addCapacity(16);
    if (!IZINLI.has(ad)) throw new Error('Bilinmeyen istek: ' + ad);
    const sonuc = ad === 'jetonVer' || ad === 'baglantiyiKes' || ad === 'yerelKlasorBagla'
      ? await ozel[ad](hizmet, arg as never)
      : await (hizmet as unknown as Record<string, (a: unknown) => unknown>)[ad].call(hizmet, arg);
    // Görsel baytları kopyalanmadan aktarılır.
    const aktar = sonuc && typeof sonuc === 'object' && (sonuc as { veri?: unknown }).veri instanceof Uint8Array ? [((sonuc as { veri: Uint8Array }).veri).buffer] : [];
    postMessage({ no, sonuc }, { transfer: aktar as Transferable[] });
  } catch (err) {
    const hata = kullaniciIletisi(err);
    // Türkçeleştirilen teknik ileti, sorun aranırken bulunabilsin diye konsola yazılır.
    if (hata !== (err instanceof Error ? err.message : String(err))) console.error(err);
    postMessage({ no, hata });
  }
};
