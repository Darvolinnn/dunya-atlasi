// Dil tarihi ve ad türetme (§15-4, §4.3). Bir dilin ses paleti, sözlüğü, ses sınıfları, ses değişim kuralları ve
// örnekleri kayıtta tutulur. "Türediği dil" ilişkisi dönemleri, lehçeleri ve ödünç alan yabancı dilleri bağlar: bir
// dilin kuralları kaynağından gelen sözcüğe uygulanır. Türetilen biçim yazar seçmeden hiçbir ada yazılmaz; seçilirse
// kaydın o dildeki biçimi olarak saklanır. Dil yeterliliği konuşma, anlama, okuma ve yazma diye ayrı tutulur.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { sesDegistir, kuralCoz } from '../alan/ses';
import { katla } from '../alan/turkce';
import type { AdBicimi, DilBilgisi, DilTanimi, DilYeterliligi, KisaKayit, KisiDili, TuretilenBicim, UretilenAd, YeterlilikDuzeyi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

export interface DilBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;
const DERINLIK = 12;
export const DUZEYLER: YeterlilikDuzeyi[] = ['yok', 'az', 'orta', 'iyi', 'ana'];
const BECERILER = ['konusma', 'anlama', 'okuma', 'yazma'] as const;

const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const k = yonlendir(e.db, kod) as string;
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
};
function kayitTuru(e: EvrenVt, kod: unknown): string {
  const t = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  return t;
}
function dilMi(e: EvrenVt, kod: unknown) { if (kayitTuru(e, kod) !== 'dil') throw new Error('Bu bir dil kaydı değil.'); }

const BOS: DilTanimi = { heceler: [], siniflar: [], kurallar: [], ornekler: [], sozluk: [] };
export function dilOku(e: EvrenVt, kod: string): DilTanimi {
  const r = e.db.selectValue('SELECT tanim FROM dil_tanimlari WHERE kod=?', [kod]) as string | undefined;
  return r ? { ...BOS, ...JSON.parse(r) as DilTanimi } : BOS;
}

const temiz = (x: unknown, n = 200) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export function dilYaz(b: DilBaglami, kod: string, t: DilTanimi) {
  dilMi(b.e, kod);
  const liste = <T>(x: unknown, n: number): T[] => { if (!Array.isArray(x) || x.length > n) throw new Error('Liste çok uzun ya da geçersiz.'); return x as T[]; };
  const siniflar = liste<{ ad: string; harfler: string }>(t.siniflar, 30).map((s) => {
    const ad = temiz(s.ad, 2);
    if (!/^\p{Lu}$/u.test(ad)) throw new Error('Ses sınıfının adı tek büyük harf olmalı.');
    return { ad, harfler: temiz(s.harfler, 80) };
  });
  const yeni: DilTanimi = {
    heceler: [...new Set(liste<string>(t.heceler, 300).map((h) => temiz(h, 12).toLocaleLowerCase('tr-TR')).filter(Boolean))],
    siniflar,
    kurallar: liste<{ kural: string; not: string }>(t.kurallar, 200).map((k) => ({ kural: temiz(k.kural, 120), not: temiz(k.not) })).filter((k) => k.kural),
    ornekler: liste<{ kaynak: string; beklenen: string }>(t.ornekler, 200).map((o) => ({ kaynak: temiz(o.kaynak, 60), beklenen: temiz(o.beklenen, 60) })).filter((o) => o.kaynak),
    sozluk: liste<DilTanimi['sozluk'][number]>(t.sozluk, 2000).map((s) => ({ bicim: temiz(s.bicim, 40), anlam: temiz(s.anlam), tur: (['kok', 'onek', 'sonek'] as const).includes(s.tur) ? s.tur : 'kok' as const })).filter((s) => s.bicim),
  };
  if (JSON.stringify(yeni) === JSON.stringify(dilOku(b.e, kod))) return;
  b.yaz([{ tur: 'dil_yaz', veri: { kod, tanim: yeni } }], [kod]);
}

/** Dilin kaynak dilleri (a: dil, b: kaynak) ve türevleri. */
function kaynaklar(e: EvrenVt, dil: string) {
  return e.db.selectObjects(`SELECT i.b k FROM iliskiler i JOIN kayitlar x ON x.kod=i.b WHERE i.a=? AND i.tur='dil_kaynagi' AND ${ETKIN} AND x.silindi IS NULL ORDER BY i.olusturma`, [dil]).map((r) => r.k as string);
}
function turevler(e: EvrenVt, dil: string) {
  return e.db.selectObjects(`SELECT i.a k FROM iliskiler i JOIN kayitlar x ON x.kod=i.a WHERE i.b=? AND i.tur='dil_kaynagi' AND ${ETKIN} AND x.silindi IS NULL AND x.tur='dil' ORDER BY i.olusturma`, [dil]).map((r) => r.k as string);
}

