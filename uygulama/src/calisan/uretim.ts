// Üretim, kaynak kesintisi ve besin ağı (§15-5, F10, §4.4). Bağlar yazarın kurduğu ilişkilerdir: üretir, girdisi,
// bağımlı, taşır, fazlası, açığı, beslenir. Kesinti girilince etkilenebilecek ürünler, kurumlar, yerler ve canlılar
// zincir olarak gösterilir. Program neyin etkilenebileceğini söyler; ne zaman ve ne kadar etkileneceğini ancak yazar
// dayanma süresi girdiyse aralık olarak söyler, yoksa "bulunamıyor" der. Ayaklanma, kıtlık gibi sonuçlar yazarındır.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import type { Dayaniklilik, KesintiAdimi, KesintiZinciri, KisaKayit, UretimOzeti } from '../veri/api';
import type { EvrenVt } from './evren-vt';

export interface UretimBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const DERINLIK = 6;
const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;
const BIRIMLER: Dayaniklilik['birim'][] = ['gun', 'hafta', 'ay', 'yil'];
const BIRIM_ADI: Record<Dayaniklilik['birim'], string> = { gun: 'gün', hafta: 'hafta', ay: 'ay', yil: 'yıl' };

const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [kod]);
  return r ? { kod, ad: r.ad as string, tur: r.tur as string } : { kod, ad: 'Silinmiş kayıt', tur: 'diger' };
};
function kayitTuru(e: EvrenVt, kod: unknown): string {
  const t = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  return t;
}

/** a → b ilişkileri; yön "a" ise verilen kayıt a'dır ve b'ler döner, "b" ise tersi. */
function bag(e: EvrenVt, kod: string, tur: string, yon: 'a' | 'b') {
  const ben = yon === 'a' ? 'a' : 'b', diger = yon === 'a' ? 'b' : 'a';
  return e.db.selectObjects(`SELECT i.kod ik, i.${diger} k FROM iliskiler i JOIN kayitlar x ON x.kod=i.${diger}
    WHERE i.${ben}=? AND i.tur=? AND ${ETKIN} AND x.silindi IS NULL AND x.karar<>'vazgecildi' ORDER BY i.olusturma`, [kod, tur])
    .map((r) => ({ iliski: r.ik as string, kod: r.k as string }));
}

function dayaniklilikOku(e: EvrenVt, iliski: string): Dayaniklilik | null {
  const r = e.db.selectValue('SELECT deger FROM dayaniklilik WHERE iliski=?', [iliski]) as string | undefined;
  return r ? JSON.parse(r) as Dayaniklilik : null;
}

export function dayaniklilikYaz(b: UretimBaglami, iliski: string, d: Dayaniklilik | null) {
  const r = typeof iliski === 'string' && kodGecerliMi(iliski) ? b.e.db.selectObject('SELECT a, b FROM iliskiler WHERE kod=? AND silindi IS NULL', [iliski]) : undefined;
  if (!r) throw new Error('İlişki bulunamadı.');
  let deger: Dayaniklilik | null = null;
  if (d) {
    const sayi = (x: unknown) => (x === null || x === undefined || x === '' ? null : Number(x));
    const enAz = sayi(d.enAz), enCok = sayi(d.enCok);
    for (const x of [enAz, enCok]) if (x !== null && (!Number.isFinite(x) || x < 0 || x > 100000)) throw new Error('Dayanma süresini sayı olarak yazın.');
    if (enAz !== null && enCok !== null && enAz > enCok) throw new Error('En az, en çoktan büyük olamaz.');
    if (!BIRIMLER.includes(d.birim)) throw new Error('Geçersiz birim.');
    if (d.ikame !== null) kayitTuru(b.e, d.ikame);
    const not = String(d.not ?? '').replace(/\s+/g, ' ').trim();
    if (not.length > 300) throw new Error('Not çok uzun.');
    deger = { enAz, enCok, birim: d.birim, ikame: d.ikame, not };
    if (enAz === null && enCok === null && !deger.ikame && !not) deger = null;
  }
  b.yaz([{ tur: 'dayaniklilik_yaz', veri: { iliski, deger, a: r.a, b: r.b } }], [r.a as string, r.b as string]);
}

export const dayanmaYazisi = (d: Dayaniklilik) => d.enAz === null && d.enCok === null ? null
  : d.enAz !== null && d.enCok !== null && d.enAz !== d.enCok ? `${d.enAz}–${d.enCok} ${BIRIM_ADI[d.birim]}`
  : d.enAz === null ? `en çok ${d.enCok} ${BIRIM_ADI[d.birim]}` : d.enCok === null ? `en az ${d.enAz} ${BIRIM_ADI[d.birim]}` : `${d.enAz} ${BIRIM_ADI[d.birim]}`;

