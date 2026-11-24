// Kitap sonunda açık olanlar (K27, Model §7): sahne niyetlerinden, eserin okuma sırasına göre. Sonraki kitap
// yazılınca bu kitabın sütunu değişmez; yalnızca "sonra" bilgisi eklenir. Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

describe('kitap sonunda açık olanlar (K27)', () => {
  it('açıklanmayan sorular listelenir; sonraki kitapta açıklanınca yalnız "sonra" dolar', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const seri = k('Hatıra İmparatorluğu', 'seri');
    const i = k('Unutulanlar', 'eser'), ii = k('Hatırlayanlar', 'eser');
    for (const x of [i, ii]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
    const deniz = k('Deniz', 'karakter'), isyan = k('Silinmiş isyan', 'olay');
    const s = (ad: string, ust: string) => h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
    const [a1, a2, a3] = [s('Arşivde', i), s('Mühür', i), s('Deniz bulunur', i)];
    const { kod: q1 } = h.iddiaEkle({ evren, konu: deniz, soru: 'Deniz’e ne oldu?', secenekler: ['İsyancılarla', 'Öldü'], gercek: 0 });
    const { kod: q2 } = h.iddiaEkle({ evren, konu: isyan, soru: 'İsyanın nedeni ne?', secenekler: ['Vergi', 'Kıtlık'], gercek: 0 });
    const sec = (q: string) => h.iddialar({ evren }).find((x) => x.kod === q)!.secenekler;
    h.sahneNiyetleriYaz({ evren, sahne: a1, niyetler: [{ iddia: q1, secenek: sec(q1)[1].kod, tur: 'destekler' }, { iddia: q2, secenek: sec(q2)[0].kod, tur: 'destekler' }] });
    h.sahneNiyetleriYaz({ evren, sahne: a2, niyetler: [{ iddia: q2, secenek: sec(q2)[1].kod, tur: 'destekler' }] });
    h.sahneNiyetleriYaz({ evren, sahne: a3, niyetler: [{ iddia: q1, secenek: sec(q1)[0].kod, tur: 'aciklar' }] });
    const once = h.kitapSonuAciklar({ evren, eser: i });
    expect(once.seride).toBe(true);
    expect(once.sorular).toEqual([expect.objectContaining({ iddia: expect.objectContaining({ soru: 'İsyanın nedeni ne?' }), ipucu: 1, yaniltmaca: 1, sonra: null })]);
    // II. kitapta açıklanır: I'in listesi aynı kalır, yalnız "sonra" dolar.
    const b1 = s('Anılar geri döner', ii);
    h.sahneNiyetleriYaz({ evren, sahne: b1, niyetler: [{ iddia: q2, secenek: sec(q2)[0].kod, tur: 'aciklar' }] });
    const sonra = h.kitapSonuAciklar({ evren, eser: i });
    expect(sonra.sorular.map((x) => x.iddia.soru)).toEqual(['İsyanın nedeni ne?']);
    expect(sonra.sorular[0].sonra).toMatchObject({ eser: { ad: 'Hatırlayanlar' }, sahne: { ad: 'Anılar geri döner' }, sira: 1 });
    expect(h.kitapSonuAciklar({ evren, eser: ii }).sorular).toEqual([]);
  });
});

