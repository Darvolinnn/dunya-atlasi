// İsteklerin karşılandığı yer. Dosya açma dışarıdan verilir: tarayıcıda SAH havuzu, sınamada bellek.
// Automerge WASM'ı bu sınıf kurulmadan önce hazırlanmış olmalıdır.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { IslemGirdisi } from '../alan/islem';
import { A } from '../alan/automerge';
import { baglantilar, spanAyari } from '../alan/metin-sema';
import { katla, kelimeler, turkceKarsilastir } from '../alan/turkce';
import { adDegistir, kokAdaylari } from '../alan/turkce-ek';
import { kararGecerli, turGecerli } from '../alan/turler';
import type { AdDuzeltmesi, AramaSonucu, Basliklar, BaglananKayit, DegisebilirAlan, Istekler, Kayit, KayitOzeti, Spans } from '../veri/api';
import { EvrenVt } from './evren-vt';
import { KurulumVt } from './kurulum-vt';
import { metinBelgesi } from './izdusum';

export type DosyaAcici = (ad: string) => Database;
export type Bildirici = (evren: string, turler: string[], kayitlar: string[]) => void;

const temizle = (deger: unknown, { bos = false, uzunluk = 200 } = {}) => {
  const s = String(deger ?? '').replace(/\s+/g, ' ').trim();
  if (!s && !bos) throw new Error('Ad boş olamaz.');
  if (s.length > uzunluk) throw new Error('Metin çok uzun.');
  return s;
};
/** Automerge aktör kodu: kurulum kodunun baytları (onaltılık). */
const aktor = (kurulum: string) => [...new TextEncoder().encode(kurulum)].map((b) => b.toString(16).padStart(2, '0')).join('');
const METIN_ALANLARI = new Set(['govde']);

export class Hizmet implements Istekler {
  private readonly kurulum: KurulumVt;
  private readonly acik = new Map<string, EvrenVt>();
  private readonly aktor: string;

  constructor(private readonly ac: DosyaAcici, varsayilanKurulumAdi: string, private readonly sqliteSurumu: string,
    private readonly bildir: Bildirici = () => {}) {
    this.kurulum = new KurulumVt(ac('/kurulum.db'), varsayilanKurulumAdi);
    this.aktor = aktor(this.kurulum.kod);
  }

  private evren(kod: string): EvrenVt {
    if (!kodGecerliMi(kod)) throw new Error('Geçersiz evren kodu.');
    let e = this.acik.get(kod);
    if (!e) {
      if (!this.kurulum.evrenler().some((x) => x.kod === kod)) throw new Error('Bu evren bu cihazda yok.');
      e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
      this.acik.set(kod, e);
    }
    return e;
  }

  /** İşlemleri yazar ve arayüze bildirir. */
  private yaz(evren: string, girdiler: IslemGirdisi[], kayitlar: string[] = []) {
    const yazilan = this.evren(evren).islemYap(girdiler);
    this.bildir(evren, [...new Set(yazilan.map((i) => i.tur))], kayitlar);
    return yazilan;
  }

