// Bu bilgisayardaki günlük yedekler (K31, §10.10): Windows uygulamasında Belgeler'deki yedek klasörü. Kabuğun yerine
// bellekte sahte klasör kullanılır. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekKlasor, LISTE_DOSYASI } from '../src/calisan/klasor-tasiyici';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';
import { gunYaz } from '../src/calisan/donemsel-yedek';
import { zipYaz } from '../src/alan/zip';
import { Istemci, type CalisanBenzeri } from '../src/veri/istemci';
import { klasorIstegi, yedekKlasoruYeri } from '../src/veri/kabuk';
import { sessizIzin } from '../src/arayuz/google';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: new Uint8Array([7]) });
const YER = 'C:\\Users\\Yazar\\Documents\\Dünya Atlası yedekleri';

function cihaz(ad: string, klasor: BellekKlasor | null, drive: BellekTasiyici | null = null) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const medya = new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici);
  if (klasor) h.yerelKlasorAyarla(klasor, YER);
  if (drive) h.tasiyiciAyarla(new BellekTasiyici(), drive);
  return { h, medya };
}
/** Program kapanıp açılmış gibi: klasör yeniden bağlanır, klasörün bellekteki listesi unutulur. */
const yenidenAcildi = (m: ReturnType<typeof cihaz>, k: BellekKlasor) => { m.h.yerelKlasorAyarla(k, YER); return m; };
const yedekler = (k: BellekKlasor) => [...k.dosyalar.keys()].filter((a) => a.endsWith('.zip')).sort();
const gorseller = (k: BellekKlasor) => [...k.dosyalar.keys()].filter((a) => a.startsWith('medya/')).sort();

async function gorselliEvren(h: Hizmet, ad = 'Sisli Kıyı') {
  const { kod: evren } = h.evrenOlustur({ ad });
  const v = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
  await h.gorselEkle({ evren, kod: v, dosyaAdi: 'v.png', tur: 'image/png', veri: new Uint8Array([1, 2, 3]) });
  return { evren, v, gorsel: h.kayit({ evren, kod: v }).gorseller[0] };
}

