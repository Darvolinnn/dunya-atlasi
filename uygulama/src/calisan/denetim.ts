// Kural tabanlı tutarlılık denetimleri (§9.1). Yalnızca yazarın kurduğu yapılara dayanır: tarih alanları, katılım
// rolleri, sahne yerleri, parçası olma ve sahiplik ilişkileri. Serbest metinden anlam çıkarılmaz (K1).
// Her bulgu hükmünü (açık çelişki · olası uyuşmazlık) ve dayanağını taşır; "sorun yok" yalnızca denetlenen kural ve
// kapsam için geçerlidir. Fikir durumundaki değerlerin bulguları ayrı ve sessiz gruptadır; vazgeçilmişler denetlenmez.
// Kararlar inceleme kuyruğunun kararlarıdır (§9.3): kabul edilen bulgu dayanağı değişmedikçe yeniden açılmaz.
import type { IslemGirdisi } from '../alan/islem';
import { GUN_PARCA, karsilastir, type EvrenTarihi } from '../alan/tarih';
import { asamaSuresi, asamalarOku, enKisaSure, rotalar, yolculukBulunmalari } from './yol';
import { turkceKarsilastir } from '../alan/turkce';
import type { DenetimBulgusu, DenetimKurali, DenetimOzeti, Denetimler, IncelemeKarari, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import type { PaketEtkisi } from './masa';
import { surecDenetimi } from './surec';

export interface DenetimBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
}

/** Fiziksel bulunma sayılan katılım rolleri. Adı anılmak, hatırlanmak, emri vermek ya da sonradan öğrenmek sayılmaz. */
const SAHNEDE_FIZIKSEL = ['bulunuyor'];
const OLAYDA_FIZIKSEL = ['baslatan', 'katilan', 'tanik', 'zarar', 'olen', 'dirilen', 'beden_degisen'];

type Ham = Omit<DenetimBulgusu, 'karar'> & { imza: string };
type Aralik = { enErken: number | null; enGec: number | null };

interface Bulunma {
  kisi: KisaKayit; olay: KisaKayit; iliski: string; rol: string; tarih: EvrenTarihi | null;
  fikir: boolean; sahneOlayi: string | null;
  /** Yolculuk aşamasının ucu: yer olayın yerinden değil buradan gelir. */
  yer?: KisaKayit;
}

const oku = (s: unknown) => (s ? JSON.parse(s as string) as EvrenTarihi : null);
const kisa = (r: Record<string, unknown>, p = ''): KisaKayit => ({ kod: r[p + 'kod'] as string, ad: r[p + 'ad'] as string, tur: r[p + 'tur'] as string });
const sonlu = (a: Aralik | null | undefined): a is { enErken: number; enGec: number } => !!a && a.enErken !== null && a.enGec !== null;
const ortusur = (a: Aralik, b: Aralik) => (a.enErken === null || b.enGec === null || a.enErken <= b.enGec) && (b.enErken === null || a.enGec === null || b.enErken <= a.enGec);
const tirnak = (t: EvrenTarihi) => `“${t.ifade}”`;
const gunYaz = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;

const ROL_ADI: Record<string, string> = { yolcu: 'yolcu', bulunuyor: 'sahnede bulunuyor', baslatan: 'başlatan', katilan: 'katılan', tanik: 'tanık', zarar: 'zarar gören', olen: 'ölen', dirilen: 'dirilen', beden_degisen: 'bedeni değişen' };

/** Kişilerin fiziksel olarak bulunduğu olay ve sahneler. Sahnenin tarihi yoksa kendi sahne olayından alınır. */
function bulunmalar(e: EvrenVt): Bulunma[] {
  const yer = (l: string[]) => l.map(() => '?').join(',');
  return e.db.selectObjects(`SELECT i.kod ik, i.tur itur, i.rol, i.karar ikarar, p.kod, p.ad, p.tur, p.karar pkarar,
      o.kod o_kod, o.ad o_ad, o.tur o_tur, o.karar okarar, o.alan_kararlari, o.sahne_olayi, coalesce(o.tarih, s.tarih) tarih
    FROM iliskiler i JOIN kayitlar p ON p.kod=i.a JOIN kayitlar o ON o.kod=i.b LEFT JOIN kayitlar s ON s.kod=o.sahne_olayi
    WHERE i.silindi IS NULL AND p.silindi IS NULL AND o.silindi IS NULL
      AND i.karar<>'vazgecildi' AND p.karar<>'vazgecildi' AND o.karar<>'vazgecildi'
      AND ((i.tur='sahnede' AND i.rol IN (${yer(SAHNEDE_FIZIKSEL)})) OR (i.tur='olayda' AND i.rol IN (${yer(OLAYDA_FIZIKSEL)})))`,
  [...SAHNEDE_FIZIKSEL, ...OLAYDA_FIZIKSEL]).flatMap((r) => {
    const ak = JSON.parse(r.alan_kararlari as string) as Record<string, string>;
    if (ak.tarih === 'vazgecildi') return [];
    return [{
      kisi: kisa(r), olay: kisa(r, 'o_'), iliski: r.ik as string, rol: r.rol as string, tarih: oku(r.tarih), sahneOlayi: (r.sahne_olayi as string) ?? null,
      fikir: r.ikarar === 'fikir' || r.pkarar === 'fikir' || r.okarar === 'fikir' || ak.tarih === 'fikir',
    }];
  });
}

