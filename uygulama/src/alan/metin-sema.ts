// Serbest metnin yapısı: paragraf, başlık, alıntı; vurgu, kalın ve kayda bağlantı (§5.1). İşaret (§5.7)
// sonraki aşamalarda buraya eklenir. Automerge'deki karşılıkları "automerge" anahtarlarıdır.
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
    // Bağlantı: hedef kaydın kodu. Görünen ifade metnin kendisidir (ekler dahil); hedeften ayrı tutulur.
    // Bağlantılı ifade yazım denetiminden muaftır (§5.1, TK yazım denetimi deneyi).
    bag: {
      attrs: { hedef: {} },
      inclusive: false,
      automerge: {
        markName: 'bag',
        parsers: {
          fromAutomerge: (v) => ({ hedef: String(v) }),
          fromProsemirror: (m) => String(m.attrs.hedef),
        },
      },
      parseDOM: [{ tag: 'a[data-kayit]', getAttrs: (d) => ({ hedef: (d as HTMLElement).getAttribute('data-kayit') }) }],
      toDOM: (m) => ['a', { 'data-kayit': m.attrs.hedef, class: 'bag', spellcheck: 'false' }, 0],
    },
  },
});

/** Worker'da updateSpans için işaret genişleme kuralları (şemadan türetilir). */
export const spanAyari = () => metinSemasi.updateSpansConfig();

type Span = { type: 'text'; value: string; marks?: Record<string, unknown> } | { type: 'block'; value: unknown };

/** Arama ve önizleme için düz metin: bloklar satır sonuyla ayrılır. */
export function duzMetin(spans: readonly Span[]): string {
  let s = '';
  for (const sp of spans) {
    if (sp.type === 'block') { if (s) s += '\n'; }
    else s += sp.value;
  }
  return s;
}

/** Metindeki bağlantılar, sırayla: hedef kod ve görünen ifade. Ardışık parçalar aynı hedefteyse tek bağlantıdır. */
export function baglantilar(spans: readonly Span[]): { hedef: string; metin: string; parcalar: number[] }[] {
  const sonuc: { hedef: string; metin: string; parcalar: number[] }[] = [];
  let son: (typeof sonuc)[number] | null = null;
  spans.forEach((sp, i) => {
    const hedef = sp.type === 'text' ? sp.marks?.bag : undefined;
    if (typeof hedef === 'string' && hedef) {
      if (son && son.hedef === hedef && son.parcalar[son.parcalar.length - 1] === i - 1) { son.metin += (sp as { value: string }).value; son.parcalar.push(i); }
      else { son = { hedef, metin: (sp as { value: string }).value, parcalar: [i] }; sonuc.push(son); }
    } else son = null;
  });
  return sonuc;
}
