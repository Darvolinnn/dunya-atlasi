// Veritabanı çalışanı: SQLite WASM, tarayıcının özel dosya alanında, SAH havuzu (TK1).
// Aynı anda tek sekme açabilir; tek sekme kuralı arayüzde Web Locks ile sağlanır (§10.5).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { IstekAdi } from '../veri/api';
import { Hizmet } from './hizmet';
import { automergeHazirla } from '../alan/automerge';
import automergeWasm from '@automerge/automerge/automerge.wasm?url';
import { OpfsDeposu, tarayiciIsleyici } from './medya-tarayici';
import { DriveTasiyici } from './drive';

let hizmet: Hizmet | null = null;
let havuz: { getFileCount(): number; getCapacity(): number; addCapacity(n: number): Promise<number> } | null = null;
let hazirlik: Promise<Hizmet> | null = null;

// Arayüzün çağırabildiği istekler; başka hiçbir yöntem dışarıdan çağrılamaz.
const IZINLI: ReadonlySet<IstekAdi> = new Set<IstekAdi>(['baslat', 'evrenler', 'evrenOlustur', 'evrenAdlandir', 'evrenBilgisi', 'islemGunlugu',
  'gokyuzuTanimi', 'gokyuzuYaz', 'gokyuzuHesapla', 'gokyuzuCakismaAra',
  'durumNiyeti', 'iddiaDosyasi', 'anlatimYaz', 'anlatimSil', 'anlatimGeriYukle', 'baglamKarsilastir', 'kosulMasasi', 'degisiklikMasasi', 'degisiklikUygula', 'sozlukler', 'sozlukYaz', 'sozlukSil', 'sozlukGeriYukle', 'sozlukDenetle', 'sozlukIsareti',
  'yerlesim', 'yerlesimPlanlari', 'yerlesimYaz',
  'kayitlar', 'kayit', 'kayitOlustur', 'kayitDegistir', 'kayitListe', 'kayitSil', 'kayitGeriYukle', 'kayitGecmisi',
  'metinAc', 'metinKaydet', 'metinSurumu', 'metinGeriYukle',
  'ara', 'baglananlar', 'bahsedilenler', 'adDuzeltmeOnizle', 'adDuzeltmeUygula',
  'kayitTarih', 'alanKarari', 'hizliNot', 'nottanKayit', 'iliskiler', 'iliskiEkle', 'iliskiDegistir', 'iliskiSil', 'iliskiGeriYukle',
  'sahneOlaylari', 'degisimEkle', 'degisimSil', 'kayitDegisimleri', 'gorselEkle', 'kayitGorselCikar', 'gorsel',
  'haritalar', 'harita', 'haritaYukle', 'gorseldenHarita', 'haritaDegistir', 'haritaSil', 'isaretKoy', 'isaretDegistir', 'isaretSil', 'kayitHaritalari',
  'soyAgaci', 'ag', 'durumGecmisi', 'kayitDurumGecmisi', 'nedenSonucAgi', 'etkiRaporu', 'etkiIncelemeleri', 'etkiKarari', 'kurguHatlari', 'bolumMatrisi',
  'kayitIddialari', 'iddialar', 'iddiaEkle', 'iddiaDegistir', 'iddiaSil', 'bilenBilgileri', 'bilgiEkle', 'bilgiDegistir', 'bilgiSil', 'gorunurlukYaz',
  'birlesmeOnizle', 'birlestir', 'birlesmeyiGeriAl', 'tersBirlesmeCoz', 'saglikTaramasi', 'incelemeKarari', 'denetimler', 'katmanEkle', 'katmanGorseli', 'katmanDegistir', 'katmanHizala', 'cizimEkle', 'cizimDegistir', 'cizimSil', 'rota', 'rotaYaz', 'yolculuk', 'yolculukYaz', 'izOlustur', 'izDegistir', 'izSil', 'izGozlem', 'sahneSurekliligi', 'kayitIzleri', 'masalar', 'masa', 'masaOlustur', 'masaYaz', 'masaUyeleri', 'masaSil', 'kayitMasalari', 'paketler', 'paket', 'paketOlustur', 'paketAlanYaz', 'varsayimEkle', 'varsayimCikar', 'varsayimiEvreneYaz', 'paketSil', 'kayitVarsayilanlari', 'alanBoslugu', 'varsayilanKarari', 'fetihCevabi', 'geciselKayitlar', 'gundelikKartlari', 'gundelikYaz', 'siradanGun', 'karsilastirmaliOkuma', 'derlemeler', 'surumler', 'surumOlustur', 'surumYaz', 'surumSil', 'surumFarki', 'dallar', 'yayimlar', 'markdownDisaAktar', 'epubYaz', 'eserBaskiSayfasi', 'belgeSunumu', 'belgeSunumuYaz', 'belgeCiktisi', 'isaretAlanlari', 'metinIsaretiOlustur', 'metinIsaretiYaz', 'metinIsaretiSil', 'kayitIsaretleri', 'isaretOzetleri', 'isaretIncelemeleri', 'isaretKarari', 'yayimla', 'yayimSil', 'yayimCelismeleri', 'yayimKarari', 'dalOlustur', 'dalYaz', 'dalSil', 'dalFarki', 'dalAktar', 'derleme', 'derlemeOlustur', 'derlemeAdYaz', 'gezintiYaz', 'panoYaz', 'panoGorseliSakla', 'derlemeSil', 'kayitDerlemeleri', 'kurguMontaji', 'sahneNiyetleri', 'sahneNiyetleriYaz', 'montajHedefiYaz', 'montajTasi', 'kalitimOzellikleri', 'kalitimOzelligiYaz', 'kalitim', 'kalitimDegeriYaz', 'veraset', 'verasetYaz', 'tahtSirasi', 'teknoloji', 'teknolojiYaz', 'teknolojiDurumu', 'motif', 'motifYorumlariYaz', 'dil', 'dilYaz', 'sesDene', 'adTuret', 'adUret', 'adBicimleri', 'adBicimiYaz', 'kisiDilleri', 'dilYeterliligiYaz', 'enKisaRota', 'kanal', 'kanalYaz', 'haberCikisi', 'haberCikisiYaz', 'haberYayilimi', 'kesintiZinciri', 'uretimOzeti', 'dayaniklilikYaz', 'hukukKurallari', 'hukukKuraliOlustur', 'hukukKuraliYaz', 'hukukKuraliSil', 'uygulananKurallar', 'surecKurallari', 'surecKuraliOlustur', 'surecKuraliYaz', 'surecKuraliSil', 'olaySurecleri', 'surecBagla', 'surecAdimi', 'surecFiili', 'makamYurutenleri', 'altBirimlerdenToplananlar', 'parcadanKayit',
  'iceAktarIncele', 'iceAktar', 'yedekAl', 'yedekIncele', 'yedektenYukle', 'evrenYerineKoy', 'sonYedek',
  'catismalar', 'catismaSayisi', 'alanCatismasiCoz', 'silmeCatismasiCoz', 'metinCatismasiCoz',
  'esitle', 'esitlemeDurumu', 'uzakEvrenler', 'evreniIndir', 'evrenEsitlemeAyari', 'kurulumAdiDegistir', 'kurulumKullanimDisi',
  'kaldigiYer', 'kaldigiYerYaz', 'donemselYedekDurumu', 'driveYedekleri', 'drivedaYedekAl', 'drivedanGeriYukle', 'yedekAyarlari',
  'eserYapisi', 'anlatiYeri', 'yerlesmemisler', 'eserler', 'anlatiYerlestir', 'anlatiOlustur',
  'durumlar', 'durumEkle', 'durumDegistir', 'durumSil', 'ozellikAdlari', 'sahneAlaniAyarla', 'sahneBaglami',
  'sablon', 'sablonYaz', 'kayitSablonu', 'kayitAlanYaz', 'soruCevapla', 'soruKayitla', 'kayitSoruSeti', 'evrenSorulari', 'meseleler', 'yazarKaydiEkle',
  'takvim', 'takvimEtkisi', 'takvimYaz', 'zamanCizelgesi', 'zamanSeti', 'paralelTakvimYaz', 'akisYaz', 'akisEtkisi',
  'jetonVer', 'baglantiyiKes']);

