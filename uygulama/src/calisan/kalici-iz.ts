// Geçmişin bugünkü izleri (F11, §4.5, §5, §16.1): Bir olaya kısa vadeli sonuç veya kalıcı iz eklenir;
// kısa ad, isteğe bağlı yer kaydı (mekân veya şehir), isteğe bağlı bitiş tarihi, gerçek kökeni ve anlatılan
// hikâyesi ayrı tutulur. Program gerçek köken ile anlatılan hikâyeyi karşılaştırmaz ve serbest metinden anlam
// çıkarmaz (K1). Mekân/şehir sayfasında o yere bağlı izler olayın evren tarihine göre sıralı dönem katmanları
// olarak gruplanır; olay tarihi yoksa "Tarihsiz" grubunda yer alır.
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { IslemGirdisi } from '../alan/islem';
import { siraAnahtari, tarihCoz, tarihMi, type EvrenTarihi } from '../alan/tarih';
import { turkceKarsilastir } from '../alan/turkce';
import type { Catisma, IzKaydi, KaliciIzTuru, KisaKayit, MekanIzKatmani, OlayIzleri } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';

export const KALICI_IZ_TURLERI: readonly { kod: KaliciIzTuru; ad: string }[] = [
  { kod: 'kisa_vadeli', ad: 'Kısa vadeli sonuç' },
  { kod: 'kalici', ad: 'Kalıcı iz' },
];

export const YER_TURLERI: readonly string[] = ['mekan', 'sehir'];

export interface KaliciIzBaglami {
  e: EvrenVt;
  yaz: (girdiler: IslemGirdisi[], kayitlar?: string[]) => void;
  olayTarihi: (kod: string) => EvrenTarihi | null;
}

function metinTemizle(deger: unknown, { bos = false, uzunluk = 200, etiket = 'Ad' } = {}): string {
  const s = String(deger ?? '').replace(/\s+/g, ' ').trim();
  if (!s && !bos) throw new Error(`${etiket} boş olamaz.`);
  if (s.length > uzunluk) throw new Error(`${etiket} çok uzun.`);
  return s;
}

function serbestYaziTemizle(deger: unknown, uzunluk = 4000): string {
  const s = String(deger ?? '').trim();
  if (s.length > uzunluk) throw new Error('Metin çok uzun.');
  return s;
}

function aktifKayitOku(e: EvrenVt, kod: string | null | undefined): KisaKayit | null {
  if (!kod || !kodGecerliMi(kod)) return null;
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  if (!r) return null;
  return { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string };
}

function olayKontrol(e: EvrenVt, kod: string): KisaKayit {
  const k = aktifKayitOku(e, kod);
  if (!k) throw new Error('Olay kaydı bulunamadı.');
  if (k.tur !== 'olay') throw new Error('İz yalnızca olay kayıtlarına eklenebilir.');
  return k;
}

function yerKontrol(e: EvrenVt, kod: string | null | undefined): KisaKayit | null {
  if (!kod) return null;
  const k = aktifKayitOku(e, kod);
  if (!k) throw new Error('Yer kaydı bulunamadı.');
  if (!YER_TURLERI.includes(k.tur)) throw new Error('Yer olarak yalnızca mekân veya şehir seçilebilir.');
  return k;
}

function bitisCoz(e: EvrenVt, girdi: string | EvrenTarihi | null | undefined): EvrenTarihi | null {
  if (!girdi) return null;
  if (typeof girdi === 'string') {
    const temiz = girdi.trim();
    if (!temiz) return null;
    return tarihCoz(temiz, zamanSetiOku(e.db));
  }
  if (tarihMi(girdi)) {
    const temiz = girdi.ifade.trim();
    if (!temiz) return null;
    return tarihCoz(temiz, zamanSetiOku(e.db));
  }
  throw new Error('Geçersiz bitiş tarihi.');
}

function satirCevir(
  b: KaliciIzBaglami,
  r: Record<string, unknown>,
  olayKayit: KisaKayit,
  olayTarihi: EvrenTarihi | null,
): IzKaydi {
  const yer = r.yer ? aktifKayitOku(b.e, r.yer as string) : null;
  const bitis = r.bitis ? (JSON.parse(r.bitis as string) as EvrenTarihi) : null;
  return {
    kod: r.kod as string,
    olay: olayKayit,
    olayTarihi,
    tur: (r.tur as KaliciIzTuru) === 'kisa_vadeli' ? 'kisa_vadeli' : 'kalici',
    ad: r.ad as string,
    yer,
    bitis,
    gercekKoken: (r.gercek_koken as string) ?? '',
    anlatilanHikaye: (r.anlatilan_hikaye as string) ?? '',
    silindi: r.silindi !== null && r.silindi !== undefined,
  };
}

