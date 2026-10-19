import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
function kur() {
  const h = cihaz('Deneme');
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  const kisi = (ad: string, dogum?: string, olum?: string) => {
    const k = h.kayitOlustur({ evren, ad, tur: 'karakter' }).kod;
    if (dogum) h.kayitAlanYaz({ evren, kod: k, alan: 'dogum', deger: dogum });
    if (olum) h.kayitAlanYaz({ evren, kod: k, alan: 'olum', deger: olum });
    return k;
  };
  const ebeveyn = (a: string, b: string, rol: string | null = 'kan') => h.iliskiEkle({ evren, tur: 'ebeveyn', a, b, rol });
  return { h, evren, kisi, ebeveyn };
}

describe('kalıtım (§15-8)', () => {
  it('tek genli özellikte olasılık aralığı; evlatlıkta hesap yok; beklenmeyen sonuç kanıt sayılmaz', () => {
    const { h, evren, kisi, ebeveyn } = kur();
    const { kod: goz } = h.kalitimOzelligiYaz({ evren, kod: null, tanim: { ad: 'Gümüş göz', kip: 'cekinik', not: '' } });
    const { kod: boy } = h.kalitimOzelligiYaz({ evren, kod: null, tanim: { ad: 'Uzun boy', kip: 'cok_genli', not: '' } });
    expect(() => h.kalitimOzelligiYaz({ evren, kod: null, tanim: { ad: '', kip: 'baskin', not: '' } })).toThrow(/adını/);
    const ana = kisi('Ana'), baba = kisi('Baba'), cocuk = kisi('Çocuk'), evlatlik = kisi('Evlatlık');
    ebeveyn(ana, cocuk); ebeveyn(baba, cocuk); ebeveyn(ana, evlatlik, 'evlatlik');
    h.kalitimDegeriYaz({ evren, kod: ana, ozellik: goz, deger: { gorunur: true, kopya: null } });
    h.kalitimDegeriYaz({ evren, kod: baba, ozellik: goz, deger: { gorunur: false, kopya: null } });
    let k = h.kalitim({ evren, kod: cocuk });
    expect(k.ebeveynler.map((x) => x.ad).sort()).toEqual(['Ana', 'Baba']);
    const g = k.ozellikler.find((x) => x.ozellik.kod === goz)!;
    expect(g.olasilik).toEqual({ enAz: 0, enCok: 0.5 });
    expect(k.ozellikler.find((x) => x.ozellik.kod === boy)!.olasilik).toBeNull();
    // Baba kesin taşımıyorsa çocukta görünmesi beklenmez; gizli ebeveyn kanıtı sayılmaz.
    h.kalitimDegeriYaz({ evren, kod: baba, ozellik: goz, deger: { gorunur: false, kopya: 0 } });
    h.kalitimDegeriYaz({ evren, kod: cocuk, ozellik: goz, deger: { gorunur: true, kopya: null } });
    k = h.kalitim({ evren, kod: cocuk });
    expect(k.ozellikler.find((x) => x.ozellik.kod === goz)).toMatchObject({ beklenmez: true, aciklama: expect.stringMatching(/kanıtlamaz/) });
    const e = h.kalitim({ evren, kod: evlatlik });
    expect(e.ebeveynler).toEqual([]);
    expect(e.evlatlik.map((x) => x.ad)).toEqual(['Ana']);
    expect(e.ozellikler[0].olasilik).toBeNull();
  });
});

describe('veraset (§15-8)', () => {
  it('seçilen kurala göre belirli yılda taht sırası; fiilî yürütenler ayrı', () => {
    const { h, evren, kisi, ebeveyn } = kur();
    const makam = h.kayitOlustur({ evren, ad: 'Kuzey tahtı', tur: 'makam' }).kod;
    const yasli = kisi('Yaşlı kral', '1100'), kral = kisi('Kral Aras', '1130');
    const kardes = kisi('Prenses Defne', '1135');
    const ilk = kisi('Prens Ozan', '1150', '1190');
    const ikinci = kisi('Prenses Ela', '1155');
    const torun = kisi('Ozan’ın oğlu', '1175');
    const evlatlik = kisi('Evlatlık Mert', '1160');
    const dogmamis = kisi('Geç doğan', '1210');
    ebeveyn(yasli, kral); ebeveyn(yasli, kardes);
    ebeveyn(kral, ikinci); ebeveyn(kral, ilk); ebeveyn(ilk, torun); ebeveyn(kral, evlatlik, 'evlatlik'); ebeveyn(kral, dogmamis);
    h.iliskiEkle({ evren, tur: 'yurutur', a: kral, b: makam, baslangic: '1160', bitis: '1205' });
    h.iliskiEkle({ evren, tur: 'yurutur', a: kardes, b: makam, baslangic: '1206' });

    expect(h.tahtSirasi({ evren, kod: makam, tarih: '1200' }).durum).toBe('kural_yok');
    h.verasetYaz({ evren, kod: makam, kural: { tur: 'ilk_dogan', evlatlik: false, evlilikDisi: false, not: '' } });
    const t = h.tahtSirasi({ evren, kod: makam, tarih: '1200' });
    expect(t.yuruten!.ad).toBe('Kral Aras');
    expect(t.sira.map((x) => [x.kisi.ad, x.yakinlik])).toEqual([['Ozan’ın oğlu', 'torunu'], ['Prenses Ela', 'çocuğu'], ['Prenses Defne', 'kardeşi']]);
    expect(t.sonrakiler.map((x) => x.kisi.ad)).toEqual(['Prenses Defne']);
    expect(t.not).toMatch(/fiilen tahta çıkmak değildir/);

    h.verasetYaz({ evren, kod: makam, kural: { tur: 'kardes_once', evlatlik: true, evlilikDisi: false, not: '' } });
    const k = h.tahtSirasi({ evren, kod: makam, tarih: '1200' });
    expect(k.sira.map((x) => x.kisi.ad)).toEqual(['Prenses Defne', 'Ozan’ın oğlu', 'Prenses Ela', 'Evlatlık Mert']);
    expect(k.sira[3].uyarilar).toContain('evlatlık');
    expect(h.tahtSirasi({ evren, kod: makam, tarih: '1100' }).durum).toBe('yuruten_yok');
    expect(() => h.verasetYaz({ evren, kod: kral, kural: { tur: 'ilk_dogan', evlatlik: false, evlilikDisi: false, not: '' } })).toThrow(/makam/);
  });
});
