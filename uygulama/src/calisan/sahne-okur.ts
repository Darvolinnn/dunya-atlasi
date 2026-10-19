// §3.6 / §5.5: okur için zaman okuma sırasıdır. "Bu sahneye kadar" sahnenin girişidir;
// aynı sahnedeki yeni bilgi ayrı gösterilir. Boş liste, kayıtlı bilgi yoktur; "bilmiyor" çıkarımı değildir.
// Mevcut anlatı her sahneye tek üst verir. Bağımsız sıralar bu salt okunur hesaba ayrı bağlamlar
// olarak verilebilir; bu paket baskı/alternatif sıra tanımı veya yeni kalıcı veri oluşturmaz.
// §18.2: soru okurun burada ne bildiği; gereken eser, sahne sırası ve açık bilgi kayıtlarıdır.
// Eksik sıra açıkça belirtilir. Okunanlar bilgi ve anlatıdır; hiçbir kayıt değişmez, metin yorumlanmaz.
import type { AnBilgisi, BilgiSatiri, KisaKayit, OkurOkumaSirasi, SahneOkurSonucu, SahneOkurSirasi } from '../veri/api';
import type { DurumBaglami } from './durum';
import { bilenBilgileri, okurOkumaSiralari } from './bilgi';
import { yonlendir } from './izdusum';
import { turkceKarsilastir } from '../alan/turkce';

