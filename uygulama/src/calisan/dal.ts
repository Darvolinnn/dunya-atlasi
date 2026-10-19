// Deneme kopyası (§9.7). Dal, ana evrenin bir anına bağlı ayrı bir veritabanıdır; dalda yazılan her işlem dalın
// kendi kurulum koduyla günlüğe girer. Ana evrene otomatik birleştirme yoktur: dalda yapılan değişiklikler kayıt kayıt
// seçilir ve ana evrende yeni işlemler olarak yeniden yazılır. Karşılaştırma ortak başlangıca (dalın açıldığı an) göre
// yapılır; böylece dal, ana evrende sonradan düzeltilmiş bir bilgiyi kendisi değiştirmediyse geri getirmez.
import type { IslemGirdisi, Islem } from '../alan/islem';
import { A } from '../alan/automerge';
import { spanAyari } from '../alan/metin-sema';
import { kodGecerliMi } from '../alan/kod';
import type { AktarimBirimi, DalFarki, EvrenFarki } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { evrenFarki } from './fark';
import { metinBelgesi } from './izdusum';

export interface DalUclari { taban: EvrenVt; dal: EvrenVt; ana: EvrenVt; dalKodu: string }

/** Dalda yazılmış işlemler (ortak başlangıçtan sonra), yazıldıkları sırayla. */
export const dalIslemleri = (u: DalUclari): Islem[] => u.dal.islemler().filter((i) => i.kurulum === u.dalKodu);

const etkin = (e: EvrenVt, kod: string) => e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) !== undefined;
const var_ = (e: EvrenVt, kod: string) => e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [kod]) !== undefined;

/** İşlem verisindeki bütün kodlar (iç içe). */
function kodlar(v: unknown, sonuc: string[] = []): string[] {
  if (typeof v === 'string') { if (kodGecerliMi(v)) sonuc.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => kodlar(x, sonuc));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => kodlar(x, sonuc));
  return sonuc;
}

/** İşlemin ait olduğu birim: bir kayıt, bir ilişki ya da "diğer". */
function birimAnahtari(dal: EvrenVt, i: Islem): string {
  for (const k of kodlar(i.veri)) {
    if (dal.db.selectValue('SELECT 1 FROM iliskiler WHERE kod=?', [k]) !== undefined) return `iliski:${k}`;
    if (var_(dal, k)) return `kayit:${k}`;
    const konu = dal.db.selectValue('SELECT konu FROM durumlar WHERE kod=?', [k]) as string | undefined;
    if (konu) return `kayit:${konu}`;
  }
  return 'diger';
}

/** Birimin işlemlerinin andığı, ana evrende etkin olmayan kayıtlar. */
function gerekenler(u: DalUclari, islemler: Islem[], kendisi: string | null) {
  const s = new Map<string, { kod: string; ad: string; neden: 'dalda_yeni' | 'anada_silinmis' }>();
  for (const i of islemler) {
    for (const k of kodlar(i.veri)) {
      if (k === kendisi || s.has(k) || !var_(u.dal, k) || etkin(u.ana, k)) continue;
      const ad = (u.dal.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string) ?? 'Adsız kayıt';
      s.set(k, { kod: k, ad, neden: var_(u.ana, k) ? 'anada_silinmis' : 'dalda_yeni' });
    }
  }
  return [...s.values()];
}

export function dalFarki(u: DalUclari): DalFarki {
  const dalda = evrenFarki(u.taban, u.dal);
  const anada = evrenFarki(u.taban, u.ana);
  const simdi: EvrenFarki = evrenFarki(u.ana, u.dal);
  const gruplar = new Map<string, Islem[]>();
  for (const i of dalIslemleri(u)) {
    const a = birimAnahtari(u.dal, i);
    gruplar.set(a, [...(gruplar.get(a) ?? []), i]);
  }
  const birimler: AktarimBirimi[] = [...gruplar.entries()].map(([anahtar, islemler]) => {
    const [tur, kod] = anahtar.split(':') as ['kayit' | 'iliski' | 'diger', string | undefined];
    if (tur === 'kayit') {
      const d = dalda.kayitlar.find((x) => x.kod === kod);
      const m = anada.kayitlar.find((x) => x.kod === kod);
      const r = u.dal.db.selectObject('SELECT ad, tur FROM kayitlar WHERE kod=?', [kod!]);
      const celisen = d && m ? d.alanlar.filter((a) => m.alanlar.some((b) => b.alan === a.alan)).map((a) => a.etiket) : [];
      if (d && m && (d.durum === 'silindi') !== (m.durum === 'silindi')) celisen.push(m.durum === 'silindi' ? 'ana evrende silinmiş' : 'ana evrende değişmiş');
      return {
        anahtar, tur, baslik: (r?.ad as string) ?? 'Adsız kayıt', kayitTuru: (r?.tur as string) ?? 'diger', durum: d?.durum ?? 'degisti', islemSayisi: islemler.length,
        ayni: !simdi.kayitlar.some((x) => x.kod === kod), celisen: [...new Set(celisen)], gerekenler: gerekenler(u, islemler, kod!),
        ozet: d?.alanlar.map((a) => `${a.etiket}: ${a.once ?? 'yok'} → ${a.sonra ?? 'yok'}`) ?? [],
      };
    }
    if (tur === 'iliski') {
      const d = dalda.iliskiler.find((x) => x.kod === kod);
      const m = anada.iliskiler.find((x) => x.kod === kod);
      const ad = (k: string) => (u.dal.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string) ?? 'Silinmiş kayıt';
      const r = u.dal.db.selectObject('SELECT a, b FROM iliskiler WHERE kod=?', [kod!]);
      return {
        anahtar, tur, baslik: d ? `${d.a.ad} · ${d.tur}: ${d.b.ad}` : r ? `${ad(r.a as string)} – ${ad(r.b as string)}` : 'İlişki', kayitTuru: null,
        durum: d?.durum ?? 'degisti', islemSayisi: islemler.length, ayni: !simdi.iliskiler.some((x) => x.kod === kod),
        celisen: d && m ? ['ana evrende de değişmiş'] : [], gerekenler: gerekenler(u, islemler, null), ozet: d?.ayrinti ?? [],
      };
    }
    return { anahtar, tur, baslik: 'Diğer değişiklikler (takvim, şablon, harita…)', kayitTuru: null, durum: 'degisti', islemSayisi: islemler.length,
      ayni: false, celisen: [], gerekenler: gerekenler(u, islemler, null), ozet: [...new Set(islemler.map((i) => i.tur))] };
  });
  return { dalda, anada, birimler };
}

