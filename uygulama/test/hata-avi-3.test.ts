// Hata avı (7 Kasım 2026): iki dış raporun doğrulanan bulguları. Her sınama düzeltmeden önce kırılıyordu.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import type { Spans } from '../src/veri/api';
import { tarihCoz, type Takvim } from '../src/alan/tarih';
import { goreliCoz } from '../src/alan/goreli';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const medya = new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici, undefined, undefined, (d) => { dosyalar.get(d)?.close(); dosyalar.delete(d); },
    () => [...dosyalar.keys()]);
  return { h, medya, dosyalar };
}
const s = metinSemasi.schema;
const spansi = (...p: string[]) => pmNodeToSpans(metinSemasi, s.node('doc', null, p.map((x) => s.node('paragraph', null, x ? [s.text(x)] : [])))) as Spans;
const metni = (h: Hizmet, evren: string, kayit: string) => {
  const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
  return d.textBetween(0, d.content.size, '\n');
};
const yaz = (h: Hizmet, evren: string, kayit: string, ...p: string[]) =>
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: spansi(...p), temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });

describe('yedek ve deneme kopyaları', () => {
  it('tam yedek deneme kopyasında yazılanları da taşır; yeni cihazda dal kendi metniyle açılır', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const sahne = m.h.kayitOlustur({ evren, ad: 'Açılış', tur: 'sahne' }).kod;
    yaz(m.h, evren, sahne, 'Ortak başlangıç.');
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    yaz(m.h, dal, sahne, 'Ortak başlangıç.', 'Dalda saklanan son.');
    const { veri } = await m.h.yedekAl({ evren });

    const y = cihaz('Yeni');
    const r = await y.h.yedektenYukle({ veri });
    expect(r.ayri).toBe(false);
    expect(r.gelmeyenDallar).toBeUndefined();
    expect(y.h.dallar({ evren }).map((d) => d.kod)).toEqual([dal]);
    expect(metni(y.h, dal, sahne)).toBe('Ortak başlangıç.\nDalda saklanan son.');
    expect(metni(y.h, evren, sahne)).toBe('Ortak başlangıç.');
  });

  it('eski biçimli (deneme kopyası günlüğü olmayan) yedek incelenirken bu söylenir', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    m.h.dalOlustur({ evren, ad: 'Deneme' });
    const { veri } = await m.h.yedekAl({ evren });
    expect((await m.h.yedekIncele({ veri })).denemeKopyalariEksik).toBe(false);
    // Eski paket: dallar alanı ve dosyaları yok.
    const { zipAc, zipYaz } = await import('../src/alan/zip');
    const a = await zipAc(veri instanceof Blob ? new Uint8Array(await veri.arrayBuffer()) : veri);
    const paket = JSON.parse(new TextDecoder().decode(await a.oku('paket.json')));
    delete paket.dallar;
    const eski = await zipYaz(await Promise.all(a.adlar.filter((x) => !x.startsWith('dallar/')).map(async (ad) =>
      ({ ad, veri: ad === 'paket.json' ? new TextEncoder().encode(JSON.stringify(paket)) : await a.oku(ad) }))));
    expect((await m.h.yedekIncele({ veri: eski })).denemeKopyalariEksik).toBe(true);
    expect((await cihaz('Yeni').h.yedektenYukle({ veri: eski })).ayri).toBe(false);
  });

  it('aynı cihazda ayrı açılan kopyanın deneme kopyasında yazmak asıl evrenin deneme kopyasını değiştirmez', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    const { veri } = await m.h.yedekAl({ evren });
    const r = await m.h.yedektenYukle({ veri });
    expect(r.ayri).toBe(true);
    const kopyaDallari = m.h.dallar({ evren: r.kod });
    expect(kopyaDallari).toHaveLength(1);
    expect(kopyaDallari[0].kod).not.toBe(dal);
    expect(kopyaDallari[0].ad).toBe('Kral yaşasaydı');
    m.h.kayitOlustur({ evren: kopyaDallari[0].kod, ad: 'Yalnız kurtarmada', tur: 'diger' });
    expect(m.h.kayitlar({ evren: dal }).map((k) => k.ad)).not.toContain('Yalnız kurtarmada');
    expect(m.h.evrenBilgisi({ evren: kopyaDallari[0].kod }).bag?.evren).toBe(r.kod);
  });

  it('bu cihazdaki görsel bozulmuşsa sağlam yedek onu onarır', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const k = m.h.kayitOlustur({ evren, ad: 'Köprü', tur: 'mekan' }).kod;
    const { ad } = await m.h.gorselEkle({ evren, kod: k, dosyaAdi: 'kopru.png', tur: 'image/png', veri: new Uint8Array([5, 6, 7]) });
    const { veri } = await m.h.yedekAl({ evren });
    const y = cihaz('Yeni');
    await y.medya.yaz(ad, new Uint8Array([9, 9]));
    const r = await y.h.yedektenYukle({ veri });
    expect(r.eksikGorseller).toEqual([]);
    expect([...(await y.medya.oku(ad))!]).toEqual([5, 6, 7]);
  });

  it('bütün kayıtları çöp kutusunda olan evrenin yedeği sıfır kayıt gösterir', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const k = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    m.h.kayitSil({ evren, kod: k });
    const { veri } = await m.h.yedekAl({ evren });
    expect((await m.h.yedekIncele({ veri })).kayitSayisi).toBe(0);
  });
});

