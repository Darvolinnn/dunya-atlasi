import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { bilgiEtiketi } from '../src/alan/bilgi';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}

describe('bilgi etiketi', () => {
  it('gerçek belirlenmemişse "yanlış biliyor" denmez (Z9); gerçeği reddetmek yanlış bilmektir', () => {
    expect(bilgiEtiketi('inaniyor', 'a', null, null).kod).toBe('inaniyor');
    expect(bilgiEtiketi('inaniyor', 'a', 'b', null).kod).toBe('yanlis');
    expect(bilgiEtiketi('inaniyor', 'a', 'a', null).kod).toBe('biliyor');
    expect(bilgiEtiketi('inaniyor', 'a', 'a', []).kod).toBe('sakliyor');
    expect(bilgiEtiketi('inaniyor', 'a', 'a', [], true).kod).toBe('biliyor');
    expect(bilgiEtiketi('reddediyor', 'a', 'a', null).kod).toBe('yanlis');
    expect(bilgiEtiketi('reddediyor', 'b', 'a', null).kod).toBe('reddediyor');
    expect(bilgiEtiketi('supheleniyor', 'a', 'a', null)).toEqual({ kod: 'supheleniyor', ad: 'Şüpheleniyor', uyum: 'dogru' });
    expect(bilgiEtiketi('bilmiyor', null, 'a', null).kod).toBe('bilmiyor');
  });
});

describe('iddialar ve bilgi durumları', () => {
  it('zamanla değişen bilgi; saklama; grup inancı; okur; sahne bağlamı; matris', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const k = (ad: string, tur = 'karakter') => h.kayitOlustur({ evren, ad, tur }).kod;
    const olum = k('Kralın ölümü', 'olay'), elin = k('Elin'), darel = k('Darel'), halk = k('Kuzey halkı', 'topluluk');
    h.kayitTarih({ evren, kod: olum, ifade: '430' });
    const { kod: iddia } = h.iddiaEkle({ evren, konu: olum, soru: 'Kralı kim öldürdü?', secenekler: ['Kardeşi Darel', 'Hastalık', ''], gercek: 0 });
    const [s] = h.kayitIddialari({ evren, kod: olum });
    expect(s.secenekler.map((x) => x.metin)).toEqual(['Kardeşi Darel', 'Hastalık']);
    expect(s.gercek).toBe(s.secenekler[0].kod);
    const [darelSecenek, hastalik] = s.secenekler.map((x) => x.kod);

    h.bilgiEkle({ evren, bilgi: { iddia, bilen: elin, inanc: 'supheleniyor', secenek: darelSecenek, kaynak: 'duydu', baslangic: { ifade: '432' } } });
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: elin, inanc: 'inaniyor', secenek: darelSecenek, kaynak: 'gordu', saklama: [], baslangic: { ifade: '435' } } });
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: halk, inanc: 'inaniyor', secenek: hastalik, baslangic: { olay: olum } } });
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: darel, inanc: 'inaniyor', secenek: darelSecenek, saklama: [elin] } });
    expect(() => h.bilgiEkle({ evren, bilgi: { iddia, bilen: darel, inanc: 'inaniyor' } })).toThrow('Hangi cevaba');

    const liste = h.kayitIddialari({ evren, kod: olum })[0].bilgiler;
    expect(liste.map((x) => [x.bilen.ad, x.etiket.kod])).toEqual([
      ['Darel', 'sakliyor'], ['Elin', 'supheleniyor'], ['Elin', 'sakliyor'], ['Kuzey halkı', 'yanlis'],
    ]);
    expect(liste[0].saklama!.map((x) => x.ad)).toEqual(['Elin']);
    expect(liste[3].baslangic!.tarih!.ifade).toBe('430');

    // Gerçek açık bırakılınca kimse "yanlış biliyor" sayılmaz (Z9).
    h.iddiaDegistir({ evren, kod: iddia, alan: 'gercek', deger: null });
    expect(h.bilenBilgileri({ evren, kod: halk })[0].etiket.kod).toBe('inaniyor');
    h.iddiaDegistir({ evren, kod: iddia, alan: 'gercek', deger: darelSecenek });
    // İnanılan cevap sorudan çıkarılamaz.
    expect(() => h.iddiaDegistir({ evren, kod: iddia, alan: 'secenekler', deger: [{ kod: darelSecenek, metin: 'Kardeşi Darel' }] })).toThrow('inanan');
    h.iddiaDegistir({ evren, kod: iddia, alan: 'secenekler', deger: [...s.secenekler, { metin: 'Zehirli şarap' }] });
    expect(h.kayitIddialari({ evren, kod: olum })[0].secenekler).toHaveLength(3);

    // Sahne bağlamı: bakış açısı karakterinin o anda bildikleri. Sonraki kayıt bir öncekini bitirir.
    const eser = k('Kuzey Seferi', 'eser');
    const s1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Liman', tur: 'sahne' }).kod;
    const s2 = h.anlatiOlustur({ evren, ust: eser, ad: 'Taht odası', tur: 'sahne' }).kod;
    const s3 = h.anlatiOlustur({ evren, ust: eser, ad: 'İtiraf', tur: 'sahne' }).kod;
    h.kayitTarih({ evren, kod: s1, ifade: '433' });
    h.kayitTarih({ evren, kod: s2, ifade: '436' });
    h.kayitTarih({ evren, kod: s3, ifade: '431' });
    for (const x of [s1, s2, s3]) h.sahneAlaniAyarla({ evren, sahne: x, alan: 'bakis', kayit: elin });
    const bb = (sahne: string) => h.sahneBaglami({ evren, sahne }).bakisBilgileri;
    expect(bb(s1).map((x) => [x.durum, x.satirlar.map((y) => y.etiket.kod)])).toEqual([['tek', ['supheleniyor']]]);
    expect(bb(s2)[0].satirlar.map((y) => y.etiket.kod)).toEqual(['sakliyor']);
    expect(bb(s3)).toEqual([]);

    // Okur da bir bilendir: zamanı okuma sırasıdır.
    expect(() => h.bilgiEkle({ evren, bilgi: { iddia, bilen: eser, inanc: 'supheleniyor', secenek: darelSecenek } })).toThrow('hangi sahnede');
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: eser, inanc: 'supheleniyor', secenek: darelSecenek, sahne: s1 } });
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: eser, inanc: 'inaniyor', secenek: darelSecenek, sahne: s3, saklama: [elin] } });
    const okur = h.bilenBilgileri({ evren, kod: eser });
    expect(okur.map((x) => [x.okumaSirasi, x.etiket.kod, x.saklama])).toEqual([[1, 'supheleniyor', null], [3, 'biliyor', null]]);

    // Matris: bilgi edinme ve okura açıklanma katmanları.
    h.bilgiDegistir({ evren, kod: liste[1].kod, alan: 'sahne', deger: s1 });
    const m = h.bolumMatrisi({ evren, eser });
    const satir = (ad: string) => m.satirlar.find((x) => x.kayit.ad === ad)!.hucreler[0];
    expect(satir('Elin').bilgi).toBe(1);
    expect(satir('Kralın ölümü').okur).toBe(2);

    // Kayıt silinince bilgileri listede görünmez; bilgi kaydı silinip geri getirilebilir.
    h.bilgiSil({ evren, kod: liste[0].kod });
    expect(h.bilenBilgileri({ evren, kod: darel })).toEqual([]);
    h.bilgiSil({ evren, kod: liste[0].kod, geriYukle: true });
    expect(h.bilenBilgileri({ evren, kod: darel })).toHaveLength(1);
    expect(h.islemGunlugu({ evren, sinir: 5 }).length).toBeGreaterThan(0);
  });
});

