// Olay örgüsü masası (K27, P6): eserin okuma sırası sütunlar; satırlar var olan verilerden gelir. Sahne taşınınca
// sütunlar ve satırlar birlikte değişir; yeni veri tutulmaz. Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

describe('olay örgüsü masası (K27)', () => {
  it('satırlar hat, okur sorusu, karakter, dönüm noktası ve çalışma durumundan gelir; taşıma sütunları değiştirir', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const eser = k('Unutulanlar', 'eser');
    const b1 = h.anlatiOlustur({ evren, ust: eser, ad: '1. bölüm', tur: 'bolum' }).kod;
    const b2 = h.anlatiOlustur({ evren, ust: eser, ad: '2. bölüm', tur: 'bolum' }).kod;
    const s = (ad: string, ust: string) => h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
    const [vergi, muhur, sise] = [s('Vergi günü', b1), s('Mühür izi', b1), s('Annenin şişesi', b2)];
    const lale = k('Lale', 'karakter'), orhun = k('Orhun', 'karakter'), hat = k('Deniz’in izi', 'kurgu_hatti'), olay = k('Anı silinir', 'olay');
    for (const x of [vergi, muhur, sise]) h.iliskiEkle({ evren, tur: 'sahnede', a: lale, b: x, rol: 'bulunuyor' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: orhun, b: sise, rol: 'bulunuyor' });
    h.iliskiEkle({ evren, tur: 'kurgu_hattinda', a: muhur, b: hat, rol: 'ipucu_planlandi' });
    h.iliskiEkle({ evren, tur: 'anlatir', a: olay, b: sise });
    h.kayitListe({ evren, kod: sise, liste: 'etiket', ekle: 'Dönüm noktası' });
    h.kayitAlanYaz({ evren, kod: vergi, alan: 'calisma', deger: 'ilk_taslak' });
    const { kod: q } = h.iddiaEkle({ evren, konu: lale, soru: 'Annesine ne oldu?', secenekler: ['Silindi', 'Kaçtı'], gercek: 0 });
    const sec = h.iddialar({ evren }).find((x) => x.kod === q)!.secenekler;
    h.sahneNiyetleriYaz({ evren, sahne: muhur, niyetler: [{ iddia: q, secenek: sec[1].kod, tur: 'destekler' }] });
    h.sahneNiyetleriYaz({ evren, sahne: sise, niyetler: [{ iddia: q, secenek: sec[0].kod, tur: 'destekler' }] });

    const o = h.olayOrgusu({ evren, eser });
    expect(o.sutunlar.map((x) => [x.ad, x.bolum])).toEqual([['Vergi günü', '1. bölüm'], ['Mühür izi', '1. bölüm'], ['Annenin şişesi', '2. bölüm']]);
    expect(o.sutunlar.map((x) => x.donum)).toEqual([false, false, true]);
    expect(o.sutunlar[2].olaylar.map((x) => x.ad)).toEqual(['Anı silinir']);
    expect(o.sutunlar.map((x) => x.calisma)).toEqual(['ilk_taslak', null, null]);
    expect(o.sutunlar.every((x) => !x.metinVar)).toBe(true);
    expect(o.hatlar).toEqual([{ hat: expect.objectContaining({ ad: 'Deniz’in izi' }), hucreler: [null, 'İpucu: planlandı', null] }]);
    expect(o.sorular).toEqual([{ iddia: { kod: q, soru: 'Annesine ne oldu?' }, hucreler: [null, 'yaniltmaca', 'ipucu'], acikKaliyor: true }]);
    expect(o.karakterler.map((x) => [x.kisi.ad, x.hucreler])).toEqual([['Lale', [true, true, true]], ['Orhun', [false, false, true]]]);

    // Şişe sahnesi 1. bölümün başına taşınır: bütün satırlar yeni sırayı izler.
    h.anlatiYerlestir({ evren, kod: sise, ust: b1, sira: 0 });
    const t = h.olayOrgusu({ evren, eser });
    expect(t.sutunlar.map((x) => x.ad)).toEqual(['Annenin şişesi', 'Vergi günü', 'Mühür izi']);
    expect(t.sorular[0].hucreler).toEqual(['ipucu', null, 'yaniltmaca']);
    expect(t.karakterler[1].hucreler).toEqual([true, false, false]);
    expect(() => h.olayOrgusu({ evren, eser: lale })).toThrow(/eser/);
  });
});
