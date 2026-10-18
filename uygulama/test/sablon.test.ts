import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { SORU_SETLERI, sablonGecerli, varsayilanSablon } from '../src/alan/sablon';
import { yasHesapla } from '../src/alan/yas';
import { tarihCoz } from '../src/alan/tarih';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  return { h, evren };
}
const t = (x: string) => tarihCoz(x)!;

describe('soru kütüphanesi ve şablonlar', () => {
  it('başlangıç seti geçerli; soru kodları tekrar etmez', () => {
    const kodlar = SORU_SETLERI.flatMap((s) => s.sorular.map((q) => q.kod));
    expect(new Set(kodlar).size).toBe(kodlar.length);
    for (const tur of ['karakter', 'mekan', 'sehir', 'acik_mesele', 'gerekce', 'diger']) expect(sablonGecerli(varsayilanSablon(tur), tur)).toBe(true);
    // Sabit alan kaldırılamaz.
    expect(sablonGecerli({ alanlar: [], sorular: [] }, 'karakter')).toBe(false);
  });

  it('alan değeri türüne göre saklanır; şablondan çıkan alanın değeri kaybolmaz', () => {
    const { h, evren } = kur();
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    h.kayitAlanYaz({ evren, kod: elin, alan: 'dogum', deger: '400' });
    expect(h.kayitSablonu({ evren, kod: elin }).degerler.dogum).toMatchObject({ ifade: '400' });

    const s = h.sablon({ evren, tur: 'karakter' });
    expect(s.varsayilan).toBe(true);
    expect(s.sablon.sorular).toHaveLength(6);
    const yeni = { alanlar: [...s.sablon.alanlar, { kod: 'aboy', ad: 'Boy', tur: 'metin' as const }, { kod: 'ataraf', ad: 'Taraf', tur: 'secim' as const, secenekler: [{ kod: 'k', ad: 'Kuzey' }, { kod: 'g', ad: 'Güney' }] }],
      sorular: [...s.sablon.sorular, { kod: 'sx', metin: 'Kime borçlu?' }] };
    h.sablonYaz({ evren, tur: 'karakter', sablon: yeni });
    h.kayitAlanYaz({ evren, kod: elin, alan: 'aboy', deger: '  uzun   boylu ' });
    h.kayitAlanYaz({ evren, kod: elin, alan: 'ataraf', deger: 'k' });
    expect(() => h.kayitAlanYaz({ evren, kod: elin, alan: 'ataraf', deger: 'x' })).toThrow('seçenek');
    expect(h.sablon({ evren, tur: 'karakter' }).kullanim).toEqual({ dogum: 1, aboy: 1, ataraf: 1 });

    // Boy alanı şablondan çıkarılır: değer "şablonda olmayan alanlar"a düşer, silinmez.
    h.sablonYaz({ evren, tur: 'karakter', sablon: { ...yeni, alanlar: yeni.alanlar.filter((a) => a.kod !== 'aboy') } });
    const ks = h.kayitSablonu({ evren, kod: elin });
    expect(ks.eskiler).toEqual([{ kod: 'aboy', deger: 'uzun boylu' }]);
    expect(() => h.kayitAlanYaz({ evren, kod: elin, alan: 'aboy', deger: 'kısa' })).toThrow('şablonda yok');
    h.kayitAlanYaz({ evren, kod: elin, alan: 'aboy', deger: null });
    expect(h.kayitSablonu({ evren, kod: elin }).eskiler).toEqual([]);

    // Sabit alan şablondan çıkarılamaz.
    expect(() => h.sablonYaz({ evren, tur: 'karakter', sablon: { alanlar: [], sorular: [] } })).toThrow();
    // Tür değişince değerler kalır, eski türün alanları olarak görünür.
    h.kayitDegistir({ evren, kod: elin, alan: 'tur', deger: 'topluluk' });
    expect(h.kayitSablonu({ evren, kod: elin }).eskiler.map((x) => x.kod).sort()).toEqual(['ataraf', 'dogum']);
    h.sablonYaz({ evren, tur: 'karakter', sablon: null });
    expect(h.sablon({ evren, tur: 'karakter' }).varsayilan).toBe(true);
  });

  it('sorular cevaplanır, sonraya bırakılır, ilgisiz sayılır ya da yeni kayıtla cevaplanır', () => {
    const { h, evren } = kur();
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    h.soruCevapla({ evren, kod: elin, soru: 'karakter.1', durum: 'cevaplandi', cevap: 'Ailesinin adını temizlemek' });
    h.soruCevapla({ evren, kod: elin, soru: 'karakter.2', durum: 'sonra' });
    h.soruCevapla({ evren, kod: elin, soru: 'karakter.3', durum: 'ilgisiz' });
    let s = h.kayitSablonu({ evren, kod: elin }).sorular;
    expect(s.slice(0, 3).map((q) => q.cevap?.durum)).toEqual(['cevaplandi', 'sonra', 'ilgisiz']);
    // Soru setini bu kayda ekle ve yeni kayıtla cevapla.
    h.kayitSoruSeti({ evren, kod: elin, set: 'karsit', ekle: true });
    const { kod: tarikat } = h.soruKayitla({ evren, kod: elin, soru: 'karsit.1', ad: 'Gölge Tarikatı', tur: 'topluluk' });
    s = h.kayitSablonu({ evren, kod: elin }).sorular;
    expect(s.find((q) => q.kod === 'karsit.1')?.cevap?.kayitla).toMatchObject({ kod: tarikat, ad: 'Gölge Tarikatı' });
    expect(h.kayit({ evren, kod: tarikat }).karar).toBe('fikir');
    expect(h.iliskiler({ evren, kod: elin }).some((i) => i.karsi.kod === tarikat)).toBe(true);
    // Set çıkarılınca cevaplanmış sorusu kaybolmaz.
    h.kayitSoruSeti({ evren, kod: elin, set: 'karsit', ekle: false });
    expect(h.kayitSablonu({ evren, kod: elin }).sorular.find((q) => q.kod === 'karsit.1')).toMatchObject({ eski: true, metin: 'Ne istiyor?' });
    // Boş cevap soruyu yeniden açar.
    h.soruCevapla({ evren, kod: elin, soru: 'karakter.1', durum: 'cevaplandi', cevap: '' });
    expect(h.kayitSablonu({ evren, kod: elin }).sorular[0].cevap).toBeNull();
    expect(() => h.soruCevapla({ evren, kod: elin, soru: 'yok.1', durum: 'sonra' })).toThrow('Bilinmeyen soru');

    // Evrenin soruları: Dünya Pusulası.
    h.soruCevapla({ evren, kod: 'evren', soru: 'pusula.1', durum: 'cevaplandi', cevap: 'Kıtlık' });
    const p = h.evrenSorulari({ evren }).find((x) => x.kod === 'pusula')!;
    expect(p.sorular[0].cevap?.cevap).toBe('Kıtlık');
    expect(p.sorular).toHaveLength(5);
  });

  it('açık meseleler ve gerekçe defteri', () => {
    const { h, evren } = kur();
    const buyu = h.kayitOlustur({ evren, ad: 'Kan büyüsü', tur: 'buyu_sistemi' }).kod;
    const m1 = h.yazarKaydiEkle({ evren, tur: 'acik_mesele', ad: 'Büyü yaraları iyileştirebilir mi?', bagla: buyu, onemli: true }).kod;
    h.yazarKaydiEkle({ evren, tur: 'acik_mesele', ad: 'Liman kaç kapılı?' });
    const g = h.yazarKaydiEkle({ evren, tur: 'gerekce', ad: 'Büyü iyileştirebilir mi?', bagla: buyu }).kod;
    h.kayitAlanYaz({ evren, kod: g, alan: 'cozum', deger: 'Büyü iyileştiremez' });
    h.kayitAlanYaz({ evren, kod: g, alan: 'gerekce', deger: 'Yaralar hikâyede ağırlığını korumalı.' });

    let l = h.meseleler({ evren });
    expect(l.meseleler.map((m) => [m.ad, m.durum, m.onemli])).toEqual([['Büyü yaraları iyileştirebilir mi?', 'dusunulecek', true], ['Liman kaç kapılı?', 'dusunulecek', false]]);
    expect(l.gerekceler[0]).toMatchObject({ soru: 'Büyü iyileştirebilir mi?', cozum: 'Büyü iyileştiremez', etkilenen: [{ ad: 'Kan büyüsü' }] });

    h.kayitAlanYaz({ evren, kod: m1, alan: 'durum', deger: 'kararlastirildi' });
    l = h.meseleler({ evren });
    expect(l.meseleler.map((m) => m.durum)).toEqual(['dusunulecek', 'kararlastirildi']);
    const bagli = h.meseleler({ evren, kod: buyu });
    expect(bagli.meseleler.map((m) => m.kod)).toEqual([m1]);
    expect(bagli.gerekceler.map((x) => x.kod)).toEqual([g]);
  });

  it('iki cihazda farklı alan değeri ve şablon: okunur biçimde sorulur', () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const mes = m.yazarKaydiEkle({ evren, tur: 'acik_mesele', ad: 'Kapı' }).kod;
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.kayitAlanYaz({ evren, kod: mes, alan: 'durum', deger: 'kararlastirildi' });
    tb.kayitAlanYaz({ evren, kod: mes, alan: 'durum', deger: 'gerekmiyor' });
    m.soruCevapla({ evren, kod: 'evren', soru: 'pusula.1', durum: 'cevaplandi', cevap: 'Kıtlık' });
    tb.soruCevapla({ evren, kod: 'evren', soru: 'pusula.1', durum: 'cevaplandi', cevap: 'İnanç' });
    tb.islemleriAl({ evren, islemler: m.islemleriVer({ evren, gorulen: tb.gorulenler({ evren }) }) });
    const c = tb.catismalar({ evren });
    const alan = c.find((x) => x.tur === 'alan' && x.alan === 'f:durum');
    expect(alan).toMatchObject({ alanEtiketi: 'Durum', baslik: 'Kapı' });
    expect(alan?.tur === 'alan' && alan.degerler.map((d) => d.yazi).sort()).toEqual(['Kararlaştırıldı', 'Şu an gerekmiyor']);
    const soru = c.find((x) => x.tur === 'alan' && x.alan === 's:pusula.1');
    expect(soru).toMatchObject({ baslik: 'Evren', nesneTuru: 'evren' });
    for (const x of c) if (x.tur === 'alan') tb.alanCatismasiCoz({ evren, nesne: x.nesne, alan: x.alan, islem: x.degerler[0].islem });
    expect(tb.catismalar({ evren })).toEqual([]);
  });
});

