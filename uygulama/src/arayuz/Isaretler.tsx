// Metin işaretleri (§5.7): bu kaydın metnindeki işaretli cümleler ve başka metinlerde bu kayda bağlanmış cümleler.
// Metni silmek evren kaydını silmez; işaretli parçası metinden çıkmış işaret "artık metinde yok" olarak görünür.
import { useEffect, useState } from 'preact/hooks';
import type { IsaretAlani, IsaretIncelemeleri, IsaretIncelemesi, MetinIsareti } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import type { Istemci } from '../veri/istemci';
import { geriAlinabilir } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const DURUM: Record<MetinIsareti['durum'], string> = {
  yerinde: '', metinde_yok: 'Artık metinde yok', belirsiz: 'Bağlantı belirsiz: metinde birden çok yerde geçiyor',
};

function Satir({ istemci, evren, x, kaynakGoster, saltOkunur, yenile }: { istemci: Istemci; evren: string; x: MetinIsareti; kaynakGoster: boolean; saltOkunur: boolean; yenile: () => void }) {
  const [acik, setAcik] = useState(false);
  const [alanlar, setAlanlar] = useState<IsaretAlani[] | null>(null);
  const [iddia, setIddia] = useState(x.iddia);
  const [hata, setHata] = useState<string | null>(null);
  const yaz = (alan: 'hedefAlan' | 'iddia' | 'kritik', deger: unknown) => istemci.iste('metinIsaretiYaz', { evren, kod: x.kod, alan, deger }).then(() => { setHata(null); yenile(); }, (e) => setHata(hataYaz(e)));
  useEffect(() => { if (acik && x.hedef && !alanlar) istemci.iste('isaretAlanlari', { evren, hedef: x.hedef.kod }).then(setAlanlar, () => setAlanlar([])); }, [acik]);
  return (
    <li>
      <span>{x.kritik && <strong>Kritik · </strong>}
        {x.yerler[0] ? `“${x.yerler[0].slice(0, 160)}”` : <em class="soluk">(işaretli parça metinde yok)</em>}
        {' → '}{kaynakGoster ? <a href={`#/e/${evren}/k/${x.kayit.kod}`}>{x.kayit.ad}</a> : x.hedef ? <a href={`#/e/${evren}/k/${x.hedef.kod}`}>{x.hedef.ad}</a> : 'bağlantısız'}
        {!kaynakGoster && x.hedefAlanAdi && ` · ${x.hedefAlanAdi}`}
        {x.iddia && <span class="soluk"> · {x.iddia}</span>}
      </span>
      {DURUM[x.durum] && <span class="uyari-yazisi kucuk"> · {DURUM[x.durum]}</span>}
      {!saltOkunur && !kaynakGoster && <button class="dugme sade kucuk" aria-expanded={acik} onClick={() => setAcik(!acik)}>{acik ? 'Kapat' : 'Düzenle'}</button>}
      {acik && (
        <div class="satir" style="margin:6px 0 10px">
          {x.hedef && (
            <select class="girdi kucuk-secim" aria-label="Bağlı olduğu bilgi" value={x.hedefAlan ?? ''} onChange={(e) => yaz('hedefAlan', (e.target as HTMLSelectElement).value || null)}>
              <option value="">Belirtilmedi (kaydın tamamı)</option>
              {(alanlar ?? []).map((a) => <option key={a.kod} value={a.kod}>{a.grup}: {a.ad}</option>)}
              {x.hedefAlan && alanlar && !alanlar.some((a) => a.kod === x.hedefAlan) && <option value={x.hedefAlan}>{x.hedefAlanAdi}</option>}
            </select>
          )}
          <input class="girdi" lang="tr" maxLength={300} aria-label="İddia" placeholder="Cümle kısaca ne söylüyor?" value={iddia} onInput={(e) => setIddia((e.target as HTMLInputElement).value)}
            onBlur={() => { if (iddia.trim() !== x.iddia) yaz('iddia', iddia); }} />
          <label class="kucuk"><input type="checkbox" checked={x.kritik} onChange={(e) => yaz('kritik', (e.target as HTMLInputElement).checked)} /> Kritik</label>
          <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('İşaret kaldırıldı.', () => istemci.iste('metinIsaretiSil', { evren, kod: x.kod }), () => istemci.iste('metinIsaretiSil', { evren, kod: x.kod, geriYukle: true }).then(yenile)).then(yenile, (e) => setHata(hataYaz(e)))}>İşareti kaldır</button>
        </div>
      )}
      {hata && <p class="hata kucuk">{hata}</p>}
    </li>
  );
}

