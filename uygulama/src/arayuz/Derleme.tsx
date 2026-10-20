// Gezinti ve görsel pano (§7). Yazarın derlediği listeler; kayıtlar kopyalanmaz, liste onlara bağlanır.
import { useEffect, useRef, useState } from 'preact/hooks';
import { BosSayfa, odakla } from './ortak';
import type { Istemci } from '../veri/istemci';
import type { Derleme, DerlemeOzeti, Kayit, PanoOgesi } from '../veri/api';
import { turBul } from '../alan/turler';
import { git } from './Uygulama';
import { KayitSec } from './KayitBolumleri';
import { Gorsel, gorselAdresi } from './gorsel';

const hataYaz = (e: unknown) => (e as Error).message;
type Tur = 'gezinti' | 'pano';
const ADLAR: Record<Tur, { tekil: string; yeni: string; ornek: string; bos: string }> = {
  gezinti: { tekil: 'gezinti', yeni: 'Yeni gezinti', ornek: 'Başkentte bir gün', bos: 'Henüz gezinti yok. Gezinti, uzun bir aradan sonra evrene dönerken sırayla okuyacağınız kayıtların listesidir.' },
  pano: { tekil: 'görsel panosu', yeni: 'Yeni pano', ornek: 'Kıyafetler', bos: 'Henüz pano yok. Panoya eskizleri, kıyafetleri, armaları ve mimari örnekleri toplayabilirsiniz.' },
};

/** Gezintiler ya da panolar: solda liste, sağda seçilen. */
export function DerlemeSekmesi({ istemci, evren, tur, secili, surum }: { istemci: Istemci; evren: string; tur: Tur; secili: string | null; surum: number }) {
  const [liste, setListe] = useState<DerlemeOzeti[] | null>(null);
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const sekme = tur === 'gezinti' ? 'gezinti' : 'pano';
  useEffect(() => { istemci.iste('derlemeler', { evren, tur }).then(setListe, () => {}); }, [tur, surum]);
  if (!liste) return null;
  return (
    <section aria-label={tur === 'gezinti' ? 'Gezintiler' : 'Görsel panolar'}>
      <div class="satir">
        {liste.map((d) => (
          <button key={d.kod} class={`dugme kucuk${d.kod === secili ? ' ana' : ''}`} onClick={() => git(`/e/${evren}/${sekme}/${d.kod}`)}>{d.ad} <span class="soluk">({d.ogeSayisi})</span></button>
        ))}
        <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('derlemeOlustur', { evren, tur, ad }).then((x) => { setAd(''); setHata(null); git(`/e/${evren}/${sekme}/${x.kod}`); }, (x) => setHata(hataYaz(x))); }}>
          <input class="girdi" lang="tr" aria-label={`${ADLAR[tur].yeni} adı`} placeholder={ADLAR[tur].ornek} value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
          <button class="dugme kucuk" type="submit" disabled={!ad.trim()}>{ADLAR[tur].yeni}</button>
        </form>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {!liste.length && <BosSayfa baslik={tur === 'gezinti' ? 'İlk gezintinizi ekleyin' : 'İlk panonuzu ekleyin'} eylem={{ ad: ADLAR[tur].yeni, yap: () => odakla(`input[aria-label="${ADLAR[tur].yeni} adı"]`) }} konu={tur === 'gezinti' ? 23 : 19}>
        {ADLAR[tur].bos.replace(/^Henüz [^.]*\. /, '')}
      </BosSayfa>}
      {secili && liste.some((d) => d.kod === secili) && (tur === 'gezinti'
        ? <Gezinti key={secili} istemci={istemci} evren={evren} kod={secili} surum={surum} />
        : <Pano key={secili} istemci={istemci} evren={evren} kod={secili} surum={surum} />)}
    </section>
  );
}

function AdVeSil({ istemci, evren, d }: { istemci: Istemci; evren: string; d: Derleme }) {
  const [ad, setAd] = useState(d.ad);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setAd(d.ad), [d.ad]);
  return (
    <div class="satir">
      <input class="girdi" style="font-size:1.1rem;font-weight:600;min-width:240px" lang="tr" aria-label="Adı" value={ad}
        onInput={(e) => setAd((e.target as HTMLInputElement).value)}
        onBlur={() => { if (ad.trim() && ad !== d.ad) istemci.iste('derlemeAdYaz', { evren, kod: d.kod, ad }).then(() => setHata(null), (x) => setHata(hataYaz(x))); }} />
      <span class="bosluk" />
      <button class="dugme sade kucuk" onClick={() => { if (confirm(`“${d.ad}” ${ADLAR[d.tur].tekil} kaldırılsın mı? Kayıtlar silinmez.`)) istemci.iste('derlemeSil', { evren, kod: d.kod }).then(() => git(`/e/${evren}/${d.tur}`)); }}>Kaldır</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </div>
  );
}

