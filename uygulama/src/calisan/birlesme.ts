// Editoryal birleştirme (§9.5): yanlışlıkla iki kez açılmış kayıt. Önizlemede korunacak kod, taşınacaklar, eski adlar
// ve çelişen alanlar gösterilir; birleştirme tek bir işlem grubudur ve bir bütün olarak geri alınır (§10.4).
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { katla } from '../alan/turkce';
import { KARARLAR, turBul } from '../alan/turler';
import type { BirlesmeOnizlemesi, BirlesmeAlani } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import * as sablonlar from './sablon';

export interface BirlesmeBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

type Satir = Record<string, unknown>;
const ANA_ALANLAR: { alan: string; etiket: string }[] = [
  { alan: 'ad', etiket: 'Ad' }, { alan: 'tur', etiket: 'Tür' }, { alan: 'ozet', etiket: 'Kısa özet' },
  { alan: 'okunus', etiket: 'Okunuş' }, { alan: 'karar', etiket: 'Karar durumu' }, { alan: 'tarih', etiket: 'Evren tarihi' },
];

function kayitOku(e: EvrenVt, kod: string): Satir {
  if (!kodGecerliMi(kod)) throw new Error('Kayıt bulunamadı.');
  const r = e.db.selectObject('SELECT * FROM kayitlar WHERE kod=?', [kod]);
  if (!r) throw new Error('Kayıt bulunamadı.');
  if (r.silindi !== null) throw new Error(`“${r.ad}” çöp kutusunda ya da başka bir kayıtla birleştirilmiş.`);
  return r;
}

const bos = (v: unknown) => v === null || v === undefined || v === '' || v === false;
const yazi = (alan: string, v: unknown): string => {
  if (bos(v)) return '(boş)';
  if (alan === 'tur') return turBul(String(v)).ad;
  if (alan === 'karar') return KARARLAR.find((k) => k.kod === v)?.ad ?? String(v);
  if (v === true) return 'Evet';
  if (typeof v === 'object' && v && 'ifade' in v) return String((v as { ifade: string }).ifade);
  return String(v);
};
const anaDeger = (r: Satir, alan: string) => (alan === 'tarih' ? (r.tarih ? JSON.parse(r.tarih as string) : null) : r[alan]);
const ayni = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  || (typeof a === 'object' && typeof b === 'object' && !!a && !!b && 'ifade' in a && 'ifade' in b && (a as { ifade: string }).ifade === (b as { ifade: string }).ifade);

/** İki kaydın alan değerleri: ana alanlar ve şablon alanları. */
function alanlar(e: EvrenVt, kaynak: Satir, hedef: Satir): BirlesmeAlani[] {
  const sonuc: BirlesmeAlani[] = [];
  for (const { alan, etiket } of ANA_ALANLAR) {
    const k = anaDeger(kaynak, alan), h = anaDeger(hedef, alan);
    if (bos(k) || ayni(k, h)) continue;
    sonuc.push({ alan, etiket, kaynak: yazi(alan, k), hedef: yazi(alan, h), celiski: !bos(h) });
  }
  const degerler = (kod: unknown) => new Map(e.db.selectObjects('SELECT alan, deger FROM alan_degerleri WHERE kayit=?', [kod as string]).map((r) => [r.alan as string, JSON.parse(r.deger as string)]));
  const kd = degerler(kaynak.kod), hd = degerler(hedef.kod);
  const sablonAdi = (alan: string) => sablonlar.sablonOku(e, hedef.tur as string).alanlar.find((a) => a.kod === alan)?.ad
    ?? sablonlar.sablonOku(e, kaynak.tur as string).alanlar.find((a) => a.kod === alan)?.ad ?? 'Şablonda olmayan alan';
  for (const [alan, k] of kd) {
    const h = hd.get(alan);
    if (bos(k) || ayni(k, h)) continue;
    sonuc.push({ alan: 'f:' + alan, etiket: sablonAdi(alan), kaynak: yazi(alan, k), hedef: yazi(alan, h), celiski: !bos(h) });
  }
  return sonuc;
}