/** Kişilerin olay, sahne ve yolculuklarda fiziksel olarak bulunduğu yer ve tarih (F31 keşif soruları da kullanır). */
export function fizikselBulunmalar(e: EvrenVt): { kisi: KisaKayit; yer: KisaKayit; tarih: EvrenTarihi; dayanak: KisaKayit; fikir: boolean }[] {
  const yerler = new Map<string, KisaKayit[]>();
  for (const r of e.db.selectObjects(`SELECT i.a olay, y.kod, y.ad, y.tur FROM iliskiler i JOIN kayitlar y ON y.kod=i.b
      WHERE i.tur='sahne_yeri' AND i.silindi IS NULL AND y.silindi IS NULL AND i.karar<>'vazgecildi' AND y.karar<>'vazgecildi'`)) {
    yerler.set(r.olay as string, [...(yerler.get(r.olay as string) ?? []), kisa(r)]);
  }
  const l: { kisi: KisaKayit; yer: KisaKayit; tarih: EvrenTarihi; dayanak: KisaKayit; fikir: boolean }[] = [];
  for (const x of bulunmalar(e)) {
    if (!x.tarih?.eksen) continue;
    for (const y of yerler.get(x.olay.kod) ?? (x.sahneOlayi ? yerler.get(x.sahneOlayi) ?? [] : [])) l.push({ kisi: x.kisi, yer: y, tarih: x.tarih, dayanak: x.olay, fikir: x.fikir });
  }
  for (const x of yolculukBulunmalari(e)) {
    const y = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [x.yer]);
    if (y) l.push({ kisi: x.kisi, yer: kisa(y), tarih: x.tarih, dayanak: x.yolculuk, fikir: x.fikir });
  }
  return l;
}

/** Yaşam süresi: doğumdan önce ya da ölümden sonra bir olayda fiziksel olarak bulunma. */
function yasam(e: EvrenVt, b: Bulunma[]): { bulgular: Ham[]; denetlenen: number; tarihsiz: number; kisiVar: boolean } {
  const bulgular: Ham[] = [];
  const sinirlar = new Map<string, { dogum: EvrenTarihi | null; olum: EvrenTarihi | null; fikir: { dogum: boolean; olum: boolean } }>();
  for (const r of e.db.selectObjects(`SELECT v.kayit, v.alan, v.deger, k.alan_kararlari FROM alan_degerleri v JOIN kayitlar k ON k.kod=v.kayit
      WHERE v.alan IN ('dogum','olum') AND k.silindi IS NULL AND k.karar<>'vazgecildi' AND k.tur<>'kimlik'`)) {
    const ak = JSON.parse(r.alan_kararlari as string) as Record<string, string>;
    const alan = r.alan as 'dogum' | 'olum';
    if (ak[alan] === 'vazgecildi') continue;
    const t = JSON.parse(r.deger as string) as EvrenTarihi | null;
    if (!t || typeof t !== 'object' || !('ifade' in t)) continue;
    const s = sinirlar.get(r.kayit as string) ?? { dogum: null, olum: null, fikir: { dogum: false, olum: false } };
    s[alan] = t; s.fikir[alan] = ak[alan] === 'fikir';
    sinirlar.set(r.kayit as string, s);
  }
  // Dirilme (§9.1, §3.12): ölümden sonra bulunma, ondan önce kayıtlı bir dirilme olayı varsa çelişki değildir.
  const dirilmeler = new Map<string, EvrenTarihi[]>();
  for (const x of b) if (x.rol === 'dirilen' && x.tarih?.eksen) dirilmeler.set(x.kisi.kod, [...(dirilmeler.get(x.kisi.kod) ?? []), x.tarih]);
  let denetlenen = 0, tarihsiz = 0, kisiVar = false;
  for (const x of b) {
    const s = sinirlar.get(x.kisi.kod);
    if (!s || !(s.dogum?.eksen || s.olum?.eksen)) continue;
    kisiVar = true;
    if (!x.tarih?.eksen) { tarihsiz++; continue; }
    denetlenen++;
    const rol = ROL_ADI[x.rol] ?? 'katılımcı';
    const kontrol = (sinir: EvrenTarihi | null, tur: 'dogum' | 'olum') => {
      if (!sinir?.eksen) return;
      const diril = tur === 'olum' ? dirilmeler.get(x.kisi.kod) ?? [] : [];
      if (diril.some((d) => karsilastir(d, sinir) !== 'once' && karsilastir(x.tarih!, d) !== 'once')) return;
      const once = tur === 'dogum';
      const kesin = karsilastir(x.tarih, sinir) === (once ? 'once' : 'sonra');
      // Olası: olayın bir kısmı sınırın öbür yanına düşebiliyor. Aynı aralıkta verilmiş tarihler (ör. savaşta ölüm) sayılmaz.
      const a = x.tarih!.eksen!, s2 = sinir.eksen;
      const ayni = a.enErken === s2.enErken && a.enGec === s2.enGec;
      const olasi = !kesin && !ayni && ortusur(a, s2) && (once
        ? a.enErken === null || (s2.enGec !== null && a.enErken < s2.enGec)
        : a.enGec === null || (s2.enErken !== null && a.enGec > s2.enErken));
      if (!kesin && !olasi) return;
      const ne = once ? 'doğumundan önce' : 'ölümünden sonra';
      bulgular.push({
        anahtar: `denetim:yasam:${x.iliski}:${tur}`, kural: 'yasam', hukum: kesin ? 'celiski' : 'olasi',
        baslik: kesin ? `${x.kisi.ad}, ${ne} “${x.olay.ad}” içinde bulunuyor` : `${x.kisi.ad}, ${ne} “${x.olay.ad}” içinde bulunuyor olabilir`,
        dayanak: `${x.olay.ad} ${tirnak(x.tarih!)}; ${x.kisi.ad} burada ${rol}. ${once ? 'Doğum' : 'Ölüm'} tarihi ${tirnak(sinir)}.`
          + (kesin ? '' : ' Tarihler birbirini ayıracak kadar kesin değil.') + (!once && !diril.length ? ' Kayıtlı bir dirilme olayı yok.' : ''),
        kayitlar: [x.kisi, x.olay], fikir: x.fikir || s.fikir[tur],
        imza: JSON.stringify([x.tarih!.eksen, sinir.eksen, x.rol]),
      });
    };
    kontrol(s.dogum, 'dogum');
    kontrol(s.olum, 'olum');
  }
  return { bulgular, denetlenen, tarihsiz, kisiVar };
}

