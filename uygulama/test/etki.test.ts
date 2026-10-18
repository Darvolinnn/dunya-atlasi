import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const s = metinSemasi.schema;
const yaz = (h: Hizmet, evren: string, kayit: string, metin: string, hedef: string) => {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  return h.metinKaydet({ evren, kayit, alan: 'govde', temel, spans: pmNodeToSpans(metinSemasi, s.node('doc', null, [s.node('paragraph', null, [s.text(metin, [s.marks.bag.create({ hedef })])])])) });
};

describe('etki analizi', () => {
  it('üç grup; tarih değişince bağımlılar incelemeye açılır, kapanır ve yeniden değişince açılır', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const olum = h.kayitOlustur({ evren, ad: 'Kralın ölümü', tur: 'olay' }).kod;
    const tac = h.kayitOlustur({ evren, ad: 'Taç giyme', tur: 'olay' }).kod;
    const sahne = h.kayitOlustur({ evren, ad: 'Cenaze', tur: 'sahne' }).kod;
    const prenses = h.kayitOlustur({ evren, ad: 'Prenses', tur: 'karakter' }).kod;
    const not = h.kayitOlustur({ evren, ad: 'Saray notu', tur: 'not' }).kod;
    h.kayitTarih({ evren, kod: olum, ifade: '430' });
    h.iliskiEkle({ evren, tur: 'neden', a: olum, b: tac });
    h.iliskiEkle({ evren, tur: 'anlatir', a: sahne, b: olum });
    h.durumEkle({ evren, kod: prenses, durum: { ozellik: 'Unvan', deger: 'Kraliçe', kip: 'sonraki', baslangic: { olay: olum }, bitis: null } });
    h.kayitAlanYaz({ evren, kod: prenses, alan: 'dogum', deger: '412' });
    h.iliskiEkle({ evren, tur: 'olayda', a: prenses, b: olum, rol: 'tanik' });
    await yaz(h, evren, not, 'kral öldü', olum);

    const r = h.etkiRaporu({ evren, kod: olum });
    expect(r.hesap.map((x) => x.ad)).toEqual(['Prenses', 'Prenses']);
    expect(r.bagimli.map((x) => x.ad).sort()).toEqual(['Cenaze', 'Taç giyme']);
    expect(r.bahseden.map((x) => x.ad)).toEqual(['Saray notu']);
    expect(h.etkiIncelemeleri({ evren }).acik).toEqual([]); // ilk tarih incelemeyi açmaz

    h.kayitTarih({ evren, kod: olum, ifade: '432' });
    let x = h.etkiIncelemeleri({ evren });
    expect(x.acik.map((i) => [i.hedef.ad, i.once, i.sonra]).sort()).toEqual([['Cenaze', '430', '432'], ['Taç giyme', '430', '432']]);
    const sayi = h.evrenBilgisi({ evren }).sorunSayisi;
    expect(sayi).toBe(2);
    const tacI = x.acik.find((i) => i.hedef.ad === 'Taç giyme')!;
    h.etkiKarari({ evren, anahtar: tacI.anahtar, durum: 'duzeltildi' });
    expect(() => h.etkiKarari({ evren, anahtar: tacI.anahtar, durum: 'kabul' })).toThrow();
    const cen = x.acik.find((i) => i.hedef.ad === 'Cenaze')!;
    h.etkiKarari({ evren, anahtar: cen.anahtar, durum: 'ertelendi' });
    x = h.etkiIncelemeleri({ evren });
    expect([x.acik.length, x.ertelenen.length, x.kapanan.length]).toEqual([0, 1, 1]);
    h.kayitTarih({ evren, kod: olum, ifade: '433' });
    x = h.etkiIncelemeleri({ evren });
    expect(x.acik.map((i) => i.hedef.ad)).toEqual(['Taç giyme']); // dayanak değişti: yeniden açıldı; ertelenen ayrı durur
    // Katılımcı çıkarılınca da açılır (eklemek açmaz); bağ kaldırılınca inceleme düşer.
    h.etkiKarari({ evren, anahtar: tacI.anahtar, durum: 'duzeltildi' });
    const katilim = h.iliskiler({ evren, kod: prenses }).find((i) => i.tur === 'olayda')!;
    h.iliskiSil({ evren, kod: katilim.kod });
    x = h.etkiIncelemeleri({ evren });
    expect(x.acik.find((i) => i.hedef.ad === 'Taç giyme')).toMatchObject({ degisim: 'katilimci', sonra: 'Prenses çıkarıldı' });
    const bag = h.iliskiler({ evren, kod: tac }).find((i) => i.tur === 'neden')!;
    h.iliskiSil({ evren, kod: bag.kod });
    expect(h.etkiIncelemeleri({ evren }).acik).toEqual([]);
  });
});

