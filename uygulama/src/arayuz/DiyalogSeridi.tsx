// "Yalnız diyaloglar" açıkken metnin üstündeki şerit (K38, A4): sahnedekilerin kayıtlı dilleri ve yeterlilikleri,
// evrenin izinli hitap sözlükleri. Kimin konuştuğu metinden çıkarılmaz (K1); yalnız kayıtlı olan gösterilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { DilYeterliligi, KisiDili, SahneBaglami, Sozluk, YeterlilikDuzeyi } from '../veri/api';

const DUZEY: Record<YeterlilikDuzeyi, string> = { yok: 'hiç', az: 'az', orta: 'orta', iyi: 'iyi', ana: 'ana dili' };
const BECERI: [keyof Omit<DilYeterliligi, 'not'>, string][] = [['konusma', 'konuşma'], ['anlama', 'anlama'], ['okuma', 'okuma'], ['yazma', 'yazma']];
const yeterlilik = (y: DilYeterliligi | null) => {
  const l = y ? BECERI.filter(([k]) => y[k]).map(([k, ad]) => `${ad} ${DUZEY[y[k]!]}`) : [];
  return l.length ? ` (${l.join(', ')})` : '';
};

export function DiyalogSeridi({ istemci, evren, baglam }: { istemci: Istemci; evren: string; baglam: SahneBaglami | null }) {
  const kisiler = baglam?.katilimcilar ?? [];
  const [diller, setDiller] = useState<Record<string, KisiDili[]>>({});
  const [hitaplar, setHitaplar] = useState<Sozluk[]>([]);
  const anahtar = kisiler.map((k) => k.kod).join(',');
  useEffect(() => {
    let iptal = false;
    Promise.all(kisiler.map((k) => istemci.iste('kisiDilleri', { evren, kod: k.kod }).then((d) => [k.kod, d] as const, () => [k.kod, []] as const)))
      .then((l) => { if (!iptal) setDiller(Object.fromEntries(l)); });
    return () => { iptal = true; };
  }, [evren, anahtar]);
  useEffect(() => { istemci.iste('sozlukler', { evren }).then((l) => setHitaplar(l.filter((s) => s.tur === 'hitap' && !s.silindi)), () => {}); }, [evren]);

  return (
    <section class="diyalog-seridi" aria-label="Sahnedekilerin dilleri ve hitaplar">
      <p><strong>Sahnedekiler ve dilleri:</strong>{' '}
        {kisiler.length ? kisiler.map((k, i) => {
          const d = diller[k.kod] ?? [];
          return <span key={k.kod}>{i ? ' · ' : ''}{k.ad}: {d.length ? d.map((x) => `${x.dil.ad}${yeterlilik(x.yeterlilik)}`).join(', ') : <span class="soluk">dili kayıtlı değil</span>}</span>;
        }) : <span class="soluk">Sahnede kimse kayıtlı değil.</span>}
      </p>
      <p><strong>Hitaplar:</strong>{' '}
        {hitaplar.length ? hitaplar.map((s, i) => (
          <span key={s.kod}>{i ? ' · ' : ''}<span class="soluk">{s.ad}:</span> {s.girdiler.map((g) => `“${g.ifade}”${g.aciklama ? ` (${g.aciklama})` : ''}`).join(', ')}</span>
        )) : <span class="soluk">İzinli hitap sözlüğü yok.</span>}
        {' · '}<a href={`#/e/${evren}/sozluk`}>Sözlüklerde düzenle</a>
      </p>
    </section>
  );
}
