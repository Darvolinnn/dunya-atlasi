// Geçişli sorgu ve alt birimlerden toplananlar (§3.7). Üst bölge seçilince alt birimlerdeki kayıtlar da sonuca girer;
// hangi ilişki üzerinden gezileceğini yazar seçer. Toplanan kayıtlar salt okunurdur: "bu yerde kayıtlı gördüklerimiz"
// yerin özelliği değildir; aynı kayıt birden çok alt birime bağlıysa bir kez sayılır. Varsayılanlar toplanmaz.
import type { GeciselEksen, GeciselSonuc, KisaKayit, ToplananKayit } from '../veri/api';
import { iliskiTuruBul } from '../alan/iliski-turleri';
import type { EvrenVt } from './evren-vt';

const DERINLIK = 12;
const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;

const kisa = (e: EvrenVt, kod: string): KisaKayit | null => {
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]);
  return r ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : null;
};

/** Alt birimler: kapsamada parçalar; bağlılıkta bağlı yönetimler ve yerler ile onların parçaları; kültürde o kültürden olanlar. */
export function altBirimler(e: EvrenVt, kok: string, eksen: GeciselEksen): Map<string, string[]> {
  const turler = eksen === 'kapsama' ? ['parca'] : eksen === 'bagli' ? ['bagli', 'parca'] : ['kulturu'];
  const sonuc = new Map<string, string[]>([[kok, []]]);
  let duzey = [kok];
  for (let n = 0; n < DERINLIK && duzey.length; n++) {
    const yeni: string[] = [];
    for (const u of duzey) {
      for (const r of e.db.selectObjects(`SELECT i.a FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.b=? AND i.tur IN (${turler.map(() => '?').join(',')})
          AND ${ETKIN} AND k.silindi IS NULL ORDER BY i.olusturma`, [u, ...turler])) {
        const a = r.a as string;
        if (sonuc.has(a)) continue;
        sonuc.set(a, [...sonuc.get(u)!, a]);
        yeni.push(a);
      }
    }
    // Kültürde yalnızca doğrudan bağ gezilir; "kültürün kültürü" yoktur.
    if (eksen === 'kultur') break;
    duzey = yeni;
  }
  return sonuc;
}

/** Bir birime sürmekte olan bir ilişkiyle bağlı kayıtlar (iki yönde); birimin üstlerine giden kapsama bağları hariç. */
function bagliKayitlar(e: EvrenVt, birim: string) {
  return e.db.selectObjects(`SELECT i.tur, i.a, i.b FROM iliskiler i WHERE (i.b=? OR (i.a=? AND i.tur NOT IN ('parca', 'bagli', 'kulturu', 'turu'))) AND ${ETKIN} ORDER BY i.olusturma`, [birim, birim])
    .map((r) => {
      const ben = r.a === birim ? 'a' : 'b';
      const t = iliskiTuruBul(r.tur as string);
      // Karşı tarafın gözünden etiket: birim "b" ise karşı taraf "a"dır ve ilişki onun için aIcin'dir.
      return { diger: (ben === 'a' ? r.b : r.a) as string, etiket: ben === 'b' ? t.aIcin : t.bIcin };
    });
}

export function geciselKayitlar(e: EvrenVt, kok: string, eksen: GeciselEksen): GeciselSonuc[] {
  const birimler = altBirimler(e, kok, eksen);
  const sonuc = new Map<string, GeciselSonuc>();
  const ad = (k: string) => kisa(e, k)?.ad ?? '';
  for (const [b, yol] of birimler) {
    if (b !== kok) sonuc.set(b, { kod: b, birim: null, etiket: yol.length > 1 ? `${yol.slice(0, -1).map(ad).join(' → ')} içinden` : 'doğrudan alt birim' });
  }
  for (const [b] of birimler) {
    for (const x of bagliKayitlar(e, b)) {
      if (birimler.has(x.diger) || sonuc.has(x.diger) || !kisa(e, x.diger)) continue;
      sonuc.set(x.diger, { kod: x.diger, birim: kisa(e, b), etiket: x.etiket });
    }
  }
  return [...sonuc.values()];
}

const TOPLANAN = ['urun', 'inanc', 'topluluk', 'acik_mesele'];

/** Yer sayfası için: alt birimlerde yazılmış üretim, inanç, topluluk ve açık meseleler; kaynaklarıyla, bir kez. */
export function altBirimlerdenToplananlar(e: EvrenVt, kod: string): ToplananKayit[] {
  const tur = e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [kod]) as string | undefined;
  if (!tur || !['mekan', 'sehir', 'siyasi'].includes(tur)) return [];
  const birimler = altBirimler(e, kod, tur === 'siyasi' ? 'bagli' : 'kapsama');
  const sonuc = new Map<string, ToplananKayit>();
  for (const [b] of birimler) {
    if (b === kod) continue;
    const birim = kisa(e, b);
    if (!birim) continue;
    for (const x of bagliKayitlar(e, b)) {
      if (birimler.has(x.diger)) continue;
      const k = kisa(e, x.diger);
      if (!k || !TOPLANAN.includes(k.tur)) continue;
      const v = sonuc.get(k.kod) ?? { kayit: k, birimler: [] };
      if (!v.birimler.some((y) => y.kod === b)) v.birimler.push(birim);
      sonuc.set(k.kod, v);
    }
  }
  return [...sonuc.values()];
}
