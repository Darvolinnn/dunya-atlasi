import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { Node as PmNode } from 'prosemirror-model';
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
const p = (...ogeler: (string | [string, string])[]) => s.node('paragraph', null, ogeler.map((o) =>
  typeof o === 'string' ? s.text(o) : s.text(o[0], [s.marks.bag.create({ hedef: o[1] })])));
function yaz(h: Hizmet, evren: string, kayit: string, ...paragraflar: PmNode[]) {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  return h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, s.node('doc', null, paragraflar)), temel });
}

describe('sağlık taraması ve inceleme kuyruğu', () => {
  it('yapı sorunlarını bulur; kabul dayanak değişince yeniden açılır; ertelenen ayrı durur; bilgiler hata sayılmaz', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const sahne = h.kayitOlustur({ evren, ad: 'Kuşatma gecesi', tur: 'sahne' }).kod;
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const kule = h.kayitOlustur({ evren, ad: 'Kayıp Kule', tur: 'mekan' }).kod;
    const eski = h.kayitOlustur({ evren, ad: 'Eski plan', tur: 'olay' }).kod;
    const yokKod = '01zzzzzzzzzzzzzzzzzzzzzzzz';
    await yaz(h, evren, sahne, p(['Elin', elin], ' ', ['kuleye', kule], ' gitti; ', ['eski plan', eski], ' ve ', ['hayalet', yokKod], '.'));
    expect(h.saglikTaramasi({ evren }).acik.map((b) => b.tur)).toEqual(['kopuk_baglanti']);
    h.kayitSil({ evren, kod: kule });
    h.kayitDegistir({ evren, kod: eski, alan: 'karar', deger: 'vazgecildi' });
    const t = h.saglikTaramasi({ evren });
    expect(t.acik.map((b) => b.tur).sort()).toEqual(['kopuk_baglanti', 'silinmis_baglanti', 'vazgecilmis_baglanti']);
    expect(h.evrenBilgisi({ evren }).sorunSayisi).toBe(3);

    const vaz = t.acik.find((b) => b.tur === 'vazgecilmis_baglanti')!;
    expect(() => h.incelemeKarari({ evren, anahtar: vaz.anahtar, durum: 'kabul' })).toThrow();
    h.incelemeKarari({ evren, anahtar: vaz.anahtar, durum: 'kabul', gerekce: 'Sahne bilerek eski planı anıyor' });
    const kopuk = t.acik.find((b) => b.tur === 'kopuk_baglanti')!;
    h.incelemeKarari({ evren, anahtar: kopuk.anahtar, durum: 'ertelendi' });
    let t2 = h.saglikTaramasi({ evren });
    expect(t2.acik.map((b) => b.tur)).toEqual(['silinmis_baglanti']);
    expect(t2.kabul[0]).toMatchObject({ karar: { durum: 'kabul', gerekce: 'Sahne bilerek eski planı anıyor' } });
    expect(t2.ertelenen).toHaveLength(1);
    // Silinen kayıt geri gelince sorun kendiliğinden kapanır.
    h.kayitGeriYukle({ evren, kod: kule });
    // Vazgeçilmiş kayıt fikre dönüp yeniden vazgeçilirse dayanak aynıdır: kabul sürer.
    h.kayitDegistir({ evren, kod: eski, alan: 'karar', deger: 'fikir' });
    h.kayitDegistir({ evren, kod: eski, alan: 'karar', deger: 'vazgecildi' });
    t2 = h.saglikTaramasi({ evren, bilgi: true });
    expect(t2.acik).toEqual([]);
    expect(t2.bilgiler).toEqual([]); // vazgeçilmiş olay tarihsiz olsa da listelenmez
    h.incelemeKarari({ evren, anahtar: kopuk.anahtar, durum: null });
    expect(h.saglikTaramasi({ evren }).acik.map((b) => b.tur)).toEqual(['kopuk_baglanti']);
    expect(h.islemGunlugu({ evren, sinir: 40 }).filter((i) => i.tur === 'inceleme_karari')).toHaveLength(3);
  });

  it('bağlantısız fikir ve tarihsiz olay bilgi listesindedir; birleştirilmiş kayda bağlantı sorun değildir', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    h.kayitOlustur({ evren, ad: 'Uçan balıklar', tur: 'canli', karar: 'fikir' });
    const olay = h.kayitOlustur({ evren, ad: 'Büyük sel', tur: 'olay' }).kod;
    h.kayitTarih({ evren, kod: olay, ifade: 'ejderhalar uyuyunca' });
    const a = h.kayitOlustur({ evren, ad: 'Liman', tur: 'sehir' }).kod;
    const b = h.kayitOlustur({ evren, ad: 'Tuzlu Liman', tur: 'sehir' }).kod;
    await yaz(h, evren, olay, p(['Tuzlu Liman', b], ' sular altında kaldı.'));
    h.birlestir({ evren, kaynak: b, hedef: a, secimler: {} });
    const t = h.saglikTaramasi({ evren, bilgi: true });
    expect(t.acik).toEqual([]);
    expect(t.bilgiler!.map((x) => [x.tur, x.kayit!.ad])).toEqual([['belirsiz_tarih', 'Büyük sel'], ['baglantisiz_fikir', 'Uçan balıklar']]);
  });
});
