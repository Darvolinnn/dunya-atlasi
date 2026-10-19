// Üretim özeti ve kesinti zinciri (§15-5, F10). Bağlar ilişkiler bölümünden kurulur; burada yalnızca okunur ve
// her bağa dayanma süresi ile ikame yazılabilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { Dayaniklilik, KesintiAdimi, KesintiZinciri, KisaKayit, UretimOzeti } from '../veri/api';
import { KayitSec } from './KayitBolumleri';

const hataYaz = (e: unknown) => (e as Error).message;
export const KESINTI_TURLERI = ['urun', 'canli', 'rota', 'mekan', 'sehir', 'topluluk', 'esya', 'teknoloji'];
const BIRIMLER: { kod: Dayaniklilik['birim']; ad: string }[] = [{ kod: 'gun', ad: 'gün' }, { kod: 'hafta', ad: 'hafta' }, { kod: 'ay', ad: 'ay' }, { kod: 'yil', ad: 'yıl' }];
const dayanma = (d: Dayaniklilik) => {
  const b = BIRIMLER.find((x) => x.kod === d.birim)!.ad;
  if (d.enAz === null && d.enCok === null) return null;
  if (d.enAz !== null && d.enCok !== null && d.enAz !== d.enCok) return `${d.enAz}–${d.enCok} ${b}`;
  return d.enAz === null ? `en çok ${d.enCok} ${b}` : d.enCok === null ? `en az ${d.enAz} ${b}` : `${d.enAz} ${b}`;
};
const liste = (evren: string, l: KisaKayit[]) => l.map((k, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a></>);

export function UretimOzetiBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [o, setO] = useState<UretimOzeti | null>(null);
  useEffect(() => { istemci.iste('uretimOzeti', { evren, urun: kod }).then(setO, () => {}); }, [kod, surum]);
  if (!o) return null;
  const satirlar: [string, KisaKayit[]][] = [['Üreten', o.ureten], ['Girdileri', o.girdiler], ['Girdi olduğu ürünler', o.kullananUrunler],
    ['Fazlası olan yerler', o.fazlasiOlan], ['Açığı olan yerler', o.acigiOlan], ['Taşıyan yollar', o.tasiyanYollar], ['Ona bağımlı olanlar', o.bagimlilar]];
  return (
    <section class="surecler" aria-label="Üretim">
      <h2>Üretim</h2>
      {satirlar.every(([, l]) => !l.length) ? <p class="soluk kucuk">Üretim bağı kayıtlı değil. İlişkiler bölümünden “Üreten”, “Girdisi”, “Açığı olan yer”, “Taşıyan yol” gibi bağları ekleyebilirsiniz.</p> : (
        <ul class="toplanan-listesi">{satirlar.filter(([, l]) => l.length).map(([ad, l]) => <li key={ad}><span class="soluk">{ad}:</span> {liste(evren, l)}</li>)}</ul>
      )}
    </section>
  );
}

export function KesintiBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [acik, setAcik] = useState(false);
  const [z, setZ] = useState<KesintiZinciri | null>(null);
  useEffect(() => { if (acik) istemci.iste('kesintiZinciri', { evren, kaynak: kod }).then(setZ, () => {}); }, [acik, kod, surum]);
  return (
    <section class="surecler" aria-label="Kesinti">
      <details open={acik} onToggle={(e) => setAcik((e.target as HTMLDetailsElement).open)}>
        <summary><h2 style="display:inline">Bu kesilirse ne etkilenebilir?</h2></summary>
        {z && (
          <>
            <p class="soluk kucuk">{z.not}</p>
            {!z.adimlar.length ? <p class="soluk kucuk">Bu kayda bağlı üretim, bağımlılık ya da besin bağı kayıtlı değil.</p> : (
              <ul class="toplanan-listesi">{z.adimlar.map((a) => <KesintiSatiri key={a.kayit.kod} istemci={istemci} evren={evren} a={a} zincir={z} />)}</ul>
            )}
          </>
        )}
      </details>
    </section>
  );
}

