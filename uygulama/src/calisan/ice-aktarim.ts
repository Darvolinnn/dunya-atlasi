// İçe aktarım planı: dosyalardan kayıtlar, bağlantılar ve rapor. Hiçbir şey yazmaz; önce rapor
// gösterilir, yazar onaylayınca plan ayrı bir evrene yazılır (§10.11 "önce ayrı alanda açılır").
import { pmNodeToSpans } from '@automerge/prosemirror';
import { metinSemasi } from '../alan/metin-sema';
import { anahtarAnlami, belgeYap, bloklar, jsonKayitlari, listeYap, markdownKaydi, type IceKayit, type Kayiplar } from '../alan/markdown';
import { katla } from '../alan/turkce';
import { kokAdaylari } from '../alan/turkce-ek';
import { KARARLAR, turBulYazidan } from '../alan/turler';
import { yeniKod } from '../alan/kod';
import type { IceAktarimRaporu, Spans } from '../veri/api';

export interface IceDosya { yol: string; metin?: string; veri?: Uint8Array; tur?: string }

export interface PlanKaydi {
  kod: string; ad: string; tur: string; karar: string; ozet: string; okunus: string; tarih: string;
  lakaplar: string[]; etiketler: string[]; spans: Spans; gorseller: string[]; kaynak: string;
}

const KAYIP_ACIKLAMASI: Record<string, (n: number) => string> = {
  madde: (n) => `${n} madde işareti düz paragraf oldu (başına • kondu)`,
  kod: (n) => `${n} yerde kod biçimi düz metin oldu`,
  'kod-blogu': (n) => `${n} kod bloğu düz paragraflar oldu`,
  html: (n) => `${n} yerde HTML vardı; çalıştırılmadı, düz metin olarak kaldı`,
  'tablo-satiri': (n) => `${n} tablo satırı düz metin oldu`,
  ayrac: (n) => `${n} yatay çizgi atlandı`,
  'uyari-kutusu': (n) => `${n} uyarı kutusu alıntı oldu`,
  'dis-baglanti': (n) => `${n} internet bağlantısı yazı ve adres olarak kaldı`,
};

const GORSEL = /\.(jpe?g|png|webp|gif|avif)$/i;

/** Dosyalardan ara kayıtlar: .md/.markdown/.txt Markdown, .json prototip verisi. Ortak üst klasör atılır. */
export function dosyalardanKayitlar(dosyalar: IceDosya[]): { kayitlar: IceKayit[]; okunamayan: string[]; ortak: string } {
  const metinler = dosyalar.filter((d) => d.metin !== undefined);
  const yollar = metinler.map((d) => d.yol.split('/'));
  const ortak = yollar.length > 1 && yollar.every((y) => y.length > 1 && y[0] === yollar[0][0]) ? yollar[0][0] + '/' : '';
  const kayitlar: IceKayit[] = [];
  const okunamayan: string[] = [];
  for (const d of metinler) {
    const yol = ortak && d.yol.startsWith(ortak) ? d.yol.slice(ortak.length) : d.yol;
    if (/\.json$/i.test(yol)) {
      try {
        const k = jsonKayitlari(JSON.parse(d.metin!), yol);
        if (!k.length) okunamayan.push(`${yol}: içinde adı olan kayıt bulunamadı`);
        kayitlar.push(...k);
      } catch { okunamayan.push(`${yol}: JSON olarak okunamadı`); }
    } else if (/\.(md|markdown|txt)$/i.test(yol)) kayitlar.push(markdownKaydi(yol, d.metin!));
    else okunamayan.push(`${yol}: bu dosya türü içe alınmıyor`);
  }
  return { kayitlar, okunamayan, ortak };
}

const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');

/**
 * Notta geçen görselin dosyası. Önce notun klasörüne göre yol (`../Kuzey/harita.png` da), sonra içe alınan klasörün
 * köküne göre; bulunmazsa yalnız ad. Aynı adda birden çok görsel varsa nota en yakın klasördeki seçilir; iki aday
 * eşit yakınsa hiçbiri seçilmez (rastgele bir görsel bağlanmaz, eksik sayılır).
 */
