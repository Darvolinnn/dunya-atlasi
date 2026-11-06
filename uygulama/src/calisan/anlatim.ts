// F28 çelişen anlatılar için iddia dosyası (§3.9). Bir soru hakkında resmî kayıt, tanık, mektup, aile anlatısı
// yan yana durur; her anlatımın kaynağı ve hangi cevabı desteklediği ya da hangisine itiraz ettiği yazarın açık
// kaydıdır. "Belgede ne yazıyor?" ile "gerçekte ne oldu?" ayrıdır: anlatımlar gerçeği değiştirmez, gerçek yazarın
// kararıdır. Kaynakların bağımsızlığı (§3.9): başka bir anlatımdan kopyalanan, tercüme edilen ya da aktarılan
// anlatım bağımsız kanıt sayılmaz; aynı kökten gelenler tek kaynak sayılır. Metinden anlam çıkarılmaz.
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { kararGecerli } from '../alan/turler';
import type { Anlatim, AnlatimTanimi, IddiaDosyasi, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';
import { ANLATIM_TURLERI, DAYANAK_TURLERI } from '../alan/anlatim';
import { belgeAilesiKoku } from './delil';


export interface AnlatimBaglami { e: EvrenVt; yaz(g: IslemGirdisi[], k: string[]): void }

function iddiaOku(e: EvrenVt, kod: string) {
  const r = kodGecerliMi(kod) ? e.db.selectObject('SELECT kod, konu, soru, secenekler, gercek FROM iddialar WHERE kod=? AND silindi IS NULL', [kod]) : undefined;
  if (!r) throw new Error('Soru bulunamadı.');
  return { kod: r.kod as string, konu: r.konu as string, soru: r.soru as string, secenekler: JSON.parse(r.secenekler as string) as { kod: string; metin: string }[], gercek: (r.gercek as string) ?? null };
}
function kisa(e: EvrenVt, kod: string | null): KisaKayit | null {
  if (!kod) return null;
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}
function satirlar(e: EvrenVt, iddia: string, cop = false) {
  return e.db.selectObjects(`SELECT kod, tanim, silindi FROM anlatimlar WHERE iddia=? AND silindi IS ${cop ? 'NOT ' : ''}NULL ORDER BY olusturma, rowid`, [iddia])
    .map((r) => ({ kod: r.kod as string, tanim: JSON.parse(r.tanim as string) as AnlatimTanimi, silindi: r.silindi !== null }));
}

export function anlatimYaz(b: AnlatimBaglami, kodGirdi: string | null, t: AnlatimTanimi) {
  const e = b.e;
  if (!t || typeof t !== 'object') throw new Error('Anlatım okunamadı.');
  const iddia = iddiaOku(e, t.iddia);
  const eski = kodGirdi ? e.db.selectObject('SELECT iddia FROM anlatimlar WHERE kod=?', [kodGirdi]) : undefined;
  if (kodGirdi && (!eski || eski.iddia !== iddia.kod)) throw new Error('Anlatım bulunamadı.');
  if (!ANLATIM_TURLERI.some((x) => x.kod === t.tur)) throw new Error('Anlatımın türünü seçin.');
  const ozet = String(t.ozet ?? '').replace(/\s+/g, ' ').trim();
  if (ozet.length > 300) throw new Error('Kısa açıklama en çok 300 karakter olabilir (boşluklar dahil).');
  let kaynak: string | null = null;
  if (t.kaynak) {
    kaynak = kodGecerliMi(t.kaynak) ? yonlendir(e.db, t.kaynak) : '';
    if (!kaynak || e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kaynak]) === undefined) throw new Error('Anlatımın kaynağı bulunamadı.');
  }
  const secenekler = new Set(iddia.secenekler.map((s) => s.kod));
  const destek = t.destek ?? null;
  if (destek !== null && !secenekler.has(destek)) throw new Error('Desteklenen cevap soruda yok.');
  const itiraz = [...new Set(Array.isArray(t.itiraz) ? t.itiraz : [])];
  if (itiraz.some((x) => !secenekler.has(x))) throw new Error('İtiraz edilen cevap soruda yok.');
  if (destek && itiraz.includes(destek)) throw new Error('Bir anlatım aynı cevabı hem destekleyemez hem de ona itiraz edemez.');
  if (destek === null && !itiraz.length) throw new Error('Anlatımın hangi cevabı desteklediğini ya da hangisine itiraz ettiğini seçin.');
  const kod = kodGirdi ?? yeniKod();
  let dayanak: string | null = null, dayanakTuru: AnlatimTanimi['dayanakTuru'] = null;
  if (t.dayanak) {
    const tum = new Map(satirlar(e, iddia.kod).map((x) => [x.kod, x.tanim]));
    if (!tum.has(t.dayanak) || t.dayanak === kod) throw new Error('Dayandığı anlatım aynı sorunun başka bir anlatımı olmalı.');
    // Döngü olmasın: dayanağın zinciri bu anlatıma geri dönmemeli.
    for (let x: string | null = t.dayanak, n = 0; x; x = tum.get(x)?.dayanak ?? null, n++) {
      if (x === kod || n > 500) throw new Error('Anlatımlar birbirine dayanarak bir döngü oluşturamaz.');
    }
    if (!DAYANAK_TURLERI.some((x) => x.kod === t.dayanakTuru)) throw new Error('Kopya, tercüme ya da aktarmadan birini seçin.');
    dayanak = t.dayanak; dayanakTuru = t.dayanakTuru;
  }
  const karar = t.karar ?? 'kesin';
  if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');
  const tanim: AnlatimTanimi = { iddia: iddia.kod, kaynak, tur: t.tur, destek, itiraz, dayanak, dayanakTuru, ozet, karar };
  b.yaz([{ tur: 'anlatim_yaz', veri: { kod, tanim, soru: iddia.soru } }], [iddia.konu, ...(kaynak ? [kaynak] : [])]);
  return { kod };
}

