// Evren içi belge çıktısı (§11.5, §3.9). Metni yazar yazar; program biçime göre düzeni, mührü, tarihi, yeri ve bağlı
// kişileri ekleyerek sunar. Parşömen ve arşiv dokusu yalnızca bu çıktılarda kullanılır (K8); doku resim değil, düz
// renk geçişleridir. Mühür, seçilen kaydın adından ya da yazılan kısa yazıdan çizilen bir dairedir.
import type { IslemGirdisi } from '../alan/islem';
import { A } from '../alan/automerge';
import { belgeyeCevir, xhtmlYaz, xmlKacis } from '../alan/cikti';
import { kodGecerliMi } from '../alan/kod';
import type { BelgeSunumu } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi, yonlendir } from './izdusum';

export const BELGE_BICIMLERI: { kod: BelgeSunumu['bicim']; ad: string }[] = [
  { kod: 'mektup', ad: 'Mektup' }, { kod: 'gazete', ad: 'Gazete sayfası' }, { kod: 'ilan', ad: 'İlan' },
  { kod: 'izin', ad: 'Seyahat izni' }, { kod: 'gunluk', ad: 'Günlük' }, { kod: 'antlasma', ad: 'Antlaşma' }, { kod: 'mezar', ad: 'Mezar yazısı' },
];
export const BOS_SUNUM: BelgeSunumu = { bicim: 'mektup', yazan: null, alici: null, yer: null, muhur: null, muhurYazisi: '', imzalayanlar: [] };

export interface BelgeBaglami { e: EvrenVt; yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void }

function belgeBul(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r || r.tur !== 'belge') throw new Error('Evren içi belge bulunamadı.');
  return r;
}

export function sunumOku(e: EvrenVt, kod: string): BelgeSunumu {
  belgeBul(e, kod);
  const ham = e.db.selectValue('SELECT sunum FROM belge_sunumlari WHERE kod=?', [kod]) as string | undefined;
  return ham ? { ...BOS_SUNUM, ...JSON.parse(ham) } : { ...BOS_SUNUM };
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
  };
  if (JSON.stringify(yeni) === JSON.stringify(sunumOku(b.e, kod))) return;
  b.yaz([{ tur: 'belge_sunumu_yaz', veri: { kod, sunum: yeni } }], [kod]);
}

const STIL = `
:root { --murekkep: #3b2f24; --kagit: #f3e9d2; --kenar: #d9c7a0; --muhur: #8c2f2f; }
* { box-sizing: border-box; }
body { margin: 0; background: #e9e2d3; color: var(--murekkep); font-family: Georgia, "Times New Roman", serif; }
.kagit { max-width: 640px; margin: 24px auto; padding: 48px 56px; background: radial-gradient(ellipse at center, #f8f0dc 0%, var(--kagit) 60%, #e8d8b4 100%); border: 1px solid var(--kenar); box-shadow: 0 2px 10px rgb(0 0 0 / 0.15); position: relative; line-height: 1.6; }
p { margin: 0 0 0.8em; }
.ust { text-align: right; font-style: italic; margin-bottom: 2em; }
.imza { text-align: right; margin-top: 2.5em; font-style: italic; }
.imzalar { display: flex; flex-wrap: wrap; gap: 24px 48px; justify-content: space-around; margin-top: 3em; }
.imzalar div { min-width: 160px; text-align: center; border-top: 1px solid var(--murekkep); padding-top: 4px; font-style: italic; }
.muhur { width: 96px; height: 96px; border-radius: 50%; border: 3px double var(--muhur); color: var(--muhur); display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; transform: rotate(-12deg); padding: 10px; opacity: 0.85; }
.alt { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2em; }
h1 { text-align: center; font-weight: normal; letter-spacing: 2px; margin: 0 0 0.6em; }
.gazete .kagit { max-width: 820px; background: #f4f1e8; }
.gazete h1 { font-size: 40px; border-bottom: 3px double var(--murekkep); padding-bottom: 6px; letter-spacing: 4px; text-transform: uppercase; }
.gazete .tarih { display: flex; justify-content: space-between; border-bottom: 1px solid var(--murekkep); font-size: 12px; margin-bottom: 1em; padding-bottom: 4px; }
.gazete .sutunlar { column-count: 2; column-gap: 28px; text-align: justify; }
.ilan .kagit { text-align: center; border: 6px double var(--kenar); }
.ilan h1 { font-size: 34px; text-transform: uppercase; letter-spacing: 6px; }
.izin .kagit { border: 10px double var(--kenar); }
.izin .hamil { text-align: center; margin: 1em 0; font-size: 18px; }
.gunluk .kagit { background: repeating-linear-gradient(#f6eedb, #f6eedb 27px, #d6c9a8 28px); font-style: italic; }
.gunluk .ust { text-align: left; font-weight: bold; }
.mezar .kagit { background: radial-gradient(ellipse at top, #c9c7c2, #9e9b94); color: #2c2b29; text-align: center; border-radius: 160px 160px 8px 8px; border: 2px solid #807d76; letter-spacing: 1px; }
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
  const muhur = muhurYazisi ? `<div class="muhur" aria-label="Mühür">${xmlKacis(muhurYazisi)}</div>` : '<span></span>';
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
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${baslik}</title><style>${STIL}</style></head><body class="${s.bicim}"><div class="kagit">${ic}</div></body></html>`;
}
