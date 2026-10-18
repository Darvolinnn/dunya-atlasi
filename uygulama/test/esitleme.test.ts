import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';
import { GORUNTU_ARALIGI } from '../src/calisan/esitleme';
import { silinecekGunler, gunYaz } from '../src/calisan/donemsel-yedek';
import type { Spans } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: new Uint8Array([7]) });

function cihaz(ad: string, drive: BellekTasiyici, yedek: BellekTasiyici | null = null) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const medya = new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici);
  h.tasiyiciAyarla(drive, yedek);
  return { h, medya };
}
const metni = (h: Hizmet, evren: string, kayit: string) => {
  const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
  return d.textBetween(0, d.content.size, '\n');
};
const yaz = (h: Hizmet, evren: string, kayit: string, ...p: string[]) => {
  const s = metinSemasi.schema;
  const spans = pmNodeToSpans(metinSemasi, s.node('doc', null, p.map((x) => s.node('paragraph', null, [s.text(x)])))) as Spans;
  return h.metinKaydet({ evren, kayit, alan: 'govde', spans, temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
};
const turler = (d: BellekTasiyici) => [...d.dosyalar.values()].map((x) => x.ozellikler.tur);

describe('Drive eşitlemesi (sahte Drive ile)', () => {
  it('evren Drive üzerinden ikinci cihaza gelir; değişiklikler iki yöne gider', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const t = cihaz('Tablet', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    yaz(m.h, evren, v, 'Kuzeyde doğdu');
    await m.h.gorselEkle({ evren, kod: v, dosyaAdi: 'v.png', tur: 'image/png', veri: new Uint8Array([1, 2, 3]) });
    expect(m.h.esitlemeDurumu().evrenler[0].yalnizBuCihazda).toBeGreaterThan(0);
    await m.h.esitle();
    expect(m.h.esitlemeDurumu().evrenler[0].yalnizBuCihazda).toBe(0);
    expect(turler(drive).sort()).toEqual(['kurulum', 'medya', 'medya', 'parca']);

    expect(await t.h.uzakEvrenler()).toEqual([expect.objectContaining({ kod: evren, ad: 'Kuzey' })]);
    await t.h.evreniIndir({ kod: evren });
    expect(t.h.evrenler().map((e) => e.ad)).toEqual(['Kuzey']);
    expect(metni(t.h, evren, v)).toBe('Kuzeyde doğdu');
    const gorsel = t.h.kayit({ evren, kod: v }).gorseller[0];
    expect(await t.h.gorsel({ evren, ad: gorsel })).toMatchObject({ durum: 'var' });
    expect(t.medya.dosyalar.size).toBe(2); // görsel ve önizlemesi

    t.h.kayitDegistir({ evren, kod: v, alan: 'ozet', deger: 'Vali' });
    yaz(t.h, evren, v, 'Kuzeyde doğdu', 'Tablette eklendi');
    await t.h.esitle();
    await m.h.esitle();
    expect(m.h.kayit({ evren, kod: v }).ozet).toBe('Vali');
    expect(metni(m.h, evren, v)).toBe('Kuzeyde doğdu\nTablette eklendi');

    // Cihazlar birbirini adıyla tanır; tablet masaüstünün gönderdiklerinin hepsini almış.
    await t.h.esitle();
    const d = m.h.esitlemeDurumu().evrenler[0];
    expect(d.cihazlar.map((c) => c.ad).sort()).toEqual(['Masaüstü', 'Tablet']);
    expect(d.cihazlar.find((c) => c.ad === 'Tablet')!.bekleyen).toBe(0);
  });

  it('çevrimdışı iki cihazın değişiklikleri Drive üzerinden birleşir; çatışma ikisinde de aynı görünür', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const t = cihaz('Tablet', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    await m.h.esitle();
    await t.h.evreniIndir({ kod: evren });
    m.h.kayitDegistir({ evren, kod: v, alan: 'ozet', deger: 'Kuzey valisi' });
    t.h.kayitDegistir({ evren, kod: v, alan: 'ozet', deger: 'Güney valisi' });
    t.h.kayitDegistir({ evren, kod: v, alan: 'okunus', deger: 'Vel-kar' });
    await m.h.esitle(); await t.h.esitle(); await m.h.esitle();
    for (const h of [m.h, t.h]) {
      expect(h.kayit({ evren, kod: v }).okunus).toBe('Vel-kar');
      expect(h.catismalar({ evren }).map((c) => c.tur === 'alan' && c.alan)).toEqual(['ozet']);
    }
    // Çatışmada öbür cihazın adı görünür.
    const c = m.h.catismalar({ evren })[0];
    expect(c.tur === 'alan' && c.degerler.map((x) => x.kurulum).sort()).toEqual(['Tablet', 'bu cihaz']);
  });

  it('izin yokken yazma sürer; izin gelince biriken değişiklikler gönderilir', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    await m.h.esitle();
    drive.izinYok = true;
    m.h.kayitOlustur({ evren, ad: 'A', tur: 'karakter' });
    const d = await m.h.esitle();
    expect(d.hata).toMatchObject({ izin: true });
    expect(d.bagli).toBe(false);
    expect(d.evrenler[0].yalnizBuCihazda).toBe(2);
    drive.izinYok = false;
    m.h.tasiyiciAyarla(drive);
    const d2 = await m.h.esitle();
    expect(d2.hata).toBeNull();
    expect(d2.evrenler[0].yalnizBuCihazda).toBe(0);
  });

  it('bir evreni eşitlemeden çıkarmak Drive\'a göndermeyi durdurur', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Gizli taslak' });
    m.h.evrenEsitlemeAyari({ evren, esitlenir: false });
    await m.h.esitle();
    expect(drive.dosyalar.size).toBe(0);
  });

  it('yedekten gelen evren Drive\'a görüntüyle gider; yeni cihaz görüntüden kurulur', async () => {
    const drive = new BellekTasiyici();
    const eski = cihaz('Eski bilgisayar', new BellekTasiyici());
    const { kod: evren } = eski.h.evrenOlustur({ ad: 'Kuzey' });
    const v = eski.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    const { veri } = await eski.h.yedekAl({ evren });
    const m = cihaz('Masaüstü', drive);
    await m.h.yedektenYukle({ veri });
    await m.h.esitle();
    expect(turler(drive).sort()).toEqual(['goruntu', 'kurulum']);
    const t = cihaz('Tablet', drive);
    await t.h.evreniIndir({ kod: evren });
    expect(t.h.kayit({ evren, kod: v }).ad).toBe('Velkar');
    // Tekrar eşitlemek yeni görüntü yazmaz.
    await m.h.esitle();
    expect(turler(drive).filter((x) => x === 'goruntu').length).toBe(1);
  });

  it('eski parçalar herkes aldıktan ve görüntü yazıldıktan sonra temizlenir; yeni cihaz yine her şeyi alır', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const t = cihaz('Tablet', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    await m.h.esitle();
    await t.h.evreniIndir({ kod: evren });
    for (let i = 0; i < GORUNTU_ARALIGI + 2; i++) {
      m.h.kayitOlustur({ evren, ad: `K${i}`, tur: 'mekan' });
      await m.h.esitle();
      if (i % 10 === 0) await t.h.esitle();
    }
    await t.h.esitle();
    await m.h.esitle();
    const parca = turler(drive).filter((x) => x === 'parca').length;
    expect(turler(drive)).toContain('goruntu');
    expect(parca).toBeLessThan(GORUNTU_ARALIGI / 2);
    const p = cihaz('Telefon', drive);
    await p.h.evreniIndir({ kod: evren });
    expect(p.h.kayitlar({ evren }).length).toBe(GORUNTU_ARALIGI + 2);
    expect(t.h.kayitlar({ evren }).length).toBe(GORUNTU_ARALIGI + 2);
  });

  it('kullanım dışı cihaz temizliği bekletmez', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const t = cihaz('Kayıp telefon', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    await m.h.esitle();
    await t.h.evreniIndir({ kod: evren });
    for (let i = 0; i < GORUNTU_ARALIGI + 2; i++) { m.h.kayitOlustur({ evren, ad: `K${i}`, tur: 'mekan' }); await m.h.esitle(); }
    const once = turler(drive).filter((x) => x === 'parca').length;
    expect(once).toBeGreaterThan(GORUNTU_ARALIGI); // telefon almadığı için silinmedi
    const telefon = m.h.esitlemeDurumu().evrenler[0].cihazlar.find((c) => !c.buCihaz)!;
    expect(telefon.bekleyen).toBeGreaterThan(GORUNTU_ARALIGI);
    m.h.kurulumKullanimDisi({ kod: telefon.kod, disi: true });
    await m.h.esitle();
    expect(turler(drive).filter((x) => x === 'parca').length).toBeLessThan(3);
  });
});