export function anlatimKaldir(b: AnlatimBaglami, kod: string, geri: boolean) {
  const r = kodGecerliMi(kod) ? b.e.db.selectObject('SELECT iddia, silindi FROM anlatimlar WHERE kod=?', [kod]) : undefined;
  if (!r) throw new Error('Anlatım bulunamadı.');
  if (geri === (r.silindi === null)) return;
  if (!geri && b.e.db.selectValue(`SELECT 1 FROM anlatimlar WHERE silindi IS NULL AND json_extract(tanim,'$.dayanak')=?`, [kod]) !== undefined) {
    throw new Error('Bu anlatıma dayanan başka anlatımlar var. Önce onların dayanağını değiştirin.');
  }
  const iddia = iddiaOku(b.e, r.iddia as string);
  b.yaz([{ tur: geri ? 'anlatim_geri_yukle' : 'anlatim_sil', veri: { kod, soru: iddia.soru } }], [iddia.konu]);
}

/** Sorunun dosyası: anlatımlar, kökleri ve her cevap için destek ya da itiraz durumu. */
export function iddiaDosyasi(e: EvrenVt, iddiaKod: string): IddiaDosyasi {
  const iddia = iddiaOku(e, iddiaKod);
  const l = satirlar(e, iddia.kod);
  const tum = new Map(l.map((x) => [x.kod, x.tanim]));
  // Kök: dayanak zincirinin başı; o anlatımın kaynağı bir evren içi belgeyse belgenin ailesi (F08). Aynı belgeden ya da
  // onun kopyası, tercümesi, sansürlü sürümünden gelen anlatımlar tek kaynaktır.
  const aileKoku = belgeAilesiKoku(e);
  const belgeMi = (k: string) => e.db.selectValue("SELECT 1 FROM kayitlar WHERE kod=? AND tur='belge'", [k]) !== undefined;
  const kok = (kod: string) => {
    let x = kod, n = 0;
    while (tum.get(x)?.dayanak && tum.has(tum.get(x)!.dayanak!) && n++ < 500) x = tum.get(x)!.dayanak!;
    const k = tum.get(x)?.kaynak ? yonlendir(e.db, tum.get(x)!.kaynak!) : null;
    return k && belgeMi(k) ? `belge:${aileKoku(k)}` : x;
  };
  const anlatimlar: Anlatim[] = l.map((x) => ({
    ...x.tanim, kod: x.kod, kaynakKaydi: kisa(e, x.tanim.kaynak), kok: kok(x.kod),
    catismali: !!e.db.selectValue("SELECT 1 FROM alan_yazanlari WHERE nesne=? AND alan IN ('anlatim','anlatim_silindi') GROUP BY alan HAVING count(DISTINCT deger)>1 LIMIT 1", [x.kod]),
  }));
  const sayilan = anlatimlar.filter((a) => a.karar !== 'vazgecildi');
  const cevaplar = iddia.secenekler.map((s) => {
    const destek = sayilan.filter((a) => a.destek === s.kod), itiraz = sayilan.filter((a) => a.itiraz.includes(s.kod));
    const dk = new Set(destek.map((a) => a.kok)), ik = new Set(itiraz.map((a) => a.kok));
    const durum: IddiaDosyasi['cevaplar'][number]['durum'] = dk.size && ik.size ? 'ikisi de' : dk.size ? 'destek var' : ik.size ? 'itiraz var' : 'dayanak yok';
    return { secenek: s, gercek: s.kod === iddia.gercek, durum, destek: destek.map((a) => a.kod), itiraz: itiraz.map((a) => a.kod), bagimsizDestek: dk.size, bagimsizItiraz: ik.size };
  });
  return {
    iddia: { kod: iddia.kod, soru: iddia.soru, konu: kisa(e, iddia.konu)!, gercek: iddia.gercek },
    anlatimlar, cevaplar, kaldirilan: satirlar(e, iddia.kod, true).map((x) => ({ kod: x.kod, ozet: x.tanim.ozet, kaynakKaydi: kisa(e, x.tanim.kaynak) })),
    not: 'Gerçeği anlatımlar değil, yazar belirler. Kopya, tercüme ya da aktarma yoluyla aynı kökten gelen anlatımlar ve aynı belge ailesinden gelenler tek bağımsız kaynak sayılır. Vazgeçilmiş anlatımlar hesaba katılmaz.',
  };
}
