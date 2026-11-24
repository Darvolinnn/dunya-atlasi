// Evren içi belge çıktısı (§11.5, §3.9). Metni yazar yazar; program biçime göre düzeni, mührü, tarihi, yeri ve bağlı
// kişileri ekleyerek sunar. Parşömen ve arşiv dokusu yalnızca bu çıktılarda kullanılır (K8); doku resim değil, düz
// renk geçişleridir. Mühür, seçilen kaydın adından ya da yazılan kısa yazıdan çizilen bir dairedir.
import type { IslemGirdisi } from '../alan/islem';
import { A } from '../alan/automerge';
import { belgeyeCevir, xhtmlYaz, xmlKacis } from '../alan/cikti';
import { kodGecerliMi } from '../alan/kod';
import { ESKIMELER, KAGITLAR, MUHUR_RENKLERI, MUHUR_SEKILLERI, YAZILAR } from '../alan/belge-tasarimi';
import type { BelgeSunumu } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi, yonlendir } from './izdusum';

export const BELGE_BICIMLERI: { kod: BelgeSunumu['bicim']; ad: string }[] = [
  { kod: 'mektup', ad: 'Mektup' }, { kod: 'gazete', ad: 'Gazete sayfası' }, { kod: 'ilan', ad: 'İlan' },
  { kod: 'izin', ad: 'Seyahat izni' }, { kod: 'gunluk', ad: 'Günlük' }, { kod: 'antlasma', ad: 'Antlaşma' }, { kod: 'mezar', ad: 'Mezar yazısı' },
];
export const BOS_SUNUM: BelgeSunumu = { bicim: 'mektup', yazan: null, alici: null, yer: null, muhur: null, muhurYazisi: '', imzalayanlar: [], kagit: 'parsomen', yazi: 'duz', eskime: 'yok', muhurSekli: 'daire', muhurRengi: 'kirmizi', okurYayini: false };
const icinde = <T extends string>(l: readonly (readonly [T, ...string[]])[], v: unknown, varsayilan: T): T => (l.some((x) => x[0] === v) ? v as T : varsayilan);

export interface BelgeBaglami { e: EvrenVt; yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void }

function belgeBul(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r || r.tur !== 'belge') throw new Error('Evren içi belge bulunamadı.');
  return r;
}

export function sunumOku(e: EvrenVt, kod: string): BelgeSunumu {
  belgeBul(e, kod);
  const ham = e.db.selectValue('SELECT sunum FROM belge_sunumlari WHERE kod=?', [kod]) as string | undefined;
  // Tasarımcıdan önceki sunumlarda kâğıt yoktu: mezar yazısı taşta durur.
  const v = ham ? JSON.parse(ham) : {};
  return { ...BOS_SUNUM, kagit: v.bicim === 'mezar' ? 'tas' : 'parsomen', ...v };
}

export function sunumYaz(b: BelgeBaglami, kod: string, s: BelgeSunumu) {
  belgeBul(b.e, kod);
  if (!BELGE_BICIMLERI.some((x) => x.kod === s?.bicim)) throw new Error('Geçersiz biçim.');
  const kayit = (k: unknown) => {
    if (k === null || k === undefined || k === '') return null;
    if (typeof k !== 'string' || !kodGecerliMi(k) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [k]) === undefined) throw new Error('Seçilen kayıt bulunamadı.');
    return yonlendir(b.e.db, k) as string;
  };
  if (!Array.isArray(s.imzalayanlar) || s.imzalayanlar.length > 20) throw new Error('En çok 20 imzalayan olabilir.');
  const yeni: BelgeSunumu = {
    bicim: s.bicim, yazan: kayit(s.yazan), alici: kayit(s.alici), yer: kayit(s.yer), muhur: kayit(s.muhur),
    muhurYazisi: String(s.muhurYazisi ?? '').replace(/\s+/g, ' ').trim().slice(0, 40), imzalayanlar: [...new Set(s.imzalayanlar.map(kayit).filter((x): x is string => !!x))],
    kagit: icinde(KAGITLAR, s.kagit, 'parsomen'), yazi: icinde(YAZILAR, s.yazi, 'duz'), eskime: icinde(ESKIMELER, s.eskime, 'yok'),
    muhurSekli: icinde(MUHUR_SEKILLERI, s.muhurSekli, 'daire'), muhurRengi: icinde(MUHUR_RENKLERI, s.muhurRengi, 'kirmizi'), okurYayini: s.okurYayini === true,
  };
  if (JSON.stringify(yeni) === JSON.stringify(sunumOku(b.e, kod))) return;
  b.yaz([{ tur: 'belge_sunumu_yaz', veri: { kod, sunum: yeni } }], [kod]);
}