/** Döngüsel tarih: göreli tarihlerin kısıtları imkânsız bir sıra kuruyor (A < B < C < A). Aynı döngü tek iştir. */
function dongu(e: EvrenVt): { bulgular: Ham[]; denetlenen: number } {
  const goreli = e.db.selectObjects(`SELECT k.kod, k.ad, k.tur, k.karar, k.alan_kararlari, k.tarih FROM goreli_tarihler g JOIN kayitlar k ON k.kod=g.kod
    WHERE k.silindi IS NULL AND k.karar<>'vazgecildi' AND k.tarih IS NOT NULL`);
  const gruplar = new Map<string, Record<string, unknown>[]>();
  for (const r of goreli) {
    const t = oku(r.tarih);
    if (!t?.celiski?.length) continue;
    const anahtar = [...new Set(t.celiski)].sort().join(',');
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), r]);
  }
  const bulgular: Ham[] = [];
  for (const [anahtar, uyeler] of gruplar) {
    const kodlar = anahtar.split(',');
    const adlar = new Map(e.db.selectObjects(`SELECT kod, ad, tur, tarih FROM kayitlar WHERE kod IN (${kodlar.map(() => '?').join(',')})`, kodlar).map((r) => [r.kod as string, r]));
    const zincir = (oku(uyeler[0].tarih)!.celiski ?? []).map((k) => (adlar.get(k)?.ad as string) ?? 'silinmiş kayıt');
    const ifadeler = uyeler.map((r) => `${r.ad}: ${tirnak(oku(r.tarih)!)}`).join('; ');
    bulgular.push({
      anahtar: `denetim:dongu:${anahtar}`, kural: 'dongu', hukum: 'celiski',
      baslik: `Birbirine göre verilmiş tarihler imkânsız bir sıra kuruyor: ${zincir.join(' → ')}`,
      dayanak: `${ifadeler}. Bu kısıtların hepsine birden uyan bir tarih yok. Birini değiştirirseniz döngü çözülür.`,
      kayitlar: uyeler.map((r) => kisa(r)),
      fikir: uyeler.some((r) => r.karar === 'fikir' || (JSON.parse(r.alan_kararlari as string) as Record<string, string>).tarih === 'fikir'),
      imza: JSON.stringify(uyeler.map((r) => oku(r.tarih)!.kisitlar ?? []).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))),
    });
  }
  return { bulgular, denetlenen: goreli.length };
}

/** Alternatif (K27): birbirinin alternatifi diye bağlanmış iki kaydın ikisi de kesinleşmiş. Program hangisinin
 *  geçerli olduğunu bilmez; yalnızca yazarın kurduğu bağı ve karar durumlarını gösterir. */
function alternatif(e: EvrenVt): { bulgular: Ham[]; denetlenen: number } {
  const l = e.db.selectObjects(`SELECT i.kod, a.kod a_kod, a.ad a_ad, a.tur a_tur, a.karar a_karar, b.kod b_kod, b.ad b_ad, b.tur b_tur, b.karar b_karar
    FROM iliskiler i JOIN kayitlar a ON a.kod=i.a JOIN kayitlar b ON b.kod=i.b
    WHERE i.tur='alternatif' AND i.silindi IS NULL AND a.silindi IS NULL AND b.silindi IS NULL`);
  const bulgular: Ham[] = l.filter((r) => r.a_karar === 'kesin' && r.b_karar === 'kesin').map((r) => ({
    anahtar: `denetim:alternatif:${r.kod}`, kural: 'alternatif', hukum: 'olasi',
    baslik: `“${r.a_ad}” ile “${r.b_ad}” birbirinin alternatifi, ama ikisi de kesinleşmiş`,
    dayanak: 'İkisini birbirinin alternatifi olarak bağlamıştınız. Biri seçildiyse öbürünü “vazgeçilmiş” yapabilir ya da aralarındaki bağı kaldırabilirsiniz.',
    kayitlar: [kisa(r, 'a_'), kisa(r, 'b_')], fikir: false, imza: `${r.a_karar}:${r.b_karar}`,
  }));
  return { bulgular, denetlenen: l.length };
}

