// Serinin planı (K27): olası finaller, ek üyelik ve okuma yolları. Olası final bir soru değildir; her biri ayrı bir
// olay kaydıdır, seriye `olasi_final` ile, birbirine `alternatif` ile bağlanır. Bir eserin ana serisi ağaçtaki
// yeridir; başka serilere `seri_eseri` ilişkisiyle de katılabilir. Okuma yolu, okurun kitapları izleyebileceği
// adlandırılmış bir sıradır (ör. yayın sırası); önerilen okuma sırasından, tarihlerden ve okur bilgisinden türetilmez.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { KisaKayit, OkumaYolu, SeriPlani } from '../veri/api';
import type { AnlatiBaglami } from './anlati';
import type { EvrenVt } from './evren-vt';

const ETKIN = "i.silindi IS NULL AND k.silindi IS NULL";
const turu = (e: EvrenVt, kod: string) => (kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined);

function seriDenetle(e: EvrenVt, seri: string) {
  if (turu(e, seri) !== 'seri') throw new Error('Bu bir seri kaydı değil.');
}

/** Ana serisi bu olan eserler, önerilen okuma sırasıyla. */
function kitaplar(e: EvrenVt, seri: string): KisaKayit[] {
  return e.db.selectObjects(`SELECT k.kod, k.ad, k.tur FROM anlati a JOIN kayitlar k ON k.kod=a.kod WHERE a.ust=? AND k.tur='eser' AND k.silindi IS NULL ORDER BY a.konum, a.kod`, [seri]) as unknown as KisaKayit[];
}

function anaSeri(e: EvrenVt, eser: string): KisaKayit | null {
  return (e.db.selectObject(`SELECT s.kod, s.ad, s.tur FROM anlati a JOIN kayitlar s ON s.kod=a.ust WHERE a.kod=? AND s.tur='seri' AND s.silindi IS NULL`, [eser]) as unknown as KisaKayit | undefined) ?? null;
}

/** Serinin bütün eserleri: önce ana serisi bu olanlar, sonra ek üyeler. */
export function seriEserleri(e: EvrenVt, seri: string): KisaKayit[] {
  const ana = kitaplar(e, seri);
  const ek = ekUyeler(e, seri).filter((x) => !ana.some((y) => y.kod === x.kod));
  return [...ana, ...ek.map(({ kod, ad, tur }) => ({ kod, ad, tur }))];
}

function ekUyeler(e: EvrenVt, seri: string): SeriPlani['ekUyeler'] {
  return (e.db.selectObjects(`SELECT i.kod bag, k.kod, k.ad, k.tur FROM iliskiler i JOIN kayitlar k ON k.kod=i.b
      WHERE i.tur='seri_eseri' AND i.a=? AND ${ETKIN} AND k.tur='eser' ORDER BY k.ad`, [seri]) as { bag: string; kod: string; ad: string; tur: string }[])
    .map((r) => ({ ...r, anaSeri: anaSeri(e, r.kod) }));
}

export function okumaYollari(e: EvrenVt, seri: string): OkumaYolu[] {
  const v = e.db.selectValue('SELECT v FROM evren WHERE k=?', [`okuma_yollari:${seri}`]) as string | undefined;
  if (!v) return [];
  let l: { kod: string; ad: string; eserler: string[] }[];
  try { l = JSON.parse(v); } catch { return []; }
  // Sonradan silinen ya da seriden çıkan eser yoldan düşer; yolun kendisi kalır.
  const uyeler = new Map(seriEserleri(e, seri).map((x) => [x.kod, x]));
  return l.map((y) => ({ kod: y.kod, ad: y.ad, eserler: y.eserler.map((k) => uyeler.get(k)).filter((x): x is KisaKayit => !!x) }));
}

