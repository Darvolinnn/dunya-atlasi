import { describe, expect, it } from 'vitest';
import { formulDegerlendir, formulOku, formulYazisi, FormulHatasi, Hesaplanamadi, type FormulCozucu, type FormulOrtami, type AlanOkumasi } from '../src/alan/formul';
import { katla } from '../src/alan/turkce';
import { tarihCoz } from '../src/alan/tarih';
import type { SablonAlani } from '../src/alan/sablon';

const ALANLAR: (SablonAlani & { turAdi: string })[] = [
  { kod: 'rutbe', ad: 'Rütbe', tur: 'secim', secenekler: [{ kod: 's1', ad: 'Subay' }, { kod: 's2', ad: 'Er' }], turAdi: 'Karakter' },
  { kod: 'muhur', ad: 'Mühürlü', tur: 'onay', turAdi: 'Karakter' },
  { kod: 'dogum', ad: 'Doğum tarihi', tur: 'tarih', turAdi: 'Karakter' },
  { kod: 'boy', ad: 'Boy', tur: 'sayi', nicelik: 'uzunluk', birim: 'cm', hassasiyet: 0, turAdi: 'Karakter' },
  { kod: 'lakap', ad: 'Lakap', tur: 'metin', turAdi: 'Karakter' },
  { kod: 'g1', ad: 'Güç', tur: 'metin', turAdi: 'Karakter' },
  { kod: 'g2', ad: 'Güç', tur: 'metin', turAdi: 'Topluluk' },
];
const KAYITLAR = [
  { kod: 'k1', ad: 'Kuzey Loncası', turAdi: 'Topluluk' },
  { kod: 'k2', ad: 'Göçebeler', turAdi: 'Kültür' },
  { kod: 'k3', ad: 'Kuzey', turAdi: 'Şehir' }, { kod: 'k4', ad: 'Kuzey', turAdi: 'Topluluk' },
];
const c: FormulCozucu = {
  kayitlar: (ad) => KAYITLAR.filter((k) => katla(k.ad) === katla(ad)),
  alanlar: (ad) => ALANLAR.filter((a) => katla(a.ad) === katla(ad)),
  tarih: (s) => tarihCoz(s),
};
const hata = (s: string) => { try { formulOku(s, c); } catch (e) { if (e instanceof FormulHatasi) return { m: e.message, k: e.konum, n: e.uzunluk }; throw e; } return null; };
const adlar = { kayit: (k: string) => KAYITLAR.find((x) => x.kod === k)?.ad ?? '?', alan: (k: string) => ALANLAR.find((x) => x.kod === k)?.ad ?? '?', secenek: (a: string, s: string) => ALANLAR.find((x) => x.kod === a)?.secenekler?.find((y) => y.kod === s)?.ad ?? '?' };

function ortam(o: Partial<{ iliskiler: string[]; alanlar: Record<string, AlanOkumasi>; yas: ReturnType<FormulOrtami['yas']>; silinen: string[]; tanimlar: Record<string, SablonAlani | null> }>): FormulOrtami {
  return {
    iliski: (i, k) => (o.iliskiler ?? []).includes(`${i}:${k}`),
    kayitAdi: (k) => (o.silinen ?? []).includes(k) ? null : KAYITLAR.find((x) => x.kod === k)?.ad ?? null,
    alanTanimi: (k) => (o.tanimlar && k in o.tanimlar ? o.tanimlar[k] : ALANLAR.find((a) => a.kod === k) ?? null),
    alan: (k) => o.alanlar?.[k] ?? { durum: 'bos' },
    yas: () => o.yas ?? { neden: 'Doğum tarihi yazılmamış.' },
  };
}

