// En kısa rota (§15-2, §8.4 kayıtlı süre ağı ve bağlantı krokisi) ve haber yayılımı (§15-3). İkisi de yalnızca kayıtlı
// ağ içinde çalışır: "kayıtlı seçeneklerde bulunamadı" evrende imkânsız demek değildir (§2.2 kural 13). Haber için
// sonuç "en erken şu gün ulaşabilir"dir; erişim, teslim, okuma, inanma ve aktarma ayrıdır, kimse "biliyor" sayılmaz.
// Süresi girilmemiş bağlantı süre uydurmaz; yalnızca erişilebilirlik (kroki) için kullanılır. Varsayım paketi kapalı
// dediği rotayı hesaba katmaz.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { eksenAraligi, GUN_PARCA, anaTakvim, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import type { HaberCikisi, HaberYayilimi, KanalTanimi, KisaKayit, RotaAdimi, RotaSonucu } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import type { PaketEtkisi } from './masa';
import { enKisaSure, rotalar } from './yol';
import { adimlaraSartEkle } from './gecis';

export interface HaberBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

export interface Kenar { a: string; b: string; gun: number | null; kod: string; ad: string; kosul: string | null }

const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
};
function kayitTuru(e: EvrenVt, kod: unknown): string {
  const t = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  return t;
}
const gunYaz = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;

/** Rotaların kenarları: koşul verilirse o koşuldaki süre, verilmezse en kısa tanımlı süre; süre yoksa null. */
export function rotaKenarlari(e: EvrenVt, kosul: string | null, p: PaketEtkisi | null, carpan = 1, izinli?: Set<string>): Kenar[] {
  return rotalar(e).filter((r) => r.a && r.b && p?.rota.get(r.kod) !== false && (!izinli || izinli.has(r.kod))).map((r) => {
    const s = kosul ? r.sureler.find((x) => x.kosul === kosul) ?? null : enKisaSure(r.sureler);
    return { a: r.a!, b: r.b!, gun: s ? s.gun * carpan : null, kod: r.kod, ad: r.ad, kosul: s?.kosul ?? null };
  });
}

/** Dijkstra; yalnızca süresi bilinen kenarlar. Sonra süresiz kenarlarla erişilebilirlik (kroki). */
function agHesabi(kenarlar: Kenar[], baslangic: string) {
  const komsu = new Map<string, { k: Kenar; diger: string }[]>();
  for (const k of kenarlar) {
    komsu.set(k.a, [...(komsu.get(k.a) ?? []), { k, diger: k.b }]);
    komsu.set(k.b, [...(komsu.get(k.b) ?? []), { k, diger: k.a }]);
  }
  const uzak = new Map<string, number>([[baslangic, 0]]);
  const once = new Map<string, { kenar: Kenar; nereden: string }>();
  const bitti = new Set<string>();
  for (;;) {
    let en: string | null = null;
    for (const [d, u] of uzak) if (!bitti.has(d) && (en === null || u < uzak.get(en)!)) en = d;
    if (en === null) break;
    bitti.add(en);
    for (const { k, diger } of komsu.get(en) ?? []) {
      if (k.gun === null) continue;
      const yeni = uzak.get(en)! + k.gun;
      if (!uzak.has(diger) || yeni < uzak.get(diger)!) { uzak.set(diger, yeni); once.set(diger, { kenar: k, nereden: en }); }
    }
  }
  // Kroki: süresiz kenarlarla da ulaşılabilenler (süre söylenmez).
  const erisilen = new Map<string, { kenar: Kenar; nereden: string } | null>([[baslangic, null]]);
  const kuyruk = [baslangic];
  while (kuyruk.length) {
    const x = kuyruk.shift()!;
    for (const { k, diger } of komsu.get(x) ?? []) if (!erisilen.has(diger)) { erisilen.set(diger, { kenar: k, nereden: x }); kuyruk.push(diger); }
  }
  return { uzak, once, erisilen };
}

function yolKur(e: EvrenVt, once: Map<string, { kenar: Kenar; nereden: string }>, hedef: string): RotaAdimi[] {
  const l: RotaAdimi[] = [];
  let x = hedef;
  while (once.has(x)) {
    const o = once.get(x)!;
    l.unshift({ rota: { kod: o.kenar.kod, ad: o.kenar.ad, tur: 'rota' }, nereden: kisa(e, o.nereden), nereye: kisa(e, x), gun: o.kenar.gun, kosul: o.kenar.kosul });
    x = o.nereden;
  }
  return l;
}

