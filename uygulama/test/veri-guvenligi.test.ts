// Veri kaybına karşı korumalar: değişiklik geçmişi silinemez; sessiz kayıp (aynı numaralı iki farklı değişiklik)
// yakalanır; bir evrenin eşitleme hatası öbürlerini durdurmaz; yedek ve eşitleme çok büyük evrende parça parça çalışır;
// yarıda kalan geri yükleme ya da indirme yarım evren bırakmaz. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { CatallanmaHatasi, EvrenVt } from '../src/calisan/evren-vt';
import { IZDUSUM_TABLOLARI } from '../src/calisan/izdusum';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';
import { sinirlar } from '../src/calisan/esitleme';
import { zipAc, zipOku, zipYaz, zipYazBlob } from '../src/alan/zip';
import { islemDosyasiOku, islemDosyasiYaz, islemSatiri, jsonPaketle, sikistir, sikistirmaAc } from '../src/alan/paket';
import { yeniKod } from '../src/alan/kod';
import type { Islem } from '../src/alan/islem';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const varsayilan = { sayfa: EvrenVt.sayfaBoyu, parti: Hizmet.geriYuklemePartisi, parca: sinirlar.parca, indirme: sinirlar.parti, al: EvrenVt.prototype.disaridanAl };
afterEach(() => {
  EvrenVt.sayfaBoyu = varsayilan.sayfa; Hizmet.geriYuklemePartisi = varsayilan.parti;
  sinirlar.parca = varsayilan.parca; sinirlar.parti = varsayilan.indirme;
  EvrenVt.prototype.disaridanAl = varsayilan.al;
});

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: new Uint8Array([7, veri[0]]) });

/**
 * Bir cihaz. Veritabanı dosyaları bellektedir; aynı `dosyalar` ile yeni bir cihaz kurmak programı kapatıp açmaktır.
 * `durum.coktu` doğruyken dosya silme ve kapatma yapılmaz: program tam o anda kapanmış gibi dosyalar yerinde kalır.
 */
function cihaz(ad: string, s: { drive?: BellekTasiyici; yedek?: BellekTasiyici; dosyalar?: Map<string, Database>; medya?: BellekDeposu } = {}) {
  const dosyalar = s.dosyalar ?? new Map<string, Database>();
  const durum = { coktu: false };
  const ac = (d: string) => {
    let x = dosyalar.get(d);
    if (!x) {
      const yeni = new sqlite3.oo1.DB(':memory:');
      const kapat = yeni.close.bind(yeni);
      yeni.close = (() => { if (!durum.coktu) kapat(); }) as typeof yeni.close;
      dosyalar.set(d, x = yeni);
    }
    return x;
  };
  const medya = s.medya ?? new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici, () => new sqlite3.oo1.DB(':memory:'), undefined,
    (d) => { if (!durum.coktu) dosyalar.delete(d); }, () => [...dosyalar.keys()]);
  if (s.drive) h.tasiyiciAyarla(s.drive, s.yedek ?? null);
  return { h, dosyalar, medya, durum };
}

const sema = metinSemasi.schema;
const yaz = (h: Hizmet, evren: string, kayit: string, ...p: string[]) => h.metinKaydet({ evren, kayit, alan: 'govde',
  spans: pmNodeToSpans(metinSemasi, sema.node('doc', null, p.map((x) => sema.node('paragraph', null, [sema.text(x)])))) as never,
  temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
const metni = (h: Hizmet, evren: string, kayit: string) => {
  const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
  return d.textBetween(0, d.content.size, '\n');
};
const vt = (h: Hizmet, evren: string) => (h as unknown as { evren(k: string): EvrenVt }).evren(evren);
const SIRASIZ = new Set(['metin_yazanlari', 'metin_catismalari']);
/** Bütün sonuç tabloları satır sırasıyla (ikili sütunlar hariç): iki kopya aynı mı? */
const tablolar = (h: Hizmet, evren: string) => {
  const db = vt(h, evren).db;
  return Object.fromEntries(IZDUSUM_TABLOLARI.map((t) => {
    const satirlar = db.selectObjects(`SELECT * FROM ${t} ORDER BY rowid`)
      .map((r) => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([, v]) => !(v instanceof Uint8Array)))));
    return [t, SIRASIZ.has(t) ? satirlar.sort() : satirlar];
  }));
};
const yazi = (s: string) => new TextEncoder().encode(s);

