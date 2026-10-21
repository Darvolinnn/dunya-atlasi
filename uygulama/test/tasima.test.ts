import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { pmDocFromSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi, baglantilar } from '../src/alan/metin-sema';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { zipOku, zipYaz, crc32 } from '../src/alan/zip';
import { iceAktarimPlani } from '../src/calisan/ice-aktarim';
import type { Spans } from '../src/veri/api';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });

function kur(kurulum = 'Deneme') {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { let d = dosyalar.get(ad); if (!d) { d = new sqlite3.oo1.DB(':memory:'); dosyalar.set(ad, d); } return d; };
  const depo = new BellekDeposu();
  const h = new Hizmet(ac, kurulum, 'x', () => {}, depo, sahteIsleyici, undefined, undefined, (ad) => { dosyalar.delete(ad); });
  return { h, depo };
}
const yazisi = (spans: unknown) => {
  const d = pmDocFromSpans(metinSemasi, spans as never);
  return d.textBetween(0, d.content.size, '\n');
};
const metni = (h: Hizmet, evren: string, kayit: string) => yazisi(h.metinAc({ evren, kayit, alan: 'govde' }).spans);
const yazi = (s: string) => new TextEncoder().encode(s);

describe('zip', () => {
  it('yazılan paket aynen okunur', async () => {
    const buyuk = yazi('Kuzey kıyısı '.repeat(500));
    const z = await zipYaz([{ ad: 'a.txt', veri: yazi('merhaba') }, { ad: 'klasör/ç.txt', veri: buyuk }, { ad: 'g.bin', veri: new Uint8Array([1, 2, 3]), sikistirma: false }]);
    expect(z.length).toBeLessThan(buyuk.length);
    const o = await zipOku(z);
    expect([...o.keys()]).toEqual(['a.txt', 'klasör/ç.txt', 'g.bin']);
    expect(new TextDecoder().decode(o.get('klasör/ç.txt'))).toBe('Kuzey kıyısı '.repeat(500));
    expect([...o.get('g.bin')!]).toEqual([1, 2, 3]);
  });
  it('bozuk dosya anlaşılır hata verir', async () => {
    await expect(zipOku(yazi('bu bir paket değil'))).rejects.toThrow(/yedek paketi değil/);
    const z = await zipYaz([{ ad: 'a.txt', veri: yazi('merhaba dünya'), sikistirma: false }]);
    z[36] ^= 0xff; // içeriği boz (30 bayt başlık + 5 bayt ad)
    await expect(zipOku(z)).rejects.toThrow(/bozuk/);
    expect(crc32(yazi('123456789'))).toBe(0xcbf43926);
  });
});