/** İki yer arasında kayıtlı ağın en kısa yolu; karakter verilirse bildiği yollarla ayrıca (F09). */
export function enKisaRota(e: EvrenVt, nereden: string, nereye: string, kosul: string | null, kisi: string | null, p: PaketEtkisi | null, cikis: EvrenTarihi | null = null): RotaSonucu {
  kayitTuru(e, nereden); kayitTuru(e, nereye);
  if (nereden === nereye) throw new Error('Başlangıç ile varış aynı.');
  const coz = (izinli?: Set<string>) => {
    const ag = agHesabi(rotaKenarlari(e, kosul, p, 1, izinli), nereden);
    if (ag.uzak.has(nereye)) return { hukum: 'bulundu' as const, kip: 'sure' as const, toplam: ag.uzak.get(nereye)!, adimlar: yolKur(e, ag.once, nereye), eksik: [] as KisaKayit[] };
    if (ag.erisilen.has(nereye)) {
      // Kroki: bağlantı var, süre yok. Yolu ve süresi eksik rotaları göster.
      const adimlar: RotaAdimi[] = [];
      let x = nereye;
      while (ag.erisilen.get(x)) { const o = ag.erisilen.get(x)!; adimlar.unshift({ rota: { kod: o.kenar.kod, ad: o.kenar.ad, tur: 'rota' }, nereden: kisa(e, o.nereden), nereye: kisa(e, x), gun: o.kenar.gun, kosul: o.kenar.kosul }); x = o.nereden; }
      return { hukum: 'bulundu' as const, kip: 'kroki' as const, toplam: null, adimlar, eksik: adimlar.filter((a) => a.gun === null).map((a) => a.rota) };
    }
    return { hukum: 'bulunamadi' as const, kip: null, toplam: null, adimlar: [] as RotaAdimi[], eksik: [] as KisaKayit[] };
  };
  const sartli = <T extends { adimlar: RotaAdimi[] }>(c: T): T => ({ ...c, adimlar: adimlaraSartEkle(e, c.adimlar, kisi, cikis) });
  const genel = sartli(coz());
  let bilinen: RotaSonucu['bilinen'] = null;
  if (kisi) {
    kayitTuru(e, kisi);
    const izinli = new Set(e.db.selectObjects(`SELECT i.b FROM iliskiler i WHERE i.a=? AND i.tur='yolu_bilir' AND i.silindi IS NULL AND i.karar<>'vazgecildi'`, [kisi]).map((r) => yonlendir(e.db, r.b as string) as string));
    bilinen = { kisi: kisa(e, kisi), bildigiRota: izinli.size, ...sartli(coz(izinli)) };
  }
  const kapali = p ? [...p.rota.values()].filter((v) => v === false).length : 0;
  return {
    nereden: kisa(e, nereden), nereye: kisa(e, nereye), kosul, ...genel, bilinen,
    paket: p ? { kod: p.kod, ad: p.ad } : null,
    kapsam: `Kayıtlı rotalar ve elle girilmiş süreler${kosul ? ` (“${kosul}” koşulunda)` : ' (her rotanın en kısa tanımlı süresi)'}. Molalar sürelerin içinde sayılır, ayrıca eklenmez.${cikis ? ` İzinler her rotanın başına varış anında değerlendirildi (çıkış: ${cikis.ifade}).` : ''}${kapali ? ` Pakete göre ${kapali} rota kapalı.` : ''}`,
  };
}

// ---------- Haber yayılımı ----------

const BOS_KANAL: KanalTanimi = { rotalar: false, kosul: null, carpan: 1, baglantilar: [] };
export function kanalOku(e: EvrenVt, kod: string): KanalTanimi {
  const r = e.db.selectValue('SELECT tanim FROM haber_kanallari WHERE kod=?', [kod]) as string | undefined;
  return r ? JSON.parse(r) as KanalTanimi : BOS_KANAL;
}

export function kanalYaz(b: HaberBaglami, kod: string, t: KanalTanimi) {
  if (kayitTuru(b.e, kod) !== 'haberlesme') throw new Error('Bu bir haberleşme yöntemi kaydı değil.');
  const carpan = Number(t.carpan);
  if (!Number.isFinite(carpan) || carpan <= 0 || carpan > 1000) throw new Error('Hız katsayısı sıfırdan büyük bir sayı olmalı.');
  if (!Array.isArray(t.baglantilar) || t.baglantilar.length > 200) throw new Error('Bağlantı listesi geçersiz.');
  const baglantilar = t.baglantilar.map((x) => {
    kayitTuru(b.e, x.a); kayitTuru(b.e, x.b);
    if (x.a === x.b) throw new Error('Bir bağlantının iki ucu aynı olamaz.');
    const gun = Number(x.gun);
    if (!Number.isFinite(gun) || gun < 0 || gun > 100000) throw new Error('Bağlantı süresi gün olarak bir sayı olmalı.');
    return { a: x.a, b: x.b, gun };
  });
  const yeni: KanalTanimi = { rotalar: !!t.rotalar, kosul: t.kosul ? String(t.kosul).trim().slice(0, 80) || null : null, carpan, baglantilar };
  if (JSON.stringify(yeni) === JSON.stringify(kanalOku(b.e, kod))) return;
  b.yaz([{ tur: 'kanal_yaz', veri: { kod, tanim: yeni } }], [kod]);
}

