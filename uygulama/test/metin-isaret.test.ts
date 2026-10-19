import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi, isaretYerleri } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const sm = metinSemasi.schema;
type Parca = string | [string, string];
const metin = (...paragraflar: Parca[][]) => pmNodeToSpans(metinSemasi, sm.node('doc', null, paragraflar.map((p) => sm.node('paragraph', null,
  p.map((x) => typeof x === 'string' ? sm.text(x) : sm.text(x[0], [sm.mark('isaret', { kodlar: x[1] })])))))) as never;
const yaz = (h: Hizmet, evren: string, kayit: string, spans: never) => {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  h.metinKaydet({ evren, kayit, alan: 'govde', spans, temel });
};

describe('metin işaretleme (§5.7)', () => {
  it('üst üste gelen işaretler ayrı yerler olarak okunur', () => {
    const y = isaretYerleri(metin(['Önce ', ['Elin', 'A'], ['kılıcı', 'A B'], [' taşıyordu', 'B'], '.'], [['devam', 'A']]));
    expect(y).toEqual([{ isaret: 'A', metin: 'Elinkılıcı' }, { isaret: 'B', metin: 'kılıcı taşıyordu' }, { isaret: 'A', metin: 'devam' }]);
  });

  it('cümle bir kaydın bilgisine bağlanır; metinden silinince kayıt kalır; kopya belirsiz sayılır', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const sahne = h.kayitOlustur({ evren, ad: 'Gece nöbeti', tur: 'sahne' }).kod;
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Taşıdığı', deger: 'Kılıç' } });
    const alanlar = h.isaretAlanlari({ evren, hedef: elin });
    const durum = alanlar.find((a) => a.grup === 'Zamanla değişenler')!;
    expect(durum.ad).toBe('Taşıdığı: Kılıç');
    expect(() => h.metinIsaretiOlustur({ evren, kayit: sahne, alan: 'govde', hedef: elin, hedefAlan: 'alan:yok' })).toThrow(/bilgi/);
    const { kod } = h.metinIsaretiOlustur({ evren, kayit: sahne, alan: 'govde', hedef: elin, hedefAlan: durum.kod, iddia: ' Kılıç  Elin\'de ', kritik: true });
    let l = h.kayitIsaretleri({ evren, kod: sahne }).metindekiler;
    expect(l).toMatchObject([{ kod, durum: 'metinde_yok', iddia: "Kılıç Elin'de", kritik: true, hedef: { ad: 'Elin' }, hedefAlanAdi: 'Taşıdığı: Kılıç' }]);
    yaz(h, evren, sahne, metin(['Gece boyunca ', ['Elin kılıcı taşıyordu', kod], '.']));
    l = h.kayitIsaretleri({ evren, kod: sahne }).metindekiler;
    expect(l[0]).toMatchObject({ durum: 'yerinde', yerler: ['Elin kılıcı taşıyordu'] });
    expect(h.kayitIsaretleri({ evren, kod: elin }).buKayda.map((x) => x.kod)).toEqual([kod]);
    expect(h.isaretOzetleri({ evren, kodlar: [kod, 'yok'] })).toMatchObject([{ kod, kritik: true }]);
    yaz(h, evren, sahne, metin(['Gece boyunca ', ['Elin kılıcı taşıyordu', kod], '.'], [['Elin kılıcı taşıyordu', kod]]));
    expect(h.kayitIsaretleri({ evren, kod: sahne }).metindekiler[0].durum).toBe('belirsiz');
    yaz(h, evren, sahne, metin(['Gece boyunca sessizdi.']));
    expect(h.kayitIsaretleri({ evren, kod: sahne }).metindekiler[0].durum).toBe('metinde_yok');
    h.metinIsaretiYaz({ evren, kod, alan: 'kritik', deger: false });
    h.metinIsaretiYaz({ evren, kod, alan: 'hedefAlan', deger: 'tarih' });
    expect(h.kayitIsaretleri({ evren, kod: sahne }).metindekiler[0]).toMatchObject({ kritik: false, hedefAlan: 'tarih', hedefAlanAdi: 'Evren tarihi' });
    h.metinIsaretiSil({ evren, kod });
    expect(h.kayitIsaretleri({ evren, kod: sahne }).metindekiler).toEqual([]);
    expect(h.isaretOzetleri({ evren, kodlar: [kod] })).toEqual([]);
    h.metinIsaretiSil({ evren, kod, geriYukle: true });
    expect(h.kayitIsaretleri({ evren, kod: sahne }).metindekiler.length).toBe(1);
  });
});
