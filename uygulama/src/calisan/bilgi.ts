// İddialar ve bilgi durumları (§3.6). Bir iddia bir kayıt hakkındaki sorudur ("Kralı kim öldürdü?") ve olası
// cevaplarıdır; yazar gerçeği belirleyebilir ya da açık bırakır. Bilgi durumu bir bilenin (karakter, grup ya da
// okur) o soruya tutumudur: inancı, kaynağı, kimden sakladığı ve zamanı. Okur da bir bilendir: eser kaydı bilen
// olur ve zamanı okuma sırasıdır. Program metinden bilgi çıkarmaz (K1); her bilgi yazarın açık kaydıdır.
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { bilgiEtiketi, BILGI_KAYNAKLARI, INANCLAR, type Inanc } from '../alan/bilgi';
import { gecerlilik, type Gecerlilik, type Sinir } from '../alan/durum';
import { siraAnahtari, type EvrenTarihi } from '../alan/tarih';
import { kararGecerli } from '../alan/turler';
import { turkceKarsilastir } from '../alan/turkce';
import type { AnBilgisi, BilgiAlani, BilgiGirdisi, BilgiSatiri, IddiaOzeti, IddiaSatiri, IddiaSecenegi, KisaKayit, SinirGirdisi } from '../veri/api';
import { sinirBilgisi, sinirCoz, temiz, type DurumBaglami } from './durum';
import { eserYapisi } from './anlati';
import type { EvrenVt } from './evren-vt';

type Satir = Record<string, unknown>;

function kisa(e: EvrenVt, kod: string | null | undefined): KisaKayit | null {
  if (!kod) return null;
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [kod]);
  return r ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : { kod, ad: 'Silinmiş kayıt', tur: 'diger' };
}

function iddiaOzeti(e: EvrenVt, r: Satir): IddiaOzeti {
  return { kod: r.kod as string, soru: r.soru as string, konu: kisa(e, r.konu as string)!, secenekler: JSON.parse(r.secenekler as string), gercek: (r.gercek as string) ?? null };
}

/** Eserlerin okuma sırası: sahne → (eser, sıra). */
function okumaSiralari(e: EvrenVt): Map<string, Map<string, number>> {
  const m = new Map<string, Map<string, number>>();
  for (const r of e.db.selectObjects("SELECT kod FROM kayitlar WHERE tur='eser' AND silindi IS NULL")) {
    const y = eserYapisi(e, r.kod as string);
    m.set(r.kod as string, new Map([...y.dogrudan, ...y.bolumler.flatMap((b) => b.sahneler)].map((s) => [s.kod, s.sira])));
  }
  return m;
}

function bilgiSatiri(b: DurumBaglami, r: Satir, iddia: IddiaOzeti, okuma?: Map<string, Map<string, number>>): BilgiSatiri {
  const e = b.e;
  const bilen = kisa(e, r.bilen as string)!;
  const okur = bilen.tur === 'eser';
  const secenek = iddia.secenekler.find((s) => s.kod === r.secenek) ?? null;
  const saklamaKod = r.saklama ? (JSON.parse(r.saklama as string) as string[]) : null;
  const sahne = kisa(e, r.sahne as string);
  const sira = okur && sahne ? (okuma ?? okumaSiralari(e)).get(bilen.kod)?.get(sahne.kod) ?? null : null;
  const baslangic = sinirBilgisi(b, r.baslangic ? JSON.parse(r.baslangic as string) : null);
  const bitis = sinirBilgisi(b, r.bitis ? JSON.parse(r.bitis as string) : null);
  let uyari: string | null = null;
  if (r.secenek && !secenek) uyari = 'İnandığı cevap sorudan çıkarılmış.';
  else if (okur && !sahne) uyari = 'Okurun bunu hangi sahnede öğrendiği seçilmedi.';
  else if (okur && sira === null) uyari = 'Seçilen sahne bu eserin okuma sırasında yok.';
  return {
    kod: r.kod as string, iddia, bilen, okur, secenek, inanc: r.inanc as Inanc,
    etiket: bilgiEtiketi(r.inanc as Inanc, secenek?.kod ?? null, iddia.gercek, saklamaKod, okur),
    saklama: saklamaKod ? saklamaKod.map((k) => kisa(e, k)!) : null,
    kaynak: (r.kaynak as BilgiSatiri['kaynak']) ?? null, kaynakKayit: kisa(e, r.kaynak_kayit as string),
    sahne, okumaSirasi: sira, baslangic, bitis, aciklama: r.aciklama as string, karar: r.karar as string, uyari,
  };
}

