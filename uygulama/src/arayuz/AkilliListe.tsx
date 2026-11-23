// Akıllı listeler (K38, §7): Kayıtlar sayfasının solunda kaydedilmiş sorgular. Sorgu hukuk kurallarındaki formül
// diliyle yazılır; sonuç §18 sorgu sözleşmesine göre gruplanır ve her açılışta yeniden hesaplanır.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AkilliListe, AkilliListeOzeti, AkilliListeSatiri } from '../veri/api';
import { turBul } from '../alan/turler';
import { FormulYazici } from './Hukuk';
import { TurSecici } from './ortak';
import { geriAlinabilir } from './onay';

export function AkilliListelerMenusu({ istemci, evren, surum, secili, sec }: { istemci: Istemci; evren: string; surum: number; secili: string | null; sec: (k: string | null) => void }) {
  const [l, setL] = useState<AkilliListeOzeti[]>([]);
  useEffect(() => { istemci.iste('akilliListeler', { evren }).then(setL, () => setL([])); }, [evren, surum]);
  return (
    <nav class="akilli-listeler" aria-label="Akıllı listeler">
      <span class="soluk kucuk">Akıllı listeler</span>
      <button type="button" class={`akilli-liste-adi${secili === null ? ' aktif' : ''}`} aria-current={secili === null ? 'page' : undefined} onClick={() => sec(null)}>Bütün kayıtlar</button>
      {l.map((x) => <button key={x.kod} type="button" class={`akilli-liste-adi${secili === x.kod ? ' aktif' : ''}`} aria-current={secili === x.kod ? 'page' : undefined} onClick={() => sec(x.kod)}>{x.ad}</button>)}
      <button type="button" class={`akilli-liste-adi yeni${secili === 'yeni' ? ' aktif' : ''}`} onClick={() => sec('yeni')}>+ Yeni akıllı liste</button>
    </nav>
  );
}

type Taslak = { ad: string; tur: string; formul: string; tarih: string };

function ListeFormu({ istemci, evren, kod, ilk, bitti, vazgec }: { istemci: Istemci; evren: string; kod: string | null; ilk: Taslak; bitti: (kod: string) => void; vazgec: () => void }) {
  const [t, setT] = useState<Taslak>(ilk);
  const [hata, setHata] = useState<string | null>(null);
  const kaydet = async (e: Event) => {
    e.preventDefault();
    try { const r = await istemci.iste('akilliListeYaz', { evren, kod, ...t }); bitti(r.kod); } catch (x) { setHata((x as Error).message); }
  };
  return (
    <form class="akilli-liste-formu" onSubmit={kaydet} aria-label={kod ? 'Akıllı listeyi düzenle' : 'Yeni akıllı liste'}>
      <h2>{kod ? 'Akıllı listeyi düzenle' : 'Yeni akıllı liste'}</h2>
      <label class="alan"><span>Ad</span><input class="girdi" lang="tr" maxLength={120} value={t.ad} placeholder="Ör. Loncanın genç üyeleri" onInput={(e) => setT({ ...t, ad: (e.target as HTMLInputElement).value })} /></label>
      <div class="alan"><span>Hangi kayıtlar</span><TurSecici deger={t.tur} onDegis={(tur) => setT({ ...t, tur })} hepsi="Bütün türler" etiket="Hangi kayıtlar" /></div>
      <div class="alan"><span>Sorgu</span>
        <FormulYazici istemci={istemci} evren={evren} deger={t.formul} degistir={(formul) => setT({ ...t, formul })} etiket="Sorgu (formül)" bosYazi="" /></div>
      <label class="alan"><span>Tarih (isteğe bağlı)</span><input class="girdi" lang="tr" maxLength={120} value={t.tarih} placeholder="Ör. Sonbahar 412" onInput={(e) => setT({ ...t, tarih: (e.target as HTMLInputElement).value })} />
        <span class="soluk kucuk">Yaş bu tarihe göre hesaplanır. Boşsa yaş koşulu belirsiz kalır.</span></label>
      {hata && <p class="hata kucuk" role="alert">{hata}</p>}
      <div class="satir"><button class="dugme ana">Kaydet</button><button type="button" class="dugme sade" onClick={vazgec}>Vazgeç</button></div>
    </form>
  );
}

