// Okunabilir dışa aktarma için metin dönüştürücüler (§10.11): kayıt metni (Automerge parçaları) Markdown'a ve
// XHTML'e çevrilir. Bağlantılar Markdown'da Obsidian biçiminde ([[Ad|görünen]]) korunur; kitap çıktısında düz metindir.
import type { Node as PmNode } from 'prosemirror-model';
import { pmDocFromSpans } from '@automerge/prosemirror';
import { metinSemasi } from './metin-sema';

export const belgeyeCevir = (spans: unknown[]): PmNode => pmDocFromSpans(metinSemasi, spans as never);

const mdKacis = (s: string) => s.replace(/([\\*_`[\]#<>|])/g, '\\$1');
export const xmlKacis = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function satirIciMd(n: PmNode, hedefAdi: (kod: string) => string | null): string {
  let s = '';
  n.forEach((c) => {
    if (!c.isText) return;
    let t = mdKacis(c.text ?? '');
    const bag = c.marks.find((m) => m.type.name === 'bag');
    if (bag) {
      const ad = hedefAdi(String(bag.attrs.hedef));
      if (ad) t = ad === c.text ? `[[${ad}]]` : `[[${ad}|${(c.text ?? '').replace(/[|\]]/g, '')}]]`;
    }
    if (c.marks.some((m) => m.type.name === 'strong')) t = `**${t}**`;
    if (c.marks.some((m) => m.type.name === 'em')) t = `*${t}*`;
    s += t;
  });
  return s;
}

/** Belgeyi Markdown'a çevirir. Her blok ayrı paragraftır. */
export function markdownYaz(doc: PmNode, hedefAdi: (kod: string) => string | null, onek = ''): string {
  const parcalar: string[] = [];
  doc.forEach((b) => {
    if (b.type.name === 'heading') parcalar.push(`${onek}${'#'.repeat(Math.min(6, Number(b.attrs.level) || 2))} ${satirIciMd(b, hedefAdi)}`);
    else if (b.type.name === 'blockquote' || b.type.name === 'unknownBlock') parcalar.push(markdownYaz(b, hedefAdi, `${onek}> `));
    else {
      const t = satirIciMd(b, hedefAdi);
      parcalar.push(t ? `${onek}${t}` : onek.trim());
    }
  });
  return parcalar.join(onek ? `\n${onek.trim()}\n` : '\n\n');
}

function satirIciXhtml(n: PmNode): string {
  let s = '';
  n.forEach((c) => {
    if (!c.isText) return;
    let t = xmlKacis(c.text ?? '');
    if (c.marks.some((m) => m.type.name === 'strong')) t = `<strong>${t}</strong>`;
    if (c.marks.some((m) => m.type.name === 'em')) t = `<em>${t}</em>`;
    s += t;
  });
  return s;
}

/** Belgeyi kitap çıktısı için XHTML'e çevirir; bağlantılar okura düz metin olarak görünür. */
export function xhtmlYaz(doc: PmNode): string {
  const parcalar: string[] = [];
  doc.forEach((b) => {
    if (b.type.name === 'heading') { const l = Math.min(6, (Number(b.attrs.level) || 2) + 1); parcalar.push(`<h${l}>${satirIciXhtml(b)}</h${l}>`); }
    else if (b.type.name === 'blockquote' || b.type.name === 'unknownBlock') parcalar.push(`<blockquote>${xhtmlYaz(b)}</blockquote>`);
    else { const t = satirIciXhtml(b); if (t.trim()) parcalar.push(`<p>${t}</p>`); }
  });
  return parcalar.join('\n');
}

/** Dosya adı olarak güvenli ad (Obsidian bağlantılarıyla aynı kalsın diye Türkçe harfler korunur). */
export function dosyaAdi(ad: string): string {
  return ad.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Adsız';
}

/** YAML ön bilgisi için değer. */
export function yamlDeger(v: unknown): string {
  if (Array.isArray(v)) return v.length ? `\n${v.map((x) => `  - ${yamlDeger(x)}`).join('\n')}` : '[]';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v ?? '');
  return /^[\p{L}\p{N} .,'()-]+$/u.test(s) && !/^(true|false|null|yes|no|on|off|[\d.-]+)$/i.test(s) && s.trim() === s && s ? s : JSON.stringify(s);
}