const STIL = `
:root { --murekkep: #3b2f24; --kenar: #c9b48a; --muhur: #8a1f1b; --muhur-acik: #b8433a; }
* { box-sizing: border-box; }
body { margin: 0; background: #e9e2d3; color: var(--murekkep); font-family: Georgia, "Times New Roman", serif; }
body.k-parsomen { --zem: #ecdcb6; --doku: radial-gradient(ellipse at 50% 40%, #f8f0dc 0%, #f0e2c0 55%, #dcc596 100%); --murekkep: #3b2a18; }
body.k-eski { --zem: #e9dfc8; --doku: linear-gradient(170deg, #efe6d0, #e2d4b4); --murekkep: #3a3128; }
body.k-temiz { --zem: #fbfaf6; --doku: linear-gradient(#fdfcf8, #f6f3ec); --murekkep: #22201c; --kenar: #ddd6c8; }
body.k-tas { --zem: #a9a69f; --doku: radial-gradient(ellipse at top, #cfcdc8, #9e9b94); --murekkep: #2c2b29; --kenar: #807d76; }
body.r-siyah { --muhur: #2a2420; --muhur-acik: #5a4e45; } body.r-altin { --muhur: #8a6a14; --muhur-acik: #c9a23a; } body.r-mavi { --muhur: #24395a; --muhur-acik: #4d6c96; }
.kagit { max-width: 640px; margin: 24px auto; padding: 48px 56px; background-color: var(--zem); background-image: var(--doku); color: var(--murekkep); border: 1px solid var(--kenar); box-shadow: 0 2px 10px rgb(0 0 0 / 0.15); position: relative; line-height: 1.6; }
.kagit > * { position: relative; }
body.e-az .kagit { box-shadow: inset 0 0 50px rgb(90 55 15 / 0.22), 0 2px 10px rgb(0 0 0 / 0.15); }
body.e-cok .kagit { box-shadow: inset 0 0 90px rgb(80 45 10 / 0.42), 0 2px 10px rgb(0 0 0 / 0.2); clip-path: polygon(0 1%, 6% 0, 30% 1%, 55% 0, 80% 1%, 100% 0, 99% 30%, 100% 62%, 99% 100%, 70% 99%, 40% 100%, 12% 99%, 0 100%, 1% 60%, 0 28%); }
body.e-az .kagit::before, body.e-cok .kagit::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 18% 12%, rgb(120 80 30 / 0.16), transparent 40%), radial-gradient(ellipse at 85% 88%, rgb(110 70 25 / 0.2), transparent 45%); }
body.e-cok .kagit::before { background: radial-gradient(ellipse at 18% 12%, rgb(120 80 30 / 0.3), transparent 40%), radial-gradient(ellipse at 85% 88%, rgb(110 70 25 / 0.35), transparent 45%), radial-gradient(circle at 70% 30%, rgb(110 70 25 / 0.18), transparent 12%); }
body.y-egik .kagit { font-style: italic; }
body.y-buyuk .kagit { text-transform: uppercase; letter-spacing: 0.12em; }
p { margin: 0 0 0.8em; }
.ust { text-align: right; font-style: italic; margin-bottom: 2em; }
.imza { text-align: right; margin-top: 2.5em; font-style: italic; }
.imzalar { display: flex; flex-wrap: wrap; gap: 24px 48px; justify-content: space-around; margin-top: 3em; }
.imzalar div { min-width: 160px; text-align: center; border-top: 1px solid var(--murekkep); padding-top: 4px; font-style: italic; }
.muhur { width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; text-align: center; font: bold 11px/1.2 system-ui, sans-serif; letter-spacing: 1px; text-transform: uppercase; font-style: normal; padding: 12px;
  color: rgb(255 240 225 / 0.9); background: radial-gradient(circle at 38% 35%, var(--muhur-acik), var(--muhur) 60%); transform: rotate(-10deg); box-shadow: inset 0 0 0 5px rgb(0 0 0 / 0.15), inset 0 0 0 7px rgb(255 255 255 / 0.18); }
.muhur.daire { border-radius: 50%; }
.muhur.kalkan { clip-path: polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%); padding-bottom: 28px; }
.muhur.sekizgen { clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); }
.alt { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2em; }
h1 { text-align: center; font-weight: normal; letter-spacing: 2px; margin: 0 0 0.6em; }
.gazete .kagit { max-width: 820px; }
.gazete h1 { font-size: 40px; border-bottom: 3px double var(--murekkep); padding-bottom: 6px; letter-spacing: 4px; text-transform: uppercase; }
.gazete .tarih { display: flex; justify-content: space-between; border-bottom: 1px solid var(--murekkep); font-size: 12px; margin-bottom: 1em; padding-bottom: 4px; }
.gazete .sutunlar { column-count: 2; column-gap: 28px; text-align: justify; }
.ilan .kagit { text-align: center; border: 6px double var(--kenar); }
.ilan h1 { font-size: 34px; text-transform: uppercase; letter-spacing: 6px; }
.izin .kagit { border: 10px double var(--kenar); }
.izin .hamil { text-align: center; margin: 1em 0; font-size: 18px; }
.gunluk .kagit { background-image: repeating-linear-gradient(transparent 0 27px, rgb(110 90 50 / 0.3) 27px 28px), var(--doku); }
.gunluk .ust { text-align: left; font-weight: bold; }
.mezar .kagit { text-align: center; border-radius: 160px 160px 8px 8px; border-width: 2px; letter-spacing: 1px; }
.mezar h1 { font-size: 28px; text-transform: uppercase; }
@media print { body { background: none; } .kagit { box-shadow: none; margin: 0 auto; } }
`;

