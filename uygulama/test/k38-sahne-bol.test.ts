import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const sm = metinSemasi.schema;
type P = (string | [string, string])[];
const par = (p: P) => sm.node('paragraph', null, p.map((x) => typeof x === 'string' ? sm.text(x) : sm.text(x[0], [sm.mark('isaret', { kodlar: x[1] })])));
const belge = (...ps: P[]) => sm.node('doc', null, ps.map(par));

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const eser = kayit('Unutulanlar', 'eser');
  const sahne = h.anlatiOlustur({ evren, ust: eser, ad: 'Arşiv', tur: 'sahne' }).kod;
  const sonraki = h.anlatiOlustur({ evren, ust: eser, ad: 'Divan', tur: 'sahne' }).kod;
  const lale = kayit('Lale', 'karakter'), deniz = kayit('Deniz', 'karakter'), arsiv = kayit('Başkent Arşivi', 'mekan'), sise = kayit('Mühürlü şişe', 'esya');
  h.kayitTarih({ evren, kod: sahne, ifade: '412' });
  h.sahneAlaniAyarla({ evren, sahne, alan: 'sahne_yeri', kayit: arsiv });
  h.sahneAlaniAyarla({ evren, sahne, alan: 'bakis', kayit: lale });
  h.iliskiEkle({ evren, tur: 'sahnede', a: deniz, b: sahne });
  const db = ac(`/evren-${evren}.db`);
  const yaz = (kod: string, d: ReturnType<typeof belge>) => {
    const temel = h.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar;
    h.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: pmNodeToSpans(metinSemasi, d) as never, temel });
  };
  const metin = (kod: string) => pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit: kod, alan: 'govde' }).spans as never);
  return { h, evren, eser, sahne, sonraki, lale, deniz, sise, db, yaz, metin };
}

