import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { Node as PmNode } from 'prosemirror-model';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { araKonum, siraGecerli } from '../src/alan/sira';
import { gecerlilik } from '../src/alan/durum';
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

const s = metinSemasi.schema;
const p = (...ogeler: (string | [string, string])[]) => s.node('paragraph', null, ogeler.map((o) =>
  typeof o === 'string' ? s.text(o) : s.text(o[0], [s.marks.bag.create({ hedef: o[1] })])));
function yaz(h: Hizmet, evren: string, kayit: string, ...paragraflar: PmNode[]) {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, s.node('doc', null, paragraflar)) as never, temel });
}
const t = (x: string) => tarihCoz(x)!;

describe('sıra anahtarları', () => {
  it('iki anahtarın arasına her zaman yer açar', () => {
    let a = araKonum(null, null);
    const b = araKonum(a, null);
    expect(a < b).toBe(true);
    // Hep aynı iki komşunun arasına ekleme: anahtar uzar ama sıra bozulmaz.
    for (let i = 0; i < 200; i++) {
      const c = araKonum(a, b);
      expect(a < c && c < b).toBe(true);
      expect(siraGecerli(c)).toBe(true);
      a = c;
    }
    const bas = araKonum(null, araKonum(null, null));
    expect(bas < araKonum(null, null)).toBe(true);
    expect(() => araKonum('m', 'a')).toThrow();
  });
});

describe('durumun bir andaki geçerliliği', () => {
  it('üç değerli: evet, hayır, belirsiz', () => {
    expect(gecerlilik('aralik', t('412'), t('418'), t('415'))).toBe('evet');
    expect(gecerlilik('aralik', t('412'), t('418'), t('420'))).toBe('hayir');
    expect(gecerlilik('aralik', t('412'), 'acik', t('500'))).toBe('evet');
    // Bitiş dışlayıcıdır; aynı yılda biten ve başlayan iki unvan o yıl belirsizdir.
    expect(gecerlilik('aralik', t('412'), t('418'), t('418'))).toBe('belirsiz');
    expect(gecerlilik('aralik', t('410–415'), 'acik', t('412'))).toBe('belirsiz');
    // Sınırın tarihi bilinmiyor (bağlı olayın tarihi yok).
    expect(gecerlilik('aralik', null, 'acik', t('412'))).toBe('belirsiz');
    // Anın tarihi yoksa hiçbir şey söylenemez.
    expect(gecerlilik('aralik', t('412'), 'acik', null)).toBe('belirsiz');
    // Anlık gözlem sonrasına taşınmaz.
    expect(gecerlilik('anlik', t('420'), 'acik', t('420'))).toBe('evet');
    expect(gecerlilik('anlik', t('420'), 'acik', t('425'))).toBe('hayir');
  });
});