function gorselBulucu(dosyalar: IceDosya[], ortak: string) {
  const yollar = dosyalar.filter((d) => d.veri && GORSEL.test(d.yol)).map((d) => d.yol);
  const yolla = new Map(yollar.map((y) => [kucuk(y), y]));
  const adla = new Map<string, string[]>();
  for (const y of yollar) { const a = kucuk(y.split('/').pop()!); adla.set(a, [...(adla.get(a) ?? []), y]); }
  return (ad: string, klasor: string[]): string | undefined => {
    const coz = (bas: string[]) => {
      const y = [...bas];
      for (const p of ad.split('/')) { if (p === '..') y.pop(); else if (p && p !== '.') y.push(p); }
      return yolla.get(kucuk(y.join('/')));
    };
    const bulunan = coz(klasor) ?? (ortak ? coz([ortak.slice(0, -1)]) : undefined) ?? coz([]);
    if (bulunan) return bulunan;
    const adaylar = adla.get(kucuk(ad.split('/').pop()!)) ?? [];
    if (adaylar.length <= 1) return adaylar[0];
    const yakinlik = (y: string) => {
      const p = y.split('/').slice(0, -1);
      let n = 0;
      while (n < p.length && n < klasor.length && kucuk(p[n]) === kucuk(klasor[n])) n++;
      return n;
    };
    const sirali = adaylar.map((y) => ({ y, n: yakinlik(y) })).sort((a, b) => b.n - a.n);
    return sirali[0].n > sirali[1].n ? sirali[0].y : undefined;
  };
}

