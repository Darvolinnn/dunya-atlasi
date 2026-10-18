import { describe, it, expect } from 'vitest';
import { hizala, uygula, ters, buyukHatalar, type Donusum, type KontrolCifti } from '../src/alan/hizalama';

const yakin = (a: number[], b: number[]) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
const ciftler = (d: Donusum, noktalar: [number, number][]): KontrolCifti[] => noktalar.map((p) => ({ gorsel: p, uzay: uygula(d, p) }));

describe('harita hizalama (§8.5)', () => {
  it('iki çiftle benzerlik: taşıma, döndürme, ölçek', () => {
    const c = Math.cos(0.3) * 2, s = Math.sin(0.3) * 2;
    const d: Donusum = [c, s, -s, c, 40, -12];
    const h = hizala(ciftler(d, [[0, 0], [100, 50]]))!;
    expect(h.yontem).toBe('benzerlik');
    expect(yakin(h.donusum, d)).toBe(true);
    expect(h.ortalama).toBeLessThan(1e-6);
  });
  it('üç çiftle afin; eğik esneme düzelir; ters dönüşüm', () => {
    const d: Donusum = [1.5, 0.2, 0.3, 0.8, 10, 20];
    const h = hizala(ciftler(d, [[0, 0], [200, 10], [30, 150]]))!;
    expect(h.yontem).toBe('afin');
    expect(yakin(h.donusum, d)).toBe(true);
    const t = ters(d)!;
    expect(yakin(uygula(t, uygula(d, [7, 9])), [7, 9])).toBe(true);
  });
  it('aynı doğru üzerindeki üç nokta benzerliğe düşer; tek nokta oturtmaz', () => {
    expect(hizala([{ gorsel: [0, 0], uzay: [0, 0] }])).toBeNull();
    const h = hizala(ciftler([2, 0, 0, 2, 0, 0], [[0, 0], [10, 10], [20, 20]]))!;
    expect(h.yontem).toBe('benzerlik');
  });
  it('çok noktada yeniden çizilmiş yerin hatası büyük çıkar', () => {
    const d: Donusum = [1, 0, 0, 1, 0, 0];
    const c = ciftler(d, [[0, 0], [1000, 0], [0, 1000], [1000, 1000], [500, 500]]);
    c[4] = { gorsel: [500, 500], uzay: [620, 560] };
    const h = hizala(c)!;
    expect(buyukHatalar(h, 1000)).toEqual([4]);
  });
});
