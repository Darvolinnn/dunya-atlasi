// Sahneyi bölme ve sonraki sahneyle birleştirme (K38, §3.3). İkisi de tek işlem grubudur. Bölmede imleçten sonraki
// metin aynı yerde hemen ardından gelen yeni bir sahneye taşınır; taşınan metindeki metin işaretleri, bağlam
// parçaları ve metin kullanımları metinle gider; sahnenin bağlamı (tarih, yer, bakış açısı, anlatıcı, odak,
// sahnedekiler) yeni sahneye kopyalanır. Birleştirmede ikinci sahnenin metni sona eklenir, metne bağlı her şey,
// katılımcılar ve anlattığı olaylar birinciye geçer, ikinci sahne çöp kutusuna gider. Program metinden anlam
// çıkarmaz (K1): yalnız yazarın kurduğu işaretler ve ilişkiler taşınır.
import { EditorState } from 'prosemirror-state';
import type { Node as PmNode } from 'prosemirror-model';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { araKonum } from '../alan/sira';
import { kelimeSay } from '../alan/kelime';
import { baglantilar, isaretYerleri, metinSemasi } from '../alan/metin-sema';
import type { BirlesmeGeri, BolmeOnizlemesi, SahneBirlesmeOnizlemesi, Spans } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { cocuklar } from './anlati';

export interface CerrahiBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  /** Kaydın gövde metni ve şimdiki sürümü. */
  metin(kayit: string): { spans: Spans; basliklar: string[] };
  /** Metni verilen parça listesine çeviren işlem; değişiklik yoksa null. */
  metinGirdisi(kayit: string, spans: Spans): IslemGirdisi | null;
  kayitGirdileri(kod: string, v: { ad: string; tur: string; karar: string; ozet: string; spans?: Spans }): IslemGirdisi[];
}

const belge = (spans: Spans): PmNode => pmDocFromSpans(metinSemasi, spans as never);
const parcalar = (d: PmNode): Spans => pmNodeToSpans(metinSemasi, d) as Spans;
const ayniSurum = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function sahneOku(e: EvrenVt, kod: unknown) {
  const r = kodGecerliMi(kod) ? e.db.selectObject("SELECT kod, ad, tarih FROM kayitlar WHERE kod=? AND tur='sahne' AND silindi IS NULL", [kod]) : undefined;
  if (!r) throw new Error('Sahne bulunamadı.');
  return { kod: r.kod as string, ad: r.ad as string, tarih: (r.tarih as string | null) ?? null };
}

/** Metindeki işaret kodlarının hangisi neye ait: metin işareti, bağlam parçası, metin kullanımı. */
function metinOgeleri(e: EvrenVt, sahne: string, kodlar: Iterable<string>) {
  const isaret: string[] = [], parca: string[] = [], kullanim: string[] = [];
  for (const k of new Set(kodlar)) {
    if (e.db.selectValue('SELECT 1 FROM metin_isaretleri WHERE kod=? AND kayit=? AND silindi IS NULL', [k, sahne]) !== undefined) isaret.push(k);
    else if (e.db.selectValue('SELECT 1 FROM baglam_parcalari WHERE kod=? AND kayit=? AND silindi IS NULL', [k, sahne]) !== undefined) parca.push(k);
    else if (e.db.selectValue('SELECT 1 FROM metin_kullanimlari WHERE kod=? AND hedef=? AND silindi IS NULL', [k, sahne]) !== undefined) kullanim.push(k);
  }
  return { isaret, parca, kullanim };
}
type Ogeler = ReturnType<typeof metinOgeleri>;

function ogeleriTasi(e: EvrenVt, o: Ogeler, hedef: string): IslemGirdisi[] {
  const g: IslemGirdisi[] = [];
  for (const kod of o.isaret) g.push({ tur: 'metin_ogesi_tasi', veri: { tur: 'isaret', kod, kayit: hedef } });
  for (const kod of o.parca) g.push({ tur: 'metin_ogesi_tasi', veri: { tur: 'parca', kod, kayit: hedef } });
  for (const kod of o.kullanim) {
    const r = e.db.selectObject('SELECT kaynak, alan, tanim FROM metin_kullanimlari WHERE kod=?', [kod])!;
    g.push({ tur: 'metin_kullanim_yaz', veri: { kod, kaynak: r.kaynak, hedef, alan: r.alan, tanim: JSON.parse(r.tanim as string) } });
  }
  return g;
}