// ---------- Gezinti ----------
function Gezinti({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [d, setD] = useState<Derleme | null>(null);
  const [gez, setGez] = useState<number | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('derleme', { evren, kod }).then(setD, (e) => setHata(hataYaz(e))); }, [kod, surum]);
  if (!d) return hata ? <p class="hata kucuk">{hata}</p> : null;
  const adimlar = d.adimlar.map((a) => ({ kayit: a.kayit.kod, not: a.not }));
  const yaz = (l: typeof adimlar) => istemci.iste('gezintiYaz', { evren, kod, adimlar: l }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  const tasi = (i: number, y: number) => { const l = [...adimlar]; [l[i], l[i + y]] = [l[i + y], l[i]]; void yaz(l); };
  if (gez !== null && d.adimlar.length) return <GezintiAdimi istemci={istemci} evren={evren} d={d} i={Math.min(gez, d.adimlar.length - 1)} sec={setGez} />;
  return (
    <div class="derleme">
      <AdVeSil istemci={istemci} evren={evren} d={d} />
      <div class="satir">
        <button class="dugme ana" disabled={!d.adimlar.length} onClick={() => setGez(0)}>Gez</button>
        <span class="soluk kucuk">Adımları notlarıyla birlikte sırayla okursunuz.</span>
      </div>
      <ol class="gezinti-adimlari">
        {d.adimlar.map((a, i) => (
          <li key={`${a.kayit.kod}:${i}`}>
            <div class="satir">
              <a href={`#/e/${evren}/k/${a.kayit.kod}`}>{a.kayit.ad}</a> <span class="soluk kucuk">{turBul(a.kayit.tur).ad}</span>
              <span class="bosluk" />
              <button class="dugme sade kucuk" disabled={i === 0} aria-label="Yukarı taşı" onClick={() => tasi(i, -1)}>↑</button>
              <button class="dugme sade kucuk" disabled={i === d.adimlar.length - 1} aria-label="Aşağı taşı" onClick={() => tasi(i, 1)}>↓</button>
              <button class="dugme sade kucuk" aria-label={`${a.kayit.ad} adımını çıkar`} onClick={() => yaz(adimlar.filter((_, j) => j !== i))}>Çıkar</button>
            </div>
            <input class="girdi genis-girdi" lang="tr" aria-label={`${a.kayit.ad} adımının notu`} placeholder="Bu adımda neye bakılacak? (isteğe bağlı)" defaultValue={a.not}
              onBlur={(e) => { const v = (e.target as HTMLInputElement).value; if (v !== a.not) void yaz(adimlar.map((x, j) => (j === i ? { ...x, not: v } : x))); }} />
          </li>
        ))}
      </ol>
      <div class="satir"><KayitSec istemci={istemci} evren={evren} secili={null} sec={(s) => { if (s) void yaz([...adimlar, { kayit: s.kod, not: '' }]); }} etiket="Adım ekle" /></div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}

function GezintiAdimi({ istemci, evren, d, i, sec }: { istemci: Istemci; evren: string; d: Derleme; i: number; sec: (i: number | null) => void }) {
  const a = d.adimlar[i];
  const [k, setK] = useState<Kayit | null>(null);
  useEffect(() => { setK(null); istemci.iste('kayit', { evren, kod: a.kayit.kod }).then(setK, () => {}); }, [a.kayit.kod]);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' && i < d.adimlar.length - 1) sec(i + 1);
      else if (e.key === 'ArrowLeft' && i > 0) sec(i - 1);
      else if (e.key === 'Escape') sec(null);
    };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, [i]);
  return (
    <div class="derleme gezinti-gez" aria-label="Gezinti">
      <div class="satir">
        <strong>{d.ad}</strong> <span class="soluk kucuk">{i + 1} / {d.adimlar.length}</span>
        <span class="bosluk" />
        <button class="dugme" disabled={i === 0} onClick={() => sec(i - 1)}>← Önceki</button>
        <button class="dugme ana" disabled={i === d.adimlar.length - 1} onClick={() => sec(i + 1)}>Sonraki →</button>
        <button class="dugme sade" onClick={() => sec(null)}>Bitir</button>
      </div>
      <h2><a href={`#/e/${evren}/k/${a.kayit.kod}`}>{a.kayit.ad}</a> <span class="soluk kucuk">{turBul(a.kayit.tur).ad}</span></h2>
      {a.not && <p class="gezinti-notu">{a.not}</p>}
      {k && (
        <>
          {k.tarih && <p class="soluk kucuk">{k.tarih.ifade}</p>}
          {k.ozet ? <p>{k.ozet}</p> : <p class="soluk kucuk">Özet yazılmamış.</p>}
          {k.gorseller.length > 0 && <div class="gorsel-izgara">{k.gorseller.slice(0, 6).map((g) => <span class="gorsel-kucuk"><Gorsel istemci={istemci} evren={evren} ad={g} /></span>)}</div>}
        </>
      )}
      <p class="soluk kucuk">Ok tuşlarıyla da ilerleyebilirsiniz.</p>
    </div>
  );
}