/** Bilginin başladığı an: yazılı sınır, yoksa öğrendiği sahnenin tarihi. */
function baslangicTarihi(b: DurumBaglami, x: BilgiSatiri): Sinir {
  if (x.baslangic) return x.baslangic.tarih;
  if (x.sahne) return b.olayTarihi(x.sahne.kod);
  return 'acik';
}

function sirala(b: DurumBaglami, l: BilgiSatiri[]) {
  if (l[0]?.okur) return l.sort((x, y) => (x.okumaSirasi ?? 1e9) - (y.okumaSirasi ?? 1e9));
  const anahtar = (x: BilgiSatiri) => { const s = baslangicTarihi(b, x); return s === 'acik' ? -Infinity : siraAnahtari(s); };
  return l.sort((x, y) => anahtar(x) - anahtar(y));
}

/** Bir kayıt hakkındaki iddialar ve her birini kimin nasıl bildiği. */
export function kayitIddialari(b: DurumBaglami, konu: string): IddiaSatiri[] {
  const e = b.e;
  const okuma = okumaSiralari(e);
  return e.db.selectObjects('SELECT * FROM iddialar WHERE konu=? AND silindi IS NULL ORDER BY olusturma', [konu]).map((r) => {
    const o = iddiaOzeti(e, r);
    const bilgiler = e.db.selectObjects(`SELECT x.* FROM bilgiler x JOIN kayitlar k ON k.kod=x.bilen WHERE x.iddia=? AND x.silindi IS NULL AND k.silindi IS NULL ORDER BY x.olusturma`, [o.kod])
      .map((x) => bilgiSatiri(b, x, o, okuma));
    // Bilenlere göre, her bilenin kayıtları zamanına göre.
    const gruplar = new Map<string, BilgiSatiri[]>();
    for (const x of bilgiler) gruplar.set(x.bilen.kod, [...(gruplar.get(x.bilen.kod) ?? []), x]);
    const sirali = [...gruplar.values()].sort((x, y) => Number(x[0].okur) - Number(y[0].okur) || turkceKarsilastir(x[0].bilen.ad, y[0].bilen.ad)).flatMap((l) => sirala(b, l));
    return { ...o, karar: r.karar as string, bilgiler: sirali };
  });
}

/** Bütün iddialar (bilgi eklerken seçmek için). */
export function iddialar(e: EvrenVt): IddiaOzeti[] {
  return e.db.selectObjects('SELECT i.* FROM iddialar i JOIN kayitlar k ON k.kod=i.konu WHERE i.silindi IS NULL AND k.silindi IS NULL')
    .map((r) => iddiaOzeti(e, r)).sort((x, y) => turkceKarsilastir(x.konu.ad, y.konu.ad) || turkceKarsilastir(x.soru, y.soru));
}

/** Bir bilenin (karakter, grup, okur) bütün bilgi kayıtları. */
export function bilenBilgileri(b: DurumBaglami, bilen: string): BilgiSatiri[] {
  const e = b.e;
  const okuma = okumaSiralari(e);
  const gruplar = new Map<string, BilgiSatiri[]>();
  for (const r of e.db.selectObjects(`SELECT x.*, i.kod i_kod, i.soru i_soru, i.konu i_konu, i.secenekler i_secenekler, i.gercek i_gercek FROM bilgiler x
      JOIN iddialar i ON i.kod=x.iddia JOIN kayitlar k ON k.kod=i.konu WHERE x.bilen=? AND x.silindi IS NULL AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY x.olusturma`, [bilen])) {
    const o = iddiaOzeti(e, { kod: r.i_kod, soru: r.i_soru, konu: r.i_konu, secenekler: r.i_secenekler, gercek: r.i_gercek });
    gruplar.set(o.kod, [...(gruplar.get(o.kod) ?? []), bilgiSatiri(b, r, o, okuma)]);
  }
  return [...gruplar.values()].sort((x, y) => turkceKarsilastir(x[0].iddia.konu.ad, y[0].iddia.konu.ad) || turkceKarsilastir(x[0].iddia.soru, y[0].iddia.soru)).flatMap((l) => sirala(b, l));
}