describe('Markdown içe alma', () => {
  it('başarısız içe alma evren listesinde boş evren bırakmaz; uzun bağlantı hedefi kısaltılır', async () => {
    const m = cihaz('Masaüstü');
    const uzun = 'a'.repeat(201);
    const r = await m.h.iceAktar({ dosyalar: [{ yol: 'Not.md', metin: `[[${uzun}]]` }], evrenAdi: 'Sınama' });
    expect(m.h.kayitlar({ evren: r.kod }).some((k) => k.ad === uzun.slice(0, 200))).toBe(true);
    const once = m.h.evrenler().length;
    await expect(m.h.iceAktar({ dosyalar: [{ yol: 'Not.md', metin: 'x' }], evrenAdi: '' })).rejects.toThrow();
    expect(m.h.evrenler().length).toBe(once);
  });

  it('[[Gol]] ve [[Göl]] kendi dosyalarına gider (geliş sırası ne olursa olsun)', async () => {
    for (const sira of [['Gol.md', 'Göl.md'], ['Göl.md', 'Gol.md']]) {
      const m = cihaz('Masaüstü');
      const dosyalar = [...sira.map((yol) => ({ yol, metin: yol })), { yol: 'Dizin.md', metin: '[[Gol]] ve [[Göl]]' }];
      const { kod: evren } = await m.h.iceAktar({ dosyalar, evrenAdi: 'Sınama' });
      const kod = (ad: string) => m.h.kayitlar({ evren }).find((k) => k.ad === ad)!.kod;
      const hedefler = m.h.andiklari({ evren, kod: kod('Dizin') }).map((b) => b.kod).sort();
      expect(hedefler).toEqual([kod('Gol'), kod('Göl')].sort());
    }
  });
});

