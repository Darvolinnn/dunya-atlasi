// Drive eşitlemesi (§10). Taşıyıcıdan bağımsızdır: Drive ile de, sınamada bellekteki sahte depo ile de çalışır.
//
// Uzak depodaki dosyalar (hepsi Drive'ın uygulama klasöründe, kullanıcıya görünmez; TK4):
// - parça:    bir kurulumun art arda işlemleri (ilk–son sıra). Yüklendikten sonra değişmez (K15).
// - görüntü:  evrenin bütün işlemleri; hangi işlemlere kadar olduğunu söyler. Yeni kurulum önce bunu indirir.
// - kurulum:  her kurulumun kendi durum dosyası: adı, son görülme, bu evrende neye kadar aldığı.
// - medya:    içerikle adlandırılmış görseller (§10.12).
// Deneme kopyaları (§9.7) aynı düzenle, kendi kodlarıyla eşitlenir; dosyalarında `ana` özelliği bağlı oldukları
// evreni gösterir. Bir deneme kopyası, ana evreni eşitlenirken ardından eşitlenir.
// Her kurulum yalnızca kendi dosyalarını yazar ve siler; başkasının dosyasına dokunmaz (§10.2).
import { VERI_BICIMI, type Islem } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { islemSatiri, jsonAc, jsonPaketle, satirdanIslem } from '../alan/paket';
import type { EvrenVt } from './evren-vt';
import type { KurulumVt } from './kurulum-vt';
import { icerikAdi, onizlemeAdi, type MedyaDeposu } from './medya';

export const PROTOKOL = 1;
const UYGULAMA = 'dunya-atlasi';
/** Bir kurulumun kaç parçasından sonra yeni anlık görüntü yazılır. */
export const GORUNTU_ARALIGI = 40;

export interface UzakDosya { id: string; ad: string; ozellikler: Record<string, string> }

/** Uzak depo (Drive uygulama klasörü). Dosyalar özelliklerle bulunur. */
export interface Tasiyici {
  listele(ozellikler: Record<string, string>): Promise<UzakDosya[]>;
  indir(id: string): Promise<Uint8Array>;
  /** id verilirse o dosyanın içeriğini değiştirir, yoksa yeni dosya oluşturur. */
  yukle(ad: string, ozellikler: Record<string, string>, veri: Uint8Array, id?: string): Promise<UzakDosya>;
  sil(id: string): Promise<void>;
}

/** Google izni yok ya da süresi doldu: yazma sürer, kullanıcı dokununca yenilenir (§10.8, TK3). */
export class IzinHatasi extends Error {}

/** Eşitlemenin hizmetten istediği erişim. */
export interface EsitlemeErisimi {
  kurulum: KurulumVt;
  medya: MedyaDeposu | null;
  evrenVt(kod: string): EvrenVt;
  evrenler(): { kod: string; ad: string }[];
  islemleriAl(evren: string, islemler: Islem[]): { alinan: number; bekleyen: number };
  evreniDisaridanKur(kod: string, islemler: Islem[]): void;
  /**
   * Evrenin silinmemiş deneme kopyaları: açıldıkları andaki görülenler (`gordu`) ve bu cihazda bulunup bulunmadığı.
   * Bu cihazda olmayan bir kopya ancak Drive'da dosyası varsa kurulur.
   */
  dallar(evren: string): { kod: string; gordu: Record<string, number>; yerel: boolean }[];
}

interface KurulumDosyasi {
  protokol: number; veriBicimi: number; kod: string; ad: string; sonGorulme: number;
  evren: string; evrenAdi: string;
  /** Bu kurulumun bu evrende aldığı işlemler: kurulum → son sıra. */
  aldigi: Record<string, number>;
  /** Bu kurulumun "artık kullanılmıyor" diye işaretlediği kurulumlar (§10.5). */
  kullanimDisi: string[];
  /** Bu kurulumda bu evrende kalınan yer (§5.9); öbür cihazlar en yenisini gösterir. */
  kaldigi?: { zaman: number } & Record<string, unknown>;
}
interface IslemDosyasi { protokol: number; veriBicimi: number; evren: string; kurulum: string; gorulen?: Record<string, number>; islemler: Record<string, unknown>[] }

