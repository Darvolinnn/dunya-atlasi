// Dış öneri raporundan (23 Kasım 2026, DEVIR §0.24) doğrulanıp düzeltilen açıklar.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';
import type { Takvim } from '../src/alan/tarih';
import type { HukukTanimGirdisi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const ANA: Takvim = { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }] };
const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: new Uint8Array([7]) });

function cihaz(ad: string, drive?: BellekTasiyici) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const medya = new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici);
  if (drive) h.tasiyiciAyarla(drive, null);
  return { h, medya };
}

describe('öneri raporu: eşya yok edildikten sonra (§9.1)', () => {
  it('yok edilen eşyanın sonraki olayda bulunması çelişkidir; önceki olay ve anılma değildir', () => {
    const { h } = cihaz('Masaüstü');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme' });
    h.takvimYaz({ evren, takvim: ANA });
    const kayit = (ad: string, tur: string, tarih?: string) => {
      const kod = h.kayitOlustur({ evren, ad, tur }).kod;
      if (tarih) h.kayitTarih({ evren, kod, ifade: tarih });
      return kod;
    };
    const kilic = kayit('Kızıl Kılıç', 'esya');
    const kirilma = kayit('Kılıcın kırılması', 'olay', '400');
    const once = kayit('Turnuva', 'olay', '390');
    const sonra = kayit('Taç giyme', 'olay', '410');
    const anma = kayit('Anma', 'olay', '420');
    h.iliskiEkle({ evren, tur: 'olayda', a: kilic, b: kirilma, rol: 'yok_edilen' });
    h.iliskiEkle({ evren, tur: 'olayda', a: kilic, b: once, rol: 'katilan' });
    h.iliskiEkle({ evren, tur: 'olayda', a: kilic, b: anma, rol: 'sonradan' });

    let d = h.denetimler({ evren });
    expect(d.acik.filter((b) => b.kural === 'esya')).toHaveLength(0);
    expect(d.kurallar.find((k) => k.kural === 'esya')!.sonuc).toBe('sorun_yok');

    h.iliskiEkle({ evren, tur: 'olayda', a: kilic, b: sonra, rol: 'katilan' });
    d = h.denetimler({ evren });
    const b = d.acik.filter((x) => x.kural === 'esya');
    expect(b).toHaveLength(1);
    expect(b[0].hukum).toBe('celiski');
    expect(b[0].baslik).toContain('yok edildikten sonra');
    expect(b[0].dayanak).toContain('“400”');
    expect(d.kurallar.find((k) => k.kural === 'esya')!.not).not.toContain('henüz denetlenmiyor');
  });
});

describe('öneri raporu: birleştirme önizlemesinde formüller', () => {
  it('kaynak kaydın geçtiği hukuk formülleri sayılır', () => {
    const { h } = cihaz('Masaüstü');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme' });
    const krallik = h.kayitOlustur({ evren, ad: 'Krallık', tur: 'topluluk' }).kod;
    const lonca = h.kayitOlustur({ evren, ad: 'Lonca', tur: 'topluluk' }).kod;
    const kopya = h.kayitOlustur({ evren, ad: 'Esnaf Loncası', tur: 'topluluk' }).kod;
    const tanim = (formul: string): HukukTanimGirdisi =>
      ({ ad: 'Kural', tur: 'yasak', konu: '', kimlere: [], yer: null, yaptirim: '', fiili: null, fiiliNot: '', baslangic: '', bitis: '', formul });
    const { kod } = h.hukukKuraliOlustur({ evren, sahip: krallik, ad: 'Gece yasağı' });
    h.hukukKuraliYaz({ evren, kod, tanim: tanim('üyesi [Esnaf Loncası]') });
    expect(h.birlesmeOnizle({ evren, kaynak: kopya, hedef: lonca }).formuller).toBe(1);
    expect(h.birlesmeOnizle({ evren, kaynak: lonca, hedef: kopya }).formuller).toBe(0);
  });
});

describe('öneri raporu: bozuk yerel görsel', () => {
  it('bu cihazdaki görsel bozulursa eşitleme Drive\'daki sağlam kopyayla onarır', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    await m.h.gorselEkle({ evren, kod: v, dosyaAdi: 'v.png', tur: 'image/png', veri: new Uint8Array([1, 2, 3]) });
    await m.h.esitle();
    const ad = m.h.kayit({ evren, kod: v }).gorseller[0];
    const saglam = m.medya.dosyalar.get(ad)!;

    const t = cihaz('Tablet', drive);
    await t.h.evreniIndir({ kod: evren });
    expect(t.medya.dosyalar.get(ad)).toEqual(saglam);
    t.medya.dosyalar.set(ad, new Uint8Array([9, 9]));
    await t.h.esitle();
    expect(t.medya.dosyalar.get(ad)).toEqual(saglam);
    // Bozuk görsel Drive'a gitmez; Drive'daki kopya sağlam kalır.
    expect([...drive.dosyalar.values()].filter((x) => x.ozellikler.tur === 'medya')).toHaveLength(2);
  });
});
