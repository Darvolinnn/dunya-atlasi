// Bir evrenin kayıtları: yeni kayıt, süzme, sıralama ve çöp kutusu.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KayitOzeti } from '../veri/api';
import { turBul } from '../alan/turler';
import { katla, turkceKarsilastir } from '../alan/turkce';
import { zamanYaz } from '../alan/islem-metni';
import { KararRozeti, TurSecici } from './ortak';
import { git } from './Uygulama';

export function YeniKayit({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [ad, setAd] = useState('');
  const [tur, setTur] = useState('karakter');
  const [hata, setHata] = useState<string | null>(null);
  const olustur = async (e: Event) => {
    e.preventDefault();
    if (!ad.trim()) return;
    try {
      const { kod } = await istemci.iste('kayitOlustur', { evren, ad, tur });
      git(`/e/${evren}/k/${kod}`);
    } catch (err) { setHata((err as Error).message); }
  };
  return (
    <form class="yeni-kayit satir" onSubmit={olustur}>
      <input class="girdi" style="flex:2;min-width:180px" aria-label="Yeni kaydın adı" placeholder="Yeni kaydın adı" value={ad} lang="tr" spellcheck={false}
        onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
      <span style="flex:1;min-width:160px"><TurSecici deger={tur} onDegis={setTur} etiket="Yeni kaydın türü" /></span>
      <button class="dugme ana" type="submit" disabled={!ad.trim()}>Oluştur</button>
      {hata && <span class="hata">{hata}</span>}
    </form>
  );
}

type Siralama = 'son' | 'ad' | 'tur';

/** Bir kaydın aramaya uyup uymadığı; uyuyorsa hangi addan bulunduğu (§18 arama). */
export function eslesme(k: KayitOzeti, arama: string): string | null | false {
  const a = katla(arama.trim());
  if (!a) return null;
  if (katla(k.ad).includes(a)) return null;
  const lakap = k.lakaplar.find((l) => katla(l).includes(a));
  if (lakap) return lakap;
  if (katla(k.ozet).includes(a)) return null;
  return false;
}

export function KayitListesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [kayitlar, setKayitlar] = useState<KayitOzeti[] | null>(null);
  const [arama, setArama] = useState('');
  const [tur, setTur] = useState('');
  const [siralama, setSiralama] = useState<Siralama>('son');
  useEffect(() => { istemci.iste('kayitlar', { evren }).then(setKayitlar); }, [evren, surum]);

  const gorunen = useMemo(() => {
    if (!kayitlar) return [];
    const s = kayitlar
      .filter((k) => !tur || k.tur === tur)
      .map((k) => ({ k, nereden: eslesme(k, arama) }))
      .filter((x) => x.nereden !== false);
    if (siralama === 'ad') s.sort((x, y) => turkceKarsilastir(x.k.ad, y.k.ad));
    if (siralama === 'tur') s.sort((x, y) => turkceKarsilastir(turBul(x.k.tur).ad, turBul(y.k.tur).ad) || turkceKarsilastir(x.k.ad, y.k.ad));
    return s;
  }, [kayitlar, arama, tur, siralama]);

  if (!kayitlar) return null;
  return (
    <>
      <YeniKayit istemci={istemci} evren={evren} />
      {kayitlar.length === 0 ? (
        <div class="bos">
          <p>Bu evrende henüz kayıt yok.</p>
          <p class="kucuk">Yukarıya bir ad yazıp türünü seçin. Karakter, yer, olay, not… her şey bir kayıttır.</p>
        </div>
      ) : (
        <>
          <div class="suzgec satir">
            <input class="girdi" style="flex:2;min-width:180px" type="search" aria-label="Kayıtlarda ara" placeholder="Ara (ad, lakap, özet)" value={arama}
              lang="tr" onInput={(e) => setArama((e.target as HTMLInputElement).value)} />
            <span style="flex:1;min-width:150px"><TurSecici deger={tur} onDegis={setTur} hepsi="Bütün türler" etiket="Türe göre süz" /></span>
            <select class="girdi" style="flex:1;min-width:150px" aria-label="Sıralama" value={siralama} onChange={(e) => setSiralama((e.target as HTMLSelectElement).value as Siralama)}>
              <option value="son">Son değişen önce</option>
              <option value="ad">Ada göre</option>
              <option value="tur">Türe göre</option>
            </select>
          </div>
          <p class="soluk kucuk">{gorunen.length === kayitlar.length ? `${kayitlar.length} kayıt` : `${kayitlar.length} kayıttan ${gorunen.length} tanesi`}</p>
          {gorunen.length === 0 ? <div class="bos"><p>Aramaya uyan kayıt yok.</p></div> : (
            <ul class="kayit-listesi">
              {gorunen.map(({ k, nereden }) => <KayitSatiri key={k.kod} k={k} evren={evren} nereden={nereden} />)}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function KayitSatiri({ k, evren, nereden }: { k: KayitOzeti; evren: string; nereden?: string | null | false }) {
  const tur = turBul(k.tur);
  return (
    <li>
      <a class="kayit-satiri" href={`#/e/${evren}/k/${k.kod}`}>
        <span class="tur-rozeti" title={tur.ad} aria-hidden="true">{tur.kisa}</span>
        <span class="govde">
          <span class="satir-ad">{k.ad} <KararRozeti karar={k.karar} /></span>
          <span class="soluk kucuk">{tur.ad}{k.ozet ? ` · ${k.ozet}` : ''}{nereden ? ` · “${nereden}” adıyla bulundu` : ''}</span>
        </span>
        <span class="soluk kucuk zaman">{zamanYaz(k.duzenleme)}</span>
      </a>
    </li>
  );
}

export function CopKutusu({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [kayitlar, setKayitlar] = useState<KayitOzeti[] | null>(null);
  useEffect(() => { istemci.iste('kayitlar', { evren, cop: true }).then(setKayitlar); }, [evren, surum]);
  if (!kayitlar) return null;
  return (
    <>
      <p class="soluk kucuk">Silinen kayıtlar burada durur. Geri getirilen kayıt metni ve bütün bilgileriyle döner.</p>
      {kayitlar.length === 0 ? <div class="bos"><p>Çöp kutusu boş.</p></div> : (
        <ul class="kayit-listesi">
          {kayitlar.map((k) => {
            const tur = turBul(k.tur);
            return (
              <li key={k.kod} class="kayit-satiri">
                <span class="tur-rozeti" title={tur.ad} aria-hidden="true">{tur.kisa}</span>
                <span class="govde">
                  <a class="satir-ad" href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>
                  <span class="soluk kucuk">{tur.ad} · {zamanYaz(k.silindi!)} tarihinde silindi</span>
                </span>
                <button class="dugme" onClick={() => istemci.iste('kayitGeriYukle', { evren, kod: k.kod })}>Geri getir</button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