export function izKaydiYaz(
  b: KaliciIzBaglami,
  girdi: {
    kod?: string | null;
    olay: string;
    tur: KaliciIzTuru;
    ad: string;
    yer?: string | null;
    bitis?: string | EvrenTarihi | null;
    gercekKoken?: string;
    anlatilanHikaye?: string;
  },
): { kod: string } {
  const olay = olayKontrol(b.e, girdi.olay);
  if (girdi.tur !== 'kisa_vadeli' && girdi.tur !== 'kalici') {
    throw new Error('Geçersiz iz türü.');
  }
  const ad = metinTemizle(girdi.ad, { uzunluk: 200, etiket: 'İz adı' });
  const yer = yerKontrol(b.e, girdi.yer ?? null);
  const bitis = bitisCoz(b.e, girdi.bitis ?? null);
  const gercekKoken = serbestYaziTemizle(girdi.gercekKoken ?? '');
  const anlatilanHikaye = serbestYaziTemizle(girdi.anlatilanHikaye ?? '');

  let kod = girdi.kod ?? null;
  let oncekiYer: string | null = null;
  if (kod) {
    if (!kodGecerliMi(kod)) throw new Error('İz kaydı bulunamadı.');
    const mevcut = b.e.db.selectObject('SELECT olay, yer FROM iz_kayitlari WHERE kod=?', [kod]);
    if (!mevcut) throw new Error('İz kaydı bulunamadı.');
    oncekiYer = (mevcut.yer as string | null) ?? null;
  } else {
    kod = yeniKod();
  }

  const etkilenenler = [olay.kod, ...(yer ? [yer.kod] : []), ...(oncekiYer ? [oncekiYer] : [])];
  b.yaz(
    [
      {
        tur: 'iz_kaydi_yaz',
        veri: {
          kod,
          olay: olay.kod,
          tur: girdi.tur,
          ad,
          yer: yer ? yer.kod : null,
          bitis,
          gercekKoken,
          anlatilanHikaye,
        },
      },
    ],
    [...new Set(etkilenenler)],
  );
  return { kod };
}

export function izKaydiSil(b: KaliciIzBaglami, kod: string) {
  if (!kodGecerliMi(kod)) throw new Error('İz kaydı bulunamadı.');
  const r = b.e.db.selectObject('SELECT olay, yer, ad FROM iz_kayitlari WHERE kod=? AND silindi IS NULL', [kod]);
  if (!r) throw new Error('İz kaydı bulunamadı.');
  const olayKod = yonlendir(b.e.db, r.olay as string);
  const yerKod = r.yer ? yonlendir(b.e.db, r.yer as string) : null;
  b.yaz(
    [{ tur: 'iz_kaydi_sil', veri: { kod, olay: olayKod, ad: r.ad as string } }],
    [olayKod, ...(yerKod ? [yerKod] : [])],
  );
}

export function izKaydiGeriYukle(b: KaliciIzBaglami, kod: string) {
  if (!kodGecerliMi(kod)) throw new Error('İz kaydı bulunamadı.');
  const r = b.e.db.selectObject('SELECT olay, yer, ad FROM iz_kayitlari WHERE kod=? AND silindi IS NOT NULL', [kod]);
  if (!r) throw new Error('İz kaydı bulunamadı.');
  const olayKod = yonlendir(b.e.db, r.olay as string);
  const yerKod = r.yer ? yonlendir(b.e.db, r.yer as string) : null;
  b.yaz(
    [{ tur: 'iz_kaydi_geri_yukle', veri: { kod, olay: olayKod, ad: r.ad as string } }],
    [olayKod, ...(yerKod ? [yerKod] : [])],
  );
}

function yerAdaylariOku(e: EvrenVt): KisaKayit[] {
  return e.db
    .selectObjects(
      "SELECT kod, ad, tur FROM kayitlar WHERE silindi IS NULL AND tur IN ('mekan', 'sehir') ORDER BY olusturma",
    )
    .map((r) => ({ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }))
    .sort((a, b) => turkceKarsilastir(a.ad, b.ad));
}

export function olayIzleri(b: KaliciIzBaglami, olay: string): OlayIzleri {
  const olayKayit = aktifKayitOku(b.e, olay);
  if (!olayKayit || olayKayit.tur !== 'olay') {
    return { kisaVadeli: [], kalici: [], silinenler: [], yerAdaylari: [] };
  }
  const tarih = b.olayTarihi(olayKayit.kod);
  const satirlar = b.e.db
    .selectObjects('SELECT rowid, * FROM iz_kayitlari ORDER BY olusturma, rowid')
    .filter((r) => yonlendir(b.e.db, r.olay as string) === olayKayit.kod)
    .map((r) => satirCevir(b, r, olayKayit, tarih));

  return {
    kisaVadeli: satirlar.filter((s) => !s.silindi && s.tur === 'kisa_vadeli'),
    kalici: satirlar.filter((s) => !s.silindi && s.tur === 'kalici'),
    silinenler: satirlar.filter((s) => s.silindi),
    yerAdaylari: yerAdaylariOku(b.e),
  };
}

function tarihsizMi(t: EvrenTarihi | null): boolean {
  return !t || t.bicim === 'bilinmiyor' || !t.ifade.trim();
}

