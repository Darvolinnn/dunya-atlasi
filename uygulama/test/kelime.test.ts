import { describe, it, expect } from 'vitest';
import { kelimeSay } from '../src/alan/kelime';

describe('kelime sayma', () => {
  it('kesme işaretli ve tireli sözcükler tek, noktalama ve tire kelime sayılmaz', () => {
    expect(kelimeSay('')).toBe(0);
    expect(kelimeSay('   ')).toBe(0);
    expect(kelimeSay("Lale'nin kapısı açıldı.")).toBe(3);
    expect(kelimeSay('Yarı-insan — bekledi … 412 yılında')).toBe(4);
    expect(kelimeSay('"Divan bu gece toplanıyor."\nDeniz sustu.')).toBe(6);
  });
});
