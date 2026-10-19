// F04 değişiklik masası (§9.2): bir olayın tarihini değiştirmeden önce sonucu görmek ve korunacakları seçmek.
// "Kralın ölümünü iki yıl ileri al ama kızının taç giyme yaşı değişmesin." Masa üç grubu ayırır:
// hesapla değişenler, sabit kararla çelişenler ve yalnızca bahseden metinler. Önizleme veritabanına yazmaz;
// hesap bellekte yapılır. Uygulama tek işlem grubudur (§10.4). Korumak, bağlı tarihi bugünkü yerinde yazılı
// tarihe çevirmektir; bu yalnızca tarih aynen yazıyla ifade edilebiliyorsa yapılır (yuvarlama yok).
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi } from '../alan/kod';
import { goreliCoz } from '../alan/goreli';
import { anaTakvim, cagYili, eksenAraligi, eksenYili, kaydir, karsilastir, tarihCoz, farkGecerli, type EvrenTarihi, type Fark, type ZamanSeti } from '../alan/tarih';
import { yasHesapla } from '../alan/yas';
import type { DegisiklikMasasi, MasaSatiri, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { bagimlilar, NEDEN_TURLERI } from './etki';
import { takvimOku, yonlendir, zamanSetiOku } from './izdusum';
import { tarihDegeri } from './sablon';

type Eksen = { enErken: number | null; enGec: number | null };
const ayniEksen = (a: Eksen | null | undefined, b: Eksen | null | undefined) => (a?.enErken ?? null) === (b?.enErken ?? null) && (a?.enGec ?? null) === (b?.enGec ?? null);
const t = (eksen: Eksen | null | undefined) => ({ eksen: eksen ?? null }) as EvrenTarihi;

/** Eksendeki yeri aynen veren yazılı tarih; yoksa null (yuvarlanmaz). */
export function yaziyla(eksen: Eksen | null | undefined, z: ZamanSeti): string | null {
  if (!eksen || eksen.enErken === null || eksen.enGec === null) return null;
  const ana = anaTakvim(z);
  const y1 = eksenYili(eksen.enErken, ana), y2 = eksenYili(eksen.enGec, ana);
  const c1 = cagYili(y1, ana), c2 = cagYili(y2, ana);
  const adaylar = [eksenAraligi(eksen, ana)];
  if (c1 && c2 && c1.cag === c2.cag) adaylar.push(y1 === y2 ? `${c1.cag.ad} ${c1.n}` : `${c1.cag.ad} ${c1.n}–${c2.n}`);
  adaylar.push(y1 === y2 ? String(y1) : `${y1}–${y2}`);
  for (const a of adaylar) {
    const x = tarihCoz(a, z);
    if (x?.bicim !== 'sembolik' && ayniEksen(x?.eksen, eksen)) return a;
  }
  return null;
}

function kisa(e: EvrenVt, kod: string): KisaKayit | null {
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]);
  return r ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : null;
}

interface Hesap { masa: DegisiklikMasasi; girdiler: IslemGirdisi[]; ilgili: string[] }