// Drive izni yalnızca bu çalışanın belleğinde durur; hiçbir yere yazılmaz.
let jeton: string | null = null;
const ozel = {
  async jetonVer(h: Hizmet, a: { jeton: string; bitis: number }) {
    if (typeof a?.jeton !== 'string' || !Number.isFinite(a.bitis)) throw new Error('Geçersiz izin.');
    const t = new DriveTasiyici(a.jeton, a.bitis);
    const hesap = await t.hesap();
    jeton = a.jeton;
    h.tasiyiciAyarla(t, new DriveTasiyici(a.jeton, a.bitis, 'drive'));
    return hesap;
  },
  baglantiyiKes(h: Hizmet) {
    const j = jeton;
    jeton = null;
    h.tasiyiciAyarla(null);
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
    new OpfsDeposu(), tarayiciIsleyici, () => new sqlite3.oo1.DB(':memory:'));
}

onmessage = async (e: MessageEvent<{ no: number; ad: IstekAdi; arg: unknown }>) => {
  const { no, ad, arg } = e.data;
  try {
    hazirlik ??= hazirla();
    hizmet ??= await hazirlik;
    // Her veritabanı dosyası ve günlüğü havuzda bir yer tutar; yeni evren için yer kalsın.
    if (havuz && havuz.getFileCount() + 6 > havuz.getCapacity()) await havuz.addCapacity(16);
    if (!IZINLI.has(ad)) throw new Error('Bilinmeyen istek: ' + ad);
    const sonuc = ad === 'jetonVer' || ad === 'baglantiyiKes'
      ? await ozel[ad](hizmet, arg as never)
      : await (hizmet as unknown as Record<string, (a: unknown) => unknown>)[ad].call(hizmet, arg);
    // Görsel baytları kopyalanmadan aktarılır.
    const aktar = sonuc && typeof sonuc === 'object' && (sonuc as { veri?: unknown }).veri instanceof Uint8Array ? [((sonuc as { veri: Uint8Array }).veri).buffer] : [];
    postMessage({ no, sonuc }, { transfer: aktar as Transferable[] });
  } catch (err) {
    postMessage({ no, hata: err instanceof Error ? err.message : String(err) });
  }
};
