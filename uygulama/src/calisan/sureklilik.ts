// Süreklilik defteri (§5.6, §15-12). Yazarın izlemek istediği küçük ayrıntılar (ok sayısı, yaralı el, kimdeki kılıç)
// sahne başında ve sonunda gözlenir; değişimler sahnelere değil evren olaylarına bağlıdır (sahne olayı da olur).
// Üç şey ayrıdır: gözlenen durum, iki gözlemden hesaplanan net fark ve yazarın ayrıca kaydettiği değişim. Hesap
// yalnızca geçiş modeli izin verirse yapılır (sayılabilir kaynak, iyileşme süresi); serbest durumda hesap yoktur.
// İki gözlemden eylem çıkarılmaz; hesap ile gözlem uyuşmazsa ikisi de gösterilir.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { GUN_PARCA, siraAnahtari, type EvrenTarihi } from '../alan/tarih';
import type { IzAdimi, IzGecmisi, IzModeli, IzTanimi, SahneIzi, SahneSurekliligi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { sayiOku } from '../alan/nicelik';

export interface SureklilikBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  /** Kaydın geçerli tarihi (sahne olayında sahnenin tarihi). */
  tarih(kod: string): EvrenTarihi | null;
}

const MODELLER: IzModeli[] = ['durum', 'sayi', 'iyilesme'];

const ad = (e: EvrenVt, kod: string) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [kod]) as string | undefined) ?? 'Silinmiş kayıt';

function kayitVar(e: EvrenVt, kod: unknown, tur?: string): string {
  const t = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as string | undefined : undefined;
  if (!t) throw new Error('Kayıt bulunamadı.');
  if (tur && t !== tur) throw new Error('Bu bir sahne kaydı değil.');
  return kod as string;
}

const temizAd = (s: unknown, n: number, bos = true) => {
  const x = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!x && !bos) throw new Error('Ad boş olamaz.');
  if (x.length > n) throw new Error('Metin çok uzun.');
  return x;
};
const sureGecerli = (s: unknown) => {
  if (s === null || s === undefined || s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) throw new Error('İyileşme süresini gün sayısı olarak yazın.');
  return n;
};

function izOku(e: EvrenVt, r: Record<string, unknown>): IzTanimi {
  const konu = r.konu as string;
  const k = e.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [konu]);
  return { kod: r.kod as string, konu: { kod: konu, ad: (k?.ad as string) ?? 'Silinmiş kayıt', tur: (k?.tur as string) ?? 'diger' }, ad: r.ad as string,
    model: r.model as IzModeli, birim: (r.birim as string) ?? '', sure: r.sure === null || r.sure === undefined ? null : Number(r.sure) };
}

function izBul(e: EvrenVt, kod: unknown): IzTanimi {
  const r = typeof kod === 'string' && kodGecerliMi(kod) ? e.db.selectObject('SELECT * FROM izler WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('İzlenen ayrıntı bulunamadı.');
  return izOku(e, r);
}

const izler = (e: EvrenVt, kosul = '1', arg: string[] = []) =>
  e.db.selectObjects(`SELECT i.* FROM izler i JOIN kayitlar k ON k.kod=i.konu WHERE i.silindi IS NULL AND k.silindi IS NULL AND ${kosul} ORDER BY k.ad, i.ad`, arg).map((r) => izOku(e, r));

// ---------- Yazma ----------
export function izOlustur(b: SureklilikBaglami, g: { konu: string; ad: string; model: IzModeli; birim?: string; sure?: number | null }) {
  const konu = kayitVar(b.e, g.konu);
  if (!MODELLER.includes(g.model)) throw new Error('Geçersiz izleme biçimi.');
  const kod = yeniKod();
  const sure = g.model === 'iyilesme' ? sureGecerli(g.sure) : null;
  if (g.model === 'iyilesme' && sure === null) throw new Error('İyileşme süresini gün olarak yazın.');
  b.yaz([{ tur: 'iz_olustur', veri: { kod, konu, ad: temizAd(g.ad, 120, false), model: g.model, birim: g.model === 'sayi' ? temizAd(g.birim, 30) : '', ...(sure ? { sure } : {}), konuAd: ad(b.e, konu) } }], [konu]);
  return { kod };
}

export function izDegistir(b: SureklilikBaglami, kod: string, g: { ad: string; birim?: string; sure?: number | null }) {
  const iz = izBul(b.e, kod);
  const tanim = { ad: temizAd(g.ad, 120, false), birim: iz.model === 'sayi' ? temizAd(g.birim, 30) : '', sure: iz.model === 'iyilesme' ? sureGecerli(g.sure) : null };
  if (iz.model === 'iyilesme' && tanim.sure === null) throw new Error('İyileşme süresini gün olarak yazın.');
  b.yaz([{ tur: 'iz_degistir', veri: { kod, konu: iz.konu.kod, tanim, onceki: { ad: iz.ad, birim: iz.birim, sure: iz.sure } } }], [iz.konu.kod]);
}

export function izSil(b: SureklilikBaglami, kod: string, geriYukle = false) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT * FROM izler WHERE kod=?', [kod]) : undefined;
  if (!r || (r.silindi === null) === geriYukle) throw new Error('İzlenen ayrıntı bulunamadı.');
  b.yaz([{ tur: geriYukle ? 'iz_geri_yukle' : 'iz_sil', veri: { kod, ad: r.ad, konu: r.konu } }], [r.konu as string]);
}