/**
 * Bir bilenin verilen andaki bilgisi. Aynı iddia için kayıtlar zamanına göre sıralanır; bitişi yazılmamış kayıt
 * bir sonrakinin başlangıcına kadar sürer. Birden çok kayıt geçerli ya da belirsizse hiçbiri gizlice seçilmez.
 * Bu anda geçerli kaydı olmayan iddia listelenmez: "kayıtlı bilgi yok", "bilmiyor" demek değildir.
 */
export function anBilgisi(b: DurumBaglami, bilen: string, an: EvrenTarihi | null): AnBilgisi[] {
  const tum = bilenBilgileri(b, bilen).filter((x) => x.karar !== 'vazgecildi');
  const gruplar = new Map<string, BilgiSatiri[]>();
  for (const x of tum) gruplar.set(x.iddia.kod, [...(gruplar.get(x.iddia.kod) ?? []), x]);
  const sonuc: AnBilgisi[] = [];
  for (const l of gruplar.values()) {
    const satirlar: AnBilgisi['satirlar'] = [];
    l.forEach((x, i) => {
      const bas = baslangicTarihi(b, x);
      let bit: Sinir = x.bitis ? x.bitis.tarih : 'acik';
      if (!x.bitis && l[i + 1]) { const s = baslangicTarihi(b, l[i + 1]); if (s !== 'acik') bit = s; }
      const g: Gecerlilik = an ? gecerlilik('aralik', bas, bit, an) : 'belirsiz';
      if (g !== 'hayir') satirlar.push({ ...x, gecerli: g });
    });
    if (!satirlar.length) continue;
    sonuc.push({ iddia: l[0].iddia, durum: satirlar.length === 1 && satirlar[0].gecerli === 'evet' ? 'tek' : 'belirsiz', satirlar });
  }
  return sonuc;
}

/** Okurun bir sahneye gelene kadar (o sahne dahil) öğrendikleri; okuma sırasında en son kayıt geçerlidir. */
export function okurBilgisi(b: DurumBaglami, eser: string, sahneSira: number): AnBilgisi[] {
  const gruplar = new Map<string, BilgiSatiri[]>();
  for (const x of bilenBilgileri(b, eser)) {
    if (x.karar === 'vazgecildi' || x.okumaSirasi === null || x.okumaSirasi > sahneSira) continue;
    gruplar.set(x.iddia.kod, [...(gruplar.get(x.iddia.kod) ?? []), x]);
  }
  return [...gruplar.values()].map((l) => {
    const son = Math.max(...l.map((x) => x.okumaSirasi!));
    const satirlar = l.filter((x) => x.okumaSirasi === son).map((x) => ({ ...x, gecerli: 'evet' as Gecerlilik }));
    return { iddia: l[0].iddia, durum: satirlar.length === 1 ? 'tek' as const : 'belirsiz' as const, satirlar };
  });
}

// ---------- Yazma ----------
function kayitVar(e: EvrenVt, kod: unknown, hata = 'Kayıt bulunamadı.'): string {
  if (!kodGecerliMi(kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kod]) === undefined) throw new Error(hata);
  return kod;
}
function iddiaBul(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM iddialar WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('Soru bulunamadı.');
  return r;
}
function bilgiBul(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM bilgiler WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('Bilgi kaydı bulunamadı.');
  return r;
}
const secenekMetinleri = (l: unknown): string[] => {
  if (!Array.isArray(l)) throw new Error('Cevaplar okunamadı.');
  const m = l.map((x) => temiz(x, 300)).filter(Boolean);
  if (!m.length) throw new Error('En az bir olası cevap yazın.');
  if (m.length > 30) throw new Error('En çok 30 cevap yazılabilir.');
  if (new Set(m.map((x) => x.toLocaleLowerCase('tr-TR'))).size !== m.length) throw new Error('Aynı cevap iki kez yazılmış.');
  return m;
};

export function iddiaEkle(b: DurumBaglami, konu: string, soru: string, secenekler: string[], gercekSira: number | null | undefined, karar = 'kesin') {
  kayitVar(b.e, konu);
  const s = temiz(soru, 300, false);
  const liste: IddiaSecenegi[] = secenekMetinleri(secenekler).map((metin) => ({ kod: yeniKod(), metin }));
  if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
  const gercek = gercekSira === null || gercekSira === undefined ? null : liste[gercekSira]?.kod ?? null;
  const kod = yeniKod();
  b.yaz([{ tur: 'iddia_ekle', veri: { kod, konu, soru: s, secenekler: liste, gercek, karar } }], [konu]);
  return { kod };
}

