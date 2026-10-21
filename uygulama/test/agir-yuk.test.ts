// Ağır yük: yıllarca kullanılmış gibi çok büyük bir evrende (yüz binlerce değişiklik) dosyaya yedek, geri yükleme,
// Drive'a ilk gönderme ve yeni cihaza indirme. Uzun sürdüğü için her sınamada değil, AGIR=1 verilince çalışır:
//   AGIR=1 npx vitest run test/agir-yuk.test.ts
// Sayıyı değiştirmek için AGIR_ISLEM=300000. Örnek adlar uydurmadır.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import type { EvrenVt } from '../src/calisan/evren-vt';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';
import { yeniKod } from '../src/alan/kod';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });
function cihaz(ad: string, drive?: BellekTasiyici) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const h = new Hizmet(ac, ad, 'x', () => {}, new BellekDeposu(), sahteIsleyici, () => new sqlite3.oo1.DB(':memory:'), undefined, (d) => { dosyalar.delete(d); });
  if (drive) h.tasiyiciAyarla(drive);
  return h;
}
const vt = (h: Hizmet, evren: string) => (h as unknown as { evren(k: string): EvrenVt }).evren(evren);
const sema = metinSemasi.schema;
const metinYaz = (h: Hizmet, evren: string, kayit: string, p: string[]) => h.metinKaydet({ evren, kayit, alan: 'govde',
  spans: pmNodeToSpans(metinSemasi, sema.node('doc', null, p.map((x) => sema.node('paragraph', null, [sema.text(x)])))) as never,
  temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
const sure = (bas: number) => `${((performance.now() - bas) / 1000).toFixed(1)} sn`;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

describe.skipIf(!process.env.AGIR)('ağır yük: çok büyük evren', () => {
  it('yedek, geri yükleme, Drive\'a gönderme ve yeni cihaza indirme tamamlanır; sonuç aynıdır', async () => {
    const N = Number(process.env.AGIR_ISLEM) || 200_000;
    const m = cihaz('Masaüstü', new BellekTasiyici());
    const { kod: evren } = m.evrenOlustur({ ad: 'Uzun Seri' });
    let bas = performance.now();
    const kayitlar: string[] = [];
    const e = vt(m, evren);
    for (let blok = 0; e.islemSayisi() < N; blok++) {
      await e.topluYaz(() => {
        for (let i = 0; i < 2000; i++) {
          const n = blok * 2000 + i;
          if (n % 50 === 0) kayitlar.push(m.kayitOlustur({ evren, ad: `Kayıt ${n}`, tur: n % 100 ? 'karakter' : 'mekan' }).kod);
          const k = kayitlar[n % kayitlar.length];
          if (n % 10 === 0) metinYaz(m, evren, k, [`${n}. bölüm. `.repeat(8), 'Gece boyunca fener yandı ve kıyıya üç gemi yanaştı.']);
          else m.kayitDegistir({ evren, kod: k, alan: 'ozet', deger: `Özet ${n}: kuzey kıyısındaki kasabanın ${n}. günü` });
        }
      });
    }
    const toplam = e.islemSayisi();
    console.log(`evren kuruldu: ${toplam} değişiklik, ${kayitlar.length} kayıt, ${sure(bas)}`);

    bas = performance.now();
    const { veri } = await m.yedekAl({ evren });
    console.log(`dosyaya yedek: ${mb(veri.size)}, ${sure(bas)}`);

    const y = cihaz('Yeni bilgisayar');
    bas = performance.now();
    expect((await y.yedekIncele({ veri })).islemSayisi).toBe(toplam);
    console.log(`yedeği inceleme: ${sure(bas)}`);
    bas = performance.now();
    await y.yedektenYukle({ veri });
    console.log(`geri yükleme: ${sure(bas)}`);
    expect(vt(y, evren).islemSayisi()).toBe(toplam);
    expect(y.kayit({ evren, kod: kayitlar[7] })).toEqual(m.kayit({ evren, kod: kayitlar[7] }));

    const drive = new BellekTasiyici();
    m.tasiyiciAyarla(drive);
    bas = performance.now();
    expect((await m.esitle()).hata).toBeNull();
    const boy = [...drive.dosyalar.values()].reduce((n, d) => n + d.veri.length, 0);
    console.log(`Drive'a ilk gönderme: ${drive.dosyalar.size} dosya, ${mb(boy)}, ${sure(bas)}`);
    const t = cihaz('Tablet', drive);
    bas = performance.now();
    await t.evreniIndir({ kod: evren });
    console.log(`yeni cihaza indirme: ${sure(bas)}`);
    expect(vt(t, evren).islemSayisi()).toBe(toplam);
    expect(t.kayit({ evren, kod: kayitlar[kayitlar.length - 1] })).toEqual(m.kayit({ evren, kod: kayitlar[kayitlar.length - 1] }));
    console.log(`bellek (yığın): ${mb(process.memoryUsage().heapUsed)}`);
  }, 3_600_000);

  it('günlüğü tek metin olarak yazılamayacak kadar büyük evrenin (yarım gigabaytı aşan) yedeği alınır ve geri yüklenir', async () => {
    // Eski yedek yolu bütün günlüğü tek metinde birleştiriyordu; tarayıcı motorunda bir metin ~536 milyon harfi aşamaz.
    const N = Number(process.env.AGIR_BUYUK) || 270_000;
    const dosyalar = new Map<string, Database>();
    const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
    const kur = () => new Hizmet(ac, 'Masaüstü', 'x', () => {}, new BellekDeposu(), sahteIsleyici, () => new sqlite3.oo1.DB(':memory:'));
    let m = kur();
    const { kod: evren } = m.evrenOlustur({ ad: 'Çok Uzun Seri' });
    const e = vt(m, evren);
    const ben = m.baslat().kod;
    let sira = e.gorulenler()[ben], saat = Number(e.db.selectValue('SELECT max(saat) FROM islemler'));
    const dolgu = 'Kuzey kıyısında fener bekçisinin günlüğü. '.repeat(48); // ~2 KB
    let bas = performance.now();
    e.db.exec('BEGIN');
    for (let i = 0; i < N; i++) {
      sira++; saat++;
      e.db.exec({ sql: 'INSERT INTO islemler(kod,kurulum,sira,zaman,grup,tur,veri,ikili,gordu,saat) VALUES(?,?,?,?,?,?,?,?,?,?)',
        bind: [yeniKod(), ben, sira, Date.now(), null, 'deneme_buyuk', JSON.stringify({ i, dolgu }), null, JSON.stringify({ [ben]: sira - 1 }), saat] });
    }
    e.db.exec('COMMIT');
    m = kur(); // program yeniden açılır
    const toplam = vt(m, evren).islemSayisi();
    console.log(`büyük günlük kuruldu: ${toplam} değişiklik, ${sure(bas)}`);
    bas = performance.now();
    const { veri } = await m.yedekAl({ evren });
    console.log(`dosyaya yedek: ${mb(veri.size)}, ${sure(bas)}`);
    for (const db of dosyalar.values()) db.close();
    dosyalar.clear();
    const { zipAc } = await import('../src/alan/zip');
    let harf = 0;
    for await (const satir of (await zipAc(veri)).satirlar('islemler.jsonl')) harf += satir.length + 1;
    console.log(`günlüğün metin boyu: ${(harf / 1e6).toFixed(0)} milyon harf`);
    expect(harf).toBeGreaterThan(536_870_888);
    const y = cihaz('Yeni bilgisayar');
    bas = performance.now();
    await y.yedektenYukle({ veri });
    console.log(`geri yükleme: ${sure(bas)}`);
    expect(vt(y, evren).islemSayisi()).toBe(toplam);
  }, 3_600_000);
});
