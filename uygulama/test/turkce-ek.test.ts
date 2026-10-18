import { describe, it, expect } from 'vitest';
import { adDegistir, ekKalibi, ekYaz, kokAdaylari, sesBilgisi } from '../src/alan/turkce-ek';

const ek = (ad: string, ornekAd: string, ornekEk: string, okunus = '') => ekYaz(sesBilgisi(okunus || ad), ekKalibi(sesBilgisi(ornekAd), ornekEk));

describe('ek uyumu', () => {
  it('ünlü uyumu ve ünsüz benzeşmesi', () => {
    expect(ek('Velkar', 'Ela', 'da')).toBe('da');
    expect(ek('Kaelet', 'Ela', 'da')).toBe('te');
    expect(ek('Kaelet', 'Velkar', 'dan')).toBe('ten');
    expect(ek('Elin', 'Velkar', 'dan')).toBe('den');
    expect(ek('Doruk', 'Velkar', 'ın')).toBe('un');
    expect(ek('Gül', 'Velkar', 'ın')).toBe('ün');
  });
  it('kaynaştırma harfi', () => {
    expect(ek('Ela', 'Velkar', 'ı')).toBe('yı');
    expect(ek('Velkar', 'Ela', 'yı')).toBe('ı');
    expect(ek('Ela', 'Velkar', 'ın')).toBe('nın');
    expect(ek('Velkar', 'Ela', 'nın')).toBe('ın');
    expect(ek('Ela', 'Velkar', 'la')).toBe('yla');
    expect(ek('Velkar', 'Ela', 'yla')).toBe('la');
    expect(ek('Ela', 'Velkar', 'lar')).toBe('lar');
    expect(ek('Ela', 'Velkar', 'a')).toBe('ya');
  });
  it('ek dizileri ve değişmeyen -ki', () => {
    expect(ek('Kaelet', 'Velkar', 'dakiler')).toBe('tekiler');
    expect(ek('Ela', 'Kaelet', 'lerinden')).toBe('larından');
  });
  it('uydurma ad okunuşuyla ek alır', () => {
    expect(ek('Jean', 'Velkar', 'a', 'Jan')).toBe('a');
    expect(ek('Jean', 'Velkar', 'ı', 'Jan')).toBe('ı');
    expect(sesBilgisi('Jean').kesin).toBe(true);
    expect(sesBilgisi('Renée').kesin).toBe(false);
    expect(sesBilgisi('Wyx').kesin).toBe(false);
  });
  it('yazar düzeltmesinde görünen ifade', () => {
    expect(adDegistir("Velkar'dan", 'Velkar', 'Elin')).toBe("Elin'den");
    expect(adDegistir("Velkar'ı", 'Velkar', 'Ela')).toBe("Ela'yı");
    expect(adDegistir('Velkar', 'Velkar', 'Elin')).toBe('Elin');
    expect(adDegistir('VELKAR’da', 'Velkar', 'Kaelet')).toBe('Kaelet’te');
    expect(adDegistir('vali', 'Velkar', 'Elin')).toBeNull();
  });
});

describe('kök bulma', () => {
  it('çekimli biçimden kök adayları', () => {
    expect(kokAdaylari('kuzey kılıcıyla')).toContain('kuzey kilici');
    expect(kokAdaylari('kılıcını')).toContain('kilic');
    expect(kokAdaylari("Velkar'dan")).toContain('velkar');
    expect(kokAdaylari('Kaeletten')).toContain('kaelet');
    expect(kokAdaylari('ağzından')).toContain('agiz');
    expect(kokAdaylari('kitabı')).toContain('kitap');
    expect(kokAdaylari('şehirdekiler')).toContain('sehir');
  });
  it('ek atılmamış hâl ilk adaydır', () => {
    expect(kokAdaylari('Velkar')[0]).toBe('velkar');
  });
});
