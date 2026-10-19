import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const kule = kayit('Uydurma kule', 'mekan');
  const { kod: iddia } = h.iddiaEkle({ evren, konu: kule, soru: 'Kuleyi kim yıktı?', secenekler: ['Deprem', 'Kuşatma'] });
  const [deprem, kusatma] = h.kayitIddialari({ evren, kod: kule })[0].secenekler.map((s) => s.kod);
  const inan = (bilen: string, secenek: string) => h.bilgiEkle({ evren, bilgi: { iddia, bilen, inanc: 'inaniyor', secenek } });
  return { h, evren, kayit, iddia, deprem, kusatma, inan };
}

describe('keşif soruları (F31)', () => {
  it('farklı inanan iki kişinin aynı yerde olabileceği aralığı verir; aynı inananları eşlemez', () => {
    const { h, evren, kayit, iddia, deprem, kusatma, inan } = kur();
    const sehir = kayit('Uydurma şehir', 'sehir'), han = kayit('Uydurma han', 'mekan'), koy = kayit('Uydurma köy', 'mekan');
    const ela = kayit('Ela', 'karakter'), bora = kayit('Bora', 'karakter'), cem = kayit('Cem', 'karakter');
    inan(ela, deprem); inan(bora, kusatma); inan(cem, deprem);
    h.iliskiEkle({ evren, tur: 'parca', a: han, b: sehir });
    h.iliskiEkle({ evren, tur: 'yasar', a: ela, b: sehir, baslangic: '420', bitis: '430' });
    h.iliskiEkle({ evren, tur: 'yasar', a: cem, b: koy, baslangic: '420', bitis: '430' });
    // Bora 425'te handa bir olayda bulunuyor.
    const olay = kayit('Uydurma pazar', 'olay');
    h.kayitTarih({ evren, kod: olay, ifade: '425' });
    h.iliskiEkle({ evren, tur: 'olayda', a: bora, b: olay, rol: 'katilan' });
    h.iliskiEkle({ evren, tur: 'sahne_yeri', a: olay, b: han });
    const r = h.kesifSorusu({ evren, sablon: 'farkli_inananlar', iddia });
    expect(r.adaylar).toHaveLength(1);
    const a = r.adaylar[0];
    expect([a.kisiler.map((k) => k.ad).sort(), a.yer?.ad]).toEqual([['Bora', 'Ela'], 'Uydurma şehir']);
    expect(a.yazi).toContain('karşılaşmış olabilir');
    expect(a.dayanaklar.join(' ')).toContain('“Uydurma pazar”');
    expect(r.kapsam).toContain('3 inanan, 2 farklı inanan çift');
    expect(r.not).toContain('Görüştükleri');
  });

  it('örtüşmeyen tarihlerde aday çıkmaz; aday sahne fikrine ya da açık meseleye tek işlemle dönüşür', () => {
    const { h, evren, kayit, iddia, deprem, kusatma, inan } = kur();
    const sehir = kayit('Uydurma şehir', 'sehir'), ela = kayit('Ela', 'karakter'), bora = kayit('Bora', 'karakter');
    inan(ela, deprem); inan(bora, kusatma);
    h.iliskiEkle({ evren, tur: 'yasar', a: ela, b: sehir, baslangic: '400', bitis: '410' });
    const yb = h.iliskiEkle({ evren, tur: 'yasar', a: bora, b: sehir, baslangic: '411', bitis: '420' }).kod;
    expect(h.kesifSorusu({ evren, sablon: 'farkli_inananlar', iddia }).adaylar).toEqual([]);
    h.iliskiDegistir({ evren, kod: yb, alan: 'baslangic', deger: '405' });
    const a = h.kesifSorusu({ evren, sablon: 'farkli_inananlar', iddia }).adaylar[0];
    const once = h.islemGunlugu({ evren, sinir: 100 }).length;
    const { kod: sahne } = h.kesifAdayiKaydet({ evren, bicim: 'sahne', ad: 'Ela ile Bora', aciklama: a.yazi, kisiler: a.kisiler.map((k) => k.kod), yer: a.yer!.kod });
    const k = h.kayit({ evren, kod: sahne });
    expect([k.tur, k.karar]).toEqual(['sahne', 'fikir']);
    expect(h.sahneBaglami({ evren, sahne }).katilimcilar.map((x) => x.ad).sort()).toEqual(['Bora', 'Ela']);
    expect(h.sahneBaglami({ evren, sahne }).yer?.ad).toBe('Uydurma şehir');
    const { kod: mesele } = h.kesifAdayiKaydet({ evren, bicim: 'mesele', ad: 'Karşılaştılar mı?', aciklama: '', kisiler: [ela, bora], yer: null });
    expect(h.kayit({ evren, kod: mesele }).tur).toBe('acik_mesele');
    expect(h.meseleler({ evren, kod: ela }).meseleler.map((m) => m.kod)).toContain(mesele);
    const gruplar = new Set(h.islemGunlugu({ evren, sinir: 100 }).slice(0, h.islemGunlugu({ evren, sinir: 100 }).length - once).map((x) => x.grup));
    expect(gruplar.size).toBe(2);
  });

  it('çelişen hak iddiaları: aynı konu ve kapsamda, sahipleri farklı mülkiyet kayıtlarını gösterir; açık meseleye dönüşür', () => {
    const { h, evren, kayit } = kur();
    const kilic = kayit('Uydurma kılıç', 'esya'), ela = kayit('Ela', 'karakter'), bora = kayit('Bora', 'karakter'), lonca = kayit('Uydurma lonca', 'topluluk');
    const mulk = (sahip: string, bas: string, bit: string, tur: 'mulkiyet' | 'kullanim' = 'mulkiyet') =>
      h.hakEkle({ evren, hak: { tur, sahipler: [sahip], konu: kilic, kapsam: '', kosul: '', otorite: null, karar: 'kesin', baslangic: { ifade: bas }, bitis: { ifade: bit } } }).kod;
    const ilk = mulk(ela, '420', '430');
    mulk(ela, '425', '428');   // aynı sahip: çelişki değil
    mulk(bora, '440', '450');  // dönem örtüşmüyor
    let r = h.kesifSorusu({ evren, sablon: 'celisen_haklar' });
    expect(r.adaylar).toEqual([]);
    mulk(bora, '428', '435');
    mulk(lonca, '400', '500', 'kullanim'); // kullanım hakkı karşılaştırılmaz
    h.hakTanimaYaz({ evren, hak: ilk, otorite: lonca, durum: 'taniyor' });
    r = h.kesifSorusu({ evren, sablon: 'celisen_haklar' });
    expect(r.adaylar).toHaveLength(2);
    const a = r.adaylar[0];
    expect([a.konu?.kod, a.yer, a.aralik, a.kisiler.map((k) => k.ad).sort()]).toEqual([kilic, null, 'aynı dönemde geçerli', ['Bora', 'Ela']]);
    expect(r.adaylar.flatMap((x) => x.dayanaklar).join(' ')).toContain('Uydurma lonca tanıyor');
    expect(r.not).toContain('karar vermez');
    const { kod } = h.kesifAdayiKaydet({ evren, bicim: 'mesele', ad: 'Kılıç kimin?', aciklama: a.yazi, kisiler: a.kisiler.map((k) => k.kod), yer: null, konu: kilic });
    expect(h.kayit({ evren, kod }).tur).toBe('acik_mesele');
    expect(() => h.kesifSorusu({ evren, sablon: 'farkli_inananlar' })).toThrow('soru');
  });
});