export interface CihazDurumu { kod: string; ad: string; sonGorulme: number; kullanimDisi: boolean; bekleyen: number; buCihaz: boolean }
export interface EvrenEsitlemeDurumu {
  kod: string; ad: string; esitlenir: boolean; sonEsitleme: number | null;
  /** Bu cihazda yapılıp henüz Drive'a gönderilmemiş değişiklik sayısı (§10.8). */
  yalnizBuCihazda: number;
  /** Gördüğü bir işlem henüz gelmediği için bekleyen değişiklikler. */
  bekleyen: number;
  /** Daha yeni bir program sürümüyle yazılmış, bu sürümün okuyamadığı dosya var. */
  guncellemeGerekli: boolean;
  cihazlar: CihazDurumu[];
}

const ozellikYap = (evren: string, tur: string, ek: Record<string, string> = {}) => ({ uygulama: UYGULAMA, evren, tur, ...ek });

export class Esitleme {
  constructor(private readonly x: EsitlemeErisimi, private readonly tasiyici: Tasiyici | null) {}

  private get t(): Tasiyici {
    if (!this.tasiyici) throw new IzinHatasi('Google Drive\'a bağlı değil.');
    return this.tasiyici;
  }

  private get kurulum() { return this.x.kurulum; }
  private ayar(k: string) { return this.kurulum.ayar(k); }

  esitlenirMi(evren: string) { return this.ayar(`esitle:${evren}`) !== '0'; }
  gonderilen(evren: string) { return Number(this.ayar(`gonderilen:${evren}`) ?? 0); }

  /** Drive'da olup bu cihazda olmayan evrenler (kurulum dosyalarından bulunur). */
  async uzakEvrenler(): Promise<{ kod: string; ad: string; sonGorulme: number }[]> {
    const yerel = new Set(this.x.evrenler().map((e) => e.kod));
    const sonuc = new Map<string, { kod: string; ad: string; sonGorulme: number }>();
    for (const d of await this.t.listele({ uygulama: UYGULAMA, tur: 'kurulum' })) {
      const evren = d.ozellikler.evren;
      if (!kodGecerliMi(evren) || yerel.has(evren) || d.ozellikler.ana) continue; // deneme kopyası ayrı bir evren değildir
      const zaman = Number(d.ozellikler.zaman) || 0;
      const onceki = sonuc.get(evren);
      if (!onceki || onceki.sonGorulme < zaman) sonuc.set(evren, { kod: evren, ad: d.ozellikler.evrenAdi || 'Adsız evren', sonGorulme: zaman });
    }
    return [...sonuc.values()];
  }

  /** Drive'daki bir evreni bu cihaza indirir. */
  async evreniIndir(evren: string) {
    if (!kodGecerliMi(evren)) throw new Error('Geçersiz evren kodu.');
    const dosyalar = await this.t.listele({ uygulama: UYGULAMA, evren });
    const islemler = await this.uzakIslemler(dosyalar, {});
    if (!islemler.length) throw new Error('Bu evrenin Drive\'da okunabilir değişikliği yok.');
    this.x.evreniDisaridanKur(evren, islemler);
    this.kurulum.ayarYaz(`esitle:${evren}`, '1');
    await this.evreniEsitle(evren);
  }