/** Sayılabilir kaynakta gözlem sayı olmalıdır; boş değer gözlemi kaldırır. */
export function izGozlem(b: SureklilikBaglami, g: { iz: string; sahne: string; an: 'bas' | 'son'; deger: string }) {
  const iz = izBul(b.e, g.iz);
  const sahne = kayitVar(b.e, g.sahne, 'sahne');
  if (g.an !== 'bas' && g.an !== 'son') throw new Error('Gözlem, sahnenin başına ya da sonuna yazılır.');
  let deger = temizAd(g.deger, 200);
  if (deger && iz.model === 'sayi') {
    const n = sayiOku(deger);
    if (!Number.isFinite(n)) throw new Error('Sayıyla izlenen bir ayrıntının durumunu sayı olarak yazın.');
    deger = String(n);
  }
  const onceki = (b.e.db.selectValue('SELECT deger FROM iz_gozlemleri WHERE iz=? AND sahne=? AND an=?', [iz.kod, sahne, g.an]) as string | undefined) ?? null;
  if ((onceki ?? '') === deger) return;
  b.yaz([{ tur: 'iz_gozlem', veri: { iz: iz.kod, sahne, an: g.an, deger, onceki, izAd: iz.ad, sahneAd: ad(b.e, sahne) } }], [iz.konu.kod, sahne]);
}

// ---------- Hesap ----------
interface Oge {
  adim: IzAdimi;
  /** Sıralama: grup zamanı, grup, aşama (0 baş, 1 değişim, 2 son), sıra. */
  zaman: number; grup: string; faz: number; sira: number;
  /** Sahnenin hesap noktası (gözlem değil): o andaki durum okunur. */
  isaret?: 'bas' | 'son';
}

function sahneTarihi(b: SureklilikBaglami, sahne: string): EvrenTarihi | null {
  const t = b.tarih(sahne);
  if (t?.eksen) return t;
  // Sahnenin kendi tarihi yoksa anlattığı en erken tarihli olay.
  const l = b.e.db.selectObjects(`SELECT i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.tur='anlatir' AND i.a=? AND i.silindi IS NULL AND k.silindi IS NULL`, [sahne])
    .map((r) => b.tarih(r.b as string)).filter((x): x is EvrenTarihi => !!x?.eksen).sort((x, y) => siraAnahtari(x) - siraAnahtari(y));
  return l[0] ?? t ?? null;
}

/** Bir olayı anlatan sahneler (silinmemiş). */
const anlatanlar = (e: EvrenVt, olay: string) => e.db.selectObjects(
  `SELECT i.a FROM iliskiler i JOIN kayitlar k ON k.kod=i.a WHERE i.tur='anlatir' AND i.b=? AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY i.olusturma`, [olay]).map((r) => r.a as string);

interface Ogeler { sirali: Oge[]; tarihsiz: Oge[] }