// ---------- Görsel pano ----------
type Oge = Omit<PanoOgesi, 'kayit' | 'eksik'> & { kayit: string | null };
const icerik = (o: PanoOgesi): Oge => ({ kod: o.kod, gorsel: o.gorsel, kayit: o.kayit?.kod ?? null, baslik: o.baslik, durum: o.durum, notlar: o.notlar });

function Pano({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [d, setD] = useState<Derleme | null>(null);
  const [acik, setAcik] = useState<string | null>(null);
  const [karsilastir, setKarsilastir] = useState<string[]>([]);
  const [eskiler, setEskiler] = useState(false);
  const [kaynak, setKaynak] = useState<Kayit | null>(null);
  const [yukleniyor, setYukleniyor] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const dosya = useRef<HTMLInputElement>(null);
  useEffect(() => { istemci.iste('derleme', { evren, kod }).then(setD, (e) => setHata(hataYaz(e))); }, [kod, surum]);
  if (!d) return hata ? <p class="hata kucuk">{hata}</p> : null;
  const ogeler = d.ogeler.map(icerik);
  const yaz = (l: Oge[]) => istemci.iste('panoYaz', { evren, kod, ogeler: l }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); throw e; });
  const ekle = (gorsel: string, kayit: string | null) => yaz([...ogeler, { kod: '', gorsel, kayit, baslik: '', durum: null, notlar: [] }]);
  const yukle = async (fl: FileList) => {
    const yeni: Oge[] = [];
    for (const f of [...fl]) {
      setYukleniyor((n) => n + 1);
      try { const { ad } = await istemci.iste('panoGorseliSakla', { evren, dosyaAdi: f.name, tur: f.type, veri: new Uint8Array(await f.arrayBuffer()) }); yeni.push({ kod: '', gorsel: ad, kayit: null, baslik: f.name.replace(/\.[^.]+$/, ''), durum: null, notlar: [] }); }
      catch (e) { setHata(`${f.name}: ${hataYaz(e)}`); }
      finally { setYukleniyor((n) => n - 1); }
    }
    if (yeni.length) await yaz([...ogeler, ...yeni]).catch(() => {});
  };
  const gorunen = d.ogeler.filter((o) => eskiler || o.durum !== 'eski');
  const eskiSayisi = d.ogeler.filter((o) => o.durum === 'eski').length;
  const acikOge = d.ogeler.find((o) => o.kod === acik);
  const kars = karsilastir.map((k) => d.ogeler.find((o) => o.kod === k)).filter((o): o is PanoOgesi => !!o);
  return (
    <div class="derleme">
      <AdVeSil istemci={istemci} evren={evren} d={d} />
      <div class="satir">
        <KayitSec istemci={istemci} evren={evren} secili={kaynak ? { kod: kaynak.kod, ad: kaynak.ad } : null}
          sec={(s) => { if (s) istemci.iste('kayit', { evren, kod: s.kod }).then(setKaynak); else setKaynak(null); }} etiket="Bir kaydın görselini ekle" />
        <button class="dugme kucuk" onClick={() => dosya.current?.click()}>Dosyadan görsel ekle</button>
        <input ref={dosya} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden
          onChange={(e) => { const f = (e.target as HTMLInputElement).files; if (f?.length) void yukle(f); (e.target as HTMLInputElement).value = ''; }} />
        {eskiSayisi > 0 && <label class="kucuk"><input type="checkbox" checked={eskiler} onChange={(e) => setEskiler((e.target as HTMLInputElement).checked)} /> Eski çizimleri de göster ({eskiSayisi})</label>}
        {yukleniyor > 0 && <span class="soluk kucuk">Ekleniyor…</span>}
      </div>
      {kaynak && (
        <div class="pano-kaynak">
          <span class="kucuk">{kaynak.ad}: {kaynak.gorseller.length ? 'eklemek istediğiniz görsele basın.' : 'bu kaydın görseli yok.'}</span>
          <div class="gorsel-izgara">{kaynak.gorseller.map((g) => (
            <button class="gorsel-kucuk" aria-label="Bu görseli panoya ekle" onClick={() => { ekle(g, kaynak.kod).then(() => setKaynak(null), () => {}); }}><Gorsel istemci={istemci} evren={evren} ad={g} /></button>
          ))}</div>
          <button class="dugme sade kucuk" onClick={() => setKaynak(null)}>Vazgeç</button>
        </div>
      )}
      {hata && <p class="hata kucuk">{hata}</p>}
      {karsilastir.length > 0 && (
        <p class="kucuk">Karşılaştırmak için seçilenler: {kars.map((o) => o.baslik || o.kayit?.ad || 'adsız').join(' ve ')}.
          {kars.length === 2 ? ' Aşağıda yan yana gösteriliyor.' : ' Bir görsel daha seçin.'} <button class="dugme sade kucuk" onClick={() => setKarsilastir([])}>Temizle</button></p>
      )}
      {kars.length === 2 && (
        <div class="pano-karsilastirma">
          {kars.map((o) => <PanoBuyuk key={o.kod} istemci={istemci} evren={evren} o={o} />)}
        </div>
      )}
      {!d.ogeler.length && <p class="soluk kucuk">Pano boş. Bir kaydın görsellerinden seçebilir ya da dosyadan görsel ekleyebilirsiniz. Dosyadan eklenen görsel hiçbir kayda bağlanmaz.</p>}
      <div class="pano-izgara">
        {gorunen.map((o) => (
          <div key={o.kod} class={`pano-ogesi${o.durum === 'eski' ? ' eski' : ''}`}>
            <button class="gorsel-kucuk" aria-label={o.baslik ? `“${o.baslik}” görselini aç` : 'Görseli aç'} onClick={() => setAcik(o.kod)}><Gorsel istemci={istemci} evren={evren} ad={o.gorsel} /></button>
            <div class="kucuk">{o.baslik || <span class="soluk">Başlıksız</span>}</div>
            {o.kayit && <div class="soluk kucuk"><a href={`#/e/${evren}/k/${o.kayit.kod}`}>{o.kayit.ad}</a></div>}
            <div class="kucuk">
              {o.durum === 'guncel' && <span class="rozet">Güncel</span>}
              {o.durum === 'eski' && <span class="rozet soluk">Eski</span>}
              {o.notlar.length > 0 && <span class="soluk"> {o.notlar.length} not</span>}
            </div>
            <label class="kucuk"><input type="checkbox" checked={karsilastir.includes(o.kod)}
              onChange={(e) => setKarsilastir((e.target as HTMLInputElement).checked ? [...karsilastir, o.kod].slice(-2) : karsilastir.filter((x) => x !== o.kod))} /> Karşılaştır</label>
          </div>
        ))}
      </div>
      {acikOge && <PanoOgesiPerdesi istemci={istemci} evren={evren} d={d} o={acikOge} kapat={() => setAcik(null)} yaz={yaz} ac={setAcik} />}
    </div>
  );
}

