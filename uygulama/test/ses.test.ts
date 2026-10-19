import { describe, it, expect } from 'vitest';
import { kuralCoz, sesDegistir } from '../src/alan/ses';

describe('ses değişim kuralları (§15-4)', () => {
  it('kuralları sırayla, bağlamıyla uygular ve izini döker', () => {
    const r = sesDegistir('Katalun', ['k → h / #_', 'u → o', '[td] → [dt] / V_V', 'n → ∅ / _#', '∅ → e / #_h']);
    expect(r.sonuc).toBe('Ehadalo');
    expect(r.iz.map((x) => x.sira)).toEqual([0, 1, 2, 3, 4]);
    expect(r.iz[2]).toMatchObject({ once: 'hatalon', sonra: 'hadalon' });
    expect(r.hatalar).toEqual([]);
  });
  it('aynı anda uygular: değişen ses aynı kuralda yeniden tetiklemez', () => {
    expect(sesDegistir('ata', ['a → e / _t', 'e → i']).sonuc).toBe('ita');
    expect(sesDegistir('aaa', ['a → b / a_']).sonuc).toBe('abb');
  });
  it('sınıf ve hatalar', () => {
    expect(sesDegistir('pata', ['V → ∅ / C_#'], []).sonuc).toBe('pat');
    expect(sesDegistir('sora', ['L → l'], [{ ad: 'L', harfler: 'r' }]).sonuc).toBe('sola');
    const h = sesDegistir('ab', ['Q → a', 'a > b > c', 'b → [xy]']);
    expect(h.hatalar.map((x) => x.sira)).toEqual([0, 1, 2]);
    expect(() => kuralCoz('∅ → a')).toThrow(/bağlam/);
  });
});