export function seriPlani(e: EvrenVt, seri: string): SeriPlani {
  seriDenetle(e, seri);
  const finaller = e.db.selectObjects(`SELECT i.kod bag, k.kod, k.ad, k.tur, k.karar FROM iliskiler i JOIN kayitlar k ON k.kod=i.a
      WHERE i.tur='olasi_final' AND i.b=? AND ${ETKIN} ORDER BY k.olusturma, k.rowid`, [seri]) as unknown as SeriPlani['finaller'];
  const s = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [seri]) as unknown as KisaKayit;
  return { seri: s, kitaplar: kitaplar(e, seri), ekUyeler: ekUyeler(e, seri), finaller, okumaYollari: okumaYollari(e, seri) };
}

/** Yeni olası final: fikir durumunda bir olay; seriye bağlanır ve vazgeçilmemiş öbür finallerin alternatifi olur. */
export function olasiFinalEkle(b: AnlatiBaglami, seri: string, ad: string): { kod: string } {
  seriDenetle(b.e, seri);
  const kod = yeniKod();
  b.yaz([...b.kayitGirdileri(kod, { ad, tur: 'olay', karar: 'fikir', ozet: '' }), ...finalBaglari(b.e, seri, kod)], [kod, seri]);
  return { kod };
}

/** Var olan bir olayı olası final yapar (aynı bağlarla). */
export function olasiFinalBagla(b: AnlatiBaglami, seri: string, olay: string) {
  seriDenetle(b.e, seri);
  if (turu(b.e, olay) !== 'olay') throw new Error('Olası final bir olay kaydıdır.');
  if (b.e.db.selectValue("SELECT 1 FROM iliskiler WHERE tur='olasi_final' AND a=? AND b=? AND silindi IS NULL", [olay, seri]) !== undefined) throw new Error('Bu olay zaten bu serinin olası finali.');
  b.yaz(finalBaglari(b.e, seri, olay), [olay, seri]);
}

function finalBaglari(e: EvrenVt, seri: string, olay: string): IslemGirdisi[] {
  const bag = (tur: string, a: string, bb: string): IslemGirdisi => ({ tur: 'iliski_ekle', veri: { kod: yeniKod(), tur, a, b: bb, karar: 'kesin', aciklama: '', baslangic: null, bitis: null } });
  const obur = (e.db.selectObjects(`SELECT k.kod FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.tur='olasi_final' AND i.b=? AND ${ETKIN} AND k.karar<>'vazgecildi' AND k.kod<>?`, [seri, olay]) as { kod: string }[])
    .map((r) => r.kod)
    .filter((k) => e.db.selectValue("SELECT 1 FROM iliskiler WHERE tur='alternatif' AND silindi IS NULL AND ((a=? AND b=?) OR (a=? AND b=?))", [k, olay, olay, k]) === undefined);
  return [bag('olasi_final', olay, seri), ...obur.map((k) => bag('alternatif', olay, k))];
}

/** Okuma yollarını bütünüyle yazar. Yalnız serinin eserleri girer; aynı eser bir yolda iki kez geçmez. */
export function okumaYollariYaz(b: AnlatiBaglami, seri: string, yollar: { kod?: string | null; ad: string; eserler: string[] }[]) {
  seriDenetle(b.e, seri);
  const uyeler = new Set(seriEserleri(b.e, seri).map((x) => x.kod));
  const temiz = yollar.map((y) => {
    const ad = String(y.ad ?? '').trim().slice(0, 100);
    if (!ad) throw new Error('Okuma yolunun bir adı olmalı.');
    if (y.eserler.some((k) => !uyeler.has(k))) throw new Error('Okuma yoluna yalnız bu serinin kitapları girebilir.');
    if (new Set(y.eserler).size !== y.eserler.length) throw new Error('Bir kitap aynı okuma yolunda iki kez geçemez.');
    return { kod: y.kod && kodGecerliMi(y.kod) ? y.kod : yeniKod(), ad, eserler: y.eserler };
  });
  b.yaz([{ tur: 'seri_okuma_yollari', veri: { seri, yollar: temiz } }], [seri]);
}

export { anaSeri };