describe('tarihler', () => {
  const T = { kod: 't', surum: 1, ad: 'Yıl', yilGun: 360, aylar: [{ ad: 'Hasat', gun: 30 }, { ad: 'Tohum', gun: 330 }] } as Takvim;
  it('takvimli ifadede çözülmeyen söz ya da aralık kesin tarih sayılmaz; öncesi ve sonrası sınırdır', () => {
    expect(tarihCoz("Hasat 412'den önce", T)).toMatchObject({ bicim: 'once', eksen: { enErken: null, enGec: tarihCoz('Hasat 412', T)!.eksen!.enErken! - 1 } });
    expect(tarihCoz('12 Hasat 412 ve sonrası', T)).toMatchObject({ bicim: 'sonra', eksen: { enErken: tarihCoz('12 Hasat 412', T)!.eksen!.enErken, enGec: null } });
    expect(tarihCoz('Yaklaşık Hasat 412', T)!.bicim).toBe('sembolik');
    expect(tarihCoz('Hükümdarın Hasat 412', T)!.bicim).toBe('sembolik');
    expect(tarihCoz('Hasat 10-15', T)!.bicim).toBe('sembolik');
    expect(tarihCoz('Yıl 412, 12 Hasat', T)!.eksen).toEqual(tarihCoz('12 Hasat 412', T)!.eksen);
    expect(tarihCoz('1 Hasat -1', T)!.bicim).toBe('kesin');
    expect(tarihCoz("412 yılının Hasat ayı", T)!.eksen).toEqual(tarihCoz('Hasat 412', T)!.eksen);
  });
  it('göreli bir tarihteki çelişki aynı kesin olaya bağlı öbür göreli tarihleri etkilemez; kendine dayanmak çelişkidir', () => {
    const K = (olay: string, yon: 'once' | 'sonra', en: number | null = null) => ({ olay, yon, en, cok: en, birim: 'gun' as const });
    const g = (kisitlar: ReturnType<typeof K>[]) => ({ ifade: '', bicim: 'goreli' as const, hassasiyet: null, takvim: 't', takvimSurumu: 1, kisitlar, eksen: null });
    const r = goreliCoz(new Map([
      ['tufan', { ifade: '1', bicim: 'kesin', hassasiyet: 'gun', takvim: 't', takvimSurumu: 1, eksen: { enErken: 100, enGec: 100 } }],
      ['g1', g([K('tufan', 'sonra'), K('tufan', 'once')])], ['g2', g([K('tufan', 'sonra', 5)])], ['g3', g([K('g3', 'sonra', 5)])],
    ] as never), T);
    expect(r.get('g1')!.celiski).not.toBeNull();
    expect(r.get('g2')).toEqual({ eksen: { enErken: 100 + 5 * 1440, enGec: 100 + 5 * 1440 }, celiski: null });
    expect(r.get('g3')!.celiski).not.toBeNull();
  });
});

describe('birleştirme ve deneme kopyası aktarımı', () => {
  it('zincirleme birleştirme ters sırayla geri alınınca ilişki kendi kaydına döner', () => {
    const { h } = cihaz('Masaüstü');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const k = (ad: string) => h.kayitOlustur({ evren, ad, tur: 'karakter' }).kod;
    const a = k('Velkar'), b = k('Velkar Kral'), c = k('Kral'), d = k('Elin');
    h.iliskiEkle({ evren, tur: 'dusman', a, b: d });
    h.birlestir({ evren, kaynak: a, hedef: b });
    h.birlestir({ evren, kaynak: b, hedef: c });
    h.birlesmeyiGeriAl({ evren, kod: a });
    h.birlesmeyiGeriAl({ evren, kod: b });
    expect(h.iliskiler({ evren, kod: a }).map((r) => r.karsi.kod)).toEqual([d]);
    expect(h.iliskiler({ evren, kod: b })).toEqual([]);
  });

  it('deneme kopyasında bilginin sonradan düzeltilmesi kaydın birimiyle birlikte taşınır', () => {
    const { h } = cihaz('Masaüstü');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const olum = h.kayitOlustur({ evren, ad: 'Kralın ölümü', tur: 'olay' }).kod;
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const { kod: iddia } = h.iddiaEkle({ evren, konu: olum, soru: 'Kralı kim öldürdü?', secenekler: ['Darel', 'Hastalık'], gercek: 0 });
    const secenek = h.kayitIddialari({ evren, kod: olum })[0].secenekler[0].kod;
    const { kod: dal } = h.dalOlustur({ evren, ad: 'Deneme' });
    const { kod: bilgi } = h.bilgiEkle({ evren: dal, bilgi: { iddia, bilen: elin, inanc: 'supheleniyor', secenek } }) as { kod: string };
    h.bilgiDegistir({ evren: dal, kod: bilgi, alan: 'inanc', deger: 'inaniyor' });
    const birimler = h.dalFarki({ evren, dal }).birimler;
    expect(birimler.map((x) => x.anahtar)).toEqual([`kayit:${elin}`]);
    h.dalAktar({ evren, dal, birimler: [`kayit:${elin}`], eslemeler: {} });
    expect(h.dalFarki({ evren, dal }).birimler.every((x) => x.ayni)).toBe(true);
  });
});

