import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}

describe('varsayılan değerler (§3.7)', () => {
  it('her alan kendi ekseninden alır; kaynak ve yol gösterilir; değer olarak kabul ayrı işlemdir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const kita = kayit('Sisli Kıta', 'mekan');
    const bolge = kayit('Kuzey bölgesi', 'mekan');
    const liman = kayit('Taşliman', 'sehir');
    const krallik = kayit('Orvan Krallığı', 'siyasi');
    const vasal = kayit('Kuzey Beyliği', 'siyasi');
    h.kayitAlanYaz({ evren, kod: kita, alan: 'iklim', deger: 'Serin ve yağmurlu' });
    h.kayitAlanYaz({ evren, kod: krallik, alan: 'resmi_para', deger: 'Gümüş akçe' });
    h.iliskiEkle({ evren, tur: 'parca', a: bolge, b: kita });
    h.iliskiEkle({ evren, tur: 'parca', a: liman, b: bolge });
    h.iliskiEkle({ evren, tur: 'bagli', a: bolge, b: vasal });
    h.iliskiEkle({ evren, tur: 'bagli', a: vasal, b: krallik });

    let v = h.kayitVarsayilanlari({ evren, kod: liman });
    expect(v.iklim.durum).toBe('tek');
    expect(v.iklim.kaynaklar[0].kaynak.ad).toBe('Sisli Kıta');
    expect(v.iklim.kaynaklar[0].yol.map((x) => x.ad)).toEqual(['Kuzey bölgesi', 'Sisli Kıta']);
    // Bağlılık kapsamadan ayrı eksendir: liman bölgenin yönetimine, o da metbuuna çıkar.
    expect(v.resmi_para.kaynaklar[0].deger).toBe('Gümüş akçe');
    expect(v.resmi_para.kaynaklar[0].yol.map((x) => x.ad)).toEqual(['Kuzey bölgesi', 'Kuzey Beyliği', 'Orvan Krallığı']);
    expect(v.dil.durum).toBe('yok');

    // Boşluğun türü: "bilinmiyor" varsayılanı gizler; geri alınınca döner.
    h.alanBoslugu({ evren, kod: liman, alan: 'iklim', tur: 'bilinmiyor' });
    expect(h.kayitVarsayilanlari({ evren, kod: liman }).iklim).toMatchObject({ durum: 'gizli', bosluk: 'bilinmiyor' });
    h.alanBoslugu({ evren, kod: liman, alan: 'iklim', tur: null });
    expect(h.kayitVarsayilanlari({ evren, kod: liman }).iklim.durum).toBe('tek');

    // Açık değer yazılınca varsayılan gösterilmez.
    h.kayitAlanYaz({ evren, kod: liman, alan: 'iklim', deger: 'Serin ve yağmurlu' });
    expect(h.kayitVarsayilanlari({ evren, kod: liman }).iklim).toBeUndefined();
    const gunluk = h.islemGunlugu({ evren, sinir: 50 }).map((x) => islemAciklamasi(x.tur, x.veri)).join('\n');
    expect(gunluk).toContain('evrende bilinmiyor');
  });

  it('farklı değer veren kaynaklarda eklenme sırası belirleyici değildir; yazar karar verir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const elin = kayit('Elin', 'karakter');
    const a = kayit('Dağ halkı', 'kultur');
    const b = kayit('Liman halkı', 'kultur');
    const insan = kayit('İnsan', 'canli');
    h.kayitAlanYaz({ evren, kod: a, alan: 'dil', deger: 'Eski dağ dili' });
    h.kayitAlanYaz({ evren, kod: b, alan: 'dil', deger: 'Liman ağzı' });
    h.kayitAlanYaz({ evren, kod: insan, alan: 'yasam_suresi', deger: 'Yetmiş yıl kadar' });
    h.iliskiEkle({ evren, tur: 'kulturu', a: elin, b: a });
    h.iliskiEkle({ evren, tur: 'kulturu', a: elin, b: b });
    h.iliskiEkle({ evren, tur: 'turu', a: elin, b: insan });

    let v = h.kayitVarsayilanlari({ evren, kod: elin });
    expect(v.yasam_suresi).toMatchObject({ durum: 'tek', eksen: 'tur' });
    expect(v.dil.durum).toBe('cozulmemis');
    expect(v.dil.kaynaklar.map((x) => x.deger)).toEqual(['Eski dağ dili', 'Liman ağzı']);

    expect(() => h.varsayilanKarari({ evren, kod: elin, alan: 'dil', karar: { durum: 'kapsam', oncelikli: null, aciklama: ' ' } })).toThrow(/Kapsamların/);
    expect(() => h.varsayilanKarari({ evren, kod: elin, alan: 'dil', karar: { durum: 'oncelik', oncelikli: null, aciklama: '' } })).toThrow(/Öncelikli/);
    h.varsayilanKarari({ evren, kod: elin, alan: 'dil', karar: { durum: 'kapsam', oncelikli: null, aciklama: 'Evde dağ dili, çarşıda liman ağzı' } });
    v = h.kayitVarsayilanlari({ evren, kod: elin });
    expect(v.dil).toMatchObject({ durum: 'kapsam', karar: { aciklama: 'Evde dağ dili, çarşıda liman ağzı' } });
    h.varsayilanKarari({ evren, kod: elin, alan: 'dil', karar: { durum: 'oncelik', oncelikli: b, aciklama: '' } });
    expect(h.kayitVarsayilanlari({ evren, kod: elin }).dil.durum).toBe('oncelik');
    // Öncelikli kaynak artık kaynak değilse çatışma yeniden çözülmemiştir.
    const il = h.iliskiler({ evren, kod: elin }).find((x) => x.tur === 'kulturu' && x.karsi.kod === b)!;
    h.iliskiSil({ evren, kod: il.kod });
    expect(h.kayitVarsayilanlari({ evren, kod: elin }).dil.durum).toBe('tek');
  });

  it('iki cihazda boşluk farklı işaretlenirse çatışma olur ve çözülür', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const { kod } = m.kayitOlustur({ evren, ad: 'Taşliman', tur: 'sehir' });
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.alanBoslugu({ evren, kod, alan: 'iklim', tur: 'acik' });
    t.alanBoslugu({ evren, kod, alan: 'iklim', tur: 'gecersiz' });
    const ab = m.islemleriVer({ evren, gorulen: t.gorulenler({ evren }) });
    const ba = t.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) });
    t.islemleriAl({ evren, islemler: ab }); m.islemleriAl({ evren, islemler: ba });
    const c = m.catismalar({ evren }).filter((x) => x.tur === 'alan');
    expect(c).toHaveLength(1);
    const ca = c[0] as Extract<typeof c[0], { tur: 'alan' }>;
    expect(ca.alanEtiketi).toBe('İklim (neden boş olduğu)');
    expect(ca.degerler.map((d) => d.yazi).sort()).toEqual(['Bilerek açık', 'Bu kayıt için geçersiz']);
    m.alanCatismasiCoz({ evren, nesne: kod, alan: 'bosluk:iklim', islem: ca.degerler.find((d) => d.deger === 'gecersiz')!.islem });
    expect(m.catismalar({ evren }).filter((x) => x.tur === 'alan')).toHaveLength(0);
    expect(m.kayitVarsayilanlari({ evren, kod }).iklim.bosluk).toBe('gecersiz');
  });

  it('fetih: eski yönetimden gelen her alan ayrı sorulur; değer o gün kendiliğinden değişmez', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    h.takvimYaz({ evren, takvim: { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }] } });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const liman = kayit('Taşliman', 'sehir');
    const eski = kayit('Orvan Krallığı', 'siyasi');
    const yeni = kayit('Deniz Birliği', 'siyasi');
    h.kayitAlanYaz({ evren, kod: eski, alan: 'resmi_para', deger: 'Gümüş akçe' });
    h.kayitAlanYaz({ evren, kod: eski, alan: 'hukuk', deger: 'Kral divanı' });
    h.kayitAlanYaz({ evren, kod: yeni, alan: 'resmi_para', deger: 'Deniz pulu' });
    const { kod: il } = h.iliskiEkle({ evren, tur: 'bagli', a: liman, b: eski });
    h.iliskiEkle({ evren, tur: 'bagli', a: liman, b: yeni, baslangic: '412' });
    let v = h.kayitVarsayilanlari({ evren, kod: liman });
    expect(v.resmi_para.fetih).toBeNull();
    expect(v.resmi_para.durum).toBe('cozulmemis');
    h.iliskiDegistir({ evren, kod: il, alan: 'bitis', deger: '412' });

    v = h.kayitVarsayilanlari({ evren, kod: liman });
    expect(v.resmi_para.durum).toBe('fetih');
    expect(v.resmi_para.fetih).toMatchObject({ eski: { ad: 'Orvan Krallığı' }, bitis: '412', cevap: null });
    expect(v.resmi_para.kaynaklar.map((x) => x.deger)).toEqual(['Gümüş akçe', 'Deniz pulu']);
    // Hukuk için yeni yönetimde değer yok; yine de sorulur.
    expect(v.hukuk.durum).toBe('fetih');

    const gecis = v.resmi_para.fetih!.gecis;
    expect(() => h.fetihCevabi({ evren, kod: liman, gecis, alan: 'resmi_para', cevap: { durum: 'yeni', tarih: 'bir gün' } })).toThrow(/okunamadı/);
    h.fetihCevabi({ evren, kod: liman, gecis, alan: 'resmi_para', cevap: { durum: 'yeni', tarih: '432' } });
    h.fetihCevabi({ evren, kod: liman, gecis, alan: 'hukuk', cevap: { durum: 'suruyor' } });
    v = h.kayitVarsayilanlari({ evren, kod: liman });
    expect(v.resmi_para).toMatchObject({ durum: 'tek', kaynaklar: [{ deger: 'Deniz pulu' }] });
    expect(v.resmi_para.fetih!.cevap!.tarih!.ifade).toBe('432');
    expect(v.hukuk).toMatchObject({ durum: 'tek', kaynaklar: [{ deger: 'Kral divanı' }] });
    h.fetihCevabi({ evren, kod: liman, gecis, alan: 'resmi_para', cevap: { durum: 'birlikte' } });
    expect(h.kayitVarsayilanlari({ evren, kod: liman }).resmi_para.durum).toBe('birlikte');
    h.fetihCevabi({ evren, kod: liman, gecis, alan: 'resmi_para', cevap: null });
    expect(h.kayitVarsayilanlari({ evren, kod: liman }).resmi_para.durum).toBe('fetih');
    const gunluk = h.islemGunlugu({ evren, sinir: 50 }).map((x) => islemAciklamasi(x.tur, x.veri)).join('\n');
    expect(gunluk).toContain('bağlılık değişikliğinden sonra eski uygulama sürüyor');
  });
});

