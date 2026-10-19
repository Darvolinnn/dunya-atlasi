// Metin ile kullanım yeri (F30, §3.3, §18 "Anlatı kullanım yeri"). Bir kaydın metni (efsane, mektup, şarkı) kaynak
// metindir; başka bir metne alındığı yer kullanım örneğidir ve orada metin işaretiyle (§5.7) durur, işaretin kodu
// bu kaydın kodudur. Alma biçimi üçtür: ortak kaynağa bağlı (kaynak değişince haber verilir, yazar isterse
// kaynaktan günceller), kopya (kaynağın o anki hâli; sonradan izlenmez) ve bağımsız türev (kaynaktan doğar, kendi
// yoluna gider). Taşımak kullanımın kendisini (kodu ve geçmişiyle) başka bir metne götürür; kopyalamak yeni bir
// kullanım açar. Baskıya sabitlenmiş kopya, eser yayımlanırken saklanan sürümdür (F18); kaynak değişse de değişmez.
import { EditorState } from 'prosemirror-state';
import { Slice, type Node as PmNode } from 'prosemirror-model';
import { pmDocFromSpans, pmNodeToSpans } from '@automerge/prosemirror';
import { duzMetin, isaretKodlari, isaretKodu, metinSemasi } from '../alan/metin-sema';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { IslemGirdisi } from '../alan/islem';
import type { KisaKayit, KullanimBicimi, MetinKullanimi, Spans } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

export const KULLANIM_BICIMLERI: KullanimBicimi[] = ['bagli', 'kopya', 'turev'];
const KAYNAK_ALANI = 'govde';

export interface KullanimBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  /** Kaydın metni (parça listesi). */
  spans(kayit: string, alan: string): Spans;
  /** Metni verilen parça listesine çeviren işlem; değişiklik yoksa null. */
  metinGirdisi(kayit: string, alan: string, spans: Spans): IslemGirdisi | null;
}

interface SakliKullanim { bicim: KullanimBicimi; alinan: string }

const olcu = (s: string) => s.replace(/\s+/g, ' ').trim();
const belge = (spans: Spans): PmNode => pmDocFromSpans(metinSemasi, spans as never);
const parcalar = (d: PmNode): Spans => pmNodeToSpans(metinSemasi, d) as Spans;

function kayit(e: EvrenVt, kod: unknown, hata = 'Kayıt bulunamadı.'): KisaKayit {
  const k = kodGecerliMi(kod) ? yonlendir(e.db, kod) as string : null;
  const r = k ? e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]) : undefined;
  if (!r) throw new Error(hata);
  return { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string };
}
function kisa(e: EvrenVt, kod: string): KisaKayit | null {
  try { return kayit(e, kod); } catch { return null; }
}

/** Kaynak metin, kaynağın kendi işaretleri olmadan (onlar kaynağın metnine aittir); bağlantılar kalır. */
function kaynakParcalari(b: KullanimBaglami, kaynak: string): Spans {
  return (b.spans(kaynak, KAYNAK_ALANI) as { type: string; marks?: Record<string, unknown> }[]).map((sp) => {
    if (sp.type !== 'text' || !sp.marks?.isaret) return sp;
    const { isaret: _, ...marks } = sp.marks;
    return { ...sp, marks };
  });
}
const duz = (spans: Spans) => duzMetin(spans as never);

/** Belgede işaretin kapladığı aralık (ilk yerden son yere); yoksa null. */
function aralik(d: PmNode, kod: string): [number, number] | null {
  const tur = metinSemasi.schema.marks.isaret;
  let a = -1, z = -1;
  d.descendants((n, pos) => {
    if (n.isText && isaretKodlari(tur.isInSet(n.marks)?.attrs.kodlar).includes(kod)) { if (a < 0) a = pos; z = pos + n.nodeSize; }
  });
  return a < 0 ? null : [a, z];
}
function kullanimMetni(spans: Spans, kod: string): string | null {
  const d = belge(spans), r = aralik(d, kod);
  return r ? d.textBetween(r[0], r[1], '\n') : null;
}

