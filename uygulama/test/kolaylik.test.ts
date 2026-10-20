// Kullanım kolaylığı paketi (K28): not panosu, "Ne yazıyorsunuz?", araç tanıtımları, yol satırında seri, önceki sahnenin son paragrafı.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { uzakGorunumMu, uzakTurMu } from '../src/alan/turler';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
  return new Hizmet(ac, 'Deneme', 'x');
}
const s = metinSemasi.schema;
function yaz(h: Hizmet, evren: string, kayit: string, ...satirlar: string[]) {
  const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
  const doc = s.node('doc', null, satirlar.map((x) => s.node('paragraph', null, x ? [s.text(x)] : [])));
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, doc), temel });
}

describe('not panosu (§4.6, K28)', () => {
  it('notun türü ve durumu; durum yazılmamışsa fikir; çelişki notu Karar bekleyenlerde', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma' });
    const a = h.kayitOlustur({ evren, ad: 'Sarnıçta eski mühür', tur: 'not' }).kod;
    const b = h.kayitOlustur({ evren, ad: 'Arşive girmiş miydi?', tur: 'not' }).kod;
    h.kayitAlanYaz({ evren, kod: a, alan: 'not_turu', deger: 'sahne_fikri' });
    h.kayitAlanYaz({ evren, kod: b, alan: 'not_turu', deger: 'celiski' });
    h.kayitAlanYaz({ evren, kod: b, alan: 'not_durumu', deger: 'kontrol' });
    expect(() => h.kayitAlanYaz({ evren, kod: b, alan: 'not_durumu', deger: 'uydurma' })).toThrow();
    const pano = h.notPanosu({ evren });
    expect(pano.map((n) => [n.ad, n.notTuru, n.notDurumu])).toEqual([
      ['Arşive girmiş miydi?', 'celiski', 'kontrol'], ['Sarnıçta eski mühür', 'sahne_fikri', 'fikir'],
    ]);
    expect(h.meseleler({ evren }).celiskiNotlari.map((n) => n.kod)).toEqual([b]);
    // Kullanılan çelişki notu Karar bekleyenlerden düşer.
    h.kayitAlanYaz({ evren, kod: b, alan: 'not_durumu', deger: 'kullanildi' });
    expect(h.meseleler({ evren }).celiskiNotlari).toEqual([]);
  });
});

describe('Ne yazıyorsunuz? (§4, K28)', () => {
  it('evrene işlemle yazılır, değişir, kaldırılır; uzak türler ve grafikler kurguya göredir', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma', kurgu: 'gercekci' });
    expect(h.evrenBilgisi({ evren }).kurguTuru).toBe('gercekci');
    h.kurguTuruYaz({ evren, kurgu: 'fantastik' });
    expect(h.evrenBilgisi({ evren }).kurguTuru).toBe('fantastik');
    expect(() => h.kurguTuruYaz({ evren, kurgu: 'uydurma' })).toThrow();
    h.kurguTuruYaz({ evren, kurgu: null });
    expect(h.evrenBilgisi({ evren }).kurguTuru).toBeNull();
    expect(() => h.evrenOlustur({ ad: 'Öbürü', kurgu: 'yok' })).toThrow();
    const islem = h.islemGunlugu({ evren, sinir: 5 }).find((i) => i.tur === 'evren_kurgu_turu')!;
    expect(islemAciklamasi(islem.tur, islem.veri as Record<string, unknown>)).toMatch(/Ne yazdığınız/);
    expect(uzakTurMu('gercekci', 'buyu_sistemi')).toBe(true);
    expect(uzakTurMu('fantastik', 'buyu_sistemi')).toBe(false);
    expect(uzakTurMu(null, 'buyu_sistemi')).toBe(false);
    expect(uzakGorunumMu('polisiye', 'gokyuzu')).toBe(true);
  });
});

describe('araç tanıtımları ve yazma ekranı (§5.10, K28)', () => {
  it('sayılar kayıtlı veriden; sahne bölümün içinde de esere sayılır', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma' });
    expect(h.aracTanitimlari({ evren })).toEqual({ enCokSahne: null, karakter: 0, tarihli: false, mekan: 0, eser: 0 });
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    const bolum = h.anlatiOlustur({ evren, ust: eser, ad: 'Vergi Günü', tur: 'bolum' }).kod;
    h.anlatiOlustur({ evren, ust: eser, ad: 'Önsöz', tur: 'sahne' });
    for (let i = 0; i < 3; i++) h.anlatiOlustur({ evren, ust: bolum, ad: `Sahne ${i}`, tur: 'sahne' });
    h.kayitOlustur({ evren, ad: 'Lale', tur: 'karakter' });
    h.kayitOlustur({ evren, ad: 'Arşiv', tur: 'mekan' });
    expect(h.aracTanitimlari({ evren })).toEqual({ enCokSahne: { eser, sayi: 4 }, karakter: 1, tarihli: false, mekan: 1, eser: 1 });
  });

  it('yol satırında seri; boş sahnede önceki sahnenin son dolu paragrafı', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma' });
    const seri = h.kayitOlustur({ evren, ad: 'Hatıra', tur: 'seri' }).kod;
    const eser = h.kayitOlustur({ evren, ad: 'Unutulanlar', tur: 'eser' }).kod;
    h.anlatiYerlestir({ evren, kod: eser, ust: seri });
    const bir = h.anlatiOlustur({ evren, ust: eser, ad: 'Arşiv', tur: 'sahne' }).kod;
    const iki = h.anlatiOlustur({ evren, ust: eser, ad: 'Başkâtip', tur: 'sahne' }).kod;
    yaz(h, evren, bir, 'Merdivenler soğuktu.', 'Deniz’in sesi yukarıdan geldi.', '');
    const yer = h.anlatiYeri({ evren, kod: iki });
    expect(yer.seri).toEqual({ kod: seri, ad: 'Hatıra' });
    expect(yer.onceki?.kod).toBe(bir);
    expect(h.sonParagraf({ evren, kod: bir })).toBe('Deniz’in sesi yukarıdan geldi.');
    expect(h.sonParagraf({ evren, kod: iki })).toBe('');
  });
});
