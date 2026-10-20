// Seri sayfasının plan bölümleri (K27): olası finaller, başka serilerden kitaplar ve okuma yolları. Olası final bir
// soru değil ayrı bir olay kaydıdır; birbirinin alternatifidir ve biri seçilince öbürleri silinmez. Okuma yolu
// okurun kitapları izleyebileceği adlandırılmış bir sıradır; önerilen okuma sırası ağaçtaki sıradır.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { Kayit, KisaKayit, SeriPlani } from '../veri/api';
import { KararRozeti } from './ortak';
import { KayitSec } from './KayitBolumleri';
import { useYukle, type SeriListesi } from './Anlati';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;

export function SeriPlaniBolumleri({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [p] = useYukle<SeriPlani>(istemci, evren, () => istemci.iste('seriPlani', { evren, seri: kayit.kod }), [kayit.kod]);
  if (!p) return null;
  return <>
    <EkKitaplar istemci={istemci} evren={evren} p={p} />
    <OlasiFinaller istemci={istemci} evren={evren} p={p} />
    <OkumaYollari istemci={istemci} evren={evren} p={p} />
  </>;
}

function EkKitaplar({ istemci, evren, p }: { istemci: Istemci; evren: string; p: SeriPlani }) {
  const [l] = useYukle<SeriListesi>(istemci, evren, () => istemci.iste('seriler', { evren }), [p.seri.kod]);
  const [hata, setHata] = useState<string | null>(null);
  const yap = (is: Promise<unknown>) => is.then(() => setHata(null), (e) => setHata(hataYaz(e)));
  // Eklenebilecekler: başka bir serinin kitapları (serisiz kitap doğrudan bu serinin içine alınır).
  const adaylar = (l?.seriler ?? []).filter((s) => s.kod !== p.seri.kod).flatMap((s) => s.eserler.map((x) => ({ ...x, seri: s.ad })))
    .filter((x) => !p.ekUyeler.some((y) => y.kod === x.kod));
  if (!p.ekUyeler.length && !adaylar.length) return null;
  return (
    <section class="seri-ek" aria-label="Başka serilerden kitaplar">
      <h3>Başka serilerden kitaplar</h3>
      <p class="soluk kucuk">Bir kitap ağaçta tek bir serinin altında durur (ana serisi). Yan seri ya da antoloji gibi başka serilere de buradan eklenebilir; ana serisi değişmez.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      {p.ekUyeler.length > 0 && <ul>{p.ekUyeler.map((x) => (
        <li key={x.kod} class="satir">
          <a href={`#/e/${evren}/k/${x.kod}`}>{x.ad}</a>
          {x.anaSeri && <span class="soluk kucuk">Ana serisi: <a href={`#/e/${evren}/k/${x.anaSeri.kod}`}>{x.anaSeri.ad}</a></span>}
          <button class="dugme sade kucuk" aria-label={`${x.ad}: bu seriden çıkar`} title="Bu seriden çıkar (kitap silinmez)" onClick={() => yap(istemci.iste('iliskiSil', { evren, kod: x.bag }))}>×</button>
        </li>
      ))}</ul>}
      {adaylar.length > 0 && (
        <select class="girdi kucuk-secim" aria-label="Başka seriden kitap ekle" value="" onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          if (v) yap(istemci.iste('iliskiEkle', { evren, tur: 'seri_eseri', a: p.seri.kod, b: v }));
        }}>
          <option value="">Başka seriden kitap ekle…</option>
          {adaylar.map((x) => <option value={x.kod}>{x.ad} ({x.seri})</option>)}
        </select>
      )}
    </section>
  );
}

function OlasiFinaller({ istemci, evren, p }: { istemci: Istemci; evren: string; p: SeriPlani }) {
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const yap = (is: Promise<unknown>) => is.then(() => setHata(null), (e) => setHata(hataYaz(e)));
  const secilen = p.finaller.filter((f) => f.karar === 'kesin');
  const durum = !p.finaller.length ? '' : secilen.length === 1 ? ` · seçilen: ${secilen[0].ad}` : secilen.length > 1 ? ' · birden çok kesin' : ' · seçilmedi';
  return (
    <details class="seri-finaller" open={p.finaller.length > 0}>
      <summary><h3>Olası finaller{p.finaller.length ? ` (${p.finaller.length}${durum})` : ''}</h3></summary>
      <p class="soluk kucuk">Her olası final ayrı bir olaydır ve öbürlerinin alternatifidir. Birini kesinleştirdiğinizde program öbürlerini kendiliğinden değiştirmez, size sorar; vazgeçilenler silinmez.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      {p.finaller.length > 0 && <ul>{p.finaller.map((f) => (
        <li key={f.kod} class="satir">
          <a href={`#/e/${evren}/k/${f.kod}`}>{f.ad}</a> <KararRozeti karar={f.karar} />
          <button class="dugme sade kucuk" aria-label={`${f.ad}: olası finallerden çıkar`} title="Olası finallerden çıkar (olay silinmez)"
            onClick={async () => { if (await onayla(`“${f.ad}” olası finaller listesinden çıkarılsın mı? Olay kaydı silinmez.`)) yap(istemci.iste('iliskiSil', { evren, kod: f.bag })); }}>×</button>
        </li>
      ))}</ul>}
      <div class="satir">
        <input class="girdi kucuk-girdi" lang="tr" aria-label="Olası finalin adı" placeholder="Olası final (ör. Vergi halka devredilir)" value={ad}
          onInput={(e) => setAd((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && ad.trim()) { yap(istemci.iste('olasiFinalEkle', { evren, seri: p.seri.kod, ad })); setAd(''); } }} />
        <button class="dugme sade kucuk" disabled={!ad.trim()} onClick={() => { yap(istemci.iste('olasiFinalEkle', { evren, seri: p.seri.kod, ad })); setAd(''); }}>+ Olası final</button>
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Var olan bir olayı ekle"
          sec={(s) => { if (s) yap(istemci.iste('olasiFinalBagla', { evren, seri: p.seri.kod, olay: s.kod })); }} />
      </div>
    </details>
  );
}