/** Uydurma içerikle evren: kayıtlar, metinler, ilişkiler, görseller ve birkaç çok parçalı işlem grubu. */
async function doldur(h: Hizmet, evren: string, n: number) {
  const kayitlar: string[] = [];
  for (let i = 0; i < n; i++) {
    if (i % 7 === 0 || !kayitlar.length) kayitlar.push(h.kayitOlustur({ evren, ad: `Kıyı ${i}`, tur: i % 2 ? 'karakter' : 'mekan' }).kod);
    const k = kayitlar[i % kayitlar.length];
    if (i % 3 === 0) yaz(h, evren, k, `Fenerin ${i}. gecesi.`, 'Rüzgâr dindi.');
    else if (i % 5 === 0 && k !== kayitlar[0]) h.iliskiEkle({ evren, a: kayitlar[0], b: k, tur: 'dusman' });
    else h.kayitDegistir({ evren, kod: k, alan: 'ozet', deger: `Özet ${i}` });
    if (i % 11 === 0) await h.gorselEkle({ evren, kod: k, dosyaAdi: `g${i}.png`, tur: 'image/png', veri: new Uint8Array([i % 256, 1, 2, 3]) });
    // Bilinmeyen türde çok parçalı grup: günlükte durur, parçalara bölünürken bölünmemeli.
    if (i % 4 === 0) vt(h, evren).islemYap([0, 1, 2].map((j) => ({ tur: 'deneme_grup', veri: { i, j } })));
  }
  return kayitlar;
}

describe('değişiklik geçmişi silinemez (§10.1)', () => {
  it('silme ve değiştirme veritabanında reddedilir; koruması olmayan eski dosya açılınca koruma eklenir', () => {
    const db = new sqlite3.oo1.DB(':memory:');
    const kurulum = yeniKod();
    const e = new EvrenVt(db, kurulum);
    e.islemYap([{ tur: 'deneme_yok', veri: { a: 1 } }, { tur: 'deneme_yok', veri: { a: 2 } }]);
    expect(() => db.exec('DELETE FROM islemler')).toThrow(/silinemez/);
    expect(() => db.exec(`UPDATE islemler SET veri='{"a":9}'`)).toThrow(/değiştirilemez/);
    expect(() => db.exec('UPDATE islemler SET saat=NULL')).toThrow(/değiştirilemez/);
    expect(e.islemSayisi()).toBe(2);
    // Eski bir sürümün dosyası: koruma yok, saatler boş. Açılınca saatler geri gelir ve koruma eklenir.
    const saatler = db.selectValues('SELECT saat FROM islemler ORDER BY no');
    db.exec('DROP TRIGGER islemler_silinmez; DROP TRIGGER islemler_degismez; UPDATE islemler SET saat=NULL');
    new EvrenVt(db, kurulum);
    expect(db.selectValues('SELECT saat FROM islemler ORDER BY no')).toEqual(saatler);
    expect(() => db.exec('DELETE FROM islemler')).toThrow(/silinemez/);
  });
});