/** Konum: aynı zamanda, parçası olma ilişkisiyle birbirini kapsamayan iki yerde fiziksel olarak bulunma. */
function konum(e: EvrenVt, b: Bulunma[], p: PaketEtkisi | null): { bulgular: Ham[]; denetlenen: number; yersiz: number; rotaDenetlenen: number } {
  const yerler = new Map<string, { yer: KisaKayit; fikir: boolean }[]>();
  for (const r of e.db.selectObjects(`SELECT i.a olay, i.karar ikarar, y.kod, y.ad, y.tur, y.karar FROM iliskiler i JOIN kayitlar y ON y.kod=i.b
      WHERE i.tur='sahne_yeri' AND i.silindi IS NULL AND y.silindi IS NULL AND i.karar<>'vazgecildi' AND y.karar<>'vazgecildi'`)) {
    yerler.set(r.olay as string, [...(yerler.get(r.olay as string) ?? []), { yer: kisa(r), fikir: r.ikarar === 'fikir' || r.karar === 'fikir' }]);
  }
  // Parçası olma: a, b'nin parçasıdır. Kapsayan yerler zincir boyunca toplanır.
  const ust = new Map<string, string[]>();
  for (const r of e.db.selectObjects(`SELECT a, b FROM iliskiler WHERE tur='parca' AND silindi IS NULL AND karar<>'vazgecildi'`)) {
    ust.set(r.a as string, [...(ust.get(r.a as string) ?? []), r.b as string]);
  }
  const kapsayanlar = new Map<string, Set<string>>();
  const kapsayan = (k: string) => {
    let s = kapsayanlar.get(k);
    if (s) return s;
    s = new Set<string>();
    const kuyruk = [k];
    while (kuyruk.length) for (const u of ust.get(kuyruk.pop()!) ?? []) if (!s.has(u)) { s.add(u); kuyruk.push(u); }
    kapsayanlar.set(k, s);
    return s;
  };
  const uyumlu = (x: string, y: string) => x === y || kapsayan(x).has(y) || kapsayan(y).has(x);
  // Aynı olayı anlatan sahne ile olay iki ayrı bulunma değildir.
  const anlatir = new Set(e.db.selectObjects(`SELECT a, b FROM iliskiler WHERE tur='anlatir' AND silindi IS NULL`).flatMap((r) => [`${r.a}|${r.b}`, `${r.b}|${r.a}`]));
  const ayniOlay = (x: Bulunma, y: Bulunma) => x.olay.kod === y.olay.kod || x.sahneOlayi === y.olay.kod || y.sahneOlayi === x.olay.kod || anlatir.has(`${x.olay.kod}|${y.olay.kod}`);

  const kisiler = new Map<string, Bulunma[]>();
  let yersiz = 0;
  for (const x of b) {
    if (x.yer) yerler.set(`${x.iliski}`, [{ yer: x.yer, fikir: false }]);
    if (!x.tarih?.eksen || !yerler.has(x.yer ? x.iliski : x.olay.kod)) { yersiz++; continue; }
    kisiler.set(x.kisi.kod, [...(kisiler.get(x.kisi.kod) ?? []), x]);
  }
  const bulgular: Ham[] = [];
  let denetlenen = 0, rotaDenetlenen = 0;
  // Kayıtlı rota süreleri (§8.4 süre ağı): iki yer arasında doğrudan kayıtlı rotaların en kısa süresi.
  const rs = rotalar(e).filter((r) => r.a && r.b && r.sureler.length && p?.rota.get(r.kod) !== false);
  const enHizli = (p: string, q: string) => {
    let en: { rota: (typeof rs)[number]; sure: { kosul: string; gun: number } } | null = null;
    for (const r of rs) {
      if (!((uyumlu(r.a!, p) && uyumlu(r.b!, q)) || (uyumlu(r.a!, q) && uyumlu(r.b!, p)))) continue;
      const k = enKisaSure(r.sureler)!;
      if (!en || k.gun < en.sure.gun) en = { rota: r, sure: k };
    }
    return en;
  };
  for (const liste of kisiler.values()) {
    const kaba: { x: Bulunma; y: Bulunma; yx: KisaKayit; yy: KisaKayit; fikir: boolean }[] = [];
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      const x = liste[i], y = liste[j];
      if (ayniOlay(x, y)) continue;
      denetlenen++;
      const yx = yerler.get(x.yer ? x.iliski : x.olay.kod)!, yy = yerler.get(y.yer ? y.iliski : y.olay.kod)!;
      // Yerlerden biri ötekini kapsıyorsa (handa olmak ile aynı şehirde olmak) çelişmez.
      if (yx.some((a) => yy.some((c) => uyumlu(a.yer.kod, c.yer.kod)))) continue;
      const fikir = x.fikir || y.fikir || yx.every((a) => a.fikir) || yy.every((a) => a.fikir);
      if (!ortusur(x.tarih!.eksen!, y.tarih!.eksen!)) {
        // Ayrı zamanlarda iki yer: aralarında kayıtlı rota varsa, aradaki en uzun olası süre rotanın en kısa süresine yetiyor mu?
        const ex = x.tarih!.eksen!, ey = y.tarih!.eksen!;
        if (!sonlu(ex) || !sonlu(ey)) continue;
        const r = yx.flatMap((a) => yy.map((c) => enHizli(a.yer.kod, c.yer.kod))).reduce((m, v) => (v && (!m || v.sure.gun < m.sure.gun) ? v : m), null);
        if (!r) continue;
        rotaDenetlenen++;
        const enCok = Math.max(ey.enGec - ex.enErken, ex.enGec - ey.enErken) / GUN_PARCA;
        if (enCok >= r.sure.gun) continue;
        const [p, q] = [x, y].sort((m, n) => m.iliski.localeCompare(n.iliski));
        const [ilk, son] = karsilastir(x.tarih, y.tarih) === 'sonra' ? [y, x] : [x, y];
        bulgular.push({
          anahtar: `denetim:rota:${p.iliski}:${q.iliski}`, kural: 'konum', hukum: 'olasi',
          baslik: `${x.kisi.ad}, “${r.rota.ad}” için tanımlı süreden kısa sürede yer değiştiriyor`,
          dayanak: `${ilk.olay.ad} ${tirnak(ilk.tarih!)} ile ${son.olay.ad} ${tirnak(son.tarih!)} arasında en çok ${gunYaz(enCok)} var. `
            + `“${r.rota.ad}” için tanımlı en kısa süre ${gunYaz(r.sure.gun)}${r.sure.kosul ? ` (${r.sure.kosul})` : ''}. Bu yalnızca kayıtlı rotalar için geçerlidir; başka bir yoldan gelmiş olabilir.`,
          kayitlar: [x.kisi, ilk.olay, son.olay, { kod: r.rota.kod, ad: r.rota.ad, tur: 'rota' }], fikir,
          imza: JSON.stringify([ex, ey, r.rota.kod, r.sure.gun]),
        });
        continue;
      }
      const gunluk = x.tarih!.hassasiyet === 'gun' && y.tarih!.hassasiyet === 'gun' && sonlu(x.tarih!.eksen) && sonlu(y.tarih!.eksen);
      if (!gunluk) { kaba.push({ x, y, yx: yx[0].yer, yy: yy[0].yer, fikir }); continue; }
      // Rota süreleri henüz kayıtlı olmadığı için aynı gün iki yerde olmak da olası uyuşmazlıktır (§2.2 kural 13).
      const [p, q] = [x, y].sort((m, n) => m.iliski.localeCompare(n.iliski));
      bulgular.push({
        anahtar: `denetim:konum:${p.iliski}:${q.iliski}`, kural: 'konum', hukum: 'olasi',
        baslik: `${x.kisi.ad} aynı gün iki ayrı yerde görünüyor`,
        dayanak: `${x.olay.ad} ${tirnak(x.tarih!)}, ${yx.map((a) => a.yer.ad).join(', ')}; ${y.olay.ad} ${tirnak(y.tarih!)}, ${yy.map((a) => a.yer.ad).join(', ')}. `
          + 'Bu yerlerden biri ötekinin parçası değil. İki yer arasında kayıtlı bir yol süresi olmadığı için aynı gün varılıp varılamayacağı bilinmiyor.',
        kayitlar: [x.kisi, x.olay, y.olay], fikir,
        imza: JSON.stringify([x.tarih!.eksen, y.tarih!.eksen, yx.map((a) => a.yer.kod).sort(), yy.map((a) => a.yer.kod).sort()]),
      });
    }
    // Kaba tarihli örtüşmeler kişi başına tek iştir: hepsinin kökü tarihlerin yeterince kesin olmaması.
    if (kaba.length) {
      const kisi = kaba[0].x.kisi;
      const cumle = kaba.slice(0, 6).map((k) => `${k.x.olay.ad} (${k.x.tarih!.ifade}, ${k.yx.ad}) ile ${k.y.olay.ad} (${k.y.tarih!.ifade}, ${k.yy.ad})`).join('; ');
      bulgular.push({
        anahtar: `denetim:konum-kaba:${kisi.kod}`, kural: 'konum', hukum: 'olasi',
        baslik: kaba.length === 1 ? `${kisi.ad} aynı dönemde iki ayrı yerde olabilir` : `${kisi.ad} aynı dönemde ${kaba.length} kez iki ayrı yerde olabilir`,
        dayanak: `${cumle}${kaba.length > 6 ? ` ve ${kaba.length - 6} çift daha` : ''}. Tarihler iki yeri ayıracak kadar kesin değil. Günleri yazılırsa ayrı ayrı denetlenir.`,
        kayitlar: [kisi, ...[...new Map(kaba.flatMap((k) => [k.x.olay, k.y.olay]).map((o) => [o.kod, o])).values()].slice(0, 8)],
        fikir: kaba.every((k) => k.fikir),
        imza: JSON.stringify(kaba.map((k) => [k.x.iliski, k.y.iliski, k.x.tarih!.eksen, k.y.tarih!.eksen, k.yx.kod, k.yy.kod]).sort()),
      });
    }
  }
  return { bulgular, denetlenen, yersiz, rotaDenetlenen };
}

