// Harita: yükle, işaretle, bağla (§8.1). Haritalarda, kat planlarında ve kayıt görsellerinde aynı bileşen kullanılır.
// İşaretler haritanın uzayında durur; görsel bu uzaya oturtulmuş bir katmandır. Kipler görünür biçimde seçilir (§8.7).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { HaritaAyrintisi, HaritaCizimi, HaritaIsareti, HaritaKatmani, HaritaOzeti, IsaretGirdisi, Kayit, KayitHaritalari } from '../veri/api';
import { anaTakvim, yilYazisi } from '../alan/tarih';
import { useTakvim } from './Takvim';
import { SinirAlani } from './Anlati';
import { hizala, ters, uygula, type Donusum, type KontrolCifti, type Nokta } from '../alan/hizalama';
import { turBul } from '../alan/turler';
import { BaglantiSecici } from './BaglantiSecici';
import { KayitSec } from './KayitBolumleri';
import { Gorsel } from './gorsel';
import { KararRozeti } from './ortak';
import { git } from './Uygulama';
import { BakisAciklamasi, BakisSecici } from './Bilgiler';
import type { Secim } from './BaglantiSecici';
import { HaritaKunyeBolumu } from './HaritaKunye';
import { OlcekliHaritaBolumu } from './OlcekliHarita';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const KESINLIKLER: { kod: IsaretGirdisi['kesinlik']; ad: string }[] = [
  { kod: 'kesin', ad: 'Kesin yer' }, { kod: 'yaklasik', ad: 'Yaklaşık bölge' }, { kod: 'bilinmiyor', ad: 'Yeri bilinmiyor' },
];
const kesinlikAdi = (k: string) => KESINLIKLER.find((x) => x.kod === k)?.ad ?? k;

function useYenile(istemci: Istemci, evren: string) {
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  return n;
}

// ---------- Haritalar sekmesi ----------
export function HaritalarSekmesi({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string | null }) {
  if (kod) return <HaritaGorunumu key={kod} istemci={istemci} evren={evren} kod={kod} />;
  return <HaritaListesi istemci={istemci} evren={evren} />;
}

function HaritaListesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const n = useYenile(istemci, evren);
  const [liste, setListe] = useState<HaritaOzeti[] | null>(null);
  const [kaldirilan, setKaldirilan] = useState<HaritaOzeti[]>([]);
  useEffect(() => {
    istemci.iste('haritalar', { evren }).then(setListe, () => setListe([]));
    istemci.iste('haritalar', { evren, silinmis: true }).then(setKaldirilan, () => {});
  }, [evren, n]);
  if (!liste) return <p class="soluk">Açılıyor…</p>;
  return (
    <div class="haritalar">
      <p class="soluk kucuk">Bir harita görseli yükleyin, üstüne işaretler koyun ve her işareti bir kayda bağlayın. Bir yerin haritadaki yeri bilinmiyorsa bunu da belirtebilirsiniz; efsanevi bir şehir için nokta koymanız gerekmez.</p>
      <HaritaYukle istemci={istemci} evren={evren} />
      {liste.length === 0 && <p class="soluk">Henüz harita yok.</p>}
      <ul class="harita-izgara">
        {liste.map((h) => (
          <li key={h.kod}>
            <a class="kart harita-karti" href={`#/e/${evren}/haritalar/${h.kod}`}>
              {h.gorsel ? <Gorsel istemci={istemci} evren={evren} ad={h.gorsel} alt="" sinif="harita-onizleme" /> : <span class="gorsel-yer harita-onizleme" />}
              <strong>{h.ad}</strong>
              <span class="soluk kucuk">{h.yer ? `${h.yer.ad} · ` : ''}{h.isaretSayisi} işaret</span>
            </a>
          </li>
        ))}
      </ul>
      {kaldirilan.length > 0 && (
        <details class="kaldirilan-haritalar">
          <summary class="soluk kucuk">Kaldırılan haritalar ({kaldirilan.length})</summary>
          <ul>
            {kaldirilan.map((h) => <li key={h.kod}>{h.ad} <button class="dugme sade kucuk" onClick={() => istemci.iste('haritaSil', { evren, kod: h.kod, geriYukle: true })}>Geri getir</button></li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

function HaritaYukle({ istemci, evren, yer = null }: { istemci: Istemci; evren: string; yer?: { kod: string; ad: string } | null }) {
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState('');
  const [secYer, setSecYer] = useState<{ kod: string; ad: string } | null>(yer);
  const [dosya, setDosya] = useState<File | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  if (!acik) return <button class="dugme" onClick={() => setAcik(true)}>Harita yükle</button>;
  const yukle = async (e: Event) => {
    e.preventDefault();
    if (!dosya) { setHata('Bir görsel seçin.'); return; }
    setYukleniyor(true);
    try {
      const { kod } = await istemci.iste('haritaYukle', { evren, ad: ad.trim() || dosya.name.replace(/\.[^.]+$/, ''), yer: secYer?.kod ?? null,
        dosyaAdi: dosya.name, tur: dosya.type, veri: new Uint8Array(await dosya.arrayBuffer()) });
      git(`/e/${evren}/haritalar/${kod}`);
    } catch (x) { setHata(hataYaz(x)); } finally { setYukleniyor(false); }
  };
  return (
    <form class="kart harita-yukle" onSubmit={yukle}>
      <div class="satir">
        <label class="alan" style="flex:1;min-width:200px"><span class="alan-adi">Görsel</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" aria-label="Harita görseli"
            onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0] ?? null; setDosya(f); if (f && !ad) setAd(f.name.replace(/\.[^.]+$/, '')); }} /></label>
        <label class="alan" style="flex:1;min-width:200px"><span class="alan-adi">Haritanın adı</span>
          <input class="girdi" lang="tr" aria-label="Haritanın adı" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} /></label>
        <div class="alan"><span class="alan-adi">Gösterdiği yer (isteğe bağlı)</span>
          <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={secYer} sec={setSecYer} etiket="Yer seç" />
            {secYer && <button type="button" class="dugme sade kucuk" onClick={() => setSecYer(null)}>Kaldır</button>}</span></div>
      </div>
      <p class="soluk kucuk">Büyük görseller de yüklenebilir. Fotoğraflardaki konum bilgisi silinir.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" disabled={yukleniyor}>{yukleniyor ? 'Yükleniyor…' : 'Yükle'}</button>
        <button type="button" class="dugme sade" onClick={() => setAcik(false)}>Vazgeç</button>
      </div>
    </form>
  );
}

// ---------- Harita görünümü ----------
type Kip = { tur: 'gez' } | { tur: 'koy'; kesinlik: 'kesin' | 'yaklasik' } | { tur: 'tasi'; isaret: string; kesinlik: 'kesin' | 'yaklasik' }
  | { tur: 'hizala'; katman: string; ciftler: KontrolCifti[]; bekleyen: Nokta | null }
  | { tur: 'ciz'; bicim: 'bolge' | 'yol'; noktalar: Nokta[]; cizim: string | null };

/** Kayda göre sabit renk: aynı kaydın bölgeleri her haritada aynı renktedir. */
const kayitRengi = (kod: string) => { let h = 0; for (const c of kod) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 42%)`; };

/** Katmanın CSS dönüşümü: öteleme katmanın kendi boyuna göre yüzde, doğrusal kısım matris (§8.5). */
const katmanStili = (k: HaritaKatmani, d: Donusum, h: { en: number }, saydamlik: number) => ({
  left: 0, top: 0, width: `${(k.en / h.en) * 100}%`, opacity: saydamlik, transformOrigin: '0 0',
  transform: `translate(${(d[4] / k.en) * 100}%, ${(d[5] / k.boy) * 100}%) matrix(${d[0]}, ${d[1]}, ${d[2]}, ${d[3]}, 0, 0)`,
});

function HaritaGorunumu({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const n = useYenile(istemci, evren);
  const [h, setH] = useState<HaritaAyrintisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yakinlik, setYakinlik] = useState(1);
  const [kip, setKip] = useState<Kip>({ tur: 'gez' });
  const [secili, setSecili] = useState<string | null>(null);
  const [yeni, setYeni] = useState<{ x: number; y: number; ekran: { left: number; top: number } } | null>(null);
  const [bilinmeyenEkle, setBilinmeyenEkle] = useState<{ left: number; top: number } | null>(null);
  const [bakis, setBakis] = useState<Secim | null>(null);
  const [gizli, setGizli] = useState<Set<string>>(new Set());
  const [saydamlik, setSaydamlik] = useState<Record<string, number>>({});
  const [gizliTurler, setGizliTurler] = useState<Set<string>>(new Set());
  const [seciliCizim, setSeciliCizim] = useState<string | null>(null);
  const [cizimKaydi, setCizimKaydi] = useState<{ left: number; top: number } | null>(null);
  const [bolgeKipi, setBolgeKipi] = useState<'denetim' | 'iddia'>('denetim');
  const [an, setAn] = useState('');
  const z = useTakvim(istemci, evren);
  const yuzey = useRef<HTMLDivElement>(null);
  useEffect(() => { istemci.iste('harita', { evren, kod, bakis: bakis?.kod ?? null, an: an || null }).then((x) => { setH(x); setHata(null); }, (e) => setHata(hataYaz(e))); }, [kod, bakis?.kod, n, an]);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') { setKip((k) => (k.tur === 'hizala' && k.bekleyen ? { ...k, bekleyen: null } : { tur: 'gez' })); setYeni(null); setCizimKaydi(null); } };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, []);
  if (hata) return <p class="hata">{hata} <a href={`#/e/${evren}/haritalar`}>Haritalara dön</a></p>;
  if (!h) return <p class="soluk">Açılıyor…</p>;

  const iste = <T,>(p: Promise<T>) => p.then((x) => { setHata(null); return x; }, (e) => { setHata(hataYaz(e)); return null; });
  const uzayNoktasi = (e: MouseEvent) => {
    const r = yuzey.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * h.en, y: ((e.clientY - r.top) / r.height) * h.boy };
  };
  const tikla = async (e: MouseEvent) => {
    if (kip.tur === 'gez') { setSecili(null); setSeciliCizim(null); return; }
    const p = uzayNoktasi(e);
    if (kip.tur === 'ciz') { setKip({ ...kip, noktalar: [...kip.noktalar, [p.x, p.y]] }); return; }
    if (kip.tur === 'hizala') {
      const k = h.katmanlar.find((x) => x.kod === kip.katman);
      if (!k) return;
      if (!kip.bekleyen) {
        const t = ters(onizleme(k));
        if (t) setKip({ ...kip, bekleyen: uygula(t, [p.x, p.y]) });
      } else setKip({ ...kip, ciftler: [...kip.ciftler, { gorsel: kip.bekleyen, uzay: [p.x, p.y] }], bekleyen: null });
      return;
    }
    if (kip.tur === 'koy') { setYeni({ ...p, ekran: { left: e.clientX, top: e.clientY + 8 } }); return; }
    const eski = h.isaretler.find((x) => x.kod === kip.isaret);
    await iste(istemci.iste('isaretDegistir', { evren, kod: kip.isaret, alan: 'konum', deger: { kesinlik: kip.kesinlik, x: p.x, y: p.y, yaricap: eski?.konum.yaricap ?? null } }));
    setKip({ tur: 'gez' });
  };
  const yeniKoy = async (kayit: string) => {
    if (!yeni || kip.tur !== 'koy') return;
    const r = await iste(istemci.iste('isaretKoy', { evren, harita: kod, kayit, konum: { kesinlik: kip.kesinlik, x: yeni.x, y: yeni.y, yaricap: null } }));
    setYeni(null);
    if (r) setSecili(r.kod);
  };
  // Hizalanan katman önizlemeyle gösterilir; uygulanana kadar hiçbir şey yazılmaz.
  const hzSonuc = kip.tur === 'hizala' && kip.ciftler.length >= 2 ? hizala(kip.ciftler) : null;
  const onizleme = (k: HaritaKatmani): Donusum => (kip.tur === 'hizala' && kip.katman === k.kod && hzSonuc ? hzSonuc.donusum : k.donusum);
  const turler = [...new Set(h.isaretler.map((i) => i.kayit.tur))];
  const yerlesen = h.isaretler.filter((i) => i.konum.kesinlik !== 'bilinmiyor' && !gizliTurler.has(i.kayit.tur));
  const bilinmeyen = h.isaretler.filter((i) => i.konum.kesinlik === 'bilinmiyor');
  const sec = h.isaretler.find((i) => i.kod === secili) ?? null;
  const yuzde = (v: number, toplam: number) => `${(v / toplam) * 100}%`;

  return (
    <div class="harita-gorunumu">
      <div class="satir">
        <a href={`#/e/${evren}/haritalar`} class="dugme sade">← Haritalar</a>
        {h.ustHaritalar.map((u) => <a key={u.kod} class="dugme sade kucuk" href={`#/e/${evren}/haritalar/${u.kod}`}>↑ {u.ad}</a>)}
      </div>
      <HaritaBasligi istemci={istemci} evren={evren} h={h} />
      {h.silindi && <p class="uyari">Bu harita kaldırılmış. <button class="dugme kucuk" onClick={() => iste(istemci.iste('haritaSil', { evren, kod, geriYukle: true }))}>Geri getir</button></p>}

      <div class="satir harita-arac" role="toolbar" aria-label="Harita araçları">
        <button class="dugme kucuk" aria-pressed={kip.tur === 'gez'} onClick={() => setKip({ tur: 'gez' })}>Gez ve seç</button>
        <button class="dugme kucuk" aria-pressed={kip.tur === 'koy' && kip.kesinlik === 'kesin'} disabled={h.silindi} onClick={() => setKip({ tur: 'koy', kesinlik: 'kesin' })}>Kesin yer işaretle</button>
        <button class="dugme kucuk" aria-pressed={kip.tur === 'koy' && kip.kesinlik === 'yaklasik'} disabled={h.silindi} onClick={() => setKip({ tur: 'koy', kesinlik: 'yaklasik' })}>Yaklaşık bölge işaretle</button>
        <button class="dugme kucuk" aria-pressed={kip.tur === 'ciz' && kip.bicim === 'bolge' && !kip.cizim} disabled={h.silindi} onClick={() => { setSecili(null); setSeciliCizim(null); setKip({ tur: 'ciz', bicim: 'bolge', noktalar: [], cizim: null }); }}>Bölge çiz</button>
        <button class="dugme kucuk" aria-pressed={kip.tur === 'ciz' && kip.bicim === 'yol' && !kip.cizim} disabled={h.silindi} onClick={() => { setSecili(null); setSeciliCizim(null); setKip({ tur: 'ciz', bicim: 'yol', noktalar: [], cizim: null }); }}>Yol çiz</button>
        <BakisSecici istemci={istemci} evren={evren} bakis={bakis} sec={setBakis} />
        <span class="bosluk" />
        <button class="dugme kucuk" aria-label="Uzaklaştır" disabled={yakinlik <= 1} onClick={() => setYakinlik((z) => Math.max(1, z / 1.5))}>−</button>
        <span class="soluk kucuk">%{Math.round(yakinlik * 100)}</span>
        <button class="dugme kucuk" aria-label="Yakınlaştır" disabled={yakinlik >= 12} onClick={() => setYakinlik((z) => Math.min(12, z * 1.5))}>+</button>
      </div>
      <p class="soluk kucuk" role="status">
        {kip.tur === 'ciz' ? `${kip.bicim === 'bolge' ? 'Bölgenin sınırı' : 'Yol'} boyunca haritaya sırayla tıklayın. Bitince yandaki düğmeye basın. Vazgeçmek için Esc tuşuna basın.`
          : kip.tur === 'hizala' ? (kip.bekleyen ? 'Şimdi bu noktanın haritada olması gereken yere tıklayın.' : 'Hizalanan görselde tanıdık bir noktaya tıklayın (bir kıyı köşesi, bir kale gibi).')
          : kip.tur === 'koy' ? `Haritada bir yere tıklayın, sonra bağlanacak kaydı seçin. Bitirmek için “Gez ve seç” düğmesine ya da Esc tuşuna basın.`
          : kip.tur === 'tasi' ? `“${h.isaretler.find((x) => x.kod === kip.isaret)?.kayit.ad}” için yeni yere tıklayın. Vazgeçmek için Esc tuşuna basın.`
            : 'Seçmek için bir işarete tıklayın. İşaret koymak için yukarıdaki araçlardan birini seçin.'}
      </p>
      {hata && <p class="hata kucuk">{hata}</p>}
      <BakisAciklamasi bakis={h.bakis} />
      <ZamanKaydirici h={h} an={an} setAn={setAn} yilYaz={(y) => yilYazisi(y, anaTakvim(z))} />

      <div class="harita-duzen">
        <div class="harita-tuval">
          <div ref={yuzey} class={`harita-yuzey${kip.tur !== 'gez' ? ' isaretleme' : ''}${kip.tur === 'hizala' ? ' hizalama' : ''}`} style={{ width: `${yakinlik * 100}%`, aspectRatio: `${h.en} / ${h.boy}` }}
            onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.harita-katmanlar')) void tikla(e); }}>
            <div class="harita-katmanlar">{h.katmanlar.filter((k) => !k.silindi && !gizli.has(k.kod)).map((k) => (
              <div key={k.kod} class={`harita-katman${kip.tur === 'hizala' && kip.katman === k.kod ? ' hizalanan' : ''}`}
                style={katmanStili(k, onizleme(k), h, kip.tur === 'hizala' && kip.katman === k.kod ? 0.6 : saydamlik[k.kod] ?? 1)}>
                <Gorsel istemci={istemci} evren={evren} ad={k.gorsel} onizleme={false} alt={k.ad} />
              </div>
            ))}</div>
            {kip.tur === 'hizala' && (() => {
              const k = h.katmanlar.find((x) => x.kod === kip.katman);
              if (!k) return null;
              const d = onizleme(k);
              const nokta = (q: Nokta, sinif: string, etiket: string) => <span class={`hizalama-noktasi ${sinif}`} style={{ left: yuzde(q[0], h.en), top: yuzde(q[1], h.boy) }} aria-hidden="true">{etiket}</span>;
              return (
                <>
                  {kip.ciftler.map((c, i) => <span key={i}>{nokta(uygula(d, c.gorsel), 'gorsel', String(i + 1))}{nokta(c.uzay, 'uzay', String(i + 1))}</span>)}
                  {kip.bekleyen && nokta(uygula(d, kip.bekleyen), 'gorsel bekleyen', String(kip.ciftler.length + 1))}
                </>
              );
            })()}
            <svg class={`harita-cizimler${kip.tur === 'gez' ? ' secilebilir' : ''}`} viewBox={`0 0 ${h.en} ${h.boy}`} preserveAspectRatio="none" aria-hidden="true">
              {h.cizimler.filter((c) => c.gecerli !== 'hayir' && !gizliTurler.has(c.kayit.tur) && !(kip.tur === 'ciz' && kip.cizim === c.kod)).map((c) => {
                const renk = kayitRengi(c.kayit.kod);
                const nk = c.noktalar.map((p) => p.join(',')).join(' ');
                const sinif = `cizim ${c.bicim} ${c.kip ?? ''}${c.kod === seciliCizim ? ' secili' : ''}${c.gecerli === 'belirsiz' ? ' belirsiz' : ''}${c.inanc ? ' inanc' : ''} karar-${c.karar}`;
                const sec = (e: MouseEvent) => { e.stopPropagation(); if (kip.tur === 'gez') { setSecili(null); setSeciliCizim(c.kod); } };
                return c.bicim === 'bolge'
                  ? <polygon key={c.kod} class={sinif} points={nk} style={{ stroke: renk, fill: renk }} vector-effect="non-scaling-stroke" onClick={sec}><title>{c.kayit.ad}</title></polygon>
                  : <polyline key={c.kod} class={sinif} points={nk} style={{ stroke: renk }} vector-effect="non-scaling-stroke" onClick={sec}><title>{c.kayit.ad}</title></polyline>;
              })}
              {kip.tur === 'ciz' && kip.noktalar.length > 0 && (
                kip.bicim === 'bolge' && kip.noktalar.length >= 3
                  ? <polygon class="cizim taslak" points={kip.noktalar.map((p) => p.join(',')).join(' ')} vector-effect="non-scaling-stroke" />
                  : <polyline class="cizim taslak" points={kip.noktalar.map((p) => p.join(',')).join(' ')} vector-effect="non-scaling-stroke" />
              )}
            </svg>
            {kip.tur === 'ciz' && kip.noktalar.map((p, i) => <span key={i} class="cizim-noktasi" style={{ left: yuzde(p[0], h.en), top: yuzde(p[1], h.boy) }} aria-hidden="true" />)}
            {h.cizimler.filter((c) => c.bicim === 'bolge' && c.gecerli !== 'hayir' && !gizliTurler.has(c.kayit.tur)).map((c) => {
              const [x, y] = c.noktalar.reduce((t, p) => [t[0] + p[0] / c.noktalar.length, t[1] + p[1] / c.noktalar.length], [0, 0]);
              return <span key={c.kod} class={`cizim-etiketi${c.kip === 'iddia' ? ' iddia' : ''}`} style={{ left: yuzde(x, h.en), top: yuzde(y, h.boy) }} aria-hidden="true">{c.kayit.ad}{c.kip === 'iddia' ? ' (iddia)' : ''}</span>;
            })}
            {yerlesen.map((i) => (
              <IsaretGorseli key={i.kod} i={i} h={h} secili={i.kod === secili} sec={() => { if (kip.tur === 'gez') setSecili(i.kod); }} />
            ))}
            {yeni && <span class="harita-isaret yeni" style={{ left: yuzde(yeni.x, h.en), top: yuzde(yeni.y, h.boy) }} aria-hidden="true" />}
          </div>
        </div>
        <aside class="harita-yan">
          {kip.tur === 'ciz' ? (
            <CizimTaslagi kip={kip} bolgeKipi={bolgeKipi} setBolgeKipi={setBolgeKipi} setKip={setKip}
              bitir={async (e) => {
                if (kip.cizim) {
                  const r = await iste(istemci.iste('cizimDegistir', { evren, kod: kip.cizim, alan: 'noktalar', deger: kip.noktalar }));
                  if (r !== null) { setSeciliCizim(kip.cizim); setKip({ tur: 'gez' }); }
                } else { const b = (e.currentTarget as HTMLElement).getBoundingClientRect(); setCizimKaydi({ left: b.left, top: b.bottom + 4 }); }
              }} />
          ) : seciliCizim && h.cizimler.some((c) => c.kod === seciliCizim) ? (
            <CizimPaneli istemci={istemci} evren={evren} c={h.cizimler.find((c) => c.kod === seciliCizim)!} kapat={() => setSeciliCizim(null)} hata={setHata}
              yenidenCiz={(c) => setKip({ tur: 'ciz', bicim: c.bicim, noktalar: [], cizim: c.kod })} />
          ) : kip.tur === 'hizala' ? <HizalamaPaneli istemci={istemci} evren={evren} h={h} kip={kip} sonuc={hzSonuc} setKip={setKip} hata={setHata} />
            : sec ? <IsaretPaneli istemci={istemci} evren={evren} i={sec} enBuyuk={Math.max(h.en, h.boy)} kapat={() => setSecili(null)}
            tasi={(k) => setKip({ tur: 'tasi', isaret: sec.kod, kesinlik: k })} hata={setHata} />
            : (
              <>
                <HaritaKunyeBolumu istemci={istemci} evren={evren} harita={h.kod} saltOkunur={h.silindi} />
                <OlcekliHaritaBolumu istemci={istemci} evren={evren} h={h} />
                <KatmanPaneli istemci={istemci} evren={evren} h={h} gizli={gizli} setGizli={setGizli} saydamlik={saydamlik} setSaydamlik={setSaydamlik}
                  hizala={(k) => { setSecili(null); setKip({ tur: 'hizala', katman: k.kod, ciftler: k.noktalar, bekleyen: null }); }} hata={setHata} />
                {turler.length > 1 && (
                  <fieldset class="katman-turleri"><legend class="alan-adi">Gösterilen kayıt türleri</legend>
                    {turler.map((t) => (
                      <label key={t} class="kucuk"><input type="checkbox" checked={!gizliTurler.has(t)}
                        onChange={() => setGizliTurler((g) => { const y = new Set(g); if (y.has(t)) y.delete(t); else y.add(t); return y; })} /> {turBul(t).ad}</label>
                    ))}
                  </fieldset>
                )}
                {h.an && (
                  <section aria-label="Bu tarihte">
                    <h2>{h.an.ifade} itibarıyla</h2>
                    {!h.an.gecerli && <p class="hata kucuk">Bu tarih takvime uymuyor.</p>}
                    {h.an.gecerli && !h.buTarihte.length && <p class="soluk kucuk">Bu tarihe denk gelen ve yeri bu haritada işaretli bir olay ya da sahne yok.</p>}
                    <ul class="isaret-listesi">{h.buTarihte.map((o) => <li key={o.kod}><a href={`#/e/${evren}/k/${o.kod}`}>{o.ad}</a> <span class="soluk kucuk">{o.yer} · {o.tarih}</span></li>)}</ul>
                  </section>
                )}
                {h.cizimler.length > 0 && (
                  <>
                    <h2>Bölgeler ve yollar</h2>
                    <ul class="isaret-listesi">
                      {h.cizimler.map((c) => (
                        <li key={c.kod} class={c.gecerli === 'hayir' ? 'soluk' : ''}><span class="renk-kutusu" style={{ background: kayitRengi(c.kayit.kod) }} aria-hidden="true" />
                          <button class="dugme sade kucuk" onClick={() => setSeciliCizim(c.kod)}>{c.kayit.ad}</button>
                          <span class="soluk kucuk">{c.bicim === 'yol' ? 'yol' : c.kip === 'iddia' ? 'iddia edilen bölge' : 'bölge'}{c.gecerli === 'hayir' ? ' · bu tarihte yok' : c.gecerli === 'belirsiz' ? ' · bu tarihte belirsiz' : ''}</span></li>
                      ))}
                    </ul>
                  </>
                )}
                <h2>İşaretler</h2>
                {h.isaretler.length === 0 && <p class="soluk kucuk">Henüz işaret yok.</p>}
                <ul class="isaret-listesi">
                  {yerlesen.map((i) => (
                    <li key={i.kod}><button class="dugme sade kucuk" onClick={() => setSecili(i.kod)}>{i.kayit.ad}</button>
                      <span class="soluk kucuk">{turBul(i.kayit.tur).ad}{i.konum.kesinlik === 'yaklasik' ? ' · yaklaşık' : ''}</span> <KararRozeti karar={i.karar} /></li>
                  ))}
                </ul>
                <h3>Yeri bilinmeyenler</h3>
                <p class="soluk kucuk">Bu haritada olduğu bilinen ama yeri belli olmayan kayıtlar.</p>
                <ul class="isaret-listesi">
                  {bilinmeyen.map((i) => (
                    <li key={i.kod}><button class="dugme sade kucuk" onClick={() => setSecili(i.kod)}>{i.kayit.ad}</button> <KararRozeti karar={i.karar} /></li>
                  ))}
                </ul>
                {!h.silindi && <button class="dugme kucuk" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setBilinmeyenEkle({ left: r.left, top: r.bottom + 4 }); }}>Yeri bilinmeyen kayıt ekle</button>}
              </>
            )}
        </aside>
      </div>
      {yeni && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={yeni.ekran} sec={(s) => void yeniKoy(s.kod)} kapat={() => setYeni(null)} />}
      {cizimKaydi && kip.tur === 'ciz' && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={cizimKaydi}
        sec={(s) => {
          setCizimKaydi(null);
          void iste(istemci.iste('cizimEkle', { evren, harita: kod, kayit: s.kod, bicim: kip.bicim, kip: kip.bicim === 'bolge' ? bolgeKipi : null, noktalar: kip.noktalar }))
            .then((r) => { if (r) { setKip({ tur: 'gez' }); setSeciliCizim(r.kod); } });
        }}
        kapat={() => setCizimKaydi(null)} />}
      {bilinmeyenEkle && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={bilinmeyenEkle}
        sec={(s) => { setBilinmeyenEkle(null); void iste(istemci.iste('isaretKoy', { evren, harita: kod, kayit: s.kod, konum: { kesinlik: 'bilinmiyor', x: null, y: null, yaricap: null } })); }}
        kapat={() => setBilinmeyenEkle(null)} />}
    </div>
  );
}

