import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import type { Node as PmNode } from 'prosemirror-model';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  return { h, evren, ac };
}

const s = metinSemasi.schema;
/** Paragraf: dizgiler düz metin, [ifade, hedef] bağlantı. */
const p = (...ogeler: (string | [string, string])[]) => s.node('paragraph', null, ogeler.map((o) =>
  typeof o === 'string' ? s.text(o) : s.text(o[0], [s.marks.bag.create({ hedef: o[1] })])));
const spans = (...paragraflar: PmNode[]) => pmNodeToSpans(metinSemasi, s.node('doc', null, paragraflar));

function yaz(h: Hizmet, evren: string, kayit: string, ...paragraflar: PmNode[]) {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  return h.metinKaydet({ evren, kayit, alan: 'govde', spans: spans(...paragraflar), temel });
}

describe('bağlantılar', () => {
  it('bağlantı metinde saklanır, editöre geri döner; bağlananlar ve bahsedilenler listelenir', () => {
    const { h, evren } = kur();
    const velkar = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan', karar: 'fikir' }).kod;
    yaz(h, evren, velkar, p(["Kuzey Kalesi'nden", kale], ' çıktı.'));
    const doc = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit: velkar, alan: 'govde' }).spans as never);
    let hedef = '';
    doc.descendants((n) => { const m = n.marks.find((x) => x.type.name === 'bag'); if (m) hedef = m.attrs.hedef; });
    expect(hedef).toBe(kale);
    expect(h.baglananlar({ evren, kod: kale })).toEqual([{ kod: velkar, ad: 'Velkar', tur: 'karakter', ifadeler: ["Kuzey Kalesi'nden"] }]);
    expect(h.bahsedilenler({ evren }).map((k) => [k.ad, k.anilma])).toEqual([['Kuzey Kalesi', 1]]);
    // Anlatı sözleşmesinde bilinçli olarak açık bırakılan kayıt hatırlatılmaz (F15).
    const madde = h.sozlesmeMaddeYaz({ evren, tanim: { metin: 'Kalenin içi anlatılmayacak.', tur: 'acik_birakildi', karar: 'kesin', kapsam: { tur: 'evren' }, bagliKayitlar: [kale] } }).kod;
    expect(h.bahsedilenler({ evren })).toEqual([]);
    h.sozlesmeMaddeSil({ evren, kod: madde });
    expect(h.bahsedilenler({ evren }).map((k) => k.ad)).toEqual(['Kuzey Kalesi']);
    // Kalenin metni yazılınca listeden çıkar; bağlayan kayıt çöpe gidince bağlantı sayılmaz.
    yaz(h, evren, kale, p('Taş duvarlar.'));
    expect(h.bahsedilenler({ evren })).toEqual([]);
    h.kayitSil({ evren, kod: velkar });
    expect(h.baglananlar({ evren, kod: kale })).toEqual([]);
  });

  it('andıkları: kaydın kendi metninde bağlantı verdikleri; birleşen hedef son kayda, çöpteki hedef görünmez (K28)', () => {
    const { h, evren } = kur();
    const lale = h.kayitOlustur({ evren, ad: 'Lale', tur: 'karakter' }).kod;
    const deniz = h.kayitOlustur({ evren, ad: 'Deniz', tur: 'karakter' }).kod;
    const arsiv = h.kayitOlustur({ evren, ad: 'Hafıza Arşivi', tur: 'mekan' }).kod;
    const kopya = h.kayitOlustur({ evren, ad: 'Arşiv', tur: 'mekan' }).kod;
    yaz(h, evren, lale, p(["Deniz'le", deniz], ' ', ['arşive', kopya], ' indi. ', ['Deniz', deniz], ' sustu. ', ['Lale', lale], ' bekledi.'));
    expect(h.andiklari({ evren, kod: lale })).toEqual([
      { kod: deniz, ad: 'Deniz', tur: 'karakter', ifadeler: ["Deniz'le", 'Deniz'] },
      { kod: kopya, ad: 'Arşiv', tur: 'mekan', ifadeler: ['arşive'] },
    ]);
    expect(h.baglananlar({ evren, kod: deniz }).map((x) => x.kod)).toEqual([lale]);
    h.birlestir({ evren, kaynak: kopya, hedef: arsiv });
    expect(h.andiklari({ evren, kod: lale }).map((x) => x.ad)).toEqual(['Deniz', 'Hafıza Arşivi']);
    h.kayitSil({ evren, kod: deniz });
    expect(h.andiklari({ evren, kod: lale }).map((x) => x.ad)).toEqual(['Hafıza Arşivi']);
  });

  it('yazar düzeltmesi: bağlantılı ifadeler yeni adla ve uyumlu ekle değişir', () => {
    const { h, evren } = kur();
    const velkar = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    const not = h.kayitOlustur({ evren, ad: 'Bölüm notu', tur: 'not' }).kod;
    yaz(h, evren, not, p(["Velkar'dan", velkar], ' mektup geldi. ', ['vali', velkar], ' sustu.'), p(["Velkar'ı", velkar], ' gördüler.'));
    h.kayitDegistir({ evren, kod: velkar, alan: 'ad', deger: 'Kaelet' });
    const onizleme = h.adDuzeltmeOnizle({ evren, kod: velkar, eskiAd: 'Velkar', yeniAd: 'Kaelet' });
    expect(onizleme.map((x) => [x.eski, x.yeni])).toEqual([["Velkar'dan", "Kaelet'ten"], ["Velkar'ı", "Kaelet'i"]]);
    const r = h.adDuzeltmeUygula({ evren, kod: velkar, eskiAd: 'Velkar', yeniAd: 'Kaelet', secilenler: [`${not}:0`] });
    expect(r.degisen).toBe(1);
    const doc = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit: not, alan: 'govde' }).spans as never);
    expect(doc.textBetween(0, doc.content.size, '\n')).toBe("Kaelet'ten mektup geldi. vali sustu.\nVelkar'ı gördüler.");
    expect(h.baglananlar({ evren, kod: velkar })[0].ifadeler).toEqual(["Kaelet'ten", 'vali', "Velkar'ı"]);
  });
});

