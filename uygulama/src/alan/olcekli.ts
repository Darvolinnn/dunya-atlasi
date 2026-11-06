// Ölçekli geometri kipi ve erişim konturları (§8.4, §15-2, §2.2 kural 1 ve 13, §2.3, D15–D17).
// Tasarım yorumu:
// - Harita uzayında iki nokta ve evren birimiyle ölçek tanımlanmadıkça hiçbir mesafe ya da süre uydurulmaz ("harita ölçeksiz").
// - Arazisi çizilmemiş yerlerde haritanın varsayılan hızı kullanılır; varsayılan hız girilmemişse orası "bilinmiyor" sayılır.
// - Birden çok arazi çokgeni aynı noktayı kapsıyorsa en kısıtlayıcı kural uygulanır (geçilmez > bilinmiyor > en düşük hız).
// - 1., 2. ve 3. gün erişim konturları aynı ızgaradaki en kısa varış sürelerinin (<=1, <=2, <=3 gün) alt kümeleridir; iç içedir.

import { uygula, type Donusum, type Nokta } from './hizalama';
import { sayiGirdisi } from './nicelik';
import type {
  OlcekliHizKurali,
  OlcekliKontur,
  OlcekliKonturSonucu,
  OlcekliOlcekTanimi,
  OlcekliOlcumSonucu,
  OlcekliSonucZarfi,
} from '../veri/api';

export interface OlcekliAraziPoligonu {
  kod?: string;
  ad: string;
  noktalar: Nokta[];
  kurallar: OlcekliHizKurali[];
}

export interface OlcekliGeometriBaglami {
  en: number;
  boy: number;
  olcek: OlcekliOlcekTanimi | null;
  varsayilanHizlar: OlcekliHizKurali[];
  araziler: OlcekliAraziPoligonu[];
}

export type NoktaHizDurumu =
  | { durum: 'hiz'; gunlukHiz: number }
  | { durum: 'gecilmez' }
  | { durum: 'bilinmiyor' };

const VARSAYILAN_MOLA = 'Günlük ilerleme hızları gece konaklamasını ve olağan molaları içerir.';
const KAPSAM_NOTU =
  'Sonuç yalnızca bu haritaya kayıtlı ölçeğe, araziye ve hız kurallarına dayanır. Yol bulunamaması, bunun evrende imkânsız olduğunu göstermez.';

function etiketNorm(deger: string | null | undefined): string {
  return (deger ?? '').trim().toLocaleLowerCase('tr-TR');
}

function yuvarla(sayi: number, basamak = 4): number {
  const carpan = 10 ** basamak;
  return Math.round(sayi * carpan) / carpan;
}

/** Katman üzerindeki bir görsel noktasını harita uzayına çevirir; dönüşüm yoksa noktayı olduğu gibi döndürür. */
export function katmandanUzaya(nokta: Nokta, katmanDonusumu?: Donusum | null): Nokta {
  return katmanDonusumu ? uygula(katmanDonusumu, nokta) : [nokta[0], nokta[1]];
}

/** Ölçek tanımından 1 harita uzayı biriminin kaç evren birimine karşılık geldiğini hesaplar. */
export function olcekBirimOrani(olcek: OlcekliOlcekTanimi | null | undefined): number | null {
  if (!olcek) return null;
  if (!Array.isArray(olcek.p1) || !Array.isArray(olcek.p2)) return null;
  if (!(typeof olcek.mesafe === 'number' && Number.isFinite(olcek.mesafe) && olcek.mesafe > 0)) return null;
  if (!olcek.birim || !olcek.birim.trim()) return null;
  const uzayUzakligi = Math.hypot(olcek.p2[0] - olcek.p1[0], olcek.p2[1] - olcek.p1[1]);
  if (!(Number.isFinite(uzayUzakligi) && uzayUzakligi > 1e-9)) return null;
  return olcek.mesafe / uzayUzakligi;
}

/** Harita uzayındaki (veya katman dönüşümü verilmiş) iki nokta arasındaki düz mesafeyi ölçek biriminde hesaplar. */
export function duzMesafeHesapla(
  olcek: OlcekliOlcekTanimi | null | undefined,
  a: Nokta,
  b: Nokta,
  katmanDonusumu?: Donusum | null,
): number | null {
  const oran = olcekBirimOrani(olcek);
  if (oran === null) return null;
  const ua = katmandanUzaya(a, katmanDonusumu);
  const ub = katmandanUzaya(b, katmanDonusumu);
  return yuvarla(Math.hypot(ub[0] - ua[0], ub[1] - ua[1]) * oran, 4);
}