function Grup({ evren, baslik, l, acik = true }: { evren: string; baslik: string; l: AkilliListeSatiri[]; acik?: boolean }) {
  const ic = <div class="akilli-cipler">{l.map((x) => <a key={x.kayit.kod} class="akilli-cip" href={`#/e/${evren}/k/${x.kayit.kod}`} title={turBul(x.kayit.tur).ad}>{x.kayit.ad}{x.neden && <span class="soluk"> · {x.neden}</span>}</a>)}</div>;
  if (!acik) return <details class="akilli-grup"><summary><strong>{baslik} ({l.length})</strong></summary>{ic}</details>;
  return <section class="akilli-grup"><h3>{baslik} ({l.length})</h3>{l.length ? ic : <p class="soluk kucuk">Yok.</p>}</section>;
}

export function AkilliListeGorunumu({ istemci, evren, surum, kod, sec }: { istemci: Istemci; evren: string; surum: number; kod: string; sec: (k: string | null) => void }) {
  const [l, setL] = useState<AkilliListe | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [duzenle, setDuzenle] = useState(false);
  useEffect(() => {
    setDuzenle(false);
    if (kod === 'yeni') { setL(null); return; }
    let iptal = false;
    istemci.iste('akilliListe', { evren, kod }).then((x) => { if (!iptal) { setL(x); setHata(null); } }, (e) => { if (!iptal) setHata((e as Error).message); });
    return () => { iptal = true; };
  }, [evren, kod, surum]);
  if (kod === 'yeni') return <ListeFormu istemci={istemci} evren={evren} kod={null} ilk={{ ad: '', tur: 'karakter', formul: '', tarih: '' }} bitti={sec} vazgec={() => sec(null)} />;
  if (hata) return <p class="hata">{hata}</p>;
  if (!l) return null;
  if (duzenle) return <ListeFormu istemci={istemci} evren={evren} kod={l.kod} ilk={{ ad: l.ad, tur: l.tur, formul: l.formulYazisi, tarih: l.tarih?.ifade ?? '' }} bitti={() => setDuzenle(false)} vazgec={() => setDuzenle(false)} />;
  const sil = () => void geriAlinabilir(`“${l.ad}” akıllı listesi kaldırıldı.`, () => istemci.iste('akilliListeSil', { evren, kod: l.kod }), () => istemci.iste('akilliListeSil', { evren, kod: l.kod, geriYukle: true })).then(() => sec(null));
  const belirsiz = l.bilgiYok.length + l.celiskili.length;
  return (
    <div class="akilli-liste">
      <h2>{l.ad}</h2>
      <code class="akilli-formul">{l.formulYazisi}</code>
      <p class="soluk kucuk">{l.tur ? `${turBul(l.tur).ad} kayıtları` : 'Bütün kayıtlar'} · {l.tarih ? `Tarih: ${l.tarih.ifade} (yaş bu tarihe göre)` : 'Tarih yok'} · <button type="button" class="baglanti-dugmesi" onClick={() => setDuzenle(true)}>Düzenle</button> · <button type="button" class="baglanti-dugmesi" onClick={sil}>Sil</button></p>
      {l.hata ? <p class="uyari">Bu liste şu an hesaplanamıyor: {l.hata} Sorguyu düzenleyin.</p> : <>
        <p class="kucuk">Doğrulanmış {l.uyuyor.length}{belirsiz ? `, belirsiz ${belirsiz}` : ''}. Bilgisi girilmemiş ya da çelişkili kayıtlar “uymuyor” sayılmaz.</p>
        <Grup evren={evren} baslik="Uyuyor" l={l.uyuyor} />
        {l.bilgiYok.length > 0 && <Grup evren={evren} baslik="Belirsiz: bilgi eksik" l={l.bilgiYok} />}
        {l.celiskili.length > 0 && <Grup evren={evren} baslik="Belirsiz: çelişkili" l={l.celiskili} />}
        {l.konuDisi.length > 0 && <Grup evren={evren} baslik="Bu kayıt için geçerli değil" l={l.konuDisi} acik={false} />}
        <Grup evren={evren} baslik="Uymuyor" l={l.uymuyor} acik={false} />
      </>}
    </div>
  );
}
