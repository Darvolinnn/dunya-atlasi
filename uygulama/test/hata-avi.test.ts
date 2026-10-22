// Hata avı (22 Ekim 2026): her sınama bir bulguyu kanıtlar; düzeltmeden önce kırılıyordu.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';
import type { Spans } from '../src/veri/api';
import { kayittanSonraTemel } from '../src/arayuz/taslak';
import { DriveTasiyici } from '../src/calisan/drive';
import { iceAktarimPlani } from '../src/calisan/ice-aktarim';
import { BellekKlasor, KlasorTasiyici } from '../src/calisan/klasor-tasiyici';
import { zipYaz } from '../src/alan/zip';
import { sinirlar } from '../src/calisan/esitleme';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });

function cihaz(ad: string, drive: BellekTasiyici | null = null) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const medya = new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici, undefined, undefined, (d) => { dosyalar.get(d)?.close(); dosyalar.delete(d); },
    () => [...dosyalar.keys()]);
  if (drive) h.tasiyiciAyarla(drive);
  return { h, medya, dosyalar, ac };
}
const s = metinSemasi.schema;
const spansi = (...p: string[]) => pmNodeToSpans(metinSemasi, s.node('doc', null, p.map((x) => s.node('paragraph', null, x ? [s.text(x)] : [])))) as Spans;
const metni = (h: Hizmet, evren: string, kayit: string) => {
  const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
  return d.textBetween(0, d.content.size, '\n');
};

describe('hata avı: veri kaybı ve eşitleme', () => {
  it('yedekten ayrı evren olarak açılan evren başka cihaza indirilebilir', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('Kuzeyde doğdu'), temel: m.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar });
    const { veri } = await m.h.yedekAl({ evren });
    // Aynı cihaza geri yükleme: evren zaten var, yedek ayrı bir evren olarak açılır.
    const r = await m.h.yedektenYukle({ veri });
    expect(r.ayri).toBe(true);
    await m.h.esitle();
    expect(m.h.esitlemeDurumu().hata).toBeNull();

    const t = cihaz('Tablet', drive);
    const uzak = await t.h.uzakEvrenler();
    expect(uzak.map((x) => x.kod).sort()).toEqual([evren, r.kod].sort());
    await t.h.evreniIndir({ kod: r.kod });
    expect(t.h.evrenler().map((x) => x.kod)).toEqual([r.kod]);
    expect(metni(t.h, r.kod, v)).toBe('Kuzeyde doğdu');
  });

  it('ayrı açılan evren program yeniden açılınca listeden düşmüşse geri bulunur', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    const { veri } = await m.h.yedekAl({ evren });
    const r = await m.h.yedektenYukle({ veri });
    // Evren listesi bozuldu ya da program kayıttan hemen sonra kapandı: liste satırı yok, dosya duruyor.
    m.ac('/kurulum.db').exec({ sql: 'DELETE FROM evrenler WHERE kod=?', bind: [r.kod] });
    const yeniden = new Hizmet(m.ac, 'Masaüstü', 'x', () => {}, m.medya, sahteIsleyici, undefined, undefined, undefined, () => [...m.dosyalar.keys()]);
    expect(yeniden.evrenler().map((x) => x.kod).sort()).toEqual([evren, r.kod].sort());
  });

  it('yedekten açılan kopyayı bu cihazdan kaldırmak asıl evrenin deneme kopyasını silmez', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    const { veri } = await m.h.yedekAl({ evren });
    const r = await m.h.yedektenYukle({ veri });
    // Yedekten sonra deneme kopyasında yazılan, yalnız bu cihazda.
    const k = m.h.kayitOlustur({ evren: dal, ad: 'Taht', tur: 'diger' }).kod;
    m.h.evrenKaldir({ evren: r.kod });
    expect(m.h.kayit({ evren: dal, kod: k }).ad).toBe('Taht');
    expect(m.dosyalar.has(`/evren-${dal}.db`)).toBe(true);
  });

  it('kayıt sürerken başka cihazın yazısıyla birleşirse ve yazar yazmaya devam ederse öbür cihazın yazısı silinmez', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır'), temel: m.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar });
    t.h.evreniDisaridanKur({ kod: evren, islemler: m.h.islemleriVer({ evren, gorulen: {} }) });
    // Masaüstünün editörü bu sürümle açık.
    let temel = m.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar;
    // Tablet bir paragraf ekler; eşitlemeyle masaüstüne gelir (editör o sırada yazılmamış yazı tuttuğu için güncellenmez).
    t.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır', 'Tabletten'), temel: t.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar });
    m.h.islemleriAl({ evren, islemler: t.h.islemleriVer({ evren, gorulen: m.h.gorulenler({ evren }) }) });
    // Masaüstünde yazılan kaydedilir; kayıt yanıtı gelmeden yazar bir kelime daha ekler (editör hâlâ birleşmemiş metni gösterir).
    const r = m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır', 'Masaüstünden'), temel });
    expect(r.birlesti).toBe(true);
    temel = kayittanSonraTemel(r, true);
    m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır', 'Masaüstünden devam'), temel });
    const son = metni(m.h, evren, v);
    expect(son).toContain('Tabletten');
    expect(son).toContain('Masaüstünden devam');
    expect(son.match(/Masaüstünden/g)).toHaveLength(1);
  });
});

