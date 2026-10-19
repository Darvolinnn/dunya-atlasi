// Yayımlanmış eser kilidi (F18, §9.7). Eser yayımlanınca evrenin o hâli adlandırılmış bir sürüm olarak saklanır.
// Eserin okura sunduğu kayıtlar (sahneler, sahnelerde geçenler, sahne metinlerinin bağlandıkları) ve aralarındaki
// ilişkiler bu sürümle karşılaştırılır. Çelişen değişiklik engellenmez; program sorar: geçmişi düzelt, yeni olay,
// alternatif devamlılık ya da baskı düzeltmesi. Eserin zamanından sonra başlayan değişiklik çelişki sayılmaz (Z6);
// kesinleşmemiş bilgi (fikir, güvenilmez anlatım) aynı kilidi taşımaz.
import type { EvrenTarihi } from '../alan/tarih';
import type { YayimCelismesi } from '../veri/api';
import { eserYapisi } from './anlati';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi } from './izdusum';
import { kayitSablonu } from './sablon';

export const YAYIM_KARARLARI = [
  { kod: 'gecmisi_duzelt', ad: 'Geçmişi düzelt', aciklama: 'Evrende doğrusu bu. Yayımlanan eser bu noktada artık eskide kaldı.' },
  { kod: 'yeni_olay', ad: 'Yeni olay', aciklama: 'Değişiklik, eserden sonra evrende olan bir şey. Tarihini eserin sonrasına koyun.' },
  { kod: 'alternatif', ad: 'Alternatif devamlılık', aciklama: 'Değişiklik başka bir devamlılığa ait. Ana devamlılık eserdeki gibi kalır.' },
  { kod: 'baski', ad: 'Baskı düzeltmesi', aciklama: 'Eser sonraki baskıda düzeltilecek.' },
] as const;
export type YayimKarari = typeof YAYIM_KARARLARI[number]['kod'];

type Aralik = [number, number];
const SONSUZ: Aralik = [-Infinity, Infinity];

function tarihAraligi(t: EvrenTarihi | null | undefined): Aralik | null {
  if (!t?.eksen) return null;
  return [t.eksen.enErken ?? -Infinity, t.eksen.enGec ?? Infinity];
}
const json = (s: unknown) => (typeof s === 'string' && s ? JSON.parse(s) : null);

/** Eserin okura sunduğu kayıtlar ve eserin evren zamanındaki aralığı (sürümdeki hâliyle). */
export function eserKapsami(v: EvrenVt, eser: string) {
  const y = eserYapisi(v, eser);
  const sahneler = [...y.dogrudan, ...y.bolumler.flatMap((b) => b.sahneler)];
  const S = sahneler.map((s) => s.kod);
  const R = new Set<string>([eser, ...y.bolumler.map((b) => b.kod), ...S]);
  if (S.length) {
    const yer = S.map(() => '?').join(',');
    for (const r of v.db.selectObjects(`SELECT a, b FROM iliskiler WHERE silindi IS NULL AND (a IN (${yer}) OR b IN (${yer}))`, [...S, ...S])) { R.add(r.a as string); R.add(r.b as string); }
    for (const r of v.db.selectObjects(`SELECT hedef FROM baglantilar WHERE kaynak IN (${yer})`, S)) if (r.hedef) R.add(r.hedef as string);
    for (const r of v.db.selectObjects(`SELECT kod FROM kayitlar WHERE sahne_olayi IN (${yer})`, S)) R.add(r.kod as string);
  }
  let alt = Infinity, ust = -Infinity, tarihsiz = !sahneler.length;
  for (const s of sahneler) {
    const a = tarihAraligi(s.tarih);
    if (!a) { tarihsiz = true; continue; }
    alt = Math.min(alt, a[0]); ust = Math.max(ust, a[1]);
  }
  // Tarihi bilinmeyen sahne varsa eserin aralığı bilinmez; bilinmeyen "sonra" sayılmaz (§2.2 kural 4).
  const aralik: Aralik = tarihsiz || alt === Infinity ? SONSUZ : [alt, ust];
  return { R, S: new Set(S), aralik };
}