/** Eşya: aynı dönemde iki ayrı sahibi görünen eşya. Ortak sahiplik olabileceği için olası uyuşmazlıktır. */
function esya(e: EvrenVt): { bulgular: Ham[]; denetlenen: number } {
  const satirlar = e.db.selectObjects(`SELECT i.kod ik, i.karar ikarar, i.baslangic, i.bitis, p.kod, p.ad, p.tur, p.karar pkarar, s.kod s_kod, s.ad s_ad, s.tur s_tur, s.karar skarar
    FROM iliskiler i JOIN kayitlar p ON p.kod=i.a JOIN kayitlar s ON s.kod=i.b
    WHERE i.tur='sahip' AND s.tur='esya' AND i.silindi IS NULL AND p.silindi IS NULL AND s.silindi IS NULL
      AND i.karar<>'vazgecildi' AND p.karar<>'vazgecildi' AND s.karar<>'vazgecildi' ORDER BY i.kod`);
  const esyalar = new Map<string, Record<string, unknown>[]>();
  for (const r of satirlar) esyalar.set(r.s_kod as string, [...(esyalar.get(r.s_kod as string) ?? []), r]);
  const bulgular: Ham[] = [];
  let denetlenen = 0;
  for (const liste of esyalar.values()) {
    if (liste.length < 2) continue;
    denetlenen++;
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      const x = liste[i], y = liste[j];
      if (x.kod === y.kod) continue;
      const bx = oku(x.baslangic), by = oku(y.baslangic), sx = oku(x.bitis), sy = oku(y.bitis);
      // Başlangıcı bilinmeyen sahiplik denetlenmez; bitişi olmayan "hâlâ sürüyor" sayılır.
      if (!bx?.eksen || !by?.eksen) continue;
      const enGecBas = Math.max(bx.eksen.enGec ?? Infinity, by.eksen.enGec ?? Infinity);
      const enErkenBit = Math.min(sx?.eksen ? sx.eksen.enErken ?? -Infinity : Infinity, sy?.eksen ? sy.eksen.enErken ?? -Infinity : Infinity);
      if (!(enGecBas <= enErkenBit) || (sx && !sx.eksen) || (sy && !sy.eksen)) continue;
      const esyaK = kisa(x, 's_');
      const donem = (b: EvrenTarihi, s: EvrenTarihi | null) => `${tirnak(b)}${s ? ` – ${tirnak(s)}` : ' itibarıyla'}`;
      bulgular.push({
        anahtar: `denetim:esya:${x.ik}:${y.ik}`, kural: 'esya', hukum: 'olasi',
        baslik: `“${esyaK.ad}” aynı dönemde iki kişide görünüyor`,
        dayanak: `${x.ad} sahibi: ${donem(bx, sx)}; ${y.ad} sahibi: ${donem(by, sy)}. Bu dönemler kesin olarak örtüşüyor. Ortak sahiplik söz konusu değilse sahipliklerden birinin bitiş tarihi eksik olabilir.`,
        kayitlar: [esyaK, kisa(x), kisa(y)],
        fikir: [x, y].some((r) => r.ikarar === 'fikir' || r.pkarar === 'fikir') || x.skarar === 'fikir',
        imza: JSON.stringify([bx.eksen, by.eksen, sx?.eksen ?? null, sy?.eksen ?? null]),
      });
    }
  }
  return { bulgular, denetlenen };
}