/** Bir noktanın çokgenin içinde ya da kenarı üzerinde olup olmadığını sınar. */
export function noktaCokgendeMi(nokta: Nokta, cokgen: Nokta[]): boolean {
  if (!Array.isArray(cokgen) || cokgen.length < 3) return false;
  const [px, py] = nokta;
  let icerde = false;
  for (let i = 0, j = cokgen.length - 1; i < cokgen.length; j = i++) {
    const [xi, yi] = cokgen[i];
    const [xj, yj] = cokgen[j];
    const dx = xj - xi;
    const dy = yj - yi;
    const uzunlukKare = dx * dx + dy * dy;
    if (uzunlukKare > 1e-12) {
      const t = Math.max(0, Math.min(1, ((px - xi) * dx + (py - yi) * dy) / uzunlukKare));
      const kx = xi + t * dx;
      const ky = yi + t * dy;
      if (Math.hypot(px - kx, py - ky) <= 1e-7) return true;
    } else if (Math.hypot(px - xi, py - yi) <= 1e-7) {
      return true;
    }
    const kesisir = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (kesisir) icerde = !icerde;
  }
  return icerde;
}

/** Verilen kural listesinden ulaşım biçimi ve mevsime uygun hız durumunu çözer. */
export function kuraldanHizCoz(
  kurallar: OlcekliHizKurali[],
  ulasim: string,
  mevsim?: string | null,
): NoktaHizDurumu {
  const u = etiketNorm(ulasim);
  if (!u || !Array.isArray(kurallar) || kurallar.length === 0) return { durum: 'bilinmiyor' };
  const m = etiketNorm(mevsim);

  let eslesen: OlcekliHizKurali | undefined;
  if (m) {
    eslesen = kurallar.find((k) => etiketNorm(k.ulasim) === u && etiketNorm(k.mevsim) === m);
  }
  if (!eslesen) {
    eslesen = kurallar.find((k) => etiketNorm(k.ulasim) === u && !etiketNorm(k.mevsim));
  }
  if (!eslesen) return { durum: 'bilinmiyor' };
  if (eslesen.gecilmez) return { durum: 'gecilmez' };
  if (typeof eslesen.gunlukHiz === 'number' && Number.isFinite(eslesen.gunlukHiz) && eslesen.gunlukHiz > 0) {
    return { durum: 'hiz', gunlukHiz: eslesen.gunlukHiz };
  }
  return { durum: 'bilinmiyor' };
}

/** Harita uzayındaki bir noktada geçerli arazi hızını çözer; arazisiz yerde varsayılan hıza bakar. */
export function noktaHiziCoz(
  baglam: Pick<OlcekliGeometriBaglami, 'varsayilanHizlar' | 'araziler'>,
  nokta: Nokta,
  ulasim: string,
  mevsim?: string | null,
): NoktaHizDurumu {
  const kapsayan = baglam.araziler.filter((a) => noktaCokgendeMi(nokta, a.noktalar));
  if (kapsayan.length === 0) {
    return kuraldanHizCoz(baglam.varsayilanHizlar, ulasim, mevsim);
  }
  let enDusukHiz = Infinity;
  let bilinmeyenVar = false;
  for (const arazi of kapsayan) {
    const sonuc = kuraldanHizCoz(arazi.kurallar, ulasim, mevsim);
    if (sonuc.durum === 'gecilmez') return { durum: 'gecilmez' };
    if (sonuc.durum === 'bilinmiyor') {
      bilinmeyenVar = true;
    } else if (sonuc.gunlukHiz < enDusukHiz) {
      enDusukHiz = sonuc.gunlukHiz;
    }
  }
  if (bilinmeyenVar || !Number.isFinite(enDusukHiz)) return { durum: 'bilinmiyor' };
  return { durum: 'hiz', gunlukHiz: enDusukHiz };
}

