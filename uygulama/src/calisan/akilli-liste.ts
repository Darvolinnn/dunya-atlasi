// Akıllı listeler (K38, §7, §18): kaydedilmiş sorgular. Sorgu hukuk kurallarındaki formül diliyle yazılır (TK8) ve
// her açılışta yeniden hesaplanır. Sonuç §18 sorgu sözleşmesine göre gruplanır: uyuyor · bilgisi girilmemiş ·
// çelişkili · bu kayıt için geçerli değil · uymuyor. Bilgisi eksik ya da çelişkili kayıt "uymuyor" sayılmaz.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { formulDegerlendir, FormulHatasi, Hesaplanamadi, type Formul } from '../alan/formul';
import { tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { TURLER } from '../alan/turler';
import { turkceKarsilastir } from '../alan/turkce';
import type { AkilliListe, AkilliListeOzeti, AkilliListeSatiri } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { formulCoz, formulGoster, formulOrtami } from './formul-ortami';
import { zamanSetiOku } from './izdusum';

export interface ListeBaglami { e: EvrenVt; yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void }

const oku = (s: unknown) => { try { return typeof s === 'string' && s ? JSON.parse(s) : null; } catch { return null; } };

export function akilliListeler(e: EvrenVt): AkilliListeOzeti[] {
  return e.db.selectObjects('SELECT kod, ad FROM akilli_listeler WHERE silindi IS NULL').map((r) => ({ kod: r.kod as string, ad: r.ad as string }))
    .sort((a, b) => turkceKarsilastir(a.ad, b.ad));
}

const nedenYaz = (n: string) => n.replace(/\.$/, '').replace(/^./, (c) => c.toLocaleLowerCase('tr-TR'));

/** Listenin kayıtlara göre hesaplanmış hâli. Formül artık hesaplanamıyorsa (alan kaldırıldı, kayıt silindi) hata döner. */
export function akilliListe(e: EvrenVt, kod: string): AkilliListe {
  const r = e.db.selectObject('SELECT * FROM akilli_listeler WHERE kod=? AND silindi IS NULL', [kod]);
  if (!r) throw new Error('Akıllı liste bulunamadı.');
  const formul = oku(r.formul) as Formul;
  const tarih = oku(r.tarih) as EvrenTarihi | null;
  const tur = r.tur as string;
  const liste: AkilliListe = { kod, ad: r.ad as string, tur, formulYazisi: formulGoster(e, formul), tarih, hata: null,
    uyuyor: [], bilgiYok: [], celiskili: [], konuDisi: [], uymuyor: [] };
  const adaylar = e.db.selectObjects(`SELECT kod, ad, tur FROM kayitlar WHERE silindi IS NULL AND karar<>'vazgecildi'${tur ? ' AND tur=?' : ''}`, tur ? [tur] : []);
  try {
    for (const k of adaylar) {
      const o = formulOrtami(e, k.kod as string, tarih);
      let celiski = false, konu = false;
      const alan = o.alan.bind(o);
      o.alan = (a) => { const x = alan(a); if (x.durum === 'celiskili') celiski = true; if (x.durum === 'konu_disi') konu = true; return x; };
      const s = formulDegerlendir(formul, o);
      const satir: AkilliListeSatiri = { kayit: { kod: k.kod as string, ad: k.ad as string, tur: k.tur as string }, neden: s.nedenler.length ? s.nedenler.map(nedenYaz).join('; ') : null };
      if (s.sonuc === 'evet') liste.uyuyor.push({ ...satir, neden: null });
      else if (s.sonuc === 'hayir') liste.uymuyor.push({ ...satir, neden: null });
      else if (celiski) liste.celiskili.push(satir);
      else if (konu && s.nedenler.every((n) => n.endsWith('bu kayıt için geçerli değil.'))) liste.konuDisi.push(satir);
      else liste.bilgiYok.push(satir);
    }
  } catch (x) {
    if (!(x instanceof Hesaplanamadi)) throw x;
    return { ...liste, hata: x.message, uyuyor: [], bilgiYok: [], celiskili: [], konuDisi: [], uymuyor: [] };
  }
  for (const g of [liste.uyuyor, liste.bilgiYok, liste.celiskili, liste.konuDisi, liste.uymuyor]) g.sort((a, b) => turkceKarsilastir(a.kayit.ad, b.kayit.ad));
  return liste;
}

/** Listeyi yazar ya da günceller. Formül okunamıyorsa kaydedilmez (hata yeriyle döner). */
export function akilliListeYaz(b: ListeBaglami, g: { kod?: string | null; ad: string; tur: string; formul: string; tarih: string }): { kod: string } {
  const ad = String(g.ad ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!ad) throw new Error('Listeye bir ad verin.');
  if (g.tur && !TURLER.some((t) => t.kod === g.tur)) throw new Error('Kayıt türünü seçin.');
  let formul: Formul | null;
  try { formul = formulCoz(b.e, g.formul); } catch (x) { if (x instanceof FormulHatasi) throw new Error(`Formül okunamadı: ${x.message}`); throw x; }
  if (!formul) throw new Error('Listenin sorgusunu yazın.');
  const ifade = String(g.tarih ?? '').trim();
  const tarih = ifade ? tarihCoz(ifade.slice(0, 120), zamanSetiOku(b.e.db)) : null;
  if (ifade && !tarih?.eksen) throw new Error('Tarih takvime yerleştirilemedi. Takvimdeki biçimle yazın ya da boş bırakın.');
  let kod = g.kod ?? null;
  if (kod) { if (!kodGecerliMi(kod) || b.e.db.selectValue('SELECT 1 FROM akilli_listeler WHERE kod=? AND silindi IS NULL', [kod]) === undefined) throw new Error('Akıllı liste bulunamadı.'); }
  else kod = yeniKod();
  b.yaz([{ tur: 'akilli_liste_yaz', veri: { kod, ad, tur: g.tur || '', formul, tarih } }], []);
  return { kod };
}

export function akilliListeSil(b: ListeBaglami, kod: string, geriYukle = false) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT ad, silindi FROM akilli_listeler WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('Akıllı liste bulunamadı.');
  if (!!r.silindi === !geriYukle) return;
  b.yaz([{ tur: geriYukle ? 'akilli_liste_geri_yukle' : 'akilli_liste_sil', veri: { kod, ad: r.ad } }], []);
}
