import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
  const bildirimler: string[][] = [];
  const h = new Hizmet(ac, 'Deneme', 'x', (_e, turler) => bildirimler.push(turler));
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  return { h, evren, ac, dosyalar, bildirimler };
}

/** Boş işaret listelerini yok sayarak karşılaştırma için. */
const sade = (x: unknown) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'marks' && v && !Object.keys(v).length ? undefined : v)));

/** Editörün yaptığı gibi: metni paragraflara bölüp parçalara çevirir. */
function parcalar(...paragraflar: string[]) {
  const s = metinSemasi.schema;
  const doc = s.node('doc', null, paragraflar.map((p) => s.node('paragraph', null, p ? [s.text(p)] : [])));
  return pmNodeToSpans(metinSemasi, doc);
}

describe('kayıtlar', () => {
  it('oluşturma, alan değiştirme, lakap ve etiket', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    h.kayitDegistir({ evren, kod, alan: 'ozet', deger: 'Kuzey valisi' });
    h.kayitListe({ evren, kod, liste: 'lakap', ekle: 'Kılıç Ustası' });
    h.kayitListe({ evren, kod, liste: 'etiket', ekle: 'birinci kitap' });
    h.kayitListe({ evren, kod, liste: 'etiket', ekle: 'birinci kitap' }); // ikinci kez eklenmez
    const k = h.kayit({ evren, kod });
    expect(k).toMatchObject({ ad: 'Velkar', tur: 'karakter', karar: 'kesin', ozet: 'Kuzey valisi', lakaplar: ['Kılıç Ustası'], etiketler: ['birinci kitap'] });
    h.kayitListe({ evren, kod, liste: 'lakap', cikar: 'Kılıç Ustası' });
    expect(h.kayit({ evren, kod }).lakaplar).toEqual([]);
  });

  it('ad değişince eski ad aramada kullanılmak üzere saklanır; geri dönülünce listeden çıkar', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    h.kayitDegistir({ evren, kod, alan: 'ad', deger: 'Elin' });
    expect(h.kayit({ evren, kod }).oncekiAdlar).toEqual(['Velkar']);
    h.kayitDegistir({ evren, kod, alan: 'ad', deger: 'Velkar' });
    expect(h.kayit({ evren, kod }).oncekiAdlar).toEqual(['Elin']);
  });

  it('geçersiz değerler reddedilir', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'A', tur: 'karakter' });
    expect(() => h.kayitDegistir({ evren, kod, alan: 'tur', deger: 'yok' })).toThrow('Bilinmeyen tür');
    expect(() => h.kayitDegistir({ evren, kod, alan: 'karar', deger: 'belki' })).toThrow('Geçersiz karar');
    expect(() => h.kayitDegistir({ evren, kod, alan: 'silindi' as never, deger: '1' })).toThrow('değiştirilemez');
    expect(() => h.kayit({ evren, kod: 'yok' })).toThrow('Kayıt bulunamadı');
  });

  it('çöp kutusu: silinen kayıt listeden çıkar, geri yüklenince bütün bilgileriyle döner', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' });
    h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar('Taş duvarlar.'), temel: h.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar });
    h.kayitSil({ evren, kod });
    expect(h.kayitlar({ evren })).toHaveLength(0);
    expect(h.kayitlar({ evren, cop: true }).map((k) => k.ad)).toEqual(['Kuzey Kalesi']);
    h.kayitGeriYukle({ evren, kod });
    expect(h.kayitlar({ evren }).map((k) => k.ad)).toEqual(['Kuzey Kalesi']);
    expect(sade(h.metinAc({ evren, kayit: kod, alan: 'govde' }).spans)).toEqual(sade(parcalar('Taş duvarlar.')));
  });
});

