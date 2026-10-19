// F07 Kurumlar kararları nasıl uygular (§16.1 F07, §3.10, §3.8):
// Bir olaya bağlı süreçte her adım için sorumlu (kişi ya da makam kaydı) yazar tarafından seçilir.
// Süreç için "durdurabilir" ve "fiilî veto" listeleri: kayıt seçimi + kısa not.
// Tasarım notu (en sade yorum): Sorumlular ve durdurabilir / fiilî veto listeleri olaya bağlı süreç
// (olay + süreç kuralı) bazında `surec_sorumlulari` tablosunda tutulur. Süreç bağı kaldırılınca bilgiler
// silinmez, yalnızca bağlı süreçlerle listelenir; bağ geri kurulunca yeniden görünür. Bu bilgiler adımların
// durumlarını ya da sürecin sonucunu hiçbir şekilde değiştirmez; kararı yazar kaydeder (K1).
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type {
  Catisma,
  KisaKayit,
  OlaySurecSorumlulari,
  SurecEngelSatiri,
  SurecEngelTuru,
  SurecSorumluSureci,
} from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { SUREC_OLAYLARI } from './surec';

export interface SurecSorumluBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar?: string[]): void;
}

export const SORUMLU_TURLERI = ['karakter', 'makam'] as const;
export const ENGEL_TURLERI: { kod: SurecEngelTuru; ad: string }[] = [
  { kod: 'durdurabilir', ad: 'Durdurabilir' },
  { kod: 'veto', ad: 'Fiilî veto' },
];
const EN_COK_ENGEL = 30;

interface SakliEngel {
  kod: string;
  kayit: string;
  not: string;
}

function kisaKayit(e: EvrenVt, kod: string): KisaKayit & { silindi: boolean } {
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT kod, ad, tur, silindi FROM kayitlar WHERE kod=?', [k]);
  if (!r) return { kod: k, ad: 'Silinmiş kayıt', tur: 'diger', silindi: true };
  if (r.silindi !== null) return { kod: k, ad: `${r.ad as string} (silinmiş)`, tur: r.tur as string, silindi: true };
  return { kod: k, ad: r.ad as string, tur: r.tur as string, silindi: false };
}

function aktifKayitKontrol(e: EvrenVt, kod: unknown, hata = 'Kayıt bulunamadı.'): { kod: string; ad: string; tur: string } {
  if (typeof kod !== 'string' || !kodGecerliMi(kod)) throw new Error(hata);
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  if (!r) throw new Error(hata);
  return { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string };
}

function olayBagKontrol(e: EvrenVt, olayGirdi: string, kuralGirdi: string): {
  olay: string;
  kural: string;
  kuralAd: string;
  adimlar: { kod: string; ad: string }[];
} {
  const olay = aktifKayitKontrol(e, olayGirdi, 'Olay kaydı bulunamadı.');
  if (!SUREC_OLAYLARI.includes(olay.tur)) throw new Error('Süreç yalnızca bir olaya bağlanır.');
  if (typeof kuralGirdi !== 'string' || !kodGecerliMi(kuralGirdi)) throw new Error('Süreç kuralı bulunamadı.');
  const kr = e.db.selectObject('SELECT kod, ad, adimlar FROM surec_kurallari WHERE kod=? AND silindi IS NULL', [kuralGirdi]);
  if (!kr) throw new Error('Süreç kuralı bulunamadı.');
  const bagli = e.db.selectValue(
    'SELECT 1 FROM surec_baglari WHERE olay=? AND kural=? AND silindi IS NULL',
    [olay.kod, kuralGirdi],
  );
  if (bagli === undefined) throw new Error('Kural bu olaya bağlı değil.');
  return {
    olay: olay.kod,
    kural: kuralGirdi,
    kuralAd: kr.ad as string,
    adimlar: JSON.parse(kr.adimlar as string) as { kod: string; ad: string }[],
  };
}

function temizMetin(s: unknown, enCok: number): string {
  const x = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (x.length > enCok) throw new Error(`Not en çok ${enCok} harf olabilir.`);
  return x;
}

