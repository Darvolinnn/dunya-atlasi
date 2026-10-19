import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}

describe('adlandırılmış evren sürümleri (§9.7)', () => {
  it('sürüm sonraki değişikliklerden etkilenmez, salt okunurdur ve farkı gösterir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kral = h.kayitOlustur({ evren, ad: 'Kral Aldren', tur: 'karakter' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    h.iliskiEkle({ evren, tur: 'parca', a: kale, b: kral });
    const { kod: surum } = h.surumOlustur({ evren, ad: 'Birinci kitabın yayımlanan hâli' });
    h.kayitDegistir({ evren, kod: kral, alan: 'ad', deger: 'Kral Aldren II' });
    h.kayitOlustur({ evren, ad: 'Varis', tur: 'karakter' });
    h.kayitSil({ evren, kod: kale });
    expect(h.surumler({ evren })).toMatchObject([{ ad: 'Birinci kitabın yayımlanan hâli' }]);
    // Sabit sürüm kendi koduyla açılır.
    const b = h.evrenBilgisi({ evren: surum });
    expect(b.bag).toMatchObject({ tur: 'surum', evren, ad: 'Birinci kitabın yayımlanan hâli' });
    expect(b.kayitSayisi).toBe(2);
    expect(h.kayit({ evren: surum, kod: kral }).ad).toBe('Kral Aldren');
    expect(() => h.kayitDegistir({ evren: surum, kod: kral, alan: 'ad', deger: 'x' })).toThrow(/sabit/);
    const f = h.surumFarki({ evren, surum });
    expect(f.kayitlar.map((k) => [k.ad, k.durum])).toEqual([['Varis', 'yeni'], ['Kuzey Kalesi', 'silindi'], ['Kral Aldren II', 'degisti']]);
    expect(f.kayitlar[2].alanlar[0]).toMatchObject({ etiket: 'Adı', once: 'Kral Aldren', sonra: 'Kral Aldren II' });
    expect(() => h.surumOlustur({ evren: surum, ad: 'x' })).toThrow(/ana evrende/);
    h.surumYaz({ evren, kod: surum, alan: 'aciklama', deger: 'Matbaaya giden' });
    h.surumSil({ evren, kod: surum });
    expect(h.surumler({ evren })).toEqual([]);
  });
});

describe('deneme kopyası (§9.7)', () => {
  it('dal ana evreni etkilemez; fark ortak başlangıca göre; seçerek aktarılır', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kral = h.kayitOlustur({ evren, ad: 'Kral Aldren', tur: 'karakter' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan', ozet: 'Eski kale' }).kod;
    const { kod: dal } = h.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    expect(h.evrenBilgisi({ evren: dal }).bag).toMatchObject({ tur: 'dal', evren });
    // Dalda: kralın özeti değişir, yeni bir varis ve ona bir ilişki.
    h.kayitDegistir({ evren: dal, kod: kral, alan: 'ozet', deger: 'Yaşlı ama hayatta' });
    const varis = h.kayitOlustur({ evren: dal, ad: 'Varis Elin', tur: 'karakter' }).kod;
    h.iliskiEkle({ evren: dal, tur: 'ebeveyn', a: kral, b: varis });
    // Ana evrende dal açıldıktan sonra kalenin özeti düzeltilir; dal bunu geri getirmemeli.
    h.kayitDegistir({ evren, kod: kale, alan: 'ozet', deger: 'Yeniden yapılmış kale' });
    expect(h.kayit({ evren, kod: kral }).ozet).toBe('');
    const f = h.dalFarki({ evren, dal });
    expect(f.dalda.kayitlar.map((k) => k.ad).sort()).toEqual(['Kral Aldren', 'Varis Elin']);
    expect(f.anada.kayitlar.map((k) => k.ad)).toEqual(['Kuzey Kalesi']);
    const iliskiBirimi = f.birimler.find((b) => b.tur === 'iliski')!;
    expect(iliskiBirimi.gerekenler).toMatchObject([{ ad: 'Varis Elin', neden: 'dalda_yeni' }]);
    // Yalnızca ilişki seçilir ve varis açık bırakılırsa ilişki taşınmaz, söylenir.
    const r1 = h.dalAktar({ evren, dal, birimler: [iliskiBirimi.anahtar], eslemeler: { [varis]: 'acik' } });
    expect(r1.aktarilan).toBe(0);
    expect(r1.birakilan[0]).toMatch(/Varis Elin/);
    // Bağımlılıkla birlikte alınır.
    const r2 = h.dalAktar({ evren, dal, birimler: [iliskiBirimi.anahtar, `kayit:${varis}`, `kayit:${kral}`], eslemeler: {} });
    expect(r2.birakilan).toEqual([]);
    expect(h.kayit({ evren, kod: varis }).ad).toBe('Varis Elin');
    expect(h.kayit({ evren, kod: kral }).ozet).toBe('Yaşlı ama hayatta');
    expect(h.iliskiler({ evren, kod: kral }).length).toBe(1);
    expect(h.kayit({ evren, kod: kale }).ozet).toBe('Yeniden yapılmış kale');
    const f2 = h.dalFarki({ evren, dal });
    expect(f2.birimler.filter((b) => b.tur !== 'diger').every((b) => b.ayni)).toBe(true);
  });

  it('ortak başlangıçta var olan metin, iki taraftaki yazımlar korunarak birleşir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const k = h.kayitOlustur({ evren, ad: 'Kale', tur: 'mekan' }).kod;
    const sm = metinSemasi.schema;
    const yaz = (ev: string, ...paragraflar: string[]) => {
      const temel = h.metinAc({ evren: ev, kayit: k, alan: 'govde' }).basliklar;
      h.metinKaydet({ evren: ev, kayit: k, alan: 'govde', spans: pmNodeToSpans(metinSemasi, sm.node('doc', null, paragraflar.map((x) => sm.node('paragraph', null, [sm.text(x)])))) as never, temel });
    };
    const duz = (ev: string) => h.metinAc({ evren: ev, kayit: k, alan: 'govde' }).spans.filter((x) => (x as { type: string }).type === 'text').map((x) => (x as { value: string }).value).join('|');
    yaz(evren, 'Kale tepede.', 'Surlar yüksek.');
    const { kod: dal } = h.dalOlustur({ evren, ad: 'Deneme' });
    yaz(dal, 'Kale tepede.', 'Surlar yüksek.', 'Dalda eklenen paragraf.');
    yaz(evren, 'Kale tepede, nehre bakar.', 'Surlar yüksek.');
    h.dalAktar({ evren, dal, birimler: [`kayit:${k}`], eslemeler: {} });
    expect(duz(evren)).toBe('Kale tepede, nehre bakar.|Surlar yüksek.|Dalda eklenen paragraf.');
  });
});

