// Arayüz taslakları (1A+1C, 2A+2B, 3A+3B, 4A+4B): çizimlerin saf hesapları.
import { describe, expect, it } from 'vitest';
import { bagTuru, BAG_TURLERI } from '../src/alan/iliski-turleri';
import { bagYayi, halkaYerlesimi } from '../src/arayuz/yerlesim';
import { kirikEksen, satirlaraDagit, yilAdimi } from '../src/alan/cizelge-eksen';

describe('bağ türü', () => {
  it('ilişki türünü çizimdeki türüne çevirir; bilinmeyen tür "diğer" olur', () => {
    expect(bagTuru('ebeveyn')).toBe('aile');
    expect(bagTuru('kardes')).toBe('aile');
    expect(bagTuru('dusman')).toBe('dusmanlik');
    expect(bagTuru('rakip')).toBe('dusmanlik');
    expect(bagTuru('arkadas')).toBe('dostluk');
    expect(bagTuru('sahnede')).toBe('sahne');
    expect(bagTuru('uye')).toBe('diger');
    expect(bagTuru('uydurma-tur')).toBe('diger');
    expect(bagTuru('dusman', true)).toBe('baglanti');
    expect(new Set(BAG_TURLERI.map((t) => t.kod)).size).toBe(BAG_TURLERI.length);
  });
});

describe('odak halkası', () => {
  const kenarlar = [{ a: 'm', b: 'x' }, { a: 'y', b: 'm' }, { a: 'm', b: 'z' }, { a: 'x', b: 'u' }, { a: 'u', b: 'v' }];
  it('merkez ortada; doğrudan bağlılar ilk, onların bağlıları dış halkada', () => {
    const { konum, halkalar } = halkaYerlesimi(['x', 'm', 'u', 'y', 'z', 'v'], kenarlar, 'm');
    expect(konum.get('m')).toEqual({ x: 0, y: 0 });
    const r = (k: string) => Math.hypot(konum.get(k)!.x, konum.get(k)!.y);
    expect(halkalar.length).toBe(3);
    for (const k of ['x', 'y', 'z']) expect(r(k)).toBeCloseTo(halkalar[0]);
    expect(r('u')).toBeCloseTo(halkalar[1]);
    expect(r('v')).toBeCloseTo(halkalar[2]);
    expect(halkalar[0]).toBeLessThan(halkalar[1]);
  });
  it('rastgele değildir; aynı girdi aynı yerleşimi verir ve sıra anahtarı ilk halkayı dizer', () => {
    const a = halkaYerlesimi(['m', 'x', 'y', 'z'], kenarlar, 'm', (k) => ({ x: '2', y: '0', z: '1' } as Record<string, string>)[k] ?? k);
    const b = halkaYerlesimi(['z', 'y', 'm', 'x'], kenarlar, 'm', (k) => ({ x: '2', y: '0', z: '1' } as Record<string, string>)[k] ?? k);
    expect([...a.konum.entries()].sort()).toEqual([...b.konum.entries()].sort());
    // İlk sıradaki y en üstte (-90°) başlar.
    const aci = (k: string) => (Math.atan2(a.konum.get(k)!.y, a.konum.get(k)!.x) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    expect(aci('y')).toBeLessThan(aci('z'));
    expect(aci('z')).toBeLessThan(aci('x'));
  });
  it('merkeze bağlanmayan kayıt en dış halkaya gider; merkez listede yoksa boş döner', () => {
    const { konum, halkalar } = halkaYerlesimi(['m', 'x', 'yalniz'], [{ a: 'm', b: 'x' }], 'm');
    expect(Math.hypot(konum.get('yalniz')!.x, konum.get('yalniz')!.y)).toBeCloseTo(halkalar[halkalar.length - 1]);
    expect(halkaYerlesimi(['x'], [], 'm').konum.size).toBe(0);
  });
  it('çok kayıtlı halka, kayıtlar sığacak kadar büyür', () => {
    const kodlar = ['m', ...Array.from({ length: 40 }, (_, i) => `k${i}`)];
    const { halkalar } = halkaYerlesimi(kodlar, kodlar.slice(1).map((k) => ({ a: 'm', b: k })), 'm');
    expect((2 * Math.PI * halkalar[0]) / 40).toBeGreaterThanOrEqual(109);
  });
});

describe('bağ yayı', () => {
  it('aynı iki kayıt arasındaki bağlar ayrı yaylara ayrılır', () => {
    const a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
    const y0 = bagYayi(a, b, 10, 10, 0, 2), y1 = bagYayi(a, b, 10, 10, 1, 2);
    expect(y0.d).not.toBe(y1.d);
    expect(Math.sign(y0.etiket.y)).toBe(-Math.sign(y1.etiket.y));
    // Tek bağ düz kalır.
    expect(bagYayi(a, b, 10, 10).etiket.y).toBeCloseTo(0);
  });
  it('aynı halkadaki karşılıklı iki kaydın bağı merkezin üstünden geçmez', () => {
    const y = bagYayi({ x: -200, y: 0 }, { x: 200, y: 0 }, 10, 10, 0, 1, true);
    expect(Math.hypot(y.etiket.x, y.etiket.y)).toBeGreaterThan(100);
  });
});

describe('kırık eksen', () => {
  it('uzun boşluğu kısaltır; kümeler doğrusal kalır ve sıra korunur', () => {
    const e = kirikEksen([[0, 0], [3900, 3940], [4120, 4125]], 1000);
    expect(e.kiriklar.length).toBe(1);
    expect(e.kiriklar[0].bas).toBeLessThan(3900);
    expect(e.genislik).toBeCloseTo(1000, 0);
    const xs = [0, 3900, 3940, 4120, 4125].map(e.konum);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    // Kırık olmasaydı 0 ile 3900 arası eksenin %94'ünü kaplardı; şimdi 4120–4125 kümesi okunacak genişlikte.
    expect(e.konum(4125) - e.konum(4120)).toBeGreaterThan(5);
    expect(e.konum(3900) - e.konum(0)).toBeLessThan(500);
  });
  it('kayıt olan yerde kırık olmaz: bant boşluğu doldurursa eksen kırılmaz', () => {
    const e = kirikEksen([[0, 0], [0, 4000], [4000, 4000]], 800);
    expect(e.kiriklar.length).toBe(0);
  });
  it('piksel → an dönüşümü konumun tersidir', () => {
    const e = kirikEksen([[100, 200], [5000, 5100]], 600);
    for (const t of [100, 150, 200, 5000, 5100]) expect(e.an(e.konum(t))).toBeCloseTo(t, 3);
  });
  it('boş ya da tek noktalık girdide de çalışır', () => {
    expect(kirikEksen([], 300).genislik).toBeGreaterThan(0);
    const e = kirikEksen([[7, 7]], 300);
    expect(Number.isFinite(e.konum(7))).toBe(true);
  });
});

describe('şerit satırları ve yıl adımı', () => {
  it('çakışan öğeler alt satıra iner, boş satır yeniden kullanılır', () => {
    expect(satirlaraDagit([[0, 100], [50, 150], [120, 200], [160, 250]])).toEqual([0, 1, 0, 1]);
    expect(satirlaraDagit([[0, 10], [0, 10], [0, 10]])).toEqual([0, 1, 2]);
  });
  it('yıl çizgileri en az verilen piksel aralığıyla seçilir', () => {
    expect(yilAdimi(10, 1000)).toBe(1);
    expect(yilAdimi(400, 800)).toBe(50);
    expect(yilAdimi(1, 10)).toBe(10);
  });
});
