// K38: büyük harita döşemesinin hesapları.
import { describe, it, expect } from 'vitest';
import { doselenir, dosemeSeviyesi, enKabaSeviye, seviyeDosemeleri, DOSEME } from '../src/arayuz/doseme';

describe('K38: harita döşemesi', () => {
  it('yalnız büyük görsel döşenir; seviye yakınlığa göre seçilir, ekrandakinden kaba olmaz', () => {
    expect(doselenir(4096, 3000)).toBe(false);
    expect(doselenir(6000, 3000)).toBe(true);
    expect(enKabaSeviye(6000, 3000)).toBe(4); // 6000/16 = 375 ≤ 512
    expect(dosemeSeviyesi(0.1, 1, 6000, 3000)).toBe(3); // 1/8 ≥ 0,1
    expect(dosemeSeviyesi(0.1, 2, 6000, 3000)).toBe(2); // yoğun ekranda bir seviye ince
    expect(dosemeSeviyesi(3, 1, 6000, 3000)).toBe(0);
    expect(dosemeSeviyesi(0.001, 1, 6000, 3000)).toBe(4);
  });
  it('parçalar görseli boşluksuz ve taşmadan örter', () => {
    for (const k of [0, 1, 2]) {
      const l = seviyeDosemeleri(6000, 3000, k);
      const alan = l.reduce((t, d) => t + d.sg * d.sy2, 0);
      expect(alan).toBe(6000 * 3000);
      for (const d of l) {
        expect(d.g).toBeLessThanOrEqual(DOSEME);
        expect(d.sx + d.sg).toBeLessThanOrEqual(6000);
        expect(d.sy + d.sy2).toBeLessThanOrEqual(3000);
      }
    }
    expect(seviyeDosemeleri(6000, 3000, 0)).toHaveLength(12 * 6);
  });
});
