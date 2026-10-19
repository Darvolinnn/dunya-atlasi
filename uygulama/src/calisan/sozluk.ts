// F20 kullanım sözleşmesi (§18.2): Yazarın sözleri nerede geçiyor? En az bir sözlük girdisi gerekir.
// Eksik kapsam, tarih ve yer açıkça bildirilir. Yalnızca kayıtlı metin, anlatı, tarih ve teknoloji okunur.
// Yalnızca sözlük ve belirli kullanıma ait kabul işareti işlemle değişir. Anlam, eş anlam, kişi bilgisi ve
// dil tarihi çıkarılmaz. Kabul örneği: bölgeye yayılmadan önceki sahnede söz eşleşir, sonraki sahnede eşleşmez.
import { A } from '../alan/automerge';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { duzMetin } from '../alan/metin-sema';
import { kelimeler, turkceKarsilastir } from '../alan/turkce';
import { turGecerli } from '../alan/turler';
import { karsilastir, type EvrenTarihi } from '../alan/tarih';
import type { IslemGirdisi } from '../alan/islem';
import type { Sozluk, SozlukTanimi, SozlukDenetimi, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { metinBelgesi, yonlendir } from './izdusum';
import { teknolojiDurumu, teknolojiOku } from './teknoloji';

interface Baglam { e: EvrenVt; yaz(g: IslemGirdisi[], k: string[]): void }
const temiz = (s: unknown) => typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : '';
const okuTarih = (s: unknown): EvrenTarihi | null => s ? JSON.parse(s as string) : null;
function kayit(e: EvrenVt, kod: string, tur?: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT kod,ad,tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r || (tur && r.tur !== tur)) throw new Error('Seçilen kayıt bulunamadı ya da türü uygun değil.');
  return r as unknown as KisaKayit;
}
function sozlukVar(e: EvrenVt, kod: string) {
  if (!kodGecerliMi(kod) || !e.db.selectValue('SELECT kod FROM sozlukler WHERE kod=?', [kod])) throw new Error('Sözlük bulunamadı.');
}
function catismali(e: EvrenVt, kod: string, alan?: string) {
  return !!e.db.selectValue(`SELECT 1 FROM alan_yazanlari WHERE nesne=? ${alan ? 'AND alan=?' : ''} GROUP BY alan HAVING count(DISTINCT deger)>1 LIMIT 1`, alan ? [kod, alan] : [kod]);
}
export function sozlukler(e: EvrenVt, cop = false): Sozluk[] {
  return e.db.selectObjects(`SELECT kod,tanim,silindi FROM sozlukler WHERE silindi IS ${cop ? 'NOT ' : ''}NULL`).map((r) => ({
    ...JSON.parse(r.tanim as string) as SozlukTanimi, kod: r.kod as string, silindi: r.silindi !== null,
    catismali: catismali(e, r.kod as string, 'sozluk_tanim') || catismali(e, r.kod as string, 'sozluk_silindi'),
  })).sort((a, b) => turkceKarsilastir(a.ad, b.ad));
}
export function sozlukYaz(b: Baglam, kod: string | null, t: SozlukTanimi) {
  if (kod) sozlukVar(b.e, kod);
  if (!t || !['yasak', 'hitap', 'teknoloji'].includes(t.tur)) throw new Error('Sözlüğün türünü seçin.');
  const ad = temiz(t.ad);
  if (!ad || ad.length > 120) throw new Error('Sözlüğün adı bir ile 120 harf arasında olmalı.');
  if (!Array.isArray(t.girdiler) || !t.girdiler.length || t.girdiler.length > 500) throw new Error('Bir ile 500 arasında girdi yazın.');
  const girdiler = t.girdiler.map((g) => {
    const ifade = temiz(g?.ifade), aciklama = temiz(g?.aciklama);
    if (!ifade || ifade.length > 200 || !kelimeler(ifade).length || aciklama.length > 1000) throw new Error('Girdinin sözcüğünü ve kısa açıklamasını gözden geçirin.');
    if (g.teknoloji) {
      if (t.tur !== 'teknoloji') throw new Error('Teknoloji yalnızca teknoloji adları sözlüğünde seçilebilir.');
      kayit(b.e, g.teknoloji, 'teknoloji');
    }
    return { ifade, aciklama, teknoloji: g.teknoloji || null };
  });
  const tekil = new Set(girdiler.map((g) => JSON.stringify([kelimeler(g.ifade), g.teknoloji])));
  if (tekil.size !== girdiler.length) throw new Error('Aynı sözcüğü aynı teknolojiyle yalnızca bir kez yazın.');
  const k = t.kapsam;
  if (!k || !['evren', 'eser', 'turler', 'donem'].includes(k.tur)) throw new Error('Sözlüğün kapsamını seçin.');
  if (k.tur === 'eser' || k.tur === 'donem') kayit(b.e, k.kayit, k.tur);
  if (k.tur === 'turler' && (!Array.isArray(k.turler) || !k.turler.length || !k.turler.every(turGecerli))) throw new Error('En az bir kayıt türü seçin.');
  const kapsam: SozlukTanimi['kapsam'] = k.tur === 'evren' ? { tur: 'evren' } : k.tur === 'turler' ? { tur: 'turler', turler: [...new Set(k.turler)] } : { tur: k.tur, kayit: k.kayit };
  const tanim = { ad, tur: t.tur, girdiler, kapsam };
  kod ??= yeniKod();
  b.yaz([{ tur: 'sozluk_yaz', veri: { kod, tanim } }], []);
  return { kod };
}
export function sozlukKaldir(b: Baglam, kod: string, geri: boolean) {
  sozlukVar(b.e, kod);
  b.yaz([{ tur: geri ? 'sozluk_geri_yukle' : 'sozluk_sil', veri: { kod } }], []);
}
export function sozlukIsareti(b: Baglam, kod: string, anahtar: string, bilerek: boolean) {
  sozlukVar(b.e, kod);
  if (typeof anahtar !== 'string' || !anahtar || typeof bilerek !== 'boolean') throw new Error('İşaretlenecek eşleşme bulunamadı.');
  b.yaz([{ tur: 'sozluk_isareti', veri: { kod, anahtar, bilerek } }], []);
}