const uygula = (t: DilTanimi, bicim: string) => sesDegistir(bicim, t.kurallar.map((k) => k.kural), t.siniflar);

export function dilBilgisi(e: EvrenVt, kod: string): DilBilgisi {
  dilMi(e, kod);
  const t = dilOku(e, kod);
  const kuralHatalari: DilBilgisi['kuralHatalari'] = [];
  t.kurallar.forEach((k, sira) => { try { kuralCoz(k.kural, t.siniflar); } catch (x) { kuralHatalari.push({ sira, hata: (x as Error).message }); } });
  const ornekler = t.ornekler.map((o) => {
    const r = uygula(t, o.kaynak);
    const tutuyor = o.beklenen ? r.sonuc.toLocaleLowerCase('tr-TR') === o.beklenen.toLocaleLowerCase('tr-TR') : null;
    return { ...o, sonuc: r.sonuc, tutuyor, iz: r.iz };
  });
  const bilenler = e.db.selectObjects(`SELECT i.kod, i.a FROM iliskiler i JOIN kayitlar x ON x.kod=i.a WHERE i.b=? AND i.tur='dil_bilir' AND ${ETKIN} AND x.silindi IS NULL ORDER BY x.ad`, [kod])
    .map((r) => ({ kisi: kisa(e, r.a as string), iliski: r.kod as string, yeterlilik: yeterlilikOku(e, r.kod as string) }));
  return { tanim: t, kaynaklar: kaynaklar(e, kod).map((k) => kisa(e, k)), turevler: turevler(e, kod).map((k) => kisa(e, k)), kuralHatalari, ornekler, bilenler };
}

export function sesDene(e: EvrenVt, dil: string, bicim: string) {
  dilMi(e, dil);
  return uygula(dilOku(e, dil), temiz(bicim, 60));
}

/** Kaynak dildeki biçimden bütün türev dillere (dönem, lehçe, ödünç alan dil) biçimler türetir. */
export function adTuret(e: EvrenVt, dil: string, bicim: string, kayit: string | null): TuretilenBicim[] {
  dilMi(e, dil);
  const b0 = temiz(bicim, 60);
  if (!b0) throw new Error('Türetilecek biçimi yazın.');
  const kayitli = kayit ? adBicimleriOku(e, kayit) : [];
  const sonuc: TuretilenBicim[] = [];
  const gorulen = new Set([dil]);
  let duzey = [{ dil, bicim: b0, yol: [kisa(e, dil)] }];
  for (let n = 0; n < DERINLIK && duzey.length; n++) {
    const yeni: typeof duzey = [];
    for (const x of duzey) {
      for (const t of turevler(e, x.dil)) {
        if (gorulen.has(t)) continue;
        gorulen.add(t);
        const r = uygula(dilOku(e, t), x.bicim);
        const yol = [...x.yol, kisa(e, t)];
        sonuc.push({ dil: kisa(e, t), kaynakBicim: x.bicim, bicim: r.sonuc, yol, iz: r.iz,
          hata: r.hatalar.length ? `${r.hatalar.length} kural okunamadı; onlar atlandı.` : null,
          kayitli: kayitli.find((k) => k.dil.kod === t)?.bicim ?? null });
        yeni.push({ dil: t, bicim: r.sonuc, yol });
      }
    }
    duzey = yeni;
  }
  return sonuc;
}

// ---------- Ad üretici ----------

/** Ses paletinden ya da sözlükteki ön ek, kök ve son eklerden aday adlar; var olan kayıt adları işaretlenir. */
export function adUret(e: EvrenVt, dil: string, kip: 'hece' | 'bicim', enAz: number, enCok: number, adet: number, rastgele: () => number = Math.random): UretilenAd[] {
  dilMi(e, dil);
  const t = dilOku(e, dil);
  enAz = Math.max(1, Math.min(6, Math.floor(enAz) || 1));
  enCok = Math.max(enAz, Math.min(6, Math.floor(enCok) || enAz));
  adet = Math.max(1, Math.min(60, Math.floor(adet) || 12));
  const sec = <T>(l: T[]) => l[Math.floor(rastgele() * l.length)];
  const buyut = (s: string) => (s ? s[0].toLocaleUpperCase('tr-TR') + s.slice(1) : s);
  const adlar = new Set(e.db.selectObjects('SELECT ad FROM kayitlar WHERE silindi IS NULL').map((r) => katla(r.ad as string)));
  const kokler = t.sozluk.filter((s) => s.tur === 'kok'), onekler = t.sozluk.filter((s) => s.tur === 'onek'), sonekler = t.sozluk.filter((s) => s.tur === 'sonek');
  if (kip === 'hece' && !t.heceler.length) throw new Error('Bu dilin ses paletinde hece yok.');
  if (kip === 'bicim' && !kokler.length) throw new Error('Bu dilin sözlüğünde kök yok.');
  const sonuc = new Map<string, UretilenAd>();
  for (let deneme = 0; sonuc.size < adet && deneme < adet * 30; deneme++) {
    let parcalar: { bicim: string; anlam: string }[];
    if (kip === 'hece') {
      const n = enAz + Math.floor(rastgele() * (enCok - enAz + 1));
      parcalar = Array.from({ length: n }, () => ({ bicim: sec(t.heceler), anlam: '' }));
    } else {
      parcalar = [];
      if (onekler.length && rastgele() < 0.4) parcalar.push(sec(onekler));
      parcalar.push(sec(kokler));
      if (kokler.length > 1 && rastgele() < 0.3) parcalar.push(sec(kokler));
      if (sonekler.length && rastgele() < 0.6) parcalar.push(sec(sonekler));
      parcalar = parcalar.map((p) => ({ bicim: p.bicim.replace(/^-|-$/g, ''), anlam: p.anlam }));
    }
    const ad = buyut(parcalar.map((p) => p.bicim).join(''));
    if (!ad || sonuc.has(ad)) continue;
    sonuc.set(ad, { ad, parcalar, varOlan: adlar.has(katla(ad)) });
  }
  return [...sonuc.values()];
}

