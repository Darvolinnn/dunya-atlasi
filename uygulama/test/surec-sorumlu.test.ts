import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const meclis = kayit('Kuzey Meclisi', 'topluluk');
  const muhurdar = kayit('Başmühürdar', 'makam');
  const komutan = kayit('Sınır Komutanı', 'makam');
  const alaz = kayit('Alaz', 'karakter');
  const berin = kayit('Berin', 'karakter');
  const lonca = kayit('Tüccarlar Loncası', 'topluluk');
  const olay = kayit('Güz Fermanı', 'olay');

  const { kod: kural } = h.surecKuraliOlustur({ evren, sahip: meclis, ad: 'Ferman yürürlüğü' });
  h.surecKuraliYaz({
    evren,
    kod: kural,
    tanim: {
      ad: 'Ferman yürürlüğü',
      kosullar: 'Meclis toplanmış olmalı',
      adimlar: [
        { kod: 'a1', ad: 'Taslak yazımı', onkosul: [], esik: false, sonuc: false, etki: '' },
        { kod: 'a2', ad: 'Mühür basımı', onkosul: ['a1'], esik: true, sonuc: true, etki: 'Karar bağlayıcı olur' },
        { kod: 'a3', ad: 'Taşraya duyuru', onkosul: ['a2'], esik: false, sonuc: true, etki: '' },
      ],
    },
  });
  h.surecBagla({ evren, olay, kural, bagli: true });

  const oku = () => h.olaySurecSorumlulari({ evren, olay });
  return { h, evren, meclis, muhurdar, komutan, alaz, berin, lonca, olay, kural, oku };
}