describe('bakış açısı süzgeci', () => {
  it('gizli gerçek yalnızca bilenlere görünür; inanç yalnızca inananın görünümünde vardır', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const k = (ad: string, tur = 'karakter') => h.kayitOlustur({ evren, ad, tur }).kod;
    const varn = k('Kral Varn'), darel = k('Darel'), kaelen = k('Kaelen'), elin = k('Elin'), halk = k('Kuzey halkı', 'topluluk');
    const gercek = h.iliskiEkle({ evren, tur: 'ebeveyn', a: darel, b: kaelen }).kod;
    const sanilan = h.iliskiEkle({ evren, tur: 'ebeveyn', a: varn, b: kaelen }).kod;
    h.iliskiEkle({ evren, tur: 'kardes', a: darel, b: varn });
    h.gorunurlukYaz({ evren, kod: gercek, nesne: 'iliski', deger: { katman: null, gizli: true, bilenler: [darel] } });
    h.gorunurlukYaz({ evren, kod: sanilan, nesne: 'iliski', deger: { katman: halk, gizli: false, bilenler: [] } });
    expect(() => h.gorunurlukYaz({ evren, kod: gercek, nesne: 'iliski', deger: { katman: null, gizli: true, bilenler: [] } })).toThrow('kimlerin');

    const ebeveyn = (bakis: string | null) => h.soyAgaci({ evren, odak: kaelen, bakis }).kenarlar.filter((x) => x.tur === 'ebeveyn' && x.b === kaelen)
      .map((x) => [x.a === darel ? 'Darel' : 'Varn', !!x.inanc]);
    expect(ebeveyn(null)).toEqual([['Darel', false]]);
    expect(ebeveyn(darel)).toEqual([['Darel', false]]);
    expect(ebeveyn(halk)).toEqual([['Varn', true]]);
    expect(ebeveyn(elin)).toEqual([]);
    expect(h.soyAgaci({ evren, odak: kaelen, bakis: halk }).bakis!.ad).toBe('Kuzey halkı');
    expect(h.iliskiler({ evren, kod: kaelen }).find((x) => x.kod === sanilan)!.gorunurluk!.katman!.ad).toBe('Kuzey halkı');

    // Ağ ve zaman çizelgesi: gizli kayıt yalnızca bilenine görünür.
    const sir = k('Gizli toplantı', 'olay');
    h.kayitTarih({ evren, kod: sir, ifade: '429' });
    h.iliskiEkle({ evren, tur: 'olayda', a: darel, b: sir });
    h.gorunurlukYaz({ evren, kod: sir, nesne: 'kayit', deger: { katman: null, gizli: true, bilenler: [darel] } });
    expect(h.kayit({ evren, kod: sir }).gorunurluk!.bilenler.map((x) => x.ad)).toEqual(['Darel']);
    const ag = (bakis: string | null) => h.ag({ evren, merkez: darel, bakis }).dugumler.map((d) => d.ad).sort();
    expect(ag(null)).toContain('Gizli toplantı');
    expect(ag(elin)).not.toContain('Gizli toplantı');
    expect(ag(darel)).toContain('Gizli toplantı');
    expect(h.zamanCizelgesi({ evren, bakis: halk }).map((x) => x.ad)).toEqual([]);
    expect(h.zamanCizelgesi({ evren }).map((x) => x.ad)).toEqual(['Gizli toplantı']);
    // Sade gerçeğe dönüş görünürlük kaydını kaldırır.
    h.gorunurlukYaz({ evren, kod: sir, nesne: 'kayit', deger: null });
    expect(h.kayit({ evren, kod: sir }).gorunurluk).toBeNull();
    expect(h.zamanCizelgesi({ evren, bakis: halk })).toHaveLength(1);
  });
});