function sakliEngellerOku(e: EvrenVt, olay: string, kural: string, tur: SurecEngelTuru): SakliEngel[] {
  const sutun = tur === 'durdurabilir' ? 'durdurabilir' : 'veto';
  const ham = e.db.selectValue(
    `SELECT ${sutun} FROM surec_sorumlulari WHERE olay=? AND kural=?`,
    [olay, kural],
  ) as string | undefined;
  if (!ham) return [];
  try {
    const d = JSON.parse(ham);
    return Array.isArray(d) ? (d as SakliEngel[]) : [];
  } catch {
    return [];
  }
}

export function surecAdimSorumlusuYaz(
  b: SurecSorumluBaglami,
  olayGirdi: string,
  kuralGirdi: string,
  adim: string,
  sorumluGirdi: string | null,
): void {
  const { olay, kural, kuralAd, adimlar } = olayBagKontrol(b.e, olayGirdi, kuralGirdi);
  const a = adimlar.find((x) => x.kod === adim);
  if (!a) throw new Error('Bu adım kuralda yok.');

  let sorumlu: string | null = null;
  if (sorumluGirdi !== null && sorumluGirdi !== '') {
    const sk = aktifKayitKontrol(b.e, sorumluGirdi, 'Sorumlu kaydı bulunamadı.');
    if (!SORUMLU_TURLERI.includes(sk.tur as (typeof SORUMLU_TURLERI)[number])) {
      throw new Error('Adım sorumlusu yalnızca bir kişi ya da makam kaydı olabilir.');
    }
    sorumlu = sk.kod;
  }

  const ham = b.e.db.selectValue(
    'SELECT sorumlular FROM surec_sorumlulari WHERE olay=? AND kural=?',
    [olay, kural],
  ) as string | undefined;
  const mevcut = ham ? (JSON.parse(ham) as Record<string, string>) : {};
  const onceki = mevcut[adim] ? (yonlendir(b.e.db, mevcut[adim]) as string) : null;
  if (onceki === sorumlu) return;

  const ilgili = [olay, ...(sorumlu ? [sorumlu] : [])];
  b.yaz(
    [{
      tur: 'surec_sorumlu_adim_yaz',
      veri: { olay, kural, adim, sorumlu, adimAd: a.ad, kuralAd },
    }],
    ilgili,
  );
}

export function surecEngelEkle(
  b: SurecSorumluBaglami,
  olayGirdi: string,
  kuralGirdi: string,
  tur: SurecEngelTuru,
  kayitGirdi: string,
  notGirdi = '',
): { kod: string } {
  const { olay, kural, kuralAd } = olayBagKontrol(b.e, olayGirdi, kuralGirdi);
  if (!ENGEL_TURLERI.some((x) => x.kod === tur)) throw new Error('Geçersiz liste türü.');
  const hedef = aktifKayitKontrol(b.e, kayitGirdi, 'Seçilen kayıt bulunamadı.');
  const not = temizMetin(notGirdi, 240);

  const mevcut = sakliEngellerOku(b.e, olay, kural, tur);
  if (mevcut.length >= EN_COK_ENGEL) {
    throw new Error(`En çok ${EN_COK_ENGEL} kayıt eklenebilir.`);
  }
  const kod = yeniKod();
  const liste: SakliEngel[] = [...mevcut, { kod, kayit: hedef.kod, not }];

  b.yaz(
    [{
      tur: 'surec_sorumlu_engel_yaz',
      veri: { olay, kural, engelTuru: tur, liste, kuralAd },
    }],
    [olay, hedef.kod],
  );
  return { kod };
}

export function surecEngelDegistir(
  b: SurecSorumluBaglami,
  olayGirdi: string,
  kuralGirdi: string,
  tur: SurecEngelTuru,
  kod: string,
  girdi: { kayit?: string; not?: string },
): void {
  const { olay, kural, kuralAd } = olayBagKontrol(b.e, olayGirdi, kuralGirdi);
  if (!ENGEL_TURLERI.some((x) => x.kod === tur)) throw new Error('Geçersiz liste türü.');
  const mevcut = sakliEngellerOku(b.e, olay, kural, tur);
  const idx = mevcut.findIndex((x) => x.kod === kod);
  if (idx < 0) throw new Error('Kayıt satırı bulunamadı.');

  const eski = mevcut[idx];
  const yeniKayit = girdi.kayit !== undefined
    ? aktifKayitKontrol(b.e, girdi.kayit, 'Seçilen kayıt bulunamadı.').kod
    : (yonlendir(b.e.db, eski.kayit) as string);
  const yeniNot = girdi.not !== undefined ? temizMetin(girdi.not, 240) : eski.not;
  if (yeniKayit === eski.kayit && yeniNot === eski.not) return;

  const liste = mevcut.map((x, i) => (i === idx ? { kod, kayit: yeniKayit, not: yeniNot } : x));
  b.yaz(
    [{
      tur: 'surec_sorumlu_engel_yaz',
      veri: { olay, kural, engelTuru: tur, liste, kuralAd },
    }],
    [olay, yeniKayit],
  );
}