function KatmanPaneli({ istemci, evren, h, gizli, setGizli, saydamlik, setSaydamlik, hizala: hizalaBasla, hata }: {
  istemci: Istemci; evren: string; h: HaritaAyrintisi; gizli: Set<string>; setGizli: (f: (s: Set<string>) => Set<string>) => void;
  saydamlik: Record<string, number>; setSaydamlik: (f: (s: Record<string, number>) => Record<string, number>) => void;
  hizala: (k: HaritaKatmani) => void; hata: (s: string | null) => void;
}) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const iste = (p: Promise<unknown>) => p.then(() => hata(null), (e) => hata(hataYaz(e)));
  const dosyaOku = async (f: File) => ({ dosyaAdi: f.name, tur: f.type, veri: new Uint8Array(await f.arrayBuffer()) });
  const ekle = async (f: File | undefined) => {
    if (!f) return;
    setYukleniyor(true);
    await iste(istemci.iste('katmanEkle', { evren, harita: h.kod, ad: f.name.replace(/\.[^.]+$/, ''), ...(await dosyaOku(f)) }));
    setYukleniyor(false);
  };
  const acik = h.katmanlar.filter((k) => !k.silindi), kaldirilan = h.katmanlar.filter((k) => k.silindi);
  return (
    <section class="katmanlar" aria-label="Katmanlar">
      <h2>Katmanlar</h2>
      <ul class="katman-listesi">
        {acik.map((k) => (
          <li key={k.kod} class="katman-satiri">
            <label class="satir"><input type="checkbox" checked={!gizli.has(k.kod)} aria-label={`${k.ad} görünsün`}
              onChange={() => setGizli((g) => { const y = new Set(g); if (y.has(k.kod)) y.delete(k.kod); else y.add(k.kod); return y; })} />
              <KatmanAdi istemci={istemci} evren={evren} h={h} k={k} hata={hata} /></label>
            {acik.length > 1 && <input type="range" min={0.1} max={1} step={0.05} value={saydamlik[k.kod] ?? 1} aria-label={`${k.ad} saydamlığı`}
              onInput={(e) => { const v = Number((e.target as HTMLInputElement).value); setSaydamlik((x) => ({ ...x, [k.kod]: v })); }} />}
            {!h.silindi && (
              <div class="satir">
                <button class="dugme kucuk" onClick={() => hizalaBasla(k)}>Hizala</button>
                <label class="dugme sade kucuk">Görseli değiştir
                  <input type="file" class="gizli-dosya" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" aria-label={`${k.ad}: yeni görsel`}
                    onChange={async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) await iste(istemci.iste('katmanGorseli', { evren, harita: h.kod, katman: k.kod, ...(await dosyaOku(f)) })); }} /></label>
                {acik.length > 1 && <button class="dugme sade kucuk tehlikeli" onClick={() => onayla(`“${k.ad}” katmanı kaldırılsın mı?`) && iste(istemci.iste('katmanDegistir', { evren, harita: h.kod, katman: k.kod, alan: 'silindi', deger: true }))}>Kaldır</button>}
              </div>
            )}
            {k.gozdenGecir.length > 0 && (
              <p class="uyari kucuk">Hizalamada bazı noktaların hatası büyük; o kısımlar yeniden çizilmiş olabilir. Gözden geçirin: {k.gozdenGecir.map((i) => i.ad).join(', ')}.</p>
            )}
          </li>
        ))}
      </ul>
      {!h.silindi && (
        <label class="dugme kucuk">{yukleniyor ? 'Yükleniyor…' : 'Katman ekle'}
          <input type="file" class="gizli-dosya" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" aria-label="Katman görseli"
            onChange={(e) => void ekle((e.target as HTMLInputElement).files?.[0])} /></label>
      )}
      <p class="soluk kucuk">Eski bir haritayı, bir eskizi ya da haritanın yeniden çizilmiş hâlini katman olarak üste bindirebilirsiniz. İşaretler görsele değil haritaya bağlıdır; görsel değişse de yerinden oynamaz.</p>
      {kaldirilan.length > 0 && (
        <details><summary class="soluk kucuk">Kaldırılan katmanlar ({kaldirilan.length})</summary>
          <ul>{kaldirilan.map((k) => <li key={k.kod}>{k.ad} <button class="dugme sade kucuk" onClick={() => iste(istemci.iste('katmanDegistir', { evren, harita: h.kod, katman: k.kod, alan: 'silindi', deger: false }))}>Geri getir</button></li>)}</ul>
        </details>
      )}
    </section>
  );
}