export function IsaretlerBolumu({ istemci, evren, kod, surum, saltOkunur }: { istemci: Istemci; evren: string; kod: string; surum: number; saltOkunur: boolean }) {
  const [v, setV] = useState<{ metindekiler: MetinIsareti[]; buKayda: MetinIsareti[] } | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => { istemci.iste('kayitIsaretleri', { evren, kod }).then(setV, () => {}); }, [kod, surum, n]);
  if (!v || (!v.metindekiler.length && !v.buKayda.length)) return null;
  const yenile = () => setN((x) => x + 1);
  return (
    <section class="surecler" aria-label="İşaretli cümleler">
      <h2>İşaretli cümleler</h2>
      <p class="soluk kucuk">Metinde işaretlenen cümleler ve bağlı oldukları bilgiler. Bir cümleyi metinden silerseniz bağlı bilgi silinmez.</p>
      <IsaretIncelemeBolumu istemci={istemci} evren={evren} surum={surum + n} kayit={kod} baslikGoster={false} />
      {v.metindekiler.length > 0 && <ul class="toplanan-listesi">{v.metindekiler.map((x) => <Satir key={x.kod} istemci={istemci} evren={evren} x={x} kaynakGoster={false} saltOkunur={saltOkunur} yenile={yenile} />)}</ul>}
      {v.buKayda.length > 0 && <>
        <h3>Başka metinlerde bu kayda bağlananlar</h3>
        <ul class="toplanan-listesi">{v.buKayda.map((x) => <Satir key={x.kod} istemci={istemci} evren={evren} x={x} kaynakGoster saltOkunur={saltOkunur} yenile={yenile} />)}</ul>
      </>}
    </section>
  );
}

const NIYETLER = [
  { kod: 'eski_duzelt', ad: 'Eski kaydı düzelt', aciklama: 'Evrende doğrusu bu. Bağlı bilgiyi buna göre düzeltin.' },
  { kod: 'bu_tarihten', ad: 'Bu tarihten itibaren değiştir', aciklama: 'Önceki hâli de doğruydu. Değişikliği, zamanla değişen bir değer olarak yazın.' },
  { kod: 'taslakta', ad: 'Taslakta dene', aciklama: 'Bu değişiklik ana evrene değil, bir deneme kopyasına ait.' },
  { kod: 'inanc', ad: 'Yalnızca bu kişinin inancını değiştir', aciklama: 'Gerçek değişmedi; bir karakterin bildiği ya da sandığı değişti.' },
] as const;
type Niyet = typeof NIYETLER[number]['kod'];
type Karar = (anahtar: string, durum: 'kabul' | 'ertelendi' | 'duzeltildi' | null, gerekce?: string, niyet?: Niyet | null) => Promise<unknown>;

/** Bir işaret incelemesi: bağlı bilgi değişti ya da kritik cümle değişti. Her sorunun "şimdilik geç" karşılığı vardır (§6.1). */
export function IsaretIncelemeSatiri({ evren, x, karar, kaldir }: { evren: string; x: IsaretIncelemesi; karar: Karar; kaldir: (kod: string, geriYukle?: boolean) => Promise<unknown> }) {
  const [kabulYaz, setKabulYaz] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const i = x.isaret;
  const niyet = x.karar?.niyet ? NIYETLER.find((n) => n.kod === x.karar!.niyet) : null;
  return (
    <li class="kart bulgu">
      <div class="satir">
        <a class="satir-ad" href={`#/e/${evren}/k/${i.kayit.kod}`}>{i.kayit.ad}</a>
        <span>{i.kritik && <strong>Kritik · </strong>}{x.aciklama}</span>
      </div>
      {x.tur === 'metin' ? (
        <p class="kucuk">Önce: “{x.once}”<br />Şimdi: “{x.sonra}”</p>
      ) : (
        <p class="kucuk">“{i.yerler[0] ?? '(metinde yok)'}” → {i.hedef ? <a href={`#/e/${evren}/k/${i.hedef.kod}`}>{i.hedef.ad}</a> : 'bağlantısız'}{i.hedefAlanAdi && ` · ${i.hedefAlanAdi}`}. Şimdi: {x.sonra}</p>
      )}
      {x.karar && <p class="kucuk">{x.karar.durum === 'ertelendi' ? 'Ertelendi' : niyet ? niyet.ad : x.karar.durum === 'kabul' ? `Kabul edildi: ${x.karar.gerekce}` : x.karar.gerekce || 'Düzeltildi'} ({zamanYaz(x.karar.zaman)}).
        {niyet && niyet.kod !== 'taslakta' && i.hedef && <> <a href={`#/e/${evren}/k/${i.hedef.kod}`}>{i.hedef.ad} kaydını aç</a>.</>}
        {niyet?.kod === 'taslakta' && <> <a href={`#/e/${evren}/surumler`}>Deneme kopyaları</a>.</>}</p>}
      {x.karar ? (
        <div class="satir"><button class="dugme kucuk" onClick={() => karar(x.anahtar, null)}>{x.karar.durum === 'ertelendi' ? 'İncelemeye geri al' : 'Yeniden aç'}</button></div>
      ) : x.tur === 'metin' ? (
        <div class="satir">
          {NIYETLER.map((n) => <button key={n.kod} class="dugme kucuk" title={n.aciklama} onClick={() => karar(x.anahtar, 'kabul', '', n.kod)}>{n.ad}</button>)}
          <button class="dugme sade kucuk" onClick={() => karar(x.anahtar, 'ertelendi')}>Şimdilik geç</button>
        </div>
      ) : kabulYaz ? (
        <form class="satir" onSubmit={(e) => { e.preventDefault(); void karar(x.anahtar, 'kabul', gerekce).then(() => setKabulYaz(false)); }}>
          <input class="girdi" style="flex:1;min-width:200px" lang="tr" aria-label="Kabul gerekçesi" placeholder="Neden böyle kalsın?" value={gerekce}
            onInput={(e) => setGerekce((e.target as HTMLInputElement).value)} autoFocus />
          <button class="dugme ana kucuk" disabled={!gerekce.trim()}>Kabul et</button>
          <button type="button" class="dugme sade kucuk" onClick={() => setKabulYaz(false)}>Vazgeç</button>
        </form>
      ) : (
        <div class="satir">
          <button class="dugme kucuk" onClick={() => karar(x.anahtar, 'duzeltildi', 'Metin düzeltildi')}>Metni düzelttim</button>
          <button class="dugme kucuk" onClick={() => karar(x.anahtar, 'duzeltildi', 'Evrendeki kayıt düzeltildi')}>Evrendeki kaydı düzelttim</button>
          <button class="dugme kucuk" onClick={() => setKabulYaz(true)}>Bu hâliyle kabul et…</button>
          <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('İşaret kaldırıldı.', () => kaldir(i.kod), () => kaldir(i.kod, true))}>Bağlantı yanlış, işareti kaldır</button>
          <button class="dugme sade kucuk" onClick={() => karar(x.anahtar, 'ertelendi')}>Ertele</button>
        </div>
      )}
    </li>
  );
}

