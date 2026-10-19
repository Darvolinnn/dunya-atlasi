import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  return new Hizmet(ac, ad, 'x');
}

function kur() {
  const h = cihaz('Deneme');
  const { kod: evren } = h.evrenOlustur({ ad: 'Deneme evreni' });
  const kayit = (ad: string, tur: string) => h.kayitOlustur({ evren, ad, tur }).kod;
  const a = kayit('Ardıç', 'sehir'), b = kayit('Boran', 'sehir'), c = kayit('Cemre', 'sehir'), d = kayit('Defne', 'sehir'), y = kayit('Yalnız ada', 'sehir');
  const rota = (ad: string, x: string, z: string, sureler: { kosul: string; gun: number }[]) => {
    const k = kayit(ad, 'rota');
    h.rotaYaz({ evren, kod: k, rota: { a: x, b: z, mesafe: null, sureler, duraklar: [] } });
    return k;
  };
  const ab = rota('Kıyı yolu', a, b, [{ kosul: 'yaz', gun: 2 }, { kosul: 'kış', gun: 5 }]);
  const bc = rota('Geçit', b, c, [{ kosul: 'yaz', gun: 3 }]);
  const ac = rota('Uzun yol', a, c, [{ kosul: 'yaz', gun: 10 }]);
  const cd = rota('Patika', c, d, []);
  return { h, evren, kayit, a, b, c, d, y, ab, bc, ac, cd };
}

describe('en kısa rota (§15-2)', () => {
  it('kayıtlı süre ağında en kısa yolu bulur; süresiz bağlantı yalnızca kroki olur', () => {
    const { h, evren, kayit, a, b, c, d, y, ab, ac } = kur();
    const r = h.enKisaRota({ evren, nereden: a, nereye: c });
    expect(r).toMatchObject({ hukum: 'bulundu', kip: 'sure', toplam: 5 });
    expect(r.adimlar.map((x) => x.rota.ad)).toEqual(['Kıyı yolu', 'Geçit']);
    // Kış koşulunda Geçit'in süresi yok: o koşulda yalnızca Uzun yol'un da süresi yok, kroki döner.
    const k = h.enKisaRota({ evren, nereden: a, nereye: c, kosul: 'kış' });
    expect(k.kip).toBe('kroki');
    expect(k.toplam).toBeNull();
    const kr = h.enKisaRota({ evren, nereden: a, nereye: d });
    expect(kr).toMatchObject({ hukum: 'bulundu', kip: 'kroki', toplam: null });
    expect(kr.eksik.map((x) => x.ad)).toEqual(['Patika']);
    const yok = h.enKisaRota({ evren, nereden: a, nereye: y });
    expect(yok.hukum).toBe('bulunamadi');
    expect(yok.kapsam).toMatch(/Kayıtlı rotalar/);
    // Karakter yalnızca bildiği yolları kullanır (F09).
    const kisi = kayit('Ulak Sema', 'karakter');
    h.iliskiEkle({ evren, tur: 'yolu_bilir', a: kisi, b: ac });
    const bk = h.enKisaRota({ evren, nereden: a, nereye: c, kisi });
    expect(bk.toplam).toBe(5);
    expect(bk.bilinen).toMatchObject({ bildigiRota: 1, kip: 'sure', toplam: 10 });
    // Varsayım paketi kapalı dediği rotayı kullanmaz.
    const { kod: p } = h.paketOlustur({ evren, ad: 'Kıyı kapalı' });
    h.varsayimEkle({ evren, paket: p, varsayim: { tur: 'rota', rota: ab, deger: false } });
    const pr = h.enKisaRota({ evren, nereden: a, nereye: c, paket: p });
    expect(pr.toplam).toBe(10);
    expect(pr.kapsam).toMatch(/1 rota kapalı/);
    expect(() => h.enKisaRota({ evren, nereden: a, nereye: a })).toThrow(/aynı/);
    void b;
  });
});

describe('haber yayılımı (§15-3)', () => {
  it('her yere en erken ne zaman ulaşabileceğini söyler; kimse biliyor sayılmaz', () => {
    const { h, evren, kayit, a, b, c, d, y } = kur();
    const haber = kayit('Kral öldü söylentisi', 'haber');
    const atli = kayit('Atlı ulak', 'haberlesme');
    const kule = kayit('İşaret kulesi', 'haberlesme');
    expect(h.haberYayilimi({ evren, kod: haber }).durum).toBe('cikis_yok');
    h.haberCikisiYaz({ evren, kod: haber, yer: a, tarih: '', kanallar: [] });
    expect(h.haberYayilimi({ evren, kod: haber }).durum).toBe('kanal_yok');
    h.kanalYaz({ evren, kod: atli, tanim: { rotalar: true, kosul: null, carpan: 0.5, baglantilar: [] } });
    h.kanalYaz({ evren, kod: kule, tanim: { rotalar: false, kosul: null, carpan: 1, baglantilar: [{ a: c, b: y, gun: 0.5 }] } });
    expect(h.kanal({ evren, kod: atli })).toMatchObject({ rotalar: true, carpan: 0.5 });
    expect(() => h.kanalYaz({ evren, kod: haber, tanim: { rotalar: true, kosul: null, carpan: 1, baglantilar: [] } })).toThrow(/haberleşme/);
    expect(() => h.kanalYaz({ evren, kod: atli, tanim: { rotalar: true, kosul: null, carpan: 0, baglantilar: [] } })).toThrow(/katsayı/);

    const s = h.haberYayilimi({ evren, kod: haber });
    expect(s.durum).toBe('hesaplandi');
    const gun = Object.fromEntries(s.ulasilan.map((u) => [u.yer.kod, u.gun]));
    expect(gun[b]).toBe(1);
    expect(gun[c]).toBe(2.5);
    expect(gun[y]).toBe(3);
    expect(s.suresiz.map((x) => x.kod)).toEqual([d]);
    expect(s.ulasilan.find((u) => u.yer.kod === y)!.yol).toEqual(['Atlı ulak (Kıyı yolu)', 'Atlı ulak (Geçit)', 'İşaret kulesi']);
    expect(s.not).toMatch(/bildiği demek değil/);
    // Yalnızca kule seçilirse çıkış yerinden ağ kurulamaz.
    h.haberCikisiYaz({ evren, kod: haber, yer: c, tarih: '', kanallar: [kule] });
    const k = h.haberYayilimi({ evren, kod: haber });
    expect(k.ulasilan.map((u) => u.yer.kod)).toEqual([y]);
    expect(h.haberCikisi({ evren, kod: haber }).kanallar.map((x) => x.ad)).toEqual(['İşaret kulesi']);
    // Söylentinin sürümleri ilişkiyle bağlanır.
    const surum = kayit('Kral yaralı söylentisi', 'haber');
    h.iliskiEkle({ evren, tur: 'haber_surumu', a: haber, b: surum });
    expect(h.iliskiler({ evren, kod: haber }).some((x) => x.karsi.kod === surum)).toBe(true);
  });
});
