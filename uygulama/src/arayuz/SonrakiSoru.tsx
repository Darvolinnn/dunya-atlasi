// F33 bir sonraki yararlı soru: seçilen hesap için hangi bilginin eksik olduğu ve o bilginin başka hangi
// hesaplarda kullanıldığı. Önem puanı değildir; hiçbir şey yazmaz.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { SonrakiSoru } from '../veri/api';
import { KayitSec } from './KayitBolumleri';

const hataYaz = (e: unknown) => (e as Error).message;
const IMLER = { var: '✓', eksik: '○', 'kısmen': '◐' } as const;

export function SonrakiSoruBolumu({ istemci, evren, kod, tur }: { istemci: Istemci; evren: string; kod: string; tur: string }) {
  const [hesaplar, setHesaplar] = useState<{ hesap: SonrakiSoru['hesap']; ad: string }[]>([]);
  const [hesap, setHesap] = useState<SonrakiSoru['hesap'] | ''>('');
  const [nereden, setNereden] = useState<{ kod: string; ad: string } | null>(null);
  const [tarih, setTarih] = useState('');
  const [r, setR] = useState<SonrakiSoru | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { setR(null); setHesap(''); istemci.iste('sorulabilirHesaplar', { evren, kod }).then(setHesaplar, () => setHesaplar([])); }, [kod]);
  if (!hesaplar.length) return null;
  const sor = (e: Event) => {
    e.preventDefault();
    if (!hesap) return;
    istemci.iste('sonrakiSoru', { evren, kod, hesap, nereden: nereden?.kod ?? null, tarih: tarih.trim() || null })
      .then((x) => { setR(x); setHata(null); }, (x) => { setR(null); setHata(hataYaz(x)); });
  };
  const bag = (k: { kod: string; ad: string }) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
  return (
    <section class="sonraki-soru" aria-label="Bu hesap için ne eksik">
      <details>
        <summary><h2 style="display:inline">Bu hesap için ne eksik?</h2></summary>
        <p class="soluk kucuk">Çözmek istediğiniz hesabı seçin; program yalnızca o hesap için eksik olanı gösterir.</p>
        <form class="satir" onSubmit={sor}>
          <label class="alan"><span class="alan-adi">Hesap</span>
            <select class="girdi" value={hesap} onChange={(e) => { setHesap((e.target as HTMLSelectElement).value as SonrakiSoru['hesap']); setR(null); }}>
              <option value="">Seçin</option>
              {hesaplar.map((h) => <option value={h.hesap}>{h.ad}</option>)}
            </select></label>
          {hesap === 'yol' && <div class="alan"><span class="alan-adi">Nereden?</span><KayitSec istemci={istemci} evren={evren} secili={nereden} etiket="Çıkış yerini seç" sec={setNereden} /></div>}
          {(hesap === 'yas' || (hesap === 'yol' && tur !== 'sahne')) && (
            <label class="alan"><span class="alan-adi">{hesap === 'yas' ? 'Hangi tarihte? (isteğe bağlı)' : 'Ne zaman? (isteğe bağlı)'}</span>
              <input class="girdi" lang="tr" style="width:140px" value={tarih} placeholder="Örn. 430" onInput={(e) => setTarih((e.target as HTMLInputElement).value)} /></label>
          )}
          <button class="dugme ana kucuk" type="submit" disabled={!hesap}>Göster</button>
        </form>
        {hata && <p class="hata kucuk">{hata}</p>}
        {r && (
          <div class="kart">
            <p><strong>{r.hazir ? 'Bu hesap için gereken bilgi yazılmış.' : r.siradaki ? `Sıradaki soru: ${r.siradaki.ad}` : ''}</strong></p>
            <ul class="sonraki-soru-listesi">{r.girdiler.map((g, i) => (
              <li key={i} class={`girdi-${g.durum === 'kısmen' ? 'kismen' : g.durum}`}>
                <span aria-label={g.durum}>{IMLER[g.durum]}</span> <strong>{g.ad}</strong>{g.kayit && <> · {bag(g.kayit)}</>}{g.aciklama && <span class="soluk"> · {g.aciklama}</span>}
                {g.kullanim.length > 0 && <div class="soluk kucuk">Bu bilgi {g.kullanim.length} hesapta kullanılıyor: {g.kullanim.join(', ')}.</div>}
              </li>
            ))}</ul>
            <p class="soluk kucuk">{r.not}</p>
          </div>
        )}
      </details>
    </section>
  );
}
