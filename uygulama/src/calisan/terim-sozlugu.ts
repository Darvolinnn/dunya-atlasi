// Evrenin sözlüğü (K37): "Terim" türündeki kayıtlar, "sözlük" etiketi taşıyan öbür kayıtlar ve dil kayıtlarının
// sözcükleri tek alfabetik listede. Anlam kaydın özetidir. Metinde geçiş sayısı sahne metinlerinde adın (Türkçe ekli
// biçimleri de) aranmasıyla bulunur; anlam çıkarılmaz (K1).
import { bagsizAdlar, type AranacakAd } from '../alan/bagsiz-ad';
import { SOZCUK_TURLERI, SOZLUK_ETIKETI } from '../alan/sablon';
import { turkceKarsilastir } from '../alan/turkce';
import type { TerimGirdisi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { dilOku } from './dil';
import { alanDegeri } from './sablon';

const SOZ_TURU: Record<string, string> = { kok: 'kök', onek: 'ön ek', sonek: 'son ek' };

/** Sözlüğe giren kayıtlar (dil sözcükleri hariç): metinde aranacak adlarıyla. */
export function sozlukKayitlari(e: EvrenVt): TerimGirdisi[] {
  const l: TerimGirdisi[] = [];
  for (const r of e.db.selectObjects(`SELECT kod, ad, tur, ozet, lakaplar, etiketler FROM kayitlar WHERE silindi IS NULL AND (tur='terim' OR etiketler LIKE ?)`, [`%${SOZLUK_ETIKETI}%`])) {
    const etiketler = JSON.parse(r.etiketler as string) as string[];
    if (r.tur !== 'terim' && !etiketler.includes(SOZLUK_ETIKETI)) continue;
    const kod = r.kod as string;
    const tur = r.tur === 'terim' ? alanDegeri<string>(e, kod, 'sozcuk_turu') : null;
    const dil = r.tur === 'terim' ? alanDegeri<string>(e, kod, 'dil') : null;
    l.push({
      kod, ad: r.ad as string, tur: r.tur as string, anlam: (r.ozet as string) ?? '', kaynak: r.tur === 'terim' ? 'terim' : 'isaret',
      sozcukTuru: SOZCUK_TURLERI.find((x) => x.kod === tur)?.ad ?? null, dil: typeof dil === 'string' && dil.trim() ? dil.trim() : null,
      // Terim (velaşin, yemin-i sis) cümle içinde küçük harfle de yazılır; özel ad gibi büyük harf aranmaz.
      ifadeler: [...new Set([r.ad as string, ...(JSON.parse(r.lakaplar as string) as string[])].filter((x) => typeof x === 'string' && x.trim())
        .map((x) => (r.tur === 'terim' ? x.toLocaleLowerCase('tr-TR') : x)))], gecis: null,
    });
  }
  return l;
}

/** Bütün sözlük: kayıtlar (metindeki geçiş sayılarıyla) ve dillerin sözcükleri, Türkçe alfabe sırasıyla. */
export function sozlukListesi(e: EvrenVt): TerimGirdisi[] {
  const kayitlar = sozlukKayitlari(e);
  const adlar: AranacakAd[] = kayitlar.flatMap((k) => k.ifadeler.map((ifade) => ({ kod: k.kod, ifade })));
  const sayac = new Map<string, number>();
  if (adlar.length) {
    for (const r of e.db.selectObjects(`SELECT m.duz FROM metinler m JOIN kayitlar k ON k.kod=m.kayit WHERE k.tur='sahne' AND k.silindi IS NULL AND m.alan='govde'`)) {
      const bloklar = (r.duz as string).split('\n').map((metin) => ({ metin, bagli: [] as boolean[] }));
      for (const g of bagsizAdlar(bloklar, adlar, new Set(), 100_000)) for (const k of g.kodlar) sayac.set(k, (sayac.get(k) ?? 0) + 1);
    }
  }
  for (const k of kayitlar) k.gecis = sayac.get(k.kod) ?? 0;
  const diller: TerimGirdisi[] = [];
  for (const d of e.db.selectObjects(`SELECT kod, ad FROM kayitlar WHERE tur='dil' AND silindi IS NULL`)) {
    for (const s of dilOku(e, d.kod as string).sozluk) {
      diller.push({ kod: d.kod as string, ad: s.bicim, tur: 'dil', anlam: s.anlam, kaynak: 'dil', sozcukTuru: SOZ_TURU[s.tur] ?? null, dil: d.ad as string, ifadeler: [], gecis: null });
    }
  }
  return [...kayitlar, ...diller].sort((a, b) => turkceKarsilastir(a.ad, b.ad));
}
