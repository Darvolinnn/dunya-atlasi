import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import type { Spans } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const uzaktan: string[][] = [];
  const h = new Hizmet(ac, ad, 'x', (_e, _t, kayitlar, u) => { if (u) uzaktan.push(kayitlar); });
  return { h, uzaktan };
}

/** İki cihaz arasında bütün değişiklikleri karşılıklı gönderir. */
function esitle(a: Hizmet, b: Hizmet, evren: string) {
  const ab = a.islemleriVer({ evren, gorulen: b.gorulenler({ evren }) });
  const ba = b.islemleriVer({ evren, gorulen: a.gorulenler({ evren }) });
  b.islemleriAl({ evren, islemler: ab });
  a.islemleriAl({ evren, islemler: ba });
}

function ikiCihaz() {
  const m = cihaz('Masaüstü');
  const t = cihaz('Tablet');
  const { kod: evren } = m.h.evrenOlustur({ ad: 'Kuzey' });
  t.h.evreniDisaridanKur({ kod: evren, islemler: m.h.islemleriVer({ evren, gorulen: {} }) });
  return { m: m.h, t: t.h, evren, tUzaktan: t.uzaktan };
}

const metni = (h: Hizmet, evren: string, kayit: string) => {
  const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
  return d.textBetween(0, d.content.size, '\n');
};
const parcalar = (...p: string[]) => {
  const s = metinSemasi.schema;
  return pmNodeToSpans(metinSemasi, s.node('doc', null, p.map((x) => s.node('paragraph', null, x ? [s.text(x)] : [])))) as Spans;
};
const yaz = (h: Hizmet, evren: string, kayit: string, ...p: string[]) =>
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: parcalar(...p), temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
/** İki cihazdaki görünen durum aynı mı? */
const durum = (h: Hizmet, evren: string) => ({
  kayitlar: h.kayitlar({ evren }).map(({ duzenleme: _d, ...k }) => k).sort((a, b) => a.kod.localeCompare(b.kod)),
  cop: h.kayitlar({ evren, cop: true }).map((k) => k.kod).sort(),
  catisma: h.catismalar({ evren }).map((c) => c.tur + (c.tur === 'alan' ? c.alan + c.degerler.map((d) => JSON.stringify(d.deger)).join() : c.kayit)).sort(),
  metinler: h.kayitlar({ evren }).map((k) => metni(h, evren, k.kod)).sort(),
});

