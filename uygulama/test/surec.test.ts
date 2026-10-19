import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { islemAciklamasi } from '../src/alan/islem-metni';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}
const ADIMLAR = [
  { kod: 'yemin', ad: 'Yemin', onkosul: [], esik: true, sonuc: true, etki: 'Makam hukuken geçer' },
  { kod: 'tac', ad: 'Taç giyme', onkosul: ['yemin'], esik: false, sonuc: false, etki: '' },
];

describe('süreçler (§3.10)', () => {
  it('sonuç kuralın açık tanımına bağlıdır; eksik adım bilinmiyordur; iki kural farklı sonuç verebilir', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const makam = kayit('Kuzey tahtı', 'makam');
    const meclis = kayit('Başkent meclisi', 'topluluk');
    const tören = kayit('Taç töreni', 'olay');
    expect(() => h.surecKuraliOlustur({ evren, sahip: tören, ad: 'x' })).toThrow(/süreç kuralı eklenmez/);
    const { kod: gelenek } = h.surecKuraliOlustur({ evren, sahip: makam, ad: 'Kuzey geleneği' });
    h.surecKuraliYaz({ evren, kod: gelenek, tanim: { ad: 'Kuzey geleneği', kosullar: 'Varis yetişkin olmalı', adimlar: ADIMLAR } });
    expect(() => h.surecKuraliYaz({ evren, kod: gelenek, tanim: { ad: 'x', kosullar: '', adimlar: [ADIMLAR[1], ADIMLAR[0]] } })).toThrow(/önceki bir adım/);
    const { kod: hukuk } = h.surecKuraliOlustur({ evren, sahip: meclis, ad: 'Başkent hukuku' });
    h.surecKuraliYaz({ evren, kod: hukuk, tanim: { ad: 'Başkent hukuku', kosullar: '', adimlar: [{ kod: 'tescil', ad: 'Meclis tescili', onkosul: [], esik: false, sonuc: true, etki: '' }] } });

    h.surecBagla({ evren, olay: tören, kural: gelenek, bagli: true });
    h.surecBagla({ evren, olay: tören, kural: hukuk, bagli: true });
    let s = h.olaySurecleri({ evren, olay: tören });
    expect(s.surecler.map((x) => x.sonuc.durum)).toEqual(['bilinmiyor', 'bilinmiyor']);
    expect(s.surecler[0].sonuc.yazi).toContain('“olmadı” sayılmaz');

    // Tören yarıda kaldı ama yemin tamam: geleneğe göre makam geçti, eşik geçildi.
    h.surecAdimi({ evren, olay: tören, kural: gelenek, adim: 'yemin', durum: 'tamam' });
    h.surecAdimi({ evren, olay: tören, kural: gelenek, adim: 'tac', durum: 'yarida' });
    h.surecAdimi({ evren, olay: tören, kural: hukuk, adim: 'tescil', durum: 'yapilmadi' });
    s = h.olaySurecleri({ evren, olay: tören });
    expect(s.surecler[0].sonuc).toMatchObject({ durum: 'dogdu', esik: 'Yemin' });
    expect(s.surecler[1].sonuc.durum).toBe('dogmadi');
    expect(s.catisma).toBe(true);
    h.surecFiili({ evren, olay: tören, kural: gelenek });
    expect(h.olaySurecleri({ evren, olay: tören }).surecler.map((x) => x.fiili)).toEqual([true, false]);

    // Önkoşul çelişkisi: olay silinmez, denetim gösterir.
    expect(h.denetimler({ evren }).acik.filter((b) => b.kural === 'surec')).toHaveLength(0);
    h.surecAdimi({ evren, olay: tören, kural: gelenek, adim: 'yemin', durum: 'yapilmadi' });
    const d = h.denetimler({ evren });
    const b = d.acik.filter((x) => x.kural === 'surec');
    expect(b).toHaveLength(1);
    expect(b[0].hukum).toBe('celiski');
    expect(b[0].dayanak).toContain('önce “Yemin” gerekir');
    expect(d.kurallar.find((k) => k.kural === 'surec')!.sonuc).toBe('bulgu_var');
    expect(h.olaySurecleri({ evren, olay: tören }).surecler[0].celismeler).toHaveLength(1);

    const gunluk = h.islemGunlugu({ evren, sinir: 50 }).map((x) => islemAciklamasi(x.tur, x.veri)).join('\n');
    expect(gunluk).toContain('“Kuzey geleneği” kuralında “Taç giyme” yarıda kaldı');
  });

  it('iki cihazda aynı adım farklı işaretlenirse çatışma olur ve çözülür; tablolar günlükten kurulur', () => {
    const m = cihaz('Masaüstü'), t = cihaz('Tablet');
    const { kod: evren } = m.evrenOlustur({ ad: 'Kuzey' });
    const makam = m.kayitOlustur({ evren, ad: 'Taht', tur: 'makam' }).kod;
    const olay = m.kayitOlustur({ evren, ad: 'Tören', tur: 'olay' }).kod;
    const { kod } = m.surecKuraliOlustur({ evren, sahip: makam, ad: 'Gelenek' });
    m.surecKuraliYaz({ evren, kod, tanim: { ad: 'Gelenek', kosullar: '', adimlar: ADIMLAR } });
    m.surecBagla({ evren, olay, kural: kod, bagli: true });
    t.evreniDisaridanKur({ kod: evren, islemler: m.islemleriVer({ evren, gorulen: {} }) });
    m.surecAdimi({ evren, olay, kural: kod, adim: 'yemin', durum: 'tamam' });
    t.surecAdimi({ evren, olay, kural: kod, adim: 'yemin', durum: 'yarida' });
    const ab = m.islemleriVer({ evren, gorulen: t.gorulenler({ evren }) });
    const ba = t.islemleriVer({ evren, gorulen: m.gorulenler({ evren }) });
    t.islemleriAl({ evren, islemler: ab }); m.islemleriAl({ evren, islemler: ba });
    const c = m.catismalar({ evren }).filter((x) => x.tur === 'alan');
    expect(c).toHaveLength(1);
    const ca = c[0] as Extract<typeof c[0], { tur: 'alan' }>;
    expect(ca.alanEtiketi).toBe('“Gelenek” kuralında “Yemin” adımının durumu');
    expect(ca.degerler.map((d) => d.yazi).sort()).toEqual(['Tamamlandı', 'Yarıda kaldı']);
    m.alanCatismasiCoz({ evren, nesne: olay, alan: 'surec:' + kod + ':yemin', islem: ca.degerler.find((d) => d.deger === 'yarida')!.islem });
    expect(m.catismalar({ evren }).filter((x) => x.tur === 'alan')).toHaveLength(0);
    (m as unknown as { evren(k: string): { yenidenKur(): void } }).evren(evren).yenidenKur();
    expect(m.olaySurecleri({ evren, olay }).surecler[0].durumlar).toEqual({ yemin: 'yarida' });
  });
});

describe('makam (§3.8)', () => {
  it('makam kişiden ayrıdır; yürütenler sırayla, boş dönem ve örtüşme notlarıyla', () => {
    const h = cihaz('Deneme');
    const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
    const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
    const vali = kayit('Kuzey Valiliği', 'makam');
    const a = kayit('Orvan', 'karakter'), b = kayit('Elin', 'karakter'), c = kayit('Daran', 'karakter');
    h.iliskiEkle({ evren, tur: 'yurutur', a: b, b: vali, baslangic: '405', bitis: '412' });
    h.iliskiEkle({ evren, tur: 'yurutur', a, b: vali, baslangic: '390', bitis: '400' });
    h.iliskiEkle({ evren, tur: 'yurutur', a: c, b: vali, baslangic: '410' });
    const l = h.makamYurutenleri({ evren, makam: vali });
    expect(l.map((x) => x.kisi.ad)).toEqual(['Orvan', 'Elin', 'Daran']);
    expect(l[1].not).toContain('boş dönem');
    expect(l[2].not).toContain('aynı dönemde');
  });
});