describe('serbest metin (Automerge)', () => {
  it('kaydedilir, yeniden açılır ve editör biçimine geri döner', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    const ilk = h.metinAc({ evren, kayit: kod, alan: 'govde' });
    const spans = parcalar('Velkar kuzeyde doğdu.', '', 'Kılıcını babasından aldı.');
    const r = h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans, temel: ilk.basliklar });
    expect(r.degisti).toBe(true);
    const acilan = h.metinAc({ evren, kayit: kod, alan: 'govde' });
    expect(acilan.basliklar).toEqual(r.basliklar);
    const doc = pmDocFromSpans(metinSemasi, acilan.spans as never);
    expect(doc.textBetween(0, doc.content.size, '\n')).toBe('Velkar kuzeyde doğdu.\n\nKılıcını babasından aldı.');
  });

  it('değişmeyen metin yeni işlem yazmaz; eski temelle kaydedilen birleşir, bilinmeyen sürüm reddedilir', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'A', tur: 'not' });
    const ilk = h.metinAc({ evren, kayit: kod, alan: 'govde' });
    const r1 = h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar('bir'), temel: ilk.basliklar });
    const sayi = h.evrenBilgisi({ evren }).islemSayisi;
    expect(h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar('bir'), temel: r1.basliklar }).degisti).toBe(false);
    expect(h.evrenBilgisi({ evren }).islemSayisi).toBe(sayi);
    expect(h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar('iki'), temel: ilk.basliklar }).birlesti).toBe(true);
    expect(() => h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar('üç'), temel: ['ab'.repeat(32)] })).toThrow('sürümü bulunamadı');
  });

  it('sürüm geçmişi: her kaydetme bir sürüm; eski sürüm okunabilir', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'A', tur: 'not' });
    let temel = h.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar;
    for (const t of ['ilk taslak', 'ikinci taslak', 'son hâli']) temel = h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar(t), temel }).basliklar;
    h.kayitDegistir({ evren, kod, alan: 'ad', deger: 'B' });
    const g = h.kayitGecmisi({ evren, kod });
    expect(g.map((x) => x.tur)).toEqual(['kayit_degistir', 'metin', 'metin', 'metin', 'metin', 'kayit_olustur']);
    const ikinci = g[2].veri.basliklar as string[];
    const eski = h.metinSurumu({ evren, kayit: kod, alan: 'govde', basliklar: ikinci });
    expect(sade(eski.spans)).toEqual(sade(parcalar('ikinci taslak')));
  });

  it('eski sürümü geri getirmek yeni bir sürüm yazar; aradakiler geçmişte kalır', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'A', tur: 'not' });
    let temel = h.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar;
    const surumler: string[][] = [];
    for (const t of ['ilk', 'ikinci', 'üçüncü']) { temel = h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar(t), temel }).basliklar; surumler.push(temel); }
    const r = h.metinGeriYukle({ evren, kayit: kod, alan: 'govde', basliklar: surumler[0] });
    expect(r.degisti).toBe(true);
    expect(sade(h.metinAc({ evren, kayit: kod, alan: 'govde' }).spans)).toEqual(sade(parcalar('ilk')));
    const g = h.kayitGecmisi({ evren, kod });
    expect(g[0].veri.geriYukleme).toBe(true);
    expect(sade(h.metinSurumu({ evren, kayit: kod, alan: 'govde', basliklar: surumler[2] }).spans)).toEqual(sade(parcalar('üçüncü')));
  });

  it('bir kelime eklemek küçük bir değişiklik yazar (bütün metni yeniden yazmaz)', () => {
    const { h, evren } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'A', tur: 'not' });
    const uzun = 'Sabah olunca Velkar kılıcını aldı ve kuzeye doğru yola çıktı. '.repeat(100);
    let temel = h.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar;
    temel = h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar(uzun), temel }).basliklar;
    h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar(uzun + 'Son.'), temel });
    const son = h.kayitGecmisi({ evren, kod })[0];
    expect(son.ikiliBoyut).toBeLessThan(300);
  });
});

describe('günlükten yeniden kurma', () => {
  it('kayıtlar ve metinler günlükten baştan kurulunca aynıdır', () => {
    const { h, evren, ac } = kur();
    const { kod } = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    let temel = h.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar;
    temel = h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar('bir', 'iki'), temel }).basliklar;
    h.kayitDegistir({ evren, kod, alan: 'ad', deger: 'Elin' });
    h.kayitSil({ evren, kod });
    const db = ac(`/evren-${evren}.db`);
    const anlik = () => JSON.stringify([
      db.selectObjects('SELECT kod,tur,ad,ozet,karar,lakaplar,onceki_adlar,etiketler,silindi FROM kayitlar'),
      db.selectObjects('SELECT kayit,alan,duz FROM metinler'),
    ]);
    const once = anlik();
    const h2 = new Hizmet(ac, 'Deneme', 'x');
    (h2 as unknown as { evren(k: string): { yenidenKur(): void } }).evren(evren).yenidenKur();
    expect(anlik()).toBe(once);
    expect(h2.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar).toEqual(temel);
  });
});
