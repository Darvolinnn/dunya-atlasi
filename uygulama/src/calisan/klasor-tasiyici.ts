// Bu bilgisayardaki günlük yedekler (§10.10, K31): Windows uygulamasında Belgeler klasöründeki "Dünya Atlası
// yedekleri" klasörü. Drive'daki dönemsel yedekle aynı kurallar (DonemselYedek) bu klasörde çalışsın diye klasör,
// Drive taşıyıcısı gibi davranır. Klasöre yalnızca kabuk (src-tauri/src/yerel_yedek.rs) yazar; burada yalnız dosya adı,
// içerik ve dört istek vardır.
//
// Drive dosyaları özellik taşır, klasördeki dosyalar taşımaz. Yedeklerin özellikleri (evren, gün, değişiklik sayısı)
// klasördeki "yedek-listesi.json" dosyasında durur. Bu dosya yalnız hız içindir: silinir ya da bozulursa her yedeğin
// özellikleri kendi paket.json'undan yeniden okunur. Programın kendi aldığı günlük yedek olmayan dosyalar (kullanıcının
// bu klasöre koyduğu başka yedekler) listeye girmez, bu yüzden saklama süresi dolunca da silinmez.
import { zipAc } from '../alan/zip';
import { gunYaz, type YedekTasiyici } from './donemsel-yedek';
import type { UzakDosya } from './esitleme';

export type AltKlasor = '' | 'medya';
export interface YerelDosya { ad: string; boy: number }

/** Kabuğun yedek klasörü istekleri. Yerler yalnız klasörün kendisi ("") ve "medya"dır. */
export interface YerelKlasor {
  listele(alt: AltKlasor): Promise<YerelDosya[]>;
  oku(alt: AltKlasor, ad: string): Promise<Uint8Array>;
  /** Önce geçici dosyaya yazılır, sonra yerine konur: yarım dosya kalmaz. */
  yaz(alt: AltKlasor, ad: string, veri: Uint8Array): Promise<void>;
  /** Dosya yoksa hata değildir. */
  sil(alt: AltKlasor, ad: string): Promise<void>;
}

export const LISTE_DOSYASI = 'yedek-listesi.json';
const LISTE_BICIMI = 'dunya-atlasi-yedek-listesi';
const UYGULAMA = 'dunya-atlasi';
const MEDYA_ADI = /^[0-9a-f]{64}(\.onizleme)?$/;
const ANA = 'ana';
const MEDYA = 'medya';

/** Listede bir dosya: programın günlük yedeğiyse özellikleri, değilse null (dokunulmaz). Boy, dosyanın değişip değişmediğini söyler. */
interface Kayit { boy: number; ozellikler: Record<string, string> | null }

const cozumle = (id: string): [AltKlasor, string] => (id.startsWith(`${MEDYA}/`) ? [MEDYA, id.slice(MEDYA.length + 1)] : ['', id]);

export class KlasorTasiyici implements YedekTasiyici {
  private liste: Map<string, Kayit> | null = null;
  private adlar = new Set<string>();
  private sira: Promise<unknown> = Promise.resolve();
  /** Bu açılışta programın bu klasöre yazdığı yedekler. */
  private yazilanlar = new Set<string>();

  constructor(private readonly k: YerelKlasor) {}

  /** Klasörün listesini değiştiren işler sırayla yapılır (aynı anda iki yedek listeyi bozmasın). */
  private sirayla<T>(is: () => Promise<T>): Promise<T> {
    const p = this.sira.then(is, is);
    this.sira = p.catch(() => {});
    return p;
  }

  async klasor(_ad: string, ozellikler: Record<string, string>): Promise<string> {
    return ozellikler.tur === 'yedek-medya-klasoru' ? MEDYA : ANA;
  }

  /** Paketin kendisinden: programın bu klasöre aldığı günlük yedek mi, öyleyse özellikleri. */
  private async paketten(ad: string): Promise<Record<string, string> | null> {
    try {
      const arsiv = await zipAc(await this.k.oku('', ad));
      const p = JSON.parse(new TextDecoder().decode(await arsiv.oku('paket.json')));
      if (p?.bicim !== 'dunya-atlasi-paket' || p.donemsel !== 'yerel' || typeof p.evren?.kod !== 'string') return null;
      const zaman = Number(p.olusturma);
      if (!Number.isFinite(zaman) || zaman <= 0) return null;
      return { uygulama: UYGULAMA, tur: 'yedek', evren: p.evren.kod, gun: gunYaz(zaman), zaman: String(zaman),
        kurulum: String(p.kurulum?.kod ?? ''), ...(Number.isInteger(p.islemSayisi) ? { islem: String(p.islemSayisi) } : {}) };
    } catch { return null; }
  }

