// Kurgu montajı ve ipuçları (§15-9, F13). Okurun bir şeyi hangi sahnede öğrendiği okuma sırasından hesaplanır;
// sahne taşınınca kendiliğinden değişir. Sahneler yazarın niyetiyle işaretlenir: bir açıklamayı destekler,
// zayıflatır ya da açıklar. Gerçek seçeneği destekleyen işaret ipucu, başka seçeneği destekleyen yanıltmacadır.
// Uyarı yalnızca yazarın o soru için seçtiği hedefe (sürpriz ya da gerilim) göre verilir. Program okurun zihnini
// ölçmez, edebî kalite puanı vermez.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import type { KisaKayit, KurguMontaji, MontajHedefi, SahneNiyeti } from '../veri/api';
import { eserYapisi, yerlestir, type AnlatiBaglami } from './anlati';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

export interface MontajBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;
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

export function niyetlerOku(e: EvrenVt, sahne: string): SahneNiyeti[] {
  const r = e.db.selectValue('SELECT niyetler FROM sahne_niyetleri WHERE kod=?', [sahne]) as string | undefined;
  return r ? JSON.parse(r) : [];
}

export function sahneNiyetleriYaz(b: MontajBaglami, sahne: string, l: SahneNiyeti[]) {
  if (kayitTuru(b.e, sahne) !== 'sahne') throw new Error('Niyet yalnızca bir sahneye eklenebilir.');
  if (!Array.isArray(l) || l.length > 50) throw new Error('Liste çok uzun ya da geçersiz.');
  const yeni = l.map((n) => {
    const r = typeof n.iddia === 'string' ? b.e.db.selectObject('SELECT secenekler FROM iddialar WHERE kod=? AND silindi IS NULL', [n.iddia]) : undefined;
    if (!r) throw new Error('Soru bulunamadı.');
    if (!['destekler', 'zayiflatir', 'aciklar'].includes(n.tur)) throw new Error('Geçersiz niyet.');
    const secenekler = JSON.parse(r.secenekler as string) as { kod: string }[];
    if (n.secenek !== null && !secenekler.some((s) => s.kod === n.secenek)) throw new Error('Seçenek bulunamadı.');
    if (n.tur !== 'aciklar' && n.secenek === null) throw new Error('Desteklenen ya da zayıflatılan açıklamayı seçin.');
    return { iddia: n.iddia, secenek: n.secenek, tur: n.tur };
  });
  if (JSON.stringify(yeni) === JSON.stringify(niyetlerOku(b.e, sahne))) return;
  b.yaz([{ tur: 'sahne_niyeti_yaz', veri: { sahne, niyetler: yeni } }], [sahne]);
}

function hedeflerOku(e: EvrenVt, eser: string): Record<string, MontajHedefi> {
  const r = e.db.selectValue('SELECT hedefler FROM montaj_hedefleri WHERE kod=?', [eser]) as string | undefined;
  return r ? JSON.parse(r) : {};
}

export function montajHedefiYaz(b: MontajBaglami, eser: string, iddia: string, hedef: MontajHedefi | null) {
  if (kayitTuru(b.e, eser) !== 'eser') throw new Error('Hedef yalnızca bir eser için belirlenebilir.');
  if (b.e.db.selectValue('SELECT 1 FROM iddialar WHERE kod=? AND silindi IS NULL', [iddia]) === undefined) throw new Error('Soru bulunamadı.');
  if (hedef !== null && hedef !== 'surpriz' && hedef !== 'gerilim') throw new Error('Geçersiz hedef.');
  b.yaz([{ tur: 'montaj_hedefi_yaz', veri: { eser, iddia, hedef } }], [eser]);
}

/** Eserin okuma sırası: sahne, bulunduğu üst (eser ya da bölüm) ve bölüm adı. */
function sira(e: EvrenVt, eser: string) {
  const y = eserYapisi(e, eser);
  return [...y.dogrudan.map((s) => ({ ...s, ust: eser, bolum: null as string | null })), ...y.bolumler.flatMap((b) => b.sahneler.map((s) => ({ ...s, ust: b.kod, bolum: b.ad })))];
}

