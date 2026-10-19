// Teknolojinin düzeyleri ve yayılması, bir yerde belli tarihte teknolojiler (§4.4) ve motifin yorumları (§4.6).
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KisaKayit, MotifBilgisi, TeknolojiAsamasi, TeknolojiDurumu, TeknolojiTanimi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
const ASAMALAR: { kod: TeknolojiAsamasi['asama']; ad: string }[] = [{ kod: 'kesif', ad: 'Keşif' }, { kod: 'yayilma', ad: 'Yayılma' }, { kod: 'gundelik', ad: 'Gündelik hayata girme' }];
const asamaAdi = (k: TeknolojiAsamasi['asama']) => ASAMALAR.find((x) => x.kod === k)!.ad;
export const TEKNOLOJI_YERLERI = ['mekan', 'sehir', 'siyasi'];
type Secim = { kod: string; ad: string };

export function TeknolojiBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [t, setT] = useState<TeknolojiTanimi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [duzey, setDuzey] = useState({ alan: '', duzey: '' });
  const [asama, setAsama] = useState<{ asama: TeknolojiAsamasi['asama']; yer: Secim | null; tarih: string; not: string }>({ asama: 'kesif', yer: null, tarih: '', not: '' });
  useEffect(() => { istemci.iste('teknoloji', { evren, kod }).then(setT, (x) => setHata(hataYaz(x))); }, [kod, surum]);
  if (!t) return hata ? <p class="hata kucuk">{hata}</p> : null;
  const girdi = (x: Partial<TeknolojiTanimi>) => {
    const y = { ...t, ...x };
    return { duzeyler: y.duzeyler, asamalar: y.asamalar.map((a) => ({ asama: a.asama, yer: a.yer?.kod ?? null, tarih: a.tarih?.ifade ?? '', not: a.not })) };
  };
  const yaz = (tanim: ReturnType<typeof girdi>) => istemci.iste('teknolojiYaz', { evren, kod, tanim }).then(() => { setHata(null); return true; }, (x) => { setHata(hataYaz(x)); return false; });
  return (
    <section class="surecler" aria-label="Teknolojinin yayılması">
      <h2>Düzeyi ve yayılması</h2>
      <h3>Alanlara göre düzey</h3>
      {t.duzeyler.length > 0 && <ul class="toplanan-listesi">{t.duzeyler.map((d, i) => (
        <li key={i}><span class="soluk">{d.alan}:</span> {d.duzey} <button class="dugme sade kucuk" onClick={() => yaz(girdi({ duzeyler: t.duzeyler.filter((_, j) => j !== i) }))}>Kaldır</button></li>
      ))}</ul>}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void yaz(girdi({ duzeyler: [...t.duzeyler, duzey] })).then((ok) => ok && setDuzey({ alan: '', duzey: '' })); }}>
        <input class="girdi" style="width:140px" lang="tr" aria-label="Alan" placeholder="savaş, tarım…" value={duzey.alan} onInput={(e) => setDuzey({ ...duzey, alan: (e.target as HTMLInputElement).value })} />
        <input class="girdi" style="flex:1;min-width:140px" lang="tr" aria-label="Düzey" placeholder="o alandaki düzeyi" value={duzey.duzey} onInput={(e) => setDuzey({ ...duzey, duzey: (e.target as HTMLInputElement).value })} />
        <button class="dugme kucuk" type="submit" disabled={!duzey.alan.trim() && !duzey.duzey.trim()}>Düzey ekle</button>
      </form>
      <h3>Keşif, yayılma, gündelik hayat</h3>
      <p class="soluk kucuk">Her biri ayrı bir tarihtir. Yer seçilmezse evrenin genelinde sayılır.</p>
      {t.asamalar.length > 0 && <ul class="toplanan-listesi">{t.asamalar.map((a, i) => (
        <li key={i}><strong>{asamaAdi(a.asama)}</strong>: {a.yer ? bag(evren, a.yer) : 'genel'}, {a.tarih?.ifade ?? <span class="soluk">tarihsiz</span>}{a.not && <span class="soluk kucuk"> · {a.not}</span>}{' '}
          <button class="dugme sade kucuk" onClick={() => yaz(girdi({ asamalar: t.asamalar.filter((_, j) => j !== i) }))}>Kaldır</button></li>
      ))}</ul>}
      <form class="satir" onSubmit={(e) => {
        e.preventDefault();
        const g = girdi({});
        void yaz({ ...g, asamalar: [...g.asamalar, { asama: asama.asama, yer: asama.yer?.kod ?? null, tarih: asama.tarih, not: asama.not }] })
          .then((ok) => ok && setAsama({ asama: asama.asama, yer: null, tarih: '', not: '' }));
      }}>
        <select class="girdi kucuk-secim" aria-label="Aşama" value={asama.asama} onChange={(e) => setAsama({ ...asama, asama: (e.target as HTMLSelectElement).value as TeknolojiAsamasi['asama'] })}>
          {ASAMALAR.map((x) => <option value={x.kod}>{x.ad}</option>)}
        </select>
        <KayitSec istemci={istemci} evren={evren} secili={asama.yer} etiket="Yer (isteğe bağlı)" sec={(s) => setAsama({ ...asama, yer: s })} />
        <input class="girdi" style="width:140px" lang="tr" aria-label="Aşamanın tarihi" placeholder="tarih" value={asama.tarih} onInput={(e) => setAsama({ ...asama, tarih: (e.target as HTMLInputElement).value })} />
        <input class="girdi" style="flex:1;min-width:120px" lang="tr" aria-label="Aşamanın notu" placeholder="Not (isteğe bağlı)" value={asama.not} onInput={(e) => setAsama({ ...asama, not: (e.target as HTMLInputElement).value })} />
        <button class="dugme kucuk" type="submit">Ekle</button>
      </form>
      <p class="soluk kucuk">Kimin bildiği, üretebildiği ve kullanabildiği İlişkiler bölümünden ayrı ayrı bağlanır.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