describe('yaş', () => {
  it('hassasiyeti koruyarak hesaplanır', () => {
    expect(yasHesapla(t('400'), t('415'))?.metin).toBe('14–15 yaşında');
    expect(yasHesapla(t('400'), t('390'))?.metin).toBe('Bu tarihte henüz doğmamış');
    expect(yasHesapla(t('400'), t('430'), t('420'))?.metin).toBe('Bu tarihte ölmüş');
    expect(yasHesapla(t('400'), t('420'), t('420'))?.metin).toBe('19–20 yaşında (ölmüş olabilir)');
    expect(yasHesapla(t('yaklaşık 400'), t('415'))?.metin).toBe('4–25 yaşında');
    expect(yasHesapla(t('400'), t('üçüncü kış'))?.metin).toContain('hesaplanamıyor');
    expect(yasHesapla(null, t('415'))).toBeNull();
  });

  it('sahne bağlam panelinde katılımcının yaşı görünür', () => {
    const { h, evren } = kur();
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const sahne = h.kayitOlustur({ evren, ad: 'Liman', tur: 'sahne' }).kod;
    h.kayitTarih({ evren, kod: sahne, ifade: '415' });
    h.kayitAlanYaz({ evren, kod: elin, alan: 'dogum', deger: '400' });
    h.sahneAlaniAyarla({ evren, sahne, alan: 'bakis', kayit: elin });
    expect(h.sahneBaglami({ evren, sahne }).katilimcilar[0].yas).toBe('14–15 yaşında');
  });
});