/** İşaretli cümlelerin incelemesi (§9.3): yalnızca bağlı bilgisi ya da kritik cümlesi değişenler. */
export function IsaretIncelemeBolumu({ istemci, evren, surum, kayit = null, baslikGoster = true }: { istemci: Istemci; evren: string; surum: number; kayit?: string | null; baslikGoster?: boolean }) {
  const [x, setX] = useState<IsaretIncelemeleri | null>(null);
  const [n, setN] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('isaretIncelemeleri', { evren, kayit }).then(setX, (e) => setHata(hataYaz(e))); }, [evren, kayit, surum, n]);
  const yenile = () => setN((v) => v + 1);
  const karar: Karar = (anahtar, durum, gerekce = '', niyet = null) =>
    istemci.iste('isaretKarari', { evren, anahtar, durum, gerekce, niyet }).then(() => { setHata(null); yenile(); }, (e) => { setHata(hataYaz(e)); throw e; });
  const kaldir = (kod: string, geriYukle = false) => istemci.iste('metinIsaretiSil', { evren, kod, geriYukle }).then(yenile, (e) => setHata(hataYaz(e)));
  if (!x) return null;
  if (!baslikGoster && !x.acik.length) return null;
  return (
    <section aria-label="İşaretli cümlelerin incelemesi">
      {baslikGoster ? <h2>İşaretli cümleler</h2> : <h3>İncelenmesi gerekenler</h3>}
      {baslikGoster && <p class="soluk kucuk">Bir işaret yalnızca bağlı olduğu bilgi değişince incelemeye gelir. Hangi bilgiye bağlı olduğu belirtilmemiş bir işaret ise yalnızca kayıt silinince ya da başka bir kayıtla birleştirilince gelir. Kritik bir cümle değişince program bunun bir düzeltme mi, yoksa yeni bir durum mu olduğunu sorar.</p>}
      {hata && <p class="hata kucuk">{hata}</p>}
      {baslikGoster && !x.acik.length && <p class="soluk">İncelenecek işaret yok.</p>}
      {x.acik.length > 0 && <ul class="bulgular">{x.acik.map((b) => <IsaretIncelemeSatiri key={b.anahtar} evren={evren} x={b} karar={karar} kaldir={kaldir} />)}</ul>}
      {baslikGoster && x.ertelenen.length > 0 && (
        <details class="bulgu-grubu"><summary>Ertelenenler ({x.ertelenen.length})</summary>
          <ul class="bulgular">{x.ertelenen.map((b) => <IsaretIncelemeSatiri key={b.anahtar} evren={evren} x={b} karar={karar} kaldir={kaldir} />)}</ul></details>
      )}
      {baslikGoster && x.kapanan.length > 0 && (
        <details class="bulgu-grubu"><summary>Kapananlar ({x.kapanan.length})</summary>
          <ul class="bulgular">{x.kapanan.map((b) => <IsaretIncelemeSatiri key={b.anahtar} evren={evren} x={b} karar={karar} kaldir={kaldir} />)}</ul></details>
      )}
    </section>
  );
}
