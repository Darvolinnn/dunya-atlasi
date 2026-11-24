import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { zipOku } from '../src/alan/zip';
import { pngTemizle } from '../src/calisan/okur-yayini';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
const isleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 10, onizleme: new Uint8Array([7]) });

/** Uydurma PNG: imza, gizli adı taşıyan bir metin bölümü ve son bölüm. */
function png(metin: string): Uint8Array {
  const bolum = (tur: string, veri: Uint8Array) => {
    const b = new Uint8Array(12 + veri.length);
    new DataView(b.buffer).setUint32(0, veri.length);
    b.set(new TextEncoder().encode(tur), 4); b.set(veri, 8);
    return b;
  };
  const p = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bolum('tEXt', new TextEncoder().encode(`Comment\0${metin}`)), bolum('IEND', new Uint8Array())];
  const s = new Uint8Array(p.reduce((t, x) => t + x.length, 0));
  let o = 0; for (const x of p) { s.set(x, o); o += x.length; }
  return s;
}

async function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { if (!dosyalar.has(ad)) dosyalar.set(ad, new sqlite.oo1.DB(':memory:')); return dosyalar.get(ad)!; };
  const h = new Hizmet(ac, 'Uydurma', 'x', () => {}, new BellekDeposu(), isleyici);
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const kayit = (ad: string, tur: string, ozet = '') => { const k = h.kayitOlustur({ evren, ad, tur }).kod; if (ozet) h.kayitDegistir({ evren, kod: k, alan: 'ozet', deger: ozet }); return k; };
  const eser = kayit('Uydurma eser', 'eser');
  const bolumler = [1, 2, 3].map((n) => h.anlatiOlustur({ evren, ust: eser, ad: `Bölüm ${n}`, tur: 'bolum' }).kod);
  const sahneler = bolumler.map((b, i) => h.anlatiOlustur({ evren, ust: b, ad: `Sahne ${i + 1}`, tur: 'sahne' }).kod);
  const sahnede = (k: string, i: number) => h.iliskiEkle({ evren, tur: 'sahnede', a: k, b: sahneler[i], rol: 'bulunuyor' });
  const lale = kayit('Uydurma Lale', 'karakter', 'Arşivde çalışır; Selvinaz ile gizlice konuşur.'); sahnede(lale, 0);
  const selvinaz = kayit('Selvinaz', 'karakter', 'Divanın casusu.'); sahnede(selvinaz, 0);
  h.gorunurlukYaz({ evren, kod: selvinaz, nesne: 'kayit', deger: { katman: null, gizli: true, bilenler: [lale] } });
  const orhun = kayit('Orhun', 'karakter', 'Kuzeyden gelir.'); sahnede(orhun, 2);
  const kapi = kayit('Orhun Kapısı', 'mekan', 'Şehrin kuzey kapısı.'); sahnede(kapi, 0);
  const tilki = kayit('Kara Tilki', 'kimlik', 'Çatılarda görülen kayıt hırsızı.'); sahnede(tilki, 0);
  const ayaz = kayit('Kâtip Ayaz', 'karakter', 'Arşivin genç kâtibi.'); sahnede(ayaz, 1);
  h.iliskiEkle({ evren, tur: 'kimligi', a: ayaz, b: tilki });
  h.iliskiEkle({ evren, tur: 'arkadas', a: lale, b: ayaz });
  const { kod: iddia } = h.iddiaEkle({ evren, konu: tilki, soru: 'Kara Tilki kim?', secenekler: ['Kâtip', 'Bilinmiyor'], gercek: 0 });
  const sec = h.kayitIddialari({ evren, kod: tilki })[0].secenekler[0].kod;
  h.bilgiEkle({ evren, bilgi: { iddia, bilen: eser, inanc: 'inaniyor', secenek: sec, sahne: sahneler[2] } });
  const { ad: gorsel } = await h.gorselEkle({ evren, kod: lale, dosyaAdi: 'uydurma-lale.png', tur: 'image/png', veri: png('Selvinaz') });
  return { h, evren, eser, bolumler, lale, selvinaz, orhun, kapi, tilki, ayaz, gorsel };
}

