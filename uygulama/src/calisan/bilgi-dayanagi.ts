// Bilgi dayanağı (K38, C3, §9.1): yazar metindeki bir parçayı bir karakterin bilgi kaydına bağlar ("Bilgiye
// dayanıyor"). Bağ, metin işaretidir; bağlı bilgi `bilgi:<kod>` diye tutulur. Denetim, karakterin o bilgiyi
// öğrendiği tarih ya da sahneyle işaretli metnin sahnesini karşılaştırır. Program bağı kendisi kurmaz (K1).
import { INANCLAR } from '../alan/bilgi';
import { karsilastir, type EvrenTarihi } from '../alan/tarih';
import type { KisaKayit } from '../veri/api';
import { sinirBilgisi, type DurumBaglami } from './durum';
import { eserYapisi } from './anlati';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

const oku = (s: unknown) => { try { return typeof s === 'string' && s ? JSON.parse(s) : null; } catch { return null; } };
const kisa = (e: EvrenVt, kod: string): KisaKayit => {
  const r = e.db.selectObject('SELECT kod, ad, tur, silindi FROM kayitlar WHERE kod=?', [kod]);
  return r && !r.silindi ? { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string } : { kod, ad: 'Silinmiş kayıt', tur: 'diger' };
};
function olayTarihi(e: EvrenVt, kod: string): EvrenTarihi | null {
  const r = e.db.selectObject('SELECT tarih, sahne_olayi FROM kayitlar WHERE kod=?', [kod]);
  if (!r) return null;
  if (r.tarih) return oku(r.tarih);
  return r.sahne_olayi ? oku(e.db.selectValue('SELECT tarih FROM kayitlar WHERE kod=?', [r.sahne_olayi as string])) : null;
}
const baglam = (e: EvrenVt): DurumBaglami => ({ e, yaz: () => { throw new Error('Okuma'); }, olayTarihi: (k) => olayTarihi(e, yonlendir(e.db, k) as string) });

/** Bilgi kaydının kısa yazısı: soru, inandığı cevap, inanç, öğrenme zamanı ya da sahnesi. */
export function bilgiYazisi(e: EvrenVt, kod: string): string | null {
  const r = e.db.selectObject('SELECT b.secenek, b.inanc, b.sahne, b.baslangic, i.soru, i.secenekler FROM bilgiler b JOIN iddialar i ON i.kod=b.iddia WHERE b.kod=? AND b.silindi IS NULL AND i.silindi IS NULL', [kod]);
  if (!r) return null;
  const sec = (oku(r.secenekler) as { kod: string; metin: string }[] | null)?.find((x) => x.kod === r.secenek);
  const inanc = INANCLAR.find((x) => x.kod === r.inanc)?.ad.toLocaleLowerCase('tr-TR') ?? '';
  const bas = sinirBilgisi(baglam(e), oku(r.baslangic));
  const ne = [bas?.tarih?.ifade ? `başlangıç: ${bas.tarih.ifade}` : bas?.olay ? `${bas.olay.ad} olayından` : '', r.sahne ? `“${kisa(e, r.sahne as string).ad}” sahnesinde` : ''].filter(Boolean).join(', ');
  return `${r.soru}${sec ? ` → ${sec.metin}` : ''} · ${inanc}${ne ? ` · ${ne}` : ''}`;
}

/** Bir karakterin işaretin bağlanabileceği bilgi kayıtları. */
export function bilgiAlanlari(e: EvrenVt, bilen: string): { kod: string; ad: string; grup: string }[] {
  return e.db.selectObjects('SELECT kod FROM bilgiler WHERE bilen=? AND silindi IS NULL ORDER BY olusturma', [bilen])
    .flatMap((r) => { const ad = bilgiYazisi(e, r.kod as string); return ad ? [{ kod: `bilgi:${r.kod}`, ad, grup: 'Bildikleri' }] : []; });
}

/** Bu kaydın metnindeki "bilgiye dayanıyor" işaretlerinin kodları (editörde ayrı renkle gösterilir). */
export function bilgiIsaretKodlari(e: EvrenVt, kayit: string): string[] {
  return e.db.selectObjects("SELECT kod FROM metin_isaretleri WHERE kayit=? AND silindi IS NULL AND hedef_alan LIKE 'bilgi:%'", [yonlendir(e.db, kayit) as string]).map((r) => r.kod as string);
}

export interface BilgiBulgusu {
  anahtar: string; hukum: 'celiski' | 'olasi'; baslik: string; dayanak: string; kayitlar: KisaKayit[]; fikir: boolean; imza: string;
}

/** Sahnelerin okuma sırası: aynı eserdeki sıra (eser, sıra). */
function okumaYeri(e: EvrenVt): Map<string, [string, number]> {
  const m = new Map<string, [string, number]>();
  for (const r of e.db.selectObjects("SELECT kod FROM kayitlar WHERE tur='eser' AND silindi IS NULL")) {
    const y = eserYapisi(e, r.kod as string);
    for (const s of [...y.dogrudan, ...y.bolumler.flatMap((b) => b.sahneler)]) if (!m.has(s.kod)) m.set(s.kod, [r.kod as string, s.sira]);
  }
  return m;
}