export function iddiaDegistir(b: DurumBaglami, kod: string, alan: string, girdi: unknown) {
  const r = iddiaBul(b.e, kod);
  const eski: IddiaSecenegi[] = JSON.parse(r.secenekler as string);
  let deger: unknown;
  switch (alan) {
    case 'soru': deger = temiz(girdi, 300, false); break;
    case 'karar': if (!kararGecerli(girdi)) throw new Error('Geçersiz karar durumu.'); deger = girdi; break;
    case 'gercek':
      if (girdi !== null && !eski.some((s) => s.kod === girdi)) throw new Error('Bu cevap soruda yok.');
      deger = girdi; break;
    case 'secenekler': {
      // Var olan cevaplar kodlarıyla korunur (inançlar onlara bağlıdır); yeni cevaplar yeni kod alır.
      if (!Array.isArray(girdi)) throw new Error('Cevaplar okunamadı.');
      const metinler = secenekMetinleri((girdi as { metin: string }[]).map((x) => x?.metin));
      const liste: IddiaSecenegi[] = (girdi as { kod?: string; metin: string }[]).filter((x) => temiz(x?.metin, 300)).map((x, i) => ({
        kod: x.kod && eski.some((s) => s.kod === x.kod) ? x.kod : yeniKod(), metin: metinler[i],
      }));
      const kalan = new Set(liste.map((s) => s.kod));
      const kullanilan = b.e.db.selectValue(`SELECT count(*) FROM bilgiler WHERE iddia=? AND silindi IS NULL AND secenek IS NOT NULL AND secenek NOT IN (${liste.map(() => '?').join(',')})`, [kod, ...kalan]) as number;
      if (kullanilan) throw new Error('Çıkarmak istediğiniz cevaba inanan ya da onu bilen biri kayıtlı. Önce o bilgiyi değiştirin.');
      if (r.gercek && !kalan.has(r.gercek as string)) throw new Error('Gerçek olarak belirlenen cevap çıkarılamaz. Önce gerçeği değiştirin.');
      deger = liste; break;
    }
    default: throw new Error('Bu alan değiştirilemez.');
  }
  const onceki = alan === 'secenekler' ? eski : r[alan] ?? null;
  if (JSON.stringify(onceki) === JSON.stringify(deger)) return;
  b.yaz([{ tur: 'iddia_degistir', veri: { kod, alan, deger, konu: r.konu, soru: r.soru } }], [r.konu as string]);
}

export function iddiaSil(b: DurumBaglami, kod: string, geriYukle = false) {
  const r = iddiaBul(b.e, kod);
  b.yaz([{ tur: geriYukle ? 'iddia_geri_yukle' : 'iddia_sil', veri: { kod, konu: r.konu, soru: r.soru } }], [r.konu as string]);
}

/** Girdi alanını izdüşümün saklayacağı değere çevirir; geçersizse anlaşılır bir hata verir. */
function bilgiAlani(b: DurumBaglami, iddia: Satir, alan: string, girdi: unknown, inanc: string): unknown {
  const e = b.e;
  switch (alan) {
    case 'secenek': {
      if (girdi === null || girdi === undefined || girdi === '') { if (inanc !== 'bilmiyor') throw new Error('Hangi cevaba inandığını seçin.'); return null; }
      if (!(JSON.parse(iddia.secenekler as string) as IddiaSecenegi[]).some((s) => s.kod === girdi)) throw new Error('Bu cevap soruda yok.');
      return girdi;
    }
    case 'inanc': if (!INANCLAR.some((x) => x.kod === girdi)) throw new Error('Geçersiz inanç.'); return girdi;
    case 'saklama':
      if (girdi === null || girdi === undefined) return null;
      if (!Array.isArray(girdi)) throw new Error('Saklanan kişiler okunamadı.');
      return [...new Set(girdi.map((k) => kayitVar(e, k, 'Saklanan kişi bulunamadı.')))];
    case 'kaynak': if (girdi && !BILGI_KAYNAKLARI.some((x) => x.kod === girdi)) throw new Error('Geçersiz kaynak.'); return girdi || null;
    case 'kaynakKayit': return girdi ? kayitVar(e, girdi, 'Kaynak kaydı bulunamadı.') : null;
    case 'sahne': {
      if (!girdi) return null;
      const k = kayitVar(e, girdi, 'Sahne bulunamadı.');
      if (e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [k]) !== 'sahne') throw new Error('Bir sahne seçin.');
      return k;
    }
    case 'baslangic': case 'bitis': return sinirCoz(b, girdi as SinirGirdisi | null);
    case 'aciklama': return temiz(girdi, 500);
    case 'karar': if (!kararGecerli(girdi)) throw new Error('Geçersiz karar durumu.'); return girdi;
  }
  throw new Error('Bu alan değiştirilemez.');
}