describe('formül dili (TK8)', () => {
  it('okur, adları kodla saklar ve güncel adlarla yazar', () => {
    const f = formulOku('üyesi [kuzey loncası] ve ({Rütbe} = "subay" veya değil [Göçebeler] kültüründen) ve {Boy} >= 1,8 m ve yaş >= 16 yıl', c);
    expect(f.dil).toBe(1);
    expect(JSON.stringify(f.agac)).toContain('"kayit":"k1"');
    expect(JSON.stringify(f.agac)).toContain('"secenek":"s1"');
    expect(JSON.stringify(f.agac)).toContain('"deger":180');
    expect(formulYazisi(f, adlar)).toBe('üyesi [Kuzey Loncası] ve ({Rütbe} = "Subay" veya değil kültüründen [Göçebeler]) ve {Boy} >= 180 cm ve yaş >= 16 yıl');
    expect(formulYazisi(formulOku(formulYazisi(f, adlar), c), adlar)).toBe(formulYazisi(f, adlar));
  });

  it('hatanın yerini ve sade açıklamasını verir', () => {
    expect(hata('üyesi [Kuzey Loncası] ve')).toMatchObject({ m: expect.stringContaining('yarım kaldı') });
    expect(hata('{Rütbe} = "Kaptan"')).toMatchObject({ m: expect.stringContaining('Seçenekler: Subay, Er'), k: 10 });
    expect(hata('{Boy} > 5 kg')).toMatchObject({ m: expect.stringContaining('çevrilemez'), k: 10, n: 2 });
    expect(hata('{Lakap} = "x"')).toMatchObject({ m: expect.stringContaining('Metin alanları') });
    expect(hata('{Mühürlü} = "evet"')).toMatchObject({ m: expect.stringContaining('karşılaştırılmaz') });
    expect(hata('üyesi [Kuzey]')).toMatchObject({ m: expect.stringContaining('[Kuzey (Şehir)]') });
    expect(formulOku('üyesi [Kuzey (topluluk)]', c).agac).toEqual({ t: 'iliski', iliski: 'uye', kayit: 'k4' });
    expect(hata('{Güç} = "x"')).toMatchObject({ m: expect.stringContaining('birden çok alan') });
    expect(hata('(üyesi [Kuzey Loncası]')).toMatchObject({ m: 'Parantez kapanmamış.', k: 0 });
    expect(hata('üyesi [Kuzey Loncası])')).toMatchObject({ m: expect.stringContaining('açılışı yok') });
    expect(hata('{Doğum tarihi} < 400')).toMatchObject({ m: expect.stringContaining('evren tarihi') });
    expect(hata('asker')).toMatchObject({ m: expect.stringContaining('tanınmadı') });
    expect(hata('{Boy} >= 180 cm + 2')).toMatchObject({ m: expect.stringContaining('işareti') });
    expect(hata('[Yok] üyesi')).toMatchObject({ m: expect.stringContaining('bulunamadı') });
  });

  it('üç değerli değerlendirir: kayıtsız bilgi "hayır" sayılmaz', () => {
    const f = (s: string) => formulOku(s, c);
    const uye = f('üyesi [Kuzey Loncası]');
    expect(formulDegerlendir(uye, ortam({ iliskiler: ['uye:k1'] }))).toEqual({ sonuc: 'evet', nedenler: [] });
    expect(formulDegerlendir(uye, ortam({}))).toEqual({ sonuc: 'belirsiz', nedenler: ['“Kuzey Loncası” üyesi olduğu kayıtlı değil.'] });
    expect(formulDegerlendir(f('değil üyesi [Kuzey Loncası]'), ortam({})).sonuc).toBe('belirsiz');
    // ve: biri hayırsa hayır; veya: biri evetse evet
    const rutbe = { rutbe: { durum: 'var', deger: 's2' } as AlanOkumasi };
    expect(formulDegerlendir(f('üyesi [Kuzey Loncası] ve {Rütbe} = "Subay"'), ortam({ alanlar: rutbe })).sonuc).toBe('hayir');
    expect(formulDegerlendir(f('üyesi [Kuzey Loncası] veya {Rütbe} = "Er"'), ortam({ alanlar: rutbe })).sonuc).toBe('evet');
    expect(formulDegerlendir(f('{Rütbe} != "Subay"'), ortam({ alanlar: rutbe })).sonuc).toBe('evet');
    expect(formulDegerlendir(f('{Rütbe} = "Er"'), ortam({ alanlar: { rutbe: { durum: 'celiskili' } } }))).toEqual({ sonuc: 'belirsiz', nedenler: ['“Rütbe” iki cihazda farklı yazılmış.'] });
    expect(formulDegerlendir(f('{Rütbe} = "Er"'), ortam({ alanlar: { rutbe: { durum: 'konu_disi' } } })).nedenler[0]).toContain('geçerli değil');
    // birimli sayı: aralık iki yana düşerse belirsiz
    const boy = (enAz: number, enCok: number) => ortam({ alanlar: { boy: { durum: 'var', deger: { enAz, enCok, birim: 'cm' } } } });
    expect(formulDegerlendir(f('{Boy} >= 1,8 m'), boy(181, 185)).sonuc).toBe('evet');
    expect(formulDegerlendir(f('{Boy} >= 180'), boy(170, 175)).sonuc).toBe('hayir');
    expect(formulDegerlendir(f('{Boy} >= 180'), boy(175, 185)).sonuc).toBe('belirsiz');
    expect(formulDegerlendir(f('{Boy} >= 180'), ortam({ alanlar: { boy: { durum: 'var', deger: { enAz: 1.9, enCok: 1.9, birim: 'm' } } } })).sonuc).toBe('evet');
    // tarih ve yaş
    const dogum = (s: string) => ortam({ alanlar: { dogum: { durum: 'var', deger: tarihCoz(s) } } });
    expect(formulDegerlendir(f('{Doğum tarihi} < "400"'), dogum('390')).sonuc).toBe('evet');
    expect(formulDegerlendir(f('{Doğum tarihi} < "400"'), dogum('410')).sonuc).toBe('hayir');
    expect(formulDegerlendir(f('yaş >= 16'), ortam({ yas: { enAz: 20, enCok: 21 } })).sonuc).toBe('evet');
    expect(formulDegerlendir(f('yaş >= 16'), ortam({ yas: { enAz: 15, enCok: 16 } })).sonuc).toBe('belirsiz');
    expect(formulDegerlendir(f('yaş >= 16'), ortam({})).nedenler).toEqual(['Doğum tarihi yazılmamış.']);
    // evet / hayır alanı: boş "hayır" değildir
    expect(formulDegerlendir(f('{Mühürlü}'), ortam({ alanlar: { muhur: { durum: 'var', deger: true } } })).sonuc).toBe('evet');
    expect(formulDegerlendir(f('{Mühürlü}'), ortam({})).sonuc).toBe('belirsiz');
  });

  it('sonradan bozulan formül "hesaplanamadı" der, kendiliğinden düzelmez', () => {
    const f = (s: string) => formulOku(s, c);
    expect(() => formulDegerlendir(f('üyesi [Kuzey Loncası]'), ortam({ silinen: ['k1'] }))).toThrow(Hesaplanamadi);
    expect(() => formulDegerlendir(f('{Rütbe} = "Er"'), ortam({ tanimlar: { rutbe: null } }))).toThrow('hiçbir şablonda');
    expect(() => formulDegerlendir(f('{Rütbe} = "Er"'), ortam({ tanimlar: { rutbe: { kod: 'rutbe', ad: 'Rütbe', tur: 'secim', secenekler: [{ kod: 's1', ad: 'Subay' }] } } }))).toThrow('kaldırıldı');
    expect(() => formulDegerlendir(f('{Rütbe} = "Er"'), ortam({ tanimlar: { rutbe: { kod: 'rutbe', ad: 'Rütbe', tur: 'metin' } } }))).toThrow('türü değişti');
    expect(() => formulDegerlendir(f('{Boy} > 1'), ortam({ alanlar: { boy: { durum: 'var', deger: { enAz: 1, enCok: 1, birim: 'kg' } } } }))).toThrow('çevrilemiyor');
    expect(() => formulDegerlendir({ dil: 2, agac: f('{Mühürlü}').agac }, ortam({}))).toThrow('daha yeni');
  });
});
