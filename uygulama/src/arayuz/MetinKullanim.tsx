// Metin ile kullanım yeri (F30, §3.3). Başka bir kaydın metnini bu metne almak (ortak kaynağa bağlı, kopya ya da
// bağımsız türev olarak) ve bir kaynak metnin kullanıldığı yerleri görmek.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KullanimBicimi, MetinKullanimi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { useYukle } from './Anlati';
import type { Secim } from './BaglantiSecici';

export const BICIMLER: { kod: KullanimBicimi; ad: string; aciklama: string }[] = [
  { kod: 'bagli', ad: 'Ortak kaynağa bağla', aciklama: 'Kaynak değişince burada haber verilir; isterseniz kaynaktan güncellersiniz.' },
  { kod: 'kopya', ad: 'Kopyala', aciklama: 'Kaynağın bugünkü hâli alınır; sonraki değişiklikler izlenmez.' },
  { kod: 'turev', ad: 'Bağımsız türev', aciklama: 'Kaynaktan doğar ama kendi yoluna gider; nereden geldiği kayıtlı kalır.' },
];
export const bicimAdi = (b: KullanimBicimi) => ({ bagli: 'ortak kaynağa bağlı', kopya: 'kopya', turev: 'bağımsız türev' })[b];

/** Metne başka bir kaydın metnini alma formu. */
export function MetinAlFormu({ istemci, evren, al, vazgec }: {
  istemci: Istemci; evren: string; al: (kaynak: string, bicim: KullanimBicimi) => Promise<void>; vazgec: () => void;
}) {
  const [kaynak, setKaynak] = useState<Secim | null>(null);
  const [bicim, setBicim] = useState<KullanimBicimi>('bagli');
  const [hata, setHata] = useState<string | null>(null);
  const gonder = (e: Event) => {
    e.preventDefault();
    if (kaynak) al(kaynak.kod, bicim).catch((x) => setHata((x as Error).message));
  };
  return (
    <form class="kart ayirma" onSubmit={gonder} aria-label="Başka bir metni al">
      <p class="kucuk" style="margin:0 0 6px">Bir efsane, mektup ya da şarkı imlecin bulunduğu yere alınır. Kaynak metin kendi kaydında kalır.</p>
      <div class="satir kucuk"><span>Kaynak metin</span><KayitSec istemci={istemci} evren={evren} secili={kaynak} etiket="Kaydı seç" sec={setKaynak} /></div>
      <ul class="secim-listesi kucuk">
        {BICIMLER.map((b) => (
          <li key={b.kod}><label><input type="radio" name="kullanim-bicimi" checked={bicim === b.kod} onChange={() => setBicim(b.kod)} /> <strong>{b.ad}</strong> <span class="soluk">{b.aciklama}</span></label></li>
        ))}
      </ul>
      <div class="satir">
        <button class="dugme ana kucuk" disabled={!kaynak}>Al</button>
        <button type="button" class="dugme sade kucuk" onClick={vazgec}>Vazgeç</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </form>
  );
}

/** İmlecin bulunduğu kullanımın şeridi. */
export function KullanimSeridi({ istemci, evren, k, saltOkunur, islem, kaldir }: {
  istemci: Istemci; evren: string; k: MetinKullanimi; saltOkunur: boolean;
  /** Metni kaydedip isteği yapar, sonra metni yeniden okur. */
  islem: (f: () => Promise<unknown>) => Promise<void>;
  /** Bağı kaldırır; metin yerinde kalır. */
  kaldir: () => void;
}) {
  const [tasi, setTasi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const yap = (f: () => Promise<unknown>) => { setHata(null); islem(f).catch((x) => setHata((x as Error).message)); };
  const dugme = (ad: string, f: () => void) => <button type="button" class="dugme sade kucuk" onMouseDown={(e) => e.preventDefault()} onClick={f}>{ad}</button>;
  return (
    <div class="isaret-seridi kucuk" aria-label="Alınan metin">
      <span class="satir">
        <span>
          {k.kaynak ? <><a href={`#/e/${evren}/k/${k.kaynak.kod}`}>{k.kaynak.ad}</a> metninden alındı</> : 'Kaynak metin silinmiş'} · {bicimAdi(k.bicim)}
          {k.kaynakDegisti && <strong> · Kaynak metin değişti.</strong>}
          {k.ayrildi && ' · Buradaki metin, alındığı hâlden farklı.'}
        </span>
        {!saltOkunur && k.bicim === 'bagli' && k.kaynak && (k.kaynakDegisti || k.ayrildi) && dugme('Kaynaktan güncelle', () => yap(() => istemci.iste('metinKullanimGuncelle', { evren, kod: k.kod })))}
        {!saltOkunur && k.bicim !== 'turev' && dugme('Bağımsız türeve çevir', () => yap(() => istemci.iste('metinKullanimTurev', { evren, kod: k.kod })))}
        {!saltOkunur && dugme('Başka metne taşı', () => setTasi(!tasi))}
        {!saltOkunur && dugme('Bağlantıyı kaldır', kaldir)}
      </span>
      {tasi && <span class="satir">Taşınacağı metin: <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Kaydı seç"
        sec={(s) => { if (s) { setTasi(false); yap(() => istemci.iste('metinKullanimTasi', { evren, kod: k.kod, hedef: s.kod })); } }} /></span>}
      {hata && <span class="hata">{hata}</span>}
    </div>
  );
}

/** Kaynak metnin kullanıldığı yerler; kullanılmıyorsa görünmez. */
export function KullanildigiYerler({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const [l] = useYukle<MetinKullanimi[]>(istemci, evren, () => istemci.iste('metinKullanildigiYerler', { evren, kaynak: kod }), [kod]);
  if (!l?.length) return null;
  return (
    <section aria-label="Metnin kullanıldığı yerler">
      <h2>Bu metnin kullanıldığı yerler</h2>
      <ul class="toplanan-listesi">
        {l.map((k) => (
          <li key={k.kod}>
            <a href={`#/e/${evren}/k/${k.hedef.kod}`}>{k.hedef.ad}</a> <span class="soluk kucuk">· {bicimAdi(k.bicim)}
              {k.kaynakDegisti && ' · bu metin değiştiği için orada eski hâli duruyor'}
              {k.ayrildi && !k.kaynakDegisti && ' · orada değiştirilmiş'}
              {!k.metinde && ' · metinde bulunamadı'}</span>
          </li>
        ))}
      </ul>
      <p class="soluk kucuk">Yayımlanmış bir eserdeki hâli o yayım sürümünde sabit kalır; burada yapılan değişiklikler onu etkilemez.</p>
    </section>
  );
}
