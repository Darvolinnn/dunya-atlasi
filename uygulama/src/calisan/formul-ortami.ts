// Formülün (TK8) çalışana bağlanması: yazılan adların kayıt ve alan koduna çözülmesi, saklanan formülün güncel adlarla
// gösterilmesi ve bir kişinin kayıtlı bilgileriyle değerlendirme ortamı. Burada hiçbir şey yazılmaz.
import { formulOku, formulYazisi, FORMUL_ILISKILERI, type Formul, type FormulCozucu, type FormulOrtami } from '../alan/formul';
import type { SablonAlani } from '../alan/sablon';
import { tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { TURLER, turBul } from '../alan/turler';
import { katla } from '../alan/turkce';
import { yasHesapla } from '../alan/yas';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { sablonOku, tarihDegeri } from './sablon';

const ETKIN = `i.silindi IS NULL AND i.bitis IS NULL AND i.karar<>'vazgecildi'`;

/** Bütün şablonlardaki alanlar (alanın hangi türün şablonunda olduğuyla). */
function tumAlanlar(e: EvrenVt): (SablonAlani & { turAdi: string; turKodu: string })[] {
  return TURLER.flatMap((t) => sablonOku(e, t.kod).alanlar.map((a) => ({ ...a, turAdi: t.ad, turKodu: t.kod })));
}

export function formulCozucu(e: EvrenVt): FormulCozucu {
  const alanlar = tumAlanlar(e);
  const z = zamanSetiOku(e.db);
  return {
    kayitlar: (ad) => {
      const k = katla(ad);
      return e.db.selectObjects('SELECT kod, ad, tur FROM kayitlar WHERE silindi IS NULL').filter((r) => katla(r.ad as string) === k)
        .map((r) => ({ kod: r.kod as string, ad: r.ad as string, turAdi: turBul(r.tur as string).ad }));
    },
    alanlar: (ad) => alanlar.filter((a) => katla(a.ad) === katla(ad)),
    tarih: (s) => tarihCoz(s.slice(0, 120), z),
  };
}

/** Yazılan formülü okur (hata konumlu FormulHatasi atar). Boş yazı formül yok demektir. */
export function formulCoz(e: EvrenVt, yazi: string | null | undefined): Formul | null {
  const s = String(yazi ?? '').trim();
  return s ? formulOku(s, formulCozucu(e)) : null;
}

/** Saklanan formülün güncel adlarla yazısı. Silinmiş kayıt ya da kalkmış alan da adıyla (ya da işaretle) görünür. */
export function formulGoster(e: EvrenVt, f: Formul): string {
  const alanlar = tumAlanlar(e);
  return formulYazisi(f, {
    kayit: (kod) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [yonlendir(e.db, kod)]) as string | undefined) ?? 'Silinmiş kayıt',
    alan: (kod) => alanlar.find((a) => a.kod === kod)?.ad ?? 'Kaldırılmış alan',
    secenek: (alan, kod) => alanlar.find((a) => a.kod === alan)?.secenekler?.find((s) => s.kod === kod)?.ad ?? 'Kaldırılmış seçenek',
  });
}

/** Bir kişinin (isteğe bağlı bir tarihteki) kayıtlı bilgileri. Yalnızca kişinin kendi alan değerleri okunur. */
export function formulOrtami(e: EvrenVt, kisi: string, tarih: EvrenTarihi | null): FormulOrtami {
  const tur = e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [kisi]) as string;
  const kendi = sablonOku(e, tur).alanlar;
  let tum: SablonAlani[] | null = null;
  return {
    iliski: (iliski, kayit) => FORMUL_ILISKILERI.some((x) => x.kod === iliski)
      && e.db.selectValue(`SELECT 1 FROM iliskiler i WHERE i.a=? AND i.b=? AND i.tur=? AND ${ETKIN}`, [kisi, yonlendir(e.db, kayit), iliski]) !== undefined,
    kayitAdi: (kod) => (e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=? AND silindi IS NULL', [yonlendir(e.db, kod)]) as string | undefined) ?? null,
    alanTanimi: (kod) => kendi.find((a) => a.kod === kod) ?? (tum ??= tumAlanlar(e)).find((a) => a.kod === kod) ?? null,
    alan: (kod) => {
      if (!kendi.some((a) => a.kod === kod)) return { durum: 'konu_disi' };
      if (e.db.selectValue('SELECT 1 FROM alan_yazanlari WHERE nesne=? AND alan=? GROUP BY alan HAVING count(DISTINCT deger)>1', [kisi, `f:${kod}`]) !== undefined) return { durum: 'celiskili' };
      const ham = e.db.selectValue('SELECT deger FROM alan_degerleri WHERE kayit=? AND alan=?', [kisi, kod]) as string | undefined;
      const deger = ham === undefined ? null : JSON.parse(ham);
      return deger === null ? { durum: 'bos' } : { durum: 'var', deger };
    },
    yas: () => {
      if (!tarih) return { neden: 'Yaş için tarih verilmedi.' };
      const dogum = tarihDegeri(e, kisi, 'dogum');
      if (!dogum) return { neden: 'Doğum tarihi yazılmamış.' };
      const y = yasHesapla(dogum, tarih, tarihDegeri(e, kisi, 'olum'), zamanSetiOku(e.db));
      if (!y || (y.enAz === null && y.enCok === null)) return { neden: 'Yaş bu tarihlerden hesaplanamıyor.' };
      return { enAz: y.enAz, enCok: y.enCok };
    },
  };
}