export function iceAktarimPlani(dosyalar: IceDosya[]): { plan: PlanKaydi[]; rapor: IceAktarimRaporu } {
  const { kayitlar, okunamayan, ortak } = dosyalardanKayitlar(dosyalar);
  const gorselBul = gorselBulucu(dosyalar, ortak);
  const klasorler = new Map<string, string[]>(); // plan kaydı → notun dosyasının klasörü (içe alınan klasörün adıyla)
  const kayiplar: Kayiplar = {};
  const adlar = new Map<string, string>();
  const tekrar = new Set<string>();
  const plan: PlanKaydi[] = [];
  const taninmayanTurler = new Set<string>();
  const digerAlanlar = new Set<string>();

  // 1. Her kayda kod ver; adlar ve lakaplar bağlantı çözümü için.
  const hazirlik = kayitlar.map((k) => {
    const kod = yeniKod();
    const anahtar = katla(k.ad);
    if (adlar.has(anahtar)) tekrar.add(k.ad); else adlar.set(anahtar, kod);
    return { k, kod };
  });
  for (const { k, kod } of hazirlik) {
    for (const [a, d] of Object.entries(k.ozellikler)) if (anahtarAnlami(a) === 'lakaplar') for (const l of listeYap(d)) if (!adlar.has(katla(l))) adlar.set(katla(l), kod);
  }
  // Obsidian (ve bizim dışa aktarımımız) bağlantıyı dosya adıyla, aynı ad başka klasörde de varsa "Klasör/Ad" yoluyla
  // yazar. Dosya adı kaydın adından farklı olabilir (adda dosya adına giremeyen işaret, aynı adda ikinci dosya).
  const MD = /\.(md|markdown|txt)$/i;
  const yolla = new Map<string, string>();
  const dosyayla = new Map<string, string | null>(); // aynı dosya adı birden çok klasördeyse belirsiz (null)
  for (const { k, kod } of hazirlik) {
    if (!MD.test(k.kaynak)) continue;
    const yol = katla(k.kaynak.replace(MD, ''));
    yolla.set(yol, kod);
    const dosya = yol.split('/').pop()!;
    dosyayla.set(dosya, dosyayla.has(dosya) ? null : kod);
  }
  const bahsedilen = new Map<string, string>();
  let baglantiSayisi = 0;
  const hedefKodu = (ad: string) => {
    baglantiSayisi++;
    const k = katla(ad);
    const yol = katla(ad.trim().replace(/^\/+/, '').replace(MD, ''));
    const bulunan = yolla.get(yol) ?? dosyayla.get(yol) ?? adlar.get(k)
      ?? (yol.includes('/') ? dosyayla.get(yol.split('/').pop()!) ?? adlar.get(yol.split('/').pop()!) : undefined)
      ?? kokAdaylari(ad).map((x) => adlar.get(x)).find(Boolean);
    if (bulunan) return bulunan;
    // Bağlantı verilmiş ama dosyası olmayan ad: [[ ile doğan kayıt gibi fikir olarak oluşur (§5.1).
    let kod = bahsedilen.get(k);
    if (!kod) { kod = yeniKod(); bahsedilen.set(k, kod); adlar.set(k, kod); plan.push(bos(kod, ad.trim())); }
    return kod;
  };
  const bos = (kod: string, ad: string): PlanKaydi => ({
    kod, ad, tur: 'diger', karar: 'fikir', ozet: '', okunus: '', tarih: '', lakaplar: [], etiketler: [], spans: [], gorseller: [], kaynak: '',
  });

  // 2. Alanlar ve metin.
  for (const { k, kod } of hazirlik) {
    const p: PlanKaydi = { ...bos(kod, k.ad.slice(0, 200)), kaynak: k.kaynak, karar: 'kesin' };
    const kalan: string[] = [];
    for (const [a, d] of Object.entries(k.ozellikler)) {
      if (a === '_klasor') {
        for (const klasor of d as string[]) {
          const t = turBulYazidan(klasor);
          if (t && p.tur === 'diger') p.tur = t; else p.etiketler.push(klasor);
        }
        continue;
      }
      const anlam = anahtarAnlami(a);
      const yazi = typeof d === 'string' || typeof d === 'number' ? String(d) : '';
      if (anlam === 'tur' && yazi) { const t = turBulYazidan(yazi); if (t) p.tur = t; else { taninmayanTurler.add(yazi); p.etiketler.push(yazi); } }
      else if (anlam === 'etiketler') p.etiketler.push(...listeYap(d));
      else if (anlam === 'lakaplar') p.lakaplar.push(...listeYap(d));
      else if (anlam === 'ozet' && yazi) p.ozet = yazi.slice(0, 500);
      else if (anlam === 'tarih' && yazi) p.tarih = yazi.slice(0, 200);
      else if (anlam === 'okunus' && yazi) p.okunus = yazi.slice(0, 200);
      else if (anlam === 'karar' && yazi) p.karar = KARARLAR.find((x) => katla(x.ad).startsWith(katla(yazi).slice(0, 4)) || x.kod === katla(yazi))?.kod ?? p.karar;
      else {
        digerAlanlar.add(a);
        kalan.push(`${a}: ${typeof d === 'string' ? d : JSON.stringify(d)}`);
      }
    }
    p.etiketler = [...new Set(p.etiketler.map((x) => x.slice(0, 100)))];
    p.lakaplar = [...new Set(p.lakaplar.map((x) => x.slice(0, 100)))];
    const gomululer: string[] = [];
    let govde = k.govde;
    // Tanınmayan alanlar kaybolmaz: metnin sonuna yazılır.
    if (kalan.length) govde += `\n\n## İçe aktarımdan kalan alanlar\n${kalan.join('\n')}`;
    const b = bloklar(govde, kayiplar, gomululer);
    p.spans = b.length ? pmNodeToSpans(metinSemasi, belgeYap(b, hedefKodu)) as Spans : [];
    p.gorseller = gomululer;
    klasorler.set(kod, (ortak + k.kaynak).split('/').slice(0, -1));
    plan.push(p);
  }

  // 3. Görseller.
  const eksikGorseller: string[] = [];
  let gorselSayisi = 0;
  for (const p of plan) {
    p.gorseller = p.gorseller.flatMap((ad) => {
      const yol = gorselBul(ad, klasorler.get(p.kod) ?? []);
      if (!yol) { if (GORSEL.test(ad)) eksikGorseller.push(ad); return []; }
      gorselSayisi++;
      return [yol];
    });
  }
  return {
    plan,
    rapor: {
      kayitSayisi: hazirlik.length, baglantiSayisi, bahsedilenler: [...plan.filter((p) => bahsedilen.has(katla(p.ad)) && !p.kaynak).map((p) => p.ad)],
      tekrarAdlar: [...tekrar], taninmayanTurler: [...taninmayanTurler], digerAlanlar: [...digerAlanlar],
      kayiplar: Object.entries(kayiplar).map(([k, n]) => KAYIP_ACIKLAMASI[k]?.(n) ?? `${n} × ${k}`),
      eksikGorseller: [...new Set(eksikGorseller)], gorselSayisi, okunamayan,
      turler: Object.entries(plan.reduce<Record<string, number>>((a, p) => { a[p.tur] = (a[p.tur] ?? 0) + 1; return a; }, {})).sort((x, y) => y[1] - x[1]),
    },
  };
}
