import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { Takvim } from '../src/alan/tarih';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }, { ad: 'Sis', gun: 30 }, { ad: 'Kara Ay', gun: 30 }] };

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  h.takvimYaz({ evren, takvim: ANA });
  const kayit = (ad: string, tur: string, tarih?: string) => {
    const kod = h.kayitOlustur({ evren, ad, tur }).kod;
    if (tarih) h.kayitTarih({ evren, kod, ifade: tarih });
    return kod;
  };
  return { h, evren, kayit };
}

describe('tutarlılık denetimleri (§9.1)', () => {
  it('yaşam süresi: ölümden sonra fiziksel bulunma çelişki, anılmak denetlenmez; kabul dayanak değişince açılır', () => {
    const { h, evren, kayit } = kur();
    const kral = kayit('Kral Orvan', 'karakter');
    h.kayitAlanYaz({ evren, kod: kral, alan: 'dogum', deger: '300' });
    h.kayitAlanYaz({ evren, kod: kral, alan: 'olum', deger: '350' });
    const savas = kayit('Kızıl Savaş', 'olay', '350');
    const tören = kayit('Anma töreni', 'olay', '360');
    const sahne = kayit('Saraydaki gece', 'sahne', '5 Tohum 362');
    h.iliskiEkle({ evren, tur: 'olayda', a: kral, b: savas, rol: 'katilan' });
    h.iliskiEkle({ evren, tur: 'olayda', a: kral, b: tören, rol: 'sonradan' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: kral, b: sahne, rol: 'bulunuyor' });

    let d = h.denetimler({ evren });
    const yasam = d.acik.filter((b) => b.kural === 'yasam');
    expect(yasam).toHaveLength(1);
    expect(yasam[0].hukum).toBe('celiski');
    expect(yasam[0].baslik).toContain('ölümünden sonra');
    expect(yasam[0].dayanak).toContain('“350”');
    expect(d.kurallar.find((k) => k.kural === 'yasam')!.sonuc).toBe('bulgu_var');
    expect(d.kurallar.find((k) => k.kural === 'bilgi')!.sonuc).toBe('denetlenemiyor');
    expect(h.evrenBilgisi({ evren }).sorunSayisi).toBeGreaterThanOrEqual(1);

    expect(() => h.incelemeKarari({ evren, anahtar: yasam[0].anahtar, durum: 'kabul', gerekce: '' })).toThrow(/gerekçe/);
    h.incelemeKarari({ evren, anahtar: yasam[0].anahtar, durum: 'kabul', gerekce: 'Hayalet olarak dönüyor', istisna: 'kapsam' });
    d = h.denetimler({ evren });
    expect(d.acik.filter((b) => b.kural === 'yasam')).toHaveLength(0);
    expect(d.kabul[0].karar!.istisna).toBe('kapsam');

    // Dayanak değişince (sahnenin tarihi) kabul yeniden açılır.
    h.kayitTarih({ evren, kod: sahne, ifade: '5 Tohum 363' });
    d = h.denetimler({ evren });
    expect(d.acik.filter((b) => b.kural === 'yasam')).toHaveLength(1);
    expect(d.kabul).toHaveLength(0);
  });

  it('yaşam süresi: tarihler ayırmaya yetmiyorsa olası uyuşmazlık; aynı tarihte ölmek uyarı değildir', () => {
    const { h, evren, kayit } = kur();
    const k = kayit('Dera', 'karakter');
    h.kayitAlanYaz({ evren, kod: k, alan: 'dogum', deger: '400' });
    h.kayitAlanYaz({ evren, kod: k, alan: 'olum', deger: '12 Sis 440' });
    const a = kayit('Bahar şenliği', 'olay', '12 Hasat 400');
    const b = kayit('Son kuşatma', 'olay', '12 Sis 440');
    h.iliskiEkle({ evren, tur: 'olayda', a: k, b: a, rol: 'katilan' });
    h.iliskiEkle({ evren, tur: 'olayda', a: k, b, rol: 'zarar' });
    const d = h.denetimler({ evren });
    expect(d.acik.map((x) => [x.kural, x.hukum])).toEqual([['yasam', 'olasi']]);
    expect(d.acik[0].baslik).toContain('doğumundan önce');
  });

  it('fikir durumundaki değerlerin bulguları ayrı grupta; vazgeçilmiş denetlenmez', () => {
    const { h, evren, kayit } = kur();
    const k = kayit('Yolcu', 'karakter');
    h.kayitAlanYaz({ evren, kod: k, alan: 'olum', deger: '100' });
    const o = kayit('Geç gelen', 'olay', '200');
    const i = h.iliskiEkle({ evren, tur: 'olayda', a: k, b: o, rol: 'katilan', karar: 'fikir' });
    let d = h.denetimler({ evren });
    expect(d.acik).toHaveLength(0);
    expect(d.fikir).toHaveLength(1);
    expect(h.evrenBilgisi({ evren }).sorunSayisi).toBe(0);
    h.iliskiDegistir({ evren, kod: (i as { kod: string }).kod, alan: 'karar', deger: 'vazgecildi' });
    d = h.denetimler({ evren });
    expect(d.fikir).toHaveLength(0);
  });

  it('konum: kapsayan yerler çelişmez; aynı gün ayrı yerler ve kaba tarihler kişi başına tek iş', () => {
    const { h, evren, kayit } = kur();
    const k = kayit('Haberci', 'karakter');
    const sehir = kayit('Liman Şehri', 'sehir'), han = kayit('Kırık Fener Hanı', 'mekan'), dag = kayit('Kuzey Geçidi', 'mekan');
    h.iliskiEkle({ evren, tur: 'parca', a: han, b: sehir });
    const s1 = kayit('Handa pazarlık', 'sahne', '3 Tohum 500');
    const s2 = kayit('Şehirde ilan', 'sahne', '3 Tohum 500');
    const s3 = kayit('Geçitte pusu', 'sahne', '3 Tohum 500');
    const o1 = kayit('Kuzey seferi', 'olay', '510');
    const o2 = kayit('Liman yangını', 'olay', '510');
    for (const [s, y] of [[s1, han], [s2, sehir], [s3, dag], [o1, dag], [o2, sehir]]) h.iliskiEkle({ evren, tur: 'sahne_yeri', a: s, b: y });
    for (const s of [s1, s2, s3]) h.iliskiEkle({ evren, tur: 'sahnede', a: k, b: s, rol: 'bulunuyor' });
    for (const o of [o1, o2]) h.iliskiEkle({ evren, tur: 'olayda', a: k, b: o, rol: 'katilan' });
    const d = h.denetimler({ evren });
    const konum = d.acik.filter((b) => b.kural === 'konum');
    // s1–s3 ve s2–s3 aynı gün; s1–s2 handa olmak ile şehirde olmak (çelişmez); o1–o2 yıl düzeyinde.
    expect(konum.filter((b) => b.baslik.includes('aynı gün'))).toHaveLength(2);
    const kaba = konum.filter((b) => b.anahtar.startsWith('denetim:konum-kaba:'));
    expect(kaba).toHaveLength(1);
    expect(kaba[0].dayanak).toContain('kesin değil');
    expect(konum.every((b) => b.hukum === 'olasi')).toBe(true);
  });

  it('döngüsel tarih tek iş olarak; eşyanın aynı dönemde iki sahibi', () => {
    const { h, evren, kayit } = kur();
    const a = kayit('Birinci', 'olay', '700');
    const b = kayit('İkinci', 'olay'), c = kayit('Üçüncü', 'olay');
    h.kayitTarih({ evren, kod: b, kisitlar: [{ olay: c, fark: '2 yıl sonra' }] });
    h.kayitTarih({ evren, kod: c, kisitlar: [{ olay: b, fark: '2 yıl sonra' }] });
    let d = h.denetimler({ evren });
    const dongu = d.acik.filter((x) => x.kural === 'dongu');
    expect(dongu).toHaveLength(1);
    expect(dongu[0].hukum).toBe('celiski');
    expect(d.kurallar.find((k) => k.kural === 'dongu')!.denetlenen).toBe(2);
    void a;

    const kilic = kayit('Gümüş kılıç', 'esya');
    const x = kayit('Aren', 'karakter'), y = kayit('Mira', 'karakter');
    const ilk = h.iliskiEkle({ evren, tur: 'sahip', a: x, b: kilic, baslangic: '600' }) as { kod: string };
    h.iliskiEkle({ evren, tur: 'sahip', a: y, b: kilic, baslangic: '650' });
    d = h.denetimler({ evren });
    expect(d.acik.filter((z) => z.kural === 'esya')).toHaveLength(1);
    h.iliskiDegistir({ evren, kod: ilk.kod, alan: 'bitis', deger: '640' });
    d = h.denetimler({ evren });
    expect(d.acik.filter((z) => z.kural === 'esya')).toHaveLength(0);
    expect(d.kurallar.find((k) => k.kural === 'esya')!.sonuc).toBe('sorun_yok');
  });

  it('rota ve yolculuk: aşama süresi rotasından kısaysa çelişki; iki olay arası rota süresine yetmiyorsa olası', () => {
    const { h, evren, kayit } = kur();
    const a = kayit('Liman', 'sehir'), b = kayit('Dağ Kalesi', 'mekan');
    const r = kayit('Dağ Yolu', 'rota'), y = kayit('Kuzeye sefer', 'yolculuk');
    const k = kayit('Haberci', 'karakter');
    expect(() => h.rotaYaz({ evren, kod: y, rota: { a, b, mesafe: null, sureler: [], duraklar: [] } })).toThrow(/rota kaydı/);
    expect(() => h.rotaYaz({ evren, kod: r, rota: { a, b: a, mesafe: null, sureler: [], duraklar: [] } })).toThrow(/aynı/);
    h.rotaYaz({ evren, kod: r, rota: { a, b, mesafe: { deger: 40, birim: 'fersah' }, sureler: [{ kosul: 'yaz, atlı', gun: 3 }, { kosul: 'kış, yaya', gun: 9 }], duraklar: [] } });
    expect(h.rota({ evren, kod: r })).toMatchObject({ a: { kod: a }, b: { kod: b }, mesafe: { deger: 40, birim: 'fersah' }, sureler: [{ gun: 3 }, { gun: 9 }] });

    h.yolculukYaz({ evren, kod: y, asamalar: [{ nereden: a, nereye: b, rota: r, cikis: '1 Tohum 500', varis: '2 Tohum 500', durum: 'gerceklesti' }] });
    const yv = h.yolculuk({ evren, kod: y });
    expect(yv.asamalar[0].uyari).toContain('en kısa süre 3 gün');
    expect(h.rota({ evren, kod: r }).kullananlar.map((x) => x.kod)).toEqual([y]);
    h.iliskiEkle({ evren, tur: 'yolculukta', a: k, b: y, rol: 'yolcu' });
    let d = h.denetimler({ evren });
    expect(d.acik.find((x) => x.anahtar.startsWith('denetim:rota-asama:'))!.hukum).toBe('celiski');

    // Aşama düzeltilince çelişki kalkar; ayrı bir olayla rota süresinden kısa yer değiştirme olası uyuşmazlıktır.
    h.yolculukYaz({ evren, kod: y, asamalar: [{ nereden: a, nereye: b, rota: r, cikis: '1 Tohum 500', varis: '5 Tohum 500', durum: 'gerceklesti' }] });
    const o = kayit('Limanda ziyafet', 'olay', '6 Tohum 500');
    h.iliskiEkle({ evren, tur: 'sahne_yeri', a: o, b: a });
    h.iliskiEkle({ evren, tur: 'olayda', a: k, b: o, rol: 'katilan' });
    d = h.denetimler({ evren });
    expect(d.acik.some((x) => x.anahtar.startsWith('denetim:rota-asama:'))).toBe(false);
    const rb = d.acik.filter((x) => x.anahtar.startsWith('denetim:rota:'));
    expect(rb).toHaveLength(1);
    expect(rb[0].hukum).toBe('olasi');
    expect(rb[0].dayanak).toContain('en çok 2 gün');
    expect(rb[0].dayanak).toContain('başka bir yolla gelemeyeceği çıkarılmaz');
    expect(d.kurallar.find((x) => x.kural === 'konum')!.not).toContain('rota süresiyle');

    // Planlanan aşama bulunma sayılmaz; yaşam süresi yolculuğu da kapsar.
    h.kayitAlanYaz({ evren, kod: k, alan: 'olum', deger: '400' });
    d = h.denetimler({ evren });
    expect(d.acik.filter((x) => x.kural === 'yasam').length).toBeGreaterThanOrEqual(2);
    h.yolculukYaz({ evren, kod: y, asamalar: [{ nereden: a, nereye: b, rota: r, cikis: '1 Tohum 500', varis: '5 Tohum 500', durum: 'plan' }] });
    d = h.denetimler({ evren });
    expect(d.acik.filter((x) => x.kural === 'yasam')).toHaveLength(1);
  });
});
