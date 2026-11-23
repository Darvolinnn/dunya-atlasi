// Metinde sözlük kelimeleri (K37): sözlükteki kelimeler (Türkçe ekli biçimleri de) noktalı altı çizgiyle işaretlenir;
// metne hiçbir şey eklenmez, yalnızca görünüş süslemesidir. Bir kelimenin ya da bir bağlantının üstüne gelince
// (dokunmatikte dokununca) kısa kartı açılır. Anlam çıkarılmaz (K1): yalnız adın kendisine bakılır.
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as PmNode } from 'prosemirror-model';
import { bagsizAdlar, type AranacakAd } from '../alan/bagsiz-ad';
import { bloklar } from './BagsizAdlar';

export const sozlukAnahtari = new PluginKey<{ adlar: AranacakAd[]; suslemeler: DecorationSet }>('sozluk');

function susle(doc: PmNode, adlar: AranacakAd[]): DecorationSet {
  if (!adlar.length) return DecorationSet.empty;
  const l = bloklar(doc);
  const d = bagsizAdlar(l, adlar, new Set(), 5000).map((x) => Decoration.inline(l[x.blok].pos + x.bas, l[x.blok].pos + x.son,
    { class: 'sozluk-terimi', 'data-terim': x.kodlar[0] }));
  return DecorationSet.create(doc, d);
}

/** kartAc: kod ve öğenin ekrandaki yeri; null kartı kapatır (biraz bekleyerek, kartın üstüne geçilebilsin). */
export function sozlukEklentisi(kartAc: (kod: string | null, yer?: DOMRect) => void) {
  const hedef = (e: Event) => (e.target as HTMLElement | null)?.closest?.('.sozluk-terimi, a.bag') as HTMLElement | null;
  const kod = (el: HTMLElement) => el.getAttribute('data-terim') ?? el.getAttribute('data-kayit');
  return new Plugin<{ adlar: AranacakAd[]; suslemeler: DecorationSet }>({
    key: sozlukAnahtari,
    state: {
      init: () => ({ adlar: [], suslemeler: DecorationSet.empty }),
      apply(tr, onceki, _eski, yeni) {
        const adlar = tr.getMeta(sozlukAnahtari) as AranacakAd[] | undefined;
        if (adlar) return { adlar, suslemeler: susle(yeni.doc, adlar) };
        return tr.docChanged ? { adlar: onceki.adlar, suslemeler: susle(yeni.doc, onceki.adlar) } : onceki;
      },
    },
    props: {
      decorations: (s) => sozlukAnahtari.getState(s)?.suslemeler,
      handleDOMEvents: {
        mouseover(_v, e) { const el = hedef(e); if (el && kod(el)) kartAc(kod(el), el.getBoundingClientRect()); return false; },
        mouseout(_v, e) { if (hedef(e)) kartAc(null); return false; },
        // Dokunmatikte ve kalemde üstüne gelme olmadığı için dokunmak kartı açar; imleç yine oraya gider.
        pointerup(_v, e) {
          const p = e as PointerEvent;
          if (p.pointerType === 'mouse') return false;
          const el = hedef(e);
          if (el && kod(el)) kartAc(kod(el), el.getBoundingClientRect()); else kartAc(null);
          return false;
        },
      },
    },
  });
}