describe('eser, bölüm, sahne', () => {
  it('yapı okuma sırasıyla kurulur; taşıma anlatı etki özeti verir', () => {
    const { h, evren } = kur();
    const eser = h.kayitOlustur({ evren, ad: 'Kuzey Seferi', tur: 'eser' }).kod;
    const b1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Birinci bölüm', tur: 'bolum' }).kod;
    const b2 = h.anlatiOlustur({ evren, ust: eser, ad: 'İkinci bölüm', tur: 'bolum' }).kod;
    const s1 = h.anlatiOlustur({ evren, ust: b1, ad: 'Liman', tur: 'sahne' }).kod;
    const s2 = h.anlatiOlustur({ evren, ust: b1, ad: 'Gece nöbeti', tur: 'sahne' }).kod;
    const s3 = h.anlatiOlustur({ evren, ust: b2, ad: 'Kuşatma', tur: 'sahne' }).kod;

    let y = h.eserYapisi({ evren, eser });
    expect(y.bolumler.map((b) => [b.ad, b.sira, b.sahneler.map((x) => [x.ad, x.sira])])).toEqual([
      ['Birinci bölüm', 1, [['Liman', 1], ['Gece nöbeti', 2]]],
      ['İkinci bölüm', 2, [['Kuşatma', 3]]],
    ]);
    expect(h.anlatiYeri({ evren, kod: s2 })).toMatchObject({ eser: { ad: 'Kuzey Seferi' }, bolum: { sira: 1 }, sira: 2, onceki: { ad: 'Liman' }, sonraki: { ad: 'Kuşatma' } });

    // Velkar ilk kez Kuşatma sahnesinde anılıyor.
    const velkar = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    yaz(h, evren, s3, p(['Velkar', velkar], ' surlara çıktı.'));
    yaz(h, evren, s2, p('Nöbetçi uyudu.'));

    // Kuşatma birinci bölümün başına taşınınca Velkar'ın ilk anıldığı yer değişmez (aynı sahne), ama
    // ikinci bölüme Liman taşınınca hiçbir tanıtım değişmez; etki yalnızca bağlantılara dayanır.
    expect(h.anlatiYerlestir({ evren, kod: s1, ust: b2, sira: 1 }).etki).toEqual([]);
    yaz(h, evren, s2, p('Nöbetçi ', ['Velkar', velkar], 'ı gördü.'));
    // Velkar artık Gece nöbeti'nde ilk anılıyor; Gece nöbeti'ni sona taşımak ilk tanıtımı Kuşatma'ya kaydırır.
    const { etki } = h.anlatiYerlestir({ evren, kod: s2, ust: b2, sira: 2 });
    expect(etki).toEqual([{ kayit: { kod: velkar, ad: 'Velkar' }, onceki: { kod: s2, ad: 'Gece nöbeti' }, yeni: { kod: s3, ad: 'Kuşatma' } }]);
    y = h.eserYapisi({ evren, eser });
    expect(y.bolumler.map((b) => b.sahneler.map((x) => x.ad))).toEqual([[], ['Kuşatma', 'Liman', 'Gece nöbeti']]);

    // Yapıdan çıkarılan sahne yerleşmemişler arasına düşer; evren tarihi değişmez.
    h.kayitTarih({ evren, kod: s1, ifade: '412' });
    h.anlatiYerlestir({ evren, kod: s1, ust: null });
    expect(h.yerlesmemisler({ evren }).map((x) => x.ad)).toEqual(['Liman']);
    expect(h.kayit({ evren, kod: s1 }).tarih?.ifade).toBe('412');
    expect(h.anlatiYeri({ evren, kod: s1 }).eser).toBeNull();

    expect(() => h.anlatiYerlestir({ evren, kod: b1, ust: b2 })).toThrow('Bölüm');
    expect(() => h.anlatiYerlestir({ evren, kod: velkar, ust: eser })).toThrow('Yalnızca');
    // Sıra numarası saklanmaz; günlükte yalnızca anahtar var.
    expect(h.islemGunlugu({ evren, sinir: 100 }).filter((i) => i.tur === 'anlati_yerlestir').every((i) => !('sira' in i.veri))).toBe(true);
  });

  it('iki cihaz aynı sahneyi farklı yerlere taşırsa çatışma olarak sorulur', () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const eser = m.kayitOlustur({ evren, ad: 'Eser', tur: 'eser' }).kod;
    const b1 = m.anlatiOlustur({ evren, ust: eser, ad: 'Bir', tur: 'bolum' }).kod;
    const b2 = m.anlatiOlustur({ evren, ust: eser, ad: 'İki', tur: 'bolum' }).kod;
    const sahne = m.anlatiOlustur({ evren, ust: b1, ad: 'Sahne', tur: 'sahne' }).kod;
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.anlatiYerlestir({ evren, kod: sahne, ust: b2 });
    tb.anlatiYerlestir({ evren, kod: sahne, ust: null });
    const ab = m.islemleriVer({ evren, gorulen: tb.gorulenler({ evren }) });
    const ba = tb.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) });
    tb.islemleriAl({ evren, islemler: ab });
    m.islemleriAl({ evren, islemler: ba });
    const c = m.catismalar({ evren, kod: sahne });
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ tur: 'alan', alan: 'anlati', baslik: 'Sahne' });
    const yazilar = c[0].tur === 'alan' ? c[0].degerler.map((d) => d.yazi).sort() : [];
    expect(yazilar).toEqual(['Hiçbir esere yerleşmemiş', 'İki içinde']);
    const sec = c[0].tur === 'alan' ? c[0].degerler.find((d) => d.yazi === 'İki içinde')! : null;
    m.alanCatismasiCoz({ evren, nesne: sahne, alan: 'anlati', islem: sec!.islem });
    expect(m.catismalar({ evren })).toEqual([]);
    expect(m.anlatiYeri({ evren, kod: sahne }).bolum?.ad).toBe('İki');
  });
});