/** Yolculuk aşaması kendi seçtiği rotanın tanımlı en kısa süresinden kısa sürüyorsa: yazarın kendi verisi çelişiyor. */
function asamaDenetimi(e: EvrenVt, p: PaketEtkisi | null): Ham[] {
  const rs = new Map(rotalar(e).filter((r) => p?.rota.get(r.kod) !== false).map((r) => [r.kod, r]));
  const bulgular: Ham[] = [];
  for (const r of e.db.selectObjects(`SELECT y.kod, k.ad, k.tur, k.karar FROM yolculuklar y JOIN kayitlar k ON k.kod=y.kod WHERE k.silindi IS NULL AND k.karar<>'vazgecildi'`)) {
    asamalarOku(e, r.kod as string).forEach((a, n) => {
      if (a.durum !== 'gerceklesti' || !a.rota) return;
      const rota = rs.get(a.rota), sure = asamaSuresi(a);
      const ek = rota ? enKisaSure(rota.sureler) : null;
      if (!rota || !ek || !sure || sure.enCok >= ek.gun) return;
      bulgular.push({
        anahtar: `denetim:rota-asama:${r.kod}:${n}`, kural: 'konum', hukum: 'celiski',
        baslik: `“${r.ad}” yolculuğunun ${n + 1}. aşaması, rotası için tanımlı süreden kısa`,
        dayanak: `Çıkış ${tirnak(a.cikis!)}, varış ${tirnak(a.varis!)}: en çok ${gunYaz(sure.enCok)}. “${rota.ad}” için tanımlı en kısa süre ${gunYaz(ek.gun)}${ek.kosul ? ` (${ek.kosul})` : ''}.`,
        kayitlar: [{ kod: r.kod as string, ad: r.ad as string, tur: r.tur as string }, { kod: rota.kod, ad: rota.ad, tur: 'rota' }],
        fikir: r.karar === 'fikir', imza: JSON.stringify([a.cikis?.eksen, a.varis?.eksen, ek.gun]),
      });
    });
  }
  return bulgular;
}

