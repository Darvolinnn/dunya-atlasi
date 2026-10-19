// Rotalar ve yolculuklar (§4.2, §8.4). Rota iki uç arasında elle girilmiş mesafe ve koşula göre sürelerdir ("kayıtlı
// süre ağı"); program koşulu yorumlamaz, yalnızca etiket olarak gösterir. Kural ile hesaplanan süre tahmini ve en kısa
// yol aracı sonraki aşamadadır (§15-2). Yolculuk belirli kişilerin belirli bir zamanda yer yer ilerlemesidir.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { GUN_PARCA, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import type { KisaKayit, RotaGirdisi, RotaVerisi, Yolculuk, YolculukAsamaGirdisi, YolculukAsamasi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { asamaIzinUyarisi } from './gecis';

export interface YolBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const kisa = (e: EvrenVt, kod: string | null | undefined): KisaKayit | null => {
  if (!kod) return null;
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
};

function turDenetle(e: EvrenVt, kod: string, tur: string) {
  const t = kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  if (t !== tur) throw new Error(tur === 'rota' ? 'Bu bir rota kaydı değil.' : 'Bu bir yolculuk kaydı değil.');
}
function kayitVar(e: EvrenVt, kod: unknown): string {
  if (typeof kod !== 'string' || !kodGecerliMi(kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) === undefined) throw new Error('Seçilen kayıt bulunamadı.');
  return kod;
}

/** Bir rotanın en kısa tanımlı süresi (gün) ve hangi koşulda. */
export function enKisaSure(sureler: { kosul: string; gun: number }[]): { kosul: string; gun: number } | null {
  return sureler.reduce<{ kosul: string; gun: number } | null>((m, s) => (!m || s.gun < m.gun ? s : m), null);
}

export interface SakliRota { kod: string; ad: string; a: string | null; b: string | null; sureler: { kosul: string; gun: number }[] }
export function rotalar(e: EvrenVt): SakliRota[] {
  return e.db.selectObjects(`SELECT r.*, k.ad FROM rotalar r JOIN kayitlar k ON k.kod=r.kod WHERE k.silindi IS NULL AND k.karar<>'vazgecildi'`).map((r) => ({
    kod: r.kod as string, ad: r.ad as string, a: r.a ? yonlendir(e.db, r.a as string) : null, b: r.b ? yonlendir(e.db, r.b as string) : null,
    sureler: JSON.parse(r.sureler as string),
  }));
}

export function rota(e: EvrenVt, kod: string): RotaVerisi {
  turDenetle(e, kod, 'rota');
  const r = e.db.selectObject('SELECT * FROM rotalar WHERE kod=?', [kod]);
  const kullananlar = e.db.selectObjects(`SELECT y.kod, k.ad, k.tur, y.asamalar FROM yolculuklar y JOIN kayitlar k ON k.kod=y.kod WHERE k.silindi IS NULL`)
    .filter((y) => (JSON.parse(y.asamalar as string) as { rota: string | null }[]).some((a) => a.rota && yonlendir(e.db, a.rota) === kod))
    .map((y) => ({ kod: y.kod as string, ad: y.ad as string, tur: y.tur as string }));
  if (!r) return { a: null, b: null, mesafe: null, sureler: [], duraklar: [], kullananlar };
  return {
    a: kisa(e, r.a as string), b: kisa(e, r.b as string), mesafe: r.mesafe ? JSON.parse(r.mesafe as string) : null,
    sureler: JSON.parse(r.sureler as string), duraklar: (JSON.parse(r.duraklar as string) as string[]).map((d) => kisa(e, d)!), kullananlar,
  };
}

