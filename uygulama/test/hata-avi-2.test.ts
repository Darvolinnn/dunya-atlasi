// İkinci hata avı (22–23 Ekim 2026): her sınama bir bulguyu kanıtlar; düzeltmeden önce kırılıyordu.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, jpegBilgiSil, type GorselIsleyici } from '../src/calisan/medya';
import type { HukukTanimGirdisi } from '../src/veri/api';
import { sayiCoz, sayiGirdisi, sayiOku } from '../src/alan/nicelik';
import { formulOku, type FormulCozucu } from '../src/alan/formul';
import { tarihCoz } from '../src/alan/tarih';
import { metinSemasi } from '../src/alan/metin-sema';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { zipOku } from '../src/alan/zip';
import { onBilgiAyir } from '../src/alan/markdown';
import { yeniKod } from '../src/alan/kod';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });

const sahteIsleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 10, boy: 20, onizleme: null });

function cihaz(ad: string) {
  const dosyalar = new Map<string, Database>();
  const ac = (d: string) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; };
  const medya = new BellekDeposu();
  const h = new Hizmet(ac, ad, 'x', () => {}, medya, sahteIsleyici, undefined, undefined, (d) => { dosyalar.get(d)?.close(); dosyalar.delete(d); },
    () => [...dosyalar.keys()]);
  return { h, medya, dosyalar, ac };
}
const kural = (x: Partial<HukukTanimGirdisi>): HukukTanimGirdisi =>
  ({ ad: 'Kural', tur: 'yasak', konu: '', kimlere: [], yer: null, yaptirim: '', fiili: null, fiiliNot: '', baslangic: '', bitis: '', ...x });