export function hesapla(e: EvrenVt, kodHam: string, ifade: string, koruHam: string[]): Hesap {
  const db = e.db;
  const kod = kodGecerliMi(kodHam) ? yonlendir(db, kodHam) : '';
  const olay = kod ? kisa(e, kod) : null;
  if (!olay) throw new Error('Kayıt bulunamadı.');
  const z = zamanSetiOku(db);
  const ana = takvimOku(db);
  const anaT = anaTakvim(z);
  const yazi = (x: Eksen | null | undefined) => eksenAraligi(x, anaT);
  const ham = db.selectValue('SELECT tarih FROM kayitlar WHERE kod=?', [kod]) as string | null;
  const eskiT = ham ? JSON.parse(ham) as EvrenTarihi : null;
  if (!eskiT?.eksen) throw new Error('Bu kaydın eksene yerleşen bir tarihi yok; önce tarihini yazın.');
  if (!String(ifade ?? '').trim()) throw new Error('Yeni tarihi yazın.');
  const yeniT = tarihCoz(String(ifade), z);
  if (!yeniT?.eksen || yeniT.bicim === 'sembolik') throw new Error('Yeni tarih eksene yerleşmiyor; bir yıl ya da takvim tarihi yazın.');
  const koru = new Set(Array.isArray(koruHam) ? koruHam.filter((x) => typeof x === 'string') : []);

  // Göreli tarihler ve dayanakları (izdüşümdeki çözümle aynı küme).
  const eski = new Map<string, EvrenTarihi | null>();
  const kuyruk: string[] = [];
  for (const r of db.selectObjects('SELECT k.kod, k.tarih FROM goreli_tarihler g JOIN kayitlar k ON k.kod=g.kod WHERE k.silindi IS NULL AND k.tarih IS NOT NULL')) {
    eski.set(r.kod as string, JSON.parse(r.tarih as string)); kuyruk.push(r.kod as string);
  }
  while (kuyruk.length) {
    for (const k of eski.get(kuyruk.pop()!)?.kisitlar ?? []) {
      const o = yonlendir(db, k.olay);
      if (eski.has(o)) continue;
      const r = db.selectObject('SELECT tarih FROM kayitlar WHERE kod=? AND silindi IS NULL', [o]);
      if (!r) continue;
      const ot = r.tarih ? JSON.parse(r.tarih as string) as EvrenTarihi : null;
      eski.set(o, ot);
      if (ot?.bicim === 'goreli') kuyruk.push(o);
    }
  }
  const coz = (m: Map<string, EvrenTarihi | null>) => goreliCoz(m, ana, (k) => yonlendir(db, k));
  const serbest = new Map(eski); serbest.set(kod, yeniT);
  const kuralli = coz(serbest); // korumasız sonuç

  // Değişen göreli tarihler ve korunacakların yazılı karşılığı.
  const hesap: MasaSatiri[] = [];
  const celisen: (KisaKayit & { aciklama: string })[] = [];
  const korunan = new Map<string, EvrenTarihi>();
  const degisen = new Set<string>();
  for (const [k, s] of kuralli) {
    if (k === kod || ayniEksen(s.eksen, eski.get(k)?.eksen)) continue;
    degisen.add(k);
    const anahtar = `tarih:${k}`;
    const yazili = yaziyla(eski.get(k)?.eksen, z);
    if (koru.has(anahtar) && yazili) korunan.set(k, tarihCoz(yazili, z)!);
  }
  const korunmus = new Map(serbest);
  for (const [k, x] of korunan) korunmus.set(k, x);
  const sonuc = korunan.size ? coz(korunmus) : kuralli;
  const yeniEksen = (k: string): Eksen | null => k === kod ? yeniT.eksen : korunan.has(k) ? korunan.get(k)!.eksen : degisen.has(k) ? sonuc.get(k)?.eksen ?? null : (eski.get(k) ?? null)?.eksen ?? null;
  const tarihNe = (k: string): Eksen | null => {
    if (k === kod || eski.has(k)) return yeniEksen(k);
    const r = db.selectValue('SELECT tarih FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]) as string | null | undefined;
    return r ? (JSON.parse(r) as EvrenTarihi).eksen ?? null : null;
  };
  const eskiNe = (k: string): Eksen | null => {
    const r = db.selectValue('SELECT tarih FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]) as string | null | undefined;
    return r ? (JSON.parse(r) as EvrenTarihi).eksen ?? null : null;
  };
  const kaydirilan = new Set([kod, ...[...degisen].filter((k) => !korunan.has(k))]);

  for (const k of degisen) {
    const x = kisa(e, k);
    if (!x) continue;
    const yazili = yaziyla(eski.get(k)?.eksen, z);
    const kor = korunan.has(k);
    hesap.push({ ...x, anahtar: `tarih:${k}`, aciklama: kor ? 'Tarihi bir olaya göre verilmiş; korunursa bugünkü yerinde yazılı tarih olur ve bağı kalkar.' : 'Tarihi bir olaya göre verilmiş; kendiliğinden kayar.',
      once: yazi(eski.get(k)?.eksen), sonra: kor ? `${yazi(eski.get(k)?.eksen)} (korunuyor)` : yazi(sonuc.get(k)?.eksen),
      korunabilir: !!yazili, korunuyor: kor, korunamaz: yazili ? null : 'Bugünkü yeri yazılı bir tarihle aynen ifade edilemiyor.' });
    if (kor) {
      const kural = kuralli.get(k)?.eksen;
      const kept = korunan.get(k)!.eksen;
      if (kural && kept && karsilastir(t(kept), t(kural)) !== 'belirsiz') celisen.push({ ...x, aciklama: `Korunursa “${olay.ad}” kaydına göre verilmiş kuralı artık tutmaz (kurala göre ${yazi(kural)}).` });
    }
  }
  for (const [k, s] of sonuc) {
    if (s.celiski && !eski.get(k)?.celiski) { const x = kisa(e, k); if (x) celisen.push({ ...x, aciklama: 'Tarih kısıtları birbiriyle çelişiyor; olası tarih kalmıyor.' }); }
  }

  // Olaya bağlı durum sınırları.
  const girdiler: IslemGirdisi[] = [];
  for (const r of db.selectObjects(`SELECT d.kod, d.konu, d.ozellik, d.baslangic, d.bitis FROM durumlar d JOIN kayitlar k ON k.kod=d.konu
      WHERE d.silindi IS NULL AND k.silindi IS NULL AND (d.baslangic IS NOT NULL OR d.bitis IS NOT NULL)`)) {
    for (const taraf of ['baslangic', 'bitis'] as const) {
      if (!r[taraf]) continue;
      const v = JSON.parse(r[taraf] as string) as { olay?: string | null; fark?: Fark | null };
      if (!v.olay) continue;
      const o = yonlendir(db, v.olay);
      if (!kaydirilan.has(o)) continue;
      const kay = (x: Eksen | null) => v.fark && farkGecerli(v.fark) ? kaydir(x, v.fark, ana) : x;
      const once = kay(eskiNe(o)), sonra = kay(yeniEksen(o));
      if (ayniEksen(once, sonra)) continue;
      const x = kisa(e, r.konu as string);
      if (!x) continue;
      const anahtar = `durum:${r.kod}:${taraf}`;
      const yazili = yaziyla(once, z);
      const kor = koru.has(anahtar) && !!yazili;
      hesap.push({ ...x, anahtar, aciklama: `“${r.ozellik}” durumunun ${taraf === 'baslangic' ? 'başlangıcı' : 'bitişi'} bir olaya bağlı; ${kor ? 'korunursa bugünkü yerinde yazılı tarih olur.' : 'kendiliğinden kayar.'}`,
        once: yazi(once), sonra: kor ? `${yazi(once)} (korunuyor)` : yazi(sonra), korunabilir: !!yazili, korunuyor: kor, korunamaz: yazili ? null : 'Bugünkü yeri yazılı bir tarihle aynen ifade edilemiyor.' });
      if (kor) girdiler.push({ tur: 'durum_degistir', veri: { kod: r.kod, alan: taraf, deger: { tarih: tarihCoz(yazili!, z) }, onceki: v, konu: r.konu, ozellik: r.ozellik, niyet: 'koru' } });
    }
  }

  // Katılımcıların yaşı; doğumdan önceye ya da ölümden sonraya düşme.
  for (const o of kaydirilan) {
    const oad = kisa(e, o)?.ad ?? '';
    for (const r of db.selectObjects(`SELECT DISTINCT a FROM iliskiler WHERE tur IN ('olayda','sahnede') AND b=? AND silindi IS NULL`, [o])) {
      const p = kisa(e, r.a as string);
      if (!p) continue;
      const dogum = tarihDegeri(e, p.kod, 'dogum'), olum = tarihDegeri(e, p.kod, 'olum');
      const once = t(eskiNe(o)), sonra = t(yeniEksen(o));
      if (dogum) {
        const y1 = yasHesapla(dogum, once, olum, z)?.metin ?? null, y2 = yasHesapla(dogum, sonra, olum, z)?.metin ?? null;
        if (y1 !== y2) hesap.push({ ...p, anahtar: null, aciklama: `“${oad}” sırasındaki yaşı yeniden hesaplanır.`, once: y1 ?? '—', sonra: y2 ?? '—', korunabilir: false, korunuyor: false, korunamaz: null });
        if (karsilastir(sonra, dogum) === 'once' && karsilastir(once, dogum) !== 'once') celisen.push({ ...p, aciklama: `“${oad}” bu kişinin doğumundan önceye düşüyor.` });
      }
      if (olum && karsilastir(sonra, olum) === 'sonra' && karsilastir(once, olum) !== 'sonra') celisen.push({ ...p, aciklama: `“${oad}” bu kişinin ölümünden sonraya düşüyor.` });
    }
  }

  // Neden–sonuç sırası.
  for (const r of db.selectObjects(`SELECT a, b FROM iliskiler WHERE silindi IS NULL AND karar!='vazgecildi' AND tur IN (${NEDEN_TURLERI.map(() => '?').join(',')})`, NEDEN_TURLERI)) {
    const a = yonlendir(db, r.a as string), b = yonlendir(db, r.b as string);
    if (!kaydirilan.has(a) && !kaydirilan.has(b)) continue;
    const once = karsilastir(t(eskiNe(a)), t(eskiNe(b))), sonra = karsilastir(t(tarihNe(a)), t(tarihNe(b)));
    if (sonra === 'sonra' && once !== 'sonra') {
      const ka = kisa(e, a), kb = kisa(e, b);
      if (ka && kb) celisen.push({ ...(kaydirilan.has(a) ? kb : ka), aciklama: `“${ka.ad}”, “${kb.ad}” kaydının nedeni olarak bağlı ama artık ondan sonraya düşüyor.` });
    }
  }

  const bag = bagimlilar(db, kod);
  const onceki = eskiT;
  const korumaGirdileri: IslemGirdisi[] = [...korunan].map(([k, x]) => ({ tur: 'kayit_tarih', veri: { kod: k, tarih: x, onceki: eski.get(k) ?? null, niyet: 'koru' } }));
  return {
    masa: { olay, once: yazi(eskiT.eksen), sonra: yazi(yeniT.eksen), hesap, celisen, incelenecek: bag.bagimli, bahseden: bag.bahseden },
    girdiler: [...korumaGirdileri, ...girdiler, { tur: 'kayit_tarih', veri: { kod, tarih: yeniT, onceki } }],
    ilgili: [kod, ...korunan.keys()],
  };
}