function bul(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM metin_kullanimlari WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Metnin kullanımı bulunamadı.');
  return { kod, kaynak: r.kaynak as string, hedef: r.hedef as string, alan: r.alan as string, tanim: JSON.parse(r.tanim as string) as SakliKullanim };
}
type Kullanim = ReturnType<typeof bul>;

function yazGirdisi(k: Kullanim): IslemGirdisi {
  return { tur: 'metin_kullanim_yaz', veri: { kod: k.kod, kaynak: k.kaynak, hedef: k.hedef, alan: k.alan, tanim: k.tanim } };
}

/** Kullanımı açar ve hedef metne eklenecek parçaları döndürür; editör bunları imlecin yerine koyup işaretler. */
export function olustur(b: KullanimBaglami, kaynakKod: string, hedefKod: string, alan: string, bicim: KullanimBicimi) {
  if (!KULLANIM_BICIMLERI.includes(bicim)) throw new Error('Bir alma biçimi seçin.');
  const kaynak = kayit(b.e, kaynakKod, 'Kaynak metin bulunamadı.'), hedef = kayit(b.e, hedefKod);
  if (kaynak.kod === hedef.kod) throw new Error('Bir metin kendi içine alınamaz.');
  const spans = kaynakParcalari(b, kaynak.kod);
  const alinan = olcu(duz(spans));
  if (!alinan) throw new Error(`“${kaynak.ad}” kaydının metni boş.`);
  const k: Kullanim = { kod: yeniKod(), kaynak: kaynak.kod, hedef: hedef.kod, alan, tanim: { bicim, alinan } };
  b.yaz([yazGirdisi(k)], [hedef.kod, kaynak.kod]);
  return { kod: k.kod, spans };
}

function okuma(b: KullanimBaglami, r: Record<string, unknown>, hedefSpans: Spans | null): MetinKullanimi {
  const t = JSON.parse(r.tanim as string) as SakliKullanim;
  const kaynak = kisa(b.e, r.kaynak as string);
  const m = hedefSpans ? kullanimMetni(hedefSpans, r.kod as string) : null;
  const bagli = t.bicim === 'bagli';
  const kaynakDegisti = bagli && !!kaynak && olcu(duz(kaynakParcalari(b, kaynak.kod))) !== t.alinan;
  const ayrildi = bagli && m !== null && olcu(m) !== t.alinan, metinde = m !== null;
  return { kod: r.kod as string, kaynak, hedef: kisa(b.e, r.hedef as string)!, bicim: t.bicim, kaynakDegisti, ayrildi, metinde };
}

/** Bir metnin içindeki kullanımlar. */
export function kullanimlar(b: KullanimBaglami, hedef: string): MetinKullanimi[] {
  const satirlar = b.e.db.selectObjects('SELECT * FROM metin_kullanimlari WHERE hedef=? AND silindi IS NULL ORDER BY olusturma, kod', [hedef]);
  if (!satirlar.length) return [];
  const spans = b.spans(hedef, satirlar[0].alan as string);
  return satirlar.map((r) => okuma(b, r, spans));
}

/** Bir kaynak metnin kullanıldığı yerler. */
export function kullanildigiYerler(b: KullanimBaglami, kaynak: string): MetinKullanimi[] {
  return b.e.db.selectObjects(`SELECT u.* FROM metin_kullanimlari u JOIN kayitlar k ON k.kod=u.hedef
      WHERE u.kaynak=? AND u.silindi IS NULL AND k.silindi IS NULL ORDER BY k.ad, u.kod`, [kaynak])
    .map((r) => okuma(b, r, b.spans(r.hedef as string, r.alan as string)));
}