export function rotaYaz(b: YolBaglami, kod: string, g: RotaGirdisi) {
  turDenetle(b.e, kod, 'rota');
  const a = g.a ? kayitVar(b.e, g.a) : null, bb = g.b ? kayitVar(b.e, g.b) : null;
  if (a && bb && a === bb) throw new Error('Rotanın iki ucu aynı yer olamaz.');
  let mesafe: { deger: number; birim: string } | null = null;
  if (g.mesafe) {
    const d = Number(g.mesafe.deger);
    if (!Number.isFinite(d) || d < 0) throw new Error('Mesafe bir sayı olmalı.');
    mesafe = { deger: d, birim: String(g.mesafe.birim ?? '').replace(/\s+/g, ' ').trim().slice(0, 30) };
  }
  const sureler = (g.sureler ?? []).map((s) => {
    const gun = Number(s.gun);
    if (!Number.isFinite(gun) || gun <= 0) throw new Error('Süre gün olarak sıfırdan büyük bir sayı olmalı.');
    return { kosul: String(s.kosul ?? '').replace(/\s+/g, ' ').trim().slice(0, 80), gun };
  });
  if (sureler.length > 30) throw new Error('Çok fazla süre.');
  const duraklar = (g.duraklar ?? []).map((d) => kayitVar(b.e, d));
  const rotaV = { a, b: bb, mesafe, sureler, duraklar };
  const r = b.e.db.selectObject('SELECT a, b, mesafe, sureler, duraklar FROM rotalar WHERE kod=?', [kod]);
  const onceki = r ? { a: r.a, b: r.b, mesafe: r.mesafe ? JSON.parse(r.mesafe as string) : null, sureler: JSON.parse(r.sureler as string), duraklar: JSON.parse(r.duraklar as string) } : null;
  if (JSON.stringify(onceki) === JSON.stringify(rotaV)) return;
  b.yaz([{ tur: 'rota_yaz', veri: { kod, rota: rotaV } }], [kod, ...[a, bb, ...duraklar].filter((x): x is string => !!x)]);
}

export interface SakliAsama { nereden: string | null; nereye: string | null; rota: string | null; cikis: EvrenTarihi | null; varis: EvrenTarihi | null; durum: 'plan' | 'gerceklesti' }
export function asamalarOku(e: EvrenVt, kod: string): SakliAsama[] {
  const ham = e.db.selectValue('SELECT asamalar FROM yolculuklar WHERE kod=?', [kod]) as string | undefined;
  if (!ham) return [];
  return (JSON.parse(ham) as SakliAsama[]).map((a) => ({ ...a, nereden: a.nereden && yonlendir(e.db, a.nereden), nereye: a.nereye && yonlendir(e.db, a.nereye), rota: a.rota && yonlendir(e.db, a.rota) }));
}

/** Aşamanın süresi (gün): en kısa ve en uzun olası. Tarihler eksik ya da açık uçluysa null. */
export function asamaSuresi(a: { cikis: EvrenTarihi | null; varis: EvrenTarihi | null }): { enAz: number; enCok: number } | null {
  const c = a.cikis?.eksen, v = a.varis?.eksen;
  if (!c || !v || c.enErken === null || c.enGec === null || v.enErken === null || v.enGec === null) return null;
  return { enAz: Math.max(0, (v.enErken - c.enGec) / GUN_PARCA), enCok: (v.enGec - c.enErken) / GUN_PARCA };
}

const gunYaz = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;

export function yolculuk(e: EvrenVt, kod: string): Yolculuk {
  turDenetle(e, kod, 'yolculuk');
  const rs = new Map(rotalar(e).map((r) => [r.kod, r]));
  const yolcular = e.db.selectObjects(`SELECT k.kod, k.ad, k.tur, i.rol FROM iliskiler i JOIN kayitlar k ON k.kod=i.a
      WHERE i.tur='yolculukta' AND i.b=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY k.ad`, [kod])
    .map((r) => ({ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string, rol: (r.rol as string) ?? null }));
  const asamalar: YolculukAsamasi[] = asamalarOku(e, kod).map((a) => {
    let uyari: string | null = null;
    const sure = asamaSuresi(a);
    if (a.cikis?.eksen && a.varis?.eksen && sure && sure.enCok < 0) uyari = 'Varış, çıkıştan önce görünüyor.';
    const r = a.rota ? rs.get(a.rota) : undefined;
    if (r && !uyari) {
      const ek = enKisaSure(r.sureler);
      if (ek && sure && sure.enCok < ek.gun) uyari = `Bu aşama en çok ${gunYaz(sure.enCok)} sürüyor; “${r.ad}” için tanımlı en kısa süre ${gunYaz(ek.gun)}${ek.kosul ? ` (${ek.kosul})` : ''}.`;
      const uclar = [r.a, r.b];
      if (!uyari && a.nereden && a.nereye && r.a && r.b && !(uclar.includes(a.nereden) && uclar.includes(a.nereye))) uyari = `Seçilen rotanın uçları bu aşamanın yerleriyle aynı değil.`;
      if (!uyari) uyari = asamaIzinUyarisi(e, r.kod, yolcular, a.cikis);
    }
    return { nereden: kisa(e, a.nereden), nereye: kisa(e, a.nereye), rota: kisa(e, a.rota), cikis: a.cikis, varis: a.varis, durum: a.durum, uyari, sure };
  });
  return { asamalar, yolcular };
}

