// Beşinci kapsamlı hata avı (24 Kasım 2026, DEVIR §0.28). Her sınama düzeltmeden önce kırılıyordu. Adlar uydurmadır.
import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { UYGULAYICILAR } from '../src/calisan/izdusum';
import { yeniKod } from '../src/alan/kod';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import type { Spans } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  return { h, evren, db: h.hesapVeritabanlari(evren)!.evren };
}
/** Uygulayıcıları kaldırılmış (eski) programla bir iş yapar. */
function eskiProgramla<T>(turler: string[], is: () => T): T {
  const sakli = Object.fromEntries(turler.map((t) => [t, UYGULAYICILAR[t]]));
  for (const t of turler) delete UYGULAYICILAR[t];
  try { return is(); } finally { Object.assign(UYGULAYICILAR, sakli); }
}
const panoOgeleri = (db: Database) => db.selectValue("SELECT ogeler FROM derlemeler WHERE tur='tuval'") as string | undefined;

describe('eski programın anlamadan bıraktığı işlemler', () => {
  it('program güncellenince uygulanır (anlaşılmayan türler kaydedilir)', () => {
    const a = kur();
    const { kod } = a.h.derlemeOlustur({ evren: a.evren, tur: 'tuval', ad: 'Uydurma pano' });
    a.h.tuvalOgeYaz({ evren: a.evren, kod, ogeler: [{ id: yeniKod(), tur: 'not', x: 1, y: 2, g: 100, h: 80, aci: 0, sira: 1, renk: 'sari', metin: 'Bir not' }] });
    const islemler = new EvrenVt(a.db, 'kaynak').islemler();
    const db = new sqlite.oo1.DB(':memory:');
    eskiProgramla(['tuval_oge'], () => new EvrenVt(db, 'tablet').disaridanAl(islemler));
    expect(panoOgeleri(db)).toBe('[]');
    new EvrenVt(db, 'tablet');
    expect(JSON.parse(panoOgeleri(db)!)).toHaveLength(1);
    expect(db.selectValue("SELECT v FROM meta WHERE k='anlasilmayan'")).toBeUndefined();
  });
  it('K37–K39 işlemleri için kayıt olmasa da bir kez günlükten bakılır', () => {
    const a = kur();
    a.h.bagGorunumuYaz({ evren: a.evren, gorunum: { renk: 'mavi', zemin: true, kalin: false, alti: true } });
    const islemler = new EvrenVt(a.db, 'kaynak').islemler();
    const db = new sqlite.oo1.DB(':memory:');
    eskiProgramla(['bag_gorunumu'], () => new EvrenVt(db, 'tablet').disaridanAl(islemler));
    // Eski program anlaşılmayanı kaydetmiyordu ve tür denetimi yoktu.
    db.exec("DELETE FROM meta WHERE k IN ('anlasilmayan','tur_denetimi')");
    expect(db.selectValue("SELECT v FROM evren WHERE k='bag_gorunumu'")).toBeUndefined();
    new EvrenVt(db, 'tablet');
    expect(db.selectValue("SELECT v FROM evren WHERE k='bag_gorunumu'")).toBeDefined();
    expect(db.selectValue("SELECT v FROM meta WHERE k='tur_denetimi'")).toBe('1');
  });
});

describe('ad düzeltmede ek uyumu (eski PR #49, bulgu 2)', async () => {
  const { adDegistir } = await import('../src/alan/turkce-ek');
  it.each([
    ["Ela'sız", 'Ela', 'Velkar', "Velkar'sız"],
    ["Ela'yken", 'Ela', 'Velkar', "Velkar'ken"],
    ["Velkar'ken", 'Velkar', 'Ela', "Ela'yken"],
    ["Ela'ymış", 'Ela', 'Velkar', "Velkar'mış"],
    ["Ela'ydı", 'Ela', 'Kurt', "Kurt'tu"],
    ["Kurt'tu", 'Kurt', 'Ela', "Ela'ydı"],
    ["Kurt'luk", 'Kurt', 'Ela', "Ela'lık"],
    ["Ela'ysa", 'Ela', 'Velkar', "Velkar'sa"],
    ["Velkar'dır", 'Velkar', 'Ela', "Ela'dır"],
    // Önceden doğru olanlar bozulmasın.
    ["Velkar'dan", 'Velkar', 'Elin', "Elin'den"],
    ["Ela'yla", 'Ela', 'Velkar', "Velkar'la"],
    ["Velkar'la", 'Velkar', 'Ela', "Ela'yla"],
    ["Ela'sı", 'Ela', 'Velkar', "Velkar'ı"],
    ["Ela'nın", 'Ela', 'Kurt', "Kurt'un"],
    ["Velkar'daki", 'Velkar', 'Ela', "Ela'daki"],
    ["Kurt'lar", 'Kurt', 'Ela', "Ela'lar"],
  ])('%s: %s → %s', (gorunen, eski, yeni, beklenen) => {
    expect(adDegistir(gorunen, eski, yeni)).toBe(beklenen);
  });
});