describe('kitap sonunda durum (K39)', () => {
  it('son sahnenin tarihindeki durumlar, eşyanın sahibi ve süreklilik defterinin son hâli', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const eser = k('Unutulanlar', 'eser');
    const s = (ad: string, tarih: string) => { const x = h.anlatiOlustur({ evren, ust: eser, ad, tur: 'sahne' }).kod; h.kayitTarih({ evren, kod: x, ifade: tarih }); return x; };
    const [a1, a2] = [s('Arşivde', '410'), s('Liman', '412')];
    const lale = k('Lale', 'karakter'), orhun = k('Orhun', 'karakter'), arsiv = k('Arşiv', 'yer'), sise = k('Kırık şişe', 'esya');
    h.sahneAlaniAyarla({ evren, sahne: a1, alan: 'sahne_yeri', kayit: arsiv });
    h.sahneAlaniAyarla({ evren, sahne: a2, alan: 'bakis', kayit: lale });
    h.iliskiEkle({ evren, tur: 'sahnede', a: orhun, b: a1 });
    h.iliskiEkle({ evren, tur: 'sahnede', a: sise, b: a1 });
    h.iliskiEkle({ evren, tur: 'sahip', a: lale, b: sise, bitis: '411' });
    h.iliskiEkle({ evren, tur: 'sahip', a: orhun, b: sise, baslangic: '411' });
    h.durumEkle({ evren, kod: lale, durum: { ozellik: 'Unvan', deger: 'Çırak', kip: 'sonraki', baslangic: { ifade: '400' } } });
    h.durumEkle({ evren, kod: lale, durum: { ozellik: 'Unvan', deger: 'Kâtip', kip: 'sonraki', baslangic: { ifade: '411' } } });
    const { kod: iz } = h.izOlustur({ evren, konu: lale, ad: 'Mektup', model: 'durum' });
    h.izGozlem({ evren, iz, sahne: a1, an: 'son', deger: 'cebinde' });

    const d = h.kitapSonuDurumu({ evren, eser });
    expect(d.sonSahne?.ad).toBe('Liman');
    expect(d.tarih?.ifade).toBe('412');
    // Bakış açısı önce; Orhun en son ilk sahnede görüldü, yeri o sahnenin yeri.
    expect(d.karakterler.map((c) => [c.ad, c.sahne.ad, c.yer?.ad ?? null])).toEqual([['Lale', 'Liman', null], ['Orhun', 'Arşivde', 'Arşiv']]);
    expect(d.karakterler[0].durumlar.map((x) => x.deger)).toEqual(['Kâtip']);
    expect(d.esyalar.map((x) => [x.ad, x.sahipler.map((y) => y.ad)])).toEqual([['Kırık şişe', ['Orhun']]]);
    expect(d.izler).toEqual([expect.objectContaining({ deger: 'cebinde', sira: 1, sondaMi: false })]);
    expect(h.kitapSonuDurumu({ evren, eser: k('Boş', 'eser') }).sonSahne).toBeNull();
  });
});

describe('kurgu montajı seri kapsamında (K39)', () => {
  it('kitaplar art arda numaralanır; açıklaması olmayan işaretli soru askıdadır', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const seri = k('Hatıra İmparatorluğu', 'seri');
    const i = k('Unutulanlar', 'eser'), ii = k('Hatırlayanlar', 'eser');
    for (const x of [i, ii]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
    const deniz = k('Deniz', 'karakter');
    const s = (ad: string, ust: string) => h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
    const [a1, a2] = [s('Arşivde', i), s('Mühür', i)];
    const b1 = s('Dönüş', ii);
    const { kod: q } = h.iddiaEkle({ evren, konu: deniz, soru: 'Deniz’e ne oldu?', secenekler: ['İsyancılarla', 'Öldü'], gercek: 0 });
    const sec = h.iddialar({ evren }).find((x) => x.kod === q)!.secenekler;
    h.sahneNiyetleriYaz({ evren, sahne: a1, niyetler: [{ iddia: q, secenek: sec[0].kod, tur: 'destekler' }] });
    h.iliskiEkle({ evren, tur: 'sahnede', a: deniz, b: a1 });
    h.iliskiEkle({ evren, tur: 'sahnede', a: deniz, b: b1 });
    expect(h.kurguMontaji({ evren, eser: i }).sorular[0].askida).toBe(true);
    let m = h.kurguMontaji({ evren, eser: seri });
    expect(m.seride).toBe(true);
    expect(m.sahneler.map((x) => [x.sira, x.ad, x.bolum])).toEqual([[1, 'Arşivde', 'Unutulanlar'], [2, 'Mühür', 'Unutulanlar'], [3, 'Dönüş', 'Hatırlayanlar']]);
    expect(m.sorular[0].askida).toBe(true);
    // Yokluk kitap sınırını geçer: Deniz 2. sahnede yok, 3. sahnede (ikinci kitap) yeniden var.
    expect(m.yokluk[0].hucreler).toEqual([0, 1, 0]);
    h.sahneNiyetleriYaz({ evren, sahne: b1, niyetler: [{ iddia: q, secenek: sec[0].kod, tur: 'aciklar' }] });
    m = h.kurguMontaji({ evren, eser: seri });
    expect(m.sorular[0].askida).toBe(false);
    expect(m.sorular[0].olaylar.map((o) => [o.sira, o.tur])).toEqual([[1, 'ipucu'], [3, 'aciklama']]);
    expect(h.kurguMontaji({ evren, eser: i }).sorular[0].askida).toBe(true);
    void a2;
  });
});