describe('içe aktarım planı', () => {
  const dosyalar = [
    { yol: 'Evrenim/Karakterler/Velkar.md', metin: '---\nlakaplar: [Kılıç Ustası]\netiketler: birinci kitap\nyaş: 40\n---\n# Geçmiş\n[[Taşköprü]]\'de doğdu. **Kuzeyin** valisi.\n- Sadık\n![[velkar.png]]' },
    { yol: 'Evrenim/Mekânlar/Taşköprü.md', metin: 'Nehir kıyısında. [[Kılıç Ustası|Velkar]] burada yaşar. [[Gölge Tarikatı]] da buradadır.' },
    { yol: 'Evrenim/Mekânlar/resimler/velkar.png', veri: new Uint8Array([9, 9, 9]) },
  ];
  it('kayıtları, türleri, bağlantıları ve kayıpları bulur', () => {
    const { plan, rapor } = iceAktarimPlani(dosyalar);
    const velkar = plan.find((p) => p.ad === 'Velkar')!;
    const kopru = plan.find((p) => p.ad === 'Taşköprü')!;
    const tarikat = plan.find((p) => p.ad === 'Gölge Tarikatı')!;
    expect(velkar).toMatchObject({ tur: 'karakter', karar: 'kesin', lakaplar: ['Kılıç Ustası'], etiketler: ['birinci kitap'] });
    expect(kopru.tur).toBe('mekan');
    expect(tarikat).toMatchObject({ karar: 'fikir', tur: 'diger' });
    // Ekli bağlantı ve lakapla bağlantı çözülür.
    const vb = baglantilar(velkar.spans as never);
    expect(vb).toEqual([expect.objectContaining({ hedef: kopru.kod, metin: "Taşköprü'de" })]);
    expect(baglantilar(kopru.spans as never).map((b) => b.hedef)).toEqual([velkar.kod, tarikat.kod]);
    expect(yazisi(velkar.spans)).toContain('yaş: 40'); // tanınmayan alan kaybolmaz
    expect(velkar.gorseller).toEqual(['Evrenim/Mekânlar/resimler/velkar.png']);
    expect(rapor).toMatchObject({ kayitSayisi: 2, bahsedilenler: ['Gölge Tarikatı'], digerAlanlar: ['yaş'], gorselSayisi: 1 });
    expect(rapor.kayiplar.join(' ')).toMatch(/madde/);
  });
  it('prototip JSON verisi okunur; okunamayanlar raporlanır', () => {
    const { plan, rapor } = iceAktarimPlani([
      { yol: 'veri.json', metin: JSON.stringify({ surum: 2, kayitlar: [{ name: 'Arven', type: 'karakter', description: 'Şifacı', notes: 'Kardeşi [[Corin]].' }, { name: 'Corin', type: 'karakter' }] }) },
      { yol: 'bozuk.json', metin: '{' },
      { yol: 'tablo.xlsx', veri: new Uint8Array([1]) },
    ]);
    expect(plan.map((p) => p.ad).sort()).toEqual(['Arven', 'Corin']);
    expect(rapor.okunamayan.length).toBe(1);
    const arven = plan.find((p) => p.ad === 'Arven')!;
    expect(baglantilar(arven.spans as never)[0].hedef).toBe(plan.find((p) => p.ad === 'Corin')!.kod);
  });
  it('içe aktarım ayrı bir evrene yazar', async () => {
    const { h, depo } = kur();
    const { kod: mevcut } = h.evrenOlustur({ ad: 'Var olan' });
    const { kod, rapor } = await h.iceAktar({ dosyalar, evrenAdi: 'İçe alınan' });
    expect(kod).not.toBe(mevcut);
    expect(rapor.kayitSayisi).toBe(2);
    expect(h.kayitlar({ evren: mevcut })).toEqual([]);
    const kayitlar = h.kayitlar({ evren: kod });
    expect(kayitlar.map((k) => k.ad).sort()).toEqual(['Gölge Tarikatı', 'Taşköprü', 'Velkar']);
    const velkar = kayitlar.find((k) => k.ad === 'Velkar')!;
    expect(metni(h, kod, velkar.kod)).toContain('Kuzeyin valisi');
    expect(h.kayit({ evren: kod, kod: velkar.kod }).gorseller.length).toBe(1);
    expect(depo.dosyalar.size).toBe(1);
    const kopru = kayitlar.find((k) => k.ad === 'Taşköprü')!;
    expect(h.baglananlar({ evren: kod, kod: kopru.kod }).map((b) => b.kod)).toContain(velkar.kod);
  });
});