export function mekanIzKatmanlari(b: KaliciIzBaglami, yer: string): MekanIzKatmani[] {
  const yerKayit = aktifKayitOku(b.e, yer);
  if (!yerKayit) return [];

  const satirlar = b.e.db
    .selectObjects('SELECT rowid, * FROM iz_kayitlari WHERE silindi IS NULL ORDER BY olusturma, rowid')
    .filter((r) => r.yer && yonlendir(b.e.db, r.yer as string) === yerKayit.kod);

  const gecici: { iz: IzKaydi; olusturma: number; sira: number }[] = [];
  for (const r of satirlar) {
    const olayKayit = aktifKayitOku(b.e, r.olay as string);
    // Silinen olayın izleri listelenmez, olay geri yüklenince döner.
    if (!olayKayit || olayKayit.tur !== 'olay') continue;
    const tarih = b.olayTarihi(olayKayit.kod);
    gecici.push({
      iz: satirCevir(b, r, olayKayit, tarih),
      olusturma: Number(r.olusturma),
      sira: Number(r.rowid),
    });
  }

  gecici.sort((a, c) => {
    const ta = tarihsizMi(a.iz.olayTarihi);
    const tc = tarihsizMi(c.iz.olayTarihi);
    if (ta !== tc) return ta ? 1 : -1;
    const sa = siraAnahtari(a.iz.olayTarihi);
    const sc = siraAnahtari(c.iz.olayTarihi);
    if (sa !== sc) return sa - sc;
    return a.olusturma - c.olusturma || a.sira - c.sira;
  });

  const tarihliler = new Map<string, MekanIzKatmani>();
  const tarihsizIzler: IzKaydi[] = [];

  for (const { iz } of gecici) {
    if (tarihsizMi(iz.olayTarihi)) {
      tarihsizIzler.push(iz);
      continue;
    }
    const ifade = iz.olayTarihi!.ifade.trim();
    const mevcut = tarihliler.get(ifade);
    if (mevcut) {
      mevcut.izler.push(iz);
    } else {
      const s = siraAnahtari(iz.olayTarihi);
      tarihliler.set(ifade, {
        anahtar: ifade,
        baslik: ifade,
        tarihsiz: false,
        siraAnahtari: Number.isFinite(s) ? s : null,
        izler: [iz],
      });
    }
  }

  const katmanlar = [...tarihliler.values()];
  if (tarihsizIzler.length > 0) {
    katmanlar.push({
      anahtar: 'tarihsiz',
      baslik: 'Tarihsiz',
      tarihsiz: true,
      siraAnahtari: null,
      izler: tarihsizIzler,
    });
  }
  return katmanlar;
}

export function catismaSatiri(
  e: EvrenVt,
  nesne: string,
  alan: string,
  degerler: { islem: string; deger: unknown; yazi?: string; kurulum: string; zaman: number }[],
  kayitAdi: (k: string) => string,
): Catisma {
  const r = e.db.selectObject('SELECT olay, ad FROM iz_kayitlari WHERE kod=?', [nesne]);
  const olay = r ? yonlendir(e.db, r.olay as string) : null;
  return {
    tur: 'alan',
    nesne,
    alan,
    nesneTuru: 'kayit',
    kayit: olay,
    baslik: r ? `${kayitAdi(olay!)} · ${r.ad as string}` : 'İz kaydı',
    alanEtiketi: alan === 'iz_kaydi' ? 'Geçmişin izi' : 'İz kaydının kaldırılması',
    degerler: degerler.map((d) => {
      if (alan === 'iz_kaydi_silindi') return { ...d, yazi: d.deger ? 'Evet' : 'Hayır' };
      const k = d.deger as {
        tur?: KaliciIzTuru;
        ad?: string;
        yer?: string | null;
        bitis?: EvrenTarihi | null;
        gercekKoken?: string;
        anlatilanHikaye?: string;
      } | null;
      return {
        ...d,
        yazi: k
          ? [
              k.ad ?? '',
              k.tur === 'kisa_vadeli' ? 'Kısa vadeli sonuç' : 'Kalıcı iz',
              k.yer ? `yer: ${kayitAdi(k.yer)}` : '',
              k.bitis?.ifade ? `bitiş: ${k.bitis.ifade}` : '',
              k.gercekKoken ? `köken: ${k.gercekKoken}` : '',
              k.anlatilanHikaye ? `anlatılan: ${k.anlatilanHikaye}` : '',
            ]
              .filter(Boolean)
              .join(' · ')
          : '(boş)',
      };
    }),
  };
}

export function catismaCozumGirdisi(nesne: string, alan: string, deger: unknown): IslemGirdisi {
  if (alan === 'iz_kaydi') {
    const k = deger as Record<string, unknown>;
    return { tur: 'iz_kaydi_yaz', veri: { kod: nesne, ...k, cozum: true } };
  }
  return { tur: deger ? 'iz_kaydi_sil' : 'iz_kaydi_geri_yukle', veri: { kod: nesne, cozum: true } };
}