describe('hata avı 2: formül dili', () => {
  function evren() {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    const krallik = h.kayitOlustur({ evren: e, ad: 'Orvan Krallığı', tur: 'siyasi' }).kod;
    const sehir = h.kayitOlustur({ evren: e, ad: 'Kuzey', tur: 'sehir' }).kod;
    const topluluk = h.kayitOlustur({ evren: e, ad: 'Kuzey', tur: 'topluluk' }).kod;
    const { kod } = h.hukukKuraliOlustur({ evren: e, sahip: krallik, ad: 'Gece yasağı' });
    return { h, e, krallik, sehir, topluluk, kod };
  }

  it('aynı adlı kayda tür yazılarak bağlanan formüllü kuralın öbür bölümleri sonradan kaydedilebilir ve formül başka kayda kaymaz', () => {
    const { h, e, krallik, topluluk, kod } = evren();
    h.hukukKuraliYaz({ evren: e, kod, tanim: kural({ formul: 'üyesi [Kuzey (Topluluk / kurum)]' }) });
    const k = h.hukukKurallari({ evren: e, sahip: krallik })[0];
    expect(k.formulYazisi).toBe('üyesi [Kuzey (Topluluk / kurum)]');
    // Arayüz gibi: yaptırımı değiştirip formülün gösterilen yazısını geri gönderir.
    h.hukukKuraliYaz({ evren: e, kod, tanim: kural({ yaptirim: 'Para cezası', formul: k.formulYazisi! }) });
    const sonra = h.hukukKurallari({ evren: e, sahip: krallik })[0];
    expect(sonra.tanim.yaptirim).toBe('Para cezası');
    expect(sonra.tanim.formul!.agac).toEqual({ t: 'iliski', iliski: 'uye', kayit: topluluk });
  });

  it('formülündeki kayıt silinmiş kuralın öbür bölümleri yine kaydedilebilir; formül kendiliğinden değişmez', () => {
    const { h, e, krallik, kod } = evren();
    const lonca = h.kayitOlustur({ evren: e, ad: 'Lonca', tur: 'topluluk' }).kod;
    h.hukukKuraliYaz({ evren: e, kod, tanim: kural({ formul: 'üyesi [Lonca]' }) });
    h.kayitSil({ evren: e, kod: lonca });
    const k = h.hukukKurallari({ evren: e, sahip: krallik })[0];
    h.hukukKuraliYaz({ evren: e, kod, tanim: kural({ konu: 'Gece dolaşmak', formul: k.formulYazisi! }) });
    const sonra = h.hukukKurallari({ evren: e, sahip: krallik })[0];
    expect(sonra.tanim.konu).toBe('Gece dolaşmak');
    expect(sonra.tanim.formul!.agac).toEqual({ t: 'iliski', iliski: 'uye', kayit: lonca });
  });

  it('adı parantezle biten kayıt formülde yazılabilir ve gösterilen yazı yine aynı kayda varır', () => {
    const { h, e, krallik, kod } = evren();
    const eski = h.kayitOlustur({ evren: e, ad: 'Kral Muhafızları (Eski)', tur: 'topluluk' }).kod;
    expect(h.formulDenetle({ evren: e, yazi: 'üyesi [Kral Muhafızları (Eski)]' })).toEqual({ yazi: 'üyesi [Kral Muhafızları (Eski) (Topluluk / kurum)]' });
    h.hukukKuraliYaz({ evren: e, kod, tanim: kural({ formul: 'üyesi [Kral Muhafızları (Eski)]' }) });
    const k = h.hukukKurallari({ evren: e, sahip: krallik })[0];
    expect(h.formulDenetle({ evren: e, yazi: k.formulYazisi! })).toEqual({ yazi: k.formulYazisi });
    expect(k.tanim.formul!.agac).toEqual({ t: 'iliski', iliski: 'uye', kayit: eski });
  });

  it('tür adının bir parçası da yazılabilir: [Kuzey (Topluluk)]', () => {
    const { h, e } = evren();
    expect(h.formulDenetle({ evren: e, yazi: 'üyesi [Kuzey (topluluk)]' })).toEqual({ yazi: 'üyesi [Kuzey (Topluluk / kurum)]' });
  });

  it('hatanın yeri, baştaki boşluklar dahil yazarın yazdığı metne göredir', () => {
    const { h, e } = evren();
    const yazi = '   üyesi [Yok Böyle]';
    const d = h.formulDenetle({ evren: e, yazi }) as { konum: number; uzunluk: number };
    expect(yazi.slice(d.konum, d.konum + d.uzunluk)).toBe('[Yok Böyle]');
  });
});