  /** Görülenlerden sonraki işlemleri uzak dosyalardan toplar; gerekirse önce anlık görüntüyü kullanır. */
  private async uzakIslemler(dosyalar: UzakDosya[], gorulen: Record<string, number>): Promise<Islem[]> {
    const parcalar = dosyalar.filter((d) => d.ozellikler.tur === 'parca' && kodGecerliMi(d.ozellikler.kurulum))
      .map((d) => ({ d, kurulum: d.ozellikler.kurulum, ilk: Number(d.ozellikler.ilk), son: Number(d.ozellikler.son) }))
      .filter((p) => Number.isInteger(p.ilk) && Number.isInteger(p.son) && p.son >= p.ilk);
    const islemler: Islem[] = [];
    const elde = { ...gorulen };
    // Parçalar bir kurulum için baştan art arda gelmiyorsa (eski parçalar temizlenmiş) görüntü gerekir.
    const bosluk = (g: Record<string, number>) => {
      const kurulumlar = new Set(parcalar.map((p) => p.kurulum));
      for (const k of kurulumlar) {
        let son = g[k] ?? 0;
        for (const p of parcalar.filter((x) => x.kurulum === k).sort((a, b) => a.ilk - b.ilk)) {
          if (p.son <= son) continue;
          if (p.ilk > son + 1) return true;
          son = p.son;
        }
      }
      return false;
    };
    // Parçaların ulaşamadığı işlemleri bir görüntü kapsıyorsa (ör. parçası hiç yüklenmemiş bir yazarın işlemleri) görüntü gerekir.
    const eksikKapsam = () => {
      const k = this.goruntuKapsami(dosyalar);
      const ulasilan = { ...elde };
      for (const p of [...parcalar].sort((a, b) => a.ilk - b.ilk)) if (p.ilk <= (ulasilan[p.kurulum] ?? 0) + 1) ulasilan[p.kurulum] = Math.max(ulasilan[p.kurulum] ?? 0, p.son);
      return Object.entries(k).some(([x, s]) => (ulasilan[x] ?? 0) < s);
    };
    if (bosluk(elde) || !Object.keys(elde).length || eksikKapsam()) {
      const goruntu = dosyalar.filter((d) => d.ozellikler.tur === 'goruntu').sort((a, b) => Number(b.ozellikler.zaman) - Number(a.ozellikler.zaman))[0];
      if (goruntu) {
        const g = await this.dosyaOku(goruntu);
        for (const i of g.islemler) {
          if ((elde[i.kurulum] ?? 0) >= i.sira) continue;
          islemler.push(i);
        }
        for (const [k, s] of Object.entries(g.gorulen ?? {})) elde[k] = Math.max(elde[k] ?? 0, s);
      }
    }
    for (const p of parcalar.sort((a, b) => a.kurulum.localeCompare(b.kurulum) || a.ilk - b.ilk)) {
      if (p.son <= (elde[p.kurulum] ?? 0)) continue;
      const dosya = await this.dosyaOku(p.d);
      islemler.push(...dosya.islemler.filter((i) => i.sira > (elde[p.kurulum] ?? 0)));
    }
    return islemler;
  }

  private async dosyaOku(d: UzakDosya): Promise<{ islemler: Islem[]; gorulen?: Record<string, number> }> {
    const x = await jsonAc<IslemDosyasi>(await this.t.indir(d.id));
    if (x.protokol > PROTOKOL || x.veriBicimi > VERI_BICIMI) throw new GuncellemeGerekli();
    return { islemler: x.islemler.map(satirdanIslem), gorulen: x.gorulen };
  }

  /** Bir evreni eşitler: önce alır, sonra gönderir; görseller, görüntü, kurulum dosyası ve temizlik. */
  async evreniEsitle(evren: string): Promise<void> {
    if (!this.esitlenirMi(evren)) return;
    await this.birimEsitle(evren, null);
    // Deneme kopyaları: bu cihazda olanlar ya da Drive'da dosyası olanlar.
    for (const d of this.x.dallar(evren)) {
      if (!d.yerel && !(await this.t.listele({ uygulama: UYGULAMA, evren: d.kod })).length) continue;
      // Kopyanın açıldığı andaki işlemler ana evrenle birlikte zaten gider; gönderilecekler ondan sonrakilerdir.
      const ben = this.kurulum.kod;
      if (this.ayar(`gonderilen:${d.kod}`) === undefined) this.kurulum.ayarYaz(`gonderilen:${d.kod}`, String(d.gordu[ben] ?? 0));
      await this.birimEsitle(d.kod, evren);
    }
  }