export function onizle(e: EvrenVt, kaynakKod: string, hedefKod: string): BirlesmeOnizlemesi {
  if (kaynakKod === hedefKod) throw new Error('Bir kayıt kendisiyle birleştirilemez.');
  const kaynak = kayitOku(e, kaynakKod), hedef = kayitOku(e, hedefKod);
  const say = (sql: string, ...p: string[]) => Number(e.db.selectValue(sql, p) ?? 0);
  const hedefAdlari = new Set([hedef.ad as string, ...JSON.parse(hedef.lakaplar as string) as string[]].map(katla));
  const adlar = [kaynak.ad as string, ...JSON.parse(kaynak.lakaplar as string) as string[], ...JSON.parse(kaynak.onceki_adlar as string) as string[]]
    .filter((a, i, l) => !hedefAdlari.has(katla(a)) && l.findIndex((x) => katla(x) === katla(a)) === i);
  const metin = (e.db.selectValue("SELECT duz FROM metinler WHERE kayit=? AND alan='govde'", [kaynakKod]) as string | undefined) ?? '';
  return {
    kaynak: { kod: kaynakKod, ad: kaynak.ad as string, tur: kaynak.tur as string },
    hedef: { kod: hedefKod, ad: hedef.ad as string, tur: hedef.tur as string },
    adlar,
    alanlar: alanlar(e, kaynak, hedef),
    iliskiler: say('SELECT count(*) FROM iliskiler WHERE silindi IS NULL AND (a=?1 OR b=?1) AND NOT ((a=?1 AND b=?2) OR (a=?2 AND b=?1))', kaynakKod, hedefKod),
    aradakiIliskiler: say('SELECT count(*) FROM iliskiler WHERE silindi IS NULL AND ((a=?1 AND b=?2) OR (a=?2 AND b=?1))', kaynakKod, hedefKod),
    durumlar: say('SELECT count(*) FROM durumlar WHERE silindi IS NULL AND (konu=?1 OR hedef=?1)', kaynakKod),
    isaretler: say('SELECT count(*) FROM isaretler WHERE silindi IS NULL AND kayit=?', kaynakKod),
    haritalar: say('SELECT count(*) FROM haritalar WHERE silindi IS NULL AND yer=?', kaynakKod),
    degisimler: say('SELECT count(*) FROM degisimler WHERE silindi IS NULL AND (konu=?1 OR olay=?1)', kaynakKod),
    baglantilar: say('SELECT count(DISTINCT b.kaynak) FROM baglantilar b JOIN kayitlar k ON k.kod=b.kaynak WHERE b.hedef=? AND k.silindi IS NULL', kaynakKod),
    gorseller: (JSON.parse(kaynak.gorseller as string) as string[]).filter((g) => !(JSON.parse(hedef.gorseller as string) as string[]).includes(g)).length,
    metinVar: metin.trim().length > 0,
  };
}

/**
 * `secimler`: çelişen alanlarda kaynağın değeri alınacaksa alan adı → 'kaynak'. Boş alanlar kendiliğinden kaynaktan dolar.
 * Geri alma için her alan değişikliğinin tersi birleştirme işleminde saklanır.
 */