const isaretKodlari = (spans: Spans) => isaretYerleri(spans as never).map((y) => y.isaret);

/** Bölme yeri: paragrafın başı ya da sonu paragraf sınırına çekilir (boş paragraf doğmasın). */
function bolmeYeri(d: PmNode, konum: number): number {
  if (!Number.isInteger(konum)) throw new Error('İmlecin yeri okunamadı.');
  let k = Math.max(0, Math.min(konum, d.content.size));
  const $k = d.resolve(k);
  if ($k.parent.isTextblock && $k.depth > 0) {
    if ($k.parentOffset === 0) k = $k.before();
    else if ($k.parentOffset === $k.parent.content.size) k = $k.after();
  }
  return k;
}

function bolmeHesabi(b: CerrahiBaglami, sahneKod: string, konum: number, temel: string[]) {
  const s = sahneOku(b.e, sahneKod);
  const m = b.metin(s.kod);
  if (!Array.isArray(temel) || !ayniSurum(m.basliklar, temel)) throw new Error('Metin bu arada değişti; yeniden deneyin.');
  const d = belge(m.spans);
  const k = bolmeYeri(d, konum);
  const kalan = d.cut(0, k), giden = d.cut(k);
  if (!giden.textContent.trim()) throw new Error('İmleçten sonra taşınacak metin yok.');
  if (!kalan.textContent.trim()) throw new Error('İmleçten önce metin yok; sahnenin tamamı taşınamaz.');
  const kalanSpans = parcalar(kalan), gidenSpans = parcalar(giden);
  const kalanKodlar = new Set(isaretKodlari(kalanSpans));
  const ortak = isaretKodlari(gidenSpans).filter((x) => kalanKodlar.has(x));
  if (ortak.length) throw new Error('Bölme yeri işaretli bir cümlenin içinde; imleci o cümlenin dışına alın.');
  const ogeler = metinOgeleri(b.e, s.kod, isaretKodlari(gidenSpans));
  const bitisik = k !== konum ? false : d.resolve(k).parent.isTextblock; // paragrafın ortasından bölündü mü
  return { s, kalanSpans, gidenSpans, giden, ogeler, bitisik };
}

function baglamIliskileri(e: EvrenVt, sahne: string) {
  return e.db.selectObjects(
    `SELECT kod, tur, a, b, rol, karar FROM iliskiler WHERE silindi IS NULL AND (
       (tur='sahne_yeri' AND a=?1) OR (tur IN ('bakis','anlatici','odak','sahnede') AND b=?1)) ORDER BY olusturma, kod`, [sahne]) as
    { kod: string; tur: string; a: string; b: string; rol: string | null; karar: string }[];
}
const kayitAdi = (e: EvrenVt, kod: string) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [kod]) as string | undefined) ?? '';
const sonGozlemleri = (e: EvrenVt, sahne: string) =>
  e.db.selectObjects("SELECT iz, deger FROM iz_gozlemleri WHERE sahne=? AND an='son'", [sahne]) as { iz: string; deger: string }[];

export function bolmeOnizle(b: CerrahiBaglami, sahne: string, konum: number, temel: string[]): BolmeOnizlemesi {
  const h = bolmeHesabi(b, sahne, konum, temel);
  const ili = baglamIliskileri(b.e, h.s.kod);
  const tek = (tur: string) => { const r = ili.find((x) => x.tur === tur); return r ? kayitAdi(b.e, tur === 'sahne_yeri' ? r.b : r.a) : null; };
  return {
    paragraf: h.giden.childCount, kelime: kelimeSay(h.giden.textBetween(0, h.giden.content.size, '\n')), ad: `${h.s.ad} (2)`.slice(0, 200),
    tarih: h.s.tarih ? (JSON.parse(h.s.tarih) as { ifade?: string }).ifade ?? null : null,
    yer: tek('sahne_yeri'), bakis: tek('bakis'), sahnedekiler: ili.filter((x) => x.tur === 'sahnede').length,
    baglanti: baglantilar(h.gidenSpans as never).length, isaret: h.ogeler.isaret.length, parca: h.ogeler.parca.length, kullanim: h.ogeler.kullanim.length,
    sonGozlem: sonGozlemleri(b.e, h.s.kod).length,
  };
}