describe('durum geçmişi', () => {
  it('aralıklar, sonraki değişikliğe kadar ve olaya bağlı sınır', () => {
    const { h, evren } = kur();
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const isyan = h.kayitOlustur({ evren, ad: 'İsyan', tur: 'olay' }).kod;
    h.kayitTarih({ evren, kod: isyan, ifade: '418' });
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Unvan', deger: 'Çırak', kip: 'sonraki', baslangic: { ifade: '412' } } });
    const usta = h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Unvan', deger: 'Lonca Ustası', kip: 'sonraki', baslangic: { olay: isyan } } }).kod;
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Görüldüğü yer', deger: 'Saray', kip: 'anlik', baslangic: { ifade: '420' } } });

    const sahne = h.kayitOlustur({ evren, ad: 'Pazar', tur: 'sahne' }).kod;
    h.kayitTarih({ evren, kod: sahne, ifade: '415' });
    const { durumlar, an } = h.durumlar({ evren, kod: elin, an: sahne });
    expect(an?.ifade).toBe('415');
    const unvan = durumlar.filter((d) => d.ozellik === 'Unvan');
    expect(unvan.map((d) => [d.deger, d.gecerli, d.sonraki?.tarih?.ifade ?? null])).toEqual([['Çırak', 'evet', '418'], ['Lonca Ustası', 'hayir', null]]);
    expect(unvan[1].baslangic?.olay?.ad).toBe('İsyan');
    expect(durumlar.find((d) => d.ozellik === 'Görüldüğü yer')?.gecerli).toBe('hayir');

    // Olayın tarihi değişince sınır kendiliğinden kayar.
    h.kayitTarih({ evren, kod: isyan, ifade: '414' });
    const sonra = h.durumlar({ evren, kod: elin, an: sahne }).durumlar.filter((d) => d.ozellik === 'Unvan');
    expect(sonra.map((d) => d.gecerli)).toEqual(['hayir', 'evet']);
    // Olayın tarihi yoksa sınır belirsizdir ve bu söylenir.
    h.kayitTarih({ evren, kod: isyan, ifade: '' });
    const belirsiz = h.durumlar({ evren, kod: elin, an: sahne }).durumlar.find((d) => d.kod === usta)!;
    expect(belirsiz.gecerli).toBe('belirsiz');
    expect(belirsiz.uyari).toContain('tarihi yok');

    h.durumDegistir({ evren, kod: usta, alan: 'deger', deger: 'Usta' });
    h.durumSil({ evren, kod: usta });
    expect(h.durumlar({ evren, kod: elin }).durumlar.some((d) => d.kod === usta)).toBe(false);
    h.durumSil({ evren, kod: usta, geriYukle: true });
    expect(h.durumlar({ evren, kod: elin }).durumlar.find((d) => d.kod === usta)?.deger).toBe('Usta');
    expect(h.ozellikAdlari({ evren })).toContain('Unvan');
    expect(() => h.durumEkle({ evren, kod: elin, durum: { ozellik: '' } })).toThrow();
    expect(() => h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Gözlem', deger: 'x', kip: 'anlik' } })).toThrow('tarihi');
  });

  it('iki cihazda farklı değer: okunur başlıkla sorulur ve çözülür', () => {
    const m = cihaz('Masaüstü'), tb = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const kale = m.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'yer' }).kod;
    const d = m.durumEkle({ evren, kod: kale, durum: { ozellik: 'Sahibi', deger: 'Aldren Krallığı', baslangic: { ifade: '400' } } }).kod;
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.durumDegistir({ evren, kod: d, alan: 'deger', deger: 'Varos' });
    tb.durumDegistir({ evren, kod: d, alan: 'deger', deger: 'Lonca' });
    tb.islemleriAl({ evren, islemler: m.islemleriVer({ evren, gorulen: tb.gorulenler({ evren }) }) });
    const c = tb.catismalar({ evren, kod: kale });
    expect(c[0]).toMatchObject({ tur: 'alan', nesneTuru: 'durum', kayit: kale, baslik: 'Kuzey Kalesi · Sahibi', alan: 'deger' });
    const varos = c[0].tur === 'alan' ? c[0].degerler.find((x) => x.deger === 'Varos')! : null;
    tb.alanCatismasiCoz({ evren, nesne: d, alan: 'deger', islem: varos!.islem });
    expect(tb.catismalar({ evren })).toEqual([]);
    expect(tb.durumlar({ evren, kod: kale }).durumlar[0].deger).toBe('Varos');
  });
});

