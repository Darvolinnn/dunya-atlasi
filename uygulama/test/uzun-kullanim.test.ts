// Uzun kullanım benzetimi: üç cihaz aynı evrende rastgele (ama her seferinde aynı sırayla) yüzlerce değişiklik yapar,
// ara sıra eşitler, program kapanıp açılır, Drive izni düşer ya da yükleme yarıda kesilir. Sonunda bütün cihazlar
// birebir aynı evreni görmeli; dosyaya yedek ve Drive yedeği geri yüklenince yine aynı evren çıkmalı. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import type { EvrenVt } from '../src/calisan/evren-vt';
import { IZDUSUM_TABLOLARI } from '../src/calisan/izdusum';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: new Uint8Array([7, veri[0], veri[1]]) });

/** Aynı tohumdan hep aynı sayılar. */
function rastgele(tohum: number) {
  let a = tohum >>> 0;
  const sayi = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { sayi, sec: <T>(l: T[]) => l[Math.floor(sayi() * l.length)] };
}

interface Cihaz { ad: string; h: Hizmet; dosyalar: Map<string, Database>; medya: BellekDeposu }
function cihazKur(ad: string, drive: BellekTasiyici, yedek: BellekTasiyici, onceki?: Cihaz): Cihaz {
  const dosyalar = onceki?.dosyalar ?? new Map<string, Database>();
  const medya = onceki?.medya ?? new BellekDeposu();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici, () => new sqlite3.oo1.DB(':memory:'), undefined, (d) => { dosyalar.delete(d); }, () => [...dosyalar.keys()]);
  h.tasiyiciAyarla(drive, yedek);
  return { ad, h, dosyalar, medya };
}

const sema = metinSemasi.schema;
const metinYaz = (h: Hizmet, evren: string, kayit: string, p: string[]) => h.metinKaydet({ evren, kayit, alan: 'govde',
  spans: pmNodeToSpans(metinSemasi, sema.node('doc', null, p.map((x) => sema.node('paragraph', null, x ? [sema.text(x)] : [])))) as never,
  temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
const vt = (h: Hizmet, evren: string) => (h as unknown as { evren(k: string): EvrenVt }).evren(evren);
const SIRASIZ = new Set(['metin_yazanlari', 'metin_catismalari']);
const tablolar = (h: Hizmet, evren: string) => {
  const db = vt(h, evren).db;
  return Object.fromEntries(IZDUSUM_TABLOLARI.map((t) => {
    const satirlar = db.selectObjects(`SELECT * FROM ${t} ORDER BY rowid`)
      .map((r) => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([, v]) => !(v instanceof Uint8Array)))));
    return [t, SIRASIZ.has(t) ? satirlar.sort() : satirlar];
  }));
};
const metinler = (h: Hizmet, evren: string) => vt(h, evren).db.selectObjects("SELECT kayit, alan FROM metinler ORDER BY kayit, alan")
  .map((r) => h.metinAc({ evren, kayit: r.kayit as string, alan: r.alan as string }).spans);

const ADLAR = ['Fener', 'Liman', 'Kale', 'Çarşı', 'Değirmen', 'Köprü', 'Su Kemeri', 'Gözetleme Kulesi'];
const CUMLELER = ['Sis indi.', 'Kıyıda bir ışık yandı.', 'Rüzgâr kuzeye döndü.', 'Kapılar kapandı.', '', 'Çan üç kez çaldı.'];