function KatmanAdi({ istemci, evren, h, k, hata }: { istemci: Istemci; evren: string; h: HaritaAyrintisi; k: HaritaKatmani; hata: (s: string | null) => void }) {
  const [ad, setAd] = useState(k.ad);
  useEffect(() => setAd(k.ad), [k.ad]);
  return <input class="girdi kucuk" lang="tr" aria-label="Katmanın adı" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)}
    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    onBlur={() => { if (ad.trim() && ad.trim() !== k.ad) istemci.iste('katmanDegistir', { evren, harita: h.kod, katman: k.kod, alan: 'ad', deger: ad }).then(() => hata(null), (e) => { hata(hataYaz(e)); setAd(k.ad); }); }} />;
}

/** Hizalama (§8.5): nokta çiftleri, yöntem ve her çiftin hatası; uygulanana kadar yalnızca önizlemedir. */
function HizalamaPaneli({ istemci, evren, h, kip, sonuc, setKip, hata }: {
  istemci: Istemci; evren: string; h: HaritaAyrintisi; kip: Extract<Kip, { tur: 'hizala' }>; sonuc: ReturnType<typeof hizala>;
  setKip: (k: Kip) => void; hata: (s: string | null) => void;
}) {
  const k = h.katmanlar.find((x) => x.kod === kip.katman);
  if (!k) return null;
  const birim = Math.max(h.en, h.boy) / 100;
  const bitir = () => setKip({ tur: 'gez' });
  const yaz = (p: Promise<unknown>) => p.then(() => { hata(null); bitir(); }, (e) => hata(hataYaz(e)));
  return (
    <div class="hizalama-paneli" aria-label="Hizalama">
      <h2>“{k.ad}” hizalanıyor</h2>
      <p class="soluk kucuk">Her çift için önce bu görselde bir noktaya, sonra o noktanın haritada olması gereken yere tıklayın. İki çift, görseli taşımaya, döndürmeye ve büyütmeye yeter. Üç çift, eğikliği ve farklı oranlı esnemeyi de düzeltir. Daha fazla çift eklerseniz her noktanın hatası ayrıca gösterilir.</p>
      {kip.ciftler.length === 0 && !kip.bekleyen && <p class="kucuk">Henüz nokta yok.</p>}
      <ol class="hizalama-ciftleri">
        {kip.ciftler.map((_, i) => (
          <li key={i}>{i + 1}. çift{sonuc ? ` · hata ${(sonuc.hatalar[i] / birim).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} birim` : ''}
            <button class="dugme sade kucuk" aria-label={`${i + 1}. çifti sil`} onClick={() => setKip({ ...kip, ciftler: kip.ciftler.filter((_, j) => j !== i) })}>✕</button></li>
        ))}
        {kip.bekleyen && <li class="soluk">{kip.ciftler.length + 1}. çift: haritadaki yeri bekleniyor</li>}
      </ol>
      {sonuc && <p class="kucuk">{sonuc.yontem === 'afin' ? 'Genel hizalama (eğme ve esnemeyle)' : 'Taşıma, döndürme ve ölçek'}. Ortalama hata {(sonuc.ortalama / birim).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} birim (haritanın uzun kenarı 100 birim).</p>}
      {kip.ciftler.length >= 2 && !sonuc && <p class="hata kucuk">Bu noktalarla hizalama yapılamıyor; noktalar birbirinden ayrı olmalı.</p>}
      <div class="satir">
        <button class="dugme ana kucuk" disabled={!sonuc} onClick={() => yaz(istemci.iste('katmanHizala', { evren, harita: h.kod, katman: k.kod, noktalar: kip.ciftler }))}>Uygula</button>
        <button class="dugme sade kucuk" onClick={bitir}>Vazgeç</button>
      </div>
      {k.onceki && <button class="dugme sade kucuk" onClick={() => yaz(istemci.iste('katmanHizala', { evren, harita: h.kod, katman: k.kod, noktalar: null, donusum: k.onceki }))}>Önceki hizalamaya dön</button>}
    </div>
  );
}