/**
 * Davranışın dayandığı bilgi: işaretli metnin sahnesi bilginin öğrenildiği andan önceyse bulgu. Önce tarihler
 * karşılaştırılır (öğrenme: bilginin başlangıcı, yoksa öğrenildiği sahnenin tarihi). Tarih yoksa iki sahne aynı
 * eserdeyse okuma sırası karşılaştırılır (olası uyuşmazlık: anlatı geriye dönüş yapıyor olabilir). İkisi de yoksa denetlenemedi.
 */
export function bilgiDenetimi(e: EvrenVt): { bulgular: BilgiBulgusu[]; denetlenen: number; denetlenemeyen: number } {
  const isaretler = e.db.selectObjects(`SELECT m.kod, m.kayit, m.hedef_alan, m.metin, k.karar FROM metin_isaretleri m JOIN kayitlar k ON k.kod=m.kayit
    WHERE m.silindi IS NULL AND m.hedef_alan LIKE 'bilgi:%' AND k.silindi IS NULL AND k.karar<>'vazgecildi' ORDER BY m.olusturma`);
  const bulgular: BilgiBulgusu[] = [];
  let denetlenen = 0, denetlenemeyen = 0;
  let sira: Map<string, [string, number]> | null = null;
  const b = baglam(e);
  for (const m of isaretler) {
    const bk = (m.hedef_alan as string).slice(6);
    const r = e.db.selectObject('SELECT bilen, sahne, baslangic, karar FROM bilgiler WHERE kod=? AND silindi IS NULL', [bk]);
    if (!r || r.karar === 'vazgecildi') continue;
    const sahne = yonlendir(e.db, m.kayit as string) as string;
    const ogrenmeSahnesi = r.sahne ? yonlendir(e.db, r.sahne as string) as string : null;
    if (ogrenmeSahnesi === sahne) { denetlenen++; continue; }
    const kisi = kisa(e, yonlendir(e.db, r.bilen as string) as string), metinKaydi = kisa(e, sahne);
    const yazi = bilgiYazisi(e, bk) ?? 'bilgi';
    const parca = m.metin ? `“${String(m.metin).slice(0, 80)}”` : 'İşaretli parça';
    const sahneT = olayTarihi(e, sahne);
    const ogrenme = sinirBilgisi(b, oku(r.baslangic))?.tarih ?? (ogrenmeSahnesi ? olayTarihi(e, ogrenmeSahnesi) : null);
    const nerede = ogrenmeSahnesi ? `“${kisa(e, ogrenmeSahnesi).ad}” sahnesinde` : '';
    const kayitlar = [kisi, metinKaydi, ...(ogrenmeSahnesi ? [kisa(e, ogrenmeSahnesi)] : [])];
    const fikir = m.karar === 'fikir' || r.karar === 'fikir';
    if (sahneT?.eksen && ogrenme?.eksen) {
      denetlenen++;
      const k = karsilastir(sahneT, ogrenme);
      if (k === 'sonra') continue;
      bulgular.push({
        anahtar: `denetim:bilgi:${m.kod}`, hukum: k === 'once' ? 'celiski' : 'olasi', kayitlar, fikir,
        baslik: `${kisi.ad} “${yazi.split(' · ')[0]}” bilgisine göre davranıyor (${metinKaydi.ad}, ${sahneT.ifade}), ama bunu ${ogrenme.ifade}${nerede ? ` ${nerede}` : ''} öğreniyor`,
        dayanak: `${parca} “bilgiye dayanıyor” diye işaretlendi. Sahnenin tarihi ${sahneT.ifade}; bilginin başladığı an ${ogrenme.ifade}.${k === 'belirsiz' ? ' Tarihlerin hassasiyeti hangisinin önce olduğunu ayırmaya yetmiyor.' : ''}`,
        imza: JSON.stringify([sahneT.eksen, ogrenme.eksen]),
      });
      continue;
    }
    sira ??= okumaYeri(e);
    const a = sira.get(sahne), o = ogrenmeSahnesi ? sira.get(ogrenmeSahnesi) : undefined;
    if (a && o && a[0] === o[0]) {
      denetlenen++;
      if (a[1] > o[1]) continue;
      bulgular.push({
        anahtar: `denetim:bilgi:${m.kod}`, hukum: 'olasi', kayitlar, fikir,
        baslik: `${kisi.ad} “${yazi.split(' · ')[0]}” bilgisine göre davranıyor (${metinKaydi.ad}), ama bunu okuma sırasında daha sonra, ${nerede} öğreniyor`,
        dayanak: `${parca} “bilgiye dayanıyor” diye işaretlendi. Tarihler karşılaştırılamadığı için okuma sırasına bakıldı: ${metinKaydi.ad} ${a[1]}. sırada, öğrenme ${o[1]}. sırada. Anlatı geriye dönüş yapıyorsa sorun olmayabilir.`,
        imza: JSON.stringify([a, o]),
      });
      continue;
    }
    denetlenemeyen++;
  }
  return { bulgular, denetlenen, denetlenemeyen };
}