function KesintiSatiri({ istemci, evren, a, zincir }: { istemci: Istemci; evren: string; a: KesintiAdimi; zincir: KesintiZinciri }) {
  const [duzenle, setDuzenle] = useState(false);
  const d = a.dayaniklilik;
  const sure = d ? dayanma(d) : null;
  const ikameEtkilenir = d?.ikame ? zincir.adimlar.some((x) => x.kayit.kod === d.ikame) || zincir.kaynak.kod === d.ikame : false;
  return (
    <li>
      <a href={`#/e/${evren}/k/${a.kayit.kod}`}>{a.kayit.ad}</a> <span class="soluk kucuk">· {a.neden}{a.yol.length ? ` · yol: ${[zincir.kaynak, ...a.yol].map((x) => x.ad).join(' → ')}` : ''}</span>
      {a.digerKaynaklar.length > 0 && <div class="kucuk soluk">Başka kaynakları da var: {liste(evren, a.digerKaynaklar)}. Etkilenmeyebilir.</div>}
      {a.iliski && (
        <div class="kucuk">
          {sure ? `Dayanma süresi: ${sure}. Bu süre içinde etkilenmeyebilir.` : <span class="soluk">Dayanma süresi kayıtlı olmadığı için ne zaman etkileneceği bilinmiyor.</span>}
          {d?.ikameKayit && <> İkamesi: <a href={`#/e/${evren}/k/${d.ikameKayit.kod}`}>{d.ikameKayit.ad}</a>{ikameEtkilenir ? ' (o da bu kesintiden etkilenebilir)' : ''}.</>}
          {d?.not && <span class="soluk"> {d.not}</span>}
          {' '}<button class="dugme sade kucuk" onClick={() => setDuzenle(!duzenle)}>{d ? 'Dayanıklılığı düzenle' : 'Dayanma süresi yaz'}</button>
          {duzenle && <DayaniklilikFormu istemci={istemci} evren={evren} iliski={a.iliski} d={d} kapat={() => setDuzenle(false)} />}
        </div>
      )}
    </li>
  );
}

function DayaniklilikFormu({ istemci, evren, iliski, d, kapat }: { istemci: Istemci; evren: string; iliski: string; d: KesintiAdimi['dayaniklilik']; kapat: () => void }) {
  const [enAz, setEnAz] = useState(d?.enAz?.toString() ?? '');
  const [enCok, setEnCok] = useState(d?.enCok?.toString() ?? '');
  const [birim, setBirim] = useState<Dayaniklilik['birim']>(d?.birim ?? 'gun');
  const [ikame, setIkame] = useState<{ kod: string; ad: string } | null>(d?.ikameKayit ?? null);
  const [not, setNot] = useState(d?.not ?? '');
  const [hata, setHata] = useState<string | null>(null);
  const kaydet = (deger: Dayaniklilik | null) => istemci.iste('dayaniklilikYaz', { evren, iliski, deger }).then(kapat, (x) => setHata(hataYaz(x)));
  return (
    <form class="satir" onSubmit={(e) => { e.preventDefault(); kaydet({ enAz: enAz.trim() === '' ? null : Number(enAz.replace(',', '.')), enCok: enCok.trim() === '' ? null : Number(enCok.replace(',', '.')), birim, ikame: ikame?.kod ?? null, not }); }}>
      <input class="girdi" style="width:70px" inputMode="decimal" aria-label="En az kaç" placeholder="en az" value={enAz} onInput={(e) => setEnAz((e.target as HTMLInputElement).value)} />
      <input class="girdi" style="width:70px" inputMode="decimal" aria-label="En çok kaç" placeholder="en çok" value={enCok} onInput={(e) => setEnCok((e.target as HTMLInputElement).value)} />
      <select class="girdi kucuk-secim" aria-label="Birim" value={birim} onChange={(e) => setBirim((e.target as HTMLSelectElement).value as Dayaniklilik['birim'])}>
        {BIRIMLER.map((b) => <option value={b.kod}>{b.ad}</option>)}
      </select>
      <KayitSec istemci={istemci} evren={evren} secili={ikame} etiket="İkame seç" sec={setIkame} />
      <input class="girdi" style="flex:1;min-width:120px" lang="tr" aria-label="Not" placeholder="Depo, kuyu, onarım… (isteğe bağlı)" value={not} onInput={(e) => setNot((e.target as HTMLInputElement).value)} />
      <button class="dugme ana kucuk" type="submit">Kaydet</button>
      {d && <button class="dugme sade kucuk" type="button" onClick={() => kaydet(null)}>Kaldır</button>}
      <button class="dugme sade kucuk" type="button" onClick={kapat}>Vazgeç</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </form>
  );
}