function zarfOlustur(a: {
  olcek: OlcekliOlcekTanimi | null;
  hukum: OlcekliSonucZarfi['hukum'];
  ulasim: string | null;
  mevsim: string | null;
  izgaraAraligiUzay: number | null;
  izgaraAraligiBirim: number | null;
  bilinmeyenAlanVar: boolean;
}): OlcekliSonucZarfi {
  const uzayUzakligi = a.olcek ? Math.hypot(a.olcek.p2[0] - a.olcek.p1[0], a.olcek.p2[1] - a.olcek.p1[1]) : 0;
  const olcekOzeti =
    a.olcek && uzayUzakligi > 0
      ? `${sayiGirdisi(yuvarla(uzayUzakligi, 2))} harita birimi = ${sayiGirdisi(a.olcek.mesafe)} ${a.olcek.birim}`
      : null;
  return {
    kip: 'olcekli_geometri',
    sonucTuru: 'bu_varsayimlarla_tahmin',
    hukum: a.hukum,
    guncellik: 'guncel',
    olcekOzeti,
    birim: a.olcek?.birim ?? null,
    ulasim: a.ulasim?.trim() || null,
    mevsim: a.mevsim?.trim() || null,
    molaVarsayimi: a.olcek?.molaVarsayimi?.trim() || VARSAYILAN_MOLA,
    izgaraAraligiUzay: a.izgaraAraligiUzay !== null ? yuvarla(a.izgaraAraligiUzay, 4) : null,
    izgaraAraligiBirim: a.izgaraAraligiBirim !== null ? yuvarla(a.izgaraAraligiBirim, 4) : null,
    bilinmeyenAlanVar: a.bilinmeyenAlanVar,
    kapsamNotu: KAPSAM_NOTU,
    varsayimPaketi: null,
  };
}

function segmentSuresi(
  baglam: OlcekliGeometriBaglami,
  oran: number,
  a: Nokta,
  b: Nokta,
  ulasim: string,
  mevsim: string | null,
  ornekSayisi: number,
): { sureGun: number | null; mesafeBirim: number; bilinmeyen: boolean; gecilmez: boolean } {
  const uzayMesafe = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const mesafeBirim = uzayMesafe * oran;
  if (mesafeBirim <= 1e-9) {
    const h0 = noktaHiziCoz(baglam, a, ulasim, mevsim);
    if (h0.durum === 'gecilmez') return { sureGun: null, mesafeBirim: 0, bilinmeyen: false, gecilmez: true };
    if (h0.durum === 'bilinmiyor') return { sureGun: null, mesafeBirim: 0, bilinmeyen: true, gecilmez: false };
    return { sureGun: 0, mesafeBirim: 0, bilinmeyen: false, gecilmez: false };
  }
  const n = Math.max(1, ornekSayisi);
  const parcaMesafe = mesafeBirim / n;
  let toplamGun = 0;
  let bilinmeyen = false;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p: Nokta = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const h = noktaHiziCoz(baglam, p, ulasim, mevsim);
    if (h.durum === 'gecilmez') {
      return { sureGun: null, mesafeBirim, bilinmeyen, gecilmez: true };
    }
    if (h.durum === 'bilinmiyor') {
      bilinmeyen = true;
    } else {
      toplamGun += parcaMesafe / h.gunlukHiz;
    }
  }
  if (bilinmeyen) return { sureGun: null, mesafeBirim, bilinmeyen: true, gecilmez: false };
  return { sureGun: toplamGun, mesafeBirim, bilinmeyen: false, gecilmez: false };
}

const KOMSU_OFSETLERI: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
  [-2, -1], [-2, 1], [2, -1], [2, 1],
  [-1, -2], [1, -2], [-1, 2], [1, 2],
];

function izgaraBoyutlari(en: number, boy: number, izgaraBolumu?: number) {
  const bolum = Math.max(10, Math.min(80, Math.round(izgaraBolumu ?? 32)));
  const uzun = Math.max(en, boy, 1);
  const adimUzay = uzun / bolum;
  const izgaraEn = Math.max(2, Math.round(en / adimUzay));
  const izgaraBoy = Math.max(2, Math.round(boy / adimUzay));
  const dx = en / izgaraEn;
  const dy = boy / izgaraBoy;
  return { izgaraEn, izgaraBoy, dx, dy, izgaraAraligiUzay: (dx + dy) / 2 };
}

