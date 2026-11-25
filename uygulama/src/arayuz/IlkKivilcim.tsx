// İlk Kıvılcım (§5.11, K43): yeni evren oluşturulunca gezinti çubuğu olmadan ortada üç kartlık karşılama.
// Her kart isteğe bağlıdır; "Atla, boş sayfayı aç →" her zaman sağ üsttedir. Son düğme eseri, bölümü, sahneyi ve
// yazılan karakter ile mekânı tek değişiklik grubunda oluşturup sahneyi açar. Soluk örnekler uydurmadır.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import { gitVeYap } from './yonlendirme';
import { kipYaz } from './kip';

/** Kurgu türüne göre soluk örnekler: [fikir, karakter, karakter notu, mekân, mekân notu]. */
const ORNEKLER: Record<string, readonly [string, string, string, string, string]> = {
  fantastik: ['Sürgün bir yüzbaşı, kuzeyde yanan feneri görünce geri döner.', 'Kaelen', 'sürgün yüzbaşı', 'Kuzey Limanı', 'sisli sınır kenti'],
  bilimkurgu: ['Yörüngedeki son istasyon, yıllardır susan bir sinyali yeniden alır.', 'Mira Oduya', 'istasyonun gece nöbetçisi', 'Tethys İstasyonu', 'buz uydusunun yörüngesinde'],
  tarihi: ['Bir kâtip, mühürlü bir mektubu yanlış kapıya teslim eder.', 'Kâtip Rıfat', 'divanın en genç kâtibi', 'Liman hanı', 'kervanların konakladığı yer'],
  gercekci: ['Babasının dükkânını kapatmaya gelen kadın, bir defter bulur.', 'Selin', 'şehre yeni dönmüş', 'Eski çarşı', 'kepenkleri yarı inik sokak'],
  polisiye: ['Kayıp bir saatçi, dükkânında yalnızca durmuş saatler bırakır.', 'Komiser Ayaz', 'emekliliğine bir ay kalmış', 'Saatçiler Yokuşu', 'yağmurlu dar sokak'],
};
const VARSAYILAN = ORNEKLER.fantastik;

export function IlkKivilcim({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [adim, setAdim] = useState(1);
  const [kurgu, setKurgu] = useState<string | null>(null);
  const [eser, setEser] = useState('Adsız roman');
  const [fikir, setFikir] = useState('');
  const [karakter, setKarakter] = useState({ ad: '', not: '' });
  const [mekan, setMekan] = useState({ ad: '', not: '' });
  const [sahne, setSahne] = useState('1. Sahne');
  const [bolumlu, setBolumlu] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then((b) => setKurgu(b.kurguTuru), () => {}); }, [evren]);
  useEffect(() => { document.querySelector<HTMLElement>('.kivilcim input, .kivilcim textarea')?.focus(); }, [adim]);
  const o = (kurgu && ORNEKLER[kurgu]) || VARSAYILAN;

  const bitir = async () => {
    setHata(null); setCalisiyor(true);
    try {
      const { sahne: kod } = await istemci.iste('ilkKivilcim', { evren, eser, fikir, karakter, mekan, sahne, bolumlu });
      kipYaz(evren, 'sade');
      void gitVeYap(`/e/${evren}/yaz/${kod}`, [{ odak: '.yaz-kagidi .ProseMirror' }]);
    } catch (e) { setHata((e as Error).message); setCalisiyor(false); }
  };
  const ileri = (e: Event) => { e.preventDefault(); if (adim < 3) setAdim(adim + 1); else void bitir(); };

  return (
    <main class="kivilcim">
      <a class="atla" href={`#/e/${evren}/yaz`}>Atla, boş sayfayı aç →</a>
      <form class="kart kivilcim-karti" onSubmit={ileri}>
        <div class="kivilcim-noktalar" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} class={i <= adim ? 'dolu' : undefined} />)}</div>
        <div class="kivilcim-adim">{adim} / 3</div>
        {adim === 1 && <>
          <h2>Hikâyenizin adı ne olsun?</h2>
          <p class="soluk kucuk">Henüz adı yoksa böyle bırakın; sonra değiştirirsiniz.</p>
          <label for="kv-eser">Eserin adı</label>
          <input id="kv-eser" class="girdi" value={eser} onInput={(e) => setEser((e.target as HTMLInputElement).value)} />
          <label for="kv-fikir">Aklınızdaki ilk fikir, görüntü ya da soru <span class="soluk">(isteğe bağlı)</span></label>
          <textarea id="kv-fikir" class="girdi" rows={3} maxLength={500} placeholder={`Bir iki cümle yeter. Örn. ${o[0]}`} value={fikir} onInput={(e) => setFikir((e.target as HTMLTextAreaElement).value)} />
        </>}
        {adim === 2 && <>
          <h2>İlk sahnede kim var, neredeyiz?</h2>
          <p class="soluk kucuk">İsteğe bağlı. Doldurduğunuz kutu kendi kaydını oluşturur ve sahneye bağlanır.</p>
          <label for="kv-karakter">İlk karakter</label>
          <div class="kivilcim-ikili">
            <input id="kv-karakter" class="girdi" placeholder={`Örn. ${o[1]}`} value={karakter.ad} onInput={(e) => setKarakter({ ...karakter, ad: (e.target as HTMLInputElement).value })} />
            <input class="girdi" aria-label="İlk karakter için tek satır not" placeholder={`Tek satır not: ${o[2]}`} value={karakter.not} onInput={(e) => setKarakter({ ...karakter, not: (e.target as HTMLInputElement).value })} />
          </div>
          <label for="kv-mekan">İlk mekân</label>
          <div class="kivilcim-ikili">
            <input id="kv-mekan" class="girdi" placeholder={`Örn. ${o[3]}`} value={mekan.ad} onInput={(e) => setMekan({ ...mekan, ad: (e.target as HTMLInputElement).value })} />
            <input class="girdi" aria-label="İlk mekân için tek satır not" placeholder={`Tek satır not: ${o[4]}`} value={mekan.not} onInput={(e) => setMekan({ ...mekan, not: (e.target as HTMLInputElement).value })} />
          </div>
        </>}
        {adim === 3 && <>
          <h2>İlk sahneye nasıl başlayalım?</h2>
          <label for="kv-sahne">Sahnenin adı</label>
          <input id="kv-sahne" class="girdi" value={sahne} onInput={(e) => setSahne((e.target as HTMLInputElement).value)} />
          <div class="kivilcim-secim" role="radiogroup" aria-label="Sahnenin yeri">
            <label><input type="radio" name="kv-bolum" checked={bolumlu} onChange={() => setBolumlu(true)} /> 1. bölümün içinde</label>
            <label><input type="radio" name="kv-bolum" checked={!bolumlu} onChange={() => setBolumlu(false)} /> Bölümsüz</label>
          </div>
        </>}
        {hata && <p class="hata" role="alert">{hata}</p>}
        <div class="kivilcim-alt">
          {adim > 1 ? <button key="geri" type="button" class="dugme sade" onClick={() => setAdim(adim - 1)}>← Geri</button> : <span />}
          <button key="ileri" type="submit" class="dugme ana" disabled={calisiyor}>{adim < 3 ? 'Devam et →' : calisiyor ? 'Hazırlanıyor…' : 'İlk sahneyi aç ve yazmaya başla'}</button>
        </div>
      </form>
    </main>
  );
}