function ogeler(b: SureklilikBaglami, iz: IzTanimi, isaretSahne: string | null): Ogeler {
  const { e } = b;
  const st = new Map<string, EvrenTarihi | null>();
  const stOku = (s: string) => { if (!st.has(s)) st.set(s, sahneTarihi(b, s)); return st.get(s)!; };
  const sirali: Oge[] = [], tarihsiz: Oge[] = [];
  const ekle = (o: Oge) => (Number.isFinite(o.zaman) ? sirali : tarihsiz).push(o);
  let n = 0;
  for (const r of e.db.selectObjects(`SELECT g.* FROM iz_gozlemleri g JOIN kayitlar k ON k.kod=g.sahne WHERE g.iz=? AND k.silindi IS NULL`, [iz.kod])) {
    const sahne = r.sahne as string, t = stOku(sahne);
    ekle({ adim: { tur: 'gozlem', sahne: { kod: sahne, ad: ad(e, sahne) }, an: r.an as 'bas' | 'son', olay: null, degisim: null, deger: r.deger as string, miktar: null, tarih: t, hesap: null, uyusmaz: false },
      zaman: siraAnahtari(t), grup: sahne, faz: r.an === 'bas' ? 0 : 2, sira: n++ });
  }
  for (const r of e.db.selectObjects(`SELECT d.* FROM degisimler d JOIN kayitlar o ON o.kod=d.olay WHERE d.iz=? AND d.silindi IS NULL AND o.silindi IS NULL ORDER BY d.olusturma`, [iz.kod])) {
    const olay = r.olay as string;
    // Değişim olaya bağlıdır; sıradaki yeri onu anlatan sahnedir (kaydedildiği sahne önce), yoksa olayın tarihi.
    const sahneler = anlatanlar(e, olay);
    const girilen = r.sahne as string | null;
    const sahne = girilen && sahneler.includes(girilen) ? girilen : sahneler.find((s) => Number.isFinite(siraAnahtari(stOku(s)))) ?? sahneler[0] ?? null;
    const ot = b.tarih(olay);
    const t = sahne && Number.isFinite(siraAnahtari(stOku(sahne))) ? stOku(sahne) : ot;
    ekle({ adim: { tur: 'degisim', sahne: sahne ? { kod: sahne, ad: ad(e, sahne) } : null, an: null, olay: { kod: olay, ad: ad(e, olay) }, degisim: r.kod as string,
      deger: r.metin as string, miktar: r.miktar === null ? null : Number(r.miktar), tarih: ot ?? t, hesap: null, uyusmaz: false },
      zaman: siraAnahtari(t), grup: sahne ?? `o:${olay}`, faz: 1, sira: n++ });
  }
  if (isaretSahne) {
    const t = stOku(isaretSahne), z = siraAnahtari(t);
    const bos: IzAdimi = { tur: 'gozlem', sahne: null, an: null, olay: null, degisim: null, deger: '', miktar: null, tarih: t, hesap: null, uyusmaz: false };
    // İşaretler yalnızca sıralanabilen sahnede gerekir; tarihsiz sahne kendi içinde ayrıca hesaplanır.
    if (Number.isFinite(z)) {
      sirali.push({ adim: bos, zaman: z, grup: isaretSahne, faz: 0, sira: -1, isaret: 'bas' });
      sirali.push({ adim: bos, zaman: z, grup: isaretSahne, faz: 2, sira: -1, isaret: 'son' });
    }
  }
  sirali.sort((x, y) => x.zaman - y.zaman || (x.grup < y.grup ? -1 : x.grup > y.grup ? 1 : 0) || x.faz - y.faz || x.sira - y.sira);
  return { sirali, tarihsiz };
}

interface Durum {
  /** Sayılabilir kaynak: hesaplanan değer (null: bilinmiyor). */
  sayi: number | null; sayiBilinmiyor: string | null;
  /** Serbest durum: son gözlenen değer ve nerede. */
  sonGozlem: { deger: string; sahne: string; an: 'bas' | 'son' } | null; gozlemdenSonraDegisim: number;
  /** İyileşme: son başlangıç (değişim) ve tarihi. */
  baslangic: { olay: string; tarih: EvrenTarihi | null } | null;
}