describe('uzun kullanım benzetimi', () => {
  for (const tohum of [11, 2026]) {
    it(`üç cihaz, yüzlerce rastgele değişiklik, kesintiler: hepsi aynı evrende buluşur; yedekler aynı evreni geri verir (tohum ${tohum})`, async () => {
      const r = rastgele(tohum);
      const drive = new BellekTasiyici();
      const yedek = new BellekTasiyici();
      let cihazlar = ['Masaüstü', 'Dizüstü', 'Tablet'].map((ad) => cihazKur(ad, drive, yedek));
      const { kod: evren } = cihazlar[0].h.evrenOlustur({ ad: 'Sisli Kıyı' });
      cihazlar[0].h.kayitOlustur({ evren, ad: 'Fener', tur: 'mekan' });
      await cihazlar[0].h.esitle();
      for (const c of cihazlar.slice(1)) await c.h.evreniIndir({ kod: evren });

      // Drive'ın ara sıra yüklemenin ortasında bağlantıyı koparması.
      const asilYukle = drive.yukle.bind(drive);
      let kopacak = 0;
      drive.yukle = async (...a: Parameters<BellekTasiyici['yukle']>) => {
        if (kopacak > 0 && --kopacak === 0) throw new Error('Bağlantı koptu.');
        return asilYukle(...a);
      };

      let sayac = 0;
      for (let adim = 0; adim < 350; adim++) {
        const i = Math.floor(r.sayi() * cihazlar.length);
        const c = cihazlar[i];
        const h = c.h;
        const kayitlar = h.kayitlar({ evren });
        const zar = r.sayi();
        if (zar < 0.1 || !kayitlar.length) h.kayitOlustur({ evren, ad: `${r.sec(ADLAR)} ${++sayac}`, tur: r.sec(['mekan', 'karakter', 'olay']) });
        else if (zar < 0.35) h.kayitDegistir({ evren, kod: r.sec(kayitlar).kod, alan: 'ozet', deger: `${c.ad} ${adim}. adımda yazdı` });
        else if (zar < 0.55) metinYaz(h, evren, r.sec(kayitlar).kod, [r.sec(CUMLELER), `${c.ad}: ${adim}`, r.sec(CUMLELER)]);
        else if (zar < 0.62 && kayitlar.length > 1) {
          const a = r.sec(kayitlar), b = r.sec(kayitlar);
          if (a.kod !== b.kod) h.iliskiEkle({ evren, a: a.kod, b: b.kod, tur: r.sec(['dusman', 'rakip', 'arkadas']) });
        } else if (zar < 0.66 && kayitlar.length > 3) h.kayitSil({ evren, kod: r.sec(kayitlar).kod });
        else if (zar < 0.7) await h.gorselEkle({ evren, kod: r.sec(kayitlar).kod, dosyaAdi: `g${adim}.png`, tur: 'image/png', veri: new Uint8Array([adim & 0xff, adim >> 8, i, 9]) });
        else if (zar < 0.88) await h.esitle();
        else if (zar < 0.92) cihazlar[i] = cihazKur(c.ad, drive, yedek, c); // program kapanıp açıldı
        else if (zar < 0.95) { kopacak = 1 + Math.floor(r.sayi() * 3); await h.esitle(); kopacak = 0; }
        else if (zar < 0.97) { drive.izinYok = true; await h.esitle(); drive.izinYok = false; h.tasiyiciAyarla(drive, yedek); } // izin düştü, kullanıcı yeniledi
        else h.kayitDegistir({ evren, kod: r.sec(kayitlar).kod, alan: 'ad', deger: `${r.sec(ADLAR)} ${++sayac}` });
      }

      // Herkes birkaç kez eşitler: bütün cihazlar birebir aynı evreni görmeli.
      for (let tur = 0; tur < 3; tur++) for (const c of cihazlar) { const d = await c.h.esitle(); expect(d.hata).toBeNull(); }
      const ilk = cihazlar[0];
      const toplam = vt(ilk.h, evren).islemSayisi();
      expect(toplam).toBeGreaterThan(250);
      for (const c of cihazlar.slice(1)) {
        expect(vt(c.h, evren).islemSayisi()).toBe(toplam);
        expect(vt(c.h, evren).bekleyenSayisi()).toBe(0);
        expect(tablolar(c.h, evren)).toEqual(tablolar(ilk.h, evren));
        expect(metinler(c.h, evren)).toEqual(metinler(ilk.h, evren));
      }
      // Kullanılan her görsel her cihazda var.
      const gorseller = (vt(ilk.h, evren).db.selectValues('SELECT ad FROM medya') as string[]);
      for (const c of cihazlar) for (const g of gorseller) expect(c.medya.dosyalar.has(g)).toBe(true);

      // Dosyaya tam yedek yeni bir bilgisayarda aynı evreni verir.
      const { veri } = await ilk.h.yedekAl({ evren });
      const yeni = cihazKur('Yeni bilgisayar', new BellekTasiyici(), new BellekTasiyici());
      expect(await yeni.h.yedektenYukle({ veri })).toMatchObject({ kod: evren, ayri: false, eksikGorseller: [] });
      expect(tablolar(yeni.h, evren)).toEqual(tablolar(ilk.h, evren));
      expect(metinler(yeni.h, evren)).toEqual(metinler(ilk.h, evren));

      // Drive'daki günlük yedek de (elle yenilenmiş hâliyle) aynı evreni verir.
      await ilk.h.drivedaYedekAl({ evren });
      const [son] = await ilk.h.driveYedekleri({ evren });
      const ucuncu = cihazKur('Üçüncü bilgisayar', new BellekTasiyici(), yedek);
      expect(await ucuncu.h.drivedanGeriYukle({ id: son.id })).toMatchObject({ kod: evren, ayri: false, eksikGorseller: [], bozukGorseller: [] });
      expect(tablolar(ucuncu.h, evren)).toEqual(tablolar(ilk.h, evren));
    }, 120_000);
  }
});