// Başka bir ajanın raporundaki bulgular (DA-01 … DA-05); her biri burada sınandı.
describe('hata avı: dış rapordaki bulgular', () => {
  it('DA-01: Drive parçayı almadan aralıksız "308" verirse yükleme ulaşmayan yerden sürer, parça atlanmaz', async () => {
    const K = 256 * 1024;
    const v = new Uint8Array(3 * K).map((_x, i) => (i * 31 + 7) % 251);
    let alinan = new Uint8Array(0);
    let biten: Uint8Array | null = null;
    let kayip = true;
    const istekler: string[] = [];
    const durum = () => {
      if (alinan.length === v.length) { biten = alinan; return new Response(JSON.stringify({ id: 'D1', name: 'harita', appProperties: {} }), { status: 200 }); }
      return new Response(null, { status: 308, headers: alinan.length ? { Range: `bytes=0-${alinan.length - 1}` } : {} });
    };
    const getir = (async (url: string, ayar: RequestInit = {}) => {
      if (url.includes('uploadType=resumable')) return new Response(null, { status: 200, headers: { Location: 'https://yukleme/1' } });
      const aralik = (ayar.headers as Record<string, string>)['Content-Range'];
      istekler.push(aralik);
      if (istekler.length > 40) throw new TypeError('bağlantı koptu');
      if (aralik.startsWith('bytes */')) return durum();
      const bas = Number(/bytes (\d+)-/.exec(aralik)![1]);
      // Drive yanlış yerden gelen parçayı almaz; ilk parça da yolda kaybolur (Drive hiçbir bayt almadı: Range yok).
      if (bas !== alinan.length || kayip) { kayip = false; return durum(); }
      const govde = ayar.body as Uint8Array;
      const yeni = new Uint8Array(alinan.length + govde.length); yeni.set(alinan); yeni.set(govde, alinan.length);
      alinan = yeni;
      return durum();
    }) as unknown as typeof fetch;
    const t = new DriveTasiyici('jeton', Date.now() + 3600_000, 'appDataFolder', { fetch: getir, parca: K, buyuk: K, bekleme: 0 });
    const f = await t.yukle('harita', {}, v);
    expect(f.id).toBe('D1');
    expect(biten).toEqual(v);
    expect(istekler.length).toBeLessThanOrEqual(5);
  });

  it('DA-02: farklı klasörlerdeki aynı adlı görseller, notun kendi klasöründekine bağlanır', () => {
    const { plan, rapor } = iceAktarimPlani([
      { yol: 'Atlas/Kuzey/Liman.md', metin: 'Liman\n\n![](harita.png)' },
      { yol: 'Atlas/Kuzey/harita.png', veri: new Uint8Array([1, 1, 1]) },
      { yol: 'Atlas/Guney/Kale.md', metin: 'Kale\n\n![[harita.png]]' },
      { yol: 'Atlas/Guney/harita.png', veri: new Uint8Array([2, 2, 2]) },
      { yol: 'Atlas/Bati/Kule.md', metin: '![](../Kuzey/harita.png)' },
    ]);
    const gorseli = (ad: string) => plan.find((p) => p.ad === ad)!.gorseller;
    expect(gorseli('Liman')).toEqual(['Atlas/Kuzey/harita.png']);
    expect(gorseli('Kale')).toEqual(['Atlas/Guney/harita.png']);
    expect(gorseli('Kule')).toEqual(['Atlas/Kuzey/harita.png']);
    expect(rapor.eksikGorseller).toEqual([]);
  });

  it('içe aktarılan notta "%" geçen görsel adı içe aktarmayı durdurmaz', () => {
    const { plan, rapor } = iceAktarimPlani([
      { yol: 'Atlas/Liman.md', metin: 'Satır\n\n![](yüzde%.png) ve ![](%E0%A4%A.png)' },
      { yol: 'Atlas/yüzde%.png', veri: new Uint8Array([1]) },
    ]);
    expect(plan[0].gorseller).toEqual(['Atlas/yüzde%.png']);
    expect(rapor.eksikGorseller).toEqual(['%E0%A4%A.png']);
  });

  it('DA-03: yedek klasöründe programın yedeğinin yerine aynı ad ve boyda başka bir dosya konmuşsa silinmez', async () => {
    const k = new BellekKlasor();
    const EVREN = '01m5jnnchsekww6nwjz93fg7qs';
    const paket = await zipYaz([{ ad: 'paket.json', veri: new TextEncoder().encode(JSON.stringify({
      bicim: 'dunya-atlasi-paket', donemsel: 'yerel', evren: { kod: EVREN, ad: 'Kuzey' }, olusturma: 1_790_000_000_000, islemSayisi: 3, kurulum: { kod: 'k1' },
    })), sikistirma: false }]);
    const ilk = new KlasorTasiyici(k);
    const d = await ilk.yukle('Kuzey-yedek-2026-09-21.zip', { uygulama: 'dunya-atlasi', tur: 'yedek', evren: EVREN, gun: '2026-09-21', zaman: '1790000000000', kurulum: 'k1', islem: '3' }, paket);
    // Yazar aynı adla, tam aynı boyda kendi dosyasını koyar.
    const baska = await zipYaz([{ ad: 'notlar.txt', veri: new Uint8Array(paket.length - 118).fill(65), sikistirma: false }]);
    expect(baska.length).toBe(paket.length);
    k.dosyalar.set(d.id, baska);
    const sonra = new KlasorTasiyici(k); // program yeniden açıldı
    await sonra.sil(d.id);
    expect(k.dosyalar.get(d.id)).toEqual(baska);
    expect(await sonra.listele({ tur: 'yedek', evren: EVREN })).toEqual([]);
  });

  it('DA-05: yeni cihaz, saati geri kalan cihazın görüntüsü daha eski görünse de bütün değişiklikleri alır', async () => {
    const eskiSinir = sinirlar.parca;
    sinirlar.parca = 5;
    let saat = 0;
    const zaman = vi.spyOn(Date, 'now').mockImplementation(() => saat);
    try {
      const drive = new BellekTasiyici();
      const a = cihaz('Masaüstü', drive), b = cihaz('Tablet', drive);
      saat = 1_000_000; // masaüstünün saati geride
      const { kod: evren } = a.h.evrenOlustur({ ad: 'Kuzey' });
      for (let i = 0; i < 6; i++) a.h.kayitOlustur({ evren, ad: `Kuzey ${i}`, tur: 'mekan' });
      await a.h.esitle();
      saat = 9_000_000; // tabletin saati ileride
      await b.h.evreniIndir({ kod: evren });
      for (let i = 0; i < 6; i++) b.h.kayitOlustur({ evren, ad: `Güney ${i}`, tur: 'mekan' });
      await b.h.esitle();
      saat = 2_000_000;
      for (let i = 6; i < 12; i++) a.h.kayitOlustur({ evren, ad: `Kuzey ${i}`, tur: 'mekan' });
      await a.h.esitle();
      saat = 9_500_000; await b.h.esitle();
      saat = 2_500_000; await a.h.esitle();
      saat = 9_600_000; await b.h.esitle();
      const c = cihaz('Telefon', drive);
      await c.h.evreniIndir({ kod: evren });
      expect(a.h.kayitlar({ evren }).length).toBe(18);
      expect(c.h.kayitlar({ evren }).length).toBe(18);
      expect(c.h.kayitlar({ evren }).map((x) => x.ad).sort()).toEqual(a.h.kayitlar({ evren }).map((x) => x.ad).sort());
    } finally { zaman.mockRestore(); sinirlar.parca = eskiSinir; }
  });
});