export function haberCikisiOku(e: EvrenVt, kod: string): HaberCikisi {
  const r = e.db.selectObject('SELECT * FROM haber_cikislari WHERE kod=?', [kod]);
  return r ? { yer: r.yer ? kisa(e, r.yer as string) : null, tarih: r.tarih ? JSON.parse(r.tarih as string) : null, kanallar: (JSON.parse(r.kanallar as string) as string[]).map((k) => kisa(e, k)) }
    : { yer: null, tarih: null, kanallar: [] };
}

export function haberCikisiYaz(b: HaberBaglami, kod: string, g: { yer: string | null; tarih: string; kanallar: string[] }) {
  if (kayitTuru(b.e, kod) !== 'haber') throw new Error('Bu bir haber kaydı değil.');
  if (g.yer) kayitTuru(b.e, g.yer);
  const kanallar = [...new Set(g.kanallar ?? [])];
  for (const k of kanallar) if (kayitTuru(b.e, k) !== 'haberlesme') throw new Error('Kanal bir haberleşme yöntemi olmalı.');
  const ifade = String(g.tarih ?? '').trim();
  let tarih: EvrenTarihi | null = null;
  if (ifade) { tarih = tarihCoz(ifade, zamanSetiOku(b.e.db)); if (!tarih?.eksen) throw new Error('Tarih okunamadı.'); }
  b.yaz([{ tur: 'haber_cikis_yaz', veri: { kod, cikis: { yer: g.yer, tarih, kanallar } } }], [kod, ...(g.yer ? [g.yer] : [])]);
}

/** Haberin her yere en erken ulaşabileceği gün; kanal seçilmediyse bütün tanımlı kanallar. */
export function haberYayilimi(e: EvrenVt, kod: string, p: PaketEtkisi | null): HaberYayilimi {
  const c = haberCikisiOku(e, kod);
  const kanalKodlari = c.kanallar.length ? c.kanallar.map((k) => k.kod)
    : e.db.selectObjects("SELECT kod FROM kayitlar WHERE tur='haberlesme' AND silindi IS NULL AND karar<>'vazgecildi'").map((r) => r.kod as string);
  const kanallar = kanalKodlari.map((k) => kisa(e, k));
  if (!c.yer) return { cikis: c, kanallar, ulasilan: [], suresiz: [], durum: 'cikis_yok', not: 'Haberin çıkış yeri yazılmamış.' };
  const kenarlar: Kenar[] = [];
  for (const k of kanalKodlari) {
    const t = kanalOku(e, k), ad = kisa(e, k).ad;
    if (t.rotalar) kenarlar.push(...rotaKenarlari(e, t.kosul, p, t.carpan).map((x) => ({ ...x, ad: `${ad} (${x.ad})` })));
    for (const x of t.baglantilar) kenarlar.push({ a: yonlendir(e.db, x.a) as string, b: yonlendir(e.db, x.b) as string, gun: x.gun, kod: k, ad, kosul: null });
  }
  if (!kenarlar.length) return { cikis: c, kanallar, ulasilan: [], suresiz: [], durum: 'kanal_yok', not: 'Seçilen haberleşme yöntemlerinde bağlantı tanımlı değil.' };
  const ag = agHesabi(kenarlar, c.yer.kod);
  const ana = anaTakvim(zamanSetiOku(e.db));
  const ulasilan = [...ag.uzak.entries()].filter(([y]) => y !== c.yer!.kod).sort((a, b) => a[1] - b[1]).map(([y, gun]) => {
    const yol: string[] = [];
    let x = y;
    while (ag.once.has(x)) { yol.unshift(ag.once.get(x)!.kenar.ad); x = ag.once.get(x)!.nereden; }
    const ex = c.tarih?.eksen;
    const tarih = ex ? eksenAraligi({ enErken: ex.enErken === null ? null : ex.enErken + Math.round(gun * GUN_PARCA), enGec: ex.enGec === null ? null : ex.enGec + Math.round(gun * GUN_PARCA) }, ana) : null;
    return { yer: kisa(e, y), gun, yazi: `En erken ${gunYaz(gun)} sonra ulaşabilir`, tarih, yol: [...new Set(yol)] };
  });
  const suresiz = [...ag.erisilen.keys()].filter((y) => y !== c.yer!.kod && !ag.uzak.has(y)).map((y) => kisa(e, y));
  return {
    cikis: c, kanallar, ulasilan, suresiz, durum: 'hesaplandi',
    not: `Yalnızca kayıtlı kanallar. “Ulaşabilir” biri onu biliyor demek değildir; teslim, okuma, inanma ve aktarma ayrı kayıtlardır. Listede olmayan yerlere ulaşamayacağı söylenmez.${p ? ` “${p.ad}” paketiyle hesaplandı.` : ''}`,
  };
}
