// Evren içi belge çıktısı (§11.5): metni yazar yazar; program biçimi, mührü, tarihi, yeri ve bağlı kişileri ekleyerek sunar.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { BelgeSunumu } from '../veri/api';
import type { Istemci } from '../veri/istemci';
import { KayitSec } from './KayitBolumleri';
import { yazdir } from './Cikti';

const BICIMLER: { kod: BelgeSunumu['bicim']; ad: string }[] = [
  { kod: 'mektup', ad: 'Mektup' }, { kod: 'gazete', ad: 'Gazete sayfası' }, { kod: 'ilan', ad: 'İlan' },
  { kod: 'izin', ad: 'Seyahat izni' }, { kod: 'gunluk', ad: 'Günlük' }, { kod: 'antlasma', ad: 'Antlaşma' }, { kod: 'mezar', ad: 'Mezar yazısı' },
];
const hataYaz = (e: unknown) => (e as Error).message;
type Tekli = 'yazan' | 'alici' | 'yer' | 'muhur';
const TEKLILER: { alan: Tekli; ad: string }[] = [{ alan: 'yazan', ad: 'Yazan' }, { alan: 'alici', ad: 'Alıcı' }, { alan: 'yer', ad: 'Yazıldığı yer' }, { alan: 'muhur', ad: 'Mühür sahibi' }];

export function BelgeSunumBolumu({ istemci, evren, kod, surum, saltOkunur }: { istemci: Istemci; evren: string; kod: string; surum: number; saltOkunur?: boolean }) {
  const [v, setV] = useState<{ sunum: BelgeSunumu; adlar: Record<string, string> } | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yazi, setYazi] = useState('');
  // Yazım sürerken gelen eski okumalar yeni seçimi ezmesin diye her okuma bir sıra numarası taşır.
  const sira = useRef(0);
  const oku = () => {
    const n = ++sira.current;
    istemci.iste('belgeSunumu', { evren, kod }).then((r) => { if (n === sira.current) { setV(r); setYazi(r.sunum.muhurYazisi); } }, () => {});
    istemci.iste('belgeCiktisi', { evren, kod }).then((r) => { if (n === sira.current) setHtml(r.html); }, () => {});
  };
  useEffect(oku, [kod, surum]);
  if (!v) return null;
  const { sunum, adlar } = v;
  const yaz = (s: BelgeSunumu, yeniAdlar: Record<string, string> = {}) => {
    sira.current++;
    setV({ sunum: s, adlar: { ...adlar, ...yeniAdlar } });
    istemci.iste('belgeSunumuYaz', { evren, kod, sunum: s }).then(() => { setHata(null); oku(); }, (e) => { setHata(hataYaz(e)); oku(); });
  };
  const secim = (k: string | null) => (k ? { kod: k, ad: adlar[k] ?? '…' } : null);
  return (
    <section class="surecler" aria-label="Belgenin sunumu">
      <h2>Belgenin sunumu</h2>
      <p class="soluk kucuk">Metni siz yazarsınız; program seçtiğiniz biçime göre düzeni, mührü, yeri, tarihi ve imzaları ekler. Tarih kaydın tarihinden alınır.</p>
      <div class="satir">
        <label class="kucuk">Biçim{' '}
          <select class="girdi kucuk-secim" value={sunum.bicim} disabled={saltOkunur} onChange={(e) => yaz({ ...sunum, bicim: (e.target as HTMLSelectElement).value as BelgeSunumu['bicim'] })}>
            {BICIMLER.map((b) => <option value={b.kod}>{b.ad}</option>)}
          </select>
        </label>
      </div>
      <div class="satir">
        {TEKLILER.map((t) => (
          <span key={t.alan} class="kucuk">{t.ad}:{' '}
            {saltOkunur ? (secim(sunum[t.alan])?.ad ?? '—') : <>
              <KayitSec istemci={istemci} evren={evren} secili={secim(sunum[t.alan])} etiket="Seç" sec={(s) => yaz({ ...sunum, [t.alan]: s?.kod ?? null }, s ? { [s.kod]: s.ad } : {})} />
              {sunum[t.alan] && <button class="dugme sade kucuk" aria-label={`${t.ad} seçimini kaldır`} onClick={() => yaz({ ...sunum, [t.alan]: null })}>Kaldır</button>}
            </>}
          </span>
        ))}
      </div>
      <div class="satir">
        <label class="kucuk">Mühür yazısı{' '}
          <input class="girdi" lang="tr" maxLength={40} value={yazi} disabled={saltOkunur} placeholder="Boşsa mühür sahibinin adı" onInput={(e) => setYazi((e.target as HTMLInputElement).value)}
            onBlur={() => { if (yazi.trim() !== sunum.muhurYazisi) yaz({ ...sunum, muhurYazisi: yazi.trim() }); }} />
        </label>
      </div>
      <div class="satir">
        <span class="kucuk">İmzalayanlar:</span>
        {sunum.imzalayanlar.map((k) => (
          <span key={k} class="kucuk">{adlar[k] ?? '…'}{!saltOkunur && <> <button class="dugme sade kucuk" aria-label={`${adlar[k] ?? ''} imzasını kaldır`} onClick={() => yaz({ ...sunum, imzalayanlar: sunum.imzalayanlar.filter((x) => x !== k) })}>Kaldır</button></>}</span>
        ))}
        {!saltOkunur && <KayitSec istemci={istemci} evren={evren} secili={null} etiket="İmzalayan ekle" sec={(s) => { if (s && !sunum.imzalayanlar.includes(s.kod)) yaz({ ...sunum, imzalayanlar: [...sunum.imzalayanlar, s.kod] }, { [s.kod]: s.ad }); }} />}
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {html && <iframe title="Belgenin görünümü" srcdoc={html} sandbox="allow-same-origin" style="width:100%;height:480px;border:1px solid var(--kenar, #ccc);border-radius:6px;background:#fff" />}
      <div class="satir"><button class="dugme kucuk" onClick={() => istemci.iste('belgeCiktisi', { evren, kod }).then((r) => yazdir(r.html), (e) => setHata(hataYaz(e)))}>Yazdır / PDF</button></div>
    </section>
  );
}