describe('sessiz kayıp yakalanır: aynı numaralı iki farklı değişiklik (§10.5)', () => {
  const ac = () => new sqlite3.oo1.DB(':memory:');
  const yeni = (e: EvrenVt, n: number) => { for (let i = 0; i < n; i++) e.islemYap([{ tur: 'deneme_yok', veri: { i } }]); };

  it('eski yedekten geri gelen cihazın yeni yazdıkları öbür kopyada hiçbir şeyi ezmez; eşitleme durur', () => {
    const ka = yeniKod(), kb = yeniKod();
    const a = new EvrenVt(ac(), ka);
    yeni(a, 3);
    const b = new EvrenVt(ac(), kb);
    expect(b.disaridanAl(a.gorulmeyenler({})).alinan).toBe(3);
    // A'nın bilgisayarı iki değişiklik önceki bir kopyadan geri yüklendi ve aynı kurulum koduyla yazmayı sürdürdü.
    const eski = new EvrenVt(ac(), ka);
    eski.disaridanAl(a.gorulmeyenler({}).slice(0, 2));
    yeni(eski, 2);
    const once = b.db.selectValues('SELECT kod FROM islemler ORDER BY no');
    expect(() => b.disaridanAl(eski.gorulmeyenler({}))).toThrow(CatallanmaHatasi);
    expect(b.db.selectValues('SELECT kod FROM islemler ORDER BY no')).toEqual(once);
    expect(b.bekleyenSayisi()).toBe(0);
    // Aynı partide iki kopyanın 3. değişikliği birlikte gelirse de reddedilir.
    const c = new EvrenVt(ac(), yeniKod());
    expect(() => c.disaridanAl([...a.gorulmeyenler({}), ...eski.gorulmeyenler({}).slice(2)])).toThrow(CatallanmaHatasi);
    expect(c.islemSayisi()).toBe(0);
  });

  it('çok sayıda değişiklik yazılırken dışarıdan gelenler içine karışmaz', async () => {
    const e = new EvrenVt(ac(), yeniKod());
    const d = new EvrenVt(ac(), yeniKod());
    yeni(d, 2);
    await e.topluYaz(async () => {
      e.islemYap([{ tur: 'deneme_yok', veri: {} }]);
      expect(e.topluSuruyor).toBe(true);
      expect(() => e.disaridanAl(d.gorulmeyenler({}))).toThrow(/biraz sonra/);
    });
    expect(e.topluSuruyor).toBe(false);
    expect(e.disaridanAl(d.gorulmeyenler({})).alinan).toBe(2);
    expect(e.islemSayisi()).toBe(3);
  });
});

describe('bir evrenin sorunu öbürlerini durdurmaz', () => {
  it('Drive\'da bozuk dosyası olan evren, öbür evrenin eşitlemesini ve günlük yedeğini durdurmaz', async () => {
    const drive = new BellekTasiyici();
    const yedek = new BellekTasiyici();
    const m = cihaz('Masaüstü', { drive, yedek });
    const t = cihaz('Tablet', { drive, yedek });
    const { kod: kuzey } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: guney } = m.h.evrenOlustur({ ad: 'Güney' });
    const kk = m.h.kayitOlustur({ evren: kuzey, ad: 'Liman', tur: 'mekan' }).kod;
    const gk = m.h.kayitOlustur({ evren: guney, ad: 'Çarşı', tur: 'mekan' }).kod;
    await m.h.esitle();
    await t.h.evreniIndir({ kod: kuzey });
    await t.h.evreniIndir({ kod: guney });
    m.h.kayitDegistir({ evren: kuzey, kod: kk, alan: 'ozet', deger: 'Sisli' });
    m.h.kayitDegistir({ evren: guney, kod: gk, alan: 'ozet', deger: 'Kalabalık' });
    await m.h.esitle();
    // Kuzey'in masaüstünden gelen son parçası Drive'da bozuldu.
    const ben = m.h.baslat().kod;
    const parca = [...drive.dosyalar.values()].filter((d) => d.ozellikler.tur === 'parca' && d.ozellikler.evren === kuzey && d.ozellikler.kurulum === ben)
      .sort((a, b) => Number(b.ozellikler.ilk) - Number(a.ozellikler.ilk))[0];
    parca.veri = new Uint8Array([1, 2, 3]);
    t.h.kayitDegistir({ evren: guney, kod: gk, alan: 'ad', deger: 'Büyük Çarşı' });
    const d = await t.h.esitle();
    expect(d.hata?.mesaj).toMatch(/Kuzey/);
    expect(d.hata?.mesaj).not.toMatch(/Güney/);
    expect(t.h.kayit({ evren: guney, kod: gk }).ozet).toBe('Kalabalık');
    expect(d.evrenler.find((e) => e.kod === guney)!.yalnizBuCihazda).toBe(0);
    expect(t.h.donemselYedekDurumu({ evren: guney }).son).not.toBeNull();
    // Kuzey'de hiçbir şey kaybolmadı: bozuk parça okunmadı, eski hâl yerinde.
    expect(t.h.kayit({ evren: kuzey, kod: kk }).ad).toBe('Liman');
  });
});