/** Sıralı adımları yürütür; her işaretteki durum `okuma` ile alınır. */
function yurut(iz: IzTanimi, sirali: Oge[], okuma?: (o: Oge, d: Durum) => void) {
  const d: Durum = { sayi: null, sayiBilinmiyor: null, sonGozlem: null, gozlemdenSonraDegisim: 0, baslangic: null };
  for (const o of sirali) {
    if (o.isaret) { okuma?.(o, { ...d }); continue; }
    const a = o.adim;
    if (a.tur === 'gozlem') {
      if (iz.model === 'sayi') {
        const g = Number(a.deger);
        a.hesap = d.sayi;
        a.uyusmaz = d.sayi !== null && Number.isFinite(g) && Math.abs(d.sayi - g) > 1e-9;
        d.sayi = Number.isFinite(g) ? g : null; d.sayiBilinmiyor = null;
      }
      d.sonGozlem = { deger: a.deger, sahne: a.sahne!.kod, an: a.an! }; d.gozlemdenSonraDegisim = 0;
    } else {
      d.gozlemdenSonraDegisim++;
      if (iz.model === 'sayi') {
        if (a.miktar === null) { d.sayi = null; d.sayiBilinmiyor = 'miktarı yazılmamış bir değişim var'; }
        else if (d.sayi !== null) d.sayi += a.miktar;
        a.hesap = d.sayi;
      }
      if (iz.model === 'iyilesme') d.baslangic = { olay: a.olay!.ad, tarih: a.tarih };
    }
    okuma?.(o, d);
  }
  return d;
}

const sayiYaz = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('tr-TR', { maximumFractionDigits: 3 }));
const birimli = (iz: IzTanimi, n: number) => `${sayiYaz(n)}${iz.birim ? ` ${iz.birim}` : ''}`;

/** İki tarih arası geçen gün aralığı [en az, en çok]; eşlenemiyorsa null. En geç uç aralığın son parçasıdır, süre onun sonuna kadar sayılır. */
function gecenGun(a: EvrenTarihi | null, b: EvrenTarihi | null): [number, number] | null {
  const x = a?.eksen, y = b?.eksen;
  if (!x || !y || x.enErken === null || x.enGec === null || y.enErken === null || y.enGec === null) return null;
  return [Math.max(0, (y.enErken - x.enGec - 1) / GUN_PARCA), Math.max(0, (y.enGec + 1 - x.enErken) / GUN_PARCA)];
}

function iyilesmeYazisi(iz: IzTanimi, d: Durum, t: EvrenTarihi | null): { deger: string | null; dayanak: string | null } {
  if (!d.baslangic) return { deger: null, dayanak: null };
  const g = gecenGun(d.baslangic.tarih, t);
  const dayanak = `“${d.baslangic.olay}” olayından sonra, ${iz.sure} günlük iyileşme süresine göre`;
  if (!g) return { deger: 'İyileşme süresinin dolup dolmadığı tarihlerden çıkarılamıyor', dayanak };
  if (g[1] < iz.sure!) {
    const kalan = Math.ceil(iz.sure! - g[1]);
    return { deger: `İyileşme süresi dolmadı (en az ${kalan} gün daha)`, dayanak };
  }
  if (g[0] >= iz.sure!) return { deger: 'İyileşme süresi doldu', dayanak };
  return { deger: 'Tarihler kaba olduğu için iyileşme süresinin dolup dolmadığı belli değil', dayanak };
}

/** Bir kaydın izlenen ayrıntıları ve her birinin evren zamanındaki adımları. */
export function kayitIzleri(b: SureklilikBaglami, kod: string): IzGecmisi[] {
  const k = yonlendir(b.e.db, kod);
  return izler(b.e, 'i.konu=?', [k]).map((iz) => {
    const { sirali, tarihsiz } = ogeler(b, iz, null);
    yurut(iz, sirali);
    return { iz, adimlar: sirali.map((o) => o.adim), tarihsiz: tarihsiz.map((o) => o.adim) };
  });
}

/** Sahneyle ilgili kayıtlar: sahneye bağlananlar, sahnede bulunanlar, anlattığı olayların katılımcıları. */
function sahneninKayitlari(e: EvrenVt, sahne: string): Set<string> {
  const s = new Set<string>();
  for (const r of e.db.selectObjects('SELECT DISTINCT hedef k FROM baglantilar WHERE kaynak=?', [sahne])) s.add(r.k as string);
  for (const r of e.db.selectObjects(`SELECT a k FROM iliskiler WHERE tur='sahnede' AND b=? AND silindi IS NULL`, [sahne])) s.add(r.k as string);
  for (const r of e.db.selectObjects(`SELECT x.a k FROM iliskiler i JOIN iliskiler x ON x.b=i.b WHERE i.tur='anlatir' AND i.a=? AND i.silindi IS NULL AND x.tur='olayda' AND x.silindi IS NULL`, [sahne])) s.add(r.k as string);
  return s;
}

