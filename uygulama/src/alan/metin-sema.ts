// Serbest metnin yapısı: paragraf, başlık, alıntı; vurgu ve kalın. Bağlantı (§5.1) ve işaret (§5.7)
// sonraki dilimlerde buraya eklenir. Automerge'deki karşılıkları "automerge" anahtarlarıdır.
import { SchemaAdapter } from '@automerge/prosemirror';

export const metinSemasi = new SchemaAdapter({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      automerge: { block: 'paragraph' },
      content: 'inline*', group: 'block',
      parseDOM: [{ tag: 'p' }], toDOM: () => ['p', 0],
    },
    heading: {
      automerge: {
        block: 'heading',
        attrParsers: {
          fromAutomerge: (b) => ({ level: Number(b.attrs.level) || 2 }),
          fromProsemirror: (n) => ({ level: n.attrs.level }),
        },
      },
      attrs: { level: { default: 2 } },
      content: 'inline*', group: 'block', defining: true,
      parseDOM: [{ tag: 'h2', attrs: { level: 2 } }, { tag: 'h3', attrs: { level: 3 } }],
      toDOM: (n) => ['h' + n.attrs.level, 0],
    },
    blockquote: {
      automerge: { block: 'blockquote' },
      content: 'block+', group: 'block', defining: true,
      parseDOM: [{ tag: 'blockquote' }], toDOM: () => ['blockquote', 0],
    },
    unknownBlock: {
      automerge: { unknownBlock: true },
      group: 'block', content: 'block+',
      parseDOM: [{ tag: 'div', attrs: { 'data-unknown-block': 'true' } }],
      toDOM: () => ['div', { 'data-unknown-block': 'true' }, 0],
    },
    text: { group: 'inline' },
  },
  marks: {
    em: {
      automerge: { markName: 'em' },
      parseDOM: [{ tag: 'i' }, { tag: 'em' }], toDOM: () => ['em', 0],
    },
    strong: {
      automerge: { markName: 'strong' },
      parseDOM: [{ tag: 'b' }, { tag: 'strong' }], toDOM: () => ['strong', 0],
    },
  },
});

/** Worker'da updateSpans için işaret genişleme kuralları (şemadan türetilir). */
export const spanAyari = () => metinSemasi.updateSpansConfig();

type Span = { type: 'text'; value: string } | { type: 'block'; value: unknown };

/** Arama ve önizleme için düz metin: bloklar satır sonuyla ayrılır. */
export function duzMetin(spans: readonly Span[]): string {
  let s = '';
  for (const sp of spans) {
    if (sp.type === 'block') { if (s) s += '\n'; }
    else s += sp.value;
  }
  return s;
}