/** Sözcükler yalnızca mevcut Türkçe ayırıcıyla karşılaştırılır; dilbilgisi ya da anlam kuralı yoktur. */
export function sozlukEslesir(metin: string, ifade: string): boolean {
  const m = kelimeler(metin), g = kelimeler(ifade);
  return g.length > 0 && m.some((_, i) => g.every((s, j) => m[i + j] === s));
}

export function sozlukDenetle(e: EvrenVt): SozlukDenetimi {
  const eksikler = new Set<string>();
  const sonuc: SozlukDenetimi = { sonuclar: [], dahaFazlasi: false, denetlenen: 0, eksikler: [], guncellik: 'guncel',
    kapsam: 'Etkin sözlüklerin seçili kapsamlarındaki metinler; vazgeçilmiş ve silinmiş kayıtlar hariç.',
    not: 'Yalnızca yazarın girdiği sözcükler eşleştirilir. İzinli hitaplarda da yalnızca yazılan hitapların geçtiği yerler gösterilir. Kişinin tanıması ve sözcüğün dilde olması hakkında yorum yapılmaz.' };
  const sozluk = sozlukler(e).filter((s) => { if (s.catismali) { eksikler.add(`“${s.ad}”: sözlüğün iki cihazdaki değerleri seçilmeyi bekliyor.`); return false; } return true; });
  for (const s of sozlukler(e, true)) if (s.catismali) eksikler.add(`“${s.ad}”: sözlüğün kaldırılması veya tanımı iki cihazda farklı; önce birini seçin.`);
  const isaretler = new Set(e.db.selectObjects('SELECT sozluk,anahtar FROM sozluk_isaretleri WHERE bilerek=1').filter((r) => !catismali(e, r.sozluk as string, `sozluk_isareti:${r.anahtar}`)).map((r) => JSON.stringify([r.sozluk, r.anahtar])));
  const tarihler = new Map<string, EvrenTarihi | null>();
  const tarih = (kod: string) => {
    if (!tarihler.has(kod)) tarihler.set(kod, okuTarih(e.db.selectValue(`SELECT coalesce(k.tarih,o.tarih) FROM kayitlar k LEFT JOIN kayitlar o ON o.kod=k.sahne_olayi AND o.silindi IS NULL WHERE k.kod=?`, [kod])));
    return tarihler.get(kod)!;
  };
  const atalar = (kod: string) => {
    const l = [kod];
    for (let i = 0; i < 12; i++) {
      const ust = e.db.selectValue('SELECT a.ust FROM anlati a JOIN kayitlar k ON k.kod=a.ust WHERE a.kod=? AND k.silindi IS NULL', [l[l.length - 1]]) as string | undefined;
      if (!ust || l.includes(ust)) break;
      l.push(ust);
    }
    return l;
  };
  const uygun = (s: Sozluk, k: KisaKayit) => {
    const c = s.kapsam;
    if (c.tur === 'evren') return true;
    if (c.tur === 'turler') return c.turler.includes(k.tur);
    const hedef = e.db.selectObject('SELECT kod,tarih FROM kayitlar WHERE kod=? AND silindi IS NULL AND karar<>?', [c.kayit, 'vazgecildi']);
    if (!hedef || catismali(e, c.kayit)) { eksikler.add(`“${s.ad}”: kapsam kaydı bulunamadı ya da seçilmeyi bekleyen değerleri var.`); return false; }
    if (c.tur === 'eser') {
      const ustler = atalar(k.kod);
      if (ustler.some((u) => catismali(e, u, 'anlati'))) { eksikler.add(`“${k.ad}”: eserdeki yeri iki cihazda farklı.`); return false; }
      return ustler.includes(c.kayit);
    }
    const d = okuTarih(hedef.tarih), t = tarih(k.kod);
    if (!d?.eksen || !t?.eksen || d.eksen.enErken === null || d.eksen.enGec === null || t.eksen.enErken === null || t.eksen.enGec === null) {
      eksikler.add(`“${s.ad}”: dönemi veya tarihi yazılmamış kayıtlar taranmadı.`); return false;
    }
    return t.eksen.enErken >= d.eksen.enErken && t.eksen.enGec <= d.eksen.enGec;
  };
  const tech = new Map<string, { tara: boolean; dayanak: string }>();
  const teknoloji = (k: KisaKayit, kod: string) => {
    const anahtar = JSON.stringify([k.kod, kod]);
    const onceki = tech.get(anahtar); if (onceki) return onceki;
    const bitir = (tara: boolean, dayanak: string) => { const d = { tara, dayanak }; tech.set(anahtar, d); return d; };
    const t = tarih(k.kod);
    const yerler = e.db.selectObjects(`SELECT i.b FROM iliskiler i JOIN kayitlar y ON y.kod=i.b WHERE i.a=? AND i.tur='sahne_yeri' AND i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi' AND y.silindi IS NULL`, [k.kod]);
    const kayip = () => { eksikler.add(`“${k.ad}”: teknoloji için sahne tarihi, tek bir yer ve o bölgeye yayılma tarihi gerekli; seçilmeyi bekleyen değerler de denetlenmez.`); return bitir(false, ''); };
    if (k.tur !== 'sahne' || !t?.eksen || yerler.length !== 1 || catismali(e, kod) || !e.db.selectValue("SELECT kod FROM kayitlar WHERE kod=? AND tur='teknoloji' AND silindi IS NULL AND karar<>'vazgecildi'", [kod])) return kayip();
    const yer = yonlendir(e.db, yerler[0].b as string) as string;
    const durum = teknolojiDurumu(e, yer, t.ifade);
    if (durum.yerler.some((y) => catismali(e, y.kod)) || yerler.some((y) => catismali(e, y.b as string))) return kayip();
    const ulasma = teknolojiOku(e, kod).asamalar.filter((a) => a.asama === 'yayilma' && a.yer && durum.yerler.some((y) => y.kod === a.yer!.kod));
    if (!ulasma.length || ulasma.some((a) => !a.tarih?.eksen)) return kayip();
    const tara = ulasma.every((a) => karsilastir(t, a.tarih!) === 'once');
    if (!tara && ulasma.every((a) => karsilastir(t, a.tarih!) !== 'sonra' && JSON.stringify(t.eksen) !== JSON.stringify(a.tarih!.eksen))) eksikler.add(`“${k.ad}”: sahne tarihi ile bölgeye yayılma tarihi kesin olarak ayrılamıyor.`);
    return bitir(tara, `Sahne: ${t.ifade}. Bölgeye yayılma: ${ulasma.map((a) => `${a.yer!.ad}, ${a.tarih!.ifade}`).join('; ')}.`);
  };
  // Metinler çalışan içinde, küçük sayfalarla okunur. 501. görünür eşleşmede durulur.
  for (let sayfa = 0; ; sayfa += 100) {
    const kayitlar = e.db.selectObjects("SELECT kod,ad,tur,karar,sahne_olayi FROM kayitlar WHERE silindi IS NULL AND karar<>'vazgecildi' ORDER BY kod LIMIT 100 OFFSET ?", [sayfa]);
    if (!kayitlar.length) break;
    for (const r of kayitlar) {
      const k = r as unknown as KisaKayit;
      if (catismali(e, k.kod) || (r.sahne_olayi && catismali(e, r.sahne_olayi as string))) { eksikler.add(`“${k.ad}”: iki cihazdaki değerler seçilmeyi bekliyor.`); continue; }
      const secili = sozluk.filter((s) => uygun(s, k));
      if (!secili.length) continue;
      sonuc.denetlenen++;
      for (const m of e.db.selectObjects('SELECT alan FROM metinler WHERE kayit=? ORDER BY alan', [k.kod])) {
        const alan = m.alan as string, d = metinBelgesi(e.db, k.kod, alan);
        if (!d) continue;
        const paragraflar = duzMetin(A.spans(d, ['t']) as never).split('\n');
        for (let p = 0; p < paragraflar.length; p++) {
          const metin = paragraflar[p];
          for (const s of secili) for (const g of s.girdiler) {
            if (!sozlukEslesir(metin, g.ifade)) continue;
            const t = g.teknoloji ? teknoloji(k, g.teknoloji) : { tara: true, dayanak: 'Yazarın girdiği sözcük veya sözcük öbeği.' };
            if (!t.tara) continue;
            const anahtar = JSON.stringify([k.kod, alan, p, metin, s.ad, s.tur, s.kapsam, g, t.dayanak]);
            if (isaretler.has(JSON.stringify([s.kod, anahtar]))) continue;
            if (sonuc.sonuclar.length === 500) { sonuc.dahaFazlasi = true; sonuc.eksikler = [...eksikler].slice(0, 100); return sonuc; }
            sonuc.sonuclar.push({ anahtar, sozluk: s.kod, sozlukAdi: s.ad, ifade: g.ifade, aciklama: g.aciklama, kayit: k,
              alan, paragraf: p + 1, alinti: metin.slice(0, 240), ileti: `‘${g.ifade}’ sözcüğü ‘${s.ad}’ sözlüğündeki kuralla eşleşti`, dayanak: t.dayanak, fikir: r.karar === 'fikir' });
          }
        }
      }
    }
  }
  sonuc.eksikler = [...eksikler].slice(0, 100);
  return sonuc;
}
