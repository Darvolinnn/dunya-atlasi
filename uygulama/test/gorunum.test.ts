import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}
const s = metinSemasi.schema;

describe('soy ağacı', () => {
  it('ortak atalar tek düğümdür; soy içi evlilik ve bağın niteliği görünür; dönem süzgeci', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const k = (ad: string) => h.kayitOlustur({ evren, ad, tur: 'karakter' }).kod;
    const ata = k('Ata Varn'), oglu = k('Darel'), kizi = k('Mira'), torun1 = k('Elin'), torun2 = k('Kaelen'), evlatlik = k('Sem'), yabanci = k('Uzak');
    const ebeveyn = (a: string, b: string, rol: string | null = null) => h.iliskiEkle({ evren, tur: 'ebeveyn', a, b, rol });
    ebeveyn(ata, oglu); ebeveyn(ata, kizi);
    ebeveyn(oglu, torun1); ebeveyn(kizi, torun2);
    ebeveyn(oglu, evlatlik, 'evlatlik');
    const evlilik = h.iliskiEkle({ evren, tur: 'es', a: torun1, b: torun2, rol: 'siyasi', baslangic: '420', bitis: '430' }).kod;
    h.iliskiEkle({ evren, tur: 'dusman', a: torun1, b: yabanci });

    const t = h.soyAgaci({ evren, odak: torun1 });
    expect(t.dugumler.map((d) => d.ad).sort()).toEqual(['Ata Varn', 'Darel', 'Elin', 'Kaelen', 'Mira', 'Sem']);
    expect(t.kenarlar.find((x) => x.b === evlatlik)!.rolAdi).toBe('Evlatlık');
    expect(t.soyIci).toEqual([{ kenar: evlilik, ortakAtalar: [{ kod: ata, ad: 'Ata Varn' }] }]);
    // 435'te evlilik bitmiş: eş bağı düşer, ama Kaelen yine kuzen olarak ağaçtadır.
    const t2 = h.soyAgaci({ evren, odak: torun1, an: '435' });
    expect(t2.kenarlar.some((x) => x.tur === 'es')).toBe(false);
    expect(t2.dugumler).toHaveLength(6);
    // 430'da bitiş dışlayıcıdır ama yıl hassasiyetinde belirsizdir.
    expect(h.soyAgaci({ evren, odak: torun1, an: '430' }).kenarlar.find((x) => x.tur === 'es')!.gecerlilik).toBe('belirsiz');
    expect(() => h.iliskiEkle({ evren, tur: 'ebeveyn', a: ata, b: yabanci, rol: 'kral' })).toThrow();
    h.iliskiDegistir({ evren, kod: t.kenarlar.find((x) => x.b === evlatlik)!.kod, alan: 'rol', deger: '' });
    expect(h.soyAgaci({ evren, odak: ata }).kenarlar.find((x) => x.b === evlatlik)!.rol).toBeNull();
  });
});

describe('filtreli ağ', () => {
  it('merkezden derinlikle; ilişki ve kayıt türüyle süzülür; metin bağlantıları ayrı ve isteğe bağlı', async () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const kale = h.kayitOlustur({ evren, ad: 'Kuzey Kalesi', tur: 'mekan' }).kod;
    const lonca = h.kayitOlustur({ evren, ad: 'Gümüş Lonca', tur: 'topluluk' }).kod;
    const usta = h.kayitOlustur({ evren, ad: 'Usta Bren', tur: 'karakter' }).kod;
    const eski = h.kayitOlustur({ evren, ad: 'Eski dost', tur: 'karakter', karar: 'vazgecildi' }).kod;
    h.kayitOlustur({ evren, ad: 'Yalnız kayıt', tur: 'esya' });
    h.iliskiEkle({ evren, tur: 'yasar', a: elin, b: kale, baslangic: '410', bitis: '420' });
    h.iliskiEkle({ evren, tur: 'uye', a: elin, b: lonca });
    h.iliskiEkle({ evren, tur: 'lider', a: usta, b: lonca });
    h.iliskiEkle({ evren, tur: 'arkadas', a: elin, b: eski });

    const ad = (r: { dugumler: { ad: string }[] }) => r.dugumler.map((d) => d.ad);
    expect(ad(h.ag({ evren, merkez: elin }))).toEqual(['Elin', 'Gümüş Lonca', 'Kuzey Kalesi']);
    expect(ad(h.ag({ evren, merkez: elin, derinlik: 2 }))).toEqual(['Elin', 'Gümüş Lonca', 'Kuzey Kalesi', 'Usta Bren']);
    expect(ad(h.ag({ evren, merkez: elin, vazgecilmis: true }))).toContain('Eski dost');
    expect(ad(h.ag({ evren, merkez: elin, iliskiTurleri: ['uye'] }))).toEqual(['Elin', 'Gümüş Lonca']);
    expect(ad(h.ag({ evren, merkez: elin, kayitTurleri: ['mekan'] }))).toEqual(['Elin', 'Kuzey Kalesi']);
    expect(ad(h.ag({ evren, merkez: elin, an: '425' }))).toEqual(['Elin', 'Gümüş Lonca']);
    const tum = h.ag({ evren });
    expect(tum.dugumler).toHaveLength(4);
    expect(tum.baglantisiz).toBe(1);

    const temel = h.metinAc({ evren, kayit: usta, alan: 'govde' }).basliklar;
    await h.metinKaydet({ evren, kayit: usta, alan: 'govde', temel, spans: pmNodeToSpans(metinSemasi, s.node('doc', null, [
      s.node('paragraph', null, [s.text('Eskiden '), s.text('kalede', [s.marks.bag.create({ hedef: kale })]), s.text(' nöbet tuttu.')])])) });
    expect(h.ag({ evren, merkez: usta }).kenarlar.some((k) => k.baglanti)).toBe(false);
    const b = h.ag({ evren, merkez: usta, baglantilar: true });
    expect(b.kenarlar.find((k) => k.baglanti)).toMatchObject({ a: usta, b: kale, etiket: 'Metninde bahsediyor' });
  });
});

