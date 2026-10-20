// Kurgu montajı ve ipuçları (§15-9, F13). Okurun bir şeyi hangi sahnede öğrendiği okuma sırasından hesaplanır;
// sahne taşınınca kendiliğinden değişir. Sahneler yazarın niyetiyle işaretlenir: bir açıklamayı destekler,
// zayıflatır ya da açıklar. Gerçek seçeneği destekleyen işaret ipucu, başka seçeneği destekleyen yanıltmacadır.
// Uyarı yalnızca yazarın o soru için seçtiği hedefe (sürpriz ya da gerilim) göre verilir. Program okurun zihnini
// ölçmez, edebî kalite puanı vermez.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import type { KisaKayit, KitapSonuAciklar, KurguMontaji, MontajHedefi, OlayOrgusu, SahneNiyeti } from '../veri/api';
import { eserYapisi, yerlestir, type AnlatiBaglami } from './anlati';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { rolAdi } from '../alan/iliski-turleri';
import { DONUM_ETIKETI } from '../alan/sablon';
import { okumaYollari, seriEserleri } from './seri';

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

/** Kitap sonunda açık olanlar (K27, Model §7): seçilen eserin okuma sırasıyla, okura sorulan ama bu eserde
 *  "açıklar" niyeti taşıyan sahnesi olmayan okur soruları. Konuma dayanır: sonraki kitaplar yazılınca bu eserin
 *  sütunu değişmez; yalnız "sonra" sütunu, serinin önerilen okuma sırasında bu eserden sonraki eserlere bakar.
 *  Serbest metinden "çözüldü" çıkarılmaz. */
export function kitapSonuAciklar(e: EvrenVt, eser: string, yolKod: string | null = null): KitapSonuAciklar {
  const m = kurguMontaji(e, eser);
  const seri = e.db.selectValue(`SELECT a.ust FROM anlati a JOIN kayitlar s ON s.kod=a.ust WHERE a.kod=? AND s.tur='seri' AND s.silindi IS NULL`, [eser]) as string | undefined;
  // Bu kitabın geçtiği okuma yolları: ana serisinde ve ek olarak katıldığı serilerde (K27).
  const seriKodlari = [...new Set([...(seri ? [seri] : []), ...(e.db.selectObjects(`SELECT i.a FROM iliskiler i JOIN kayitlar s ON s.kod=i.a WHERE i.tur='seri_eseri' AND i.b=? AND i.silindi IS NULL AND s.silindi IS NULL`, [eser]) as { a: string }[]).map((r) => r.a)])];
  const yollar = seriKodlari.flatMap((s) => okumaYollari(e, s)).filter((y) => y.eserler.some((x) => x.kod === eser));
  const yol = yolKod ? yollar.find((y) => y.kod === yolKod) ?? null : null;
  const sonrakiler: { kod: string; ad: string }[] = [];
  if (yol) sonrakiler.push(...yol.eserler.slice(yol.eserler.findIndex((x) => x.kod === eser) + 1));
  else if (seri) {
    const l = e.db.selectObjects(`SELECT k.kod, k.ad FROM anlati a JOIN kayitlar k ON k.kod=a.kod WHERE a.ust=? AND k.tur='eser' AND k.silindi IS NULL ORDER BY a.konum, a.kod`, [seri]) as { kod: string; ad: string }[];
    sonrakiler.push(...l.slice(l.findIndex((x) => x.kod === eser) + 1));
  }
  const sonrakiMontaj = new Map<string, KurguMontaji>();
  const montajOf = (k: string) => { if (!sonrakiMontaj.has(k)) sonrakiMontaj.set(k, kurguMontaji(e, k)); return sonrakiMontaj.get(k)!; };
  const sorular = m.sorular.filter((s) => s.olaylar.some((o) => o.tur !== 'okur') && !s.olaylar.some((o) => o.tur === 'aciklama')).map((s) => {
    let sonra: KitapSonuAciklar['sorular'][number]['sonra'] = null;
    for (const x of sonrakiler) {
      const a = montajOf(x.kod).sorular.find((q) => q.iddia.kod === s.iddia.kod)?.olaylar.find((o) => o.tur === 'aciklama');
      if (a) { sonra = { eser: { kod: x.kod, ad: x.ad, tur: 'eser' }, sahne: a.sahne, sira: a.sira }; break; }
    }
    return {
      iddia: s.iddia,
      ipucu: s.olaylar.filter((o) => o.tur === 'ipucu').length,
      yaniltmaca: s.olaylar.filter((o) => o.tur === 'yaniltmaca').length,
      destekler: s.olaylar.filter((o) => o.tur === 'destekler' || o.tur === 'zayiflatir').length,
      sonra,
    };
  });
  return { eser: m.eser, seride: !!seri || !!yol, sorular, yollar: yollar.map((y) => ({ kod: y.kod, ad: y.ad })), yol: yol?.kod ?? null };
}

/** Olay örgüsü masası (K27, P6): bir eserin okuma sırası sütunlarda; satırlar var olan verilerden gelir (dönüm
 *  noktası etiketi ve anlatılan olay, kurgu hatları, montajdaki okur soruları, sahnedeki karakterler, çalışma
 *  durumu). Yeni veri tutulmaz; taşıma bugünkü yerleştirmeyle yapılır. */
