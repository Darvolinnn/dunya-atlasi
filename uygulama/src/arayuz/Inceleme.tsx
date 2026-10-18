// İnceleme kuyruğu (§9.3): bir şeyin ne zaman incelenmeli olduğunun tek yeri. İki cihazda birbirinden habersiz yapılmış
// değişiklikler ve sağlık taramasının bulduğu yapı sorunları (§9.4) burada. Ertelenen kapanmış sayılmaz, ayrı durur;
// gerekçeyle kabul edilen, dayanağı değişmedikçe yeniden açılmaz.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EtkiIncelemeleri, EtkiIncelemesi, SaglikBulgusu, SaglikTaramasi } from '../veri/api';
import { zamanYaz } from '../alan/islem-metni';
import { CatismaListesi } from './Catismalar';

const hataYaz = (e: unknown) => (e as Error).message;

export function IncelemeKuyrugu({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [t, setT] = useState<SaglikTaramasi | null>(null);
  const [bilgi, setBilgi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('saglikTaramasi', { evren, bilgi }).then((x) => { setT(x); setHata(null); }, (e) => setHata(hataYaz(e))); }, [evren, surum, bilgi]);
  const karar = (anahtar: string, durum: 'kabul' | 'ertelendi' | null, gerekce = '') =>
    istemci.iste('incelemeKarari', { evren, anahtar, durum, gerekce }).then(() => setHata(null), (e) => setHata(hataYaz(e)));

  return (
    <div class="inceleme">
      <section aria-label="İki cihazda yapılan değişiklikler">
        <h2>İki cihazda yapılan değişiklikler</h2>
        <CatismaListesi istemci={istemci} evren={evren} surum={surum} />
      </section>
      <EtkiBolumu istemci={istemci} evren={evren} surum={surum} />
      <section aria-label="Sağlık taraması">
        <h2>Sağlık taraması</h2>
        <p class="soluk kucuk">Kopuk bağlantılar, çöp kutusundaki ya da vazgeçilmiş kayıtlara giden bağlantılar, eksik görsel dosyaları ve var olmayan kayda bağlı satırlar. Kurgunun kendisini denetlemez.</p>
        {hata && <p class="hata kucuk">{hata}</p>}
        {t && !t.acik.length && <p class="soluk">Açık sorun yok.</p>}
        {t && t.acik.length > 0 && <ul class="bulgular">{t.acik.map((b) => <Bulgu key={b.anahtar} evren={evren} b={b} karar={karar} />)}</ul>}
        {t && t.ertelenen.length > 0 && (
          <details class="bulgu-grubu">
            <summary>Ertelenenler ({t.ertelenen.length})</summary>
            <ul class="bulgular">{t.ertelenen.map((b) => <Bulgu key={b.anahtar} evren={evren} b={b} karar={karar} />)}</ul>
          </details>
        )}
        {t && t.kabul.length > 0 && (
          <details class="bulgu-grubu">
            <summary>Gerekçeyle kabul edilenler ({t.kabul.length})</summary>
            <ul class="bulgular">{t.kabul.map((b) => <Bulgu key={b.anahtar} evren={evren} b={b} karar={karar} />)}</ul>
          </details>
        )}
      </section>
      <section aria-label="Bilgi listesi">
        {!bilgi ? <button class="dugme kucuk" onClick={() => setBilgi(true)}>Bilgi listesini göster</button> : (
          <>
            <h2>Bilgi listesi</h2>
            <p class="soluk kucuk">Bunlar hata değildir: hiçbir şeye bağlanmamış fikirler ve tarihi sıralamaya yerleşmeyen olaylar.</p>
            {t?.bilgiler && !t.bilgiler.length && <p class="soluk">Listelenecek bir şey yok.</p>}
            <ul class="bulgular">
              {t?.bilgiler?.map((b) => (
                <li key={b.anahtar} class="bulgu bilgi">
                  {b.kayit && <a class="satir-ad" href={`#/e/${evren}/k/${b.kayit.kod}`}>{b.kayit.ad}</a>} <span>{b.baslik}</span>
                  <div class="soluk kucuk">{b.aciklama}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Bulgu({ evren, b, karar }: { evren: string; b: SaglikBulgusu; karar: (a: string, d: 'kabul' | 'ertelendi' | null, g?: string) => Promise<unknown> }) {
  const [kabulYaz, setKabulYaz] = useState(false);
  const [gerekce, setGerekce] = useState('');
  return (
    <li class="kart bulgu">
      <div class="satir">
        {b.kayit && <a class="satir-ad" href={`#/e/${evren}/k/${b.kayit.kod}`}>{b.kayit.ad}</a>}
        {b.harita && <a class="satir-ad" href={`#/e/${evren}/haritalar/${b.harita.kod}`}>{b.harita.ad}</a>}
        <span>{b.baslik}</span>
      </div>
      <p class="soluk kucuk">{b.aciklama}{b.hedef && <> <a href={`#/e/${evren}/k/${b.hedef.kod}`}>{b.hedef.ad} kaydını aç</a>.</>}</p>
      {b.karar?.durum === 'kabul' && <p class="kucuk">Kabul edildi ({zamanYaz(b.karar.zaman)}): {b.karar.gerekce}</p>}
      {b.karar?.durum === 'ertelendi' && <p class="soluk kucuk">Ertelendi ({zamanYaz(b.karar.zaman)}).</p>}
      {kabulYaz ? (
        <form class="satir" onSubmit={(e) => { e.preventDefault(); void karar(b.anahtar, 'kabul', gerekce).then(() => setKabulYaz(false)); }}>
          <input class="girdi" style="flex:1;min-width:200px" lang="tr" aria-label="Kabul gerekçesi" placeholder="Neden böyle kalsın?" value={gerekce}
            onInput={(e) => setGerekce((e.target as HTMLInputElement).value)} autoFocus />
          <button class="dugme ana kucuk" disabled={!gerekce.trim()}>Kabul et</button>
          <button type="button" class="dugme sade kucuk" onClick={() => setKabulYaz(false)}>Vazgeç</button>
        </form>
      ) : (
        <div class="satir">
          {b.karar ? <button class="dugme kucuk" onClick={() => karar(b.anahtar, null)}>{b.karar.durum === 'ertelendi' ? 'Kuyruğa geri koy' : 'Yeniden aç'}</button> : <>
            <button class="dugme kucuk" onClick={() => setKabulYaz(true)}>Bu hâliyle kabul et…</button>
            <button class="dugme sade kucuk" onClick={() => karar(b.anahtar, 'ertelendi')}>Ertele</button>
          </>}
        </div>
      )}
    </li>
  );
}

/** Etki incelemeleri (§9.2, §9.3): bir olayın tarihi değişince ya da katılımcısı çıkarılınca bağlı kayıtlar. */
function EtkiBolumu({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [x, setX] = useState<EtkiIncelemeleri | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('etkiIncelemeleri', { evren }).then(setX, (e) => setHata(hataYaz(e))); }, [evren, surum]);
  const karar = (anahtar: string, durum: 'kabul' | 'ertelendi' | 'duzeltildi' | null, gerekce = '') =>
    istemci.iste('etkiKarari', { evren, anahtar, durum, gerekce }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); throw e; });
  if (!x) return null;
  return (
    <section aria-label="Değişikliklerin etkisi">
      <h2>Değişikliklerin etkisi</h2>
      <p class="soluk kucuk">Bir olayın tarihi değişince ya da bir katılımcısı çıkarılınca, açıkça bağlı olduğu kayıtlar (neden–sonuç bağları, onu anlatan sahneler) burada incelenir. Yalnızca bahseden metinler buraya düşmez.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      {!x.acik.length && <p class="soluk">İncelenecek etki yok.</p>}
      {x.acik.length > 0 && <ul class="bulgular">{x.acik.map((b) => <EtkiSatiri key={b.anahtar} evren={evren} b={b} karar={karar} />)}</ul>}
      {x.ertelenen.length > 0 && (
        <details class="bulgu-grubu"><summary>Ertelenenler ({x.ertelenen.length})</summary>
          <ul class="bulgular">{x.ertelenen.map((b) => <EtkiSatiri key={b.anahtar} evren={evren} b={b} karar={karar} />)}</ul></details>
      )}
      {x.kapanan.length > 0 && (
        <details class="bulgu-grubu"><summary>Kapananlar ({x.kapanan.length})</summary>
          <ul class="bulgular">{x.kapanan.map((b) => <EtkiSatiri key={b.anahtar} evren={evren} b={b} karar={karar} />)}</ul></details>
      )}
    </section>
  );
}

function EtkiSatiri({ evren, b, karar }: { evren: string; b: EtkiIncelemesi; karar: (a: string, d: 'kabul' | 'ertelendi' | 'duzeltildi' | null, g?: string) => Promise<unknown> }) {
  const [kabulYaz, setKabulYaz] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const ne = b.degisim === 'tarih' ? `tarihi değişti (“${b.once ?? '—'}” → “${b.sonra ?? 'tarih kaldırıldı'}”)` : `katılımcıları değişti (${b.sonra ?? ''})`;
  return (
    <li class="kart bulgu">
      <div class="satir"><a class="satir-ad" href={`#/e/${evren}/k/${b.hedef.kod}`}>{b.hedef.ad}</a> <span>incelenmeli</span></div>
      <p class="soluk kucuk"><a href={`#/e/${evren}/k/${b.kaynak.kod}`}>{b.kaynak.ad}</a> {ne}. Bağ: {b.aciklama} <span>({zamanYaz(b.zaman)})</span></p>
      {b.karar?.durum === 'kabul' && <p class="kucuk">Kabul edildi ({zamanYaz(b.karar.zaman)}): {b.karar.gerekce}</p>}
      {b.karar?.durum === 'duzeltildi' && <p class="kucuk">Düzeltildi ({zamanYaz(b.karar.zaman)}).</p>}
      {b.karar?.durum === 'ertelendi' && <p class="soluk kucuk">Ertelendi ({zamanYaz(b.karar.zaman)}).</p>}
      {kabulYaz ? (
        <form class="satir" onSubmit={(e) => { e.preventDefault(); void karar(b.anahtar, 'kabul', gerekce).then(() => setKabulYaz(false)); }}>
          <input class="girdi" style="flex:1;min-width:200px" lang="tr" aria-label="Kabul gerekçesi" placeholder="Neden böyle kalsın?" value={gerekce}
            onInput={(e) => setGerekce((e.target as HTMLInputElement).value)} autoFocus />
          <button class="dugme ana kucuk" disabled={!gerekce.trim()}>Kabul et</button>
          <button type="button" class="dugme sade kucuk" onClick={() => setKabulYaz(false)}>Vazgeç</button>
        </form>
      ) : (
        <div class="satir">
          {b.karar ? <button class="dugme kucuk" onClick={() => karar(b.anahtar, null)}>{b.karar.durum === 'ertelendi' ? 'Kuyruğa geri koy' : 'Yeniden aç'}</button> : <>
            <button class="dugme kucuk" onClick={() => karar(b.anahtar, 'duzeltildi')}>Düzelttim</button>
            <button class="dugme kucuk" onClick={() => setKabulYaz(true)}>Bu hâliyle kabul et…</button>
            <button class="dugme sade kucuk" onClick={() => karar(b.anahtar, 'ertelendi')}>Ertele</button>
          </>}
        </div>
      )}
    </li>
  );
}