describe('durum geçmişi ekranı', () => {
  it('bir özelliğin bütün kayıtlardaki değerleri; bakılan anda geçerlilik', () => {
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const elin = h.kayitOlustur({ evren, ad: 'Elin', tur: 'karakter' }).kod;
    const bren = h.kayitOlustur({ evren, ad: 'Bren', tur: 'karakter' }).kod;
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Unvan', deger: 'Çırak', kip: 'sonraki', baslangic: { ifade: '412' }, bitis: null } });
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'Unvan', deger: 'Lonca Ustası', kip: 'sonraki', baslangic: { ifade: '418' }, bitis: null } });
    h.durumEkle({ evren, kod: elin, durum: { ozellik: 'İkamet', deger: 'Saray', kip: 'anlik', baslangic: { ifade: '420' }, bitis: null } });
    h.durumEkle({ evren, kod: bren, durum: { ozellik: 'unvan', deger: 'Muhafız', kip: 'aralik', baslangic: { ifade: '400' }, bitis: { ifade: '415' } } });
    const g = h.durumGecmisi({ evren, ozellik: 'Unvan', an: '416' });
    expect(g.kayitlar.map((k) => [k.ad, k.durumlar.map((d) => [d.deger, d.gecerli])])).toEqual([
      ['Bren', [['Muhafız', 'hayir']]],
      ['Elin', [['Çırak', 'evet'], ['Lonca Ustası', 'hayir']]],
    ]);
    expect(h.kayitDurumGecmisi({ evren, kod: elin }).map((x) => x.ozellik)).toEqual(['İkamet', 'Unvan']);
  });
});

describe('çizim yerleşimi', () => {
  it('kuşaklar ve eşler; kapalı dal; kuvvet yerleşimi belirlenimci', async () => {
    const { soyYerlesimi, kuvvetYerlesimi } = await import('../src/arayuz/yerlesim');
    const h = cihaz();
    const { kod: evren } = h.evrenOlustur({ ad: 'Kuzey' });
    const k = (ad: string) => h.kayitOlustur({ evren, ad, tur: 'karakter' }).kod;
    const ana = k('Ana'), baba = k('Baba'), cocuk = k('Çocuk'), es = k('Eş'), torun = k('Torun');
    h.iliskiEkle({ evren, tur: 'ebeveyn', a: ana, b: cocuk });
    h.iliskiEkle({ evren, tur: 'ebeveyn', a: baba, b: cocuk });
    h.iliskiEkle({ evren, tur: 'es', a: ana, b: baba });
    h.iliskiEkle({ evren, tur: 'es', a: cocuk, b: es });
    h.iliskiEkle({ evren, tur: 'ebeveyn', a: es, b: torun });
    const t = h.soyAgaci({ evren, odak: cocuk });
    const y = soyYerlesimi(t, new Set());
    expect([ana, baba, cocuk, es, torun].map((x) => y.kusak.get(x))).toEqual([-1, -1, 0, 0, 1]);
    expect(Math.abs(y.konum.get(ana)!.x - y.konum.get(baba)!.x)).toBeLessThan(200);
    const kapali = soyYerlesimi(t, new Set([es]));
    expect(kapali.konum.has(torun)).toBe(false);
    expect(kapali.gizli.get(es)).toBe(1);
    const a = kuvvetYerlesimi(['x', 'y', 'z'], [{ a: 'x', b: 'y' }], 'x');
    expect(a.get('x')).toEqual({ x: 0, y: 0 });
    expect(kuvvetYerlesimi(['x', 'y', 'z'], [{ a: 'x', b: 'y' }], 'x')).toEqual(a);
  });
});