/** Böler; dönen `bitisik` geri almada iki parçanın aynı paragrafta birleşip birleşmeyeceğidir. */
export function bol(b: CerrahiBaglami, sahne: string, konum: number, temel: string[], o: { ad?: string; sonGozlemler: 'kalsin' | 'gecsin' }) {
  const { e } = b;
  const h = bolmeHesabi(b, sahne, konum, temel);
  const ad = String(o.ad ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || `${h.s.ad} (2)`.slice(0, 200);
  const yeni = yeniKod();
  const girdiler: IslemGirdisi[] = [...b.kayitGirdileri(yeni, { ad, tur: 'sahne', karar: 'kesin', ozet: '', spans: h.gidenSpans })];
  // Yer: aynı üst altında hemen ardından.
  const yer = e.db.selectObject('SELECT ust, konum FROM anlati WHERE kod=?', [h.s.kod]);
  if (yer) {
    const kardes = cocuklar(e, yer.ust as string).filter((r) => r.tur !== 'bolum');
    const i = kardes.findIndex((r) => r.kod === h.s.kod);
    const sag = i >= 0 && i + 1 < kardes.length ? kardes[i + 1].konum : null;
    const sol = yer.konum as string;
    girdiler.push({ tur: 'anlati_yerlestir', veri: { kod: yeni, ust: yer.ust, konum: sag !== null && sol >= sag ? araKonum(sol, null) : araKonum(sol, sag), onceki: null } });
  }
  if (h.s.tarih) girdiler.push({ tur: 'kayit_tarih', veri: { kod: yeni, tarih: JSON.parse(h.s.tarih), onceki: null } });
  for (const r of baglamIliskileri(e, h.s.kod)) {
    girdiler.push({ tur: 'iliski_ekle', veri: { kod: yeniKod(), tur: r.tur, a: r.a === h.s.kod ? yeni : r.a, b: r.b === h.s.kod ? yeni : r.b, karar: r.karar, ...(r.rol ? { rol: r.rol } : {}) } });
  }
  const m = b.metinGirdisi(h.s.kod, h.kalanSpans);
  if (m) girdiler.push(m);
  girdiler.push(...ogeleriTasi(e, h.ogeler, yeni));
  if (o.sonGozlemler === 'gecsin') for (const g of sonGozlemleri(e, h.s.kod)) {
    girdiler.push({ tur: 'iz_gozlem', veri: { iz: g.iz, sahne: yeni, an: 'son', deger: g.deger } }, { tur: 'iz_gozlem', veri: { iz: g.iz, sahne: h.s.kod, an: 'son', deger: null } });
  }
  b.yaz(girdiler, [h.s.kod, yeni, ...(yer ? [yer.ust as string] : [])]);
  return { yeni, bitisik: h.bitisik };
}

/** Aynı üst altında hemen ardından gelen sahne. */
export function sonrakiSahne(e: EvrenVt, sahne: string): { kod: string; ad: string } | null {
  const yer = e.db.selectObject('SELECT ust FROM anlati WHERE kod=?', [sahne]);
  if (!yer) return null;
  const kardes = cocuklar(e, yer.ust as string).filter((r) => r.tur !== 'bolum');
  const i = kardes.findIndex((r) => r.kod === sahne);
  const s = i >= 0 ? kardes[i + 1] : undefined;
  return s && s.tur === 'sahne' ? { kod: s.kod, ad: s.ad } : null;
}

function birlesmeHesabi(b: CerrahiBaglami, sahne: string, ikinciKod?: string) {
  const { e } = b;
  const s = sahneOku(e, sahne);
  const ikinci = ikinciKod ? sahneOku(e, ikinciKod) : (() => { const x = sonrakiSahne(e, s.kod); if (!x) throw new Error('Bu sahneden sonra aynı bölümde sahne yok.'); return sahneOku(e, x.kod); })();
  if (ikinci.kod === s.kod) throw new Error('Sahne kendisiyle birleştirilemez.');
  const ilkIli = baglamIliskileri(e, s.kod), ikinciIli = baglamIliskileri(e, ikinci.kod);
  const kisi = (r: { tur: string; a: string; b: string }) => (r.tur === 'sahne_yeri' ? r.b : r.a);
  // Birinci sahnede olmayan katılımcılar eklenir; yer, bakış açısı, anlatıcı ve odak birincide boşsa ikinciden gelir.
  const eklenecek = ikinciIli.filter((r) => r.tur === 'sahnede'
    ? !ilkIli.some((x) => x.tur !== 'sahne_yeri' && x.a === r.a)
    : !ilkIli.some((x) => x.tur === r.tur) && ikinciIli.find((x) => x.tur === r.tur) === r);
  const ilkOlaylar = new Set(e.db.selectValues("SELECT b FROM iliskiler WHERE tur='anlatir' AND a=? AND silindi IS NULL", [s.kod]) as string[]);
  const olaylar = (e.db.selectValues("SELECT DISTINCT b FROM iliskiler WHERE tur='anlatir' AND a=? AND silindi IS NULL", [ikinci.kod]) as string[]).filter((x) => !ilkOlaylar.has(x));
  const ogeler = {
    isaret: e.db.selectValues('SELECT kod FROM metin_isaretleri WHERE kayit=? AND silindi IS NULL', [ikinci.kod]) as string[],
    parca: e.db.selectValues('SELECT kod FROM baglam_parcalari WHERE kayit=? AND silindi IS NULL', [ikinci.kod]) as string[],
    kullanim: e.db.selectValues('SELECT kod FROM metin_kullanimlari WHERE hedef=? AND silindi IS NULL', [ikinci.kod]) as string[],
  };
  return { s, ikinci, eklenecek, kisi, olaylar, ogeler };
}

export function birlesmeOnizle(b: CerrahiBaglami, sahne: string): SahneBirlesmeOnizlemesi {
  const h = birlesmeHesabi(b, sahne);
  const d = belge(b.metin(h.ikinci.kod).spans);
  return {
    ikinci: { kod: h.ikinci.kod, ad: h.ikinci.ad }, paragraf: d.childCount, kelime: kelimeSay(d.textBetween(0, d.content.size, '\n')),
    katilimci: new Set(h.eklenecek.map(h.kisi)).size, olay: h.olaylar.length,
    isaret: h.ogeler.isaret.length, parca: h.ogeler.parca.length, kullanim: h.ogeler.kullanim.length,
  };
}

export function birlestir(b: CerrahiBaglami, sahne: string, o: { ikinci?: string; bitisik?: boolean } = {}): BirlesmeGeri {
  const { e } = b;
  const h = birlesmeHesabi(b, sahne, o.ikinci);
  const ilk = belge(b.metin(h.s.kod).spans), ikinciBelge = belge(b.metin(h.ikinci.kod).spans);
  const konum = ilk.content.size;
  let tr = EditorState.create({ doc: ilk }).tr.insert(konum, ikinciBelge.content);
  if (o.bitisik) {
    const $k = tr.doc.resolve(konum);
    if ($k.nodeBefore?.isTextblock && $k.nodeAfter?.isTextblock && $k.nodeBefore.type === $k.nodeAfter.type) tr = tr.join(konum);
  }
  const girdiler: IslemGirdisi[] = [];
  const m = b.metinGirdisi(h.s.kod, parcalar(tr.doc));
  if (m) girdiler.push(m);
  girdiler.push(...ogeleriTasi(e, h.ogeler, h.s.kod));
  const iliskiler: string[] = [];
  for (const r of h.eklenecek) {
    const kod = yeniKod();
    iliskiler.push(kod);
    girdiler.push({ tur: 'iliski_ekle', veri: { kod, tur: r.tur, a: r.a === h.ikinci.kod ? h.s.kod : r.a, b: r.b === h.ikinci.kod ? h.s.kod : r.b, karar: r.karar, ...(r.rol ? { rol: r.rol } : {}) } });
  }
  for (const olay of h.olaylar) {
    const kod = yeniKod();
    iliskiler.push(kod);
    girdiler.push({ tur: 'iliski_ekle', veri: { kod, tur: 'anlatir', a: h.s.kod, b: olay, karar: 'kesin' } });
  }
  // Sahnenin sonu artık ikinci sahnenin sonu: oradaki süreklilik gözlemleri birinciye geçer.
  const eskiSon = new Map(sonGozlemleri(e, h.s.kod).map((g) => [g.iz, g.deger]));
  const gozlemler: BirlesmeGeri['gozlemler'] = [];
  for (const g of sonGozlemleri(e, h.ikinci.kod)) {
    gozlemler.push({ iz: g.iz, deger: eskiSon.get(g.iz) ?? null });
    girdiler.push({ tur: 'iz_gozlem', veri: { iz: g.iz, sahne: h.s.kod, an: 'son', deger: g.deger } });
  }
  girdiler.push({ tur: 'kayit_sil', veri: { kod: h.ikinci.kod } });
  b.yaz(girdiler, [h.s.kod, h.ikinci.kod, ...h.olaylar]);
  return { sahne: h.s.kod, ikinci: h.ikinci.kod, konum: o.bitisik ? -1 : konum, basliklar: b.metin(h.s.kod).basliklar, iliskiler, ogeler: h.ogeler, gozlemler };
}

/** Birleştirmeyi geri alır: ikinci sahne çöp kutusundan döner, birinci eski metnine kısalır, taşınanlar geri gider. */
export function birlesmeyiGeriAl(b: CerrahiBaglami, g: BirlesmeGeri) {
  const { e } = b;
  if (!g || !kodGecerliMi(g.sahne) || !kodGecerliMi(g.ikinci) || !Number.isInteger(g.konum) || g.konum < 0) throw new Error('Bu birleştirme geri alınamaz.');
  const s = sahneOku(e, g.sahne);
  if (e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND tur='sahne' AND silindi IS NOT NULL", [g.ikinci]) === undefined) throw new Error('İkinci sahne çöp kutusunda değil.');
  const m = b.metin(s.kod);
  if (!ayniSurum(m.basliklar, g.basliklar ?? [])) throw new Error('Sahne bu arada değişti; birleştirme geri alınamaz.');
  const d = belge(m.spans);
  if (g.konum > d.content.size) throw new Error('Bu birleştirme geri alınamaz.');
  const girdiler: IslemGirdisi[] = [{ tur: 'kayit_geri_yukle', veri: { kod: g.ikinci } }];
  const mg = b.metinGirdisi(s.kod, parcalar(d.cut(0, g.konum)));
  if (mg) girdiler.push(mg);
  const ogeler = metinOgeleri(e, s.kod, [...(g.ogeler?.isaret ?? []), ...(g.ogeler?.parca ?? []), ...(g.ogeler?.kullanim ?? [])].filter((x) => kodGecerliMi(x)));
  girdiler.push(...ogeleriTasi(e, ogeler, g.ikinci));
  for (const kod of g.iliskiler ?? []) {
    const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT tur, a, b FROM iliskiler WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
    if (r) girdiler.push({ tur: 'iliski_sil', veri: { kod, a: r.a, b: r.b, iliski: r.tur } });
  }
  for (const x of g.gozlemler ?? []) if (typeof x.iz === 'string') girdiler.push({ tur: 'iz_gozlem', veri: { iz: x.iz, sahne: s.kod, an: 'son', deger: x.deger } });
  b.yaz(girdiler, [s.kod, g.ikinci]);
}