describe('iki cihazda bilgi çatışması', () => {
  it('aynı bilgiye ve görünürlüğe iki cihazda farklı değer: ikisi de gösterilir, yazar seçer', () => {
    const ac = () => { const d = new Map<string, Database>(); return (x: string) => { let y = d.get(x); if (!y) { y = new sqlite3.oo1.DB(':memory:'); d.set(x, y); } return y; }; };
    const m = new Hizmet(ac(), 'Masaüstü', 'x'), tb = new Hizmet(ac(), 'Tablet', 'x');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const olum = m.kayitOlustur({ evren, ad: 'Kralın ölümü', tur: 'olay' }).kod;
    const elin = m.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const darel = m.kayitOlustur({ evren, ad: 'Darel', tur: 'karakter' }).kod;
    const { kod: iddia } = m.iddiaEkle({ evren, konu: olum, soru: 'Kralı kim öldürdü?', secenekler: ['Darel', 'Hastalık'] });
    const [a, b] = m.kayitIddialari({ evren, kod: olum })[0].secenekler.map((x) => x.kod);
    const { kod: bilgi } = m.bilgiEkle({ evren, bilgi: { iddia, bilen: elin, inanc: 'supheleniyor', secenek: a } });
    tb.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.bilgiDegistir({ evren, kod: bilgi, alan: 'secenek', deger: b });
    tb.bilgiDegistir({ evren, kod: bilgi, alan: 'saklama', deger: [darel] });
    tb.bilgiDegistir({ evren, kod: bilgi, alan: 'secenek', deger: b });
    tb.bilgiDegistir({ evren, kod: bilgi, alan: 'aciklama', deger: 'Mektuptan' });
    tb.bilgiDegistir({ evren, kod: bilgi, alan: 'secenek', deger: a });
    m.gorunurlukYaz({ evren, kod: olum, nesne: 'kayit', deger: { katman: null, gizli: true, bilenler: [darel] } });
    tb.gorunurlukYaz({ evren, kod: olum, nesne: 'kayit', deger: { katman: null, gizli: true, bilenler: [elin] } });
    m.islemleriAl({ evren, islemler: tb.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) }) });
    const c = m.catismalar({ evren });
    const bc = c.find((x) => x.tur === 'alan' && x.nesne === bilgi);
    expect(bc).toMatchObject({ kayit: elin, alanEtiketi: 'İnandığı cevap', baslik: 'Elin · “Kralı kim öldürdü?” bilgisi' });
    if (bc?.tur !== 'alan') throw new Error();
    expect(bc.degerler.map((d) => d.yazi).sort()).toEqual(['Darel', 'Hastalık']);
    const gc = c.find((x) => x.tur === 'alan' && x.nesne === olum && x.alan === 'gorunurluk');
    if (gc?.tur !== 'alan') throw new Error();
    expect(gc.degerler.map((d) => d.yazi).sort()).toEqual(['Gizli gerçek; bilenler: Darel', 'Gizli gerçek; bilenler: Elin']);
    expect(m.catismalar({ evren, kod: elin }).length).toBe(1);
    m.alanCatismasiCoz({ evren, nesne: bilgi, alan: 'secenek', islem: bc.degerler.find((d) => d.deger === a)!.islem });
    m.alanCatismasiCoz({ evren, nesne: olum, alan: 'gorunurluk', islem: gc.degerler.find((d) => d.yazi!.endsWith('Elin'))!.islem });
    expect(m.catismalar({ evren })).toEqual([]);
    expect(m.bilenBilgileri({ evren, kod: elin })[0]).toMatchObject({ secenek: { kod: a }, saklama: [{ ad: 'Darel' }] });
    expect(m.kayit({ evren, kod: olum }).gorunurluk!.bilenler.map((x) => x.ad)).toEqual(['Elin']);
  });
});