describe('yayımlanmış eser kilidi (F18)', () => {
  it('eserin okura sunduğu bilgiyi değiştiren değişiklik sorulur; eserden sonra başlayan değişiklik sorulmaz', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const eser = h.kayitOlustur({ evren, ad: 'Birinci kitap', tur: 'eser' }).kod;
    const { kod: sahne } = h.anlatiOlustur({ evren, ust: eser, ad: 'Taç giyme', tur: 'sahne' });
    h.kayitTarih({ evren, kod: sahne, ifade: '430' });
    const prens = h.kayitOlustur({ evren, ad: 'Prens Aren', tur: 'karakter' }).kod;
    const fikir = h.kayitOlustur({ evren, ad: 'Söylenti', tur: 'karakter', karar: 'fikir' }).kod;
    h.iliskiEkle({ evren, tur: 'sahnede', a: prens, b: sahne });
    h.iliskiEkle({ evren, tur: 'sahnede', a: fikir, b: sahne });
    h.durumEkle({ evren, kod: prens, durum: { ozellik: 'Unvan', deger: 'Prens', baslangic: { ifade: '410' } } });
    const { kod: yayim } = h.yayimla({ evren, eser, baski: '1. baskı' });
    expect(h.yayimlar({ evren, eser })).toMatchObject([{ baski: '1. baskı', acik: 0 }]);
    // Z6: on yıl sonra kral olur; eserin zamanından sonra başlar, sorulmaz.
    h.durumEkle({ evren, kod: prens, durum: { ozellik: 'Unvan', deger: 'Kral', baslangic: { ifade: '440' } } });
    // Kesinleşmemiş kayıt kilit taşımaz.
    h.kayitDegistir({ evren, kod: fikir, alan: 'ad', deger: 'Başka söylenti' });
    expect(h.yayimCelismeleri({ evren, yayim })).toEqual([]);
    // Eserin zamanına dokunan değişiklik sorulur.
    h.kayitDegistir({ evren, kod: prens, alan: 'ad', deger: 'Prens Arenn' });
    h.durumEkle({ evren, kod: prens, durum: { ozellik: 'Yara', deger: 'Sol kol', baslangic: { ifade: '425' } } });
    const c = h.yayimCelismeleri({ evren, yayim });
    expect(c.map((x) => [x.baslik, x.once, x.sonra])).toEqual([['Adı', 'Prens Aren', 'Prens Arenn'], ['Zamanla değişen', null, 'Yara: Sol kol (425 – …)']]);
    expect(h.evrenBilgisi({ evren }).sorunSayisi).toBe(2);
    h.yayimKarari({ evren, yayim, anahtar: c[0].anahtar, karar: 'baski' });
    expect(h.yayimCelismeleri({ evren, yayim })[0].karar).toBe('baski');
    expect(h.yayimlar({ evren })[0].acik).toBe(1);
    // Değer yeniden değişirse karar düşer, yeniden sorulur.
    h.kayitDegistir({ evren, kod: prens, alan: 'ad', deger: 'Prens Arenç' });
    expect(h.yayimCelismeleri({ evren, yayim })[0].karar).toBe(null);
    expect(() => h.yayimKarari({ evren, yayim, anahtar: c[0].anahtar, karar: 'uydurma' })).toThrow();
  });
});