/** Bir değeri iç içe dolaşıp eşlenen kodları değiştirir. */
function esle(v: unknown, m: Map<string, string>): unknown {
  if (typeof v === 'string') return m.get(v) ?? v;
  if (Array.isArray(v)) return v.map((x) => esle(x, m));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, esle(x, m)]));
  return v;
}

/**
 * Seçilen birimlerin işlemlerini ana evrene yazılacak girdilere çevirir. Eşlenen kodlar değiştirilir; "açık bırakılan"
 * ya da ana evrende bulunmayan bir kaydı anan işlem yazılmaz ve geri bildirilir (bağımlılık sessizce budanmaz).
 * Ortak başlangıçta var olan bir metin, dalın hâli ana evrendeki metinle birleştirilerek taşınır.
 */
export function aktarimGirdileri(u: DalUclari, secilen: string[], eslemeler: Record<string, string>, aktor: string) {
  const istenen = new Set(secilen);
  const islemler = dalIslemleri(u).filter((i) => istenen.has(birimAnahtari(u.dal, i)));
  const m = new Map<string, string>();
  const acik = new Set<string>();
  for (const [k, v] of Object.entries(eslemeler ?? {})) {
    if (v === 'acik') acik.add(k);
    else if (kodGecerliMi(v) && etkin(u.ana, v)) m.set(k, v);
    else throw new Error('Eşlenen kayıt ana evrende bulunamadı.');
  }
  // Seçilen işlemlerin kendisinin oluşturduğu kayıtlar ana evrende de var sayılır.
  const olusan = new Set(islemler.filter((i) => i.tur === 'kayit_olustur').map((i) => i.veri.kod as string));
  const girdiler: IslemGirdisi[] = [];
  const birakilan: string[] = [];
  const metinler = new Map<string, { kayit: string; alan: string }>();
  for (const i of islemler) {
    const eksik = kodlar(i.veri).filter((k) => var_(u.dal, k) && !m.has(k) && (acik.has(k) || (!etkin(u.ana, k) && !olusan.has(k))));
    if (eksik.length) {
      const ad = (u.dal.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [eksik[0]]) as string) ?? 'adsız kayıt';
      birakilan.push(`“${ad}” ana evrende olmadığı için bir değişiklik taşınmadı`);
      continue;
    }
    if (i.tur === 'metin') {
      const kayit = i.veri.kayit as string, alan = i.veri.alan as string;
      // Ortak başlangıçta metni olan kayıtlarda dalın değişiklikleri tek tek değil, birleştirilerek taşınır.
      if (metinBelgesi(u.taban.db, kayit, alan)) { metinler.set(`${kayit}\u0000${alan}`, { kayit: m.get(kayit) ?? kayit, alan }); continue; }
    }
    girdiler.push({ tur: i.tur, veri: esle(i.veri, m) as Record<string, unknown>, ikili: i.ikili ?? null });
  }
  for (const [anahtar, { kayit, alan }] of metinler) {
    const dalKaydi = anahtar.split('\u0000')[0];
    const dd = metinBelgesi(u.dal.db, dalKaydi, alan), td = metinBelgesi(u.taban.db, dalKaydi, alan), md = metinBelgesi(u.ana.db, kayit, alan);
    if (!dd || !td || !md) continue;
    const spans = A.spans(dd, ['t']) as never;
    const simdiki = A.getHeads(md);
    const temel = A.getHeads(td);
    let yeni: typeof md;
    if (dalKaydi === kayit && A.hasHeads(md, temel)) {
      const ek = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
      const kol = A.change(A.clone(A.view(md, temel), { actor: aktor + ek }), (x) => A.updateSpans(x, ['t'], spans, spanAyari()));
      yeni = A.merge(A.clone(md, { actor: aktor }), kol);
    } else yeni = A.change(A.clone(md, { actor: aktor }), (x) => A.updateSpans(x, ['t'], spans, spanAyari()));
    const basliklar = A.getHeads(yeni);
    if (JSON.stringify([...basliklar].sort()) === JSON.stringify([...simdiki].sort())) continue;
    girdiler.push({ tur: 'metin', veri: { kayit, alan, basliklar, temel: simdiki, daldan: true }, ikili: A.saveSince(yeni, simdiki) });
  }
  return { girdiler, birakilan: [...new Set(birakilan)] };
}