describe('sahne bağlam paneli', () => {
  it('sahnenin tarihindeki durumu, ilişkileri ve önceki değişimleri toplar', () => {
    const { h, evren } = kur();
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const aldren = h.kayitOlustur({ evren, ad: 'Aldren', tur: 'karakter' }).kod;
    const liman = h.kayitOlustur({ evren, ad: 'Liman', tur: 'yer' }).kod;
    const once = h.kayitOlustur({ evren, ad: 'Düello', tur: 'sahne' }).kod;
    const sahne = h.kayitOlustur({ evren, ad: 'Liman gecesi', tur: 'sahne' }).kod;

    // Tarih girilmemişken panel bunu söyleyebilsin diye tarih boş döner.
    h.sahneAlaniAyarla({ evren, sahne, alan: 'bakis', kayit: elin });
    expect(h.sahneBaglami({ evren, sahne })).toMatchObject({ tarih: null, bakis: { ad: 'Elin' }, katilimcilar: [{ ad: 'Elin', roller: ['Bakış açısı'] }] });

    h.kayitTarih({ evren, kod: sahne, ifade: '415' });
    h.kayitTarih({ evren, kod: once, ifade: '413' });
    h.sahneAlaniAyarla({ evren, sahne, alan: 'sahne_yeri', kayit: liman });
    h.sahneAlaniAyarla({ evren, sahne, alan: 'odak', kayit: elin });
    h.iliskiEkle({ evren, tur: 'sahnede', a: aldren, b: sahne });
    h.iliskiEkle({ evren, tur: 'dusman', a: elin, b: aldren, baslangic: '410' });
    h.iliskiEkle({ evren, tur: 'muttefik', a: elin, b: aldren, bitis: '412' });
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Unvan', deger: 'Çırak', baslangic: { ifade: '412' } } });
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Unvan', deger: 'Usta', baslangic: { ifade: '418' } } });
    h.durumEkle({ evren, kod: liman, durum: { ozellik: 'Kullanım', deger: 'Kapalı', kip: 'aralik', baslangic: { ifade: '414' }, bitis: { ifade: '416' } } });
    h.degisimEkle({ evren, sahne: once, konu: elin, metin: 'Elin\'in eli yaralandı' });
    h.degisimEkle({ evren, sahne, konu: elin, metin: 'Elin limanı terk etti' });

    const b = h.sahneBaglami({ evren, sahne });
    expect(b.tarih?.ifade).toBe('415');
    expect(b.yer).toMatchObject({ ad: 'Liman', durumlar: [{ deger: 'Kapalı', gecerli: 'evet' }] });
    const e = b.katilimcilar.find((k) => k.kod === elin)!;
    expect(e.roller).toEqual(['Bakış açısı', 'Odak karakter']);
    expect(e.durumlar.map((d) => d.deger)).toEqual(['Çırak']);
    expect(e.iliskiler.map((i) => i.tur)).toEqual(['dusman']);
    expect(e.degisimler.map((d) => d.metin)).toEqual(['Elin\'in eli yaralandı']);
    expect(b.katilimcilar.find((k) => k.kod === aldren)?.roller).toEqual(['Sahnede']);

    // Her alandan yalnızca bir tane olur; değiştirmek eskisini kaldırır.
    h.sahneAlaniAyarla({ evren, sahne, alan: 'bakis', kayit: aldren });
    expect(h.sahneBaglami({ evren, sahne }).bakis?.ad).toBe('Aldren');
    expect(h.iliskiler({ evren, kod: sahne }).filter((i) => i.tur === 'bakis')).toHaveLength(1);
    h.sahneAlaniAyarla({ evren, sahne, alan: 'bakis', kayit: null });
    expect(h.sahneBaglami({ evren, sahne }).bakis).toBeNull();
  });
});
