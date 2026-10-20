// Bir evrenin kayıtları: yeni kayıt, süzme, sıralama ve çöp kutusu.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AramaSonucu, GeciselEksen, GeciselSonuc, KayitOzeti } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { turBul, grupSinifi } from '../alan/turler';
import { turkceKarsilastir } from '../alan/turkce';
import { siraAnahtari } from '../alan/tarih';
import { Gorsel } from './gorsel';
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

type Siralama = 'son' | 'ad' | 'tur' | 'tarih';

const NEREDEN: Record<string, string> = { lakap: 'lakabı', onceki: 'eski adı', okunus: 'okunuşu', kok: 'çekimli biçimden', ozet: 'özetinde', metin: 'metninde' };

function neredenYazisi(n: AramaSonucu['nereden']): string | null {
  if (n.tur === 'ad' || n.tur === 'ozet') return null;
  if (n.tur === 'kok' || n.tur === 'metin') return NEREDEN[n.tur] + ' bulundu';
  return `${NEREDEN[n.tur]} “${n.metin}” ile bulundu`;
}

export function KayitListesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [kayitlar, setKayitlar] = useState<KayitOzeti[] | null>(null);
  const [arama, setArama] = useState('');
  const [tur, setTur] = useState('');
  const [siralama, setSiralama] = useState<Siralama>('son');
  const [bulunan, setBulunan] = useState<AramaSonucu[] | null>(null);
  const [vazgecilenGizli, setVazgecilenGizli] = useState(false);
  // Geçişli sorgu (§3.7): seçilen yerin, yönetimin ya da kültürün altındakiler.
  const [kok, setKok] = useState<{ kod: string; ad: string } | null>(null);
  const [eksen, setEksen] = useState<GeciselEksen>('kapsama');
  const [icindekiler, setIcindekiler] = useState<Map<string, GeciselSonuc> | null>(null);
  useEffect(() => { istemci.iste('kayitlar', { evren }).then(setKayitlar); }, [evren, surum]);
  useEffect(() => {
    if (!kok) { setIcindekiler(null); return; }
    istemci.iste('geciselKayitlar', { evren, kok: kok.kod, eksen }).then((l) => setIcindekiler(new Map(l.map((x) => [x.kod, x]))), () => setKok(null));
  }, [evren, kok?.kod, eksen, surum]);
  useEffect(() => {
    let iptal = false;
    if (!arama.trim()) { setBulunan(null); return; }
    istemci.iste('ara', { evren, metin: arama, sinir: 500 }).then((r) => { if (!iptal) setBulunan(r); });
    return () => { iptal = true; };
  }, [evren, arama, surum]);

  const gorunen = useMemo(() => {
    if (!kayitlar) return [];
    const harita = new Map(kayitlar.map((k) => [k.kod, k]));
    // Arama varken sıra aramanın sırasıdır (en iyi eşleşme önce).
    const s = (bulunan ? bulunan.filter((b) => harita.has(b.kod)).map((b) => ({ k: harita.get(b.kod)!, nereden: neredenYazisi(b.nereden), parca: b.parca }))
      : kayitlar.map((k) => ({ k, nereden: null as string | null, parca: undefined as string | undefined })))
      .filter((x) => (!tur || x.k.tur === tur) && (!vazgecilenGizli || x.k.karar !== 'vazgecildi') && (!icindekiler || icindekiler.has(x.k.kod)))
      .map((x) => {
        const g = icindekiler?.get(x.k.kod);
        return g ? { ...x, nereden: [x.nereden, g.birim ? `${g.birim.ad}: ${g.etiket.toLocaleLowerCase('tr-TR')}` : g.etiket].filter(Boolean).join(' · ') } : x;
      });
    if (bulunan) return s;
    if (siralama === 'tarih') s.sort((x, y) => siraAnahtari(x.k.tarih ?? null) - siraAnahtari(y.k.tarih ?? null) || turkceKarsilastir(x.k.ad, y.k.ad));
    if (siralama === 'ad') s.sort((x, y) => turkceKarsilastir(x.k.ad, y.k.ad));
    if (siralama === 'tur') s.sort((x, y) => turkceKarsilastir(turBul(x.k.tur).ad, turBul(y.k.tur).ad) || turkceKarsilastir(x.k.ad, y.k.ad));
    return s;
  }, [kayitlar, bulunan, tur, siralama, vazgecilenGizli, icindekiler]);

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
            <input class="girdi" style="flex:2;min-width:180px" type="search" aria-label="Kayıtlarda ara" placeholder="Ara (ad, lakap, eski ad, metin)" value={arama}
              lang="tr" onInput={(e) => setArama((e.target as HTMLInputElement).value)} />
            <span style="flex:1;min-width:150px"><TurSecici deger={tur} onDegis={setTur} hepsi="Bütün türler" etiket="Türe göre süz" /></span>
            <select class="girdi" style="flex:1;min-width:150px" aria-label="Sıralama" value={siralama} onChange={(e) => setSiralama((e.target as HTMLSelectElement).value as Siralama)}>
              <option value="son">Son değişen önce</option>
              <option value="ad">Ada göre</option>
              <option value="tur">Türe göre</option>
              <option value="tarih">Evren tarihine göre</option>
            </select>
            <label class="satir kucuk soluk"><input type="checkbox" checked={vazgecilenGizli} onChange={() => setVazgecilenGizli(!vazgecilenGizli)} /> Vazgeçilenleri gizle</label>
          </div>
          <div class="suzgec satir kucuk">
            <span class="soluk">İçindekiler:</span>
            <KayitSec istemci={istemci} evren={evren} secili={kok} sec={setKok} etiket="Yer, yönetim ya da kültür seç" />
            <select class="girdi kucuk-secim" aria-label="Hangi ilişki üzerinden" value={eksen} onChange={(e) => setEksen((e.target as HTMLSelectElement).value as GeciselEksen)}>
              <option value="kapsama">Fiziksel kapsama (parçaları)</option>
              <option value="bagli">Siyasi bağlılık (bağlı olanlar)</option>
              <option value="kultur">Kültürel aidiyet (bu kültürden olanlar)</option>
            </select>
            {kok && <button class="dugme sade kucuk" onClick={() => setKok(null)}>Kaldır</button>}
            {kok && <span class="soluk">Alt birimler ve onlara bağlı kayıtlar listelenir; seçilen kaydın kendisi listede yer almaz.</span>}
          </div>
          <p class="soluk kucuk">{gorunen.length === kayitlar.length ? `${kayitlar.length} kayıt` : `${kayitlar.length} kayıttan ${gorunen.length} tanesi`}</p>
          {gorunen.length === 0 ? <div class="bos"><p>Aramaya ya da seçimlere uyan kayıt yok.</p></div> : (
            <ul class="kayit-listesi">
              {gorunen.map(({ k, nereden, parca }) => <KayitSatiri key={k.kod} k={k} evren={evren} nereden={nereden} parca={parca} istemci={istemci} />)}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function KayitSatiri({ k, evren, nereden, parca, istemci }: { k: KayitOzeti; evren: string; nereden?: string | null; parca?: string; istemci?: Istemci }) {
  const tur = turBul(k.tur);
  return (
    <li>
      <a class="kayit-satiri" href={`#/e/${evren}/k/${k.kod}`}>
        {k.gorsel && istemci ? <Gorsel istemci={istemci} evren={evren} ad={k.gorsel} sinif="satir-gorseli" /> : <span class={`tur-rozeti ${grupSinifi(tur)}`} title={tur.ad} aria-hidden="true">{tur.kisa}</span>}
        <span class="govde">
          <span class="satir-ad">{k.ad} <KararRozeti karar={k.karar} /></span>
          <span class="soluk kucuk">{tur.ad}{k.tarih ? ` · ${k.tarih.ifade}` : ''}{k.ozet ? ` · ${k.ozet}` : ''}{nereden ? ` · ${nereden}` : ''}</span>
          {parca && <span class="soluk kucuk parca">{parca}</span>}
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
                <span class={`tur-rozeti ${grupSinifi(tur)}`} title={tur.ad} aria-hidden="true">{tur.kisa}</span>
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

export function Bahsedilenler({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [liste, setListe] = useState<(KayitOzeti & { anilma: number })[] | null>(null);
  useEffect(() => { istemci.iste('bahsedilenler', { evren }).then(setListe); }, [evren, surum]);
  if (!liste) return null;
  return (
    <>
      <p class="soluk kucuk">Metinlerde bağlantı verilmiş ama kendi metni henüz yazılmamış kayıtlar. En çok anılan en üstte.</p>
      {liste.length === 0 ? <div class="bos"><p>Bahsedilip henüz yazılmamış kayıt yok.</p></div> : (
        <ul class="kayit-listesi">
          {liste.map((k) => <KayitSatiri key={k.kod} k={k} evren={evren} istemci={istemci} nereden={`${k.anilma} yerde anılıyor`} />)}
        </ul>
      )}
    </>
  );
}