describe('hata avı 2: Türkçe sayı yazımı', () => {
  it('noktayla ayrılmış binlikler bin olarak okunur, "1.000" 1 sanılmaz', () => {
    expect(sayiOku('1.000')).toBe(1000);
    expect(sayiOku('12.500.000')).toBe(12500000);
    expect(sayiOku('1.250,5')).toBe(1250.5);
    expect(sayiOku('1,75')).toBe(1.75);
    expect(sayiOku('1.75')).toBe(1.75);
    expect(sayiOku('−4')).toBe(-4);
    expect(sayiOku('')).toBeNaN();
    expect(sayiOku('0x10')).toBeNaN();
    expect(sayiCoz('12.000 kişi', 'kişi')).toEqual({ enAz: 12000, enCok: 12000, birim: 'kişi' });
    expect(sayiCoz('1.000–2.000', 'kişi')).toEqual({ enAz: 1000, enCok: 2000, birim: 'kişi' });
    expect(sayiCoz('1,5 km', 'm')).toEqual({ enAz: 1500, enCok: 1500, birim: 'm' });
  });

  it('saklanmış ondalıklı değer yeniden okunurken binlik sanılmaz', () => {
    expect(sayiCoz({ enAz: 1.234, enCok: 1.234, birim: 'm' }, 'm', 3)).toEqual({ enAz: 1.234, enCok: 1.234, birim: 'm' });
    expect(sayiOku('0.125')).toBe(0.125);
    for (const n of [1.234, 0.125, 1250, -3.5, 12, 1e-7]) expect(sayiOku(sayiGirdisi(n))).toBe(n);
  });

  it('formüldeki "1.000" bin sayılır', () => {
    const c: FormulCozucu = {
      kayitlar: () => [],
      alanlar: (ad) => ad === 'Nüfus' ? [{ kod: 'n', ad: 'Nüfus', tur: 'sayi', nicelik: 'miktar', birim: 'kişi', hassasiyet: 0, turAdi: 'Şehir' }] : [],
      tarih: (s) => tarihCoz(s),
    };
    expect(formulOku('{Nüfus} > 1.000', c).agac).toMatchObject({ t: 'sayi', deger: 1000 });
  });

  it('sayıyla izlenen ayrıntının "1.000" gözlemi bin olarak saklanır', () => {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    const ordu = h.kayitOlustur({ evren: e, ad: 'Kuzey Ordusu', tur: 'topluluk' }).kod;
    const sahne = h.kayitOlustur({ evren: e, ad: 'Geçit', tur: 'sahne' }).kod;
    const { kod: iz } = h.izOlustur({ evren: e, konu: ordu, ad: 'Asker sayısı', model: 'sayi', birim: 'kişi', sure: null });
    h.izGozlem({ evren: e, iz, sahne, an: 'bas', deger: '1.000' });
    expect(JSON.stringify(h.sahneSurekliligi({ evren: e, sahne, ek: [ordu] }))).toContain('1000');
  });
});

describe('hata avı 2: dışa ve içe aktarma', () => {
  const sm = metinSemasi.schema;
  const yaz = (h: Hizmet, evren: string, kayit: string, ...paragraflar: string[]) => {
    const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
    const doc = sm.node('doc', null, paragraflar.map((p) => sm.node('paragraph', null, p ? [sm.text(p)] : [])));
    h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, doc) as never, temel });
  };
  const metni = (h: Hizmet, evren: string, kayit: string) => {
    const d = pmDocFromSpans(metinSemasi, h.metinAc({ evren, kayit, alan: 'govde' }).spans as never);
    return d.textBetween(0, d.content.size, '\n');
  };

  it('Markdown olarak dışa aktarılıp geri alınan metin ve ad değişmez (konuşma çizgisi, yıldız, alt çizgi, köşeli parantez, tırnak)', async () => {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    const kod = h.kayitOlustur({ evren: e, ad: 'Kral "Deli" Orvan', tur: 'karakter' }).kod;
    const paragraflar = ['- Gel buraya, dedi.', '+ Hayır.', '---', '1. Kural: kaçma.', 'Fiyat 3 * 4 altın, ad_soyad [not] #etiket <b> a|b `kod` \\ yol', '~~~'];
    yaz(h, e, kod, ...paragraflar);
    const r = await h.markdownDisaAktar({ evren: e });
    const m = await zipOku(r.veri);
    const md = new TextDecoder().decode(m.get('Karakter/Kral Deli Orvan.md')!);
    expect(md).not.toMatch(/^- Gel/m); // Obsidian'da madde işareti olmamalı
    const dosyalar = [...m].filter(([ad]) => ad.endsWith('.md') && ad !== 'OKUBENI.md').map(([yol, veri]) => ({ yol, metin: new TextDecoder().decode(veri) }));
    const { kod: yeni } = await h.iceAktar({ dosyalar, evrenAdi: 'Geri' });
    const k = h.kayitlar({ evren: yeni })[0];
    expect(k.ad).toBe('Kral "Deli" Orvan');
    expect(metni(h, yeni, k.kod)).toBe(paragraflar.join('\n'));
  });

  it('EPUB, metinde ya da adda denetim karakteri olsa da geçerli XML olur', async () => {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    const eser = h.kayitOlustur({ evren: e, ad: 'Kuzey\u0008 Kitabı', tur: 'eser' }).kod;
    const { kod: b1 } = h.anlatiOlustur({ evren: e, ust: eser, ad: 'Birinci\u000B bölüm', tur: 'bolum' });
    const { kod: s1 } = h.anlatiOlustur({ evren: e, ust: b1, ad: 'Sahne', tur: 'sahne' });
    yaz(h, e, s1, 'Word\u000Bden gelen satır\u000Csonu.');
    const { veri } = await h.epubYaz({ evren: e, eser });
    const m = await zipOku(veri);
    for (const [ad, v] of m) if (/\.(xhtml|opf|xml)$/.test(ad)) expect(new TextDecoder().decode(v)).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
  });

  it('Markdown dosya adlarında denetim karakteri ve Windows aygıt adı olmaz', async () => {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    h.kayitOlustur({ evren: e, ad: 'Con', tur: 'karakter' });
    h.kayitOlustur({ evren: e, ad: 'Ses\u0007li', tur: 'karakter' });
    const m = await zipOku((await h.markdownDisaAktar({ evren: e })).veri);
    expect([...m.keys()].filter((x) => x.startsWith('Karakter/')).sort()).toEqual(['Karakter/Con_.md', 'Karakter/Sesli.md']);
  });
});