describe('geri yükleme', () => {
  it('yedekte bu cihazın kendi değişiklikleri varsa yedek ayrı bir evren olarak açılır', async () => {
    const { h } = cihaz('Masaüstü');
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const k = h.kayitOlustur({ evren, ad: 'Liman', tur: 'mekan' }).kod;
    const { veri } = await h.yedekAl({ evren });
    h.evrenKaldir({ evren });
    const r = await h.yedektenYukle({ veri });
    // Aynı kodla açılsaydı bu cihazın yeni yazıları, Drive'da duran eski yazılarının numaralarını yeniden kullanırdı.
    expect(r.ayri).toBe(true);
    expect(r.kod).not.toBe(evren);
    expect(h.kayit({ evren: r.kod, kod: k }).ad).toBe('Liman');
  });

  it('değişiklikler parti parti yazılır; geri gelen evren asıl evrenle tablo tablo aynıdır', async () => {
    EvrenVt.sayfaBoyu = 5;
    Hizmet.geriYuklemePartisi = 7;
    const a = cihaz('Masaüstü');
    const { kod: evren } = a.h.evrenOlustur({ ad: 'Kuzey' });
    const kayitlar = await doldur(a.h, evren, 40);
    const { veri } = await a.h.yedekAl({ evren });
    expect(veri).toBeInstanceOf(Blob);
    const b = cihaz('Dizüstü');
    const bilgi = await b.h.yedekIncele({ veri });
    expect(bilgi.islemSayisi).toBe(vt(a.h, evren).islemSayisi());
    const r = await b.h.yedektenYukle({ veri });
    expect(r).toEqual({ kod: evren, ayri: false, eksikGorseller: [] });
    expect(tablolar(b.h, evren)).toEqual(tablolar(a.h, evren));
    expect(metni(b.h, evren, kayitlar[0])).toBe(metni(a.h, evren, kayitlar[0]));
    expect(b.medya.dosyalar.size).toBe(a.medya.dosyalar.size);
    expect(Number(vt(b.h, evren).db.selectValue("SELECT count(*) FROM meta WHERE k='yarim'"))).toBe(0);
  });

  it('yedek hazırlanırken yazılan değişiklik pakete karışmaz; paket kendi sayısıyla tutarlıdır', async () => {
    EvrenVt.sayfaBoyu = 3;
    const a = cihaz('Masaüstü');
    const { kod: evren } = a.h.evrenOlustur({ ad: 'Kuzey' });
    const kayitlar = await doldur(a.h, evren, 12);
    const once = vt(a.h, evren).islemSayisi();
    // Görseller okunurken (bekleme anında) kullanıcı yazmayı sürdürüyor.
    const oku = a.medya.oku.bind(a.medya);
    let yazildi = 0;
    a.medya.oku = async (ad) => { if (yazildi++ < 3) a.h.kayitDegistir({ evren, kod: kayitlar[0], alan: 'ozet', deger: `Ara ${yazildi}` }); return oku(ad); };
    const { veri } = await a.h.yedekAl({ evren });
    expect(vt(a.h, evren).islemSayisi()).toBe(once + 3);
    const b = cihaz('Dizüstü');
    expect((await b.h.yedekIncele({ veri })).islemSayisi).toBe(once);
    await b.h.yedektenYukle({ veri });
    expect(vt(b.h, evren).islemSayisi()).toBe(once);
  });

  it('program geri yükleme sırasında kapanırsa yarım evren listeye girmez; yeniden geri yüklenince baştan kurulur', async () => {
    Hizmet.geriYuklemePartisi = 5;
    const a = cihaz('Masaüstü');
    const { kod: evren } = a.h.evrenOlustur({ ad: 'Kuzey' });
    await doldur(a.h, evren, 20);
    const { veri } = await a.h.yedekAl({ evren });

    const b = cihaz('Dizüstü');
    let parti = 0;
    class Kapandi extends Error {}
    EvrenVt.prototype.disaridanAl = function (this: EvrenVt, l: Islem[]) {
      if (++parti === 3) { b.durum.coktu = true; throw new Kapandi(); }
      return varsayilan.al.call(this, l);
    };
    await expect(b.h.yedektenYukle({ veri })).rejects.toThrow(Kapandi);
    EvrenVt.prototype.disaridanAl = varsayilan.al;
    expect(b.dosyalar.has(`/evren-${evren}.db`)).toBe(true); // yarım dosya diskte kaldı

    // Program yeniden açılır: yarım evren listede görünmez.
    const b2 = cihaz('Dizüstü', { dosyalar: b.dosyalar, medya: b.medya });
    expect(b2.h.evrenler()).toEqual([]);
    // Yeniden geri yükleme yarım dosyayı silip baştan kurar.
    const r = await b2.h.yedektenYukle({ veri });
    expect(r.kod).toBe(evren);
    expect(tablolar(b2.h, evren)).toEqual(tablolar(a.h, evren));
    expect(b2.h.evrenler().map((e) => e.kod)).toEqual([evren]);
  });

  it('bozuk satırlı, bozulmuş ya da kesik yedek hiçbir şey yazılmadan reddedilir', async () => {
    const a = cihaz('Masaüstü');
    const { kod: evren } = a.h.evrenOlustur({ ad: 'Kuzey' });
    await doldur(a.h, evren, 8);
    const { veri } = await a.h.yedekAl({ evren });
    const ham = new Uint8Array(await veri.arrayBuffer());
    const o = await zipOku(ham);
    const satirlar = new TextDecoder().decode(o.get('islemler.jsonl')!).split('\n');
    const bozukSatir = new Map(o);
    bozukSatir.set('islemler.jsonl', yazi([satirlar[0], '{"kod": bozuk', ...satirlar.slice(2)].join('\n')));
    const b = cihaz('Dizüstü');
    await expect(b.h.yedektenYukle({ veri: await zipYaz([...bozukSatir].map(([ad, v]) => ({ ad, veri: v }))) })).rejects.toThrow(/bozuk bir değişiklik var \(satır 2\)/);
    // Değişikliklerin sıkıştırılmış hâlinde bir bayt bozuldu.
    const z = await zipAc(ham);
    expect(z.var('islemler.jsonl')).toBe(true);
    const yer = ham.findIndex((_, i) => new TextDecoder().decode(ham.subarray(i, i + 14)) === 'islemler.jsonl');
    const bayt = ham.slice();
    bayt[yer + 14 + 40] ^= 0x5a;
    await expect(b.h.yedektenYukle({ veri: bayt })).rejects.toThrow(/bozuk/);
    // Dosyanın sonu eksik (indirme yarıda kesilmiş).
    await expect(b.h.yedektenYukle({ veri: ham.slice(0, ham.length - 40) })).rejects.toThrow(/yedek paketi değil ya da bozuk|içindekiler/);
    expect(b.h.evrenler()).toEqual([]);
    expect([...b.dosyalar.keys()].filter((d) => d.startsWith('/evren-'))).toEqual([]);
  });
});

