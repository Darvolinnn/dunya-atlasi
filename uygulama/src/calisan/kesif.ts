// F31 açık verilere dayanan keşif soruları. Yazar bir soru şablonu seçer; program yalnızca tanımlı ilişkilerden aday
// çıkarır. Sonuç "görüştüler" demez, "bu aralıkta karşılaşmaları mümkün" der. Aday, yazar isterse bir sahne fikrine
// ya da açık meseleye dönüştürülür; program kendiliğinden hiçbir şey yazmaz.
import type { EvrenTarihi } from '../alan/tarih';
import { anaTakvim, eksenAraligi } from '../alan/tarih';
import type { KesifAdayi, KesifSonucu, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { fizikselBulunmalar } from './denetim';
import { haklar as hakListesi } from './haklar';
import type { DurumBaglami } from './durum';

const SINIR = 50;
type Aralik = { enErken: number | null; enGec: number | null };
const kesisim = (a: Aralik, b: Aralik): Aralik | null => {
  const bas = a.enErken === null ? b.enErken : b.enErken === null ? a.enErken : Math.max(a.enErken, b.enErken);
  const son = a.enGec === null ? b.enGec : b.enGec === null ? a.enGec : Math.min(a.enGec, b.enGec);
  return bas !== null && son !== null && bas > son ? null : { enErken: bas, enGec: son };
};
function kisa(e: EvrenVt, kod: string): KisaKayit {
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}

/** Kişinin bir yerde bulunduğu zaman aralıkları: ikamet (yaşadığı yer) ve olay, sahne, yolculuk bulunmaları. */
interface Bulunus { yer: string; aralik: Aralik; dayanak: string; tarihsiz: boolean }
function bulunuslar(e: EvrenVt): Map<string, Bulunus[]> {
  const m = new Map<string, Bulunus[]>();
  const ekle = (kisi: string, b: Bulunus) => m.set(kisi, [...(m.get(kisi) ?? []), b]);
  for (const r of e.db.selectObjects(`SELECT i.a, i.b, i.baslangic, i.bitis, y.ad FROM iliskiler i JOIN kayitlar p ON p.kod=i.a JOIN kayitlar y ON y.kod=i.b
      WHERE i.tur='yasar' AND i.silindi IS NULL AND i.karar<>'vazgecildi' AND p.silindi IS NULL AND y.silindi IS NULL AND y.karar<>'vazgecildi'`)) {
    const bas = r.baslangic ? (JSON.parse(r.baslangic as string) as EvrenTarihi).eksen : null;
    const son = r.bitis ? (JSON.parse(r.bitis as string) as EvrenTarihi).eksen : null;
    const aralik = { enErken: bas?.enErken ?? null, enGec: son?.enGec ?? null };
    ekle(yonlendir(e.db, r.a as string), { yer: yonlendir(e.db, r.b as string), aralik, dayanak: `${r.ad} içinde yaşıyor`, tarihsiz: !bas && !son });
  }
  for (const x of fizikselBulunmalar(e)) {
    if (x.tarih.eksen) ekle(x.kisi.kod, { yer: x.yer.kod, aralik: x.tarih.eksen, dayanak: `“${x.dayanak.ad}”`, tarihsiz: false });
  }
  return m;
}

/** Parçası olma: bir yer, onu kapsayan yerle "aynı yerde" sayılır (handa olan şehirdedir). */
function kapsamaUyumu(e: EvrenVt) {
  const ust = new Map<string, string[]>();
  for (const r of e.db.selectObjects(`SELECT a, b FROM iliskiler WHERE tur='parca' AND silindi IS NULL AND karar<>'vazgecildi'`)) ust.set(r.a as string, [...(ust.get(r.a as string) ?? []), r.b as string]);
  const onbellek = new Map<string, Set<string>>();
  const kapsayan = (k: string) => {
    let s = onbellek.get(k);
    if (s) return s;
    s = new Set<string>();
    const kuyruk = [k];
    while (kuyruk.length) for (const u of ust.get(kuyruk.pop()!) ?? []) if (!s.has(u)) { s.add(u); kuyruk.push(u); }
    onbellek.set(k, s);
    return s;
  };
  // Ortak yer: ikisinden dar olanı değil, ikisini de kapsayan en dar yer (aynıysa kendisi).
  return (x: string, y: string): string | null => x === y ? x : kapsayan(x).has(y) ? y : kapsayan(y).has(x) ? x : null;
}

/** Şablon 1: aynı sorunun farklı cevaplarına inanan iki kişi hangi tarihlerde aynı yerde olabilir? */
export function farkliInananlar(e: EvrenVt, iddiaKod: string): KesifSonucu {
  const i = e.db.selectObject('SELECT kod, soru, secenekler FROM iddialar WHERE kod=? AND silindi IS NULL', [iddiaKod]);
  if (!i) throw new Error('Soru bulunamadı.');
  const sec = new Map((JSON.parse(i.secenekler as string) as { kod: string; metin: string }[]).map((s) => [s.kod, s.metin]));
  const inananlar = new Map<string, Set<string>>();
  for (const r of e.db.selectObjects(`SELECT b.bilen, b.secenek FROM bilgiler b JOIN kayitlar k ON k.kod=b.bilen
      WHERE b.iddia=? AND b.silindi IS NULL AND b.karar<>'vazgecildi' AND b.inanc IN ('inaniyor','supheleniyor') AND b.secenek IS NOT NULL
        AND k.silindi IS NULL AND k.tur<>'eser'`, [iddiaKod])) {
    const k = yonlendir(e.db, r.bilen as string);
    inananlar.set(k, (inananlar.get(k) ?? new Set()).add(r.secenek as string));
  }
  const yerleri = bulunuslar(e), uyum = kapsamaUyumu(e), ana = anaTakvim(zamanSetiOku(e.db));
  const kisiler = [...inananlar.keys()];
  const adaylar: KesifAdayi[] = [];
  let ciftler = 0, yersiz = new Set<string>(), dahaFazla = false;
  for (const k of kisiler) if (!yerleri.get(k)?.length) yersiz.add(k);
  for (let a = 0; a < kisiler.length; a++) for (let b = a + 1; b < kisiler.length; b++) {
    const ka = kisiler[a], kb = kisiler[b];
    const sa = inananlar.get(ka)!, sb = inananlar.get(kb)!;
    const farkli = [...sa].some((x) => [...sb].some((y) => x !== y));
    if (!farkli) continue;
    ciftler++;
    for (const x of yerleri.get(ka) ?? []) for (const y of yerleri.get(kb) ?? []) {
      const yer = uyum(x.yer, y.yer);
      if (!yer) continue;
      const ar = kesisim(x.aralik, y.aralik);
      if (!ar) continue;
      if (adaylar.length >= SINIR) { dahaFazla = true; continue; }
      const ki = kisa(e, ka), kj = kisa(e, kb);
      adaylar.push({
        kisiler: [ki, kj], yer: kisa(e, yer), aralik: x.tarihsiz && y.tarihsiz ? 'zamanı belirsiz' : eksenAraligi(ar, ana),
        yazi: `${ki.ad} (“${[...sa].map((s) => sec.get(s) ?? '?').join(', ')}”) ile ${kj.ad} (“${[...sb].map((s) => sec.get(s) ?? '?').join(', ')}”) bu aralıkta ${kisa(e, yer).ad} içinde karşılaşmış olabilir.`,
        dayanaklar: [`${ki.ad}: ${x.dayanak}`, `${kj.ad}: ${y.dayanak}`],
      });
    }
  }
  return {
    sablon: 'farkli_inananlar', soru: `“${i.soru}” sorusunun farklı cevaplarına inanan iki kişi hangi tarihlerde aynı yerde olabilir?`,
    adaylar, dahaFazla,
    kapsam: `${kisiler.length} inanan, ${ciftler} farklı inanan çift incelendi.${yersiz.size ? ` ${yersiz.size} kişinin kayıtlı yeri ya da tarihli bulunması yok; onlar için aday çıkmaz.` : ''}`,
    not: 'Bu yalnızca bir olasılık: kayıtlı yerleri ve tarihleri örtüşüyor. Görüştükleri, tanıştıkları ya da konuştukları söylenemez. İnançların ne zaman başladığı hesaba katılmadı.',
  };
}

/** Şablon 2: aynı şey üzerinde çelişen hak iddiası olanlar kim? Aynı konu ve aynı kapsamda, dönemleri örtüşen ve
 *  sahipleri farklı iki mülkiyet kaydı. Hangisinin haklı olduğuna program karar vermez. */
export function celisenHaklar(b: DurumBaglami): KesifSonucu {
  const e = b.e;
  const konular = new Set<string>();
  for (const r of e.db.selectObjects('SELECT tanim FROM haklar WHERE silindi IS NULL')) {
    const t = JSON.parse(r.tanim as string) as { tur: string; konu: string };
    if (t.tur === 'mulkiyet') konular.add(yonlendir(e.db, t.konu));
  }
  const adaylar: KesifAdayi[] = [];
  let dahaFazla = false, ciftler = 0;
  for (const konu of konular) {
    if (e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL AND karar<>'vazgecildi'", [konu]) === undefined) continue;
    const l = hakListesi(b, konu);
    for (const bilgi of l.bilgiler) {
      const [a, c] = bilgi.haklar.map((k) => l.konu.find((s) => s.kod === k)!);
      if (!a || !c) continue;
      const sa = new Set(a.sahipler.map((k) => k.kod)), sc = new Set(c.sahipler.map((k) => k.kod));
      if (sa.size === sc.size && [...sa].every((k) => sc.has(k))) continue;
      ciftler++;
      if (adaylar.length >= SINIR) { dahaFazla = true; continue; }
      const kisiler = [...new Map([...a.sahipler, ...c.sahipler].map((k) => [k.kod, k] as const)).values()];
      const kimler = (s: typeof a) => s.sahipler.map((k) => k.ad).join(', ');
      const tanima = (s: typeof a) => s.tanimalar.length ? s.tanimalar.map((t) => `${t.otorite.ad} ${t.durum === 'taniyor' ? 'tanıyor' : t.durum === 'tanimiyor' ? 'tanımıyor' : 'bilinmiyor'}`).join(', ') : 'tanıyan otorite yazılmamış';
      const belirsiz = bilgi.ileti.includes('belirsiz');
      adaylar.push({
        kisiler, yer: null, konu: a.konu, aralik: belirsiz ? 'dönemleri örtüşebilir; zamanı belirsiz' : 'aynı dönemde geçerli',
        yazi: `${a.konu.ad} üzerinde ${kimler(a)} ile ${kimler(c)} için ayrı mülkiyet kayıtları var${a.tanim.kapsam ? ` (kapsam: “${a.tanim.kapsam}”)` : ''}.`,
        dayanaklar: [a, c].map((s) => `${kimler(s)}: mülkiyet, ${s.zaman.toLocaleLowerCase('tr')}; ${tanima(s)}`),
      });
    }
  }
  return {
    sablon: 'celisen_haklar', soru: 'Aynı şey üzerinde çelişen hak iddiası olanlar kim?', adaylar, dahaFazla,
    kapsam: `${konular.size} konudaki mülkiyet kayıtları incelendi; ${ciftler} çelişen çift bulundu.`,
    not: 'Yalnızca aynı konu ve aynı kapsamda, sahipleri farklı ve dönemleri örtüşen mülkiyet kayıtları sayıldı. Kullanım hakkı, yetki ve izin birden çok kişide olabildiği için karşılaştırılmadı. Hangi kaydın haklı olduğuna siz karar verirsiniz.',
  };
}
