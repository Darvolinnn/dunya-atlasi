import { it, expect } from 'vitest';
import { markdownYaz } from '../src/alan/cikti';
import { satirIci } from '../src/alan/markdown';
import { metinSemasi } from '../src/alan/metin-sema';
const sm = metinSemasi.schema;
// Kalın/eğik geçişlerinin her sırası Markdown'a çıkıp geri okununca aynı kalmalı (PR #65 Codex incelemesi).
it('rastgele kalın ve eğik dizileri Markdown gidiş-dönüşünde bozulmaz', () => {
  const bicim = [[], ['k'], ['e'], ['k', 'e']];
  const kotu: string[] = [];
  let r = 7; const rnd = (n: number) => { r = (Math.imul(r, 1103515245) + 12345) >>> 1; return Math.floor((r / 2147483648) * n); };
  for (let i = 0; i < 5000; i++) {
    const n = 2 + rnd(6); const l: [string, string[]][] = [];
    for (let j = 0; j < n; j++) { const b = bicim[rnd(4)]; const t = ['a', 'bc', 'd e', 'f ', ' g', 'ı.', '1'][rnd(7)]; if (l.length && l[l.length-1][1].join() === b.join()) continue; l.push([t, b]); }
    const doc = sm.node('doc', null, [sm.node('paragraph', null, l.map(([t, m]) => sm.text(t, m.map((x) => x === 'k' ? sm.marks.strong.create() : sm.marks.em.create()))))]);
    const md = markdownYaz(doc, () => null);
    const h = (x: { metin: string; kalin?: boolean; italik?: boolean }[]) => x.flatMap((p) => [...p.metin].map((c) => c === ' ' ? ' ' : `${c}${p.kalin ? 'K' : ''}${p.italik ? 'E' : ''}`)).join('|');
    const a = h(l.map(([t, m]) => ({ metin: t, kalin: m.includes('k'), italik: m.includes('e') })));
    const g = h(satirIci(md, {}, []));
    if (a !== g && kotu.length < 15) kotu.push(`${md}  =>  ${g}  (beklenen ${a})`);
  }
  expect(kotu).toEqual([]);
});
