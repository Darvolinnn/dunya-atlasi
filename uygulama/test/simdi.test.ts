// "Şimdi" ve şu an çalışılan (K27, Model §5): öneriler kayıtlı veriye dayanır; etkin çalışma yalnız seçilince değişir.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad = 'Masaüstü') {
  const dosyalar = new Map<string, Database>();
  return new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, ad, 'x');
}

describe('Şimdi (K27)', () => {
  it('etkin çalışma kapsamındaki öneriler önce gelir; başka kitaba yazmak etkin çalışmayı değiştirmez', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Hatıra' });
    expect(h.simdi({ evren })).toEqual([]);
    const i = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const iii = h.kayitOlustur({ evren, ad: 'Son Hatıra', tur: 'eser' }).kod;
    const s1 = h.anlatiOlustur({ evren, ust: i, ad: 'Arşivde', tur: 'sahne' }).kod;
    h.soruCevapla({ evren, kod: i, soru: 'eser.3', durum: 'sonra' });
    h.anlatiOlustur({ evren, ust: iii, ad: 'Son sahne', tur: 'sahne' });
    h.soruCevapla({ evren, kod: iii, soru: 'eser.3', durum: 'sonra' });
    // Etkin çalışma yokken en son düzenlenenler.
    expect(h.simdi({ evren }).map((o) => o.kayit.ad)).toEqual(['Son Hatıra', 'Son sahne']);
    h.etkinCalismaYaz({ evren, kod: i });
    expect(h.etkinCalisma({ evren })?.ad).toBe('Unutulanlar');
    const l = h.simdi({ evren });
    expect(l.map((o) => [o.tur, o.kayit.kod])).toEqual([['soru', i], ['sahne', s1]]);
    expect(l[0].gerekce).toBe('Bu soruyu sonraya bırakmıştınız.');
    expect(l[0].baslik).toBe('Unutulanlar: Doruk noktası ne?');
    // III. kitaba yazmak etkin çalışmayı değiştirmez.
    h.kayitDegistir({ evren, kod: iii, alan: 'ozet', deger: 'Final' });
    expect(h.etkinCalisma({ evren })?.kod).toBe(i);
    expect(() => h.etkinCalismaYaz({ evren, kod: s1 })).toThrow('eser ya da seri');
    // Önemli mesele en başta.
    const m = h.yazarKaydiEkle({ evren, tur: 'acik_mesele', ad: 'Orhun annesini tanıyor muydu?', bagla: i, onemli: true });
    expect(m).toBeTruthy();
    expect(h.simdi({ evren })[0]).toMatchObject({ tur: 'mesele', gerekce: 'Bu meseleyi önemli olarak işaretlemiştiniz.' });
    h.etkinCalismaYaz({ evren, kod: null });
    expect(h.etkinCalisma({ evren })).toBeNull();
  });

  it('etkin çalışma cihazlar arasında eşitlenir', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Hatıra' });
    const i = m.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.etkinCalismaYaz({ evren, kod: i });
    t.islemleriAl({ evren, islemler: m.islemleriVer({ evren, gorulen: t.gorulenler({ evren }) }) });
    expect(t.etkinCalisma({ evren })?.ad).toBe('Unutulanlar');
  });
});
