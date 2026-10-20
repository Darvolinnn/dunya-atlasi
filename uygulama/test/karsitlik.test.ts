// Okunurluk denetimi (§12.1, K28): programın yazı ve zemin renk çiftleri açık ve koyu temada en az 4,5:1.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/arayuz/stil.css', import.meta.url)), 'utf8');

function degiskenler(blok: string): Record<string, string> {
  const d: Record<string, string> = {};
  for (const m of blok.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) d[m[1]] = m[2];
  return d;
}
const blokBul = (bas: string) => { const i = css.indexOf(bas); return css.slice(i, css.indexOf('}', i)); };
const acik = degiskenler(blokBul(':root {'));
const koyu = { ...acik, ...degiskenler(blokBul(':root[data-tema="koyu"] {')) };

function parlaklik(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function oran(a: string, b: string) {
  const [x, y] = [parlaklik(a), parlaklik(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** [yazı, zemin] çiftleri. */
const CIFTLER: [string, string][] = [
  ...['zemin', 'yuzey', 'yuzey-2', 'kenar', 'vurgu-zemin'].flatMap((z) => [['metin', z], ['metin-2', z]] as [string, string][]),
  ...['zemin', 'yuzey', 'yuzey-2', 'kenar'].flatMap((z) => ['vurgu', 'tehlike', 'basari', 'inanc'].map((y) => [y, z] as [string, string])),
  ['vurgu', 'vurgu-zemin'], ['vurgu-metin', 'vurgu'],
];

describe('renk karşıtlığı', () => {
  for (const [ad, tema] of [['açık', acik], ['koyu', koyu]] as const) {
    it(`${ad} temada bütün yazı renkleri en az 4,5:1`, () => {
      const zayif = CIFTLER.filter(([y, z]) => tema[y] && tema[z] && oran(tema[y], tema[z]) < 4.5)
        .map(([y, z]) => `${y} / ${z}: ${oran(tema[y], tema[z]).toFixed(2)}`);
      expect(CIFTLER.every(([y, z]) => tema[y] && tema[z])).toBe(true);
      expect(zayif).toEqual([]);
    });
  }
});

describe('sabit renkli şeritler', () => {
  it('eşitleme şeridi yazıları iki temada da en az 4,5:1; seçili yıldız (simge) en az 3:1', () => {
    const satir = (secici: string) => css.split('\n').find((s) => s.startsWith(secici)) ?? '';
    const renk = (s: string, ozellik: string) => s.match(new RegExp(`(?:^|[^-])${ozellik}: ?(#[0-9a-fA-F]{6})`))?.[1] ?? '';
    const serit = css.slice(css.indexOf('.esitleme-seridi {'), css.indexOf('}', css.indexOf('.esitleme-seridi {')));
    const koyuSerit = satir(':root[data-tema="koyu"] .esitleme-seridi {');
    const acikZemin = renk(serit, 'background'), koyuZemin = renk(koyuSerit, 'background');
    expect(oran(renk(serit, 'color'), acikZemin)).toBeGreaterThanOrEqual(4.5);
    expect(oran(renk(satir('.esitleme-seridi .hata'), 'color'), acikZemin)).toBeGreaterThanOrEqual(4.5);
    expect(oran(renk(koyuSerit, 'color'), koyuZemin)).toBeGreaterThanOrEqual(4.5);
    expect(oran(renk(satir(':root[data-tema="koyu"] .esitleme-seridi .hata'), 'color'), koyuZemin)).toBeGreaterThanOrEqual(4.5);
    expect(oran(renk(satir('.yildiz.secili'), 'color'), acik.zemin)).toBeGreaterThanOrEqual(3);
  });
});