describe('hata avı 2: şablon', () => {
  it('çöp kutusundaki kaydın değeri de alanın türünü kilitler (kayıt geri gelince değeri türüne uymalı)', () => {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    const s = h.sablon({ evren: e, tur: 'karakter' }).sablon;
    h.sablonYaz({ evren: e, tur: 'karakter', sablon: { ...s, alanlar: [...s.alanlar, { kod: 'agirlik', ad: 'Ağırlık', tur: 'sayi', nicelik: 'kutle', birim: 'kg', hassasiyet: 0 }] } });
    const kod = h.kayitOlustur({ evren: e, ad: 'Aldren', tur: 'karakter' }).kod;
    h.kayitAlanYaz({ evren: e, kod, alan: 'agirlik', deger: '80' });
    h.kayitSil({ evren: e, kod });
    expect(h.sablon({ evren: e, tur: 'karakter' }).kullanim.agirlik).toBe(1);
  });
});

describe('hata avı 2: görsellerdeki kişisel bilgi', () => {
  it('JPEG\'in arkasına eklenmiş veri (hareketli fotoğraf videosu, konumlu ikinci görüntü), IPTC ve MPF bölümleri silinir', () => {
    const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
    const bolum = (isaret: number, govde: number[]) => [0xff, isaret, (govde.length + 2) >> 8, (govde.length + 2) & 0xff, ...govde];
    const app0 = bolum(0xe0, ascii('JFIF\0'));
    const iptc = bolum(0xed, ascii('Photoshop 3.0\0Ankara'));
    const mpf = bolum(0xe2, [...ascii('MPF\0'), 1, 2, 3]);
    const icc = bolum(0xe2, [...ascii('ICC_PROFILE\0'), 1, 2]);
    const dht = bolum(0xc4, [0, 1, 2]);
    const sos = bolum(0xda, [1, 1, 0, 0, 63, 0]);
    const tarama = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0xff, 0xff, 0xd9]; // dolgu, yeniden başlama, dolgu, son
    const asil = [0xff, 0xd8, ...app0, ...iptc, ...mpf, ...icc, ...dht, ...sos, 0x77, 0xff, 0xc4, 0, 3, 9, ...sos, ...tarama];
    const ek = [0xff, 0xd8, ...bolum(0xe1, [...ascii('Exif\0\0'), ...ascii('GPS 39.9N 32.8E')]), 0xff, 0xd9, ...ascii('ftypmp42 konum')];
    const r = jpegBilgiSil(new Uint8Array([...asil, ...ek]));
    expect([...r.veri]).toEqual([0xff, 0xd8, ...app0, ...icc, ...dht, ...sos, 0x77, 0xff, 0xc4, 0, 3, 9, ...sos, ...tarama]);
    expect(r.sonuKesildi).toBe(true);
  });

  it('sonu bulunamayan (yarım) JPEG\'de görüntü verisinden bir şey atılmaz', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 4, 1, 1, 0x12, 0xff, 0x00, 0x34]);
    expect([...jpegBilgiSil(jpeg).veri]).toEqual([...jpeg]);
  });
});

