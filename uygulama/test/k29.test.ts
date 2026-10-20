// K29: alıntı türü, hazır türlerin soru setleri ve "@" ile bağlantının yalnız kelime başında açılması.
import { describe, expect, it } from 'vitest';
import { turBul, turBulYazidan } from '../src/alan/turler';
import { iliskiTuruGecerli } from '../src/alan/iliski-turleri';
import { varsayilanSablon } from '../src/alan/sablon';
import { soruOrnegi } from '../src/alan/soru-ornekleri';
import { kelimeBasiMi } from '../src/arayuz/baglanti-eklentisi';

describe('K29', () => {
  it('alıntı bir kayıt türüdür; türü ve bağlamı vardır, söyleyen ve sahne ilişkiyle bağlanır', () => {
    expect(turBul('alinti').ad).toBe('Alıntı');
    expect(turBulYazidan('quote')).toBe('alinti');
    expect(varsayilanSablon('alinti').alanlar.map((a) => a.kod)).toEqual(['alinti_turu', 'baglam']);
    expect(varsayilanSablon('alinti').alanlar[0].secenekler?.map((s) => s.kod)).toContain('kehanet');
    expect(iliskiTuruGecerli('soyler') && iliskiTuruGecerli('alinti_gecer')).toBe(true);
  });

  it('hazır türler soru setiyle gelir; her sorunun örneği vardır', () => {
    for (const tur of ['esya', 'inanc', 'canli', 'teknoloji', 'rituel', 'donem']) {
      const s = varsayilanSablon(tur).sorular;
      expect(s.length, tur).toBeGreaterThanOrEqual(5);
      for (const q of s) expect(soruOrnegi(q), q.kod).toBeTruthy();
    }
    // Eşyanın gerçek geçmişi ve efsanesi alanları korunur.
    expect(varsayilanSablon('esya').alanlar.map((a) => a.kod)).toEqual(['gercek_gecmis', 'efsane']);
  });

  it('"@" yalnız kelime başında bağlantı kutusu açar', () => {
    expect(kelimeBasiMi('')).toBe(true);
    expect(kelimeBasiMi('Yolcular ')).toBe(true);
    expect(kelimeBasiMi('(')).toBe(true);
    expect(kelimeBasiMi('lale')).toBe(false);
    expect(kelimeBasiMi('12')).toBe(false);
  });
});
