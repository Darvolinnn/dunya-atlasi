// Kişi ve kimlik (F06, §3.12). Çoğu karakterde görünmez; yazar açınca kimliğe ayırma ya da başka bir kaydı
// kimlik olarak bağlama önizlemeyle yapılır. Kimliklerin olay ve sahneleri kişinin sayfasında da görünür.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KimlikAyirmaAdayi, KimlikBilgisi, KimlikKullanimi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { useYukle } from './Anlati';
import type { Secim } from './BaglantiSecici';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: { kod: string; ad: string }) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
const aralik = (k: KimlikKullanimi) => k.baslangic || k.bitis ? ` (${k.baslangic || '?'}–${k.bitis})` : '';
const virgullu = (evren: string, l: { kod: string; ad: string }[]) => l.map((x, i) => <>{i ? ', ' : ''}{bag(evren, x)}</>);

export function KimlikBolumu({ istemci, evren, kod, tur }: { istemci: Istemci; evren: string; kod: string; tur: string }) {
  const [b] = useYukle<KimlikBilgisi>(istemci, evren, () => istemci.iste('kimlikBilgisi', { evren, kod }), [kod]);
  const [kip, setKip] = useState<'ayir' | 'bagla' | null>(null);
  if (!b) return null;
  const kisi = tur === 'karakter';
  if (!kisi && !b.kullananlar.length) return null;
  if (kisi && !b.kimlikler.length && !kip) {
    return <div class="satir kucuk"><button class="dugme sade kucuk" onClick={() => setKip('ayir')}>Kimlikler…</button></div>;
  }
  return (
    <section class="kimlik-bolumu" aria-label="Kimlikler">
      <h2>{kisi ? 'Kullandığı kimlikler' : 'Bu kimliği kullananlar'}</h2>
      {kisi && !b.kimlikler.length && <p class="soluk kucuk">Bir kişi birden çok kimlik kullanabilir (“Kara Tilki”). Kimlikler ayrı kayıttır; olay ve sahneleri burada da görünür.</p>}
      <ul class="toplanan-listesi">
        {(kisi ? b.kimlikler : b.kullananlar).map((k) => (
          <li key={k.iliski}>
            <strong>{bag(evren, kisi ? k.kimlik : k.kisi)}</strong>{aralik(k)}
            {kisi && (k.olaylar.length > 0 || k.sahneler.length > 0) && (
              <div class="kucuk soluk">
                Bu kimlikle{k.olaylar.length > 0 && <> yer aldığı olaylar: {virgullu(evren, k.olaylar)}.</>}
                {k.sahneler.length > 0 && <> Sahneler: {virgullu(evren, k.sahneler)}.</>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {kisi && (
        <div class="satir">
          <button class="dugme sade kucuk" aria-pressed={kip === 'ayir'} onClick={() => setKip(kip === 'ayir' ? null : 'ayir')}>Yeni kimliğe ayır</button>
          <button class="dugme sade kucuk" aria-pressed={kip === 'bagla'} onClick={() => setKip(kip === 'bagla' ? null : 'bagla')}>Başka bir kaydı kimliği olarak bağla</button>
        </div>
      )}
      {kisi && kip === 'ayir' && <KimligeAyir istemci={istemci} evren={evren} kisi={kod} kapat={() => setKip(null)} />}
      {kisi && kip === 'bagla' && <KimlikBagla istemci={istemci} evren={evren} kisi={kod} kapat={() => setKip(null)} />}
    </section>
  );
}

function Tarihler({ bas, bit, setBas, setBit }: { bas: string; bit: string; setBas: (s: string) => void; setBit: (s: string) => void }) {
  return (
    <>
      <input class="girdi" style="max-width:140px" aria-label="Kullanmaya başladığı tarih" placeholder="Başlangıç (isteğe bağlı)" value={bas} onInput={(e) => setBas((e.target as HTMLInputElement).value)} />
      <input class="girdi" style="max-width:140px" aria-label="Bıraktığı tarih" placeholder="Bitiş (isteğe bağlı)" value={bit} onInput={(e) => setBit((e.target as HTMLInputElement).value)} />
    </>
  );
}

function KimligeAyir({ istemci, evren, kisi, kapat }: { istemci: Istemci; evren: string; kisi: string; kapat: () => void }) {
  const [adaylar] = useYukle<KimlikAyirmaAdayi[]>(istemci, evren, () => istemci.iste('kimlikAyirmaAdaylari', { evren, kisi }), [kisi]);
  const [ad, setAd] = useState('');
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [bas, setBas] = useState(''), [bit, setBit] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  if (!adaylar) return null;
  const degis = (k: string) => { const s = new Set(secili); if (s.has(k)) s.delete(k); else s.add(k); setSecili(s); };
  const ayir = () => istemci.iste('kimlikAyir', { evren, kisi, ad, iliskiler: [...secili], baslangic: bas, bitis: bit }).then(kapat, (x) => setHata(hataYaz(x)));
  return (
    <div class="kart">
      <p class="kucuk">Yeni bir kimlik kaydı açılır ve bu kişiyle “kullandığı kimlik” bağıyla bağlanır. Aşağıda işaretlediğiniz bağlar kimliğe taşınır; ötekiler kişide kalır. Eski metinlerdeki adlar değişmez.</p>
      <div class="satir">
        <input class="girdi" style="flex:1;min-width:160px" lang="tr" aria-label="Kimliğin adı" placeholder="Kimliğin adı (ör. Kara Tilki)" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        <Tarihler bas={bas} bit={bit} setBas={setBas} setBit={setBit} />
      </div>
      {adaylar.length > 0 ? (
        <ul class="secim-listesi kucuk">
          {adaylar.map((a) => <li key={a.iliski}><label><input type="checkbox" checked={secili.has(a.iliski)} onChange={() => degis(a.iliski)} /> {a.baslik}</label></li>)}
        </ul>
      ) : <p class="soluk kucuk">Bu kişinin taşınabilecek bir bağı yok.</p>}
      <div class="satir">
        <button class="dugme kucuk" disabled={!ad.trim()} onClick={ayir}>{secili.size ? `Ayır ve ${secili.size} bağı taşı` : 'Ayır'}</button>
        <button class="dugme sade kucuk" onClick={kapat}>Vazgeç</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}

function KimlikBagla({ istemci, evren, kisi, kapat }: { istemci: Istemci; evren: string; kisi: string; kapat: () => void }) {
  const [diger, setDiger] = useState<Secim | null>(null);
  const [onizleme, setOnizleme] = useState<string[] | null>(null);
  const [bas, setBas] = useState(''), [bit, setBit] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const sec = (s: Secim | null) => {
    setDiger(s); setOnizleme(null); setHata(null);
    if (s) istemci.iste('kimlikBirlestirOnizle', { evren, kisi, diger: s.kod }).then(setOnizleme, (x) => setHata(hataYaz(x)));
  };
  const onayla = () => diger && istemci.iste('kimlikBirlestir', { evren, kisi, diger: diger.kod, baslangic: bas, bitis: bit }).then(kapat, (x) => setHata(hataYaz(x)));
  return (
    <div class="kart">
      <p class="kucuk">Ayrı açılmış bir karakter aslında bu kişinin bir kimliğiyse, onu bu kişinin kimliği olarak bağlayın.</p>
      <div class="satir">
        <KayitSec istemci={istemci} evren={evren} secili={diger} etiket="Kimlik olacak kayıt" sec={sec} />
        <Tarihler bas={bas} bit={bit} setBas={setBas} setBit={setBit} />
      </div>
      {onizleme && <ul class="kucuk">{onizleme.map((x) => <li key={x}>{x}</li>)}</ul>}
      <div class="satir">
        <button class="dugme kucuk" disabled={!onizleme} onClick={onayla}>Onayla</button>
        <button class="dugme sade kucuk" onClick={kapat}>Vazgeç</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}