describe('listeden düşen evren', () => {
  it('evren listesinden düşmüş ama dosyası duran evren açılışta geri gelir; deneme kopyası ayrı evren sayılmaz', async () => {
    const a = cihaz('Masaüstü');
    const { kod: evren } = a.h.evrenOlustur({ ad: 'Kuzey' });
    await doldur(a.h, evren, 5);
    const { kod: dal } = a.h.dalOlustur({ evren, ad: 'Deneme' });
    expect(a.dosyalar.has(`/evren-${dal}.db`)).toBe(true);
    // Evren listesi bozuldu ya da program evren eklenirken kapandı.
    a.dosyalar.get('/kurulum.db')!.exec('DELETE FROM evrenler');
    const b = cihaz('Masaüstü', { dosyalar: a.dosyalar, medya: a.medya });
    expect(b.h.evrenler().map((e) => [e.kod, e.ad])).toEqual([[evren, 'Kuzey']]);
    expect(tablolar(b.h, evren)).toEqual(tablolar(a.h, evren));
  });
});

describe('Drive yedeklerinin saklanması', () => {
  it('yeni yedekte eski bir yedekten daha az değişiklik varsa eski yedeklerin hiçbiri silinmez', async () => {
    const yedek = new BellekTasiyici();
    const m = cihaz('Masaüstü', { drive: new BellekTasiyici(), yedek });
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    m.h.kayitOlustur({ evren, ad: 'Liman', tur: 'mekan' });
    const ana = await yedek.klasor('Dünya Atlası yedekleri', { uygulama: 'dunya-atlasi', tur: 'yedek-klasoru' });
    // Saklama süresi çoktan dolmuş, ama içinde çok daha fazla değişiklik olan eski bir yedek.
    await yedek.yukle('x.zip', { uygulama: 'dunya-atlasi', tur: 'yedek', evren, gun: '2020-01-02', zaman: '1', kurulum: 'x', islem: '5000' }, new Uint8Array([1]), undefined, ana);
    await m.h.esitle();
    const liste = await m.h.driveYedekleri({ evren });
    expect(liste.map((y) => y.gun).sort()).toEqual(['2020-01-02', new Date().toISOString().slice(0, 10)].sort());
    expect(m.h.donemselYedekDurumu({ evren }).hata).toMatch(/daha önceki bir yedekte 5000 vardı.*hiçbiri silinmedi/);
  });
});