describe('yedek ve geri yükleme', () => {
  async function dolu() {
    const k = kur('Masaüstü');
    const { kod: evren } = k.h.evrenOlustur({ ad: 'Kuzey Toprakları' });
    const a = k.h.kayitOlustur({ evren, ad: 'Velkar', tur: 'karakter' }).kod;
    const b = k.h.kayitOlustur({ evren, ad: 'Taşköprü', tur: 'mekan' }).kod;
    k.h.kayitTarih({ evren, kod: a, ifade: '412' });
    k.h.iliskiEkle({ evren, tur: 'yasar', a, b });
    const ac = k.h.metinAc({ evren, kayit: a, alan: 'govde' });
    const s = metinSemasi.schema;
    const doc = s.node('doc', null, [s.node('paragraph', null, [s.text('Doğduğu yer '), s.text('Taşköprü', [s.mark('bag', { hedef: b })])])]);
    const { pmNodeToSpans } = await import('@automerge/prosemirror');
    k.h.metinKaydet({ evren, kayit: a, alan: 'govde', spans: pmNodeToSpans(metinSemasi, doc) as Spans, temel: ac.basliklar });
    await k.h.gorselEkle({ evren, kod: b, dosyaAdi: 'kopru.png', tur: 'image/png', veri: new Uint8Array([5, 6, 7]) });
    k.h.kayitSil({ evren, kod: k.h.kayitOlustur({ evren, ad: 'Silinen', tur: 'diger' }).kod });
    return { ...k, evren, a, b };
  }

  it('başka cihaza aynı koduyla, kayıpsız geri yüklenir', async () => {
    const { h, evren, a, b } = await dolu();
    const { dosyaAdi, veri } = await h.yedekAl({ evren });
    expect(dosyaAdi).toMatch(/^kuzey-topraklari-yedek-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(h.sonYedek({ evren })).toBeGreaterThan(0);
    const icerik = await zipOku(veri);
    expect(icerik.has('aciklama.txt')).toBe(true);

    const yeni = kur('Dizüstü');
    const bilgi = await yeni.h.yedekIncele({ veri });
    expect(bilgi).toMatchObject({ evrenKod: evren, evrenAdi: 'Kuzey Toprakları', medyaSayisi: 1, mevcut: null });
    const r = await yeni.h.yedektenYukle({ veri });
    expect(r).toEqual({ kod: evren, ayri: false, eksikGorseller: [], bozukGorseller: [] });
    expect(yeni.h.evrenler().map((e) => e.ad)).toContain('Kuzey Toprakları');
    expect(yeni.h.kayitlar({ evren })).toEqual(h.kayitlar({ evren }));
    expect(yeni.h.kayitlar({ evren, cop: true }).map((k) => k.ad)).toEqual(['Silinen']);
    expect(yeni.h.kayit({ evren, kod: a })).toEqual(h.kayit({ evren, kod: a }));
    expect(metni(yeni.h, evren, a)).toBe('Doğduğu yer Taşköprü');
    expect(yeni.h.iliskiler({ evren, kod: a })).toEqual(h.iliskiler({ evren, kod: a }));
    expect(yeni.h.kayitGecmisi({ evren, kod: a }).length).toBe(h.kayitGecmisi({ evren, kod: a }).length);
    expect(yeni.depo.dosyalar.size).toBe(1);
    expect(await yeni.h.gorsel({ evren, ad: h.kayit({ evren, kod: b }).gorseller[0] })).toMatchObject({ durum: 'var' });
    // Geri yüklenen evrende çalışmaya devam edilebilir.
    yeni.h.kayitDegistir({ evren, kod: a, alan: 'ozet', deger: 'Kuzey valisi' });
    expect(yeni.h.kayit({ evren, kod: a }).ozet).toBe('Kuzey valisi');
  });

  it('aynı cihazda asıl evrene dokunmaz, ayrı kopya açar; istenirse yerine konur', async () => {
    const { h, evren, a } = await dolu();
    const { veri } = await h.yedekAl({ evren });
    h.kayitDegistir({ evren, kod: a, alan: 'ozet', deger: 'yedekten sonra' });
    expect((await h.yedekIncele({ veri })).mevcut).toMatchObject({ kod: evren });
    const r = await h.yedektenYukle({ veri });
    expect(r.ayri).toBe(true);
    expect(r.kod).not.toBe(evren);
    expect(h.kayit({ evren, kod: a }).ozet).toBe('yedekten sonra');
    expect(h.kayit({ evren: r.kod, kod: a }).ozet).toBe('');
    expect(h.evrenBilgisi({ evren: r.kod }).ad).toMatch(/^Kuzey Toprakları \(yedekten, /);
    h.evrenYerineKoy({ kopya: r.kod, asil: evren });
    expect(h.evrenBilgisi({ evren: r.kod }).ad).toBe('Kuzey Toprakları');
    expect(h.evrenBilgisi({ evren }).ad).toMatch(/^Kuzey Toprakları \(eski, /);
  });

  it('bu cihazda dosyası olmayan görsel yedek alınırken bildirilir; geri yüklemede de söylenir', async () => {
    const { h, depo, evren } = await dolu();
    expect((await h.yedekAl({ evren })).eksikGorsel).toBe(0);
    depo.dosyalar.clear(); // görselin kaydı var, dosyası bu cihazda yok
    const { veri, eksikGorsel } = await h.yedekAl({ evren });
    expect(eksikGorsel).toBe(1);
    const yeni = kur('Dizüstü');
    expect(await yeni.h.yedekIncele({ veri })).toMatchObject({ medyaSayisi: 0, eksikMedya: 1 });
    const r = await yeni.h.yedektenYukle({ veri });
    expect(r.eksikGorseller).toHaveLength(1);
    expect(yeni.h.kayitlar({ evren }).length).toBe(h.kayitlar({ evren }).length); // metin kurtarılır
  });

  it('pakette listelenip içinde olmayan görsel, paketin kendi eksik sayısına bakılmadan bulunur', async () => {
    const { h, evren } = await dolu();
    const { veri } = await h.yedekAl({ evren });
    const o = await zipOku(veri);
    for (const ad of [...o.keys()]) if (ad.startsWith('medya/')) o.delete(ad);
    const paket = JSON.parse(new TextDecoder().decode(o.get('paket.json')!));
    expect(paket.eksikMedya).toBe(0);
    const kirpik = await zipYaz([...o].map(([ad, v]) => ({ ad, veri: v })));
    const yeni = kur('Dizüstü');
    expect((await yeni.h.yedekIncele({ veri: kirpik })).eksikMedya).toBe(1);
    expect((await yeni.h.yedektenYukle({ veri: kirpik })).eksikGorseller).toEqual(paket.medyaAdlari);
    // Görsel bu cihazda zaten varsa kaybolan bir şey yok.
    expect((await h.yedekIncele({ veri: kirpik })).eksikMedya).toBe(0);
    expect((await h.yedektenYukle({ veri: kirpik })).eksikGorseller).toEqual([]);
  });

  it('yedek olmayan dosya reddedilir; bozuk görsel geri yüklemeyi durdurmaz', async () => {
    const { h, evren } = await dolu();
    await expect(h.yedekIncele({ veri: await zipYaz([{ ad: 'x.txt', veri: yazi('x') }]) })).rejects.toThrow(/yedeği değil/);
    const { veri } = await h.yedekAl({ evren });
    const o = await zipOku(veri);
    const ad = [...o.keys()].find((x) => x.startsWith('medya/'))!;
    o.set(ad, new Uint8Array([0]));
    const bozuk = await zipYaz([...o].map(([ad, veri]) => ({ ad, veri })));
    // Bozuk görsel yazılmaz, ama kayıtların ve metinlerin geri gelmesini de engellemez: eksik görsel olarak bildirilir.
    const yeni = kur('Dizüstü');
    const r = await yeni.h.yedektenYukle({ veri: bozuk });
    const gorsel = ad.slice('medya/'.length);
    expect(r.eksikGorseller).toEqual([gorsel]);
    expect(yeni.depo.dosyalar.has(gorsel)).toBe(false);
    expect(yeni.h.evrenler().map((e) => e.kod)).toEqual([r.kod]);
  });

  it('eksik, tekrarlanan satırlı ya da sayısı tutmayan yedek açılmaz; yarım evren kalmaz', async () => {
    const { h, evren } = await dolu();
    const { veri } = await h.yedekAl({ evren });
    const o = await zipOku(veri);
    const satirlar = new TextDecoder().decode(o.get('islemler.jsonl')!).split('\n').filter(Boolean);
    const paket = JSON.parse(new TextDecoder().decode(o.get('paket.json')!));
    const yap = (l: string[], p = paket) => {
      const m = new Map(o); m.set('islemler.jsonl', yazi(l.join('\n'))); m.set('paket.json', yazi(JSON.stringify(p)));
      return zipYaz([...m].map(([ad, v]) => ({ ad, veri: v })));
    };
    const n = satirlar.length;
    const durumlar = [
      satirlar.slice(1), // baştan eksik
      [...satirlar.slice(0, 2), ...satirlar.slice(3)], // ortadan eksik
      satirlar.slice(0, -1), // sondan eksik
      [...satirlar, satirlar[1]], // tekrarlanan satır
    ];
    const yeni = kur('Dizüstü');
    for (const l of durumlar) await expect(yeni.h.yedektenYukle({ veri: await yap(l) })).rejects.toThrow(/eksik ya da bozuk/);
    await expect(yeni.h.yedektenYukle({ veri: await yap(satirlar, { ...paket, islemSayisi: n + 1 }) })).rejects.toThrow(/eksik ya da bozuk/);
    expect(yeni.h.evrenler().length).toBe(0);
    // Sağlam yedek aynı cihazda sonra yine açılır.
    expect((await yeni.h.yedektenYukle({ veri })).ayri).toBe(false);
  });
});