export function bilgiEkle(b: DurumBaglami, g: BilgiGirdisi) {
  const e = b.e;
  const iddia = iddiaBul(e, g.iddia);
  const bilen = kayitVar(e, g.bilen, 'Bilen kayıt bulunamadı.');
  const inanc = bilgiAlani(b, iddia, 'inanc', g.inanc, '') as string;
  const okur = e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [bilen]) === 'eser';
  const veri: Record<string, unknown> = {
    kod: yeniKod(), iddia: g.iddia, bilen, inanc,
    secenek: bilgiAlani(b, iddia, 'secenek', inanc === 'bilmiyor' ? null : g.secenek, inanc),
    saklama: okur ? null : bilgiAlani(b, iddia, 'saklama', g.saklama ?? null, inanc),
    kaynak: bilgiAlani(b, iddia, 'kaynak', g.kaynak ?? null, inanc),
    kaynakKayit: bilgiAlani(b, iddia, 'kaynakKayit', g.kaynakKayit ?? null, inanc),
    sahne: bilgiAlani(b, iddia, 'sahne', g.sahne ?? null, inanc),
    baslangic: okur ? null : bilgiAlani(b, iddia, 'baslangic', g.baslangic ?? null, inanc),
    bitis: okur ? null : bilgiAlani(b, iddia, 'bitis', g.bitis ?? null, inanc),
    aciklama: bilgiAlani(b, iddia, 'aciklama', g.aciklama ?? '', inanc),
    karar: bilgiAlani(b, iddia, 'karar', g.karar ?? 'kesin', inanc),
  };
  if (okur && !veri.sahne) throw new Error('Okurun bunu hangi sahnede öğrendiğini seçin.');
  b.yaz([{ tur: 'bilgi_ekle', veri: { ...veri, soru: iddia.soru } }], [bilen, iddia.konu as string]);
  return { kod: veri.kod as string };
}

export function bilgiDegistir(b: DurumBaglami, kod: string, alan: BilgiAlani, girdi: unknown) {
  const e = b.e;
  const r = bilgiBul(e, kod);
  const iddia = iddiaBul(e, r.iddia as string);
  const deger = bilgiAlani(b, iddia, alan, girdi, alan === 'secenek' ? (r.inanc as string) : '');
  const sutun = alan === 'kaynakKayit' ? 'kaynak_kayit' : alan;
  const ham = r[sutun];
  const onceki = ['saklama', 'baslangic', 'bitis'].includes(alan) ? (ham ? JSON.parse(ham as string) : null) : ham ?? null;
  if (JSON.stringify(onceki) === JSON.stringify(deger)) return;
  const girdiler = [{ tur: 'bilgi_degistir', veri: { kod, alan, deger, bilen: r.bilen, soru: iddia.soru } }];
  // "Bilmiyor"a dönen kaydın cevabı boşalır; inançtan "bilmiyor"dan çıkarken cevap ayrıca seçilir.
  if (alan === 'inanc' && deger === 'bilmiyor' && r.secenek) girdiler.push({ tur: 'bilgi_degistir', veri: { kod, alan: 'secenek', deger: null, bilen: r.bilen, soru: iddia.soru } });
  if (alan === 'inanc' && deger !== 'bilmiyor' && !r.secenek) throw new Error('Önce hangi cevaba inandığını seçin.');
  b.yaz(girdiler, [r.bilen as string]);
}

export function bilgiSil(b: DurumBaglami, kod: string, geriYukle = false) {
  const r = bilgiBul(b.e, kod);
  const soru = b.e.db.selectValue('SELECT soru FROM iddialar WHERE kod=?', [r.iddia as string]) as string;
  b.yaz([{ tur: geriYukle ? 'bilgi_geri_yukle' : 'bilgi_sil', veri: { kod, bilen: r.bilen, soru } }], [r.bilen as string]);
}

/** Sahne paneli için mevcut okuma sıraları; yeni sıra veya okur oluşturmaz. */
export function okurOkumaSiralari(e: EvrenVt) {
  return okumaSiralari(e);
}