describe('Markdown biçimi', () => {
  it('kalın ve eğik bağlantı ile tırnak ya da çizgiyle başlayan ön bilgi değeri gidip geri gelir', async () => {
    const { satirIci, onBilgiAyir } = await import('../src/alan/markdown');
    const { yamlDeger } = await import('../src/alan/cikti');
    expect(satirIci('**[[Kuzey]]** ve *[[Güney|güneyde]]*', {}, [])).toEqual([
      { metin: 'Kuzey', hedef: 'Kuzey', kalin: true }, { metin: ' ve ' }, { metin: 'güneyde', hedef: 'Güney', italik: true }]);
    for (const v of ["'alıntı'", '-eksi', "Elin's"]) expect(onBilgiAyir(`---\nad: ${yamlDeger(v)}\n---\n`).ozellikler.ad).toBe(v);
  });
});

describe('ad ve ek', () => {
  it('ilgi ekinden sonraki -ki değişmez; kesme işaretli ve tireli adlar bağlantısız ad olarak bulunur', async () => {
    const { adDegistir } = await import('../src/alan/turkce-ek');
    const { bagsizAdlar } = await import('../src/alan/bagsiz-ad');
    expect(adDegistir("Elin'inki", 'Elin', 'Velkar')).toBe("Velkar'ınki");
    expect(adDegistir("Elin'deki", 'Elin', 'Velkar')).toBe("Velkar'daki");
    const metin = "Kael'thas geldi. Al-Khem düştü. Al Khem değil.";
    const r = bagsizAdlar([{ metin, bagli: [] }], [{ kod: 'a', ifade: "Kael'thas" }, { kod: 'b', ifade: 'Al-Khem' }]);
    expect(r.map((x) => [x.kodlar[0], x.ifade])).toEqual([['a', "Kael'thas"], ['b', 'Al-Khem']]);
    const bagli = '[[Kuzey]] Kalesi'.replace(/\[\[|\]\]/g, '');
    const b = bagsizAdlar([{ metin: bagli, bagli: [...bagli].map((_, i) => i < 5) }], [{ kod: 'k', ifade: 'Kuzey Kalesi' }, { kod: 'c', ifade: 'Kalesi' }]);
    expect(b.map((x) => x.kodlar[0])).toEqual(['c']);
  });
});

describe('takvim değişikliği', () => {
  it('ay uzunluğu değişince araç tanımlarındaki tarihlerin ekseni de yeniden hesaplanır', () => {
    const { h } = cihaz('Masaüstü');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const takvim = (gun: number) => ({ kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun }, { ad: 'Hasat', gun: 30 }] });
    h.takvimYaz({ evren, takvim: takvim(30) });
    const yer = h.kayitOlustur({ evren, ad: 'Liman', tur: 'sehir' }).kod;
    const haber = h.kayitOlustur({ evren, ad: 'Kral öldü', tur: 'haber' }).kod;
    h.haberCikisiYaz({ evren, kod: haber, yer, tarih: '1 Hasat 10', kanallar: [] });
    const once = h.haberCikisi({ evren, kod: haber }).tarih!.eksen!.enErken!;
    h.takvimYaz({ evren, takvim: { ...takvim(40), surum: 2 } });
    expect(h.haberCikisi({ evren, kod: haber }).tarih!.eksen!.enErken).toBe(once + 10 * 10 * 1440 + 10 * 1440);
  });
});
