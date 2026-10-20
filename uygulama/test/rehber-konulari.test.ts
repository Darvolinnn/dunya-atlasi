import { describe, it, expect } from 'vitest';
import { REHBERLER } from '../src/arayuz/rehber-metinleri';
import { SAYFA_KONULARI } from '../src/arayuz/YazarlikRehberi';
import { YAZARLIK_KONULARI } from '../src/arayuz/yazarlik-rehberi';

describe('sayfa rehberinden yazarlık rehberine bağ (§12.4, K28)', () => {
  it('rehberi olan her sayfa en az bir var olan konuya bağlanır', () => {
    const nolar = new Set(YAZARLIK_KONULARI.map((k) => k.no));
    const eksik = Object.keys(REHBERLER).filter((s) => !(SAYFA_KONULARI[s]?.length));
    expect(eksik).toEqual([]);
    for (const [s, l] of Object.entries(SAYFA_KONULARI)) for (const n of l) expect(nolar.has(n), `${s}: ${n}`).toBe(true);
  });
});