describe('eşitleme işareti', () => {
  it('eşitlenecek evren yokken de eşitleme "sürüyor" durumunda kalmaz', async () => {
    const drive = new BellekTasiyici();
    const t = cihaz('Tablet', drive);
    expect((await t.h.esitle()).calisiyor).toBe(false);
    const { kod: evren } = t.h.evrenOlustur({ ad: 'Yeni' });
    await t.h.esitle();
    expect(t.h.esitlemeDurumu().evrenler.find((e) => e.kod === evren)!.sonEsitleme).not.toBeNull();
  });
});

describe('dönemsel yedek (§10.10)', () => {
  it('saklama: son 30 gün ve son 12 ayın ilk yedekleri kalır; en yeni hiç silinmez', () => {
    const gunler: string[] = [];
    for (let t = Date.parse('2025-01-01T12:00:00Z'); t <= Date.parse('2026-10-18T12:00:00Z'); t += 86_400_000) gunler.push(new Date(t).toISOString().slice(0, 10));
    const sil = new Set(silinecekGunler(gunler, '2026-10-18'));
    const kalan = gunler.filter((g) => !sil.has(g));
    const ayIlkleri = kalan.filter((g) => g < '2026-09-18');
    expect(ayIlkleri).toEqual(['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01']);
    expect(kalan.filter((g) => g >= '2026-09-18')).toEqual(gunler.filter((g) => g >= '2026-09-19'));
    expect(silinecekGunler(['2020-01-05'], '2026-10-18')).toEqual([]);
    // Ay ilk günü değil, ayın ilk yedeği sayılır.
    expect(silinecekGunler(['2026-03-07', '2026-03-20', '2026-10-18'], '2026-10-18')).toEqual(['2026-03-20']);
  });

  it('eşitlemede günün yedeği alınır, doğrulanır; görseller bir kez yüklenir; yedekten geri yüklenir', async () => {
    const drive = new BellekTasiyici();
    const yedek = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive, yedek);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    yaz(m.h, evren, v, 'Kuzeyde doğdu');
    await m.h.gorselEkle({ evren, kod: v, dosyaAdi: 'v.png', tur: 'image/png', veri: new Uint8Array([1, 2, 3]) });
    await m.h.esitle();
    const d = m.h.donemselYedekDurumu({ evren });
    expect(d.son).toMatchObject({ gun: gunYaz(Date.now()), dogrulandi: true });
    expect(d.hata).toBeNull();
    expect(turler(yedek).sort()).toEqual(['yedek', 'yedek-medya', 'yedek-medya']);
    // Yedek görünür klasörde, görseller onun "medya" alt klasöründe.
    const klasorler = [...yedek.klasorler.entries()];
    const ana = klasorler.find(([, k]) => k.ad === 'Dünya Atlası yedekleri')![0];
    const medya = klasorler.find(([, k]) => k.ad === 'medya')!;
    expect(medya[1].ust).toBe(ana);
    expect([...yedek.dosyalar.values()].find((x) => x.ozellikler.tur === 'yedek')!.ust).toBe(ana);
    expect([...yedek.dosyalar.values()].filter((x) => x.ozellikler.tur === 'yedek-medya').every((x) => x.ust === medya[0])).toBe(true);

    // Aynı gün yeniden eşitlemek yeni yedek almaz; elle alınan yedek bugünkünün yerine geçer, görseller yeniden yüklenmez.
    await m.h.esitle();
    m.h.kayitDegistir({ evren, kod: v, alan: 'ozet', deger: 'Vali' });
    await m.h.drivedaYedekAl({ evren });
    expect(turler(yedek).sort()).toEqual(['yedek', 'yedek-medya', 'yedek-medya']);
    const liste = await m.h.driveYedekleri({ evren });
    expect(liste.length).toBe(1);

    // Yeni bir cihaz (Drive eşitlemesi olmadan) yedekten geri yükler.
    const y = cihaz('Yeni bilgisayar', new BellekTasiyici(), yedek);
    const { kod, ayri } = await y.h.drivedanGeriYukle({ id: liste[0].id });
    expect({ kod, ayri }).toEqual({ kod: evren, ayri: false });
    expect(y.h.kayit({ evren, kod: v }).ozet).toBe('Vali');
    expect(metni(y.h, evren, v)).toBe('Kuzeyde doğdu');
    const gorsel = y.h.kayit({ evren, kod: v }).gorseller[0];
    expect(await y.h.gorsel({ evren, ad: gorsel })).toMatchObject({ durum: 'var' });
    expect(y.medya.dosyalar.size).toBe(2);
  });

  it('eşitlemeden çıkarılan evren Drive\'a yedeklenmez; yedek hatası eşitlemeyi bozmaz', async () => {
    const drive = new BellekTasiyici();
    const yedek = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive, yedek);
    const { kod: gizli } = m.h.evrenOlustur({ ad: 'Gizli' });
    m.h.evrenEsitlemeAyari({ evren: gizli, esitlenir: false });
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    yedek.yukle = async () => { throw new Error('Drive\'da yer kalmadı.'); };
    const d = await m.h.esitle();
    expect(d.hata).toBeNull();
    expect(d.evrenler.find((e) => e.kod === evren)!.yalnizBuCihazda).toBe(0);
    expect(m.h.donemselYedekDurumu({ evren }).hata).toBe('Drive\'da yer kalmadı.');
    expect(m.h.donemselYedekDurumu({ evren: gizli }).son).toBeNull();
    expect([...yedek.dosyalar.values()].some((x) => x.ozellikler.evren === gizli)).toBe(false);
  });

  it('saklama süresi dolan yedekler silinir', async () => {
    const yedek = new BellekTasiyici();
    const m = cihaz('Masaüstü', new BellekTasiyici(), yedek);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const ana = await yedek.klasor('Dünya Atlası yedekleri', { uygulama: 'dunya-atlasi', tur: 'yedek-klasoru' });
    for (const gun of ['2020-01-01', '2020-01-02']) await yedek.yukle('x.zip', { uygulama: 'dunya-atlasi', tur: 'yedek', evren, gun, zaman: '1', kurulum: 'x' }, new Uint8Array([1]), undefined, ana);
    await m.h.esitle();
    expect((await m.h.driveYedekleri({ evren })).map((y) => y.gun)).toEqual([gunYaz(Date.now())]);
  });
});