function sinirAraligi(ham: unknown): Aralik | null {
  const s = json(ham);
  if (!s) return null;
  if (s.eksen !== undefined) return tarihAraligi(s);
  if (s.tarih) return tarihAraligi(s.tarih);
  return SONSUZ; // bir olaya bağlı sınır: kesin yeri hesaplanmaz
}
/** Bir zaman aralığı eserin aralığıyla kesişebilir mi? Bilinmeyen uç açık sayılır. */
function kesisir(eser: Aralik, bas: unknown, bit: unknown) {
  const b = sinirAraligi(bas), s = sinirAraligi(bit);
  const ilk = b ? b[0] : -Infinity, son = s ? s[1] : Infinity;
  return !(ilk > eser[1]) && !(son < eser[0]);
}

const ad = (e: EvrenVt, o: EvrenVt, kod: string) => {
  const r = e.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [kod]) ?? o.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [kod]);
  return r ? { kod, ad: r.ad as string, tur: r.tur as string } : { kod, ad: 'Silinmiş kayıt', tur: 'diger' };
};
const ifade = (ham: unknown): string | null => {
  const v = json(ham);
  return v ? v.ifade ?? v.tarih?.ifade ?? (v.olay ? 'bir olaya bağlı' : null) : null;
};
function alanlar(e: EvrenVt, kod: string): Map<string, { etiket: string; deger: string }> {
  const m = new Map<string, { etiket: string; deger: string }>();
  try {
    const ks = kayitSablonu(e, kod);
    for (const a of ks.sablon.alanlar) {
      const v = ks.degerler[a.kod];
      if (v === null || v === undefined || v === '') continue;
      m.set(a.kod, { etiket: a.ad, deger: typeof v === 'object' ? (v as { ifade?: string }).ifade ?? JSON.stringify(v) : String(v) });
    }
  } catch { /* yok */ }
  return m;
}

