// İki evren hâli arasındaki fark (§9.7): adlandırılmış sürüm ile bugün, ya da deneme kopyası ile ana evren.
// Yalnızca görünen tablolardan okunur; anlam çıkarılmaz. Kayıtlarda alan alan, ilişkilerde tür, yön, tarih ve rol.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { ILISKI_TURLERI } from '../alan/iliski-turleri';
import type { EvrenFarki, FarkAlani, IliskiFarki, KayitFarki } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi } from './izdusum';
import { kayitSablonu } from './sablon';
import { sayiDegeriMi, sayiMetni } from '../alan/nicelik';

type Satir = Record<string, unknown>;
const ifade = (ham: unknown): string | null => {
  if (ham === null || ham === undefined || ham === '') return null;
  let v: unknown = ham;
  if (typeof ham === 'string') { try { v = JSON.parse(ham); } catch { return ham; } }
  if (v && typeof v === 'object') {
    const o = v as { ifade?: string; tarih?: { ifade?: string } | null; olay?: string | null };
    if (o.ifade) return o.ifade;
    if (o.tarih?.ifade) return o.tarih.ifade;
    if (o.olay) return 'bir olaya bağlı';
  }
  return typeof v === 'string' ? v : JSON.stringify(v);
};
const liste = (ham: unknown) => (JSON.parse(String(ham ?? '[]')) as string[]).join(', ') || null;
const deger = (d: unknown): string | null => {
  if (d === null || d === undefined || d === '') return null;
  if (typeof d === 'object' && d && 'ifade' in d) return (d as { ifade: string }).ifade;
  if (sayiDegeriMi(d)) return sayiMetni(d);
  if (d === true) return 'Evet';
  if (d === false) return 'Hayır';
  return typeof d === 'string' ? d : JSON.stringify(d);
};
const metin = (db: Database, kod: string) => metinBelgesi(db, kod, 'govde')?.t ?? '';

function alanDegerleri(e: EvrenVt, kod: string): Map<string, { etiket: string; deger: string | null }> {
  const m = new Map<string, { etiket: string; deger: string | null }>();
  try {
    const ks = kayitSablonu(e, kod);
    for (const a of ks.sablon.alanlar) {
      const v = ks.degerler[a.kod];
      const s = a.secenekler && typeof v === 'string' ? a.secenekler.find((x) => x.kod === v)?.ad ?? v : deger(v);
      m.set(a.kod, { etiket: a.ad, deger: s });
    }
    for (const x of ks.eskiler) m.set(x.kod, { etiket: x.kod, deger: deger(x.deger) });
  } catch { /* kayıt yoksa alan da yok */ }
  return m;
}

function durumlar(db: Database, kod: string): Set<string> {
  return new Set(db.selectObjects('SELECT ozellik, deger, baslangic, bitis FROM durumlar WHERE konu=? AND silindi IS NULL', [kod])
    .map((r) => `${r.ozellik}: ${r.deger}${r.baslangic || r.bitis ? ` (${ifade(r.baslangic) ?? '…'} – ${ifade(r.bitis) ?? '…'})` : ''}`));
}

function kayitFarki(eski: EvrenVt, yeni: EvrenVt, kod: string, a: Satir | undefined, b: Satir | undefined): KayitFarki | null {
  const etkinA = !!a && !a.silindi, etkinB = !!b && !b.silindi;
  if (!etkinA && !etkinB) return null;
  const r = (etkinB ? b : a)!;
  const temel = { kod, ad: r.ad as string, tur: r.tur as string };
  if (!etkinA) return { ...temel, durum: 'yeni', alanlar: [] };
  if (!etkinB) return { ...temel, durum: 'silindi', alanlar: [] };
  const alanlar: FarkAlani[] = [];
  const koy = (alan: string, etiket: string, once: string | null, sonra: string | null) => { if (once !== sonra) alanlar.push({ alan, etiket, once, sonra }); };
  koy('ad', 'Adı', a!.ad as string, b!.ad as string);
  koy('tur', 'Türü', a!.tur as string, b!.tur as string);
  koy('ozet', 'Özeti', (a!.ozet as string) || null, (b!.ozet as string) || null);
  koy('karar', 'Karar durumu', a!.karar as string, b!.karar as string);
  koy('tarih', 'Tarihi', ifade(a!.tarih), ifade(b!.tarih));
  koy('lakaplar', 'Lakapları', liste(a!.lakaplar), liste(b!.lakaplar));
  koy('etiketler', 'Etiketleri', liste(a!.etiketler), liste(b!.etiketler));
  const ma = metin(eski.db, kod), mb = metin(yeni.db, kod);
  if (ma !== mb) alanlar.push({ alan: 'metin', etiket: 'Metni', once: ma ? `${ma.length} harf` : null, sonra: mb ? `${mb.length} harf` : null });
  const da = alanDegerleri(eski, kod), db = alanDegerleri(yeni, kod);
  for (const k of new Set([...da.keys(), ...db.keys()])) koy(`alan:${k}`, (db.get(k) ?? da.get(k))!.etiket, da.get(k)?.deger ?? null, db.get(k)?.deger ?? null);
  const sa = durumlar(eski.db, kod), sb = durumlar(yeni.db, kod);
  for (const x of sa) if (!sb.has(x)) alanlar.push({ alan: 'durum', etiket: 'Zamanla değişen', once: x, sonra: null });
  for (const x of sb) if (!sa.has(x)) alanlar.push({ alan: 'durum', etiket: 'Zamanla değişen', once: null, sonra: x });
  return alanlar.length ? { ...temel, durum: 'degisti', alanlar } : null;
}