/** Bir kayıt kesilirse etkilenebilecekler; genişlik öncelikli, her kayıt bir kez (en kısa yoluyla). */
export function kesintiZinciri(e: EvrenVt, kaynak: string): KesintiZinciri {
  kayitTuru(e, kaynak);
  const k0 = kisa(e, kaynak);
  const adimlar: KesintiAdimi[] = [];
  const gorulen = new Set<string>([kaynak]);
  let duzey: { kod: string; yol: KisaKayit[] }[] = [{ kod: kaynak, yol: [] }];
  const ekle = (yeni: typeof duzey, kod: string, yol: KisaKayit[], neden: string, iliski: string | null, diger: string[], derinlik: number) => {
    if (gorulen.has(kod)) return;
    gorulen.add(kod);
    const d = iliski ? dayaniklilikOku(e, iliski) : null;
    adimlar.push({ kayit: kisa(e, kod), derinlik, neden, yol, iliski, dayaniklilik: d ? { ...d, ikameKayit: d.ikame ? kisa(e, d.ikame) : null } : null,
      digerKaynaklar: diger.filter((x) => x !== kod).map((x) => kisa(e, x)) });
    yeni.push({ kod, yol: [...yol, kisa(e, kod)] });
  };
  for (let n = 1; n <= DERINLIK && duzey.length; n++) {
    const yeni: typeof duzey = [];
    for (const x of duzey) {
      const ad = kisa(e, x.kod).ad, tur = kisa(e, x.kod).tur;
      for (const g of bag(e, x.kod, 'girdi', 'b')) ekle(yeni, g.kod, x.yol, `girdisi “${ad}”`, g.iliski, [], n);
      for (const g of bag(e, x.kod, 'bagimli', 'b')) ekle(yeni, g.kod, x.yol, `“${ad}” kaydına bağımlı`, g.iliski, [], n);
      for (const g of bag(e, x.kod, 'besin', 'b')) {
        const diger = bag(e, g.kod, 'besin', 'a').map((y) => y.kod).filter((y) => y !== x.kod);
        ekle(yeni, g.kod, x.yol, `“${ad}” ile besleniyor`, g.iliski, diger, n);
      }
      for (const g of bag(e, x.kod, 'uretir', 'a')) {
        const diger = bag(e, g.kod, 'uretir', 'b').map((y) => y.kod).filter((y) => y !== x.kod);
        ekle(yeni, g.kod, x.yol, `üreticilerinden biri “${ad}”`, g.iliski, diger, n);
      }
      for (const g of bag(e, x.kod, 'acigi', 'b')) {
        const diger = bag(e, x.kod, 'uretir', 'b').map((y) => y.kod);
        ekle(yeni, g.kod, x.yol, `“${ad}” açığı var`, g.iliski, diger, n);
      }
      // Yol kesilirse ürünün kendisi kesilmez; o ürünün açığı olan yerler etkilenebilir.
      if (tur === 'rota') {
        for (const u of bag(e, x.kod, 'tasir', 'a')) {
          const digerYollar = bag(e, u.kod, 'tasir', 'b').map((y) => y.kod).filter((y) => y !== x.kod);
          for (const g of bag(e, u.kod, 'acigi', 'b')) ekle(yeni, g.kod, [...x.yol, kisa(e, u.kod)], `“${kisa(e, u.kod).ad}” açığı var; “${ad}” onu taşıyan yollardan biri`, g.iliski, digerYollar, n);
        }
      }
    }
    duzey = yeni;
  }
  return {
    kaynak: k0, adimlar,
    not: 'Yalnızca kayıtlı bağlar izlendi. Neyin etkilenebileceğini gösterir; ne zaman ve ne kadar etkileneceğini ancak dayanma süresi girilen bağlarda aralık olarak söyler.',
  };
}

export function uretimOzeti(e: EvrenVt, urun: string): UretimOzeti {
  kayitTuru(e, urun);
  const l = (tur: string, yon: 'a' | 'b') => bag(e, urun, tur, yon).map((x) => kisa(e, x.kod));
  return {
    urun: kisa(e, urun), ureten: l('uretir', 'b'), girdiler: l('girdi', 'a'), kullananUrunler: l('girdi', 'b'),
    fazlasiOlan: l('fazlasi', 'b'), acigiOlan: l('acigi', 'b'), tasiyanYollar: l('tasir', 'b'), bagimlilar: l('bagimli', 'b'),
  };
}
