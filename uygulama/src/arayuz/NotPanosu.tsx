// Not panosu (§4.6, K28): notlar durumlarına göre sütunlarda; türe göre süzülür, sayılar görünür. Durum
// karttaki renkli çipten tek tıkla değişir. Arşivlenenler katlı durur.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { NotSatiri } from '../veri/api';
import { NOT_DURUMLARI, NOT_TURLERI } from '../alan/sablon';
const hataYaz = (e: unknown) => (e as Error).message;

const durumAdi = (k: string) => NOT_DURUMLARI.find((d) => d.kod === k)?.ad ?? k;
const turAdi = (k: string | null) => (k ? NOT_TURLERI.find((t) => t.kod === k)?.ad ?? k : 'Türü seçilmemiş');

export function NotPanosu({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [notlar, setNotlar] = useState<NotSatiri[] | null>(null);
  const [tur, setTur] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('notPanosu', { evren }).then(setNotlar, () => {}); }, [evren, surum]);
  if (!notlar) return null;
  if (!notlar.length) return null;
  const sayi = (t: string | null) => notlar.filter((n) => n.notTuru === t).length;
  const turler = NOT_TURLERI.filter((t) => sayi(t.kod) > 0);
  const gorunen = tur === null ? notlar : notlar.filter((n) => (tur === '' ? !n.notTuru : n.notTuru === tur));
  const durumDegis = (kod: string, d: string) =>
    istemci.iste('kayitAlanYaz', { evren, kod, alan: 'not_durumu', deger: d }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  const kart = (n: NotSatiri) => (
    <li key={n.kod} class="not-karti">
      <a href={`#/e/${evren}/k/${n.kod}`} class="not-adi">{n.ad}</a>
      {n.ozet && <span class="soluk kucuk">{n.ozet}</span>}
      <span class="satir">
        <span class="soluk kucuk">{turAdi(n.notTuru)}</span>
        <span class="bosluk" />
        <select class={`not-durumu nd-${n.notDurumu}`} aria-label={`${n.ad}: notun durumu`} value={n.notDurumu}
          onChange={(e) => durumDegis(n.kod, (e.target as HTMLSelectElement).value)}>
          {NOT_DURUMLARI.map((d) => <option key={d.kod} value={d.kod}>{d.ad}</option>)}
        </select>
      </span>
    </li>
  );
  const arsiv = gorunen.filter((n) => n.notDurumu === 'arsiv');
  return (
    <section class="not-panosu" aria-label="Notlar">
      <div class="satir not-suzgeci" role="group" aria-label="Notun türüne göre süz">
        <button class={tur === null ? 'suzgec-cipi secili' : 'suzgec-cipi'} aria-pressed={tur === null} onClick={() => setTur(null)}>Bütün türler · {notlar.length}</button>
        {turler.map((t) => <button key={t.kod} class={tur === t.kod ? 'suzgec-cipi secili' : 'suzgec-cipi'} aria-pressed={tur === t.kod} onClick={() => setTur(t.kod)}>{t.ad} · {sayi(t.kod)}</button>)}
        {sayi(null) > 0 && <button class={tur === '' ? 'suzgec-cipi secili' : 'suzgec-cipi'} aria-pressed={tur === ''} onClick={() => setTur('')}>Türü seçilmemiş · {sayi(null)}</button>}
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="not-sutunlari">
        {NOT_DURUMLARI.filter((d) => d.kod !== 'arsiv').map((d) => {
          const liste = gorunen.filter((n) => n.notDurumu === d.kod);
          return (
            <div key={d.kod} class="not-sutunu">
              <h3 class="kucuk"><span class={`not-durumu nd-${d.kod} etiket`}>{d.ad}</span> · {liste.length}</h3>
              {liste.length ? <ul>{liste.map(kart)}</ul> : <p class="soluk kucuk">Bu durumda not yok.</p>}
            </div>
          );
        })}
      </div>
      {arsiv.length > 0 && <details class="not-arsivi">
        <summary class="kucuk">{durumAdi('arsiv')} · {arsiv.length}</summary>
        <ul>{arsiv.map(kart)}</ul>
      </details>}
    </section>
  );
}