/** `ek`: yazarın bu sahnede izlemeye başladığı, henüz verisi olmayan ayrıntılar. */
export function sahneSurekliligi(b: SureklilikBaglami, sahne: string, ek: string[] = []): SahneSurekliligi {
  const { e } = b;
  kayitVar(e, sahne, 'sahne');
  const olaylar = new Set(e.db.selectObjects(`SELECT i.b FROM iliskiler i JOIN kayitlar k ON k.kod=i.b WHERE i.tur='anlatir' AND i.a=? AND i.silindi IS NULL AND k.silindi IS NULL`, [sahne]).map((r) => r.b as string));
  const ilgili = sahneninKayitlari(e, sahne);
  const hepsi = izler(e);
  const veriVar = new Set<string>([
    ...e.db.selectObjects('SELECT DISTINCT iz FROM iz_gozlemleri WHERE sahne=?', [sahne]).map((r) => r.iz as string),
    ...e.db.selectObjects(`SELECT DISTINCT iz FROM degisimler WHERE iz IS NOT NULL AND silindi IS NULL AND olay IN (${[...olaylar].map(() => '?').join(',') || "''"})`, [...olaylar]).map((r) => r.iz as string),
  ]);
  const st = sahneTarihi(b, sahne);
  const tarihli = Number.isFinite(siraAnahtari(st));
  const gosterilen = hepsi.filter((iz) => veriVar.has(iz.kod) || ilgili.has(iz.konu.kod) || ek.includes(iz.kod));
  const sonuc: SahneIzi[] = gosterilen.map((iz) => sahneIzi(b, iz, sahne, olaylar, st, tarihli));
  return { izler: sonuc, eklenebilir: hepsi.filter((iz) => !gosterilen.includes(iz)), tarihli };
}