describe('çok büyük evren: parça parça yazma ve okuma', () => {
  const islemler = () => {
    const e = new EvrenVt(new sqlite3.oo1.DB(':memory:'), yeniKod());
    for (let i = 0; i < 23; i++) e.islemYap([{ tur: 'deneme_yok', veri: { i, metin: `satır\n${i}` }, ikili: i % 3 ? null : new Uint8Array([i, 255, 0]) }]);
    return e.islemler();
  };

  it('işlem dosyası satır satır yazılır ve okunur; eski tek satırlık dosya da okunur; yarım dosya reddedilir', async () => {
    const l = islemler();
    const v = await islemDosyasiYaz({ protokol: 1, evren: 'x' }, [l.slice(0, 10), [], l.slice(10)]);
    // Eski sürümler dosyayı tek seferde okur: yine geçerli bir belge.
    expect(JSON.parse(new TextDecoder().decode(await sikistirmaAc(v))).islemler).toHaveLength(23);
    const r = await islemDosyasiOku(v);
    expect(r.baslik).toEqual({ protokol: 1, evren: 'x' });
    expect(r.islemler).toEqual(l);
    const partiler: number[] = [];
    await islemDosyasiOku(v, { her: (p) => partiler.push(p.length), parti: 4 });
    expect(partiler).toEqual([4, 4, 4, 4, 4, 3]);
    // Eski sürümün yazdığı tek satırlık dosya.
    const eski = await jsonPaketle({ protokol: 1, evren: 'x', islemler: l.map(islemSatiri) });
    expect((await islemDosyasiOku(eski)).islemler).toEqual(l);
    // Boş dosya ve başlığa göre durdurma.
    expect((await islemDosyasiOku(await islemDosyasiYaz({}, []))).islemler).toEqual([]);
    let verildi = 0;
    await expect(islemDosyasiOku(v, { her: () => { verildi++; }, basliktan: () => { throw new Error('yeni sürüm'); } })).rejects.toThrow('yeni sürüm');
    expect(verildi).toBe(0);
    // Sonu kesilmiş dosya.
    const metin = new TextDecoder().decode(await sikistirmaAc(v));
    await expect(islemDosyasiOku(await sikistir(yazi(metin.slice(0, metin.lastIndexOf('\n')))))).rejects.toThrow(/yarım/);
    await expect(islemDosyasiOku(v.slice(0, v.length - 12))).rejects.toThrow();
  });

  it('ZIP64 biçimi, dosya (Blob) içeriği ve parça parça üretilen içerik aynen okunur; bozulma okunurken yakalanır', async () => {
    const gorsel = new Uint8Array(70_000).map((_, i) => (i * 31) & 0xff);
    const dosyalar = [
      { ad: 'aciklama.txt', veri: yazi('Kuzey kıyısı '.repeat(50)) },
      { ad: 'medya/g.png', veri: new Blob([gorsel]), sikistirma: false },
      { ad: 'islemler.jsonl', veri: function* () { yield yazi('{"a":1}\n'); yield yazi('{"a":'); yield yazi('2}'); } },
    ];
    for (const zip64 of [false, true]) {
      const z = await zipYazBlob(dosyalar, new Date(2026, 0, 2), { zip64 });
      for (const kaynak of [z, new Uint8Array(await z.arrayBuffer())]) {
        const a = await zipAc(kaynak);
        expect(a.adlar).toEqual(['aciklama.txt', 'medya/g.png', 'islemler.jsonl']);
        expect(new TextDecoder().decode(await a.oku('aciklama.txt'))).toBe('Kuzey kıyısı '.repeat(50));
        expect(await a.oku('medya/g.png')).toEqual(gorsel);
        const satirlar: string[] = [];
        for await (const s of a.satirlar('islemler.jsonl')) satirlar.push(s);
        expect(satirlar).toEqual(['{"a":1}', '{"a":2}']);
      }
      // Görselin ortasında bir bayt bozuldu: sağlama toplamı tutmaz.
      const b = new Uint8Array(await z.arrayBuffer());
      const yer = b.findIndex((_, i) => b[i] === gorsel[0] && b[i + 1] === gorsel[1] && b[i + 2] === gorsel[2] && b[i + 3] === gorsel[3]);
      b[yer + 5000] ^= 0xff;
      await expect((await zipAc(b)).oku('medya/g.png')).rejects.toThrow(/bozuk dosya: medya\/g.png/);
    }
  });

  it('Drive\'a çok sayıda değişiklik birkaç parçada gider, grup bölünmez; yeni cihaz görüntüden parti parti kurulur', async () => {
    sinirlar.parca = 6;
    sinirlar.parti = 7;
    EvrenVt.sayfaBoyu = 5;
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', { drive });
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const kayitlar = await doldur(m.h, evren, 30);
    await m.h.esitle();
    const ben = m.h.baslat().kod;
    const parcalar = [...drive.dosyalar.values()].filter((d) => d.ozellikler.tur === 'parca' && d.ozellikler.kurulum === ben)
      .map((d) => ({ ilk: Number(d.ozellikler.ilk), son: Number(d.ozellikler.son) })).sort((a, b) => a.ilk - b.ilk);
    const toplam = vt(m.h, evren).gorulenler()[ben];
    expect(parcalar.length).toBeGreaterThan(5);
    // Parçalar boşluksuz ve örtüşmeden bütün değişiklikleri kapsar; hiçbir grup iki parçaya bölünmez.
    expect(parcalar[0].ilk).toBe(1);
    expect(parcalar[parcalar.length - 1].son).toBe(toplam);
    const grup = new Map(vt(m.h, evren).islemler().map((i) => [i.sira, i.grup]));
    for (let i = 1; i < parcalar.length; i++) {
      expect(parcalar[i].ilk).toBe(parcalar[i - 1].son + 1);
      const g = grup.get(parcalar[i].ilk);
      if (g) expect(grup.get(parcalar[i - 1].son)).not.toBe(g);
    }
    // Çok değişiklik gönderildiği için görüntü de yazıldı.
    expect([...drive.dosyalar.values()].some((d) => d.ozellikler.tur === 'goruntu')).toBe(true);

    const partiBoylari: number[] = [];
    EvrenVt.prototype.disaridanAl = function (this: EvrenVt, l: Islem[]) { partiBoylari.push(l.length); return varsayilan.al.call(this, l); };
    const t = cihaz('Tablet', { drive });
    await t.h.evreniIndir({ kod: evren });
    expect(Math.max(...partiBoylari)).toBeLessThanOrEqual(7);
    expect(tablolar(t.h, evren)).toEqual(tablolar(m.h, evren));
    expect(metni(t.h, evren, kayitlar[0])).toBe(metni(m.h, evren, kayitlar[0]));
  });

  it('yeni cihaza indirme yarıda kesilirse evren bir sonraki eşitlemede tamamlanır', async () => {
    sinirlar.parca = 8;
    sinirlar.parti = 5;
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', { drive });
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    await doldur(m.h, evren, 25);
    await m.h.esitle();
    const t = cihaz('Tablet', { drive });
    let parti = 0;
    EvrenVt.prototype.disaridanAl = function (this: EvrenVt, l: Islem[]) {
      if (++parti === 3) throw new Error('Bağlantı koptu.');
      return varsayilan.al.call(this, l);
    };
    await expect(t.h.evreniIndir({ kod: evren })).rejects.toThrow('Bağlantı koptu.');
    EvrenVt.prototype.disaridanAl = varsayilan.al;
    expect(vt(t.h, evren).islemSayisi()).toBeLessThan(vt(m.h, evren).islemSayisi());
    await t.h.esitle();
    expect(tablolar(t.h, evren)).toEqual(tablolar(m.h, evren));
  });
});