describe('Markdown çıktısında kalın ve eğik (eski PR #49, bulgu 3)', async () => {
  const { markdownYaz } = await import('../src/alan/cikti');
  const { satirIci } = await import('../src/alan/markdown');
  const { metinSemasi } = await import('../src/alan/metin-sema');
  const sm = metinSemasi.schema;
  type P = [string, ('k' | 'e' | 'b')[]];
  const satir = (l: P[]) => sm.node('doc', null, [sm.node('paragraph', null, l.map(([t, m]) => sm.text(t, m.map((x) =>
    x === 'k' ? sm.marks.strong.create() : x === 'e' ? sm.marks.em.create() : sm.marks.bag.create({ hedef: 'ela' })))))]);
  /** Dışa aktarıp geri okur; harf harf biçimi karşılaştırır. */
  const harfler = (l: { metin: string; kalin?: boolean; italik?: boolean }[]) => l.flatMap((p) => [...p.metin].map((h) => `${h}${p.kalin ? 'K' : ''}${p.italik ? 'E' : ''}`)).join('|');
  it.each<[string, P[], string]>([
    ['kalının sonunda boşluk', [['kalın ', ['k']], ['metin', []]], '**kalın** metin'],
    ['kalının başında boşluk', [['bir', []], [' kalın', ['k']]], 'bir **kalın**'],
    ['kalın içinde eğik', [['çok ', ['k']], ['uzun', ['k', 'e']]], '**çok *uzun***'],
    ['kalın içinde bağlantı', [['a ', ['k']], ['Ela', ['k', 'b']], [' b', ['k']]], '**a [[Ela]] b**'],
    ['hepsi kalın eğik', [['hepsi', ['k', 'e']]], '***hepsi***'],
    ['eğik içinde kalın', [['çok ', ['e']], ['uzun', ['e', 'k']]], '*çok **uzun***'],
    ['kalından hemen sonra eğik', [['a', ['k']], ['b', ['e']]], '**a**_b_'],
    ['eğikten hemen sonra kalın', [['a', ['e']], ['b', ['k']]], '*a***b**'],
  ])('%s', (_ad, l, beklenen) => {
    const md = markdownYaz(satir(l), () => 'Ela');
    expect(md).toBe(beklenen);
    const geri = satirIci(md, {}, []);
    const asil = l.map(([t, m]) => ({ metin: t, kalin: m.includes('k'), italik: m.includes('e') }));
    // Boşluklar biçimin dışına alınmış olabilir; harfler aynı biçimle dönmeli.
    expect(harfler(geri).replace(/ [KE]+/g, ' ')).toBe(harfler(asil).replace(/ [KE]+/g, ' '));
  });
});

describe('Markdown içe alma', () => {
  it('alt çizgiyle yazılmış eğik içe almayı durdurmaz', async () => {
    const { satirIci } = await import('../src/alan/markdown');
    expect(satirIci('bir _eğik_ söz', {}, [])).toEqual([{ metin: 'bir ' }, { metin: 'eğik', italik: true }, { metin: ' söz' }]);
  });
});

describe('yedekten geri yükleme ve deneme kopyası (eski PR #49, bulgu 1)', () => {
  const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });
  function cihaz(ad: string) {
    const dosyalar = new Map<string, Database>();
    const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
    return new Hizmet(ac, ad, 'x', () => {}, new BellekDeposu(), sahteIsleyici, undefined, undefined, (d) => { dosyalar.get(d)?.close(); dosyalar.delete(d); },
      () => [...dosyalar.keys()]);
  }
  const s = metinSemasi.schema;
  const yaz = (h: Hizmet, evren: string, kayit: string, metin: string) => h.metinKaydet({ evren, kayit, alan: 'govde',
    spans: pmNodeToSpans(metinSemasi, s.node('doc', null, [s.node('paragraph', null, [s.text(metin)])])) as Spans, temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
  it('yalnız deneme kopyasında yazmış cihazın yedeği ayrı evren olarak açılır', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const sahne = m.kayitOlustur({ evren, ad: 'Açılış', tur: 'sahne' }).kod;
    const { kod: dal } = m.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    const t = cihaz('Tablet');
    await t.yedektenYukle({ veri: (await m.yedekAl({ evren })).veri });
    yaz(t, dal, sahne, 'Tablette yazılan.');
    const { veri } = await t.yedekAl({ evren });
    t.evrenKaldir({ evren });
    const r = await t.yedektenYukle({ veri });
    // Aynı kodla açılsaydı tablet deneme kopyasında yedekten sonra Drive'a gitmiş sıra numaralarını yeniden kullanırdı.
    expect(r.ayri).toBe(true);
  });
});

describe('PDF (eski PR #49, küçükler)', async () => {
  const { readFileSync } = await import('node:fs');
  const { createRequire } = await import('node:module');
  const { kelimeler, pdfdeOlmayanlar } = await import('../src/alan/pdf');
  const kok = createRequire(import.meta.url).resolve('@expo-google-fonts/literata/package.json').replace(/package\.json$/, '');
  const yt = { duz: readFileSync(kok + '400Regular/Literata_400Regular.ttf'), egik: readFileSync(kok + '400Regular_Italic/Literata_400Regular_Italic.ttf'),
    kalin: readFileSync(kok + '700Bold/Literata_700Bold.ttf'), kalinEgik: readFileSync(kok + '700Bold_Italic/Literata_700Bold_Italic.ttf') };
  it('bölünmez boşlukta satır kırılmaz', () => {
    const yazi = { widthOfTextAtSize: (t: string) => t.length } as never;
    const l = kelimeler([{ metin: '12 Hasat 412 yılı geldi' }], () => yazi) as { parcalar: { metin: string }[] }[];
    expect(l.map((k) => k.parcalar.map((p) => p.metin).join(''))).toEqual(['12 Hasat', '412 yılı', 'geldi']);
  });
  it('yazı tipinde olmayan karakterler söylenir', () => {
    const k = { ad: 'Kuzey', bolumler: [{ baslik: 'Bir', sahneler: [{ baslik: null, bloklar: [{ tur: 'paragraf' as const, parcalar: [{ metin: 'Çığ düştü 😀 ve 漢字. Son' }] }] }] }] };
    expect(pdfdeOlmayanlar(k, yt)).toEqual(['😀', '漢', '字']);
  });
});