describe('arama', () => {
  it('Türkçe harfsiz, lakap, eski ad, çekimli biçim ve metin', () => {
    const { h, evren } = kur();
    const kilic = h.kayitOlustur({ evren, ad: 'Kuzey Kılıcı', tur: 'esya' }).kod;
    const sehir = h.kayitOlustur({ evren, ad: 'İzmar', tur: 'sehir' }).kod;
    const velkar = h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    h.kayitListe({ evren, kod: velkar, liste: 'lakap', ekle: 'Demir Vali' });
    h.kayitDegistir({ evren, kod: sehir, alan: 'ad', deger: 'Yeni İzmar' });
    yaz(h, evren, velkar, p('Sabah şafakta yola çıktı.'));
    const ilk = (q: string) => h.ara({ evren, metin: q })[0];
    expect(ilk('kuzey kilici')).toMatchObject({ kod: kilic, tam: true });
    expect(ilk('kuzey kılıcıyla')).toMatchObject({ kod: kilic, tam: true, nereden: { tur: 'kok' } });
    expect(ilk('demir')).toMatchObject({ kod: velkar, nereden: { tur: 'lakap', metin: 'Demir Vali' } });
    expect(ilk('IZMAR')).toMatchObject({ kod: sehir });
    expect(h.ara({ evren, metin: 'izmar' }).length).toBe(1);
    expect(ilk("Velkar'dan")).toMatchObject({ kod: velkar, tam: true });
    expect(ilk('safakta')).toMatchObject({ kod: velkar, nereden: { tur: 'metin' } });
    expect(ilk('safakta').parca).toContain('şafakta');
    expect(h.ara({ evren, metin: 'safakta', metinde: false })).toEqual([]);
  });
});

describe('tablo yapısı değişince', () => {
  it('görünen tablolar günlükten yeniden kurulur', () => {
    const { h, evren, ac } = kur();
    const a = h.kayitOlustur({ evren, ad: 'A', tur: 'not' }).kod;
    const b = h.kayitOlustur({ evren, ad: 'B', tur: 'not' }).kod;
    yaz(h, evren, a, p(['B', b]));
    const db = ac(`/evren-${evren}.db`);
    db.exec("UPDATE meta SET v='1' WHERE k='izdusum_surumu'");
    db.exec('DROP TABLE baglantilar');
    const h2 = new Hizmet(ac, 'Deneme', 'x');
    expect(h2.baglananlar({ evren, kod: b }).map((x) => x.kod)).toEqual([a]);
  });
});