export function kurguMontaji(e: EvrenVt, eser: string): KurguMontaji {
  if (kayitTuru(e, eser) !== 'eser') throw new Error('Bu bir eser kaydı değil.');
  const sahneler = sira(e, eser);
  const n = sahneler.length;
  const siraOf = new Map(sahneler.map((s) => [s.kod, s.sira]));
  const hedefler = hedeflerOku(e, eser);

  // Sorular: bu eserde niyet işareti, okur bilgisi ya da hedefi olanlar.
  type Olay = KurguMontaji['sorular'][number]['olaylar'][number];
  const olaylar = new Map<string, Olay[]>();
  const ekle = (iddia: string, o: Olay) => olaylar.set(iddia, [...(olaylar.get(iddia) ?? []), o]);
  const iddiaBilgi = new Map<string, { secenekler: { kod: string; metin: string }[]; gercek: string | null; soru: string; konu: string }>();
  const iddiaOku = (k: string) => {
    if (!iddiaBilgi.has(k)) {
      const r = e.db.selectObject('SELECT soru, konu, secenekler, gercek FROM iddialar WHERE kod=? AND silindi IS NULL', [k]);
      if (r) iddiaBilgi.set(k, { soru: r.soru as string, konu: r.konu as string, secenekler: JSON.parse(r.secenekler as string), gercek: (r.gercek as string) ?? null });
    }
    return iddiaBilgi.get(k);
  };
  for (const s of sahneler) {
    for (const ni of niyetlerOku(e, s.kod)) {
      const i = iddiaOku(ni.iddia);
      if (!i) continue;
      const sec = i.secenekler.find((x) => x.kod === ni.secenek) ?? null;
      const tur = ni.tur === 'aciklar' ? 'aciklama' : ni.tur === 'zayiflatir' ? 'zayiflatir' : i.gercek && ni.secenek === i.gercek ? 'ipucu' : i.gercek ? 'yaniltmaca' : 'destekler';
      ekle(ni.iddia, { sira: s.sira, sahne: { kod: s.kod, ad: s.ad, tur: 'sahne' }, tur, secenek: sec?.metin ?? null });
    }
  }
  for (const r of e.db.selectObjects(`SELECT iddia, secenek, inanc, sahne FROM bilgiler WHERE bilen=? AND silindi IS NULL AND karar<>'vazgecildi' AND sahne IS NOT NULL`, [eser])) {
    const s = siraOf.get(r.sahne as string);
    const i = iddiaOku(r.iddia as string);
    if (s === undefined || !i) continue;
    const sec = i.secenekler.find((x) => x.kod === r.secenek) ?? null;
    const inanc = r.inanc as string;
    ekle(r.iddia as string, { sira: s, sahne: kisa(e, r.sahne as string), tur: 'okur', secenek: sec?.metin ?? null, inanc,
      gercegi: inanc === 'inaniyor' && !!i.gercek && r.secenek === i.gercek });
  }
  for (const k of Object.keys(hedefler)) if (!olaylar.has(k) && iddiaOku(k)) olaylar.set(k, []);

  const sorular: KurguMontaji['sorular'] = [...olaylar.entries()].map(([k, l]) => {
    const i = iddiaOku(k)!;
    l.sort((a, b) => a.sira - b.sira);
    const hedef = hedefler[k] ?? null;
    const aciklama = l.find((x) => x.tur === 'aciklama') ?? null;
    const ogrenir = l.find((x) => x.tur === 'okur' && x.gercegi) ?? null;
    const uyarilar: string[] = [];
    if (hedef === 'surpriz') {
      if (!aciklama) uyarilar.push('Hedef sürpriz, ama açıklama sahnesi işaretlenmemiş.');
      else {
        if (!i.gercek) uyarilar.push('Gerçek seçilmediği için ipucu ile yanıltmaca ayırt edilemiyor.');
        else if (!l.some((x) => x.tur === 'ipucu' && x.sira < aciklama.sira)) uyarilar.push(`Hedef sürpriz, ama açıklamadan (${aciklama.sira}. sahne) önce gerçeğe işaret eden bir ipucu yok.`);
        if (ogrenir && ogrenir.sira < aciklama.sira) uyarilar.push(`Hedef sürpriz, ama okur gerçeği açıklamadan önce, ${ogrenir.sira}. sahnede öğreniyor.`);
      }
    } else if (hedef === 'gerilim') {
      if (!ogrenir) uyarilar.push('Hedef gerilim, ama okurun gerçeği hangi sahnede öğrendiği işaretlenmemiş.');
      else if (aciklama && ogrenir.sira >= aciklama.sira) uyarilar.push(`Hedef gerilim, ama okur gerçeği açıklamadan önce öğrenmiyor (${ogrenir.sira}. sahne).`);
    }
    return { iddia: { kod: k, soru: i.soru, konu: kisa(e, i.konu), gercek: i.secenekler.find((x) => x.kod === i.gercek)?.metin ?? null }, hedef, olaylar: l, okurOgrenir: ogrenir?.sira ?? null, uyarilar };
  }).sort((a, b) => (a.olaylar[0]?.sira ?? 1e9) - (b.olaylar[0]?.sira ?? 1e9));

  // İşaretli kullanımlar: motifler, kurgu hatları ve sorular; son kullanım sondan kaç sahne önce, en uzun ara.
  const yer = sahneler.map(() => '?').join(',');
  const kullanimlar = new Map<string, Set<number>>();
  const kullan = (k: string, s: number) => kullanimlar.set(k, (kullanimlar.get(k) ?? new Set()).add(s));
  if (n) {
    const kodlar = sahneler.map((s) => s.kod);
    for (const r of e.db.selectObjects(`SELECT i.a, i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.tur IN ('motif_gecer','kurgu_hattinda') AND i.a IN (${yer}) AND ${ETKIN} AND k.silindi IS NULL`, kodlar)) {
      kullan(r.b as string, siraOf.get(r.a as string)!);
    }
  }
  const araOzeti = (siralar: number[]) => {
    const l = [...siralar].sort((a, b) => a - b);
    let enUzun = l.length ? l[0] - 1 : 0;
    for (let x = 1; x < l.length; x++) enUzun = Math.max(enUzun, l[x] - l[x - 1] - 1);
    return { siralar: l, enUzunAra: enUzun, sondan: l.length ? n - l[l.length - 1] : n };
  };
  const izler: KurguMontaji['izler'] = [...kullanimlar.entries()].map(([k, s]) => ({ kayit: kisa(e, k), ...araOzeti([...s]) }))
    .sort((a, b) => b.sondan - a.sondan || a.kayit.ad.localeCompare(b.kayit.ad, 'tr'));

  // Karakter yokluk ısı haritası: her sahnede bulunuyor mu; değilse son görüldüğünden bu yana kaç sahne geçti.
  const bulunma = new Map<string, Set<number>>();
  if (n) {
    for (const r of e.db.selectObjects(`SELECT i.a, i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.tur='sahnede' AND (i.rol IS NULL OR i.rol='bulunuyor') AND i.b IN (${yer})
        AND ${ETKIN} AND k.silindi IS NULL AND k.tur='karakter'`, sahneler.map((s) => s.kod))) {
      bulunma.set(r.a as string, (bulunma.get(r.a as string) ?? new Set()).add(siraOf.get(r.b as string)!));
    }
  }
  const yokluk: KurguMontaji['yokluk'] = [...bulunma.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 40).map(([k, s]) => {
    let son: number | null = null;
    const hucreler = sahneler.map((x) => { if (s.has(x.sira)) { son = x.sira; return 0; } return son === null ? -1 : x.sira - son; });
    return { kisi: kisa(e, k), hucreler, sayi: s.size };
  }).sort((a, b) => a.kisi.ad.localeCompare(b.kisi.ad, 'tr'));

  return {
    eser: kisa(e, eser), sahneler: sahneler.map((s) => ({ kod: s.kod, ad: s.ad, sira: s.sira, bolum: s.bolum })), sorular, izler, yokluk,
    not: 'Okurun ne öğrendiği okur bilgisi kayıtlarından, niyetler de sahnelere eklenen işaretlerden alınır. Okurun zihni ölçülmez. Uyarılar yalnızca hedefi seçilmiş sorular için verilir.',
  };
}