  /** Bir evreni ya da deneme kopyasını (`ana` verilirse) eşitler. */
  private async birimEsitle(evren: string, ana: string | null): Promise<void> {
    const e = this.x.evrenVt(evren);
    const ben = this.kurulum.kod;
    const ozellik = (kod: string, tur: string, ek: Record<string, string> = {}) => ozellikYap(kod, tur, ana ? { ...ek, ana } : ek);
    let dosyalar = await this.t.listele({ uygulama: UYGULAMA, evren });

    // 1. Al.
    let guncellemeGerekli = false;
    try {
      const gelen = await this.uzakIslemler(dosyalar.filter((d) => d.ozellikler.kurulum !== ben || d.ozellikler.tur === 'goruntu'), e.gorulenler());
      if (gelen.length) this.x.islemleriAl(evren, gelen);
    } catch (err) {
      if (!(err instanceof GuncellemeGerekli)) throw err;
      guncellemeGerekli = true;
    }
    this.kurulum.ayarYaz(`guncelleme:${evren}`, guncellemeGerekli ? '1' : '0');

    // 2. Gönder: bu kurulumun gönderilmemiş işlemleri tek parça olarak (bir işlem grubu bölünmez, §10.4).
    const kendiParcalari = dosyalar.filter((d) => d.ozellikler.tur === 'parca' && d.ozellikler.kurulum === ben);
    let gonderilen = Math.max(this.gonderilen(evren), ...kendiParcalari.map((d) => Number(d.ozellikler.son) || 0));
    const gorulen = e.gorulenler();
    if ((gorulen[ben] ?? 0) > gonderilen) {
      const islemler = e.gorulmeyenler({ [ben]: gonderilen }, ben);
      const ilk = islemler[0].sira, son = islemler[islemler.length - 1].sira;
      const veri = await jsonPaketle({ protokol: PROTOKOL, veriBicimi: VERI_BICIMI, evren, kurulum: ben, islemler: islemler.map(islemSatiri) } satisfies IslemDosyasi);
      const d = await this.t.yukle(`${UYGULAMA}-${evren}-parca-${ben}-${ilk}-${son}`, ozellik(evren, 'parca', { kurulum: ben, ilk: String(ilk), son: String(son) }), veri);
      dosyalar = [...dosyalar, d];
      gonderilen = son;
    }
    this.kurulum.ayarYaz(`gonderilen:${evren}`, String(gonderilen));

    // 3. Görseller: eksik olanlar iki yönde (Windows ve tablette hepsi indirilir, §10.12).
    await this.medyaEsitle(evren, e, dosyalar, ozellik);

    // 4. Kurulum dosyaları: öbür cihazların adları ve neye kadar aldıkları.
    const kurulumDosyalari = await this.kurulumDosyalari(dosyalar);
    const kullanimDisi = new Set(kurulumDosyalari.flatMap((k) => k.kullanimDisi));
    for (const k of this.kullanimDisiListesi()) kullanimDisi.add(k);
    for (const k of kurulumDosyalari) if (k.kod !== ben) this.kurulum.kurulumKaydet(k.kod, k.ad, k.sonGorulme);
    this.kaldigiYeriAl(evren, kurulumDosyalari.filter((k) => k.kod !== ben));
    const simdi = Date.now();
    let kaldigi: KurulumDosyasi['kaldigi'];
    try { kaldigi = JSON.parse(this.ayar(`kaldigi:${evren}`) ?? 'null') ?? undefined; } catch { kaldigi = undefined; }
    const benim: KurulumDosyasi = {
      protokol: PROTOKOL, veriBicimi: VERI_BICIMI, kod: ben, ad: this.kurulum.ad, sonGorulme: simdi, evren,
      evrenAdi: (e.db.selectValue("SELECT v FROM evren WHERE k='ad'") as string) ?? '', aldigi: e.gorulenler(),
      kullanimDisi: this.kullanimDisiListesi(), kaldigi,
    };
    const eskiBenim = dosyalar.find((d) => d.ozellikler.tur === 'kurulum' && d.ozellikler.kurulum === ben);
    await this.t.yukle(`${UYGULAMA}-${evren}-kurulum-${ben}`, ozellik(evren, 'kurulum', { kurulum: ben, zaman: String(simdi), evrenAdi: benim.evrenAdi.slice(0, 100) }),
      await jsonPaketle(benim), eskiBenim?.id);
    this.kurulum.ayarYaz(`cihazlar:${evren}`, JSON.stringify([...kurulumDosyalari.filter((k) => k.kod !== ben), benim]
      .map((k) => ({ kod: k.kod, ad: k.ad, sonGorulme: k.sonGorulme, aldigi: k.aldigi }))));

    // 5. Anlık görüntü: Drive'da olmayan başka kurulum işlemleri varsa (ör. yedekten gelen evren) ya da bu
    // kurulumun son görüntüden beri çok parçası olduysa.
    const goruntuler = dosyalar.filter((d) => d.ozellikler.tur === 'goruntu');
    const kapsama = this.kapsama(dosyalar);
    const tum = e.gorulenler();
    const eksikVar = Object.entries(tum).some(([k, s]) => (kapsama[k] ?? 0) < s);
    const kendiGoruntum = goruntuler.filter((d) => d.ozellikler.kurulum === ben);
    const sonGoruntuSirasi = Math.max(0, ...kendiGoruntum.map((d) => Number(d.ozellikler[`s_${ben}`]) || 0));
    const yeniParca = kendiParcalari.filter((d) => Number(d.ozellikler.ilk) > sonGoruntuSirasi).length;
    let yeniGoruntu: UzakDosya | null = null;
    if (eksikVar || yeniParca >= GORUNTU_ARALIGI) {
      const islemler = e.islemler();
      const veri = await jsonPaketle({ protokol: PROTOKOL, veriBicimi: VERI_BICIMI, evren, kurulum: ben, gorulen: tum, islemler: islemler.map(islemSatiri) } satisfies IslemDosyasi);
      yeniGoruntu = await this.t.yukle(`${UYGULAMA}-${evren}-goruntu-${ben}-${simdi}`,
        ozellik(evren, 'goruntu', { kurulum: ben, zaman: String(simdi), ...Object.fromEntries(Object.entries(tum).slice(0, 24).map(([k, s]) => [`s_${k}`, String(s)])) }), veri);
      for (const d of kendiGoruntum) await this.t.sil(d.id); // yalnızca kendi eski görüntülerimi
      dosyalar = [...dosyalar.filter((d) => !kendiGoruntum.includes(d)), yeniGoruntu];
    }

    // 6. Temizlik (§10.2): kendi parçalarımdan, bütün etkin kurulumların aldığı ve bir görüntünün kapsadığı
    // olanlar silinir. Kullanım dışı kurulumlar beklenmez (§10.5).
    const etkin = [...kurulumDosyalari.filter((k) => k.kod !== ben), benim].filter((k) => !kullanimDisi.has(k.kod));
    const goruntuKapsami = this.goruntuKapsami(dosyalar);
    for (const d of kendiParcalari) {
      const son = Number(d.ozellikler.son);
      if ((goruntuKapsami[ben] ?? 0) < son) continue;
      if (!etkin.every((k) => (k.aldigi[ben] ?? 0) >= son)) continue;
      await this.t.sil(d.id);
    }
    this.kurulum.ayarYaz(`son_esitleme:${evren}`, String(Date.now()));
  }

