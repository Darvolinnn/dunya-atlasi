import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { sahneOkurBilgileri } from '../src/calisan/sahne-okur';
import { yeniKod } from '../src/alan/kod';
import type { BilgiGirdisi, OkurOkumaSirasi } from '../src/veri/api';
import type { DurumBaglami } from '../src/calisan/durum';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { if (!dosyalar.has(ad)) dosyalar.set(ad, new sqlite.oo1.DB(':memory:')); return dosyalar.get(ad)!; };
  return { h: new Hizmet(ac, 'Uydurma aygıt', 'x'), ac };
}
function kur() {
  const { h, ac } = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma okur evreni' }).kod;
  const eser = h.kayitOlustur({ evren, ad: 'Uydurma birinci kitap', tur: 'eser' }).kod;
  const kisi = h.kayitOlustur({ evren, ad: 'Uydurma gözlemci', tur: 'karakter' }).kod;
  const konu = h.kayitOlustur({ evren, ad: 'Uydurma kule', tur: 'mekan' }).kod;
  const bolum = h.anlatiOlustur({ evren, ust: eser, ad: 'Uydurma bölüm', tur: 'bolum' }).kod;
  const sahneler = Array.from({ length: 4 }, (_, i) => h.anlatiOlustur({ evren, ust: bolum, ad: `Uydurma ${i + 1}. sahne`, tur: 'sahne' }).kod);
  const iddia = h.iddiaEkle({ evren, konu, soru: 'Uydurma kuleyi kim açtı?', secenekler: ['Uydurma bekçi', 'Uydurma yolcu'], gercek: 0 }).kod;
  const [dogru, yanlis] = h.kayitIddialari({ evren, kod: konu })[0].secenekler.map((s) => s.kod);
  const ogren = (sira: number, inanc: BilgiGirdisi['inanc'] = 'inaniyor', secenek = dogru, bilen = eser) => h.bilgiEkle({ evren, bilgi: { iddia, bilen, inanc, secenek, sahne: sahneler[sira - 1] } }).kod;
  const oku = (sira: number) => h.sahneBaglami({ evren, sahne: sahneler[sira - 1] }).okurBilgileri;
  const b: DurumBaglami = { e: new EvrenVt(ac(`/evren-${evren}.db`), yeniKod()), yaz: () => { throw new Error('Salt okunur hesap yazmamalı.'); }, olayTarihi: (kod) => h.kayit({ evren, kod }).tarih };
  const sira = (kod: string, ad: string, sahneListesi = sahneler, eserKod = eser): OkurOkumaSirasi => ({ kod, ad, eser: { kod: eserKod, ad: eserKod === eser ? 'Uydurma birinci kitap' : 'Uydurma ikinci kitap', tur: 'eser' }, sahneler: sahneListesi });
  return { h, evren, eser, kisi, konu, iddia, dogru, yanlis, sahneler, ogren, oku, b, sira };
}

