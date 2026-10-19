import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import type { DairInancTanimi } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, 'Deneme', 'x');
}

function kur() {
  const h = cihaz();
  const { kod: evren } = h.evrenOlustur({ ad: 'Uydurma evren' });
  const kayit = (ad: string, tur = 'karakter') => h.kayitOlustur({ evren, ad, tur }).kod;
  const kral = kayit('Kral Aldren'), vezir = kayit('Vezir Orin'), prenses = kayit('Prenses Elin');
  const { kod: iddia } = h.iddiaEkle({ evren, konu: kral, soru: 'Kralı kim öldürdü?', secenekler: ['Kardeşi', 'Hastalık'], gercek: 0 });
  const secenek = (i: number) => h.kayitIddialari({ evren, kod: kral })[0].secenekler[i].kod;
  const yaz = (x: Partial<DairInancTanimi>, kod: string | null = null) =>
    h.dairInancYaz({ evren, iddia, kod, tanim: { sanan: vezir, hakkinda: prenses, sanilan: 'bilmiyor', tarih: '', aciklama: '', ...x } }).kod;
  const liste = () => h.dairInanclar({ evren, iddia });
  return { h, evren, kral, vezir, prenses, iddia, secenek, yaz, liste };
}

describe('başkasının bilgisine dair inanç (F05)', () => {
  it('kayıtlı bilgi yoksa karşılaştırılmaz; "bilmiyor" sayılmaz', () => {
    const { yaz, liste } = kur();
    yaz({});
    expect(liste()[0]).toMatchObject({ uyum: 'belirsiz', gercekDurum: null });
    expect(liste()[0].neden).toMatch(/kayıtlı bilgi yok/);
  });

  it('hakkında olunanın bilgisiyle karşılaştırılır; tarih verilince o andaki kayıt esas alınır', () => {
    const { h, evren, iddia, prenses, secenek, yaz, liste } = kur();
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: prenses, inanc: 'inaniyor', secenek: secenek(0), baslangic: { ifade: '430' } } });
    const a = yaz({ sanilan: 'bilmiyor' });
    expect(liste()[0]).toMatchObject({ uyum: 'yanlis', gercekDurum: 'Biliyor' });
    yaz({ sanilan: 'biliyor' }, a);
    expect(liste()[0].uyum).toBe('dogru');
    yaz({ sanilan: 'bilmiyor', tarih: '420' }, a);
    expect(liste()[0].uyum).toBe('belirsiz'); // 420'de kayıt yok
    yaz({ sanilan: 'bilmiyor', tarih: '440' }, a);
    expect(liste()[0].uyum).toBe('yanlis');
    expect(() => yaz({ tarih: 'saçma tarih' })).toThrow(/Tarih okunamadı/);
  });

  it('saklayan kişi için "biliyor" sanmak doğrudur; gerçek belirlenmemişse karşılaştırılamaz', () => {
    const { h, evren, iddia, kral, vezir, prenses, secenek, yaz, liste } = kur();
    h.bilgiEkle({ evren, bilgi: { iddia, bilen: prenses, inanc: 'inaniyor', secenek: secenek(0), saklama: [vezir] } });
    yaz({ sanilan: 'biliyor' });
    expect(liste()[0]).toMatchObject({ uyum: 'dogru', gercekDurum: 'Biliyor ama saklıyor' });
    h.iddiaDegistir({ evren, kod: iddia, alan: 'gercek', deger: null });
    expect(liste()[0].uyum).toBe('belirsiz');
    void kral;
  });

  it('doğrulama, silme ve iki cihazda çatışma', () => {
    const { h, evren, iddia, vezir, yaz, liste } = kur();
    expect(() => yaz({ hakkinda: vezir })).toThrow(/kendi bilgisi/);
    const a = yaz({ aciklama: 'Saray dedikodusu' });
    const b = cihaz(); b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    yaz({ sanilan: 'supheleniyor' }, a);
    const t = liste()[0].tanim;
    b.dairInancYaz({ evren, iddia, kod: a, tanim: { ...t, sanilan: 'biliyor' } });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    const c = h.catismalar({ evren }).find((x) => x.tur === 'alan' && x.alan === 'dair_inanc');
    if (c?.tur !== 'alan') throw new Error('Çatışma bekleniyordu.');
    const ikinci = c.degerler.find((d) => d.yazi?.includes('“biliyor”'))!;
    h.alanCatismasiCoz({ evren, nesne: a, alan: 'dair_inanc', islem: ikinci.islem });
    expect(h.catismalar({ evren })).toHaveLength(0);
    expect(liste()[0].tanim.sanilan).toBe('biliyor');
    h.dairInancSil({ evren, kod: a });
    expect(liste()).toEqual([]);
    expect(h.islemGunlugu({ evren, sinir: 3 }).some((i) => i.tur === 'dair_inanc_sil')).toBe(true);
  });
  it('birleşmiş kişi kodu yazarken birleştiği kayda çevrilir', () => {
    const { h, evren, vezir, yaz, liste } = kur();
    const a = yaz({});
    const yeni = h.kayitOlustur({ evren, ad: 'Uydurma başvezir', tur: 'karakter' }).kod;
    h.birlestir({ evren, kaynak: vezir, hedef: yeni });
    expect(liste()[0].sanan.kod).toBe(yeni);
    yaz({ sanilan: 'supheleniyor' }, a); // eski tanımla düzenleme
    expect(liste()[0].tanim).toMatchObject({ sanan: yeni, sanilan: 'supheleniyor' });
    yaz({ sanan: vezir });
    expect(liste()[1].tanim.sanan).toBe(yeni);
  });
});
