// Evrenin sözlüğü (K37): terimler, "sözlük" etiketli kayıtlar ve dil sözcükleri; metinde geçiş sayısı. Adlar uydurmadır.
import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { metinSemasi } from '../src/alan/metin-sema';
import { bagsizAdlar } from '../src/alan/bagsiz-ad';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
const sema = metinSemasi.schema;
function kur() {
  const dbler = new Map<string, Database>();
  const h = new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
  const evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const metinYaz = (kayit: string, p: string[]) => h.metinKaydet({ evren, kayit, alan: 'govde',
    spans: pmNodeToSpans(metinSemasi, sema.node('doc', null, p.map((x) => sema.node('paragraph', null, [sema.text(x)])))) as never,
    temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
  return { h, evren, metinYaz };
}

describe('terim sözlüğü (K37)', () => {
  it('terimler, işaretli kayıtlar ve dil sözcükleri alfabetik; geçiş sayısı ekli biçimleri de sayar', () => {
    const { h, evren, metinYaz } = kur();
    const velasin = h.kayitOlustur({ evren, ad: 'Velaşin', tur: 'terim', ozet: 'Mühür kolyesi.' }).kod;
    h.kayitAlanYaz({ evren, kod: velasin, alan: 'sozcuk_turu', deger: 'ad' });
    h.kayitAlanYaz({ evren, kod: velasin, alan: 'dil', deger: 'Arşiv Dili' });
    const yol = h.kayitOlustur({ evren, ad: 'Kül Yolu', tur: 'rota', ozet: 'Eski kervan yolu.' }).kod;
    h.kayitOlustur({ evren, ad: 'Sözlükte olmayan', tur: 'esya' });
    h.kayitListe({ evren, kod: yol, liste: 'etiket', ekle: 'sözlük' });
    const dil = h.kayitOlustur({ evren, ad: 'Uydurma dil', tur: 'dil' }).kod;
    h.dilYaz({ evren, kod: dil, tanim: { heceler: [], siniflar: [], kurallar: [], ornekler: [], sozluk: [{ bicim: 'kar', anlam: 'kara', tur: 'kok' }] } });
    const sahne = h.kayitOlustur({ evren, ad: 'Uydurma sahne', tur: 'sahne' }).kod;
    metinYaz(sahne, ['Lale velaşinini boynuna astı ve Kül Yolu’na çıktı.', 'Velaşin soğuktu. Velaşinler sustu.']);
    const s = h.terimSozlugu({ evren });
    expect(s.map((x) => [x.ad, x.kaynak, x.sozcukTuru, x.dil, x.gecis])).toEqual([
      ['kar', 'dil', 'kök', 'Uydurma dil', null],
      ['Kül Yolu', 'isaret', null, null, 1],
      ['Velaşin', 'terim', 'ad', 'Arşiv Dili', 3],
    ]);
    h.kayitListe({ evren, kod: yol, liste: 'etiket', cikar: 'sözlük' });
    expect(h.sozlukIpuclari({ evren }).map((x) => x.ad)).toEqual(['Velaşin']);
  });

  it('terim cümle içinde küçük harfle yazılsa da bulunur; özel ad için büyük harf kuralı sürer', () => {
    const { h, evren } = kur();
    h.kayitOlustur({ evren, ad: 'Yemin-i Sis', tur: 'terim' });
    const [t] = h.sozlukIpuclari({ evren });
    const adlar = t.ifadeler.map((ifade) => ({ kod: t.kod, ifade }));
    expect(bagsizAdlar([{ metin: 'kâtipler yemin-i sis mırıldandı', bagli: [] }], adlar)).toHaveLength(1);
  });
});