describe('cihazlar arası eşitleme', () => {
  it('evren başka cihaza kurulur, değişiklikler iki yöne gider', () => {
    const { m, t, evren, tUzaktan } = ikiCihaz();
    expect(t.evrenler().map((e) => e.ad)).toEqual(['Kuzey']);
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    esitle(m, t, evren);
    expect(t.kayit({ evren, kod }).ad).toBe('Velkar');
    expect(tUzaktan.flat()).toContain(kod);
    t.kayitDegistir({ evren, kod, alan: 'ozet', deger: 'Kuzey valisi' });
    yaz(t, evren, kod, 'Tablette yazıldı');
    esitle(m, t, evren);
    expect(m.kayit({ evren, kod }).ozet).toBe('Kuzey valisi');
    expect(metni(m, evren, kod)).toBe('Tablette yazıldı');
    // Aynı işlem iki kez gelirse bir kez uygulanır.
    expect(t.islemleriAl({ evren, islemler: m.islemleriVer({ evren, gorulen: {} }) }).alinan).toBe(0);
  });

  it('birbirini görmeden yapılan değişiklikler her iki cihazda aynı sonucu verir', () => {
    const { m, t, evren } = ikiCihaz();
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    esitle(m, t, evren);
    // Farklı alanlar: kendiliğinden birleşir.
    m.kayitDegistir({ evren, kod, alan: 'ozet', deger: 'Vali' });
    t.kayitDegistir({ evren, kod, alan: 'okunus', deger: 'Vel-kar' });
    t.kayitListe({ evren, kod, liste: 'etiket', ekle: 'birinci kitap' });
    m.kayitListe({ evren, kod, liste: 'lakap', ekle: 'Kılıç' });
    const b = t.kayitOlustur({ evren, ad: 'Taşköprü', tur: 'mekan' }).kod;
    esitle(m, t, evren);
    expect(durum(m, evren)).toEqual(durum(t, evren));
    expect(m.kayit({ evren, kod })).toMatchObject({ ozet: 'Vali', okunus: 'Vel-kar', etiketler: ['birinci kitap'], lakaplar: ['Kılıç'] });
    expect(m.kayit({ evren, kod: b }).ad).toBe('Taşköprü');
    expect(m.catismalar({ evren })).toEqual([]);
  });

  it('aynı alana iki değer: ikisi de saklanır, seçilince çözülür', () => {
    const { m, t, evren } = ikiCihaz();
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    esitle(m, t, evren);
    m.kayitDegistir({ evren, kod, alan: 'ozet', deger: 'Kuzey valisi' });
    t.kayitDegistir({ evren, kod, alan: 'ozet', deger: 'Güney valisi' });
    m.kayitTarih({ evren, kod, ifade: '412' });
    t.kayitTarih({ evren, kod, ifade: '415' });
    esitle(m, t, evren);
    expect(durum(m, evren)).toEqual(durum(t, evren));
    expect(m.kayit({ evren, kod }).ozet).toBe(t.kayit({ evren, kod }).ozet);
    const c = m.catismalar({ evren });
    expect(c.length).toBe(2);
    const ozet = c.find((x) => x.tur === 'alan' && x.alan === 'ozet')!;
    expect(ozet.tur === 'alan' && ozet.degerler.map((d) => d.deger).sort()).toEqual(['Güney valisi', 'Kuzey valisi']);
    expect(ozet.tur === 'alan' && ozet.degerler.map((d) => d.kurulum).sort()).toEqual(['başka bir cihaz', 'bu cihaz']);
    // Tablette, masaüstünün değeri seçilir.
    const tc = t.catismalar({ evren, kod }).find((x) => x.tur === 'alan' && x.alan === 'ozet')!;
    const kuzey = tc.tur === 'alan' ? tc.degerler.find((d) => d.deger === 'Kuzey valisi')! : null;
    t.alanCatismasiCoz({ evren, nesne: kod, alan: 'ozet', islem: kuzey!.islem });
    esitle(m, t, evren);
    expect(m.kayit({ evren, kod }).ozet).toBe('Kuzey valisi');
    expect(m.catismalar({ evren }).map((x) => x.tur === 'alan' && x.alan)).toEqual(['tarih']);
    expect(durum(m, evren)).toEqual(durum(t, evren));
  });

  it('aynı değeri yazan iki cihaz çatışma sayılmaz', () => {
    const { m, t, evren } = ikiCihaz();
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    esitle(m, t, evren);
    m.kayitDegistir({ evren, kod, alan: 'karar', deger: 'fikir' });
    t.kayitDegistir({ evren, kod, alan: 'karar', deger: 'fikir' });
    esitle(m, t, evren);
    expect(m.catismalar({ evren })).toEqual([]);
  });

  it('silinmiş kayda yazılan metin kaybolmaz, kayıt kendiliğinden geri gelmez', () => {
    const { m, t, evren } = ikiCihaz();
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    esitle(m, t, evren);
    m.kayitSil({ evren, kod });
    yaz(t, evren, kod, 'Üç sayfalık geçmiş');
    t.kayitDegistir({ evren, kod, alan: 'ozet', deger: 'Vali' });
    esitle(m, t, evren);
    for (const h of [m, t]) {
      expect(h.kayit({ evren, kod }).silindi).not.toBeNull();
      expect(metni(h, evren, kod)).toBe('Üç sayfalık geçmiş');
      expect(h.catismalar({ evren })).toEqual([expect.objectContaining({ tur: 'silme', kayit: kod, duzenlemeSayisi: 2 })]);
    }
    // Silindikten sonra (silmeyi görerek) yapılan düzenleme çatışma değildir.
    m.silmeCatismasiCoz({ evren, kayit: kod, geriYukle: false });
    esitle(m, t, evren);
    expect(t.catismalar({ evren })).toEqual([]);
    expect(t.kayit({ evren, kod }).silindi).not.toBeNull();
  });

  it('silme çatışması kaydı geri yükleyerek de çözülür', () => {
    const { m, t, evren } = ikiCihaz();
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    esitle(m, t, evren);
    yaz(t, evren, kod, 'Önce tablette yazıldı'); // tablet önce yazar, sonra masaüstü (görmeden) siler
    m.kayitSil({ evren, kod });
    esitle(m, t, evren);
    expect(t.catismalar({ evren }).map((c) => c.tur)).toEqual(['silme']);
    t.silmeCatismasiCoz({ evren, kayit: kod, geriYukle: true });
    esitle(m, t, evren);
    expect(m.kayit({ evren, kod }).silindi).toBeNull();
    expect(m.catismalar({ evren })).toEqual([]);
  });

  it('farklı paragraflardaki metin değişiklikleri birleşir; aynı paragraf incelemeye düşer', () => {
    const { m, t, evren } = ikiCihaz();
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    yaz(m, evren, kod, 'Bir', 'İki', 'Üç');
    esitle(m, t, evren);
    yaz(m, evren, kod, 'Bir (masaüstü)', 'İki', 'Üç');
    yaz(t, evren, kod, 'Bir', 'İki', 'Üç (tablet)');
    esitle(m, t, evren);
    expect(metni(m, evren, kod)).toBe('Bir (masaüstü)\nİki\nÜç (tablet)');
    expect(metni(t, evren, kod)).toBe(metni(m, evren, kod));
    expect(m.catismalar({ evren })).toEqual([]);

    yaz(m, evren, kod, 'Bir (masaüstü)', 'İki kuzeyde', 'Üç (tablet)');
    yaz(t, evren, kod, 'Bir (masaüstü)', 'İki güneyde', 'Üç (tablet)');
    esitle(m, t, evren);
    expect(metni(t, evren, kod)).toBe(metni(m, evren, kod));
    const c = m.catismalar({ evren });
    expect(c.map((x) => x.tur)).toEqual(['metin']);
    // Üç sürüm gösterilebilir: ortak başlangıç ve iki cihazın yazdığı.
    const mc = c[0];
    if (mc.tur !== 'metin') throw new Error();
    const sur = (b: string[]) => { const d = pmDocFromSpans(metinSemasi, m.metinSurumu({ evren, kayit: kod, alan: 'govde', basliklar: b }).spans as never); return d.textBetween(0, d.content.size, '\n'); };
    expect(sur(mc.temel)).toContain('İki\n');
    expect([sur(mc.a.basliklar), sur(mc.b.basliklar)].sort()).toEqual(['Bir (masaüstü)\nİki güneyde\nÜç (tablet)', 'Bir (masaüstü)\nİki kuzeyde\nÜç (tablet)']);
    m.metinCatismasiCoz({ evren, kayit: kod, alan: 'govde' });
    esitle(m, t, evren);
    expect(t.catismalar({ evren })).toEqual([]);
  });

  it('editör eski sürümün üzerinde kaydederse yazılan kaybolmaz', () => {
    const { m, t, evren } = ikiCihaz();
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    yaz(m, evren, kod, 'Bir', 'İki');
    esitle(m, t, evren);
    const eski = m.metinAc({ evren, kayit: kod, alan: 'govde' }).basliklar; // editör açıldı
    yaz(t, evren, kod, 'Bir', 'İki', 'Tabletten');
    esitle(m, t, evren); // bu arada tabletin değişikliği geldi
    const r = m.metinKaydet({ evren, kayit: kod, alan: 'govde', spans: parcalar('Bir ve masaüstü', 'İki'), temel: eski });
    expect(r.birlesti).toBe(true);
    expect(metni(m, evren, kod)).toBe('Bir ve masaüstü\nİki\nTabletten');
    esitle(m, t, evren);
    expect(metni(t, evren, kod)).toBe('Bir ve masaüstü\nİki\nTabletten');
  });

  it('eksik gelen değişiklik bekletilir, eksik gelince uygulanır', () => {
    const { m, t, evren } = ikiCihaz();
    const a = m.kayitOlustur({ evren, ad: 'A', tur: 'karakter' }).kod;
    m.kayitDegistir({ evren, kod: a, alan: 'ozet', deger: 'özet' });
    const hepsi = m.islemleriVer({ evren, gorulen: t.gorulenler({ evren }) });
    const son = hepsi[hepsi.length - 1];
    expect(t.islemleriAl({ evren, islemler: [son] })).toEqual({ alinan: 0, bekleyen: 1 });
    expect(t.kayitlar({ evren })).toEqual([]);
    expect(t.islemleriAl({ evren, islemler: hepsi.slice(0, -1) })).toEqual({ alinan: hepsi.length, bekleyen: 0 });
    expect(t.kayit({ evren, kod: a }).ozet).toBe('özet');
  });

  it('üç cihaz, karışık sırayla: hepsi aynı sonuca varır', () => {
    const { m, t, evren } = ikiCihaz();
    const p = cihaz('Telefon').h;
    p.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    const { kod } = m.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' });
    esitle(m, t, evren); esitle(m, p, evren);
    m.kayitDegistir({ evren, kod, alan: 'ad', deger: 'Velkar Han' });
    t.kayitDegistir({ evren, kod, alan: 'ad', deger: 'Velkar Bey' });
    p.kayitListe({ evren, kod, liste: 'etiket', ekle: 'kuzey' });
    yaz(p, evren, kod, 'Telefondan');
    esitle(t, p, evren);
    t.kayitDegistir({ evren, kod, alan: 'ozet', deger: 'tabletten' });
    esitle(m, t, evren); esitle(m, p, evren); esitle(t, p, evren);
    expect(durum(m, evren)).toEqual(durum(t, evren));
    expect(durum(t, evren)).toEqual(durum(p, evren));
    expect(m.catismalar({ evren }).map((c) => c.tur === 'alan' && c.alan)).toEqual(['ad']);
  });
});