describe('neden–sonuç ağı, kurgu hatları, matris', () => {
  it('neden sonucundan sonraysa işaretlenir', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const ol = (ad: string, t: string) => { const k = h.kayitOlustur({ evren, ad, tur: 'olay' }).kod; h.kayitTarih({ evren, kod: k, ifade: t }); return k; };
    const maden = ol('Maden kapandı', '410'), vergi = ol('Vergi düştü', '411'), maas = ol('Maaş ödenemedi', '409');
    h.iliskiEkle({ evren, tur: 'neden', a: maden, b: vergi });
    h.iliskiEkle({ evren, tur: 'neden', a: vergi, b: maas });
    const a = h.nedenSonucAgi({ evren, merkez: maden, derinlik: 1 });
    expect(a.dugumler.map((d) => d.ad)).toEqual(['Maden kapandı', 'Vergi düştü']);
    const t = h.nedenSonucAgi({ evren });
    expect(t.dugumler.map((d) => d.ad)).toEqual(['Maaş ödenemedi', 'Maden kapandı', 'Vergi düştü']);
    expect(t.kenarlar.find((k) => k.b === maas)!.zamanUyarisi).toBe('Neden, sonucundan sonra görünüyor.');
    expect(t.kenarlar.find((k) => k.b === vergi)!.zamanUyarisi).toBeNull();
  });

  it('kurgu hattı okuma sırasıyla; bölüm × kayıt katmanları ayrı sayılır', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const eser = h.kayitOlustur({ evren, ad: 'Kuzey Seferi', tur: 'eser' }).kod;
    const b1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Birinci bölüm', tur: 'bolum' }).kod;
    const b2 = h.anlatiOlustur({ evren, ust: eser, ad: 'İkinci bölüm', tur: 'bolum' }).kod;
    const s1 = h.anlatiOlustur({ evren, ust: b1, ad: 'Liman', tur: 'sahne' }).kod;
    const s2 = h.anlatiOlustur({ evren, ust: b1, ad: 'Pazar', tur: 'sahne' }).kod;
    const s3 = h.anlatiOlustur({ evren, ust: b2, ad: 'Kale', tur: 'sahne' }).kod;
    const s4 = h.anlatiOlustur({ evren, ust: b2, ad: 'Dönüş', tur: 'sahne' }).kod;
    const hat = h.kayitOlustur({ evren, ad: 'Kayıp mühür', tur: 'kurgu_hatti' }).kod;
    h.iliskiEkle({ evren, tur: 'kurgu_hattinda', a: s1, b: hat, rol: 'ipucu_yerlesti', aciklama: 'Mühür izi' });
    h.iliskiEkle({ evren, tur: 'kurgu_hattinda', a: s2, b: hat, rol: 'gelisme' });
    const k = h.kurguHatlari({ evren }).hatlar[0];
    expect(k.eserler[0]).toMatchObject({ toplam: 4, sonBagliSira: 2, sonrakiSahne: 2 });
    expect(k.eserler[0].sahneler.map((x) => x.baglar.map((b) => b.rolAdi))).toEqual([['İpucu: metne yerleştirildi'], ['Hattı ilerletir'], [], []]);
    expect(k.ipucu).toEqual({ ipucu_yerlesti: 1 });

    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const kral = h.kayitOlustur({ evren, ad: 'Kral', tur: 'karakter' }).kod;
    h.iliskiEkle({ evren, tur: 'sahnede', a: elin, b: s1, rol: 'bulunuyor' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: elin, b: s3, rol: 'bulunuyor' });
    h.iliskiEkle({ evren, tur: 'bakis', a: elin, b: s3 });
    h.iliskiEkle({ evren, tur: 'sahnede', a: kral, b: s2, rol: 'aniliyor' });
    await yaz(h, evren, s4, 'kralın', kral);
    h.degisimEkle({ evren, sahne: s3, konu: elin, metin: 'Eli yaralandı' });
    const m = h.bolumMatrisi({ evren, eser });
    expect(m.sutunlar.map((x) => [x.ad, x.sahneSayisi])).toEqual([['Birinci bölüm', 2], ['İkinci bölüm', 2]]);
    const el = m.satirlar.find((x) => x.kayit.ad === 'Elin')!;
    expect(el.hucreler).toEqual([{ bulunuyor: 1, aniliyor: 0, bakis: 0, etki: 0, bilgi: 0, okur: 0 }, { bulunuyor: 1, aniliyor: 0, bakis: 1, etki: 1, bilgi: 0, okur: 0 }]);
    expect([el.gorunduguSahne, el.konuOlduguSahne]).toEqual([2, 2]);
    const kr = m.satirlar.find((x) => x.kayit.ad === 'Kral')!;
    expect([kr.gorunduguSahne, kr.konuOlduguSahne]).toEqual([0, 2]);
    expect(h.bolumMatrisi({ evren, eser, turler: ['mekan'] }).satirlar).toEqual([]);
  });
});