/** Sahneyi okuma sırasında bir önceki ya da sonraki yere taşır (bölüm sınırını geçebilir). */
export function montajTasi(b: AnlatiBaglami, sahne: string, yon: -1 | 1) {
  const e = b.e;
  const ust = e.db.selectValue('SELECT ust FROM anlati WHERE kod=?', [sahne]) as string | undefined;
  if (!ust) throw new Error('Sahne bir esere yerleşmemiş.');
  const eser = kayitTuru(e, ust) === 'bolum' ? e.db.selectValue('SELECT ust FROM anlati WHERE kod=?', [ust]) as string : ust;
  const l = sira(e, eser);
  const i = l.findIndex((s) => s.kod === sahne);
  const komsu = l[i + yon];
  if (!komsu) throw new Error(yon < 0 ? 'Sahne zaten ilk sırada.' : 'Sahne zaten son sırada.');
  const kardes = l.filter((s) => s.ust === komsu.ust && s.kod !== sahne);
  const j = kardes.findIndex((s) => s.kod === komsu.kod);
  const ayni = komsu.ust === l[i].ust;
  const hedef = yon < 0 ? j + (ayni ? 0 : 1) : j + (ayni ? 1 : 0);
  return yerlestir(b, sahne, komsu.ust, hedef);
}
