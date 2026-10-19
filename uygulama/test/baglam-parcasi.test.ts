import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import type { BaglamParcasiTanimi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}
const sm = metinSemasi.schema;
const metin = (...p: (string | [string, string])[]) => pmNodeToSpans(metinSemasi, sm.node('doc', null, [sm.node('paragraph', null,
  p.map((x) => typeof x === 'string' ? sm.text(x) : sm.text(x[0], [sm.mark('isaret', { kodlar: x[1] })])))])) as never;
const tanim = (x: Partial<BaglamParcasiTanimi> = {}): BaglamParcasiTanimi => ({ tarih: { kip: 'sahne' }, yer: { kip: 'sahne' }, bakis: { kip: 'sahne' }, not: '', ...x });

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const sahne = kayit('Kuşatmanın ilk gecesi', 'sahne'), kale = kayit('Kara Kale', 'mekan'), koy = kayit('Dere köyü', 'mekan');
  const asker = kayit('Asker Dorin', 'karakter'), ana = kayit('Annesi Mara', 'karakter');
  h.kayitTarih({ evren, kod: sahne, ifade: '412' });
  h.sahneAlaniAyarla({ evren, sahne, alan: 'sahne_yeri', kayit: kale });
  h.sahneAlaniAyarla({ evren, sahne, alan: 'bakis', kayit: asker });
  return { h, evren, sahne, kale, koy, asker, ana, kayit };
}

describe('sahne içinde bağlam parçaları (F29)', () => {
  it('uzun parça notu sessizce kesilmez; hata verilir ve kısmi kayıt yazılmaz', () => {
    const { h, evren, sahne } = kur();
    const onceki = h.gorulenler({ evren });
    expect(() => h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: tanim({ not: 'ç'.repeat(301) }) })).toThrow(/300/);
    expect(h.baglamParcalari({ evren, kayit: sahne })).toEqual([]);
    expect(h.islemleriVer({ evren, gorulen: onceki })).toEqual([]);
    const { kod } = h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: tanim({ not: 'ç'.repeat(300) }) });
    expect(h.baglamParcalari({ evren, kayit: sahne })[0]).toMatchObject({ kod, not: 'ç'.repeat(300) });
  });
  it('imlecin bulunduğu parça sahnenin tarihini, yerini ve bakışını değiştirir; seçilmeyen alan sahneden gelir', () => {
    const { h, evren, sahne, koy, asker, ana } = kur();
    const { kod } = h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: tanim({ tarih: { kip: 'deger', ifade: '398' }, yer: { kip: 'deger', kod: koy }, not: 'Geçmişe dönüş' }) });
    const temel = h.metinAc({ evren, kayit: sahne, alan: 'govde' }).basliklar;
    h.metinKaydet({ evren, kayit: sahne, alan: 'govde', spans: metin('Duvarlar sallandı. ', ['Çocukken köyde annesi ona şarkı söylerdi.', kod]), temel });
    const s = h.sahneBaglami({ evren, sahne });
    expect(s.tarih?.ifade).toBe('412');
    expect(s.yer?.ad).toBe('Kara Kale');
    const p = h.sahneBaglami({ evren, sahne, parca: kod });
    expect(p.tarih?.ifade).toBe('398');
    expect(p.yer?.ad).toBe('Dere köyü');
    expect(p.bakis?.kod).toBe(asker);
    h.baglamParcasiYaz({ evren, kod, tanim: tanim({ tarih: { kip: 'bos' }, bakis: { kip: 'deger', kod: ana } }) });
    const q = h.sahneBaglami({ evren, sahne, parca: kod });
    expect(q.tarih).toBeNull();
    expect(q.yer?.ad).toBe('Kara Kale');
    expect(q.bakis?.kod).toBe(ana);
    const l = h.baglamParcalari({ evren, kayit: sahne });
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ metin: ['Çocukken köyde annesi ona şarkı söylerdi.'], tarih: { kip: 'bos' }, bakis: { kip: 'deger', kayit: { ad: 'Annesi Mara' } } });
    h.baglamParcasiSil({ evren, kod });
    expect(h.baglamParcalari({ evren, kayit: sahne })).toEqual([]);
    expect(() => h.sahneBaglami({ evren, sahne, parca: kod })).toThrow(/bulunamadı/);
  });

  it('doğrulama: yalnızca sahnede; okunamayan tarih ve seçilmemiş kayıt reddedilir; başka sahnenin parçası kullanılamaz', () => {
    const { h, evren, sahne, asker, kayit } = kur();
    expect(() => h.baglamParcasiOlustur({ evren, kayit: asker, alan: 'govde', tanim: tanim() })).toThrow(/yalnızca sahne/);
    expect(() => h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: tanim({ tarih: { kip: 'deger', ifade: 'saçma tarih' } }) })).toThrow(/okunamadı/);
    expect(() => h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: tanim({ yer: { kip: 'deger', kod: null } }) })).toThrow(/Yer seçilmedi/);
    const { kod } = h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: tanim() });
    const diger = kayit('Ertesi sabah', 'sahne');
    expect(() => h.sahneBaglami({ evren, sahne: diger, parca: kod })).toThrow(/bu sahnede değil/);
  });

  it('iki cihazda farklı yazım çatışma olarak görünür ve çözülür', () => {
    const { h, evren, sahne, koy } = kur();
    const { kod } = h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: tanim() });
    const b = cihaz(); b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.baglamParcasiYaz({ evren, kod, tanim: tanim({ tarih: { kip: 'deger', ifade: '398' } }) });
    b.baglamParcasiYaz({ evren, kod, tanim: tanim({ yer: { kip: 'deger', kod: koy } }) });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    const c = h.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === 'baglam_parcasi');
    if (c?.tur !== 'alan') throw new Error('Çatışma bekleniyordu.');
    const sec = c.degerler.find((d) => d.yazi?.includes('Dere köyü'))!;
    h.alanCatismasiCoz({ evren, nesne: kod, alan: 'baglam_parcasi', islem: sec.islem });
    expect(h.catismalar({ evren })).toHaveLength(0);
    expect(h.baglamParcalari({ evren, kayit: sahne })[0].yer.kayit?.ad).toBe('Dere köyü');
  });
});
