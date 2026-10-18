import { describe, it, expect } from 'vitest';
import { GUN_PARCA, VARSAYILAN_TAKVIM, eksenYili, farkCoz, farkYazisi, kaydir, paralelYazilar, tarihAciklamasi, tarihCoz, takvimGecerli, yilParcasi,
  type Akis, type EvrenTarihi, type ParalelTakvim, type Takvim, type ZamanSeti } from '../src/alan/tarih';
import { goreliCoz } from '../src/alan/goreli';

const ana: Takvim = { kod: 'ana', surum: 2, ad: 'Yıl', yilGun: 360, aylar: Array.from({ length: 12 }, (_, i) => ({ ad: ['Kar', 'Buz', 'Tohum', 'Filiz', 'Çiçek', 'Güneş', 'Hasat', 'Bağ', 'Yaprak', 'Sis', 'Rüzgâr', 'Ayaz'][i], gun: 30 })),
  caglar: [{ ad: 'Kuruluş öncesi', baslangic: 0, ters: true }, { ad: 'Birinci Çağ', baslangic: 1 }, { ad: 'İkinci Çağ', baslangic: 301 }] };
const dongu: ParalelTakvim = { kod: 'dongu01', surum: 1, ad: 'Döngü', yilGun: 400, cap: { yil: 1, ana: '1 Kar 101' }, bagli: null };
const bilinmez: ParalelTakvim = { kod: 'eski0001', surum: 1, ad: 'Hanedan', yilGun: 365, cap: null, bagli: null };
const fey: Akis = { kod: 'fey00001', ad: 'Fey', bagli: null, cap: '1 Kar 400', oranlar: [{ bas: null, akis: 10, ana: [1, 1] }] };
const z: ZamanSeti = { ana, diger: [dongu, bilinmez], akislar: [fey] };

describe('çağlar', () => {
  it('çağ adıyla yazılan yıl düz yıla çevrilir; geri sayan çağ geriye sayar', () => {
    expect(eksenYili(tarihCoz('İkinci Çağ 12', ana)!.eksen!.enErken!, ana)).toBe(312);
    expect(eksenYili(tarihCoz('Birinci Çağ 5', ana)!.eksen!.enErken!, ana)).toBe(5);
    expect(eksenYili(tarihCoz('Kuruluş öncesi 30', ana)!.eksen!.enErken!, ana)).toBe(-29);
    expect(eksenYili(tarihCoz("İkinci Çağ'ın 12. yılı, Hasat'ın 3. günü", ana)?.eksen?.enErken ?? 0, ana)).toBeTypeOf('number');
    const r = tarihCoz('Kuruluş öncesi 30–20', ana)!;
    expect(r.bicim).toBe('aralik');
    expect(eksenYili(r.eksen!.enErken!, ana)).toBe(-29);
    expect(eksenYili(r.eksen!.enGec!, ana)).toBe(-19);
  });
  it('okunuş çağla yazılır', () => {
    expect(tarihAciklamasi(tarihCoz('312', ana)!, ana)).toBe('İkinci Çağ 12');
    expect(tarihAciklamasi(tarihCoz('-29', ana)!, ana)).toBe('Kuruluş öncesi 30');
    expect(tarihAciklamasi(tarihCoz('3 Hasat 312', ana)!, ana)).toBe('İkinci Çağ 12, Hasat ayının 3. günü');
  });
  it('geri sayan çağ ileri çağlardan önce olmalı; adlar tekrar etmemeli', () => {
    expect(takvimGecerli(ana)).toBe(true);
    expect(takvimGecerli({ ...ana, caglar: [{ ad: 'Önce', baslangic: 5, ters: true }, { ad: 'Sonra', baslangic: 1 }] })).toBe(false);
    expect(takvimGecerli({ ...ana, caglar: [{ ad: 'Hasat', baslangic: 1 }] })).toBe(false);
  });
});

describe('paralel takvimler', () => {
  it('başlangıç eşlemesi bilinen takvimdeki tarih ana eksene çevrilir', () => {
    const t = tarihCoz('Döngü 1', z)!;
    expect(t.takvim).toBe('dongu01');
    expect(t.eksen!.enErken).toBe(tarihCoz('1 Kar 101', ana)!.eksen!.enErken);
    expect(t.eksen!.enGec! - t.eksen!.enErken!).toBe(400 * GUN_PARCA - 1);
    expect(tarihAciklamasi(t, z)).toBe('Döngü 1');
  });
  it('eşleme bilinmiyorsa kesin dönüşüm uydurulmaz (Z7)', () => {
    const t = tarihCoz('Hanedan 40', z)!;
    expect(t.eksen).toBeNull();
    expect(t.yerel).not.toBeNull();
    expect(tarihAciklamasi(t, z)).toContain('ana takvime çevrilemiyor');
    expect(paralelYazilar(t, z)).toEqual([]);
  });
  it('aynı tarih paralel gösterilir; yıllar örtüşmüyorsa aralık çıkar', () => {
    const t = tarihCoz('105', z)!;
    const p = paralelYazilar(t, z);
    expect(p).toEqual([{ takvim: 'Döngü', yazi: 'Döngü 4 ile Döngü 5 arası' }]);
    const g = paralelYazilar(tarihCoz('Döngü 1', z)!, z);
    expect(g[0].takvim).toBe('Ana takvim');
  });
});