describe('geçişli sorgu ve alt birimlerden toplananlar (§3.7)', () => {
  it('alt birimlerdeki kayıtlar sonuca girer; aynı kayıt bir kez sayılır', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const sehir = kayit('Taşliman', 'sehir');
    const m1 = kayit('Balıkçı mahallesi', 'mekan');
    const m2 = kayit('Tersane mahallesi', 'mekan');
    const han = kayit('Mavi han', 'mekan');
    const lonca = kayit('Halatçılar loncası', 'topluluk');
    const tuz = kayit('Tuz', 'urun');
    const elin = kayit('Elin', 'karakter');
    const krallik = kayit('Orvan Krallığı', 'siyasi');
    h.iliskiEkle({ evren, tur: 'parca', a: m1, b: sehir });
    h.iliskiEkle({ evren, tur: 'parca', a: m2, b: sehir });
    h.iliskiEkle({ evren, tur: 'parca', a: han, b: m1 });
    h.iliskiEkle({ evren, tur: 'ilgili', a: lonca, b: m1 });
    h.iliskiEkle({ evren, tur: 'ilgili', a: lonca, b: m2 });
    h.iliskiEkle({ evren, tur: 'ilgili', a: tuz, b: han });
    h.iliskiEkle({ evren, tur: 'yasar', a: elin, b: han });
    h.iliskiEkle({ evren, tur: 'bagli', a: sehir, b: krallik });

    const g = h.geciselKayitlar({ evren, kok: sehir, eksen: 'kapsama' });
    expect(g.map((x) => x.kod).sort()).toEqual([m1, m2, han, lonca, tuz, elin].sort());
    expect(g.find((x) => x.kod === elin)).toMatchObject({ birim: { ad: 'Mavi han' }, etiket: 'Yaşadığı yer' });
    expect(g.find((x) => x.kod === han)!.etiket).toBe('Balıkçı mahallesi içinden');
    // Üst yönetim alt birim değildir; bağlılık ekseninde krallıktan şehre inilir.
    expect(g.some((x) => x.kod === krallik)).toBe(false);
    expect(h.geciselKayitlar({ evren, kok: krallik, eksen: 'bagli' }).map((x) => x.kod)).toContain(elin);

    const t = h.altBirimlerdenToplananlar({ evren, kod: sehir });
    expect(t.map((x) => x.kayit.ad).sort()).toEqual(['Halatçılar loncası', 'Tuz']);
    expect(t.find((x) => x.kayit.kod === lonca)!.birimler.map((x) => x.ad)).toEqual(['Balıkçı mahallesi', 'Tersane mahallesi']);
  });
});