describe('bu bilgisayardaki günlük yedek', () => {
  it('günün yedeği klasöre alınır, geri okunup doğrulanır; görseller medya klasöründe bir kez durur', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { evren } = await gorselliEvren(m.h);
    await m.h.gunlukYerelYedekler();
    const d = m.h.yerelYedekDurumu({ evren });
    expect(d).toMatchObject({ var: true, acik: true, yer: YER, hata: null, son: { gun: gunYaz(Date.now()), dogrulandi: true } });
    expect(yedekler(klasor)).toEqual([`sisli-kiyi-yedek-${gunYaz(Date.now())}.zip`]);
    expect(gorseller(klasor).length).toBe(2); // görsel ve önizlemesi
    expect(klasor.dosyalar.has(LISTE_DOSYASI)).toBe(true);
    // Aynı gün yeniden: yeni yedek alınmaz. Elle alınan yedek doğrulanınca bugünkünün yerine geçer; görseller yeniden yazılmaz.
    await m.h.gunlukYerelYedekler();
    expect(yedekler(klasor).length).toBe(1);
    const ilk = (await m.h.yerelYedekleri({ evren }))[0];
    let gorselYazimi = 0;
    klasor.engel = (istek, alt) => { if (istek === 'yaz' && alt === 'medya') gorselYazimi++; };
    m.h.kayitOlustur({ evren, ad: 'Arin', tur: 'karakter' });
    await m.h.yerelYedekAl({ evren });
    const liste = await m.h.yerelYedekleri({ evren });
    expect(liste.length).toBe(1);
    expect(liste[0].id).not.toBe(ilk.id);
    expect(liste[0].islemSayisi).toBeGreaterThan(ilk.islemSayisi!);
    expect(gorselYazimi).toBe(0);
  });

  it('başka bir bilgisayarda yedekten geri yüklenir; görseller klasörden gelir', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { evren, v, gorsel } = await gorselliEvren(m.h);
    await m.h.gunlukYerelYedekler();
    // Bilgisayar değişti; eski bilgisayarın yedek klasörü yeni bilgisayara kopyalandı.
    const y = cihaz('Yeni bilgisayar', klasor);
    const id = (await y.h.yerelYedekleri({ evren }))[0].id;
    const r = await y.h.yereldenGeriYukle({ id });
    expect(r).toEqual({ kod: evren, ayri: false, eksikGorseller: [], bozukGorseller: [] });
    expect(y.h.kayit({ evren, kod: v }).ad).toBe('Velkar');
    expect(await y.h.gorsel({ evren, ad: gorsel })).toMatchObject({ durum: 'var' });
  });

  it('“Yedekten geri yükle” ile seçilen günlük yedek dosyası görsellerini klasörden alır; bulunamayan ve bozuk görsel bildirilir', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { evren, gorsel } = await gorselliEvren(m.h);
    const v2 = m.h.kayitOlustur({ evren, ad: 'Arin', tur: 'karakter' }).kod;
    await m.h.gorselEkle({ evren, kod: v2, dosyaAdi: 'a.png', tur: 'image/png', veri: new Uint8Array([4, 5, 6, 7]) });
    const gorsel2 = m.h.kayit({ evren, kod: v2 }).gorseller[0];
    await m.h.gunlukYerelYedekler();
    const zip = klasor.dosyalar.get(yedekler(klasor)[0])!;

    // Klasör bağlı: görseller klasörden gelir.
    const y = cihaz('Yeni bilgisayar', klasor);
    expect(await y.h.yedekIncele({ veri: zip })).toMatchObject({ medyaSayisi: 2, eksikMedya: 0 });
    expect(await y.h.yedektenYukle({ veri: zip })).toMatchObject({ eksikGorseller: [], bozukGorseller: [] });
    expect(await y.h.gorsel({ evren, ad: gorsel })).toMatchObject({ durum: 'var' });

    // Klasörde biri yok, öbürü bozuk: ikisi de sessizce atlanmaz.
    klasor.dosyalar.delete(`medya/${gorsel}`);
    klasor.dosyalar.set(`medya/${gorsel2}`, new Uint8Array([9, 9]));
    const z = cihaz('Üçüncü bilgisayar', klasor);
    expect(await z.h.yedekIncele({ veri: zip })).toMatchObject({ medyaSayisi: 2, eksikMedya: 1 });
    const r = await z.h.yedektenYukle({ veri: zip });
    expect(r).toMatchObject({ kod: evren, eksikGorseller: [gorsel], bozukGorseller: [gorsel2] });
    expect(z.h.kayit({ evren, kod: v2 }).ad).toBe('Arin');

    // Tarayıcıda (klasör yok): görselleri pakette olmayan yedeğin görselleri eksik diye bildirilir (eskiden boş liste dönerdi).
    const t = cihaz('Tarayıcı', null);
    expect(await t.h.yedekIncele({ veri: zip })).toMatchObject({ medyaSayisi: 2, eksikMedya: 2 });
    const rt = await t.h.yedektenYukle({ veri: zip });
    expect(rt.eksikGorseller.sort()).toEqual([gorsel, gorsel2].sort());
  });

  it('Drive\'daki günlük yedek dosyası elle seçilirse görseller Drive\'ın yedek klasöründen gelir', async () => {
    const driveYedek = new BellekTasiyici();
    const m = cihaz('Masaüstü', null, driveYedek);
    const { evren, gorsel } = await gorselliEvren(m.h);
    await m.h.esitle();
    const zip = [...driveYedek.dosyalar.values()].find((d) => d.ozellikler.tur === 'yedek')!.veri;
    const y = cihaz('Yeni bilgisayar', null, driveYedek);
    expect(await y.h.yedektenYukle({ veri: zip })).toMatchObject({ kod: evren, eksikGorseller: [], bozukGorseller: [] });
    expect(await y.h.gorsel({ evren, ad: gorsel })).toMatchObject({ durum: 'var' });
  });

  it('liste dosyası silinir ya da bozulursa yedekler paketlerinden yeniden tanınır; kullanıcının dosyalarına dokunulmaz', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { evren } = await gorselliEvren(m.h);
    await m.h.gunlukYerelYedekler();
    // Kullanıcı klasöre kendi tam yedeğini ve başka bir zip dosyası koymuş.
    const tam = await m.h.yedekAl({ evren });
    klasor.dosyalar.set('benim-yedegim.zip', new Uint8Array(await tam.veri.arrayBuffer()));
    klasor.dosyalar.set('tatil-fotograflari.zip', await zipYaz([{ ad: 'a.txt', veri: new Uint8Array([1]) }]));
    for (const bozuk of [null, new TextEncoder().encode('{bozuk')]) {
      if (bozuk) klasor.dosyalar.set(LISTE_DOSYASI, bozuk); else klasor.dosyalar.delete(LISTE_DOSYASI);
      const y = yenidenAcildi(m, klasor);
      const liste = await y.h.yerelYedekleri({ evren });
      expect(liste.map((x) => x.ad)).toEqual([`sisli-kiyi-yedek-${gunYaz(Date.now())}.zip`]);
      expect(liste[0].islemSayisi).toBeGreaterThan(0);
    }
    // Saklama süresi kullanıcının dosyalarını silmez.
    const y = yenidenAcildi(m, klasor);
    await y.h.yerelYedekAl({ evren });
    expect(klasor.dosyalar.has('benim-yedegim.zip')).toBe(true);
    expect(klasor.dosyalar.has('tatil-fotograflari.zip')).toBe(true);
  });

  it('saklama süresi dolan günlük yedekler silinir; aynı adlı iki evrenin yedeği birbirinin üzerine yazılmaz', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { kod: a } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: b } = m.h.evrenOlustur({ ad: 'Kuzey' });
    await m.h.gunlukYerelYedekler();
    expect(yedekler(klasor).length).toBe(2);
    expect((await m.h.yerelYedekleri({ evren: a })).length).toBe(1);
    expect((await m.h.yerelYedekleri({ evren: b })).length).toBe(1);
    // Programın iki yıl önce aldığı bir yedek (listede kayıtlı).
    klasor.dosyalar.set('kuzey-yedek-2020-01-01.zip', new Uint8Array([1]));
    const liste = JSON.parse(new TextDecoder().decode(klasor.dosyalar.get(LISTE_DOSYASI)!));
    liste.dosyalar['kuzey-yedek-2020-01-01.zip'] = { boy: 1, ozellikler: { uygulama: 'dunya-atlasi', tur: 'yedek', evren: a, gun: '2020-01-01', zaman: '1', kurulum: 'x', islem: '1' } };
    klasor.dosyalar.set(LISTE_DOSYASI, new TextEncoder().encode(JSON.stringify(liste)));
    const y = yenidenAcildi(m, klasor);
    expect((await y.h.yerelYedekleri({ evren: a })).length).toBe(2);
    await y.h.yerelYedekAl({ evren: a });
    expect(klasor.dosyalar.has('kuzey-yedek-2020-01-01.zip')).toBe(false);
    expect((await y.h.yerelYedekleri({ evren: a })).length).toBe(1);
    expect((await y.h.yerelYedekleri({ evren: b })).length).toBe(1);
  });

  it('klasöre yazılamazsa hata evrenin yedek bölümünde görünür, eski yedekler silinmez, öbür evrenler yedeklenir', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { kod: a } = m.h.evrenOlustur({ ad: 'Kuzey' });
    await m.h.gunlukYerelYedekler();
    const once = yedekler(klasor);
    const { kod: b } = m.h.evrenOlustur({ ad: 'Güney' });
    klasor.engel = (istek, _alt, ad) => { if (istek === 'yaz' && ad?.startsWith('kuzey')) throw new Error('Yedek dosyası yazılamadı: diskte yer kalmadı.'); };
    await expect(m.h.yerelYedekAl({ evren: a })).rejects.toThrow('diskte yer kalmadı');
    expect(m.h.yerelYedekDurumu({ evren: a }).hata).toBe('Yedek dosyası yazılamadı: diskte yer kalmadı.');
    expect(yedekler(klasor)).toEqual(expect.arrayContaining(once));
    await m.h.gunlukYerelYedekler();
    expect(m.h.yerelYedekDurumu({ evren: b }).son).toMatchObject({ dogrulandi: true });
  });

  it('geri okunan yedek bozuksa başarılı sayılmaz; bugünün sağlam yedeği yerinde kalır', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    await m.h.gunlukYerelYedekler();
    const saglam = yedekler(klasor);
    const asilOku = klasor.oku.bind(klasor);
    klasor.oku = async (alt, ad) => { const v = await asilOku(alt, ad); if (ad.endsWith('.zip')) v[v.length - 30] ^= 0xff; return v; };
    m.h.kayitOlustur({ evren, ad: 'Arin', tur: 'karakter' });
    await expect(m.h.yerelYedekAl({ evren })).rejects.toThrow(/doğrulanamadı.*hiçbiri silinmedi/);
    expect(yedekler(klasor)).toEqual(saglam);
  });

  it('bir evren için kapatılabilir; kapalıyken günlük yedek alınmaz', async () => {
    const klasor = new BellekKlasor();
    const m = cihaz('Masaüstü', klasor);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    expect(m.h.yerelYedekAyari({ evren, acik: false }).acik).toBe(false);
    await m.h.gunlukYerelYedekler();
    expect(yedekler(klasor)).toEqual([]);
    expect(m.h.yerelYedekAyari({ evren, acik: true }).acik).toBe(true);
    await m.h.gunlukYerelYedekler();
    expect(yedekler(klasor).length).toBe(1);
  });

  it('tarayıcıda klasör yoktur; istekler anlaşılır hata verir', async () => {
    const t = cihaz('Tarayıcı', null);
    const { kod: evren } = t.h.evrenOlustur({ ad: 'Kuzey' });
    expect(t.h.yerelYedekDurumu({ evren })).toMatchObject({ var: false, yer: null, son: null });
    await expect(t.h.yerelYedekAl({ evren })).rejects.toThrow('yalnız Windows uygulamasında');
    await t.h.gunlukYerelYedekler(); // hiçbir şey yapmaz
  });
});