  /** Klasördeki gerçek dosyalarla liste dosyasını karşılaştırır; yeni ya da değişmiş dosyanın özellikleri paketten okunur. */
  private async guncelListe(): Promise<Map<string, Kayit>> {
    const dosyalar = await this.k.listele('');
    this.adlar = new Set(dosyalar.map((d) => d.ad));
    let onceki = this.liste;
    if (!onceki) {
      onceki = new Map();
      if (this.adlar.has(LISTE_DOSYASI)) {
        try {
          const j = JSON.parse(new TextDecoder().decode(await this.k.oku('', LISTE_DOSYASI)));
          if (j?.bicim === LISTE_BICIMI && j.dosyalar && typeof j.dosyalar === 'object') {
            for (const [ad, v] of Object.entries(j.dosyalar as Record<string, Kayit>)) {
              if (v && Number.isInteger(v.boy) && (v.ozellikler === null || typeof v.ozellikler === 'object')) onceki.set(ad, v);
            }
          }
        } catch { /* bozuk liste: yedekler paketlerinden yeniden okunur */ }
      }
    }
    const yeni = new Map<string, Kayit>();
    let degisti = !this.liste && !this.adlar.has(LISTE_DOSYASI);
    for (const d of dosyalar) {
      if (!/\.zip$/i.test(d.ad)) continue;
      const k = onceki.get(d.ad);
      if (k && k.boy === d.boy) { yeni.set(d.ad, k); continue; }
      yeni.set(d.ad, { boy: d.boy, ozellikler: await this.paketten(d.ad) });
      degisti = true;
    }
    if (yeni.size !== onceki.size) degisti = true;
    this.liste = yeni;
    if (degisti) await this.listeyiYaz();
    return yeni;
  }

  /** Liste dosyası yalnız hız içindir; yazılamasa da yedekler yerindedir (bir sonraki açılışta paketlerden okunur). */
  private async listeyiYaz() {
    if (!this.liste) return;
    const dosyalar: Record<string, Kayit> = {};
    for (const [ad, k] of [...this.liste].sort(([a], [b]) => a.localeCompare(b))) dosyalar[ad] = k;
    const metin = JSON.stringify({ bicim: LISTE_BICIMI, surum: 1, aciklama: 'Dünya Atlası bu klasördeki günlük yedekleri bu listeyle tanır. Silinirse yedeklerden yeniden kurulur.', dosyalar }, null, 1);
    try { await this.k.yaz('', LISTE_DOSYASI, new TextEncoder().encode(metin)); this.adlar.add(LISTE_DOSYASI); } catch { /* yukarıdaki not */ }
  }

  /** Aynı adlı dosya varsa (aynı gün ikinci yedek, aynı adlı iki evren) ada sayı eklenir; hiçbir dosyanın üzerine yazılmaz. */
  private bosAd(ad: string): string {
    if (!this.adlar.has(ad)) return ad;
    const m = /^(.*?)(\.zip)?$/i.exec(ad)!;
    for (let i = 2; ; i++) {
      const aday = `${m[1]} (${i})${m[2] ?? ''}`;
      if (!this.adlar.has(aday)) return aday;
    }
  }

  async listele(oz: Record<string, string>): Promise<UzakDosya[]> {
    if (oz.uygulama && oz.uygulama !== UYGULAMA) return [];
    if (oz.tur === 'yedek-medya') {
      return (await this.k.listele(MEDYA)).filter((d) => MEDYA_ADI.test(d.ad) && d.boy > 0)
        .map((d) => ({ id: `${MEDYA}/${d.ad}`, ad: d.ad, ozellikler: { uygulama: UYGULAMA, tur: 'yedek-medya', ad: d.ad } }));
    }
    if (oz.tur !== 'yedek') return [];
    return this.sirayla(async () => [...(await this.guncelListe())]
      .filter(([, k]) => k.ozellikler && Object.entries(oz).every(([a, v]) => k.ozellikler![a] === v))
      .map(([ad, k]) => ({ id: ad, ad, ozellikler: { ...k.ozellikler! } })));
  }