/**
 * Paketle hesap (§3.11): "gerçekleşmedi" denen olayın bulunmaları denetime girmez; "gerçekleşti" denen fikir olayı
 * kesin sayılır. "Kapalı" rota süre karşılaştırmasına girmez. Paketsiz hesap yalnızca kaydedilmiş veriyle yapılır.
 */
function pakettenGecir(b: Bulunma[], p: PaketEtkisi | null): Bulunma[] {
  if (!p) return b;
  return b.flatMap((x) => {
    const v = p.olay.get(x.olay.kod) ?? (x.sahneOlayi ? p.olay.get(x.sahneOlayi) : undefined);
    if (v === false) return [];
    return [v === true ? { ...x, fikir: false } : x];
  });
}

function hesapla(e: EvrenVt, p: PaketEtkisi | null = null): { bulgular: Ham[]; kurallar: DenetimOzeti[] } {
  const b: Bulunma[] = pakettenGecir([...bulunmalar(e), ...yolculukBulunmalari(e).map((x) => {
    const yer = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [x.yer]);
    return { kisi: x.kisi, olay: x.yolculuk, iliski: x.iliski, rol: 'yolcu', tarih: x.tarih, fikir: x.fikir, sahneOlayi: null,
      yer: yer ? { kod: yer.kod as string, ad: yer.ad as string, tur: yer.tur as string } : { kod: x.yer, ad: 'Silinmiş kayıt', tur: 'diger' } };
  })], p);
  const y = yasam(e, b), d = dongu(e), k = konum(e, b, p), s = esya(e);
  const sr = surecDenetimi(e);
  const al = alternatif(e);
  const srH: Ham[] = sr.bulgular.map((x) => ({ ...x, kural: 'surec' as const }));
  k.bulgular.push(...asamaDenetimi(e, p));
  const ozet = (kural: DenetimKurali, ad: string, tanim: string, x: { bulgular: Ham[]; denetlenen: number }, bos: string, not: string): DenetimOzeti => ({
    kural, ad, tanim, denetlenen: x.denetlenen, not: x.denetlenen ? not : bos,
    sonuc: x.bulgular.length ? 'bulgu_var' : x.denetlenen ? 'sorun_yok' : 'konu_degil',
  });
  const kurallar: DenetimOzeti[] = [
    ozet('yasam', 'Yaşam süresi', 'Doğumdan önce ya da ölümden sonra bir olayda ya da sahnede fiziksel olarak bulunma.', y,
      y.kisiVar ? 'Doğum ya da ölüm tarihi olan kişilerin bulunduğu olayların tarihi yok.' : 'Doğum ya da ölüm tarihi olan ve bir olayda fiziksel olarak bulunan kişi yok.',
      `${y.denetlenen} bulunma denetlendi.${y.tarihsiz ? ` ${y.tarihsiz} bulunmanın olayı tarihsiz olduğu için denetlenemedi.` : ''}`),
    ozet('dongu', 'Döngüsel tarih', 'Birbirine göre verilmiş tarihlerde imkânsız sıra (A, B\'den önce; B, C\'den önce; C, A\'dan önce).', d,
      'Bir olaya göre verilmiş tarih yok.', `${d.denetlenen} göreli tarih denetlendi.`),
    ozet('konum', 'Konum', 'Aynı zamanda, biri ötekinin parçası olmayan iki yerde fiziksel olarak bulunma.', k,
      'Aynı kişinin tarihli ve yeri belli iki olayı ya da sahnesi yok.',
      `${k.denetlenen} olay çifti denetlendi${k.rotaDenetlenen ? `; ${k.rotaDenetlenen} çift kayıtlı rota süresiyle karşılaştırıldı` : ''}.${k.yersiz ? ` ${k.yersiz} bulunmanın tarihi ya da yeri olmadığı için denetlenemedi.` : ''} Rota süreleri yalnızca kayıtlı rotalar için geçerlidir.`),
    ozet('esya', 'Eşya', 'Bir eşyanın aynı dönemde iki ayrı sahibinin görünmesi.', s,
      'İki ya da daha çok sahibi kayıtlı eşya yok.', `${s.denetlenen} eşya denetlendi. Başlangıcı yazılmamış sahiplikler denetlenmez. Eşyanın yok edilmesi henüz denetlenmiyor.`),
    { kural: 'bilgi', ad: 'Bilgi', tanim: 'Karakterin bir bilgiyi öğrenmeden önce ona göre davranması.', sonuc: 'denetlenemiyor', denetlenen: 0,
      not: 'Bir karakterin bir bilgiye göre davrandığını gösteren bir kayıt henüz yok. Program bunu metinden çıkarmaz.' },
    ozet('surec', 'Süreç', 'Bir olayda bir adımın, bağlı süreç kuralındaki önkoşul adımı yapılmadan gerçekleşmesi.', { bulgular: srH, denetlenen: sr.denetlenen },
      'Önkoşullu adımı olan bir süreç kuralına bağlı olay yok.', `${sr.denetlenen} olay–kural bağı denetlendi. Kaydedilmemiş adım “olmadı” sayılmaz; yalnızca “yapılmadı” ya da “yarıda kaldı” diye işaretlenen önkoşullar denetlenir.`),
    ozet('alternatif', 'Alternatifler', 'Birbirinin alternatifi diye bağlanmış iki kaydın ikisinin de kesinleşmiş olması.', al,
      'Birbirinin alternatifi diye bağlanmış kayıt yok.', `${al.denetlenen} alternatif bağı denetlendi.`),
  ];
  return { bulgular: [...y.bulgular, ...d.bulgular, ...k.bulgular, ...s.bulgular, ...srH, ...al.bulgular], kurallar };
}