  /** Uzak depodaki parça ve görüntülerin kapsadığı işlemler: kurulum → son sıra. */
  private kapsama(dosyalar: UzakDosya[]) {
    const k = this.goruntuKapsami(dosyalar);
    const parcalar = dosyalar.filter((d) => d.ozellikler.tur === 'parca')
      .map((d) => ({ kurulum: d.ozellikler.kurulum, ilk: Number(d.ozellikler.ilk), son: Number(d.ozellikler.son) })).sort((a, b) => a.ilk - b.ilk);
    for (const p of parcalar) if (p.ilk <= (k[p.kurulum] ?? 0) + 1) k[p.kurulum] = Math.max(k[p.kurulum] ?? 0, p.son);
    return k;
  }
  private goruntuKapsami(dosyalar: UzakDosya[]) {
    const k: Record<string, number> = {};
    for (const d of dosyalar.filter((x) => x.ozellikler.tur === 'goruntu')) {
      // Görüntünün kapsadığı işlemler özelliklerinde yazılıdır: s_<kurulum> = son sıra.
      for (const [a, v] of Object.entries(d.ozellikler)) {
        if (a.startsWith('s_') && kodGecerliMi(a.slice(2)) && Number.isInteger(Number(v))) k[a.slice(2)] = Math.max(k[a.slice(2)] ?? 0, Number(v));
      }
    }
    return k;
  }

  private async kurulumDosyalari(dosyalar: UzakDosya[]): Promise<KurulumDosyasi[]> {
    const sonuc: KurulumDosyasi[] = [];
    for (const d of dosyalar.filter((x) => x.ozellikler.tur === 'kurulum' && kodGecerliMi(x.ozellikler.kurulum))) {
      try {
        const k = await jsonAc<KurulumDosyasi>(await this.t.indir(d.id));
        if (k.kod === d.ozellikler.kurulum) sonuc.push({ ...k, ad: String(k.ad).slice(0, 100), kullanimDisi: Array.isArray(k.kullanimDisi) ? k.kullanimDisi : [] });
      } catch { /* okunamayan durum dosyası atlanır */ }
    }
    return sonuc;
  }

