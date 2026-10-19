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
function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
  const k = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const koy = k('Söğüt köyü', 'sehir'), gecit = k('Taş geçit', 'mekan'), orman = k('Kara orman', 'mekan'), kale = k('Kara Kale', 'mekan');
  const rota = (ad: string, a: string, b: string, sureler: { kosul: string; gun: number }[]) => {
    const r = k(ad, 'rota');
    h.rotaYaz({ evren, kod: r, rota: { a, b, mesafe: null, sureler, duraklar: [] } });
    return r;
  };
  const tunel = rota('Tünel', koy, kale, [{ kosul: 'yaya', gun: 1 }]);
  const r1 = rota('Geçit yolu', koy, gecit, [{ kosul: 'yaya', gun: 1.5 }]);
  const r2 = rota('Sırt yolu', gecit, kale, [{ kosul: 'yaya', gun: 1 }]);
  const r3 = rota('Orman yolu', koy, orman, [{ kosul: 'yaya', gun: 2 }]);
  const r4 = rota('Dere yolu', orman, kale, [{ kosul: 'yaya', gun: 2 }]);
  const r5 = rota('Patika', orman, gecit, []);
  return { h, evren, k, koy, gecit, orman, kale, tunel, r1, r2, r3, r4, r5 };
}

describe('sonuçtan koşullara masası (§15-13)', () => {
  it('üçüncü akşam kaleye, tünelsiz: uyan planlar kısa olan önce, her biri payını söyler', () => {
    const { h, evren, koy, kale, tunel } = kur();
    const m = h.kosulMasasi({ evren, nereden: koy, nereye: kale, enCokGun: 3, yasakRotalar: [tunel] });
    expect(m.hukum).toBe('çözüm bulundu');
    expect(m.planlar.map((p) => [p.adimlar.map((a) => a.rota.ad), p.toplam])).toEqual([[['Geçit yolu', 'Sırt yolu'], 2.5]]);
    expect(m.planlar[0].gerekenler).toContain('Sınırdan 0,5 gün önce varır.');
    expect(m.varsayimlar).toContain('Süresi girilmemiş 1 rota hesaba girmedi.');
    const genis = h.kosulMasasi({ evren, nereden: koy, nereye: kale, enCokGun: 4, yasakRotalar: [tunel] });
    expect(genis.planlar.map((p) => p.toplam)).toEqual([2.5, 4]);
  });

  it('kişinin bilmediği yol plana gereken olarak yazılır; çıkış tarihinden varış hesaplanır', () => {
    const { h, evren, k, koy, kale, tunel, r1 } = kur();
    const ulak = k('Ulak Sema', 'karakter');
    h.iliskiEkle({ evren, tur: 'yolu_bilir', a: ulak, b: r1 });
    const m = h.kosulMasasi({ evren, nereden: koy, nereye: kale, enCokGun: 3, yasakRotalar: [tunel], kisi: ulak, cikis: '430' });
    expect(m.planlar[0].bilinmeyen.map((r) => r.ad)).toEqual(['Sırt yolu']);
    expect(m.planlar[0].gerekenler[0]).toContain('Bu plan için bilmesi gerekir');
    expect(m.planlar[0].varis).toBe('Yıl 430 ile Yıl 431 arası');
  });

  it('bulunamazsa evrende imkânsız denmez; yasaksız yol ve en kısa süre söylenir', () => {
    const { h, evren, koy, kale, tunel, gecit } = kur();
    const m = h.kosulMasasi({ evren, nereden: koy, nereye: kale, enCokGun: 2, yasakRotalar: [tunel] });
    expect(m.hukum).toBe('kayıtlı seçeneklerde bulunamadı');
    expect(m.planlar).toEqual([]);
    expect(m.nedenler).toEqual(['Bu koşullarla en kısa kayıtlı yol 2,5 gün; sınır 2 gün.', 'Yasaklanan rota ya da yerler kullanılabilseydi 1 gün süren bir yol vardı.']);
    expect(m.varsayimlar.join(' ')).toContain('imkânsız olduğu demek değil');
    // Uğranmayacak yer.
    const y = h.kosulMasasi({ evren, nereden: koy, nereye: kale, enCokGun: 5, yasakRotalar: [tunel], yasakYerler: [gecit] });
    expect(y.planlar.map((p) => p.toplam)).toEqual([4]);
    expect(() => h.kosulMasasi({ evren, nereden: koy, nereye: kale, enCokGun: 0 })).toThrow('Süre sınırını');
    expect(() => h.kosulMasasi({ evren, nereden: koy, nereye: kale, enCokGun: 3, yasakYerler: [kale] })).toThrow('uğranmayacak');
  });
});
