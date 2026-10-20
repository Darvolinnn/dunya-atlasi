// Yazarlık rehberi (K27, §12.4): programla gelen 24 konu ve onlara verilen bağlantılar.
import { describe, it, expect } from 'vitest';
import { YAZARLIK_KONULARI } from '../src/arayuz/yazarlik-rehberi';
import { SAYFA_KONULARI, SET_KONULARI } from '../src/arayuz/YazarlikRehberi';
import { SORU_SETLERI } from '../src/alan/sablon';
import { REHBERLER } from '../src/arayuz/rehber-metinleri';

describe('yazarlık rehberi (K27)', () => {
  it('24 konu sırayla; her konuda nedir, neden ve küçük adım var; programlama terimi ve öneri izi yok', () => {
    expect(YAZARLIK_KONULARI.map((k) => k.no)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    for (const k of YAZARLIK_KONULARI) {
      expect(k.ne.length && k.neden.length && k.kucukAdim.length).toBeTruthy();
      const metin = JSON.stringify(k);
      expect(metin).not.toMatch(/\(öneri|\bP\d\b|bugün var|veritaban|işlem günlüğü/);
      for (const m of metin.matchAll(/\(Konu ([\d, ]+)\)/g)) for (const n of m[1].split(',')) expect(Number(n) >= 1 && Number(n) <= 24).toBe(true);
    }
  });

  it('sayfa ve soru seti bağlantıları var olan konulara ve sayfalara gider', () => {
    const var_ = new Set(YAZARLIK_KONULARI.map((k) => k.no));
    for (const [sayfa, l] of Object.entries(SAYFA_KONULARI)) { expect(REHBERLER[sayfa], sayfa).toBeTruthy(); for (const n of l) expect(var_.has(n)).toBe(true); }
    const setler = new Set(SORU_SETLERI.map((s) => s.kod));
    for (const [set, n] of Object.entries(SET_KONULARI)) { expect(setler.has(set), set).toBe(true); expect(var_.has(n)).toBe(true); }
  });
});