export function olayOrgusu(e: EvrenVt, kapsam: string): OlayOrgusu {
  const tur = kayitTuru(e, kapsam);
  if (tur !== 'eser' && tur !== 'seri') throw new Error('Bir eser ya da seri seçin.');
  // Seride sütunlar serinin kitaplarının sahneleridir, önerilen okuma sırasıyla (ek üyeler sonda).
  const eserler = tur === 'seri' ? seriEserleri(e, kapsam).map((x) => x.kod) : [kapsam];
  const sahneler = eserler.flatMap((x) => sira(e, x).map((s) => ({ ...s, eser: x })));
  const kodlar = sahneler.map((s) => s.kod);
  const sutun = new Map(kodlar.map((k, i) => [k, i]));
  const yer = kodlar.map(() => '?').join(',');
  const bos = <T>(d: T) => kodlar.map(() => d);
  const sec = (sql: string) => (kodlar.length ? e.db.selectObjects(sql, kodlar) : []);

  const etiket = new Map(sec(`SELECT kod, etiketler FROM kayitlar WHERE kod IN (${yer})`).map((r) => [r.kod as string, JSON.parse(r.etiketler as string) as string[]]));
  const calisma = new Map(sec(`SELECT kayit, deger FROM alan_degerleri WHERE alan='calisma' AND kayit IN (${yer})`).map((r) => [r.kayit as string, JSON.parse(r.deger as string) as string]));
  const metinli = new Set(sec(`SELECT DISTINCT kayit FROM metinler WHERE alan='govde' AND length(trim(duz))>0 AND kayit IN (${yer})`).map((r) => r.kayit as string));
  const olaylar = new Map<string, KisaKayit[]>();
  for (const r of sec(`SELECT i.a, i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.tur='anlatir' AND i.b IN (${yer}) AND ${ETKIN} AND k.silindi IS NULL ORDER BY k.ad`)) {
    olaylar.set(r.b as string, [...(olaylar.get(r.b as string) ?? []), kisa(e, r.a as string)]);
  }
  const donumMu = (k: string) => (etiket.get(k) ?? []).some((t) => t.toLocaleLowerCase('tr') === DONUM_ETIKETI);

  // Kurgu hatları: hatta bağlı sahnelerin rolü (ipucu, kırılma…) ya da yalnız bağ.
  const hat = new Map<string, (string | null)[]>();
  for (const r of sec(`SELECT i.a, i.b, i.rol FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.tur='kurgu_hattinda' AND i.a IN (${yer}) AND ${ETKIN} AND k.silindi IS NULL`)) {
    const h = hat.get(r.b as string) ?? bos<string | null>(null);
    h[sutun.get(r.a as string)!] = r.rol ? rolAdi('kurgu_hattinda', r.rol as string) : '';
    hat.set(r.b as string, h);
  }
  const hatlar = [...hat].map(([k, hucreler]) => ({ hat: kisa(e, k), hucreler })).sort((a, b) => a.hat.ad.localeCompare(b.hat.ad, 'tr'));

  // Okur soruları: yazarın sahnelere koyduğu niyetler (ipucu, yanıltmaca, açıklama…).
  // Montaj her eser için ayrıdır (okur eser başınadır); seride aynı soru bütün kitapların sütunlarına yayılır.
  const soru = new Map<string, OlayOrgusu['sorular'][number]>();
  for (const x of eserler) {
    for (const s of kurguMontaji(e, x).sorular) {
      const n = s.olaylar.filter((o) => o.tur !== 'okur');
      if (!n.length) continue;
      const q = soru.get(s.iddia.kod) ?? { iddia: { kod: s.iddia.kod, soru: s.iddia.soru }, hucreler: bos<OlayOrgusu['sorular'][number]['hucreler'][number]>(null), acikKaliyor: true };
      for (const o of n) q.hucreler[sutun.get(o.sahne.kod)!] = o.tur as OlayOrgusu['sorular'][number]['hucreler'][number];
      if (n.some((o) => o.tur === 'aciklama')) q.acikKaliyor = false;
      soru.set(s.iddia.kod, q);
    }
  }
  const sorular = [...soru.values()];

  // Karakterler: sahnede bulunanlar, en çok görünenden aza.
  const kisi = new Map<string, boolean[]>();
  for (const r of sec(`SELECT i.a, i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.tur='sahnede' AND (i.rol IS NULL OR i.rol='bulunuyor') AND i.b IN (${yer})
      AND ${ETKIN} AND k.silindi IS NULL AND k.tur='karakter'`)) {
    const h = kisi.get(r.a as string) ?? bos(false);
    h[sutun.get(r.b as string)!] = true;
    kisi.set(r.a as string, h);
  }
  const karakterler = [...kisi].map(([k, hucreler]) => ({ kisi: kisa(e, k), hucreler, sayi: hucreler.filter(Boolean).length }))
    .sort((a, b) => b.sayi - a.sayi || a.kisi.ad.localeCompare(b.kisi.ad, 'tr'));

  const eserAdi = new Map(eserler.map((x) => [x, kisa(e, x)]));
  return {
    kapsam: kisa(e, kapsam),
    sutunlar: sahneler.map((s, i) => ({
      kod: s.kod, ad: s.ad, sira: i + 1, eser: eserAdi.get(s.eser)!, ust: s.ust, bolum: s.bolum, calisma: calisma.get(s.kod) ?? null, metinVar: metinli.has(s.kod),
      donum: donumMu(s.kod), olaylar: olaylar.get(s.kod) ?? [],
    })),
    hatlar, sorular, karakterler,
  };
}