export function TeknolojiDurumuAraci({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const [tarih, setTarih] = useState('');
  const [d, setD] = useState<TeknolojiDurumu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  return (
    <section class="surecler" aria-label="Bu yerde teknoloji">
      <details>
        <summary><h2 style="display:inline">Bu yerde hangi teknolojiler?</h2></summary>
        <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('teknolojiDurumu', { evren, yer: kod, tarih }).then((x) => { setD(x); setHata(null); }, (x) => { setD(null); setHata(hataYaz(x)); }); }}>
          <input class="girdi" style="width:160px" lang="tr" aria-label="Hangi tarihte" placeholder="tarih" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)} />
          <button class="dugme kucuk" type="submit" disabled={!tarih.trim()}>Göster</button>
        </form>
        {hata && <p class="hata kucuk">{hata}</p>}
        {d && (
          <>
            {!d.satirlar.length ? <p class="kucuk">Yayılma kaydı olan teknoloji yok.</p> : (
              <ul class="toplanan-listesi">{d.satirlar.map((s) => (
                <li key={s.teknoloji.kod}>{bag(evren, s.teknoloji)}: {s.kesin ? <strong>{asamaAdi(s.kesin)}</strong> : <span class="soluk">bu yer için kayıt yetmiyor</span>}
                  {s.belki && <span class="kucuk"> · belki {asamaAdi(s.belki).toLocaleLowerCase('tr-TR')} (tarih belirsiz)</span>}
                  {s.baskaYerde.length > 0 && <span class="soluk kucuk"> · başka yerde bilinir: {s.baskaYerde.map((x) => x.ad).join(', ')}</span>}
                  {s.dayanak.length > 0 && <div class="soluk kucuk">{s.dayanak.join(' · ')}</div>}</li>
              ))}</ul>
            )}
            <p class="soluk kucuk">Bakılan yerler: {d.yerler.map((x) => x.ad).join(', ')}. {d.not}</p>
          </>
        )}
      </details>
    </section>
  );
}

export function MotifBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [m, setM] = useState<MotifBilgisi | null>(null);
  const [yeni, setYeni] = useState<{ yorumlayan: Secim | null; donem: Secim | null; anlam: string }>({ yorumlayan: null, donem: null, anlam: '' });
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('motif', { evren, kod }).then(setM, () => {}); }, [kod, surum]);
  if (!m) return null;
  const kodlar = (l: MotifBilgisi['yorumlar']) => l.map((y) => ({ yorumlayan: y.yorumlayan?.kod ?? null, donem: y.donem?.kod ?? null, anlam: y.anlam }));
  const yaz = (yorumlar: ReturnType<typeof kodlar>) => istemci.iste('motifYorumlariYaz', { evren, kod, yorumlar }).then(() => { setHata(null); return true; }, (x) => { setHata(hataYaz(x)); return false; });
  return (
    <section class="surecler" aria-label="Motifin yorumları">
      <h2>Yorumları</h2>
      <p class="soluk kucuk">Aynı motif kültüre ve döneme göre farklı yorumlanabilir; yorumlar yan yana durur.</p>
      {m.yorumlar.length > 0 && <ul class="toplanan-listesi">{m.yorumlar.map((y, i) => (
        <li key={i}><span class="soluk">{y.yorumlayan ? y.yorumlayan.ad : 'Genel'}{y.donem ? ` (${y.donem.ad})` : ''}:</span> {y.anlam}{' '}
          <button class="dugme sade kucuk" onClick={() => yaz(kodlar(m.yorumlar.filter((_, j) => j !== i)))}>Kaldır</button></li>
      ))}</ul>}
      <form class="satir" onSubmit={(e) => {
        e.preventDefault();
        void yaz([...kodlar(m.yorumlar), { yorumlayan: yeni.yorumlayan?.kod ?? null, donem: yeni.donem?.kod ?? null, anlam: yeni.anlam }]).then((ok) => ok && setYeni({ yorumlayan: null, donem: null, anlam: '' }));
      }}>
        <KayitSec istemci={istemci} evren={evren} secili={yeni.yorumlayan} etiket="Kim yorumluyor?" sec={(s) => setYeni({ ...yeni, yorumlayan: s })} />
        <KayitSec istemci={istemci} evren={evren} secili={yeni.donem} etiket="Dönem (isteğe bağlı)" sec={(s) => setYeni({ ...yeni, donem: s })} />
        <input class="girdi" style="flex:1;min-width:160px" lang="tr" aria-label="Yorumun anlamı" placeholder="Onlara göre ne anlama gelir?" value={yeni.anlam} onInput={(e) => setYeni({ ...yeni, anlam: (e.target as HTMLInputElement).value })} />
        <button class="dugme kucuk" type="submit" disabled={!yeni.anlam.trim()}>Yorum ekle</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      <h3>Geçtiği sahneler</h3>
      {!m.sahneler.length ? <p class="soluk kucuk">Sahne bağlı değil. Sahnenin İlişkiler bölümünden “Geçen motif” bağını ekleyebilirsin.</p> : (
        <ol class="toplanan-listesi">{m.sahneler.map((s) => (
          <li key={s.sahne.kod}>{bag(evren, s.sahne)} <span class="soluk kucuk">· {s.eser ? `${s.eser.ad}, ${s.sira}. sahne` : 'esere yerleşmemiş'}</span></li>
        ))}</ol>
      )}
    </section>
  );
}