describe('rastgele sınama', () => {
  it('rastgele değişiklik ve eşitlemelerden sonra bütün cihazlar aynı yerde', () => {
    let tohum = 12345;
    const rnd = (n: number) => { tohum = (tohum * 1103515245 + 12345) % 2147483648; return tohum % n; };
    const { m, t, evren } = ikiCihaz();
    const p = cihaz('Telefon').h;
    p.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    const cihazlar = [m, t, p];
    const kodlar: string[] = [m.kayitOlustur({ evren, ad: 'İlk', tur: 'karakter' }).kod];
    esitle(m, t, evren); esitle(m, p, evren);
    for (let tur = 0; tur < 120; tur++) {
      const h = cihazlar[rnd(3)];
      const gorunen = h.kayitlar({ evren }).map((k) => k.kod).concat(h.kayitlar({ evren, cop: true }).map((k) => k.kod));
      const kod = gorunen[rnd(gorunen.length)];
      switch (rnd(8)) {
        case 0: kodlar.push(h.kayitOlustur({ evren, ad: `K${tur}`, tur: 'mekan' }).kod); break;
        case 1: h.kayitDegistir({ evren, kod, alan: 'ozet', deger: `özet ${rnd(3)}` }); break;
        case 2: h.kayitListe({ evren, kod, liste: 'etiket', ekle: `e${rnd(4)}` }); break;
        case 3: h.kayitSil({ evren, kod }); break;
        case 4: h.kayitGeriYukle({ evren, kod }); break;
        case 5: { const s = metni(h, evren, kod).split('\n'); s[rnd(s.length + 1)] = `p${tur}`; yaz(h, evren, kod, ...s.filter((x) => x !== undefined)); break; }
        case 6: h.kayitTarih({ evren, kod, ifade: String(400 + rnd(5)) }); break;
        case 7: { const a = cihazlar[rnd(3)]; const b = cihazlar[rnd(3)]; if (a !== b) esitle(a, b, evren); break; }
      }
    }
    for (let i = 0; i < 2; i++) { esitle(m, t, evren); esitle(t, p, evren); esitle(m, p, evren); }
    expect(durum(t, evren)).toEqual(durum(m, evren));
    expect(durum(p, evren)).toEqual(durum(m, evren));
    expect(kodlar.length).toBeGreaterThan(3);
  });
});