/** Görsel ve üzerindeki numaralı notlar. */
function PanoBuyuk({ istemci, evren, o, tikla }: { istemci: Istemci; evren: string; o: PanoOgesi; tikla?: (x: number, y: number) => void }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => { gorselAdresi(istemci, evren, o.gorsel, false).then((x) => setUrl(x.url)); }, [o.gorsel]);
  return (
    <figure class="pano-buyuk">
      {url === undefined ? <p class="soluk">Açılıyor…</p> : url === null ? <p class="soluk">Görsel bu cihazda yok.</p> : (
        <div class={`pano-gorsel${tikla ? ' not-kipi' : ''}`} onClick={(e) => {
          if (!tikla) return;
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          tikla((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        }}>
          <img src={url} alt={o.baslik} />
          {o.notlar.map((n, i) => <span class="pano-isaret" style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }} title={n.metin}>{i + 1}</span>)}
        </div>
      )}
      <figcaption class="kucuk">{o.baslik || o.kayit?.ad || ''}{o.durum === 'guncel' ? ' · güncel' : o.durum === 'eski' ? ' · eski' : ''}</figcaption>
      {o.notlar.length > 0 && <ol class="pano-notlari kucuk">{o.notlar.map((n) => <li>{n.metin}</li>)}</ol>}
    </figure>
  );
}