export function surecEngelSil(
  b: SurecSorumluBaglami,
  olayGirdi: string,
  kuralGirdi: string,
  tur: SurecEngelTuru,
  kod: string,
): void {
  const { olay, kural, kuralAd } = olayBagKontrol(b.e, olayGirdi, kuralGirdi);
  if (!ENGEL_TURLERI.some((x) => x.kod === tur)) throw new Error('Geçersiz liste türü.');
  const mevcut = sakliEngellerOku(b.e, olay, kural, tur);
  const liste = mevcut.filter((x) => x.kod !== kod);
  if (liste.length === mevcut.length) throw new Error('Kayıt satırı bulunamadı.');

  b.yaz(
    [{
      tur: 'surec_sorumlu_engel_yaz',
      veri: { olay, kural, engelTuru: tur, liste, kuralAd },
    }],
    [olay],
  );
}

function engelSatirlariOku(e: EvrenVt, hamListe: SakliEngel[]): SurecEngelSatiri[] {
  return hamListe.map((x) => ({
    kod: x.kod,
    kayit: kisaKayit(e, x.kayit),
    not: x.not ?? '',
  }));
}

export function olaySurecSorumlulari(e: EvrenVt, olayGirdi: string): OlaySurecSorumlulari {
  const olay = aktifKayitKontrol(e, olayGirdi, 'Olay kaydı bulunamadı.');
  if (!SUREC_OLAYLARI.includes(olay.tur)) throw new Error('Süreç yalnızca bir olaya bağlanır.');

  const baglar = e.db.selectObjects(
    `SELECT b.kural, s.ad, s.adimlar FROM surec_baglari b JOIN surec_kurallari s ON s.kod=b.kural
     WHERE b.olay=? AND b.silindi IS NULL ORDER BY b.olusturma`,
    [olay.kod],
  );

  const catismalar = new Set(
    e.db
      .selectObjects(
        `SELECT alan FROM alan_yazanlari WHERE nesne=? AND alan LIKE 'surec_sorumlu_%'
         GROUP BY nesne, alan HAVING count(DISTINCT deger) > 1`,
        [olay.kod],
      )
      .map((r) => r.alan as string),
  );

  const surecler: SurecSorumluSureci[] = baglar.map((b) => {
    const kural = b.kural as string;
    const kuralAd = b.ad as string;
    const adimTanimlari = JSON.parse(b.adimlar as string) as { kod: string; ad: string }[];
    const r = e.db.selectObject(
      'SELECT sorumlular, durdurabilir, veto FROM surec_sorumlulari WHERE olay=? AND kural=?',
      [olay.kod, kural],
    );
    const hamSorumlular = r?.sorumlular ? (JSON.parse(r.sorumlular as string) as Record<string, string>) : {};
    const hamDurdurabilir = r?.durdurabilir ? (JSON.parse(r.durdurabilir as string) as SakliEngel[]) : [];
    const hamVeto = r?.veto ? (JSON.parse(r.veto as string) as SakliEngel[]) : [];

    const adimlar = adimTanimlari.map((a) => {
      const sk = hamSorumlular[a.kod];
      return {
        kod: a.kod,
        ad: a.ad,
        sorumlu: sk ? kisaKayit(e, sk) : null,
        catismali: catismalar.has(`surec_sorumlu_adim:${kural}:${a.kod}`),
      };
    });

    const catismali =
      adimlar.some((a) => a.catismali) ||
      catismalar.has(`surec_sorumlu_durdurabilir:${kural}`) ||
      catismalar.has(`surec_sorumlu_veto:${kural}`);

    return {
      kural,
      kuralAd,
      adimlar,
      durdurabilir: engelSatirlariOku(e, hamDurdurabilir),
      veto: engelSatirlariOku(e, hamVeto),
      catismali,
    };
  });

  return {
    olay: { kod: olay.kod, ad: olay.ad, tur: olay.tur },
    surecler,
    not: 'Sorumlular, durdurabilecek olanlar ve fiilî veto sahipleri yalnızca bilgi olarak tutulur; adımların durumunu ve sürecin sonucunu değiştirmez.',
  };
}