function sahneIzi(b: SureklilikBaglami, iz: IzTanimi, sahne: string, olaylar: Set<string>, st: EvrenTarihi | null, tarihli: boolean): SahneIzi {
  const { e } = b;
  const g = (an: string) => (e.db.selectValue('SELECT deger FROM iz_gozlemleri WHERE iz=? AND sahne=? AND an=?', [iz.kod, sahne, an]) as string | undefined) ?? null;
  const basG = g('bas'), sonG = g('son');
  const degisimler = e.db.selectObjects(`SELECT d.*, o.ad oad FROM degisimler d JOIN kayitlar o ON o.kod=d.olay WHERE d.iz=? AND d.silindi IS NULL AND o.silindi IS NULL ORDER BY d.olusturma`, [iz.kod])
    .filter((r) => olaylar.has(r.olay as string))
    .map((r) => ({ kod: r.kod as string, olay: { kod: r.olay as string, ad: r.oad as string }, metin: r.metin as string, miktar: r.miktar === null ? null : Number(r.miktar), karar: r.karar as string }));
  const notlar: string[] = [];
  let basDurum: Durum | null = null, sonDurum: Durum | null = null;
  if (tarihli) {
    const { sirali } = ogeler(b, iz, sahne);
    yurut(iz, sirali, (o, d) => { if (o.isaret === 'bas' && o.grup === sahne) basDurum = { ...d }; if (o.isaret === 'son' && o.grup === sahne) sonDurum = { ...d }; });
  } else {
    // Tarihsiz sahne: önceki sahnelerle sıralanamaz; yalnızca kendi başı ve değişimleriyle hesaplanır.
    notlar.push('Sahnenin tarihi olmadığı için önceki sahnelerden gelen durum hesaplanamadı.');
    const d: Durum = { sayi: null, sayiBilinmiyor: null, sonGozlem: null, gozlemdenSonraDegisim: 0, baslangic: null };
    basDurum = { ...d };
    if (iz.model === 'sayi' && basG !== null) d.sayi = Number(basG);
    for (const x of degisimler) {
      if (iz.model === 'sayi') { if (x.miktar === null) { d.sayi = null; d.sayiBilinmiyor = 'miktarı yazılmamış bir değişim var'; } else if (d.sayi !== null) d.sayi += x.miktar; }
      if (iz.model === 'iyilesme') d.baslangic = { olay: x.olay.ad, tarih: b.tarih(x.olay.kod) };
      d.gozlemdenSonraDegisim++;
    }
    if (basG !== null) d.sonGozlem = { deger: basG, sahne, an: 'bas' };
    sonDurum = d;
  }
  const bd = basDurum as Durum | null, sd = sonDurum as Durum | null;
  let beklenen: string | null = null, dayanak: string | null = null, hesaplanan: string | null = null;
  if (iz.model === 'sayi') {
    if (bd && bd.sayi !== null) { beklenen = birimli(iz, bd.sayi); dayanak = 'Önceki gözlemlere ve kayıtlı değişimlere göre hesaplandı'; }
    if (sd && sd.sayi !== null) hesaplanan = birimli(iz, sd.sayi);
    else if (sd?.sayiBilinmiyor && (basG !== null || bd?.sayi !== null)) notlar.push(`Sondaki durum hesaplanamadı: ${sd.sayiBilinmiyor}.`);
    if (basG !== null && bd && bd.sayi !== null && Math.abs(bd.sayi - Number(basG)) > 1e-9)
      notlar.push(`Önceki sahnelerden hesaplanan ${birimli(iz, bd.sayi)}, burada başta gözlenen ${birimli(iz, Number(basG))}. İkisi de korunuyor. Hangisinin doğru olduğuna siz karar verirsiniz.`);
    if (sonG !== null && sd && sd.sayi !== null && Math.abs(sd.sayi - Number(sonG)) > 1e-9)
      notlar.push(`Hesaplanan ${birimli(iz, sd.sayi)}, sonda gözlenen ${birimli(iz, Number(sonG))}. İkisi de korunuyor. Arada kaydedilmemiş bir değişim ya da yanlış bir sayım olabilir.`);
  } else if (iz.model === 'durum') {
    if (bd?.sonGozlem) {
      beklenen = bd.sonGozlem.deger;
      dayanak = `“${ad(e, bd.sonGozlem.sahne)}” sahnesinin ${bd.sonGozlem.an === 'bas' ? 'başındaki' : 'sonundaki'} son gözlem${bd.gozlemdenSonraDegisim ? `; sonrasında ${bd.gozlemdenSonraDegisim} değişim kayıtlı` : ''}`;
    }
  } else {
    const x = bd ? iyilesmeYazisi(iz, bd, st) : { deger: null, dayanak: null };
    beklenen = x.deger; dayanak = x.dayanak;
    const y = sd ? iyilesmeYazisi(iz, sd, st) : { deger: null, dayanak: null };
    hesaplanan = y.deger;
  }
  let netFark: number | null = null;
  if (iz.model === 'sayi' && basG !== null && sonG !== null) {
    netFark = Number(sonG) - Number(basG);
    if (netFark !== 0) notlar.push(`Net fark ${netFark > 0 ? '+' : '−'}${sayiYaz(Math.abs(netFark))}. Bu yalnızca iki gözlem arasındaki farktır. Ne kadarının harcandığını, verildiğini ya da yanlış sayıldığını göstermez.`);
  }
  if (basG !== null && sonG !== null && basG !== sonG && !degisimler.length)
    notlar.push('Baştaki ve sondaki durum farklı, ama bu sahnede değişime yol açan bir olay kaydedilmedi. Aradaki eylem tahmin edilmez.');
  if (iz.model === 'durum' && basG !== null && bd?.sonGozlem && bd.sonGozlem.deger !== basG && !bd.gozlemdenSonraDegisim)
    notlar.push(`Önceki gözlem “${bd.sonGozlem.deger}”, burada başta “${basG}”. Arada kayıtlı bir değişim yok.`);
  return { iz, bas: { gozlenen: basG, beklenen, dayanak }, degisimler, son: { gozlenen: sonG, hesaplanan }, netFark, notlar };
}

/** Değişim izlenen ayrıntıya bağlanırsa konusu ayrıntının konusudur; sayılabilir kaynakta miktar sayıdır. */
export function degisimIzi(e: EvrenVt, iz: string | null | undefined, miktar: unknown): { iz: string; konu: string; miktar: number | null } | null {
  if (!iz) return null;
  const t = izBul(e, iz);
  let m: number | null = null;
  if (t.model === 'sayi' && miktar !== null && miktar !== undefined && miktar !== '') {
    m = Number(miktar);
    if (!Number.isFinite(m)) throw new Error('Değişim miktarını sayı olarak yazın (“-2” ya da “3”).');
  }
  return { iz: t.kod, konu: t.konu.kod, miktar: m };
}
