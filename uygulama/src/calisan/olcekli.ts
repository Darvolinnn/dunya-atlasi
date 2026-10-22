import { sayiGirdisi } from '../alan/nicelik';
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { EvrenVt } from './evren-vt';
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { donusumGecerli, olcektenDonusum, type Donusum, type Nokta } from '../alan/hizalama';
import {
  konturHesapla,
  olcekBirimOrani,
  olcumHesapla,
  type OlcekliGeometriBaglami,
} from '../alan/olcekli';
import type {
  Catisma,
  OlcekliArazi,
  OlcekliAraziGirdisi,
  OlcekliHaritaDurumu,
  OlcekliHizKurali,
  OlcekliKonturSonucu,
  OlcekliOlcekTanimi,
  OlcekliOlcumSonucu,
} from '../veri/api';

type CatismaDegeri = Extract<Catisma, { tur: 'alan' }>['degerler'][number];

export interface OlcekliBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar?: string[]): void;
}

export function haritaNesneAnahtari(harita: string): string {
  return `olcekli:${harita}`;
}

export function nesnedenHaritaKodu(nesne: string): string {
  return nesne.startsWith('olcekli:') ? nesne.slice('olcekli:'.length) : nesne;
}

function noktaTemizle(p: unknown): [number, number] | null {
  if (!Array.isArray(p) || p.length < 2) return null;
  const x = Number(p[0]);
  const y = Number(p[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

export function olcekTemizle(girdi: unknown): OlcekliOlcekTanimi | null {
  if (!girdi || typeof girdi !== 'object') return null;
  const g = girdi as Partial<OlcekliOlcekTanimi>;
  const p1 = noktaTemizle(g.p1);
  const p2 = noktaTemizle(g.p2);
  const mesafe = Number(g.mesafe);
  const birim = typeof g.birim === 'string' ? g.birim.trim().slice(0, 80) : '';
  const molaVarsayimi = typeof g.molaVarsayimi === 'string' ? g.molaVarsayimi.trim().slice(0, 300) : '';
  if (!p1 || !p2 || !(Number.isFinite(mesafe) && mesafe > 0) || !birim) return null;
  if (Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) <= 1e-9) return null;
  return {
    p1,
    p2,
    mesafe,
    birim,
    ...(molaVarsayimi ? { molaVarsayimi } : {}),
  };
}

export function hizKuraliListesiTemizle(girdi: unknown): OlcekliHizKurali[] {
  if (!Array.isArray(girdi)) return [];
  const sonuc: OlcekliHizKurali[] = [];
  for (const ham of girdi.slice(0, 100)) {
    if (!ham || typeof ham !== 'object') continue;
    const k = ham as Partial<OlcekliHizKurali>;
    const ulasim = typeof k.ulasim === 'string' ? k.ulasim.trim().slice(0, 80) : '';
    if (!ulasim) continue;
    const mevsim = typeof k.mevsim === 'string' && k.mevsim.trim() ? k.mevsim.trim().slice(0, 80) : null;
    const gecilmez = !!k.gecilmez;
    const hizSayi = k.gunlukHiz !== null && k.gunlukHiz !== undefined ? Number(k.gunlukHiz) : NaN;
    const gunlukHiz = !gecilmez && Number.isFinite(hizSayi) && hizSayi > 0 ? hizSayi : null;
    if (!gecilmez && gunlukHiz === null) continue;
    sonuc.push({ ulasim, mevsim, gecilmez, gunlukHiz });
  }
  return sonuc;
}

function hizKurallariniDogrula(girdi: unknown): OlcekliHizKurali[] {
  if (!Array.isArray(girdi)) throw new Error('Hız kuralları geçersiz.');
  const sonuc: OlcekliHizKurali[] = [];
  for (const ham of girdi) {
    if (!ham || typeof ham !== 'object') throw new Error('Geçersiz hız kuralı.');
    const k = ham as Partial<OlcekliHizKurali>;
    const ulasim = typeof k.ulasim === 'string' ? k.ulasim.trim().slice(0, 80) : '';
    if (!ulasim) throw new Error('Hız kuralında ulaşım biçimini belirtin.');
    const mevsim = typeof k.mevsim === 'string' && k.mevsim.trim() ? k.mevsim.trim().slice(0, 80) : null;
    const gecilmez = !!k.gecilmez;
    let gunlukHiz: number | null = null;
    if (!gecilmez) {
      const n = Number(k.gunlukHiz);
      if (!(Number.isFinite(n) && n > 0)) {
        throw new Error(`“${ulasim}” için günlük ilerleme hızı sıfırdan büyük bir sayı olmalı ya da “geçilmez” işaretlenmeli.`);
      }
      gunlukHiz = n;
    }
    sonuc.push({ ulasim, mevsim, gecilmez, gunlukHiz });
  }
  return sonuc;
}

export interface AraziSaklananDeger {
  harita: string;
  ad: string;
  cizim: string | null;
  noktalar: [number, number][];
  kurallar: OlcekliHizKurali[];
}

export function araziDegerTemizle(girdi: unknown): AraziSaklananDeger | null {
  if (!girdi || typeof girdi !== 'object') return null;
  const g = girdi as Partial<AraziSaklananDeger>;
  const harita = typeof g.harita === 'string' ? g.harita.trim() : '';
  const ad = typeof g.ad === 'string' ? g.ad.trim().slice(0, 120) : '';
  const cizim = typeof g.cizim === 'string' && g.cizim.trim() ? g.cizim.trim() : null;
  const noktalar = Array.isArray(g.noktalar)
    ? g.noktalar.map(noktaTemizle).filter((x): x is [number, number] => x !== null)
    : [];
  const kurallar = hizKuraliListesiTemizle(g.kurallar);
  if (!harita || !ad) return null;
  return { harita, ad, cizim, noktalar, kurallar };
}

function haritaSatiriOku(db: Database, harita: string) {
  if (!harita || !kodGecerliMi(harita)) throw new Error('Harita bulunamadı.');
  const r = db.selectObject('SELECT kod, ad, yer, en, boy, katmanlar FROM haritalar WHERE kod=? AND silindi IS NULL', [harita]);
  if (!r) throw new Error('Harita bulunamadı.');
  return {
    kod: r.kod as string,
    ad: r.ad as string,
    yer: (r.yer as string) ?? null,
    en: Number(r.en),
    boy: Number(r.boy),
    katmanlar: r.katmanlar as string,
  };
}

function katmanDonusumuOku(katmanlarJson: string, katmanKodu?: string | null): Donusum | null {
  if (!katmanKodu || !katmanKodu.trim()) return null;
  let katmanlar: Record<string, unknown>[] = [];
  try {
    katmanlar = JSON.parse(katmanlarJson) as Record<string, unknown>[];
  } catch {
    throw new Error('Harita katmanları okunamadı.');
  }
  const k = katmanlar.find((x) => x.kod === katmanKodu.trim() && !x.silindi);
  if (!k) throw new Error('Harita katmanı bulunamadı.');
  return donusumGecerli(k.donusum)
    ? k.donusum
    : olcektenDonusum(Number(k.x ?? 0), Number(k.y ?? 0), Number(k.olcek ?? 1));
}

function cizimNoktalariOku(db: Database, harita: string, cizim: string | null, yedekNoktalar: [number, number][]): [number, number][] {
  if (cizim) {
    const r = db.selectObject('SELECT noktalar FROM cizimler WHERE kod=? AND harita=? AND silindi IS NULL', [cizim, harita]);
    if (r && typeof r.noktalar === 'string') {
      try {
        const n = (JSON.parse(r.noktalar) as unknown[]).map(noktaTemizle).filter((x): x is [number, number] => x !== null);
        if (n.length >= 3) return n;
      } catch {
        // Yedek noktalara düş
      }
    }
  }
  return yedekNoktalar;
}

function catismaliMi(db: Database, nesne: string, alan: string): boolean {
  return Number(db.selectValue('SELECT count(*) FROM alan_yazanlari WHERE nesne=? AND alan=?', [nesne, alan]) ?? 0) > 1;
}

export function olcekliHaritaDurumu(e: EvrenVt, harita: string): OlcekliHaritaDurumu {
  const hr = haritaSatiriOku(e.db, harita);
  const ustSatir = e.db.selectObject('SELECT olcek, varsayilan_hizlar FROM olcekli_olcekler WHERE harita=?', [harita]);

  let olcek: OlcekliOlcekTanimi | null = null;
  let varsayilanHizlar: OlcekliHizKurali[] = [];
  if (ustSatir) {
    if (typeof ustSatir.olcek === 'string' && ustSatir.olcek) {
      try { olcek = olcekTemizle(JSON.parse(ustSatir.olcek)); } catch { olcek = null; }
    }
    if (typeof ustSatir.varsayilan_hizlar === 'string' && ustSatir.varsayilan_hizlar) {
      try { varsayilanHizlar = hizKuraliListesiTemizle(JSON.parse(ustSatir.varsayilan_hizlar)); } catch { varsayilanHizlar = []; }
    }
  }

  const araziSatirlari = e.db.selectObjects(
    'SELECT kod, deger FROM olcekli_araziler WHERE harita=? AND silindi=0 ORDER BY kod',
    [harita],
  );
  const araziler: OlcekliArazi[] = [];
  for (const r of araziSatirlari) {
    const kod = r.kod as string;
    let d: AraziSaklananDeger | null = null;
    try { d = araziDegerTemizle(JSON.parse(r.deger as string)); } catch { d = null; }
    if (!d) continue;
    const noktalar = cizimNoktalariOku(e.db, harita, d.cizim, d.noktalar);
    if (noktalar.length < 3) continue;
    const araziCatismali =
      catismaliMi(e.db, kod, 'olcekli_arazi') || catismaliMi(e.db, kod, 'olcekli_arazi_silindi');
    araziler.push({
      kod,
      harita,
      ad: d.ad,
      cizim: d.cizim,
      noktalar,
      kurallar: d.kurallar,
      catismali: araziCatismali,
    });
  }

  const anahtar = haritaNesneAnahtari(harita);
  const olcekCatismali =
    catismaliMi(e.db, anahtar, 'olcekli_olcek') ||
    catismaliMi(e.db, anahtar, 'olcekli_varsayilan_hiz') ||
    araziler.some((a) => a.catismali);

  return {
    harita,
    en: hr.en,
    boy: hr.boy,
    olcek,
    varsayilanHizlar,
    araziler,
    catismali: olcekCatismali,
  };
}

export function olcekliOlcekYaz(
  b: OlcekliBaglami,
  harita: string,
  olcekGirdi: OlcekliOlcekTanimi | null,
  varsayilanHizlarGirdi?: OlcekliHizKurali[],
): void {
  const hr = haritaSatiriOku(b.e.db, harita);
  let temizOlcek: OlcekliOlcekTanimi | null = null;
  if (olcekGirdi !== null) {
    const p1 = noktaTemizle(olcekGirdi?.p1);
    const p2 = noktaTemizle(olcekGirdi?.p2);
    if (!p1 || !p2) throw new Error('Ölçek için haritada iki geçerli nokta seçin.');
    if (Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) <= 1e-9) {
      throw new Error('Ölçek noktaları birbirinden farklı olmalı.');
    }
    const mesafe = Number(olcekGirdi.mesafe);
    if (!(Number.isFinite(mesafe) && mesafe > 0)) {
      throw new Error('Ölçek mesafesi sıfırdan büyük bir sayı olmalı.');
    }
    const birim = typeof olcekGirdi.birim === 'string' ? olcekGirdi.birim.trim().slice(0, 80) : '';
    if (!birim) throw new Error('Ölçek birimini yazın (ör. fersah, menzil).');
    const molaVarsayimi =
      typeof olcekGirdi.molaVarsayimi === 'string' && olcekGirdi.molaVarsayimi.trim()
        ? olcekGirdi.molaVarsayimi.trim().slice(0, 300)
        : undefined;
    temizOlcek = { p1, p2, mesafe, birim, ...(molaVarsayimi ? { molaVarsayimi } : {}) };
    if (olcekBirimOrani(temizOlcek) === null) throw new Error('Geçersiz ölçek tanımı.');
  }

  const girdiler: IslemGirdisi[] = [
    {
      tur: 'olcekli_olcek_yaz',
      veri: { harita, haritaAd: hr.ad, olcek: temizOlcek },
    },
  ];
  if (varsayilanHizlarGirdi !== undefined) {
    const temizVarsayilan = hizKurallariniDogrula(varsayilanHizlarGirdi);
    girdiler.push({
      tur: 'olcekli_varsayilan_hiz_yaz',
      veri: { harita, haritaAd: hr.ad, varsayilanHizlar: temizVarsayilan },
    });
  }
  b.yaz(girdiler, hr.yer ? [hr.yer] : []);
}

export function olcekliVarsayilanHizYaz(
  b: OlcekliBaglami,
  harita: string,
  varsayilanHizlarGirdi: OlcekliHizKurali[],
): void {
  const hr = haritaSatiriOku(b.e.db, harita);
  const temizVarsayilan = hizKurallariniDogrula(varsayilanHizlarGirdi);
  b.yaz(
    [{ tur: 'olcekli_varsayilan_hiz_yaz', veri: { harita, haritaAd: hr.ad, varsayilanHizlar: temizVarsayilan } }],
    hr.yer ? [hr.yer] : [],
  );
}

export function olcekliAraziYaz(
  b: OlcekliBaglami,
  harita: string,
  kodGirdi: string | null | undefined,
  tanim: OlcekliAraziGirdisi,
): { kod: string } {
  const hr = haritaSatiriOku(b.e.db, harita);
  if (!tanim || typeof tanim !== 'object') throw new Error('Geçersiz arazi tanımı.');
  const ad = typeof tanim.ad === 'string' ? tanim.ad.trim().slice(0, 120) : '';
  if (!ad) throw new Error('Arazi türüne bir ad verin.');

  const cizim = typeof tanim.cizim === 'string' && tanim.cizim.trim() ? tanim.cizim.trim() : null;
  let noktalar = Array.isArray(tanim.noktalar)
    ? tanim.noktalar.map(noktaTemizle).filter((x): x is [number, number] => x !== null)
    : [];

  if (cizim) {
    const cr = b.e.db.selectObject(
      "SELECT noktalar FROM cizimler WHERE kod=? AND harita=? AND bicim='bolge' AND silindi IS NULL",
      [cizim, harita],
    );
    if (!cr && noktalar.length < 3) {
      throw new Error('Araziye bağlanan bölge çizimi bulunamadı.');
    }
    if (cr && noktalar.length < 3) {
      noktalar = (JSON.parse(cr.noktalar as string) as unknown[])
        .map(noktaTemizle)
        .filter((x): x is [number, number] => x !== null);
    }
  }
  if (noktalar.length < 3) {
    throw new Error('Arazi alanı en az üç köşeli bir çokgen olmalı.');
  }

  const kurallar = hizKurallariniDogrula(tanim.kurallar);
  const kod = kodGirdi && kodGecerliMi(kodGirdi) ? kodGirdi : yeniKod();
  const deger: AraziSaklananDeger = { harita, ad, cizim, noktalar, kurallar };

  b.yaz(
    [{ tur: 'olcekli_arazi_yaz', veri: { kod, harita, haritaAd: hr.ad, deger } }],
    hr.yer ? [hr.yer] : [],
  );
  return { kod };
}

export function olcekliAraziSil(b: OlcekliBaglami, kod: string, geriYukle = false): void {
  if (!kod || !kodGecerliMi(kod)) throw new Error('Arazi kaydı bulunamadı.');
  const r = b.e.db.selectObject('SELECT harita, deger FROM olcekli_araziler WHERE kod=?', [kod]);
  if (!r) throw new Error('Arazi kaydı bulunamadı.');
  const harita = r.harita as string;
  const hr = b.e.db.selectObject('SELECT ad, yer FROM haritalar WHERE kod=?', [harita]);
  let araziAd = 'Arazi';
  try { araziAd = (JSON.parse(r.deger as string) as { ad?: string }).ad || 'Arazi'; } catch { /* yoksay */ }
  b.yaz(
    [
      {
        tur: 'olcekli_arazi_sil',
        veri: { kod, harita, haritaAd: (hr?.ad as string) ?? 'Harita', araziAd, silindi: !geriYukle },
      },
    ],
    hr?.yer ? [hr.yer as string] : [],
  );
}

function geometriBaglamiHazirla(e: EvrenVt, harita: string): {
  durum: OlcekliHaritaDurumu;
  baglam: OlcekliGeometriBaglami;
  katmanlarJson: string;
} {
  const hr = haritaSatiriOku(e.db, harita);
  const durum = olcekliHaritaDurumu(e, harita);
  return {
    durum,
    baglam: {
      en: durum.en,
      boy: durum.boy,
      olcek: durum.olcek,
      varsayilanHizlar: durum.varsayilanHizlar,
      araziler: durum.araziler.map((a) => ({
        kod: a.kod,
        ad: a.ad,
        noktalar: a.noktalar,
        kurallar: a.kurallar,
      })),
    },
    katmanlarJson: hr.katmanlar,
  };
}

export function olcekliOlcum(
  e: EvrenVt,
  a: {
    harita: string;
    baslangic: [number, number];
    bitis: [number, number];
    ulasim?: string | null;
    mevsim?: string | null;
    katman?: string | null;
    izgaraBolumu?: number;
  },
): OlcekliOlcumSonucu {
  const bas = noktaTemizle(a.baslangic);
  const bit = noktaTemizle(a.bitis);
  if (!bas || !bit) throw new Error('Ölçmek için geçerli bir başlangıç ve bitiş noktası seçin.');
  const { baglam, katmanlarJson } = geometriBaglamiHazirla(e, a.harita);
  const katmanDonusumu = katmanDonusumuOku(katmanlarJson, a.katman);
  return olcumHesapla(baglam, bas as Nokta, bit as Nokta, {
    ulasim: a.ulasim,
    mevsim: a.mevsim,
    katmanDonusumu,
    izgaraBolumu: a.izgaraBolumu,
  });
}

export function olcekliKonturlar(
  e: EvrenVt,
  a: {
    harita: string;
    baslangic: [number, number];
    ulasim: string;
    mevsim?: string | null;
    katman?: string | null;
    izgaraBolumu?: number;
  },
): OlcekliKonturSonucu {
  const bas = noktaTemizle(a.baslangic);
  if (!bas) throw new Error('Erişim konturları için geçerli bir başlangıç noktası seçin.');
  const ulasim = typeof a.ulasim === 'string' ? a.ulasim.trim() : '';
  if (!ulasim) throw new Error('Erişim konturları için ulaşım biçimini belirtin.');
  const { baglam, katmanlarJson } = geometriBaglamiHazirla(e, a.harita);
  const katmanDonusumu = katmanDonusumuOku(katmanlarJson, a.katman);
  return konturHesapla(baglam, bas as Nokta, ulasim, {
    mevsim: a.mevsim,
    katmanDonusumu,
    izgaraBolumu: a.izgaraBolumu,
  });
}

function hizKuraliOzeti(kurallar: OlcekliHizKurali[]): string {
  if (!kurallar.length) return '(kural yok)';
  return kurallar
    .map((k) => {
      const m = k.mevsim ? ` (${k.mevsim})` : '';
      return `${k.ulasim}${m}: ${k.gecilmez ? 'geçilmez' : `${sayiGirdisi(k.gunlukHiz)} birim/gün`}`;
    })
    .join(', ');
}

function catismaDegerYazisi(alan: string, deger: unknown): string {
  if (alan === 'olcekli_olcek') {
    const o = olcekTemizle(deger);
    if (!o) return '(ölçeksiz)';
    return `${o.mesafe} ${o.birim}${o.molaVarsayimi ? ` · ${o.molaVarsayimi}` : ''}`;
  }
  if (alan === 'olcekli_varsayilan_hiz') {
    return hizKuraliOzeti(hizKuraliListesiTemizle(deger));
  }
  if (alan === 'olcekli_arazi') {
    const a = araziDegerTemizle(deger);
    if (!a) return '(boş)';
    return `${a.ad} · ${hizKuraliOzeti(a.kurallar)}`;
  }
  if (alan === 'olcekli_arazi_silindi') {
    return deger ? 'Kaldırıldı' : 'Etkin';
  }
  return String(deger ?? '');
}

export function catismaSatiri(
  e: EvrenVt,
  nesne: string,
  alan: string,
  degerler: CatismaDegeri[],
): Catisma {
  let harita = '';
  if (alan === 'olcekli_olcek' || alan === 'olcekli_varsayilan_hiz') {
    harita = nesnedenHaritaKodu(nesne);
  } else {
    const r = e.db.selectObject('SELECT harita FROM olcekli_araziler WHERE kod=?', [nesne]);
    harita = (r?.harita as string) ?? '';
  }
  const hr = harita ? e.db.selectObject('SELECT ad, yer FROM haritalar WHERE kod=?', [harita]) : undefined;
  const alanEtiketi =
    alan === 'olcekli_olcek'
      ? 'Harita ölçeği'
      : alan === 'olcekli_varsayilan_hiz'
        ? 'Varsayılan arazi hızı'
        : alan === 'olcekli_arazi'
          ? 'Arazi hız kuralları'
          : 'Arazinin kaldırılması';
  return {
    tur: 'alan',
    nesne,
    alan,
    nesneTuru: hr?.yer ? 'kayit' : 'evren',
    kayit: (hr?.yer as string) ?? null,
    baslik: hr?.ad ? `“${hr.ad as string}” haritası` : 'Ölçekli harita',
    alanEtiketi,
    degerler: degerler.map((d) => ({ ...d, yazi: catismaDegerYazisi(alan, d.deger) })),
  };
}

export function cozumGirdisi(e: EvrenVt, nesne: string, alan: string, deger: unknown): IslemGirdisi {
  if (alan === 'olcekli_olcek') {
    const harita = nesnedenHaritaKodu(nesne);
    const hr = e.db.selectObject('SELECT ad FROM haritalar WHERE kod=?', [harita]);
    return {
      tur: 'olcekli_olcek_yaz',
      veri: { harita, haritaAd: (hr?.ad as string) ?? '', olcek: olcekTemizle(deger), cozum: true },
    };
  }
  if (alan === 'olcekli_varsayilan_hiz') {
    const harita = nesnedenHaritaKodu(nesne);
    const hr = e.db.selectObject('SELECT ad FROM haritalar WHERE kod=?', [harita]);
    return {
      tur: 'olcekli_varsayilan_hiz_yaz',
      veri: { harita, haritaAd: (hr?.ad as string) ?? '', varsayilanHizlar: hizKuraliListesiTemizle(deger), cozum: true },
    };
  }
  if (alan === 'olcekli_arazi') {
    const temiz = araziDegerTemizle(deger);
    const r = e.db.selectObject('SELECT harita FROM olcekli_araziler WHERE kod=?', [nesne]);
    const harita = temiz?.harita ?? (r?.harita as string) ?? '';
    const hr = e.db.selectObject('SELECT ad FROM haritalar WHERE kod=?', [harita]);
    return {
      tur: 'olcekli_arazi_yaz',
      veri: { kod: nesne, harita, haritaAd: (hr?.ad as string) ?? '', deger: temiz, cozum: true },
    };
  }
  const r = e.db.selectObject('SELECT harita FROM olcekli_araziler WHERE kod=?', [nesne]);
  const harita = (r?.harita as string) ?? '';
  const hr = e.db.selectObject('SELECT ad FROM haritalar WHERE kod=?', [harita]);
  return {
    tur: 'olcekli_arazi_sil',
    veri: { kod: nesne, harita, haritaAd: (hr?.ad as string) ?? '', silindi: !!deger, cozum: true },
  };
}