describe('okur yayını (§11.2, K38)', () => {
  it('teslim sınırında kayıtların okur için durumu; kimlik eşitliği açıklanana dek ayrı', async () => {
    const { h, evren, eser, bolumler, lale, selvinaz, orhun, tilki, ayaz } = await kur();
    h.okurYayiniYaz({ evren, eser, ayar: { sinir: bolumler[1], kip: 'teslim', secimler: {}, gorseller: [], onaylar: [] } });
    const y = h.okurYayini({ evren, eser });
    const durum = (k: string) => y.kayitlar.find((x) => x.kod === k)?.durum;
    expect(durum(lale)).toBe('acik');
    expect(durum(selvinaz)).toBe('gizli');
    expect(durum(orhun)).toBe('sonra');
    expect(y.kayitlar.find((x) => x.kod === lale)!.bolumler.filter((b) => b.secili).map((b) => b.anahtar)).toEqual(['ozet', 'iliskiler']);
    expect(y.kimlikler).toEqual([expect.objectContaining({ kisi: expect.objectContaining({ kod: ayaz }), kimlik: expect.objectContaining({ kod: tilki }), acik: false, aciklanma: { sira: 3, bolum: '3. bölüm' } })]);
    // Sınır üçüncü bölüme çekilince eşitlik açıklanmış olur.
    h.okurYayiniYaz({ evren, eser, ayar: { ...y.ayar, sinir: bolumler[2] } });
    expect(h.okurYayini({ evren, eser }).kimlikler[0].acik).toBe(true);
    expect(h.okurYayini({ evren, eser }).kayitlar.find((x) => x.kod === orhun)!.durum).toBe('acik');
  });

  it('sızıntı taraması gizli adı durdurur, eşadlıyı sorar; temizlenince paket iner ve iç kod taşımaz', async () => {
    const { h, evren, eser, bolumler, lale, tilki, gorsel } = await kur();
    const ayar = { sinir: bolumler[1], kip: 'teslim' as const, secimler: {}, gorseller: [gorsel], onaylar: [] };
    h.okurYayiniYaz({ evren, eser, ayar });
    let t = await h.okurYayiniTara({ evren, eser });
    // Lale'nin özetinde okurdan gizli Selvinaz geçiyor.
    const s = t.durduran.find((b) => b.dizge === 'Selvinaz')!;
    expect(s.yerler.some((y) => y.bolum?.kayit === lale && y.bolum.anahtar === 'ozet')).toBe(true);
    expect(s.yerler[0].eslesen).toBe('Selvinaz');
    // Görselin metin bölümündeki ad atılır; görsel durdurmaz.
    expect(t.durduran.some((b) => b.yerler.some((y) => y.dosya.startsWith('g/')))).toBe(false);
    // Sınırdan sonra açılan Orhun, açık "Orhun Kapısı"nın adı içinde: yazara sorulur.
    const b = t.bekleyen.find((x) => x.dizge === 'Orhun')!;
    expect(b.esadli).toBe('Orhun Kapısı');
    await expect(h.okurYayiniIndir({ evren, eser })).rejects.toThrow(/eşleşme/);
    h.okurYayiniYaz({ evren, eser, ayar: { ...ayar, secimler: { [lale]: ['iliskiler'] }, onaylar: [b.anahtar] } });
    t = await h.okurYayiniTara({ evren, eser });
    expect(t.durduran).toEqual([]);
    expect(t.bekleyen).toEqual([]);
    expect(t.onaylanan).toBe(1);
    const r = await h.okurYayiniIndir({ evren, eser });
    expect(r.dosyaAdi).toBe('uydurma-eser-rehber-2-bolum-baski-1.zip');
    const z = await zipOku(r.veri);
    const adlar = [...z.keys()];
    expect(adlar).toContain('index.html');
    expect(adlar.filter((a) => a.startsWith('k/'))).toHaveLength(4); // Lale, Orhun Kapısı, Kara Tilki, Kâtip Ayaz
    expect(adlar.some((a) => /^g\/\d{14}\.png$/.test(a))).toBe(true);
    const metin = [...z.values()].map((v) => new TextDecoder().decode(v)).join('\n');
    for (const k of [lale, tilki, eser, gorsel]) expect(metin).not.toContain(k);
    expect(metin).not.toContain('Selvinaz');
    expect(metin).not.toContain('Kullandığı kimlik');
    // Kodlar baskılar arasında aynı kalır.
    const r2 = await h.okurYayiniIndir({ evren, eser });
    expect([...(await zipOku(r2.veri)).keys()].sort()).toEqual(adlar.sort());
    expect(h.okurYayini({ evren, eser }).baskilar.map((x) => x.no)).toEqual([1, 2]);
  });

  it('açıklanmamış kimliğin sayfasında kişinin adı geçerse yayın durur', async () => {
    const { h, evren, eser, bolumler, tilki, lale } = await kur();
    h.kayitDegistir({ evren, kod: tilki, alan: 'ozet', deger: 'Geceleri Kâtip Ayaz olarak dolaşır.' });
    h.okurYayiniYaz({ evren, eser, ayar: { sinir: bolumler[1], kip: 'teslim', secimler: { [lale]: ['iliskiler'] }, gorseller: [], onaylar: [] } });
    const t = await h.okurYayiniTara({ evren, eser });
    expect(t.durduran.map((b) => b.dizge)).toContain('Kâtip Ayaz');
    const o = await h.okurYayiniSayfasi({ evren, eser, dosya: 'index.html' });
    expect(o.html).toContain('Kara Tilki');
    expect(o.html).toContain('data-dosya="k/');
  });

  it('okuma tercihi kipinde bütün eser pakettedir, ileri bilgi işaretlidir', async () => {
    const { h, evren, eser, orhun, tilki } = await kur();
    h.okurYayiniYaz({ evren, eser, ayar: { sinir: null, kip: 'tercih', secimler: {}, gorseller: [], onaylar: [] } });
    const y = h.okurYayini({ evren, eser });
    expect(y.kayitlar.find((x) => x.kod === orhun)!.durum).toBe('acik');
    const t = await h.okurYayiniTara({ evren, eser });
    const sayfa = t.sayfalar.find((s) => s.ad.startsWith('Kara Tilki'))!;
    const html = (await h.okurYayiniSayfasi({ evren, eser, dosya: sayfa.dosya })).html;
    expect(html).toContain('data-sira="3"');
    expect(html).toContain('Kara Tilki kim? Kâtip');
    expect(y.kimlikler[0].kimlik.kod).toBe(tilki);
  });

  it('PNG temizliği yalnız metin bölümlerini atar', () => {
    const v = png('Gizli ad');
    const t = pngTemizle(v);
    expect(new TextDecoder().decode(t)).not.toContain('Gizli');
    expect(t.length).toBe(8 + 12);
  });
});