/** Zaman kaydırıcısı (§8.2): harita seçilen tarihteki hâliyle gösterilir. Tarih yazılır ya da çizimlerin yılları arasında kaydırılır. */
function ZamanKaydirici({ h, an, setAn, yilYaz }: { h: HaritaAyrintisi; an: string; setAn: (s: string) => void; yilYaz: (y: number) => string }) {
  const [girdi, setGirdi] = useState(an);
  const [yil, setYil] = useState<number | null>(null);
  useEffect(() => setGirdi(an), [an]);
  const ar = h.zamanAraligi;
  if (!ar && !an && !h.cizimler.length) return null;
  return (
    <div class="satir zaman-kaydirici" role="group" aria-label="Zaman kaydırıcısı">
      <label class="satir kucuk">Tarih
        <input class="girdi kucuk" lang="tr" aria-label="Haritayı bu tarihte göster" placeholder="Örn. 412" value={girdi} style="width:140px"
          onInput={(e) => setGirdi((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') setAn(girdi.trim()); }} onBlur={() => setAn(girdi.trim())} /></label>
      {ar && ar.enBuyuk > ar.enKucuk && (
        <input type="range" min={ar.enKucuk - 1} max={ar.enBuyuk + 1} step={1} value={yil ?? ar.enKucuk - 1} aria-label="Yıl" style="flex:1;min-width:160px"
          onInput={(e) => setYil(Number((e.target as HTMLInputElement).value))} onChange={(e) => setAn(yilYaz(Number((e.target as HTMLInputElement).value)))} />
      )}
      {an && <button class="dugme sade kucuk" onClick={() => { setAn(''); setYil(null); }}>Bütün zamanlar</button>}
      {an && <span class="soluk kucuk">Bu tarihte olmayan {h.cizimler.filter((c) => c.gecerli === 'hayir').length} çizim gizlendi; tarihi kesin olmayanlar soluk gösteriliyor.</span>}
    </div>
  );
}

function CizimTaslagi({ kip, bolgeKipi, setBolgeKipi, setKip, bitir }: {
  kip: Extract<Kip, { tur: 'ciz' }>; bolgeKipi: 'denetim' | 'iddia'; setBolgeKipi: (k: 'denetim' | 'iddia') => void; setKip: (k: Kip) => void; bitir: (e: MouseEvent) => void;
}) {
  const yeter = kip.noktalar.length >= (kip.bicim === 'bolge' ? 3 : 2);
  return (
    <div class="hizalama-paneli" aria-label="Çizim">
      <h2>{kip.cizim ? 'Sınır yeniden çiziliyor' : kip.bicim === 'bolge' ? 'Yeni bölge' : 'Yeni yol'}</h2>
      <p class="kucuk">{kip.noktalar.length} nokta{yeter ? '' : ` · en az ${kip.bicim === 'bolge' ? 3 : 2} gerekir`}</p>
      {kip.bicim === 'bolge' && !kip.cizim && (
        <fieldset class="katman-turleri"><legend class="alan-adi">Bölgenin türü</legend>
          <label class="kucuk"><input type="radio" name="bolge-kipi" checked={bolgeKipi === 'denetim'} onChange={() => setBolgeKipi('denetim')} /> Fiilî denetim</label>
          <label class="kucuk"><input type="radio" name="bolge-kipi" checked={bolgeKipi === 'iddia'} onChange={() => setBolgeKipi('iddia')} /> İddia edilen</label>
        </fieldset>
      )}
      <p class="soluk kucuk">Bölgeler örtüşebilir. Tartışmalı toprakta her tarafın iddiasını ayrı bir bölge olarak çizin.</p>
      <div class="satir">
        <button class="dugme ana kucuk" disabled={!yeter} onClick={bitir}>{kip.cizim ? 'Kaydet' : 'Bitir ve kayda bağla'}</button>
        <button class="dugme sade kucuk" disabled={!kip.noktalar.length} onClick={() => setKip({ ...kip, noktalar: kip.noktalar.slice(0, -1) })}>Son noktayı sil</button>
        <button class="dugme sade kucuk" onClick={() => setKip({ tur: 'gez' })}>Vazgeç</button>
      </div>
    </div>
  );
}

function CizimPaneli({ istemci, evren, c, kapat, hata, yenidenCiz }: {
  istemci: Istemci; evren: string; c: HaritaCizimi; kapat: () => void; hata: (s: string | null) => void; yenidenCiz: (c: HaritaCizimi) => void;
}) {
  const iste = (p: Promise<unknown>) => p.then(() => hata(null), (e) => { hata(hataYaz(e)); throw e; });
  const degistir = (alan: 'kayit' | 'kip' | 'baslangic' | 'bitis', deger: unknown) => iste(istemci.iste('cizimDegistir', { evren, kod: c.kod, alan, deger }));
  return (
    <div class="isaret-paneli" aria-label="Seçili çizim">
      <div class="satir"><h2 style="flex:1"><a href={`#/e/${evren}/k/${c.kayit.kod}`}>{c.kayit.ad}</a></h2>
        <button class="dugme sade kucuk" onClick={kapat} aria-label="Seçimi kapat">✕</button></div>
      <p class="soluk kucuk">{c.bicim === 'yol' ? 'Yol' : 'Bölge'} · {turBul(c.kayit.tur).ad} <KararRozeti karar={c.karar} /></p>
      {c.bicim === 'bolge' && (
        <label class="alan"><span class="alan-adi">Bölgenin türü</span>
          <select class="girdi" value={c.kip ?? 'denetim'} onChange={(e) => void degistir('kip', (e.target as HTMLSelectElement).value).catch(() => {})}>
            <option value="denetim">Fiilî denetim</option><option value="iddia">İddia edilen</option>
          </select></label>
      )}
      <SinirAlani istemci={istemci} evren={evren} etiket="Başlangıç" deger={c.baslangic} kaydet={(v) => degistir('baslangic', v)} />
      <SinirAlani istemci={istemci} evren={evren} etiket="Bitiş" deger={c.bitis} kaydet={(v) => degistir('bitis', v)} />
      <p class="soluk kucuk">Başlangıç ya da bitiş boş bırakılırsa sınırsız sayılır. Bir olaya bağlanan sınır, olayın tarihi değişince kendiliğinden güncellenir.</p>
      <div class="satir">
        <button class="dugme kucuk" onClick={() => yenidenCiz(c)}>Sınırı yeniden çiz</button>
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Başka kayda bağla" sec={(s) => { if (s) void degistir('kayit', s.kod).catch(() => {}); }} />
        <button class="dugme sade kucuk tehlikeli" onClick={() => { if (!(onayla('Bu çizim kaldırılsın mı?'))) return; void iste(istemci.iste('cizimSil', { evren, kod: c.kod })).then(kapat, () => {}); }}>Kaldır</button>
      </div>
    </div>
  );
}

function HaritaBasligi({ istemci, evren, h }: { istemci: Istemci; evren: string; h: HaritaAyrintisi }) {
  const [ad, setAd] = useState(h.ad);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setAd(h.ad), [h.ad]);
  const yaz = (alan: 'ad' | 'yer', deger: unknown) => istemci.iste('haritaDegistir', { evren, kod: h.kod, alan, deger }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); setAd(h.ad); });
  return (
    <div class="satir harita-basligi">
      <input class="girdi buyuk" lang="tr" aria-label="Haritanın adı" value={ad} style="flex:1;min-width:200px"
        onInput={(e) => setAd((e.target as HTMLInputElement).value)} onBlur={() => { if (ad.trim() !== h.ad) void yaz('ad', ad); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <span class="soluk kucuk">Gösterdiği yer:</span>
      {h.yer && <a href={`#/e/${evren}/k/${h.yer.kod}`}>{h.yer.ad}</a>}
      <KayitSec istemci={istemci} evren={evren} secili={null} sec={(s) => { if (s) void yaz('yer', s.kod); }} etiket={h.yer ? 'Değiştir' : 'Yer seç'} />
      {h.yer && <button class="dugme sade kucuk" onClick={() => void yaz('yer', null)}>Bağı kaldır</button>}
      {!h.silindi && <button class="dugme sade kucuk tehlikeli" onClick={() => onayla(`“${h.ad}” haritası kaldırılsın mı? “Kaldırılan haritalar” listesinden geri getirebilirsiniz.`) && istemci.iste('haritaSil', { evren, kod: h.kod })}>Haritayı kaldır</button>}
      {hata && <span class="hata kucuk">{hata}</span>}
    </div>
  );
}

function IsaretGorseli({ i, h, secili, sec }: { i: HaritaIsareti; h: HaritaAyrintisi; secili: boolean; sec: () => void }) {
  const { x, y, yaricap } = i.konum;
  const sol = `${(x! / h.en) * 100}%`, ust = `${(y! / h.boy) * 100}%`;
  return (
    <>
      {i.konum.kesinlik === 'yaklasik' && yaricap && (
        <span class={`harita-bolge${secili ? ' secili' : ''}`} aria-hidden="true"
          style={{ left: `${((x! - yaricap) / h.en) * 100}%`, top: `${((y! - yaricap) / h.boy) * 100}%`, width: `${((2 * yaricap) / h.en) * 100}%`, height: `${((2 * yaricap) / h.boy) * 100}%` }} />
      )}
      <button class={`harita-isaret ${i.konum.kesinlik}${secili ? ' secili' : ''}${i.inanc ? ' inanc' : ''} karar-${i.karar}`} style={{ left: sol, top: ust }}
        aria-label={`${i.kayit.ad} (${kesinlikAdi(i.konum.kesinlik).toLocaleLowerCase('tr-TR')})`} aria-pressed={secili}
        onClick={(e) => { e.stopPropagation(); sec(); }}>
        <span class="harita-etiket">{i.kayit.ad}</span>
      </button>
    </>
  );
}

function IsaretPaneli({ istemci, evren, i, enBuyuk, kapat, tasi, hata }: {
  istemci: Istemci; evren: string; i: HaritaIsareti; enBuyuk: number; kapat: () => void; tasi: (k: 'kesin' | 'yaklasik') => void; hata: (s: string | null) => void;
}) {
  const iste = (p: Promise<unknown>) => p.then(() => hata(null), (e) => hata(hataYaz(e)));
  const konumYaz = (k: Partial<IsaretGirdisi>) => iste(istemci.iste('isaretDegistir', { evren, kod: i.kod, alan: 'konum', deger: { ...i.konum, ...k } }));
  const [yaricap, setYaricap] = useState(i.konum.yaricap ?? 0);
  useEffect(() => setYaricap(i.konum.yaricap ?? 0), [i.konum.yaricap]);
  return (
    <div class="isaret-paneli" aria-label="Seçili işaret">
      <div class="satir"><h2 style="flex:1"><a href={`#/e/${evren}/k/${i.kayit.kod}`}>{i.kayit.ad}</a></h2>
        <button class="dugme sade kucuk" onClick={kapat} aria-label="Seçimi kapat">✕</button></div>
      <p class="soluk kucuk">{turBul(i.kayit.tur).ad} <KararRozeti karar={i.karar} /></p>
      {i.altHarita && <p><a class="dugme kucuk" href={`#/e/${evren}/haritalar/${i.altHarita}`}>Bu yerin haritasını aç</a></p>}
      <label class="alan"><span class="alan-adi">Kesinlik</span>
        <select class="girdi" value={i.konum.kesinlik} onChange={(e) => {
          const k = (e.target as HTMLSelectElement).value as IsaretGirdisi['kesinlik'];
          if (k === 'bilinmiyor') void konumYaz({ kesinlik: 'bilinmiyor', x: null, y: null, yaricap: null });
          else if (i.konum.kesinlik === 'bilinmiyor') tasi(k);
          else void konumYaz({ kesinlik: k, yaricap: k === 'yaklasik' ? i.konum.yaricap : null });
        }}>
          {KESINLIKLER.map((k) => <option value={k.kod}>{k.ad}</option>)}
        </select></label>
      {i.konum.kesinlik === 'yaklasik' && (
        <label class="alan"><span class="alan-adi">Bölgenin genişliği</span>
          <input type="range" min={1} max={Math.max(2, Math.round(enBuyuk / 2))} value={yaricap} aria-label="Bölgenin genişliği"
            onInput={(e) => setYaricap(Number((e.target as HTMLInputElement).value))} onChange={() => void konumYaz({ yaricap })} /></label>
      )}
      <div class="satir">
        <button class="dugme kucuk" onClick={() => tasi(i.konum.kesinlik === 'yaklasik' ? 'yaklasik' : 'kesin')}>{i.konum.kesinlik === 'bilinmiyor' ? 'Haritada yerini göster' : 'Taşı'}</button>
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Başka kayda bağla"
          sec={(s) => { if (s) void iste(istemci.iste('isaretDegistir', { evren, kod: i.kod, alan: 'kayit', deger: s.kod })); }} />
        <button class="dugme sade kucuk tehlikeli" onClick={() => { if (!(onayla('Bu işaret kaldırılsın mı?'))) return; void iste(istemci.iste('isaretSil', { evren, kod: i.kod })); kapat(); }}>İşareti kaldır</button>
      </div>
    </div>
  );
}

// ---------- Kayıt sayfası ----------
export function KayitHaritaBolumu({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const n = useYenile(istemci, evren);
  const [v, setV] = useState<KayitHaritalari | null>(null);
  useEffect(() => { istemci.iste('kayitHaritalari', { evren, kod: kayit.kod }).then(setV, () => setV(null)); }, [kayit.kod, n]);
  if (!v || (!v.isaretler.length && !v.haritalar.length && !v.cizimler.length)) return null;
  return (
    <section class="kayit-haritalari" aria-label="Haritalar">
      <h2>Haritalar</h2>
      <ul>
        {v.haritalar.map((h) => <li key={h.kod}><a href={`#/e/${evren}/haritalar/${h.kod}`}>{h.ad}</a> <span class="soluk kucuk">bu yerin haritası</span></li>)}
        {v.isaretler.map((i) => <li key={i.kod}><a href={`#/e/${evren}/haritalar/${i.harita}`}>{i.haritaAd}</a> <span class="soluk kucuk">{kesinlikAdi(i.kesinlik).toLocaleLowerCase('tr-TR')}</span></li>)}
        {v.cizimler.map((c) => <li key={c.kod}><a href={`#/e/${evren}/haritalar/${c.harita}`}>{c.haritaAd}</a> <span class="soluk kucuk">{c.bicim === 'yol' ? 'yol' : c.kip === 'iddia' ? 'iddia ettiği bölge' : 'bölgesi'}</span></li>)}
      </ul>
    </section>
  );
}

/** Kayıt görselinden işaretleme yüzeyi açar (kat planı, eşya, karakter görseli). */
export async function gorseldeIsaretle(istemci: Istemci, evren: string, kayit: string, gorsel: string) {
  const { kod } = await istemci.iste('gorseldenHarita', { evren, kayit, gorsel });
  git(`/e/${evren}/haritalar/${kod}`);
}