type YolTaslagi = { kod: string | null; ad: string; eserler: string[] };

function OkumaYollari({ istemci, evren, p }: { istemci: Istemci; evren: string; p: SeriPlani }) {
  const [hata, setHata] = useState<string | null>(null);
  const uyeler: KisaKayit[] = [...p.kitaplar, ...p.ekUyeler.filter((x) => !p.kitaplar.some((y) => y.kod === x.kod))];
  const ad = new Map(uyeler.map((x) => [x.kod, x.ad]));
  const yollar: YolTaslagi[] = p.okumaYollari.map((y) => ({ kod: y.kod, ad: y.ad, eserler: y.eserler.map((x) => x.kod) }));
  const yaz = (l: YolTaslagi[]) => istemci.iste('okumaYollariYaz', { evren, seri: p.seri.kod, yollar: l }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  const degistir = (i: number, y: YolTaslagi | null) => yaz(y ? yollar.map((x, j) => (j === i ? y : x)) : yollar.filter((_, j) => j !== i));
  if (!uyeler.length) return null;
  return (
    <details class="seri-yollar" open={yollar.length > 0}>
      <summary><h3>Okuma yolları{yollar.length ? ` (${yollar.length})` : ''}</h3></summary>
      <p class="soluk kucuk">Önerilen okuma sırası yukarıdaki kitap sırasıdır. Okurun izleyebileceği başka bir sıra (yayın sırası, olayların sırası, yalnız ana kitaplar…) burada adlandırılır. Kitap sonunda açık kalanlar bu yola göre de gösterilebilir. Tarihler ve okurun bir kitaptaki bilgisi değişmez.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      {yollar.map((y, i) => (
        <div key={y.kod ?? i} class="okuma-yolu">
          <div class="satir">
            <input class="girdi kucuk-girdi" lang="tr" aria-label="Okuma yolunun adı" value={y.ad}
              onBlur={(e) => { const v = (e.target as HTMLInputElement).value; if (v !== y.ad) degistir(i, { ...y, ad: v }); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            <button class="dugme sade kucuk" onClick={async () => { if (await onayla(`“${y.ad}” okuma yolu silinsin mi? Kitaplar silinmez.`)) degistir(i, null); }}>Yolu sil</button>
          </div>
          <ol class="yapi-sahneler">
            {y.eserler.map((k, j) => (
              <li key={k} class="satir">
                <span class="soluk kucuk yapi-no">{j + 1}.</span>
                <a href={`#/e/${evren}/k/${k}`}>{ad.get(k) ?? k}</a>
                <span class="bosluk" />
                <button class="dugme sade kucuk" disabled={j === 0} aria-label={`${ad.get(k)}: yolda yukarı`} onClick={() => { const l = [...y.eserler]; [l[j - 1], l[j]] = [l[j], l[j - 1]]; degistir(i, { ...y, eserler: l }); }}>↑</button>
                <button class="dugme sade kucuk" disabled={j === y.eserler.length - 1} aria-label={`${ad.get(k)}: yolda aşağı`} onClick={() => { const l = [...y.eserler]; [l[j + 1], l[j]] = [l[j], l[j + 1]]; degistir(i, { ...y, eserler: l }); }}>↓</button>
                <button class="dugme sade kucuk" aria-label={`${ad.get(k)}: yoldan çıkar`} onClick={() => degistir(i, { ...y, eserler: y.eserler.filter((x) => x !== k) })}>×</button>
              </li>
            ))}
          </ol>
          {uyeler.some((x) => !y.eserler.includes(x.kod)) && (
            <select class="girdi kucuk-secim" aria-label="Yola kitap ekle" value="" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) degistir(i, { ...y, eserler: [...y.eserler, v] }); }}>
              <option value="">Yola kitap ekle…</option>
              {uyeler.filter((x) => !y.eserler.includes(x.kod)).map((x) => <option value={x.kod}>{x.ad}</option>)}
            </select>
          )}
        </div>
      ))}
      <button class="dugme sade kucuk" onClick={() => yaz([...yollar, { kod: null, ad: `Okuma yolu ${yollar.length + 1}`, eserler: p.kitaplar.map((x) => x.kod) }])}>+ Okuma yolu</button>
    </details>
  );
}