export function birlestir(b: BirlesmeBaglami, kaynakKod: string, hedefKod: string, secimler: Record<string, 'kaynak' | 'hedef'>) {
  const e = b.e;
  const o = onizle(e, kaynakKod, hedefKod);
  const kaynak = kayitOku(e, kaynakKod), hedef = kayitOku(e, hedefKod);
  const girdiler: IslemGirdisi[] = [];
  const geri: IslemGirdisi[] = [];
  for (const a of o.alanlar) {
    if (a.celiski && secimler[a.alan] !== 'kaynak') continue;
    if (a.alan === 'tarih') {
      const t = anaDeger(kaynak, 'tarih'), onceki = anaDeger(hedef, 'tarih');
      girdiler.push({ tur: 'kayit_tarih', veri: { kod: hedefKod, tarih: t, onceki } });
      geri.push({ tur: 'kayit_tarih', veri: { kod: hedefKod, tarih: onceki, onceki: t } });
    } else if (a.alan.startsWith('f:')) {
      const alan = a.alan.slice(2);
      const deger = (k: string) => { const r = e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [k, alan]) as string | undefined; return r ? JSON.parse(r) : null; };
      const yeni = deger(kaynakKod), onceki = deger(hedefKod);
      girdiler.push({ tur: 'kayit_alan', veri: { kod: hedefKod, alan, ad: a.etiket, deger: yeni } });
      geri.push({ tur: 'kayit_alan', veri: { kod: hedefKod, alan, ad: a.etiket, deger: onceki } });
    } else {
      const yeni = kaynak[a.alan] as string, onceki = hedef[a.alan] as string;
      girdiler.push({ tur: 'kayit_degistir', veri: { kod: hedefKod, alan: a.alan, deger: yeni, onceki } });
      geri.push({ tur: 'kayit_degistir', veri: { kod: hedefKod, alan: a.alan, deger: onceki, onceki: yeni } });
    }
  }
  // Kaynağın adları lakap olarak kalır; ad değişirse hedefin eski adı da lakap olur.
  const adSecildi = girdiler.some((g) => g.tur === 'kayit_degistir' && g.veri.alan === 'ad');
  const lakaplar = adSecildi ? [...o.adlar.filter((a) => katla(a) !== katla(kaynak.ad as string)), hedef.ad as string] : o.adlar;
  for (const l of lakaplar) {
    girdiler.push({ tur: 'kayit_lakap', veri: { kod: hedefKod, ekle: l } });
    geri.push({ tur: 'kayit_lakap', veri: { kod: hedefKod, cikar: l } });
  }
  const hedefEtiket = JSON.parse(hedef.etiketler as string) as string[];
  for (const t of (JSON.parse(kaynak.etiketler as string) as string[]).filter((x) => !hedefEtiket.includes(x))) {
    girdiler.push({ tur: 'kayit_etiket', veri: { kod: hedefKod, ekle: t } });
    geri.push({ tur: 'kayit_etiket', veri: { kod: hedefKod, cikar: t } });
  }
  const hedefGorsel = JSON.parse(hedef.gorseller as string) as string[];
  for (const g of (JSON.parse(kaynak.gorseller as string) as string[]).filter((x) => !hedefGorsel.includes(x))) {
    girdiler.push({ tur: 'kayit_gorsel', veri: { kod: hedefKod, ekle: g } });
    geri.push({ tur: 'kayit_gorsel', veri: { kod: hedefKod, cikar: g } });
  }
  // Cevaplanmış sorular, hedefte cevabı yoksa taşınır.
  for (const r of e.db.selectObjects('SELECT * FROM soru_cevaplari WHERE kayit=? AND soru NOT IN (SELECT soru FROM soru_cevaplari WHERE kayit=?)', [kaynakKod, hedefKod])) {
    girdiler.push({ tur: 'soru_cevapla', veri: { kod: hedefKod, soru: r.soru, durum: r.durum, cevap: r.cevap, metin: r.metin, ...(r.kayitla ? { kayitla: r.kayitla } : {}) } });
    geri.push({ tur: 'soru_cevapla', veri: { kod: hedefKod, soru: r.soru, durum: null, metin: r.metin } });
  }
  girdiler.push({ tur: 'kayit_birlestir', veri: { kaynak: kaynakKod, hedef: hedefKod, kaynakAd: kaynak.ad, hedefAd: hedef.ad, geri } });
  b.yaz(girdiler, [kaynakKod, hedefKod]);
}

/** Birleştirmeyi geri alır: alan değişiklikleri tersine çevrilir, taşınan satırlar kaynağa döner, kaynak yeniden görünür. */
export function geriAl(b: BirlesmeBaglami, kaynakKod: string) {
  const e = b.e;
  const y = kodGecerliMi(kaynakKod) ? e.db.selectObject('SELECT hedef, islem FROM yonlendirmeler WHERE kod=?', [kaynakKod]) : undefined;
  if (!y) throw new Error('Bu kayıt birleştirilmiş görünmüyor.');
  const islem = y.islem as string;
  const ham = e.db.selectValue('SELECT veri FROM islemler WHERE kod=?', [islem]) as string | undefined;
  const veri = ham ? JSON.parse(ham) as { hedef: string; kaynakAd: string; hedefAd: string; geri?: IslemGirdisi[] } : null;
  if (!veri) throw new Error('Birleştirme kaydı bulunamadı.');
  const hedef = yonlendir(e.db, veri.hedef);
  const geri = (veri.geri ?? []).filter((g) => g && typeof g.tur === 'string' && g.veri && typeof g.veri === 'object')
    .map((g) => ({ tur: g.tur, veri: { ...g.veri, kod: hedef } }));
  b.yaz([...geri, { tur: 'birlesme_geri_al', veri: { kaynak: kaynakKod, hedef, islem, kaynakAd: veri.kaynakAd } }], [kaynakKod, hedef]);
}

/** Kayıt sayfası için: bu kayıt neyle birleşmiş, buna hangi kayıtlar birleşmiş. */
export function birlesmeBilgisi(e: EvrenVt, kod: string) {
  const y = e.db.selectObject('SELECT y.hedef, k.ad FROM yonlendirmeler y LEFT JOIN kayitlar k ON k.kod=y.hedef WHERE y.kod=?', [kod]);
  const son = y ? yonlendir(e.db, y.hedef as string) : null;
  return {
    birlesti: y ? { kod: son!, ad: (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [son]) as string | undefined) ?? 'Kayıt' } : null,
    birlesenler: e.db.selectObjects('SELECT y.kod, k.ad FROM yonlendirmeler y JOIN kayitlar k ON k.kod=y.kod WHERE y.hedef=? ORDER BY k.ad', [kod])
      .map((r) => ({ kod: r.kod as string, ad: r.ad as string })),
  };
}
