// Windows'ta dosya adlarında büyük-küçük harf ayrılmaz: `./Rehber` içe aktarması `rehber.ts`'e gidebilir.
// Aynı klasörde yalnız harf büyüklüğü (ve uzantısı) farklı iki dosya bulunmasın.
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function cakismalar(klasor: string): string[] {
  const sonuc: string[] = [];
  const gorulen = new Map<string, string>();
  for (const g of readdirSync(klasor, { withFileTypes: true })) {
    if (g.isDirectory()) { sonuc.push(...cakismalar(join(klasor, g.name))); continue; }
    const kok = g.name.replace(/\.[^.]+$/, '').toLocaleLowerCase('en');
    const onceki = gorulen.get(kok);
    if (onceki) sonuc.push(`${join(klasor, onceki)} ↔ ${join(klasor, g.name)}`);
    else gorulen.set(kok, g.name);
  }
  return sonuc;
}

describe('dosya adları', () => {
  it('yalnız harf büyüklüğüyle ya da uzantıyla ayrılan dosya yok', () => {
    const kok = join(import.meta.dirname, '..');
    expect([...cakismalar(join(kok, 'src')), ...cakismalar(join(kok, 'test'))]).toEqual([]);
  });
});