/** Belgenin sunulmuş hâli (tam sayfa). */
export function belgeCiktisi(e: EvrenVt, kod: string): string {
  const r = belgeBul(e, kod);
  const s = sunumOku(e, kod);
  const ad = (k: string | null) => (k ? (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [yonlendir(e.db, k) ?? k]) as string | undefined) ?? '' : '');
  const tarih = r.tarih ? (JSON.parse(r.tarih as string) as { ifade: string }).ifade : '';
  const b = metinBelgesi(e.db, kod, 'govde');
  const govde = b ? xhtmlYaz(belgeyeCevir(A.spans(b, ['t']) as unknown[])) : '';
  const yer = ad(s.yer), yazan = ad(s.yazan), alici = ad(s.alici);
  const muhurYazisi = s.muhurYazisi || ad(s.muhur);
  const muhur = muhurYazisi && s.muhurSekli !== 'yok' ? `<div class="muhur ${s.muhurSekli}" aria-label="Mühür">${xmlKacis(muhurYazisi)}</div>` : '<span></span>';
  const baslik = xmlKacis(r.ad as string);
  const yerTarih = xmlKacis([yer, tarih].filter(Boolean).join(', '));
  const imzalar = s.imzalayanlar.map(ad).filter(Boolean);
  let ic = '';
  switch (s.bicim) {
    case 'mektup':
      ic = `${yerTarih ? `<div class="ust">${yerTarih}</div>` : ''}${alici ? `<p>${xmlKacis(alici)},</p>` : ''}${govde}<div class="alt">${muhur}<div class="imza">${xmlKacis(yazan)}</div></div>`;
      break;
    case 'gazete':
      ic = `<h1>${baslik}</h1><div class="tarih"><span>${xmlKacis(yer)}</span><span>${xmlKacis(tarih)}</span><span>${xmlKacis(yazan)}</span></div><div class="sutunlar">${govde}</div>`;
      break;
    case 'ilan':
      ic = `<h1>${baslik}</h1>${govde}${yerTarih ? `<p><em>${yerTarih}</em></p>` : ''}<div class="alt"><span></span>${muhur}<span>${xmlKacis(yazan)}</span></div>`;
      break;
    case 'izin':
      ic = `<h1>${baslik}</h1>${alici ? `<div class="hamil">Hamili: <strong>${xmlKacis(alici)}</strong></div>` : ''}${govde}<div class="alt">${muhur}<div class="imza">${xmlKacis(yazan)}${yerTarih ? `<br/>${yerTarih}` : ''}</div></div>`;
      break;
    case 'gunluk':
      ic = `<div class="ust">${yerTarih || baslik}</div>${govde}${yazan ? `<div class="imza">${xmlKacis(yazan)}</div>` : ''}`;
      break;
    case 'antlasma':
      ic = `<h1>${baslik}</h1>${yerTarih ? `<div class="ust" style="text-align:center">${yerTarih}</div>` : ''}${govde}<div class="imzalar">${(imzalar.length ? imzalar : [yazan, alici].filter(Boolean)).map((x) => `<div>${xmlKacis(x)}</div>`).join('')}</div><div class="alt"><span></span>${muhur}<span></span></div>`;
      break;
    case 'mezar':
      ic = `<h1>${xmlKacis(alici || (r.ad as string))}</h1>${tarih ? `<p>${xmlKacis(tarih)}</p>` : ''}${govde}`;
      break;
  }
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${baslik}</title><style>${STIL}</style></head><body class="${s.bicim} k-${s.kagit} y-${s.yazi} e-${s.eskime} r-${s.muhurRengi}"><div class="kagit">${ic}</div></body></html>`;
}