export function yolculukYaz(b: YolBaglami, kod: string, girdiler: YolculukAsamaGirdisi[]) {
  turDenetle(b.e, kod, 'yolculuk');
  if (!Array.isArray(girdiler) || girdiler.length > 100) throw new Error('Geçersiz aşamalar.');
  const z = zamanSetiOku(b.e.db);
  const tarih = (s: unknown) => { const x = String(s ?? '').trim(); if (!x) return null; if (x.length > 120) throw new Error('Tarih çok uzun.'); return tarihCoz(x, z); };
  const asamalar = girdiler.map((g) => {
    const nereden = g.nereden ? kayitVar(b.e, g.nereden) : null, nereye = g.nereye ? kayitVar(b.e, g.nereye) : null;
    if (g.rota) turDenetle(b.e, g.rota, 'rota');
    return { nereden, nereye, rota: g.rota ?? null, cikis: tarih(g.cikis), varis: tarih(g.varis), durum: g.durum === 'plan' ? 'plan' : 'gerceklesti' };
  });
  const onceki = b.e.db.selectValue('SELECT asamalar FROM yolculuklar WHERE kod=?', [kod]) as string | undefined;
  if (onceki && JSON.stringify(JSON.parse(onceki)) === JSON.stringify(asamalar)) return;
  const ilgili = new Set<string>([kod]);
  for (const a of asamalar) for (const x of [a.nereden, a.nereye, a.rota]) if (x) ilgili.add(x);
  b.yaz([{ tur: 'yolculuk_yaz', veri: { kod, asamalar } }], [...ilgili]);
}

/** Denetim ve harita için: yolcuların gerçekleşen aşamalardaki fiziksel bulunmaları (çıkışta çıkış yerinde, varışta varış yerinde). */
export interface YolculukBulunmasi {
  kisi: KisaKayit; yolculuk: KisaKayit; iliski: string; yer: string; tarih: EvrenTarihi; uc: 'cikis' | 'varis'; asama: number; fikir: boolean;
}
export function yolculukBulunmalari(e: EvrenVt): YolculukBulunmasi[] {
  const sonuc: YolculukBulunmasi[] = [];
  const yolcular = e.db.selectObjects(`SELECT i.kod ik, i.karar ikarar, i.baslangic, i.bitis, p.kod, p.ad, p.tur, p.karar pkarar, y.kod y_kod, y.ad y_ad, y.tur y_tur, y.karar ykarar
      FROM iliskiler i JOIN kayitlar p ON p.kod=i.a JOIN kayitlar y ON y.kod=i.b
      WHERE i.tur='yolculukta' AND (i.rol IS NULL OR i.rol='yolcu') AND i.silindi IS NULL AND p.silindi IS NULL AND y.silindi IS NULL
        AND i.karar<>'vazgecildi' AND p.karar<>'vazgecildi' AND y.karar<>'vazgecildi'`);
  for (const r of yolcular) {
    const katilma = r.baslangic ? JSON.parse(r.baslangic as string) as EvrenTarihi : null;
    const ayrilma = r.bitis ? JSON.parse(r.bitis as string) as EvrenTarihi : null;
    asamalarOku(e, r.y_kod as string).forEach((a, n) => {
      if (a.durum !== 'gerceklesti') return;
      for (const [uc, yer, t] of [['cikis', a.nereden, a.cikis], ['varis', a.nereye, a.varis]] as const) {
        if (!yer || !t?.eksen) continue;
        // Yolcu yolculuğa sonradan katıldıysa ya da önceden ayrıldıysa o aşamada yoktur (yalnızca kesin olarak).
        if (katilma?.eksen && t.eksen.enGec !== null && katilma.eksen.enErken !== null && t.eksen.enGec < katilma.eksen.enErken) continue;
        if (ayrilma?.eksen && t.eksen.enErken !== null && ayrilma.eksen.enGec !== null && t.eksen.enErken > ayrilma.eksen.enGec) continue;
        sonuc.push({ kisi: { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }, yolculuk: { kod: r.y_kod as string, ad: r.y_ad as string, tur: r.y_tur as string },
          iliski: `${r.ik}:${n}:${uc}`, yer, tarih: t, uc, asama: n, fikir: r.ikarar === 'fikir' || r.pkarar === 'fikir' || r.ykarar === 'fikir' });
      }
    });
  }
  return sonuc;
}