/** İki nokta arasında ölçekten düz mesafeyi ve arazi hızlarına göre en kısa süreyi hesaplar. */
export function olcumHesapla(
  baglam: OlcekliGeometriBaglami,
  baslangicGirdi: Nokta,
  bitisGirdi: Nokta,
  secenekler?: {
    ulasim?: string | null;
    mevsim?: string | null;
    katmanDonusumu?: Donusum | null;
    izgaraBolumu?: number;
  },
): OlcekliOlcumSonucu {
  const ulasim = secenekler?.ulasim?.trim() || null;
  const mevsim = secenekler?.mevsim?.trim() || null;
  const oran = olcekBirimOrani(baglam.olcek);
  if (oran === null || !baglam.olcek) {
    return {
      durum: 'olceksiz',
      uyari: 'Harita ölçeksiz olduğu için mesafe ya da süre görselden tahmin edilmez.',
      duzMesafe: null,
      yolMesafesi: null,
      enKisaGun: null,
      yolNoktalari: [],
      bilinmeyenAlanVar: false,
      zarf: zarfOlustur({
        olcek: null,
        hukum: 'denetlenemiyor',
        ulasim,
        mevsim,
        izgaraAraligiUzay: null,
        izgaraAraligiBirim: null,
        bilinmeyenAlanVar: false,
      }),
    };
  }

  const baslangic = katmandanUzaya(baslangicGirdi, secenekler?.katmanDonusumu);
  const bitis = katmandanUzaya(bitisGirdi, secenekler?.katmanDonusumu);
  const duzMesafe = yuvarla(Math.hypot(bitis[0] - baslangic[0], bitis[1] - baslangic[1]) * oran, 4);

  const { izgaraEn, izgaraBoy, dx, dy, izgaraAraligiUzay } = izgaraBoyutlari(
    baglam.en,
    baglam.boy,
    secenekler?.izgaraBolumu,
  );
  const izgaraAraligiBirim = izgaraAraligiUzay * oran;

  if (!ulasim) {
    return {
      durum: 'tamam',
      uyari: null,
      duzMesafe,
      yolMesafesi: duzMesafe,
      enKisaGun: null,
      yolNoktalari: [baslangic, bitis],
      bilinmeyenAlanVar: false,
      zarf: zarfOlustur({
        olcek: baglam.olcek,
        hukum: 'cozum_bulundu',
        ulasim: null,
        mevsim,
        izgaraAraligiUzay,
        izgaraAraligiBirim,
        bilinmeyenAlanVar: false,
      }),
    };
  }

  const baslangicHiz = noktaHiziCoz(baglam, baslangic, ulasim, mevsim);
  const bitisHiz = noktaHiziCoz(baglam, bitis, ulasim, mevsim);
  if (baslangicHiz.durum === 'bilinmiyor' || bitisHiz.durum === 'bilinmiyor') {
    return {
      durum: 'bilinmiyor',
      uyari: 'Başlangıç ya da varış noktasındaki arazinin hızı bilinmiyor, bu yüzden hız tahmin edilmedi.',
      duzMesafe,
      yolMesafesi: null,
      enKisaGun: null,
      yolNoktalari: [],
      bilinmeyenAlanVar: true,
      zarf: zarfOlustur({
        olcek: baglam.olcek,
        hukum: 'denetlenemiyor',
        ulasim,
        mevsim,
        izgaraAraligiUzay,
        izgaraAraligiBirim,
        bilinmeyenAlanVar: true,
      }),
    };
  }
  if (baslangicHiz.durum === 'gecilmez' || bitisHiz.durum === 'gecilmez') {
    return {
      durum: 'bulunamadi',
      uyari: 'Başlangıç ya da varış noktası, seçilen ulaşım yolu ve mevsimde geçilemeyen bir alanda kalıyor.',
      duzMesafe,
      yolMesafesi: null,
      enKisaGun: null,
      yolNoktalari: [],
      bilinmeyenAlanVar: false,
      zarf: zarfOlustur({
        olcek: baglam.olcek,
        hukum: 'kayitli_seceneklerde_bulunamadi',
        ulasim,
        mevsim,
        izgaraAraligiUzay,
        izgaraAraligiBirim,
        bilinmeyenAlanVar: false,
      }),
    };
  }

  // Düğümler: 0..(izgaraEn * izgaraBoy - 1) ızgara hücre merkezleri, N = başlangıç, N + 1 = bitiş.
  const hucreSayisi = izgaraEn * izgaraBoy;
  const basDugum = hucreSayisi;
  const bitDugum = hucreSayisi + 1;
  const toplamDugum = hucreSayisi + 2;

  const koordinat = (dugum: number): Nokta => {
    if (dugum === basDugum) return baslangic;
    if (dugum === bitDugum) return bitis;
    const c = dugum % izgaraEn;
    const r = Math.floor(dugum / izgaraEn);
    return [(c + 0.5) * dx, (r + 0.5) * dy];
  };

  let bilinmeyenAlanVar = false;
  const hucreHiz = new Float64Array(hucreSayisi);
  for (let r = 0; r < izgaraBoy; r++) {
    for (let c = 0; c < izgaraEn; c++) {
      const idx = r * izgaraEn + c;
      const h = noktaHiziCoz(baglam, [(c + 0.5) * dx, (r + 0.5) * dy], ulasim, mevsim);
      if (h.durum === 'hiz') {
        hucreHiz[idx] = h.gunlukHiz;
      } else if (h.durum === 'bilinmiyor') {
        hucreHiz[idx] = -1;
        bilinmeyenAlanVar = true;
      } else {
        hucreHiz[idx] = 0;
      }
    }
  }

  const sureler = new Float64Array(toplamDugum).fill(Infinity);
  const mesafeler = new Float64Array(toplamDugum).fill(Infinity);
  const onceki = new Int32Array(toplamDugum).fill(-1);
  const ziyaret = new Uint8Array(toplamDugum);

  sureler[basDugum] = 0;
  mesafeler[basDugum] = 0;

  // Doğrudan düz çizgi integrali (engele veya bilinmeyen alana çarpmıyorsa aday kenar olarak eklenir).
  const dogrudan = segmentSuresi(baglam, oran, baslangic, bitis, ulasim, mevsim, 80);
  if (dogrudan.bilinmeyen) bilinmeyenAlanVar = true;
  if (dogrudan.sureGun !== null) {
    sureler[bitDugum] = dogrudan.sureGun;
    mesafeler[bitDugum] = dogrudan.mesafeBirim;
    onceki[bitDugum] = basDugum;
  }

  const yakinHucreler = (p: Nokta): number[] => {
    const c0 = Math.max(0, Math.min(izgaraEn - 1, Math.floor(p[0] / dx)));
    const r0 = Math.max(0, Math.min(izgaraBoy - 1, Math.floor(p[1] / dy)));
    const adaylar: number[] = [];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const c = c0 + dc;
        const r = r0 + dr;
        if (c >= 0 && c < izgaraEn && r >= 0 && r < izgaraBoy) {
          adaylar.push(r * izgaraEn + c);
        }
      }
    }
    return adaylar;
  };

  const basYakin = yakinHucreler(baslangic);
  for (const hIdx of basYakin) {
    if (hucreHiz[hIdx] <= 0) continue;
    const seg = segmentSuresi(baglam, oran, baslangic, koordinat(hIdx), ulasim, mevsim, 8);
    if (seg.bilinmeyen) bilinmeyenAlanVar = true;
    if (seg.sureGun !== null && seg.sureGun < sureler[hIdx]) {
      sureler[hIdx] = seg.sureGun;
      mesafeler[hIdx] = seg.mesafeBirim;
      onceki[hIdx] = basDugum;
    }
  }

  const bitYakinSet = new Set(yakinHucreler(bitis));

  for (let adim = 0; adim < toplamDugum; adim++) {
    let u = -1;
    let enKucuk = Infinity;
    for (let i = 0; i < toplamDugum; i++) {
      if (!ziyaret[i] && sureler[i] < enKucuk) {
        enKucuk = sureler[i];
        u = i;
      }
    }
    if (u === -1 || u === bitDugum) break;
    ziyaret[u] = 1;

    if (u >= hucreSayisi) continue;
    const uc = u % izgaraEn;
    const ur = Math.floor(u / izgaraEn);
    const uKoord = koordinat(u);

    for (const [dc, dr] of KOMSU_OFSETLERI) {
      const vc = uc + dc;
      const vr = ur + dr;
      if (vc < 0 || vc >= izgaraEn || vr < 0 || vr >= izgaraBoy) continue;
      const v = vr * izgaraEn + vc;
      if (ziyaret[v]) continue;
      if (hucreHiz[v] <= 0) {
        if (hucreHiz[v] < 0) bilinmeyenAlanVar = true;
        continue;
      }
      const seg = segmentSuresi(baglam, oran, uKoord, koordinat(v), ulasim, mevsim, 4);
      if (seg.bilinmeyen) bilinmeyenAlanVar = true;
      if (seg.sureGun === null) continue;
      const yeniSure = sureler[u] + seg.sureGun;
      if (yeniSure + 1e-9 < sureler[v]) {
        sureler[v] = yeniSure;
        mesafeler[v] = mesafeler[u] + seg.mesafeBirim;
        onceki[v] = u;
      }
    }

    if (bitYakinSet.has(u)) {
      const seg = segmentSuresi(baglam, oran, uKoord, bitis, ulasim, mevsim, 8);
      if (seg.bilinmeyen) bilinmeyenAlanVar = true;
      if (seg.sureGun !== null) {
        const yeniSure = sureler[u] + seg.sureGun;
        if (yeniSure + 1e-9 < sureler[bitDugum]) {
          sureler[bitDugum] = yeniSure;
          mesafeler[bitDugum] = mesafeler[u] + seg.mesafeBirim;
          onceki[bitDugum] = u;
        }
      }
    }
  }

  if (!Number.isFinite(sureler[bitDugum])) {
    if (bilinmeyenAlanVar) {
      return {
        durum: 'bilinmiyor',
        uyari: 'Hızı bilinmeyen alanlar bulunduğu için kayıtlı verilerle kesintisiz süre hesaplanamadı.',
        duzMesafe,
        yolMesafesi: null,
        enKisaGun: null,
        yolNoktalari: [],
        bilinmeyenAlanVar: true,
        zarf: zarfOlustur({
          olcek: baglam.olcek,
          hukum: 'denetlenemiyor',
          ulasim,
          mevsim,
          izgaraAraligiUzay,
          izgaraAraligiBirim,
          bilinmeyenAlanVar: true,
        }),
      };
    }
    return {
      durum: 'bulunamadi',
      uyari: 'Kayıtlı arazi ve hız kurallarıyla geçilebilir bir yol bulunamadı. Bu, evrende imkânsız olduğu anlamına gelmez.',
      duzMesafe,
      yolMesafesi: null,
      enKisaGun: null,
      yolNoktalari: [],
      bilinmeyenAlanVar: false,
      zarf: zarfOlustur({
        olcek: baglam.olcek,
        hukum: 'kayitli_seceneklerde_bulunamadi',
        ulasim,
        mevsim,
        izgaraAraligiUzay,
        izgaraAraligiBirim,
        bilinmeyenAlanVar: false,
      }),
    };
  }

  const yol: Nokta[] = [];
  let cur = bitDugum;
  let guvenlik = 0;
  while (cur !== -1 && guvenlik <= toplamDugum) {
    yol.push(koordinat(cur));
    if (cur === basDugum) break;
    cur = onceki[cur];
    guvenlik++;
  }
  yol.reverse();

  return {
    durum: 'tamam',
    uyari: bilinmeyenAlanVar
      ? 'Haritada hızı bilinmeyen alanlar var. Süre yalnızca hızı tanımlı alanlar üzerinden hesaplandı.'
      : null,
    duzMesafe,
    yolMesafesi: yuvarla(mesafeler[bitDugum], 4),
    enKisaGun: yuvarla(sureler[bitDugum], 4),
    yolNoktalari: yol,
    bilinmeyenAlanVar,
    zarf: zarfOlustur({
      olcek: baglam.olcek,
      hukum: 'cozum_bulundu',
      ulasim,
      mevsim,
      izgaraAraligiUzay,
      izgaraAraligiBirim,
      bilinmeyenAlanVar,
    }),
  };
}