const ad = (e: EvrenVt, ote: EvrenVt, kod: string) => {
  const r = (e.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [kod]) ?? ote.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [kod]));
  return r ? { kod, ad: r.ad as string, tur: r.tur as string } : { kod, ad: 'Silinmiş kayıt', tur: 'diger' };
};

function iliskiFarki(eski: EvrenVt, yeni: EvrenVt, kod: string, a: Satir | undefined, b: Satir | undefined): IliskiFarki | null {
  const etkinA = !!a && !a.silindi, etkinB = !!b && !b.silindi;
  if (!etkinA && !etkinB) return null;
  const r = (etkinB ? b : a)!;
  const t = ILISKI_TURLERI.find((x) => x.kod === r.tur);
  const temel = { kod, tur: (t?.aIcin ?? String(r.tur)).toLocaleLowerCase('tr-TR'), a: ad(yeni, eski, r.a as string), b: ad(yeni, eski, r.b as string) };
  if (!etkinA) return { ...temel, durum: 'yeni', ayrinti: [] };
  if (!etkinB) return { ...temel, durum: 'silindi', ayrinti: [] };
  const ayrinti: string[] = [];
  if (a!.tur !== b!.tur) ayrinti.push('türü değişti');
  if (a!.a !== b!.a || a!.b !== b!.b) ayrinti.push(a!.a === b!.b && a!.b === b!.a ? 'yönü değişti' : 'bağlı kayıtlar değişti');
  const ta = `${ifade(a!.baslangic) ?? '…'} – ${ifade(a!.bitis) ?? '…'}`, tb = `${ifade(b!.baslangic) ?? '…'} – ${ifade(b!.bitis) ?? '…'}`;
  if (ta !== tb) ayrinti.push(`tarihi: ${ta} → ${tb}`);
  if ((a!.rol ?? null) !== (b!.rol ?? null)) ayrinti.push('rolü değişti');
  if (a!.karar !== b!.karar) ayrinti.push('karar durumu değişti');
  if (a!.aciklama !== b!.aciklama) ayrinti.push('açıklaması değişti');
  return ayrinti.length ? { ...temel, durum: 'degisti', ayrinti } : null;
}

const sozluk = (db: Database, sql: string) => new Map(db.selectObjects(sql).map((r) => [r.kod as string, r]));

/** Eskiden yeniye fark. Yönlendirilmiş (birleştirilmiş) kayıtlar ayrı sayılmaz. */
export function evrenFarki(eski: EvrenVt, yeni: EvrenVt): EvrenFarki {
  const yon = 'SELECT * FROM kayitlar WHERE kod NOT IN (SELECT kod FROM yonlendirmeler)';
  const ka = sozluk(eski.db, yon), kb = sozluk(yeni.db, yon);
  const kayitlar: KayitFarki[] = [];
  for (const k of new Set([...ka.keys(), ...kb.keys()])) { const f = kayitFarki(eski, yeni, k, ka.get(k), kb.get(k)); if (f) kayitlar.push(f); }
  const ia = sozluk(eski.db, 'SELECT * FROM iliskiler'), ib = sozluk(yeni.db, 'SELECT * FROM iliskiler');
  const iliskiler: IliskiFarki[] = [];
  for (const k of new Set([...ia.keys(), ...ib.keys()])) { const f = iliskiFarki(eski, yeni, k, ia.get(k), ib.get(k)); if (f) iliskiler.push(f); }
  const sira = { yeni: 0, silindi: 1, degisti: 2 } as const;
  kayitlar.sort((x, y) => sira[x.durum] - sira[y.durum] || x.ad.localeCompare(y.ad, 'tr'));
  iliskiler.sort((x, y) => sira[x.durum] - sira[y.durum] || x.a.ad.localeCompare(y.a.ad, 'tr'));
  return { kayitlar, iliskiler };
}
