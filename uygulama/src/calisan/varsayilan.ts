// Varsayılan değerler (§3.7). Yalnızca şablonda "varsayılan alabilir" diye işaretlenen alan, boşken ve "henüz
// düşünülmedi" durumundayken başka bir kayıttan varsayılan gösterir. Her alan tek bir eksenden alır: fiziksel kapsama,
// siyasi bağlılık, kültürel aidiyet ya da tür tanımı. Varsayılan bir öneridir, kayıt değildir: kaynağı gösterilir,
// değer olarak kabul etmek ayrı bir işlemdir. Birden çok kaynak farklı değer veriyorsa eklenme sırası hiçbir şeyi
// belirlemez; yazar "birlikte geçerli", "kapsamları farklı" ya da "öncelikli kaynak" diyene kadar çatışma çözülmemiştir.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { katla } from '../alan/turkce';
import type { VarsayilanEkseni } from '../alan/sablon';
import type { AlanVarsayilani, BoslukTuru, KisaKayit, VarsayilanKarari, VarsayilanKaynagi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { sablonOku } from './sablon';

export interface VarsayilanBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

const EKSEN_ADI: Record<VarsayilanEkseni, string> = { kapsama: 'fiziksel kapsama', bagli: 'siyasi bağlılık', kultur: 'kültürel aidiyet', tur: 'tür tanımı' };
const DERINLIK = 8;

const kisa = (e: EvrenVt, kod: string): KisaKayit | null => {
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]);
  return r ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : null;
};

/** Sürmekte olan (bitişi yazılmamış), vazgeçilmemiş ilişkiler: a → b. */
const ustler = (e: EvrenVt, kod: string, turler: string[]) => e.db.selectObjects(
  `SELECT i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.a=? AND i.tur IN (${turler.map(() => '?').join(',')})
   AND i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi' AND k.silindi IS NULL ORDER BY i.olusturma`, [kod, ...turler]).map((r) => r.b as string);

/** Kaynak kayıtta alanın açık değeri: aynı kodlu alan, yoksa şablonunda aynı adlı alan. Varsayılan zinciri kanıt sayılmaz. */
function acikDeger(e: EvrenVt, kaynak: string, alan: string, ad: string): unknown | undefined {
  const ham = e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [kaynak, alan]) as string | undefined;
  if (ham !== undefined) return JSON.parse(ham);
  const tur = e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [kaynak]) as string;
  const benzer = sablonOku(e, tur).alanlar.find((a) => a.kod !== alan && katla(a.ad) === katla(ad));
  if (!benzer) return undefined;
  const h2 = e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [kaynak, benzer.kod]) as string | undefined;
  return h2 === undefined ? undefined : JSON.parse(h2);
}

/**
 * Bir eksende kaynak arar. Kapsama: parçası olduğu yerler (kişide yaşadığı yer), en yakın değerli düzey. Bağlılık:
 * kendi bağlı olduğu yönetim; yoksa içinde bulunduğu yerin yönetimi; yönetimde değer yoksa onun bağlı olduğu yönetim.
 * Kültür: kendi kültürleri; yer ise içinde bulunduğu yerin kültürü. Tür: kendi türü.
 */
function kaynaklar(e: EvrenVt, kod: string, eksen: VarsayilanEkseni, alan: string, ad: string): VarsayilanKaynagi[] {
  const kisi = !['mekan', 'sehir', 'siyasi'].includes(e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [kod]) as string);
  const sonuc: VarsayilanKaynagi[] = [];
  const ekle = (kaynak: string, yol: string[]) => {
    const d = acikDeger(e, kaynak, alan, ad);
    if (d === undefined || d === null || d === '') return false;
    const k = kisa(e, kaynak);
    if (!k) return false;
    sonuc.push({ kaynak: k, deger: d, eksen, yol: yol.map((x) => kisa(e, x)).filter((x): x is KisaKayit => !!x) });
    return true;
  };
  /** Düzey düzey yukarı çıkar; bir düzeyde değer bulunursa orada durur (o düzeydeki bütün kaynaklar gösterilir). */
  const tirman = (baslangic: { kod: string; yol: string[] }[], adim: (k: string) => string[], deger: (k: string, yol: string[]) => boolean) => {
    let duzey = baslangic;
    const gorulen = new Set<string>([kod]);
    for (let n = 0; n < DERINLIK && duzey.length; n++) {
      let bulundu = false;
      for (const x of duzey) if (deger(x.kod, x.yol)) bulundu = true;
      if (bulundu) return true;
      duzey = duzey.flatMap((x) => adim(x.kod).filter((u) => !gorulen.has(u) && (gorulen.add(u), true)).map((u) => ({ kod: u, yol: [...x.yol, u] })));
    }
    return false;
  };
  const kapsayan = (k: string) => ustler(e, k, ['parca']);
  if (eksen === 'kapsama') {
    tirman(ustler(e, kod, kisi ? ['yasar', 'parca'] : ['parca']).map((u) => ({ kod: u, yol: [u] })), kapsayan, (k, yol) => ekle(k, yol));
  } else if (eksen === 'tur') {
    for (const u of ustler(e, kod, ['turu'])) ekle(u, [u]);
  } else if (eksen === 'kultur') {
    const kendi = ustler(e, kod, ['kulturu']);
    if (kendi.length) for (const u of kendi) ekle(u, [u]);
    else if (!kisi) tirman(kapsayan(kod).map((u) => ({ kod: u, yol: [u] })), kapsayan, (k, yol) => ustler(e, k, ['kulturu']).map((c) => ekle(c, [...yol, c])).some(Boolean));
  } else {
    // Yönetim değer vermiyorsa onun bağlı olduğu yönetime çıkılır (vasal → metbu).
    const yonetimden = (y: string, yol: string[]) => tirman([{ kod: y, yol }], (k) => ustler(e, k, ['bagli']), (k, yl) => ekle(k, yl));
    const kendi = ustler(e, kod, ['bagli']);
    if (kendi.length) for (const u of kendi) yonetimden(u, [u]);
    else tirman(kapsayan(kod).map((u) => ({ kod: u, yol: [u] })), kapsayan, (k, yol) => ustler(e, k, ['bagli']).map((y) => yonetimden(y, [...yol, y])).some(Boolean));
  }
  return sonuc;
}