function konturSvgYolu(hucreler: [number, number][], dx: number, dy: number): string {
  if (hucreler.length === 0) return '';
  const satirlar = new Map<number, number[]>();
  for (const [c, r] of hucreler) {
    let liste = satirlar.get(r);
    if (!liste) {
      liste = [];
      satirlar.set(r, liste);
    }
    liste.push(c);
  }
  const parcalar: string[] = [];
  for (const [r, sutunlar] of [...satirlar.entries()].sort((a, b) => a[0] - b[0])) {
    sutunlar.sort((a, b) => a - b);
    let bas = sutunlar[0];
    let son = sutunlar[0];
    const y1 = yuvarla(r * dy, 2);
    const y2 = yuvarla((r + 1) * dy, 2);
    for (let i = 1; i < sutunlar.length; i++) {
      if (sutunlar[i] === son + 1) {
        son = sutunlar[i];
      } else {
        const x1 = yuvarla(bas * dx, 2);
        const x2 = yuvarla((son + 1) * dx, 2);
        parcalar.push(`M${x1},${y1}H${x2}V${y2}H${x1}Z`);
        bas = sutunlar[i];
        son = sutunlar[i];
      }
    }
    const x1 = yuvarla(bas * dx, 2);
    const x2 = yuvarla((son + 1) * dx, 2);
    parcalar.push(`M${x1},${y1}H${x2}V${y2}H${x1}Z`);
  }
  return parcalar.join(' ');
}

