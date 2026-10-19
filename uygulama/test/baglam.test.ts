import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}

describe('bağlam karşılaştırma (F23)', () => {
  it('farkın evren zamanından, bilgi katmanından ya da kaynaktan geldiğini ayırır', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const kale = h.kayitOlustur({ evren, ad: 'Kara Kale', tur: 'mekan' }).kod;
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    h.durumEkle({ evren, kod: kale, durum: { ozellik: 'Sahibi', deger: 'Aren hanedanı', kip: 'sonraki', baslangic: { ifade: '400' } } });
    h.durumEkle({ evren, kod: kale, durum: { ozellik: 'Sahibi', deger: 'Doran hanedanı', kip: 'sonraki', baslangic: { ifade: '430' } } });
    const { kod: iddia } = h.iddiaEkle({ evren, konu: kale, soru: 'Kaleyi kim yaktı?', secenekler: ['Doranlar', 'Yıldırım'], gercek: 1 });
    const [s] = h.kayitIddialari({ evren, kod: kale });
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: elin, inanc: 'inaniyor', secenek: s.secenekler[0].kod } });

    const z = h.baglamKarsilastir({ evren, kayit: kale, baglamlar: [{ kaynak: null, tarih: '410', bilen: null }, { kaynak: null, tarih: '440', bilen: null }] });
    const sahibi = z.satirlar.find((x) => x.baslik === 'Sahibi')!;
    expect([sahibi.degerler, sahibi.farkli, sahibi.neden]).toEqual([['Aren hanedanı', 'Doran hanedanı'], true, ['evren zamanı']]);
    expect(z.satirlar.find((x) => x.baslik === 'Ad')!.farkli).toBe(false);

    const b = h.baglamKarsilastir({ evren, kayit: kale, baglamlar: [{ kaynak: null, tarih: '440', bilen: null }, { kaynak: null, tarih: '440', bilen: elin }] });
    const bilgi = b.satirlar.find((x) => x.grup === 'bilgi')!;
    expect(bilgi.degerler[0]).toBeNull();
    expect(bilgi.degerler[1]).toContain('“Doranlar”');
    expect(bilgi.neden).toEqual(['bilgi katmanı']);
    expect(b.satirlar.find((x) => x.grup === 'gercek')!.degerler).toEqual(['Yıldırım', 'Yıldırım']);

    // Sürüm: sonra değişen ad yalnızca kaynaktan gelir; karışık bağlam uyarısı.
    const { kod: surum } = h.surumOlustur({ evren, ad: 'İlk taslak' });
    h.kayitDegistir({ evren, kod: kale, alan: 'ad', deger: 'Kızıl Kale' });
    const k = h.baglamKarsilastir({ evren, kayit: kale, baglamlar: [{ kaynak: `surum:${surum}`, tarih: '410', bilen: null }, { kaynak: null, tarih: '440', bilen: null }] });
    expect(k.sutunlar.map((x) => [x.kaynak, x.ad])).toEqual([['Sürüm: İlk taslak', 'Kara Kale'], ['Güncel', 'Kızıl Kale']]);
    expect(k.satirlar.find((x) => x.baslik === 'Ad')!.neden).toEqual(['kaynak (sürüm ya da deneme)']);
    expect(k.satirlar.find((x) => x.baslik === 'Sahibi')!.neden).toEqual(['kaynak (sürüm ya da deneme)', 'evren zamanı']);
    expect(k.notlar.join(' ')).toContain('eski sürümün ya da deneme kopyasının kendisi değildir');

    expect(() => h.baglamKarsilastir({ evren, kayit: kale, baglamlar: [{ kaynak: null, tarih: null, bilen: null }] })).toThrow('İki ila dört');
    expect(() => h.baglamKarsilastir({ evren, kayit: kale, baglamlar: [{ kaynak: null, tarih: 'dün değil', bilen: null }, { kaynak: null, tarih: null, bilen: null }] })).toThrow('Tarih okunamadı');
  });

  it('kaynakta olmayan kayıt "yok" olarak işaretlenir', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: surum } = h.surumOlustur({ evren, ad: 'Boş' });
    const yeni = h.kayitOlustur({ evren, ad: 'Yeni Kule', tur: 'mekan' }).kod;
    const k = h.baglamKarsilastir({ evren, kayit: yeni, baglamlar: [{ kaynak: `surum:${surum}`, tarih: null, bilen: null }, { kaynak: null, tarih: null, bilen: null }] });
    expect(k.sutunlar.map((x) => x.yok)).toEqual([true, false]);
    expect(k.satirlar.find((x) => x.baslik === 'Ad')!.farkli).toBe(false);
  });
});