// ---------- Kaydın dillerdeki biçimleri ----------

export function adBicimleriOku(e: EvrenVt, kayit: string): AdBicimi[] {
  const r = e.db.selectValue('SELECT bicimler FROM ad_bicimleri WHERE kod=?', [kayit]) as string | undefined;
  if (!r) return [];
  const m = JSON.parse(r) as Record<string, { bicim: string; kaynakDil: string | null; kaynakBicim: string | null }>;
  return Object.entries(m).map(([d, v]) => ({ dil: kisa(e, d), bicim: v.bicim, turetildi: v.kaynakDil ? { kaynakDil: kisa(e, v.kaynakDil), kaynakBicim: v.kaynakBicim ?? '' } : null }))
    .sort((a, b) => a.dil.ad.localeCompare(b.dil.ad, 'tr'));
}

export function adBicimiYaz(b: DilBaglami, kayit: string, dil: string, bicim: string | null, kaynakDil: string | null, kaynakBicim: string | null) {
  kayitTuru(b.e, kayit); dilMi(b.e, dil);
  if (kaynakDil) dilMi(b.e, kaynakDil);
  const x = bicim === null ? null : temiz(bicim, 60);
  if (x === '') throw new Error('Biçim boş olamaz.');
  const deger = x === null ? null : { bicim: x, kaynakDil: kaynakDil ?? null, kaynakBicim: kaynakDil ? temiz(kaynakBicim, 60) : null };
  b.yaz([{ tur: 'ad_bicimi_yaz', veri: { kayit, dil, deger } }], [kayit]);
}

// ---------- Dil yeterliliği ----------

function yeterlilikOku(e: EvrenVt, iliski: string): DilYeterliligi | null {
  const r = e.db.selectValue('SELECT deger FROM dil_yeterlilikleri WHERE iliski=?', [iliski]) as string | undefined;
  return r ? JSON.parse(r) as DilYeterliligi : null;
}

export function kisiDilleri(e: EvrenVt, kisi: string): KisiDili[] {
  kayitTuru(e, kisi);
  return e.db.selectObjects(`SELECT i.kod, i.b FROM iliskiler i JOIN kayitlar x ON x.kod=i.b WHERE i.a=? AND i.tur='dil_bilir' AND ${ETKIN} AND x.silindi IS NULL ORDER BY x.ad`, [kisi])
    .map((r) => ({ dil: kisa(e, r.b as string), iliski: r.kod as string, yeterlilik: yeterlilikOku(e, r.kod as string) }));
}

export function dilYeterliligiYaz(b: DilBaglami, iliski: string, d: DilYeterliligi | null) {
  const r = typeof iliski === 'string' && kodGecerliMi(iliski) ? b.e.db.selectObject(`SELECT a, b FROM iliskiler WHERE kod=? AND tur='dil_bilir' AND silindi IS NULL`, [iliski]) : undefined;
  if (!r) throw new Error('İlişki bulunamadı.');
  let deger: DilYeterliligi | null = null;
  if (d) {
    const v = {} as DilYeterliligi;
    for (const k of BECERILER) {
      const x = d[k];
      if (x !== null && x !== undefined && !DUZEYLER.includes(x)) throw new Error('Geçersiz düzey.');
      v[k] = x ?? null;
    }
    v.not = temiz(d.not, 300);
    deger = BECERILER.every((k) => v[k] === null) && !v.not ? null : v;
  }
  b.yaz([{ tur: 'dil_yeterliligi_yaz', veri: { iliski, deger, a: r.a, b: r.b } }], [r.a as string, r.b as string]);
}