/** Başlangıç noktası, ulaşım biçimi ve mevsime göre 1., 2. ve 3. gün erişim konturlarını hesaplar. */
export function konturHesapla(
  baglam: OlcekliGeometriBaglami,
  baslangicGirdi: Nokta,
  ulasimGirdi: string,
  secenekler?: {
    mevsim?: string | null;
    katmanDonusumu?: Donusum | null;
    izgaraBolumu?: number;
  },
): OlcekliKonturSonucu {
  const ulasim = ulasimGirdi.trim();
  const mevsim = secenekler?.mevsim?.trim() || null;
  const baslangic = katmandanUzaya(baslangicGirdi, secenekler?.katmanDonusumu);
  const oran = olcekBirimOrani(baglam.olcek);

  if (oran === null || !baglam.olcek) {
    return {
      durum: 'olceksiz',
      uyari: 'Harita ölçeksiz. Ulaşılabilecek yerleri hesaplamak için önce haritanın ölçeğini tanımlayın.',
      baslangic,
      izgaraEn: 0,
      izgaraBoy: 0,
      izgaraAraligiUzay: null,
      izgaraAraligiBirim: null,
      konturlar: [],
      bilinmeyenAlanVar: false,
      zarf: zarfOlustur({
        olcek: null,
        hukum: 'denetlenemiyor',
        ulasim: ulasim || null,
        mevsim,
        izgaraAraligiUzay: null,
        izgaraAraligiBirim: null,
        bilinmeyenAlanVar: false,
      }),
    };
  }

  const { izgaraEn, izgaraBoy, dx, dy, izgaraAraligiUzay } = izgaraBoyutlari(
    baglam.en,
    baglam.boy,
    secenekler?.izgaraBolumu,
  );
  const izgaraAraligiBirim = izgaraAraligiUzay * oran;

  const basHiz = noktaHiziCoz(baglam, baslangic, ulasim, mevsim);
  if (basHiz.durum === 'bilinmiyor') {
    return {
      durum: 'bilinmiyor',
      uyari: 'Başlangıç noktasındaki arazinin hızı bilinmiyor. Erişim alanı için önce varsayılan bir hız ya da arazi kuralı girin.',
      baslangic,
      izgaraEn,
      izgaraBoy,
      izgaraAraligiUzay: yuvarla(izgaraAraligiUzay, 4),
      izgaraAraligiBirim: yuvarla(izgaraAraligiBirim, 4),
      konturlar: [],
      bilinmeyenAlanVar: true,
      zarf: zarfOlustur({
        olcek: baglam.olcek,
        hukum: 'denetlenemiyor',
        ulasim,
        mevsim,
        izgaraAraligiUzay,
        izgaraAraligiBirim,
        bilinmeyenAlanVar: true,
      }),
    };
  }

  const hucreSayisi = izgaraEn * izgaraBoy;
  const hucreHiz = new Float64Array(hucreSayisi);
  let bilinmeyenAlanVar = false;

  for (let r = 0; r < izgaraBoy; r++) {
    for (let c = 0; c < izgaraEn; c++) {
      const idx = r * izgaraEn + c;
      const h = noktaHiziCoz(baglam, [(c + 0.5) * dx, (r + 0.5) * dy], ulasim, mevsim);
      if (h.durum === 'hiz') {
        hucreHiz[idx] = h.gunlukHiz;
      } else if (h.durum === 'bilinmiyor') {
        hucreHiz[idx] = -1;
        bilinmeyenAlanVar = true;
      } else {
        hucreHiz[idx] = 0;
      }
    }
  }

  const sureler = new Float64Array(hucreSayisi).fill(Infinity);
  const ziyaret = new Uint8Array(hucreSayisi);

  if (basHiz.durum === 'hiz') {
    const c0 = Math.max(0, Math.min(izgaraEn - 1, Math.floor(baslangic[0] / dx)));
    const r0 = Math.max(0, Math.min(izgaraBoy - 1, Math.floor(baslangic[1] / dy)));
    const basIdx = r0 * izgaraEn + c0;
    if (hucreHiz[basIdx] <= 0) hucreHiz[basIdx] = basHiz.gunlukHiz;
    sureler[basIdx] = 0;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || c >= izgaraEn || r < 0 || r >= izgaraBoy) continue;
        const idx = r * izgaraEn + c;
        if (hucreHiz[idx] <= 0) continue;
        const merkez: Nokta = [(c + 0.5) * dx, (r + 0.5) * dy];
        const seg = segmentSuresi(baglam, oran, baslangic, merkez, ulasim, mevsim, 4);
        if (seg.bilinmeyen) bilinmeyenAlanVar = true;
        if (seg.sureGun !== null && seg.sureGun < sureler[idx]) {
          sureler[idx] = seg.sureGun;
        }
      }
    }

    for (let adim = 0; adim < hucreSayisi; adim++) {
      let u = -1;
      let enKucuk = Infinity;
      for (let i = 0; i < hucreSayisi; i++) {
        if (!ziyaret[i] && sureler[i] < enKucuk) {
          enKucuk = sureler[i];
          u = i;
        }
      }
      if (u === -1 || enKucuk > 3) break;
      ziyaret[u] = 1;

      const uc = u % izgaraEn;
      const ur = Math.floor(u / izgaraEn);
      const uMerkez: Nokta = [(uc + 0.5) * dx, (ur + 0.5) * dy];

      for (const [dc, dr] of KOMSU_OFSETLERI) {
        const vc = uc + dc;
        const vr = ur + dr;
        if (vc < 0 || vc >= izgaraEn || vr < 0 || vr >= izgaraBoy) continue;
        const v = vr * izgaraEn + vc;
        if (ziyaret[v]) continue;
        if (hucreHiz[v] <= 0) {
          if (hucreHiz[v] < 0) bilinmeyenAlanVar = true;
          continue;
        }
        const vMerkez: Nokta = [(vc + 0.5) * dx, (vr + 0.5) * dy];
        const adimBirim = Math.hypot(vMerkez[0] - uMerkez[0], vMerkez[1] - uMerkez[1]) * oran;
        const ortHiz = 2 / (1 / hucreHiz[u] + 1 / hucreHiz[v]);
        const gecisGun = adimBirim / ortHiz;
        const yeniSure = sureler[u] + gecisGun;
        if (yeniSure + 1e-9 < sureler[v]) {
          sureler[v] = yeniSure;
        }
      }
    }
  }

  const hucreAlaniBirimKare = dx * oran * (dy * oran);
  const gunler: (1 | 2 | 3)[] = [1, 2, 3];
  const konturlar: OlcekliKontur[] = gunler.map((gun) => {
    const hucreler: [number, number][] = [];
    const merkezler: [number, number][] = [];
    for (let r = 0; r < izgaraBoy; r++) {
      for (let c = 0; c < izgaraEn; c++) {
        const idx = r * izgaraEn + c;
        if (sureler[idx] <= gun + 1e-9) {
          hucreler.push([c, r]);
          merkezler.push([yuvarla((c + 0.5) * dx, 2), yuvarla((r + 0.5) * dy, 2)]);
        }
      }
    }
    return {
      gun,
      hucreler,
      merkezler,
      alanBirimKare: yuvarla(hucreler.length * hucreAlaniBirimKare, 4),
      svgYolu: konturSvgYolu(hucreler, dx, dy),
    };
  });

  const erisilenVar = konturlar.some((k) => k.hucreler.length > 0);
  return {
    durum: 'tamam',
    uyari: bilinmeyenAlanVar
      ? 'Hızı bilinmeyen alanlar hesaba katılmadı. Yalnızca hızı tanımlı araziler tarandı.'
      : !erisilenVar
        ? 'Başlangıç noktası, seçilen ulaşım yolu ve mevsimde geçilemeyen bir alanda.'
        : null,
    baslangic,
    izgaraEn,
    izgaraBoy,
    izgaraAraligiUzay: yuvarla(izgaraAraligiUzay, 4),
    izgaraAraligiBirim: yuvarla(izgaraAraligiBirim, 4),
    konturlar,
    bilinmeyenAlanVar,
    zarf: zarfOlustur({
      olcek: baglam.olcek,
      hukum: erisilenVar ? 'cozum_bulundu' : 'kayitli_seceneklerde_bulunamadi',
      ulasim,
      mevsim,
      izgaraAraligiUzay,
      izgaraAraligiBirim,
      bilinmeyenAlanVar,
    }),
  };
}