/** Sürüm (v) ile bugün (e) arasında, eserin kapsamında kalan ve eserin zamanına dokunan farklar. */
export function yayimCelismeleri(v: EvrenVt, e: EvrenVt, eser: string): Omit<YayimCelismesi, 'karar'>[] {
  const { R, S, aralik } = eserKapsami(v, eser);
  const sonuc: Omit<YayimCelismesi, 'karar'>[] = [];
  const ekle = (anahtar: string, kayit: string, baslik: string, once: string | null, sonra: string | null) => {
    if (once !== sonra) sonuc.push({ anahtar, kayit: ad(e, v, kayit), baslik, once, sonra });
  };
  for (const kod of R) {
    const a = v.db.selectObject('SELECT * FROM kayitlar WHERE kod=?', [kod]);
    if (!a || a.silindi) continue;
    // Kesinleşmemiş kayıt kilit taşımaz.
    if (a.karar !== 'kesin') continue;
    const b = e.db.selectObject('SELECT * FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]);
    if (!b) { ekle(`kayit:${kod}:silindi`, kod, 'Kayıt', 'var', 'silinmiş'); continue; }
    const kararlar = json(a.alan_kararlari) as Record<string, string> | null;
    const kesin = (alan: string) => !kararlar || !kararlar[alan] || kararlar[alan] === 'kesin';
    ekle(`kayit:${kod}:ad`, kod, 'Adı', a.ad as string, b.ad as string);
    if (kesin('tarih')) ekle(`kayit:${kod}:tarih`, kod, 'Tarihi', ifade(a.tarih), ifade(b.tarih));
    if (b.karar !== 'kesin') ekle(`kayit:${kod}:karar`, kod, 'Karar durumu', 'kesinleşmiş', b.karar === 'vazgecildi' ? 'vazgeçilmiş' : 'fikir');
    const fa = alanlar(v, kod), fb = alanlar(e, kod);
    for (const [k, x] of fa) if (kesin(k)) ekle(`kayit:${kod}:alan:${k}`, kod, x.etiket, x.deger, fb.get(k)?.deger ?? null);
    if (S.has(kod)) {
      const ma = metinBelgesi(v.db, kod, 'govde')?.t ?? '', mb = metinBelgesi(e.db, kod, 'govde')?.t ?? '';
      if (ma !== mb) ekle(`metin:${kod}`, kod, 'Sahnenin metni', `${ma.length} harf`, `${mb.length} harf`);
    }
    // Zamanla değişenler: eserin zamanına dokunanlar.
    const da = new Map(v.db.selectObjects("SELECT * FROM durumlar WHERE konu=? AND silindi IS NULL AND karar='kesin'", [kod]).map((r) => [r.kod as string, r]));
    const db_ = new Map(e.db.selectObjects('SELECT * FROM durumlar WHERE konu=? AND silindi IS NULL', [kod]).map((r) => [r.kod as string, r]));
    const yazi = (r: Record<string, unknown>) => `${r.ozellik}: ${r.deger}${r.baslangic || r.bitis ? ` (${ifade(r.baslangic) ?? '…'} – ${ifade(r.bitis) ?? '…'})` : ''}`;
    for (const [k, r] of da) {
      const s = db_.get(k);
      const once = yazi(r), sonra = s ? yazi(s) : null;
      if (once === sonra) continue;
      if (!kesisir(aralik, r.baslangic, r.bitis) && (!s || !kesisir(aralik, s.baslangic, s.bitis))) continue;
      ekle(`durum:${k}`, kod, 'Zamanla değişen', once, sonra);
    }
    for (const [k, s] of db_) {
      if (da.has(k) || v.db.selectValue('SELECT 1 FROM durumlar WHERE kod=?', [k]) !== undefined) continue;
      if (s.karar !== 'kesin' || !kesisir(aralik, s.baslangic, s.bitis)) continue;
      ekle(`durum:${k}`, kod, 'Zamanla değişen', null, yazi(s));
    }
  }
  // Eserin kapsamındaki iki kayıt arasındaki ilişkiler.
  const ilA = v.db.selectObjects("SELECT * FROM iliskiler WHERE silindi IS NULL AND karar='kesin'").filter((r) => R.has(r.a as string) && R.has(r.b as string));
  const ilB = new Map(e.db.selectObjects('SELECT * FROM iliskiler WHERE silindi IS NULL').map((r) => [r.kod as string, r]));
  const iyazi = (r: Record<string, unknown>) => `${ad(e, v, r.a as string).ad} – ${ad(e, v, r.b as string).ad} (${r.tur}${r.baslangic || r.bitis ? `, ${ifade(r.baslangic) ?? '…'} – ${ifade(r.bitis) ?? '…'}` : ''})`;
  for (const r of ilA) {
    if (S.has(r.a as string) || S.has(r.b as string)) continue; // sahne katılımı sahnenin kendisiyle birlikte okunur
    const s = ilB.get(r.kod as string);
    const once = iyazi(r), sonra = s ? iyazi(s) : null;
    if (once === sonra) continue;
    if (!kesisir(aralik, r.baslangic, r.bitis) && (!s || !kesisir(aralik, s.baslangic, s.bitis))) continue;
    ekle(`iliski:${r.kod}`, r.a as string, 'İlişki', once, sonra);
  }
  for (const [k, s] of ilB) {
    if (!R.has(s.a as string) || !R.has(s.b as string) || S.has(s.a as string) || S.has(s.b as string)) continue;
    if (v.db.selectValue('SELECT 1 FROM iliskiler WHERE kod=?', [k]) !== undefined) continue;
    if (s.karar !== 'kesin' || !kesisir(aralik, s.baslangic, s.bitis)) continue;
    ekle(`iliski:${k}`, s.a as string, 'İlişki', null, iyazi(s));
  }
  return sonuc;
}
