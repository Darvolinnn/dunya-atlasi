// Hata avı (22 Ekim 2026): her sınama bir bulguyu kanıtlar; düzeltmeden önce kırılıyordu.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { BellekTasiyici } from '../src/calisan/bellek-tasiyici';
import type { Spans } from '../src/veri/api';
import { kayittanSonraTemel } from '../src/arayuz/taslak';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });

function cihaz(ad: string, drive: BellekTasiyici | null = null) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const medya = new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici, undefined, undefined, (d) => { dosyalar.get(d)?.close(); dosyalar.delete(d); },
    () => [...dosyalar.keys()]);
  if (drive) h.tasiyiciAyarla(drive);
  return { h, medya, dosyalar, ac };
}
const s = metinSemasi.schema;
const spansi = (...p: string[]) => pmNodeToSpans(metinSemasi, s.node('doc', null, p.map((x) => s.node('paragraph', null, x ? [s.text(x)] : [])))) as Spans;
const metni = (h: Hizmet, evren: string, kayit: string) => {
  const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
  return d.textBetween(0, d.content.size, '\n');
};

describe('hata avı: veri kaybı ve eşitleme', () => {
  it('yedekten ayrı evren olarak açılan evren başka cihaza indirilebilir', async () => {
    const drive = new BellekTasiyici();
    const m = cihaz('Masaüstü', drive);
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('Kuzeyde doğdu'), temel: m.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar });
    const { veri } = await m.h.yedekAl({ evren });
    // Aynı cihaza geri yükleme: evren zaten var, yedek ayrı bir evren olarak açılır.
    const r = await m.h.yedektenYukle({ veri });
    expect(r.ayri).toBe(true);
    await m.h.esitle();
    expect(m.h.esitlemeDurumu().hata).toBeNull();

    const t = cihaz('Tablet', drive);
    const uzak = await t.h.uzakEvrenler();
    expect(uzak.map((x) => x.kod).sort()).toEqual([evren, r.kod].sort());
    await t.h.evreniIndir({ kod: r.kod });
    expect(t.h.evrenler().map((x) => x.kod)).toEqual([r.kod]);
    expect(metni(t.h, r.kod, v)).toBe('Kuzeyde doğdu');
  });

  it('ayrı açılan evren program yeniden açılınca listeden düşmüşse geri bulunur', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    const { veri } = await m.h.yedekAl({ evren });
    const r = await m.h.yedektenYukle({ veri });
    // Evren listesi bozuldu ya da program kayıttan hemen sonra kapandı: liste satırı yok, dosya duruyor.
    m.ac('/kurulum.db').exec({ sql: 'DELETE FROM evrenler WHERE kod=?', bind: [r.kod] });
    const yeniden = new Hizmet(m.ac, 'Masaüstü', 'x', () => {}, m.medya, sahteIsleyici, undefined, undefined, undefined, () => [...m.dosyalar.keys()]);
    expect(yeniden.evrenler().map((x) => x.kod).sort()).toEqual([evren, r.kod].sort());
  });

  it('yedekten açılan kopyayı bu cihazdan kaldırmak asıl evrenin deneme kopyasını silmez', async () => {
    const m = cihaz('Masaüstü');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const { kod: dal } = m.h.dalOlustur({ evren, ad: 'Kral yaşasaydı' });
    const { veri } = await m.h.yedekAl({ evren });
    const r = await m.h.yedektenYukle({ veri });
    // Yedekten sonra deneme kopyasında yazılan, yalnız bu cihazda.
    const k = m.h.kayitOlustur({ evren: dal, ad: 'Taht', tur: 'diger' }).kod;
    m.h.evrenKaldir({ evren: r.kod });
    expect(m.h.kayit({ evren: dal, kod: k }).ad).toBe('Taht');
    expect(m.dosyalar.has(`/evren-${dal}.db`)).toBe(true);
  });

  it('kayıt sürerken başka cihazın yazısıyla birleşirse ve yazar yazmaya devam ederse öbür cihazın yazısı silinmez', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
    const v = m.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır'), temel: m.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar });
    t.h.evreniDisaridanKur({ kod: evren, islemler: m.h.islemleriVer({ evren, gorulen: {} }) });
    // Masaüstünün editörü bu sürümle açık.
    let temel = m.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar;
    // Tablet bir paragraf ekler; eşitlemeyle masaüstüne gelir (editör o sırada yazılmamış yazı tuttuğu için güncellenmez).
    t.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır', 'Tabletten'), temel: t.h.metinAc({ evren, kayit: v, alan: 'govde' }).basliklar });
    m.h.islemleriAl({ evren, islemler: t.h.islemleriVer({ evren, gorulen: m.h.gorulenler({ evren }) }) });
    // Masaüstünde yazılan kaydedilir; kayıt yanıtı gelmeden yazar bir kelime daha ekler (editör hâlâ birleşmemiş metni gösterir).
    const r = m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır', 'Masaüstünden'), temel });
    expect(r.birlesti).toBe(true);
    temel = kayittanSonraTemel(r, true);
    m.h.metinKaydet({ evren, kayit: v, alan: 'govde', spans: spansi('İlk satır', 'Masaüstünden devam'), temel });
    const son = metni(m.h, evren, v);
    expect(son).toContain('Tabletten');
    expect(son).toContain('Masaüstünden devam');
    expect(son.match(/Masaüstünden/g)).toHaveLength(1);
  });
});
