// Evrenin sözlüğü (K37): uydurulan kelimeler tek yerde, Türkçe alfabe sırasıyla. "Terim" kayıtları, "sözlük"
// etiketli öbür kayıtlar ve dil kayıtlarının sözcükleri. Kelime buradan eklenir; var olan bir kayıt etiketle alınır.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { TerimGirdisi } from '../veri/api';
import { SOZCUK_TURLERI, SOZLUK_ETIKETI } from '../alan/sablon';
import { katla } from '../alan/turkce';
import { turBul } from '../alan/turler';
import { KayitSec } from './KayitBolumleri';
import { geriAlinabilir } from './onay';

const ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
const basHarf = (s: string) => {
  const h = s.trim().charAt(0).toLocaleUpperCase('tr-TR');
  return ALFABE.includes(h) ? h : '#';
};

export function TerimSozlugu({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [liste, setListe] = useState<TerimGirdisi[] | null>(null);
  const [n, setN] = useState(0);
  const [ara, setAra] = useState('');
  const [dil, setDil] = useState('');
  const [ekle, setEkle] = useState(false);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  useEffect(() => { istemci.iste('terimSozlugu', { evren }).then(setListe, () => setListe([])); }, [evren, n]);
  const diller = useMemo(() => [...new Set((liste ?? []).map((x) => x.dil).filter((x): x is string => !!x))], [liste]);
  if (!liste) return <p class="soluk">Açılıyor…</p>;
  const k = katla(ara.trim());
  const gorunen = liste.filter((x) => (!dil || x.dil === dil) && (!k || katla(x.ad).includes(k) || katla(x.anlam).includes(k)));
  const gruplar = new Map<string, TerimGirdisi[]>();
  for (const x of gorunen) { const h = basHarf(x.ad); gruplar.set(h, [...(gruplar.get(h) ?? []), x]); }
  const harfler = [...gruplar.keys()];
  return (
    <div class="terim-sozlugu">
      <div class="satir sozluk-ust">
        <input class="girdi" type="search" aria-label="Kelime ara" placeholder="Kelime ara…" value={ara} onInput={(e) => setAra((e.target as HTMLInputElement).value)} />
        {diller.length > 0 && (
          <select class="girdi kucuk-girdi" aria-label="Dile göre süz" value={dil} onChange={(e) => setDil((e.target as HTMLSelectElement).value)}>
            <option value="">Bütün diller</option>
            {diller.map((d) => <option value={d}>{d}</option>)}
          </select>
        )}
        <span class="bosluk" />
        <SozlugeKayitAl istemci={istemci} evren={evren} />
        <button class="dugme ana" aria-expanded={ekle} onClick={() => setEkle(!ekle)}>+ Kelime ekle</button>
      </div>
      {ekle && <KelimeEkle istemci={istemci} evren={evren} kapat={() => setEkle(false)} />}
      <nav class="harf-cubugu" aria-label="Harfler">
        {ALFABE.map((h) => harfler.includes(h)
          ? <a key={h} href={`#harf-${h}`} onClick={(e) => { e.preventDefault(); document.getElementById(`harf-${h}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{h}</a>
          : <span key={h} aria-hidden="true">{h}</span>)}
      </nav>
      {!liste.length && <p class="soluk">Sözlük boş. “Kelime ekle” ile uydurduğunuz bir kelimeyi yazın; var olan bir kaydı (eşya, yer, ritüel) “Kayıttan al” ile sözlüğe alabilirsiniz. Dillerin sözcükleri de burada görünür.</p>}
      {liste.length > 0 && !gorunen.length && <p class="soluk">Aramaya uyan kelime yok.</p>}
      {[...gruplar].map(([h, l]) => (
        <section key={h} class="sozluk-harfi" aria-labelledby={`harf-${h}`}>
          <h2 id={`harf-${h}`}>{h}</h2>
          <dl>
            {l.map((x) => (
              <div key={`${x.kaynak}-${x.kod}-${x.ad}`} class="sozluk-girdisi">
                <dt>
                  <a href={`#/e/${evren}/k/${x.kod}`}>{x.ad}</a>
                  <span class="soluk kucuk"> {[x.sozcukTuru, x.dil, x.kaynak === 'isaret' ? turBul(x.tur).ad : null].filter(Boolean).join(' · ')}</span>
                </dt>
                <dd>
                  <span>{x.anlam || <span class="soluk">Anlamı yazılmamış.</span>}</span>
                  {x.gecis !== null && <span class="soluk kucuk sozluk-gecis">{x.gecis ? `${x.gecis.toLocaleString('tr-TR')} yerde geçiyor` : 'metinde geçmiyor'}</span>}
                  {x.kaynak === 'isaret' && (
                    <button class="dugme sade kucuk" onClick={() => void geriAlinabilir(`“${x.ad}” sözlükten çıkarıldı.`,
                      () => istemci.iste('kayitListe', { evren, kod: x.kod, liste: 'etiket', cikar: SOZLUK_ETIKETI }),
                      () => istemci.iste('kayitListe', { evren, kod: x.kod, liste: 'etiket', ekle: SOZLUK_ETIKETI }))}>Sözlükten çıkar</button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function SozlugeKayitAl({ istemci, evren }: { istemci: Istemci; evren: string }) {
  return <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Kayıttan al…"
    sec={(s) => { if (s) void istemci.iste('kayitListe', { evren, kod: s.kod, liste: 'etiket', ekle: SOZLUK_ETIKETI }); }} />;
}

function KelimeEkle({ istemci, evren, kapat }: { istemci: Istemci; evren: string; kapat: () => void }) {
  const [ad, setAd] = useState(''), [tur, setTur] = useState('ad'), [anlam, setAnlam] = useState(''), [dil, setDil] = useState('');
  const [hata, setHata] = useState(''), [mesgul, setMesgul] = useState(false);
  const kaydet = async () => {
    if (!ad.trim()) { setHata('Kelimeyi yazın.'); return; }
    setMesgul(true); setHata('');
    try {
      const { kod } = await istemci.iste('kayitOlustur', { evren, ad, tur: 'terim', ozet: anlam });
      await istemci.iste('kayitAlanYaz', { evren, kod, alan: 'sozcuk_turu', deger: tur });
      if (dil.trim()) await istemci.iste('kayitAlanYaz', { evren, kod, alan: 'dil', deger: dil.trim() });
      setAd(''); setAnlam('');
    } catch (e) { setHata((e as Error).message); } finally { setMesgul(false); }
  };
  return (
    <form class="kart kelime-ekle" onSubmit={(e) => { e.preventDefault(); void kaydet(); }}>
      <div class="satir sarmal">
        <label class="alan"><span class="alan-adi">Kelime</span><input class="girdi" lang="tr" value={ad} autoFocus onInput={(e) => setAd((e.target as HTMLInputElement).value)} /></label>
        <label class="alan"><span class="alan-adi">Sözcük türü</span>
          <select class="girdi" value={tur} onChange={(e) => setTur((e.target as HTMLSelectElement).value)}>{SOZCUK_TURLERI.map((x) => <option value={x.kod}>{x.ad}</option>)}</select>
        </label>
        <label class="alan"><span class="alan-adi">Dil (isteğe bağlı)</span><input class="girdi" lang="tr" value={dil} onInput={(e) => setDil((e.target as HTMLInputElement).value)} /></label>
      </div>
      <label class="alan"><span class="alan-adi">Anlamı</span><input class="girdi" lang="tr" value={anlam} onInput={(e) => setAnlam((e.target as HTMLInputElement).value)} /></label>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir"><button class="dugme ana" disabled={mesgul}>Ekle</button><button type="button" class="dugme" onClick={kapat}>Kapat</button></div>
    </form>
  );
}