const ayni = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Bir kaydın boş alanları için varsayılanlar. Değeri olan, "henüz düşünülmedi" dışında boş bırakılan alan gösterilmez. */
export function kayitVarsayilanlari(e: EvrenVt, kod: string): Record<string, AlanVarsayilani> {
  const tur = e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [kod]) as string | undefined;
  if (!tur) return {};
  const sonuc: Record<string, AlanVarsayilani> = {};
  const bosluk = new Map(e.db.selectObjects('SELECT alan, tur FROM alan_bosluklari WHERE kayit=?', [kod]).map((r) => [r.alan as string, r.tur as BoslukTuru]));
  for (const a of sablonOku(e, tur).alanlar) {
    if (!a.varsayilan) continue;
    if (e.db.selectValue('SELECT 1 FROM alan_degerleri WHERE kayit=? AND alan=?', [kod, a.kod]) !== undefined) continue;
    const b = bosluk.get(a.kod) ?? null;
    if (b) { sonuc[a.kod] = { eksen: a.varsayilan, eksenAdi: EKSEN_ADI[a.varsayilan], kaynaklar: [], durum: 'gizli', bosluk: b, karar: null }; continue; }
    const k = kaynaklar(e, kod, a.varsayilan, a.kod, a.ad);
    const r = e.db.selectObject('SELECT * FROM varsayilan_kararlari WHERE kayit=? AND alan=?', [kod, a.kod]);
    const karar: VarsayilanKarari | null = r ? { durum: r.durum as VarsayilanKarari['durum'], oncelikli: (r.oncelikli as string) ?? null, aciklama: r.aciklama as string } : null;
    const farkli = k.some((x) => !ayni(x.deger, k[0].deger));
    let durum: AlanVarsayilani['durum'] = !k.length ? 'yok' : !farkli ? 'tek' : 'cozulmemis';
    if (farkli && karar) {
      if (karar.durum === 'oncelik') durum = k.some((x) => x.kaynak.kod === karar.oncelikli) ? 'oncelik' : 'cozulmemis';
      else durum = karar.durum;
    }
    sonuc[a.kod] = { eksen: a.varsayilan, eksenAdi: EKSEN_ADI[a.varsayilan], kaynaklar: k, durum, bosluk: null, karar };
  }
  return sonuc;
}

function alanBul(e: EvrenVt, kod: string, alan: string) {
  const tur = kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!tur) throw new Error('Kayıt bulunamadı.');
  const a = sablonOku(e, tur).alanlar.find((x) => x.kod === alan);
  if (!a) throw new Error('Bu alan şablonda yok.');
  return a;
}

export function alanBoslugu(b: VarsayilanBaglami, kod: string, alan: string, tur: BoslukTuru | null) {
  const a = alanBul(b.e, kod, alan);
  if (tur !== null && !['acik', 'bilinmiyor', 'gecersiz'].includes(tur)) throw new Error('Geçersiz seçim.');
  const onceki = (b.e.db.selectValue('SELECT tur FROM alan_bosluklari WHERE kayit=? AND alan=?', [kod, alan]) as string | undefined) ?? null;
  if (onceki === tur) return;
  b.yaz([{ tur: 'alan_boslugu', veri: { kod, alan, tur, onceki, ad: a.ad } }], [kod]);
}

export function varsayilanKarari(b: VarsayilanBaglami, kod: string, alan: string, karar: VarsayilanKarari | null) {
  const a = alanBul(b.e, kod, alan);
  if (karar) {
    if (!['birlikte', 'kapsam', 'oncelik'].includes(karar.durum)) throw new Error('Geçersiz seçim.');
    if (karar.durum === 'oncelik' && (!karar.oncelikli || !kisa(b.e, karar.oncelikli))) throw new Error('Öncelikli kaynağı seçin.');
    const ac = String(karar.aciklama ?? '').replace(/\s+/g, ' ').trim();
    if (karar.durum === 'kapsam' && !ac) throw new Error('Kapsamların nasıl ayrıldığını kısaca yazın (ör. biri sarayda, biri pazarda).');
    if (ac.length > 300) throw new Error('Açıklama çok uzun.');
    karar = { durum: karar.durum, oncelikli: karar.durum === 'oncelik' ? karar.oncelikli : null, aciklama: ac };
  }
  b.yaz([{ tur: 'varsayilan_karari', veri: { kod, alan, karar, ad: a.ad } }], [kod]);
}