/** Ortak kaynağa bağlı kullanımı kaynağın şimdiki hâline getirir: metindeki parça değişir, işaret kalır. */
export function guncelle(b: KullanimBaglami, kod: string) {
  const k = bul(b.e, kod);
  if (k.tanim.bicim !== 'bagli') throw new Error('Yalnızca ortak kaynağa bağlı kullanım kaynaktan güncellenir.');
  const kaynak = kayit(b.e, k.kaynak, 'Kaynak metin silinmiş.');
  const d = belge(b.spans(k.hedef, k.alan)), r = aralik(d, kod);
  if (!r) throw new Error('Kullanım metinde bulunamadı.');
  const yeni = kaynakParcalari(b, kaynak.kod);
  let tr = EditorState.create({ doc: d }).tr.replace(r[0], r[1], new Slice(belge(yeni).content, 1, 1));
  tr = isaretKodu(tr, tr.mapping.map(r[0], -1), tr.mapping.map(r[1], 1), kod, true);
  const girdiler = [yazGirdisi({ ...k, tanim: { ...k.tanim, alinan: olcu(duz(yeni)) } })];
  const m = b.metinGirdisi(k.hedef, k.alan, parcalar(tr.doc));
  if (m) girdiler.unshift(m);
  b.yaz(girdiler, [k.hedef, k.kaynak]);
}

/** Kullanımı bağımsız türeve çevirir: kaynağa bağı kalır ama artık izlenmez. */
export function turevYap(b: KullanimBaglami, kod: string) {
  const k = bul(b.e, kod);
  if (k.tanim.bicim === 'turev') return;
  b.yaz([yazGirdisi({ ...k, tanim: { ...k.tanim, bicim: 'turev' } })], [k.hedef, k.kaynak]);
}

/** Kullanımı başka bir metne taşır: parça buradan çıkar, öbür metnin sonuna eklenir; kod ve geçmiş aynı kalır. */
export function tasi(b: KullanimBaglami, kod: string, yeniHedefKod: string) {
  const k = bul(b.e, kod);
  const yeniHedef = kayit(b.e, yeniHedefKod, 'Taşınacak metin bulunamadı.');
  if (yeniHedef.kod === k.hedef) throw new Error('Kullanım zaten bu metinde.');
  if (yeniHedef.kod === k.kaynak) throw new Error('Kullanım kaynağın kendi metnine taşınamaz.');
  const d = belge(b.spans(k.hedef, k.alan)), r = aralik(d, kod);
  if (!r) throw new Error('Kullanım metinde bulunamadı.');
  const parca = d.slice(r[0], r[1]);
  const cikan = EditorState.create({ doc: d }).tr.deleteRange(r[0], r[1]);
  const hedefBelge = belge(b.spans(yeniHedef.kod, k.alan));
  const giren = EditorState.create({ doc: hedefBelge }).tr.replace(hedefBelge.content.size, hedefBelge.content.size, parca);
  const girdiler = [b.metinGirdisi(k.hedef, k.alan, parcalar(cikan.doc)), b.metinGirdisi(yeniHedef.kod, k.alan, parcalar(giren.doc)), yazGirdisi({ ...k, hedef: yeniHedef.kod })]
    .filter((g): g is IslemGirdisi => !!g);
  b.yaz(girdiler, [k.hedef, yeniHedef.kod, k.kaynak]);
}

/** Kaydı kaldırır; metin yerinde kalır, işareti editör kaldırır. */
export function sil(b: KullanimBaglami, kod: string) {
  const k = bul(b.e, kod);
  b.yaz([{ tur: 'metin_kullanim_sil', veri: { kod, hedef: k.hedef, kaynak: k.kaynak } }], [k.hedef, k.kaynak]);
}

/** İki cihazda farklı yazılmış kullanımın değerlerinden birini seçmek. */
export function cozumGirdisi(e: EvrenVt, nesne: string, deger: unknown): IslemGirdisi | null {
  const r = e.db.selectObject('SELECT kaynak FROM metin_kullanimlari WHERE kod=?', [nesne]);
  const v = deger as { hedef?: string; alan?: string; tanim?: SakliKullanim } | null;
  if (!r || !v?.hedef || !v.tanim) return null;
  return { tur: 'metin_kullanim_yaz', veri: { kod: nesne, kaynak: r.kaynak, hedef: v.hedef, alan: v.alan ?? KAYNAK_ALANI, tanim: v.tanim, cozum: true } };
}
