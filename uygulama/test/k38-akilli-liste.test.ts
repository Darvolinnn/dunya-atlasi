import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { yeniKod } from '../src/alan/kod';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function kur() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, 'Deneme', 'x');
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur: string, dogum?: string) => { const kod = h.kayitOlustur({ evren, ad, tur }).kod; if (dogum) h.kayitAlanYaz({ evren, kod, alan: 'dogum', deger: dogum }); return kod; };
  const lonca = kayit('Kuzey Loncası', 'topluluk');
  const uye = (k: string) => h.iliskiEkle({ evren, tur: 'uye', a: k, b: lonca });
  const genc = kayit('Uydurma Orhun', 'karakter', '390'); uye(genc);
  const bilinmeyen = kayit('Uydurma Deniz', 'karakter'); uye(bilinmeyen);
  const yasli = kayit('Uydurma Ayaz', 'karakter', '300'); uye(yasli);
  const disarida = kayit('Uydurma Mira', 'karakter', '400');
  return { h, ac, evren, lonca, genc, bilinmeyen, yasli, disarida };
}

describe('akıllı listeler (K38, §7, §18)', () => {
  it('sonucu sorgu sözleşmesine göre gruplar; bilgisi eksik kayıt "uymuyor" sayılmaz', () => {
    const { h, evren, genc, bilinmeyen, yasli, disarida } = kur();
    const { kod } = h.akilliListeYaz({ evren, ad: 'Loncanın genç üyeleri', tur: 'karakter', formul: 'üyesi [Kuzey Loncası] ve yaş < 30 yıl', tarih: '412' });
    const l = h.akilliListe({ evren, kod });
    expect(l.formulYazisi).toBe('üyesi [Kuzey Loncası] ve yaş < 30 yıl');
    expect(l.tarih?.ifade).toBe('412');
    expect(l.uyuyor.map((x) => x.kayit.kod)).toEqual([genc]);
    expect(l.bilgiYok.map((x) => x.kayit.kod).sort()).toEqual([bilinmeyen, disarida].sort());
    expect(l.bilgiYok.find((x) => x.kayit.kod === bilinmeyen)!.neden).toBe('doğum tarihi yazılmamış');
    expect(l.uymuyor.map((x) => x.kayit.kod)).toEqual([yasli]);
    expect(h.akilliListeler({ evren })).toEqual([{ kod, ad: 'Loncanın genç üyeleri' }]);
  });
  it('her açılışta yeniden hesaplanır; günlükten yeniden kurulur; silinir ve geri gelir', () => {
    const { h, ac, evren, bilinmeyen } = kur();
    const { kod } = h.akilliListeYaz({ evren, ad: 'Genç üyeler', tur: 'karakter', formul: 'üyesi [Kuzey Loncası] ve yaş < 30 yıl', tarih: '412' });
    h.kayitAlanYaz({ evren, kod: bilinmeyen, alan: 'dogum', deger: '395' });
    expect(h.akilliListe({ evren, kod }).uyuyor).toHaveLength(2);
    h.akilliListeYaz({ evren, kod, ad: 'Genç üyeler', tur: 'karakter', formul: 'üyesi [Kuzey Loncası]', tarih: '' });
    const once = h.akilliListe({ evren, kod });
    expect(once.tarih).toBeNull();
    expect(once.uyuyor).toHaveLength(3);
    new EvrenVt(ac(`/evren-${evren}.db`), yeniKod()).yenidenKur();
    expect(h.akilliListe({ evren, kod })).toEqual(once);
    h.akilliListeSil({ evren, kod });
    expect(h.akilliListeler({ evren })).toEqual([]);
    expect(() => h.akilliListe({ evren, kod })).toThrow(/bulunamadı/);
    h.akilliListeSil({ evren, kod, geriYukle: true });
    expect(h.akilliListeler({ evren })).toHaveLength(1);
  });
  it('okunamayan formül, boş sorgu ve okunamayan tarih kaydedilmez; silinen kayda dayanan liste hesaplanamaz der', () => {
    const { h, evren, lonca } = kur();
    expect(() => h.akilliListeYaz({ evren, ad: 'Bozuk', tur: '', formul: 'üyesi [Yok Böyle Bir Yer]', tarih: '' })).toThrow(/Formül okunamadı/);
    expect(() => h.akilliListeYaz({ evren, ad: 'Boş', tur: '', formul: '  ', tarih: '' })).toThrow(/sorgusunu/);
    expect(() => h.akilliListeYaz({ evren, ad: '', tur: '', formul: 'üyesi [Kuzey Loncası]', tarih: '' })).toThrow(/ad/);
    expect(() => h.akilliListeYaz({ evren, ad: 'X', tur: '', formul: 'üyesi [Kuzey Loncası]', tarih: 'dün akşam' })).toThrow(/Tarih/);
    const { kod } = h.akilliListeYaz({ evren, ad: 'Üyeler', tur: '', formul: 'üyesi [Kuzey Loncası]', tarih: '' });
    h.kayitSil({ evren, kod: lonca });
    const l = h.akilliListe({ evren, kod });
    expect(l.hata).toMatch(/silindi/);
    expect(l.uyuyor).toEqual([]);
  });
});