describe('sahne panelinde okurun bilgisi (§3.6, §5.5)', () => {
  it('üçüncü sahnedeki öğrenme ikinciye sızmaz; üçüncüde ayrı, dördüncüde önceki bilgi olur', () => {
    const { oku, ogren } = kur(); ogren(3);
    expect(oku(2).siralar[0]).toMatchObject({ sira: 2, once: [], buSahnede: [] });
    expect(oku(3).siralar[0].once).toEqual([]);
    expect(oku(3).siralar[0].buSahnede[0].satirlar[0].etiket.kod).toBe('biliyor');
    expect(oku(4).siralar[0].once[0].satirlar[0].etiket.kod).toBe('biliyor');
    expect(oku(4).siralar[0].buSahnede).toEqual([]);
  });
  it('geri dönüşte evren tarihi değil okuma sırası esas alınır; tarih olmadan da hesaplanır', () => {
    const { h, evren, sahneler, oku, ogren } = kur(); ogren(3);
    h.kayitTarih({ evren, kod: sahneler[1], ifade: '900' });
    h.kayitTarih({ evren, kod: sahneler[2], ifade: '100' });
    h.kayitTarih({ evren, kod: sahneler[3], ifade: '50' });
    expect(oku(2).siralar[0].once).toEqual([]);
    expect(oku(4).siralar[0].once[0].satirlar[0].etiket.kod).toBe('biliyor');
    expect(oku(3).siralar[0].buSahnede).toHaveLength(1);
  });
  it('yanlış bilgi, şüphe ve bu sahnede değişen bilgi mevcut etiketlerle gösterilir', () => {
    const { oku, ogren, dogru, yanlis } = kur();
    ogren(1, 'inaniyor', yanlis); ogren(2, 'supheleniyor', dogru); ogren(3);
    expect(oku(2).siralar[0].once[0].satirlar[0].etiket.kod).toBe('yanlis');
    expect(oku(2).siralar[0].buSahnede[0].satirlar[0].etiket.kod).toBe('supheleniyor');
    expect(oku(3).siralar[0].once[0].satirlar[0].etiket.kod).toBe('supheleniyor');
    expect(oku(3).siralar[0].buSahnede[0].satirlar[0].etiket.kod).toBe('biliyor');
    expect(oku(4).siralar[0].once[0].satirlar[0].etiket.kod).toBe('biliyor');
  });
  it('gerçek belirlenmediyse yanlış biliyor çıkarmaz; açık bilmiyor ile kayıt yok ayrıdır', () => {
    const { h, evren, iddia, oku, ogren, yanlis } = kur();
    h.iddiaDegistir({ evren, kod: iddia, alan: 'gercek', deger: null });
    ogren(2, 'inaniyor', yanlis);
    expect(oku(2).siralar[0].buSahnede[0].satirlar[0].etiket.kod).toBe('inaniyor');
    ogren(3, 'bilmiyor');
    expect(oku(3).siralar[0].buSahnede[0].satirlar[0].etiket.kod).toBe('bilmiyor');
    expect(oku(1).siralar[0].once).toEqual([]);
  });
  it('karakterin listesiyle okurun listesi ayrı kalır; yeni bilgi veya işlem yazılmaz', () => {
    const { h, evren, kisi, iddia, sahneler, oku, ogren } = kur();
    h.kayitTarih({ evren, kod: sahneler[3], ifade: '500' });
    h.sahneAlaniAyarla({ evren, sahne: sahneler[3], alan: 'bakis', kayit: kisi });
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: kisi, inanc: 'bilmiyor', baslangic: { ifade: '100' } } });
    ogren(3);
    const once = h.islemleriVer({ evren, gorulen: {} });
    const panel = h.sahneBaglami({ evren, sahne: sahneler[3] });
    expect(panel.bakisBilgileri[0].satirlar[0].etiket.kod).toBe('bilmiyor');
    expect(panel.okurBilgileri.siralar[0].once[0].satirlar[0].etiket.kod).toBe('biliyor');
    oku(1); oku(2); oku(3); oku(4);
    expect(h.islemleriVer({ evren, gorulen: {} })).toEqual(once);
  });
  it('aynı sahnenin bağımsız iki okuma sırasındaki farklı konumları ayrı hesaplanır', () => {
    const { b, sira, sahneler, ogren } = kur(); ogren(3);
    const siralar = [sira('uydurma-normal', 'Uydurma normal sıra'), sira('uydurma-ters', 'Uydurma alternatif sıra', [sahneler[2], sahneler[1], sahneler[0], sahneler[3]])];
    const r = sahneOkurBilgileri(b, sahneler[1], siralar);
    const normal = r.siralar.find((s) => s.kod === 'uydurma-normal')!, ters = r.siralar.find((s) => s.kod === 'uydurma-ters')!;
    expect(normal.once).toEqual([]); expect(ters.once[0].satirlar[0].etiket.kod).toBe('biliyor');
    expect(ters.once[0].satirlar[0].okumaSirasi).toBe(1);
    const farkliKonum = sahneOkurBilgileri(b, sahneler[2], siralar);
    expect(farkliKonum.siralar.map((s) => s.sira).sort()).toEqual([1, 3]);
    expect(farkliKonum.siralar.every((s) => s.buSahnede.length === 1)).toBe(true);
  });
  it('aynı sahne iki eser bağlamında incelenirse eser okurlarının bilgisi birbirine geçmez', () => {
    const { h, evren, b, sira, sahneler, ogren, yanlis } = kur();
    const eser2 = h.kayitOlustur({ evren, ad: 'Uydurma ikinci kitap', tur: 'eser' }).kod;
    ogren(1); ogren(1, 'inaniyor', yanlis, eser2);
    const r = sahneOkurBilgileri(b, sahneler[1], [sira('uydurma-bir', 'Uydurma birinci sıra'), sira('uydurma-iki', 'Uydurma ikinci sıra', sahneler, eser2)]);
    expect(r.siralar.map((s) => s.once[0].satirlar[0].etiket.kod).sort()).toEqual(['biliyor', 'yanlis']);
  });
  it('hiçbir sırada olmayan sahneyi açıkça belirtir; kayıtlı ama boş sıra farklıdır', () => {
    const { h, evren, oku } = kur();
    const sahne = h.kayitOlustur({ evren, ad: 'Uydurma yerleşmemiş sahne', tur: 'sahne' }).kod;
    const r = h.sahneBaglami({ evren, sahne }).okurBilgileri;
    expect(r.siralar).toEqual([]); expect(r.uyari).toContain('hiçbir kayıtlı okuma sırasında yok');
    expect(oku(1).uyari).toBeNull(); expect(oku(1).siralar).toHaveLength(1);
  });
  it('vazgeçilmiş veya silinmiş bilgi gösterilmez, sahne taşınınca bilgi yeni sıraya göre değişir', () => {
    const { h, evren, eser, sahneler, oku, ogren } = kur(), kod = ogren(3);
    h.anlatiYerlestir({ evren, kod: sahneler[2], ust: eser, sira: 0 });
    const yeni = h.sahneBaglami({ evren, sahne: sahneler[1] }).okurBilgileri.siralar[0];
    expect(yeni.once).toHaveLength(1);
    h.bilgiDegistir({ evren, kod, alan: 'karar', deger: 'vazgecildi' });
    expect(oku(4).siralar[0].once).toEqual([]);
    h.bilgiDegistir({ evren, kod, alan: 'karar', deger: 'kesin' }); h.bilgiSil({ evren, kod });
    expect(oku(4).siralar[0].once).toEqual([]);
  });
  it('aynı sahnedeki farklı olası kayıtlar gizlice tekleştirilmez', () => {
    const { oku, ogren, yanlis } = kur(); ogren(3); ogren(3, 'inaniyor', yanlis);
    expect(oku(3).siralar[0].buSahnede[0]).toMatchObject({ durum: 'belirsiz' });
    expect(oku(3).siralar[0].buSahnede[0].satirlar).toHaveLength(2);
    expect(oku(4).siralar[0].once[0].satirlar).toHaveLength(2);
  });
  it('iki cihazdaki bilgi çatışmasında kesin bir okur durumu göstermez', () => {
    const { h, evren, oku, ogren, yanlis, dogru } = kur(), kod = ogren(3), diger = cihaz().h;
    diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.bilgiDegistir({ evren, kod, alan: 'secenek', deger: yanlis });
    diger.bilgiDegistir({ evren, kod, alan: 'secenek', deger: yanlis });
    diger.bilgiDegistir({ evren, kod, alan: 'secenek', deger: dogru });
    h.islemleriAl({ evren, islemler: diger.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(oku(4).siralar[0].once).toEqual([]);
    expect(oku(4).siralar[0].notlar.join(' ')).toContain('seçilmeyi bekliyor');
  });
  it('öğrenme sahnesi iki cihazda farklıysa gelecekteki değeri seçip eski bilgiye sessizce dönmez', () => {
    const { h, evren, oku, ogren, sahneler } = kur(); ogren(1);
    const kod = ogren(3), diger = cihaz().h;
    diger.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.bilgiDegistir({ evren, kod, alan: 'sahne', deger: sahneler[1] });
    diger.bilgiDegistir({ evren, kod, alan: 'sahne', deger: sahneler[3] });
    h.islemleriAl({ evren, islemler: diger.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(oku(3).siralar[0].once).toEqual([]); expect(oku(3).siralar[0].buSahnede).toEqual([]);
    expect(oku(3).siralar[0].notlar.join(' ')).toContain('seçilmeyi bekliyor');
  });
});