  private async medyaEsitle(evren: string, e: EvrenVt, dosyalar: UzakDosya[], ozellik: typeof ozellikYap) {
    const depo = this.x.medya;
    if (!depo) return;
    const uzak = new Map(dosyalar.filter((d) => d.ozellikler.tur === 'medya').map((d) => [d.ozellikler.ad, d]));
    const adlar = (e.db.selectObjects('SELECT ad FROM medya') as { ad: string }[]).map((r) => r.ad);
    for (const ad of adlar) {
      for (const dosya of [ad, onizlemeAdi(ad)]) {
        const yerelde = await depo.var(dosya);
        const d = uzak.get(dosya);
        if (yerelde && !d) {
          const veri = await depo.oku(dosya);
          if (veri) await this.t.yukle(`${UYGULAMA}-${evren}-medya-${dosya}`, ozellik(evren, 'medya', { ad: dosya }), veri);
        } else if (!yerelde && d) {
          const veri = await this.t.indir(d.id);
          // İçerikle adlandırıldığı için bozuk ya da değiştirilmiş görsel kabul edilmez.
          if (dosya === ad && (await icerikAdi(veri)) !== ad) continue;
          await depo.yaz(dosya, veri);
        }
      }
    }
  }

  /** Öbür cihazlarda kalınan yerlerin en yenisi saklanır; bu cihazdakinden yeniyse Masa'da o gösterilir. */
  private kaldigiYeriAl(evren: string, digerleri: KurulumDosyasi[]) {
    let mevcut = 0;
    try { mevcut = Number(JSON.parse(this.ayar(`kaldigi_uzak:${evren}`) ?? 'null')?.zaman) || 0; } catch { /* yok */ }
    for (const k of digerleri) {
      const y = k.kaldigi;
      if (!y || typeof y !== 'object' || !(Number(y.zaman) > mevcut)) continue;
      mevcut = Number(y.zaman);
      this.kurulum.ayarYaz(`kaldigi_uzak:${evren}`, JSON.stringify({ ...y, cihaz: k.kod }));
    }
  }

  private kullanimDisiListesi(): string[] {
    try { return JSON.parse(this.ayar('kullanim_disi') ?? '[]'); } catch { return []; }
  }
  kullanimDisiIsaretle(kod: string, disi: boolean) {
    const l = new Set(this.kullanimDisiListesi());
    if (disi) l.add(kod); else l.delete(kod);
    this.kurulum.ayarYaz('kullanim_disi', JSON.stringify([...l]));
  }

  /** Görünen eşitleme durumu (§10.8). */
  durum(evren: string, ad: string): EvrenEsitlemeDurumu {
    const ben = this.kurulum.kod;
    const e = this.x.evrenVt(evren);
    const gorulen = e.gorulenler();
    const gonderilen = this.gonderilen(evren);
    let cihazlar: { kod: string; ad: string; sonGorulme: number; aldigi: Record<string, number> }[] = [];
    try { cihazlar = JSON.parse(this.ayar(`cihazlar:${evren}`) ?? '[]'); } catch { /* yok */ }
    const disi = new Set(this.kullanimDisiListesi());
    const sonEsitleme = this.ayar(`son_esitleme:${evren}`);
    return {
      kod: evren, ad, esitlenir: this.esitlenirMi(evren), sonEsitleme: sonEsitleme ? Number(sonEsitleme) : null,
      yalnizBuCihazda: Math.max(0, (gorulen[ben] ?? 0) - gonderilen), bekleyen: e.bekleyenSayisi(),
      guncellemeGerekli: this.ayar(`guncelleme:${evren}`) === '1',
      cihazlar: cihazlar.map((c) => ({
        kod: c.kod, ad: c.kod === ben ? this.kurulum.ad : (this.kurulum.kurulumAdi(c.kod) ?? c.ad), sonGorulme: c.sonGorulme, kullanimDisi: disi.has(c.kod), buCihaz: c.kod === ben,
        // Bu cihazın gönderdiği değişikliklerden o cihazın henüz almadıkları.
        bekleyen: c.kod === ben ? 0 : Math.max(0, gonderilen - (c.aldigi[ben] ?? 0)),
      })),
    };
  }
}

export class GuncellemeGerekli extends Error {
  constructor() { super('Bu evrenin bazı değişiklikleri programın daha yeni bir sürümüyle yazılmış. Veriler korundu, güncelleme bekliyor.'); }
}