function PanoOgesiPerdesi({ istemci, evren, d, o, kapat, yaz, ac }: {
  istemci: Istemci; evren: string; d: Derleme; o: PanoOgesi; kapat: () => void; yaz: (l: Oge[]) => Promise<void>; ac: (k: string) => void;
}) {
  const [notKipi, setNotKipi] = useState(false);
  const [bekleyen, setBekleyen] = useState<{ x: number; y: number } | null>(null);
  const [metin, setMetin] = useState('');
  const [baslik, setBaslik] = useState(o.baslik);
  useEffect(() => setBaslik(o.baslik), [o.kod]);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, []);
  const ogeler = d.ogeler.map(icerik);
  const degistir = (x: Partial<Oge>) => yaz(ogeler.map((y) => (y.kod === o.kod ? { ...y, ...x } : y))).catch(() => {});
  // Aynı kaydın öteki görselleri: gelişim geçmişi.
  const gecmis = o.kayit ? d.ogeler.filter((y) => y.kayit?.kod === o.kayit!.kod && y.kod !== o.kod) : [];
  return (
    <div class="perde" role="dialog" aria-label="Pano görseli" onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}>
      <div class="perde-ic pano-perde">
        <div class="satir">
          <input class="girdi" lang="tr" aria-label="Başlık" placeholder="Başlık" value={baslik} onInput={(e) => setBaslik((e.target as HTMLInputElement).value)}
            onBlur={() => { if (baslik !== o.baslik) void degistir({ baslik }); }} />
          <select class="girdi kucuk-secim" aria-label="Durumu" value={o.durum ?? ''} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; void degistir({ durum: v === 'guncel' || v === 'eski' ? v : null }); }}>
            <option value="">İşaretsiz</option><option value="guncel">Güncel görünüm</option><option value="eski">Eski çizim</option>
          </select>
          <button class={`dugme kucuk${notKipi ? ' ana' : ''}`} onClick={() => { setNotKipi(!notKipi); setBekleyen(null); }}>{notKipi ? 'Not koymayı bitir' : 'Not koy'}</button>
          <span class="bosluk" />
          <button class="dugme sade kucuk" onClick={() => { void yaz(ogeler.filter((y) => y.kod !== o.kod)).then(kapat, () => {}); }}>Panodan çıkar</button>
          <button class="dugme" onClick={kapat} autoFocus>Kapat</button>
        </div>
        {notKipi && <p class="soluk kucuk">Notun duracağı yere basın.</p>}
        <PanoBuyuk istemci={istemci} evren={evren} o={o} tikla={notKipi ? (x, y) => { setBekleyen({ x, y }); setMetin(''); } : undefined} />
        {bekleyen && (
          <form class="satir" onSubmit={(e) => { e.preventDefault(); void degistir({ notlar: [...o.notlar, { ...bekleyen, metin }] }).then(() => setBekleyen(null)); }}>
            <input class="girdi" style="flex:1" lang="tr" aria-label="Not" placeholder="Bu noktaya bir not yazın" value={metin} autoFocus onInput={(e) => setMetin((e.target as HTMLInputElement).value)} />
            <button class="dugme kucuk" type="submit" disabled={!metin.trim()}>Notu ekle</button>
            <button class="dugme sade kucuk" type="button" onClick={() => setBekleyen(null)}>Vazgeç</button>
          </form>
        )}
        {o.notlar.length > 0 && (
          <div class="satir kucuk">{o.notlar.map((_, i) => <button class="dugme sade kucuk" aria-label={`${i + 1}. notu sil`} onClick={() => degistir({ notlar: o.notlar.filter((_, j) => j !== i) })}>{i + 1}. notu sil</button>)}</div>
        )}
        {gecmis.length > 0 && (
          <div>
            <h3>{o.kayit!.ad}: gelişim geçmişi</h3>
            <div class="gorsel-izgara">{gecmis.map((y) => (
              <button class="gorsel-kucuk" aria-label={y.baslik ? `“${y.baslik}” görselini aç` : 'Görseli aç'} title={`${y.baslik}${y.durum === 'guncel' ? ' (güncel)' : y.durum === 'eski' ? ' (eski)' : ''}`} onClick={() => ac(y.kod)}><Gorsel istemci={istemci} evren={evren} ad={y.gorsel} /></button>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
