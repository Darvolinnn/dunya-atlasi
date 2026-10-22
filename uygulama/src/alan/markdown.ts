// Markdown ve prototip içe aktarımı (§10.11, A6, T14). Metin programın metin yapısına çevrilir; HTML
// çalıştırılmaz, düz metin olarak kalır. Kaybolan biçimler rapora yazılır, bağlantılar korunur.
import type { Mark, Node as PmNode } from 'prosemirror-model';
import { metinSemasi } from './metin-sema';
import { katla } from './turkce';

const sema = metinSemasi.schema;

/** İçe alınacak bir kaydın ara biçimi: ad, ön bilgiler ve Markdown gövde. */
export interface IceKayit { kaynak: string; ad: string; ozellikler: Record<string, unknown>; govde: string }

/** Rapor sayaçları: hangi biçimin kaç kez düz metne döndüğü. */
export type Kayiplar = Record<string, number>;
const say = (k: Kayiplar, ad: string, n = 1) => { k[ad] = (k[ad] ?? 0) + n; };

// ---------- Ön bilgi (YAML benzeri basit başlık) ----------
export function onBilgiAyir(metin: string): { ozellikler: Record<string, unknown>; govde: string } {
  const m = metin.replace(/^﻿/, '').replace(/\r\n?/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { ozellikler: {}, govde: metin.replace(/^﻿/, '').replace(/\r\n?/g, '\n') };
  const ozellikler: Record<string, unknown> = {};
  let liste: string | null = null;
  for (const satir of m[1].split('\n')) {
    const madde = satir.match(/^\s+-\s+(.*)$/);
    if (madde && liste) { (ozellikler[liste] as string[]).push(tirnaksiz(madde[1])); continue; }
    const kv = satir.match(/^([^:#\s][^:]*):\s*(.*)$/);
    if (!kv) continue;
    const anahtar = kv[1].trim();
    const deger = kv[2].trim();
    if (!deger) { ozellikler[anahtar] = []; liste = anahtar; continue; }
    liste = null;
    if (/^\[.*\]$/.test(deger)) ozellikler[anahtar] = deger.slice(1, -1).split(',').map((x) => tirnaksiz(x.trim())).filter(Boolean);
    else ozellikler[anahtar] = tirnaksiz(deger);
  }
  return { ozellikler, govde: m[2] };
}
const tirnaksiz = (s: string) => s.replace(/^["'](.*)["']$/, '$1');

// ---------- Satır içi ----------
export interface Parca { metin: string; kalin?: boolean; italik?: boolean; hedef?: string }

const BAG = /!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\](['’][\p{L}]+|[\p{L}]+)?|!?\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;
const VURGU = /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1|(?<![\p{L}\p{N}])_(?=\S)([^_]+?)(?<=\S)_(?![\p{L}\p{N}])|\*(?=\S)([^*]+?)(?<=\S)\*/gu;

function vurgular(s: string, k: Kayiplar): Parca[] {
  const sonuc: Parca[] = [];
  let son = 0;
  for (const m of s.matchAll(VURGU)) {
    if (m.index! > son) sonuc.push({ metin: s.slice(son, m.index) });
    if (m[2] !== undefined) sonuc.push(...vurgular(m[2], k).map((p) => ({ ...p, kalin: true })));
    else sonuc.push(...vurgular((m[4] ?? m[5])!, k).map((p) => ({ ...p, italik: true })));
    son = m.index! + m[0].length;
  }
  if (son < s.length) sonuc.push({ metin: s.slice(son) });
  return sonuc.map((p) => {
    if (/`/.test(p.metin)) { say(k, 'kod'); p.metin = p.metin.replace(/`([^`]*)`/g, '$1'); }
    if (/<\/?[a-z][^>]*>/i.test(p.metin)) say(k, 'html');
    return p;
  });
}

/** Bağlantıdaki yüzde kodlu yol; kodlaması bozuksa ("%100.png") yazıldığı gibi kalır. */
const yolCoz = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** Bir satırı parçalara böler: bağlantı, kalın, italik. Gömülü görsellerin yolları (yazıldığı gibi) ayrıca döner. */
export function satirIci(s: string, k: Kayiplar, gomululer: string[]): Parca[] {
  const sonuc: Parca[] = [];
  let son = 0;
  for (const m of s.matchAll(BAG)) {
    if (m.index! > son) sonuc.push(...vurgular(s.slice(son, m.index), k));
    son = m.index! + m[0].length;
    const gomme = m[0].startsWith('!');
    if (m[1] !== undefined) {
      if (gomme) { gomululer.push(m[1].trim()); continue; }
      const hedef = m[1].trim();
      sonuc.push({ metin: (m[2] ?? m[1]).trim() + (m[3] ?? ''), hedef });
    } else {
      if (gomme) { gomululer.push(yolCoz(m[5])); continue; }
      sonuc.push({ metin: m[4] ? `${m[4]} (${m[5]})` : m[5] });
      say(k, 'dis-baglanti');
    }
  }
  if (son < s.length) sonuc.push(...vurgular(s.slice(son), k));
  return sonuc.filter((p) => p.metin.length > 0);
}

// ---------- Bloklar ----------
export type Blok = { tur: 'paragraf' | 'baslik' | 'alinti'; seviye?: number; parcalar: Parca[] };

/** Markdown gövdeyi bloklara çevirir. Her dolu satır bir paragraftır (Obsidian'daki görünümü korur). */
export function bloklar(govde: string, k: Kayiplar, gomululer: string[]): Blok[] {
  const sonuc: Blok[] = [];
  let kodBlogu = false;
  for (const ham of govde.replace(/\r\n?/g, '\n').split('\n')) {
    const satir = ham.replace(/\s+$/, '');
    if (/^\s*(```|~~~)/.test(satir)) { kodBlogu = !kodBlogu; if (kodBlogu) say(k, 'kod-blogu'); continue; }
    if (kodBlogu) { if (satir) sonuc.push({ tur: 'paragraf', parcalar: [{ metin: satir }] }); continue; }
    if (!satir.trim()) continue;
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(satir)) { say(k, 'ayrac'); continue; }
    let m = satir.match(/^(#{1,6})\s+(.*)$/);
    if (m) { sonuc.push({ tur: 'baslik', seviye: m[1].length <= 2 ? 2 : 3, parcalar: satirIci(m[2].replace(/\s+#+$/, ''), k, gomululer) }); continue; }
    m = satir.match(/^\s*>\s?(.*)$/);
    if (m) {
      if (/^\[!/.test(m[1])) say(k, 'uyari-kutusu');
      if (m[1].trim()) sonuc.push({ tur: 'alinti', parcalar: satirIci(m[1], k, gomululer) });
      continue;
    }
    m = satir.match(/^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?(.*)$/);
    if (m) {
      say(k, 'madde');
      const isaret = /\d/.test(m[2]) ? m[2].replace(')', '.') + ' ' : '• ';
      const girinti = m[1].replace(/\t/g, '  ').length >= 2 ? '  ' : '';
      const kutu = m[3] ? (/[xX]/.test(m[3]) ? '☑ ' : '☐ ') : '';
      sonuc.push({ tur: 'paragraf', parcalar: [{ metin: girinti + isaret + kutu }, ...satirIci(m[4], k, gomululer)] });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(satir)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(satir)) continue;
      say(k, 'tablo-satiri');
    }
    sonuc.push({ tur: 'paragraf', parcalar: satirIci(satir.trim(), k, gomululer) });
  }
  return sonuc.filter((b) => b.parcalar.length > 0);
}

/** Blokları editör belgesine çevirir. `hedefKodu` bağlantının adını kayıt koduna çevirir. */
export function belgeYap(b: Blok[], hedefKodu: (ad: string) => string): PmNode {
  const satir = (parcalar: Parca[]) => parcalar.map((p) => {
    const isaretler: Mark[] = [];
    if (p.kalin) isaretler.push(sema.marks.strong.create());
    if (p.italik) isaretler.push(sema.marks.em.create());
    if (p.hedef) isaretler.push(sema.marks.bag.create({ hedef: hedefKodu(p.hedef) }));
    return sema.text(p.metin, isaretler);
  });
  const dugumler = b.map((x) => x.tur === 'baslik' ? sema.node('heading', { level: x.seviye }, satir(x.parcalar))
    : x.tur === 'alinti' ? sema.node('blockquote', null, [sema.node('paragraph', null, satir(x.parcalar))])
    : sema.node('paragraph', null, satir(x.parcalar)));
  return sema.node('doc', null, dugumler.length ? dugumler : [sema.node('paragraph')]);
}

// ---------- Ön bilgi alanlarının anlamı ----------
const ANAHTARLAR: Record<string, string[]> = {
  ad: ['ad', 'adi', 'isim', 'name', 'title', 'baslik'],
  tur: ['tur', 'type', 'kategori', 'category', 'kind', 'cesit'],
  etiketler: ['etiketler', 'etiket', 'tags', 'tag'],
  lakaplar: ['lakaplar', 'lakap', 'aliases', 'alias', 'takma ad', 'diger adlar'],
  ozet: ['ozet', 'summary', 'description', 'aciklama', 'kisa ozet'],
  tarih: ['tarih', 'date', 'yil', 'year', 'evren tarihi', 'donem'],
  okunus: ['okunus', 'pronunciation', 'telaffuz'],
  karar: ['karar', 'durum', 'status', 'karar durumu'],
  govde: ['metin', 'icerik', 'content', 'body', 'text', 'notes', 'not', 'notlar', 'aciklamalar'],
};
const ANAHTAR_HARITASI = new Map(Object.entries(ANAHTARLAR).flatMap(([k, l]) => l.map((x) => [x, k] as const)));
export const anahtarAnlami = (anahtar: string) => ANAHTAR_HARITASI.get(katla(anahtar).replace(/[_-]+/g, ' ').trim()) ?? null;

export const listeYap = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => String(x).replace(/^#/, '').trim()).filter(Boolean)
  : typeof v === 'string' ? v.split(/[,;]/).map((x) => x.replace(/^#/, '').trim()).filter(Boolean) : [];

// ---------- Prototip (JSON) ----------
/** JSON içindeki kayıt listesini bulur: en büyük nesne dizisi ya da adı olan nesnelerden oluşan sözlük. */
export function jsonKayitlari(veri: unknown, kaynak: string): IceKayit[] {
  const adBul = (o: Record<string, unknown>) => {
    for (const [a, d] of Object.entries(o)) if (anahtarAnlami(a) === 'ad' && typeof d === 'string' && d.trim()) return d.trim();
    return null;
  };
  let en: Record<string, unknown>[] = [];
  const tara = (x: unknown, derinlik: number) => {
    if (derinlik > 3 || !x || typeof x !== 'object') return;
    const degerler = Array.isArray(x) ? x : Object.values(x);
    const nesneler = degerler.filter((d): d is Record<string, unknown> => !!d && typeof d === 'object' && !Array.isArray(d) && adBul(d as Record<string, unknown>) !== null);
    if (nesneler.length > en.length) en = nesneler;
    for (const d of degerler) tara(d, derinlik + 1);
  };
  tara(veri, 0);
  return en.map((o, i) => {
    const ozellikler: Record<string, unknown> = {};
    let govde = '';
    for (const [a, d] of Object.entries(o)) {
      const anlam = anahtarAnlami(a);
      if (anlam === 'govde' && typeof d === 'string') govde += (govde ? '\n\n' : '') + d;
      else if (anlam !== 'ad') ozellikler[a] = d;
    }
    return { kaynak: `${kaynak} #${i + 1}`, ad: adBul(o)!, ozellikler, govde };
  });
}

/** Markdown dosyasından ara kayıt: ad ön bilgiden ya da dosya adından gelir. */
export function markdownKaydi(yol: string, metin: string): IceKayit {
  const { ozellikler, govde } = onBilgiAyir(metin);
  const dosya = yol.split('/').pop()!.replace(/\.(md|markdown|txt)$/i, '');
  let ad = dosya;
  for (const [a, d] of Object.entries(ozellikler)) if (anahtarAnlami(a) === 'ad' && typeof d === 'string' && d.trim()) { ad = d.trim(); delete ozellikler[a]; }
  const klasorler = yol.split('/').slice(0, -1).filter(Boolean);
  if (klasorler.length) ozellikler['_klasor'] = klasorler;
  return { kaynak: yol, ad, ozellikler, govde };
}