const sirala = (l: DenetimBulgusu[]) => l.sort((a, b) => (a.hukum === b.hukum ? 0 : a.hukum === 'celiski' ? -1 : 1)
  || turkceKarsilastir(a.kayitlar[0]?.ad ?? '', b.kayitlar[0]?.ad ?? '') || a.baslik.localeCompare(b.baslik));

/** Denetimler ve kuyruk kararları. Kabul edilen bulgu, dayanağı değişmedikçe açılmaz; ertelenen ayrı durur (§9.3). */
export function denetimler(e: EvrenVt, p: PaketEtkisi | null = null): Denetimler {
  const { bulgular, kurallar } = hesapla(e, p);
  const kararlar = new Map(e.db.selectObjects("SELECT * FROM inceleme_kararlari WHERE anahtar LIKE 'denetim:%'").map((r) => [r.anahtar as string, r]));
  const acik: DenetimBulgusu[] = [], ertelenen: DenetimBulgusu[] = [], kabul: DenetimBulgusu[] = [], fikir: DenetimBulgusu[] = [];
  for (const { imza, ...b } of bulgular) {
    const r = kararlar.get(b.anahtar);
    const karar: IncelemeKarari | null = r ? { durum: r.durum as IncelemeKarari['durum'], gerekce: r.gerekce as string, zaman: Number(r.zaman), istisna: (r.istisna as IncelemeKarari['istisna']) ?? null } : null;
    if (karar?.durum === 'ertelendi') ertelenen.push({ ...b, karar });
    else if (karar?.durum === 'kabul' && r!.dayanak === imza) kabul.push({ ...b, karar });
    else (b.fikir ? fikir : acik).push({ ...b, karar: null });
  }
  // Kuralın sonucu kararlardan sonra: yalnızca gerekçeli istisnası kalan kural "sorun yok" sayılır, istisnaları yazılır.
  for (const k of kurallar) {
    if (k.sonuc !== 'bulgu_var') continue;
    const n = kabul.filter((b) => b.kural === k.kural).length;
    if (![...acik, ...ertelenen, ...fikir].some((b) => b.kural === k.kural)) k.sonuc = 'sorun_yok';
    if (n) k.not += ` ${n} gerekçeli istisna var.`;
  }
  const paket = p ? { kod: p.kod, ad: p.ad, kullanilan: p.olay.size + p.rota.size, kullanilmayan: p.kullanilmayan } : null;
  return { paket, kurallar, acik: sirala(acik), ertelenen: sirala(ertelenen), kabul: sirala(kabul), fikir: sirala(fikir) };
}

export const acikDenetimSayisi = (e: EvrenVt) => denetimler(e).acik.length;

export function kararVer(b: DenetimBaglami, anahtar: string, durum: 'kabul' | 'ertelendi' | null, gerekce: string, istisna: 'tercih' | 'kapsam' | null = null) {
  const bulgu = hesapla(b.e).bulgular.find((x) => x.anahtar === anahtar);
  if (!bulgu && durum) throw new Error('Bu uyarı artık yok.');
  const g = String(gerekce ?? '').replace(/\s+/g, ' ').trim();
  if (durum === 'kabul' && !g) throw new Error('Kabul ederken kısa bir gerekçe yazın.');
  if (g.length > 500) throw new Error('Gerekçe en çok 500 harf olabilir.');
  if (istisna !== null && istisna !== 'tercih' && istisna !== 'kapsam') throw new Error('Geçersiz istisna.');
  b.yaz([{ tur: 'inceleme_karari', veri: { anahtar, durum, gerekce: g, dayanak: bulgu?.imza ?? '', baslik: bulgu?.baslik ?? '', ...(durum === 'kabul' ? { istisna: istisna ?? 'tercih' } : {}) } }],
    bulgu ? bulgu.kayitlar.map((k) => k.kod) : []);
}