describe('K38: sahneyi bölme ve birleştirme', () => {
  it('imleçten sonrası hemen ardından gelen yeni sahneye taşınır; işaret ve bağlam parçası metinle gider, bağlam kopyalanır; geri alma eski hâle döndürür', () => {
    const { h, evren, eser, sahne, sonraki, lale, deniz, sise, db, yaz, metin } = kur();
    const isaret = h.metinIsaretiOlustur({ evren, kayit: sahne, alan: 'govde', hedef: sise }).kod;
    const parca = h.baglamParcasiOlustur({ evren, kayit: sahne, alan: 'govde', tanim: { tarih: { kip: 'sahne' }, yer: { kip: 'sahne' }, bakis: { kip: 'sahne' }, not: 'Geçmiş' } }).kod;
    const ilk = 'Lale çekmeceyi açtı.';
    yaz(sahne, belge([ilk], ['Masada ', ['bir şişe', isaret], ' duruyordu.'], [['Annesi böyle derdi.', parca]]));
    const iz = h.izOlustur({ evren, konu: lale, ad: 'Sağ el', model: 'durum' }).kod;
    h.izGozlem({ evren, iz, sahne, an: 'son', deger: 'sarılı' });
    const temel = h.metinAc({ evren, kayit: sahne, alan: 'govde' }).basliklar;
    const konum = 1 + ilk.length; // ilk paragrafın sonu

    const o = h.sahneBolOnizle({ evren, sahne, konum, temel });
    expect(o).toMatchObject({ paragraf: 2, ad: 'Arşiv (2)', tarih: '412', yer: 'Başkent Arşivi', bakis: 'Lale', sahnedekiler: 1, isaret: 1, parca: 1, sonGozlem: 1 });
    expect(() => h.sahneBolOnizle({ evren, sahne, konum, temel: [] })).toThrow(/değişti/);

    const islemOnce = Number(db.selectValue('SELECT count(*) FROM islemler'));
    const { yeni, bitisik } = h.sahneBol({ evren, sahne, konum, temel, sonGozlemler: 'gecsin' });
    expect(bitisik).toBe(false);
    // Tek işlem grubu.
    expect(db.selectValue('SELECT count(DISTINCT grup) FROM islemler WHERE rowid > ?', [islemOnce])).toBe(1);
    expect(metin(sahne).textContent).toBe(ilk);
    expect(metin(yeni).textContent).toBe('Masada bir şişe duruyordu.Annesi böyle derdi.');
    expect(h.eserYapisi({ evren, eser }).dogrudan.map((s) => s.kod)).toEqual([sahne, yeni, sonraki]);
    expect(db.selectValue('SELECT kayit FROM metin_isaretleri WHERE kod=?', [isaret])).toBe(yeni);
    expect(db.selectValue('SELECT kayit FROM baglam_parcalari WHERE kod=?', [parca])).toBe(yeni);
    const b = h.sahneBaglami({ evren, sahne: yeni });
    expect(b.tarih?.ifade).toBe('412');
    expect(b.yer?.ad).toBe('Başkent Arşivi');
    expect(b.bakis?.kod).toBe(lale);
    expect(b.katilimcilar.map((k) => k.kod)).toContain(deniz);
    expect(db.selectValue("SELECT deger FROM iz_gozlemleri WHERE sahne=? AND an='son'", [yeni])).toBe('sarılı');
    expect(db.selectValue("SELECT 1 FROM iz_gozlemleri WHERE sahne=? AND an='son'", [sahne])).toBeUndefined();
    // Günlükten baştan kurulunca aynı sonuç.
    const once = JSON.stringify(db.selectObjects('SELECT kod, kayit, metin FROM metin_isaretleri ORDER BY kod')) + JSON.stringify(db.selectObjects('SELECT kod, kayit FROM baglam_parcalari ORDER BY kod'));
    db.exec("UPDATE meta SET v='1' WHERE k='izdusum_surumu'");
    new EvrenVt(db, 'baska');
    expect(JSON.stringify(db.selectObjects('SELECT kod, kayit, metin FROM metin_isaretleri ORDER BY kod')) + JSON.stringify(db.selectObjects('SELECT kod, kayit FROM baglam_parcalari ORDER BY kod'))).toBe(once);

    // Geri al: sonraki sahneyle (yeni) birleştirmek.
    h.sahneBirlestir({ evren, sahne, ikinci: yeni, bitisik });
    expect(metin(sahne).textContent).toBe(ilk + 'Masada bir şişe duruyordu.Annesi böyle derdi.');
    expect(metin(sahne).childCount).toBe(3);
    expect(db.selectValue('SELECT kayit FROM metin_isaretleri WHERE kod=?', [isaret])).toBe(sahne);
    expect(db.selectValue('SELECT kayit FROM baglam_parcalari WHERE kod=?', [parca])).toBe(sahne);
    expect(db.selectValue("SELECT deger FROM iz_gozlemleri WHERE sahne=? AND an='son'", [sahne])).toBe('sarılı');
    expect(db.selectValue('SELECT silindi IS NOT NULL FROM kayitlar WHERE kod=?', [yeni])).toBe(1);
    expect(h.sahneBaglami({ evren, sahne }).katilimcilar.filter((k) => k.kod === deniz)).toHaveLength(1);
  });

  it('paragrafın ortasından bölünür, geri almada aynı paragrafa birleşir; işaretli cümlenin içinden bölünmez', () => {
    const { h, evren, sahne, sise, yaz, metin } = kur();
    const isaret = h.metinIsaretiOlustur({ evren, kayit: sahne, alan: 'govde', hedef: sise }).kod;
    yaz(sahne, belge(['Kapı açıldı. Lale girdi.'], [['Şişe kırıktı.', isaret]]));
    const temel = h.metinAc({ evren, kayit: sahne, alan: 'govde' }).basliklar;
    expect(() => h.sahneBolOnizle({ evren, sahne, konum: 'Kapı açıldı. Lale girdi.'.length + 2 + 3, temel })).toThrow(/işaretli bir cümle/);
    const { yeni, bitisik } = h.sahneBol({ evren, sahne, konum: 1 + 'Kapı açıldı. '.length, temel, sonGozlemler: 'kalsin' });
    expect(bitisik).toBe(true);
    expect(metin(sahne).textContent).toBe('Kapı açıldı. ');
    expect(metin(yeni).firstChild!.textContent).toBe('Lale girdi.');
    h.sahneBirlestir({ evren, sahne, ikinci: yeni, bitisik });
    expect(metin(sahne).childCount).toBe(2);
    expect(metin(sahne).firstChild!.textContent).toBe('Kapı açıldı. Lale girdi.');
    expect(() => h.sahneBolOnizle({ evren, sahne, konum: 1, temel: h.metinAc({ evren, kayit: sahne, alan: 'govde' }).basliklar })).toThrow(/İmleçten önce/);
  });

  it('sonraki sahneyle birleştirme: metin, katılımcı, olay ve işaretler geçer, ikinci çöp kutusuna gider; geri alma ikisini ayırır', () => {
    const { h, evren, eser, sahne, sonraki, lale, sise, db, yaz, metin } = kur();
    yaz(sahne, belge(['Lale arşivde.']));
    const isaret = h.metinIsaretiOlustur({ evren, kayit: sonraki, alan: 'govde', hedef: sise }).kod;
    yaz(sonraki, belge([['Divan toplandı.', isaret]]));
    const kara = h.kayitOlustur({ evren, ad: 'Kara Vezir', tur: 'karakter' }).kod;
    h.iliskiEkle({ evren, tur: 'sahnede', a: kara, b: sonraki });
    h.iliskiEkle({ evren, tur: 'sahnede', a: lale, b: sonraki });
    const olay = h.degisimEkle({ evren, sahne: sonraki, metin: 'Vezir azledildi.' }).olay;
    expect(h.sonrakiSahne({ evren, sahne })).toEqual({ kod: sonraki, ad: 'Divan' });
    expect(h.sonrakiSahne({ evren, sahne: sonraki })).toBeNull();
    const o = h.sahneBirlestirOnizle({ evren, sahne });
    expect(o).toMatchObject({ ikinci: { kod: sonraki, ad: 'Divan' }, paragraf: 1, katilimci: 1, olay: 1, isaret: 1 }); // Lale zaten bakış açısı
    const geri = h.sahneBirlestir({ evren, sahne });
    expect(metin(sahne).textContent).toBe('Lale arşivde.Divan toplandı.');
    expect(db.selectValue('SELECT kayit FROM metin_isaretleri WHERE kod=?', [isaret])).toBe(sahne);
    expect(h.sahneBaglami({ evren, sahne }).katilimcilar.map((k) => k.kod)).toContain(kara);
    expect(h.sahneOlaylari({ evren, sahne }).map((x) => x.kod)).toContain(olay);
    expect(h.eserYapisi({ evren, eser }).dogrudan.map((s) => s.kod)).toEqual([sahne]);

    h.sahneBirlesmesiniGeriAl({ evren, geri });
    expect(metin(sahne).textContent).toBe('Lale arşivde.');
    expect(metin(sonraki).textContent).toBe('Divan toplandı.');
    expect(db.selectValue('SELECT kayit FROM metin_isaretleri WHERE kod=?', [isaret])).toBe(sonraki);
    expect(h.sahneBaglami({ evren, sahne }).katilimcilar.map((k) => k.kod)).not.toContain(kara);
    expect(h.sahneOlaylari({ evren, sahne })).toHaveLength(0);
    expect(h.eserYapisi({ evren, eser }).dogrudan.map((s) => s.kod)).toEqual([sahne, sonraki]);
    expect(() => h.sahneBirlesmesiniGeriAl({ evren, geri })).toThrow();
  });
});