describe('veri bölümü ile kabuk arasındaki köprü', () => {
  const g = globalThis as unknown as { window?: unknown };
  afterEach(() => { delete g.window; });
  const kabukla = (yanit: (komut: string, arg?: unknown) => unknown) => {
    const cagrilar: { komut: string; arg?: unknown; secenek?: { headers?: Record<string, string> } }[] = [];
    g.window = { __TAURI_INTERNALS__: { invoke: async (komut: string, arg?: unknown, secenek?: { headers?: Record<string, string> }) => { cagrilar.push({ komut, arg, secenek }); return yanit(komut, arg); } } };
    return cagrilar;
  };

  it('dosya baytları gövdede, Türkçe harfli ad başlıkta gider; okunan baytlar her iki biçimde de çözülür', async () => {
    const c = kabukla((k) => (k === 'yerel_yedek_oku' ? new Uint8Array([5, 6]).buffer : null));
    await klasorIstegi('yerel_yedek_yaz', { alt: '', ad: 'Sisli Kıyı.zip' }, new Uint8Array([1, 2]));
    expect(c[0].arg).toEqual(new Uint8Array([1, 2]));
    expect(c[0].secenek!.headers).toEqual({ alt: '', ad: 'Sisli%20K%C4%B1y%C4%B1.zip' });
    expect(await klasorIstegi('yerel_yedek_oku', { alt: 'medya', ad: 'ab' })).toEqual(new Uint8Array([5, 6]));
    kabukla(() => [7, 8]);
    expect(await klasorIstegi('yerel_yedek_oku', { alt: '', ad: 'x.zip' })).toEqual(new Uint8Array([7, 8]));
  });

  it('yalnız dört klasör isteği iletilir; kabuk yoksa ya da hata verirse anlaşılır ileti', async () => {
    kabukla(() => null);
    await expect(klasorIstegi('google_izin', {})).rejects.toThrow('Bilinmeyen istek');
    await expect(klasorIstegi('yerel_yedek_klasoru_ac', {})).rejects.toThrow('Bilinmeyen istek');
    kabukla(() => { throw 'Yedek dosyası yazılamadı: diskte yer kalmadı.'; });
    await expect(klasorIstegi('yerel_yedek_sil', { alt: '', ad: 'a.zip' })).rejects.toThrow('diskte yer kalmadı');
    delete g.window;
    await expect(klasorIstegi('yerel_yedek_listele', { alt: '' })).rejects.toThrow('yalnız Windows uygulaması');
    expect(await yedekKlasoruYeri()).toBeNull();
    kabukla(() => { throw 'Command yerel_yedek_yeri not allowed by ACL'; });
    expect(await yedekKlasoruYeri()).toBeNull(); // eski kabuk: klasör yok sayılır
  });

  it('istemci çalışanın klasör isteğini kabuğa iletir ve yanıtı geri gönderir', async () => {
    const giden: { m: unknown; aktar?: Transferable[] }[] = [];
    const c: CalisanBenzeri = { onmessage: null, onerror: null, onmessageerror: null, postMessage(m, aktar) { giden.push({ m, aktar }); } };
    const istenen: unknown[] = [];
    new Istemci(c, async (komut, arg) => { istenen.push([komut, arg]); if (komut === 'yerel_yedek_sil') throw new Error('Eski yedek silinemedi.'); return new Uint8Array([3]); });
    c.onmessage!({ data: { kabuk: { no: 4, komut: 'yerel_yedek_oku', arg: { alt: '', ad: 'a.zip' } } } } as MessageEvent);
    c.onmessage!({ data: { kabuk: { no: 5, komut: 'yerel_yedek_sil', arg: { alt: '', ad: 'a.zip' } } } } as MessageEvent);
    await new Promise((r) => setTimeout(r, 0));
    expect(istenen).toEqual([['yerel_yedek_oku', { alt: '', ad: 'a.zip' }], ['yerel_yedek_sil', { alt: '', ad: 'a.zip' }]]);
    expect(giden[0].m).toEqual({ kabukYanit: { no: 4, sonuc: new Uint8Array([3]) } });
    expect(giden[0].aktar!.length).toBe(1);
    expect(giden[1].m).toEqual({ kabukYanit: { no: 5, hata: 'Eski yedek silinemedi.' } });
  });
});

describe('Windows uygulamasında Google bağlantısı hatırlanır', () => {
  const g = globalThis as unknown as { window?: unknown };
  afterEach(() => { delete g.window; });
  it('saklı bağlantıyla tarayıcı açmadan izin alınır; olmazsa sessizce boş döner', async () => {
    expect(await sessizIzin()).toBeNull(); // tarayıcıda
    const cagrilar: unknown[] = [];
    g.window = { __TAURI_INTERNALS__: { invoke: async (k: string, a: unknown) => { cagrilar.push([k, a]); return { jeton: 'j', sureSn: 3600, kapsam: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file' }; } } };
    const i = await sessizIzin();
    expect(i?.jeton).toBe('j');
    expect(cagrilar).toEqual([['google_izin', { eposta: null, sessiz: true }]]);
    g.window = { __TAURI_INTERNALS__: { invoke: async () => null } }; // saklı bağlantı yok
    expect(await sessizIzin()).toBeNull();
    g.window = { __TAURI_INTERNALS__: { invoke: async () => { throw 'Google\'a ulaşılamadı.'; } } };
    expect(await sessizIzin()).toBeNull();
  });
});