describe('hata avı 2: Markdown ön bilgisi', () => {
  it('girintisiz liste maddeleri ve çok satırlı değerler okunur', () => {
    const { ozellikler } = onBilgiAyir('---\ntags:\n- kuzey\n- savaş\nozet: >\n  Yaşlı kral\n  kuzeyde yaşar.\nnotlar: |\n  bir\n  iki\nad: Aldren\n---\nMetin');
    expect(ozellikler).toEqual({ tags: ['kuzey', 'savaş'], ozet: 'Yaşlı kral kuzeyde yaşar.', notlar: 'bir\niki', ad: 'Aldren' });
  });
});

describe('hata avı 2: önceki avdan kalan teknik iletiler', () => {
  it('kesirli sınırla değişiklik günlüğü ve bozuk şablon Türkçe iletiyle karşılanır', () => {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    h.kayitOlustur({ evren: e, ad: 'Aldren', tur: 'karakter' });
    expect(h.islemGunlugu({ evren: e, sinir: 1.5 }).length).toBe(1);
    expect(() => h.sablonYaz({ evren: e, tur: 'karakter', sablon: 5 as never })).toThrow('Şablon okunamadı.');
    expect(() => h.sablonYaz({ evren: e, tur: 'karakter', sablon: { alanlar: [null], sorular: [] } as never })).toThrow('Şablon okunamadı.');
  });
});

describe('hata avı 2: ondalıklı sayıların yazılışı', () => {
  it('ondalıklı iyileşme süresi, gökyüzü dönemi ve rota süresi Türkçe virgülle yazılır', () => {
    const { h } = cihaz('A');
    const { kod: e } = h.evrenOlustur({ ad: 'Deneme' });
    h.takvimYaz({ evren: e, takvim: { kod: 'ana', surum: 1, ad: 'Yıl', yilGun: 0, aylar: [{ ad: 'Tohum', gun: 30 }, { ad: 'Hasat', gun: 30 }] } });
    const kayit = (ad: string, tur: string, tarih?: string) => {
      const kod = h.kayitOlustur({ evren: e, ad, tur }).kod;
      if (tarih) h.kayitTarih({ evren: e, kod, ifade: tarih });
      return kod;
    };
    const elin = kayit('Elin', 'karakter');
    const s1 = kayit('Pusu', 'sahne', '1 Tohum 412');
    const s2 = kayit('Kaçış', 'sahne', '2 Tohum 412');
    const { kod: iz } = h.izOlustur({ evren: e, konu: elin, ad: 'Sağ el', model: 'iyilesme', sure: 1.5 });
    h.degisimEkle({ evren: e, sahne: s1, metin: 'Eli yaralandı', iz });
    h.izGozlem({ evren: e, iz, sahne: s2, an: 'bas', deger: 'sargılı' });
    expect(h.sahneSurekliligi({ evren: e, sahne: s2 }).izler[0].bas.dayanak).toContain('1,5 günlük');

    const ay = { kod: yeniKod(), ad: 'Solgun', donem: 29.5, baslangic: '1 Tohum 412', evre: 'yeni' as const };
    h.gokyuzuYaz({ evren: e, tanim: { aylar: [ay], mevsimler: [], gelgitler: [] } });
    const g = h.gokyuzuHesapla({ evren: e, tarih: '1 Tohum 412' });
    expect(JSON.stringify(g)).toContain('29,5 gün');
    expect(JSON.stringify(g)).not.toContain('29.5');
  });
});