describe('zaman akışları', () => {
  it('akıştaki tarih ana eksene oranla çevrilir (Z18)', () => {
    const t = tarihCoz('Fey 30. gün', z)!;
    expect(t.akis).toBe('fey00001');
    const bas = tarihCoz('1 Kar 400', ana)!.eksen!.enErken!;
    expect(t.eksen!.enErken).toBe(bas + Math.floor((29 * GUN_PARCA) / 10));
    expect(tarihAciklamasi(t, z)).toContain('Fey akışının 30. günü; ana akışta');
  });
  it('oran aralıksa sonuç da aralıktır; bilinmeyen dönemde yalnızca sonrası bilinir', () => {
    const a: Akis = { ...fey, oranlar: [{ bas: null, akis: 1, ana: [1, 2] }, { bas: '1 Kar 401', akis: 1, ana: null }] };
    const z2 = { ...z, akislar: [a] };
    const t = tarihCoz('Fey 10. gün', z2)!;
    const bas = tarihCoz('1 Kar 400', ana)!.eksen!.enErken!;
    expect(t.eksen!.enErken).toBe(bas + 9 * GUN_PARCA);
    expect(t.eksen!.enGec).toBe(bas + 2 * (10 * GUN_PARCA - 1));
    const u = tarihCoz('Fey 2. yıl', z2)!;
    expect(u.eksen!.enGec).toBeNull();
    expect(u.eksen!.enErken).not.toBeNull();
  });
});

describe('göreli ve çapalı tarih', () => {
  it('fark yazısı okunur', () => {
    expect(farkCoz('80–120 yıl sonra')).toEqual({ yon: 'sonra', en: 80, cok: 120, birim: 'yil' });
    expect(farkCoz('14 gün sonra')).toEqual({ yon: 'sonra', en: 14, cok: 14, birim: 'gun' });
    expect(farkCoz('önce')).toEqual({ yon: 'once', en: null, cok: null, birim: 'gun' });
    expect(farkCoz('120–80 yıl sonra')).toBeNull();
    expect(farkYazisi(farkCoz('300 yıl önce')!)).toBe('300 yıl önce');
    const k = kaydir(tarihCoz('412')!.eksen, farkCoz('14 gün sonra')!, VARSAYILAN_TAKVIM)!;
    expect(k.enErken).toBe(412 * 365 * GUN_PARCA + 14 * GUN_PARCA);
  });

  const g = (kisitlar: EvrenTarihi['kisitlar']): EvrenTarihi => ({ ifade: '', bicim: 'goreli', hassasiyet: 'yil', takvim: 'varsayilan', takvimSurumu: 1, kisitlar, eksen: null });
  const yp = yilParcasi(VARSAYILAN_TAKVIM);
  it('kısıtlar olası aralığı verir; zincir boyunca daralır', () => {
    const m = new Map<string, EvrenTarihi | null>([
      ['tufan', tarihCoz('100')!],
      ['olum', tarihCoz('210')!],
      ['x', g([{ olay: 'tufan', yon: 'sonra', en: 80, cok: 120, birim: 'yil' }, { olay: 'olum', yon: 'once', en: null, cok: null, birim: 'gun' }])],
      ['y', g([{ olay: 'x', yon: 'sonra', en: 5, cok: 5, birim: 'yil' }])],
    ]);
    const s = goreliCoz(m, VARSAYILAN_TAKVIM);
    const x = s.get('x')!.eksen!;
    expect(Math.floor(x.enErken! / yp)).toBe(180);
    expect(Math.floor(x.enGec! / yp)).toBe(210);
    expect(x.enGec).toBe(211 * yp - 2);
    const y = s.get('y')!.eksen!;
    expect(Math.floor(y.enErken! / yp)).toBe(185);
    expect(s.get('tufan')).toBeUndefined();
  });
  it('imkânsız kısıtta çelişen zincir gösterilir; başka bileşen etkilenmez', () => {
    const m = new Map<string, EvrenTarihi | null>([
      ['a', g([{ olay: 'b', yon: 'sonra', en: null, cok: null, birim: 'gun' }])],
      ['b', g([{ olay: 'c', yon: 'sonra', en: null, cok: null, birim: 'gun' }])],
      ['c', g([{ olay: 'a', yon: 'sonra', en: null, cok: null, birim: 'gun' }])],
      ['d', tarihCoz('50')!],
      ['e', g([{ olay: 'd', yon: 'sonra', en: 10, cok: 10, birim: 'yil' }])],
    ]);
    const s = goreliCoz(m, VARSAYILAN_TAKVIM);
    expect(s.get('a')!.celiski!.sort()).toEqual(['a', 'b', 'c']);
    expect(s.get('a')!.eksen).toBeNull();
    expect(Math.floor(s.get('e')!.eksen!.enErken! / yp)).toBe(60);
  });
  it('kesin tarihle çelişen kısıt', () => {
    const m = new Map<string, EvrenTarihi | null>([
      ['a', tarihCoz('100')!],
      ['b', tarihCoz('90')!],
      ['x', g([{ olay: 'a', yon: 'sonra', en: null, cok: null, birim: 'gun' }, { olay: 'b', yon: 'once', en: null, cok: null, birim: 'gun' }])],
    ]);
    const s = goreliCoz(m, VARSAYILAN_TAKVIM);
    expect(s.get('x')!.celiski).toContain('x');
    expect(tarihAciklamasi({ ...m.get('x')!, celiski: ['x'] })).toContain('çelişiyor');
  });
});
