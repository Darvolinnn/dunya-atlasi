import { describe, it, expect } from 'vitest';
import { karsilastir, tarihCoz, tarihAciklamasi, tarihYenidenHesapla, VARSAYILAN_TAKVIM } from '../src/alan/tarih';

const t = (s: string) => tarihCoz(s)!;

describe('evren tarihi', () => {
  it('biçimler çözülür; ifade korunur', () => {
    expect(t('412')).toMatchObject({ bicim: 'kesin', ifade: '412' });
    expect(t('412 yazı')).toMatchObject({ bicim: 'kesin', ifade: '412 yazı' });
    expect(t('Yıl 412')).toMatchObject({ bicim: 'kesin' });
    expect(t('410–415')).toMatchObject({ bicim: 'aralik' });
    expect(t('410 ile 415 arası')).toMatchObject({ bicim: 'aralik' });
    expect(t('yaklaşık 300')).toMatchObject({ bicim: 'yaklasik', pay: 10 });
    expect(t('~300 ±3')).toMatchObject({ bicim: 'yaklasik', pay: 3 });
    expect(t("412'den önce")).toMatchObject({ bicim: 'once' });
    expect(t('430 ve sonrası')).toMatchObject({ bicim: 'sonra' });
    expect(t('-50')).toMatchObject({ bicim: 'kesin' });
    expect(t('bilinmiyor')).toMatchObject({ bicim: 'bilinmiyor', eksen: null });
    expect(t('üçüncü hükümdarın yedinci kışı')).toMatchObject({ bicim: 'sembolik', eksen: null });
    expect(tarihCoz('  ')).toBeNull();
  });

  it('karşılaştırma üç değerlidir', () => {
    expect(karsilastir(t('410'), t('412'))).toBe('once');
    expect(karsilastir(t('415'), t('412'))).toBe('sonra');
    expect(karsilastir(t('412'), t('412'))).toBe('belirsiz');
    expect(karsilastir(t('410–415'), t('412'))).toBe('belirsiz');
    expect(karsilastir(t('yaklaşık 300'), t('305'))).toBe('belirsiz');
    expect(karsilastir(t('yaklaşık 300'), t('320'))).toBe('once');
    expect(karsilastir(t("412'den önce"), t('412'))).toBe('once');
    expect(karsilastir(t("412'den önce"), t('400'))).toBe('belirsiz');
    expect(karsilastir(t('430 ve sonrası'), t('429'))).toBe('sonra');
    expect(karsilastir(t('üçüncü hükümdarın yedinci kışı'), t('1'))).toBe('belirsiz');
    expect(karsilastir(t('-50'), t('10'))).toBe('once');
    expect(karsilastir(null, t('10'))).toBe('belirsiz');
  });

  it('takvim değişince ifade korunur, eksen yeniden hesaplanır', () => {
    const yeni = tarihYenidenHesapla(t('412 yazı'), { ...VARSAYILAN_TAKVIM, surum: 2, yilGun: 400 })!;
    expect(yeni.ifade).toBe('412 yazı');
    expect(yeni.eksen!.enErken).toBe(412 * 400);
    expect(yeni.takvimSurumu).toBe(2);
  });

  it('açıklama görünür varsayımı söyler', () => {
    expect(tarihAciklamasi(t('yaklaşık 300'))).toBe('290–310 arası sayılıyor (±10 yıl)');
    expect(tarihAciklamasi(t('412 yazı'))).toBe('Yıl 412');
  });
});