  private kayitVarMi(e: EvrenVt, kod: string) {
    if (!kodGecerliMi(kod) || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kod]) === undefined) throw new Error('Kayıt bulunamadı.');
  }

  // ---------- Evrenler ----------
  baslat() { return { kod: this.kurulum.kod, ad: this.kurulum.ad, sqlite: this.sqliteSurumu }; }
  evrenler() { return this.kurulum.evrenler(); }

  evrenOlustur({ ad }: { ad: string }) {
    const temiz = temizle(ad);
    const kod = yeniKod();
    const e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
    const [islem] = e.islemYap([{ tur: 'evren_olustur', veri: { kod, ad: temiz } }]);
    this.kurulum.evrenEkle(kod, temiz, islem.zaman);
    this.acik.set(kod, e);
    return { kod };
  }

  evrenAdlandir({ evren, ad }: { evren: string; ad: string }) {
    const temiz = temizle(ad);
    this.yaz(evren, [{ tur: 'evren_adlandir', veri: { ad: temiz } }]);
    this.kurulum.evrenAdi(evren, temiz);
  }

  evrenBilgisi({ evren }: { evren: string }) {
    const e = this.evren(evren);
    const oz = this.kurulum.evrenler().find((x) => x.kod === evren)!;
    this.kurulum.acildi(evren);
    const ad = e.db.selectValue("SELECT v FROM evren WHERE k='ad'") as string | undefined;
    return {
      ...oz, ad: ad ?? oz.ad, islemSayisi: e.islemSayisi(),
      kayitSayisi: Number(e.db.selectValue('SELECT count(*) FROM kayitlar WHERE silindi IS NULL')),
      copSayisi: Number(e.db.selectValue('SELECT count(*) FROM kayitlar WHERE silindi IS NOT NULL')),
    };
  }

  islemGunlugu({ evren, sinir }: { evren: string; sinir: number }) {
    return this.evren(evren).islemler(Math.min(Math.max(1, sinir), 1000), true)
      .map(({ ikili, ...i }) => ({ ...i, ikiliBoyut: ikili?.length ?? 0 }));
  }

  // ---------- Kayıtlar ----------
  kayitlar({ evren, cop = false }: { evren: string; cop?: boolean }): KayitOzeti[] {
    const e = this.evren(evren);
    return e.db.selectObjects(
      `SELECT kod, tur, ad, ozet, karar, lakaplar, duzenleme, silindi FROM kayitlar WHERE silindi IS ${cop ? 'NOT ' : ''}NULL ORDER BY duzenleme DESC`)
      .map((r) => ({
        kod: r.kod as string, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string,
        lakaplar: JSON.parse(r.lakaplar as string), duzenleme: Number(r.duzenleme), silindi: r.silindi == null ? null : Number(r.silindi),
      }));
  }

  kayit({ evren, kod }: { evren: string; kod: string }): Kayit {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    const r = e.db.selectObject('SELECT * FROM kayitlar WHERE kod=?', [kod])!;
    return {
      kod, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string, okunus: r.okunus as string,
      lakaplar: JSON.parse(r.lakaplar as string), etiketler: JSON.parse(r.etiketler as string), oncekiAdlar: JSON.parse(r.onceki_adlar as string),
      olusturma: Number(r.olusturma), duzenleme: Number(r.duzenleme), silindi: r.silindi == null ? null : Number(r.silindi),
    };
  }

  kayitOlustur({ evren, ad, tur, karar = 'kesin', ozet = '' }: { evren: string; ad: string; tur: string; karar?: string; ozet?: string }) {
    const temizAd = temizle(ad);
    if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
    const kod = yeniKod();
    // Kaydın gövde metni ilk değişiklikle birlikte doğar; bütün cihazlar aynı kökten başlar.
    const kok = A.from({ t: '' }, { actor: this.aktor });
    this.yaz(evren, [
      { tur: 'kayit_olustur', veri: { kod, tur: turGecerli(tur) ? tur : 'diger', ad: temizAd, karar, ozet: temizle(ozet, { bos: true, uzunluk: 500 }) } },
      { tur: 'metin', veri: { kayit: kod, alan: 'govde', basliklar: A.getHeads(kok), ilk: true }, ikili: A.save(kok) },
    ], [kod]);
    return { kod };
  }

  kayitDegistir({ evren, kod, alan, deger }: { evren: string; kod: string; alan: DegisebilirAlan; deger: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    let temiz: string;
    if (alan === 'ad') temiz = temizle(deger);
    else if (alan === 'tur') { temiz = String(deger); if (!turGecerli(temiz)) throw new Error('Bilinmeyen tür.'); }
    else if (alan === 'karar') { temiz = String(deger); if (!kararGecerli(temiz)) throw new Error('Geçersiz karar durumu.'); }
    else if (alan === 'ozet') temiz = temizle(deger, { bos: true, uzunluk: 500 });
    else if (alan === 'okunus') temiz = temizle(deger, { bos: true });
    else throw new Error('Bu alan değiştirilemez.');
    const onceki = e.db.selectValue(`SELECT ${alan} FROM kayitlar WHERE kod=?`, [kod]) as string;
    if (onceki === temiz) return;
    this.yaz(evren, [{ tur: 'kayit_degistir', veri: { kod, alan, deger: temiz, onceki } }], [kod]);
  }

  kayitListe({ evren, kod, liste, ekle, cikar }: { evren: string; kod: string; liste: 'lakap' | 'etiket'; ekle?: string; cikar?: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    if (liste !== 'lakap' && liste !== 'etiket') throw new Error('Bilinmeyen liste.');
    const veri: Record<string, unknown> = { kod };
    if (ekle !== undefined) veri.ekle = temizle(ekle, { uzunluk: 100 });
    if (cikar !== undefined) veri.cikar = String(cikar);
    this.yaz(evren, [{ tur: liste === 'lakap' ? 'kayit_lakap' : 'kayit_etiket', veri }], [kod]);
  }

  kayitSil({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    this.yaz(evren, [{ tur: 'kayit_sil', veri: { kod } }], [kod]);
  }

  kayitGeriYukle({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    this.yaz(evren, [{ tur: 'kayit_geri_yukle', veri: { kod } }], [kod]);
  }

  /** Bir kaydın sürüm geçmişi (§10.8): o kayda dokunan bütün işlemler, en yenisi önce. */
  kayitGecmisi({ evren, kod }: { evren: string; kod: string }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    return e.db.selectObjects(
      `SELECT * FROM islemler WHERE json_extract(veri,'$.kod')=? OR json_extract(veri,'$.kayit')=? ORDER BY no DESC LIMIT 500`, [kod, kod])
      .map((r) => ({
        kod: r.kod as string, kurulum: r.kurulum as string, sira: Number(r.sira), zaman: Number(r.zaman), grup: (r.grup as string) ?? null,
        tur: r.tur as string, veri: JSON.parse(r.veri as string), gordu: JSON.parse(r.gordu as string), ikiliBoyut: (r.ikili as Uint8Array | null)?.length ?? 0,
      }));
  }

  // ---------- Uzun metin ----------
  private belge(e: EvrenVt, kayit: string, alan: string) {
    if (!METIN_ALANLARI.has(alan)) throw new Error('Bilinmeyen metin alanı.');
    this.kayitVarMi(e, kayit);
    const d = metinBelgesi(e.db, kayit, alan);
    if (!d) throw new Error('Metin bulunamadı.');
    return d;
  }

  metinAc({ evren, kayit, alan }: { evren: string; kayit: string; alan: string }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    return { spans: A.spans(d, ['t']) as Spans, basliklar: A.getHeads(d) };
  }

  /** Otomatik kaydetme: editördeki metin tek değişiklik olarak yazılır (TK2). */
  metinKaydet({ evren, kayit, alan, spans, temel }: { evren: string; kayit: string; alan: string; spans: Spans; temel: Basliklar }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    const simdiki = A.getHeads(d);
    if (JSON.stringify([...simdiki].sort()) !== JSON.stringify([...temel].sort())) {
      throw new Error('Metin bu arada değişmiş; sayfayı yenileyin.');
    }
    const calisma = A.clone(d, { actor: this.aktor });
    const yeni = A.change(calisma, (x) => A.updateSpans(x, ['t'], spans as never, spanAyari()));
    const basliklar = A.getHeads(yeni);
    if (JSON.stringify(basliklar) === JSON.stringify(A.getHeads(calisma))) return { basliklar: simdiki, degisti: false };
    this.yaz(evren, [{ tur: 'metin', veri: { kayit, alan, basliklar }, ikili: A.saveSince(yeni, simdiki) }], [kayit]);
    return { basliklar, degisti: true };
  }

  /** Metnin geçmişteki bir hâli (sürüm geçmişinde göstermek için). */
  metinSurumu({ evren, kayit, alan, basliklar }: { evren: string; kayit: string; alan: string; basliklar: Basliklar }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    return { spans: A.spans(A.view(d, basliklar), ['t']) as Spans };
  }

  /** Eski bir sürümü geri getirir: o hâl yeni bir değişiklik olarak yazılır; aradaki sürümler geçmişte kalır (§10.8). */
  metinGeriYukle({ evren, kayit, alan, basliklar }: { evren: string; kayit: string; alan: string; basliklar: Basliklar }) {
    const d = this.belge(this.evren(evren), kayit, alan);
    const simdiki = A.getHeads(d);
    const eski = A.spans(A.view(d, basliklar), ['t']);
    const calisma = A.clone(d, { actor: this.aktor });
    const yeni = A.change(calisma, (x) => A.updateSpans(x, ['t'], eski as never, spanAyari()));
    const sonra = A.getHeads(yeni);
    if (JSON.stringify(sonra) === JSON.stringify(A.getHeads(calisma))) return { basliklar: simdiki, degisti: false };
    this.yaz(evren, [{ tur: 'metin', veri: { kayit, alan, basliklar: sonra, geriYukleme: true }, ikili: A.saveSince(yeni, simdiki) }], [kayit]);
    return { basliklar: sonra, degisti: true };
  }

  // ---------- Arama (§18 arama ve sıralama) ----------
  /**
   * Türkçe kurallarla arama: adlar, lakaplar, eski adlar ve okunuş; sonra kısa özet ve (istenirse) metin.
   * Çekimli biçim köke indirilir ("kılıcıyla" → "Kılıç"). Sonuçta hangi addan bulunduğu söylenir.
   */
  ara({ evren, metin, sinir = 50, metinde = true }: { evren: string; metin: string; sinir?: number; metinde?: boolean }): AramaSonucu[] {
    const e = this.evren(evren);
    const q = katla(metin).replace(/\s+/g, ' ').trim();
    if (!q) return [];
    const parcalar = kelimeler(metin);
    const kokler = new Set(kokAdaylari(metin).slice(1));
    const kelimeSinirinda = (s: string) => s.startsWith(q) || s.includes(' ' + q) || s.includes('-' + q);
    const sonuc: (AramaSonucu & { puan: number })[] = [];
    const satirlar = e.db.selectObjects(
      `SELECT k.kod, k.tur, k.ad, k.ozet, k.karar, k.lakaplar, k.onceki_adlar, k.okunus, m.duz, m.katli
       FROM kayitlar k LEFT JOIN metinler m ON m.kayit=k.kod AND m.alan='govde' WHERE k.silindi IS NULL`);
    for (const r of satirlar) {
      const adlar: [AramaSonucu['nereden']['tur'], string][] = [['ad', r.ad as string]];
      for (const l of JSON.parse(r.lakaplar as string) as string[]) adlar.push(['lakap', l]);
      for (const l of JSON.parse(r.onceki_adlar as string) as string[]) adlar.push(['onceki', l]);
      if (r.okunus) adlar.push(['okunus', r.okunus as string]);
      let en: { puan: number; nereden: AramaSonucu['nereden']; tam: boolean; parca?: string } | null = null;
      const dene = (puan: number, nereden: AramaSonucu['nereden'], tam = false, parca?: string) => { if (!en || puan > en.puan) en = { puan, nereden, tam, parca }; };
      for (const [tur, ad] of adlar) {
        const k = katla(ad);
        const ek = tur === 'ad' ? 10 : 0;
        if (k === q) dene(90 + ek, { tur, metin: ad }, true);
        else if (kokler.has(k)) dene(75 + ek, { tur: tur === 'ad' ? 'kok' : tur, metin: ad }, true);
        else if (k.startsWith(q)) dene(70 + ek, { tur, metin: ad });
        else if (kelimeSinirinda(k)) dene(60 + ek, { tur, metin: ad });
        else if (parcalar.length > 1 && parcalar.every((p) => k.includes(p))) dene(50 + ek, { tur, metin: ad });
        else if (k.includes(q)) dene(40 + ek, { tur, metin: ad });
      }
      if (!en && katla(r.ozet as string).includes(q)) dene(30, { tur: 'ozet', metin: r.ozet as string });
      if (!en && metinde && r.katli && (r.katli as string).includes(q)) {
        const i = (r.katli as string).indexOf(q);
        const duz = r.duz as string;
        const bas = Math.max(0, i - 40);
        const parca = (bas > 0 ? '…' : '') + duz.slice(bas, i + q.length + 60).replace(/\s+/g, ' ') + (i + q.length + 60 < duz.length ? '…' : '');
        dene(20, { tur: 'metin', metin: '' }, false, parca);
      }
      if (en) {
        const b = en as { puan: number; nereden: AramaSonucu['nereden']; tam: boolean; parca?: string };
        sonuc.push({ kod: r.kod as string, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string,
          nereden: b.nereden, tam: b.tam, parca: b.parca, puan: b.puan });
      }
    }
    sonuc.sort((a, b) => b.puan - a.puan || turkceKarsilastir(a.ad, b.ad));
    return sonuc.slice(0, Math.min(Math.max(1, sinir), 500)).map(({ puan, ...x }) => x);
  }

  // ---------- Bağlantılar (§5.1) ----------
  /** Bu kayda bağlanan kayıtlar ve bağlantının görünen ifadeleri. */
  baglananlar({ evren, kod }: { evren: string; kod: string }): BaglananKayit[] {
    const e = this.evren(evren);
    const harita = new Map<string, BaglananKayit>();
    for (const r of e.db.selectObjects(
      `SELECT b.kaynak, b.metin, k.ad, k.tur FROM baglantilar b JOIN kayitlar k ON k.kod=b.kaynak
       WHERE b.hedef=? AND k.silindi IS NULL ORDER BY k.duzenleme DESC, b.sira`, [kod])) {
      let x = harita.get(r.kaynak as string);
      if (!x) { x = { kod: r.kaynak as string, ad: r.ad as string, tur: r.tur as string, ifadeler: [] }; harita.set(x.kod, x); }
      if (!x.ifadeler.includes(r.metin as string)) x.ifadeler.push(r.metin as string);
    }
    return [...harita.values()];
  }

  /** "Bahsedilen ama yazılmamış": bağlantı verilmiş ama metni boş kayıtlar (§5.1). */
  bahsedilenler({ evren }: { evren: string }): (KayitOzeti & { anilma: number })[] {
    const e = this.evren(evren);
    return e.db.selectObjects(
      `SELECT k.kod, k.tur, k.ad, k.ozet, k.karar, k.lakaplar, k.duzenleme, count(*) anilma
       FROM kayitlar k JOIN baglantilar b ON b.hedef=k.kod JOIN kayitlar kk ON kk.kod=b.kaynak AND kk.silindi IS NULL
       LEFT JOIN metinler m ON m.kayit=k.kod AND m.alan='govde'
       WHERE k.silindi IS NULL AND trim(coalesce(m.duz,''))='' GROUP BY k.kod ORDER BY anilma DESC, k.duzenleme DESC`)
      .map((r) => ({ kod: r.kod as string, tur: r.tur as string, ad: r.ad as string, ozet: r.ozet as string, karar: r.karar as string,
        lakaplar: JSON.parse(r.lakaplar as string), duzenleme: Number(r.duzenleme), silindi: null, anilma: Number(r.anilma) }));
  }

  /** Bir bağlantının hedefi ve görünen ifadesi değişmeden önce kaynakların metinleri (ad düzeltmesi için). */
  private adDuzeltmeleri(e: EvrenVt, kod: string, eskiAd: string, yeniAd: string, eskiOkunus: string, yeniOkunus: string) {
    const sonuc: (AdDuzeltmesi & { parcalar: number[] })[] = [];
    const kaynaklar = e.db.selectObjects(
      `SELECT DISTINCT b.kaynak, k.ad FROM baglantilar b JOIN kayitlar k ON k.kod=b.kaynak WHERE b.hedef=? AND b.alan='govde'`, [kod]);
    for (const r of kaynaklar) {
      const d = metinBelgesi(e.db, r.kaynak as string, 'govde');
      if (!d) continue;
      baglantilar(A.spans(d, ['t']) as never).forEach((b, sira) => {
        if (b.hedef !== kod) return;
        const yeni = adDegistir(b.metin, eskiAd, yeniAd, eskiOkunus, yeniOkunus);
        if (yeni === null || yeni === b.metin) return;
        sonuc.push({ kaynak: r.kaynak as string, kaynakAd: r.ad as string, sira, eski: b.metin, yeni, parcalar: b.parcalar });
      });
    }
    return sonuc;
  }

  /** Yazar düzeltmesi önizlemesi: bağlantılı ifadeler yeni adla nasıl görünecek (§5.1). */
  adDuzeltmeOnizle({ evren, kod, eskiAd, yeniAd, eskiOkunus = '' }: { evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string }): AdDuzeltmesi[] {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    return this.adDuzeltmeleri(e, kod, eskiAd, yeniAd, eskiOkunus, '').map(({ parcalar, ...x }) => x);
  }

  /** Seçilen bağlantılı ifadeleri yeni adla değiştirir; hepsi tek işlem grubudur. */
  adDuzeltmeUygula({ evren, kod, eskiAd, yeniAd, eskiOkunus = '', secilenler }: {
    evren: string; kod: string; eskiAd: string; yeniAd: string; eskiOkunus?: string; secilenler: string[];
  }) {
    const e = this.evren(evren);
    this.kayitVarMi(e, kod);
    const secili = new Set(secilenler);
    const kaynaga = new Map<string, (AdDuzeltmesi & { parcalar: number[] })[]>();
    for (const x of this.adDuzeltmeleri(e, kod, eskiAd, yeniAd, eskiOkunus, '')) {
      if (!secili.has(`${x.kaynak}:${x.sira}`)) continue;
      kaynaga.set(x.kaynak, [...(kaynaga.get(x.kaynak) ?? []), x]);
    }
    const girdiler = [];
    for (const [kaynak, liste] of kaynaga) {
      const d = metinBelgesi(e.db, kaynak, 'govde')!;
      const spans = (A.spans(d, ['t']) as { type: string; value: unknown; marks?: unknown }[]).map((x) => ({ ...x }));
      const sil = new Set<number>();
      for (const x of liste) {
        spans[x.parcalar[0]].value = x.yeni;
        for (const i of x.parcalar.slice(1)) sil.add(i);
      }
      const yeniSpans = spans.filter((_, i) => !sil.has(i));
      const onceki = A.getHeads(d);
      const yeni = A.change(A.clone(d, { actor: this.aktor }), (x) => A.updateSpans(x, ['t'], yeniSpans as never, spanAyari()));
      girdiler.push({ tur: 'metin', veri: { kayit: kaynak, alan: 'govde', basliklar: A.getHeads(yeni), adDuzeltme: kod }, ikili: A.saveSince(yeni, onceki) });
    }
    if (girdiler.length) this.yaz(evren, girdiler, [kod, ...kaynaga.keys()]);
    return { degisen: [...kaynaga.values()].reduce((n, l) => n + l.length, 0) };
  }
}