export function catismaSatiri(
  e: EvrenVt,
  nesne: string,
  alan: string,
  degerler: { islem: string; deger: unknown; yazi?: string; kurulum: string; zaman: number }[],
  kayitAdi: (k: string) => string,
): Catisma {
  if (alan.startsWith('surec_sorumlu_adim:')) {
    const [, kural, adim] = alan.split(':');
    const r = e.db.selectObject('SELECT ad, adimlar FROM surec_kurallari WHERE kod=?', [kural]);
    const a = r ? (JSON.parse(r.adimlar as string) as { kod: string; ad: string }[]).find((x) => x.kod === adim) : undefined;
    return {
      tur: 'alan',
      nesne,
      alan,
      nesneTuru: 'kayit',
      kayit: nesne,
      baslik: kayitAdi(nesne),
      alanEtiketi: `“${(r?.ad as string) ?? 'süreç'}” kuralında “${a?.ad ?? 'adım'}” adımının sorumlusu`,
      degerler: degerler.map((d) => ({
        ...d,
        yazi: typeof d.deger === 'string' && d.deger ? kayitAdi(d.deger) : 'Seçilmedi',
      })),
    };
  }
  const tur = alan.startsWith('surec_sorumlu_durdurabilir:') ? 'durdurabilir' : 'veto';
  const kural = alan.slice(alan.indexOf(':') + 1);
  const kuralAd = (e.db.selectValue('SELECT ad FROM surec_kurallari WHERE kod=?', [kural]) as string | undefined) ?? 'süreç';
  return {
    tur: 'alan',
    nesne,
    alan,
    nesneTuru: 'kayit',
    kayit: nesne,
    baslik: kayitAdi(nesne),
    alanEtiketi: `“${kuralAd}” kuralında ${tur === 'durdurabilir' ? 'durdurabilecek olanlar' : 'fiilî veto sahipleri'}`,
    degerler: degerler.map((d) => {
      const l = Array.isArray(d.deger) ? (d.deger as SakliEngel[]) : [];
      return {
        ...d,
        yazi: l.length
          ? l.map((x) => `${kayitAdi(x.kayit)}${x.not ? ` (${x.not})` : ''}`).join(', ')
          : '(boş)',
      };
    }),
  };
}

export function catismaCozumGirdisi(e: EvrenVt, nesne: string, alan: string, deger: unknown): IslemGirdisi {
  if (alan.startsWith('surec_sorumlu_adim:')) {
    const [, kural, adim] = alan.split(':');
    const r = e.db.selectObject('SELECT ad, adimlar FROM surec_kurallari WHERE kod=?', [kural]);
    const a = r ? (JSON.parse(r.adimlar as string) as { kod: string; ad: string }[]).find((x) => x.kod === adim) : undefined;
    return {
      tur: 'surec_sorumlu_adim_yaz',
      veri: {
        olay: nesne,
        kural,
        adim,
        sorumlu: typeof deger === 'string' ? deger : null,
        adimAd: a?.ad ?? 'adım',
        kuralAd: (r?.ad as string) ?? 'süreç',
        cozum: true,
      },
    };
  }
  const engelTuru: SurecEngelTuru = alan.startsWith('surec_sorumlu_durdurabilir:') ? 'durdurabilir' : 'veto';
  const kural = alan.slice(alan.indexOf(':') + 1);
  const kuralAd = (e.db.selectValue('SELECT ad FROM surec_kurallari WHERE kod=?', [kural]) as string | undefined) ?? 'süreç';
  return {
    tur: 'surec_sorumlu_engel_yaz',
    veri: {
      olay: nesne,
      kural,
      engelTuru,
      liste: Array.isArray(deger) ? deger : [],
      kuralAd,
      cozum: true,
    },
  };
}
