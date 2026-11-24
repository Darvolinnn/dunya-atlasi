// Kesintisiz okuma (K39, öneri 1). Örnekler uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { duzMetindenSpans } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

describe('kesintisiz okuma (K39)', () => {
  it('eserde bütün sahneler okuma sırasıyla, bölümde yalnız o bölüm', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const b1 = h.anlatiOlustur({ evren, ust: eser, ad: 'Vergi Günü', tur: 'bolum' }).kod;
    const b2 = h.anlatiOlustur({ evren, ust: eser, ad: 'Şişe', tur: 'bolum' }).kod;
    const s = (ad: string, ust: string, metin: string) => {
      const k = h.anlatiOlustur({ evren, ust, ad, tur: 'sahne' }).kod;
      if (metin) { const m = h.metinAc({ evren, kayit: k, alan: 'govde' }); h.metinKaydet({ evren, kayit: k, alan: 'govde', spans: duzMetindenSpans(metin), temel: m.basliklar }); }
      return k;
    };
    s('Arşiv', b1, 'Merdivenler soğuktu.'); s('Kaçakçılar', b2, ''); s('Mühür', b2, 'Mühür kırıktı.');
    const l = h.okumaMetni({ evren, kapsam: eser });
    expect(l.map((x) => [x.bolum?.ad, x.sahne.ad])).toEqual([['Vergi Günü', 'Arşiv'], ['Şişe', 'Kaçakçılar'], ['Şişe', 'Mühür']]);
    expect(JSON.stringify(l[0].spans)).toContain('Merdivenler soğuktu.');
    expect(h.okumaMetni({ evren, kapsam: b2 }).map((x) => x.sahne.ad)).toEqual(['Kaçakçılar', 'Mühür']);
  });
});

describe('kesilen parçalar ve adlı hâller (K39)', () => {
  it('çekmeceye konur, çıkarılır, geri konur; metnin bir hâline ad verilir ve kaldırılır', () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const sahne = h.anlatiOlustur({ evren, ust: eser, ad: 'Arşiv', tur: 'sahne' }).kod;
    const { kod } = h.kesilenParcaEkle({ evren, sahne, metin: '  Lale çekmeceyi açtı.\nSatır boştu.  ' });
    expect(h.kesilenParcalar({ evren, sahne })).toEqual([expect.objectContaining({ kod, metin: 'Lale çekmeceyi açtı.\nSatır boştu.' })]);
    h.kesilenParcaSil({ evren, sahne, kod });
    expect(h.kesilenParcalar({ evren, sahne })).toEqual([]);
    h.kesilenParcaEkle({ evren, sahne, metin: 'Lale çekmeceyi açtı.', kod });
    expect(h.kesilenParcalar({ evren, sahne }).map((x) => x.kod)).toEqual([kod]);
    expect(() => h.kesilenParcaEkle({ evren, sahne, metin: '   ' })).toThrow('boş');

    const m = h.metinAc({ evren, kayit: sahne, alan: 'govde' });
    h.metinKaydet({ evren, kayit: sahne, alan: 'govde', spans: duzMetindenSpans('İlk taslak.'), temel: m.basliklar });
    const son = h.kayitGecmisi({ evren, kod: sahne }).find((x) => x.tur === 'metin')!;
    h.surumAdiYaz({ evren, islem: son.kod, ad: '  Orhun’suz  hâli ' });
    expect(h.surumAdlari({ evren, kayit: sahne })).toEqual({ [son.kod]: 'Orhun’suz hâli' });
    h.surumAdiYaz({ evren, islem: son.kod, ad: '' });
    expect(h.surumAdlari({ evren, kayit: sahne })).toEqual({});
    expect(() => h.surumAdiYaz({ evren, islem: sahne, ad: 'x' })).toThrow('bulunamadı');
  });
});

describe('izdüşüm 61 yerinde geçişi (K39)', () => {
  it('eski sürümün uygulamadan bıraktığı yeni işlemler açılışta uygulanır', () => {
    const dosyalar = new Map<string, Database>();
    const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
    const h = new Hizmet(ac, 'Deneme', 'x');
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const sahne = h.anlatiOlustur({ evren, ust: eser, ad: 'Arşiv', tur: 'sahne' }).kod;
    h.kesilenParcaEkle({ evren, sahne, metin: 'Kesilen satır.' });
    const db = ac(`/evren-${evren}.db`);
    // Eski sürüm bu işlemi anlamamış olsaydı evren tablosunda karşılığı olmazdı.
    db.exec("DELETE FROM evren WHERE k LIKE 'kesilen:%'");
    db.exec("UPDATE meta SET v='60' WHERE k='izdusum_surumu'");
    const h2 = new Hizmet(ac, 'Deneme', 'x');
    expect(h2.kesilenParcalar({ evren, sahne }).map((x) => x.metin)).toEqual(['Kesilen satır.']);
  });
});