function kayit(b: DurumBaglami, kod: string): KisaKayit | null {
  const r = b.e.db.selectObject('SELECT kod,ad,tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [yonlendir(b.e.db, kod)]);
  return r ? r as unknown as KisaKayit : null;
}
function catismali(b: DurumBaglami, kod: string, alan?: string) {
  return b.e.db.selectValue(`SELECT 1 FROM alan_yazanlari WHERE nesne=? ${alan ? 'AND alan=?' : ''} GROUP BY alan HAVING count(DISTINCT deger)>1 LIMIT 1`, alan ? [kod, alan] : [kod]) !== undefined;
}
function siraCatismali(b: DurumBaglami, sahne: string): boolean {
  const gorulen = new Set<string>();
  let k: string | undefined = sahne;
  while (k && !gorulen.has(k)) {
    gorulen.add(k);
    if (catismali(b, k, 'anlati')) return true;
    k = b.e.db.selectValue('SELECT ust FROM anlati WHERE kod=?', [k]) as string | undefined;
  }
  return false;
}

export function mevcutOkurSiralari(b: DurumBaglami): OkurOkumaSirasi[] {
  return [...okurOkumaSiralari(b.e)].flatMap(([kod, sira]) => {
    const eser = kayit(b, kod);
    return eser ? [{ kod, ad: 'Eserin okuma sırası', eser, sahneler: [...sira].sort((a, z) => a[1] - z[1]).map(([s]) => s) }] : [];
  });
}

function ozetle(liste: BilgiSatiri[]): AnBilgisi[] {
  const gruplar = new Map<string, BilgiSatiri[]>();
  for (const x of liste) gruplar.set(x.iddia.kod, [...(gruplar.get(x.iddia.kod) ?? []), x]);
  return [...gruplar.values()].map((l) => {
    const son = Math.max(...l.map((x) => x.okumaSirasi!));
    const satirlar = l.filter((x) => x.okumaSirasi === son).map((x) => ({ ...x, gecerli: 'evet' as const }));
    return { iddia: l[0].iddia, durum: satirlar.length === 1 ? 'tek' as const : 'belirsiz' as const, satirlar };
  });
}

/** Sıralar birbirinden bağımsızdır; bir eserin okuru diğer eserin bilgilerini miras almaz. */
export function sahneOkurBilgileri(b: DurumBaglami, sahne: string, siralar = mevcutOkurSiralari(b)): SahneOkurSonucu {
  const s = yonlendir(b.e.db, sahne);
  if (siraCatismali(b, s)) return { siralar: [], uyari: 'Sahnenin eserdeki yeri için iki cihazda farklı değer var ve henüz biri seçilmedi. Seçilene kadar okurun bilgisi gösterilemiyor.' };
  const sonuc: SahneOkurSirasi[] = [];
  const onbellek = new Map<string, BilgiSatiri[]>();
  for (const okuma of siralar) {
    const eser = kayit(b, okuma.eser.kod);
    if (!eser || eser.tur !== 'eser') continue;
    const dizi = okuma.sahneler.map((k) => yonlendir(b.e.db, k));
    const yer = dizi.indexOf(s);
    if (yer < 0) continue;
    const notlar = new Set<string>();
    // Aynı sahnenin tek sırada tekrarı mevcut modelde tanımlı değildir; görünmez seçim yapılmaz.
    if (new Set(dizi).size !== dizi.length) {
      sonuc.push({ kod: okuma.kod, ad: okuma.ad, eser, sira: yer + 1, once: [], buSahnede: [], notlar: ['Bu okuma sırasında aynı sahne birden çok kez geçiyor. Hangisinin kastedildiği belirlenmeden bilgi gösterilemiyor.'] });
      continue;
    }
    const sira = new Map(dizi.map((k, i) => [k, i + 1]));
    if (!onbellek.has(eser.kod)) onbellek.set(eser.kod, bilenBilgileri(b, eser.kod));
    const engellenen = new Set<string>();
    const bilgi: BilgiSatiri[] = [];
    for (const x of onbellek.get(eser.kod)!) {
      // Çatışmalı öğrenme sahnesinin izdüşümdeki değeri ileride olabilir; bunu seçip
      // eski bir duruma sessizce dönmeyiz. Kararın kaldırılması da aynı biçimde belirsizdir.
      if (catismali(b, x.kod, 'sahne') || catismali(b, x.kod, 'karar')) {
        engellenen.add(x.iddia.kod); notlar.add('Bazı bilgi ya da sıra değerleri seçilmeyi bekliyor. Bunlarda okurun ne bildiği kesin olarak gösterilmiyor.'); continue;
      }
      if (x.karar === 'vazgecildi' || !x.sahne) continue;
      const anchor = yonlendir(b.e.db, x.sahne.kod), n = sira.get(anchor);
      if (n === undefined) { notlar.add('Öğrenildiği sahne bu okuma sırasında yer almayan bilgiler hesaba katılmadı.'); continue; }
      if (n > yer + 1) continue;
      if (!kayit(b, anchor)) continue;
      if (catismali(b, x.kod) || catismali(b, x.iddia.kod) || siraCatismali(b, anchor)) {
        engellenen.add(x.iddia.kod); notlar.add('Bazı bilgi ya da sıra değerleri seçilmeyi bekliyor. Bunlarda okurun ne bildiği kesin olarak gösterilmiyor.'); continue;
      }
      bilgi.push({ ...x, okumaSirasi: n, uyari: !x.secenek && x.inanc !== 'bilmiyor' ? 'İnandığı cevap artık soruda yok.' : null });
    }
    const uygun = bilgi.filter((x) => !engellenen.has(x.iddia.kod));
    sonuc.push({ kod: okuma.kod, ad: okuma.ad, eser, sira: yer + 1,
      once: ozetle(uygun.filter((x) => x.okumaSirasi! < yer + 1)),
      buSahnede: ozetle(uygun.filter((x) => x.okumaSirasi === yer + 1)), notlar: [...notlar] });
  }
  sonuc.sort((a, z) => turkceKarsilastir(a.eser.ad, z.eser.ad) || turkceKarsilastir(a.ad, z.ad) || a.kod.localeCompare(z.kod));
  return { siralar: sonuc, uyari: sonuc.length ? null : 'Bu sahne hiçbir kayıtlı okuma sırasında yok, bu yüzden okurun bilgisi gösterilemiyor.' };
}