  async indir(id: string): Promise<Uint8Array> {
    const [alt, ad] = cozumle(id);
    return this.k.oku(alt, ad);
  }

  async yukle(ad: string, ozellikler: Record<string, string>, veri: Uint8Array, id?: string, ust?: string): Promise<UzakDosya> {
    if (ust === MEDYA || ozellikler.tur === 'yedek-medya') {
      if (!MEDYA_ADI.test(ad)) throw new Error('Görsel dosyasının adı geçersiz.');
      await this.k.yaz(MEDYA, ad, veri);
      return { id: `${MEDYA}/${ad}`, ad, ozellikler: { ...ozellikler } };
    }
    return this.sirayla(async () => {
      await this.guncelListe();
      const hedef = id ? cozumle(id)[1] : this.bosAd(ad);
      await this.k.yaz('', hedef, veri);
      this.adlar.add(hedef);
      this.yazilanlar.add(hedef);
      this.liste!.set(hedef, { boy: veri.byteLength, ozellikler: { ...ozellikler } });
      await this.listeyiYaz();
      return { id: hedef, ad: hedef, ozellikler: { ...ozellikler } };
    });
  }

  async sil(id: string): Promise<void> {
    const [alt, ad] = cozumle(id);
    if (alt === MEDYA) { await this.k.sil(alt, ad); return; }
    await this.sirayla(async () => {
      // Yalnız programın kendi günlük yedekleri silinir; başka dosyaya dokunulmaz.
      const liste = await this.guncelListe();
      const k = liste.get(ad);
      if (!k?.ozellikler) return;
      // Liste dosya değişti mi diye yalnız boya bakar; aynı ad ve boyda başka bir dosya konmuş olabilir. Bu açılışta
      // yazılmamış bir yedek silinmeden önce kendi paketinden yeniden tanınır; tanınmazsa dokunulmaz.
      if (!this.yazilanlar.has(ad)) {
        const simdi = await this.paketten(ad);
        if (!simdi || simdi.evren !== k.ozellikler.evren || simdi.zaman !== k.ozellikler.zaman) {
          liste.set(ad, { boy: k.boy, ozellikler: simdi });
          await this.listeyiYaz();
          return;
        }
      }
      await this.k.sil('', ad);
      liste.delete(ad);
      this.adlar.delete(ad);
      this.yazilanlar.delete(ad);
      await this.listeyiYaz();
    });
  }
}

/** Bellekte sahte klasör: sınamalarda kabuğun yerine geçer. */
export class BellekKlasor implements YerelKlasor {
  readonly dosyalar = new Map<string, Uint8Array>();
  /** Sınamalar bir işi bozabilsin diye: verilirse her istekten önce çağrılır. */
  engel: ((istek: string, alt: AltKlasor, ad?: string) => void) | null = null;
  private yol = (alt: AltKlasor, ad: string) => (alt ? `${alt}/${ad}` : ad);
  async listele(alt: AltKlasor) {
    this.engel?.('listele', alt);
    return [...this.dosyalar].filter(([y]) => (alt ? y.startsWith(`${alt}/`) : !y.includes('/')))
      .map(([y, v]) => ({ ad: alt ? y.slice(alt.length + 1) : y, boy: v.byteLength })).sort((a, b) => a.ad.localeCompare(b.ad));
  }
  async oku(alt: AltKlasor, ad: string) {
    this.engel?.('oku', alt, ad);
    const v = this.dosyalar.get(this.yol(alt, ad));
    if (!v) throw new Error('Yedek dosyası okunamadı: dosya bulunamadı.');
    return v.slice();
  }
  async yaz(alt: AltKlasor, ad: string, veri: Uint8Array) { this.engel?.('yaz', alt, ad); this.dosyalar.set(this.yol(alt, ad), veri.slice()); }
  async sil(alt: AltKlasor, ad: string) { this.engel?.('sil', alt, ad); this.dosyalar.delete(this.yol(alt, ad)); }
}
