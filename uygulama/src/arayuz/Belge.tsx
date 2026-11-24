// Evren içi belge çıktısı (§11.5): metni yazar yazar; program biçimi, mührü, tarihi, yeri ve bağlı kişileri ekleyerek sunar.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { BelgeSunumu } from '../veri/api';
import type { Istemci } from '../veri/istemci';
import { KayitSec } from './KayitBolumleri';
import { yazdir } from './Cikti';
import { ESKIMELER, KAGITLAR, MUHUR_RENKLERI, MUHUR_SEKILLERI, YAZILAR } from '../alan/belge-tasarimi';

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
  const secenek = <K extends keyof BelgeSunumu>(alan: K, ad: string, liste: readonly (readonly [BelgeSunumu[K], string, ...string[]])[]) => (
    <>
      <span class="alan-adi">{ad}</span>
      <div class="belge-secenekleri" role="group" aria-label={ad}>
        {liste.map(([kod, etiket]) => <button key={String(kod)} type="button" aria-pressed={sunum[alan] === kod} disabled={saltOkunur} onClick={() => yaz({ ...sunum, [alan]: kod })}>{etiket}</button>)}
      </div>
    </>
  );
  return (
    <section class="surecler" aria-label="Belgenin sunumu">
      <h2>Belgenin sunumu</h2>
      <p class="soluk kucuk">Metni siz yazarsınız; program seçtiğiniz biçime göre düzeni, mührü, yeri, tarihi ve imzaları ekler. Tarih kaydın tarihinden alınır. Kâğıt dokusu resim değil, renk geçişidir.</p>
      <div class="belge-tasarimci">
        <div class="kart belge-ayarlar">
          {secenek('bicim', 'Biçim', BICIMLER.map((b) => [b.kod, b.ad] as const))}
          {secenek('kagit', 'Kâğıt', KAGITLAR)}
          {secenek('yazi', 'Yazı', YAZILAR)}
          {secenek('eskime', 'Eskime', ESKIMELER)}
          {secenek('muhurSekli', 'Mühür', MUHUR_SEKILLERI)}
          {sunum.muhurSekli !== 'yok' && <div class="satir" role="group" aria-label="Mührün rengi">
            {MUHUR_RENKLERI.map(([kod, ad, renk]) => <button key={kod} type="button" class="belge-renk" style={`background:${renk}`} aria-label={ad} title={ad} aria-pressed={sunum.muhurRengi === kod} disabled={saltOkunur} onClick={() => yaz({ ...sunum, muhurRengi: kod })} />)}
            <span class="soluk kucuk">{MUHUR_RENKLERI.find((r) => r[0] === sunum.muhurRengi)?.[1]}</span>
          </div>}
          <label class="alan-adi">Mühür yazısı
            <input class="girdi" lang="tr" maxLength={40} value={yazi} disabled={saltOkunur} placeholder="Boşsa mühür sahibinin adı" onInput={(e) => setYazi((e.target as HTMLInputElement).value)}
              onBlur={() => { if (yazi.trim() !== sunum.muhurYazisi) yaz({ ...sunum, muhurYazisi: yazi.trim() }); }} />
          </label>
          {TEKLILER.map((t) => (
            <div key={t.alan} class="kucuk satir">{t.ad}:{' '}
              {saltOkunur ? (secim(sunum[t.alan])?.ad ?? '—') : <>
                <KayitSec istemci={istemci} evren={evren} secili={secim(sunum[t.alan])} etiket="Seç" sec={(s) => yaz({ ...sunum, [t.alan]: s?.kod ?? null }, s ? { [s.kod]: s.ad } : {})} />
                {sunum[t.alan] && <button class="dugme sade kucuk" aria-label={`${t.ad} seçimini kaldır`} onClick={() => yaz({ ...sunum, [t.alan]: null })}>Kaldır</button>}
              </>}
            </div>
          ))}
          <div class="satir">
            <span class="kucuk">İmzalayanlar:</span>
            {sunum.imzalayanlar.map((k) => (
              <span key={k} class="kucuk">{adlar[k] ?? '…'}{!saltOkunur && <> <button class="dugme sade kucuk" aria-label={`${adlar[k] ?? ''} imzasını kaldır`} onClick={() => yaz({ ...sunum, imzalayanlar: sunum.imzalayanlar.filter((x) => x !== k) })}>Kaldır</button></>}</span>
            ))}
            {!saltOkunur && <KayitSec istemci={istemci} evren={evren} secili={null} etiket="İmzalayan ekle" sec={(s) => { if (s && !sunum.imzalayanlar.includes(s.kod)) yaz({ ...sunum, imzalayanlar: [...sunum.imzalayanlar, s.kod] }, { [s.kod]: s.ad }); }} />}
          </div>
          <label class="satir kucuk"><input type="checkbox" checked={sunum.okurYayini} disabled={saltOkunur} onChange={() => yaz({ ...sunum, okurYayini: !sunum.okurYayini })} /> Okur yayınına girsin</label>
          <p class="soluk kucuk">Açıksa belge, okur yayınında okura açık olduğu sınırdan itibaren bu görünümle yer alır.</p>
          {hata && <p class="hata kucuk">{hata}</p>}
          <div class="satir"><button class="dugme kucuk" onClick={() => istemci.iste('belgeCiktisi', { evren, kod }).then((r) => yazdir(r.html), (e) => setHata(hataYaz(e)))}>Yazdır / PDF</button></div>
        </div>
        {html && <iframe title="Belgenin görünümü" srcdoc={html} sandbox="allow-same-origin" />}
      </div>
    </section>
  );
}