describe('süreç adımlarının sorumluları ve engeller (F07)', () => {
  it('adım sorumlusu yazılır, değiştirilir, kaldırılır; silinen kayıt "silinmiş" görünür', () => {
    const { h, evren, muhurdar, alaz, lonca, olay, kural, oku } = kur();

    // Kişi ya da makam dışındaki kayıt sorumluluğa seçilemez.
    expect(() => h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a1', sorumlu: lonca })).toThrow(/kişi ya da makam/);

    // Kişi ve makam sorumluluğu yazılır.
    h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a1', sorumlu: alaz });
    h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a2', sorumlu: muhurdar });
    let s = oku().surecler[0];
    expect(s.adimlar.map((a) => [a.kod, a.sorumlu?.kod, a.sorumlu?.ad])).toEqual([
      ['a1', alaz, 'Alaz'],
      ['a2', muhurdar, 'Başmühürdar'],
      ['a3', undefined, undefined],
    ]);

    // Sorumlu değiştirilir ve kaldırılır.
    h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a1', sorumlu: muhurdar });
    h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a2', sorumlu: null });
    s = oku().surecler[0];
    expect(s.adimlar[0].sorumlu?.kod).toBe(muhurdar);
    expect(s.adimlar[1].sorumlu).toBeNull();

    // Silinen kayıt "silinmiş" görünür.
    h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a3', sorumlu: alaz });
    h.kayitSil({ evren, kod: alaz });
    s = oku().surecler[0];
    expect(s.adimlar[2].sorumlu).toEqual({
      kod: alaz,
      ad: 'Alaz (silinmiş)',
      tur: 'karakter',
      silindi: true,
    });
  });

  it('durdurabilir ve fiilî veto listeleri adım durumlarını ve süreç sonucunu değiştirmez', () => {
    const { h, evren, muhurdar, komutan, lonca, berin, olay, kural, oku } = kur();

    h.surecAdimi({ evren, olay, kural, adim: 'a1', durum: 'tamam' });
    h.surecAdimi({ evren, olay, kural, adim: 'a2', durum: 'basladi' });
    const onceki = h.olaySurecleri({ evren, olay }).surecler[0];

    const { kod: e1 } = h.surecEngelEkle({ evren, olay, kural, tur: 'durdurabilir', kayit: muhurdar, not: 'Mührü saklayabilir' });
    const { kod: e2 } = h.surecEngelEkle({ evren, olay, kural, tur: 'veto', kayit: lonca, not: 'Taşıma loncası haberi geciktirebilir' });
    const { kod: e3 } = h.surecEngelEkle({ evren, olay, kural, tur: 'veto', kayit: komutan, not: 'Geçitleri kapatabilir' });

    let s = oku().surecler[0];
    expect(s.durdurabilir).toHaveLength(1);
    expect(s.durdurabilir[0]).toMatchObject({ kod: e1, kayit: { kod: muhurdar, ad: 'Başmühürdar' }, not: 'Mührü saklayabilir' });
    expect(s.veto).toHaveLength(2);

    // Not ve kayıt güncellenir, bir satır silinir.
    h.surecEngelDegistir({ evren, olay, kural, tur: 'veto', kod: e2, kayit: berin, not: 'Kuryeleri durdurur' });
    h.surecEngelSil({ evren, olay, kural, tur: 'veto', kod: e3 });

    // Silinen kayıt engel listesinde de "silinmiş" görünür.
    h.kayitSil({ evren, kod: berin });
    s = oku().surecler[0];
    expect(s.veto).toEqual([
      {
        kod: e2,
        kayit: { kod: berin, ad: 'Berin (silinmiş)', tur: 'karakter', silindi: true },
        not: 'Kuryeleri durdurur',
      },
    ]);

    // Adım durumları ve süreç sonucu hiç değişmemiştir.
    const sonraki = h.olaySurecleri({ evren, olay }).surecler[0];
    expect(sonraki.durumlar).toEqual(onceki.durumlar);
    expect(sonraki.sonuc).toEqual(onceki.sonuc);
  });

  it('olayın süreç bağı kaldırılınca bilgiler listelenmez ama silinmez; bağ geri gelince döner', () => {
    const { h, evren, muhurdar, lonca, olay, kural, oku } = kur();

    h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a1', sorumlu: muhurdar });
    h.surecEngelEkle({ evren, olay, kural, tur: 'veto', kayit: lonca, not: 'Liman kapısını tutar' });
    expect(oku().surecler).toHaveLength(1);

    // Bağı kaldırınca listelenmez.
    h.surecBagla({ evren, olay, kural, bagli: false });
    expect(oku().surecler).toHaveLength(0);

    // Bağ geri gelince sorumlular ve engeller olduğu gibi döner.
    h.surecBagla({ evren, olay, kural, bagli: true });
    const s = oku().surecler[0];
    expect(s.adimlar[0].sorumlu?.kod).toBe(muhurdar);
    expect(s.veto).toHaveLength(1);
    expect(s.veto[0].not).toBe('Liman kapısını tutar');
  });

  it('iki cihazda farklı yazım çatışma olarak görünür ve çözülür', () => {
    const { h, evren, muhurdar, komutan, alaz, berin, olay, kural, oku } = kur();

    const b = cihaz();
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });

    // İki cihazda aynı adıma farklı sorumlu ve aynı sürece farklı veto listesi yazılır.
    h.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a2', sorumlu: muhurdar });
    b.surecAdimSorumlusuYaz({ evren, olay, kural, adim: 'a2', sorumlu: komutan });

    h.surecEngelEkle({ evren, olay, kural, tur: 'veto', kayit: alaz, not: 'Cihaz A notu' });
    b.surecEngelEkle({ evren, olay, kural, tur: 'veto', kayit: berin, not: 'Cihaz B notu' });

    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });

    const catismalar = h.catismalar({ evren, kod: olay });
    expect(catismalar).toHaveLength(2);

    const adimCatisma = catismalar.find((c) => c.tur === 'alan' && c.alan === `surec_sorumlu_adim:${kural}:a2`);
    if (adimCatisma?.tur !== 'alan') throw new Error('Adım sorumlusu çatışması bekleniyordu.');
    expect(adimCatisma.alanEtiketi).toContain('Mühür basımı');
    const secilenAdim = adimCatisma.degerler.find((d) => d.yazi === 'Başmühürdar')!;
    h.alanCatismasiCoz({ evren, nesne: olay, alan: adimCatisma.alan, islem: secilenAdim.islem });

    const vetoCatisma = catismalar.find((c) => c.tur === 'alan' && c.alan === `surec_sorumlu_veto:${kural}`);
    if (vetoCatisma?.tur !== 'alan') throw new Error('Veto listesi çatışması bekleniyordu.');
    expect(vetoCatisma.alanEtiketi).toContain('fiilî veto');
    const secilenVeto = vetoCatisma.degerler.find((d) => d.yazi?.includes('Cihaz B notu'))!;
    h.alanCatismasiCoz({ evren, nesne: olay, alan: vetoCatisma.alan, islem: secilenVeto.islem });

    expect(h.catismalar({ evren, kod: olay })).toHaveLength(0);
    const son = oku().surecler[0];
    expect(son.adimlar.find((a) => a.kod === 'a2')?.sorumlu?.kod).toBe(muhurdar);
    expect(son.veto).toHaveLength(1);
    expect(son.veto[0]).toMatchObject({ kayit: { kod: berin }, not: 'Cihaz B notu' });

    const gunluk = h.islemGunlugu({ evren, sinir: 10 }).map((i) => islemAciklamasi(i.tur, i.veri));
    expect(gunluk.some((m) => m.includes('adımının sorumlusu'))).toBe(true);
    expect(gunluk.some((m) => m.includes('fiilî veto listesi güncellendi'))).toBe(true);
  });
});
